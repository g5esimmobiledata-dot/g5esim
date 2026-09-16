import type { Request } from "express";
import crypto from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { activityLogs, users, type User } from "@shared/schema";
import { storage } from "../storage";

export type UserSecurityConfig = {
  twoFactorEnabled: boolean;
  otpEmailEnabled: boolean;
  otpPhoneEnabled: boolean;
  totpSecret: string;
  pendingTotpSecret: string;
  allowVpn: boolean;
  blockedIps: string[];
  whitelistIps: string[];
};

const defaultSecurityConfig: UserSecurityConfig = {
  twoFactorEnabled: false,
  otpEmailEnabled: true,
  otpPhoneEnabled: false,
  totpSecret: "",
  pendingTotpSecret: "",
  allowVpn: true,
  blockedIps: [],
  whitelistIps: [],
};

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ipLookupCache = new Map<string, { expiresAt: number; lookup: ReturnType<typeof buildIpLookup> }>();
const ipLookupCacheMs = 6 * 60 * 60 * 1000;

export function getClientIp(req: Request) {
  const forwarded = req.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.get("x-real-ip")?.trim();
  return forwarded || realIp || req.ip || req.socket.remoteAddress || "unknown";
}

function normalizeIp(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^::ffff:/, "");
}

export function getSecurityConfig(user?: Pick<User, "resellerStoreConfig"> | null): UserSecurityConfig {
  const source = ((user?.resellerStoreConfig as any)?.security || {}) as Partial<UserSecurityConfig>;
  return {
    twoFactorEnabled: Boolean(source.twoFactorEnabled),
    otpEmailEnabled: source.otpEmailEnabled !== false,
    otpPhoneEnabled: Boolean(source.otpPhoneEnabled),
    totpSecret: typeof source.totpSecret === "string" ? source.totpSecret : "",
    pendingTotpSecret: typeof source.pendingTotpSecret === "string" ? source.pendingTotpSecret : "",
    allowVpn: source.allowVpn !== false,
    blockedIps: Array.isArray(source.blockedIps) ? source.blockedIps.map(normalizeIp).filter(Boolean) : [],
    whitelistIps: Array.isArray(source.whitelistIps) ? source.whitelistIps.map(normalizeIp).filter(Boolean) : [],
  };
}

function base32Encode(buffer: Buffer) {
  let bits = "";
  let output = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += base32Alphabet[parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(value: string) {
  const clean = value.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const index = base32Alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function buildTotpUrl(secret: string, accountLabel: string, issuer = "eSIM Marketplace") {
  const label = `${issuer}:${accountLabel}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

function generateTotpCode(secret: string, timeStep = Math.floor(Date.now() / 30000)) {
  const key = base32Decode(secret);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(timeStep / 0x100000000), 0);
  counter.writeUInt32BE(timeStep >>> 0, 4);
  const hmac = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotpCode(secret: string, code: unknown) {
  const normalizedCode = String(code || "").replace(/\s+/g, "");
  if (!secret || !/^\d{6}$/.test(normalizedCode)) return false;
  const currentStep = Math.floor(Date.now() / 30000);
  for (let drift = -1; drift <= 1; drift += 1) {
    if (generateTotpCode(secret, currentStep + drift) === normalizedCode) return true;
  }
  return false;
}

export async function saveSecurityConfig(userId: string, updates: Partial<UserSecurityConfig>) {
  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");

  const currentConfig = getSecurityConfig(user);
  const nextConfig: UserSecurityConfig = {
    ...currentConfig,
    ...updates,
    blockedIps: updates.blockedIps ? Array.from(new Set(updates.blockedIps.map(normalizeIp).filter(Boolean))) : currentConfig.blockedIps,
    whitelistIps: updates.whitelistIps ? Array.from(new Set(updates.whitelistIps.map(normalizeIp).filter(Boolean))) : currentConfig.whitelistIps,
  };
  const currentStoreConfig = ((user.resellerStoreConfig as Record<string, unknown>) || {}) as Record<string, unknown>;
  const nextStoreConfig = {
    ...currentStoreConfig,
    security: nextConfig,
  };

  const [updated] = await db
    .update(users)
    .set({ resellerStoreConfig: nextStoreConfig, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return getSecurityConfig(updated);
}

export async function assertLoginAllowed(req: Request, user: User) {
  const ip = normalizeIp(getClientIp(req));
  const security = getSecurityConfig(user);

  if (security.whitelistIps.includes(ip)) return;
  if (security.blockedIps.includes(ip)) {
    throw new Error("Login blocked from this IP address.");
  }
}

export async function recordLoginActivity(req: Request, user: User, method: string) {
  const ipAddress = normalizeIp(getClientIp(req));
  const ipLookup = await enrichIpLookup(ipAddress);
  await storage.createActivityLog({
    userId: user.id,
    action: "login",
    entity: "security",
    entityId: user.id,
    ipAddress,
    userAgent: req.get("user-agent") || "",
    metadata: {
      method,
      ipLookup,
    },
  });
}

export function isPrivateIp(ip: string) {
  return (
    ip === "localhost" ||
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

export function buildIpLookup(ipInput: unknown) {
  const ip = normalizeIp(ipInput);
  const privateIp = isPrivateIp(ip);
  return {
    ip,
    country: privateIp ? "Local Network" : "Unknown",
    city: privateIp ? "Local Device" : "Unknown",
    isp: privateIp ? "Private Network" : "Unknown",
    vpn: "unknown",
    risk: privateIp ? "trusted-local" : "needs-review",
    latitude: null as number | null,
    longitude: null as number | null,
    mapUrl: privateIp ? "" : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ip)}`,
    lookupUrl: privateIp ? "" : `https://ipinfo.io/${encodeURIComponent(ip)}`,
  };
}

export async function enrichIpLookup(ipInput: unknown) {
  const base = buildIpLookup(ipInput);
  if (!base.ip || base.ip === "unknown" || isPrivateIp(base.ip)) return base;

  const cached = ipLookupCache.get(base.ip);
  if (cached && cached.expiresAt > Date.now()) return cached.lookup;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(base.ip)}?security=1`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) return base;

    const data: any = await response.json();
    if (data?.success === false) return base;

    const latitude = typeof data?.latitude === "number" ? data.latitude : null;
    const longitude = typeof data?.longitude === "number" ? data.longitude : null;
    const security = data?.security || {};
    const vpnDetected = Boolean(security.vpn || security.proxy || security.tor || security.relay || security.hosting);
    const lookup = {
      ...base,
      country: typeof data?.country === "string" && data.country ? data.country : base.country,
      city: typeof data?.city === "string" && data.city ? data.city : base.city,
      isp:
        typeof data?.connection?.isp === "string" && data.connection.isp
          ? data.connection.isp
          : typeof data?.connection?.org === "string" && data.connection.org
            ? data.connection.org
            : base.isp,
      vpn: vpnDetected ? "detected" : "not detected",
      risk: vpnDetected ? "vpn-or-proxy" : "public-ip",
      latitude,
      longitude,
      mapUrl:
        latitude !== null && longitude !== null
          ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
          : base.mapUrl,
    };

    ipLookupCache.set(base.ip, { expiresAt: Date.now() + ipLookupCacheMs, lookup });
    return lookup;
  } catch {
    return base;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLoginIpLogs(userId: string) {
  const rows = await db
    .select()
    .from(activityLogs)
    .where(and(eq(activityLogs.userId, userId), eq(activityLogs.action, "login")))
    .orderBy(desc(activityLogs.createdAt))
    .limit(100);

  return Promise.all(rows.map(async (row) => {
    const savedLookup = (row.metadata as any)?.ipLookup;
    const needsEnrichment =
      savedLookup &&
      savedLookup.country === "Unknown" &&
      !savedLookup.latitude &&
      !isPrivateIp(savedLookup.ip || row.ipAddress || "");

    return {
      ...row,
      ipLookup: needsEnrichment ? await enrichIpLookup(savedLookup.ip || row.ipAddress) : savedLookup || (await enrichIpLookup(row.ipAddress)),
    };
  }));
}

export async function ensureActivityLogIndexes() {
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS activity_logs_user_action_created_idx
    ON activity_logs (user_id, action, created_at DESC)
  `);
}
