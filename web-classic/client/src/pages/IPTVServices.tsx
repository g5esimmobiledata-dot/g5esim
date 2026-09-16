import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, CircleDollarSign, Clapperboard, Copy, Download, Eye, FileText, Globe2, KeyRound, ListVideo, Loader2, MonitorPlay, PauseCircle, Plus, RefreshCw, RotateCcw, Save, Search, Settings2, SlidersHorizontal, Tv, UserPlus, Users, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

type IptvPackage = {
  id: string;
  tvplusPackageId: string;
  name: string;
  description?: string | null;
  prices?: Record<string, string>;
  metadata?: {
    visibility?: Partial<IptvPackageVisibility>;
    [key: string]: any;
  };
};

type IptvOrder = {
  id: string;
  userId?: string | null;
  createdByUserId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  deviceType: 'm3u' | 'mag' | 'protocol';
  subscriptionMonths: number;
  subscriptionTermType?: 'months' | 'hours';
  subscriptionHours?: number | null;
  subscriptionLabel?: string | null;
  status: string;
  username?: string | null;
  password?: string | null;
  macAddress?: string | null;
  portalUrl?: string | null;
  m3uUrl?: string | null;
  m3uFormats?: IptvM3uFormat[];
  protocolCode?: string | null;
  packageName?: string | null;
  tvplusPackageId?: string | null;
  providerResponse?: {
    provider?: string;
    source?: string;
    [key: string]: any;
  } | null;
  expiresAt?: string | null;
  createdAt: string;
};

type IptvWorkspaceMode = 'services' | 'cost-price' | 'logs' | 'users-list' | 'settings';

type IptvAssignableUser = {
  id: string;
  displayUserId?: number | string | null;
  email: string;
  name?: string | null;
  role?: string | null;
};

type IptvWorkspaceSettings = {
  activeProvider: 'tvplus' | 'iotv';
  enabled: boolean;
  storeName: string;
  supportEmail: string;
  supportWhatsapp: string;
  allowTrials: boolean;
  allowRenewals: boolean;
  paymentPriority: string[];
  promotionEnabled: boolean;
  promotionTitle: string;
  promotionBody: string;
  allowWebTrial: boolean;
  allowMobileTrial: boolean;
  autoRenewEnabled: boolean;
  specialPromotionEnabled: boolean;
  specialPromotionTitle: string;
  specialPromotionBody: string;
  specialPromotionBadge: string;
  specialPromotionButtonText: string;
  specialPromotionButtonUrl: string;
  specialPromotionStyle: PromotionDisplayStyle;
  specialPromotionHtml: string;
  specialPromotionPrice1Month: string;
  specialPromotionPrice3Months: string;
  specialPromotionPrice6Months: string;
  specialPromotionPrice9Months: string;
  specialPromotionPrice12Months: string;
  specialPromotionEmailAudience: PromotionAudience;
  specialPromotionPushAudience: PromotionAudience;
  specialOfferEnabled: boolean;
  specialOfferTitle: string;
  specialOfferBody: string;
  specialOfferBadge: string;
  specialOfferButtonText: string;
  specialOfferButtonUrl: string;
  specialOfferStyle: PromotionDisplayStyle;
  specialOfferHtml: string;
  specialOfferPrice1Month: string;
  specialOfferPrice3Months: string;
  specialOfferPrice6Months: string;
  specialOfferPrice9Months: string;
  specialOfferPrice12Months: string;
  specialOfferEmailAudience: PromotionAudience;
  specialOfferPushAudience: PromotionAudience;
  expiryEmailAlertsEnabled: boolean;
  expiryEmailAlertEveryHours: string;
  expiryPushAlertsEnabled: boolean;
  expiryPushAlertBeforeHours: string;
  paymentWalletEnabled: boolean;
  paymentUsdtEnabled: boolean;
  paymentPaypalEnabled: boolean;
  paymentCardEnabled: boolean;
  packageVisibility: Record<string, boolean>;
  packages?: Array<IptvPackage & { workspaceVisible?: boolean }>;
  updatedAt?: string | null;
};

type IptvM3uFormat = {
  key: string;
  label: string;
  description?: string;
  type: string;
  output: string;
  url: string;
};

type CatalogResponse = {
  settings: {
    enabled: boolean;
    activeProvider?: 'tvplus' | 'iotv';
    apiKeyConfigured: boolean;
    demoEnabled: boolean;
    allowWebTrial?: boolean;
    specialPromotionEnabled?: boolean;
    specialPromotionTitle?: string;
    specialPromotionBody?: string;
    specialPromotionBadge?: string;
    specialPromotionButtonText?: string;
    specialPromotionButtonUrl?: string;
    specialPromotionStyle?: string;
    specialPromotionHtml?: string;
    specialOfferEnabled?: boolean;
    specialOfferTitle?: string;
    specialOfferBody?: string;
    specialOfferBadge?: string;
    specialOfferButtonText?: string;
    specialOfferButtonUrl?: string;
    specialOfferStyle?: string;
    specialOfferHtml?: string;
    paymentWalletEnabled?: boolean;
    paymentUsdtEnabled?: boolean;
    paymentPaypalEnabled?: boolean;
    paymentCardEnabled?: boolean;
    paymentPriority?: string[];
  };
  packages: IptvPackage[];
  content?: IptvContentCatalog;
  audienceRole?: 'user' | 'reseller' | 'agent';
};

type IptvCountry = {
  code: string;
  name: string;
  channelCount: number;
  movieCount: number;
};

type IptvChannel = {
  id: string;
  name: string;
  countryCode: string;
  category: string;
  language: string;
  quality: string;
};

type IptvMovie = {
  id: string;
  title: string;
  genre: string;
  year: number;
  runtimeMinutes: number;
  rating: string;
  quality: string;
};

type IptvContentCatalog = {
  countries: IptvCountry[];
  channels: IptvChannel[];
  movies: IptvMovie[];
};

type IptvRetailPriceRow = {
  packageId: string;
  tvplusPackageId: string;
  name: string;
  description?: string | null;
  basePrices: Record<string, string>;
  providerCredits?: Record<string, string>;
  providerCostUsd?: Record<string, string>;
  providerCreditUnitCostUsd?: string;
  retailPrices: Record<string, string>;
  hasCustomPrices: boolean;
  updatedAt?: string | null;
};

type PromotionAudience = 'active' | 'inactive' | 'both';
type PromotionDisplayStyle = 'default' | 'success' | 'premium' | 'urgent';

const promotionAudienceOptions: Array<{ value: PromotionAudience; label: string }> = [
  { value: 'active', label: "All Active User's" },
  { value: 'inactive', label: "All InActive User's" },
  { value: 'both', label: 'Both' },
];

const promotionDisplayStyleOptions: Array<{ value: PromotionDisplayStyle; label: string }> = [
  { value: 'default', label: 'Default Dark' },
  { value: 'success', label: 'Green Success' },
  { value: 'premium', label: 'Premium Gold' },
  { value: 'urgent', label: 'Urgent Red' },
];

const promotionPriceTerms = [
  { label: '1 Month', promotionKey: 'specialPromotionPrice1Month', offerKey: 'specialOfferPrice1Month' },
  { label: '3 Months', promotionKey: 'specialPromotionPrice3Months', offerKey: 'specialOfferPrice3Months' },
  { label: '6 Months', promotionKey: 'specialPromotionPrice6Months', offerKey: 'specialOfferPrice6Months' },
  { label: '9 Months', promotionKey: 'specialPromotionPrice9Months', offerKey: 'specialOfferPrice9Months' },
  { label: '12 Months', promotionKey: 'specialPromotionPrice12Months', offerKey: 'specialOfferPrice12Months' },
] as const;

type PromotionPriceKey = (typeof promotionPriceTerms)[number]['promotionKey'];
type OfferPriceKey = (typeof promotionPriceTerms)[number]['offerKey'];
type PromotionTextSettings = Record<PromotionPriceKey | OfferPriceKey, string>;

type IptvPackageVisibility = {
  user: boolean;
  reseller: boolean;
  agent: boolean;
  trialUser: boolean;
  trialReseller: boolean;
  trialAgent: boolean;
  trialTerms: Record<string, {
    user: boolean;
    reseller: boolean;
    agent: boolean;
  }>;
};

const IPTV_TRIAL_TERMS = [
  'free_1h',
  'free_2h',
  'free_3h',
  'free_4h',
  'free_5h',
  'free_6h',
  'free_1d',
  'free_48h',
] as const;

function defaultTrialTermVisibility() {
  return Object.fromEntries(
    IPTV_TRIAL_TERMS.map((term) => [
      term,
      { user: true, reseller: true, agent: true },
    ]),
  );
}

const DEFAULT_IPTV_VISIBILITY: IptvPackageVisibility = {
  user: true,
  reseller: true,
  agent: true,
  trialUser: true,
  trialReseller: true,
  trialAgent: true,
  trialTerms: defaultTrialTermVisibility(),
};

function normalizeIptvVisibility(input?: Partial<IptvPackageVisibility>): IptvPackageVisibility {
  const trialTerms = defaultTrialTermVisibility();
  const inputTrialTerms = input?.trialTerms || {};
  IPTV_TRIAL_TERMS.forEach((term) => {
    const termVisibility = inputTrialTerms[term] || {};
    trialTerms[term] = {
      user: termVisibility.user !== false,
      reseller: termVisibility.reseller !== false,
      agent: termVisibility.agent !== false,
    };
  });

  return {
    ...DEFAULT_IPTV_VISIBILITY,
    ...(input || {}),
    trialTerms,
  };
}

function normalizeTrialTermKey(value: string) {
  if (value === 'free_24h' || value === 'free_1day') return 'free_1d';
  if (value === 'free_2d' || value === 'trial_48h') return 'free_48h';
  return value;
}

function isTrialVisibleForRole(pkg: IptvPackage | undefined, role: CatalogResponse['audienceRole'], termValue: string) {
  if (!pkg) return false;
  const visibility = normalizeIptvVisibility(pkg.metadata?.visibility);
  const termKey = normalizeTrialTermKey(termValue);
  const roleKey = role === 'reseller' || role === 'agent' ? role : 'user';
  const termVisible = visibility.trialTerms[termKey]?.[roleKey] !== false;
  if (role === 'reseller') return visibility.reseller && visibility.trialReseller && termVisible;
  if (role === 'agent') return visibility.agent && visibility.trialAgent && termVisible;
  return visibility.user && visibility.trialUser && termVisible;
}

const DEFAULT_PROMOTION_TITLE = 'Promotion';
const DEFAULT_OFFER_TITLE = 'Special Offer';

function escapePreviewHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function normalizePreviewActionUrl(value: string) {
  const text = value.trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return text.startsWith('/') ? text : `/${text}`;
}

function buildPromotionEmailPreview(input: { subject: string; body: string; html: string; buttonText: string; buttonUrl: string }) {
  const content = input.html.trim() || escapePreviewHtml(input.body).replace(/\n/g, '<br>');
  const actionUrl = normalizePreviewActionUrl(input.buttonUrl);
  const actionButton = actionUrl
    ? `<div style="margin-top:28px;text-align:center;"><a href="${escapePreviewHtml(actionUrl)}" style="display:inline-block;background:#10b981;color:#052e2b;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:800;font-size:16px;">${escapePreviewHtml(input.buttonText || 'Renew Now')}</a></div>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head><body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#fff;"><div style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;"><h1 style="color:white;margin:0;font-size:28px;">AYA eSIM</h1></div><div style="background:#f9fafb;padding:40px;border-radius:0 0 10px 10px;"><p style="font-size:16px;margin-bottom:20px;">Hi Customer,</p><div style="font-size:16px;line-height:1.8;color:#374151;">${content}</div>${actionButton}<p style="font-size:14px;color:#6b7280;margin-top:30px;">If you have any questions, feel free to reach out to our support team.</p></div><div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px;"><p>Preview email: ${escapePreviewHtml(input.subject)}</p></div></body></html>`;
}

function buildRenewalDealDetails(settings: PromotionTextSettings, type: 'promotion' | 'offer') {
  const priceKey = type === 'promotion' ? 'promotionKey' : 'offerKey';
  const packageLines = promotionPriceTerms
    .map((term) => {
      const price = settings[term[priceKey]]?.trim();
      return price ? `${term.label}: $${price}` : null;
    })
    .filter(Boolean);
  const priceSummary = packageLines.length
    ? `\n\nAvailable renewal prices:\n${packageLines.join('\n')}`
    : '\n\nAdd renewal prices below and they will show here automatically.';
  return `Hannry and benefit from the ${type === 'promotion' ? 'Special promotion' : 'Special offer'}, Now you can renew your package for${priceSummary}`;
}

function shouldUseAutoRenewalDetails(value: string, type: 'promotion' | 'offer') {
  const normalized = value.trim();
  const prefix = `Hannry and benefit from the ${type === 'promotion' ? 'Special promotion' : 'Special offer'}, Now you can renew your package for`;
  return !normalized || normalized === prefix || normalized.startsWith(`${prefix}\n\nAvailable renewal prices:`);
}

const PROFESSIONAL_PROMOTION_HTML = `<div style="border:1px solid rgba(16,185,129,.35);background:linear-gradient(135deg,#052e2b 0%,#0f172a 58%,#0b1120 100%);border-radius:14px;padding:22px;color:#fff;font-family:Inter,Arial,sans-serif;box-shadow:0 18px 45px rgba(0,0,0,.28);"><div style="display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,.16);color:#6ee7b7;border:1px solid rgba(110,231,183,.25);border-radius:999px;padding:6px 11px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Limited IPTV Promotion</div><h3 style="margin:14px 0 8px;font-size:24px;line-height:1.15;font-weight:800;">Upgrade your IPTV plan today</h3><p style="margin:0 0 18px;color:rgba(255,255,255,.76);font-size:14px;line-height:1.6;">Enjoy premium live TV, movies, and series with a special renewal price available for a short time.</p><a href="/iptv-services" style="display:inline-block;background:#10b981;color:#06251f;text-decoration:none;border-radius:10px;padding:11px 16px;font-weight:800;">View Promotion</a></div>`;

const PROFESSIONAL_OFFER_HTML = `<div style="border:1px solid rgba(251,191,36,.35);background:linear-gradient(135deg,#2b1d06 0%,#111827 58%,#09090b 100%);border-radius:14px;padding:22px;color:#fff;font-family:Inter,Arial,sans-serif;box-shadow:0 18px 45px rgba(0,0,0,.28);"><div style="display:inline-flex;align-items:center;gap:8px;background:rgba(251,191,36,.17);color:#fde68a;border:1px solid rgba(253,230,138,.28);border-radius:999px;padding:6px 11px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Special Offer</div><h3 style="margin:14px 0 8px;font-size:24px;line-height:1.15;font-weight:800;">Best value IPTV renewal deal</h3><p style="margin:0 0 18px;color:rgba(255,255,255,.76);font-size:14px;line-height:1.6;">Lock in your entertainment package with exclusive offer pricing before your subscription expires.</p><a href="/iptv-services" style="display:inline-block;background:#fbbf24;color:#1f1300;text-decoration:none;border-radius:10px;padding:11px 16px;font-weight:800;">Claim Offer</a></div>`;

const SUBSCRIPTION_OPTIONS = [
  { value: 'free_1h', label: 'Free 1 Hour', demo: true },
  { value: 'free_2h', label: 'Free 2 Hours', demo: true },
  { value: 'free_3h', label: 'Free 3 Hours', demo: true },
  { value: 'free_4h', label: 'Free 4 Hours', demo: true },
  { value: 'free_5h', label: 'Free 5 Hours', demo: true },
  { value: 'free_6h', label: 'Free 6 Hours', demo: true },
  { value: 'free_1d', label: 'Free 1 Day', demo: true },
  { value: '1', label: '1 Month' },
  { value: '3', label: '3 Months' },
  { value: '6', label: '6 Months' },
  { value: '9', label: '9 Months' },
  { value: '12', label: '12 Months' },
];

const IOTV_SUBSCRIPTION_OPTIONS = [
  { value: 'free_1d', label: 'Free 24 Hours', demo: true },
  { value: 'free_48h', label: 'Free 48 Hours', demo: true },
  { value: '1', label: '1 Month' },
  { value: '3', label: '3 Months' },
  { value: '6', label: '6 Months' },
  { value: '9', label: '9 Months' },
  { value: '12', label: '12 Months' },
];

const RENEWAL_OPTIONS = [
  { value: 1, label: '1 Month' },
  { value: 3, label: '3 Months' },
  { value: 6, label: '6 Months' },
  { value: 9, label: '9 Months' },
  { value: 12, label: '12 Months' },
];

const RETAIL_PRICE_TERMS = [
  { key: 'trial', label: 'Free' },
  { key: '1', label: '1 Month' },
  { key: '3', label: '3 Months' },
  { key: '6', label: '6 Months' },
  { key: '9', label: '9 Months' },
  { key: '12', label: '12 Months' },
];

function deviceLabel(type: string) {
  if (type === 'mag') return 'MAG';
  if (type === 'protocol') return 'Protocol';
  return 'M3U';
}

function statusClass(status: string) {
  if (status === 'active') return 'bg-emerald-500';
  if (status === 'suspended') return 'bg-amber-500';
  if (status === 'refunded') return 'bg-blue-500';
  if (status === 'failed') return 'bg-red-500';
  return 'bg-slate-600';
}

function isIotvOrder(order: IptvOrder) {
  const provider = String(order.providerResponse?.provider || order.providerResponse?.source || '').toLowerCase();
  return provider === 'iotv' || String(order.tvplusPackageId || '').startsWith('iotv-');
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function getTermLabel(order: IptvOrder) {
  if (order.subscriptionLabel) return order.subscriptionLabel;
  if (order.subscriptionTermType === 'hours' && order.subscriptionHours) {
    return `Free ${order.subscriptionHours} Hour${order.subscriptionHours === 1 ? '' : 's'}`;
  }
  return order.subscriptionMonths === 99 ? 'Demo' : `${order.subscriptionMonths} months`;
}

function isFreeIptvTerm(value?: string | number | null) {
  const term = String(value || '');
  return term.startsWith('free_') || term === '99';
}

function getM3uFormats(order: IptvOrder): IptvM3uFormat[] {
  if (order.m3uFormats?.length) return order.m3uFormats;
  if (!order.m3uUrl) return [];

  const formats = [
    { key: 'm3u_plus_ts', label: 'M3U Plus - MPEG-TS', description: 'Best for IPTV Smarters, TiviMate, and most apps.', type: 'm3u_plus', output: 'ts' },
    { key: 'm3u_plus_m3u8', label: 'M3U Plus - HLS', description: 'Use when your player prefers .m3u8 streams.', type: 'm3u_plus', output: 'm3u8' },
    { key: 'm3u_ts', label: 'Simple M3U - MPEG-TS', description: 'Plain channel list for basic players.', type: 'm3u', output: 'ts' },
    { key: 'm3u_m3u8', label: 'Simple M3U - HLS', description: 'Plain channel list with HLS streams.', type: 'm3u', output: 'm3u8' },
  ];

  return formats.map((format) => {
    try {
      const url = new URL(order.m3uUrl || '');
      url.searchParams.set('type', format.type);
      url.searchParams.set('output', format.output);
      return { ...format, url: url.toString() };
    } catch {
      return { ...format, url: order.m3uUrl || '' };
    }
  });
}

function CopyButton({ value }: { value?: string | null }) {
  const { toast } = useToast();
  if (!value) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        toast({ title: 'Copied', description: 'IPTV detail copied to clipboard.' });
      }}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function IPTVServices({ mode = 'services' }: { mode?: IptvWorkspaceMode } = {}) {
  const { toast } = useToast();
  const [deviceType, setDeviceType] = useState<'m3u' | 'mag' | 'protocol'>('m3u');
  const [packageId, setPackageId] = useState('');
  const [subscriptionTerm, setSubscriptionTerm] = useState('free_1h');
  const [renewalTerms, setRenewalTerms] = useState<Record<string, number>>({});
  const [selectedM3uFormats, setSelectedM3uFormats] = useState<Record<string, string>>({});
  const [retailDrafts, setRetailDrafts] = useState<Record<string, Record<string, string>>>({});
  const [macAddress, setMacAddress] = useState('');
  const [note, setNote] = useState('');
  const [assignToExistingUser, setAssignToExistingUser] = useState(false);
  const [assignedUserId, setAssignedUserId] = useState('');

  const { data: catalog, isLoading: catalogLoading } = useQuery<CatalogResponse>({
    queryKey: ['/api/iptv/catalog', { platform: 'web' }],
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<IptvOrder[]>({
    queryKey: ['/api/iptv/orders'],
  });

  const canManageRetailPrices = catalog?.audienceRole === 'reseller' || catalog?.audienceRole === 'agent';
  const { data: assignableUsers = [], isLoading: assignableUsersLoading } = useQuery<IptvAssignableUser[]>({
    queryKey: ['/api/iptv/assignable-users'],
    enabled: Boolean(canManageRetailPrices && mode === 'services'),
  });
  const { data: retailPrices = [], isLoading: retailPricesLoading } = useQuery<IptvRetailPriceRow[]>({
    queryKey: ['/api/iptv/retail-prices'],
    enabled: Boolean(canManageRetailPrices),
  });
  const { data: workspaceSettings, isLoading: workspaceSettingsLoading } = useQuery<IptvWorkspaceSettings>({
    queryKey: ['/api/iptv/workspace/settings'],
    enabled: Boolean(canManageRetailPrices && mode === 'settings'),
  });

  const activePackages = catalog?.packages || [];
  const content = catalog?.content;
  const selectedPackageId = packageId || activePackages[0]?.id || '';
  const selectedPackage = activePackages.find((pkg) => pkg.id === selectedPackageId || pkg.tvplusPackageId === selectedPackageId);
  const subscriptionOptions = useMemo(() => {
    const options = catalog?.settings.activeProvider === 'iotv' ? IOTV_SUBSCRIPTION_OPTIONS : SUBSCRIPTION_OPTIONS;
    return options.filter((option) => !option.demo || (catalog?.settings.demoEnabled && catalog?.settings.allowWebTrial !== false && isTrialVisibleForRole(selectedPackage, catalog?.audienceRole, option.value)));
  }, [catalog?.audienceRole, catalog?.settings.activeProvider, catalog?.settings.allowWebTrial, catalog?.settings.demoEnabled, selectedPackage]);
  const paymentLabels = useMemo(() => {
    const enabled = new Set<string>();
    if (catalog?.settings.paymentWalletEnabled !== false) enabled.add('wallet');
    if (catalog?.settings.paymentUsdtEnabled !== false) enabled.add('usdt');
    if (catalog?.settings.paymentPaypalEnabled !== false) enabled.add('paypal');
    if (catalog?.settings.paymentCardEnabled !== false) enabled.add('card');
    const labels: Record<string, string> = {
      wallet: 'Wallet Balance',
      usdt: 'USDT',
      paypal: 'PayPal',
      card: 'Credit Card',
    };
    const priority = catalog?.settings.paymentPriority?.length ? catalog.settings.paymentPriority : ['wallet', 'usdt', 'paypal', 'card'];
    return priority.filter((method) => enabled.has(method)).map((method) => labels[method] || method);
  }, [catalog?.settings.paymentCardEnabled, catalog?.settings.paymentPaypalEnabled, catalog?.settings.paymentPriority, catalog?.settings.paymentUsdtEnabled, catalog?.settings.paymentWalletEnabled]);

  useEffect(() => {
    if (subscriptionOptions.length === 0) return;
    if (!subscriptionOptions.some((option) => option.value === subscriptionTerm)) {
      setSubscriptionTerm(subscriptionOptions[0].value);
    }
  }, [subscriptionOptions, subscriptionTerm]);

  useEffect(() => {
    if (!assignToExistingUser) {
      setAssignedUserId('');
      return;
    }
    if (assignableUsers.length > 0 && !assignableUsers.some((user) => user.id === assignedUserId)) {
      setAssignedUserId(assignableUsers[0].id);
    }
  }, [assignToExistingUser, assignableUsers, assignedUserId]);

  useEffect(() => {
    if (!retailPrices.length) return;
    setRetailDrafts((current) => {
      const next = { ...current };
      for (const row of retailPrices) {
        if (!next[row.packageId]) {
          next[row.packageId] = Object.fromEntries(
            RETAIL_PRICE_TERMS.map((term) => [term.key, row.retailPrices?.[term.key] || row.basePrices?.[term.key] || '0.00']),
          );
        }
      }
      return next;
    });
  }, [retailPrices]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/iptv/orders', {
        deviceType,
        packageId: selectedPackageId,
        subscriptionTerm,
        clientPlatform: 'web',
        paymentMethod: isFreeIptvTerm(subscriptionTerm) ? undefined : 'wallet',
        macAddress,
        note,
        assignedUserId: assignToExistingUser ? assignedUserId : undefined,
      });
      return response.json();
    },
    onSuccess: async () => {
      setMacAddress('');
      setNote('');
      setAssignToExistingUser(false);
      setAssignedUserId('');
      await queryClient.invalidateQueries({ queryKey: ['/api/iptv/orders'] });
      toast({ title: 'IPTV created', description: assignToExistingUser ? 'The IPTV subscription was assigned to the selected user.' : 'The IPTV subscription is now available in your account.' });
    },
    onError: (error: any) => {
      toast({
        title: 'IPTV request failed',
        description: error.message || 'Could not create the IPTV subscription.',
        variant: 'destructive',
      });
    },
  });

  const renewMutation = useMutation({
    mutationFn: async ({ id, months }: { id: string; months: number }) => {
      const response = await apiRequest('POST', `/api/iptv/orders/${id}/renew`, { subscriptionMonths: months, paymentMethod: 'wallet' });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/iptv/orders'] });
      toast({ title: 'Renewed', description: 'The IPTV subscription was renewed successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Renewal failed',
        description: error.message || 'Could not renew this IPTV subscription.',
        variant: 'destructive',
      });
    },
  });

  const saveRetailMutation = useMutation({
    mutationFn: async ({ packageId, prices }: { packageId: string; prices: Record<string, string> }) => {
      const response = await apiRequest('PATCH', `/api/iptv/retail-prices/${packageId}`, { prices });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/iptv/retail-prices'] });
      toast({ title: 'Retail prices saved', description: 'Your IPTV retail prices were updated.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Could not save IPTV retail prices.',
        variant: 'destructive',
      });
    },
  });

  const saveWorkspaceSettingsMutation = useMutation({
    mutationFn: async (payload: Partial<IptvWorkspaceSettings>) => {
      const response = await apiRequest('PATCH', '/api/iptv/workspace/settings', payload);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/iptv/workspace/settings'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/iptv/catalog'] });
      toast({ title: 'IPTV settings saved', description: 'Your IPTV workspace settings were updated.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Could not save IPTV workspace settings.',
        variant: 'destructive',
      });
    },
  });

  const canSubmit = useMemo(() => {
    if (!catalog?.settings.enabled) return false;
    if (!selectedPackageId) return false;
    if (subscriptionOptions.length === 0) return false;
    if (deviceType === 'mag' && !macAddress.trim()) return false;
    if (assignToExistingUser && !assignedUserId) return false;
    return true;
  }, [catalog?.settings.enabled, selectedPackageId, subscriptionOptions.length, deviceType, macAddress, assignToExistingUser, assignedUserId]);

  if (catalogLoading) {
    return (
      <div className="flex min-h-[26rem] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (mode === 'cost-price') {
    return (
      <IptvWorkspaceFrame
        icon={<CircleDollarSign className="h-4 w-4" />}
        title="IPTV Cost & Price"
        description="Set your retail IPTV package prices using the admin reseller or agent prices as the base."
      >
        {canManageRetailPrices ? (
          <IptvRetailPriceManager
            rows={retailPrices}
            drafts={retailDrafts}
            isLoading={retailPricesLoading}
            isSaving={saveRetailMutation.isPending}
            roleLabel={catalog?.audienceRole === 'agent' ? 'Agent' : 'Reseller'}
            onChange={(packageId, term, value) =>
              setRetailDrafts((current) => ({
                ...current,
                [packageId]: {
                  ...(current[packageId] || {}),
                  [term]: value,
                },
              }))
            }
            onSave={(packageId) => saveRetailMutation.mutate({ packageId, prices: retailDrafts[packageId] || {} })}
          />
        ) : (
          <WorkspaceNotice message="Cost & Price is available only for reseller and agent accounts." />
        )}
      </IptvWorkspaceFrame>
    );
  }

  if (mode === 'logs') {
    return (
      <IptvWorkspaceFrame
        icon={<FileText className="h-4 w-4" />}
        title="IPTV Log's"
        description="Review IPTV subscriptions, renewals, package terms, credentials, and current statuses."
      >
        <IptvOrderLogTable orders={orders} isLoading={ordersLoading} />
      </IptvWorkspaceFrame>
    );
  }

  if (mode === 'users-list') {
    return (
      <IptvWorkspaceFrame
        icon={<Users className="h-4 w-4" />}
        title="IPTV User's List"
        description="See users and IPTV lines connected to your account workspace."
      >
        <IptvUserList orders={orders} isLoading={ordersLoading} />
      </IptvWorkspaceFrame>
    );
  }

  if (mode === 'settings') {
    return (
      <IptvWorkspaceFrame
        icon={<Settings2 className="h-4 w-4" />}
        title="IPTV Setting"
        description="Dedicated IPTV settings for your clients and storefront workspace."
      >
        {canManageRetailPrices ? (
          <IptvWorkspaceSettingsPanel
            settings={workspaceSettings}
            isLoading={workspaceSettingsLoading}
            isSaving={saveWorkspaceSettingsMutation.isPending}
            onSave={(payload) => saveWorkspaceSettingsMutation.mutate(payload)}
          />
        ) : (
          <WorkspaceNotice message="Workspace settings are available only for reseller and agent accounts." />
        )}
      </IptvWorkspaceFrame>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Tv className="h-4 w-4" />
            IPTV Services
          </div>
          <h1 className="mt-2 text-3xl font-bold text-white">IPTV Subscriptions</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Create and manage M3U, MAG, and Protocol IPTV subscriptions from your account.
          </p>
        </div>
        <Badge className={cn('w-fit', catalog?.settings.enabled ? 'bg-emerald-500' : 'bg-slate-600')}>
          {catalog?.settings.enabled ? 'Ordering available' : 'Ordering disabled'}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-white/10 bg-[#10141f] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              New IPTV
            </CardTitle>
            <CardDescription>Select a package and device type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!catalog?.settings.enabled && (
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
                IPTV ordering is not enabled yet. Please contact support.
              </div>
            )}
            {catalog?.settings.demoEnabled && catalog?.settings.allowWebTrial === false && (
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
                Free IPTV trials are not available from the web portal right now.
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {(['m3u', 'mag', 'protocol'] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={deviceType === type ? 'default' : 'outline'}
                  className="h-10"
                  onClick={() => setDeviceType(type)}
                >
                  {deviceLabel(type)}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Package</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value={selectedPackageId}
                onChange={(event) => setPackageId(event.target.value)}
              >
                {activePackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Subscription</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value={subscriptionTerm}
                onChange={(event) => setSubscriptionTerm(event.target.value)}
              >
                {subscriptionOptions
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </div>

            {canManageRetailPrices && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-white/20"
                    checked={assignToExistingUser}
                    onChange={(event) => setAssignToExistingUser(event.target.checked)}
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 font-medium text-white">
                      <UserPlus className="h-4 w-4 text-primary" />
                      Assign it to an Existing User
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      Keep this off to create the IPTV account under your own account.
                    </span>
                  </span>
                </label>

                {assignToExistingUser && (
                  <div className="mt-3 space-y-2">
                    <Label>Existing User</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                      value={assignedUserId}
                      onChange={(event) => setAssignedUserId(event.target.value)}
                      disabled={assignableUsersLoading || assignableUsers.length === 0}
                    >
                      {assignableUsers.length === 0 ? (
                        <option value="">{assignableUsersLoading ? 'Loading users...' : 'No existing users available'}</option>
                      ) : (
                        assignableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email} - {user.email}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>
            )}

            {paymentLabels.length > 0 && (
              <div className="rounded-lg border border-white/10 p-3 text-sm text-slate-300">
                <div className="font-medium text-white">Payment Priority</div>
                <div className="mt-1">{paymentLabels.join(' -> ')}</div>
              </div>
            )}

            {deviceType === 'mag' && (
              <div className="space-y-2">
                <Label>MAC Address</Label>
                <Input value={macAddress} onChange={(event) => setMacAddress(event.target.value)} placeholder="00:1A:79:XX:XX:XX" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional customer/device note" />
            </div>

            <Button className="w-full" disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MonitorPlay className="mr-2 h-4 w-4" />}
              {isFreeIptvTerm(subscriptionTerm) ? 'Create Free IPTV' : 'Pay With Wallet & Create'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">My IPTV</h2>
            {ordersLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>

          {orders.length === 0 && !ordersLoading ? (
            <Card className="border-white/10 bg-[#10141f] text-white">
              <CardContent className="flex min-h-[12rem] flex-col items-center justify-center text-center">
                <MonitorPlay className="h-10 w-10 text-slate-400" />
                <p className="mt-3 font-semibold">No IPTV subscriptions yet</p>
                <p className="mt-1 text-sm text-slate-400">Create your first IPTV subscription from the form.</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const m3uFormats = getM3uFormats(order);
              const selectedFormatKey = selectedM3uFormats[order.id] || m3uFormats[0]?.key || 'm3u_plus_ts';
              const selectedFormat = m3uFormats.find((format) => format.key === selectedFormatKey) || m3uFormats[0];
              const selectedM3uUrl = selectedFormat?.url || order.m3uUrl;

              return (
              <Card key={order.id} className="border-white/10 bg-[#10141f] text-white">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MonitorPlay className="h-5 w-5 text-primary" />
                        {order.packageName || 'IPTV Package'}
                      </CardTitle>
                      <CardDescription>
                        {deviceLabel(order.deviceType)} - {getTermLabel(order)}
                      </CardDescription>
                    </div>
                    <Badge className={order.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600'}>{order.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {order.m3uUrl && (
                      <div className="rounded-lg border border-white/10 p-3 sm:col-span-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-xs text-slate-400">M3U Link Format</div>
                            <div className="text-sm font-medium text-white">{selectedFormat?.label || 'M3U Plus - MPEG-TS'}</div>
                            {selectedFormat?.description && <div className="text-xs text-slate-500">{selectedFormat.description}</div>}
                          </div>
                          <select
                            className="h-9 rounded-md border border-white/10 bg-[#0b1020] px-3 text-sm text-white outline-none focus:border-primary"
                            value={selectedFormatKey}
                            onChange={(event) => setSelectedM3uFormats((current) => ({ ...current, [order.id]: event.target.value }))}
                          >
                            {m3uFormats.map((format) => (
                              <option key={format.key} value={format.key}>
                                {format.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm">
                          <span className="truncate">{selectedM3uUrl}</span>
                          <CopyButton value={selectedM3uUrl} />
                        </div>
                      </div>
                    )}
                    {order.portalUrl && (
                      <div className="rounded-lg border border-white/10 p-3">
                        <div className="text-xs text-slate-400">Portal URL</div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">{order.portalUrl}</span>
                          <CopyButton value={order.portalUrl} />
                        </div>
                      </div>
                    )}
                    {order.protocolCode && (
                      <div className="rounded-lg border border-white/10 p-3">
                        <div className="text-xs text-slate-400">Protocol Code</div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                          <span className="font-mono">{order.protocolCode}</span>
                          <CopyButton value={order.protocolCode} />
                        </div>
                      </div>
                    )}
                    {order.username && (
                      <div className="rounded-lg border border-white/10 p-3">
                        <div className="text-xs text-slate-400">Login</div>
                        <div className="mt-1 flex items-center gap-2 text-sm">
                          <KeyRound className="h-4 w-4 text-primary" />
                          <span>{order.username}</span>
                          {order.password && <span className="text-slate-400">/ {order.password}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      Expires {formatDate(order.expiresAt)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.m3uUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/api/iptv/orders/${order.id}/m3u-download?format=${encodeURIComponent(selectedFormatKey)}`}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Selected M3U
                          </a>
                        </Button>
                      )}
                      {order.deviceType !== 'protocol' && order.subscriptionMonths !== 99 && order.subscriptionTermType !== 'hours' && (
                        <div className="flex flex-wrap gap-2">
                          <select
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            value={renewalTerms[order.id] || 12}
                            onChange={(event) => setRenewalTerms((current) => ({ ...current, [order.id]: Number(event.target.value) }))}
                          >
                            {RENEWAL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={renewMutation.isPending}
                            onClick={() => renewMutation.mutate({ id: order.id, months: renewalTerms[order.id] || 12 })}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Renew
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })
          )}

          {content && <IptvContentPreview content={content} compact />}
        </div>
      </div>

      {(catalog?.settings.specialPromotionEnabled || catalog?.settings.specialOfferEnabled) && (
        <div className="grid gap-4 md:grid-cols-2">
          {catalog.settings.specialPromotionEnabled && (
            <IptvMessageCard
              title={catalog.settings.specialPromotionTitle || 'Special Promotion'}
              body={catalog.settings.specialPromotionBody}
              badge={catalog.settings.specialPromotionBadge}
              buttonText={catalog.settings.specialPromotionButtonText}
              buttonUrl={catalog.settings.specialPromotionButtonUrl}
              styleName={catalog.settings.specialPromotionStyle}
              html={catalog.settings.specialPromotionHtml}
            />
          )}
          {catalog.settings.specialOfferEnabled && (
            <IptvMessageCard
              title={catalog.settings.specialOfferTitle || 'Special Offer'}
              body={catalog.settings.specialOfferBody}
              badge={catalog.settings.specialOfferBadge}
              buttonText={catalog.settings.specialOfferButtonText}
              buttonUrl={catalog.settings.specialOfferButtonUrl}
              styleName={catalog.settings.specialOfferStyle}
              html={catalog.settings.specialOfferHtml}
            />
          )}
        </div>
      )}

    </div>
  );
}

function IptvWorkspaceFrame({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          {icon}
          IPTV Services
        </div>
        <h1 className="mt-2 text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">{description}</p>
      </div>
      {children}
    </div>
  );
}

function WorkspaceNotice({ message }: { message: string }) {
  return (
    <Card className="border-white/10 bg-[#10141f] text-white">
      <CardContent className="p-6 text-sm text-slate-300">{message}</CardContent>
    </Card>
  );
}

function IptvOrderLogTable({ orders, isLoading }: { orders: IptvOrder[]; isLoading: boolean }) {
  return (
    <Card className="border-white/10 bg-[#10141f] text-white">
      <CardHeader>
        <CardTitle>Subscription Logs</CardTitle>
        <CardDescription>All IPTV records currently visible in this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex min-h-[10rem] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-white/10 p-4 text-sm text-slate-400">No IPTV logs yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-white/5 text-left text-slate-300">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Package</th>
                  <th className="p-3">Device</th>
                  <th className="p-3">Term</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Expires</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-white/10">
                    <td className="p-3">
                      <div className="font-medium">{order.userName || 'Account User'}</div>
                      <div className="text-xs text-slate-400">{order.userEmail || order.username || order.id}</div>
                    </td>
                    <td className="p-3">{order.packageName || 'IPTV Package'}</td>
                    <td className="p-3">{deviceLabel(order.deviceType)}</td>
                    <td className="p-3">{getTermLabel(order)}</td>
                    <td className="p-3"><Badge className={order.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600'}>{order.status}</Badge></td>
                    <td className="p-3">{formatDate(order.expiresAt)}</td>
                    <td className="p-3">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IptvUserList({ orders, isLoading }: { orders: IptvOrder[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<IptvOrder | null>(null);
  const [credentialOrder, setCredentialOrder] = useState<IptvOrder | null>(null);
  const [credentialDraft, setCredentialDraft] = useState({ username: '', password: '', adminNote: '' });
  const [renewMonths, setRenewMonths] = useState('12');

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) => {
      const response = await apiRequest('PATCH', `/api/iptv/orders/${id}/status`, { status, adminNote });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/iptv/orders'] });
      toast({ title: 'IPTV user updated', description: 'The subscription status was changed.' });
    },
    onError: (error: any) => {
      toast({ title: 'Action failed', description: error.message || 'Could not update IPTV user.', variant: 'destructive' });
    },
  });

  const renewOrder = useMutation({
    mutationFn: async ({ id, months }: { id: string; months: number }) => {
      const response = await apiRequest('POST', `/api/iptv/orders/${id}/renew`, { subscriptionMonths: months, paymentMethod: 'wallet' });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/iptv/orders'] });
      toast({ title: 'IPTV renewed', description: 'The subscription was renewed successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Renew failed', description: error.message || 'Could not renew IPTV subscription.', variant: 'destructive' });
    },
  });

  const updateCredentials = useMutation({
    mutationFn: async () => {
      if (!credentialOrder) throw new Error('Select an IPTV user first');
      const response = await apiRequest('PATCH', `/api/iptv/orders/${credentialOrder.id}/credentials`, credentialDraft);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/iptv/orders'] });
      setCredentialOrder(null);
      setCredentialDraft({ username: '', password: '', adminNote: '' });
      toast({ title: 'Credentials changed', description: 'Username and password were updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Credential update failed', description: error.message || 'Could not update credentials.', variant: 'destructive' });
    },
  });

  function openCredentials(order: IptvOrder) {
    setCredentialOrder(order);
    setCredentialDraft({
      username: order.username || '',
      password: order.password || '',
      adminNote: 'IPTV credentials changed from reseller user list',
    });
  }

  return (
    <Card className="border-white/10 bg-[#10141f] text-white">
      <CardHeader>
        <CardTitle>IPTV User List</CardTitle>
        <CardDescription>Manage IPTV subscriptions with the same line-by-line view as the admin backend.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex min-h-[10rem] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-white/10 p-4 text-sm text-slate-400">No IPTV users yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[1260px] text-sm">
              <thead>
                <tr>
                  <th className="border-b border-white/10 p-3 text-left text-slate-300">User</th>
                  <th className="border-b border-white/10 p-3 text-left text-slate-300">Package</th>
                  <th className="border-b border-white/10 p-3 text-left text-slate-300">Device</th>
                  <th className="border-b border-white/10 p-3 text-left text-slate-300">Term</th>
                  <th className="border-b border-white/10 p-3 text-left text-slate-300">Expires</th>
                  <th className="border-b border-white/10 p-3 text-left text-slate-300">Status</th>
                  <th className="border-b border-white/10 p-3 text-left text-slate-300">Manage Options</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-white/10 last:border-b-0">
                    <td className="p-3">
                      <div className="font-medium">{order.userName || 'IPTV User'}</div>
                      <div className="text-xs text-slate-400">{order.userEmail || order.username || order.id}</div>
                    </td>
                    <td className="p-3">{order.packageName || 'IPTV Package'}</td>
                    <td className="p-3 uppercase">{order.deviceType}</td>
                    <td className="p-3">{getTermLabel(order)}</td>
                    <td className="p-3">{formatDate(order.expiresAt)}</td>
                    <td className="p-3"><Badge className={statusClass(order.status)}>{order.status}</Badge></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Details
                        </Button>
                        {isIotvOrder(order) && order.deviceType === 'm3u' && (
                          <Button size="sm" variant="outline" onClick={() => openCredentials(order)}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Credentials
                          </Button>
                        )}
                        {order.m3uUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/api/iptv/orders/${order.id}/m3u-download`}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </a>
                          </Button>
                        )}
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                          value={renewMonths}
                          onChange={(event) => setRenewMonths(event.target.value)}
                        >
                          <option value="1">1M</option>
                          <option value="3">3M</option>
                          <option value="6">6M</option>
                          <option value="12">12M</option>
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={renewOrder.isPending || order.subscriptionTermType === 'hours' || order.subscriptionMonths === 99}
                          onClick={() => renewOrder.mutate({ id: order.id, months: Number(renewMonths) || 12 })}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Renew
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateStatus.isPending || order.status === 'refunded'}
                          onClick={() => updateStatus.mutate({ id: order.id, status: 'refunded', adminNote: 'IPTV refund marked by reseller/agent' })}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Refund
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateStatus.isPending || order.status === 'suspended'}
                          onClick={() => updateStatus.mutate({ id: order.id, status: 'suspended', adminNote: 'IPTV user suspended by reseller/agent' })}
                        >
                          <PauseCircle className="mr-2 h-4 w-4" />
                          Suspend
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>IPTV User Details</DialogTitle>
            <DialogDescription>Subscription, credentials, and service details.</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="User" value={selectedOrder.userName || selectedOrder.userEmail || 'Unknown'} />
              <Detail label="Package" value={selectedOrder.packageName || 'IPTV Package'} />
              <Detail label="Device" value={selectedOrder.deviceType.toUpperCase()} />
              <Detail label="Term" value={getTermLabel(selectedOrder)} />
              <Detail label="Status" value={selectedOrder.status} />
              <Detail label="Expires" value={formatDate(selectedOrder.expiresAt)} />
              <Detail label="Username" value={selectedOrder.username || '-'} />
              <Detail label="Password" value={selectedOrder.password || '-'} />
              <Detail label="MAC" value={selectedOrder.macAddress || '-'} />
              <Detail label="Protocol Code" value={selectedOrder.protocolCode || '-'} />
              <div className="sm:col-span-2"><Detail label="M3U URL" value={selectedOrder.m3uUrl || '-'} /></div>
              <div className="sm:col-span-2"><Detail label="Portal URL" value={selectedOrder.portalUrl || '-'} /></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(credentialOrder)} onOpenChange={(open) => !open && setCredentialOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change IPTV Credentials</DialogTitle>
            <DialogDescription>Updates username and password for supported IPTV service lines.</DialogDescription>
          </DialogHeader>
          {credentialOrder && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{credentialOrder.packageName || 'IPTV Package'}</div>
                <div className="text-xs text-muted-foreground">Current: {credentialOrder.username || '-'} / {credentialOrder.password || '-'}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>New Username</Label>
                  <Input value={credentialDraft.username} onChange={(event) => setCredentialDraft((current) => ({ ...current, username: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input value={credentialDraft.password} onChange={(event) => setCredentialDraft((current) => ({ ...current, password: event.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCredentialOrder(null)}>Cancel</Button>
                <Button disabled={updateCredentials.isPending || !credentialDraft.username.trim() || !credentialDraft.password.trim()} onClick={() => updateCredentials.mutate()}>
                  {updateCredentials.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  Update
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-medium">{value || '-'}</div>
    </div>
  );
}

function IptvWorkspaceSettingsPanel({
  settings,
  isLoading,
  isSaving,
  onSave,
}: {
  settings?: IptvWorkspaceSettings;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (payload: Partial<IptvWorkspaceSettings>) => void;
}) {
  const [draft, setDraft] = useState<IptvWorkspaceSettings>({
    activeProvider: 'tvplus',
    enabled: true,
    storeName: '',
    supportEmail: '',
    supportWhatsapp: '',
    allowTrials: true,
    allowRenewals: true,
    paymentPriority: ['wallet', 'usdt', 'paypal', 'card'],
    promotionEnabled: false,
    promotionTitle: '',
    promotionBody: '',
    allowWebTrial: true,
    allowMobileTrial: true,
    autoRenewEnabled: false,
    specialPromotionEnabled: false,
    specialPromotionTitle: DEFAULT_PROMOTION_TITLE,
    specialPromotionBody: '',
    specialPromotionBadge: '',
    specialPromotionButtonText: '',
    specialPromotionButtonUrl: '',
    specialPromotionStyle: 'default',
    specialPromotionHtml: '',
    specialPromotionPrice1Month: '',
    specialPromotionPrice3Months: '',
    specialPromotionPrice6Months: '',
    specialPromotionPrice9Months: '',
    specialPromotionPrice12Months: '',
    specialPromotionEmailAudience: 'active',
    specialPromotionPushAudience: 'active',
    specialOfferEnabled: false,
    specialOfferTitle: DEFAULT_OFFER_TITLE,
    specialOfferBody: '',
    specialOfferBadge: '',
    specialOfferButtonText: '',
    specialOfferButtonUrl: '',
    specialOfferStyle: 'default',
    specialOfferHtml: '',
    specialOfferPrice1Month: '',
    specialOfferPrice3Months: '',
    specialOfferPrice6Months: '',
    specialOfferPrice9Months: '',
    specialOfferPrice12Months: '',
    specialOfferEmailAudience: 'active',
    specialOfferPushAudience: 'active',
    expiryEmailAlertsEnabled: false,
    expiryEmailAlertEveryHours: '6',
    expiryPushAlertsEnabled: false,
    expiryPushAlertBeforeHours: '12',
    paymentWalletEnabled: true,
    paymentUsdtEnabled: true,
    paymentPaypalEnabled: true,
    paymentCardEnabled: true,
    packageVisibility: {},
    packages: [],
  });
  const [emailPreview, setEmailPreview] = useState<{ title: string; html: string } | null>(null);

  useEffect(() => {
    if (settings) setDraft((current) => ({ ...current, ...settings }));
  }, [settings]);

  const packages = draft.packages || [];
  const filteredPackages = packages.filter((pkg) =>
    draft.activeProvider === 'iotv'
      ? String(pkg.tvplusPackageId || '').startsWith('iotv-')
      : !String(pkg.tvplusPackageId || '').startsWith('iotv-'),
  );
  const providerLabel = draft.activeProvider === 'iotv' ? 'Package Premium' : 'Package Standard';
  const promotionTitle = draft.specialPromotionTitle || draft.promotionTitle || DEFAULT_PROMOTION_TITLE;
  const promotionDetails = shouldUseAutoRenewalDetails(draft.specialPromotionBody || draft.promotionBody || '', 'promotion')
    ? buildRenewalDealDetails(draft as unknown as PromotionTextSettings, 'promotion')
    : draft.specialPromotionBody || draft.promotionBody || '';
  const offerTitle = draft.specialOfferTitle || DEFAULT_OFFER_TITLE;
  const offerDetails = shouldUseAutoRenewalDetails(draft.specialOfferBody || '', 'offer')
    ? buildRenewalDealDetails(draft as unknown as PromotionTextSettings, 'offer')
    : draft.specialOfferBody || '';

  const setPackageVisible = (packageId: string, visible: boolean) => {
    const packageVisibility = { ...(draft.packageVisibility || {}), [packageId]: visible };
    setDraft((current) => ({
      ...current,
      packageVisibility,
      packages: (current.packages || []).map((pkg) =>
        pkg.id === packageId ? { ...pkg, workspaceVisible: visible } : pkg,
      ),
    }));
    onSave({ packageVisibility });
  };

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-[#10141f] text-white">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label>Available IPTV Package Type</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={draft.activeProvider}
              onChange={(event) => {
                const activeProvider = event.target.value === 'iotv' ? 'iotv' : 'tvplus';
                setDraft((current) => ({ ...current, activeProvider }));
                onSave({ activeProvider });
              }}
            >
              <option value="tvplus">Package Standard</option>
              <option value="iotv">Package Premium</option>
            </select>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <div className="font-medium text-white">Feature configuration for: {providerLabel}</div>
            <div className="mt-1">These settings apply only to this reseller or agent workspace and their users.</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#10141f] text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListVideo className="h-5 w-5 text-primary" />
            IPTV Service Packages
          </CardTitle>
          <CardDescription>Show or hide each synced IPTV package for your users only. Price and cost are managed from Cost & Price.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-[10rem] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="rounded-lg border border-white/10 p-4 text-sm text-slate-400">
              No {providerLabel} packages available for this workspace.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="hidden grid-cols-[220px_minmax(320px,1fr)_140px_170px] border-b border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:grid">
                <div>Package Type</div>
                <div>Package</div>
                <div>Status</div>
                <div className="text-right">Visibility</div>
              </div>
              <div className="divide-y divide-white/10">
                {filteredPackages.map((pkg) => {
                  const visible = draft.packageVisibility?.[pkg.id] !== false;
                  return (
                    <div
                      key={pkg.id}
                      className="grid gap-4 px-4 py-4 transition hover:bg-white/5 lg:grid-cols-[220px_minmax(320px,1fr)_140px_170px] lg:items-center"
                    >
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Package Type</div>
                        <Badge variant="outline" className="max-w-full truncate">{providerLabel}</Badge>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Package</div>
                        <div className="mt-1 truncate text-sm font-semibold text-white lg:mt-0">{pkg.name}</div>
                        {pkg.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{pkg.description}</p>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Status</div>
                        {visible ? (
                          <Badge className="mt-1 gap-1.5 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/15 lg:mt-0">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Shown
                          </Badge>
                        ) : (
                          <Badge className="mt-1 gap-1.5 bg-red-500/15 text-red-200 hover:bg-red-500/15 lg:mt-0">
                            <XCircle className="h-3.5 w-3.5" />
                            Hidden
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-background/60 px-3 py-2 lg:justify-end lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                        <Label className="text-sm font-medium">{visible ? 'Show Package' : 'Hide Package'}</Label>
                        <div className="flex items-center gap-2">
                          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                          <Switch
                            checked={visible}
                            disabled={isSaving}
                            onCheckedChange={(checked) => setPackageVisible(pkg.id, checked)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#10141f] text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Feature Settings
          </CardTitle>
          <CardDescription>Configure trial access, renewals, promotions, support, and payment priority for your selected package type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex min-h-[10rem] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                  <span>Enable IPTV</span>
                  <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft((current) => ({ ...current, enabled }))} />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                  <span>Enable Demos</span>
                  <Switch checked={draft.allowTrials} onCheckedChange={(allowTrials) => setDraft((current) => ({ ...current, allowTrials }))} />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                  <span>Web UI Trials</span>
                  <Switch checked={draft.allowWebTrial} onCheckedChange={(allowWebTrial) => setDraft((current) => ({ ...current, allowWebTrial }))} />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                  <span>Mobile App Trials</span>
                  <Switch checked={draft.allowMobileTrial} onCheckedChange={(allowMobileTrial) => setDraft((current) => ({ ...current, allowMobileTrial }))} />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                  <span>Auto Renew</span>
                  <Switch checked={draft.allowRenewals} onCheckedChange={(allowRenewals) => setDraft((current) => ({ ...current, allowRenewals }))} />
                </label>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3 rounded-lg border border-white/10 p-3">
                  <label className="flex items-center justify-between">
                    <span className="font-medium">Special Promotion</span>
                    <Switch checked={draft.specialPromotionEnabled} onCheckedChange={(specialPromotionEnabled) => setDraft((current) => ({ ...current, specialPromotionEnabled, promotionEnabled: specialPromotionEnabled }))} />
                  </label>
                  <Input value={promotionTitle} onChange={(event) => setDraft((current) => ({ ...current, specialPromotionTitle: event.target.value, promotionTitle: event.target.value }))} placeholder="Promotion title" />
                  <Textarea value={promotionDetails} onChange={(event) => setDraft((current) => ({ ...current, specialPromotionBody: event.target.value, promotionBody: event.target.value }))} placeholder="Promotion details" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={draft.specialPromotionBadge} onChange={(event) => setDraft((current) => ({ ...current, specialPromotionBadge: event.target.value }))} placeholder="Badge text e.g. Limited Time" />
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={draft.specialPromotionStyle} onChange={(event) => setDraft((current) => ({ ...current, specialPromotionStyle: event.target.value as PromotionDisplayStyle }))}>
                      {promotionDisplayStyleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <Input value={draft.specialPromotionButtonText} onChange={(event) => setDraft((current) => ({ ...current, specialPromotionButtonText: event.target.value }))} placeholder="Button text e.g. View Packages" />
                    <Input value={draft.specialPromotionButtonUrl} onChange={(event) => setDraft((current) => ({ ...current, specialPromotionButtonUrl: event.target.value }))} placeholder="Button URL e.g. /iptv-services" />
                  </div>
                  <div className="space-y-2 rounded-md border border-white/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label>Promotion HTML Form</Label>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setEmailPreview({ title: 'Promotion Email Preview', html: buildPromotionEmailPreview({ subject: promotionTitle, body: promotionDetails, html: draft.specialPromotionHtml, buttonText: draft.specialPromotionButtonText || 'Renew Now', buttonUrl: draft.specialPromotionButtonUrl || '/account/iptv' }) })}><Eye className="mr-2 h-4 w-4" />Preview</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, specialPromotionHtml: PROFESSIONAL_PROMOTION_HTML }))}>Load Professional</Button>
                      </div>
                    </div>
                    <Textarea className="min-h-36 font-mono text-xs" value={draft.specialPromotionHtml} onChange={(event) => setDraft((current) => ({ ...current, specialPromotionHtml: event.target.value }))} placeholder="<div>Promotion HTML...</div>" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5">
                    {promotionPriceTerms.map((term) => <div key={term.promotionKey} className="space-y-1"><Label className="text-xs">{term.label}</Label><Input value={draft[term.promotionKey]} onChange={(event) => setDraft((current) => ({ ...current, [term.promotionKey]: event.target.value }))} placeholder="0.00" /></div>)}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={draft.specialPromotionEmailAudience} onChange={(event) => setDraft((current) => ({ ...current, specialPromotionEmailAudience: event.target.value as PromotionAudience }))}>{promotionAudienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={draft.specialPromotionPushAudience} onChange={(event) => setDraft((current) => ({ ...current, specialPromotionPushAudience: event.target.value as PromotionAudience }))}>{promotionAudienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border border-white/10 p-3">
                  <label className="flex items-center justify-between">
                    <span className="font-medium">Special Offer</span>
                    <Switch checked={draft.specialOfferEnabled} onCheckedChange={(specialOfferEnabled) => setDraft((current) => ({ ...current, specialOfferEnabled }))} />
                  </label>
                  <Input value={offerTitle} onChange={(event) => setDraft((current) => ({ ...current, specialOfferTitle: event.target.value }))} placeholder="Offer title" />
                  <Textarea value={offerDetails} onChange={(event) => setDraft((current) => ({ ...current, specialOfferBody: event.target.value }))} placeholder="Offer details" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={draft.specialOfferBadge} onChange={(event) => setDraft((current) => ({ ...current, specialOfferBadge: event.target.value }))} placeholder="Badge text e.g. Best Deal" />
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={draft.specialOfferStyle} onChange={(event) => setDraft((current) => ({ ...current, specialOfferStyle: event.target.value as PromotionDisplayStyle }))}>{promotionDisplayStyleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    <Input value={draft.specialOfferButtonText} onChange={(event) => setDraft((current) => ({ ...current, specialOfferButtonText: event.target.value }))} placeholder="Button text e.g. Claim Offer" />
                    <Input value={draft.specialOfferButtonUrl} onChange={(event) => setDraft((current) => ({ ...current, specialOfferButtonUrl: event.target.value }))} placeholder="Button URL e.g. /iptv-services" />
                  </div>
                  <div className="space-y-2 rounded-md border border-white/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label>Offer HTML Form</Label>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setEmailPreview({ title: 'Special Offer Email Preview', html: buildPromotionEmailPreview({ subject: offerTitle, body: offerDetails, html: draft.specialOfferHtml, buttonText: draft.specialOfferButtonText || 'Renew Now', buttonUrl: draft.specialOfferButtonUrl || '/account/iptv' }) })}><Eye className="mr-2 h-4 w-4" />Preview</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, specialOfferHtml: PROFESSIONAL_OFFER_HTML }))}>Load Professional</Button>
                      </div>
                    </div>
                    <Textarea className="min-h-36 font-mono text-xs" value={draft.specialOfferHtml} onChange={(event) => setDraft((current) => ({ ...current, specialOfferHtml: event.target.value }))} placeholder="<div>Offer HTML...</div>" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-5">
                    {promotionPriceTerms.map((term) => <div key={term.offerKey} className="space-y-1"><Label className="text-xs">{term.label}</Label><Input value={draft[term.offerKey]} onChange={(event) => setDraft((current) => ({ ...current, [term.offerKey]: event.target.value }))} placeholder="0.00" /></div>)}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={draft.specialOfferEmailAudience} onChange={(event) => setDraft((current) => ({ ...current, specialOfferEmailAudience: event.target.value as PromotionAudience }))}>{promotionAudienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={draft.specialOfferPushAudience} onChange={(event) => setDraft((current) => ({ ...current, specialOfferPushAudience: event.target.value as PromotionAudience }))}>{promotionAudienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-lg border border-white/10 p-3">
                  <label className="flex items-center justify-between"><span>Email Expiry Alerts</span><Switch checked={draft.expiryEmailAlertsEnabled} onCheckedChange={(expiryEmailAlertsEnabled) => setDraft((current) => ({ ...current, expiryEmailAlertsEnabled }))} /></label>
                  <Input value={draft.expiryEmailAlertEveryHours} onChange={(event) => setDraft((current) => ({ ...current, expiryEmailAlertEveryHours: event.target.value }))} placeholder="6" />
                </div>
                <div className="space-y-3 rounded-lg border border-white/10 p-3">
                  <label className="flex items-center justify-between"><span>Push Expiry Alerts</span><Switch checked={draft.expiryPushAlertsEnabled} onCheckedChange={(expiryPushAlertsEnabled) => setDraft((current) => ({ ...current, expiryPushAlertsEnabled }))} /></label>
                  <Input value={draft.expiryPushAlertBeforeHours} onChange={(event) => setDraft((current) => ({ ...current, expiryPushAlertBeforeHours: event.target.value }))} placeholder="12" />
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_2fr]">
                {[
                  ['Wallet Balance', 'paymentWalletEnabled'],
                  ['USDT', 'paymentUsdtEnabled'],
                  ['PayPal', 'paymentPaypalEnabled'],
                  ['Credit Card', 'paymentCardEnabled'],
                ].map(([label, key]) => (
                  <label key={key} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                    <span>{label}</span>
                    <Switch checked={Boolean(draft[key as keyof IptvWorkspaceSettings])} onCheckedChange={(checked) => setDraft((current) => ({ ...current, [key]: checked }))} />
                  </label>
                ))}
                <div className="space-y-2 rounded-lg border border-white/10 p-3">
                  <Label>Payment Priority</Label>
                  <Input value={draft.paymentPriority.join(',')} onChange={(event) => setDraft((current) => ({ ...current, paymentPriority: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} placeholder="wallet,usdt,paypal,card" />
                </div>
              </div>
              <Button disabled={isSaving} onClick={() => onSave(draft)}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Feature Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      <Dialog open={Boolean(emailPreview)} onOpenChange={(open) => !open && setEmailPreview(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{emailPreview?.title || 'Email Preview'}</DialogTitle>
            <DialogDescription>This preview uses the current HTML, title, details, and button before sending.</DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border bg-white">
            <iframe title="IPTV promotion email preview" className="h-[70vh] w-full bg-white" srcDoc={emailPreview?.html || ''} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IptvRetailPriceManager({
  rows,
  drafts,
  isLoading,
  isSaving,
  roleLabel,
  onChange,
  onSave,
}: {
  rows: IptvRetailPriceRow[];
  drafts: Record<string, Record<string, string>>;
  isLoading: boolean;
  isSaving: boolean;
  roleLabel: string;
  onChange: (packageId: string, term: string, value: string) => void;
  onSave: (packageId: string) => void;
}) {
  return (
    <Card className="border-white/10 bg-[#10141f] text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CircleDollarSign className="h-5 w-5 text-primary" />
          IPTV Retail Prices
        </CardTitle>
        <CardDescription>
          Set your {roleLabel.toLowerCase()} retail prices from the admin package cost and service credits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex min-h-[8rem] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="rounded-lg border border-white/10 p-4 text-sm text-slate-400">
            No IPTV packages are available for your account type yet.
          </div>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-slate-300">
                  <th className="w-[260px] p-3">Package</th>
                  {RETAIL_PRICE_TERMS.map((term) => (
                    <th key={term.key} className="p-3">{term.label}</th>
                  ))}
                  <th className="w-[150px] p-3">Status</th>
                  <th className="w-[120px] p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.packageId} className="border-b border-white/10 align-top last:border-b-0">
                    <td className="p-3">
                      <div className="font-semibold text-white">{row.name}</div>
                      <div className="mt-1 text-xs text-slate-400">Managed Package</div>
                    </td>
                    {RETAIL_PRICE_TERMS.map((term) => (
                      <td key={term.key} className="min-w-[140px] p-3">
                        <Input
                          value={drafts[row.packageId]?.[term.key] ?? row.retailPrices?.[term.key] ?? row.basePrices?.[term.key] ?? '0.00'}
                          onChange={(event) => onChange(row.packageId, term.key, event.target.value)}
                          placeholder="0.00"
                          className="bg-background text-foreground"
                        />
                        <div className="mt-1 text-[11px] leading-4 text-slate-500">
                          <div>Base: ${row.basePrices?.[term.key] || '0.00'}</div>
                          <div>{row.providerCredits?.[term.key] || '0.00'} credits = ${row.providerCostUsd?.[term.key] || '0.00'}</div>
                        </div>
                      </td>
                    ))}
                    <td className="p-3">
                      <Badge variant="outline">{row.hasCustomPrices ? 'Custom retail' : 'Admin base'}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" disabled={isSaving} onClick={() => onSave(row.packageId)}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IptvMessageCard({
  title,
  body,
  badge,
  buttonText,
  buttonUrl,
  styleName,
  html,
}: {
  title: string;
  body?: string;
  badge?: string;
  buttonText?: string;
  buttonUrl?: string;
  styleName?: string;
  html?: string;
}) {
  const styleMap: Record<string, string> = {
    default: 'border-white/10 bg-[#10141f] text-white',
    success: 'border-emerald-400/30 bg-emerald-950/50 text-white',
    premium: 'border-amber-400/30 bg-[#1f1a10] text-white',
    urgent: 'border-red-400/30 bg-red-950/50 text-white',
  };
  const buttonMap: Record<string, string> = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    premium: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
    urgent: 'bg-red-500 text-white hover:bg-red-600',
  };
  const selectedStyle = ['default', 'success', 'premium', 'urgent'].includes(String(styleName)) ? String(styleName) : 'default';
  const href = String(buttonUrl || '').trim();
  const customHtml = String(html || '').trim();

  if (customHtml) {
    return (
      <div
        className="overflow-hidden rounded-lg"
        dangerouslySetInnerHTML={{ __html: customHtml }}
      />
    );
  }

  return (
    <Card className={cn('overflow-hidden', styleMap[selectedStyle])}>
      <CardHeader className="space-y-3">
        {badge && <Badge className="w-fit bg-white/15 text-white hover:bg-white/20">{badge}</Badge>}
        <CardTitle className="text-lg">{title}</CardTitle>
        {body && <CardDescription className="text-white/75">{body}</CardDescription>}
        {buttonText && href && (
          <Button asChild className={cn('w-fit', buttonMap[selectedStyle])}>
            <a href={href}>{buttonText}</a>
          </Button>
        )}
      </CardHeader>
    </Card>
  );
}

function IptvContentPreview({ content, compact = false }: { content: IptvContentCatalog; compact?: boolean }) {
  const [countrySearch, setCountrySearch] = useState('');
  const [visibleCountryCount, setVisibleCountryCount] = useState(8);
  const [visibleChannelCount, setVisibleChannelCount] = useState(8);
  const [visibleMovieCount, setVisibleMovieCount] = useState(8);
  const normalizedSearch = countrySearch.trim().toLowerCase();
  const filteredCountries = useMemo(() => {
    if (!normalizedSearch) return content.countries;
    return content.countries.filter((country) =>
      [country.name, country.code].some((value) => String(value || '').toLowerCase().includes(normalizedSearch)),
    );
  }, [content.countries, normalizedSearch]);
  const visibleCountries = filteredCountries.slice(0, visibleCountryCount);
  const visibleChannels = content.channels.slice(0, visibleChannelCount);
  const visibleMovies = content.movies.slice(0, visibleMovieCount);

  useEffect(() => {
    setVisibleCountryCount(8);
  }, [normalizedSearch]);

  return (
    <div className={cn('grid gap-4 lg:grid-cols-3', compact ? '' : '')}>
      <Card className="flex h-full flex-col border-white/10 bg-[#10141f] text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe2 className="h-5 w-5 text-primary" />
            Countries
          </CardTitle>
          <CardDescription>Available IPTV regions.</CardDescription>
          <div className="relative pt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 translate-y-[-20%] text-slate-400" />
            <Input
              value={countrySearch}
              onChange={(event) => setCountrySearch(event.target.value)}
              placeholder="Search country by name or code"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-3">
          <div className="grid flex-1 content-start gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {visibleCountries.map((country) => (
              <div key={country.code} className="flex items-center justify-between rounded-lg border border-white/10 p-3 text-sm">
                <div>
                  <div className="font-semibold">{country.name}</div>
                  <div className="text-xs text-slate-400">{country.code}</div>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <div>{country.channelCount} channels</div>
                  <div>{country.movieCount} movies</div>
                </div>
              </div>
            ))}
          </div>

          {filteredCountries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-slate-400">
              No country found for this search.
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-400">
                Showing {visibleCountries.length} from {filteredCountries.length} countries
              </div>
              {visibleCountryCount < filteredCountries.length && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCountryCount((current) => current + 8)}
                >
                  Load More
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex h-full flex-col border-white/10 bg-[#10141f] text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListVideo className="h-5 w-5 text-primary" />
            Channels
          </CardTitle>
          <CardDescription>Sample live TV channels.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-3">
          <div className="flex flex-1 flex-col gap-2">
            {visibleChannels.map((channel) => (
              <div key={channel.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{channel.name}</span>
                  <Badge variant="outline">{channel.quality}</Badge>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {channel.countryCode} - {channel.category} - {channel.language}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-400">
              Showing {visibleChannels.length} from {content.channels.length} channels
            </div>
            {visibleChannelCount < content.channels.length && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVisibleChannelCount((current) => current + 8)}
              >
                Load More
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="flex h-full flex-col border-white/10 bg-[#10141f] text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clapperboard className="h-5 w-5 text-primary" />
            Movies & Series
          </CardTitle>
          <CardDescription>Movie and VOD details.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-3">
          <div className="flex flex-1 flex-col gap-2">
            {visibleMovies.map((movie) => (
              <div key={movie.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{movie.title}</span>
                  <Badge variant="outline">{movie.quality}</Badge>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {movie.genre} - {movie.year} - {movie.runtimeMinutes} min - {movie.rating}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-400">
              Showing {visibleMovies.length} from {content.movies.length} movies
            </div>
            {visibleMovieCount < content.movies.length && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVisibleMovieCount((current) => current + 8)}
              >
                Load More
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
