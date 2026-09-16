import axios from 'axios';
import { eq } from 'drizzle-orm';
import { db } from 'server/db';
import { settings } from '@shared/schema';

const EASY_SEND_SMS_API_URL = 'https://api.easysendsms.app/bulksms';

const EASY_SEND_SMS_ERRORS: Record<string, string> = {
  '1001': 'Invalid EasySendSMS request. One required parameter is missing.',
  '1002': 'EasySendSMS authentication failed. Check the username or password.',
  '1003': 'Invalid EasySendSMS message type.',
  '1004': 'Invalid EasySendSMS message content.',
  '1005': 'Invalid EasySendSMS recipient mobile number.',
  '1006': 'Invalid EasySendSMS sender name.',
  '1007': 'EasySendSMS account has insufficient credit.',
  '1008': 'EasySendSMS internal error.',
  '1009': 'EasySendSMS service is not available.',
};

function trim(value: unknown) {
  return String(value || '').trim();
}

function envValue(...keys: string[]) {
  for (const key of keys) {
    const value = trim(process.env[key]);
    if (value) return value;
  }
  return '';
}

async function getSettingValue(key: string) {
  const [setting] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return trim(setting?.value);
}

function settingOrEnv(settingValue: string, ...envKeys: string[]) {
  return trim(settingValue) || envValue(...envKeys);
}

function escapeTemplateValue(value: unknown) {
  return JSON.stringify(trim(value)).slice(1, -1);
}

function renderPayloadTemplate(
  template: string,
  values: { from: string; to: string; text: string; referenceId: string },
) {
  const rendered = template.replace(/\{(from|to|text|referenceId)\}/g, (_match, key) =>
    escapeTemplateValue(values[key as keyof typeof values]),
  );

  try {
    return JSON.parse(rendered);
  } catch {
    throw new Error('Own SMS carrier payload template is not valid JSON after rendering.');
  }
}

function readPath(source: any, path: string) {
  const parts = trim(path).split('.').filter(Boolean);
  let current = source;

  for (const part of parts) {
    if (current == null) return '';
    if (/^\d+$/.test(part)) {
      current = Array.isArray(current) ? current[Number(part)] : undefined;
    } else {
      current = current[part];
    }
  }

  return trim(current);
}

function normalizeCarrierStatus(status: unknown, httpStatus: number) {
  const raw = trim(status).toLowerCase();
  if (!raw) return httpStatus >= 200 && httpStatus < 300 ? 'sent' : 'failed';

  if (['0', 'ok', 'success', 'sent', 'submitted', 'accepted', 'queued', 'delivered'].includes(raw)) {
    return raw === 'queued' ? 'queued' : 'sent';
  }

  if (['failed', 'error', 'rejected', 'undeliverable', 'expired'].includes(raw)) {
    return 'failed';
  }

  return raw;
}

function parseSuccessStatuses(value: string) {
  const statuses = value
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item));
  return statuses.length ? statuses : [200, 201, 202];
}

function normalizeProvider(value: string) {
  return trim(value).toLowerCase().replace(/[\s_-]+/g, '');
}

function isEasySendSmsProvider(provider: string, apiUrl: string) {
  const normalizedProvider = normalizeProvider(provider);
  return (
    normalizedProvider === 'easysendsms' ||
    normalizedProvider === 'easysend' ||
    trim(apiUrl).toLowerCase().includes('easysendsms')
  );
}

function normalizeEasySendSmsRecipient(to: string) {
  const normalized = trim(to).replace(/[^\d+]/g, '');
  const withoutPlus = normalized.startsWith('+') ? normalized.slice(1) : normalized;
  return withoutPlus.startsWith('00') ? withoutPlus.slice(2) : withoutPlus;
}

function normalizeEasySendSmsSender(from: string) {
  const raw = trim(from);
  const normalized = raw.replace(/[^\d+]/g, '');

  if (/^\+\d{7,15}$/.test(normalized)) return normalized.slice(1);
  if (/^00\d{7,15}$/.test(normalized)) return normalized.slice(2);
  if (/^\d{7,15}$/.test(normalized)) return normalized;

  return raw;
}

function isUnicodeSms(text: string) {
  return /[^\x00-\x7f]/.test(text);
}

function parseEasySendSmsResponse(raw: unknown, httpStatus: number) {
  const body = typeof raw === 'string' ? raw.trim() : trim(JSON.stringify(raw || ''));

  if (httpStatus === 429) {
    throw new Error('EasySendSMS rate limit reached. Please retry shortly.');
  }

  if (httpStatus < 200 || httpStatus >= 300) {
    throw new Error(`EasySendSMS rejected the message with HTTP ${httpStatus}.`);
  }

  const okMatch = body.match(/\bOK\s*:\s*([^,\s]+)/i);
  if (okMatch) {
    return {
      status: 'sent',
      messageId: okMatch[1],
      raw: body,
    };
  }

  const errorCode = body.match(/\b(100[1-9])\b/)?.[1];
  if (errorCode) {
    throw new Error(EASY_SEND_SMS_ERRORS[errorCode] || `EasySendSMS error ${errorCode}.`);
  }

  if (/^error\b/i.test(body)) {
    throw new Error(`EasySendSMS rejected the message: ${body}`);
  }

  throw new Error(`EasySendSMS returned an unexpected response: ${body || 'empty response'}`);
}

function isEasySendSmsSenderRejected(error: unknown) {
  const message = error instanceof Error ? error.message : trim(error);
  return /1006/.test(message) || /invalid\s+easysendsms\s+sender\s+name/i.test(message);
}

export async function assertOwnSmsCarrierConfigured() {
  const [enabledSetting, providerSetting, apiUrlSetting, usernameSetting, passwordSetting] =
    await Promise.all([
      getSettingValue('sms_carrier_enabled'),
      getSettingValue('sms_carrier_provider'),
      getSettingValue('sms_carrier_api_url'),
      getSettingValue('sms_carrier_username'),
      getSettingValue('sms_carrier_password'),
    ]);
  const provider = settingOrEnv(providerSetting, 'SMS_CARRIER_PROVIDER', 'OWN_SMS_CARRIER_PROVIDER');
  const apiUrl = settingOrEnv(
    apiUrlSetting,
    'SMS_CARRIER_API_URL',
    'OWN_SMS_CARRIER_API_URL',
    'SMS_GATEWAY_API_URL',
  );
  const isEasySendSms = isEasySendSmsProvider(provider, apiUrl);
  const effectiveApiUrl = isEasySendSms ? apiUrl || EASY_SEND_SMS_API_URL : apiUrl;
  const username = settingOrEnv(usernameSetting, 'SMS_CARRIER_USERNAME', 'EASYSENDSMS_USERNAME');
  const password = settingOrEnv(passwordSetting, 'SMS_CARRIER_PASSWORD', 'EASYSENDSMS_PASSWORD');
  const enabled =
    enabledSetting === 'true' ||
    envValue('SMS_CARRIER_ENABLED', 'OWN_SMS_CARRIER_ENABLED') === 'true' ||
    Boolean(effectiveApiUrl) ||
    Boolean(provider);

  if (!enabled || !effectiveApiUrl) {
    throw new Error(
      'Own SMS carrier is not configured. Configure sms_carrier_api_url before sending SMS.',
    );
  }

  if (isEasySendSms && (!username || !password)) {
    throw new Error(
      'EasySendSMS provider is not configured. Configure sms_carrier_username and sms_carrier_password before sending SMS.',
    );
  }
}

export async function sendSmsWithOwnCarrier({
  from,
  to,
  text,
  referenceId,
}: {
  from: string;
  to: string;
  text: string;
  referenceId: string;
}) {
  const [
    enabledSetting,
    providerSetting,
    apiUrlSetting,
    apiKeySetting,
    usernameSetting,
    passwordSetting,
    methodSetting,
    authHeaderSetting,
    authSchemeSetting,
    contentTypeSetting,
    senderIdSetting,
    payloadTemplateSetting,
    successStatusesSetting,
    messageIdPathSetting,
    statusPathSetting,
  ] = await Promise.all([
    getSettingValue('sms_carrier_enabled'),
    getSettingValue('sms_carrier_provider'),
    getSettingValue('sms_carrier_api_url'),
    getSettingValue('sms_carrier_api_key'),
    getSettingValue('sms_carrier_username'),
    getSettingValue('sms_carrier_password'),
    getSettingValue('sms_carrier_method'),
    getSettingValue('sms_carrier_auth_header'),
    getSettingValue('sms_carrier_auth_scheme'),
    getSettingValue('sms_carrier_content_type'),
    getSettingValue('sms_carrier_sender_id'),
    getSettingValue('sms_carrier_payload_template'),
    getSettingValue('sms_carrier_success_statuses'),
    getSettingValue('sms_carrier_message_id_path'),
    getSettingValue('sms_carrier_status_path'),
  ]);

  const provider = settingOrEnv(providerSetting, 'SMS_CARRIER_PROVIDER', 'OWN_SMS_CARRIER_PROVIDER');
  const apiUrl = settingOrEnv(
    apiUrlSetting,
    'SMS_CARRIER_API_URL',
    'OWN_SMS_CARRIER_API_URL',
    'SMS_GATEWAY_API_URL',
  );
  const isEasySendSms = isEasySendSmsProvider(provider, apiUrl);
  const effectiveApiUrl = isEasySendSms ? apiUrl || EASY_SEND_SMS_API_URL : apiUrl;
  const enabled =
    enabledSetting === 'true' ||
    envValue('SMS_CARRIER_ENABLED', 'OWN_SMS_CARRIER_ENABLED') === 'true' ||
    Boolean(effectiveApiUrl) ||
    Boolean(provider);

  if (!enabled || !effectiveApiUrl) {
    await assertOwnSmsCarrierConfigured();
  }

  if (isEasySendSms) {
    const username = settingOrEnv(usernameSetting, 'SMS_CARRIER_USERNAME', 'EASYSENDSMS_USERNAME');
    const password = settingOrEnv(passwordSetting, 'SMS_CARRIER_PASSWORD', 'EASYSENDSMS_PASSWORD');
    if (!username || !password) {
      await assertOwnSmsCarrierConfigured();
    }

    const fallbackSender = normalizeEasySendSmsSender(
      settingOrEnv(senderIdSetting, 'SMS_CARRIER_SENDER_ID'),
    );
    const requestedSender = normalizeEasySendSmsSender(trim(from) || fallbackSender);

    const sendEasySendSmsRequest = async (sender: string) => {
      const payload = new URLSearchParams({
        username,
        password,
        from: sender,
        to: normalizeEasySendSmsRecipient(to),
        text: trim(text),
        type: isUnicodeSms(text) ? '1' : '0',
      });

      const response = await axios.post(effectiveApiUrl, payload.toString(), {
        headers: {
          Accept: 'text/plain, */*',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
        responseType: 'text',
        transformResponse: [(data) => data],
        validateStatus: () => true,
      });

      const parsed = parseEasySendSmsResponse(response.data, response.status);

      return {
        provider: 'easysendsms',
        status: parsed.status,
        messageId: parsed.messageId,
        submittedFrom: sender,
        httpStatus: response.status,
        raw: parsed.raw,
      };
    };

    try {
      return await sendEasySendSmsRequest(requestedSender);
    } catch (error: any) {
      const canFallback =
        isEasySendSmsSenderRejected(error) &&
        fallbackSender &&
        fallbackSender.toLowerCase() !== requestedSender.toLowerCase();

      if (!canFallback) {
        throw error;
      }

      const fallbackResponse = await sendEasySendSmsRequest(fallbackSender);
      return {
        ...fallbackResponse,
        requestedFrom: requestedSender,
        fallbackFrom: fallbackSender,
        fallbackReason: error?.message || 'EasySendSMS rejected the selected Sender ID.',
        senderFallbackUsed: true,
      };
    }
  }

  const apiKey = settingOrEnv(
    apiKeySetting,
    'SMS_CARRIER_API_KEY',
    'OWN_SMS_CARRIER_API_KEY',
    'SMS_GATEWAY_API_KEY',
  );
  const method = (settingOrEnv(methodSetting, 'SMS_CARRIER_METHOD') || 'POST').toUpperCase();
  const authHeader = settingOrEnv(authHeaderSetting, 'SMS_CARRIER_AUTH_HEADER') || 'Authorization';
  const authScheme = settingOrEnv(authSchemeSetting, 'SMS_CARRIER_AUTH_SCHEME') || 'Bearer';
  const contentType =
    settingOrEnv(contentTypeSetting, 'SMS_CARRIER_CONTENT_TYPE') || 'application/json';
  const sender = trim(from) || settingOrEnv(senderIdSetting, 'SMS_CARRIER_SENDER_ID');
  const payloadTemplate = settingOrEnv(payloadTemplateSetting, 'SMS_CARRIER_PAYLOAD_TEMPLATE');
  const successStatuses = parseSuccessStatuses(
    settingOrEnv(successStatusesSetting, 'SMS_CARRIER_SUCCESS_STATUSES'),
  );
  const messageIdPath =
    settingOrEnv(messageIdPathSetting, 'SMS_CARRIER_MESSAGE_ID_PATH') ||
    'messageId';
  const statusPath = settingOrEnv(statusPathSetting, 'SMS_CARRIER_STATUS_PATH') || 'status';
  const payloadValues = {
    from: sender,
    to: trim(to),
    text: trim(text),
    referenceId: trim(referenceId),
  };

  const payload = payloadTemplate
    ? renderPayloadTemplate(payloadTemplate, payloadValues)
    : payloadValues;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': contentType,
  };

  if (apiKey) {
    headers[authHeader] =
      authHeader.toLowerCase() === 'authorization' && authScheme
        ? `${authScheme} ${apiKey}`
        : apiKey;
  }

  const response = await axios.request({
    url: apiUrl,
    method,
    headers,
    data: contentType.includes('x-www-form-urlencoded')
      ? new URLSearchParams(payload as Record<string, string>).toString()
      : payload,
    timeout: 15000,
    validateStatus: () => true,
  });

  if (!successStatuses.includes(response.status)) {
    throw new Error(`Own SMS carrier rejected the message with HTTP ${response.status}.`);
  }

  const responseData = response.data || {};
  const status = normalizeCarrierStatus(readPath(responseData, statusPath), response.status);
  if (status === 'failed') {
    throw new Error('Own SMS carrier rejected the message.');
  }

  return {
    provider: 'own_sms_carrier',
    status,
    messageId:
      readPath(responseData, messageIdPath) ||
      readPath(responseData, 'id') ||
      readPath(responseData, 'data.id') ||
      null,
    httpStatus: response.status,
    raw: responseData,
  };
}
