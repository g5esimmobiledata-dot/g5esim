import { eq } from "drizzle-orm";
import { db } from "server/db";
import { settings } from "@shared/schema";

function trim(value: unknown) {
  return String(value || "").trim();
}

function envValue(...keys: string[]) {
  for (const key of keys) {
    const value = trim(process.env[key]);
    if (value) return value;
  }
  return "";
}

async function getSettingValue(key: string) {
  const [setting] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return trim(setting?.value);
}

function normalizeBaseUrl(value: string) {
  const url = trim(value).replace(/\/+$/, "");
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

export async function getAstppConfig() {
  const [
    provider,
    enabled,
    apiUrl,
    authToken,
    adminId,
    adminToken,
    sipDomain,
    sipProfileId,
    resellerId,
    transport,
    port,
    outboundProxy,
  ] = await Promise.all([
    getSettingValue("sip_provisioning_provider"),
    getSettingValue("astpp_enabled"),
    getSettingValue("astpp_api_url"),
    getSettingValue("astpp_api_auth_token"),
    getSettingValue("astpp_admin_id"),
    getSettingValue("astpp_admin_token"),
    getSettingValue("astpp_sip_domain"),
    getSettingValue("astpp_sip_profile_id"),
    getSettingValue("astpp_reseller_id"),
    getSettingValue("astpp_sip_transport"),
    getSettingValue("astpp_sip_port"),
    getSettingValue("astpp_outbound_proxy"),
  ]);

  const resolvedProvider =
    provider ||
    envValue("SIP_PROVISIONING_PROVIDER") ||
    (enabled === "true" || envValue("ASTPP_ENABLED") === "true" ? "astpp" : "freepbx");
  const resolvedEnabled = enabled || envValue("ASTPP_ENABLED");
  const resolvedTransport = (transport || envValue("ASTPP_SIP_TRANSPORT", "USER_SIP_TRANSPORT") || "udp").toLowerCase();

  return {
    provider: resolvedProvider,
    enabled: resolvedEnabled === "true" || resolvedProvider === "astpp",
    apiUrl: normalizeBaseUrl(apiUrl || envValue("ASTPP_API_URL")),
    authToken: authToken || envValue("ASTPP_API_AUTH_TOKEN", "ASTPP_AUTH_TOKEN"),
    adminId: adminId || envValue("ASTPP_ADMIN_ID"),
    adminToken: adminToken || envValue("ASTPP_ADMIN_TOKEN"),
    sipDomain: sipDomain || envValue("ASTPP_SIP_DOMAIN", "USER_SIP_DOMAIN", "SIP_DOMAIN"),
    sipProfileId: toPositiveInteger(sipProfileId || envValue("ASTPP_SIP_PROFILE_ID"), 1),
    resellerId: trim(resellerId || envValue("ASTPP_RESELLER_ID") || "0"),
    transport: resolvedTransport,
    port: toPositiveInteger(port || envValue("ASTPP_SIP_PORT", "USER_SIP_PORT"), resolvedTransport.includes("tls") ? 5061 : 5060),
    outboundProxy: outboundProxy || envValue("ASTPP_OUTBOUND_PROXY", "USER_SIP_OUTBOUND_PROXY", "SIP_OUTBOUND_PROXY"),
  };
}

type AstppPayload = Record<string, unknown>;

async function astppPost(path: string, payload: AstppPayload) {
  const config = await getAstppConfig();
  if (!config.enabled || config.provider !== "astpp") {
    throw new Error("ASTPP provisioning is not enabled.");
  }
  if (!config.apiUrl || !config.authToken || !config.adminId || !config.adminToken) {
    throw new Error("ASTPP API URL, auth token, admin id, and admin token are required.");
  }

  const response = await fetch(`${config.apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Auth-Token": config.authToken,
    },
    body: JSON.stringify({
      id: config.adminId,
      token: config.adminToken,
      ...payload,
    }),
  });

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok || data.status === false || data.error) {
    throw new Error(data.error || data.message || `ASTPP API request failed with HTTP ${response.status}.`);
  }

  return data;
}

export type AstppSipAccountInput = {
  username: string;
  password: string;
  email: string;
  displayName?: string | null;
};

export async function provisionAstppSipAccount(input: AstppSipAccountInput) {
  const config = await getAstppConfig();
  if (!config.enabled || config.provider !== "astpp") {
    return {
      provisioned: false,
      provider: "astpp",
      message: "ASTPP provisioning is not enabled.",
    };
  }

  if (!config.sipDomain) {
    throw new Error("ASTPP SIP domain is required.");
  }

  const username = trim(input.username);
  const password = trim(input.password);
  const email = trim(input.email);
  const displayName = trim(input.displayName) || email || username;
  if (!/^\d+$/.test(username)) {
    throw new Error("ASTPP SIP usernames must be numeric.");
  }
  if (!password || !email) {
    throw new Error("ASTPP SIP password and customer email are required.");
  }

  const customer = await astppPost("/admin/customer/", {
    action: "customer_create",
    first_name: displayName,
    email,
    reseller_id: config.resellerId,
  });

  const accountId = trim(customer?.data?.id || customer?.data?.accountid || customer?.accountid);
  if (!accountId) {
    throw new Error("ASTPP customer was created but no account id was returned.");
  }

  const sipDevice = await astppPost("/admin/sip_devices/", {
    action: "sip_devices_create",
    accountid: accountId,
    reseller_id: config.resellerId,
    username,
    password,
    sip_profile_id: config.sipProfileId,
    status: "0",
    caller_name: displayName,
    caller_number: username,
    mailto: email,
    voice_mail_enable: "true",
    attach_file: "true",
    local_after_email: "true",
    send_all_message: "true",
    codec: "PCMU,PCMA,OPUS",
  });

  return {
    provisioned: true,
    provider: "astpp",
    accountId,
    sipDeviceId: trim(sipDevice?.data?.sipdevice_id || sipDevice?.data?.id),
    domain: config.sipDomain,
    transport: config.transport,
    port: config.port,
    outboundProxy: config.outboundProxy,
    message: "ASTPP customer and SIP device were provisioned.",
  };
}

export async function testAstppConnection() {
  const config = await getAstppConfig();
  if (!config.enabled || config.provider !== "astpp") {
    return {
      online: false,
      status: "offline" as const,
      message: "ASTPP provisioning is disabled.",
      config,
    };
  }

  await astppPost("/admin/customer/", {
    action: "customer_list",
    start_limit: 1,
    end_limit: 2,
    object_where_params: {},
  });

  return {
    online: true,
    status: "online" as const,
    message: "ASTPP API accepted the admin token and customer endpoint request.",
    config,
  };
}
