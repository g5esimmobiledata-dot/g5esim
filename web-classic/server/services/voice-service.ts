import { storage } from "server/storage";
import { chargeUserVirtualVoiceAccess, createVonageVoiceSession } from "server/services/vonage-service";
import { getOrCreateUserSipAccount } from "server/services/user-sip-service";
import { getAstppConfig } from "server/services/astpp-service";

function trim(value: unknown) {
  return String(value || "").trim();
}

async function getSettingValue(key: string) {
  return (await storage.getSettingByKey(key))?.value || "";
}

export type VoiceSessionPayload =
  | {
      backend: "vonage";
      username: string;
      displayName: string;
      token: string;
      applicationId: string;
      brandName: string;
      defaultCountry: string;
      createdUser: boolean;
      expiresInSeconds: number;
    }
  | {
      backend: "linphone";
      displayName: string;
      username: string;
      sipDomain: string;
      sipPort: string;
      sipTransport: string;
      sipPassword: string;
      sipOutboundProxy: string;
      voicemailExtension: string;
      defaultCountry: string;
      linphoneEnabled: boolean;
      expiresInSeconds: null;
    };

export async function createVoiceSession(
  userId: string,
  options?: {
    direction?: "inbound" | "outbound";
    referenceNumber?: string | null;
    virtualNumberId?: string | null;
  },
): Promise<VoiceSessionPayload> {
  const [voiceBackend, defaultCountry, linphoneEnabled, linphoneSipDomain, linphoneSipPort, linphoneSipTransport, linphoneSipOutboundProxy, linphoneVoicemailExtension] =
    await Promise.all([
      getSettingValue("voice_backend"),
      getSettingValue("vonage_virtual_number_default_country"),
      getSettingValue("linphone_enabled"),
      getSettingValue("linphone_sip_domain"),
      getSettingValue("linphone_sip_port"),
      getSettingValue("linphone_sip_transport"),
      getSettingValue("linphone_sip_outbound_proxy"),
      getSettingValue("linphone_voicemail_extension"),
    ]);
  const astppConfig = await getAstppConfig();
  const shouldUseSipBackend =
    (voiceBackend || (astppConfig.enabled && astppConfig.provider === "astpp" ? "linphone" : "vonage")) === "linphone";

  if (!shouldUseSipBackend) {
    const vonageSession = await createVonageVoiceSession(userId, options);
    return {
      backend: "vonage",
      ...vonageSession,
    };
  }

  if (linphoneEnabled !== "true" && !(astppConfig.enabled && astppConfig.provider === "astpp")) {
    throw new Error("Linphone SIP backend is selected but not enabled in settings.");
  }

  const sipDomain = trim(linphoneSipDomain) || trim(astppConfig.sipDomain);
  const sipPort = trim(linphoneSipPort) || String(astppConfig.port || "");
  const sipTransport = trim(linphoneSipTransport) || trim(astppConfig.transport);
  const sipOutboundProxy = trim(linphoneSipOutboundProxy) || trim(astppConfig.outboundProxy);

  if (!sipDomain) {
    throw new Error("Linphone SIP backend is selected, but the SIP domain is missing.");
  }

  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  await chargeUserVirtualVoiceAccess(userId, { ...options, backend: "linphone" });

  const sipAccount = await getOrCreateUserSipAccount(userId);
  const displayName = trim((user as any).name) || trim((user as any).email) || sipAccount.username;

  return {
    backend: "linphone",
    displayName,
    username: sipAccount.username,
    sipDomain: trim(sipAccount.domain) || sipDomain,
    sipPort: sipPort || "5060",
    sipTransport: sipTransport || "udp",
    sipPassword: sipAccount.password,
    sipOutboundProxy,
    voicemailExtension: trim(linphoneVoicemailExtension) || "*98",
    defaultCountry: trim(defaultCountry).toUpperCase() || "US",
    linphoneEnabled: true,
    expiresInSeconds: null,
  };
}
