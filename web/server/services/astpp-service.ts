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

function astppValue(...values: unknown[]) {
  for (const value of values) {
    const cleaned = trim(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function astppRows(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  if (Array.isArray(value?.data?.result)) return value.data.result;
  if (Array.isArray(value?.result)) return value.result;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
}

function astppAccountIdFromCustomer(customer: any) {
  return astppValue(
    customer?.id,
    customer?.accountid,
    customer?.account_id,
    customer?.accountId,
    customer?.number,
    customer?.data?.id,
    customer?.data?.accountid,
    customer?.data?.account_id,
    customer?.data?.accountId,
    customer?.data?.number,
  );
}

function astppSipDeviceAccountIdFromCustomer(customer: any) {
  return astppValue(
    customer?.number,
    customer?.account_number,
    customer?.data?.number,
    customer?.data?.account_number,
    customer?.id,
    customer?.accountid,
    customer?.account_id,
    customer?.accountId,
    customer?.data?.id,
    customer?.data?.accountid,
    customer?.data?.account_id,
    customer?.data?.accountId,
  );
}

function astppSipDeviceIdFromDevice(device: any) {
  return astppValue(
    device?.sipdevice_id,
    device?.sip_device_id,
    device?.id,
    device?.data?.sipdevice_id,
    device?.data?.sip_device_id,
    device?.data?.id,
  );
}

async function findAstppCustomerByEmail(email: string) {
  const response = await astppPost("/admin/customer/", {
    action: "customer_list",
    start_limit: 1,
    end_limit: 20,
    object_where_params: { email },
  });

  const rows = astppRows(response);
  const match = rows.find((row) => {
    const rowEmail = trim(row?.email || row?.email_id || row?.customer_email).toLowerCase();
    return rowEmail === email.toLowerCase();
  }) || (rows.length === 1 ? rows[0] : null);

  const accountId = astppAccountIdFromCustomer(match || response);
  return accountId ? { accountId, raw: match || response } : null;
}

async function findAstppSipDeviceByUsername(username: string) {
  const response = await astppPost("/admin/sip_devices/", {
    action: "sip_devices_list",
    start_limit: 1,
    end_limit: 20,
    object_where_params: { username },
  });

  const rows = astppRows(response);
  const match = rows.find((row) => trim(row?.username) === username) || (rows.length === 1 ? rows[0] : null);
  if (!match) return null;

  return {
    sipDeviceId: astppSipDeviceIdFromDevice(match),
    raw: match,
  };
}

function buildAstppAliasEmail(email: string, username: string) {
  const [localPart, domainPart] = email.split("@");
  const local = (localPart || "sip").replace(/[^a-z0-9._-]/gi, "").slice(0, 48) || "sip";
  const domain = domainPart || "example.invalid";
  return `${local}.sip${username}@${domain}`;
}

function isAstppDuplicateEmailError(error: any) {
  const message = trim(error?.message).toLowerCase();
  return message.includes("email") && (message.includes("used") || message.includes("already"));
}

async function createAstppCustomer(displayName: string, email: string, resellerId: string) {
  const customer = await astppPost("/admin/customer/", {
    action: "customer_create",
    first_name: displayName,
    email,
    reseller_id: resellerId,
  });

  return {
    customer,
    accountId: astppAccountIdFromCustomer(customer),
  };
}

async function createAstppSipDevice({
  accountId,
  resellerId,
  username,
  password,
  sipProfileId,
  displayName,
  email,
  callerNumber,
  voicemailEnabled = false,
}: {
  accountId: string;
  resellerId: string;
  username: string;
  password: string;
  sipProfileId: number;
  displayName: string;
  email: string;
  callerNumber?: string | null;
  voicemailEnabled?: boolean;
}) {
  return astppPost("/admin/sip_devices/", {
    action: "sip_devices_create",
    accountid: accountId,
    reseller_id: resellerId,
    username,
    password,
    sip_profile_id: sipProfileId,
    status: "0",
    caller_name: displayName,
    caller_number: trim(callerNumber) || username,
    mailto: email,
    voice_mail_enable: voicemailEnabled ? "true" : "false",
    attach_file: "true",
    local_after_email: "true",
    send_all_message: "true",
    codec: "PCMU,PCMA,OPUS",
  });
}

export type AstppSipAccountInput = {
  username: string;
  password: string;
  email: string;
  displayName?: string | null;
  callerNumber?: string | null;
  voicemailEnabled?: boolean;
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
  const callerNumber = trim(input.callerNumber);
  if (!/^\d+$/.test(username)) {
    throw new Error("ASTPP SIP usernames must be numeric.");
  }
  if (!password || !email) {
    throw new Error("ASTPP SIP password and customer email are required.");
  }

  let customer: any = null;
  let accountId = "";
  let provisioningEmail = email;

  try {
    const createdCustomer = await createAstppCustomer(displayName, provisioningEmail, config.resellerId);
    customer = createdCustomer.customer;
    accountId = createdCustomer.accountId;
  } catch (error: any) {
    if (!isAstppDuplicateEmailError(error)) {
      throw error;
    }

    const existingCustomer = await findAstppCustomerByEmail(email).catch(() => null);
    if (existingCustomer?.accountId) {
      accountId = existingCustomer.accountId;
      customer = existingCustomer.raw;
    } else {
      provisioningEmail = buildAstppAliasEmail(email, username);
      const existingAliasCustomer = await findAstppCustomerByEmail(provisioningEmail).catch(() => null);
      if (existingAliasCustomer?.accountId) {
        accountId = existingAliasCustomer.accountId;
        customer = existingAliasCustomer.raw;
      } else {
        try {
          const createdAliasCustomer = await createAstppCustomer(displayName, provisioningEmail, config.resellerId);
          customer = createdAliasCustomer.customer;
          accountId = createdAliasCustomer.accountId;
        } catch (aliasError: any) {
          if (!isAstppDuplicateEmailError(aliasError)) {
            throw aliasError;
          }

          const retryAliasCustomer = await findAstppCustomerByEmail(provisioningEmail).catch(() => null);
          if (!retryAliasCustomer?.accountId) {
            throw aliasError;
          }
          accountId = retryAliasCustomer.accountId;
          customer = retryAliasCustomer.raw;
        }
      }
    }
  }

  if (!accountId) {
    throw new Error("ASTPP customer was created but no account id was returned.");
  }

  let sipDevice = await findAstppSipDeviceByUsername(username).catch(() => null);
  if (!sipDevice) {
    const sipDeviceAccountId = astppSipDeviceAccountIdFromCustomer(customer) || accountId;
    const fallbackAccountId = sipDeviceAccountId !== accountId ? accountId : "";

    try {
      const createdSipDevice = await createAstppSipDevice({
        accountId: sipDeviceAccountId,
        resellerId: config.resellerId,
        username,
        password,
        sipProfileId: config.sipProfileId,
        displayName,
        email,
        callerNumber,
        voicemailEnabled: input.voicemailEnabled === true,
      });
      sipDevice = {
        sipDeviceId: astppSipDeviceIdFromDevice(createdSipDevice),
        raw: createdSipDevice,
      };
    } catch (error: any) {
      sipDevice = await findAstppSipDeviceByUsername(username).catch(() => null);
      if (!sipDevice && fallbackAccountId) {
        const createdSipDevice = await createAstppSipDevice({
          accountId: fallbackAccountId,
          resellerId: config.resellerId,
          username,
          password,
          sipProfileId: config.sipProfileId,
          displayName,
          email,
          callerNumber,
          voicemailEnabled: input.voicemailEnabled === true,
        });
        sipDevice = {
          sipDeviceId: astppSipDeviceIdFromDevice(createdSipDevice),
          raw: createdSipDevice,
        };
      }
      if (!sipDevice) {
        throw error;
      }
    }
  }

  return {
    provisioned: true,
    provider: "astpp",
    accountId,
    sipDeviceId: sipDevice.sipDeviceId,
    domain: config.sipDomain,
    transport: config.transport,
    port: config.port,
    outboundProxy: config.outboundProxy,
    provisioningEmail,
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
