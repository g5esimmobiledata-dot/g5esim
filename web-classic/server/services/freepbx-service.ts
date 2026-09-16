import { eq, sql } from "drizzle-orm";
import { db } from "server/db";
import { settings } from "@shared/schema";

function trim(value: unknown) {
  return String(value || "").trim();
}

async function getSettingValue(key: string) {
  const [setting] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return trim(setting?.value);
}

export async function getFreePbxConfig() {
  const [enabled, mode, domain, transport, context, allowCodecs, voicemailExtension] = await Promise.all([
    getSettingValue("freepbx_enabled"),
    getSettingValue("freepbx_provisioning_mode"),
    getSettingValue("freepbx_sip_domain"),
    getSettingValue("freepbx_sip_transport"),
    getSettingValue("freepbx_context"),
    getSettingValue("freepbx_allow_codecs"),
    getSettingValue("freepbx_voicemail_extension"),
  ]);

  return {
    enabled: enabled === "true",
    mode: mode || "realtime",
    domain,
    transport: (transport || "transport-tls").toLowerCase(),
    context: context || "from-internal",
    allowCodecs: allowCodecs || "opus,ulaw,alaw",
    voicemailExtension: voicemailExtension || "*98",
  };
}

export async function ensureAsteriskRealtimeSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ps_aors (
      id varchar(40) PRIMARY KEY,
      max_contacts integer DEFAULT 1,
      remove_existing varchar(3) DEFAULT 'yes',
      qualify_frequency integer DEFAULT 60,
      support_path varchar(3) DEFAULT 'yes'
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ps_auths (
      id varchar(40) PRIMARY KEY,
      auth_type varchar(16) DEFAULT 'userpass',
      username varchar(80),
      password varchar(120)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ps_endpoints (
      id varchar(40) PRIMARY KEY,
      transport varchar(40),
      aors varchar(200),
      auth varchar(40),
      context varchar(40),
      disallow varchar(200) DEFAULT 'all',
      allow varchar(200),
      direct_media varchar(3) DEFAULT 'no',
      force_rport varchar(3) DEFAULT 'yes',
      rewrite_contact varchar(3) DEFAULT 'yes',
      rtp_symmetric varchar(3) DEFAULT 'yes',
      ice_support varchar(3) DEFAULT 'yes',
      webrtc varchar(3) DEFAULT 'no',
      media_encryption varchar(16),
      dtmf_mode varchar(16) DEFAULT 'rfc4733',
      callerid varchar(120)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ps_contacts (
      id varchar(255) PRIMARY KEY,
      uri varchar(511),
      endpoint varchar(40),
      expiration_time bigint,
      qualify_status varchar(20),
      user_agent varchar(255),
      reg_server varchar(20),
      authenticate_qualify varchar(3),
      via_addr varchar(40),
      via_port integer,
      call_id varchar(255)
    )
  `);
}

export type FreePbxSipAccountInput = {
  username: string;
  password: string;
  displayName?: string | null;
};

export async function provisionFreePbxSipAccount(input: FreePbxSipAccountInput) {
  const config = await getFreePbxConfig();
  if (!config.enabled || config.mode !== "realtime") {
    return {
      provisioned: false,
      provider: "freepbx",
      mode: config.mode,
      message: "FreePBX realtime provisioning is not enabled.",
    };
  }

  await ensureAsteriskRealtimeSchema();

  const username = trim(input.username);
  const password = trim(input.password);
  if (!username || !password) {
    throw new Error("SIP username and password are required for FreePBX provisioning.");
  }

  const callerId = trim(input.displayName) ? `${trim(input.displayName)} <${username}>` : username;

  await db.execute(sql`
    INSERT INTO ps_aors (id, max_contacts, remove_existing, qualify_frequency, support_path)
    VALUES (${username}, 1, 'yes', 60, 'yes')
    ON CONFLICT (id) DO UPDATE SET
      max_contacts = EXCLUDED.max_contacts,
      remove_existing = EXCLUDED.remove_existing,
      qualify_frequency = EXCLUDED.qualify_frequency,
      support_path = EXCLUDED.support_path
  `);

  await db.execute(sql`
    INSERT INTO ps_auths (id, auth_type, username, password)
    VALUES (${username}, 'userpass', ${username}, ${password})
    ON CONFLICT (id) DO UPDATE SET
      auth_type = EXCLUDED.auth_type,
      username = EXCLUDED.username,
      password = EXCLUDED.password
  `);

  await db.execute(sql`
    INSERT INTO ps_endpoints (
      id, transport, aors, auth, context, disallow, allow, direct_media,
      force_rport, rewrite_contact, rtp_symmetric, ice_support, webrtc,
      media_encryption, dtmf_mode, callerid
    )
    VALUES (
      ${username}, ${config.transport}, ${username}, ${username}, ${config.context}, 'all',
      ${config.allowCodecs}, 'no', 'yes', 'yes', 'yes', 'yes', 'no',
      ${config.transport.includes("tls") ? "sdes" : null}, 'rfc4733', ${callerId}
    )
    ON CONFLICT (id) DO UPDATE SET
      transport = EXCLUDED.transport,
      aors = EXCLUDED.aors,
      auth = EXCLUDED.auth,
      context = EXCLUDED.context,
      disallow = EXCLUDED.disallow,
      allow = EXCLUDED.allow,
      direct_media = EXCLUDED.direct_media,
      force_rport = EXCLUDED.force_rport,
      rewrite_contact = EXCLUDED.rewrite_contact,
      rtp_symmetric = EXCLUDED.rtp_symmetric,
      ice_support = EXCLUDED.ice_support,
      webrtc = EXCLUDED.webrtc,
      media_encryption = EXCLUDED.media_encryption,
      dtmf_mode = EXCLUDED.dtmf_mode,
      callerid = EXCLUDED.callerid
  `);

  return {
    provisioned: true,
    provider: "freepbx",
    mode: config.mode,
    domain: config.domain,
    transport: config.transport,
    context: config.context,
    message: "FreePBX/Asterisk realtime SIP endpoint was provisioned.",
  };
}

export async function getFreePbxRegistrationStatus(username: string) {
  const config = await getFreePbxConfig();
  if (!config.enabled || config.mode !== "realtime") {
    return {
      online: false,
      status: "unknown" as const,
      message: "FreePBX realtime provisioning is not enabled.",
      contacts: [],
    };
  }

  await ensureAsteriskRealtimeSchema();
  const rows = await db.execute(sql`
    SELECT id, uri, endpoint, expiration_time, qualify_status, user_agent, via_addr, via_port
    FROM ps_contacts
    WHERE endpoint = ${username}
  `);
  const contacts = Array.isArray((rows as any).rows) ? (rows as any).rows : [];
  const nowSeconds = Math.floor(Date.now() / 1000);
  const activeContacts = contacts.filter((contact: any) => {
    const expirationTime = Number(contact.expiration_time || contact.expirationTime || 0);
    return !expirationTime || expirationTime > nowSeconds;
  });

  if (activeContacts.length > 0) {
    return {
      online: true,
      status: "online" as const,
      message: `Registered on FreePBX with ${activeContacts.length} active contact${activeContacts.length === 1 ? "" : "s"}.`,
      contacts: activeContacts,
    };
  }

  return {
    online: false,
    status: "offline" as const,
    message: "No active FreePBX registration contact found for this SIP account.",
    contacts,
  };
}
