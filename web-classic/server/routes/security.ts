import { Router, type Request, type Response } from "express";
import QRCode from "qrcode";
import { z } from "zod";
import * as ApiResponse from "../utils/response";
import { storage } from "../storage";
import {
  buildTotpUrl,
  enrichIpLookup,
  generateTotpSecret,
  getClientIp,
  getLoginIpLogs,
  getSecurityConfig,
  saveSecurityConfig,
  verifyTotpCode,
} from "../services/security-service";

const router = Router();

function getSessionUserId(req: Request) {
  return req.session?.userId || (req as any).userId || null;
}

async function requireSecurityUser(req: Request, res: Response) {
  const userId = getSessionUserId(req);
  if (!userId) {
    ApiResponse.unauthorized(res, "Unauthorized");
    return null;
  }
  const user = await storage.getUser(userId);
  if (!user) {
    ApiResponse.unauthorized(res, "User not found");
    return null;
  }
  return user;
}

const settingsSchema = z.object({
  twoFactorEnabled: z.boolean().optional(),
  otpEmailEnabled: z.boolean().optional(),
  otpPhoneEnabled: z.boolean().optional(),
  allowVpn: z.boolean().optional(),
  blockedIps: z.array(z.string().trim().min(1)).optional(),
  whitelistIps: z.array(z.string().trim().min(1)).optional(),
});

const ipSchema = z.object({
  ip: z.string().trim().min(1),
});

const totpVerifySchema = z.object({
  code: z.string().trim().min(6),
});

function publicSettings(user: Awaited<ReturnType<typeof requireSecurityUser>>) {
  const settings = getSecurityConfig(user);
  const { totpSecret, pendingTotpSecret, ...safeSettings } = settings;
  return {
    ...safeSettings,
    authenticatorConfigured: Boolean(totpSecret),
  };
}

router.get("/", async (req, res) => {
  try {
    const user = await requireSecurityUser(req, res);
    if (!user) return;

    const [logs, currentIpLookup] = await Promise.all([
      getLoginIpLogs(user.id),
      enrichIpLookup(getClientIp(req)),
    ]);
    ApiResponse.success(res, "Security settings loaded", {
      settings: publicSettings(user),
      currentIp: getClientIp(req),
      currentIpLookup,
      logs,
    });
  } catch (error: any) {
    ApiResponse.serverError(res, error.message);
  }
});

router.put("/settings", async (req, res) => {
  try {
    const user = await requireSecurityUser(req, res);
    if (!user) return;

    const parsed = settingsSchema.parse(req.body || {});
    const settings = await saveSecurityConfig(user.id, parsed);
    ApiResponse.success(res, "Security settings saved", { settings: publicSettings({ ...user, resellerStoreConfig: { ...(user.resellerStoreConfig as any || {}), security: settings } } as any) });
  } catch (error: any) {
    ApiResponse.serverError(res, error.message);
  }
});

router.post("/totp/setup", async (req, res) => {
  try {
    const user = await requireSecurityUser(req, res);
    if (!user) return;

    const secret = generateTotpSecret();
    await saveSecurityConfig(user.id, { pendingTotpSecret: secret } as any);
    const otpauthUrl = buildTotpUrl(secret, user.email || user.id);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    ApiResponse.success(res, "Authenticator setup prepared", {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    });
  } catch (error: any) {
    ApiResponse.serverError(res, error.message);
  }
});

router.post("/totp/verify", async (req, res) => {
  try {
    const user = await requireSecurityUser(req, res);
    if (!user) return;

    const { code } = totpVerifySchema.parse(req.body || {});
    const current = getSecurityConfig(user);
    const secret = current.pendingTotpSecret || current.totpSecret;
    if (!verifyTotpCode(secret, code)) {
      return ApiResponse.badRequest(res, "Invalid authenticator code");
    }

    const settings = await saveSecurityConfig(user.id, {
      twoFactorEnabled: true,
      totpSecret: secret,
      pendingTotpSecret: "",
    } as any);

    ApiResponse.success(res, "Authenticator 2FA enabled", {
      settings: {
        twoFactorEnabled: settings.twoFactorEnabled,
        otpEmailEnabled: settings.otpEmailEnabled,
        otpPhoneEnabled: settings.otpPhoneEnabled,
        allowVpn: settings.allowVpn,
        blockedIps: settings.blockedIps,
        whitelistIps: settings.whitelistIps,
        authenticatorConfigured: Boolean(settings.totpSecret),
      },
    });
  } catch (error: any) {
    ApiResponse.serverError(res, error.message);
  }
});

router.post("/totp/disable", async (req, res) => {
  try {
    const user = await requireSecurityUser(req, res);
    if (!user) return;

    const settings = await saveSecurityConfig(user.id, {
      twoFactorEnabled: false,
      totpSecret: "",
      pendingTotpSecret: "",
    } as any);
    ApiResponse.success(res, "Authenticator 2FA disabled", {
      settings: {
        twoFactorEnabled: settings.twoFactorEnabled,
        otpEmailEnabled: settings.otpEmailEnabled,
        otpPhoneEnabled: settings.otpPhoneEnabled,
        allowVpn: settings.allowVpn,
        blockedIps: settings.blockedIps,
        whitelistIps: settings.whitelistIps,
        authenticatorConfigured: false,
      },
    });
  } catch (error: any) {
    ApiResponse.serverError(res, error.message);
  }
});

router.post("/ip/block", async (req, res) => {
  try {
    const user = await requireSecurityUser(req, res);
    if (!user) return;

    const { ip } = ipSchema.parse(req.body || {});
    const current = getSecurityConfig(user);
    const settings = await saveSecurityConfig(user.id, {
      blockedIps: Array.from(new Set([...current.blockedIps, ip])),
      whitelistIps: current.whitelistIps.filter((item) => item !== ip),
    });
    ApiResponse.success(res, "IP blocked", { settings });
  } catch (error: any) {
    ApiResponse.serverError(res, error.message);
  }
});

router.post("/ip/unblock", async (req, res) => {
  try {
    const user = await requireSecurityUser(req, res);
    if (!user) return;

    const { ip } = ipSchema.parse(req.body || {});
    const current = getSecurityConfig(user);
    const settings = await saveSecurityConfig(user.id, {
      blockedIps: current.blockedIps.filter((item) => item !== ip),
    });
    ApiResponse.success(res, "IP unblocked", { settings });
  } catch (error: any) {
    ApiResponse.serverError(res, error.message);
  }
});

router.post("/ip/whitelist", async (req, res) => {
  try {
    const user = await requireSecurityUser(req, res);
    if (!user) return;

    const { ip } = ipSchema.parse(req.body || {});
    const current = getSecurityConfig(user);
    const settings = await saveSecurityConfig(user.id, {
      whitelistIps: Array.from(new Set([...current.whitelistIps, ip])),
      blockedIps: current.blockedIps.filter((item) => item !== ip),
    });
    ApiResponse.success(res, "IP whitelisted", { settings });
  } catch (error: any) {
    ApiResponse.serverError(res, error.message);
  }
});

router.post("/ip/remove-whitelist", async (req, res) => {
  try {
    const user = await requireSecurityUser(req, res);
    if (!user) return;

    const { ip } = ipSchema.parse(req.body || {});
    const current = getSecurityConfig(user);
    const settings = await saveSecurityConfig(user.id, {
      whitelistIps: current.whitelistIps.filter((item) => item !== ip),
    });
    ApiResponse.success(res, "IP removed from whitelist", { settings });
  } catch (error: any) {
    ApiResponse.serverError(res, error.message);
  }
});

router.post("/ip/lookup", async (req, res) => {
  try {
    const { ip } = ipSchema.parse(req.body || {});
    ApiResponse.success(res, "IP lookup prepared", { lookup: await enrichIpLookup(ip) });
  } catch (error: any) {
    ApiResponse.serverError(res, error.message);
  }
});

export default router;
