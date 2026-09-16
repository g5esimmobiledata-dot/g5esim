import { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  BarChart3,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  DollarSign,
  Globe,
  Headphones,
  Inbox,
  Loader2,
  Mic,
  Phone,
  PhoneCall,
  Package,
  Plus,
  RefreshCw,
  Server,
  Search,
  Send,
  Settings as SettingsIcon,
  ShoppingCart,
  Star,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { VonageSettingsTab } from './Settings';
import { useTranslation } from '@/contexts/TranslationContext';

type PricingDefaults = {
  setupFee: string;
  monthlyFee: string;
  inboundFee: string;
  outboundFee: string;
  standardMonthPackagePrice: string;
  standardThreeMonthPackagePrice: string;
  standardSixMonthPackagePrice: string;
  standardNineMonthPackagePrice: string;
  standardYearPackagePrice: string;
  premiumSetupFee: string;
  premiumMonthlyFee: string;
  premiumInboundFee: string;
  premiumOutboundFee: string;
  premiumMonthPackagePrice: string;
  premiumThreeMonthPackagePrice: string;
  premiumSixMonthPackagePrice: string;
  premiumNineMonthPackagePrice: string;
  premiumYearPackagePrice: string;
};

type InventoryRowState = {
  isPremium: boolean;
  assignedUserId?: string | null;
  providerSetupCost: string;
  providerMonthlyCost: string;
  providerInboundCost: string;
  providerOutboundCost: string;
  providerSmsCost: string;
  providerMmsCost: string;
  providerVoiceCost: string;
  setupFee: string;
  monthlyFee: string;
  inboundFee: string;
  outboundFee: string;
  smsFee: string;
  mmsFee: string;
  voiceFee: string;
  autoRenew?: boolean;
  reminderDays?: string;
  cancelAtPeriodEnd?: boolean;
  customPackagePrices?: CustomPackagePrices;
  renewalPackageTerm?: PackageTerm;
  resellerDiscountPercent?: string;
  agentDiscountPercent?: string;
};

type PackageRateState = {
  standardMonthPackagePrice: string;
  standardYearPackagePrice: string;
  premiumMonthPackagePrice: string;
  premiumYearPackagePrice: string;
};

type PackageTerm =
  | '1_month'
  | '3_months'
  | '6_months'
  | '9_months'
  | '1_year';

type DidAvailabilityFilter = 'all' | 'with_did' | 'without_did';
type ERoamingProviderName = string;
type ERoamingProviderConfig = {
  id: string;
  slug: string;
  name: string;
  apiBaseUrl?: string;
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
  enabled: boolean;
  supportsLiveSync: boolean;
  countryCodes: string[];
  allCountries: boolean;
  notes?: string;
  lastDidSyncAt?: string | null;
  lastDidSyncStatus?: string | null;
  lastDidSyncMessage?: string | null;
  accountBalance?: {
    value: string;
    currency: string;
    source: string;
    syncedAt: string;
  } | null;
  accountBalanceError?: string | null;
};

type ProviderCredentialLabelSource = {
  slug?: string;
  name?: string;
};

type ProviderCredentialLabels = {
  dialogTitle: string;
  dialogDescription: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryNewPlaceholder: string;
  secondaryNewPlaceholder: string;
  primaryEditPlaceholder: string;
  secondaryEditPlaceholder: string;
  primarySavedPlaceholder: string;
  secondarySavedPlaceholder: string;
  primaryStatusLabel: string;
  secondaryStatusLabel: string;
  actionLabel: string;
  saveLabel: string;
};

function getProviderCredentialLabels(provider?: ProviderCredentialLabelSource | null): ProviderCredentialLabels {
  const providerSlug = (provider?.slug || '').toLowerCase();
  const providerName = (provider?.name || '').toLowerCase();
  const isTwilio = providerSlug === 'twilio' || providerSlug === 'twillio' || providerName.includes('twilio') || providerName.includes('twillio');
  const isDidww = providerSlug === 'didww' || providerName.includes('didww');

  if (isTwilio) {
    return {
      dialogTitle: 'Twilio Credentials',
      dialogDescription: 'Save The Twilio API Base URL, Account SID, And Auth Token Here. Leave Account SID Or Auth Token Blank To Keep The Current Saved Value.',
      primaryLabel: 'Account SID',
      secondaryLabel: 'Auth Token',
      primaryNewPlaceholder: 'Optional Account SID',
      secondaryNewPlaceholder: 'Optional Auth Token',
      primaryEditPlaceholder: 'Paste Account SID',
      secondaryEditPlaceholder: 'Paste Auth Token',
      primarySavedPlaceholder: 'Saved. Leave Blank To Keep',
      secondarySavedPlaceholder: 'Saved. Leave Blank To Keep',
      primaryStatusLabel: 'Account SID',
      secondaryStatusLabel: 'Auth Token',
      actionLabel: 'Credentials',
      saveLabel: 'Save Credentials',
    };
  }

  if (isDidww) {
    return {
      dialogTitle: 'DIDWW API Keys',
      dialogDescription: 'Save The DIDWW API Base URL, API Key, And API Secret Here. Leave Key Or Secret Blank To Keep The Current Saved Value.',
      primaryLabel: 'DIDWW API Key',
      secondaryLabel: 'DIDWW API Secret',
      primaryNewPlaceholder: 'Optional DIDWW API Key',
      secondaryNewPlaceholder: 'Optional DIDWW API Secret',
      primaryEditPlaceholder: 'Paste DIDWW API Key',
      secondaryEditPlaceholder: 'Paste DIDWW API Secret',
      primarySavedPlaceholder: 'Saved. Leave Blank To Keep',
      secondarySavedPlaceholder: 'Saved. Leave Blank To Keep',
      primaryStatusLabel: 'DIDWW API Key',
      secondaryStatusLabel: 'DIDWW API Secret',
      actionLabel: 'API Keys',
      saveLabel: 'Save API Keys',
    };
  }

  return {
    dialogTitle: 'Provider API Keys',
    dialogDescription: 'Save The Provider API Base URL, Key, And Secret Here. Leave Key Or Secret Blank To Keep The Current Saved Value.',
    primaryLabel: 'API Key',
    secondaryLabel: 'API Secret',
    primaryNewPlaceholder: 'Optional',
    secondaryNewPlaceholder: 'Optional',
    primaryEditPlaceholder: 'Paste API Key',
    secondaryEditPlaceholder: 'Paste API Secret',
    primarySavedPlaceholder: 'Saved. Leave Blank To Keep',
    secondarySavedPlaceholder: 'Saved. Leave Blank To Keep',
    primaryStatusLabel: 'API Key',
    secondaryStatusLabel: 'API Secret',
    actionLabel: 'API Keys',
    saveLabel: 'Save API Keys',
  };
}

type ERoamingProvidersResponse = {
  activeProvider: string;
  providers: ERoamingProviderConfig[];
};

type CustomPackagePrices = {
  oneMonth: string;
  threeMonths: string;
  sixMonths: string;
  nineMonths: string;
  twelveMonths: string;
};

type PurchaseDialogState = {
  open: boolean;
  msisdn: string | null;
  packageTerm: PackageTerm;
  paymentMethod: 'wallet' | 'other';
  assignedUserId: string;
  forwardingType: 'none' | 'international' | 'sip' | 'voicemail';
  forwardingDestination: string;
};

type SearchResult = {
  msisdn: string;
  countryCode: string;
  type: string;
  features: string;
  setupCost: string;
  monthlyCost: string;
  availableToBuy: boolean;
};

type SearchPageMeta = {
  pageIndex: number;
  pageSize: number;
  returnedCount: number;
  loadedCount: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  countryCodes: string[];
  isMultiCountry: boolean;
  searchPattern: string;
};

type CountryPricingRow = {
  country_name?: string;
  dialing_prefix?: string;
  dest_network_type?: string;
  rate_increment?: string;
  currency?: string;
  price?: string;
};

type ProviderPricingData = {
  smsApiPricing: CountryPricingRow[];
  voiceApiPricing: CountryPricingRow[];
  messagesApiPricing: CountryPricingRow[];
  smsApiNote: string;
  voiceApiNote: string;
  messagesApiNote: string;
  pricingWarnings?: string[];
};

type NumberPlanPriceRow = {
  providerCost: string;
  resellerPrice: string;
  agentPrice: string;
  retailPrice: string;
};

type NumberPlan = {
  setup: NumberPlanPriceRow;
  monthly: NumberPlanPriceRow;
  inbound: NumberPlanPriceRow;
  outbound: NumberPlanPriceRow;
  sms: NumberPlanPriceRow;
  mms: NumberPlanPriceRow;
  voice: NumberPlanPriceRow;
};

type VonageCountryRateMatrix = {
  providerCurrency: string;
  standardPlan: NumberPlan;
  premiumPlan: NumberPlan;
  messagesApiPrice: string;
  messagesApiNotes: string;
};

type VonageCountryRateMatrixMap = Record<string, VonageCountryRateMatrix>;

type DidCountryCatalogRow = {
  countryCode: string;
  availableCount: number;
  buyReadyCount: number;
  hasAvailable: boolean;
  previewMsisdn: string;
  previewType: string;
  previewFeatures: string;
  providerSetupCost: string;
  providerMonthlyCost: string;
  error: string | null;
};

type DidCountryCatalogResponse = {
  defaultCountry: string;
  feature: string;
  type: string;
  scan?: {
    requestedCountries: number;
    successfulCountries: number;
    errorCountries: number;
    isPartial: boolean;
  };
  countries: DidCountryCatalogRow[];
};

type MessagesApiFormState = {
  price: string;
  notes: string;
};

type CountryOption = {
  name: string;
  code: string;
  label: string;
};

type BulkPriceState = {
  setupFee: string;
  monthlyFee: string;
  inboundFee: string;
  outboundFee: string;
  smsFee: string;
  mmsFee: string;
  voiceFee: string;
  threeMonthsPrice: string;
  sixMonthsPrice: string;
  nineMonthsPrice: string;
  twelveMonthsPrice: string;
};

type BulkCountryRateState = {
  setupRetailPrice: string;
  setupResellerPrice: string;
  setupAgentPrice: string;
  monthlyRetailPrice: string;
  monthlyResellerPrice: string;
  monthlyAgentPrice: string;
  marginPercent: string;
};

type BulkMarginState = {
  setupMargin: string;
  monthlyMargin: string;
  inboundMargin: string;
  outboundMargin: string;
  smsMargin: string;
  mmsMargin: string;
  voiceMargin: string;
  threeMonthsMargin: string;
  sixMonthsMargin: string;
  nineMonthsMargin: string;
  twelveMonthsMargin: string;
};

type BulkCountryTarget = 'ALL' | string;
type NumberMatchMode = 'contains' | 'starts_with' | 'ends_with';
type NumberFeature = 'any' | 'SMS' | 'VOICE' | 'SMS,VOICE';
type NumberFeaturePart = 'SMS' | 'VOICE';
type NumberType = 'any' | 'mobile-lvn' | 'landline' | 'toll_free';
type DidPriceSortMode = 'default' | 'price_low_high' | 'price_high_low';

type DashboardData = {
  provider: string;
  enabled: boolean;
  hasCredentials: boolean;
  defaultCountry: string;
  autoAssign: boolean;
  accountBalance: {
    value: string;
    autoReload: boolean;
    currency: string;
  } | null;
  accountBalanceError: string | null;
  settings: {
    pricing: PricingDefaults;
    inboundWebhookUrl: string;
    statusWebhookUrl: string;
  };
  summary: {
    totalInventory: number;
    availableInventory: number;
    assignedInventory: number;
    activeNumbers: number;
    premiumInventory: number;
    pendingApplications: number;
  };
  usageSummary?: {
    totalCustomerCharges: string;
    totalEstimatedVonageCost: string;
    totalEstimatedProfit: string;
    smsCount: number;
    voiceSessionCount: number;
    renewalCount: number;
    outboundSmsCount: number;
    inboundSmsCount: number;
    outboundVoiceCount: number;
    inboundVoiceCount: number;
    totalSmsCustomerCharges: string;
    totalSmsProviderCost: string;
    totalVoiceCustomerCharges: string;
    totalVoiceProviderCost: string;
    totalRenewalCustomerCharges: string;
    totalRenewalProviderCost: string;
  };
  usageTransactions?: Array<{
    id: string;
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    userRole?: string | null;
    type: string;
    status: string;
    description: string;
    provider: string;
    msisdn: string;
    virtualNumberId?: string | null;
    inventoryId?: string | null;
    usageType: string;
    direction?: string | null;
    chargePoint?: string | null;
    billingRole?: string | null;
    customerCharge: string;
    retailRate: string;
    providerCost: string;
    grossProfit: string;
    balanceBefore: string;
    balanceAfter: string;
    referenceId?: string | null;
    completedAt?: string | null;
    createdAt: string;
    metadata?: Record<string, any>;
  }>;
  usageMessages?: Array<{
    id: string;
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    virtualNumberId: string;
    msisdn: string;
    direction: string;
    fromNumber: string;
    toNumber: string;
    text: string;
    status: string;
    providerMessageId?: string | null;
    customerCharge: string;
    providerCost: string;
    grossProfit: string;
    createdAt: string;
  }>;
  inventory: Array<{
    id: string;
    msisdn: string;
    countryCode: string;
    status: string;
    isPremium: boolean;
    providerSetupCost: string;
    providerMonthlyCost: string;
    providerInboundCost: string;
    providerOutboundCost: string;
    providerSmsCost: string;
    providerMmsCost: string;
    providerVoiceCost: string;
    setupFee: string;
    monthlyFee: string;
    inboundFee: string;
    outboundFee: string;
    smsFee: string;
    mmsFee: string;
    voiceFee: string;
    assignedUserId?: string | null;
    notes?: string | null;
    metadata?: Record<string, any> | null;
    createdAt: string;
  }>;
  applications: Array<{
    id: string;
    userId: string;
    status: string;
    countryCode: string;
    desiredNumber?: string | null;
    createdAt: string;
  }>;
  activeNumbers: Array<{
    id: string;
    userId: string;
    msisdn: string;
    countryCode: string;
    status: string;
    createdAt: string;
    assignedAt?: string;
  }>;
};

type AdminBoughtDidMessage = {
  id: string;
  direction: string;
  fromNumber: string;
  toNumber: string;
  text: string;
  status: string;
  createdAt: string;
};

type AdminBoughtDidVoiceCall = {
  id: string;
  direction: string;
  fromNumber: string;
  toNumber: string;
  provider?: string | null;
  status: string;
  metadata?: Record<string, any> | null;
  createdAt: string;
};

type AdminBoughtDidVoicemail = {
  id: string;
  fromNumber: string;
  toNumber: string;
  recordingUrl?: string | null;
  durationSeconds?: number | null;
  status: string;
  createdAt: string;
};

type AdminBoughtDidWorkspace = {
  assignedAccount?: { id: string; name?: string | null; email?: string | null; role?: string | null } | null;
  selectedNumber?: {
    id: string;
    msisdn: string;
    countryCode: string;
    status: string;
    senderId?: {
      requested?: string | null;
      approved?: string | null;
      approvedList?: string[];
      status?: string | null;
      requestedAt?: string | null;
      reviewedAt?: string | null;
      rejectedReason?: string | null;
    } | null;
    billing?: {
      canSendSms?: boolean;
      canStartOutboundCall?: boolean;
      rates?: {
        smsOutbound?: string;
        voiceOutbound?: string;
      };
    } | null;
    routing?: {
      type?: string;
      destination?: string | null;
    } | null;
  } | null;
  messages: AdminBoughtDidMessage[];
  receivingMessages: AdminBoughtDidMessage[];
  sendingMessages: AdminBoughtDidMessage[];
  voiceCalls: AdminBoughtDidVoiceCall[];
  voicemails: AdminBoughtDidVoicemail[];
};

type AdminVirtualNumbersSection =
  | 'dashboard'
  | 'providers'
  | 'numbers'
  | 'bought-dids'
  | 'country-numbers'
  | 'pricing'
  | 'cost-price'
  | 'logs'
  | 'pending'
  | 'active';

type AdminVirtualNumbersProps = {
  section?: AdminVirtualNumbersSection;
};

const DID_COUNTRY_BATCH_SIZE = 20;

function cleanApiErrorMessage(text: string, fallback: string) {
  const raw = String(text || '').trim();
  if (!raw) return fallback;

  try {
    const json = JSON.parse(raw);
    return json?.message || json?.error || fallback;
  } catch {
    // Continue with HTML/plain-text cleanup.
  }

  const title = raw.match(/<title[^>]*>(.*?)<\/title>/i)?.[1];
  const heading = raw.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1];
  const htmlMessage = title || heading;
  if (htmlMessage) {
    return htmlMessage.replace(/<[^>]*>/g, '').trim() || fallback;
  }

  if (raw.includes('<html') || raw.includes('<!DOCTYPE')) return fallback;
  return raw;
}

async function postDidCountriesSummary(
  countryCodes: string[],
  options: {
    features: string;
    type: string;
    searchPattern: number;
    forceRefresh?: boolean;
  },
): Promise<DidCountryCatalogResponse> {
  const response = await fetch('/api/admin/virtual-numbers/countries-summary', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      countryCodes,
      features: options.features,
      type: options.type,
      searchPattern: options.searchPattern,
      forceRefresh: Boolean(options.forceRefresh),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      cleanApiErrorMessage(
        text,
        "Vonage DID availability request timed out. Please try Sync DID's again.",
      ),
    );
  }

  const json = await response.json();
  return (json?.data ?? json) as DidCountryCatalogResponse;
}

async function loadDidCountryCatalogInBatches(
  countryCodes: string[],
  options: {
    features: string;
    type: string;
    searchPattern: number;
    forceRefresh?: boolean;
  },
): Promise<DidCountryCatalogResponse> {
  const chunks: string[][] = [];
  for (let index = 0; index < countryCodes.length; index += DID_COUNTRY_BATCH_SIZE) {
    chunks.push(countryCodes.slice(index, index + DID_COUNTRY_BATCH_SIZE));
  }

  const responses: DidCountryCatalogResponse[] = [];
  for (const chunk of chunks) {
    responses.push(await postDidCountriesSummary(chunk, options));
  }

  const first = responses[0];
  const countries = responses.flatMap((response) => response.countries || []);
  const requestedCountries = responses.reduce(
    (sum, response) => sum + (response.scan?.requestedCountries ?? response.countries?.length ?? 0),
    0,
  );
  const successfulCountries = responses.reduce(
    (sum, response) =>
      sum +
      (response.scan?.successfulCountries ??
        (response.countries || []).filter((country) => !country.error).length),
    0,
  );
  const errorCountries = responses.reduce(
    (sum, response) =>
      sum +
      (response.scan?.errorCountries ??
        (response.countries || []).filter((country) => country.error).length),
    0,
  );

  return {
    defaultCountry: first?.defaultCountry || 'US',
    feature: first?.feature || options.features || 'any',
    type: first?.type || options.type || 'any',
    scan: {
      requestedCountries,
      successfulCountries,
      errorCountries,
      isPartial: errorCountries > 0 || responses.some((response) => response.scan?.isPartial),
    },
    countries,
  };
}

function pricingFromDefaults(pricing: PricingDefaults, isPremium = false): InventoryRowState {
  const setup = parseMoney(isPremium ? pricing.premiumSetupFee : pricing.setupFee) ?? 0;
  const monthly = parseMoney(isPremium ? pricing.premiumMonthlyFee : pricing.monthlyFee) ?? 0;
  const customPackagePrices: CustomPackagePrices = {
    oneMonth: isPremium ? pricing.premiumMonthPackagePrice : pricing.standardMonthPackagePrice,
    threeMonths: isPremium ? pricing.premiumThreeMonthPackagePrice : pricing.standardThreeMonthPackagePrice,
    sixMonths: isPremium ? pricing.premiumSixMonthPackagePrice : pricing.standardSixMonthPackagePrice,
    nineMonths: isPremium ? pricing.premiumNineMonthPackagePrice : pricing.standardNineMonthPackagePrice,
    twelveMonths: isPremium ? pricing.premiumYearPackagePrice : pricing.standardYearPackagePrice,
  };

  return {
    isPremium,
    providerSetupCost: '0.00',
    providerMonthlyCost: '0.00',
    providerInboundCost: '0.00',
    providerOutboundCost: '0.00',
    providerSmsCost: '0.00',
    providerMmsCost: '0.00',
    providerVoiceCost: '0.00',
    setupFee: isPremium ? pricing.premiumSetupFee : pricing.setupFee,
    monthlyFee: isPremium ? pricing.premiumMonthlyFee : pricing.monthlyFee,
    inboundFee: isPremium ? pricing.premiumInboundFee : pricing.inboundFee,
    outboundFee: isPremium ? pricing.premiumOutboundFee : pricing.outboundFee,
    smsFee: isPremium ? pricing.premiumOutboundFee : pricing.outboundFee,
    mmsFee: '0.00',
    voiceFee: isPremium ? pricing.premiumOutboundFee : pricing.outboundFee,
    autoRenew: true,
    reminderDays: '3',
    cancelAtPeriodEnd: false,
    customPackagePrices,
    resellerDiscountPercent: '0.00',
    agentDiscountPercent: '0.00',
  };
}

function fallbackPricingDefaults(): PricingDefaults {
  return {
    setupFee: '0.00',
    monthlyFee: '0.00',
    inboundFee: '0.00',
    outboundFee: '0.00',
    standardMonthPackagePrice: '0.00',
    standardThreeMonthPackagePrice: '0.00',
    standardSixMonthPackagePrice: '0.00',
    standardNineMonthPackagePrice: '0.00',
    standardYearPackagePrice: '0.00',
    premiumSetupFee: '0.00',
    premiumMonthlyFee: '0.00',
    premiumInboundFee: '0.00',
    premiumOutboundFee: '0.00',
    premiumMonthPackagePrice: '0.00',
    premiumThreeMonthPackagePrice: '0.00',
    premiumSixMonthPackagePrice: '0.00',
    premiumNineMonthPackagePrice: '0.00',
    premiumYearPackagePrice: '0.00',
  };
}

function emptyNumberPlanPriceRow(): NumberPlanPriceRow {
  return {
    providerCost: '0.00',
    resellerPrice: '0.00',
    agentPrice: '0.00',
    retailPrice: '0.00',
  };
}

function emptyNumberPlan(): NumberPlan {
  return {
    setup: emptyNumberPlanPriceRow(),
    monthly: emptyNumberPlanPriceRow(),
    inbound: emptyNumberPlanPriceRow(),
    outbound: emptyNumberPlanPriceRow(),
    sms: emptyNumberPlanPriceRow(),
    mms: emptyNumberPlanPriceRow(),
    voice: emptyNumberPlanPriceRow(),
  };
}

function parseCountryRateMatrixMap(rawValue?: string): VonageCountryRateMatrixMap {
  if (!rawValue) return {};
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as VonageCountryRateMatrixMap;
  } catch {
    return {};
  }
}

function buildRateMatrixFromSettings(vonageSettings: Record<string, string>, defaults: PricingDefaults): NumberPlan {
  return {
    setup: {
      providerCost: vonageSettings.vonage_standard_setup_provider_cost || '0.00',
      resellerPrice: vonageSettings.vonage_standard_setup_reseller_price || '0.00',
      agentPrice: vonageSettings.vonage_standard_setup_agent_price || '0.00',
      retailPrice: vonageSettings.vonage_standard_setup_retail_price || defaults.setupFee || '0.00',
    },
    monthly: {
      providerCost: vonageSettings.vonage_standard_monthly_provider_cost || '0.00',
      resellerPrice: vonageSettings.vonage_standard_monthly_reseller_price || '0.00',
      agentPrice: vonageSettings.vonage_standard_monthly_agent_price || '0.00',
      retailPrice: vonageSettings.vonage_standard_monthly_retail_price || defaults.monthlyFee || '0.00',
    },
    inbound: {
      providerCost: vonageSettings.vonage_standard_inbound_provider_cost || '0.00',
      resellerPrice: vonageSettings.vonage_standard_inbound_reseller_price || '0.00',
      agentPrice: vonageSettings.vonage_standard_inbound_agent_price || '0.00',
      retailPrice: vonageSettings.vonage_standard_inbound_retail_price || defaults.inboundFee || '0.00',
    },
    outbound: {
      providerCost: vonageSettings.vonage_standard_outbound_provider_cost || '0.00',
      resellerPrice: vonageSettings.vonage_standard_outbound_reseller_price || '0.00',
      agentPrice: vonageSettings.vonage_standard_outbound_agent_price || '0.00',
      retailPrice: vonageSettings.vonage_standard_outbound_retail_price || defaults.outboundFee || '0.00',
    },
    sms: {
      providerCost: vonageSettings.vonage_standard_sms_provider_cost || '0.00',
      resellerPrice: vonageSettings.vonage_standard_sms_reseller_price || '0.00',
      agentPrice: vonageSettings.vonage_standard_sms_agent_price || '0.00',
      retailPrice: vonageSettings.vonage_standard_sms_retail_price || defaults.outboundFee || '0.00',
    },
    mms: {
      providerCost: vonageSettings.vonage_standard_mms_provider_cost || '0.00',
      resellerPrice: vonageSettings.vonage_standard_mms_reseller_price || '0.00',
      agentPrice: vonageSettings.vonage_standard_mms_agent_price || '0.00',
      retailPrice: vonageSettings.vonage_standard_mms_retail_price || '0.00',
    },
    voice: {
      providerCost: vonageSettings.vonage_standard_voice_provider_cost || '0.00',
      resellerPrice: vonageSettings.vonage_standard_voice_reseller_price || '0.00',
      agentPrice: vonageSettings.vonage_standard_voice_agent_price || '0.00',
      retailPrice: vonageSettings.vonage_standard_voice_retail_price || defaults.outboundFee || '0.00',
    },
  };
}

function parseMoney(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function applyBulkPrices(
  rows: Record<string, InventoryRowState>,
  updates: BulkPriceState,
  shouldApply?: (key: string) => boolean,
) {
  const next: Record<string, InventoryRowState> = {};
  for (const [key, row] of Object.entries(rows)) {
    if (shouldApply && !shouldApply(key)) {
      next[key] = row;
      continue;
    }
    next[key] = {
      ...row,
      ...(updates.setupFee.trim() ? { setupFee: updates.setupFee.trim() } : {}),
      ...(updates.monthlyFee.trim() ? { monthlyFee: updates.monthlyFee.trim() } : {}),
      ...(updates.inboundFee.trim() ? { inboundFee: updates.inboundFee.trim() } : {}),
      ...(updates.outboundFee.trim() ? { outboundFee: updates.outboundFee.trim() } : {}),
      ...(updates.smsFee.trim() ? { smsFee: updates.smsFee.trim() } : {}),
      ...(updates.mmsFee.trim() ? { mmsFee: updates.mmsFee.trim() } : {}),
      ...(updates.voiceFee.trim() ? { voiceFee: updates.voiceFee.trim() } : {}),
      customPackagePrices:
        updates.threeMonthsPrice.trim() ||
        updates.sixMonthsPrice.trim() ||
        updates.nineMonthsPrice.trim() ||
        updates.twelveMonthsPrice.trim()
          ? mergeCustomPackagePrices(row.customPackagePrices, {
              ...(updates.threeMonthsPrice.trim() ? { threeMonths: updates.threeMonthsPrice.trim() } : {}),
              ...(updates.sixMonthsPrice.trim() ? { sixMonths: updates.sixMonthsPrice.trim() } : {}),
              ...(updates.nineMonthsPrice.trim() ? { nineMonths: updates.nineMonthsPrice.trim() } : {}),
              ...(updates.twelveMonthsPrice.trim() ? { twelveMonths: updates.twelveMonthsPrice.trim() } : {}),
            })
          : row.customPackagePrices,
    };
  }
  return next;
}

function applyBulkMargins(
  rows: Record<string, InventoryRowState>,
  margins: BulkMarginState,
  shouldApply?: (key: string) => boolean,
) {
  const next: Record<string, InventoryRowState> = {};
  for (const [key, row] of Object.entries(rows)) {
    if (shouldApply && !shouldApply(key)) {
      next[key] = row;
      continue;
    }
    const setupMargin = parseMoney(margins.setupMargin);
    const monthlyMargin = parseMoney(margins.monthlyMargin);
    const inboundMargin = parseMoney(margins.inboundMargin);
    const outboundMargin = parseMoney(margins.outboundMargin);
    const providerSetup = parseMoney(row.providerSetupCost) ?? 0;
    const providerMonthly = parseMoney(row.providerMonthlyCost) ?? 0;
    const providerInbound = parseMoney(row.providerInboundCost) ?? 0;
    const providerOutbound = parseMoney(row.providerOutboundCost) ?? 0;
    const providerSms = parseMoney(row.providerSmsCost) ?? 0;
    const providerMms = parseMoney(row.providerMmsCost) ?? 0;
    const providerVoice = parseMoney(row.providerVoiceCost) ?? 0;
    const smsMargin = parseMoney(margins.smsMargin);
    const mmsMargin = parseMoney(margins.mmsMargin);
    const voiceMargin = parseMoney(margins.voiceMargin);
    const threeMonthsMargin = parseMoney(margins.threeMonthsMargin);
    const sixMonthsMargin = parseMoney(margins.sixMonthsMargin);
    const nineMonthsMargin = parseMoney(margins.nineMonthsMargin);
    const twelveMonthsMargin = parseMoney(margins.twelveMonthsMargin);

    next[key] = {
      ...row,
      ...(setupMargin !== null ? { setupFee: formatMoney(providerSetup * (1 + setupMargin / 100)) } : {}),
      ...(monthlyMargin !== null ? { monthlyFee: formatMoney(providerMonthly * (1 + monthlyMargin / 100)) } : {}),
      ...(inboundMargin !== null ? { inboundFee: formatMoney(providerInbound * (1 + inboundMargin / 100)) } : {}),
      ...(outboundMargin !== null ? { outboundFee: formatMoney(providerOutbound * (1 + outboundMargin / 100)) } : {}),
      ...(smsMargin !== null ? { smsFee: formatMoney(providerSms * (1 + smsMargin / 100)) } : {}),
      ...(mmsMargin !== null ? { mmsFee: formatMoney(providerMms * (1 + mmsMargin / 100)) } : {}),
      ...(voiceMargin !== null ? { voiceFee: formatMoney(providerVoice * (1 + voiceMargin / 100)) } : {}),
      customPackagePrices:
        threeMonthsMargin !== null ||
        sixMonthsMargin !== null ||
        nineMonthsMargin !== null ||
        twelveMonthsMargin !== null
          ? mergeCustomPackagePrices(row.customPackagePrices, {
              ...(threeMonthsMargin !== null ? { threeMonths: formatMoney(providerMonthly * 3 * (1 + threeMonthsMargin / 100)) } : {}),
              ...(sixMonthsMargin !== null ? { sixMonths: formatMoney(providerMonthly * 6 * (1 + sixMonthsMargin / 100)) } : {}),
              ...(nineMonthsMargin !== null ? { nineMonths: formatMoney(providerMonthly * 9 * (1 + nineMonthsMargin / 100)) } : {}),
              ...(twelveMonthsMargin !== null ? { twelveMonths: formatMoney(providerMonthly * 12 * (1 + twelveMonthsMargin / 100)) } : {}),
            })
          : row.customPackagePrices,
    };
  }
  return next;
}

function resolveCountryCode(input: string, countries: CountryOption[], fallback: string) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return fallback;

  const bracketMatch = input.match(/\(([A-Za-z]{2})\)\s*$/);
  if (bracketMatch) {
    return bracketMatch[1].toUpperCase();
  }

  const exactCode = countries.find((country) => country.code.toLowerCase() === normalized);
  if (exactCode) return exactCode.code;

  const exactName = countries.find((country) => country.name.toLowerCase() === normalized);
  if (exactName) return exactName.code;

  const partialMatch = countries.find(
    (country) =>
      country.name.toLowerCase().includes(normalized) ||
      country.code.toLowerCase().includes(normalized),
  );

  return partialMatch?.code || normalized.toUpperCase();
}

function getSearchPatternValue(mode: NumberMatchMode) {
  if (mode === 'starts_with') return 0;
  if (mode === 'ends_with') return 2;
  return 1;
}

function formatUsd(value: string) {
  const amount = Number.parseFloat(value || '0');
  if (!Number.isFinite(amount)) return '$0.00';
  return `$${amount.toFixed(2)}`;
}

function formatAdminDate(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString();
}

function boughtDidStatusClass(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (['active', 'assigned', 'available', 'sent', 'received', 'recorded'].includes(normalized)) {
    return 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100';
  }
  if (['failed', 'suspended', 'released'].includes(normalized)) {
    return 'border-rose-300/25 bg-rose-400/10 text-rose-100';
  }
  return 'border-blue-300/20 bg-blue-400/10 text-blue-100';
}

const darkCommandMenuClass =
  'bg-slate-900 text-slate-100 [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-input-wrapper]]:border-slate-700 [&_[cmdk-input]]:text-slate-100 [&_[cmdk-input]]:placeholder:text-slate-400';
const darkCommandItemClass =
  "text-slate-100 data-[selected='true']:bg-blue-600 data-[selected='true']:text-white data-[selected=true]:bg-blue-600 data-[selected=true]:text-white";

function preferPositiveMoney(primary?: string | null, fallback?: string | null) {
  const primaryValue = parseMoney(primary ?? '');
  if (primaryValue !== null && primaryValue > 0) return primaryValue.toFixed(2);

  const fallbackValue = parseMoney(fallback ?? '');
  if (fallbackValue !== null && fallbackValue > 0) return fallbackValue.toFixed(2);

  if (primaryValue !== null) return primaryValue.toFixed(2);
  if (fallbackValue !== null) return fallbackValue.toFixed(2);
  return '0.00';
}

function getBulkCountryPriceValue(explicitValue: string, providerCost: string, marginPercent: string) {
  if (explicitValue.trim()) return explicitValue.trim();
  const provider = parseMoney(providerCost) ?? 0;
  const margin = parseMoney(marginPercent) ?? 0;
  if (provider <= 0) return '0.00';
  return formatMoney(provider * (1 + margin / 100));
}

function getPackageSellingPrice(pricing: PricingDefaults, isPremium: boolean, packageTerm: '1_month' | '1_year') {
  if (isPremium) {
    return packageTerm === '1_year' ? pricing.premiumYearPackagePrice : pricing.premiumMonthPackagePrice;
  }
  return packageTerm === '1_year' ? pricing.standardYearPackagePrice : pricing.standardMonthPackagePrice;
}

function getPackageLabel(packageTerm: PackageTerm) {
  switch (packageTerm) {
    case '3_months':
      return '3 Months';
    case '6_months':
      return '6 Months';
    case '9_months':
      return '9 Months';
    case '1_year':
      return '1 Year';
    default:
      return '1 Month';
  }
}

function getPackagePriceFromRow(row: InventoryRowState, packageTerm: PackageTerm) {
  const custom = row.customPackagePrices;
  if (!custom) {
    const monthly = parseMoney(row.monthlyFee) ?? 0;
    switch (packageTerm) {
      case '3_months':
        return formatMoney(monthly * 3);
      case '6_months':
        return formatMoney(monthly * 6);
      case '9_months':
        return formatMoney(monthly * 9);
      case '1_year':
        return formatMoney(monthly * 12);
      default:
        return row.monthlyFee;
    }
  }

  switch (packageTerm) {
    case '3_months':
      return custom.threeMonths;
    case '6_months':
      return custom.sixMonths;
    case '9_months':
      return custom.nineMonths;
    case '1_year':
      return custom.twelveMonths;
    default:
      return custom.oneMonth;
  }
}

function getActiveRenewalRetailPrice(
  row: InventoryRowState,
  item: any,
  subscription: Record<string, any>,
  packageTerm: PackageTerm,
  defaultPricingRow?: InventoryRowState,
) {
  const metadata = (item?.metadata as Record<string, any> | undefined) || {};
  const metadataPricing = (metadata.pricing as Record<string, any> | undefined) || {};
  const metadataPackage = (metadata.package as Record<string, any> | undefined) || {};
  const metadataCustomPackagePrices = (metadata.customPackagePrices as Record<string, string> | undefined) || {};
  const metadataMonthlyFee = String(metadataPricing.monthlyFee || item?.monthlyFee || '0.00');

  const metadataPackageValue =
    packageTerm === '3_months'
      ? metadataCustomPackagePrices.threeMonths
      : packageTerm === '6_months'
        ? metadataCustomPackagePrices.sixMonths
        : packageTerm === '9_months'
          ? metadataCustomPackagePrices.nineMonths
          : packageTerm === '1_year'
            ? metadataCustomPackagePrices.twelveMonths
            : metadataCustomPackagePrices.oneMonth;

  const metadataMonthlyDerived =
    packageTerm === '3_months'
      ? formatMoney((parseMoney(metadataMonthlyFee) ?? 0) * 3)
      : packageTerm === '6_months'
        ? formatMoney((parseMoney(metadataMonthlyFee) ?? 0) * 6)
        : packageTerm === '9_months'
          ? formatMoney((parseMoney(metadataMonthlyFee) ?? 0) * 9)
          : packageTerm === '1_year'
            ? formatMoney((parseMoney(metadataMonthlyFee) ?? 0) * 12)
            : metadataMonthlyFee;

  return preferPositiveMoney(
    subscription?.renewalPrice,
    preferPositiveMoney(
      getPackagePriceFromRow(row, packageTerm),
      preferPositiveMoney(
        packageTerm === '1_month' ? subscription?.packagePrice : undefined,
        preferPositiveMoney(
          packageTerm === '1_month' ? metadataPackage.price : undefined,
          preferPositiveMoney(
            metadataPackageValue,
            preferPositiveMoney(
              metadataMonthlyDerived,
              defaultPricingRow ? getPackagePriceFromRow(defaultPricingRow, packageTerm) : undefined,
            ),
          ),
        ),
      ),
    ),
  );
}

function mergeCustomPackagePrices(base: CustomPackagePrices | undefined, updates: Partial<CustomPackagePrices>): CustomPackagePrices {
  return {
    oneMonth: base?.oneMonth || '0.00',
    threeMonths: base?.threeMonths || '0.00',
    sixMonths: base?.sixMonths || '0.00',
    nineMonths: base?.nineMonths || '0.00',
    twelveMonths: base?.twelveMonths || '0.00',
    ...updates,
  };
}

function applyDiscountPercent(amount: string, discountPercent: string | undefined) {
  const value = parseMoney(amount) ?? 0;
  const discount = Math.max(0, parseMoney(discountPercent || '0') ?? 0);
  const next = value - value * (discount / 100);
  return formatMoney(Math.max(0, next));
}

function protectRate(providerCost: string, sellPrice: string, enabled: boolean, marginPercent: number) {
  if (!enabled) return sellPrice;
  const provider = parseMoney(providerCost) ?? 0;
  const sell = parseMoney(sellPrice) ?? 0;
  const protectedMinimum = provider > 0 ? provider * (1 + marginPercent / 100) : 0;
  return formatMoney(Math.max(sell, protectedMinimum));
}

function applyRatesControl(row: InventoryRowState, enabled: boolean, marginPercent: number): InventoryRowState {
  const nextSetup = protectRate(row.providerSetupCost, row.setupFee, enabled, marginPercent);
  const nextMonthly = protectRate(row.providerMonthlyCost, row.monthlyFee, enabled, marginPercent);
  const nextInbound = protectRate(row.providerInboundCost, row.inboundFee, enabled, marginPercent);
  const nextOutbound = protectRate(row.providerOutboundCost, row.outboundFee, enabled, marginPercent);
  const nextSms = protectRate(row.providerSmsCost, row.smsFee, enabled, marginPercent);
  const nextMms = protectRate(row.providerMmsCost, row.mmsFee, enabled, marginPercent);
  const nextVoice = protectRate(row.providerVoiceCost, row.voiceFee, enabled, marginPercent);
  const setupBase = parseMoney(nextSetup) ?? 0;
  const monthlyBase = parseMoney(nextMonthly) ?? 0;

  return {
    ...row,
    setupFee: nextSetup,
    monthlyFee: nextMonthly,
    inboundFee: nextInbound,
    outboundFee: nextOutbound,
    smsFee: nextSms,
    mmsFee: nextMms,
    voiceFee: nextVoice,
    customPackagePrices: mergeCustomPackagePrices(row.customPackagePrices, {
      oneMonth: protectRate(row.providerMonthlyCost, row.customPackagePrices?.oneMonth || row.monthlyFee, enabled, marginPercent),
      threeMonths: formatMoney(Math.max(parseMoney(row.customPackagePrices?.threeMonths || '0') ?? 0, setupBase + monthlyBase * 3)),
      sixMonths: formatMoney(Math.max(parseMoney(row.customPackagePrices?.sixMonths || '0') ?? 0, setupBase + monthlyBase * 6)),
      nineMonths: formatMoney(Math.max(parseMoney(row.customPackagePrices?.nineMonths || '0') ?? 0, setupBase + monthlyBase * 9)),
      twelveMonths: formatMoney(Math.max(parseMoney(row.customPackagePrices?.twelveMonths || '0') ?? 0, setupBase + monthlyBase * 12)),
    }),
  };
}

export default function AdminVirtualNumbers({ section = 'dashboard' }: AdminVirtualNumbersProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const tvn = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>,
  ) => t(`adminPanel.virtualNumbers.${key}`, fallback, params);
  const [location, navigate] = useLocation();
  const pricingMsisdnFromRoute = useMemo(() => {
    if (section !== 'pricing') return null;
    const match = location.match(/\/admin\/virtual-numbers\/pricing\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [location, section]);
  const routeCountryCode = useMemo(() => {
    if (section !== 'country-numbers') return '';
    const match = location.match(/\/admin\/virtual-numbers\/numbers\/([^/?]+)/);
    return match ? decodeURIComponent(match[1]).trim().toUpperCase() : '';
  }, [location, section]);
  const [countryCode, setCountryCode] = useState('US');
  const [countrySearch, setCountrySearch] = useState('');
  const [pattern, setPattern] = useState('');
  const [featureFilter, setFeatureFilter] = useState<NumberFeature>('any');
  const [typeFilter, setTypeFilter] = useState<NumberType>('any');
  const [numberMatchMode, setNumberMatchMode] = useState<NumberMatchMode>('contains');
  const [countryPriceSort, setCountryPriceSort] = useState<DidPriceSortMode>('default');
  const [countryDidFilter, setCountryDidFilter] = useState<DidAvailabilityFilter>('all');
  const [didCountryStatsSearch, setDidCountryStatsSearch] = useState('');
  const [numbersPriceSort, setNumbersPriceSort] = useState<DidPriceSortMode>('default');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchPageMeta, setSearchPageMeta] = useState<SearchPageMeta | null>(null);
  const [selectedSearchMsisdn, setSelectedSearchMsisdn] = useState<string | null>(null);
  const [providerPricing, setProviderPricing] = useState<ProviderPricingData | null>(null);
  const [activeERoamingProvider, setActiveERoamingProvider] = useState<ERoamingProviderName>('vonage');
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [editProviderCredentialsOpen, setEditProviderCredentialsOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ERoamingProviderConfig | null>(null);
  const [newProviderForm, setNewProviderForm] = useState({
    name: '',
    slug: '',
    apiBaseUrl: '',
    apiKey: '',
    apiSecret: '',
    notes: '',
  });
  const [editProviderForm, setEditProviderForm] = useState({
    apiBaseUrl: '',
    apiKey: '',
    apiSecret: '',
    notes: '',
    enabled: true,
  });
  const [newProviderCountryPickerOpen, setNewProviderCountryPickerOpen] = useState(false);
  const [newProviderAllCountries, setNewProviderAllCountries] = useState(true);
  const [newProviderCountryCodes, setNewProviderCountryCodes] = useState<string[]>([]);
  const [didSyncCountryPickerOpen, setDidSyncCountryPickerOpen] = useState(false);
  const [didSyncAllCountries, setDidSyncAllCountries] = useState(true);
  const [didSyncCountryCodes, setDidSyncCountryCodes] = useState<string[]>([]);
  const [didSearchCountryPickerOpen, setDidSearchCountryPickerOpen] = useState(false);
  const [didSearchAllCountries, setDidSearchAllCountries] = useState(false);
  const [didSearchCountryCodes, setDidSearchCountryCodes] = useState<string[]>([]);
  const [selectedFeatureParts, setSelectedFeatureParts] = useState<NumberFeaturePart[]>([]);
  const selectedPricingPanelRef = useRef<HTMLDivElement | null>(null);
  const providerSettingsRef = useRef<HTMLDivElement | null>(null);
  const didSearchPanelRef = useRef<HTMLDivElement | null>(null);
  const [searchRows, setSearchRows] = useState<Record<string, InventoryRowState>>({});
  const [inventoryRows, setInventoryRows] = useState<Record<string, InventoryRowState>>({});
  const [messagesApiForm, setMessagesApiForm] = useState<MessagesApiFormState>({
    price: '0.00',
    notes: '',
  });
  const [packageRates, setPackageRates] = useState<PackageRateState>({
    standardMonthPackagePrice: '0.00',
    standardYearPackagePrice: '0.00',
    premiumMonthPackagePrice: '0.00',
    premiumYearPackagePrice: '0.00',
  });
  const [purchaseDialog, setPurchaseDialog] = useState<PurchaseDialogState>({
    open: false,
    msisdn: null,
    packageTerm: '1_month',
    paymentMethod: 'wallet',
    assignedUserId: '',
    forwardingType: 'none',
    forwardingDestination: '',
  });
  const [selectedBoughtDidId, setSelectedBoughtDidId] = useState<string | null>(null);
  const [boughtDidSearch, setBoughtDidSearch] = useState('');
  const [boughtSendTo, setBoughtSendTo] = useState('');
  const [boughtMessageText, setBoughtMessageText] = useState('');
  const [boughtDialNumber, setBoughtDialNumber] = useState('');
  const [boughtCallType, setBoughtCallType] = useState<'international' | 'sip'>('international');
  const [boughtSpokenMessage, setBoughtSpokenMessage] = useState('');
  const [boughtCallStatus, setBoughtCallStatus] = useState('Ready');
  const [bulkSearchPrices, setBulkSearchPrices] = useState<BulkPriceState>({
    setupFee: '',
    monthlyFee: '',
    inboundFee: '',
    outboundFee: '',
    smsFee: '',
    mmsFee: '',
    voiceFee: '',
    threeMonthsPrice: '',
    sixMonthsPrice: '',
    nineMonthsPrice: '',
    twelveMonthsPrice: '',
  });
  const [bulkInventoryPrices, setBulkInventoryPrices] = useState<BulkPriceState>({
    setupFee: '',
    monthlyFee: '',
    inboundFee: '',
    outboundFee: '',
    smsFee: '',
    mmsFee: '',
    voiceFee: '',
    threeMonthsPrice: '',
    sixMonthsPrice: '',
    nineMonthsPrice: '',
    twelveMonthsPrice: '',
  });
  const [bulkSearchMargins, setBulkSearchMargins] = useState<BulkMarginState>({
    setupMargin: '',
    monthlyMargin: '',
    inboundMargin: '',
    outboundMargin: '',
    smsMargin: '',
    mmsMargin: '',
    voiceMargin: '',
    threeMonthsMargin: '',
    sixMonthsMargin: '',
    nineMonthsMargin: '',
    twelveMonthsMargin: '',
  });
  const [bulkSearchCountry, setBulkSearchCountry] = useState<BulkCountryTarget>('ALL');
  const [bulkInventoryMargins, setBulkInventoryMargins] = useState<BulkMarginState>({
    setupMargin: '',
    monthlyMargin: '',
    inboundMargin: '',
    outboundMargin: '',
    smsMargin: '',
    mmsMargin: '',
    voiceMargin: '',
    threeMonthsMargin: '',
    sixMonthsMargin: '',
    nineMonthsMargin: '',
    twelveMonthsMargin: '',
  });
  const [bulkInventoryCountry, setBulkInventoryCountry] = useState<BulkCountryTarget>('ALL');
  const [bulkCountryRates, setBulkCountryRates] = useState<BulkCountryRateState>({
    setupRetailPrice: '',
    setupResellerPrice: '',
    setupAgentPrice: '',
    monthlyRetailPrice: '',
    monthlyResellerPrice: '',
    monthlyAgentPrice: '',
    marginPercent: '20.00',
  });

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/admin/virtual-numbers/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/admin/virtual-numbers/dashboard', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load virtual number dashboard');
      }
      const json = await response.json();
      return (json?.data ?? json) as DashboardData;
    },
  });

  const { data: vonageSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings', 'vonage'],
  });
  const { data: eRoamingProvidersData } = useQuery<ERoamingProvidersResponse>({
    queryKey: ['/api/admin/virtual-numbers/providers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/virtual-numbers/providers', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load eRoaming providers');
      }
      const json = await response.json();
      return (json?.data ?? json) as ERoamingProvidersResponse;
    },
  });
  const ratesControlEnabled = vonageSettings.vonage_rates_control_enabled !== 'false';
  const ratesControlMarginPercent = parseMoney(vonageSettings.vonage_rates_control_margin_percent || '20') ?? 20;

  const { data: countriesData } = useQuery<{ data?: { destinations?: Array<{ name?: string; countryCode?: string }> } }>({
    queryKey: ['/api/admin/master-countries', 'virtual-number-country-options'],
    queryFn: async () => {
      const response = await fetch('/api/admin/master-countries?type=country', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load countries');
      }
      return response.json();
    },
  });

  const { data: customersResponse } = useQuery<any>({
    queryKey: ['/api/admin/customers', 'virtual-number-assignable'],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '200',
      });
      const response = await fetch(`/api/admin/customers?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load assignable accounts');
      }
      return response.json();
    },
  });

  const countryOptions: CountryOption[] = useMemo(
    () =>
      (countriesData?.data?.destinations || [])
        .map((item) => ({
          name: String(item.name || '').trim(),
          code: String(item.countryCode || '').trim().toUpperCase(),
          label: `${String(item.name || '').trim()} (${String(item.countryCode || '').trim().toUpperCase()})`,
        }))
        .filter((item) => item.name && item.code)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [countriesData?.data?.destinations],
  );
  const countryNameByCode = useMemo(
    () => new Map(countryOptions.map((country) => [country.code, country.name])),
    [countryOptions],
  );
  const didAvailabilityCountryCodes = useMemo(
    () => countryOptions.map((item) => item.code),
    [countryOptions],
  );
  const didAvailabilityCountryKey = useMemo(
    () => didAvailabilityCountryCodes.join(','),
    [didAvailabilityCountryCodes],
  );

  const customersPayload = customersResponse?.data ?? customersResponse;
  const assignableUsers: Array<{ id: string; email?: string | null; fullName?: string | null; role?: string | null }> =
    Array.isArray(customersPayload)
      ? customersPayload
      : customersPayload?.data || [];
  const assignableUserMap = new Map(
    assignableUsers.map((user) => [
      user.id,
      {
        label: `${user.fullName || user.email || user.id} (${user.role || 'customer'})`,
        role: user.role || 'customer',
        email: user.email || '',
        fullName: user.fullName || '',
      },
    ]),
  );

  const selectedCountry =
    countryOptions.find((country) => country.code === countryCode) ||
    countryOptions.find((country) => country.code === data?.defaultCountry) ||
    null;

  const filteredCountryOptions = useMemo(() => countryOptions.filter((country) => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return true;
    return (
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query) ||
      country.label.toLowerCase().includes(query)
    );
  }), [countryOptions, countrySearch]);

  useEffect(() => {
    if (eRoamingProvidersData?.activeProvider) {
      setActiveERoamingProvider(eRoamingProvidersData.activeProvider);
    }
  }, [eRoamingProvidersData?.activeProvider]);

  const didCountryCatalogQuery = useQuery<DidCountryCatalogResponse>({
    queryKey: ['/api/admin/virtual-numbers/countries-summary', featureFilter, typeFilter, numberMatchMode, didAvailabilityCountryKey],
    enabled: (section === 'numbers' || section === 'dashboard') && didAvailabilityCountryCodes.length > 0 && Boolean(data?.hasCredentials),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: () =>
      loadDidCountryCatalogInBatches(didAvailabilityCountryCodes, {
        features: featureFilter,
        type: typeFilter,
        searchPattern: getSearchPatternValue(numberMatchMode),
      }),
  });

  const sortedSearchResults = [...searchResults].sort((a, b) => {
    if (numbersPriceSort === 'default') return 0;
    const aRow = searchRows[a.msisdn] || pricingFromDefaults(data?.settings.pricing || fallbackPricingDefaults(), false);
    const bRow = searchRows[b.msisdn] || pricingFromDefaults(data?.settings.pricing || fallbackPricingDefaults(), false);
    const aPrice = parseMoney(aRow.customPackagePrices?.oneMonth || aRow.monthlyFee) ?? 0;
    const bPrice = parseMoney(bRow.customPackagePrices?.oneMonth || bRow.monthlyFee) ?? 0;

    return numbersPriceSort === 'price_low_high' ? aPrice - bPrice : bPrice - aPrice;
  });
  const countryRateMatrix = useMemo(
    () => parseCountryRateMatrixMap(vonageSettings.vonage_country_rate_matrix),
    [vonageSettings.vonage_country_rate_matrix],
  );
  const defaultRateMatrix = useMemo(
    () => buildRateMatrixFromSettings(vonageSettings, data?.settings.pricing || fallbackPricingDefaults()),
    [data?.settings.pricing, vonageSettings],
  );

  function getCountryRatePlan(countryCodeValue: string) {
    return (
      countryRateMatrix[countryCodeValue.toUpperCase()]?.standardPlan ||
      defaultRateMatrix ||
      emptyNumberPlan()
    );
  }

  const didCountryCatalog = useMemo(() => [...(didCountryCatalogQuery.data?.countries || [])].sort((a, b) => {
    const aPricingPlan = getCountryRatePlan(a.countryCode);
    const bPricingPlan = getCountryRatePlan(b.countryCode);
    const aMonthlyPrice = parseMoney(preferPositiveMoney(aPricingPlan.monthly.retailPrice, a.providerMonthlyCost)) ?? 0;
    const bMonthlyPrice = parseMoney(preferPositiveMoney(bPricingPlan.monthly.retailPrice, b.providerMonthlyCost)) ?? 0;

    if (countryPriceSort === 'price_low_high') {
      if (aMonthlyPrice !== bMonthlyPrice) return aMonthlyPrice - bMonthlyPrice;
      return a.countryCode.localeCompare(b.countryCode);
    }

    if (countryPriceSort === 'price_high_low') {
      if (aMonthlyPrice !== bMonthlyPrice) return bMonthlyPrice - aMonthlyPrice;
      return a.countryCode.localeCompare(b.countryCode);
    }

    if (b.hasAvailable !== a.hasAvailable) return Number(b.hasAvailable) - Number(a.hasAvailable);
    if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount;
    return a.countryCode.localeCompare(b.countryCode);
  }), [countryPriceSort, didCountryCatalogQuery.data?.countries, countryRateMatrix, defaultRateMatrix]);

  const filteredDidCountryCatalog = useMemo(() => didCountryCatalog.filter((item) => {
    const query = didCountryStatsSearch.trim().toLowerCase();
    const countryLabel = countryNameByCode.get(item.countryCode) || item.countryCode;
    if (
      query &&
      !item.countryCode.toLowerCase().includes(query) &&
      !countryLabel.toLowerCase().includes(query)
    ) {
      return false;
    }
    if (countryDidFilter === 'with_did') return !item.error && item.hasAvailable;
    if (countryDidFilter === 'without_did') return !item.error && !item.hasAvailable;
    return true;
  }), [countryDidFilter, countryNameByCode, didCountryCatalog, didCountryStatsSearch]);
  const didCountryTotals = useMemo(() => ({
    totalCountries: didCountryCatalog.length,
    filteredCountries: filteredDidCountryCatalog.length,
    countriesWithDid: filteredDidCountryCatalog.filter((item) => !item.error && item.hasAvailable).length,
    countriesWithoutDid: filteredDidCountryCatalog.filter((item) => !item.error && !item.hasAvailable).length,
    countriesErrored: filteredDidCountryCatalog.filter((item) => item.error).length,
    totalAvailable: filteredDidCountryCatalog.reduce((sum, item) => sum + item.availableCount, 0),
    totalBuyReady: filteredDidCountryCatalog.reduce((sum, item) => sum + item.buyReadyCount, 0),
  }), [didCountryCatalog.length, filteredDidCountryCatalog]);
  const topDidCountries = useMemo(() => [...filteredDidCountryCatalog]
    .filter((item) => !item.error && item.availableCount > 0)
    .sort((a, b) => b.availableCount - a.availableCount)
    .slice(0, 8), [filteredDidCountryCatalog]);
  const didCountryScan = didCountryCatalogQuery.data?.scan;
  const didStatsPartial = Boolean(didCountryScan?.isPartial || didCountryTotals.countriesErrored > 0);
  const didTotalLabel = didStatsPartial
    ? tvn('numbers.stats.loadedDidCount', 'Loaded DID Count')
    : tvn('numbers.stats.availableDidCount', 'Available DID Count');
  const didTotalDescription = didStatsPartial
    ? tvn(
        'numbers.stats.partialTotalDescription',
        "Partial Total From {count} Loaded Countries. Run Sync DID's After The Provider Cools Down For The Full Total.",
        { count: didCountryScan?.successfulCountries ?? didCountryTotals.filteredCountries },
      )
    : tvn('numbers.stats.liveDidAvailability', 'Live DID Availability Returned By The Provider');

  const handleManageCountry = (nextCountryCode: string) => {
    setCountryCode(nextCountryCode);
    setCountrySearch('');
    navigate(`/admin/virtual-numbers/numbers/${encodeURIComponent(nextCountryCode)}`);
  };

  const handleFetchCountryNumbers = (nextCountryCode: string) => {
    setCountryCode(nextCountryCode);
    setCountrySearch('');
    navigate(`/admin/virtual-numbers/numbers/${encodeURIComponent(nextCountryCode)}`);
  };

  const handleEditCountryRates = (nextCountryCode: string) => {
    setCountryCode(nextCountryCode);
    navigate('/admin/virtual-numbers/providers');
  };

  const handleAssignCountry = (nextCountryCode: string) => {
    setCountryCode(nextCountryCode);
    navigate('/admin/virtual-numbers/active');
  };

  useEffect(() => {
    if (section !== 'numbers') return;
    setDidSearchAllCountries(true);
    setDidSearchCountryCodes([]);
  }, [section]);

  useEffect(() => {
    if (section !== 'country-numbers' || !routeCountryCode) return;
    setCountryCode(routeCountryCode);
    setDidSearchAllCountries(false);
    setDidSearchCountryCodes([routeCountryCode]);
  }, [routeCountryCode, section]);

  useEffect(() => {
    if (section !== 'country-numbers' || !routeCountryCode || !data?.enabled) return;
    didSearchPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    searchMutation.mutate({ countryCode: routeCountryCode });
  }, [data?.enabled, routeCountryCode, section]);

  const searchCountryChoices = Array.from(new Set(searchResults.map((item) => item.countryCode))).sort();
  const searchDisplayOffset =
    searchPageMeta && searchPageMeta.loadedCount === searchPageMeta.returnedCount
      ? (searchPageMeta.pageIndex - 1) * searchPageMeta.pageSize
      : 0;
  const inventoryCountryChoices = Array.from(new Set(data?.inventory.map((item) => item.countryCode) || [])).sort();
  const selectedSearchItem = searchResults.find((item) => item.msisdn === selectedSearchMsisdn) || null;
  const selectedSearchRow = selectedSearchItem
    ? searchRows[selectedSearchItem.msisdn] || pricingFromDefaults(data?.settings.pricing || fallbackPricingDefaults(), false)
    : null;
  const pricingDraftStorageKey = pricingMsisdnFromRoute ? `virtual-number-pricing-draft:${pricingMsisdnFromRoute}` : null;
  const pricingPageDraft = pricingMsisdnFromRoute
    ? (() => {
        const routeSearchItem = searchResults.find((item) => item.msisdn === pricingMsisdnFromRoute) || null;
        const routeSearchRow =
          searchRows[pricingMsisdnFromRoute] ||
          (routeSearchItem ? pricingFromDefaults(data?.settings.pricing || fallbackPricingDefaults(), false) : null);

        if (routeSearchItem && routeSearchRow) {
          return { item: routeSearchItem, row: routeSearchRow };
        }

        if (typeof window === 'undefined' || !pricingDraftStorageKey) {
          return null;
        }

        try {
          const raw = window.localStorage.getItem(pricingDraftStorageKey);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (!parsed?.item || !parsed?.row) return null;
          return parsed as { item: SearchResult; row: InventoryRowState };
        } catch {
          return null;
        }
      })()
    : null;
  const purchaseRow = purchaseDialog.msisdn ? searchRows[purchaseDialog.msisdn] || null : null;
  const purchasePrice =
    purchaseRow && data
      ? getPackagePriceFromRow(purchaseRow, purchaseDialog.packageTerm)
      : '0.00';
  const pricingPageItem = pricingPageDraft?.item || null;
  const pricingPageRow =
    pricingMsisdnFromRoute && pricingPageItem
      ? searchRows[pricingMsisdnFromRoute] || pricingPageDraft?.row || null
      : null;

  useEffect(() => {
    if (!selectedSearchMsisdn) return;
    selectedPricingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedSearchMsisdn]);

  useEffect(() => {
    if (section !== 'pricing' || !pricingMsisdnFromRoute || !pricingDraftStorageKey || !pricingPageDraft) return;
    setSearchRows((current) => ({
      ...current,
      [pricingMsisdnFromRoute]: {
        ...pricingPageDraft.row,
      },
    }));
  }, [pricingDraftStorageKey, pricingMsisdnFromRoute, pricingPageDraft, section]);

  useEffect(() => {
    const nextFeatureFilter: NumberFeature =
      selectedFeatureParts.length === 0
        ? 'any'
        : selectedFeatureParts.length === 1
          ? selectedFeatureParts[0]
          : 'SMS,VOICE';
    setFeatureFilter(nextFeatureFilter);
  }, [selectedFeatureParts]);

  const didCatalogCountryCodes = (didCountryCatalogQuery.data?.countries || [])
    .filter((country) => country.hasAvailable)
    .map((country) => country.countryCode);
  const allDidCountryCodes = countryOptions.map((country) => country.code);
  const availableDidCountryCodes = didCatalogCountryCodes.length > 0 ? didCatalogCountryCodes : allDidCountryCodes;
  const resolveDidSearchCountryCodes = () => {
    if (didSearchAllCountries) return allDidCountryCodes;
    if (didSearchCountryCodes.length > 0) return didSearchCountryCodes;
    return [routeCountryCode || countryCode].filter(Boolean);
  };
  const resolveDidSyncCountryCodes = () => {
    if (didSyncAllCountries) return availableDidCountryCodes;
    return didSyncCountryCodes;
  };
  const newProviderCountryLabel = newProviderAllCountries
    ? tvn('common.allDidCountries', 'All DID Countries')
    : newProviderCountryCodes.length > 0
      ? tvn('numbers.common.selectedCount', '{count} selected', { count: newProviderCountryCodes.length })
      : tvn('numbers.common.selectCountries', 'Select Countries');
  const didSearchCountryLabel = didSearchAllCountries
    ? tvn('numbers.common.allCountries', 'All Countries')
    : didSearchCountryCodes.length > 0
      ? didSearchCountryCodes.length === 1
        ? countryOptions.find((country) => country.code === didSearchCountryCodes[0])?.code || didSearchCountryCodes[0]
        : tvn('numbers.common.countriesCount', '{count} Countries', { count: didSearchCountryCodes.length })
      : selectedCountry?.code || tvn('numbers.search.any', 'Any');
  const showDidSearchExperience = section === 'numbers' || section === 'country-numbers';
  const didSearchScopeLabel = section === 'country-numbers'
    ? countryOptions.find((country) => country.code === (routeCountryCode || countryCode))?.name || routeCountryCode || countryCode
    : didSearchCountryLabel;
  const didSyncCountryLabel = didSyncAllCountries
    ? tvn('common.allDidCountries', 'All DID Countries')
    : didSyncCountryCodes.length > 0
      ? tvn('numbers.common.selectedCount', '{count} selected', { count: didSyncCountryCodes.length })
      : tvn('numbers.common.selectCountries', 'Select Countries');
  const featureLabel = selectedFeatureParts.length === 0
    ? tvn('numbers.search.anyFeature', 'Any Feature')
    : selectedFeatureParts.length === 2
      ? tvn('numbers.search.smsVoice', 'SMS & Voice')
      : selectedFeatureParts[0] === 'SMS'
        ? tvn('numbers.search.smsOnly', 'SMS Only')
        : tvn('numbers.search.voiceOnly', 'Voice Only');
  const toggleSearchCountry = (code: string) => {
    setDidSearchAllCountries(false);
    setDidSearchCountryCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code].sort(),
    );
  };
  const toggleSyncCountry = (code: string) => {
    setDidSyncAllCountries(false);
    setDidSyncCountryCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code].sort(),
    );
  };
  const toggleNewProviderCountry = (code: string) => {
    setNewProviderAllCountries(false);
    setNewProviderCountryCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code].sort(),
    );
  };
  const openProviderCredentialsDialog = (provider: ERoamingProviderConfig) => {
    setEditingProvider(provider);
    setEditProviderForm({
      apiBaseUrl: provider.apiBaseUrl || '',
      apiKey: '',
      apiSecret: '',
      notes: provider.notes || '',
      enabled: provider.enabled,
    });
    setEditProviderCredentialsOpen(true);
  };
  const toggleFeaturePart = (feature: NumberFeaturePart) => {
    setSelectedFeatureParts((current) => {
      const next = current.includes(feature)
        ? current.filter((item) => item !== feature)
        : ([...current, feature].sort() as NumberFeaturePart[]);
      return next;
    });
  };

  useEffect(() => {
    if (!data) return;
    setCountryCode((current) => current || data.defaultCountry || 'US');
    setPackageRates({
      standardMonthPackagePrice: data.settings.pricing.standardMonthPackagePrice || '0.00',
      standardYearPackagePrice: data.settings.pricing.standardYearPackagePrice || '0.00',
      premiumMonthPackagePrice: data.settings.pricing.premiumMonthPackagePrice || '0.00',
      premiumYearPackagePrice: data.settings.pricing.premiumYearPackagePrice || '0.00',
    });
    setInventoryRows((current) => {
      const next = { ...current };
      for (const item of data.inventory) {
        if (!next[item.id]) {
          const subscription = (item.metadata?.subscription as Record<string, any> | undefined) || {};
          next[item.id] = {
            isPremium: item.isPremium,
            assignedUserId: item.assignedUserId || null,
            providerSetupCost: item.providerSetupCost,
            providerMonthlyCost: item.providerMonthlyCost,
            providerInboundCost: item.providerInboundCost,
            providerOutboundCost: item.providerOutboundCost,
            providerSmsCost: (item as any).providerSmsCost ?? item.providerOutboundCost,
            providerMmsCost: (item as any).providerMmsCost ?? '0.00',
            providerVoiceCost: (item as any).providerVoiceCost ?? item.providerOutboundCost,
            setupFee: item.setupFee,
            monthlyFee: item.monthlyFee,
            inboundFee: item.inboundFee,
            outboundFee: item.outboundFee,
            smsFee: (item as any).smsFee ?? item.outboundFee,
            mmsFee: (item as any).mmsFee ?? '0.00',
            voiceFee: (item as any).voiceFee ?? item.outboundFee,
            autoRenew: subscription.autoRenew !== undefined ? Boolean(subscription.autoRenew) : true,
            reminderDays: String(subscription.reminderDays ?? 3),
            cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
          };
        }
      }
      return next;
    });
  }, [data]);

  const addProviderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/virtual-numbers/providers', {
        ...newProviderForm,
        countryCodes: newProviderAllCountries ? [] : newProviderCountryCodes,
        allCountries: newProviderAllCountries,
        makeActive: true,
      });
      return response.json();
    },
    onSuccess: async (response: any) => {
      const provider = response?.data || response;
      toast({ title: 'Provider added', description: `${provider.name || 'Provider'} was added to eRoaming.` });
      setAddProviderOpen(false);
      setNewProviderForm({ name: '', slug: '', apiBaseUrl: '', apiKey: '', apiSecret: '', notes: '' });
      setNewProviderAllCountries(true);
      setNewProviderCountryCodes([]);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/providers'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Provider add failed',
        description: error.message || 'Could not add eRoaming provider',
        variant: 'destructive',
      });
    },
  });

  const setActiveProviderMutation = useMutation({
    mutationFn: async (slug: string) => {
      const response = await apiRequest('PATCH', `/api/admin/virtual-numbers/providers/${encodeURIComponent(slug)}`, {
        makeActive: true,
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/providers'] });
    },
  });

  const updateProviderCredentialsMutation = useMutation({
    mutationFn: async () => {
      if (!editingProvider) {
        throw new Error('Choose a provider first');
      }

      const payload: Record<string, any> = {
        apiBaseUrl: editProviderForm.apiBaseUrl.trim(),
        notes: editProviderForm.notes.trim(),
        enabled: editProviderForm.enabled,
      };
      if (editProviderForm.apiKey.trim()) {
        payload.apiKey = editProviderForm.apiKey.trim();
      }
      if (editProviderForm.apiSecret.trim()) {
        payload.apiSecret = editProviderForm.apiSecret.trim();
      }

      const response = await apiRequest('PATCH', `/api/admin/virtual-numbers/providers/${encodeURIComponent(editingProvider.slug)}`, payload);
      return response.json();
    },
    onSuccess: async (response: any) => {
      const provider = response?.data || response;
      toast({
        title: 'Provider API saved',
        description: `${provider.name || editingProvider?.name || 'Provider'} credentials were updated.`,
      });
      setEditProviderCredentialsOpen(false);
      setEditingProvider(null);
      setEditProviderForm({ apiBaseUrl: '', apiKey: '', apiSecret: '', notes: '', enabled: true });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/providers'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Provider API save failed',
        description: error.message || 'Could not save provider API credentials',
        variant: 'destructive',
      });
    },
  });

  const syncProviderDidsMutation = useMutation({
    mutationFn: async (slug: string) => {
      if (slug === 'vonage') {
        const data = await loadDidCountryCatalogInBatches(resolveDidSyncCountryCodes(), {
          features: featureFilter,
          type: typeFilter,
          searchPattern: getSearchPatternValue(numberMatchMode),
          forceRefresh: true,
        });

        return {
          data: {
            provider: 'vonage',
            supported: true,
            allCountries: didSyncAllCountries,
            countryCount: data.countries.length,
            countries: data.countries,
            scan: data.scan,
            syncedAt: new Date().toISOString(),
          },
        };
      }

      const response = await apiRequest('POST', `/api/admin/virtual-numbers/providers/${encodeURIComponent(slug)}/sync-dids`, {
        countryCodes: resolveDidSyncCountryCodes(),
        allCountries: didSyncAllCountries,
        features: featureFilter,
        type: typeFilter,
        searchPattern: getSearchPatternValue(numberMatchMode),
      });
      return response.json();
    },
    onSuccess: async (response: any) => {
      const result = response?.data || response;
      toast({
        title: result.supported ? 'DID sync complete' : 'Provider saved',
        description: result.supported
          ? result.scan?.isPartial
            ? `Synced ${result.scan.successfulCountries || 0} DID countries; ${result.scan.errorCountries || 0} countries need another refresh.`
            : `Synced ${result.countryCount || 0} DID countries.`
          : result.message || 'This provider needs a connector before live DID sync is available.',
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/providers'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/countries-summary'] });
    },
    onError: (error: any) => {
      toast({
        title: 'DID sync failed',
        description: error.message || 'Could not sync DID countries for this provider',
        variant: 'destructive',
      });
    },
  });

  const syncOwnedDidsMutation = useMutation({
    mutationFn: async (slug: string) => {
      const response = await apiRequest('POST', `/api/admin/virtual-numbers/providers/${encodeURIComponent(slug)}/sync-owned-dids`, {});
      return response.json();
    },
    onSuccess: async (response: any) => {
      const result = response?.data || response;
      toast({
        title: tvn('bought.sync.completeTitle', 'Bought DID sync complete'),
        description: tvn(
          'bought.sync.completeDescription',
          "Imported {imported}, updated {updated}, linked {linked} owned Vonage DID's.",
          {
            imported: result.importedCount || 0,
            updated: result.updatedCount || 0,
            linked: result.linkedAssignedCount || 0,
          },
        ),
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/providers'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/countries-summary'] });
    },
    onError: (error: any) => {
      toast({
        title: tvn('bought.sync.failedTitle', 'Bought DID sync failed'),
        description: error.message || tvn('bought.sync.failedDescription', 'Could not sync your owned Vonage DID inventory'),
        variant: 'destructive',
      });
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (override?: { countryCode?: string; countryCodes?: string[]; pageIndex?: number; append?: boolean }) => {
      const requestedCountryCodes = Array.from(new Set(
        (override?.countryCodes?.length
          ? override.countryCodes
          : override?.countryCode
            ? [override.countryCode]
            : resolveDidSearchCountryCodes()
        ).map((code) => code.toUpperCase()).filter(Boolean),
      ));
      const countryCodesToSearch = requestedCountryCodes.length > 0 ? requestedCountryCodes : [countryCode.toUpperCase()];
      const pageIndex = Math.max(1, Number(override?.pageIndex || 1));
      const pageSize = 100;
      const combinedResults: SearchResult[] = [];
      const pageSummaries: Array<{
        pageIndex: number;
        pageSize: number;
        returnedCount: number;
        totalCount: number;
        totalPages: number;
        hasPreviousPage: boolean;
        hasNextPage: boolean;
        searchPattern: string;
      }> = [];
      let pricingDefaults: PricingDefaults | null = null;
      let providerPricing: ProviderPricingData | null = null;

      for (const resolvedCountryCode of countryCodesToSearch) {
        const params = new URLSearchParams({
          countryCode: resolvedCountryCode,
          pattern: pattern.trim(),
          features: featureFilter,
          type: typeFilter,
          searchPattern: String(getSearchPatternValue(numberMatchMode)),
          pageIndex: String(pageIndex),
          pageSize: String(pageSize),
        });
        const response = await fetch(`/api/admin/virtual-numbers/search?${params.toString()}`, {
          credentials: 'include',
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(cleanApiErrorMessage(text, `Failed to search numbers for ${resolvedCountryCode}`));
        }
        const json = await response.json();
        const data = json.data as {
          pricingDefaults: PricingDefaults;
          providerPricing: ProviderPricingData;
          page?: {
            pageIndex: number;
            pageSize: number;
            returnedCount: number;
            totalCount: number;
            totalPages: number;
            hasPreviousPage: boolean;
            hasNextPage: boolean;
            searchPattern: string;
          };
          results: SearchResult[];
        };
        pricingDefaults ||= data.pricingDefaults;
        providerPricing ||= data.providerPricing;
        combinedResults.push(...(data.results || []));
        if (data.page) pageSummaries.push(data.page);
      }

      const totalCount = pageSummaries.reduce((sum, page) => sum + (Number(page.totalCount) || 0), 0);
      const returnedCount = pageSummaries.reduce((sum, page) => sum + (Number(page.returnedCount) || 0), 0);
      const totalPages = pageSummaries.reduce((max, page) => Math.max(max, Number(page.totalPages) || 1), 1);

      return {
        pricingDefaults: pricingDefaults || data?.settings.pricing || fallbackPricingDefaults(),
        providerPricing: providerPricing || {
          smsApiPricing: [],
          voiceApiPricing: [],
          messagesApiPricing: [],
          smsApiNote: '',
          voiceApiNote: '',
          messagesApiNote: '',
        },
        results: combinedResults,
        countryCodes: countryCodesToSearch,
        page: {
          pageIndex,
          pageSize,
          returnedCount,
          loadedCount: combinedResults.length,
          totalCount,
          totalPages,
          hasPreviousPage: pageSummaries.some((page) => page.hasPreviousPage),
          hasNextPage: pageSummaries.some((page) => page.hasNextPage),
          countryCodes: countryCodesToSearch,
          isMultiCountry: countryCodesToSearch.length > 1,
          searchPattern: pattern.trim(),
        } as SearchPageMeta,
      };
    },
    onSuccess: (result, variables) => {
      const resolvedCountryCode = (variables?.countryCode || result.countryCodes?.[0] || countryCode).toUpperCase();
      setCountryCode(resolvedCountryCode);
      let nextResults = result.results || [];
      if (variables?.append) {
        const seen = new Set(searchResults.map((item) => item.msisdn));
        nextResults = [
          ...searchResults,
          ...(result.results || []).filter((item) => {
            if (seen.has(item.msisdn)) return false;
            seen.add(item.msisdn);
            return true;
          }),
        ];
      }
      setSearchResults(nextResults);
      setSearchPageMeta({
        ...result.page,
        loadedCount: nextResults.length,
      });
      setProviderPricing(result.providerPricing || null);
      setMessagesApiForm({
        price: result.providerPricing?.messagesApiPricing?.[0]?.price || '0.00',
        notes: result.providerPricing?.messagesApiNote || '',
      });
      const pricing = result.pricingDefaults || data?.settings.pricing || fallbackPricingDefaults();
      const smsOutboundCost = result.providerPricing?.smsApiPricing?.[0]?.price || '0.00';
      const voiceOutboundCost = result.providerPricing?.voiceApiPricing?.[0]?.price || '0.00';
      const messagesApiCost = result.providerPricing?.messagesApiPricing?.[0]?.price || '0.00';
      const next: Record<string, InventoryRowState> = {};
      for (const item of result.results || []) {
        next[item.msisdn] = {
          ...pricingFromDefaults(pricing, false),
          providerSetupCost: item.setupCost || '0.00',
          providerMonthlyCost: item.monthlyCost || '0.00',
          providerInboundCost: '0.00',
          providerOutboundCost: smsOutboundCost,
          providerSmsCost: smsOutboundCost,
          providerMmsCost: messagesApiCost,
          providerVoiceCost: voiceOutboundCost,
          smsFee: pricing.outboundFee,
          mmsFee: messagesApiCost,
          voiceFee: pricing.outboundFee,
        };
      }
      setSearchRows((current) => (variables?.append ? { ...current, ...next } : next));
      setSelectedSearchMsisdn((current) =>
        current && nextResults.some((item) => item.msisdn === current)
          ? current
          : nextResults[0]?.msisdn || null,
      );
    },
    onError: (error: any) => {
      toast({
        title: 'Search failed',
        description: error.message || 'Could not load available numbers',
        variant: 'destructive',
      });
    },
  });

  const saveMessagesApiMutation = useMutation({
    mutationFn: async (payload: MessagesApiFormState) => {
      await Promise.all([
        apiRequest('PUT', '/api/admin/settings/vonage_messages_api_price', {
          value: payload.price,
          category: 'vonage',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_messages_api_notes', {
          value: payload.notes,
          category: 'vonage',
        }),
      ]);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/dashboard'] });
      toast({
        title: 'Messages API pricing saved',
        description: 'Your manual Messages API provider cost baseline was updated.',
      });
      if (data?.enabled && data?.hasCredentials) {
        searchMutation.mutate();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Could not save Messages API pricing',
        variant: 'destructive',
      });
    },
  });

  const savePackageRatesMutation = useMutation({
    mutationFn: async (payload: PackageRateState) => {
      await Promise.all([
        apiRequest('PUT', '/api/admin/settings/vonage_standard_month_package_price', {
          value: payload.standardMonthPackagePrice,
          category: 'vonage',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_standard_year_package_price', {
          value: payload.standardYearPackagePrice,
          category: 'vonage',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_premium_month_package_price', {
          value: payload.premiumMonthPackagePrice,
          category: 'vonage',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_premium_year_package_price', {
          value: payload.premiumYearPackagePrice,
          category: 'vonage',
        }),
      ]);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/dashboard'] });
      toast({
        title: tvn('costPrice.packageRates.savedTitle', 'Package rates saved'),
        description: tvn('costPrice.packageRates.savedDescription', 'One-month and one-year virtual number package prices were updated.'),
      });
    },
    onError: (error: any) => {
      toast({
        title: tvn('costPrice.packageRates.saveFailedTitle', 'Save failed'),
        description: error.message || tvn('costPrice.packageRates.saveFailedDescription', 'Could not save package rates'),
        variant: 'destructive',
      });
    },
  });

  const applyDefaultRatesMutation = useMutation({
    mutationFn: async (row: InventoryRowState) => {
      const protectedRow = applyRatesControl(row, ratesControlEnabled, ratesControlMarginPercent);
      const entries: Array<[string, string]> = row.isPremium
        ? [
            ['vonage_premium_setup_fee', protectedRow.setupFee],
            ['vonage_premium_monthly_fee', protectedRow.monthlyFee],
            ['vonage_premium_inbound_fee', protectedRow.inboundFee],
            ['vonage_premium_outbound_fee', protectedRow.outboundFee],
            ['vonage_premium_month_package_price', protectedRow.customPackagePrices?.oneMonth || '0.00'],
            ['vonage_premium_three_month_package_price', protectedRow.customPackagePrices?.threeMonths || '0.00'],
            ['vonage_premium_six_month_package_price', protectedRow.customPackagePrices?.sixMonths || '0.00'],
            ['vonage_premium_nine_month_package_price', protectedRow.customPackagePrices?.nineMonths || '0.00'],
            ['vonage_premium_year_package_price', protectedRow.customPackagePrices?.twelveMonths || '0.00'],
          ]
        : [
            ['vonage_setup_fee', protectedRow.setupFee],
            ['vonage_monthly_fee', protectedRow.monthlyFee],
            ['vonage_inbound_fee', protectedRow.inboundFee],
            ['vonage_outbound_fee', protectedRow.outboundFee],
            ['vonage_standard_month_package_price', protectedRow.customPackagePrices?.oneMonth || '0.00'],
            ['vonage_standard_three_month_package_price', protectedRow.customPackagePrices?.threeMonths || '0.00'],
            ['vonage_standard_six_month_package_price', protectedRow.customPackagePrices?.sixMonths || '0.00'],
            ['vonage_standard_nine_month_package_price', protectedRow.customPackagePrices?.nineMonths || '0.00'],
            ['vonage_standard_year_package_price', protectedRow.customPackagePrices?.twelveMonths || '0.00'],
          ];

      entries.push(['vonage_rates_control_enabled', String(ratesControlEnabled)]);
      entries.push(['vonage_rates_control_margin_percent', formatMoney(ratesControlMarginPercent)]);

      await Promise.all(
        entries.map(([key, value]) =>
          apiRequest('PUT', `/api/admin/settings/${key}`, {
            value,
            category: 'vonage',
          }),
        ),
      );

      return protectedRow;
    },
    onSuccess: async (protectedRow) => {
      if (pricingPageItem) {
        setSearchRows((current) => ({
          ...current,
          [pricingPageItem.msisdn]: protectedRow,
        }));
        syncPricingDraft(pricingPageItem.msisdn, protectedRow);
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/settings', 'vonage'] });
      toast({
        title: 'Default rates updated',
        description: 'These prices are now the global default for all destinations of this number type, with rate protection saved too.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Default rate save failed',
        description: error.message || 'Could not apply these rates as the global default',
        variant: 'destructive',
      });
    },
  });

  const bulkCountryRatesMutation = useMutation({
    mutationFn: async () => {
      const nextCountryRateMatrix = { ...countryRateMatrix };

      didCountryCatalog.forEach((item) => {
        const code = item.countryCode.toUpperCase();
        const currentMatrix = nextCountryRateMatrix[code] || {
          providerCurrency: vonageSettings.vonage_provider_currency || 'USD',
          standardPlan: getCountryRatePlan(code),
          premiumPlan: emptyNumberPlan(),
          messagesApiPrice: '',
          messagesApiNotes: '',
        };

        const currentStandardPlan = currentMatrix.standardPlan || emptyNumberPlan();

        nextCountryRateMatrix[code] = {
          ...currentMatrix,
          standardPlan: {
            ...currentStandardPlan,
            setup: {
              ...currentStandardPlan.setup,
              retailPrice: getBulkCountryPriceValue(
                bulkCountryRates.setupRetailPrice,
                currentStandardPlan.setup.providerCost || item.providerSetupCost,
                bulkCountryRates.marginPercent,
              ),
              resellerPrice: getBulkCountryPriceValue(
                bulkCountryRates.setupResellerPrice,
                currentStandardPlan.setup.providerCost || item.providerSetupCost,
                bulkCountryRates.marginPercent,
              ),
              agentPrice: getBulkCountryPriceValue(
                bulkCountryRates.setupAgentPrice,
                currentStandardPlan.setup.providerCost || item.providerSetupCost,
                bulkCountryRates.marginPercent,
              ),
            },
            monthly: {
              ...currentStandardPlan.monthly,
              retailPrice: getBulkCountryPriceValue(
                bulkCountryRates.monthlyRetailPrice,
                currentStandardPlan.monthly.providerCost || item.providerMonthlyCost,
                bulkCountryRates.marginPercent,
              ),
              resellerPrice: getBulkCountryPriceValue(
                bulkCountryRates.monthlyResellerPrice,
                currentStandardPlan.monthly.providerCost || item.providerMonthlyCost,
                bulkCountryRates.marginPercent,
              ),
              agentPrice: getBulkCountryPriceValue(
                bulkCountryRates.monthlyAgentPrice,
                currentStandardPlan.monthly.providerCost || item.providerMonthlyCost,
                bulkCountryRates.marginPercent,
              ),
            },
          },
        };
      });

      await apiRequest('PUT', '/api/admin/settings/vonage_country_rate_matrix', {
        value: JSON.stringify(nextCountryRateMatrix),
        category: 'integrations',
      });

      return nextCountryRateMatrix;
    },
    onSuccess: async (nextCountryRateMatrix) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/settings', 'vonage'] });
      toast({
        title: 'Bulk country rates saved',
        description: 'Retail, reseller, agent, and margin pricing were applied to all listed countries.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk country save failed',
        description: error.message || 'Could not save country pricing rates',
        variant: 'destructive',
      });
    },
  });

  const buyMutation = useMutation({
    mutationFn: async ({
      msisdn,
      row,
      purchase,
    }: {
      msisdn: string;
      row: InventoryRowState;
      purchase: PurchaseDialogState;
    }) => {
      const sourceItem =
        searchResults.find((item) => item.msisdn === msisdn) ||
        pricingPageDraft?.item ||
        null;
      const response = await apiRequest('POST', '/api/admin/virtual-numbers/buy', {
        countryCode: (sourceItem?.countryCode || countryCode).toUpperCase(),
        msisdn,
        isPremium: row.isPremium,
        providerSetupCost: row.providerSetupCost,
        providerMonthlyCost: row.providerMonthlyCost,
        providerInboundCost: row.providerInboundCost,
        providerOutboundCost: row.providerOutboundCost,
        providerSmsCost: row.providerSmsCost,
        providerMmsCost: row.providerMmsCost,
        providerVoiceCost: row.providerVoiceCost,
        setupFee: row.setupFee,
        monthlyFee: row.monthlyFee,
        inboundFee: row.inboundFee,
        outboundFee: row.outboundFee,
        smsFee: row.smsFee,
        mmsFee: row.mmsFee,
        voiceFee: row.voiceFee,
        customPackagePrices: row.customPackagePrices || null,
        resellerDiscountPercent: row.resellerDiscountPercent || '0.00',
        agentDiscountPercent: row.agentDiscountPercent || '0.00',
        packageTerm: purchase.packageTerm,
        paymentMethod: purchase.paymentMethod,
        assignedUserId: purchase.assignedUserId || null,
        forwardingType: purchase.forwardingType,
        forwardingDestination: purchase.forwardingDestination || null,
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/dashboard'] });
      setPurchaseDialog({
        open: false,
        msisdn: null,
        packageTerm: '1_month',
        paymentMethod: 'wallet',
        assignedUserId: '',
        forwardingType: 'none',
        forwardingDestination: '',
      });
      toast({
        title: 'Number purchased',
        description: 'The number package was purchased and added to your virtual number inventory.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Purchase failed',
        description: error.message || 'Could not buy the selected number',
        variant: 'destructive',
      });
    },
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, row }: { id: string; row: InventoryRowState & { status?: string } }) => {
      const response = await apiRequest('PATCH', `/api/admin/virtual-numbers/inventory/${id}`, row);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/inventory-workspace'] });
      toast({
        title: 'Inventory updated',
        description: 'Provider cost and selling prices were saved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Could not update the inventory number',
        variant: 'destructive',
      });
    },
  });

  const bulkUpdateInventoryMutation = useMutation({
    mutationFn: async () => {
      const updates = data.inventory.map((item) => ({
        id: item.id,
        row: inventoryRows[item.id] || {
          isPremium: item.isPremium,
          assignedUserId: item.assignedUserId || null,
          providerSetupCost: item.providerSetupCost,
          providerMonthlyCost: item.providerMonthlyCost,
          providerInboundCost: item.providerInboundCost,
          providerOutboundCost: item.providerOutboundCost,
          providerSmsCost: (item as any).providerSmsCost ?? item.providerOutboundCost,
          providerMmsCost: (item as any).providerMmsCost ?? '0.00',
          providerVoiceCost: (item as any).providerVoiceCost ?? item.providerOutboundCost,
          setupFee: item.setupFee,
          monthlyFee: item.monthlyFee,
          inboundFee: item.inboundFee,
          outboundFee: item.outboundFee,
          smsFee: (item as any).smsFee ?? item.outboundFee,
          mmsFee: (item as any).mmsFee ?? '0.00',
          voiceFee: (item as any).voiceFee ?? item.outboundFee,
          autoRenew: Boolean((item.metadata as any)?.subscription?.autoRenew ?? true),
          reminderDays: String((item.metadata as any)?.subscription?.reminderDays ?? 3),
          cancelAtPeriodEnd: Boolean((item.metadata as any)?.subscription?.cancelAtPeriodEnd),
        },
      }));

      await Promise.all(
        updates.map(({ id, row }) => apiRequest('PATCH', `/api/admin/virtual-numbers/inventory/${id}`, row)),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/dashboard'] });
      toast({
        title: 'Inventory saved',
        description: 'All visible inventory pricing rows were updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk save failed',
        description: error.message || 'Could not save all inventory rows',
        variant: 'destructive',
      });
    },
  });

  const setSearchRow = (msisdn: string, patch: Partial<InventoryRowState>) => {
    setSearchRows((current) => {
      const nextRow = {
        ...(current[msisdn] || pricingFromDefaults(data?.settings.pricing || fallbackPricingDefaults())),
        ...patch,
      };
      syncPricingDraft(msisdn, nextRow);
      return {
        ...current,
        [msisdn]: nextRow,
      };
    });
  };

  const saveDedicatedPricingDraft = () => {
    if (!pricingPageItem || !pricingPageRow) return;
    const protectedRow = applyRatesControl(pricingPageRow, ratesControlEnabled, ratesControlMarginPercent);
    setSearchRows((current) => ({
      ...current,
      [pricingPageItem.msisdn]: protectedRow,
    }));
    syncPricingDraft(pricingPageItem.msisdn, protectedRow);
    toast({
      title: 'Pricing draft saved',
      description: ratesControlEnabled
        ? `This pricing draft was saved with rate protection at ${ratesControlMarginPercent}% margin.`
        : 'This number pricing draft was saved and will stay available until you buy the number or edit it again.',
    });
  };

  const openDedicatedPricingPage = (item: SearchResult) => {
    const row = searchRows[item.msisdn] || pricingFromDefaults(data?.settings.pricing || fallbackPricingDefaults(), false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        `virtual-number-pricing-draft:${item.msisdn}`,
        JSON.stringify({
          item,
          row,
        }),
      );
    }
    navigate(`/admin/virtual-numbers/pricing/${encodeURIComponent(item.msisdn)}`);
  };

  const syncPricingDraft = (msisdn: string, nextRow: InventoryRowState) => {
    if (typeof window === 'undefined') return;
    const existingItem =
      searchResults.find((item) => item.msisdn === msisdn) ||
      pricingPageDraft?.item ||
      null;
    if (!existingItem) return;
    window.localStorage.setItem(
      `virtual-number-pricing-draft:${msisdn}`,
      JSON.stringify({
        item: existingItem,
        row: nextRow,
      }),
    );
  };

  const setInventoryRow = (id: string, patch: Partial<InventoryRowState>) => {
    setInventoryRows((current) => ({
      ...current,
      [id]: {
        ...(current[id] || {
          isPremium: false,
          assignedUserId: null,
          providerSetupCost: '0.00',
          providerMonthlyCost: '0.00',
          providerInboundCost: '0.00',
          providerOutboundCost: '0.00',
          providerSmsCost: '0.00',
          providerMmsCost: '0.00',
          providerVoiceCost: '0.00',
          setupFee: '0.00',
          monthlyFee: '0.00',
          inboundFee: '0.00',
          outboundFee: '0.00',
          smsFee: '0.00',
          mmsFee: '0.00',
          voiceFee: '0.00',
          autoRenew: true,
          reminderDays: '3',
          cancelAtPeriodEnd: false,
        }),
        ...patch,
      },
    }));
  };

  const searchBulkMatcher = (key: string) =>
    bulkSearchCountry === 'ALL' || searchResults.find((item) => item.msisdn === key)?.countryCode === bulkSearchCountry;

  const inventoryBulkMatcher = (key: string) =>
    bulkInventoryCountry === 'ALL' || data.inventory.find((item) => item.id === key)?.countryCode === bulkInventoryCountry;

  const markAllSearchRowsPremium = (isPremium: boolean) => {
    setSearchRows((current) => {
      const next: Record<string, InventoryRowState> = {};
      for (const [key, row] of Object.entries(current)) {
        if (!searchBulkMatcher(key)) {
          next[key] = row;
          continue;
        }
        next[key] = {
          ...row,
          ...pricingFromDefaults(data?.settings.pricing || fallbackPricingDefaults(), isPremium),
          isPremium,
          providerSetupCost: row.providerSetupCost,
          providerMonthlyCost: row.providerMonthlyCost,
          providerInboundCost: row.providerInboundCost,
          providerOutboundCost: row.providerOutboundCost,
          providerSmsCost: row.providerSmsCost,
          providerMmsCost: row.providerMmsCost,
          providerVoiceCost: row.providerVoiceCost,
          mmsFee: row.mmsFee,
          smsFee: row.smsFee,
          voiceFee: row.voiceFee,
          autoRenew: row.autoRenew,
          reminderDays: row.reminderDays,
          cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        };
      }
      return next;
    });
  };

  const markAllInventoryRowsPremium = (isPremium: boolean) => {
    setInventoryRows((current) => {
      const next: Record<string, InventoryRowState> = {};
      for (const [key, row] of Object.entries(current)) {
        if (!inventoryBulkMatcher(key)) {
          next[key] = row;
          continue;
        }
        next[key] = {
          ...row,
          ...pricingFromDefaults(data?.settings.pricing || fallbackPricingDefaults(), isPremium),
          isPremium,
          providerSetupCost: row.providerSetupCost,
          providerMonthlyCost: row.providerMonthlyCost,
          providerInboundCost: row.providerInboundCost,
          providerOutboundCost: row.providerOutboundCost,
          providerSmsCost: row.providerSmsCost,
          providerMmsCost: row.providerMmsCost,
          providerVoiceCost: row.providerVoiceCost,
          mmsFee: row.mmsFee,
          smsFee: row.smsFee,
          voiceFee: row.voiceFee,
          autoRenew: row.autoRenew,
          reminderDays: row.reminderDays,
          cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        };
      }
      return next;
    });
  };

  const inventoryItems = data?.inventory || [];
  const pendingApplications = (data?.applications || []).filter((item) =>
    ['pending', 'pending_payment', 'manual_review'].includes(String(item.status || '').toLowerCase()),
  );
  const activeInventory = inventoryItems.filter((item) =>
    ['assigned', 'active'].includes(String(item.status || '').toLowerCase()) || Boolean(item.assignedUserId),
  );
  const boughtInventory = inventoryItems.filter((item) => {
    const metadata = (item.metadata || {}) as Record<string, any>;
    return (
      String(metadata.boughtFrom || '').toLowerCase() === 'vonage' ||
      String(metadata.syncSource || '').toLowerCase() === 'vonage_account_numbers' ||
      Boolean(metadata.syncedFromVonageAccount)
    );
  });
  const boughtAssignedCount = boughtInventory.filter((item) => Boolean(item.assignedUserId) || ['assigned', 'active'].includes(String(item.status || '').toLowerCase())).length;
  const boughtAvailableCount = boughtInventory.filter((item) => String(item.status || '').toLowerCase() === 'available').length;
  const boughtPremiumCount = boughtInventory.filter((item) => item.isPremium).length;
  const boughtInventoryIds = boughtInventory.map((item) => item.id).join(',');
  const selectedBoughtDid = selectedBoughtDidId
    ? boughtInventory.find((item) => item.id === selectedBoughtDidId) || null
    : null;
  const visibleBoughtInventory = boughtInventory
    .filter((item) => {
      const query = boughtDidSearch.trim().toLowerCase();
      if (!query) return true;
      const assignedAccount = item.assignedUserId ? assignableUserMap.get(item.assignedUserId) : null;
      return (
        item.msisdn.toLowerCase().includes(query) ||
        item.countryCode.toLowerCase().includes(query) ||
        String(item.status || '').toLowerCase().includes(query) ||
        String(assignedAccount?.label || '').toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const aAvailable = String(a.status || '').toLowerCase() === 'available' ? 0 : 1;
      const bAvailable = String(b.status || '').toLowerCase() === 'available' ? 0 : 1;
      if (aAvailable !== bAvailable) return aAvailable - bAvailable;
      return a.msisdn.localeCompare(b.msisdn);
    });

  useEffect(() => {
    if (section !== 'bought-dids') return;
    if (!boughtInventory.length) {
      if (selectedBoughtDidId) setSelectedBoughtDidId(null);
      return;
    }
    if (!selectedBoughtDidId || !boughtInventory.some((item) => item.id === selectedBoughtDidId)) {
      setSelectedBoughtDidId(boughtInventory[0].id);
    }
  }, [section, boughtInventoryIds, selectedBoughtDidId, boughtInventory]);

  const boughtDidWorkspaceQuery = useQuery<AdminBoughtDidWorkspace>({
    queryKey: ['/api/admin/virtual-numbers/inventory-workspace', selectedBoughtDidId],
    enabled: section === 'bought-dids' && Boolean(selectedBoughtDidId),
    queryFn: async () => {
      const response = await fetch(`/api/admin/virtual-numbers/inventory/${encodeURIComponent(selectedBoughtDidId || '')}/workspace`, {
        credentials: 'include',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || "Could not load Bought DID's workspace");
      }
      return json.data as AdminBoughtDidWorkspace;
    },
  });
  const boughtDidWorkspace = boughtDidWorkspaceQuery.data;
  const boughtSelectedNumber = boughtDidWorkspace?.selectedNumber || null;
  const boughtInboundMessages = boughtDidWorkspace?.receivingMessages || [];
  const boughtOutboundMessages = boughtDidWorkspace?.sendingMessages || [];
  const boughtVoiceCalls = boughtDidWorkspace?.voiceCalls || [];
  const boughtVoicemails = boughtDidWorkspace?.voicemails || [];
  const selectedBoughtDidIsActive = Boolean(
    selectedBoughtDid?.assignedUserId &&
    boughtSelectedNumber &&
    String(boughtSelectedNumber.status || '').toLowerCase() === 'active',
  );
  const boughtDidStatusLabel = (status?: string | null) => {
    const normalized = String(status || 'available').toLowerCase().replace(/_/g, ' ');
    if (normalized === 'available') return tvn('bought.status.available', 'Available');
    if (normalized === 'assigned') return tvn('bought.status.assigned', 'Assigned');
    if (normalized === 'active') return tvn('bought.status.active', 'Active');
    if (normalized === 'pending') return tvn('bought.status.pending', 'Pending');
    if (normalized === 'unavailable') return tvn('bought.status.unavailable', 'Unavailable');
    return normalized;
  };
  const boughtCallStatusLabel = (status: string) => {
    if (status === 'Ready') return tvn('bought.workspace.ready', 'Ready');
    if (status === 'Voice Session Created') return tvn('bought.calls.voiceSessionCreated', 'Voice Session Created');
    if (status === 'Call Failed') return tvn('bought.calls.callFailed', 'Call Failed');
    return status;
  };
  const logsDirectionLabel = (direction?: string | null) => {
    const normalized = String(direction || '').toLowerCase();
    if (normalized === 'outbound') return tvn('logs.messages.outbound', 'Outbound');
    if (normalized === 'inbound') return tvn('logs.messages.inbound', 'Inbound');
    return direction || '';
  };
  const logsStatusLabel = (status?: string | null) => {
    const normalized = String(status || '').toLowerCase().replace(/_/g, ' ');
    if (normalized === 'sent') return tvn('logs.status.sent', 'Sent');
    if (normalized === 'received') return tvn('logs.status.received', 'Received');
    if (normalized === 'delivered') return tvn('logs.status.delivered', 'Delivered');
    if (normalized === 'failed') return tvn('logs.status.failed', 'Failed');
    if (normalized === 'pending') return tvn('logs.status.pending', 'Pending');
    return normalized || tvn('logs.status.unknown', 'Unknown');
  };
  const logsUsageTypeLabel = (usageType?: string | null) => {
    const normalized = String(usageType || '').toLowerCase().replace(/_/g, ' ');
    if (normalized === 'sms') return 'SMS';
    if (normalized === 'voice') return tvn('logs.usage.voice', 'Voice');
    if (normalized === 'renewal') return tvn('logs.usage.renewal', 'Renewal');
    if (normalized === 'auto renewal') return tvn('logs.usage.autoRenewal', 'Auto renewal');
    return normalized || tvn('logs.status.unknown', 'Unknown');
  };
  const applicationStatusLabel = (status?: string | null) => {
    const normalized = String(status || '').toLowerCase().replace(/_/g, ' ');
    if (normalized === 'pending') return tvn('applications.status.pending', 'Pending');
    if (normalized === 'approved') return tvn('applications.status.approved', 'Approved');
    if (normalized === 'assigned') return tvn('applications.status.assigned', 'Assigned');
    if (normalized === 'active') return tvn('applications.status.active', 'Active');
    if (normalized === 'completed') return tvn('applications.status.completed', 'Completed');
    if (normalized === 'rejected') return tvn('applications.status.rejected', 'Rejected');
    if (normalized === 'cancelled' || normalized === 'canceled') return tvn('applications.status.cancelled', 'Cancelled');
    if (normalized === 'failed') return tvn('applications.status.failed', 'Failed');
    return normalized || tvn('logs.status.unknown', 'Unknown');
  };
  const accountRoleLabel = (role?: string | null) => {
    const normalized = String(role || 'customer').toLowerCase();
    if (normalized === 'customer') return tvn('roles.customer', 'customer');
    if (normalized === 'agent') return tvn('roles.agent', 'agent');
    if (normalized === 'reseller') return tvn('roles.reseller', 'reseller');
    if (normalized === 'admin') return tvn('roles.admin', 'admin');
    return role || tvn('roles.customer', 'customer');
  };
  const activePackageLabel = (packageTerm: PackageTerm) => {
    switch (packageTerm) {
      case '3_months':
        return tvn('active.packageTerms.threeMonths', '3 Months');
      case '6_months':
        return tvn('active.packageTerms.sixMonths', '6 Months');
      case '9_months':
        return tvn('active.packageTerms.nineMonths', '9 Months');
      case '1_year':
        return tvn('active.packageTerms.oneYear', '1 Year');
      default:
        return tvn('active.packageTerms.oneMonth', '1 Month');
    }
  };
  const activeRenewalStatusLabel = (status?: string | null) => {
    const normalized = String(status || '').toLowerCase().replace(/_/g, ' ');
    if (normalized === 'active') return tvn('active.renewalStatus.active', 'active');
    if (normalized === 'manual') return tvn('active.renewalStatus.manual', 'manual');
    if (normalized === 'cancel pending expiry') return tvn('active.renewalStatus.cancelPendingExpiry', 'cancel pending expiry');
    return normalized || tvn('logs.status.unknown', 'Unknown');
  };

  useEffect(() => {
    if (section !== 'bought-dids' || !selectedBoughtDid) return;
    setBoughtDialNumber('');
    setBoughtCallStatus('Ready');
    setBoughtCallType('international');
    setBoughtSpokenMessage(tvn('bought.calls.defaultSpokenMessage', 'Hello, this is a call from {number}', { number: selectedBoughtDid.msisdn }));
  }, [section, selectedBoughtDid?.id]);
  const selectedBoughtRow = selectedBoughtDid
    ? inventoryRows[selectedBoughtDid.id] || {
        isPremium: selectedBoughtDid.isPremium,
        assignedUserId: selectedBoughtDid.assignedUserId || null,
        providerSetupCost: selectedBoughtDid.providerSetupCost,
        providerMonthlyCost: selectedBoughtDid.providerMonthlyCost,
        providerInboundCost: selectedBoughtDid.providerInboundCost,
        providerOutboundCost: selectedBoughtDid.providerOutboundCost,
        providerSmsCost: (selectedBoughtDid as any).providerSmsCost ?? selectedBoughtDid.providerOutboundCost,
        providerMmsCost: (selectedBoughtDid as any).providerMmsCost ?? '0.00',
        providerVoiceCost: (selectedBoughtDid as any).providerVoiceCost ?? selectedBoughtDid.providerOutboundCost,
        setupFee: selectedBoughtDid.setupFee,
        monthlyFee: selectedBoughtDid.monthlyFee,
        inboundFee: selectedBoughtDid.inboundFee,
        outboundFee: selectedBoughtDid.outboundFee,
        smsFee: (selectedBoughtDid as any).smsFee ?? selectedBoughtDid.outboundFee,
        mmsFee: (selectedBoughtDid as any).mmsFee ?? '0.00',
        voiceFee: (selectedBoughtDid as any).voiceFee ?? selectedBoughtDid.outboundFee,
        autoRenew: Boolean((selectedBoughtDid.metadata as any)?.subscription?.autoRenew ?? true),
        reminderDays: String((selectedBoughtDid.metadata as any)?.subscription?.reminderDays ?? 3),
        cancelAtPeriodEnd: Boolean((selectedBoughtDid.metadata as any)?.subscription?.cancelAtPeriodEnd),
      }
    : null;

  const sendBoughtDidSmsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBoughtDid) throw new Error(tvn('bought.workspace.selectDidFirst', 'Select a DID first'));
      const response = await apiRequest('POST', `/api/admin/virtual-numbers/inventory/${selectedBoughtDid.id}/messages/send`, {
        to: boughtSendTo,
        text: boughtMessageText,
      });
      const json = await response.json();
      return json.data ?? json;
    },
    onSuccess: async () => {
      setBoughtMessageText('');
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/inventory-workspace', selectedBoughtDidId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/dashboard'] });
      toast({
        title: tvn('bought.sms.sentTitle', 'SMS sent'),
        description: tvn('bought.sms.sentDescription', 'The SMS was sent from the selected bought DID.'),
      });
    },
    onError: (error: any) => {
      toast({
        title: tvn('bought.sms.failedTitle', 'SMS failed'),
        description: error.message || tvn('bought.sms.failedDescription', 'Could not send SMS from this DID'),
        variant: 'destructive',
      });
    },
  });

  const reviewSenderIdMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject') => {
      if (!selectedBoughtDid) throw new Error(tvn('bought.workspace.selectDidFirst', 'Select a DID first'));
      const requestedSenderId = boughtSelectedNumber?.senderId?.requested || '';
      const response = await apiRequest('PATCH', `/api/admin/virtual-numbers/inventory/${selectedBoughtDid.id}/sender-id`, {
        action,
        senderId: action === 'approve' ? requestedSenderId : undefined,
        rejectionReason: action === 'reject' ? 'Rejected by admin' : undefined,
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Could not review Sender ID');
      return json.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/inventory-workspace', selectedBoughtDidId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/dashboard'] });
      toast({
        title: 'Sender ID Updated',
        description: 'The Sender ID review was saved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Sender ID Failed',
        description: error.message || 'Could not review Sender ID',
        variant: 'destructive',
      });
    },
  });

  const startBoughtDidCallMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBoughtDid) throw new Error(tvn('bought.workspace.selectDidFirst', 'Select a DID first'));
      const response = await apiRequest('POST', `/api/admin/virtual-numbers/inventory/${selectedBoughtDid.id}/voice/session`, {
        to: boughtDialNumber,
        callType: boughtCallType,
        spokenMessage: boughtSpokenMessage,
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || tvn('bought.calls.createSessionFailed', 'Could not create the voice session'));
      return json.data;
    },
    onSuccess: async () => {
      setBoughtCallStatus('Voice Session Created');
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/inventory-workspace', selectedBoughtDidId] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/dashboard'] });
      toast({
        title: tvn('bought.calls.voiceSessionReady', 'Voice session ready'),
        description: tvn('bought.calls.voiceSessionStarted', 'Started a voice session from {number}.', { number: selectedBoughtDid?.msisdn || '' }),
      });
    },
    onError: (error: any) => {
      setBoughtCallStatus('Call Failed');
      toast({
        title: tvn('bought.calls.failedTitle', 'Call failed'),
        description: error.message || tvn('bought.calls.failedDescription', 'Could not start this call'),
        variant: 'destructive',
      });
    },
  });
  const realActiveNumbers = data?.activeNumbers || [];
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item] as const));
  const inventoryByMsisdn = new Map(
    inventoryItems.map((item) => [String(item.msisdn || '').trim(), item] as const).filter(([msisdn]) => msisdn),
  );
  const activeDisplayItems = [
    ...activeInventory,
    ...realActiveNumbers
      .map((activeNumber) => {
        const metadata = (activeNumber.metadata as Record<string, any> | undefined) || {};
        const linkedInventory =
          (metadata.inventoryId ? inventoryById.get(metadata.inventoryId) : null) ||
          inventoryItems.find((item) => item.assignedVirtualNumberId === activeNumber.id) ||
          inventoryByMsisdn.get(String(activeNumber.msisdn || '').trim()) ||
          null;

        if (linkedInventory) {
          return {
            ...linkedInventory,
            assignedUserId: linkedInventory.assignedUserId || activeNumber.userId,
            assignedVirtualNumberId: linkedInventory.assignedVirtualNumberId || activeNumber.id,
            status: linkedInventory.status || activeNumber.status,
            metadata: {
              ...((linkedInventory.metadata as Record<string, any> | undefined) || {}),
              ...metadata,
              subscription:
                metadata.subscription ||
                (linkedInventory.metadata as Record<string, any> | undefined)?.subscription ||
                null,
              routing:
                metadata.routing ||
                (linkedInventory.metadata as Record<string, any> | undefined)?.routing ||
                null,
            },
          };
        }

        const pricing = (metadata.pricing as Record<string, any> | undefined) || {};
        return {
          id: `live-${activeNumber.id}`,
          provider: activeNumber.provider || 'vonage',
          msisdn: activeNumber.msisdn,
          countryCode: activeNumber.countryCode,
          status: activeNumber.status || 'active',
          isPremium: Boolean(metadata.isPremium),
          providerSetupCost: '0.00',
          providerMonthlyCost: '0.00',
          providerInboundCost: '0.00',
          providerOutboundCost: '0.00',
          providerSmsCost: '0.00',
          providerMmsCost: '0.00',
          providerVoiceCost: '0.00',
          setupFee: String(pricing.setupFee || '0.00'),
          monthlyFee: String(pricing.monthlyFee || '0.00'),
          inboundFee: String(pricing.inboundFee || '0.00'),
          outboundFee: String(pricing.outboundFee || '0.00'),
          smsFee: String(pricing.smsFee || pricing.outboundFee || '0.00'),
          mmsFee: String(pricing.mmsFee || '0.00'),
          voiceFee: String(pricing.voiceFee || pricing.outboundFee || '0.00'),
          assignedUserId: activeNumber.userId || null,
          assignedVirtualNumberId: activeNumber.id,
          metadata,
        };
      })
      .filter(
        (item, index, items) =>
          item &&
          items.findIndex(
            (candidate) =>
              candidate.id === item.id ||
              String(candidate.msisdn || '').trim() === String(item.msisdn || '').trim(),
          ) === index,
      ),
  ];
  const availableInventory = inventoryItems.filter((item) => item.status === 'available');
  const totalSetupRevenue = inventoryItems.reduce((sum, item) => sum + (parseMoney(item.setupFee) || 0), 0);
  const totalSetupCost = inventoryItems.reduce((sum, item) => sum + (parseMoney(item.providerSetupCost) || 0), 0);
  const estimatedMonthlyRevenue = inventoryItems.reduce((sum, item) => sum + (parseMoney(item.monthlyFee) || 0), 0);
  const estimatedMonthlyCost = inventoryItems.reduce((sum, item) => sum + (parseMoney(item.providerMonthlyCost) || 0), 0);
  const activeMonthlyRevenue = activeInventory.reduce((sum, item) => sum + (parseMoney(item.monthlyFee) || 0), 0);
  const activeMonthlyCost = activeInventory.reduce((sum, item) => sum + (parseMoney(item.providerMonthlyCost) || 0), 0);
  const totalProjectedProfit = estimatedMonthlyRevenue - estimatedMonthlyCost;
  const activeProjectedProfit = activeMonthlyRevenue - activeMonthlyCost;
  const summary = data?.summary || {
    totalInventory: 0,
    availableInventory: 0,
    assignedInventory: 0,
    activeNumbers: 0,
    premiumInventory: 0,
    pendingApplications: 0,
  };
  const usageSummary = data?.usageSummary || {
    totalCustomerCharges: '0.00',
    totalEstimatedVonageCost: '0.00',
    totalEstimatedProfit: '0.00',
    smsCount: 0,
    voiceSessionCount: 0,
    renewalCount: 0,
    outboundSmsCount: 0,
    inboundSmsCount: 0,
    outboundVoiceCount: 0,
    inboundVoiceCount: 0,
    totalSmsCustomerCharges: '0.00',
    totalSmsProviderCost: '0.00',
    totalVoiceCustomerCharges: '0.00',
    totalVoiceProviderCost: '0.00',
    totalRenewalCustomerCharges: '0.00',
    totalRenewalProviderCost: '0.00',
  };
  const usageTransactions = data?.usageTransactions || [];
  const usageMessages = data?.usageMessages || [];
  const countryTotals = inventoryItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.countryCode] = (acc[item.countryCode] || 0) + 1;
    return acc;
  }, {});
  const topCountries = Object.entries(countryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const dashboardActivityLogs = [
    ...inventoryItems.map((item) => ({
      id: `inventory-${item.id}`,
      type: 'purchase',
      title: `Number ${item.msisdn} added to inventory`,
      createdAt: item.createdAt,
    })),
    ...(data?.applications || []).map((item) => ({
      id: `application-${item.id}`,
      type: 'request',
      title: `Request from user ${item.userId}`,
      createdAt: item.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
  const dashboardCards = [
    {
      title: tvn('dashboard.cards.totalRevenue.title', 'Total Revenue'),
      value: formatUsd(String(totalSetupRevenue + estimatedMonthlyRevenue)),
      subtitle: tvn('dashboard.cards.totalRevenue.subtitle', '{count} numbers in inventory', { count: inventoryItems.length }),
      accent: 'text-cyan-300',
      bg: 'from-slate-900 via-slate-900 to-blue-950/70',
      ring: 'from-cyan-500/25 to-blue-500/20',
      iconBg: 'from-cyan-500 to-blue-500',
      icon: DollarSign,
      badge: totalProjectedProfit > 0
        ? tvn('dashboard.cards.totalRevenue.badge', '{amount} projected', { amount: formatUsd(String(totalProjectedProfit)) })
        : null,
      badgeClass: 'bg-emerald-500/20 text-emerald-300',
    },
    {
      title: tvn('dashboard.cards.totalCost.title', 'Total Cost'),
      value: formatUsd(String(totalSetupCost + estimatedMonthlyCost)),
      subtitle: tvn('dashboard.cards.totalCost.subtitle', 'Cost to provider'),
      accent: 'text-rose-300',
      bg: 'from-slate-900 via-slate-900 to-rose-950/70',
      ring: 'from-rose-500/25 to-orange-500/20',
      iconBg: 'from-rose-500 to-red-500',
      icon: BarChart3,
      badge: totalProjectedProfit > 0
        ? tvn('dashboard.cards.totalCost.badge', '{amount} profit', { amount: formatUsd(String(totalProjectedProfit)) })
        : null,
      badgeClass: 'bg-emerald-500/20 text-emerald-300',
    },
    {
      title: tvn('dashboard.cards.activeNumbers.title', 'Active Numbers'),
      value: String(realActiveNumbers.length),
      subtitle: tvn('dashboard.cards.activeNumbers.subtitle', '{count} linked inventory rows', { count: activeInventory.length }),
      accent: 'text-cyan-300',
      bg: 'from-slate-900 via-slate-900 to-emerald-950/70',
      ring: 'from-emerald-500/25 to-cyan-500/20',
      iconBg: 'from-emerald-500 to-teal-500',
      icon: Phone,
      badge: topCountries[0]
        ? tvn('dashboard.cards.activeNumbers.badge', '{country} top country', { country: topCountries[0][0] })
        : null,
      badgeClass: 'bg-cyan-500/20 text-cyan-300',
    },
    {
      title: tvn('dashboard.cards.pendingOrders.title', 'Pending Orders'),
      value: String(pendingApplications.length),
      subtitle: tvn('dashboard.cards.pendingOrders.subtitle', 'Manual processing queue'),
      accent: 'text-emerald-300',
      bg: 'from-slate-900 via-slate-900 to-emerald-950/60',
      ring: 'from-emerald-500/25 to-lime-500/20',
      iconBg: 'from-emerald-500 to-lime-500',
      icon: ShoppingCart,
      badge: data?.autoAssign
        ? tvn('dashboard.cards.pendingOrders.autoAssignOn', 'Auto assign on')
        : tvn('dashboard.cards.pendingOrders.manualAssign', 'Manual assign'),
      badgeClass: data?.autoAssign ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300',
    },
    {
      title: tvn('dashboard.cards.assignedUsers.title', 'Assigned Users'),
      value: String(new Set(activeInventory.map((item) => item.assignedUserId).filter(Boolean)).size),
      subtitle: tvn('dashboard.cards.assignedUsers.subtitle', '{count} assignable accounts', { count: assignableUsers.length }),
      accent: 'text-fuchsia-300',
      bg: 'from-slate-900 via-slate-900 to-fuchsia-950/60',
      ring: 'from-fuchsia-500/25 to-pink-500/20',
      iconBg: 'from-fuchsia-500 to-pink-500',
      icon: Users,
      badge: tvn('dashboard.cards.assignedUsers.badge', '{count} assigned rows', { count: summary.assignedInventory }),
      badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300',
    },
    {
      title: tvn('dashboard.cards.availableStock.title', 'Available Stock'),
      value: String(availableInventory.length),
      subtitle: tvn('dashboard.cards.availableStock.subtitle', '{count} premium numbers', { count: summary.premiumInventory }),
      accent: 'text-amber-300',
      bg: 'from-slate-900 via-slate-900 to-amber-950/60',
      ring: 'from-amber-500/25 to-orange-500/20',
      iconBg: 'from-amber-500 to-orange-500',
      icon: Package,
      badge: availableInventory.length
        ? tvn('dashboard.cards.availableStock.badge', '{count} ready to sell', { count: availableInventory.length })
        : null,
      badgeClass: 'bg-rose-500/20 text-rose-200',
    },
    {
      title: tvn('dashboard.cards.logsTickets.title', 'Logs & Tickets'),
      value: String(dashboardActivityLogs.length),
      subtitle: tvn('dashboard.cards.logsTickets.subtitle', 'Recent number activity'),
      accent: 'text-orange-300',
      bg: 'from-slate-900 via-slate-900 to-orange-950/60',
      ring: 'from-orange-500/25 to-amber-500/20',
      iconBg: 'from-orange-500 to-amber-500',
      icon: Ticket,
      badge: dashboardActivityLogs.length
        ? tvn('dashboard.cards.logsTickets.badge', '{count} tracked events', { count: dashboardActivityLogs.length })
        : null,
      badgeClass: 'bg-orange-500/20 text-orange-200',
    },
    {
      title: tvn('dashboard.cards.usageCharges.title', 'Usage Charges'),
      value: formatUsd(usageSummary.totalCustomerCharges),
      subtitle: tvn('dashboard.cards.usageCharges.subtitle', 'Customer wallet charges'),
      accent: 'text-blue-300',
      bg: 'from-slate-900 via-slate-900 to-blue-950/70',
      ring: 'from-blue-500/25 to-cyan-500/20',
      iconBg: 'from-blue-500 to-cyan-500',
      icon: Wallet,
      badge: tvn('dashboard.cards.usageCharges.badge', '{count} transactions', { count: usageTransactions.length }),
      badgeClass: 'bg-blue-500/20 text-blue-200',
    },
    {
      title: tvn('dashboard.cards.vonageUsageCost.title', 'Vonage Usage Cost'),
      value: formatUsd(usageSummary.totalEstimatedVonageCost),
      subtitle: tvn('dashboard.cards.vonageUsageCost.subtitle', 'Estimated provider charge'),
      accent: 'text-rose-300',
      bg: 'from-slate-900 via-slate-900 to-rose-950/60',
      ring: 'from-rose-500/25 to-red-500/20',
      iconBg: 'from-rose-500 to-red-500',
      icon: Server,
      badge: tvn('dashboard.cards.vonageUsageCost.badge', '{sms} SMS / {voice} voice', {
        sms: usageSummary.smsCount,
        voice: usageSummary.voiceSessionCount,
      }),
      badgeClass: 'bg-rose-500/20 text-rose-200',
    },
    {
      title: tvn('dashboard.cards.usageProfit.title', 'Usage Profit'),
      value: formatUsd(usageSummary.totalEstimatedProfit),
      subtitle: tvn('dashboard.cards.usageProfit.subtitle', 'Customer charge minus Vonage cost'),
      accent: 'text-emerald-300',
      bg: 'from-slate-900 via-slate-900 to-emerald-950/60',
      ring: 'from-emerald-500/25 to-cyan-500/20',
      iconBg: 'from-emerald-500 to-teal-500',
      icon: BarChart3,
      badge: tvn('dashboard.cards.usageProfit.badge', '{count} renewals', { count: usageSummary.renewalCount }),
      badgeClass: 'bg-emerald-500/20 text-emerald-200',
    },
  ];
  const activityLogs = [
    ...inventoryItems.map((item) => ({
      id: `inventory-${item.id}`,
      type: 'purchase',
      title: `Number ${item.msisdn} added to inventory`,
      subtitle: `${item.countryCode} • ${item.isPremium ? 'Premium' : 'Standard'} • ${item.status}`,
      amount: item.setupFee,
      createdAt: item.createdAt,
    })),
    ...(data?.applications || []).map((item) => ({
      id: `application-${item.id}`,
      type: 'request',
      title: `Request from user ${item.userId}`,
      subtitle: `${item.countryCode}${item.desiredNumber ? ` • Preferred ${item.desiredNumber}` : ''} • ${item.status}`,
      amount: '',
      createdAt: item.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  const sectionTitleMap: Record<AdminVirtualNumbersSection, string> = {
    dashboard: tvn('sections.dashboard.title', 'eRoaming Dashboard'),
    providers: tvn('sections.providers.title', 'eRoaming Providers'),
    numbers: tvn('sections.numbers.title', 'DID Numbers'),
    'bought-dids': tvn('sections.boughtDids.title', "Bought DID's"),
    'country-numbers': tvn('sections.countryNumbers.title', 'Country DID Numbers'),
    pricing: tvn('sections.pricing.title', 'eRoaming Price Editor'),
    'cost-price': tvn('sections.costPrice.title', 'eRoaming Cost & Price'),
    logs: tvn('sections.logs.title', 'eRoaming Logs & Purchase'),
    pending: tvn('sections.pending.title', 'Pending eRoaming Orders'),
    active: tvn('sections.active.title', "Active eRoaming's"),
  };

  const sectionDescriptionMap: Record<AdminVirtualNumbersSection, string> = {
    dashboard: tvn('sections.dashboard.description', 'Full statistics and performance for inventory, profit, pending orders, and active assignments.'),
    providers: tvn('sections.providers.description', 'Switch provider, configure API access, and manage the main cost and pricing baselines from one page.'),
    numbers: tvn('sections.numbers.description', 'Browse All Countries With DID Availability, See Live Vonage Counts, And Jump Into Management Actions Country By Country.'),
    'bought-dids': tvn('sections.boughtDids.description', "See DID Numbers Already Bought From Vonage Or Synced From Your Vonage Account."),
    'country-numbers': tvn('sections.countryNumbers.description', 'Fetch and manage the real DID numbers available for one selected country before assigning or pricing them.'),
    pricing: tvn('sections.pricing.description', 'Set the Vonage cost, package subscriptions, and custom duration prices for one specific number.'),
    'cost-price': tvn('sections.costPrice.description', 'Review provider cost versus selling prices across standard, premium, and owned inventory.'),
    logs: tvn('sections.logs.description', 'Track purchases, requests, and recent virtual number activity in one place.'),
    pending: tvn('sections.pending.description', 'Review requests that still need manual processing or payment follow-up.'),
    active: tvn('sections.active.description', 'See all active or assigned numbers and inspect who each number belongs to.'),
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">Virtual number dashboard could not be loaded.</div>;
  }

  const ownedPremiumCount = data.inventory.filter((item) => item.isPremium).length;
  const ownedAssignedCount = data.inventory.filter((item) => Boolean(item.assignedUserId)).length;
  const ownedSetupRevenue = data.inventory.reduce((sum, item) => sum + parseMoney(item.setupFee), 0);
  const ownedMonthlyRevenue = data.inventory.reduce((sum, item) => sum + parseMoney(item.monthlyFee), 0);
  const ownedProviderMonthlyCost = data.inventory.reduce((sum, item) => sum + parseMoney(item.providerMonthlyCost), 0);
  const standardPackageMonth = parseMoney(packageRates.standardMonthPackagePrice || '0');
  const standardPackageYear = parseMoney(packageRates.standardYearPackagePrice || '0');
  const premiumPackageMonth = parseMoney(packageRates.premiumMonthPackagePrice || '0');
  const premiumPackageYear = parseMoney(packageRates.premiumYearPackagePrice || '0');
  const smsApiPricingRows = Array.isArray(providerPricing?.smsApiPricing) ? providerPricing.smsApiPricing : [];
  const voiceApiPricingRows = Array.isArray(providerPricing?.voiceApiPricing) ? providerPricing.voiceApiPricing : [];
  const messagesApiPricingRows = Array.isArray(providerPricing?.messagesApiPricing) ? providerPricing.messagesApiPricing : [];
  const providerEnabled = data.enabled;
  const providerHealthy = data.enabled && data.hasCredentials;
  const providerHealthLabel = !providerEnabled
    ? tvn('common.disabled', 'Disabled')
    : providerHealthy
      ? tvn('providers.status.healthy', 'Healthy')
      : tvn('providers.status.credentialsMissing', 'Credentials Missing');
  const providerHealthClass = !providerEnabled
    ? 'border-muted-foreground/30 text-muted-foreground'
    : providerHealthy
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300';
  const ProviderHealthIcon = !providerEnabled ? Ban : providerHealthy ? Check : Clock;
  const providerCostSnapshot = {
    standardSetup: vonageSettings.vonage_standard_setup_provider_cost || '0.00',
    standardMonthly: vonageSettings.vonage_standard_monthly_provider_cost || '0.00',
    standardSms: vonageSettings.vonage_standard_sms_provider_cost || '0.00',
    standardVoice: vonageSettings.vonage_standard_voice_provider_cost || '0.00',
    premiumSetup: vonageSettings.vonage_premium_setup_provider_cost || '0.00',
    premiumMonthly: vonageSettings.vonage_premium_monthly_provider_cost || '0.00',
    providerCurrency: vonageSettings.vonage_provider_currency || data.accountBalance?.currency || 'USD',
  };
  const eRoamingProviders = eRoamingProvidersData?.providers?.length
    ? eRoamingProvidersData.providers
    : [{
        id: 'vonage',
        slug: 'vonage',
        name: 'Vonage',
        apiKeyConfigured: data.hasCredentials,
        apiSecretConfigured: data.hasCredentials,
        enabled: data.enabled,
        supportsLiveSync: true,
        countryCodes: [],
        allCountries: true,
        notes: tvn('providers.notes.vonageLong', 'Vonage API key, live DID lookup, provider costs, SMS/voice pricing, inventory ordering, and selling plans.'),
      }];
  const selectedERoamingProvider =
    eRoamingProviders.find((provider) => provider.slug === activeERoamingProvider) || eRoamingProviders[0];
  const selectedProviderEnabled = selectedERoamingProvider?.enabled ?? providerEnabled;
  const selectedProviderConnected = Boolean(
    selectedERoamingProvider?.apiKeyConfigured && selectedERoamingProvider?.apiSecretConfigured,
  );
  const selectedProviderCountries = selectedERoamingProvider?.allCountries
    ? tvn('common.allDidCountries', 'All DID Countries')
    : selectedERoamingProvider?.countryCodes?.length
      ? selectedERoamingProvider.countryCodes.join(', ')
      : tvn('common.noCountriesSelected', 'No countries selected');
  const selectedProviderBalance =
    selectedERoamingProvider?.slug === 'vonage'
      ? data.accountBalance
      : selectedERoamingProvider?.accountBalance || null;
  const selectedProviderBalanceError =
    selectedERoamingProvider?.slug === 'vonage'
      ? data.accountBalanceError
      : selectedERoamingProvider?.accountBalanceError || null;
  const selectedProviderBalanceLabel = selectedProviderBalance
    ? `${selectedProviderBalance.value} ${selectedProviderBalance.currency}`
    : '--';
  const selectedProviderName = selectedERoamingProvider?.name || tvn('common.provider', 'Provider');
  const selectedProviderBalanceTitle = tvn('providers.balanceTitle', '{provider} Balance', {
    provider: selectedProviderName,
  });
  const selectedProviderBalanceSubtitle = selectedProviderBalance
    ? selectedERoamingProvider?.slug === 'vonage'
      ? data.accountBalance?.autoReload
        ? tvn('providers.balance.autoReloadEnabled', 'Auto Reload Enabled On Provider Account')
        : tvn('providers.balance.autoReloadDisabled', 'Auto Reload Disabled On Provider Account')
      : tvn('providers.balance.liveProviderBalance', 'Live {provider} Balance', { provider: selectedProviderName })
    : selectedProviderBalanceError || tvn('providers.balance.notAvailable', 'Balance Not Available Yet');
  const providerNoteText = (notes: string | undefined | null, fallbackKey: string, fallback: string) => {
    const normalizedNotes = (notes || '').trim();
    if (!normalizedNotes) return tvn(fallbackKey, fallback);
    if (normalizedNotes === 'Built-in live DID connector for Vonage.') {
      return tvn('providers.notes.vonageBuiltIn', normalizedNotes);
    }
    if (normalizedNotes === 'Vonage API key, live DID lookup, provider costs, SMS/voice pricing, inventory ordering, and selling plans.') {
      return tvn('providers.notes.vonageLong', normalizedNotes);
    }
    return normalizedNotes;
  };
  const newProviderCredentialLabels = getProviderCredentialLabels(newProviderForm);
  const editProviderCredentialLabels = getProviderCredentialLabels(editingProvider);
  const selectedProviderCredentialLabels = getProviderCredentialLabels(selectedERoamingProvider);
  const addProviderDialog = (
    <Dialog open={addProviderOpen} onOpenChange={setAddProviderOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add eRoaming Provider</DialogTitle>
          <DialogDescription>
            Add Twilio, DIDWW, or another DID provider, then choose the countries this provider can cover.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-eroaming-provider-name">Provider Name</Label>
            <Input
              id="new-eroaming-provider-name"
              value={newProviderForm.name}
              onChange={(event) => setNewProviderForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Twilio, DIDWW, Telnyx..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-eroaming-provider-slug">Provider Slug</Label>
            <Input
              id="new-eroaming-provider-slug"
              value={newProviderForm.slug}
              onChange={(event) => setNewProviderForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="auto from name"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-eroaming-provider-api-url">API Base URL</Label>
            <Input
              id="new-eroaming-provider-api-url"
              value={newProviderForm.apiBaseUrl}
              onChange={(event) => setNewProviderForm((current) => ({ ...current, apiBaseUrl: event.target.value }))}
              placeholder="https://api.provider.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-eroaming-provider-api-key">{newProviderCredentialLabels.primaryLabel}</Label>
            <Input
              id="new-eroaming-provider-api-key"
              value={newProviderForm.apiKey}
              onChange={(event) => setNewProviderForm((current) => ({ ...current, apiKey: event.target.value }))}
              placeholder={newProviderCredentialLabels.primaryNewPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-eroaming-provider-api-secret">{newProviderCredentialLabels.secondaryLabel}</Label>
            <Input
              id="new-eroaming-provider-api-secret"
              type="password"
              value={newProviderForm.apiSecret}
              onChange={(event) => setNewProviderForm((current) => ({ ...current, apiSecret: event.target.value }))}
              placeholder={newProviderCredentialLabels.secondaryNewPlaceholder}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-eroaming-provider-notes">Notes</Label>
            <Input
              id="new-eroaming-provider-notes"
              value={newProviderForm.notes}
              onChange={(event) => setNewProviderForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Provider API access, DID sync, and pricing notes"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>DID Country Coverage</Label>
                <p className="text-xs text-muted-foreground">Use all DID countries or choose specific countries for this provider.</p>
              </div>
              <Switch
                checked={newProviderAllCountries}
                onCheckedChange={(checked) => {
                  setNewProviderAllCountries(checked);
                  if (checked) setNewProviderCountryCodes([]);
                }}
              />
            </div>
            {!newProviderAllCountries && (
              <Popover open={newProviderCountryPickerOpen} onOpenChange={setNewProviderCountryPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between">
                    <span className="truncate">{newProviderCountryLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="start">
                  <Command shouldFilter={false} className={darkCommandMenuClass}>
                    <CommandInput placeholder="Search countries" value={countrySearch} onValueChange={setCountrySearch} />
                    <CommandList>
                      <CommandEmpty>No Country Found.</CommandEmpty>
                      <CommandGroup heading="Countries">
                        {filteredCountryOptions.map((country) => (
                          <CommandItem className={darkCommandItemClass} key={`new-provider-${country.code}`} value={country.label} onSelect={() => toggleNewProviderCountry(country.code)}>
                            <Check className={`h-4 w-4 ${newProviderCountryCodes.includes(country.code) ? 'opacity-100' : 'opacity-0'}`} />
                            <span>{country.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setAddProviderOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#071b35] text-white hover:bg-[#0b2748]"
            onClick={() => addProviderMutation.mutate()}
            disabled={addProviderMutation.isPending || !newProviderForm.name.trim()}
          >
            {addProviderMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add Provider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const editProviderCredentialsDialog = (
    <Dialog open={editProviderCredentialsOpen} onOpenChange={setEditProviderCredentialsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingProvider ? editProviderCredentialLabels.dialogTitle : 'Provider API Keys'}</DialogTitle>
          <DialogDescription>
            {editProviderCredentialLabels.dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Provider Enabled</Label>
              <p className="text-xs text-muted-foreground">Turn This Provider On Or Off In The eRoaming Provider Switcher.</p>
            </div>
            <Switch
              checked={editProviderForm.enabled}
              onCheckedChange={(checked) => setEditProviderForm((current) => ({ ...current, enabled: checked }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-eroaming-provider-api-url">API Base URL</Label>
              <Input
                id="edit-eroaming-provider-api-url"
                value={editProviderForm.apiBaseUrl}
                onChange={(event) => setEditProviderForm((current) => ({ ...current, apiBaseUrl: event.target.value }))}
                placeholder={editingProvider?.slug === 'didww' ? 'https://api.didww.com/v3' : 'https://api.twilio.com/2010-04-01'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-eroaming-provider-api-key">{editProviderCredentialLabels.primaryLabel}</Label>
              <Input
                id="edit-eroaming-provider-api-key"
                value={editProviderForm.apiKey}
                onChange={(event) => setEditProviderForm((current) => ({ ...current, apiKey: event.target.value }))}
                placeholder={editingProvider?.apiKeyConfigured ? editProviderCredentialLabels.primarySavedPlaceholder : editProviderCredentialLabels.primaryEditPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-eroaming-provider-api-secret">{editProviderCredentialLabels.secondaryLabel}</Label>
              <Input
                id="edit-eroaming-provider-api-secret"
                type="password"
                value={editProviderForm.apiSecret}
                onChange={(event) => setEditProviderForm((current) => ({ ...current, apiSecret: event.target.value }))}
                placeholder={editingProvider?.apiSecretConfigured ? editProviderCredentialLabels.secondarySavedPlaceholder : editProviderCredentialLabels.secondaryEditPlaceholder}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-eroaming-provider-notes">Notes</Label>
              <Input
                id="edit-eroaming-provider-notes"
                value={editProviderForm.notes}
                onChange={(event) => setEditProviderForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Provider API Notes"
              />
            </div>
          </div>

          {editingProvider ? (
            <div className="rounded-md border border-cyan-300/50 bg-cyan-50 p-3 text-sm text-cyan-950 dark:border-cyan-800/60 dark:bg-cyan-950/30 dark:text-cyan-100">
              Current Status: {editProviderCredentialLabels.primaryStatusLabel} {editingProvider.apiKeyConfigured ? 'Saved' : 'Missing'} / {editProviderCredentialLabels.secondaryStatusLabel}{' '}
              {editingProvider.apiSecretConfigured ? 'Saved' : 'Missing'}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setEditProviderCredentialsOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#071b35] text-white hover:bg-[#0b2748]"
            onClick={() => updateProviderCredentialsMutation.mutate()}
            disabled={updateProviderCredentialsMutation.isPending || !editingProvider}
          >
            {updateProviderCredentialsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SettingsIcon className="mr-2 h-4 w-4" />}
            {editProviderCredentialLabels.saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (section === 'providers') {
    const providerKpis = [
      {
        title: tvn('providers.kpis.activeProvider.title', 'Active Provider'),
        value: providerEnabled ? '1' : '0',
        subtitle: providerEnabled
          ? tvn('providers.kpis.activeProvider.enabledSubtitle', 'Vonage enabled for live operations')
          : tvn('providers.kpis.activeProvider.disabledSubtitle', 'Provider currently disabled'),
        textClass: 'text-cyan-700 dark:text-cyan-300',
        bgClass: 'from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30',
        iconClass: 'from-cyan-600 to-blue-600 shadow-cyan-500/40',
        icon: Server,
      },
      {
        title: tvn('providers.kpis.ownedInventory.title', 'Owned Inventory'),
        value: summary.totalInventory.toLocaleString(),
        subtitle: tvn('providers.kpis.ownedInventory.subtitle', '{count} available to assign or sell', {
          count: summary.availableInventory,
        }),
        textClass: 'text-emerald-700 dark:text-emerald-300',
        bgClass: 'from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30',
        iconClass: 'from-emerald-600 to-teal-600 shadow-emerald-500/40',
        icon: Package,
      },
      {
        title: tvn('providers.kpis.activeNumbers.title', 'Active Numbers'),
        value: summary.activeNumbers.toLocaleString(),
        subtitle: tvn('providers.kpis.activeNumbers.subtitle', '{count} assigned inventory rows', {
          count: summary.assignedInventory,
        }),
        textClass: 'text-violet-700 dark:text-violet-300',
        bgClass: 'from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30',
        iconClass: 'from-violet-600 to-fuchsia-600 shadow-violet-500/40',
        icon: Phone,
      },
      {
        title: tvn('providers.kpis.pendingRequests.title', 'Pending Requests'),
        value: summary.pendingApplications.toLocaleString(),
        subtitle: providerHealthy
          ? tvn('providers.kpis.pendingRequests.readySubtitle', 'Ready for manual review or issue flow')
          : tvn('providers.kpis.pendingRequests.setupSubtitle', 'Finish provider setup to process smoothly'),
        textClass: 'text-amber-700 dark:text-amber-300',
        bgClass: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
        iconClass: 'from-amber-600 to-orange-600 shadow-amber-500/40',
        icon: ClipboardList,
      },
      {
        title: selectedProviderBalanceTitle,
        value: selectedProviderBalanceLabel,
        subtitle: selectedProviderBalanceSubtitle,
        textClass: 'text-emerald-700 dark:text-emerald-300',
        bgClass: 'from-emerald-50 to-lime-50 dark:from-emerald-950/30 dark:to-lime-950/30',
        iconClass: 'from-emerald-600 to-lime-600 shadow-emerald-500/40',
        icon: Wallet,
      },
    ];

    return (
      <div className="space-y-6 rounded-[28px] border border-white/80 bg-white/70 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/60 dark:text-white dark:shadow-black/30 lg:p-8">
        <div>
          <h1 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-white dark:to-slate-300">
            {sectionTitleMap[section]}
          </h1>
          <p className="mt-1 text-muted-foreground">{sectionDescriptionMap[section]}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {providerKpis.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className={`relative overflow-hidden border-0 bg-gradient-to-br ${item.bgClass} shadow-lg`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm font-medium ${item.textClass}`}>{item.title}</p>
                      <h3 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{item.value}</h3>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{item.subtitle}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.iconClass}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/25 blur-2xl dark:bg-white/10"></div>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white shadow-2xl shadow-cyan-950/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.16),transparent_30%)]" />
            <CardContent className="relative p-6 lg:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/10">
                      {tvn('providers.badges.primaryProvider', 'Primary Provider')}
                    </Badge>
                    <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/10">
                      {tvn('providers.badges.eroaming', "eRoaming's")}
                    </Badge>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                      <Server className="h-6 w-6 text-cyan-200" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight">{selectedERoamingProvider.name}</h2>
                      <p className="mt-2 max-w-xl text-sm text-slate-300">
                        {providerNoteText(
                          selectedERoamingProvider.notes,
                          'providers.notes.heroFallback',
                          'Use this provider for DID search, rental cost lookup, pricing baselines, inventory ordering, package sales, and assignment to customers, agents, or resellers.',
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:w-[320px]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{tvn('common.status', 'Status')}</div>
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className={
                          providerEnabled
                            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                            : 'border-white/15 bg-white/5 text-slate-300'
                        }
                      >
                        {providerEnabled ? tvn('common.enabled', 'Enabled') : tvn('common.disabled', 'Disabled')}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{tvn('providers.apiHealth', 'API Health')}</div>
                    <div className="mt-2">
                      <Badge variant="outline" className={`gap-1.5 border ${providerHealthClass.replace('text-emerald-600 dark:text-emerald-300', 'text-emerald-100').replace('text-amber-600 dark:text-amber-300', 'text-amber-100').replace('text-muted-foreground', 'text-slate-300')}`}>
                        <ProviderHealthIcon className="h-3 w-3" />
                        {providerHealthLabel}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{tvn('providers.defaultCountry', 'Default Country')}</div>
                    <div className="mt-2 text-lg font-semibold">{data.defaultCountry || 'US'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{tvn('providers.credentials', 'Credentials')}</div>
                    <div className="mt-2 text-lg font-semibold">
                      {data.hasCredentials ? tvn('common.connected', 'Connected') : tvn('common.missing', 'Missing')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{tvn('providers.standardProviderSetup', 'Standard Provider Setup')}</div>
                  <div className="mt-2 text-2xl font-semibold">
                    {providerCostSnapshot.standardSetup} {providerCostSnapshot.providerCurrency}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{tvn('providers.savedProviderSetupCost', 'Saved provider setup cost')}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{tvn('providers.premiumProviderSetup', 'Premium Provider Setup')}</div>
                  <div className="mt-2 text-2xl font-semibold">
                    {providerCostSnapshot.premiumSetup} {providerCostSnapshot.providerCurrency}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{tvn('providers.savedPremiumProviderCost', 'Saved premium provider cost')}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{tvn('providers.ownedInventory', 'Owned Inventory')}</div>
                  <div className="mt-2 text-2xl font-semibold">{summary.totalInventory.toLocaleString()}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {tvn('providers.readyToSell', '{count} ready to sell', { count: summary.availableInventory })}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{selectedProviderBalanceTitle}</div>
                  <div className="mt-2 text-2xl font-semibold text-emerald-300">
                    {selectedProviderBalanceLabel}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {selectedProviderBalanceSubtitle}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  className="border-0 bg-white text-slate-950 hover:bg-slate-100"
                  onClick={() => providerSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  {tvn('providers.actions.configureProvider', 'Configure Provider')}
                </Button>
                <Button
                  variant="outline"
                  className="border-emerald-300/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15 hover:text-emerald-50"
                  onClick={() => providerSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  {tvn('providers.actions.editProviderCostRates', 'Edit Provider Cost & Rates')}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    window.location.href = '/admin/virtual-numbers/numbers';
                  }}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {tvn('providers.actions.searchNumbers', 'Search Numbers')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90 shadow-lg dark:border-slate-800/80 dark:bg-slate-900/80">
            <CardHeader>
              <CardTitle>{tvn('providers.selected.title', 'Selected Provider')}</CardTitle>
              <CardDescription>{tvn('providers.selected.description', 'Choose the active eRoaming provider and jump into its controls.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 text-xl font-semibold text-[#58cbbb] dark:border-slate-700 dark:bg-slate-950">
                  {selectedERoamingProvider.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {tvn('providers.selected.label', 'Selected Provider')}
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{selectedERoamingProvider.name}</div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {providerNoteText(
                      selectedERoamingProvider.notes,
                      'providers.notes.selectedFallback',
                      'Provider API access, DID sync, country coverage, and selling plans.',
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-800 dark:text-slate-200">{tvn('dashboard.providerControl.switchProvider', 'Switch Provider')}</Label>
                <Select
                  value={activeERoamingProvider}
                  onValueChange={(value) => {
                    setActiveERoamingProvider(value as ERoamingProviderName);
                    setActiveProviderMutation.mutate(value);
                  }}
                >
                  <SelectTrigger className="h-12 border-[#24445f] bg-[#071b35] text-white focus:ring-teal-500">
                    <SelectValue placeholder={tvn('dashboard.providerControl.selectProvider', 'Select eRoaming provider')} />
                  </SelectTrigger>
                  <SelectContent>
                    {eRoamingProviders.map((provider) => (
                      <SelectItem key={provider.slug} value={provider.slug}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div
                  className={
                    selectedProviderEnabled
                      ? 'rounded-md border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-100'
                      : 'rounded-md border border-slate-300 bg-slate-50 p-4 text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300'
                  }
                >
                  <div className="text-sm text-slate-500 dark:text-slate-400">{tvn('common.provider', 'Provider')}</div>
                  <div className="mt-2 flex items-center gap-2 text-lg font-medium">
                    <span className={selectedProviderEnabled ? 'h-2 w-2 rounded-full bg-emerald-500' : 'h-2 w-2 rounded-full bg-slate-400'} />
                    {selectedProviderEnabled ? tvn('common.enabled', 'Enabled') : tvn('common.disabled', 'Disabled')}
                  </div>
                </div>
                <div
                  className={
                    selectedProviderConnected
                      ? 'rounded-md border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-100'
                      : 'rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100'
                  }
                >
                  <div className="text-sm text-slate-500 dark:text-slate-400">API</div>
                  <div className="mt-2 flex items-center gap-2 text-lg font-medium">
                    <span className={selectedProviderConnected ? 'h-2 w-2 rounded-full bg-emerald-500' : 'h-2 w-2 rounded-full bg-amber-500'} />
                    {selectedProviderConnected ? tvn('common.connected', 'Connected') : tvn('common.missing', 'Missing')}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                  <div className="text-sm text-muted-foreground">{tvn('providers.didCountries', 'DID Countries')}</div>
                  <div className="mt-1 text-base font-semibold">{selectedProviderCountries}</div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                  <div className="text-sm text-muted-foreground">{tvn('providers.standardMonthlyCost', 'Standard Monthly Cost')}</div>
                  <div className="mt-1 text-xl font-semibold">{providerCostSnapshot.standardMonthly} {providerCostSnapshot.providerCurrency}</div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                  <div className="text-sm text-muted-foreground">{tvn('providers.premiumMonthlyCost', 'Premium Monthly Cost')}</div>
                  <div className="mt-1 text-xl font-semibold">{providerCostSnapshot.premiumMonthly} {providerCostSnapshot.providerCurrency}</div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                  <div className="text-sm text-muted-foreground">{selectedProviderBalanceTitle}</div>
                  <div className="mt-1 text-xl font-semibold">{selectedProviderBalanceLabel}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{selectedProviderBalanceSubtitle}</div>
                </div>
              </div>

              <Button
                className="w-full border-0 bg-[#071b35] text-white hover:bg-[#0b2748]"
                onClick={() => {
                  if (selectedERoamingProvider.slug === 'vonage') {
                    providerSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    return;
                  }
                  openProviderCredentialsDialog(selectedERoamingProvider);
                }}
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                {selectedERoamingProvider.slug === 'vonage'
                  ? tvn('providers.actions.openProviderControls', 'Open Provider Controls')
                  : tvn('providers.actions.openAction', 'Open {label}', { label: selectedProviderCredentialLabels.actionLabel })}
              </Button>
              <div className="grid gap-3 sm:grid-cols-2">
                <Popover open={didSyncCountryPickerOpen} onOpenChange={setDidSyncCountryPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="justify-between">
                      <span className="truncate">{didSyncCountryLabel}</span>
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] p-0" align="start">
                    <Command shouldFilter={false} className={darkCommandMenuClass}>
                      <CommandInput placeholder={tvn('providers.searchDidCountries', 'Search DID countries')} value={countrySearch} onValueChange={setCountrySearch} />
                      <CommandList>
                        <CommandItem
                          className={darkCommandItemClass}
                          value="all-did-countries"
                          onSelect={() => {
                            setDidSyncAllCountries(true);
                            setDidSyncCountryCodes([]);
                          }}
                        >
                          <Check className={`h-4 w-4 ${didSyncAllCountries ? 'opacity-100' : 'opacity-0'}`} />
                          <span>{tvn('common.allDidCountries', 'All DID Countries')}</span>
                        </CommandItem>
                        <CommandGroup heading={tvn('providers.countries', 'Countries')}>
                          {filteredCountryOptions.map((country) => (
                            <CommandItem className={darkCommandItemClass} key={`sync-${country.code}`} value={country.label} onSelect={() => toggleSyncCountry(country.code)}>
                              <Check className={`h-4 w-4 ${didSyncCountryCodes.includes(country.code) && !didSyncAllCountries ? 'opacity-100' : 'opacity-0'}`} />
                              <span>{country.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => syncProviderDidsMutation.mutate(selectedERoamingProvider.slug)}
                  disabled={syncProviderDidsMutation.isPending}
                >
                  {syncProviderDidsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {tvn('dashboard.providerControl.syncDids', "Sync DID's")}
                </Button>
                {selectedERoamingProvider.slug === 'vonage' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => syncOwnedDidsMutation.mutate(selectedERoamingProvider.slug)}
                    disabled={syncOwnedDidsMutation.isPending || !data?.hasCredentials}
                  >
                    {syncOwnedDidsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                    {tvn('dashboard.providerControl.syncBoughtDids', "Sync Bought DID's")}
                  </Button>
                )}
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={() => setAddProviderOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {tvn('providers.actions.addERoamingProvider', 'Add eRoaming Provider')}
              </Button>
              <div className="rounded-md border border-cyan-300/50 bg-cyan-50 p-3 text-sm text-cyan-950 dark:border-cyan-800/60 dark:bg-cyan-950/30 dark:text-cyan-100">
                <div className="font-medium">{tvn('providers.onePageControl.title', 'One-page eRoaming control')}</div>
                <div className="mt-1 text-cyan-800 dark:text-cyan-200">
                  {tvn('providers.onePageControl.description', 'The same Vonage setup from Platform Setup is available directly below on this provider page.')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/70 bg-white/80 shadow-lg dark:border-slate-800/80 dark:bg-slate-900/70">
          <CardHeader>
            <CardTitle>{tvn('providers.list.title', 'Providers')}</CardTitle>
            <CardDescription>{tvn('providers.list.description', 'Structured provider list for virtual number operations, following the eSIM provider management style.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tvn('common.provider', 'Provider')}</TableHead>
                  <TableHead>{tvn('common.status', 'Status')}</TableHead>
                  <TableHead>{tvn('providers.apiHealth', 'API Health')}</TableHead>
                  <TableHead>{tvn('providers.countries', 'Countries')}</TableHead>
                  <TableHead>{tvn('providers.didSync', 'DID Sync')}</TableHead>
                  <TableHead>{tvn('providers.pricing', 'Pricing')}</TableHead>
                  <TableHead className="text-right">{tvn('providers.actionsColumn', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eRoamingProviders.map((provider) => {
                  const rowActive = provider.slug === activeERoamingProvider;
                  const rowConnected = Boolean(provider.apiKeyConfigured && provider.apiSecretConfigured);
                  const rowCredentialLabels = getProviderCredentialLabels(provider);
                  const RowHealthIcon = !provider.enabled ? Ban : rowConnected ? Check : Clock;
                  const rowHealthLabel = !provider.enabled
                    ? tvn('common.disabled', 'Disabled')
                    : rowConnected
                      ? tvn('common.connected', 'Connected')
                      : tvn('common.missing', 'Missing');
                  const rowHealthClass = !provider.enabled
                    ? 'border-muted-foreground/30 text-muted-foreground'
                    : rowConnected
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300';
                  const rowCountryLabel = provider.allCountries
                    ? tvn('common.allDidCountries', 'All DID Countries')
                    : provider.countryCodes?.length
                      ? provider.countryCodes.join(', ')
                      : tvn('common.noCountriesSelected', 'No countries selected');
                  const rowSyncLabel = provider.supportsLiveSync
                    ? tvn('providers.sync.liveReady', 'Live sync ready')
                    : provider.lastDidSyncStatus === 'needs_connector'
                      ? tvn('providers.sync.connectorNeeded', 'Connector needed')
                      : tvn('providers.sync.savedProvider', 'Saved provider');

                  return (
                    <TableRow key={provider.slug} className="odd:bg-muted/40 transition-colors hover:bg-muted">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-600 dark:text-cyan-300">
                            <Server className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 font-medium">
                              {provider.name}
                              <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                                {tvn('providers.badges.eroaming', "eRoaming's")}
                              </Badge>
                              {rowActive && (
                                <Badge className="bg-[#071b35] text-white hover:bg-[#071b35]">{tvn('common.active', 'Active')}</Badge>
                              )}
                            </div>
                            <div className="max-w-xl text-sm text-muted-foreground">
                              {providerNoteText(
                                provider.notes,
                                'providers.notes.tableFallback',
                                'Provider API access, DID country coverage, package pricing, and assignment workflow.',
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            provider.enabled
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                              : 'border-muted-foreground/30 text-muted-foreground'
                          }
                        >
                          {provider.enabled ? tvn('common.enabled', 'Enabled') : tvn('common.disabled', 'Disabled')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1.5 ${rowHealthClass}`}>
                          <RowHealthIcon className="h-3 w-3" />
                          {rowHealthLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[220px] text-sm">{rowCountryLabel}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" />
                            {rowSyncLabel}
                          </div>
                          {provider.lastDidSyncAt && (
                            <div className="text-xs text-muted-foreground">
                              {tvn('providers.sync.lastSync', 'Last sync {date}', {
                                date: new Date(provider.lastDidSyncAt).toLocaleString(),
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {provider.slug === 'vonage' ? (
                          <div className="space-y-1 text-sm">
                            <div>
                              {tvn('providers.standardProviderSetupWithColon', 'Standard provider setup:')}{' '}
                              <span className="font-medium">
                                {providerCostSnapshot.standardSetup} {providerCostSnapshot.providerCurrency}
                              </span>
                            </div>
                            <div>
                              {tvn('providers.premiumProviderSetupWithColon', 'Premium provider setup:')}{' '}
                              <span className="font-medium">
                                {providerCostSnapshot.premiumSetup} {providerCostSnapshot.providerCurrency}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {tvn('providers.connectorPlaceholder', 'Provider saved. Add connector logic when the provider API details are ready.')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {!rowActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveERoamingProvider(provider.slug);
                                setActiveProviderMutation.mutate(provider.slug);
                              }}
                            >
                              {tvn('providers.actions.setActive', 'Set Active')}
                            </Button>
                          )}
                          {provider.slug === 'vonage' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => providerSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            >
                              <SettingsIcon className="mr-1 h-4 w-4" />
                              {tvn('providers.actions.configure', 'Configure')}
                            </Button>
                          )}
                          {provider.slug === 'vonage' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncOwnedDidsMutation.mutate(provider.slug)}
                              disabled={syncOwnedDidsMutation.isPending || !data?.hasCredentials}
                            >
                              {syncOwnedDidsMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-1 h-4 w-4" />}
                              {tvn('dashboard.providerControl.syncBoughtDids', "Sync Bought DID's")}
                            </Button>
                          )}
                          {provider.slug !== 'vonage' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openProviderCredentialsDialog(provider)}
                            >
                              <SettingsIcon className="mr-1 h-4 w-4" />
                              {rowCredentialLabels.actionLabel}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncProviderDidsMutation.mutate(provider.slug)}
                            disabled={syncProviderDidsMutation.isPending}
                          >
                            <RefreshCw className="mr-1 h-4 w-4" />
                            {tvn('dashboard.providerControl.syncDids', "Sync DID's")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/80 shadow-lg dark:border-slate-800/80 dark:bg-slate-900/70">
          <CardHeader>
            <CardTitle>{tvn('providers.costRateAccess.title', 'Provider Cost & Rate Access')}</CardTitle>
            <CardDescription>
              {tvn('providers.costRateAccess.description', 'The editable Vonage provider cost matrix is below. This page now shows the real saved provider costs above, and you can jump directly into the editable standard and premium plan tables here.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => providerSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <DollarSign className="mr-2 h-4 w-4" />
              {tvn('providers.actions.openEditableCostMatrix', 'Open Editable Cost Matrix')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = '/admin/virtual-numbers/cost-price';
              }}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              {tvn('providers.actions.openCostPriceSection', 'Open Cost & Price Section')}
            </Button>
          </CardContent>
        </Card>

        <div ref={providerSettingsRef} className="scroll-mt-6 space-y-3">
          <div className="rounded-2xl border border-cyan-300/60 bg-[#071b35] p-5 text-white shadow-lg dark:border-cyan-900/60">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">{tvn('providers.controls.title', 'Provider Controls')}</div>
            <div className="mt-1 text-2xl font-semibold">{tvn('providers.controls.vonageSetup', 'Vonage eRoaming Setup')}</div>
            <p className="mt-2 max-w-3xl text-sm text-slate-200">
              {tvn('providers.controls.description', 'Manage credentials, feature enablement, live pricing lookup, SMS/voice cost baselines, and selling plans here without opening Platform Setup.')}
            </p>
          </div>
          <VonageSettingsTab />
        </div>

        <Dialog open={addProviderOpen} onOpenChange={setAddProviderOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{tvn('providers.dialog.addTitle', 'Add eRoaming Provider')}</DialogTitle>
              <DialogDescription>
                {tvn('providers.dialog.addDescription', 'Add a new provider profile, choose its DID country coverage, and make it available in the provider switcher.')}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-eroaming-provider-name">{tvn('providers.dialog.providerName', 'Provider Name')}</Label>
                <Input
                  id="new-eroaming-provider-name"
                  value={newProviderForm.name}
                  onChange={(event) => setNewProviderForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder={tvn('providers.dialog.providerNamePlaceholder', 'Provider name')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-eroaming-provider-slug">{tvn('providers.dialog.providerSlug', 'Provider Slug')}</Label>
                <Input
                  id="new-eroaming-provider-slug"
                  value={newProviderForm.slug}
                  onChange={(event) => setNewProviderForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder={tvn('providers.dialog.autoFromName', 'auto from name')}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="new-eroaming-provider-api-url">{tvn('providers.dialog.apiBaseUrl', 'API Base URL')}</Label>
                <Input
                  id="new-eroaming-provider-api-url"
                  value={newProviderForm.apiBaseUrl}
                  onChange={(event) => setNewProviderForm((current) => ({ ...current, apiBaseUrl: event.target.value }))}
                  placeholder="https://api.provider.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-eroaming-provider-api-key">{newProviderCredentialLabels.primaryLabel}</Label>
                <Input
                  id="new-eroaming-provider-api-key"
                  value={newProviderForm.apiKey}
                  onChange={(event) => setNewProviderForm((current) => ({ ...current, apiKey: event.target.value }))}
                  placeholder={newProviderCredentialLabels.primaryNewPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-eroaming-provider-api-secret">{newProviderCredentialLabels.secondaryLabel}</Label>
                <Input
                  id="new-eroaming-provider-api-secret"
                  type="password"
                  value={newProviderForm.apiSecret}
                  onChange={(event) => setNewProviderForm((current) => ({ ...current, apiSecret: event.target.value }))}
                  placeholder={newProviderCredentialLabels.secondaryNewPlaceholder}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="new-eroaming-provider-notes">{tvn('providers.dialog.notes', 'Notes')}</Label>
                <Input
                  id="new-eroaming-provider-notes"
                  value={newProviderForm.notes}
                  onChange={(event) => setNewProviderForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder={tvn('providers.dialog.notesPlaceholder', 'Provider API access, DID sync, and pricing notes')}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label>{tvn('providers.dialog.didCountryCoverage', 'DID Country Coverage')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {tvn('providers.dialog.didCountryCoverageDescription', 'Use all DID countries or choose specific countries for this provider.')}
                    </p>
                  </div>
                  <Switch
                    checked={newProviderAllCountries}
                    onCheckedChange={(checked) => {
                      setNewProviderAllCountries(checked);
                      if (checked) setNewProviderCountryCodes([]);
                    }}
                  />
                </div>
                {!newProviderAllCountries && (
                  <Popover open={newProviderCountryPickerOpen} onOpenChange={setNewProviderCountryPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-between">
                        <span className="truncate">{newProviderCountryLabel}</span>
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] p-0" align="start">
                      <Command shouldFilter={false} className={darkCommandMenuClass}>
                        <CommandInput placeholder={tvn('providers.dialog.searchCountries', 'Search countries')} value={countrySearch} onValueChange={setCountrySearch} />
                        <CommandList>
                          <CommandEmpty>{tvn('providers.dialog.noCountryFound', 'No Country Found.')}</CommandEmpty>
                          <CommandGroup heading={tvn('providers.countries', 'Countries')}>
                            {filteredCountryOptions.map((country) => (
                              <CommandItem className={darkCommandItemClass} key={`new-provider-${country.code}`} value={country.label} onSelect={() => toggleNewProviderCountry(country.code)}>
                                <Check className={`h-4 w-4 ${newProviderCountryCodes.includes(country.code) ? 'opacity-100' : 'opacity-0'}`} />
                                <span>{country.label}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddProviderOpen(false)}>
                {tvn('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                className="bg-[#071b35] text-white hover:bg-[#0b2748]"
                onClick={() => addProviderMutation.mutate()}
                disabled={addProviderMutation.isPending || !newProviderForm.name.trim()}
              >
                {addProviderMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {tvn('common.addProvider', 'Add Provider')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {editProviderCredentialsDialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-[28px] border border-white/80 bg-white/70 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/60 dark:text-white dark:shadow-black/30 lg:p-8">
      <div>
        <h1 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-white dark:to-slate-300">
          {sectionTitleMap[section]}
        </h1>
        <p className="mt-1 text-muted-foreground">{sectionDescriptionMap[section]}</p>
      </div>

      {section === 'dashboard' && (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className={`relative overflow-hidden border border-white/5 bg-gradient-to-br ${card.bg} shadow-[0_18px_45px_rgba(0,0,0,0.24)]`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.ring} opacity-70`} />
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${card.accent}`}>{card.title}</p>
                    <div className="mt-3 text-4xl font-bold tracking-tight text-white">{card.value}</div>
                    <p className="mt-2 text-sm text-slate-400">{card.subtitle}</p>
                    {card.badge ? (
                      <div className={`mt-4 inline-flex rounded-md px-3 py-1 text-xs font-semibold ${card.badgeClass}`}>
                        {card.badge}
                      </div>
                    ) : null}
                  </div>
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${card.iconBg} shadow-[0_0_22px_rgba(94,234,212,0.35)]`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      {section === 'dashboard' && (
        <Card className="border-white/70 bg-white/90 shadow-lg dark:border-slate-800/80 dark:bg-slate-900/80">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{tvn('dashboard.providerControl.title', 'eRoaming Provider Control')}</CardTitle>
              <CardDescription>
                {tvn('dashboard.providerControl.description', 'Switch the active DID provider or add Twilio, DIDWW, and other providers from here.')}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="bg-[#071b35] text-white hover:bg-[#0b2748]"
                onClick={() => setAddProviderOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {tvn('common.addProvider', 'Add Provider')}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/admin/virtual-numbers/providers')}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                {tvn('common.manageProviders', 'Manage Providers')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-end">
            <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {tvn('dashboard.providerControl.activeProvider', 'Active Provider')}
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{selectedERoamingProvider.name}</div>
              <p className="mt-1 text-sm text-muted-foreground">{selectedProviderCountries}</p>
            </div>
            <div className="space-y-2">
              <Label>{tvn('dashboard.providerControl.switchProvider', 'Switch Provider')}</Label>
              <Select
                value={activeERoamingProvider}
                onValueChange={(value) => {
                  setActiveERoamingProvider(value as ERoamingProviderName);
                  setActiveProviderMutation.mutate(value);
                }}
              >
                <SelectTrigger className="h-12 border-[#24445f] bg-[#071b35] text-white focus:ring-teal-500">
                  <SelectValue placeholder={tvn('dashboard.providerControl.selectProvider', 'Select eRoaming provider')} />
                </SelectTrigger>
                <SelectContent>
                  {eRoamingProviders.map((provider) => (
                    <SelectItem key={provider.slug} value={provider.slug}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <Button
                type="button"
                variant="outline"
                onClick={() => syncProviderDidsMutation.mutate(selectedERoamingProvider.slug)}
                disabled={syncProviderDidsMutation.isPending}
                className="h-12"
              >
                {syncProviderDidsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {tvn('dashboard.providerControl.syncDids', "Sync DID's")}
              </Button>
              {selectedERoamingProvider.slug === 'vonage' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => syncOwnedDidsMutation.mutate(selectedERoamingProvider.slug)}
                  disabled={syncOwnedDidsMutation.isPending || !data?.hasCredentials}
                  className="h-12"
                >
                  {syncOwnedDidsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                  {tvn('dashboard.providerControl.syncBoughtDids', "Sync Bought DID's")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'dashboard' && data?.hasCredentials && (
        <Card className="border-white/70 bg-white/90 shadow-lg dark:border-slate-800/80 dark:bg-slate-900/80">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>{tvn('dashboard.didAvailability.title', 'DID Availability Statistics')}</CardTitle>
              <CardDescription>{tvn('dashboard.didAvailability.description', 'Live country-level DID totals from the active provider.')}</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/virtual-numbers/numbers')}>
              <Phone className="mr-2 h-4 w-4" />
              {tvn('dashboard.didAvailability.openCountries', 'Open DID Countries')}
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">{tvn('dashboard.didAvailability.countriesChecked', 'Countries Checked')}</div>
              <div className="mt-2 text-2xl font-semibold">{didCountryTotals.totalCountries}</div>
            </div>
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">{tvn('dashboard.didAvailability.countriesWithDid', 'Countries With DID')}</div>
              <div className="mt-2 text-2xl font-semibold">{didCountryTotals.countriesWithDid}</div>
            </div>
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">
                {didStatsPartial
                  ? tvn('dashboard.didAvailability.loadedDid', 'Loaded DID')
                  : tvn('dashboard.didAvailability.availableDid', 'Available DID')}
              </div>
              <div className="mt-2 text-2xl font-semibold">{didCountryTotals.totalAvailable}</div>
              {didStatsPartial ? (
                <div className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                  {tvn('dashboard.didAvailability.partialProviderScan', 'Partial provider scan')}
                </div>
              ) : null}
            </div>
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">{tvn('dashboard.didAvailability.buyReadyDid', 'Buy Ready DID')}</div>
              <div className="mt-2 text-2xl font-semibold">{didCountryTotals.totalBuyReady}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {(section === 'active' || section === 'pending' || section === 'logs') && (
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">{tvn('logs.summary.inventory', 'Inventory')}</div><div className="mt-2 text-2xl font-semibold">{data.summary.totalInventory}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">{tvn('dashboard.cards.activeNumbers.title', 'Active Numbers')}</div><div className="mt-2 text-2xl font-semibold">{data.summary.activeNumbers}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">{tvn('logs.summary.available', 'Available')}</div><div className="mt-2 text-2xl font-semibold">{data.summary.availableInventory}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground">{tvn('providers.kpis.pendingRequests.title', 'Pending Requests')}</div><div className="mt-2 text-2xl font-semibold">{data.summary.pendingApplications}</div></CardContent></Card>
      </div>
      )}

      {section === 'bought-dids' && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="overflow-hidden border-emerald-400/15 bg-gradient-to-br from-emerald-500/12 via-slate-950 to-slate-900 text-slate-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-emerald-100/80">{tvn('bought.stats.boughtDids', "Bought DID's")}</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{boughtInventory.length.toLocaleString()}</div>
                    <div className="mt-1 text-sm text-emerald-100/70">{tvn('bought.stats.importedFromVonage', 'Imported from Vonage inventory')}</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-400/15 p-3">
                    <ShoppingCart className="h-5 w-5 text-emerald-200" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-cyan-400/15 bg-gradient-to-br from-cyan-500/12 via-slate-950 to-slate-900 text-slate-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-cyan-100/80">{tvn('bought.stats.availableDids', "Available DID's")}</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{boughtAvailableCount.toLocaleString()}</div>
                    <div className="mt-1 text-sm text-cyan-100/70">{tvn('bought.stats.readyForPricing', 'Ready for pricing or assignment')}</div>
                  </div>
                  <div className="rounded-2xl bg-cyan-400/15 p-3">
                    <Phone className="h-5 w-5 text-cyan-200" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-violet-400/15 bg-gradient-to-br from-violet-500/12 via-slate-950 to-slate-900 text-slate-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-violet-100/80">{tvn('bought.stats.assignedDids', "Assigned DID's")}</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{boughtAssignedCount.toLocaleString()}</div>
                    <div className="mt-1 text-sm text-violet-100/70">{tvn('bought.stats.linkedAccounts', 'Linked to customers or accounts')}</div>
                  </div>
                  <div className="rounded-2xl bg-violet-400/15 p-3">
                    <Users className="h-5 w-5 text-violet-200" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-amber-400/15 bg-gradient-to-br from-amber-500/12 via-slate-950 to-slate-900 text-slate-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-amber-100/80">{tvn('bought.stats.premiumDids', "Premium DID's")}</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{boughtPremiumCount.toLocaleString()}</div>
                    <div className="mt-1 text-sm text-amber-100/70">{tvn('bought.stats.markedPremium', 'Marked for premium pricing')}</div>
                  </div>
                  <div className="rounded-2xl bg-amber-400/15 p-3">
                    <Star className="h-5 w-5 text-amber-200" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.95)]">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ShoppingCart className="h-5 w-5 text-emerald-300" />
                  {tvn('bought.inventory.title', "Bought DID's Inventory")}
                </CardTitle>
                <CardDescription className="text-slate-300">
                  {tvn('bought.inventory.description', 'DID numbers bought in Vonage or synced from your Vonage account.')}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-teal-500 text-slate-950 hover:bg-teal-400"
                  onClick={() => syncOwnedDidsMutation.mutate('vonage')}
                  disabled={syncOwnedDidsMutation.isPending || !data?.hasCredentials}
                >
                  {syncOwnedDidsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {tvn('dashboard.providerControl.syncBoughtDids', "Sync Bought DID's")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => navigate('/admin/virtual-numbers/cost-price')}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  {tvn('bought.inventory.editPrices', 'Edit Prices')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!data?.hasCredentials ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
                  {tvn('bought.inventory.missingCredentials', 'Add Vonage credentials first, then sync the DID numbers already bought in your Vonage backend.')}
                </div>
              ) : boughtInventory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
                  {tvn('bought.inventory.empty', "No bought DID's are synced yet. Use Sync Bought DID's to import the DID numbers from your Vonage account.")}
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{tvn('bought.list.title', "Available Bought DID's")}</div>
                        <div className="text-xs text-slate-400">{tvn('bought.list.description', 'Click a DID to open its workspace.')}</div>
                      </div>
                      <Badge className="bg-teal-500 text-slate-950 hover:bg-teal-500">{visibleBoughtInventory.length}</Badge>
                    </div>
                    <div className="relative mt-4">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={boughtDidSearch}
                        onChange={(event) => setBoughtDidSearch(event.target.value)}
                        placeholder={tvn('bought.list.searchPlaceholder', 'Search DID, country, user')}
                        className="border-white/10 bg-[#071b35] pl-9 text-white placeholder:text-slate-400"
                      />
                    </div>
                    <div className="mt-4 max-h-[640px] space-y-2 overflow-y-auto pr-1">
                      {visibleBoughtInventory.map((item) => {
                        const assignedAccount = item.assignedUserId ? assignableUserMap.get(item.assignedUserId) : null;
                        const active = item.id === selectedBoughtDid?.id;
                        return (
                          <button
                            key={`bought-list-${item.id}`}
                            type="button"
                            className={`w-full rounded-xl border p-3 text-left transition ${
                              active
                                ? 'border-teal-300/60 bg-teal-400/10'
                                : 'border-white/10 bg-white/[0.04] hover:border-teal-300/30 hover:bg-white/[0.07]'
                            }`}
                            onClick={() => setSelectedBoughtDidId(item.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-mono font-semibold text-white">{item.msisdn}</div>
                                <div className="mt-1 truncate text-xs text-slate-400">
                                  {item.countryCode}{' '}
                                  {assignedAccount
                                    ? tvn('bought.list.assignedTo', 'Assigned To {account}', { account: assignedAccount.label })
                                    : tvn('bought.common.unassigned', 'Unassigned')}
                                </div>
                              </div>
                              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-teal-200" />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className={`rounded-full border px-2 py-1 text-xs capitalize ${boughtDidStatusClass(item.status)}`}>
                                {boughtDidStatusLabel(item.status)}
                              </span>
                              {item.isPremium ? (
                                <span className="rounded-full bg-amber-400 px-2 py-1 text-xs text-black">{tvn('bought.common.premium', 'Premium')}</span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    {!selectedBoughtDid ? (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
                        {tvn('bought.workspace.selectFromList', 'Select a bought DID from the list.')}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-2xl font-semibold text-white">{selectedBoughtDid.msisdn}</span>
                              <Badge variant="outline" className={`capitalize ${boughtDidStatusClass(selectedBoughtDid.status)}`}>
                                {boughtDidStatusLabel(selectedBoughtDid.status)}
                              </Badge>
                              {selectedBoughtDid.isPremium ? (
                                <Badge className="bg-amber-500 text-black hover:bg-amber-500">{tvn('bought.common.premium', 'Premium')}</Badge>
                              ) : null}
                            </div>
                            <div className="mt-1 text-sm text-slate-300">
                              {tvn('bought.workspace.countryWorkspace', '{country} DID Workspace', { country: selectedBoughtDid.countryCode })}
                            </div>
                          </div>
                          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[360px]">
                            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3"><div className="text-slate-400">{tvn('bought.workspace.monthly', 'Monthly')}</div><div className="mt-1 font-semibold text-white">{formatUsd(selectedBoughtDid.monthlyFee)}</div></div>
                            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3"><div className="text-slate-400">SMS</div><div className="mt-1 font-semibold text-white">{formatUsd((selectedBoughtDid as any).smsFee ?? selectedBoughtDid.outboundFee)}</div></div>
                            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3"><div className="text-slate-400">{tvn('bought.workspace.voice', 'Voice')}</div><div className="mt-1 font-semibold text-white">{formatUsd((selectedBoughtDid as any).voiceFee ?? selectedBoughtDid.outboundFee)}</div></div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-teal-300/15 bg-teal-400/10 p-4">
                          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                            <div className="space-y-2">
                              <Label className="text-teal-50">{tvn('bought.assignment.assignTo', 'Assign To User / Reseller / Agent')}</Label>
                              <Select
                                value={selectedBoughtRow?.assignedUserId || '__unassigned__'}
                                onValueChange={(value) =>
                                  setInventoryRow(selectedBoughtDid.id, {
                                    assignedUserId: value === '__unassigned__' ? null : value,
                                  })
                                }
                              >
                                <SelectTrigger className="border-teal-300/20 bg-[#071b35] text-white">
                                  <SelectValue placeholder={tvn('bought.assignment.selectAccount', 'Select account')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__unassigned__">{tvn('bought.common.unassigned', 'Unassigned')}</SelectItem>
                                  {assignableUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.fullName || user.email || user.id} ({user.role || 'customer'})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              className="bg-teal-500 text-slate-950 hover:bg-teal-400"
                              onClick={() =>
                                updateInventoryMutation.mutate({
                                  id: selectedBoughtDid.id,
                                  row: {
                                    ...(selectedBoughtRow || {}),
                                    assignedUserId: selectedBoughtRow?.assignedUserId || null,
                                    status: selectedBoughtRow?.assignedUserId ? 'assigned' : 'available',
                                  } as InventoryRowState & { status?: string },
                                })
                              }
                              disabled={updateInventoryMutation.isPending}
                            >
                              {updateInventoryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                              {tvn('bought.assignment.saveAssignment', 'Save Assignment')}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                              onClick={() => {
                                setInventoryRow(selectedBoughtDid.id, { assignedUserId: null });
                                updateInventoryMutation.mutate({
                                  id: selectedBoughtDid.id,
                                  row: {
                                    ...(selectedBoughtRow || {}),
                                    assignedUserId: null,
                                    status: 'available',
                                  } as InventoryRowState & { status?: string },
                                });
                              }}
                              disabled={updateInventoryMutation.isPending || !selectedBoughtDid.assignedUserId}
                            >
                              {tvn('bought.assignment.unassign', 'Unassign')}
                            </Button>
                          </div>
                          <div className="mt-2 text-xs text-teal-50/75">
                            {tvn('bought.assignment.currentAssignment', 'Current assignment: {account}', {
                              account: selectedBoughtDid.assignedUserId
                                ? (assignableUserMap.get(selectedBoughtDid.assignedUserId)?.label || selectedBoughtDid.assignedUserId)
                                : tvn('bought.common.unassigned', 'Unassigned'),
                            })}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-white p-4 text-slate-950">
                          {boughtDidWorkspaceQuery.isFetching ? (
                            <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {tvn('bought.workspace.loading', 'Loading DID workspace...')}
                            </div>
                          ) : boughtDidWorkspaceQuery.isError ? (
                            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                              {boughtDidWorkspaceQuery.error instanceof Error
                                ? boughtDidWorkspaceQuery.error.message
                                : tvn('bought.workspace.loadFailed', 'Could not load workspace.')}
                            </div>
                          ) : null}
                          {boughtSelectedNumber ? (
                            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                                <div>
                                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sender ID Approval</div>
                                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                                    <Badge variant="outline" className="capitalize">
                                      {boughtSelectedNumber.senderId?.status || 'none'}
                                    </Badge>
                                    {boughtSelectedNumber.senderId?.requested ? (
                                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                        Requested: {boughtSelectedNumber.senderId.requested}
                                      </Badge>
                                    ) : null}
                                    {Array.from(
                                      new Map(
                                        [
                                          ...(boughtSelectedNumber.senderId?.approvedList || []),
                                          boughtSelectedNumber.senderId?.approved || '',
                                        ]
                                          .map((sender) => sender.trim())
                                          .filter(Boolean)
                                          .map((sender) => [sender.toLowerCase(), sender]),
                                      ).values(),
                                    ).map((sender) => (
                                      <Badge key={sender} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                        Approved: {sender}
                                      </Badge>
                                    ))}
                                  </div>
                                  <p className="mt-2 text-xs text-slate-500">
                                    Approved Sender IDs are used for EasySendSMS outbound SMS from this eRoaming number.
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                    onClick={() => reviewSenderIdMutation.mutate('approve')}
                                    disabled={reviewSenderIdMutation.isPending || !boughtSelectedNumber.senderId?.requested}
                                  >
                                    {reviewSenderIdMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Approve
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                    onClick={() => reviewSenderIdMutation.mutate('reject')}
                                    disabled={reviewSenderIdMutation.isPending || !boughtSelectedNumber.senderId?.requested}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                          <Tabs defaultValue="sending" className="space-y-5">
                            <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
                              <TabsTrigger value="sending" className="rounded-md px-4 py-2 text-slate-400 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg"><Send className="mr-2 h-4 w-4" />{tvn('bought.tabs.sendingSms', 'Sending SMS')}</TabsTrigger>
                              <TabsTrigger value="receiving" className="rounded-md px-4 py-2 text-slate-400 data-[state=active]:bg-violet-600 data-[state=active]:text-white"><Inbox className="mr-2 h-4 w-4" />{tvn('bought.tabs.receivingSms', 'Receiving SMS')}</TabsTrigger>
                              <TabsTrigger value="calls" className="rounded-md px-4 py-2 text-slate-400 data-[state=active]:bg-violet-600 data-[state=active]:text-white"><PhoneCall className="mr-2 h-4 w-4" />{tvn('bought.tabs.outgoingCalls', 'Outgoing Calls')}</TabsTrigger>
                              <TabsTrigger value="voicemail" className="rounded-md px-4 py-2 text-slate-400 data-[state=active]:bg-violet-600 data-[state=active]:text-white"><Headphones className="mr-2 h-4 w-4" />{tvn('bought.tabs.voiceMail', 'Voice Mail')}</TabsTrigger>
                            </TabsList>

                            <TabsContent value="sending">
                              <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
                                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  <div className="space-y-2"><Label>{tvn('bought.sms.toNumber', 'To Number *')}</Label><Input value={boughtSendTo} onChange={(event) => setBoughtSendTo(event.target.value)} placeholder="+14155550123" className="border-slate-300 bg-[#2c344a] text-white placeholder:text-slate-400" /></div>
                                  <div className="space-y-2"><Label>{tvn('bought.sms.message', 'Message *')}</Label><Textarea value={boughtMessageText} onChange={(event) => setBoughtMessageText(event.target.value)} rows={6} className="border-slate-300 bg-[#2c344a] text-white placeholder:text-slate-400" /></div>
                                  <Button className="w-full bg-violet-600 text-white hover:bg-violet-700" onClick={() => sendBoughtDidSmsMutation.mutate()} disabled={sendBoughtDidSmsMutation.isPending || !selectedBoughtDidIsActive || !boughtSendTo.trim() || !boughtMessageText.trim()}>
                                    {sendBoughtDidSmsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{tvn('bought.sms.sendFromDid', 'Send SMS From This DID')}
                                  </Button>
                                  {!selectedBoughtDidIsActive ? <div className="text-sm text-amber-700">{tvn('bought.sms.assignBeforeSending', 'Assign this DID to a user, reseller, or agent before sending SMS.')}</div> : null}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="mb-3 font-semibold">{tvn('bought.sms.recentSent', 'Recent Sent SMS')}</h3>
                                  <div className="overflow-x-auto">
                                    <Table><TableHeader><TableRow><TableHead>{tvn('bought.table.time', 'Time')}</TableHead><TableHead>{tvn('bought.table.from', 'From')}</TableHead><TableHead>{tvn('bought.table.to', 'To')}</TableHead><TableHead>{tvn('bought.table.message', 'Message')}</TableHead><TableHead>{tvn('common.status', 'Status')}</TableHead></TableRow></TableHeader><TableBody>
                                      {boughtOutboundMessages.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="py-8 text-center font-medium">{tvn('bought.sms.noSent', 'No sent SMS found for this DID.')}</TableCell></TableRow>
                                      ) : boughtOutboundMessages.map((message) => (
                                        <TableRow key={message.id}><TableCell className="whitespace-nowrap text-xs">{formatAdminDate(message.createdAt)}</TableCell><TableCell>{message.fromNumber}</TableCell><TableCell>{message.toNumber}</TableCell><TableCell className="max-w-[360px] truncate">{message.text}</TableCell><TableCell className="capitalize">{message.status}</TableCell></TableRow>
                                      ))}
                                    </TableBody></Table>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="receiving">
                              <div className="overflow-x-auto">
                                <Table><TableHeader><TableRow><TableHead>{tvn('bought.table.time', 'Time')}</TableHead><TableHead>{tvn('bought.table.from', 'From')}</TableHead><TableHead>{tvn('bought.table.to', 'To')}</TableHead><TableHead>{tvn('bought.table.message', 'Message')}</TableHead><TableHead>{tvn('common.status', 'Status')}</TableHead></TableRow></TableHeader><TableBody>
                                  {boughtInboundMessages.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="py-8 text-center font-medium">{tvn('bought.sms.noReceived', 'No received SMS found for this DID.')}</TableCell></TableRow>
                                  ) : boughtInboundMessages.map((message) => (
                                    <TableRow key={message.id}><TableCell className="whitespace-nowrap text-xs">{formatAdminDate(message.createdAt)}</TableCell><TableCell>{message.fromNumber}</TableCell><TableCell>{message.toNumber}</TableCell><TableCell className="max-w-[520px] truncate">{message.text}</TableCell><TableCell className="capitalize">{message.status}</TableCell></TableRow>
                                  ))}
                                </TableBody></Table>
                              </div>
                            </TabsContent>

                            <TabsContent value="calls">
                              <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
                                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  <div className="space-y-2">
                                    <Label>{tvn('bought.calls.callType', 'Call Type *')}</Label>
                                    <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
                                      <button
                                        type="button"
                                        className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition ${boughtCallType === 'international' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'}`}
                                        onClick={() => setBoughtCallType('international')}
                                      >
                                        <Globe className="h-4 w-4" />
                                        {tvn('bought.calls.international', 'International')}
                                      </button>
                                      <button
                                        type="button"
                                        className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition ${boughtCallType === 'sip' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'}`}
                                        onClick={() => setBoughtCallType('sip')}
                                      >
                                        <Server className="h-4 w-4" />
                                        SIP
                                      </button>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{tvn('bought.calls.dialDestination', 'Dial Destination *')}</Label>
                                    <Input
                                      value={boughtDialNumber}
                                      onChange={(event) => setBoughtDialNumber(event.target.value)}
                                      placeholder={boughtCallType === 'sip' ? 'sip:user@example.com' : '+442071234567'}
                                      className="border-slate-300 bg-[#2c344a] text-white placeholder:text-slate-400"
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '0', '#', '*'].map((digit) => (
                                      <Button
                                        key={digit}
                                        type="button"
                                        variant="outline"
                                        className="h-9 border-slate-200 bg-white text-slate-950 hover:bg-slate-100"
                                        onClick={() => setBoughtDialNumber((current) => `${current}${digit}`)}
                                      >
                                        {digit}
                                      </Button>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-9 border-slate-200 bg-white text-slate-950 hover:bg-slate-100"
                                      onClick={() => setBoughtDialNumber((current) => current.slice(0, -1))}
                                    >
                                      <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-9 border-slate-200 bg-white text-slate-950 hover:bg-slate-100"
                                      onClick={() => setBoughtDialNumber('')}
                                    >
                                      X
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{tvn('bought.calls.spokenMessage', 'Spoken Message *')}</Label>
                                    <Textarea
                                      value={boughtSpokenMessage}
                                      onChange={(event) => setBoughtSpokenMessage(event.target.value)}
                                      rows={5}
                                      className="border-slate-300 bg-[#2c344a] text-white placeholder:text-slate-400"
                                    />
                                  </div>
                                  <Button className="w-full bg-teal-300 text-slate-950 hover:bg-teal-400" onClick={() => startBoughtDidCallMutation.mutate()} disabled={startBoughtDidCallMutation.isPending || !selectedBoughtDidIsActive || !boughtDialNumber.trim() || !boughtSpokenMessage.trim()}>
                                    {startBoughtDidCallMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PhoneCall className="mr-2 h-4 w-4" />}{tvn('bought.calls.startOutgoingCall', 'Start Outgoing Call')}
                                  </Button>
                                  {!selectedBoughtDidIsActive ? <div className="text-sm text-amber-700">{tvn('bought.calls.assignBeforeCalling', 'Assign this DID before starting outgoing calls.')}</div> : null}
                                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
                                    {tvn('bought.calls.status', 'Status:')} <span className="font-semibold text-slate-950">{boughtCallStatusLabel(boughtCallStatus)}</span>
                                  </div>
                                </div>
                                <div className="overflow-x-auto">
                                  <h3 className="mb-3 font-semibold">{tvn('bought.calls.history', 'Outgoing Call History')}</h3>
                                  <Table><TableHeader><TableRow><TableHead>{tvn('bought.table.time', 'Time')}</TableHead><TableHead>{tvn('bought.table.from', 'From')}</TableHead><TableHead>{tvn('bought.table.to', 'To')}</TableHead><TableHead>{tvn('bought.table.message', 'Message')}</TableHead><TableHead>{tvn('common.status', 'Status')}</TableHead><TableHead>{tvn('common.provider', 'Provider')}</TableHead></TableRow></TableHeader><TableBody>
                                    {boughtVoiceCalls.length === 0 ? (
                                      <TableRow><TableCell colSpan={6} className="py-8 text-center font-medium">{tvn('bought.calls.noOutgoing', 'No outgoing calls found for this DID.')}</TableCell></TableRow>
                                    ) : boughtVoiceCalls.map((call) => (
                                      <TableRow key={call.id}>
                                        <TableCell className="whitespace-nowrap text-xs">{formatAdminDate(call.createdAt)}</TableCell>
                                        <TableCell>{call.fromNumber}</TableCell>
                                        <TableCell>{call.toNumber}</TableCell>
                                        <TableCell className="max-w-[360px] truncate">{call.metadata?.spokenMessage || call.metadata?.message || '-'}</TableCell>
                                        <TableCell className="capitalize">{call.status.replace(/_/g, ' ')}</TableCell>
                                        <TableCell className="capitalize">{call.provider || 'vonage'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody></Table>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="voicemail">
                              {boughtVoicemails.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center font-medium">{tvn('bought.voicemail.noVoiceMail', 'No Voice Mail found for this DID.')}</div>
                              ) : (
                                <div className="space-y-3">
                                  {boughtVoicemails.map((voicemail) => (
                                    <div key={voicemail.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{tvn('bought.table.fromNumber', 'From {number}', { number: voicemail.fromNumber })}</div><div className="mt-1 text-xs text-slate-500">{formatAdminDate(voicemail.createdAt)}</div></div><Badge variant="outline" className="capitalize">{voicemail.status}</Badge></div>
                                      <div className="mt-3 text-sm text-slate-600">{tvn('bought.voicemail.duration', 'Duration: {seconds}s', { seconds: voicemail.durationSeconds || 0 })}</div>
                                      {voicemail.recordingUrl ? <a href={voicemail.recordingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-md bg-[#071b35] px-3 py-2 text-sm font-medium text-white hover:bg-[#0b2748]">{tvn('bought.voicemail.openRecording', 'Open Recording')}</a> : null}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {section === 'dashboard' && (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" />Projected Monthly Revenue</div><div className="mt-2 text-2xl font-semibold">{formatUsd(String(estimatedMonthlyRevenue))}</div></CardContent></Card>
            <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" />Projected Monthly Cost</div><div className="mt-2 text-2xl font-semibold">{formatUsd(String(estimatedMonthlyCost))}</div></CardContent></Card>
            <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><BarChart3 className="h-4 w-4" />Projected Profit</div><div className="mt-2 text-2xl font-semibold">{formatUsd(String(totalProjectedProfit))}</div></CardContent></Card>
            <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Star className="h-4 w-4" />Premium Inventory Share</div><div className="mt-2 text-2xl font-semibold">{data.summary.totalInventory ? `${Math.round((data.summary.premiumInventory / data.summary.totalInventory) * 100)}%` : '0%'}</div></CardContent></Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Profit Snapshot</CardTitle>
                <CardDescription>Revenue and margin view for all inventory and active numbers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Total setup revenue</span><span className="font-medium">{formatUsd(String(totalSetupRevenue))}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Total setup cost</span><span className="font-medium">{formatUsd(String(totalSetupCost))}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Active monthly revenue</span><span className="font-medium">{formatUsd(String(activeMonthlyRevenue))}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Active monthly cost</span><span className="font-medium">{formatUsd(String(activeMonthlyCost))}</span></div>
                <div className="flex items-center justify-between border-t pt-3 text-sm"><span className="font-medium">Active monthly profit</span><span className="font-semibold">{formatUsd(String(activeProjectedProfit))}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Countries</CardTitle>
                <CardDescription>Countries with the most owned eRoaming's.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topCountries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No country stats yet.</p>
                ) : topCountries.map(([code, count]) => (
                  <div key={code} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{code}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Manual Work Queue</CardTitle>
                <CardDescription>Pending requests and available stock at a glance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Pending requests</span><span className="font-medium">{pendingApplications.length}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Available inventory</span><span className="font-medium">{availableInventory.length}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Active numbers</span><span className="font-medium">{realActiveNumbers.length}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Auto assign</span><span className="font-medium">{data.autoAssign ? 'Enabled' : 'Manual'}</span></div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {(section === 'dashboard' || section === 'cost-price') && (
      <Card className={section === 'cost-price' ? 'overflow-hidden border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.95)]' : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            {tvn('costPrice.currentFees.title', 'Current Default Selling Fees')}
          </CardTitle>
          <CardDescription>
            {tvn('costPrice.currentFees.description', 'These come from the Vonage settings tab and act as your default selling prices.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          {[
            { key: 'setupPrice', label: tvn('costPrice.currentFees.setupPrice', 'Setup price'), value: data.settings.pricing.setupFee, tone: 'from-cyan-500/15 to-teal-500/10' },
            { key: 'monthlyPrice', label: tvn('costPrice.currentFees.monthlyPrice', 'Monthly price'), value: data.settings.pricing.monthlyFee, tone: 'from-emerald-500/15 to-lime-500/10' },
            { key: 'inboundPrice', label: tvn('costPrice.currentFees.inboundPrice', 'Inbound price'), value: data.settings.pricing.inboundFee, tone: 'from-violet-500/15 to-fuchsia-500/10' },
            { key: 'outboundPrice', label: tvn('costPrice.currentFees.outboundPrice', 'Outbound price'), value: data.settings.pricing.outboundFee, tone: 'from-amber-500/15 to-orange-500/10' },
            { key: 'premiumSetup', label: tvn('costPrice.currentFees.premiumSetup', 'Premium setup'), value: data.settings.pricing.premiumSetupFee, tone: 'from-sky-500/15 to-indigo-500/10' },
            { key: 'premiumMonthly', label: tvn('costPrice.currentFees.premiumMonthly', 'Premium monthly'), value: data.settings.pricing.premiumMonthlyFee, tone: 'from-pink-500/15 to-rose-500/10' },
            { key: 'premiumInbound', label: tvn('costPrice.currentFees.premiumInbound', 'Premium inbound'), value: data.settings.pricing.premiumInboundFee, tone: 'from-teal-500/15 to-cyan-500/10' },
            { key: 'premiumOutbound', label: tvn('costPrice.currentFees.premiumOutbound', 'Premium outbound'), value: data.settings.pricing.premiumOutboundFee, tone: 'from-yellow-500/15 to-amber-500/10' },
          ].map((metric) => (
            <div key={metric.key} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${metric.tone} p-4 backdrop-blur`}>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-300">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold text-white">${metric.value}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      )}

      {section === 'cost-price' && (
      <Card className="overflow-hidden border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.95)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {tvn('costPrice.packageRates.title', 'Number Package Rates')}
          </CardTitle>
          <CardDescription>
            {tvn('costPrice.packageRates.description', 'Configure the package prices shown when buying a virtual number into inventory.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-emerald-200">{tvn('costPrice.packageRates.standard1Month', 'Standard 1 Month')}</div>
              <div className="mt-2 text-2xl font-semibold text-white">${formatMoney(standardPackageMonth)}</div>
              <div className="mt-1 text-sm text-emerald-100/80">{tvn('costPrice.packageRates.standard1MonthDescription', 'Default quick-buy monthly package')}</div>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">{tvn('costPrice.packageRates.standard1Year', 'Standard 1 Year')}</div>
              <div className="mt-2 text-2xl font-semibold text-white">${formatMoney(standardPackageYear)}</div>
              <div className="mt-1 text-sm text-cyan-100/80">{tvn('costPrice.packageRates.standard1YearDescription', 'Best value annual standard plan')}</div>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-amber-200">{tvn('costPrice.packageRates.premium1Month', 'Premium 1 Month')}</div>
              <div className="mt-2 text-2xl font-semibold text-white">${formatMoney(premiumPackageMonth)}</div>
              <div className="mt-1 text-sm text-amber-100/80">{tvn('costPrice.packageRates.premium1MonthDescription', 'Short-term premium number access')}</div>
            </div>
            <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-fuchsia-200">{tvn('costPrice.packageRates.premium1Year', 'Premium 1 Year')}</div>
              <div className="mt-2 text-2xl font-semibold text-white">${formatMoney(premiumPackageYear)}</div>
              <div className="mt-1 text-sm text-fuchsia-100/80">{tvn('costPrice.packageRates.premium1YearDescription', 'Long-term premium number package')}</div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/12 via-slate-900 to-slate-950 p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-emerald-200">{tvn('costPrice.packageRates.standardPackages', 'Standard Number Packages')}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{tvn('costPrice.packageRates.standardPackagesTitle', 'Everyday virtual number pricing')}</div>
                  <div className="mt-1 text-sm text-slate-300">{tvn('costPrice.packageRates.standardPackagesDescription', 'Use these as the buy flow package options for standard numbers.')}</div>
                </div>
                <div className="rounded-2xl bg-emerald-400/15 p-3">
                  <Package className="h-5 w-5 text-emerald-200" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{tvn('costPrice.packageRates.oneMonthPackage', '1 Month Package')}</Label>
                  <Input
                    value={packageRates.standardMonthPackagePrice}
                    onChange={(e) => setPackageRates((current) => ({ ...current, standardMonthPackagePrice: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tvn('costPrice.packageRates.oneYearPackage', '1 Year Package')}</Label>
                  <Input
                    value={packageRates.standardYearPackagePrice}
                    onChange={(e) => setPackageRates((current) => ({ ...current, standardYearPackagePrice: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/12 via-slate-900 to-slate-950 p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-amber-200">{tvn('costPrice.packageRates.premiumPackages', 'Premium Number Packages')}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{tvn('costPrice.packageRates.premiumPackagesTitle', 'Vanity and premium inventory pricing')}</div>
                  <div className="mt-1 text-sm text-slate-300">{tvn('costPrice.packageRates.premiumPackagesDescription', "Set the higher package values shown for premium eRoaming's.")}</div>
                </div>
                <div className="rounded-2xl bg-amber-400/15 p-3">
                  <Star className="h-5 w-5 text-amber-200" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{tvn('costPrice.packageRates.oneMonthPackage', '1 Month Package')}</Label>
                  <Input
                    value={packageRates.premiumMonthPackagePrice}
                    onChange={(e) => setPackageRates((current) => ({ ...current, premiumMonthPackagePrice: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tvn('costPrice.packageRates.oneYearPackage', '1 Year Package')}</Label>
                  <Input
                    value={packageRates.premiumYearPackagePrice}
                    onChange={(e) => setPackageRates((current) => ({ ...current, premiumYearPackagePrice: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                {tvn('costPrice.packageRates.saveNote', 'Package rates are saved together with the main Vonage pricing settings.')}
              </div>
              <Button onClick={() => savePackageRatesMutation.mutate(packageRates)} disabled={savePackageRatesMutation.isPending}>
                {savePackageRatesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tvn('costPrice.packageRates.saveButton', 'Save Package Rates')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {section === 'numbers' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="overflow-hidden border-emerald-400/15 bg-gradient-to-br from-emerald-500/12 via-slate-950 to-slate-900 text-slate-50 shadow-[0_24px_80px_-36px_rgba(16,185,129,0.55)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-100">
                {tvn('numbers.stats.availableCountries', 'Available Countries')}
              </CardTitle>
              <div className="rounded-2xl bg-emerald-400/15 p-2">
                <Server className="h-4 w-4 text-emerald-200" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white">{didCountryTotals.filteredCountries}</div>
              <div className="mt-1 text-sm text-emerald-100/75">
                {tvn('numbers.stats.showingSyncedCountries', 'Showing From {count} Synced Countries', {
                  count: didCountryTotals.totalCountries,
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-cyan-400/15 bg-gradient-to-br from-cyan-500/12 via-slate-950 to-slate-900 text-slate-50 shadow-[0_24px_80px_-36px_rgba(6,182,212,0.45)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-cyan-100">
                {tvn('numbers.stats.countriesWithDid', 'Countries With DID')}
              </CardTitle>
              <div className="rounded-2xl bg-cyan-400/15 p-2">
                <Phone className="h-4 w-4 text-cyan-200" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white">{didCountryTotals.countriesWithDid}</div>
              <div className="mt-1 text-sm text-cyan-100/75">
                {tvn('numbers.stats.countriesWithDidDescription', 'Destinations Ready For DID Ordering And Assignment')}
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-amber-400/15 bg-gradient-to-br from-amber-500/12 via-slate-950 to-slate-900 text-slate-50 shadow-[0_24px_80px_-36px_rgba(245,158,11,0.45)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-100">{didTotalLabel}</CardTitle>
              <div className="rounded-2xl bg-amber-400/15 p-2">
                <ShoppingCart className="h-4 w-4 text-amber-200" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white">{didCountryTotals.totalAvailable}</div>
              <div className="mt-1 text-sm text-amber-100/75">{didTotalDescription}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-fuchsia-400/15 bg-gradient-to-br from-fuchsia-500/12 via-slate-950 to-slate-900 text-slate-50 shadow-[0_24px_80px_-36px_rgba(217,70,239,0.45)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-fuchsia-100">
                {tvn('numbers.stats.buyReadyDidCount', 'Buy Ready DID Count')}
              </CardTitle>
              <div className="rounded-2xl bg-fuchsia-400/15 p-2">
                <Star className="h-4 w-4 text-fuchsia-200" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white">{didCountryTotals.totalBuyReady}</div>
              <div className="mt-1 text-sm text-fuchsia-100/75">
                {tvn('numbers.stats.buyReadyDescription', 'Numbers Ready To Move Into Pricing And Assignment Flow')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {section === 'numbers' && (
        <Card className="order-3 overflow-hidden border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.95)]">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-cyan-200">
                {tvn('numbers.catalog.eyebrow', 'Vonage DID Catalog')}
              </div>
              <CardTitle className="mt-2 text-3xl font-semibold text-white">
                {tvn('numbers.catalog.title', 'DID Countries Management')}
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-slate-300">
                {tvn(
                  'numbers.catalog.description',
                  'Browse All Supported Countries First, See Live DID Availability From Vonage, Then Manage Pricing, Fetch Numbers, Or Jump To Assignment.',
                )}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Popover open={didSyncCountryPickerOpen} onOpenChange={setDidSyncCountryPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-[220px] justify-between border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 hover:text-cyan-50"
                  >
                    <span className="truncate">{didSyncCountryLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="end">
                  <Command shouldFilter={false} className={darkCommandMenuClass}>
                    <CommandInput
                      placeholder={tvn('numbers.catalog.searchDidCountries', 'Search DID countries')}
                      value={countrySearch}
                      onValueChange={setCountrySearch}
                    />
                    <CommandList>
                      <CommandItem
                        className={darkCommandItemClass}
                        value="all-did-countries"
                        onSelect={() => {
                          setDidSyncAllCountries(true);
                          setDidSyncCountryCodes([]);
                        }}
                      >
                        <Check className={`h-4 w-4 ${didSyncAllCountries ? 'opacity-100' : 'opacity-0'}`} />
                        <span>{tvn('common.allDidCountries', 'All DID Countries')}</span>
                      </CommandItem>
                      <CommandGroup heading={tvn('providers.countries', 'Countries')}>
                        {filteredCountryOptions.map((country) => (
                          <CommandItem className={darkCommandItemClass} key={`numbers-sync-${country.code}`} value={country.label} onSelect={() => toggleSyncCountry(country.code)}>
                            <Check className={`h-4 w-4 ${didSyncCountryCodes.includes(country.code) && !didSyncAllCountries ? 'opacity-100' : 'opacity-0'}`} />
                            <span>{country.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                className="bg-teal-500 text-slate-950 hover:bg-teal-400"
                onClick={() => syncProviderDidsMutation.mutate(selectedERoamingProvider.slug)}
                disabled={syncProviderDidsMutation.isPending || !data?.hasCredentials}
              >
                {syncProviderDidsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {tvn('dashboard.providerControl.syncDids', "Sync DID's")}
              </Button>
              {selectedERoamingProvider.slug === 'vonage' && (
                <Button
                  type="button"
                  className="bg-[#071b35] text-white hover:bg-[#0b2748]"
                  onClick={() => syncOwnedDidsMutation.mutate(selectedERoamingProvider.slug)}
                  disabled={syncOwnedDidsMutation.isPending || !data?.hasCredentials}
                >
                  {syncOwnedDidsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                  {tvn('dashboard.providerControl.syncBoughtDids', "Sync Bought DID's")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!data?.hasCredentials ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
                {tvn('numbers.catalog.missingCredentials', 'Add the Vonage API key and secret first to load live DID counts by country.')}
              </div>
            ) : didCountryCatalogQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tvn('numbers.catalog.loading', 'Loading live DID country availability from Vonage...')}
              </div>
            ) : didCountryCatalogQuery.isError ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
                {didCountryCatalogQuery.error instanceof Error
                  ? didCountryCatalogQuery.error.message
                  : tvn('numbers.catalog.couldNotLoad', 'Could not load DID countries.')}
              </div>
            ) : (
              <div className="space-y-4">
                {didStatsPartial ? (
                  <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
                    {tvn(
                      'numbers.catalog.partialWarning',
                      "This is a partial DID total. Vonage returned data for {successful} of {requested} countries, so the real total can be higher than {total}. Use Sync DID's for a full live refresh when the provider is not rate-limiting.",
                      {
                        successful: didCountryScan?.successfulCountries ?? didCountryTotals.filteredCountries,
                        requested: didCountryScan?.requestedCountries ?? didCountryTotals.totalCountries,
                        total: didCountryTotals.totalAvailable,
                      },
                    )}
                  </div>
                ) : null}
                <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid gap-3 sm:grid-cols-2 lg:w-auto xl:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-slate-200">{tvn('numbers.catalog.countrySearch', 'Country Search')}</Label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={didCountryStatsSearch}
                          onChange={(event) => setDidCountryStatsSearch(event.target.value)}
                          placeholder={tvn('numbers.catalog.countryNameOrCode', 'Country Name Or Code')}
                          className="w-full min-w-[240px] border-white/10 bg-slate-950/70 pl-9 text-slate-100 placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200">{tvn('numbers.catalog.didFilter', 'DID Filter')}</Label>
                      <Select value={countryDidFilter} onValueChange={(value: DidAvailabilityFilter) => setCountryDidFilter(value)}>
                        <SelectTrigger className="w-full min-w-[220px] border-white/10 bg-slate-950/70 text-slate-100">
                          <SelectValue placeholder={tvn('numbers.catalog.filterByDid', 'Filter by DID')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{tvn('numbers.common.allCountries', 'All Countries')}</SelectItem>
                          <SelectItem value="with_did">{tvn('numbers.catalog.withDid', 'With DID')}</SelectItem>
                          <SelectItem value="without_did">{tvn('numbers.catalog.withoutDid', 'Without DID')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200">{tvn('numbers.catalog.priceFilter', 'Price Filter')}</Label>
                      <Select value={countryPriceSort} onValueChange={(value: DidPriceSortMode) => setCountryPriceSort(value)}>
                        <SelectTrigger className="w-full min-w-[240px] border-white/10 bg-slate-950/70 text-slate-100">
                          <SelectValue placeholder={tvn('numbers.catalog.sortCountries', 'Sort countries')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">{tvn('numbers.search.defaultSort', 'Default Sort')}</SelectItem>
                          <SelectItem value="price_low_high">{tvn('numbers.search.lowerPriceToHigher', 'Lower Price To Higher Price')}</SelectItem>
                          <SelectItem value="price_high_low">{tvn('numbers.search.higherPriceToLower', 'Higher Price To Lower Price')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 hover:text-cyan-50"
                    onClick={() => didCountryCatalogQuery.refetch()}
                    disabled={didCountryCatalogQuery.isFetching || !data?.hasCredentials}
                  >
                    {didCountryCatalogQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {tvn('numbers.catalog.refreshDidAvailability', 'Refresh DID Availability')}
                  </Button>
                </div>
                <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr_0.8fr_1.2fr]">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                      {tvn('numbers.catalog.filteredDidStatistics', 'Filtered DID Statistics')}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-slate-400">{tvn('providers.countries', 'Countries')}</div>
                        <div className="mt-1 text-2xl font-semibold text-white">{didCountryTotals.filteredCountries}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">{tvn('numbers.catalog.withDid', 'With DID')}</div>
                        <div className="mt-1 text-2xl font-semibold text-white">{didCountryTotals.countriesWithDid}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">
                          {didStatsPartial
                            ? tvn('numbers.stats.loadedDid', 'Loaded DID')
                            : tvn('numbers.stats.availableDid', 'Available DID')}
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-white">{didCountryTotals.totalAvailable}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">{tvn('numbers.stats.buyReady', 'Buy Ready')}</div>
                        <div className="mt-1 text-2xl font-semibold text-white">{didCountryTotals.totalBuyReady}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-rose-400/15 bg-rose-400/10 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-rose-200">
                      {tvn('numbers.catalog.noDidCountries', 'No DID Countries')}
                    </div>
                    <div className="mt-3 text-4xl font-semibold text-white">{didCountryTotals.countriesWithoutDid}</div>
                    <div className="mt-2 text-sm text-rose-100/75">
                      {tvn(
                        'numbers.catalog.noDidCountriesDescription',
                        'Countries currently returning zero available DID numbers for the selected feature/type.',
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-400/15 bg-amber-400/10 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-amber-200">
                      {tvn('numbers.catalog.providerErrors', 'Provider Errors')}
                    </div>
                    <div className="mt-3 text-4xl font-semibold text-white">{didCountryTotals.countriesErrored}</div>
                    <div className="mt-2 text-sm text-amber-100/75">
                      {tvn('numbers.catalog.providerErrorsDescription', 'Rate-limited or failed lookups. These are not counted as zero DID countries.')}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-emerald-200">
                      {tvn('numbers.catalog.topDidCountries', 'Top DID Countries')}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {topDidCountries.length === 0 ? (
                        <div className="text-sm text-emerald-100/75">
                          {tvn('numbers.catalog.noAvailableDidMatch', 'No Available DID Countries Match The Current Filter.')}
                        </div>
                      ) : (
                        topDidCountries.map((item) => {
                          const countryLabel = countryOptions.find((country) => country.code === item.countryCode)?.name || item.countryCode;
                          return (
                            <div key={`top-did-${item.countryCode}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm">
                              <span className="truncate text-slate-100">{countryLabel}</span>
                              <span className="font-semibold text-emerald-200">{item.availableCount}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-white">
                        {tvn('numbers.catalog.bulkCountrySellingRates', 'Bulk Country Selling Rates')}
                      </div>
                      <div className="text-sm text-slate-300">
                        {tvn(
                          'numbers.catalog.bulkCountrySellingRatesDescription',
                          'Apply one setup/monthly price set for all listed countries. Margin (%) is used as automatic markup when a price field is left blank.',
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="bg-teal-500 text-slate-950 hover:bg-teal-400"
                      onClick={() => bulkCountryRatesMutation.mutate()}
                      disabled={bulkCountryRatesMutation.isPending || filteredDidCountryCatalog.length === 0}
                    >
                      {bulkCountryRatesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {tvn('numbers.catalog.saveBulkCountryRates', 'Save Bulk Country Rates')}
                    </Button>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-4">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-cyan-100">{tvn('numbers.catalog.setupPrice', 'Setup Price')}</div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">{tvn('numbers.catalog.retailUsd', 'Retail ($)')}</Label>
                        <Input className="border-white/10 bg-slate-950/70 text-slate-100" value={bulkCountryRates.setupRetailPrice} onChange={(e) => setBulkCountryRates((current) => ({ ...current, setupRetailPrice: e.target.value }))} placeholder={tvn('numbers.catalog.keepByMargin', '$ Keep by margin')} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">{tvn('numbers.catalog.resellerUsd', 'Reseller ($)')}</Label>
                        <Input className="border-white/10 bg-slate-950/70 text-slate-100" value={bulkCountryRates.setupResellerPrice} onChange={(e) => setBulkCountryRates((current) => ({ ...current, setupResellerPrice: e.target.value }))} placeholder={tvn('numbers.catalog.keepByMargin', '$ Keep by margin')} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">{tvn('numbers.catalog.agentUsd', 'Agent ($)')}</Label>
                        <Input className="border-white/10 bg-slate-950/70 text-slate-100" value={bulkCountryRates.setupAgentPrice} onChange={(e) => setBulkCountryRates((current) => ({ ...current, setupAgentPrice: e.target.value }))} placeholder={tvn('numbers.catalog.keepByMargin', '$ Keep by margin')} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-emerald-100">{tvn('numbers.catalog.monthlyPrice', 'Monthly Price')}</div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">{tvn('numbers.catalog.retailUsd', 'Retail ($)')}</Label>
                        <Input className="border-white/10 bg-slate-950/70 text-slate-100" value={bulkCountryRates.monthlyRetailPrice} onChange={(e) => setBulkCountryRates((current) => ({ ...current, monthlyRetailPrice: e.target.value }))} placeholder={tvn('numbers.catalog.keepByMargin', '$ Keep by margin')} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">{tvn('numbers.catalog.resellerUsd', 'Reseller ($)')}</Label>
                        <Input className="border-white/10 bg-slate-950/70 text-slate-100" value={bulkCountryRates.monthlyResellerPrice} onChange={(e) => setBulkCountryRates((current) => ({ ...current, monthlyResellerPrice: e.target.value }))} placeholder={tvn('numbers.catalog.keepByMargin', '$ Keep by margin')} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">{tvn('numbers.catalog.agentUsd', 'Agent ($)')}</Label>
                        <Input className="border-white/10 bg-slate-950/70 text-slate-100" value={bulkCountryRates.monthlyAgentPrice} onChange={(e) => setBulkCountryRates((current) => ({ ...current, monthlyAgentPrice: e.target.value }))} placeholder={tvn('numbers.catalog.keepByMargin', '$ Keep by margin')} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-amber-100">{tvn('numbers.catalog.marginControl', 'Margin Control')}</div>
                      <div className="space-y-2">
                        <Label className="text-slate-200">{tvn('numbers.catalog.marginPercent', 'Margin (%)')}</Label>
                        <Input className="border-white/10 bg-slate-950/70 text-slate-100" value={bulkCountryRates.marginPercent} onChange={(e) => setBulkCountryRates((current) => ({ ...current, marginPercent: e.target.value }))} placeholder="20.00%" />
                      </div>
                      <div className="rounded-xl border border-dashed border-amber-300/20 bg-amber-400/10 p-3 text-xs text-amber-100/85">
                        {tvn(
                          'numbers.catalog.marginHelp',
                          'If a price field is empty, the system will use provider cost + margin (%). This helps avoid underpricing across all DID destinations.',
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="min-w-[220px]">{tvn('numbers.search.country', 'Country')}</TableHead>
                      <TableHead>{tvn('common.provider', 'Provider')}</TableHead>
                      <TableHead>{tvn('numbers.catalog.availability', 'Availability')}</TableHead>
                      <TableHead>{tvn('numbers.catalog.didDetails', 'DID Details')}</TableHead>
                      <TableHead>{tvn('providers.pricing', 'Pricing')}</TableHead>
                      <TableHead>{tvn('common.status', 'Status')}</TableHead>
                      <TableHead className="text-right">{tvn('numbers.catalog.manage', 'Manage')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDidCountryCatalog.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-400">
                          {tvn('numbers.catalog.noDidCountriesMatch', 'No DID Countries Match The Current Filter.')}
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredDidCountryCatalog.map((item, index) => {
                      const countryLabel = countryOptions.find((country) => country.code === item.countryCode)?.name || item.countryCode;
                      const pricingPlan = getCountryRatePlan(item.countryCode);
                      const liveMonthlyProviderCost = preferPositiveMoney(pricingPlan.monthly.providerCost, item.providerMonthlyCost);
                      const liveSetupProviderCost = preferPositiveMoney(pricingPlan.setup.providerCost, item.providerSetupCost);
                      const marginAmount =
                        (parseMoney(pricingPlan.monthly.retailPrice) ?? 0) - (parseMoney(liveMonthlyProviderCost) ?? 0);
                      const marginPercent =
                        (parseMoney(liveMonthlyProviderCost) ?? 0) > 0
                          ? (marginAmount / (parseMoney(liveMonthlyProviderCost) ?? 1)) * 100
                          : 0;

                      return (
                        <TableRow key={`country-catalog-${item.countryCode}`}>
                          <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 font-semibold">
                                <Server className="h-4 w-4 text-primary" />
                                <span>{countryLabel}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">{item.countryCode}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Vonage</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5">
                              {item.error ? (
                                <>
                                  <div className="text-sm font-semibold text-rose-200">{tvn('numbers.catalog.lookupFailed', 'Lookup failed')}</div>
                                  <div className="max-w-[240px] text-xs text-rose-100/75">{item.error}</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-sm font-semibold">{item.availableCount} DID</div>
                                  <div className="text-xs text-muted-foreground">
                                    {tvn('numbers.catalog.buyReadyCount', 'Buy ready: {count}', { count: item.buyReadyCount })}
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5">
                              <div className="text-sm font-medium">
                                {item.previewFeatures || (featureFilter === 'any' ? tvn('numbers.search.anyFeature', 'Any Feature') : featureFilter.replace(',', ' & '))}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.previewType || (typeFilter === 'any' ? tvn('numbers.catalog.mixedTypes', 'Mixed types') : typeFilter)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {tvn('numbers.catalog.setupAmount', 'Setup {amount}', { amount: formatUsd(liveSetupProviderCost) })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {tvn('numbers.catalog.monthlyAmount', 'Monthly {amount}', { amount: formatUsd(liveMonthlyProviderCost) })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">{tvn('numbers.catalog.providerMonthlyCost', 'Provider Monthly Cost:')}</span>
                                <span className="text-sm font-medium">{formatUsd(liveMonthlyProviderCost)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">{tvn('numbers.catalog.providerSetupCost', 'Provider Setup Cost:')}</span>
                                <span className="text-sm font-medium">{formatUsd(liveSetupProviderCost)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">{tvn('numbers.catalog.retailSelling', 'Retail Selling:')}</span>
                                <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">{formatUsd(pricingPlan.monthly.retailPrice)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">{tvn('numbers.catalog.resellerSelling', 'Reseller Selling:')}</span>
                                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatUsd(pricingPlan.monthly.resellerPrice)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">{tvn('numbers.catalog.agentSelling', 'Agent Selling:')}</span>
                                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{formatUsd(pricingPlan.monthly.agentPrice)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 border-t pt-1">
                                <span className="text-xs text-muted-foreground">{tvn('numbers.catalog.margin', 'Margin:')}</span>
                                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                  ${formatMoney(marginAmount)} ({marginPercent.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {item.error ? (
                                <Badge variant="destructive">{tvn('numbers.catalog.unavailable', 'Unavailable')}</Badge>
                              ) : item.hasAvailable ? (
                                <Badge className="bg-emerald-500 hover:bg-emerald-500">{tvn('numbers.catalog.didAvailable', 'DID Available')}</Badge>
                              ) : (
                                <Badge variant="secondary">{tvn('numbers.catalog.noDid', 'No DID')}</Badge>
                              )}

                              {item.hasAvailable && (
                                <>
                                  <Badge variant="outline">{tvn('numbers.catalog.forwardReady', 'Forward Ready')}</Badge>
                                  <Badge variant="outline">{tvn('numbers.catalog.sipReady', 'SIP Ready')}</Badge>
                                  <Badge variant="outline">{tvn('numbers.catalog.voiceMailReady', 'Voice Mail Ready')}</Badge>
                                  {String(item.previewFeatures || featureFilter).toUpperCase().includes('SMS') && (
                                    <Badge variant="outline">SMS</Badge>
                                  )}
                                  {String(item.previewFeatures || featureFilter).toUpperCase().includes('VOICE') && (
                                    <Badge variant="outline">{tvn('numbers.search.voice', 'Voice')}</Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => handleManageCountry(item.countryCode)}>
                                {tvn('numbers.catalog.manage', 'Manage')}
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => handleEditCountryRates(item.countryCode)}>
                                {tvn('numbers.catalog.editPrice', 'Edit Price')}
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => handleFetchCountryNumbers(item.countryCode)}>
                                {tvn('numbers.catalog.fetchNumbers', 'Fetch Numbers')}
                              </Button>
                              <Button type="button" size="sm" onClick={() => handleAssignCountry(item.countryCode)}>
                                {tvn('numbers.catalog.assign', 'Assign')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showDidSearchExperience && (
      <div ref={didSearchPanelRef} className={section === 'numbers' ? 'order-2' : undefined}>
      <Card className="overflow-hidden border-slate-800/70 bg-slate-950/80 text-slate-50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            {section === 'country-numbers' ? (
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/admin/virtual-numbers/numbers')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tvn('numbers.search.backToCountries', 'Back To Countries')}
              </Button>
            ) : (
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                {tvn('numbers.search.eyebrow', 'Main DID Search')}
              </div>
            )}
            <Badge variant="secondary">
              {didSearchScopeLabel}
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-primary" />
            {tvn('numbers.search.title', 'Search DID Numbers')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="rounded-xl border border-white/10 bg-white p-3 text-slate-950 shadow-none dark:bg-slate-950/40 dark:text-white">
            <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[160px_minmax(220px,1fr)_140px_minmax(300px,1.4fr)_120px]">
            <div className="space-y-1.5">
              <Label className="text-xs">{tvn('numbers.search.country', 'Country')}</Label>
              <Popover open={didSearchCountryPickerOpen} onOpenChange={setDidSearchCountryPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={didSearchCountryPickerOpen}
                    className="h-11 w-full justify-between rounded-lg border-slate-400 bg-white px-3 text-left text-sm font-medium text-slate-950 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                  >
                    <span className="truncate">
                      {didSearchCountryLabel}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0" align="start">
                  <Command shouldFilter={false} className={darkCommandMenuClass}>
                    <CommandInput
                      placeholder={tvn('numbers.search.searchCountryNameOrCode', 'Search Country Name Or Code')}
                      value={countrySearch}
                      onValueChange={setCountrySearch}
                    />
                    <CommandList>
                      <CommandItem
                        className={darkCommandItemClass}
                        value="all-countries"
                        onSelect={() => {
                          setDidSearchAllCountries(true);
                          setDidSearchCountryCodes([]);
                          setDidSearchCountryPickerOpen(false);
                        }}
                      >
                        <Check className={`h-4 w-4 ${didSearchAllCountries ? 'opacity-100' : 'opacity-0'}`} />
                        <span>{tvn('numbers.common.allCountries', 'All Countries')}</span>
                      </CommandItem>
                      <CommandEmpty>{tvn('providers.dialog.noCountryFound', 'No Country Found.')}</CommandEmpty>
                      <CommandGroup heading={tvn('providers.countries', 'Countries')}>
                        {filteredCountryOptions.map((country) => (
                          <CommandItem
                            className={darkCommandItemClass}
                            key={`did-search-${country.code}`}
                            value={country.label}
                            onSelect={() => {
                              toggleSearchCountry(country.code);
                              setCountryCode(country.code);
                            }}
                          >
                            <Check
                              className={`h-4 w-4 ${
                                didSearchCountryCodes.includes(country.code) && !didSearchAllCountries ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <span>{country.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{tvn('numbers.search.feature', 'Feature')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full justify-between rounded-lg border-slate-400 bg-white px-3 text-left text-sm font-medium text-slate-950 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                  >
                    <span className="truncate">{featureLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command className={darkCommandMenuClass}>
                    <CommandList>
                      <CommandGroup heading={tvn('numbers.search.features', 'Features')}>
                        <CommandItem className={darkCommandItemClass} value="any" onSelect={() => setSelectedFeatureParts([])}>
                          <Check className={`h-4 w-4 ${selectedFeatureParts.length === 0 ? 'opacity-100' : 'opacity-0'}`} />
                          <span>{tvn('numbers.search.anyFeature', 'Any Feature')}</span>
                        </CommandItem>
                        {(['SMS', 'VOICE'] as NumberFeaturePart[]).map((feature) => (
                          <CommandItem className={darkCommandItemClass} key={feature} value={feature} onSelect={() => toggleFeaturePart(feature)}>
                            <Check className={`h-4 w-4 ${selectedFeatureParts.includes(feature) ? 'opacity-100' : 'opacity-0'}`} />
                            <span>{feature === 'SMS' ? 'SMS' : tvn('numbers.search.voice', 'Voice')}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{tvn('numbers.search.type', 'Type')}</Label>
              <Select value={typeFilter} onValueChange={(value: NumberType) => setTypeFilter(value)}>
                <SelectTrigger className="h-11 rounded-lg border-slate-400 bg-white px-3 text-sm font-medium text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{tvn('numbers.search.any', 'Any')}</SelectItem>
                  <SelectItem value="mobile-lvn">{tvn('numbers.search.mobile', 'Mobile')}</SelectItem>
                  <SelectItem value="landline">{tvn('numbers.search.landline', 'Landline')}</SelectItem>
                  <SelectItem value="toll_free">{tvn('numbers.search.tollFree', 'Toll Free')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{tvn('numbers.search.number', 'Number')}</Label>
              <div className="flex h-11 overflow-hidden rounded-lg border border-slate-400 bg-white dark:border-slate-700 dark:bg-slate-900">
                <Select value={numberMatchMode} onValueChange={(value: NumberMatchMode) => setNumberMatchMode(value)}>
                  <SelectTrigger className="h-full w-[130px] rounded-none border-0 border-r border-slate-300 bg-transparent px-3 text-sm font-medium text-slate-950 shadow-none focus:ring-0 dark:border-slate-700 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">{tvn('numbers.search.contains', 'Contains')}</SelectItem>
                    <SelectItem value="starts_with">{tvn('numbers.search.startsWith', 'Starts With')}</SelectItem>
                    <SelectItem value="ends_with">{tvn('numbers.search.endsWith', 'Ends With')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="virtual-pattern-search"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder={
                    numberMatchMode === 'contains'
                      ? tvn('numbers.search.exampleNumber', 'Example 1105')
                      : tvn('numbers.search.optionalNumberPattern', 'Optional Number Pattern')
                  }
                  className="h-full flex-1 rounded-none border-0 bg-transparent px-3 text-sm text-slate-950 shadow-none focus-visible:ring-0 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => searchMutation.mutate({ countryCodes: resolveDidSearchCountryCodes() })}
                disabled={searchMutation.isPending || !data.enabled || resolveDidSearchCountryCodes().length === 0}
                className="h-11 min-w-[120px] rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-500"
              >
                {searchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {tvn('numbers.search.search', 'Search')}
              </Button>
            </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Label className="text-xs text-slate-600 dark:text-slate-300">{tvn('numbers.search.sort', 'Sort')}</Label>
              <Select value={numbersPriceSort} onValueChange={(value: DidPriceSortMode) => setNumbersPriceSort(value)}>
                <SelectTrigger className="h-9 w-[220px] border-slate-300 bg-white text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{tvn('numbers.search.defaultSort', 'Default Sort')}</SelectItem>
                  <SelectItem value="price_low_high">{tvn('numbers.search.lowerPriceToHigher', 'Lower Price To Higher Price')}</SelectItem>
                  <SelectItem value="price_high_low">{tvn('numbers.search.higherPriceToLower', 'Higher Price To Lower Price')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {!data.enabled && (
            <p className="text-sm text-destructive">{tvn('numbers.search.providerDisabled', 'Vonage is disabled in settings.')}</p>
          )}
          {data.enabled && !data.hasCredentials && (
            <p className="text-sm text-destructive">
              {tvn('numbers.search.credentialsMissing', 'Vonage credentials are missing, so live provider pricing is not available yet.')}
            </p>
          )}
        </CardContent>
      </Card>
      </div>
      )}

      {section === 'country-numbers' && providerPricing && (
        <Card>
          <CardHeader>
            <CardTitle>Live Vonage Price List</CardTitle>
            <CardDescription>
              These costs come directly from Vonage for country {countryCode}. Use them as your provider cost baseline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium">SMS API Pricing</div>
                {smsApiPricingRows.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No live SMS API pricing returned for this country.</p>
                ) : (
                  smsApiPricingRows.slice(0, 5).map((item, index) => (
                    <div key={`${item.dest_network_type || 'sms-api'}-${index}`} className="mt-2 text-sm text-muted-foreground">
                      {item.dest_network_type || 'ALL'}: {item.price || '0'} {item.currency || ''}{item.rate_increment ? ` • Increment ${item.rate_increment}` : ''}
                    </div>
                  ))
                )}
                <div className="mt-3 text-xs text-muted-foreground">{providerPricing.smsApiNote}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium">Voice API Pricing</div>
                {voiceApiPricingRows.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No live Voice API pricing returned for this country.</p>
                ) : (
                  voiceApiPricingRows.slice(0, 5).map((item, index) => (
                    <div key={`${item.dest_network_type || 'voice-api'}-${index}`} className="mt-2 text-sm text-muted-foreground">
                      {item.dest_network_type || 'ALL'}: {item.price || '0'} {item.currency || ''}{item.rate_increment ? ` • Increment ${item.rate_increment}` : ''}
                    </div>
                  ))
                )}
                <div className="mt-3 text-xs text-muted-foreground">{providerPricing.voiceApiNote}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium">Messages API Pricing</div>
                {messagesApiPricingRows.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No live Messages API pricing endpoint is exposed in the public Vonage Pricing API for this country.</p>
                ) : (
                  messagesApiPricingRows.slice(0, 5).map((item, index) => (
                    <div key={`${item.dest_network_type || 'messages-api'}-${index}`} className="mt-2 text-sm text-muted-foreground">
                      {item.dest_network_type || 'ALL'}: {item.price || '0'} {item.currency || ''}
                    </div>
                  ))
                )}
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label>Messages API Provider Cost</Label>
                    <Input
                      value={messagesApiForm.price}
                      onChange={(e) => setMessagesApiForm((current) => ({ ...current, price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Messages API Notes</Label>
                    <Input
                      value={messagesApiForm.notes}
                      onChange={(e) => setMessagesApiForm((current) => ({ ...current, notes: e.target.value }))}
                      placeholder="WhatsApp or omnichannel provider pricing note"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => saveMessagesApiMutation.mutate(messagesApiForm)}
                    disabled={saveMessagesApiMutation.isPending}
                  >
                    {saveMessagesApiMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Messages API Pricing
                  </Button>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">{providerPricing.messagesApiNote}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showDidSearchExperience && searchResults.length > 0 && (
        <Card className={section === 'numbers' ? 'order-2' : undefined}>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
              <CardTitle>Fetched DID Numbers</CardTitle>
              <CardDescription>
                These Are Provider-Side Search Results, Paged From Vonage In Blocks Of 100. Number Search Is Sent To Vonage, So It Searches The Full Matching DID Inventory, Not Only The Rows Currently Loaded Here.
              </CardDescription>
              {searchPageMeta ? (
                <div className="mt-2 text-sm text-muted-foreground">
                  Loaded {searchPageMeta.loadedCount} Of {searchPageMeta.totalCount} Matching DID
                  {searchPageMeta.isMultiCountry ? ` Across ${searchPageMeta.countryCodes.length} Countries` : ` For ${searchPageMeta.countryCodes[0] || countryCode}`}.
                  {searchPageMeta.searchPattern ? ` Search: ${searchPageMeta.searchPattern}.` : ''}
                </div>
              ) : null}
              </div>
              {searchPageMeta ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      searchMutation.mutate({
                        countryCodes: searchPageMeta.countryCodes,
                        pageIndex: Math.max(1, searchPageMeta.pageIndex - 1),
                      })
                    }
                    disabled={searchMutation.isPending || !searchPageMeta.hasPreviousPage}
                  >
                    Previous Page
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      searchMutation.mutate({
                        countryCodes: searchPageMeta.countryCodes,
                        pageIndex: searchPageMeta.pageIndex + 1,
                      })
                    }
                    disabled={searchMutation.isPending || !searchPageMeta.hasNextPage}
                  >
                    Next Page
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      searchMutation.mutate({
                        countryCodes: searchPageMeta.countryCodes,
                        pageIndex: searchPageMeta.pageIndex + 1,
                        append: true,
                      })
                    }
                    disabled={searchMutation.isPending || !searchPageMeta.hasNextPage}
                  >
                    {searchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Load More
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="font-medium">Bulk Update Loaded Search Results</div>
                  <div className="text-sm text-muted-foreground">
                    Apply One Margin, One Selling-Price Set, Or Premium/Normal Mode To Every DID Currently Loaded From This Search. Use Load More To Bring In Additional Matching Numbers First.
                  </div>
                </div>
                <div className="min-w-[220px] space-y-2">
                  <Label>Apply By Country</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={bulkSearchCountry}
                    onChange={(e) => setBulkSearchCountry(e.target.value)}
                  >
                    <option value="ALL">All Located Countries</option>
                    {searchCountryChoices.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => markAllSearchRowsPremium(true)}>Mark All Premium</Button>
                  <Button type="button" variant="outline" onClick={() => markAllSearchRowsPremium(false)}>Mark All Normal</Button>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Bulk Selling Prices</div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-2"><Label>Setup Price ($)</Label><Input value={bulkSearchPrices.setupFee} onChange={(e) => setBulkSearchPrices((current) => ({ ...current, setupFee: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>Monthly Price ($)</Label><Input value={bulkSearchPrices.monthlyFee} onChange={(e) => setBulkSearchPrices((current) => ({ ...current, monthlyFee: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>Inbound Price ($)</Label><Input value={bulkSearchPrices.inboundFee} onChange={(e) => setBulkSearchPrices((current) => ({ ...current, inboundFee: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>Outbound Price ($)</Label><Input value={bulkSearchPrices.outboundFee} onChange={(e) => setBulkSearchPrices((current) => ({ ...current, outboundFee: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>3 Months Price ($)</Label><Input value={bulkSearchPrices.threeMonthsPrice} onChange={(e) => setBulkSearchPrices((current) => ({ ...current, threeMonthsPrice: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>6 Months Price ($)</Label><Input value={bulkSearchPrices.sixMonthsPrice} onChange={(e) => setBulkSearchPrices((current) => ({ ...current, sixMonthsPrice: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>9 Months Price ($)</Label><Input value={bulkSearchPrices.nineMonthsPrice} onChange={(e) => setBulkSearchPrices((current) => ({ ...current, nineMonthsPrice: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>12 Months Price ($)</Label><Input value={bulkSearchPrices.twelveMonthsPrice} onChange={(e) => setBulkSearchPrices((current) => ({ ...current, twelveMonthsPrice: e.target.value }))} placeholder="$ Keep current" /></div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setSearchRows((current) => applyBulkPrices(current, bulkSearchPrices, searchBulkMatcher))}>Apply Bulk Prices</Button>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium">Bulk Margin Over Provider Cost</div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-2"><Label>Setup Margin (%)</Label><Input value={bulkSearchMargins.setupMargin} onChange={(e) => setBulkSearchMargins((current) => ({ ...current, setupMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>Monthly Margin (%)</Label><Input value={bulkSearchMargins.monthlyMargin} onChange={(e) => setBulkSearchMargins((current) => ({ ...current, monthlyMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>Inbound Margin (%)</Label><Input value={bulkSearchMargins.inboundMargin} onChange={(e) => setBulkSearchMargins((current) => ({ ...current, inboundMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>Outbound Margin (%)</Label><Input value={bulkSearchMargins.outboundMargin} onChange={(e) => setBulkSearchMargins((current) => ({ ...current, outboundMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>3 Months Margin (%)</Label><Input value={bulkSearchMargins.threeMonthsMargin} onChange={(e) => setBulkSearchMargins((current) => ({ ...current, threeMonthsMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>6 Months Margin (%)</Label><Input value={bulkSearchMargins.sixMonthsMargin} onChange={(e) => setBulkSearchMargins((current) => ({ ...current, sixMonthsMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>9 Months Margin (%)</Label><Input value={bulkSearchMargins.nineMonthsMargin} onChange={(e) => setBulkSearchMargins((current) => ({ ...current, nineMonthsMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>12 Months Margin (%)</Label><Input value={bulkSearchMargins.twelveMonthsMargin} onChange={(e) => setBulkSearchMargins((current) => ({ ...current, twelveMonthsMargin: e.target.value }))} placeholder="20.00" /></div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setSearchRows((current) => applyBulkMargins(current, bulkSearchMargins, searchBulkMatcher))}>Apply Bulk Margin</Button>
                </div>
              </div>
            </div>
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[260px]">DID Number</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Number Details</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Premium</TableHead>
                    <TableHead className="text-center">Buy Ready</TableHead>
                    <TableHead className="text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedSearchResults.map((item, index) => {
                    const row = searchRows[item.msisdn] || pricingFromDefaults(data.settings.pricing, false);
                    const countryLabel =
                      countryOptions.find((country) => country.code === item.countryCode)?.name || item.countryCode;
                    const retailSelling = row.customPackagePrices?.oneMonth || row.monthlyFee || '0.00';
                    const resellerSelling = applyDiscountPercent(retailSelling, row.resellerDiscountPercent);
                    const agentSelling = applyDiscountPercent(retailSelling, row.agentDiscountPercent);
                    const providerCost = item.monthlyCost || row.providerMonthlyCost || '0.00';
                    const marginAmount = (parseMoney(retailSelling) ?? 0) - (parseMoney(providerCost) ?? 0);
                    const marginPercent = (parseMoney(providerCost) ?? 0) > 0
                      ? (marginAmount / (parseMoney(providerCost) ?? 1)) * 100
                      : 0;

                    return (
                      <TableRow
                        key={`table-${item.msisdn}`}
                        className={selectedSearchMsisdn === item.msisdn ? 'bg-muted/40' : undefined}
                      >
                        <TableCell className="font-medium text-muted-foreground">{searchDisplayOffset + index + 1}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-semibold">
                              <Phone className="h-4 w-4 text-primary" />
                              <span>{item.msisdn}</span>
                              {row.isPremium && <Badge className="bg-amber-500 text-black hover:bg-amber-500">Premium</Badge>}
                              {!item.availableToBuy && <Badge variant="secondary">Owned</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground">{countryLabel}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Vonage</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{countryLabel}</div>
                          <div className="text-xs text-muted-foreground">{item.countryCode}</div>
                        </TableCell>
                        <TableCell className="capitalize">
                          <Badge variant="secondary">{item.type || 'Any'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <div className="text-sm font-medium">{item.features || 'SMS & Voice'}</div>
                            <div className="text-xs text-muted-foreground">Setup {formatUsd(item.setupCost || row.providerSetupCost)}</div>
                            <div className="text-xs text-muted-foreground">Monthly {formatUsd(item.monthlyCost || row.providerMonthlyCost)}</div>
                            <div className="text-xs text-muted-foreground">Packages: 3 / 6 / 9 / 12 months</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">Provider Cost:</span>
                              <span className="text-sm font-medium">{formatUsd(providerCost)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">Retail Selling:</span>
                              <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">{formatUsd(retailSelling)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">Reseller Selling:</span>
                              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatUsd(resellerSelling)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">Agent Selling:</span>
                              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{formatUsd(agentSelling)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t pt-1">
                              <span className="text-xs text-muted-foreground">Margin:</span>
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                ${formatMoney(marginAmount)} ({marginPercent.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.availableToBuy ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-500">Enabled</Badge>
                          ) : (
                            <Badge variant="secondary">Owned</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={row.isPremium}
                            onCheckedChange={(checked) =>
                              setSearchRow(item.msisdn, {
                                ...pricingFromDefaults(data.settings.pricing, checked),
                                providerSetupCost: row.providerSetupCost,
                                providerMonthlyCost: row.providerMonthlyCost,
                                providerInboundCost: row.providerInboundCost,
                                providerOutboundCost: row.providerOutboundCost,
                                providerSmsCost: row.providerSmsCost,
                                providerMmsCost: row.providerMmsCost,
                                providerVoiceCost: row.providerVoiceCost,
                                smsFee: row.smsFee,
                                mmsFee: row.mmsFee,
                                voiceFee: row.voiceFee,
                                autoRenew: row.autoRenew,
                                reminderDays: row.reminderDays,
                                cancelAtPeriodEnd: row.cancelAtPeriodEnd,
                                customPackagePrices: row.customPackagePrices,
                                resellerDiscountPercent: row.resellerDiscountPercent,
                                agentDiscountPercent: row.agentDiscountPercent,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={item.availableToBuy} disabled />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openDedicatedPricingPage(item)}
                            >
                              Edit Prices
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                setPurchaseDialog({
                                  open: true,
                                  msisdn: item.msisdn,
                                  packageTerm: '1_month',
                                  paymentMethod: 'wallet',
                                  assignedUserId: '',
                                  forwardingType: 'none',
                                  forwardingDestination: '',
                                })
                              }
                              disabled={!item.availableToBuy || buyMutation.isPending}
                            >
                              {buyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Buy
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {false && selectedSearchItem && selectedSearchRow && (
              <div ref={selectedPricingPanelRef} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Selected Number Pricing</div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{selectedSearchItem.msisdn}</span>
                      {selectedSearchRow.isPremium && <Badge className="bg-amber-500 text-black hover:bg-amber-500">Premium</Badge>}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Country {selectedSearchItem.countryCode}
                      {selectedSearchItem.type ? ` • ${selectedSearchItem.type}` : ''}
                      {selectedSearchItem.features ? ` • ${selectedSearchItem.features}` : ''}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Update the provider cost and your selling prices here, then click `Buy` on the row above when ready.
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Premium</span>
                    <Switch
                      checked={selectedSearchRow.isPremium}
                      onCheckedChange={(checked) =>
                        setSearchRow(selectedSearchItem.msisdn, {
                          ...pricingFromDefaults(data.settings.pricing, checked),
                          providerSetupCost: selectedSearchRow.providerSetupCost,
                          providerMonthlyCost: selectedSearchRow.providerMonthlyCost,
                          providerInboundCost: selectedSearchRow.providerInboundCost,
                          providerOutboundCost: selectedSearchRow.providerOutboundCost,
                          providerSmsCost: selectedSearchRow.providerSmsCost,
                          providerMmsCost: selectedSearchRow.providerMmsCost,
                          providerVoiceCost: selectedSearchRow.providerVoiceCost,
                          smsFee: selectedSearchRow.smsFee,
                          mmsFee: selectedSearchRow.mmsFee,
                          voiceFee: selectedSearchRow.voiceFee,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="space-y-2"><Label>Vonage Setup Cost</Label><Input value={selectedSearchRow.providerSetupCost} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { providerSetupCost: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Vonage Monthly Cost</Label><Input value={selectedSearchRow.providerMonthlyCost} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { providerMonthlyCost: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Vonage Inbound Cost</Label><Input value={selectedSearchRow.providerInboundCost} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { providerInboundCost: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Vonage Outbound Cost</Label><Input value={selectedSearchRow.providerOutboundCost} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { providerOutboundCost: e.target.value })} /></div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="space-y-2"><Label>Your Setup Price</Label><Input value={selectedSearchRow.setupFee} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { setupFee: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Your Monthly Price</Label><Input value={selectedSearchRow.monthlyFee} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { monthlyFee: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Your Inbound Price</Label><Input value={selectedSearchRow.inboundFee} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { inboundFee: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Your Outbound Price</Label><Input value={selectedSearchRow.outboundFee} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { outboundFee: e.target.value })} /></div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="space-y-2"><Label>Vonage SMS Cost</Label><Input value={selectedSearchRow.providerSmsCost} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { providerSmsCost: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Vonage MMS Cost</Label><Input value={selectedSearchRow.providerMmsCost} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { providerMmsCost: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Vonage Voice Cost</Label><Input value={selectedSearchRow.providerVoiceCost} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { providerVoiceCost: e.target.value })} /></div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="space-y-2"><Label>Your SMS Price</Label><Input value={selectedSearchRow.smsFee} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { smsFee: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Your MMS Price</Label><Input value={selectedSearchRow.mmsFee} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { mmsFee: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Your Voice Price</Label><Input value={selectedSearchRow.voiceFee} onChange={(e) => setSearchRow(selectedSearchItem.msisdn, { voiceFee: e.target.value })} /></div>
                </div>
              </div>
            )}

            {false && searchResults.map((item) => {
              const row = searchRows[item.msisdn] || pricingFromDefaults(data.settings.pricing, false);
              return (
                <div key={item.msisdn} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{item.msisdn}</span>
                        {row.isPremium && <Badge className="bg-amber-500 text-black hover:bg-amber-500">Premium</Badge>}
                        {!item.availableToBuy && <Badge variant="secondary">Already owned</Badge>}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Country {item.countryCode}
                        {item.type ? ` • ${item.type}` : ''}
                        {item.features ? ` • ${item.features}` : ''}
                        {item.setupCost ? ` • Vonage setup ${item.setupCost}` : ''}
                        {item.monthlyCost ? ` • Vonage monthly ${item.monthlyCost}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">Premium</span>
                      <Switch
                        checked={row.isPremium}
                        onCheckedChange={(checked) =>
                          setSearchRow(item.msisdn, {
                            ...pricingFromDefaults(data.settings.pricing, checked),
                            providerSetupCost: row.providerSetupCost,
                            providerMonthlyCost: row.providerMonthlyCost,
                            providerInboundCost: row.providerInboundCost,
                            providerOutboundCost: row.providerOutboundCost,
                            providerSmsCost: row.providerSmsCost,
                            providerMmsCost: row.providerMmsCost,
                            providerVoiceCost: row.providerVoiceCost,
                            smsFee: row.smsFee,
                            mmsFee: row.mmsFee,
                            voiceFee: row.voiceFee,
                            autoRenew: row.autoRenew,
                            reminderDays: row.reminderDays,
                            cancelAtPeriodEnd: row.cancelAtPeriodEnd,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="space-y-2"><Label>Vonage Setup Cost</Label><Input value={row.providerSetupCost} onChange={(e) => setSearchRow(item.msisdn, { providerSetupCost: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Vonage Monthly Cost</Label><Input value={row.providerMonthlyCost} onChange={(e) => setSearchRow(item.msisdn, { providerMonthlyCost: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Vonage Inbound Cost</Label><Input value={row.providerInboundCost} onChange={(e) => setSearchRow(item.msisdn, { providerInboundCost: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Vonage Outbound Cost</Label><Input value={row.providerOutboundCost} onChange={(e) => setSearchRow(item.msisdn, { providerOutboundCost: e.target.value })} /></div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="space-y-2"><Label>Your Setup Price</Label><Input value={row.setupFee} onChange={(e) => setSearchRow(item.msisdn, { setupFee: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Your Monthly Price</Label><Input value={row.monthlyFee} onChange={(e) => setSearchRow(item.msisdn, { monthlyFee: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Your Inbound Price</Label><Input value={row.inboundFee} onChange={(e) => setSearchRow(item.msisdn, { inboundFee: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Your Outbound Price</Label><Input value={row.outboundFee} onChange={(e) => setSearchRow(item.msisdn, { outboundFee: e.target.value })} /></div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="space-y-2"><Label>Vonage SMS Cost</Label><Input value={row.providerSmsCost} onChange={(e) => setSearchRow(item.msisdn, { providerSmsCost: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Vonage MMS Cost</Label><Input value={row.providerMmsCost} onChange={(e) => setSearchRow(item.msisdn, { providerMmsCost: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Vonage Voice Cost</Label><Input value={row.providerVoiceCost} onChange={(e) => setSearchRow(item.msisdn, { providerVoiceCost: e.target.value })} /></div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="space-y-2"><Label>Your SMS Price</Label><Input value={row.smsFee} onChange={(e) => setSearchRow(item.msisdn, { smsFee: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Your MMS Price</Label><Input value={row.mmsFee} onChange={(e) => setSearchRow(item.msisdn, { mmsFee: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Your Voice Price</Label><Input value={row.voiceFee} onChange={(e) => setSearchRow(item.msisdn, { voiceFee: e.target.value })} /></div>
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={() =>
                        setPurchaseDialog({
                          open: true,
                          msisdn: item.msisdn,
                          packageTerm: '1_month',
                          paymentMethod: 'wallet',
                          assignedUserId: '',
                          forwardingType: 'none',
                          forwardingDestination: '',
                        })
                      }
                      disabled={!item.availableToBuy || buyMutation.isPending}
                    >
                      {buyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                      Buy into Inventory
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {showDidSearchExperience && searchMutation.isPending && searchResults.length === 0 && (
        <Card className={section === 'numbers' ? 'order-2' : undefined}>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading DID numbers for {didSearchScopeLabel}...
          </CardContent>
        </Card>
      )}

      {section === 'pricing' && (
        pricingPageItem && pricingPageRow ? (
          <div className="space-y-6">
            <Card className="overflow-hidden border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.95)]">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-700 bg-slate-900/60 text-slate-100 hover:bg-slate-800"
                      onClick={() => navigate('/admin/virtual-numbers/numbers')}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back To Numbers
                    </Button>
                    <div>
                      <div className="text-xs uppercase tracking-[0.28em] text-cyan-200">Dedicated Price Editor</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-2xl font-semibold text-white">{pricingPageItem.msisdn}</span>
                        <Badge className="bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/15">{pricingPageItem.countryCode}</Badge>
                        {pricingPageRow.isPremium && <Badge className="bg-amber-500 text-black hover:bg-amber-500">Premium</Badge>}
                      </div>
                      <div className="mt-2 text-sm text-slate-300">
                        Set the provider cost, your sell price, and package subscription amounts before buying this number into inventory.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={saveDedicatedPricingDraft}
                      >
                        Save Pricing Draft
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-700 bg-slate-900/60 text-slate-100 hover:bg-slate-800"
                        onClick={() => {
                          saveDedicatedPricingDraft();
                          navigate('/admin/virtual-numbers/numbers');
                        }}
                      >
                        Save And Back
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">Type</div>
                      <div className="mt-2 text-lg font-semibold text-white">{pricingPageItem.type || 'Any'}</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-emerald-200">Features</div>
                      <div className="mt-2 text-lg font-semibold text-white">{pricingPageItem.features || 'SMS'}</div>
                    </div>
                    <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-violet-200">1 Month Package</div>
                      <div className="mt-2 text-lg font-semibold text-white">{formatUsd(pricingPageRow.customPackagePrices?.oneMonth || '0.00')}</div>
                    </div>
                    <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-amber-200">1 Year Package</div>
                      <div className="mt-2 text-lg font-semibold text-white">{formatUsd(pricingPageRow.customPackagePrices?.twelveMonths || '0.00')}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <Card className="border-slate-800/80 bg-slate-950/90 text-slate-50">
                <CardHeader>
                  <CardTitle>Vonage Cost Baseline</CardTitle>
                  <CardDescription className="text-slate-400">These values are your provider-side cost reference for this specific number.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2"><Label>Vonage Setup Cost</Label><Input value={pricingPageRow.providerSetupCost} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { providerSetupCost: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Vonage Monthly Cost</Label><Input value={pricingPageRow.providerMonthlyCost} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { providerMonthlyCost: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Vonage Inbound Cost</Label><Input value={pricingPageRow.providerInboundCost} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { providerInboundCost: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Vonage Outbound Cost</Label><Input value={pricingPageRow.providerOutboundCost} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { providerOutboundCost: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Vonage SMS Cost</Label><Input value={pricingPageRow.providerSmsCost} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { providerSmsCost: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Vonage MMS Cost</Label><Input value={pricingPageRow.providerMmsCost} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { providerMmsCost: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Vonage Voice Cost</Label><Input value={pricingPageRow.providerVoiceCost} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { providerVoiceCost: e.target.value })} /></div>
                  <div className="flex items-end">
                    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                      Load your live provider pricing on the numbers page first, then fine tune this number here.
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800/80 bg-gradient-to-br from-cyan-950/60 via-slate-950 to-emerald-950/40 text-slate-50">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription className="text-slate-300">Choose a package term, then buy the number into inventory using wallet first or another method.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {([
                    '1_month',
                    '3_months',
                    '6_months',
                    '9_months',
                    '1_year',
                  ] as PackageTerm[]).map((term) => (
                    <div key={term} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div>
                        <div className="font-medium text-white">{getPackageLabel(term)}</div>
                        <div className="text-sm text-slate-300">{formatUsd(getPackagePriceFromRow(pricingPageRow, term))}</div>
                      </div>
                      <Button
                        type="button"
                        onClick={() =>
                          setPurchaseDialog({
                            open: true,
                            msisdn: pricingPageItem.msisdn,
                            packageTerm: term,
                            paymentMethod: 'wallet',
                            assignedUserId: '',
                            forwardingType: 'none',
                            forwardingDestination: '',
                          })
                        }
                      >
                        Buy {getPackageLabel(term)}
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400">
                    Wallet balance is the first payment choice here. You can still switch to another payment method in the buy dialog.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-800/80 bg-slate-950/90 text-slate-50">
              <CardHeader>
                <CardTitle>Sell Price And Subscription Plans</CardTitle>
                <CardDescription className="text-slate-400">Set your standard service prices and package subscription amounts for this number.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2"><Label>Your Setup Price</Label><Input value={pricingPageRow.setupFee} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { setupFee: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Your Monthly Price</Label><Input value={pricingPageRow.monthlyFee} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { monthlyFee: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Your Inbound Price</Label><Input value={pricingPageRow.inboundFee} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { inboundFee: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Your Outbound Price</Label><Input value={pricingPageRow.outboundFee} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { outboundFee: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Your SMS Price</Label><Input value={pricingPageRow.smsFee} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { smsFee: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Your MMS Price</Label><Input value={pricingPageRow.mmsFee} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { mmsFee: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Your Voice Price</Label><Input value={pricingPageRow.voiceFee} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { voiceFee: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Premium Number</Label>
                    <div className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3">
                      <span className="text-sm">{pricingPageRow.isPremium ? 'Enabled' : 'Disabled'}</span>
                      <Switch
                        checked={pricingPageRow.isPremium}
                        onCheckedChange={(checked) =>
                          setSearchRow(pricingPageItem.msisdn, {
                            ...pricingFromDefaults(data?.settings.pricing || fallbackPricingDefaults(), checked),
                            providerSetupCost: pricingPageRow.providerSetupCost,
                            providerMonthlyCost: pricingPageRow.providerMonthlyCost,
                            providerInboundCost: pricingPageRow.providerInboundCost,
                            providerOutboundCost: pricingPageRow.providerOutboundCost,
                            providerSmsCost: pricingPageRow.providerSmsCost,
                            providerMmsCost: pricingPageRow.providerMmsCost,
                            providerVoiceCost: pricingPageRow.providerVoiceCost,
                            customPackagePrices: pricingPageRow.customPackagePrices,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-white">Package Subscription Prices</div>
                      <div className="text-sm text-slate-300">Create one month, one year, or custom package durations like 3, 6, 9, and 12 months.</div>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-2"><Label>1 Month Price</Label><Input value={pricingPageRow.customPackagePrices?.oneMonth || '0.00'} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { customPackagePrices: mergeCustomPackagePrices(pricingPageRow.customPackagePrices, { oneMonth: e.target.value }) })} /></div>
                    <div className="space-y-2"><Label>3 Months Price</Label><Input value={pricingPageRow.customPackagePrices?.threeMonths || '0.00'} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { customPackagePrices: mergeCustomPackagePrices(pricingPageRow.customPackagePrices, { threeMonths: e.target.value }) })} /></div>
                    <div className="space-y-2"><Label>6 Months Price</Label><Input value={pricingPageRow.customPackagePrices?.sixMonths || '0.00'} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { customPackagePrices: mergeCustomPackagePrices(pricingPageRow.customPackagePrices, { sixMonths: e.target.value }) })} /></div>
                    <div className="space-y-2"><Label>9 Months Price</Label><Input value={pricingPageRow.customPackagePrices?.nineMonths || '0.00'} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { customPackagePrices: mergeCustomPackagePrices(pricingPageRow.customPackagePrices, { nineMonths: e.target.value }) })} /></div>
                    <div className="space-y-2"><Label>12 Months Price</Label><Input value={pricingPageRow.customPackagePrices?.twelveMonths || '0.00'} onChange={(e) => setSearchRow(pricingPageItem.msisdn, { customPackagePrices: mergeCustomPackagePrices(pricingPageRow.customPackagePrices, { twelveMonths: e.target.value }) })} /></div>
                  </div>
                </div>
                <div className="rounded-3xl border border-emerald-400/10 bg-emerald-500/5 p-5">
                  <div className="mb-4">
                    <div className="text-lg font-semibold text-white">Reseller And Agent Discount</div>
                    <div className="text-sm text-slate-300">Apply discount percentages from the retail package prices for reseller and agent pricing automatically.</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Reseller Discount %</Label>
                      <Input
                        value={pricingPageRow.resellerDiscountPercent || '0.00'}
                        onChange={(e) => setSearchRow(pricingPageItem.msisdn, { resellerDiscountPercent: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Agent Discount %</Label>
                      <Input
                        value={pricingPageRow.agentDiscountPercent || '0.00'}
                        onChange={(e) => setSearchRow(pricingPageItem.msisdn, { agentDiscountPercent: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="mb-3 text-sm font-medium text-emerald-200">Reseller Package Price Preview</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">1 Month: {formatUsd(applyDiscountPercent(pricingPageRow.customPackagePrices?.oneMonth || '0.00', pricingPageRow.resellerDiscountPercent))}</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">3 Months: {formatUsd(applyDiscountPercent(pricingPageRow.customPackagePrices?.threeMonths || '0.00', pricingPageRow.resellerDiscountPercent))}</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">6 Months: {formatUsd(applyDiscountPercent(pricingPageRow.customPackagePrices?.sixMonths || '0.00', pricingPageRow.resellerDiscountPercent))}</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">9 Months: {formatUsd(applyDiscountPercent(pricingPageRow.customPackagePrices?.nineMonths || '0.00', pricingPageRow.resellerDiscountPercent))}</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200 sm:col-span-2">12 Months: {formatUsd(applyDiscountPercent(pricingPageRow.customPackagePrices?.twelveMonths || '0.00', pricingPageRow.resellerDiscountPercent))}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="mb-3 text-sm font-medium text-cyan-200">Agent Package Price Preview</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">1 Month: {formatUsd(applyDiscountPercent(pricingPageRow.customPackagePrices?.oneMonth || '0.00', pricingPageRow.agentDiscountPercent))}</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">3 Months: {formatUsd(applyDiscountPercent(pricingPageRow.customPackagePrices?.threeMonths || '0.00', pricingPageRow.agentDiscountPercent))}</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">6 Months: {formatUsd(applyDiscountPercent(pricingPageRow.customPackagePrices?.sixMonths || '0.00', pricingPageRow.agentDiscountPercent))}</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">9 Months: {formatUsd(applyDiscountPercent(pricingPageRow.customPackagePrices?.nineMonths || '0.00', pricingPageRow.agentDiscountPercent))}</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200 sm:col-span-2">12 Months: {formatUsd(applyDiscountPercent(pricingPageRow.customPackagePrices?.twelveMonths || '0.00', pricingPageRow.agentDiscountPercent))}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-amber-400/10 bg-amber-500/5 p-5">
                  <div className="mb-4">
                    <div className="text-lg font-semibold text-white">Rates Control</div>
                    <div className="text-sm text-slate-300">Avoid loss by forcing sell prices to stay at or above provider cost plus your protection margin.</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-medium text-white">Protection Status</div>
                      <div className="mt-1 text-sm text-slate-300">
                        {ratesControlEnabled
                          ? `Enabled. Any rate below provider cost will be raised to provider cost + ${ratesControlMarginPercent}% margin automatically.`
                          : 'Disabled. Manual prices will be used as entered.'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Margin %</Label>
                      <Input value={String(ratesControlMarginPercent)} readOnly />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!pricingPageItem || !pricingPageRow) return;
                        const protectedRow = applyRatesControl(pricingPageRow, ratesControlEnabled, ratesControlMarginPercent);
                        setSearchRows((current) => ({
                          ...current,
                          [pricingPageItem.msisdn]: protectedRow,
                        }));
                        syncPricingDraft(pricingPageItem.msisdn, protectedRow);
                        toast({
                          title: 'Rates protected',
                          description: 'Any risky price below provider cost + margin was corrected.',
                        });
                      }}
                    >
                      Apply Rates Control Now
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => pricingPageRow && applyDefaultRatesMutation.mutate(pricingPageRow)}
                    disabled={applyDefaultRatesMutation.isPending}
                  >
                    {applyDefaultRatesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Apply As Default For All Destinations
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={saveDedicatedPricingDraft}
                  >
                    Save Pricing Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      saveDedicatedPricingDraft();
                      setPurchaseDialog({
                        open: true,
                        msisdn: pricingPageItem.msisdn,
                        packageTerm: '1_month',
                        paymentMethod: 'wallet',
                        assignedUserId: '',
                        forwardingType: 'none',
                        forwardingDestination: '',
                      });
                    }}
                  >
                    Save And Buy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="text-lg font-semibold">No pricing draft loaded for this number yet.</div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Open the number from the `Numbers` list first, then click `Edit Prices` so the dedicated price editor has the live Vonage number details to work with.
              </p>
              <Button onClick={() => navigate('/admin/virtual-numbers/numbers')}>
                Back To Numbers
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {(section === 'cost-price') && (
      <Card>
        <CardHeader>
          <CardTitle>Owned Inventory</CardTitle>
          <CardDescription>
            Keep the real Vonage cost and your selling price together for each number you already bought.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-300">Owned Numbers</div>
              <div className="mt-2 text-3xl font-semibold text-white">{data.inventory.length}</div>
              <div className="mt-1 text-sm text-slate-400">Numbers currently in your inventory</div>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-amber-200">Premium Stock</div>
              <div className="mt-2 text-3xl font-semibold text-white">{ownedPremiumCount}</div>
              <div className="mt-1 text-sm text-amber-100/80">Premium inventory ready for higher margins</div>
            </div>
            <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-fuchsia-200">Assigned</div>
              <div className="mt-2 text-3xl font-semibold text-white">{ownedAssignedCount}</div>
              <div className="mt-1 text-sm text-fuchsia-100/80">Inventory rows already linked to someone</div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-emerald-200">Setup Revenue</div>
              <div className="mt-2 text-3xl font-semibold text-white">${formatMoney(ownedSetupRevenue)}</div>
              <div className="mt-1 text-sm text-emerald-100/80">Current one-time selling value</div>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">Monthly Margin Base</div>
              <div className="mt-2 text-3xl font-semibold text-white">${formatMoney(ownedMonthlyRevenue - ownedProviderMonthlyCost)}</div>
              <div className="mt-1 text-sm text-cyan-100/80">Selling monthly minus provider monthly cost</div>
            </div>
          </div>
          {data.inventory.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">Bulk Update Inventory</div>
                  <div className="mt-1 text-lg font-semibold text-white">Apply pricing changes across many numbers</div>
                  <div className="text-sm text-slate-300">Update many owned numbers in one pass before saving individual rows.</div>
                </div>
                <div className="min-w-[220px] space-y-2">
                  <Label>Apply By Country</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={bulkInventoryCountry}
                    onChange={(e) => setBulkInventoryCountry(e.target.value)}
                  >
                    <option value="ALL">All inventory countries</option>
                    {inventoryCountryChoices.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => markAllInventoryRowsPremium(true)}>Mark All Premium</Button>
                  <Button type="button" variant="outline" onClick={() => markAllInventoryRowsPremium(false)}>Mark All Normal</Button>
                  <Button type="button" onClick={() => bulkUpdateInventoryMutation.mutate()} disabled={bulkUpdateInventoryMutation.isPending}>
                    {bulkUpdateInventoryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save All Inventory Rows
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
                  <div className="text-sm font-medium text-white">Bulk Selling Prices</div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-2"><Label>Setup Price ($)</Label><Input value={bulkInventoryPrices.setupFee} onChange={(e) => setBulkInventoryPrices((current) => ({ ...current, setupFee: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>Monthly Price ($)</Label><Input value={bulkInventoryPrices.monthlyFee} onChange={(e) => setBulkInventoryPrices((current) => ({ ...current, monthlyFee: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>Inbound Price ($)</Label><Input value={bulkInventoryPrices.inboundFee} onChange={(e) => setBulkInventoryPrices((current) => ({ ...current, inboundFee: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>Outbound Price ($)</Label><Input value={bulkInventoryPrices.outboundFee} onChange={(e) => setBulkInventoryPrices((current) => ({ ...current, outboundFee: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>3 Months Price ($)</Label><Input value={bulkInventoryPrices.threeMonthsPrice} onChange={(e) => setBulkInventoryPrices((current) => ({ ...current, threeMonthsPrice: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>6 Months Price ($)</Label><Input value={bulkInventoryPrices.sixMonthsPrice} onChange={(e) => setBulkInventoryPrices((current) => ({ ...current, sixMonthsPrice: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>9 Months Price ($)</Label><Input value={bulkInventoryPrices.nineMonthsPrice} onChange={(e) => setBulkInventoryPrices((current) => ({ ...current, nineMonthsPrice: e.target.value }))} placeholder="$ Keep current" /></div>
                    <div className="space-y-2"><Label>12 Months Price ($)</Label><Input value={bulkInventoryPrices.twelveMonthsPrice} onChange={(e) => setBulkInventoryPrices((current) => ({ ...current, twelveMonthsPrice: e.target.value }))} placeholder="$ Keep current" /></div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setInventoryRows((current) => applyBulkPrices(current, bulkInventoryPrices, inventoryBulkMatcher))}>Apply Bulk Prices</Button>
                </div>
                <div className="space-y-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                  <div className="text-sm font-medium text-white">Bulk Margin Over Provider Cost</div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-2"><Label>Setup Margin (%)</Label><Input value={bulkInventoryMargins.setupMargin} onChange={(e) => setBulkInventoryMargins((current) => ({ ...current, setupMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>Monthly Margin (%)</Label><Input value={bulkInventoryMargins.monthlyMargin} onChange={(e) => setBulkInventoryMargins((current) => ({ ...current, monthlyMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>Inbound Margin (%)</Label><Input value={bulkInventoryMargins.inboundMargin} onChange={(e) => setBulkInventoryMargins((current) => ({ ...current, inboundMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>Outbound Margin (%)</Label><Input value={bulkInventoryMargins.outboundMargin} onChange={(e) => setBulkInventoryMargins((current) => ({ ...current, outboundMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>3 Months Margin (%)</Label><Input value={bulkInventoryMargins.threeMonthsMargin} onChange={(e) => setBulkInventoryMargins((current) => ({ ...current, threeMonthsMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>6 Months Margin (%)</Label><Input value={bulkInventoryMargins.sixMonthsMargin} onChange={(e) => setBulkInventoryMargins((current) => ({ ...current, sixMonthsMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>9 Months Margin (%)</Label><Input value={bulkInventoryMargins.nineMonthsMargin} onChange={(e) => setBulkInventoryMargins((current) => ({ ...current, nineMonthsMargin: e.target.value }))} placeholder="20.00" /></div>
                    <div className="space-y-2"><Label>12 Months Margin (%)</Label><Input value={bulkInventoryMargins.twelveMonthsMargin} onChange={(e) => setBulkInventoryMargins((current) => ({ ...current, twelveMonthsMargin: e.target.value }))} placeholder="20.00" /></div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setInventoryRows((current) => applyBulkMargins(current, bulkInventoryMargins, inventoryBulkMatcher))}>Apply Bulk Margin</Button>
                </div>
              </div>
            </div>
          )}
          {data.inventory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No numbers in inventory yet.</p>
          ) : (
            data.inventory.map((item) => {
              const row = inventoryRows[item.id] || {
                isPremium: item.isPremium,
                assignedUserId: item.assignedUserId || null,
                providerSetupCost: item.providerSetupCost,
                providerMonthlyCost: item.providerMonthlyCost,
                providerInboundCost: item.providerInboundCost,
                providerOutboundCost: item.providerOutboundCost,
                providerSmsCost: (item as any).providerSmsCost ?? item.providerOutboundCost,
                providerMmsCost: (item as any).providerMmsCost ?? '0.00',
                providerVoiceCost: (item as any).providerVoiceCost ?? item.providerOutboundCost,
                setupFee: item.setupFee,
                monthlyFee: item.monthlyFee,
                inboundFee: item.inboundFee,
                outboundFee: item.outboundFee,
                smsFee: (item as any).smsFee ?? item.outboundFee,
                mmsFee: (item as any).mmsFee ?? '0.00',
                voiceFee: (item as any).voiceFee ?? item.outboundFee,
                autoRenew: Boolean((item.metadata as any)?.subscription?.autoRenew ?? true),
                reminderDays: String((item.metadata as any)?.subscription?.reminderDays ?? 3),
                cancelAtPeriodEnd: Boolean((item.metadata as any)?.subscription?.cancelAtPeriodEnd),
              };
              return (
                <div key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_55px_-35px_rgba(15,23,42,0.95)]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.msisdn}</span>
                        <Badge variant={item.status === 'available' ? 'default' : 'secondary'}>{item.status}</Badge>
                        {row.isPremium && <Badge className="bg-amber-500 text-black hover:bg-amber-500">Premium</Badge>}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Country {item.countryCode} • Added {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="text-sm">Premium</span>
                      <Switch
                        checked={row.isPremium}
                        onCheckedChange={(checked) =>
                          setInventoryRow(item.id, {
                            ...pricingFromDefaults(data.settings.pricing, checked),
                            isPremium: checked,
                            providerSetupCost: row.providerSetupCost,
                            providerMonthlyCost: row.providerMonthlyCost,
                            providerInboundCost: row.providerInboundCost,
                            providerOutboundCost: row.providerOutboundCost,
                            providerSmsCost: row.providerSmsCost,
                            providerMmsCost: row.providerMmsCost,
                            providerVoiceCost: row.providerVoiceCost,
                            smsFee: row.smsFee,
                            mmsFee: row.mmsFee,
                            voiceFee: row.voiceFee,
                            autoRenew: row.autoRenew,
                            reminderDays: row.reminderDays,
                            cancelAtPeriodEnd: row.cancelAtPeriodEnd,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-200">
                        <Server className="h-4 w-4 text-cyan-300" />
                        Provider Cost Baseline
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2"><Label>Vonage Setup Cost</Label><Input value={row.providerSetupCost} onChange={(e) => setInventoryRow(item.id, { providerSetupCost: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Vonage Monthly Cost</Label><Input value={row.providerMonthlyCost} onChange={(e) => setInventoryRow(item.id, { providerMonthlyCost: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Vonage Inbound Cost</Label><Input value={row.providerInboundCost} onChange={(e) => setInventoryRow(item.id, { providerInboundCost: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Vonage Outbound Cost</Label><Input value={row.providerOutboundCost} onChange={(e) => setInventoryRow(item.id, { providerOutboundCost: e.target.value })} /></div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
                      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-emerald-100">
                        <DollarSign className="h-4 w-4 text-emerald-200" />
                        Selling Price Matrix
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2"><Label>Your Setup Price</Label><Input value={row.setupFee} onChange={(e) => setInventoryRow(item.id, { setupFee: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Your Monthly Price</Label><Input value={row.monthlyFee} onChange={(e) => setInventoryRow(item.id, { monthlyFee: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Your Inbound Price</Label><Input value={row.inboundFee} onChange={(e) => setInventoryRow(item.id, { inboundFee: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Your Outbound Price</Label><Input value={row.outboundFee} onChange={(e) => setInventoryRow(item.id, { outboundFee: e.target.value })} /></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-cyan-100">
                        <Phone className="h-4 w-4 text-cyan-200" />
                        Messaging and Voice Costs
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-2"><Label>Vonage SMS Cost</Label><Input value={row.providerSmsCost} onChange={(e) => setInventoryRow(item.id, { providerSmsCost: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Vonage MMS Cost</Label><Input value={row.providerMmsCost} onChange={(e) => setInventoryRow(item.id, { providerMmsCost: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Vonage Voice Cost</Label><Input value={row.providerVoiceCost} onChange={(e) => setInventoryRow(item.id, { providerVoiceCost: e.target.value })} /></div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/10 p-4">
                      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-fuchsia-100">
                        <BarChart3 className="h-4 w-4 text-fuchsia-200" />
                        Messaging and Voice Prices
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-2"><Label>Your SMS Price</Label><Input value={row.smsFee} onChange={(e) => setInventoryRow(item.id, { smsFee: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Your MMS Price</Label><Input value={row.mmsFee} onChange={(e) => setInventoryRow(item.id, { mmsFee: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Your Voice Price</Label><Input value={row.voiceFee} onChange={(e) => setInventoryRow(item.id, { voiceFee: e.target.value })} /></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                    <div className="text-sm text-slate-300">
                      Review provider cost, update your margins, then save this inventory row.
                    </div>
                    <Button onClick={() => updateInventoryMutation.mutate({ id: item.id, row })} disabled={updateInventoryMutation.isPending}>
                      {updateInventoryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Provider Cost and Selling Price
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
      )}

      {(section === 'dashboard' || section === 'pending') && (
      <Card>
        <CardHeader>
          <CardTitle>
            {section === 'pending'
              ? tvn('applications.pending.title', 'Pending Requests')
              : tvn('applications.recent.title', 'Recent Applications')}
          </CardTitle>
          <CardDescription>
            {section === 'pending'
              ? tvn('applications.pending.description', 'Requests waiting for manual processing, assignment, or payment follow-up.')
              : tvn('applications.recent.description', 'The latest virtual number requests coming from users.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(section === 'pending' ? pendingApplications : data.applications).length === 0 ? (
            <p className="text-sm text-muted-foreground">{tvn('applications.empty', 'No applications found.')}</p>
          ) : (
            (section === 'pending' ? pendingApplications : data.applications).map((item) => (
              <div key={item.id} className="flex flex-col gap-1 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">{tvn('applications.user', 'User {id}', { id: item.userId })}</div>
                  <div className="text-sm text-muted-foreground">
                    {tvn('applications.country', 'Country {country}', { country: item.countryCode })}
                    {item.desiredNumber ? ` - ${tvn('applications.preferred', 'Preferred {number}', { number: item.desiredNumber })}` : ''}
                    {' - '}
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
                <Badge variant={item.status === 'pending' ? 'secondary' : 'default'}>{applicationStatusLabel(item.status)}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      )}

      {section === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle>{tvn('active.title', 'Assigned and Active Numbers')}</CardTitle>
            <CardDescription>{tvn('active.description', 'Review who each number belongs to and update assignment when needed.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeDisplayItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tvn('active.empty', 'No active or assigned numbers yet.')}</p>
            ) : activeDisplayItems.map((item) => {
              const row = inventoryRows[item.id] || {
                isPremium: item.isPremium,
                assignedUserId: item.assignedUserId || null,
                providerSetupCost: item.providerSetupCost,
                providerMonthlyCost: item.providerMonthlyCost,
                providerInboundCost: item.providerInboundCost,
                providerOutboundCost: item.providerOutboundCost,
                providerSmsCost: (item as any).providerSmsCost ?? item.providerOutboundCost,
                providerMmsCost: (item as any).providerMmsCost ?? '0.00',
                providerVoiceCost: (item as any).providerVoiceCost ?? item.providerOutboundCost,
                setupFee: item.setupFee,
                monthlyFee: item.monthlyFee,
                inboundFee: item.inboundFee,
                outboundFee: item.outboundFee,
                smsFee: (item as any).smsFee ?? item.outboundFee,
                mmsFee: (item as any).mmsFee ?? '0.00',
                voiceFee: (item as any).voiceFee ?? item.outboundFee,
                autoRenew: Boolean((item.metadata as any)?.subscription?.autoRenew ?? true),
                reminderDays: String((item.metadata as any)?.subscription?.reminderDays ?? 3),
                cancelAtPeriodEnd: Boolean((item.metadata as any)?.subscription?.cancelAtPeriodEnd),
                renewalPackageTerm: ((item.metadata as any)?.subscription?.packageTerm as PackageTerm | undefined) || '1_month',
                customPackagePrices:
                  (item.metadata as any)?.customPackagePrices ||
                  ((item.metadata as any)?.pricing
                    ? {
                        oneMonth: String((item.metadata as any)?.pricing?.monthlyFee || item.monthlyFee || '0.00'),
                        threeMonths: formatMoney((parseMoney(String((item.metadata as any)?.pricing?.monthlyFee || item.monthlyFee || '0.00')) ?? 0) * 3),
                        sixMonths: formatMoney((parseMoney(String((item.metadata as any)?.pricing?.monthlyFee || item.monthlyFee || '0.00')) ?? 0) * 6),
                        nineMonths: formatMoney((parseMoney(String((item.metadata as any)?.pricing?.monthlyFee || item.monthlyFee || '0.00')) ?? 0) * 9),
                        twelveMonths: formatMoney((parseMoney(String((item.metadata as any)?.pricing?.monthlyFee || item.monthlyFee || '0.00')) ?? 0) * 12),
                      }
                    : undefined),
              };
              const assignedAccount = row.assignedUserId ? assignableUserMap.get(row.assignedUserId) : null;
              const routing = item.metadata?.routing as { type?: string; destination?: string | null } | undefined;
              const subscription = (item.metadata?.subscription as Record<string, any> | undefined) || {};
              const renewalStatus = String(subscription.renewalStatus || (row.cancelAtPeriodEnd ? 'cancel_pending_expiry' : row.autoRenew ? 'active' : 'manual'));
              const effectivePackageTerm = (row.renewalPackageTerm as PackageTerm | undefined) || (subscription.packageTerm as PackageTerm | undefined) || '1_month';
              const defaultPricingRow = pricingFromDefaults(data?.settings.pricing || fallbackPricingDefaults(), Boolean(item.isPremium));
              const effectiveRenewalPrice = getActiveRenewalRetailPrice(row, item, subscription, effectivePackageTerm, defaultPricingRow);
              const assignedAccountName = assignedAccount?.fullName || assignedAccount?.email || item.assignedUserId || tvn('active.notAssigned', 'Not assigned');
              const assignedAccountLabel = assignedAccount
                ? `${assignedAccountName} (${accountRoleLabel(assignedAccount.role)})`
                : assignedAccountName;
              return (
                <div key={`active-${item.id}`} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_55px_-35px_rgba(15,23,42,0.95)]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.msisdn}</span>
                        <Badge variant="secondary">{boughtDidStatusLabel(item.status)}</Badge>
                        {item.isPremium && <Badge className="bg-amber-500 text-black hover:bg-amber-500">{tvn('bought.common.premium', 'Premium')}</Badge>}
                        <Badge className="bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/15">{activeRenewalStatusLabel(renewalStatus)}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {tvn('active.assignmentLine', '{country} - assigned to {account}', {
                          country: item.countryCode,
                          account: assignedAccountLabel,
                        })}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {tvn('active.forwardingLine', 'Forwarding: {value}', {
                          value: routing?.type && routing.type !== 'none'
                            ? `${routing.type}${routing.destination ? ` - ${routing.destination}` : ''}`
                            : tvn('active.none', 'None'),
                        })}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {tvn('active.monthlyRevenueCost', 'Monthly revenue {revenue} - cost {cost}', {
                        revenue: formatUsd(item.monthlyFee),
                        cost: formatUsd(item.providerMonthlyCost),
                      })}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-emerald-200">{tvn('active.cards.autoRenew.title', 'Auto Renew')}</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{row.autoRenew ? tvn('common.enabled', 'Enabled') : tvn('common.disabled', 'Disabled')}</div>
                      <div className="mt-1 text-sm text-emerald-100/80">{tvn('active.cards.autoRenew.description', 'Controls whether renewal keeps charging after this period.')}</div>
                    </div>
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">{tvn('active.cards.activeUntil.title', 'Active Until')}</div>
                      <div className="mt-2 text-lg font-semibold text-white">{subscription.activeUntil ? new Date(subscription.activeUntil).toLocaleString() : tvn('active.notSet', 'Not set')}</div>
                      <div className="mt-1 text-sm text-cyan-100/80">{tvn('active.cards.activeUntil.description', 'Cancellation keeps service active until this date.')}</div>
                    </div>
                    <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-violet-200">{tvn('active.cards.nextRenewal.title', 'Next Renewal')}</div>
                      <div className="mt-2 text-lg font-semibold text-white">{subscription.nextChargeAt ? new Date(subscription.nextChargeAt).toLocaleString() : tvn('active.notScheduled', 'Not scheduled')}</div>
                      <div className="mt-1 text-sm text-violet-100/80">{tvn('active.cards.nextRenewal.description', 'Email and in-app alerts go out before this date.')}</div>
                    </div>
                    <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-amber-200">{tvn('active.cards.package.title', 'Package')}</div>
                      <div className="mt-2 text-lg font-semibold text-white">{activePackageLabel(effectivePackageTerm)}</div>
                      <div className="mt-1 text-sm text-amber-100/80">{tvn('active.cards.package.renewalPrice', 'Renewal price {amount}', { amount: formatUsd(effectiveRenewalPrice) })}</div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <Label>{tvn('active.assignment.label', 'Assign To Customer / Agent / Reseller')}</Label>
                      <Select
                        value={row.assignedUserId || '__unassigned__'}
                        onValueChange={(value) =>
                          setInventoryRow(item.id, {
                            assignedUserId: value === '__unassigned__' ? null : value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={tvn('bought.assignment.selectAccount', 'Select account')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unassigned__">{tvn('bought.common.unassigned', 'Unassigned')}</SelectItem>
                          {assignableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.fullName || user.email || user.id} ({accountRoleLabel(user.role)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() =>
                          updateInventoryMutation.mutate({
                            id: item.id,
                            row: {
                              ...row,
                              status: row.assignedUserId ? 'assigned' : 'available',
                            } as InventoryRowState,
                          })
                        }
                        disabled={updateInventoryMutation.isPending}
                      >
                        {updateInventoryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {tvn('active.assignment.save', 'Save Assignment')}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-white">{tvn('active.renewalControls.title', 'Renewal Controls')}</div>
                          <div className="text-xs text-slate-400">{tvn('active.renewalControls.description', 'Enable or disable future automatic renewals.')}</div>
                        </div>
                        <Switch
                          checked={Boolean(row.autoRenew)}
                          onCheckedChange={(checked) =>
                            setInventoryRow(item.id, {
                              autoRenew: checked,
                              cancelAtPeriodEnd: checked ? false : row.cancelAtPeriodEnd,
                            })
                          }
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          updateInventoryMutation.mutate({
                            id: item.id,
                            row: {
                              ...row,
                              autoRenew: Boolean(row.autoRenew),
                              cancelAtPeriodEnd: Boolean(row.cancelAtPeriodEnd),
                            } as InventoryRowState,
                          })
                        }
                        disabled={updateInventoryMutation.isPending}
                      >
                        {updateInventoryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {tvn('active.renewalControls.save', 'Save Renewal Setting')}
                      </Button>
                    </div>
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                      <div className="space-y-2">
                        <Label>{tvn('active.renewFor.label', 'Renew For')}</Label>
                        <Select
                          value={effectivePackageTerm}
                          onValueChange={(value: PackageTerm) => setInventoryRow(item.id, { renewalPackageTerm: value })}
                        >
                        <SelectTrigger className="border-white/10 bg-slate-950/70 text-slate-100">
                          <SelectValue placeholder={tvn('active.renewFor.selectTerm', 'Select renewal term')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1_month">{activePackageLabel('1_month')}</SelectItem>
                          <SelectItem value="3_months">{activePackageLabel('3_months')}</SelectItem>
                          <SelectItem value="6_months">{activePackageLabel('6_months')}</SelectItem>
                          <SelectItem value="9_months">{activePackageLabel('9_months')}</SelectItem>
                          <SelectItem value="1_year">{tvn('active.packageTerms.twelveMonths', '12 Months')}</SelectItem>
                        </SelectContent>
                        </Select>
                        <p className="text-xs text-cyan-100/80">{tvn('active.renewFor.description', 'Renewal will use the retail package price for the selected term.')}</p>
                        <div className="rounded-xl border border-cyan-300/15 bg-slate-950/50 px-3 py-2 text-sm text-white">
                          {tvn('active.renewFor.price', 'Renewal Price: {amount}', {
                            amount: formatUsd(getActiveRenewalRetailPrice(row, item, subscription, effectivePackageTerm, defaultPricingRow)),
                          })}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => {
                          const nextTerm = row.renewalPackageTerm || effectivePackageTerm;
                          const nextPrice = getActiveRenewalRetailPrice(row, item, subscription, nextTerm, defaultPricingRow);
                          if (!window.confirm(tvn('active.renewFor.confirmMessage', 'Confirm renewal plan for {term} at {amount}?', {
                            term: activePackageLabel(nextTerm),
                            amount: formatUsd(nextPrice),
                          }))) return;
                          updateInventoryMutation.mutate({
                            id: item.id,
                            row: {
                              ...row,
                              renewalPackageTerm: nextTerm,
                              status: item.status,
                            } as InventoryRowState,
                          });
                        }}
                        disabled={updateInventoryMutation.isPending}
                      >
                        {tvn('active.renewFor.confirmButton', 'Confirm Renewal Plan')}
                      </Button>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <div className="space-y-2">
                        <Label>{tvn('active.reminders.label', 'Reminder Days Before Renewal')}</Label>
                        <Input
                          value={row.reminderDays || '3'}
                          onChange={(e) => setInventoryRow(item.id, { reminderDays: e.target.value })}
                          placeholder="3"
                        />
                        <p className="text-xs text-slate-400">{tvn('active.reminders.description', 'The system sends email and in-app alerts this many days before renewal.')}</p>
                      </div>
                      <Button
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() =>
                          updateInventoryMutation.mutate({
                            id: item.id,
                            row: {
                              ...row,
                              reminderDays: row.reminderDays || '3',
                            } as InventoryRowState,
                          })
                        }
                        disabled={updateInventoryMutation.isPending}
                      >
                        {tvn('active.reminders.save', 'Save Reminder Rule')}
                      </Button>
                    </div>
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                      <div className="text-sm font-medium text-white">{tvn('active.cancelAtExpiry.title', 'Cancel at Expiry')}</div>
                      <div className="mt-1 text-xs text-rose-100/80">
                        {tvn('active.cancelAtExpiry.description', 'Stops future renewal charges now, but keeps the number active until the current remaining date ends.')}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="destructive"
                          onClick={() =>
                            updateInventoryMutation.mutate({
                              id: item.id,
                              row: {
                                ...row,
                                autoRenew: false,
                                cancelAtPeriodEnd: true,
                              } as InventoryRowState,
                            })
                          }
                          disabled={updateInventoryMutation.isPending || Boolean(row.cancelAtPeriodEnd)}
                        >
                          {tvn('active.cancelAtExpiry.cancel', 'Cancel Subscription')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            updateInventoryMutation.mutate({
                              id: item.id,
                              row: {
                                ...row,
                                autoRenew: true,
                                cancelAtPeriodEnd: false,
                              } as InventoryRowState,
                            })
                          }
                          disabled={updateInventoryMutation.isPending}
                        >
                          {tvn('active.cancelAtExpiry.resume', 'Resume Auto Renew')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {section === 'logs' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-blue-500/20 bg-slate-950/80">
              <CardHeader className="pb-2">
                <CardDescription>{tvn('logs.cards.customerUsageCharges', 'Customer Usage Charges')}</CardDescription>
                <CardTitle>{formatUsd(usageSummary.totalCustomerCharges)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {tvn('logs.cards.smsVoiceAmounts', 'SMS {sms} / voice {voice}', {
                  sms: formatUsd(usageSummary.totalSmsCustomerCharges),
                  voice: formatUsd(usageSummary.totalVoiceCustomerCharges),
                })}
              </CardContent>
            </Card>
            <Card className="border-rose-500/20 bg-slate-950/80">
              <CardHeader className="pb-2">
                <CardDescription>{tvn('logs.cards.estimatedVonageCharged', 'Estimated Vonage Charged')}</CardDescription>
                <CardTitle>{formatUsd(usageSummary.totalEstimatedVonageCost)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {tvn('logs.cards.smsVoiceAmounts', 'SMS {sms} / voice {voice}', {
                  sms: formatUsd(usageSummary.totalSmsProviderCost),
                  voice: formatUsd(usageSummary.totalVoiceProviderCost),
                })}
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20 bg-slate-950/80">
              <CardHeader className="pb-2">
                <CardDescription>{tvn('logs.cards.estimatedUsageProfit', 'Estimated Usage Profit')}</CardDescription>
                <CardTitle>{formatUsd(usageSummary.totalEstimatedProfit)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {tvn('logs.cards.usageProfitCounts', '{sms} SMS, {voice} voice sessions, {renewals} renewals', {
                  sms: usageSummary.smsCount,
                  voice: usageSummary.voiceSessionCount,
                  renewals: usageSummary.renewalCount,
                })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                {tvn('logs.transactions.title', 'Full Transaction Details')}
              </CardTitle>
              <CardDescription>{tvn('logs.transactions.description', 'Wallet usage charges, auto renewals, estimated Vonage cost, and remaining margin.')}</CardDescription>
            </CardHeader>
            <CardContent>
              {usageTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tvn('logs.transactions.empty', 'No Vonage usage transactions yet.')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tvn('logs.table.date', 'Date')}</TableHead>
                        <TableHead>{tvn('logs.table.customer', 'Customer')}</TableHead>
                        <TableHead>DID</TableHead>
                        <TableHead>{tvn('logs.table.usage', 'Usage')}</TableHead>
                        <TableHead className="text-right">{tvn('logs.table.customerCharge', 'Customer Charge')}</TableHead>
                        <TableHead className="text-right">{tvn('logs.table.vonageCost', 'Vonage Cost')}</TableHead>
                        <TableHead className="text-right">{tvn('logs.table.profit', 'Profit')}</TableHead>
                        <TableHead className="text-right">{tvn('logs.table.wallet', 'Wallet')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageTransactions.slice(0, 100).map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{transaction.userName || transaction.userEmail || transaction.userId}</div>
                            <div className="text-xs text-muted-foreground">{transaction.userRole || transaction.billingRole || 'customer'}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{transaction.msisdn || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {logsUsageTypeLabel(transaction.usageType)}
                              {transaction.direction ? ` / ${logsDirectionLabel(transaction.direction)}` : ''}
                            </Badge>
                            <div className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">{transaction.description}</div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatUsd(transaction.customerCharge)}</TableCell>
                          <TableCell className="text-right text-rose-300">{formatUsd(transaction.providerCost)}</TableCell>
                          <TableCell className="text-right text-emerald-300">{formatUsd(transaction.grossProfit)}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {tvn('logs.table.walletBalanceChange', '{before} to {after}', {
                              before: formatUsd(transaction.balanceBefore),
                              after: formatUsd(transaction.balanceAfter),
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                {tvn('logs.messages.title', 'SMS Usage Records')}
              </CardTitle>
              <CardDescription>{tvn('logs.messages.description', 'Inbound and outbound message records with customer billing and estimated Vonage cost.')}</CardDescription>
            </CardHeader>
            <CardContent>
              {usageMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tvn('logs.messages.empty', 'No SMS messages recorded yet.')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tvn('logs.table.date', 'Date')}</TableHead>
                        <TableHead>{tvn('logs.table.customer', 'Customer')}</TableHead>
                        <TableHead>{tvn('logs.table.route', 'Route')}</TableHead>
                        <TableHead>{tvn('common.status', 'Status')}</TableHead>
                        <TableHead className="text-right">{tvn('logs.table.charge', 'Charge')}</TableHead>
                        <TableHead className="text-right">{tvn('logs.table.vonageCost', 'Vonage Cost')}</TableHead>
                        <TableHead>{tvn('logs.table.message', 'Message')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageMessages.slice(0, 100).map((message) => (
                        <TableRow key={message.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{message.userName || message.userEmail || message.userId}</div>
                            <div className="text-xs text-muted-foreground">{message.msisdn}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>{message.fromNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {tvn('logs.table.toNumber', 'to {number}', { number: message.toNumber })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {tvn('logs.messages.statusBadge', '{direction} {status}', {
                                direction: logsDirectionLabel(message.direction),
                                status: logsStatusLabel(message.status),
                              })}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatUsd(message.customerCharge)}</TableCell>
                          <TableCell className="text-right text-rose-300">{formatUsd(message.providerCost)}</TableCell>
                          <TableCell className="max-w-[320px] truncate text-sm text-muted-foreground">{message.text}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                {tvn('logs.activity.title', 'Inventory and Request Activity')}
              </CardTitle>
              <CardDescription>{tvn('logs.activity.description', "Recent inventory purchases and user request activity for eRoaming's.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tvn('logs.activity.empty', 'No virtual number activity yet.')}</p>
              ) : activityLogs.map((log) => (
                <div key={log.id} className="flex flex-col gap-1 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{log.title}</div>
                    <div className="text-sm text-muted-foreground">{log.subtitle}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{log.amount ? formatUsd(log.amount) : '-'}</div>
                    <div className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {addProviderDialog}
      {editProviderCredentialsDialog}

      <Dialog
        open={purchaseDialog.open}
        onOpenChange={(open) =>
          setPurchaseDialog((current) => ({
            ...current,
            open,
          }))
        }
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buy eRoaming Package</DialogTitle>
            <DialogDescription>
              Choose the number package, payment method, routing setup, and optional assignment before buying this number into inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-xl border p-4">
              <div className="text-sm text-muted-foreground">Selected Number</div>
              <div className="mt-1 text-lg font-semibold">{purchaseDialog.msisdn || '-'}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Package price: <span className="font-medium text-foreground">{formatUsd(purchasePrice)}</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Package</Label>
                <Select
                  value={purchaseDialog.packageTerm}
                  onValueChange={(value: PackageTerm) =>
                    setPurchaseDialog((current) => ({ ...current, packageTerm: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_month">Package for 1 Month</SelectItem>
                    <SelectItem value="3_months">Package for 3 Months</SelectItem>
                    <SelectItem value="6_months">Package for 6 Months</SelectItem>
                    <SelectItem value="9_months">Package for 9 Months</SelectItem>
                    <SelectItem value="1_year">Package for 1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={purchaseDialog.paymentMethod}
                  onValueChange={(value: 'wallet' | 'other') =>
                    setPurchaseDialog((current) => ({ ...current, paymentMethod: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">Wallet Balance</SelectItem>
                    <SelectItem value="other">Other Payment Method</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assign Number To</Label>
              <Select
                value={purchaseDialog.assignedUserId || '__unassigned__'}
                onValueChange={(value) =>
                  setPurchaseDialog((current) => ({
                    ...current,
                    assignedUserId: value === '__unassigned__' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Keep in Inventory</SelectItem>
                  {assignableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName || user.email || user.id} ({user.role || 'customer'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {purchaseDialog.paymentMethod === 'wallet' ? (
                <p className="text-xs text-muted-foreground">
                  Wallet payment will charge the assigned account’s wallet balance.
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Forward Number To</Label>
                <Select
                  value={purchaseDialog.forwardingType}
                  onValueChange={(value: 'none' | 'international' | 'sip' | 'voicemail') =>
                    setPurchaseDialog((current) => ({ ...current, forwardingType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Forwarding</SelectItem>
                    <SelectItem value="international">Forward to International Number</SelectItem>
                    <SelectItem value="sip">Forward to SIP</SelectItem>
                    <SelectItem value="voicemail">Voice Mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {purchaseDialog.forwardingType === 'sip'
                    ? 'SIP URI'
                    : purchaseDialog.forwardingType === 'voicemail'
                      ? 'Voice Mail Label'
                      : 'Forwarding Destination'}
                </Label>
                <Input
                  value={purchaseDialog.forwardingDestination}
                  onChange={(e) =>
                    setPurchaseDialog((current) => ({
                      ...current,
                      forwardingDestination: e.target.value,
                    }))
                  }
                  placeholder={
                    purchaseDialog.forwardingType === 'sip'
                      ? 'sip:user@example.com'
                      : purchaseDialog.forwardingType === 'voicemail'
                        ? 'Main Voice Mail'
                        : purchaseDialog.forwardingType === 'international'
                          ? '+12025550199'
                          : 'Optional'
                  }
                  disabled={purchaseDialog.forwardingType === 'none'}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setPurchaseDialog({
                  open: false,
                  msisdn: null,
                  packageTerm: '1_month',
                  paymentMethod: 'wallet',
                  assignedUserId: '',
                  forwardingType: 'none',
                  forwardingDestination: '',
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!purchaseDialog.msisdn || !purchaseRow) return;
                buyMutation.mutate({
                  msisdn: purchaseDialog.msisdn,
                  row: purchaseRow,
                  purchase: purchaseDialog,
                });
              }}
              disabled={
                buyMutation.isPending ||
                !purchaseDialog.msisdn ||
                !purchaseRow ||
                (purchaseDialog.paymentMethod === 'wallet' && !purchaseDialog.assignedUserId)
              }
            >
              {buyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
              Buy Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
