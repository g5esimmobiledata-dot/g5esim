import puppeteer, { type Browser } from "puppeteer";
import { storage } from "../storage";
import type { User, VoucherCode } from "@shared/schema";

const voucherExportFormats = ["pdf", "word", "excel"] as const;

export type VoucherExportFormat = (typeof voucherExportFormats)[number];

let voucherPdfBrowser: Browser | null = null;

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeExportFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "voucher";
}

function joinUrl(baseUrl: string, pathOrUrl?: string | null) {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("data:")) return pathOrUrl;
  if (/^(https?:)?\/\//i.test(pathOrUrl)) {
    try {
      const parsed = new URL(pathOrUrl, baseUrl);
      if (parsed.pathname.startsWith("/uploads/")) {
        return `${baseUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return pathOrUrl;
    }
    return pathOrUrl;
  }
  return `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

async function getPlatformName() {
  const setting = await storage.getSettingByKey("platform_name");
  return setting?.value || "AYA eSIM Mobile";
}

async function getPlatformLogoUrl() {
  const [platformLogoSetting, darkLogoSetting, faviconSetting] = await Promise.all([
    storage.getSettingByKey("logo"),
    storage.getSettingByKey("dark_logo"),
    storage.getSettingByKey("favicon"),
  ]);

  return platformLogoSetting?.value || darkLogoSetting?.value || faviconSetting?.value || "";
}

function displayVoucherSeries(value?: string | null) {
  return value || "S-0000000000";
}

function displayVoucherSerial(value?: string | null) {
  return value || "SN-0000000000";
}

function displayVoucherCode(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 16 && /^[\d-]+$/.test(value)) {
    return digits.replace(/(\d{4})(?=\d)/g, "$1-");
  }
  return value;
}

function getTypeLabel(type: string) {
  if (type === "wallet_credit") return "Wallet Top-up";
  if (type === "percentage") return "Percentage Discount";
  if (type === "fixed") return "Fixed Discount";
  return type;
}

function formatVoucherValue(voucher: VoucherCode) {
  const value = toNumber(voucher.value).toFixed(2);
  if (voucher.type === "wallet_credit") return `$${value} wallet credit`;
  if (voucher.type === "percentage") return `${toNumber(voucher.value)}% off`;
  return `$${value} off`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function roleLabel(role?: string | null) {
  if (role === "agent") return "Agent";
  if (role === "reseller") return "Reseller";
  return "All Customers";
}

function brandInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "AM"
  );
}

async function resolveVoucherBranding(input: {
  baseUrl: string;
  issuerUser?: User | null;
}) {
  const [platformName, platformLogoUrl] = await Promise.all([
    getPlatformName(),
    getPlatformLogoUrl(),
  ]);
  const user = input.issuerUser;
  const usesUserBrand = user?.role === "agent" || user?.role === "reseller";
  const issuerName =
    (usesUserBrand ? user?.resellerStoreName || user?.name || user?.email : undefined) ||
    platformName;
  const logoUrl =
    (usesUserBrand ? user?.resellerLogoUrl : undefined) ||
    platformLogoUrl ||
    "";

  return {
    platformName,
    issuerName,
    logoUrl: joinUrl(input.baseUrl, logoUrl),
  };
}

function buildVoucherHtml(
  voucher: VoucherCode,
  branding: {
    platformName: string;
    issuerName: string;
    logoUrl?: string;
  },
  baseUrl: string,
) {
  const voucherCode = displayVoucherCode(voucher.code);
  const series = displayVoucherSeries(voucher.seriesCode);
  const serial = displayVoucherSerial(voucher.serialNumber);
  const usage = `${voucher.currentUses}${voucher.maxUses ? ` / ${voucher.maxUses}` : ""}`;
  const redeemLink =
    voucher.qrPayload ||
    (voucher.type === "wallet_credit"
      ? `${baseUrl}/redeem-voucher?code=${encodeURIComponent(voucher.code)}`
      : "");
  const instructions =
    voucher.type === "wallet_credit"
      ? [
          "Sign in to your account wallet.",
          "Scan the QR code or open the redeem link shown on this voucher.",
          "If you redeem manually, enter the voucher code exactly as printed.",
          "After successful redemption, the wallet balance will be updated automatically.",
        ]
      : [
          "Choose a package or top-up and continue to checkout.",
          "Enter the voucher code in the voucher or promo code field.",
          "Review the discount before completing payment.",
          "Use this voucher before the expiry date shown on this form.",
        ];

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(`Voucher ${voucherCode}`)}</title>
    <style>
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 16px;
        color: #0f172a;
        background: #eef4f0;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        line-height: 1.45;
      }
      .voucher-page {
        max-width: 780px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #d8e3dc;
        border-radius: 18px;
        overflow: hidden;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 20px 24px;
        background: #0f172a;
        color: #ffffff;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .logo {
        max-width: 150px;
        max-height: 54px;
        object-fit: contain;
        border-radius: 10px;
        background: #ffffff;
        padding: 7px;
      }
      .logo-fallback {
        display: inline-flex;
        width: 54px;
        height: 54px;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: #bef264;
        color: #0f172a;
        font-size: 20px;
        font-weight: 800;
      }
      .brand-name {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
      }
      .brand-subtitle {
        margin: 3px 0 0;
        color: #cbd5e1;
        font-size: 12px;
      }
      .status {
        border-radius: 999px;
        background: #bef264;
        color: #0f172a;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 180px;
        gap: 18px;
        padding: 24px;
        border-bottom: 1px solid #e2e8f0;
      }
      .label {
        margin: 0 0 6px;
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .value {
        margin: 0;
        color: #0f172a;
        font-size: 36px;
        font-weight: 800;
      }
      .code {
        display: inline-block;
        margin-top: 12px;
        padding: 12px 14px;
        border: 1px dashed #94a3b8;
        border-radius: 12px;
        background: #f8fafc;
        color: #0f172a;
        font-family: "Courier New", monospace;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: .04em;
      }
      .qr-card {
        display: flex;
        min-height: 172px;
        align-items: center;
        justify-content: center;
        border: 1px solid #dbe3ea;
        border-radius: 14px;
        background: #f8fafc;
        padding: 12px;
        text-align: center;
      }
      .qr-card img {
        width: 150px;
        height: 150px;
        object-fit: contain;
        border-radius: 8px;
        background: #ffffff;
      }
      .content {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 18px;
        padding: 24px;
      }
      .panel {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #ffffff;
        padding: 16px;
      }
      .panel h2 {
        margin: 0 0 12px;
        color: #0f172a;
        font-size: 15px;
      }
      .detail-row {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid #edf2f7;
      }
      .detail-row:last-child { border-bottom: 0; }
      .detail-key {
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
      }
      .detail-value {
        color: #0f172a;
        font-size: 12.5px;
        font-weight: 700;
        word-break: break-word;
      }
      ol {
        margin: 0;
        padding-left: 18px;
      }
      li {
        margin: 0 0 9px;
        color: #334155;
      }
      .link-box {
        margin-top: 12px;
        border-radius: 10px;
        background: #f1f5f9;
        padding: 10px;
        color: #334155;
        font-size: 11.5px;
        word-break: break-all;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 24px 18px;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
        font-size: 11px;
      }
      @media print {
        body {
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    </style>
  </head>
  <body>
    <main class="voucher-page">
      <section class="header">
        <div class="brand">
          ${
            branding.logoUrl
              ? `<img class="logo" src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(branding.issuerName)} logo" />`
              : `<span class="logo-fallback">${escapeHtml(brandInitials(branding.issuerName))}</span>`
          }
          <div>
            <h1 class="brand-name">${escapeHtml(branding.issuerName)}</h1>
            <p class="brand-subtitle">Official voucher form</p>
          </div>
        </div>
        <span class="status">${escapeHtml(voucher.status)}</span>
      </section>

      <section class="hero">
        <div>
          <p class="label">${escapeHtml(getTypeLabel(voucher.type))}</p>
          <p class="value">${escapeHtml(formatVoucherValue(voucher))}</p>
          <div class="code">${escapeHtml(voucherCode)}</div>
        </div>
        <div>
          <p class="label">Scan to Redeem</p>
          <div class="qr-card">
            ${
              voucher.qrCode
                ? `<img src="${escapeHtml(voucher.qrCode)}" alt="${escapeHtml(voucherCode)} QR code" />`
                : "<span>No QR code available</span>"
            }
          </div>
        </div>
      </section>

      <section class="content">
        <div class="panel">
          <h2>Voucher Details</h2>
          <div class="detail-row"><span class="detail-key">Series#</span><span class="detail-value">${escapeHtml(series)}</span></div>
          <div class="detail-row"><span class="detail-key">Serial#</span><span class="detail-value">${escapeHtml(serial)}</span></div>
          <div class="detail-row"><span class="detail-key">Batch</span><span class="detail-value">${escapeHtml(voucher.batchName || series)}</span></div>
          <div class="detail-row"><span class="detail-key">Assigned To</span><span class="detail-value">${escapeHtml(roleLabel(voucher.assignedRole))}</span></div>
          <div class="detail-row"><span class="detail-key">Valid From</span><span class="detail-value">${escapeHtml(formatDate(voucher.validFrom))}</span></div>
          <div class="detail-row"><span class="detail-key">Valid Until</span><span class="detail-value">${escapeHtml(formatDate(voucher.validUntil))}</span></div>
          <div class="detail-row"><span class="detail-key">Usage</span><span class="detail-value">${escapeHtml(usage)}</span></div>
          <div class="detail-row"><span class="detail-key">Per User</span><span class="detail-value">${escapeHtml(voucher.perUserLimit || "Unlimited")}</span></div>
        </div>

        <div class="panel">
          <h2>Instructions</h2>
          <ol>
            ${instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join("")}
          </ol>
          ${
            redeemLink
              ? `<div class="link-box"><strong>Redeem link:</strong><br />${escapeHtml(redeemLink)}</div>`
              : ""
          }
        </div>
      </section>

      <section class="footer">
        <span>${escapeHtml(voucher.description || "Keep this voucher code private until it is redeemed.")}</span>
        <span>Powered by ${escapeHtml(branding.platformName)}</span>
      </section>
    </main>
  </body>
</html>`;
}

async function getVoucherPdfBrowser() {
  if (!voucherPdfBrowser) {
    voucherPdfBrowser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }

  return voucherPdfBrowser;
}

async function renderVoucherPdf(html: string) {
  const browser = await getVoucherPdfBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      scale: 0.96,
      margin: {
        top: "8mm",
        right: "8mm",
        bottom: "8mm",
        left: "8mm",
      },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function getVoucherExportDocument(input: {
  voucher: VoucherCode;
  format: VoucherExportFormat;
  baseUrl: string;
  issuerUser?: User | null;
}) {
  if (!voucherExportFormats.includes(input.format)) {
    throw new Error("Unsupported voucher export format");
  }

  const branding = await resolveVoucherBranding({
    baseUrl: input.baseUrl,
    issuerUser: input.issuerUser,
  });
  const html = buildVoucherHtml(input.voucher, branding, input.baseUrl);
  const filenameBase = safeExportFilename(`voucher-${displayVoucherSerial(input.voucher.serialNumber)}-${input.voucher.code}`);

  if (input.format === "pdf") {
    return {
      buffer: await renderVoucherPdf(html),
      contentType: "application/pdf",
      filename: `${filenameBase}.pdf`,
    };
  }

  if (input.format === "word") {
    return {
      buffer: Buffer.from(`\ufeff${html}`, "utf8"),
      contentType: "application/msword; charset=utf-8",
      filename: `${filenameBase}.doc`,
    };
  }

  return {
    buffer: Buffer.from(`\ufeff${html}`, "utf8"),
    contentType: "application/vnd.ms-excel; charset=utf-8",
    filename: `${filenameBase}.xls`,
  };
}
