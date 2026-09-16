import crypto, { randomBytes } from "crypto";
import dgram from "dgram";
import { promises as dns } from "dns";
import { and, eq, sql } from "drizzle-orm";
import net from "net";
import tls from "tls";
import { db } from "server/db";
import { getAstppConfig, provisionAstppSipAccount } from "server/services/astpp-service";
import {
  ensureSipCommercialSchema,
  getDefaultSipRegistrationProfile,
  mergeSipFeatureSettings,
} from "server/services/sip-commercial-service";
import { getFreePbxConfig, getFreePbxRegistrationStatus, provisionFreePbxSipAccount } from "server/services/freepbx-service";
import { settings, userSipAccounts, users } from "@shared/schema";

type UserSipAccount = typeof userSipAccounts.$inferSelect;

let ensurePromise: Promise<void> | null = null;

function trim(value: unknown) {
  return String(value || "").trim();
}

async function getSettingValue(key: string) {
  const [setting] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return trim(setting?.value);
}

async function getSipDomain() {
  const astppConfig = await getAstppConfig();
  if (astppConfig.enabled && astppConfig.provider === "astpp" && astppConfig.sipDomain) {
    return astppConfig.sipDomain;
  }
  const freePbxConfig = await getFreePbxConfig();
  return (
    freePbxConfig.domain ||
    await getSettingValue("freepbx_sip_domain") ||
    await getSettingValue("user_sip_domain") ||
    await getSettingValue("linphone_sip_domain") ||
    await getSettingValue("concierge_sip_server") ||
    trim(process.env.USER_SIP_DOMAIN) ||
    trim(process.env.SIP_DOMAIN) ||
    "sip.localhost"
  );
}

async function getSipTransport() {
  const astppConfig = await getAstppConfig();
  if (astppConfig.enabled && astppConfig.provider === "astpp") {
    return astppConfig.transport;
  }
  return (
    await getSettingValue("freepbx_sip_transport") ||
    await getSettingValue("user_sip_transport") ||
    await getSettingValue("linphone_sip_transport") ||
    await getSettingValue("concierge_sip_transport") ||
    trim(process.env.USER_SIP_TRANSPORT) ||
    "udp"
  ).toLowerCase();
}

async function getSipPort(transport: string) {
  const astppConfig = await getAstppConfig();
  if (astppConfig.enabled && astppConfig.provider === "astpp") {
    return astppConfig.port;
  }
  const configuredPort =
    await getSettingValue("user_sip_port") ||
    await getSettingValue("linphone_sip_port") ||
    trim(process.env.USER_SIP_PORT);
  const port = Number(configuredPort || (transport === "tls" ? 5061 : 5060));
  return Number.isFinite(port) && port > 0 && port <= 65535 ? port : transport === "tls" ? 5061 : 5060;
}

function normalizeSipTransport(value: unknown) {
  const raw = trim(value).toLowerCase();
  if (raw.includes("tls")) return "tls";
  if (raw.includes("tcp")) return "tcp";
  if (raw.includes("udp")) return "udp";
  return raw || "udp";
}

function normalizeSipHost(value: string) {
  const raw = trim(value);
  const withoutScheme = raw.replace(/^sips?:/i, "");
  const withoutParams = withoutScheme.split(";")[0] || withoutScheme;
  const withoutUser = withoutParams.includes("@") ? withoutParams.split("@").pop() || withoutParams : withoutParams;
  return withoutUser.replace(/^\/+/, "").split(":")[0] || raw;
}

function isExternalSipProvider(metadata: Record<string, any>) {
  const provider = trim(metadata.provider).toLowerCase();
  return provider === "external_sip" || provider === "iptel" || provider === "custom_sip";
}

async function testTcpConnection(domain: string, port: number, transport: string) {
  return new Promise<void>((resolve, reject) => {
    const timeoutMs = 5000;
    const socket =
      transport === "tls"
        ? tls.connect({ host: domain, port, servername: domain, rejectUnauthorized: false })
        : net.connect({ host: domain, port });

    const done = (error?: Error) => {
      socket.removeAllListeners();
      socket.destroy();
      error ? reject(error) : resolve();
    };

    socket.setTimeout(timeoutMs, () => done(new Error(`Connection timed out after ${timeoutMs / 1000}s`)));
    socket.once(transport === "tls" ? "secureConnect" : "connect", () => done());
    socket.once("error", done);
  });
}

function buildPassword() {
  return randomBytes(12).toString("base64url");
}

function md5Hex(value: string) {
  return crypto.createHash("md5").update(value, "ascii").digest("hex");
}

function getSipHeader(response: string, header: string) {
  const regex = new RegExp(`^${header}:\\s*(.+)$`, "im");
  return response.match(regex)?.[1]?.trim() || "";
}

function getDigestParam(header: string, name: string) {
  const regex = new RegExp(`${name}="([^"]+)"`, "i");
  return header.match(regex)?.[1] || "";
}

function getSipStatusCode(response: string) {
  const code = Number(response.match(/^SIP\/2\.0\s+(\d+)/i)?.[1]);
  return Number.isFinite(code) ? code : 0;
}

async function sendUdpSipMessage(host: string, port: number, message: string) {
  return new Promise<string>((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const timeoutMs = 7000;
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error(`SIP server did not respond within ${Math.round(timeoutMs / 1000)}s.`));
    }, timeoutMs);

    socket.once("message", (buffer) => {
      clearTimeout(timer);
      socket.close();
      resolve(buffer.toString("ascii"));
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      socket.close();
      reject(error);
    });
    socket.send(Buffer.from(message, "ascii"), port, host);
  });
}

async function testUdpSipRegistration({
  username,
  password,
  domain,
  proxy,
  port,
}: {
  username: string;
  password: string;
  domain: string;
  proxy: string;
  port: number;
}) {
  const callId = `${randomBytes(12).toString("hex")}@eroaming`;
  const tag = randomBytes(6).toString("hex");
  const uri = `sip:${domain}`;
  const contact = `sip:${username}@127.0.0.1:5078`;
  const makeBranch = () => `z9hG4bK${randomBytes(12).toString("hex")}`;
  const buildRegister = (cseq: number, authorization = "") =>
    [
      `REGISTER ${uri} SIP/2.0`,
      `Via: SIP/2.0/UDP 127.0.0.1:5078;branch=${makeBranch()};rport`,
      "Max-Forwards: 70",
      `To: <sip:${username}@${domain}>`,
      `From: <sip:${username}@${domain}>;tag=${tag}`,
      `Call-ID: ${callId}`,
      `CSeq: ${cseq} REGISTER`,
      `Contact: <${contact}>`,
      "Expires: 600",
      "User-Agent: eRoaming-SIP-Test",
      authorization,
      "Content-Length: 0",
      "",
      "",
    ].filter(Boolean).join("\r\n");

  const challenge = await sendUdpSipMessage(proxy, port, buildRegister(1));
  const challengeCode = getSipStatusCode(challenge);
  if (challengeCode === 200) {
    return { registered: true, message: "SIP registration succeeded." };
  }
  if (challengeCode !== 401 && challengeCode !== 407) {
    return { registered: false, message: `SIP server returned ${challengeCode || "an unknown response"} before authentication.` };
  }

  const headerName = challengeCode === 407 ? "Proxy-Authenticate" : "WWW-Authenticate";
  const authHeader = getSipHeader(challenge, headerName);
  const realm = getDigestParam(authHeader, "realm") || domain;
  const nonce = getDigestParam(authHeader, "nonce");
  if (!nonce) {
    return { registered: false, message: "SIP server requested authentication but did not provide a nonce." };
  }

  const ha1 = md5Hex(`${username}:${realm}:${password}`);
  const ha2 = md5Hex(`REGISTER:${uri}`);
  const response = md5Hex(`${ha1}:${nonce}:${ha2}`);
  const authName = challengeCode === 407 ? "Proxy-Authorization" : "Authorization";
  const authorization = `${authName}: Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}", algorithm=MD5`;
  const finalResponse = await sendUdpSipMessage(proxy, port, buildRegister(2, authorization));
  const finalCode = getSipStatusCode(finalResponse);

  if (finalCode === 200) {
    return { registered: true, message: "SIP registration succeeded with the stored credentials." };
  }
  if (finalCode === 401 || finalCode === 403 || finalCode === 407) {
    return { registered: false, message: "SIP registration failed. Check the SIP username or password." };
  }
  return { registered: false, message: `SIP registration failed with response ${finalCode || "unknown"}.` };
}

function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
}

function buildUsername(user: typeof users.$inferSelect) {
  const displayId = user.displayUserId ? String(user.displayUserId).padStart(6, "0") : "";
  if (displayId) return `user${displayId}`;

  const emailPrefix = normalizeUsername(user.email.split("@")[0] || "user");
  return `${emailPrefix || "user"}${user.id.replace(/-/g, "").slice(0, 8)}`;
}

function buildAstppUsername(user: typeof users.$inferSelect) {
  const displayId = user.displayUserId ? String(user.displayUserId).replace(/\D/g, "") : "";
  if (displayId) return `10${displayId.padStart(6, "0")}`.slice(0, 15);

  const hash = user.id.replace(/\D/g, "").slice(0, 10);
  return `10${(hash || Date.now().toString()).slice(0, 10)}`.slice(0, 15);
}

export async function ensureUserSipSchema() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS user_sip_accounts (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          username text NOT NULL UNIQUE,
          password text NOT NULL,
          domain text NOT NULL,
          uri text NOT NULL,
          status text NOT NULL DEFAULT 'active',
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS user_sip_accounts_user_id_idx ON user_sip_accounts(user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS user_sip_accounts_username_idx ON user_sip_accounts(username)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS user_sip_accounts_status_idx ON user_sip_accounts(status)`);
      await db.execute(sql`ALTER TABLE user_sip_accounts ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb`);
      await ensureSipCommercialSchema();
    })();
  }

  return ensurePromise;
}

export async function getUserSipAccount(userId: string) {
  await ensureUserSipSchema();
  const [account] = await db
    .select()
    .from(userSipAccounts)
    .where(eq(userSipAccounts.userId, userId))
    .limit(1);

  return account || null;
}

export async function getOrCreateUserSipAccount(
  userId: string,
  options: { callerNumber?: string | null } = {},
): Promise<UserSipAccount> {
  await ensureUserSipSchema();

  const existing = await getUserSipAccount(userId);
  if (existing) {
    const metadata = (existing.metadata as Record<string, any>) || {};
    const astppConfig = await getAstppConfig();
    if (astppConfig.enabled && astppConfig.provider === "astpp" && metadata.provider !== "astpp" && !isExternalSipProvider(metadata)) {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return existing;
      const username = /^\d+$/.test(existing.username) ? existing.username : buildAstppUsername(user);
      const provisioning = await provisionAstppSipAccount({
        username,
        password: existing.password,
        email: user.email,
        displayName: user.name || user.email || username,
        callerNumber: options.callerNumber,
        voicemailEnabled: metadata.voicemailEnabled === true,
      });
      const domain = provisioning.domain || astppConfig.sipDomain || existing.domain;
      const uri = `sip:${username}@${domain}`;
      const [updated] = await db
        .update(userSipAccounts)
        .set({
          username,
          domain,
          uri,
          metadata: {
            ...metadata,
            provider: provisioning.provisioned ? "astpp" : metadata.provider || "local",
            provisioned: provisioning.provisioned,
            provisioningMessage: provisioning.message,
            astppAccountId: provisioning.accountId || metadata.astppAccountId,
            astppSipDeviceId: provisioning.sipDeviceId || metadata.astppSipDeviceId,
            callerNumber: trim(options.callerNumber) || metadata.callerNumber || null,
            transport: provisioning.transport || astppConfig.transport,
            port: provisioning.port || astppConfig.port,
            outboundProxy: provisioning.outboundProxy || astppConfig.outboundProxy || null,
          },
          updatedAt: new Date(),
        })
        .where(eq(userSipAccounts.userId, userId))
        .returning();
      return updated || existing;
    }

    const freePbxConfig = await getFreePbxConfig();
    if (
      (!astppConfig.enabled || astppConfig.provider !== "astpp") &&
      freePbxConfig.enabled &&
      freePbxConfig.mode === "realtime" &&
      metadata.provider !== "freepbx" &&
      !isExternalSipProvider(metadata)
    ) {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const provisioning = await provisionFreePbxSipAccount({
        username: existing.username,
        password: existing.password,
        displayName: user?.name || user?.email || existing.username,
      });
      const domain = freePbxConfig.domain || existing.domain;
      const uri = `sip:${existing.username}@${domain}`;
      const [updated] = await db
        .update(userSipAccounts)
        .set({
          domain,
          uri,
          metadata: {
            ...metadata,
            provider: provisioning.provisioned ? "freepbx" : metadata.provider || "local",
            provisioned: provisioning.provisioned,
            provisioningMode: provisioning.mode,
            provisioningMessage: provisioning.message,
          },
          updatedAt: new Date(),
        })
        .where(eq(userSipAccounts.userId, userId))
        .returning();
      return updated || existing;
    }
    return existing;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error("User not found for SIP account provisioning");
  }

  const domain = await getSipDomain();
  const astppConfig = await getAstppConfig();
  const registrationProfile = await getDefaultSipRegistrationProfile();
  const profileSettings = mergeSipFeatureSettings(registrationProfile);
  const username = astppConfig.enabled && astppConfig.provider === "astpp"
    ? buildAstppUsername(user)
    : buildUsername(user);
  const password = buildPassword();
  const uri = `sip:${username}@${domain}`;
  const provisioning = astppConfig.enabled && astppConfig.provider === "astpp"
    ? await provisionAstppSipAccount({
        username,
        password,
        email: user.email,
        displayName: user.name || user.email,
        callerNumber: options.callerNumber,
        voicemailEnabled: profileSettings.voicemailEnabled === true,
      })
    : await provisionFreePbxSipAccount({
        username,
        password,
        displayName: user.name || user.email,
      });

  const [account] = await db
    .insert(userSipAccounts)
    .values({
      userId,
      username,
      password,
      domain,
      uri,
      status: "active",
      metadata: {
        ...profileSettings,
        provider: provisioning.provisioned ? provisioning.provider : "local",
        provisioned: provisioning.provisioned,
        provisioningMode: "mode" in provisioning ? provisioning.mode : "astpp",
        provisioningMessage: provisioning.message,
        astppAccountId: "accountId" in provisioning ? provisioning.accountId : undefined,
        astppSipDeviceId: "sipDeviceId" in provisioning ? provisioning.sipDeviceId : undefined,
        callerNumber: trim(options.callerNumber) || null,
        transport: "transport" in provisioning ? provisioning.transport : undefined,
        port: "port" in provisioning ? provisioning.port : undefined,
        outboundProxy: "outboundProxy" in provisioning ? provisioning.outboundProxy : undefined,
        note: provisioning.provisioned
          ? provisioning.provider === "astpp"
            ? "Real ASTPP/FreeSWITCH SIP identity."
            : "Real FreePBX/Asterisk realtime SIP identity."
          : "App-assigned SIP identity. Enable FreePBX realtime provisioning for real registrations.",
      },
    })
    .onConflictDoNothing({ target: userSipAccounts.userId })
    .returning();

  return account || (await getUserSipAccount(userId))!;
}

export function toPublicUserSipAccount(account: UserSipAccount) {
  const metadata = (account.metadata as Record<string, any>) || {};
  const transport = metadata.transport || null;
  const port = metadata.port || (transport === "tls" ? 5061 : transport ? 5060 : null);
  const proxy = trim(metadata.proxy || metadata.outboundProxy);
  const effectiveTransport = transport || "udp";
  const effectivePort = port || (effectiveTransport === "tls" ? 5061 : 5060);

  return {
    id: account.id,
    username: account.username,
    authUsername: account.username,
    password: account.password,
    domain: account.domain,
    server: account.domain,
    registerServer: account.domain,
    registerPort: effectivePort,
    registerTransport: effectiveTransport,
    uri: account.uri,
    sipAddress: account.uri,
    status: account.status,
    connectionStatus: metadata.connectionStatus || "unknown",
    connectionMessage: metadata.connectionMessage || "Connection has not been tested yet.",
    connectionCheckedAt: metadata.connectionCheckedAt || null,
    transport: effectiveTransport,
    port: effectivePort,
    proxy: proxy || null,
    outboundProxy: proxy || null,
    supportsSipToSip: metadata.allowInternalCalls !== false,
    supportsInternationalCalls: metadata.allowInternationalCalls !== false,
    features: metadata,
    createdAt: account.createdAt,
  };
}

export async function provisionMissingUserSipAccounts(limit = 100) {
  await ensureUserSipSchema();

  const safeLimit = Math.min(Math.max(Math.trunc(Number(limit) || 100), 1), 500);
  const candidates = await db
    .select({
      userId: users.id,
      email: users.email,
    })
    .from(users)
    .where(
      and(
        eq(users.isDeleted, false),
        eq(users.isBlocked, false),
      ),
    )
    .limit(safeLimit);

  const results: Array<{
    userId: string;
    email: string;
    ok: boolean;
    username?: string;
    message?: string;
  }> = [];

  for (const candidate of candidates) {
    try {
      const account = await getOrCreateUserSipAccount(candidate.userId);
      results.push({
        userId: candidate.userId,
        email: candidate.email,
        ok: true,
        username: account.username,
        message: "SIP account ready.",
      });
    } catch (error: any) {
      results.push({
        userId: candidate.userId,
        email: candidate.email,
        ok: false,
        message: error.message || "SIP account provisioning failed.",
      });
    }
  }

  return {
    requestedLimit: safeLimit,
    scanned: candidates.length,
    provisioned: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

export async function testUserSipAccountConnection(userId: string) {
  const account = await getOrCreateUserSipAccount(userId);
  const accountMetadata = (account.metadata as Record<string, any>) || {};
  const transport = normalizeSipTransport(accountMetadata.transport || await getSipTransport());
  const metadataPort = Number(accountMetadata.port || 0);
  const port = metadataPort > 0 && metadataPort <= 65535 ? metadataPort : await getSipPort(transport);
  const targetHost = normalizeSipHost(trim(accountMetadata.proxy || accountMetadata.outboundProxy) || account.domain);
  const checkedAt = new Date().toISOString();
  const previousMetadata = accountMetadata;

  const saveResult = async (online: boolean, message: string) => {
    const metadata = {
      ...previousMetadata,
      connectionStatus: online ? "online" : "offline",
      connectionMessage: message,
      connectionCheckedAt: checkedAt,
      transport,
      port,
    };

    const [updated] = await db
      .update(userSipAccounts)
      .set({
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(userSipAccounts.userId, userId))
      .returning();

    return {
      online,
      status: online ? "online" : "offline",
      message,
      checkedAt,
      account: toPublicUserSipAccount(updated || account),
    };
  };

  try {
    const freePbxConfig = await getFreePbxConfig();
    const astppConfig = await getAstppConfig();
    if (astppConfig.enabled && astppConfig.provider === "astpp" && !isExternalSipProvider(accountMetadata)) {
      await dns.lookup(targetHost);
      if (transport === "udp" && account.username && account.password && account.domain) {
        const registration = await testUdpSipRegistration({
          username: account.username,
          password: account.password,
          domain: account.domain,
          proxy: targetHost,
          port,
        });
        return saveResult(registration.registered, registration.message);
      }
      await testTcpConnection(targetHost, port, transport);
      return saveResult(true, `Connected to ${targetHost}:${port} using ${transport.toUpperCase()}.`);
    }

    if (freePbxConfig.enabled && freePbxConfig.mode === "realtime" && !isExternalSipProvider(accountMetadata)) {
      const registration = await getFreePbxRegistrationStatus(account.username);
      return saveResult(
        registration.online,
        registration.message,
      );
    }

    if (!targetHost) {
      return saveResult(false, "SIP domain is not configured.");
    }

    await dns.lookup(targetHost);

    if (transport === "udp") {
      if (account.username && account.password && account.domain) {
        const registration = await testUdpSipRegistration({
          username: account.username,
          password: account.password,
          domain: account.domain,
          proxy: targetHost,
          port,
        });
        return saveResult(registration.registered, registration.message);
      }
      return saveResult(true, `Domain resolved for UDP SIP on ${targetHost}:${port}.`);
    }

    await testTcpConnection(targetHost, port, transport);
    return saveResult(true, `Connected to ${targetHost}:${port} using ${transport.toUpperCase()}.`);
  } catch (error: any) {
    return saveResult(false, error.message || "Unable to reach the SIP server.");
  }
}
