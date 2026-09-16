import { storage } from 'server/storage';
import { createVonageVoiceSession } from 'server/services/vonage-service';
import { getOrCreateUserSipAccount } from 'server/services/user-sip-service';
import { getAstppConfig } from 'server/services/astpp-service';
import { quoteVoiceCall, type VoiceRateQuote } from 'server/services/voice-rating-service';

function trim(value: unknown) {
  return String(value || '').trim();
}

async function getSettingValue(key: string) {
  return (await storage.getSettingByKey(key))?.value || '';
}

export type VoiceSessionPayload =
  | {
      backend: 'vonage';
      username: string;
      displayName: string;
      token: string;
      applicationId: string;
      brandName: string;
      defaultCountry: string;
      createdUser: boolean;
      expiresInSeconds: number;
      callType?: VoiceRateQuote['callType'];
      callerId?: string | null;
      rateQuote?: VoiceRateQuote | null;
    }
  | {
      backend: 'linphone';
      displayName: string;
      username: string;
      sipDomain: string;
      sipPort: string;
      sipTransport: string;
      sipPassword: string;
      sipOutboundProxy: string;
      sipWebSocketUrl: string;
      sipWebRtcEnabled: boolean;
      voicemailExtension: string;
      defaultCountry: string;
      linphoneEnabled: boolean;
      expiresInSeconds: null;
      callType?: VoiceRateQuote['callType'];
      callerId?: string | null;
      rateQuote?: VoiceRateQuote | null;
    };

export async function createVoiceSession(
  userId: string,
  options?: {
    direction?: 'inbound' | 'outbound';
    referenceNumber?: string | null;
    virtualNumberId?: string | null;
  },
): Promise<VoiceSessionPayload> {
  const referenceNumber = trim(options?.referenceNumber);
  const rateQuote =
    options?.direction !== 'inbound' && referenceNumber
      ? await quoteVoiceCall(userId, referenceNumber)
      : null;

  if (rateQuote && !rateQuote.canCall) {
    throw new Error(rateQuote.message || 'This call is not available for this account.');
  }

  const [
    voiceBackend,
    defaultCountry,
    linphoneEnabled,
    linphoneSipDomain,
    linphoneSipPort,
    linphoneSipTransport,
    linphoneSipOutboundProxy,
    linphoneSipWebSocketUrl,
    userSipWebSocketUrl,
    astppSipWebSocketUrl,
    freePbxSipWebSocketUrl,
    linphoneVoicemailExtension,
  ] = await Promise.all([
    getSettingValue('voice_backend'),
    getSettingValue('vonage_virtual_number_default_country'),
    getSettingValue('linphone_enabled'),
    getSettingValue('linphone_sip_domain'),
    getSettingValue('linphone_sip_port'),
    getSettingValue('linphone_sip_transport'),
    getSettingValue('linphone_sip_outbound_proxy'),
    getSettingValue('linphone_sip_websocket_url'),
    getSettingValue('user_sip_websocket_url'),
    getSettingValue('astpp_sip_websocket_url'),
    getSettingValue('freepbx_sip_websocket_url'),
    getSettingValue('linphone_voicemail_extension'),
  ]);
  const astppConfig = await getAstppConfig();
  const configuredVoiceBackend = trim(voiceBackend).toLowerCase();
  const hasSipRuntimeConfig = Boolean(
    trim(linphoneSipDomain) ||
      trim(linphoneSipWebSocketUrl) ||
      trim(userSipWebSocketUrl) ||
      trim(astppSipWebSocketUrl) ||
      trim(freePbxSipWebSocketUrl),
  );
  const shouldUseSipBackend = configuredVoiceBackend
    ? configuredVoiceBackend === 'linphone'
    : astppConfig.enabled && astppConfig.provider === 'astpp'
      ? true
      : linphoneEnabled === 'true' || hasSipRuntimeConfig;

  if (!shouldUseSipBackend) {
    const vonageSession = await createVonageVoiceSession(userId, options);
    return {
      backend: 'vonage',
      ...vonageSession,
      callType: rateQuote?.callType,
      callerId: rateQuote?.callerId || null,
      rateQuote,
    };
  }

  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const sipAccount = await getOrCreateUserSipAccount(userId, {
    callerNumber: rateQuote?.callerId || null,
  });
  if (sipAccount.status !== 'active') {
    throw new Error('Your SIP voice account is not active right now.');
  }

  const sipMetadata = (sipAccount.metadata as Record<string, any> | null) || {};
  if (
    linphoneEnabled !== 'true' &&
    !(astppConfig.enabled && astppConfig.provider === 'astpp') &&
    !trim(sipAccount.domain)
  ) {
    throw new Error('Linphone SIP backend is selected but not enabled in settings.');
  }

  const sipDomain = trim(sipAccount.domain) || trim(linphoneSipDomain) || trim(astppConfig.sipDomain);
  const sipPort = trim(linphoneSipPort) || trim(sipMetadata.port) || String(astppConfig.port || '');
  const sipTransport =
    trim(linphoneSipTransport) || trim(sipMetadata.transport) || trim(astppConfig.transport);
  const sipOutboundProxy =
    trim(linphoneSipOutboundProxy) ||
    trim(sipMetadata.outboundProxy) ||
    trim(sipMetadata.proxy) ||
    trim(astppConfig.outboundProxy);
  const sipWebSocketUrl =
    trim(linphoneSipWebSocketUrl) ||
    trim(userSipWebSocketUrl) ||
    trim(astppSipWebSocketUrl) ||
    trim(freePbxSipWebSocketUrl) ||
    trim(process.env.LINPHONE_SIP_WEBSOCKET_URL) ||
    trim(process.env.USER_SIP_WEBSOCKET_URL) ||
    trim(process.env.ASTPP_SIP_WEBSOCKET_URL) ||
    trim(process.env.SIP_WEBSOCKET_URL);

  if (!sipDomain) {
    throw new Error('Linphone SIP backend is selected, but the SIP domain is missing.');
  }

  const displayName =
    trim(rateQuote?.callerId) ||
    trim((user as any).name) ||
    trim((user as any).email) ||
    sipAccount.username;

  return {
    backend: 'linphone',
    displayName,
    username: sipAccount.username,
    sipDomain: trim(sipAccount.domain) || sipDomain,
    sipPort: sipPort || '5060',
    sipTransport: sipTransport || 'udp',
    sipPassword: sipAccount.password,
    sipOutboundProxy,
    sipWebSocketUrl,
    sipWebRtcEnabled: /^wss?:\/\//i.test(sipWebSocketUrl),
    voicemailExtension: trim(linphoneVoicemailExtension) || '*98',
    defaultCountry: trim(defaultCountry).toUpperCase() || 'US',
    linphoneEnabled: true,
    expiresInSeconds: null,
    callType: rateQuote?.callType,
    callerId: rateQuote?.callerId || null,
    rateQuote,
  };
}
