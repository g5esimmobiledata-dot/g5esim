import crypto from "crypto";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { eq, inArray } from "drizzle-orm";
import { db } from "server/db";
import { settings, users } from "@shared/schema";
import { sendEmail } from "server/email";

const SANDBOX_SETTING_KEYS = [
  "demo_mode_enabled",
  "demo_mode_environment",
  "sandbox_wallet_topup_enabled",
  "sandbox_wallet_topup_max",
  "sandbox_apply_customer",
  "sandbox_apply_agent",
  "sandbox_apply_reseller",
] as const;

export type SandboxRole = "customer" | "agent" | "reseller";

export type SandboxDemoSettings = {
  demoModeEnabled: boolean;
  environment: "live" | "sandbox";
  isSandbox: boolean;
  walletTopupEnabled: boolean;
  maxWalletTopupAmount: number;
  roleAccess: Record<SandboxRole, boolean>;
};

function getConfiguredBaseUrl(value = process.env.API_BASE_URL || process.env.BASE_URL) {
  const rawUrl = (value || `http://localhost:${process.env.PORT || 5000}`).trim().replace(/\/$/, "");
  return /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
}

function randomDigits(length: number) {
  let value = "";
  while (value.length < length) {
    value += crypto.randomInt(0, 10).toString();
  }
  return value;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getSettingMap() {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, [...SANDBOX_SETTING_KEYS, "platform_name"]));

  return rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function getSandboxDemoSettings(): Promise<SandboxDemoSettings> {
  const settingMap = await getSettingMap();
  const environment = settingMap.demo_mode_environment === "sandbox" ? "sandbox" : "live";
  const maxWalletTopupAmount = Number(settingMap.sandbox_wallet_topup_max || 500);

  return {
    demoModeEnabled: settingMap.demo_mode_enabled === "true",
    environment,
    isSandbox: settingMap.demo_mode_enabled === "true" && environment === "sandbox",
    walletTopupEnabled: settingMap.sandbox_wallet_topup_enabled !== "false",
    maxWalletTopupAmount:
      Number.isFinite(maxWalletTopupAmount) && maxWalletTopupAmount > 0
        ? Math.round(maxWalletTopupAmount * 100) / 100
        : 500,
    roleAccess: {
      customer: settingMap.sandbox_apply_customer !== "false",
      agent: settingMap.sandbox_apply_agent !== "false",
      reseller: settingMap.sandbox_apply_reseller !== "false",
    },
  };
}

function normalizeSandboxRole(role?: string | null): SandboxRole {
  if (role === "agent" || role === "reseller") return role;
  return "customer";
}

export function isSandboxEnabledForRole(
  sandboxSettings: SandboxDemoSettings,
  role?: string | null,
) {
  if (!sandboxSettings.isSandbox) return false;
  return sandboxSettings.roleAccess[normalizeSandboxRole(role)] !== false;
}

export async function isSandboxDemoModeForRole(role?: string | null) {
  const sandboxSettings = await getSandboxDemoSettings();
  return isSandboxEnabledForRole(sandboxSettings, role);
}

export async function isSandboxDemoModeForUser(userId?: string | null) {
  const sandboxSettings = await getSandboxDemoSettings();
  if (!userId) return isSandboxEnabledForRole(sandboxSettings, "customer");

  const [user] = await db
    .select({ role: users.role, accountMode: users.accountMode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.accountMode === "sandbox" || user?.accountMode === "demo") return true;

  return isSandboxEnabledForRole(sandboxSettings, user?.role);
}

export async function isSandboxDemoMode() {
  return isSandboxDemoModeForRole("customer");
}

async function saveSandboxQrCode(lpaCode: string, orderId: string | number) {
  const qrDir = path.join(process.cwd(), "uploads", "qrcodes");
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }

  const safeOrderId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `qr_sandbox_${safeOrderId}_${Date.now()}.png`;
  const filePath = path.join(qrDir, filename);

  await QRCode.toFile(filePath, lpaCode, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    type: "png",
  });

  return `${getConfiguredBaseUrl()}/uploads/qrcodes/${filename}`;
}

export async function createSandboxEsimDetails(orderId: string | number) {
  const orderSegment = String(orderId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || randomDigits(8);
  const activationCode = `SANDBOX-${orderSegment}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const smdpAddress = "sandbox.smdp.example";
  const lpaCode = `LPA:1$${smdpAddress}$${activationCode}`;
  const qrCodeUrl = await saveSandboxQrCode(lpaCode, orderId);

  return {
    providerOrderId: `SANDBOX-${orderSegment}-${Date.now()}`,
    requestId: `SANDBOX-REQ-${orderSegment}-${Date.now()}`,
    simDetails: {
      iccid: `890199${randomDigits(13)}`,
      qrCode: lpaCode,
      qrCodeUrl,
      lpaCode,
      smdpAddress,
      activationCode,
      directAppleUrl: null,
      apnType: "automatic",
      apnValue: null,
      isRoaming: false,
    },
  };
}

export async function sendSandboxDemoOrderEmail({
  to,
  customerName,
  order,
  pkg,
  simDetails,
  qrCodeUrl,
}: {
  to?: string | null;
  customerName?: string | null;
  order: any;
  pkg: any;
  simDetails: any;
  qrCodeUrl?: string | null;
}) {
  if (!to) return;

  const settingMap = await getSettingMap();
  const platformName = settingMap.platform_name || "eSIM Platform";
  const packageName = pkg?.title || pkg?.name || `${pkg?.dataAmount || "eSIM"} - ${pkg?.validity || "N/A"} Days`;
  const orderNumber = order?.displayOrderId || order?.id;

  await sendEmail({
    to,
    subject: `[Sandbox Demo] eSIM test order ${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:0 auto;padding:20px;background:#f8fafc;">
        <div style="background:#0f766e;color:white;padding:28px;border-radius:10px 10px 0 0;">
          <h1 style="margin:0;font-size:24px;">Sandbox Demo Order</h1>
          <p style="margin:8px 0 0;font-size:14px;">${escapeHtml(platformName)} test purchase completed.</p>
        </div>
        <div style="background:white;padding:28px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:0;">
          <p>Hi <strong>${escapeHtml(customerName || "Customer")}</strong>,</p>
          <p>This is a sandbox demo eSIM. It uses the same order, wallet, email, and installation flow as live checkout, but no real provider order was placed and the QR code will not activate a real eSIM.</p>

          <div style="background:#ecfeff;border:1px solid #99f6e4;border-radius:8px;padding:16px;margin:20px 0;">
            <strong>Developer note:</strong> You can use this email to verify the checkout and delivery experience without charging provider inventory.
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:14px;margin:20px 0;">
            <tr><td style="padding:8px 0;color:#64748b;">Order</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(orderNumber)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Package</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(packageName)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Data</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(pkg?.dataAmount || order?.dataAmount || "N/A")}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Validity</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(pkg?.validity || order?.validity || "N/A")} days</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">ICCID</td><td style="padding:8px 0;font-family:monospace;">${escapeHtml(simDetails?.iccid)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">SM-DP+ Address</td><td style="padding:8px 0;font-family:monospace;">${escapeHtml(simDetails?.smdpAddress)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Activation Code</td><td style="padding:8px 0;font-family:monospace;">${escapeHtml(simDetails?.activationCode)}</td></tr>
          </table>

          ${qrCodeUrl ? `
            <div style="text-align:center;margin:24px 0;">
              <img src="${escapeHtml(qrCodeUrl)}" alt="Sandbox eSIM QR" style="max-width:220px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:white;" />
            </div>
          ` : ""}

          <div style="background:#f3f4f6;border-radius:8px;padding:14px;margin-top:20px;">
            <p style="margin:0 0 8px;font-weight:600;">Manual LPA Code</p>
            <p style="margin:0;font-family:monospace;font-size:12px;word-break:break-all;">${escapeHtml(simDetails?.lpaCode)}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
