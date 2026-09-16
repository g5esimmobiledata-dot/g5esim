import axios from "axios";
import { Router } from "express";
import { requireAdmin } from "server/lib/middleware";
import { storage } from "server/storage";
import * as ApiResponse from "server/utils/response";
import {
  buyAdminVirtualNumberInventory,
  ensureVonageSchema,
  getAdminVonageCountriesAvailability,
  getAdminVonageCountryPricing,
  getAdminVonageCountryPricingWithConfig,
  getAdminVirtualNumberInventoryWorkspace,
  getAdminVirtualNumberDashboard,
  searchAdminVonageNumbers,
  sendAdminVirtualSmsFromInventory,
  createAdminVirtualVoiceSessionFromInventory,
  reviewVirtualNumberSenderIdFromInventory,
  syncAdminVonageOwnedNumbers,
  updateVirtualNumberInventoryItem,
} from "server/services/vonage-service";

const router = Router();
const EROAMING_PROVIDERS_KEY = "eroaming_custom_providers";
const EROAMING_ACTIVE_PROVIDER_KEY = "eroaming_active_provider";

type ERoamingProviderConfig = {
  id: string;
  slug: string;
  name: string;
  apiBaseUrl: string;
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
  enabled: boolean;
  supportsLiveSync: boolean;
  countryCodes: string[];
  allCountries: boolean;
  notes: string;
  lastDidSyncAt: string | null;
  lastDidSyncStatus: string | null;
  lastDidSyncMessage: string | null;
  accountBalance?: ProviderAccountBalance | null;
  accountBalanceError?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ProviderAccountBalance = {
  value: string;
  currency: string;
  source: string;
  syncedAt: string;
};

const DEFAULT_EROAMING_PROVIDERS: ERoamingProviderConfig[] = [
  {
    id: "twilio",
    slug: "twilio",
    name: "Twilio",
    apiBaseUrl: "https://api.twilio.com/2010-04-01",
    apiKeyConfigured: false,
    apiSecretConfigured: false,
    enabled: true,
    supportsLiveSync: false,
    countryCodes: [],
    allCountries: true,
    notes: "Twilio provider profile for DID/phone number operations. Balance lookup is live when credentials are saved; DID sync still needs the Twilio number connector.",
    lastDidSyncAt: null,
    lastDidSyncStatus: "needs_connector",
    lastDidSyncMessage: "Twilio balance lookup is available. Live DID sync needs the Twilio number connector before numbers can be imported.",
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "didww",
    slug: "didww",
    name: "DIDWW",
    apiBaseUrl: "https://api.didww.com/v3",
    apiKeyConfigured: false,
    apiSecretConfigured: false,
    enabled: true,
    supportsLiveSync: false,
    countryCodes: [],
    allCountries: true,
    notes: "DIDWW provider profile for DID inventory, countries, pricing, and assignment workflow. Add credentials and connector logic before live DID sync.",
    lastDidSyncAt: null,
    lastDidSyncStatus: "needs_connector",
    lastDidSyncMessage: "DIDWW is available as a provider profile. Live DID sync needs the DIDWW connector before numbers can be imported.",
    createdAt: null,
    updatedAt: null,
  },
];

function slugifyProvider(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizeCountryCodes(value: unknown): string[] {
  const input = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(
      input
        .map((item) => String(item || "").trim().toUpperCase())
        .filter((code) => /^[A-Z]{2}$/.test(code)),
    ),
  ).sort();
}

function providerCredentialSettingKey(slug: string, field: "api_key" | "api_secret") {
  return `eroaming_provider_${slugifyProvider(slug)}_${field}`;
}

function normalizeProviderMoney(value: unknown, fallback = "0.00") {
  const parsed = Number.parseFloat(String(value || "").trim());
  if (!Number.isFinite(parsed)) return fallback;
  return parsed.toFixed(2);
}

function providerBasicAuthHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function getProviderStoredCredentials(slug: string) {
  const [apiKeySetting, apiSecretSetting] = await Promise.all([
    storage.getSettingByKey(providerCredentialSettingKey(slug, "api_key")),
    storage.getSettingByKey(providerCredentialSettingKey(slug, "api_secret")),
  ]);

  return {
    apiKey: String(apiKeySetting?.value || "").trim(),
    apiSecret: String(apiSecretSetting?.value || "").trim(),
  };
}

function getProviderApiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  const status = error.response?.status;
  const data = error.response?.data as any;
  const providerMessage =
    String(data?.message || data?.detail || data?.error_description || data?.error || "").trim();

  if (providerMessage && status) return `${fallback} (${status}): ${providerMessage}`;
  if (providerMessage) return `${fallback}: ${providerMessage}`;
  if (status) return `${fallback} (provider status ${status})`;
  return error.message || fallback;
}

async function getTwilioAccountBalance(accountSid: string, authToken: string): Promise<ProviderAccountBalance> {
  const response = await axios.get(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Balance.json`,
    {
      headers: {
        Authorization: providerBasicAuthHeader(accountSid, authToken),
      },
    },
  );

  return {
    value: normalizeProviderMoney(response.data?.balance),
    currency: String(response.data?.currency || "USD").trim().toUpperCase(),
    source: "twilio",
    syncedAt: new Date().toISOString(),
  };
}

async function hydrateProviderLiveStatus(provider: ERoamingProviderConfig): Promise<ERoamingProviderConfig> {
  const slug = slugifyProvider(provider.slug);
  if (slug !== "twilio") {
    return provider;
  }

  const providerWithUpdatedCopy = {
    ...provider,
    notes:
      provider.notes === "Twilio provider profile for DID/phone number operations. Add credentials and connector logic before live DID sync."
        ? "Twilio provider profile for DID/phone number operations. Balance lookup is live when credentials are saved; DID sync still needs the Twilio number connector."
        : provider.notes,
    lastDidSyncMessage:
      provider.lastDidSyncMessage === "Twilio is available as a provider profile. Live DID sync needs the Twilio connector before numbers can be imported."
        ? "Twilio balance lookup is available. Live DID sync needs the Twilio number connector before numbers can be imported."
        : provider.lastDidSyncMessage,
  };

  const credentials = await getProviderStoredCredentials(slug);
  if (!credentials.apiKey || !credentials.apiSecret) {
    return {
      ...providerWithUpdatedCopy,
      accountBalance: null,
      accountBalanceError: "Twilio Account SID and Auth Token are missing.",
    };
  }

  try {
    return {
      ...providerWithUpdatedCopy,
      accountBalance: await getTwilioAccountBalance(credentials.apiKey, credentials.apiSecret),
      accountBalanceError: null,
    };
  } catch (error) {
    return {
      ...providerWithUpdatedCopy,
      accountBalance: null,
      accountBalanceError: getProviderApiErrorMessage(error, "Could not load Twilio balance"),
    };
  }
}

async function saveProviderCredentialSettings(slug: string, payload: any) {
  const apiKey = payload?.apiKey !== undefined ? String(payload.apiKey || "").trim() : undefined;
  const apiSecret = payload?.apiSecret !== undefined ? String(payload.apiSecret || "").trim() : undefined;

  if (apiKey) {
    await storage.setSetting({
      key: providerCredentialSettingKey(slug, "api_key"),
      value: apiKey,
      category: "vonage",
    });
  }

  if (apiSecret) {
    await storage.setSetting({
      key: providerCredentialSettingKey(slug, "api_secret"),
      value: apiSecret,
      category: "vonage",
    });
  }

  return {
    apiKeyConfigured: apiKey ? true : undefined,
    apiSecretConfigured: apiSecret ? true : undefined,
  };
}

async function hydrateProviderCredentialFlags(provider: ERoamingProviderConfig): Promise<ERoamingProviderConfig> {
  const credentials = await getProviderStoredCredentials(provider.slug);

  return {
    ...provider,
    apiKeyConfigured: provider.apiKeyConfigured || Boolean(credentials.apiKey),
    apiSecretConfigured: provider.apiSecretConfigured || Boolean(credentials.apiSecret),
  };
}

async function hydrateProviderCredentialFlagsList(providers: ERoamingProviderConfig[]) {
  const providersWithCredentials = await Promise.all(providers.map((provider) => hydrateProviderCredentialFlags(provider)));
  return Promise.all(providersWithCredentials.map((provider) => hydrateProviderLiveStatus(provider)));
}

async function readCustomERoamingProviders(): Promise<ERoamingProviderConfig[]> {
  const setting = await storage.getSettingByKey(EROAMING_PROVIDERS_KEY);
  if (!setting?.value) return [];

  try {
    const parsed = JSON.parse(setting.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCustomERoamingProviders(providers: ERoamingProviderConfig[]) {
  await storage.setSetting({
    key: EROAMING_PROVIDERS_KEY,
    value: JSON.stringify(providers),
    category: "vonage",
  });
}

async function ensureDefaultERoamingProviders() {
  const providers = await readCustomERoamingProviders();
  const existingSlugs = new Set(providers.map((provider) => provider.slug));
  const missingProviders = DEFAULT_EROAMING_PROVIDERS.filter((provider) => !existingSlugs.has(provider.slug));

  if (missingProviders.length === 0) {
    return providers;
  }

  const now = new Date().toISOString();
  const nextProviders = [
    ...providers,
    ...missingProviders.map((provider) => ({
      ...provider,
      createdAt: now,
      updatedAt: now,
    })),
  ];

  await writeCustomERoamingProviders(nextProviders);
  return nextProviders;
}

async function getActiveERoamingProviderSlug() {
  const setting = await storage.getSettingByKey(EROAMING_ACTIVE_PROVIDER_KEY);
  return slugifyProvider(setting?.value || "vonage") || "vonage";
}

async function setActiveERoamingProviderSlug(slug: string) {
  await storage.setSetting({
    key: EROAMING_ACTIVE_PROVIDER_KEY,
    value: slugifyProvider(slug) || "vonage",
    category: "vonage",
  });
}

router.use(requireAdmin);

router.use(async (_req, _res, next) => {
  try {
    await ensureVonageSchema();
    next();
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard", async (_req, res) => {
  try {
    const data = await getAdminVirtualNumberDashboard();
    return ApiResponse.success(res, "Virtual number dashboard loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load virtual number dashboard");
  }
});

router.get("/providers", async (_req, res) => {
  try {
    const [dashboard, customProvidersRaw, activeProvider] = await Promise.all([
      getAdminVirtualNumberDashboard(),
      ensureDefaultERoamingProviders(),
      getActiveERoamingProviderSlug(),
    ]);
    const customProviders = await hydrateProviderCredentialFlagsList(customProvidersRaw);

    return ApiResponse.success(res, "eRoaming providers loaded successfully", {
      activeProvider,
      providers: [
        {
          id: "vonage",
          slug: "vonage",
          name: "Vonage",
          apiBaseUrl: "https://api.nexmo.com",
          apiKeyConfigured: dashboard.hasCredentials,
          apiSecretConfigured: dashboard.hasCredentials,
          enabled: dashboard.enabled,
          supportsLiveSync: true,
          countryCodes: [],
          allCountries: true,
          notes: "Built-in live DID connector for Vonage.",
          lastDidSyncAt: null,
          lastDidSyncStatus: null,
          lastDidSyncMessage: null,
          createdAt: null,
          updatedAt: null,
        },
        ...customProviders,
      ],
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to load eRoaming providers");
  }
});

router.post("/providers", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const slug = slugifyProvider(req.body?.slug || name);
    if (!name) return ApiResponse.badRequest(res, "Provider name is required");
    if (!slug) return ApiResponse.badRequest(res, "Provider slug is required");
    if (slug === "vonage") return ApiResponse.badRequest(res, "Vonage already exists as the built-in provider");

    const providers = await ensureDefaultERoamingProviders();
    if (providers.some((provider) => provider.slug === slug)) {
      return ApiResponse.badRequest(res, "A provider with this slug already exists");
    }

    const now = new Date().toISOString();
    const credentialFlags = await saveProviderCredentialSettings(slug, req.body);
    const provider: ERoamingProviderConfig = {
      id: slug,
      slug,
      name,
      apiBaseUrl: String(req.body?.apiBaseUrl || "").trim(),
      apiKeyConfigured: Boolean(credentialFlags.apiKeyConfigured),
      apiSecretConfigured: Boolean(credentialFlags.apiSecretConfigured),
      enabled: req.body?.enabled !== false,
      supportsLiveSync: false,
      countryCodes: normalizeCountryCodes(req.body?.countryCodes),
      allCountries: Boolean(req.body?.allCountries ?? true),
      notes: String(req.body?.notes || "").trim(),
      lastDidSyncAt: null,
      lastDidSyncStatus: null,
      lastDidSyncMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    await writeCustomERoamingProviders([...providers, provider]);
    if (req.body?.makeActive) await setActiveERoamingProviderSlug(slug);

    return ApiResponse.created(res, "eRoaming provider added successfully", provider);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to add eRoaming provider");
  }
});

router.patch("/providers/:slug", async (req, res) => {
  try {
    const slug = slugifyProvider(req.params.slug);
    if (!slug) return ApiResponse.badRequest(res, "Provider slug is required");

    if (slug === "vonage") {
      if (req.body?.makeActive) {
        await setActiveERoamingProviderSlug(slug);
      }

      return ApiResponse.success(res, "eRoaming provider updated successfully", {
        slug,
        activeProvider: await getActiveERoamingProviderSlug(),
      });
    }

    const providers = await ensureDefaultERoamingProviders();
    const index = providers.findIndex((provider) => provider.slug === slug);
    if (index === -1) return ApiResponse.notFound(res, "eRoaming provider not found");

    const existing = providers[index];
    const credentialFlags = await saveProviderCredentialSettings(slug, req.body);
    const updated: ERoamingProviderConfig = {
      ...existing,
      name: req.body?.name !== undefined ? String(req.body.name || "").trim() || existing.name : existing.name,
      apiBaseUrl: req.body?.apiBaseUrl !== undefined ? String(req.body.apiBaseUrl || "").trim() : existing.apiBaseUrl,
      apiKeyConfigured: credentialFlags.apiKeyConfigured ?? existing.apiKeyConfigured,
      apiSecretConfigured: credentialFlags.apiSecretConfigured ?? existing.apiSecretConfigured,
      enabled: req.body?.enabled !== undefined ? Boolean(req.body.enabled) : existing.enabled,
      countryCodes: req.body?.countryCodes !== undefined ? normalizeCountryCodes(req.body.countryCodes) : existing.countryCodes,
      allCountries: req.body?.allCountries !== undefined ? Boolean(req.body.allCountries) : existing.allCountries,
      notes: req.body?.notes !== undefined ? String(req.body.notes || "").trim() : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    providers[index] = updated;
    await writeCustomERoamingProviders(providers);
    if (req.body?.makeActive) {
      await setActiveERoamingProviderSlug(slug);
    }

    return ApiResponse.success(res, "eRoaming provider updated successfully", await hydrateProviderCredentialFlags(updated));
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || "Failed to update eRoaming provider");
  }
});

router.post("/providers/:slug/sync-dids", async (req, res) => {
  try {
    const slug = slugifyProvider(req.params.slug);
    const countryCodes = normalizeCountryCodes(req.body?.countryCodes);
    const allCountries = Boolean(req.body?.allCountries);
    const type = String(req.body?.type || "").trim();
    const features = String(req.body?.features || "").trim();
    const searchPattern = Number.parseInt(String(req.body?.searchPattern || "1"), 10);

    if (slug === "vonage") {
      const data = await getAdminVonageCountriesAvailability(countryCodes, {
        type,
        features,
        searchPattern: Number.isNaN(searchPattern) ? 1 : searchPattern,
        forceRefresh: true,
      });

      return ApiResponse.success(res, "Vonage DID countries synced successfully", {
        provider: "vonage",
        supported: true,
        allCountries,
        countryCount: data.countries?.length || 0,
        countries: data.countries || [],
        syncedAt: new Date().toISOString(),
      });
    }

    const providers = await ensureDefaultERoamingProviders();
    const index = providers.findIndex((provider) => provider.slug === slug);
    if (index === -1) return ApiResponse.notFound(res, "eRoaming provider not found");

    const now = new Date().toISOString();
    const connectorMessage =
      slug === "twilio"
        ? "Twilio balance lookup is available, but live DID sync needs the Twilio number connector before numbers can be imported."
        : "This provider is saved, but live DID sync needs a provider-specific connector before numbers can be imported.";
    providers[index] = {
      ...providers[index],
      countryCodes,
      allCountries,
      lastDidSyncAt: now,
      lastDidSyncStatus: "needs_connector",
      lastDidSyncMessage: connectorMessage,
      updatedAt: now,
    };
    await writeCustomERoamingProviders(providers);

    return ApiResponse.success(res, "eRoaming provider DID sync queued for connector setup", {
      provider: slug,
      supported: false,
      countryCount: countryCodes.length,
      syncedAt: now,
      message: providers[index].lastDidSyncMessage,
    });
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to sync provider DID countries");
  }
});

router.post("/providers/:slug/sync-owned-dids", async (req, res) => {
  try {
    const slug = slugifyProvider(req.params.slug);
    if (slug !== "vonage") {
      return ApiResponse.badRequest(res, "Owned DID sync is currently available for Vonage only");
    }

    const countryCodes = normalizeCountryCodes(req.body?.countryCodes);
    const data = await syncAdminVonageOwnedNumbers({
      countryCodes,
      updateWebhooks: Boolean(req.body?.updateWebhooks),
    });

    return ApiResponse.success(res, "Vonage owned DID inventory synced successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to sync owned Vonage DID inventory");
  }
});

router.get("/search", async (req, res) => {
  try {
    const countryCode = String(req.query.countryCode || "").trim().toUpperCase();
    const pattern = String(req.query.pattern || "").trim();
    const type = String(req.query.type || "").trim();
    const features = String(req.query.features || "").trim();
    const searchPattern = Number.parseInt(String(req.query.searchPattern || "1"), 10);
    const pageIndex = Number.parseInt(String(req.query.pageIndex || "1"), 10);
    const pageSize = Number.parseInt(String(req.query.pageSize || "100"), 10);

    const data = await searchAdminVonageNumbers(countryCode, pattern, {
      type,
      features,
      searchPattern: Number.isNaN(searchPattern) ? 1 : searchPattern,
      pageIndex: Number.isNaN(pageIndex) ? 1 : pageIndex,
      pageSize: Number.isNaN(pageSize) ? 100 : pageSize,
    });
    return ApiResponse.success(res, "Available numbers loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to search available numbers");
  }
});

router.post("/countries-summary", async (req, res) => {
  try {
    const countryCodes = Array.isArray(req.body?.countryCodes) ? req.body.countryCodes : [];
    const type = String(req.body?.type || "").trim();
    const features = String(req.body?.features || "").trim();
    const searchPattern = Number.parseInt(String(req.body?.searchPattern || "1"), 10);

    const data = await getAdminVonageCountriesAvailability(countryCodes, {
      type,
      features,
      searchPattern: Number.isNaN(searchPattern) ? 1 : searchPattern,
      forceRefresh: Boolean(req.body?.forceRefresh),
    });

    return ApiResponse.success(res, "DID country availability loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load DID country availability");
  }
});

router.get("/provider-pricing", async (req, res) => {
  try {
    const countryCode = String(req.query.countryCode || "").trim().toUpperCase();
    const data = await getAdminVonageCountryPricing(countryCode);
    return ApiResponse.success(res, "Provider pricing loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load provider pricing");
  }
});

router.post("/provider-pricing", async (req, res) => {
  try {
    const countryCode = String(req.body?.countryCode || "").trim().toUpperCase();
    const data = await getAdminVonageCountryPricingWithConfig(countryCode, {
      enabled: true,
      apiKey: String(req.body?.apiKey || "").trim(),
      apiSecret: String(req.body?.apiSecret || "").trim(),
      defaultCountry: String(req.body?.defaultCountry || countryCode || "").trim().toUpperCase(),
    });
    return ApiResponse.success(res, "Provider pricing loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load provider pricing");
  }
});

router.post("/buy", async (req, res) => {
  try {
    const inventoryItem = await buyAdminVirtualNumberInventory({
      countryCode: String(req.body?.countryCode || "").trim().toUpperCase(),
      msisdn: String(req.body?.msisdn || "").trim(),
      notes: String(req.body?.notes || "").trim(),
      isPremium: Boolean(req.body?.isPremium),
      providerSetupCost: req.body?.providerSetupCost,
      providerMonthlyCost: req.body?.providerMonthlyCost,
      providerInboundCost: req.body?.providerInboundCost,
      providerOutboundCost: req.body?.providerOutboundCost,
      providerSmsCost: req.body?.providerSmsCost,
      providerMmsCost: req.body?.providerMmsCost,
      providerVoiceCost: req.body?.providerVoiceCost,
      setupFee: req.body?.setupFee,
      monthlyFee: req.body?.monthlyFee,
      inboundFee: req.body?.inboundFee,
      outboundFee: req.body?.outboundFee,
      smsFee: req.body?.smsFee,
      mmsFee: req.body?.mmsFee,
      voiceFee: req.body?.voiceFee,
      customPackagePrices: req.body?.customPackagePrices,
      packageTerm: req.body?.packageTerm,
      paymentMethod: req.body?.paymentMethod,
      assignedUserId: req.body?.assignedUserId,
      forwardingType: req.body?.forwardingType,
      forwardingDestination: req.body?.forwardingDestination,
    });

    return ApiResponse.success(res, "Virtual number purchased successfully", inventoryItem);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to buy virtual number");
  }
});

router.get("/inventory/:id/workspace", async (req, res) => {
  try {
    const data = await getAdminVirtualNumberInventoryWorkspace(String(req.params.id || "").trim());
    return ApiResponse.success(res, "Bought DID workspace loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load bought DID workspace");
  }
});

router.post("/inventory/:id/messages/send", async (req, res) => {
  try {
    const to = String(req.body?.to || "").trim();
    const text = String(req.body?.text || "").trim();
    if (!to) return ApiResponse.badRequest(res, "Recipient number is required");
    if (!text) return ApiResponse.badRequest(res, "Message text is required");

    const data = await sendAdminVirtualSmsFromInventory(
      String(req.params.id || "").trim(),
      to,
      text,
    );
    return ApiResponse.success(res, "SMS sent successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to send SMS from this DID");
  }
});

router.patch("/inventory/:id/sender-id", async (req, res) => {
  try {
    const action = req.body?.action === "reject" ? "reject" : "approve";
    const data = await reviewVirtualNumberSenderIdFromInventory(
      String(req.params.id || "").trim(),
      action,
      {
        senderId: req.body?.senderId,
        rejectionReason: req.body?.rejectionReason,
      },
    );
    return ApiResponse.success(res, "Sender ID review saved successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to review Sender ID");
  }
});

router.post("/inventory/:id/voice/session", async (req, res) => {
  try {
    const to = String(req.body?.to || req.body?.referenceNumber || "").trim();
    if (!to) return ApiResponse.badRequest(res, "Call number is required");

    const data = await createAdminVirtualVoiceSessionFromInventory(
      String(req.params.id || "").trim(),
      to,
      {
        callType: req.body?.callType === "sip" ? "sip" : "international",
        spokenMessage: String(req.body?.spokenMessage || "").trim(),
      },
    );
    return ApiResponse.success(res, "Voice session created successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to start call from this DID");
  }
});

router.patch("/inventory/:id", async (req, res) => {
  try {
    const inventoryItem = await updateVirtualNumberInventoryItem(req.params.id, {
      isPremium: req.body?.isPremium,
      providerSetupCost: req.body?.providerSetupCost,
      providerMonthlyCost: req.body?.providerMonthlyCost,
      providerInboundCost: req.body?.providerInboundCost,
      providerOutboundCost: req.body?.providerOutboundCost,
      providerSmsCost: req.body?.providerSmsCost,
      providerMmsCost: req.body?.providerMmsCost,
      providerVoiceCost: req.body?.providerVoiceCost,
      setupFee: req.body?.setupFee,
      monthlyFee: req.body?.monthlyFee,
      inboundFee: req.body?.inboundFee,
      outboundFee: req.body?.outboundFee,
      smsFee: req.body?.smsFee,
      mmsFee: req.body?.mmsFee,
      voiceFee: req.body?.voiceFee,
      notes: req.body?.notes,
      status: req.body?.status,
      assignedUserId: req.body?.assignedUserId,
      forwardingType: req.body?.forwardingType,
      forwardingDestination: req.body?.forwardingDestination,
      autoRenew: req.body?.autoRenew,
      reminderDays: req.body?.reminderDays,
      cancelAtPeriodEnd: req.body?.cancelAtPeriodEnd,
      packageTerm: req.body?.renewalPackageTerm || req.body?.packageTerm,
    });

    return ApiResponse.success(res, "Virtual number updated successfully", inventoryItem);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to update virtual number");
  }
});

export default router;
