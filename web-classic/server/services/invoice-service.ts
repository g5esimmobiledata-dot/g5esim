import { randomUUID } from "crypto";
import puppeteer, { type Browser } from "puppeteer";
import { storage } from "../storage";
import { sendEmail } from "../email";
import type { Order, User } from "@shared/schema";

const INVOICE_SETTINGS_KEY = "invoice_settings";
const INVOICE_RECORDS_KEY = "invoice_records";

const completedStatuses = new Set(["completed", "ready", "active", "paid"]);
const refundedStatuses = new Set(["refunded", "refund_requested"]);
const invoicePaymentMethods = ["credit_card", "voucher", "paypal", "crypto", "wire_transfer"] as const;
const invoiceExportFormats = ["pdf", "word", "excel"] as const;

let invoicePdfBrowser: Browser | null = null;

export type InvoicePaymentMethod = (typeof invoicePaymentMethods)[number];
export type InvoiceExportFormat = (typeof invoiceExportFormats)[number];
export type InvoiceStatus = "draft" | "sent" | "payment_pending" | "paid";

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  type: "manual" | "monthly";
  status: InvoiceStatus;
  customerName: string;
  customerEmail: string;
  issuerUserId?: string;
  issuerName?: string;
  issuerLogoUrl?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  tax: number;
  total: number;
  notes?: string;
  paymentMethods: InvoicePaymentMethod[];
  wireTransferInstructions?: string;
  paidAt?: string;
  paymentMethod?: InvoicePaymentMethod | "manual";
  paymentReference?: string;
  paymentNotes?: string;
  reminderSentAt?: string;
  lineItems: InvoiceLineItem[];
  sentAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceSettings = {
  autoSendMonthly: boolean;
  sendDay: number;
  defaultDueDays: number;
  recipients: string;
  paymentMethods: InvoicePaymentMethod[];
  wireTransferInstructions: string;
  autoSendReminders: boolean;
  reminderDaysBeforeDue: number;
  lastAutoSentPeriod?: string;
  lastAutoSentAt?: string;
  lastReminderRunAt?: string;
};

export const defaultInvoiceSettings: InvoiceSettings = {
  autoSendMonthly: false,
  sendDay: 1,
  defaultDueDays: 14,
  recipients: "",
  paymentMethods: ["credit_card", "voucher", "paypal", "crypto", "wire_transfer"],
  wireTransferInstructions: "Contact billing support for wire transfer bank details before sending funds.",
  autoSendReminders: false,
  reminderDaysBeforeDue: 3,
};

type CreateInvoiceInput = {
  customerName?: string;
  customerEmail: string;
  dueDate?: string;
  currency?: string;
  tax?: number;
  discountPercent?: number;
  notes?: string;
  issuerUserId?: string;
  issuerName?: string;
  issuerLogoUrl?: string;
  paymentMethods?: InvoicePaymentMethod[];
  wireTransferInstructions?: string;
  lineItems: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount?: number;
  }>;
  sendNow?: boolean;
  createdBy?: string;
};

type GenerateMonthlyInput = {
  period?: string;
  recipientEmail?: string;
  sendNow?: boolean;
  createdBy?: string;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return Number(toNumber(value).toFixed(2));
}

function percent(value: unknown) {
  return Math.min(100, Math.max(0, money(value)));
}

function normalizePaymentMethods(methods?: unknown): InvoicePaymentMethod[] {
  if (!Array.isArray(methods)) return defaultInvoiceSettings.paymentMethods;
  const clean = methods.filter((method): method is InvoicePaymentMethod =>
    invoicePaymentMethods.includes(method as InvoicePaymentMethod),
  );
  return clean.length > 0 ? Array.from(new Set(clean)) : defaultInvoiceSettings.paymentMethods;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getPeriodRange(period?: string) {
  const now = new Date();
  const safePeriod = /^\d{4}-\d{2}$/.test(period || "")
    ? period!
    : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const [year, month] = safePeriod.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  return {
    period: safePeriod,
    start,
    end,
    label: start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

function previousMonthPeriod(date = new Date()) {
  const previous = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function readJsonSetting<T>(key: string, fallback: T): Promise<T> {
  const setting = await storage.getSettingByKey(key);
  if (!setting?.value) return fallback;

  try {
    return JSON.parse(setting.value) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonSetting<T>(key: string, value: T) {
  await storage.setSetting({
    key,
    value: JSON.stringify(value),
    category: "billing",
  });
}

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const stored = await readJsonSetting<Partial<InvoiceSettings>>(INVOICE_SETTINGS_KEY, {});
  return {
    ...defaultInvoiceSettings,
    ...stored,
    autoSendMonthly: Boolean(stored.autoSendMonthly),
    sendDay: Math.min(28, Math.max(1, Number(stored.sendDay || defaultInvoiceSettings.sendDay))),
    defaultDueDays: Math.min(90, Math.max(1, Number(stored.defaultDueDays || defaultInvoiceSettings.defaultDueDays))),
    recipients: String(stored.recipients || ""),
    paymentMethods: normalizePaymentMethods(stored.paymentMethods),
    wireTransferInstructions: String(stored.wireTransferInstructions || defaultInvoiceSettings.wireTransferInstructions),
    autoSendReminders: Boolean(stored.autoSendReminders),
    reminderDaysBeforeDue: Math.min(30, Math.max(0, Number(stored.reminderDaysBeforeDue ?? defaultInvoiceSettings.reminderDaysBeforeDue))),
  };
}

export async function saveInvoiceSettings(settings: Partial<InvoiceSettings>) {
  const current = await getInvoiceSettings();
  const next: InvoiceSettings = {
    ...current,
    ...settings,
    autoSendMonthly: Boolean(settings.autoSendMonthly ?? current.autoSendMonthly),
    sendDay: Math.min(28, Math.max(1, Number(settings.sendDay ?? current.sendDay))),
    defaultDueDays: Math.min(90, Math.max(1, Number(settings.defaultDueDays ?? current.defaultDueDays))),
    recipients: String(settings.recipients ?? current.recipients),
    paymentMethods: normalizePaymentMethods(settings.paymentMethods ?? current.paymentMethods),
    wireTransferInstructions: String(settings.wireTransferInstructions ?? current.wireTransferInstructions),
    autoSendReminders: Boolean(settings.autoSendReminders ?? current.autoSendReminders),
    reminderDaysBeforeDue: Math.min(30, Math.max(0, Number(settings.reminderDaysBeforeDue ?? current.reminderDaysBeforeDue))),
    lastReminderRunAt: settings.lastReminderRunAt ?? current.lastReminderRunAt,
  };

  await writeJsonSetting(INVOICE_SETTINGS_KEY, next);
  return next;
}

export async function getInvoices(): Promise<InvoiceRecord[]> {
  const invoices = await readJsonSetting<InvoiceRecord[]>(INVOICE_RECORDS_KEY, []);
  return invoices
    .map((invoice) => ({
      ...invoice,
      status: invoice.status || "draft",
      paymentMethods: normalizePaymentMethods(invoice.paymentMethods),
      discountPercent: percent(invoice.discountPercent),
      discountAmount: money(invoice.discountAmount || 0),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function saveInvoices(invoices: InvoiceRecord[]) {
  await writeJsonSetting(INVOICE_RECORDS_KEY, invoices.slice(0, 1000));
}

function generateInvoiceNumber(type: InvoiceRecord["type"]) {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const prefix = type === "monthly" ? "MINV" : "INV";
  return `${prefix}-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function normalizeLineItems(input: CreateInvoiceInput["lineItems"]): InvoiceLineItem[] {
  return input.map((item) => {
    const quantity = Math.max(1, toNumber(item.quantity));
    const unitPrice = money(item.unitPrice);
    const amount = money(item.amount ?? quantity * unitPrice);

    return {
      id: item.id || randomUUID(),
      description: String(item.description || "Invoice item"),
      quantity,
      unitPrice,
      amount,
    };
  });
}

async function getPlatformName() {
  const setting = await storage.getSettingByKey("platform_name");
  return setting?.value || "AYA eSIM Mobile";
}

async function getPublicBaseUrl() {
  const configured = await storage.getSettingByKey("website_url");
  const localBaseUrl = `http://localhost:${process.env.PORT || 5000}`;
  const envBaseUrl = process.env.PUBLIC_BASE_URL || process.env.APP_URL || process.env.BASE_URL;
  if (process.env.NODE_ENV !== "production") {
    return (envBaseUrl || localBaseUrl).replace(/\/$/, "");
  }

  return (
    configured?.value ||
    envBaseUrl ||
    localBaseUrl
  ).replace(/\/$/, "");
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

async function getPlatformLogoUrl() {
  const [platformLogoSetting, darkLogoSetting, faviconSetting] = await Promise.all([
    storage.getSettingByKey("logo"),
    storage.getSettingByKey("dark_logo"),
    storage.getSettingByKey("favicon"),
  ]);

  return platformLogoSetting?.value || darkLogoSetting?.value || faviconSetting?.value || "";
}

async function resolveInvoiceIssuerBranding(input: {
  issuerUserId?: string | null;
  issuerName?: string | null;
  issuerLogoUrl?: string | null;
}, baseUrlOverride?: string) {
  const [platformName, platformLogoUrl, baseUrl] = await Promise.all([
    getPlatformName(),
    getPlatformLogoUrl(),
    baseUrlOverride ? Promise.resolve(baseUrlOverride.replace(/\/$/, "")) : getPublicBaseUrl(),
  ]);
  const issuer = input.issuerUserId ? await storage.getUserById(input.issuerUserId) : undefined;
  const isResellerOrAgent = issuer?.role === "reseller" || issuer?.role === "agent";
  const issuerName =
    input.issuerName ||
    (isResellerOrAgent ? issuer?.resellerStoreName || issuer?.name || issuer?.email : undefined) ||
    platformName;
  const logoUrl =
    input.issuerLogoUrl ||
    (isResellerOrAgent ? issuer?.resellerLogoUrl : undefined) ||
    platformLogoUrl ||
    "";

  return {
    baseUrl,
    platformName,
    issuerName,
    logoUrl: joinUrl(baseUrl, logoUrl),
  };
}

function formatCurrency(value: number, currency = "USD") {
  const safeCurrency = /^[A-Z]{3}$/.test(currency || "") ? currency : "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: safeCurrency,
  }).format(Number(value || 0));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function paymentMethodLabel(method: InvoicePaymentMethod | "manual") {
  const labels: Record<string, string> = {
    credit_card: "Credit Card",
    voucher: "Voucher",
    paypal: "PayPal",
    crypto: "Crypto",
    wire_transfer: "Wire Transfer",
    manual: "Manual",
  };
  return labels[method] || method;
}

async function getInvoiceBranding(invoice: InvoiceRecord, baseUrlOverride?: string) {
  const branding = await resolveInvoiceIssuerBranding({
    issuerUserId: invoice.issuerUserId,
    issuerName: invoice.issuerName,
    issuerLogoUrl: invoice.issuerLogoUrl,
  }, baseUrlOverride);

  return {
    baseUrl: branding.baseUrl,
    platformName: branding.platformName,
    issuerName: branding.issuerName,
    logoUrl: branding.logoUrl,
    paymentUrl: `${branding.baseUrl}/invoice/${invoice.id}`,
  };
}

async function withResolvedInvoiceBranding(invoice: InvoiceRecord, baseUrlOverride?: string): Promise<InvoiceRecord> {
  const branding = await getInvoiceBranding(invoice, baseUrlOverride);
  return {
    ...invoice,
    issuerName: branding.issuerName,
    issuerLogoUrl: branding.logoUrl || undefined,
  };
}

export async function getInvoicePaymentView(invoiceId: string, baseUrlOverride?: string) {
  const invoices = await getInvoices();
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) return undefined;

  const branding = await getInvoiceBranding(invoice, baseUrlOverride);
  return {
    invoice: {
      ...invoice,
      issuerName: branding.issuerName,
      issuerLogoUrl: branding.logoUrl || undefined,
    },
    branding,
  };
}

export function buildInvoiceHtml(
  invoice: InvoiceRecord,
  branding: {
    platformName: string;
    issuerName: string;
    logoUrl?: string;
    paymentUrl?: string;
  },
) {
  const rows = invoice.lineItems
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unitPrice, invoice.currency)}</td>
          <td>${formatCurrency(item.amount, invoice.currency)}</td>
        </tr>
      `,
    )
    .join("");
  const paymentMethods = normalizePaymentMethods(invoice.paymentMethods);
  const paymentMethodChips = paymentMethods
    .map((method) => `<span class="payment-chip">${escapeHtml(paymentMethodLabel(method))}</span>`)
    .join("");
  const statusText = paymentMethodLabel((invoice.paymentMethod || "manual") as any);
  const isPaid = invoice.status === "paid";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 8mm; }
      body { margin: 0; padding: 16px; color: #0f172a; background: #eef6f5; font-family: Arial, Helvetica, sans-serif; font-size: 13.25px; line-height: 1.35; }
      .invoice { max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #dbeafe; border-radius: 18px; overflow: hidden; box-shadow: 0 12px 32px rgba(15, 23, 42, .10); }
      .header { padding: 20px 22px; background: linear-gradient(135deg, #0f172a, #12323d); color: #fff; }
      .brand { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
      .brand-left { display: flex; align-items: center; gap: 12px; }
      .brand-name { font-size: 19px; font-weight: 800; }
      .brand-subtitle { color: #cbd5e1; font-size: 12px; }
      .logo { max-width: 130px; max-height: 48px; border-radius: 10px; background: #fff; padding: 6px; object-fit: contain; }
      .logo-fallback { display: inline-flex; width: 48px; height: 48px; align-items: center; justify-content: center; border-radius: 13px; background: #bef264; color: #0f172a; font-size: 20px; font-weight: 800; }
      .header h1 { margin: 16px 0 0; font-size: 28px; letter-spacing: 0; }
      .header p { margin: 4px 0 0; color: #dbeafe; }
      .status { display: inline-flex; align-items: center; border-radius: 8px; background: ${isPaid ? "#34d399" : "#bef264"}; color: #0f172a; padding: 6px 10px; font-weight: 800; font-size: 12px; }
      .body { padding: 20px 22px 22px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
      .box { border: 1px solid #e2e8f0; border-radius: 13px; padding: 12px; background: #f8fafc; }
      .label { color: #64748b; font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; }
      .value { margin-top: 4px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 11px; font-size: 12.25px; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; font-size: 11.25px; }
      .totals { margin-left: auto; margin-top: 12px; width: 260px; font-size: 12.25px; }
      .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
      .grand { border-top: 2px solid #0f172a; margin-top: 5px; padding-top: 8px; font-size: 18px; font-weight: 800; }
      .payment { margin-top: 16px; border-radius: 15px; background: #0f172a; color: #fff; padding: 15px; }
      .payment h2 { margin: 0; font-size: 17px; }
      .payment p { margin: 6px 0 0; color: #cbd5e1; }
      .payment-chip { display: inline-flex; margin: 7px 6px 0 0; border-radius: 999px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); padding: 5px 9px; font-size: 12px; font-weight: 700; }
      .pay-button { display: inline-block; margin-top: 11px; border-radius: 8px; background: #bef264; color: #0f172a; padding: 9px 15px; text-decoration: none; font-weight: 800; }
      .wire { margin-top: 11px; border-radius: 10px; background: rgba(255,255,255,.08); padding: 10px; white-space: pre-line; color: #e2e8f0; }
      .notes { margin-top: 13px; color: #475569; font-size: 12px; }
      @media print { body { padding: 0; background: #fff; } .invoice { box-shadow: none; } }
      @media (max-width: 680px) { body { padding: 10px; } .grid { grid-template-columns: 1fr; } .brand { align-items: flex-start; flex-direction: column; } .totals { width: 100%; } }
    </style>
  </head>
  <body>
    <div class="invoice">
      <div class="header">
        <div class="brand">
          <div class="brand-left">
            ${branding.logoUrl ? `<img class="logo" src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(branding.issuerName)} logo" />` : `<span class="logo-fallback">${escapeHtml(branding.issuerName.slice(0, 2).toUpperCase())}</span>`}
            <div>
              <div class="brand-name">${escapeHtml(branding.issuerName)}</div>
              <div class="brand-subtitle">Powered by ${escapeHtml(branding.platformName)}</div>
            </div>
          </div>
          <span class="status">${escapeHtml(invoice.status.replace(/_/g, " ").toUpperCase())}</span>
        </div>
        <h1>Invoice</h1>
        <p>${escapeHtml(invoice.invoiceNumber)}</p>
      </div>
      <div class="body">
        <div class="grid">
          <div class="box">
            <div class="label">Bill To</div>
            <div class="value">${escapeHtml(invoice.customerName)}</div>
            <div>${escapeHtml(invoice.customerEmail)}</div>
          </div>
          <div class="box">
            <div class="label">Invoice Details</div>
            <div class="value">Issued: ${new Date(invoice.issueDate).toLocaleDateString()}</div>
            <div>Due: ${new Date(invoice.dueDate).toLocaleDateString()}</div>
            ${invoice.period ? `<div>Period: ${escapeHtml(invoice.period)}</div>` : ""}
            ${invoice.paidAt ? `<div>Paid: ${new Date(invoice.paidAt).toLocaleDateString()} via ${escapeHtml(statusText)}</div>` : ""}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div class="total-row"><span>Subtotal</span><strong>${formatCurrency(invoice.subtotal, invoice.currency)}</strong></div>
          ${Number(invoice.discountAmount || 0) > 0 ? `<div class="total-row"><span>Discount (${money(invoice.discountPercent || 0)}%)</span><strong>-${formatCurrency(invoice.discountAmount || 0, invoice.currency)}</strong></div>` : ""}
          <div class="total-row"><span>Tax</span><strong>${formatCurrency(invoice.tax, invoice.currency)}</strong></div>
          <div class="total-row grand"><span>Total</span><span>${formatCurrency(invoice.total, invoice.currency)}</span></div>
        </div>
        ${isPaid ? `
        <div class="payment">
          <h2>Payment Completed</h2>
          <p>This invoice has been marked as paid.</p>
        </div>` : `
        <div class="payment">
          <h2>Payment Options</h2>
          <p>Choose one of the available methods below to pay this invoice.</p>
          <div>${paymentMethodChips}</div>
          ${branding.paymentUrl ? `<a class="pay-button" href="${escapeHtml(branding.paymentUrl)}">Pay Now</a>` : ""}
          ${paymentMethods.includes("wire_transfer") && invoice.wireTransferInstructions ? `<div class="wire">${escapeHtml(invoice.wireTransferInstructions)}</div>` : ""}
        </div>`}
        ${invoice.notes ? `<div class="notes">${escapeHtml(invoice.notes)}</div>` : ""}
      </div>
    </div>
  </body>
</html>`;
}

function buildInvoiceOfficeHtml(
  invoice: InvoiceRecord,
  branding: {
    platformName: string;
    issuerName: string;
    logoUrl?: string;
    paymentUrl?: string;
  },
  format: "word" | "excel",
) {
  const paymentMethods = normalizePaymentMethods(invoice.paymentMethods);
  const statusText = paymentMethodLabel((invoice.paymentMethod || "manual") as any);
  const isPaid = invoice.status === "paid";
  const title = `Invoice ${invoice.invoiceNumber}`;
  const lineRows = invoice.lineItems
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td style="text-align:center;">${item.quantity}</td>
          <td style="text-align:right;">${formatCurrency(item.unitPrice, invoice.currency)}</td>
          <td style="text-align:right;">${formatCurrency(item.amount, invoice.currency)}</td>
        </tr>
      `,
    )
    .join("");

  const logo = branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" width="130" style="width:130px;max-width:130px;height:auto;max-height:50px;object-fit:contain;" alt="${escapeHtml(branding.issuerName)} logo" />`
    : `<strong style="font-size:20px;">${escapeHtml(branding.issuerName.slice(0, 2).toUpperCase())}</strong>`;
  const payButton = !isPaid && branding.paymentUrl
    ? `<a href="${escapeHtml(branding.paymentUrl)}" style="color:#0f172a;background:#bef264;padding:7px 12px;text-decoration:none;font-weight:bold;">Pay Now</a>`
    : "";
  const paymentSummary = paymentMethods.map(paymentMethodLabel).join(", ");
  const appName = format === "excel" ? "Excel" : "Word";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="ProgId" content="${format === "excel" ? "Excel.Sheet" : "Word.Document"}" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 13pt; line-height: 1.35; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d9e2ec; padding: 7px 9px; vertical-align: top; }
      th { background: #eef2f7; font-weight: bold; }
      .no-border td { border: 0; }
      .section-title { background: #0f172a; color: #ffffff; font-size: 14pt; font-weight: bold; }
      .muted { color: #64748b; }
      .total-row td { font-weight: bold; }
      .grand-total td { background: #f1f5f9; font-size: 14pt; font-weight: bold; }
    </style>
  </head>
  <body>
    <table class="no-border">
      <tr>
        <td style="width:150px;">${logo}</td>
        <td>
          <div style="font-size:19pt;font-weight:bold;">${escapeHtml(branding.issuerName)}</div>
          <div class="muted">Powered by ${escapeHtml(branding.platformName)}</div>
        </td>
        <td style="text-align:right;">
          <div style="font-size:21pt;font-weight:bold;">Invoice</div>
          <div>${escapeHtml(invoice.invoiceNumber)}</div>
          <div>Status: ${escapeHtml(invoice.status.replace(/_/g, " "))}</div>
        </td>
      </tr>
    </table>

    <br />
    <table>
      <tr><td class="section-title" colspan="4">Invoice Details</td></tr>
      <tr>
        <th>Customer</th>
        <td>${escapeHtml(invoice.customerName)}</td>
        <th>Email</th>
        <td>${escapeHtml(invoice.customerEmail)}</td>
      </tr>
      <tr>
        <th>Issue Date</th>
        <td>${new Date(invoice.issueDate).toLocaleDateString()}</td>
        <th>Due Date</th>
        <td>${new Date(invoice.dueDate).toLocaleDateString()}</td>
      </tr>
      <tr>
        <th>Payment Method</th>
        <td>${escapeHtml(statusText)}</td>
        <th>Payment Options</th>
        <td>${escapeHtml(paymentSummary || "Not selected")}</td>
      </tr>
      ${invoice.period ? `<tr><th>Period</th><td colspan="3">${escapeHtml(invoice.period)}</td></tr>` : ""}
      ${!isPaid && branding.paymentUrl ? `<tr><th>Payment Link</th><td colspan="3"><a href="${escapeHtml(branding.paymentUrl)}">${escapeHtml(branding.paymentUrl)}</a></td></tr>` : ""}
    </table>

    <br />
    <table>
      <tr><td class="section-title" colspan="4">Line Items</td></tr>
      <tr>
        <th>Description</th>
        <th style="width:70px;text-align:center;">Qty</th>
        <th style="width:130px;text-align:right;">Unit Price</th>
        <th style="width:130px;text-align:right;">Amount</th>
      </tr>
      ${lineRows}
      <tr class="total-row">
        <td colspan="3" style="text-align:right;">Subtotal</td>
        <td style="text-align:right;">${formatCurrency(invoice.subtotal, invoice.currency)}</td>
      </tr>
      ${Number(invoice.discountAmount || 0) > 0 ? `
      <tr class="total-row">
        <td colspan="3" style="text-align:right;">Discount (${money(invoice.discountPercent || 0)}%)</td>
        <td style="text-align:right;">-${formatCurrency(invoice.discountAmount || 0, invoice.currency)}</td>
      </tr>` : ""}
      <tr class="total-row">
        <td colspan="3" style="text-align:right;">Tax</td>
        <td style="text-align:right;">${formatCurrency(invoice.tax, invoice.currency)}</td>
      </tr>
      <tr class="grand-total">
        <td colspan="3" style="text-align:right;">Total</td>
        <td style="text-align:right;">${formatCurrency(invoice.total, invoice.currency)}</td>
      </tr>
    </table>

    <br />
    <table>
      <tr><td class="section-title">Payment</td></tr>
      <tr>
        <td>
          ${isPaid ? `<strong>Payment Completed</strong><br />This invoice has been marked as paid.` : `
          <strong>Available payment options:</strong> ${escapeHtml(paymentSummary || "Not selected")}
          ${payButton ? `<br /><br />${payButton}` : ""}
          ${invoice.wireTransferInstructions ? `<br /><br /><strong>Wire Transfer Instructions:</strong><br />${escapeHtml(invoice.wireTransferInstructions)}` : ""}
          `}
        </td>
      </tr>
      ${invoice.notes ? `<tr><td><strong>Notes:</strong><br />${escapeHtml(invoice.notes)}</td></tr>` : ""}
    </table>

    <p class="muted" style="font-size:10pt;">Generated for ${appName} export.</p>
  </body>
</html>`;
}

function safeExportFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "invoice";
}

async function getInvoicePdfBrowser() {
  if (!invoicePdfBrowser) {
    invoicePdfBrowser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }

  return invoicePdfBrowser;
}

async function renderInvoicePdf(html: string) {
  const browser = await getInvoicePdfBrowser();
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

export async function getInvoiceExportDocument(
  invoiceId: string,
  format: InvoiceExportFormat,
  baseUrlOverride?: string,
) {
  if (!invoiceExportFormats.includes(format)) {
    throw new Error("Unsupported invoice export format");
  }

  const invoices = await getInvoices();
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) return undefined;

  const branding = await getInvoiceBranding(invoice, baseUrlOverride);
  const resolvedInvoice: InvoiceRecord = {
    ...invoice,
    issuerName: branding.issuerName,
    issuerLogoUrl: branding.logoUrl || undefined,
  };
  const html = buildInvoiceHtml(resolvedInvoice, branding);
  const filenameBase = safeExportFilename(`invoice-${invoice.invoiceNumber}`);

  if (format === "pdf") {
    return {
      buffer: await renderInvoicePdf(html),
      contentType: "application/pdf",
      filename: `${filenameBase}.pdf`,
    };
  }

  if (format === "word") {
    const officeHtml = buildInvoiceOfficeHtml(resolvedInvoice, branding, "word");
    return {
      buffer: Buffer.from(`\ufeff${officeHtml}`, "utf8"),
      contentType: "application/msword; charset=utf-8",
      filename: `${filenameBase}.doc`,
    };
  }

  const officeHtml = buildInvoiceOfficeHtml(resolvedInvoice, branding, "excel");
  return {
    buffer: Buffer.from(`\ufeff${officeHtml}`, "utf8"),
    contentType: "application/vnd.ms-excel; charset=utf-8",
    filename: `${filenameBase}.xls`,
  };
}

export async function sendInvoice(invoice: InvoiceRecord) {
  const branding = await getInvoiceBranding(invoice);
  await sendEmail({
    to: invoice.customerEmail,
    subject: `${branding.issuerName} Invoice ${invoice.invoiceNumber}`,
    html: buildInvoiceHtml(invoice, branding),
    requireDelivery: true,
  });
}

export async function sendInvoiceReminder(invoice: InvoiceRecord) {
  const branding = await getInvoiceBranding(invoice);
  await sendEmail({
    to: invoice.customerEmail,
    subject: `Payment reminder: ${branding.issuerName} Invoice ${invoice.invoiceNumber}`,
    html: buildInvoiceHtml(invoice, branding),
    requireDelivery: true,
  });
}

export async function createManualInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord> {
  const settings = await getInvoiceSettings();
  const now = new Date();
  const lineItems = normalizeLineItems(input.lineItems);
  const subtotal = money(lineItems.reduce((sum, item) => sum + item.amount, 0));
  const discountPercent = percent(input.discountPercent);
  const discountAmount = money(subtotal * (discountPercent / 100));
  const tax = money(input.tax || 0);
  const total = money(Math.max(subtotal - discountAmount + tax, 0));
  const branding = await resolveInvoiceIssuerBranding({
    issuerUserId: input.issuerUserId,
    issuerName: input.issuerName,
    issuerLogoUrl: input.issuerLogoUrl,
  });
  const customerEmail = input.customerEmail.trim();
  const customerName = input.customerName?.trim() || customerEmail.split("@")[0] || "Customer";
  const invoice: InvoiceRecord = {
    id: randomUUID(),
    invoiceNumber: generateInvoiceNumber("manual"),
    type: "manual",
    status: "draft",
    customerName,
    customerEmail,
    issuerUserId: input.issuerUserId || undefined,
    issuerName: branding.issuerName,
    issuerLogoUrl: branding.logoUrl || undefined,
    issueDate: now.toISOString(),
    dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : addDays(now, settings.defaultDueDays).toISOString(),
    currency: input.currency || "USD",
    subtotal,
    discountPercent,
    discountAmount,
    tax,
    total,
    notes: input.notes,
    paymentMethods: normalizePaymentMethods(input.paymentMethods || settings.paymentMethods),
    wireTransferInstructions: input.wireTransferInstructions ?? settings.wireTransferInstructions,
    lineItems,
    createdBy: input.createdBy,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (input.sendNow) {
    await sendInvoice(invoice);
    invoice.status = "sent";
    invoice.sentAt = new Date().toISOString();
    invoice.updatedAt = invoice.sentAt;
  }

  const invoices = await getInvoices();
  await saveInvoices([invoice, ...invoices]);
  return invoice;
}

function orderRevenue(order: Order) {
  return money(order.price);
}

function orderCost(order: Order) {
  const providerCost = toNumber(order.wholesalePrice ?? order.airaloPrice);
  return money(providerCost * Math.max(1, toNumber(order.quantity || 1)));
}

function userName(user?: User) {
  return user?.name || user?.email || "Customer";
}

export async function generateMonthlyInvoice(input: GenerateMonthlyInput = {}): Promise<InvoiceRecord> {
  const settings = await getInvoiceSettings();
  const platformName = await getPlatformName();
  const { period, start, end, label } = getPeriodRange(input.period);
  const orders = await storage.getAllOrders();
  const users = await storage.getAllUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));

  const periodOrders = orders.filter((order) => {
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    return createdAt && createdAt >= start && createdAt < end;
  });
  const completedOrders = periodOrders.filter((order) => completedStatuses.has(String(order.status || "").toLowerCase()));
  const refundedOrders = periodOrders.filter((order) => refundedStatuses.has(String(order.status || "").toLowerCase()));
  const revenue = money(completedOrders.reduce((sum, order) => sum + orderRevenue(order), 0));
  const cost = money(completedOrders.reduce((sum, order) => sum + orderCost(order), 0));
  const profit = money(revenue - cost);
  const uniqueCustomerCount = new Set(completedOrders.map((order) => order.userId || order.guestEmail).filter(Boolean)).size;
  const recipientEmail = input.recipientEmail || settings.recipients.split(",")[0]?.trim();

  if (!recipientEmail && input.sendNow) {
    throw new Error("A billing recipient email is required before sending invoices");
  }

  const customerSamples = completedOrders
    .slice(0, 5)
    .map((order) => userName(order.userId ? usersById.get(order.userId) : undefined))
    .filter(Boolean)
    .join(", ");

  const now = new Date();
  const branding = await resolveInvoiceIssuerBranding({});
  const lineItems: InvoiceLineItem[] = [
    {
      id: randomUUID(),
      description: `${label} completed eSIM orders (${completedOrders.length} orders)`,
      quantity: Math.max(1, completedOrders.length),
      unitPrice: completedOrders.length > 0 ? money(revenue / completedOrders.length) : 0,
      amount: revenue,
    },
    {
      id: randomUUID(),
      description: `${label} provider cost`,
      quantity: 1,
      unitPrice: -cost,
      amount: -cost,
    },
    {
      id: randomUUID(),
      description: `${label} platform profit`,
      quantity: 1,
      unitPrice: profit,
      amount: profit,
    },
  ];

  const subtotal = money(lineItems.reduce((sum, item) => sum + item.amount, 0));
  const invoice: InvoiceRecord = {
    id: randomUUID(),
    invoiceNumber: generateInvoiceNumber("monthly"),
    type: "monthly",
    status: "draft",
    customerName: `${platformName} Monthly Billing`,
    customerEmail: recipientEmail || "admin@example.com",
    issuerName: branding.issuerName,
    issuerLogoUrl: branding.logoUrl || undefined,
    period,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    issueDate: now.toISOString(),
    dueDate: addDays(now, settings.defaultDueDays).toISOString(),
    currency: "USD",
    subtotal,
    tax: 0,
    total: subtotal,
    notes: `Summary includes ${uniqueCustomerCount} customers, ${refundedOrders.length} refund-related orders, and sample customers: ${customerSamples || "none"}.`,
    paymentMethods: settings.paymentMethods,
    wireTransferInstructions: settings.wireTransferInstructions,
    lineItems,
    createdBy: input.createdBy,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (input.sendNow) {
    await sendInvoice(invoice);
    invoice.status = "sent";
    invoice.sentAt = new Date().toISOString();
    invoice.updatedAt = invoice.sentAt;
  }

  const invoices = await getInvoices();
  await saveInvoices([invoice, ...invoices]);
  return invoice;
}

async function updateInvoice(invoiceId: string, updater: (invoice: InvoiceRecord) => InvoiceRecord) {
  const invoices = await getInvoices();
  const index = invoices.findIndex((item) => item.id === invoiceId);
  if (index === -1) return undefined;

  const updated = {
    ...updater(invoices[index]),
    updatedAt: new Date().toISOString(),
  };
  invoices[index] = updated;
  await saveInvoices(invoices);
  return updated;
}

export async function listInvoiceIssuers() {
  const users = await storage.getAllUsers();
  return users
    .filter((user) => ["agent", "reseller"].includes(user.role))
    .map((user) => ({
      id: user.id,
      role: user.role,
      name: user.name || user.email,
      email: user.email,
      storeName: user.resellerStoreName || user.name || user.email,
      logoUrl: user.resellerLogoUrl || "",
    }));
}

function validateVoucherForInvoice(voucher: Awaited<ReturnType<typeof storage.getVoucherByCode>>, invoice: InvoiceRecord) {
  if (!voucher) throw new Error("Invalid voucher code");
  const now = new Date();
  if (voucher.status !== "active" || now < voucher.validFrom || now > voucher.validUntil) {
    throw new Error("This voucher is not active or has expired");
  }
  if (voucher.maxUses && voucher.currentUses >= voucher.maxUses) {
    throw new Error("This voucher has reached its usage limit");
  }

  const value = toNumber(voucher.value);
  const type = String(voucher.type || "").toLowerCase();
  let payableAmount = 0;
  if (type === "percentage") {
    payableAmount = money(invoice.total * (value / 100));
    if (voucher.maxDiscountAmount) {
      payableAmount = Math.min(payableAmount, money(voucher.maxDiscountAmount));
    }
  } else {
    payableAmount = money(value);
  }

  if (payableAmount < money(invoice.total)) {
    throw new Error(`Voucher value ${formatCurrency(payableAmount, invoice.currency)} is less than invoice total ${formatCurrency(invoice.total, invoice.currency)}`);
  }

  return payableAmount;
}

export async function payInvoiceWithVoucher(invoiceId: string, code: string) {
  const invoices = await getInvoices();
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) return undefined;
  if (invoice.status === "paid") return invoice;

  const voucher = await storage.getVoucherByCode(code);
  const payableAmount = validateVoucherForInvoice(voucher, invoice);
  await storage.incrementVoucherUsage(voucher!.id);
  await storage.createVoucherUsage({
    voucherId: voucher!.id,
    discountAmount: money(Math.min(payableAmount, invoice.total)).toFixed(2),
  } as any);

  return updateInvoice(invoiceId, (current) => ({
    ...current,
    status: "paid",
    paidAt: new Date().toISOString(),
    paymentMethod: "voucher",
    paymentReference: voucher!.code,
    paymentNotes: "Paid using voucher",
  }));
}

export async function recordInvoicePaymentRequest(
  invoiceId: string,
  method: InvoicePaymentMethod,
  input: { reference?: string; notes?: string; payerName?: string } = {},
) {
  const invoices = await getInvoices();
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) return undefined;
  if (invoice.status === "paid") return invoice;
  if (!normalizePaymentMethods(invoice.paymentMethods).includes(method)) {
    throw new Error(`${paymentMethodLabel(method)} is not enabled for this invoice`);
  }

  return updateInvoice(invoiceId, (current) => ({
    ...current,
    status: "payment_pending",
    paymentMethod: method,
    paymentReference: input.reference,
    paymentNotes: input.notes || input.payerName,
  }));
}

export async function sendExistingInvoice(invoiceId: string) {
  const invoices = await getInvoices();
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) return undefined;

  await sendInvoice(invoice);
  invoice.status = "sent";
  invoice.sentAt = new Date().toISOString();
  invoice.updatedAt = invoice.sentAt;
  await saveInvoices(invoices);
  return invoice;
}

export async function markInvoicePaid(invoiceId: string, input: { reference?: string; notes?: string } = {}) {
  const invoices = await getInvoices();
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) return undefined;

  return updateInvoice(invoiceId, (current) => ({
    ...current,
    status: "paid",
    paidAt: current.paidAt || new Date().toISOString(),
    paymentMethod: current.paymentMethod || "manual",
    paymentReference: input.reference || current.paymentReference,
    paymentNotes: input.notes || current.paymentNotes || "Marked paid manually",
  }));
}

export async function sendExistingInvoiceReminder(invoiceId: string) {
  const invoices = await getInvoices();
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) return undefined;
  if (invoice.status === "paid") return invoice;

  await sendInvoiceReminder(invoice);
  return updateInvoice(invoiceId, (current) => ({
    ...current,
    reminderSentAt: new Date().toISOString(),
    status: current.status === "draft" ? "sent" : current.status,
  }));
}

function invoiceBelongsToUser(invoice: InvoiceRecord, userId: string) {
  return invoice.createdBy === userId || invoice.issuerUserId === userId;
}

function buildInvoiceStatistics(invoices: InvoiceRecord[]) {
  const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const sentAmount = invoices
    .filter((invoice) => invoice.status === "sent")
    .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);

  return {
    totalInvoices: invoices.length,
    sentInvoices: invoices.filter((invoice) => invoice.status === "sent").length,
    draftInvoices: invoices.filter((invoice) => invoice.status === "draft").length,
    totalAmount: money(totalAmount),
    sentAmount: money(sentAmount),
  };
}

export async function getInvoiceDashboard() {
  const [settings, rawInvoices] = await Promise.all([getInvoiceSettings(), getInvoices()]);
  const invoices = await Promise.all(rawInvoices.map((invoice) => withResolvedInvoiceBranding(invoice)));

  return {
    settings,
    invoices,
    statistics: buildInvoiceStatistics(invoices),
  };
}

export async function getAccountInvoiceDashboard(userId: string, baseUrlOverride?: string) {
  const [settings, rawInvoices] = await Promise.all([getInvoiceSettings(), getInvoices()]);
  const accountInvoices = rawInvoices.filter((invoice) => invoiceBelongsToUser(invoice, userId));
  const invoices = await Promise.all(
    accountInvoices.map((invoice) => withResolvedInvoiceBranding(invoice, baseUrlOverride)),
  );

  return {
    settings,
    invoices,
    statistics: buildInvoiceStatistics(invoices),
  };
}

export async function sendOwnedInvoice(invoiceId: string, userId: string) {
  const invoices = await getInvoices();
  const invoice = invoices.find((item) => item.id === invoiceId && invoiceBelongsToUser(item, userId));
  if (!invoice) return undefined;

  await sendInvoice(invoice);
  invoice.status = "sent";
  invoice.sentAt = new Date().toISOString();
  invoice.updatedAt = invoice.sentAt;
  await saveInvoices(invoices);
  return withResolvedInvoiceBranding(invoice);
}

export async function markOwnedInvoicePaid(invoiceId: string, userId: string, input: { reference?: string; notes?: string } = {}) {
  const invoices = await getInvoices();
  const invoice = invoices.find((item) => item.id === invoiceId && invoiceBelongsToUser(item, userId));
  if (!invoice) return undefined;
  return markInvoicePaid(invoiceId, input);
}

export async function sendOwnedInvoiceReminder(invoiceId: string, userId: string) {
  const invoices = await getInvoices();
  const invoice = invoices.find((item) => item.id === invoiceId && invoiceBelongsToUser(item, userId));
  if (!invoice) return undefined;
  const updated = await sendExistingInvoiceReminder(invoiceId);
  return updated ? withResolvedInvoiceBranding(updated) : undefined;
}

export async function getOwnedInvoiceExportDocument(
  invoiceId: string,
  userId: string,
  format: InvoiceExportFormat,
  baseUrlOverride?: string,
) {
  const invoices = await getInvoices();
  const invoice = invoices.find((item) => item.id === invoiceId && invoiceBelongsToUser(item, userId));
  if (!invoice) return undefined;
  return getInvoiceExportDocument(invoiceId, format, baseUrlOverride);
}

export async function runMonthlyInvoiceAutomation(date = new Date()) {
  const settings = await getInvoiceSettings();
  if (!settings.autoSendMonthly) return { skipped: true, reason: "Monthly invoice automation is disabled" };
  if (!settings.recipients.trim()) return { skipped: true, reason: "No invoice recipients configured" };
  if (date.getDate() !== settings.sendDay) return { skipped: true, reason: "Today is not the configured invoice day" };

  const period = previousMonthPeriod(date);
  if (settings.lastAutoSentPeriod === period) {
    return { skipped: true, reason: `Invoice for ${period} was already sent` };
  }

  const invoice = await generateMonthlyInvoice({
    period,
    recipientEmail: settings.recipients,
    sendNow: true,
    createdBy: "system",
  });

  await saveInvoiceSettings({
    lastAutoSentPeriod: period,
    lastAutoSentAt: new Date().toISOString(),
  });

  return { skipped: false, invoice };
}

export async function runInvoiceReminderAutomation(date = new Date()) {
  const settings = await getInvoiceSettings();
  if (!settings.autoSendReminders) return { skipped: true, reason: "Invoice reminders are disabled" };

  const todayKey = date.toISOString().slice(0, 10);
  if (settings.lastReminderRunAt?.slice(0, 10) === todayKey) {
    return { skipped: true, reason: "Invoice reminders already ran today" };
  }

  const invoices = await getInvoices();
  const reminderWindowMs = settings.reminderDaysBeforeDue * 24 * 60 * 60 * 1000;
  const sent: InvoiceRecord[] = [];

  for (const invoice of invoices) {
    if (invoice.status === "paid") continue;
    if (invoice.reminderSentAt?.slice(0, 10) === todayKey) continue;
    const dueTime = new Date(invoice.dueDate).getTime();
    if (!Number.isFinite(dueTime)) continue;
    const timeUntilDue = dueTime - date.getTime();
    if (timeUntilDue > reminderWindowMs) continue;

    await sendInvoiceReminder(invoice);
    const updated = await updateInvoice(invoice.id, (current) => ({
      ...current,
      reminderSentAt: new Date().toISOString(),
      status: current.status === "draft" ? "sent" : current.status,
    }));
    if (updated) sent.push(updated);
  }

  await saveInvoiceSettings({ lastReminderRunAt: new Date().toISOString() });
  return { skipped: false, sentCount: sent.length, invoices: sent };
}
