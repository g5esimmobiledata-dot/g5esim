import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clapperboard, Download, Eye, Globe2, ListVideo, Loader2, Mail, RefreshCw, Save, Server, Settings2, Smartphone, Tv, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

const lightPanelClass = 'overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm';
const lightInputClass =
  'border-[#24445f] bg-[#071b35] text-white placeholder:text-slate-400 focus-visible:ring-teal-500';
const lightOutlineButtonClass =
  'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const primaryButtonClass = 'bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';

type IptvPackage = {
  id: string;
  tvplusPackageId: string;
  name: string;
  description?: string | null;
  active: boolean;
  sortOrder: number;
  prices?: Record<string, string>;
  metadata?: {
    visibility?: Partial<IptvPackageVisibility>;
    [key: string]: any;
  };
};

type IptvOrder = {
  id: string;
  userEmail?: string | null;
  userName?: string | null;
  deviceType: string;
  status: string;
  packageName?: string | null;
  subscriptionMonths: number;
  subscriptionTermType?: 'months' | 'hours';
  subscriptionHours?: number | null;
  subscriptionLabel?: string | null;
  m3uUrl?: string | null;
  portalUrl?: string | null;
  protocolCode?: string | null;
  createdAt: string;
};

type IptvContentCatalog = {
  countries: Array<{
    code: string;
    name: string;
    channelCount: number;
    movieCount: number;
  }>;
  channels: Array<{
    id: string;
    name: string;
    countryCode: string;
    category: string;
    language: string;
    quality: string;
  }>;
  movies: Array<{
    id: string;
    title: string;
    genre: string;
    year: number;
    runtimeMinutes: number;
    rating: string;
    quality: string;
  }>;
};

type Dashboard = {
  settings: {
    enabled: boolean;
    activeProvider: 'tvplus' | 'iotv';
    apiKeyConfigured: boolean;
    apiKeyPreview: string;
    baseUrl: string;
    defaultPackageId: string;
    defaultPackageName: string;
    retailMarginPercent: string;
    demoEnabled: boolean;
    providerDemoMode: boolean;
    iotvTokenConfigured: boolean;
    iotvTokenPreview: string;
    iotvApiBaseUrl: string;
    iotvResellerUsernameConfigured: boolean;
    iotvResellerUsernamePreview: string;
    iotvResellerPasswordConfigured: boolean;
    iotvResellerPasswordPreview: string;
    iotvPlayerBaseUrl: string;
    allowWebTrial: boolean;
    allowMobileTrial: boolean;
    autoRenewEnabled: boolean;
    showAllProviderPackagesWeb: boolean;
    showAllProviderPackagesMobile: boolean;
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
    specialPromotionEmailAudience: 'active' | 'inactive' | 'both';
    specialPromotionPushAudience: 'active' | 'inactive' | 'both';
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
    specialOfferEmailAudience: 'active' | 'inactive' | 'both';
    specialOfferPushAudience: 'active' | 'inactive' | 'both';
    expiryEmailAlertsEnabled: boolean;
    expiryEmailAlertEveryHours: string;
    expiryPushAlertsEnabled: boolean;
    expiryPushAlertBeforeHours: string;
    paymentWalletEnabled: boolean;
    paymentUsdtEnabled: boolean;
    paymentPaypalEnabled: boolean;
    paymentCardEnabled: boolean;
    paymentPriority: string[];
    iotvCreditsPaidUsd: string;
    iotvCreditsReceived: string;
    iotvCreditUnitCostUsd: string;
  };
  packages: IptvPackage[];
  orders: IptvOrder[];
  content?: IptvContentCatalog;
  stats: {
    totalPackages: number;
    activeOrders: number;
    failedOrders: number;
    totalOrders: number;
  };
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

const IPTV_VISIBILITY_ROLES = [
  { key: 'user', trialKey: 'trialUser', label: 'User' },
  { key: 'reseller', trialKey: 'trialReseller', label: 'Reseller' },
  { key: 'agent', trialKey: 'trialAgent', label: 'Agent' },
] as const;

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

const DEFAULT_PROMOTION_TITLE = 'Promotion';
const DEFAULT_OFFER_TITLE = 'Special Offer';

function escapePreviewHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePreviewActionUrl(value: string) {
  const text = value.trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return text.startsWith('/') ? text : `/${text}`;
}

function buildPromotionEmailPreview(input: {
  subject: string;
  body: string;
  html: string;
  buttonText: string;
  buttonUrl: string;
}) {
  const content = input.html.trim() || escapePreviewHtml(input.body).replace(/\n/g, '<br>');
  const actionUrl = normalizePreviewActionUrl(input.buttonUrl);
  const actionButton = actionUrl
    ? `
      <div style="margin-top:28px;text-align:center;">
        <a href="${escapePreviewHtml(actionUrl)}" style="display:inline-block;background:#10b981;color:#052e2b;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:800;font-size:16px;">
          ${escapePreviewHtml(input.buttonText || 'Renew Now')}
        </a>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#fff;">
        <div style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="color:white;margin:0;font-size:28px;">AYA eSIM</h1>
        </div>
        <div style="background:#f9fafb;padding:40px;border-radius:0 0 10px 10px;">
          <p style="font-size:16px;margin-bottom:20px;">Hi Customer,</p>
          <div style="font-size:16px;line-height:1.8;color:#374151;">${content}</div>
          ${actionButton}
          <p style="font-size:14px;color:#6b7280;margin-top:30px;">If you have any questions, feel free to reach out to our support team.</p>
        </div>
        <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px;">
          <p>Preview email: ${escapePreviewHtml(input.subject)}</p>
        </div>
      </body>
    </html>
  `;
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

const PROFESSIONAL_PROMOTION_HTML = `<div style="border:1px solid rgba(16,185,129,.35);background:linear-gradient(135deg,#052e2b 0%,#0f172a 58%,#0b1120 100%);border-radius:14px;padding:22px;color:#fff;font-family:Inter,Arial,sans-serif;box-shadow:0 18px 45px rgba(0,0,0,.28);">
  <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,.16);color:#6ee7b7;border:1px solid rgba(110,231,183,.25);border-radius:999px;padding:6px 11px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Limited IPTV Promotion</div>
  <h3 style="margin:14px 0 8px;font-size:24px;line-height:1.15;font-weight:800;">Upgrade your IPTV plan today</h3>
  <p style="margin:0 0 18px;color:rgba(255,255,255,.76);font-size:14px;line-height:1.6;">Enjoy premium live TV, movies, and series with a special renewal price available for a short time.</p>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;">
    <span style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 11px;font-size:13px;">Fast activation</span>
    <span style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 11px;font-size:13px;">M3U / MAG support</span>
    <span style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 11px;font-size:13px;">Live TV + VOD</span>
  </div>
  <a href="/iptv-services" style="display:inline-block;background:#10b981;color:#06251f;text-decoration:none;border-radius:10px;padding:11px 16px;font-weight:800;">View Promotion</a>
</div>`;

const PROFESSIONAL_OFFER_HTML = `<div style="border:1px solid rgba(251,191,36,.35);background:linear-gradient(135deg,#2b1d06 0%,#111827 58%,#09090b 100%);border-radius:14px;padding:22px;color:#fff;font-family:Inter,Arial,sans-serif;box-shadow:0 18px 45px rgba(0,0,0,.28);">
  <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(251,191,36,.17);color:#fde68a;border:1px solid rgba(253,230,138,.28);border-radius:999px;padding:6px 11px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Special Offer</div>
  <h3 style="margin:14px 0 8px;font-size:24px;line-height:1.15;font-weight:800;">Best value IPTV renewal deal</h3>
  <p style="margin:0 0 18px;color:rgba(255,255,255,.76);font-size:14px;line-height:1.6;">Lock in your entertainment package with exclusive offer pricing before your subscription expires.</p>
  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:18px;">
    <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;"><div style="font-size:18px;font-weight:800;">12M</div><div style="font-size:12px;color:rgba(255,255,255,.65);">Best saving</div></div>
    <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;"><div style="font-size:18px;font-weight:800;">4K</div><div style="font-size:12px;color:rgba(255,255,255,.65);">Quality ready</div></div>
    <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;"><div style="font-size:18px;font-weight:800;">24/7</div><div style="font-size:12px;color:rgba(255,255,255,.65);">Access</div></div>
  </div>
  <a href="/iptv-services" style="display:inline-block;background:#fbbf24;color:#1f1300;text-decoration:none;border-radius:10px;padding:11px 16px;font-weight:800;">Claim Offer</a>
</div>`;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function getOrderTermLabel(order: IptvOrder) {
  if (order.subscriptionLabel) return order.subscriptionLabel;
  if (order.subscriptionTermType === 'hours' && order.subscriptionHours) {
    return `Free ${order.subscriptionHours} Hour${order.subscriptionHours === 1 ? '' : 's'}`;
  }
  return order.subscriptionMonths === 99 ? 'Demo' : `${order.subscriptionMonths} months`;
}

export default function AdminIptv() {
  const { toast } = useToast();
  const [emailPreview, setEmailPreview] = useState<{ title: string; html: string } | null>(null);
  const [settings, setSettings] = useState({
    enabled: false,
    activeProvider: 'tvplus' as 'tvplus' | 'iotv',
    apiKey: '',
    apiBaseUrl: 'https://tvpluspanel.net/api/api.php',
    iotvApiToken: '',
    iotvApiBaseUrl: 'https://yourdns.com',
    iotvResellerUsername: '',
    iotvResellerPassword: '',
    iotvPlayerBaseUrl: 'https://yourdns.com',
    defaultPackageId: 'all',
    defaultPackageName: 'All Bouquets',
    retailMarginPercent: '20',
    demoEnabled: true,
    providerDemoMode: false,
    allowWebTrial: true,
    allowMobileTrial: true,
    autoRenewEnabled: false,
    showAllProviderPackagesWeb: false,
    showAllProviderPackagesMobile: false,
    specialPromotionEnabled: false,
    specialPromotionTitle: DEFAULT_PROMOTION_TITLE,
    specialPromotionBody: '',
    specialPromotionBadge: '',
    specialPromotionButtonText: '',
    specialPromotionButtonUrl: '',
    specialPromotionStyle: 'default' as PromotionDisplayStyle,
    specialPromotionHtml: '',
    specialPromotionPrice1Month: '',
    specialPromotionPrice3Months: '',
    specialPromotionPrice6Months: '',
    specialPromotionPrice9Months: '',
    specialPromotionPrice12Months: '',
    specialPromotionEmailAudience: 'active' as PromotionAudience,
    specialPromotionPushAudience: 'active' as PromotionAudience,
    specialOfferEnabled: false,
    specialOfferTitle: DEFAULT_OFFER_TITLE,
    specialOfferBody: '',
    specialOfferBadge: '',
    specialOfferButtonText: '',
    specialOfferButtonUrl: '',
    specialOfferStyle: 'premium' as PromotionDisplayStyle,
    specialOfferHtml: '',
    specialOfferPrice1Month: '',
    specialOfferPrice3Months: '',
    specialOfferPrice6Months: '',
    specialOfferPrice9Months: '',
    specialOfferPrice12Months: '',
    specialOfferEmailAudience: 'active' as PromotionAudience,
    specialOfferPushAudience: 'active' as PromotionAudience,
    expiryEmailAlertsEnabled: false,
    expiryEmailAlertEveryHours: '6',
    expiryPushAlertsEnabled: false,
    expiryPushAlertBeforeHours: '12',
    paymentWalletEnabled: true,
    paymentUsdtEnabled: true,
    paymentPaypalEnabled: true,
    paymentCardEnabled: true,
    paymentPriority: 'wallet,usdt,paypal,card',
    iotvCreditsPaidUsd: '0',
    iotvCreditsReceived: '0',
    iotvCreditUnitCostUsd: '0',
  });

  const { data, isLoading } = useQuery<Dashboard>({
    queryKey: ['/api/admin/iptv/dashboard'],
  });

  useEffect(() => {
    if (!data) return;
    setSettings((current) => ({
      ...current,
      enabled: data.settings.enabled,
      activeProvider: data.settings.activeProvider || 'tvplus',
      apiBaseUrl: data.settings.baseUrl,
      iotvApiBaseUrl: data.settings.iotvApiBaseUrl || 'https://yourdns.com',
      iotvPlayerBaseUrl: data.settings.iotvPlayerBaseUrl || data.settings.iotvApiBaseUrl || 'https://yourdns.com',
      defaultPackageId: data.settings.defaultPackageId,
      defaultPackageName: data.settings.defaultPackageName,
      retailMarginPercent: data.settings.retailMarginPercent,
      demoEnabled: data.settings.demoEnabled,
      providerDemoMode: data.settings.providerDemoMode,
      allowWebTrial: data.settings.allowWebTrial,
      allowMobileTrial: data.settings.allowMobileTrial,
      autoRenewEnabled: data.settings.autoRenewEnabled,
      showAllProviderPackagesWeb: false,
      showAllProviderPackagesMobile: false,
      specialPromotionEnabled: data.settings.specialPromotionEnabled,
      specialPromotionTitle: data.settings.specialPromotionTitle || DEFAULT_PROMOTION_TITLE,
      specialPromotionBody: data.settings.specialPromotionBody,
      specialPromotionBadge: data.settings.specialPromotionBadge || '',
      specialPromotionButtonText: data.settings.specialPromotionButtonText || '',
      specialPromotionButtonUrl: data.settings.specialPromotionButtonUrl || '',
      specialPromotionStyle: data.settings.specialPromotionStyle || 'default',
      specialPromotionHtml: data.settings.specialPromotionHtml || '',
      specialPromotionPrice1Month: data.settings.specialPromotionPrice1Month || '',
      specialPromotionPrice3Months: data.settings.specialPromotionPrice3Months || '',
      specialPromotionPrice6Months: data.settings.specialPromotionPrice6Months || '',
      specialPromotionPrice9Months: data.settings.specialPromotionPrice9Months || '',
      specialPromotionPrice12Months: data.settings.specialPromotionPrice12Months || '',
      specialPromotionEmailAudience: data.settings.specialPromotionEmailAudience || 'active',
      specialPromotionPushAudience: data.settings.specialPromotionPushAudience || 'active',
      specialOfferEnabled: data.settings.specialOfferEnabled,
      specialOfferTitle: data.settings.specialOfferTitle || DEFAULT_OFFER_TITLE,
      specialOfferBody: data.settings.specialOfferBody,
      specialOfferBadge: data.settings.specialOfferBadge || '',
      specialOfferButtonText: data.settings.specialOfferButtonText || '',
      specialOfferButtonUrl: data.settings.specialOfferButtonUrl || '',
      specialOfferStyle: data.settings.specialOfferStyle || 'premium',
      specialOfferHtml: data.settings.specialOfferHtml || '',
      specialOfferPrice1Month: data.settings.specialOfferPrice1Month || '',
      specialOfferPrice3Months: data.settings.specialOfferPrice3Months || '',
      specialOfferPrice6Months: data.settings.specialOfferPrice6Months || '',
      specialOfferPrice9Months: data.settings.specialOfferPrice9Months || '',
      specialOfferPrice12Months: data.settings.specialOfferPrice12Months || '',
      specialOfferEmailAudience: data.settings.specialOfferEmailAudience || 'active',
      specialOfferPushAudience: data.settings.specialOfferPushAudience || 'active',
      expiryEmailAlertsEnabled: data.settings.expiryEmailAlertsEnabled,
      expiryEmailAlertEveryHours: data.settings.expiryEmailAlertEveryHours,
      expiryPushAlertsEnabled: data.settings.expiryPushAlertsEnabled,
      expiryPushAlertBeforeHours: data.settings.expiryPushAlertBeforeHours,
      paymentWalletEnabled: data.settings.paymentWalletEnabled,
      paymentUsdtEnabled: data.settings.paymentUsdtEnabled,
      paymentPaypalEnabled: data.settings.paymentPaypalEnabled,
      paymentCardEnabled: data.settings.paymentCardEnabled,
      paymentPriority: (data.settings.paymentPriority || ['wallet', 'usdt', 'paypal', 'card']).join(','),
      iotvCreditsPaidUsd: data.settings.iotvCreditsPaidUsd || '0',
      iotvCreditsReceived: data.settings.iotvCreditsReceived || '0',
      iotvCreditUnitCostUsd: data.settings.iotvCreditUnitCostUsd || '0',
    }));
  }, [data]);

  const promotionTitle = settings.specialPromotionTitle || DEFAULT_PROMOTION_TITLE;
  const promotionDetails = shouldUseAutoRenewalDetails(settings.specialPromotionBody, 'promotion')
    ? buildRenewalDealDetails(settings, 'promotion')
    : settings.specialPromotionBody;
  const offerTitle = settings.specialOfferTitle || DEFAULT_OFFER_TITLE;
  const offerDetails = shouldUseAutoRenewalDetails(settings.specialOfferBody, 'offer')
    ? buildRenewalDealDetails(settings, 'offer')
    : settings.specialOfferBody;

  const switchProvider = useMutation({
    mutationFn: async (activeProvider: 'tvplus' | 'iotv') => {
      const response = await apiRequest('PUT', '/api/admin/iptv/settings', {
        active_provider: activeProvider,
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Provider switch failed',
        description: error.message || 'Could not load this provider settings.',
        variant: 'destructive',
      });
    },
  });

  const saveSettings = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        enabled: settings.enabled,
        active_provider: settings.activeProvider,
        demo_enabled: settings.demoEnabled,
        allow_web_trial: settings.allowWebTrial,
        allow_mobile_trial: settings.allowMobileTrial,
        auto_renew_enabled: settings.autoRenewEnabled,
        show_all_provider_packages_web: false,
        show_all_provider_packages_mobile: false,
        special_promotion_enabled: settings.specialPromotionEnabled,
        special_promotion_title: promotionTitle,
        special_promotion_body: promotionDetails,
        special_promotion_badge: settings.specialPromotionBadge,
        special_promotion_button_text: settings.specialPromotionButtonText,
        special_promotion_button_url: settings.specialPromotionButtonUrl,
        special_promotion_style: settings.specialPromotionStyle,
        special_promotion_html: settings.specialPromotionHtml,
        special_promotion_price_1_month: settings.specialPromotionPrice1Month,
        special_promotion_price_3_months: settings.specialPromotionPrice3Months,
        special_promotion_price_6_months: settings.specialPromotionPrice6Months,
        special_promotion_price_9_months: settings.specialPromotionPrice9Months,
        special_promotion_price_12_months: settings.specialPromotionPrice12Months,
        special_promotion_email_audience: settings.specialPromotionEmailAudience,
        special_promotion_push_audience: settings.specialPromotionPushAudience,
        special_offer_enabled: settings.specialOfferEnabled,
        special_offer_title: offerTitle,
        special_offer_body: offerDetails,
        special_offer_badge: settings.specialOfferBadge,
        special_offer_button_text: settings.specialOfferButtonText,
        special_offer_button_url: settings.specialOfferButtonUrl,
        special_offer_style: settings.specialOfferStyle,
        special_offer_html: settings.specialOfferHtml,
        special_offer_price_1_month: settings.specialOfferPrice1Month,
        special_offer_price_3_months: settings.specialOfferPrice3Months,
        special_offer_price_6_months: settings.specialOfferPrice6Months,
        special_offer_price_9_months: settings.specialOfferPrice9Months,
        special_offer_price_12_months: settings.specialOfferPrice12Months,
        special_offer_email_audience: settings.specialOfferEmailAudience,
        special_offer_push_audience: settings.specialOfferPushAudience,
        expiry_email_alerts_enabled: settings.expiryEmailAlertsEnabled,
        expiry_email_alert_every_hours: settings.expiryEmailAlertEveryHours,
        expiry_push_alerts_enabled: settings.expiryPushAlertsEnabled,
        expiry_push_alert_before_hours: settings.expiryPushAlertBeforeHours,
        payment_wallet_enabled: settings.paymentWalletEnabled,
        payment_usdt_enabled: settings.paymentUsdtEnabled,
        payment_paypal_enabled: settings.paymentPaypalEnabled,
        payment_card_enabled: settings.paymentCardEnabled,
        payment_priority: settings.paymentPriority,
      };

      const response = await apiRequest('PUT', '/api/admin/iptv/settings', {
        ...payload,
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      toast({ title: 'IPTV feature settings saved', description: 'The selected provider feature configuration was updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Save failed', description: error.message || 'Could not save IPTV settings.', variant: 'destructive' });
    },
  });

  const sendPromotionMessage = useMutation({
    mutationFn: async ({ kind, channel }: { kind: 'promotion' | 'offer'; channel: 'email' | 'push' }) => {
      const isPromotion = kind === 'promotion';
      const response = await apiRequest('POST', '/api/admin/iptv/promotions/send', {
        kind,
        channel,
        audience: isPromotion
          ? channel === 'email'
            ? settings.specialPromotionEmailAudience
            : settings.specialPromotionPushAudience
          : channel === 'email'
            ? settings.specialOfferEmailAudience
            : settings.specialOfferPushAudience,
        title: isPromotion ? promotionTitle : offerTitle,
        body: isPromotion ? promotionDetails : offerDetails,
        html: isPromotion ? settings.specialPromotionHtml : settings.specialOfferHtml,
        buttonText: isPromotion ? settings.specialPromotionButtonText || 'Renew Now' : settings.specialOfferButtonText || 'Renew Now',
        buttonUrl: isPromotion ? settings.specialPromotionButtonUrl || '/account/iptv' : settings.specialOfferButtonUrl || '/account/iptv',
      });
      return response.json();
    },
    onSuccess: (response) => {
      const result = response.data || {};
      toast({
        title: 'Message sent',
        description: `Sent: ${result.sent || 0}, skipped: ${result.skipped || 0}, failed: ${result.failed || 0}.`,
      });
    },
    onError: (error: any) => {
      toast({ title: 'Send failed', description: error.message || 'Could not send IPTV message.', variant: 'destructive' });
    },
  });

  const activeSendKey = sendPromotionMessage.variables
    ? `${sendPromotionMessage.variables.kind}-${sendPromotionMessage.variables.channel}`
    : '';

  const syncPackages = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/iptv/sync-packages');
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      toast({ title: 'Packages synced', description: 'IPTV provider packages were imported successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Sync failed', description: error.message || 'Could not sync IPTV packages.', variant: 'destructive' });
    },
  });

  const updatePackage = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const response = await apiRequest('PATCH', `/api/admin/iptv/packages/${id}`, patch);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      toast({ title: 'Package updated', description: 'IPTV package settings were saved.' });
    },
    onError: (error: any) => {
      toast({ title: 'Package failed', description: error.message || 'Could not update IPTV package.', variant: 'destructive' });
    },
  });

  const resellerInfo = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/admin/iptv/reseller-info');
      return response.json();
    },
    onSuccess: (response) => {
      const info = response.data || {};
      toast({
        title: `${info.provider || settings.activeProvider.toUpperCase()} reseller`,
        description: `Status: ${info.enabled || info.status || 'unknown'} | Credits: ${info.credits || 'not returned'}`,
      });
    },
    onError: (error: any) => {
      toast({ title: 'Lookup failed', description: error.message || 'Could not load reseller info.', variant: 'destructive' });
    },
  });

  const enableDemo = useMutation({
    mutationFn: async () => {
      await apiRequest('PUT', '/api/admin/iptv/settings', {
        enabled: true,
        api_key: '',
        demo_enabled: true,
        provider_demo_mode: true,
        default_package_id: settings.defaultPackageId || 'all',
        default_package_name: settings.defaultPackageName || 'All Bouquets',
      });
      const response = await apiRequest('POST', '/api/admin/iptv/sync-packages');
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      toast({
        title: 'Demo ready',
        description: 'IPTV demo mode is enabled and sample bouquets are available.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Demo setup failed',
        description: error.message || 'Could not prepare IPTV demo mode.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[30rem] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
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
          <h1 className="mt-2 text-3xl font-bold text-white">IPTV Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Select the IPTV provider and configure the customer-facing features for web and mobile users.
          </p>
        </div>
      </div>

      <Card className={lightPanelClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-950">
            <Settings2 className="h-5 w-5 text-primary" />
            Select Provider
          </CardTitle>
          <CardDescription className="text-slate-500">Choose which IPTV provider these feature settings apply to.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(260px,360px)_1fr]">
          <div className="space-y-2">
            <Label className="text-slate-700">Available IPTV Provider</Label>
            <select
              className={`h-10 w-full rounded-md border px-3 text-sm ${lightInputClass}`}
              value={settings.activeProvider}
              disabled={switchProvider.isPending}
              onChange={(event) => {
                const activeProvider = event.target.value as 'tvplus' | 'iotv';
                setSettings((current) => ({ ...current, activeProvider }));
                switchProvider.mutate(activeProvider);
              }}
            >
              <option value="tvplus">TVPLUS</option>
              <option value="iotv">IPTV Reseller Hub Provider</option>
            </select>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            Feature configuration for: <span className="font-semibold text-slate-950">{settings.activeProvider === 'iotv' ? 'IPTV Reseller Hub Provider' : 'TVPLUS'}</span>
            <div className="mt-1 text-xs text-slate-500">Provider API credentials are managed from IPTV Services - IPTV Provider.</div>
          </div>
        </CardContent>
      </Card>

      <AdminIptvPackageTable
        packages={(data?.packages || []).filter((pkg) =>
          settings.activeProvider === 'iotv'
            ? pkg.tvplusPackageId.startsWith('iotv-')
            : !pkg.tvplusPackageId.startsWith('iotv-'),
        )}
        activeProvider={settings.activeProvider}
        isSaving={updatePackage.isPending}
        onSave={(id, patch) => updatePackage.mutate({ id, patch })}
        onSync={() => syncPackages.mutate()}
        isSyncing={syncPackages.isPending}
      />

      <Card className={lightPanelClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-950">
            <Settings2 className="h-5 w-5 text-primary" />
            Feature Settings
          </CardTitle>
          <CardDescription className="text-slate-500">Configure trial access, package visibility, promotions, alerts, and payment priority for the selected provider.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Enable IPTV</Label>
              <p className="text-xs text-muted-foreground">Allow users to create IPTV subscriptions.</p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(enabled) => setSettings((current) => ({ ...current, enabled }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Enable Demos</Label>
              <p className="text-xs text-muted-foreground">Expose the free trial subscription options.</p>
            </div>
            <Switch checked={settings.demoEnabled} onCheckedChange={(demoEnabled) => setSettings((current) => ({ ...current, demoEnabled }))} />
          </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Web UI Trials</Label>
                <p className="text-xs text-muted-foreground">Allow web users to create free IPTV trials.</p>
              </div>
              <Switch checked={settings.allowWebTrial} onCheckedChange={(allowWebTrial) => setSettings((current) => ({ ...current, allowWebTrial }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Mobile App Trials</Label>
                <p className="text-xs text-muted-foreground">Allow mobile users to create free IPTV trials.</p>
              </div>
              <Switch checked={settings.allowMobileTrial} onCheckedChange={(allowMobileTrial) => setSettings((current) => ({ ...current, allowMobileTrial }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Auto Renew</Label>
                <p className="text-xs text-muted-foreground">Mark IPTV subscriptions eligible for automatic renewal.</p>
              </div>
              <Switch checked={settings.autoRenewEnabled} onCheckedChange={(autoRenewEnabled) => setSettings((current) => ({ ...current, autoRenewEnabled }))} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Special Promotion</Label>
                  <p className="text-xs text-muted-foreground">Show a promotion message on web and mobile IPTV pages.</p>
                </div>
                <Switch checked={settings.specialPromotionEnabled} onCheckedChange={(specialPromotionEnabled) => setSettings((current) => ({ ...current, specialPromotionEnabled }))} />
              </div>
              <Input value={promotionTitle} onChange={(event) => setSettings((current) => ({ ...current, specialPromotionTitle: event.target.value }))} placeholder="Promotion title" />
              <Textarea value={promotionDetails} onChange={(event) => setSettings((current) => ({ ...current, specialPromotionBody: event.target.value }))} placeholder="Promotion details" />
              <div className="grid gap-3 md:grid-cols-2">
                <Input value={settings.specialPromotionBadge} onChange={(event) => setSettings((current) => ({ ...current, specialPromotionBadge: event.target.value }))} placeholder="Badge text e.g. Limited Time" />
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={settings.specialPromotionStyle}
                  onChange={(event) => setSettings((current) => ({ ...current, specialPromotionStyle: event.target.value as PromotionDisplayStyle }))}
                >
                  {promotionDisplayStyleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <Input value={settings.specialPromotionButtonText} onChange={(event) => setSettings((current) => ({ ...current, specialPromotionButtonText: event.target.value }))} placeholder="Button text e.g. View Packages" />
                <Input value={settings.specialPromotionButtonUrl} onChange={(event) => setSettings((current) => ({ ...current, specialPromotionButtonUrl: event.target.value }))} placeholder="Button URL e.g. /iptv-services" />
              </div>
              <div className="space-y-2 rounded-md border border-border/70 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label>Promotion HTML Form</Label>
                    <p className="text-xs text-muted-foreground">Advanced custom HTML shown to customers instead of the simple card layout.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEmailPreview({
                        title: 'Promotion Email Preview',
                        html: buildPromotionEmailPreview({
                          subject: promotionTitle,
                          body: promotionDetails,
                          html: settings.specialPromotionHtml,
                          buttonText: settings.specialPromotionButtonText || 'Renew Now',
                          buttonUrl: settings.specialPromotionButtonUrl || '/account/iptv',
                        }),
                      })}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings((current) => ({ ...current, specialPromotionHtml: PROFESSIONAL_PROMOTION_HTML }))}
                    >
                      Load Professional
                    </Button>
                    <Button type="button" size="sm" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
                      {saveSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save HTML
                    </Button>
                  </div>
                </div>
                <Textarea
                  className="min-h-48 font-mono text-xs"
                  value={settings.specialPromotionHtml}
                  onChange={(event) => setSettings((current) => ({ ...current, specialPromotionHtml: event.target.value }))}
                  placeholder="<div>Promotion HTML...</div>"
                />
              </div>
              <div className="space-y-2 rounded-md border border-border/70 p-3">
                <Label>Promotion Renewal Prices</Label>
                <div className="grid gap-2 sm:grid-cols-5">
                  {promotionPriceTerms.map((term) => (
                    <div key={term.promotionKey} className="space-y-1">
                      <Label className="text-xs">{term.label}</Label>
                      <Input
                        value={settings[term.promotionKey]}
                        onChange={(event) => setSettings((current) => ({ ...current, [term.promotionKey]: event.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Used automatically on customer renewals when Special Promotion is enabled and Special Offer has no price for the same term.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Send Email to</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={settings.specialPromotionEmailAudience}
                    onChange={(event) => setSettings((current) => ({ ...current, specialPromotionEmailAudience: event.target.value as PromotionAudience }))}
                  >
                    {promotionAudienceOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    className="w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => sendPromotionMessage.mutate({ kind: 'promotion', channel: 'email' })}
                    disabled={sendPromotionMessage.isPending}
                  >
                    {activeSendKey === 'promotion-email' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                    Send Promotion Email
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Send Push Notification on Mobile App to</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={settings.specialPromotionPushAudience}
                    onChange={(event) => setSettings((current) => ({ ...current, specialPromotionPushAudience: event.target.value as PromotionAudience }))}
                  >
                    {promotionAudienceOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    className="w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => sendPromotionMessage.mutate({ kind: 'promotion', channel: 'push' })}
                    disabled={sendPromotionMessage.isPending}
                  >
                    {activeSendKey === 'promotion-push' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                    Send Promotion Push
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Special Offer</Label>
                  <p className="text-xs text-muted-foreground">Show an offer message on web and mobile IPTV pages.</p>
                </div>
                <Switch checked={settings.specialOfferEnabled} onCheckedChange={(specialOfferEnabled) => setSettings((current) => ({ ...current, specialOfferEnabled }))} />
              </div>
              <Input value={offerTitle} onChange={(event) => setSettings((current) => ({ ...current, specialOfferTitle: event.target.value }))} placeholder="Offer title" />
              <Textarea value={offerDetails} onChange={(event) => setSettings((current) => ({ ...current, specialOfferBody: event.target.value }))} placeholder="Offer details" />
              <div className="grid gap-3 md:grid-cols-2">
                <Input value={settings.specialOfferBadge} onChange={(event) => setSettings((current) => ({ ...current, specialOfferBadge: event.target.value }))} placeholder="Badge text e.g. Best Deal" />
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={settings.specialOfferStyle}
                  onChange={(event) => setSettings((current) => ({ ...current, specialOfferStyle: event.target.value as PromotionDisplayStyle }))}
                >
                  {promotionDisplayStyleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <Input value={settings.specialOfferButtonText} onChange={(event) => setSettings((current) => ({ ...current, specialOfferButtonText: event.target.value }))} placeholder="Button text e.g. Claim Offer" />
                <Input value={settings.specialOfferButtonUrl} onChange={(event) => setSettings((current) => ({ ...current, specialOfferButtonUrl: event.target.value }))} placeholder="Button URL e.g. /iptv-services" />
              </div>
              <div className="space-y-2 rounded-md border border-border/70 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label>Offer HTML Form</Label>
                    <p className="text-xs text-muted-foreground">Advanced custom HTML shown to customers instead of the simple card layout.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEmailPreview({
                        title: 'Special Offer Email Preview',
                        html: buildPromotionEmailPreview({
                          subject: offerTitle,
                          body: offerDetails,
                          html: settings.specialOfferHtml,
                          buttonText: settings.specialOfferButtonText || 'Renew Now',
                          buttonUrl: settings.specialOfferButtonUrl || '/account/iptv',
                        }),
                      })}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings((current) => ({ ...current, specialOfferHtml: PROFESSIONAL_OFFER_HTML }))}
                    >
                      Load Professional
                    </Button>
                    <Button type="button" size="sm" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
                      {saveSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save HTML
                    </Button>
                  </div>
                </div>
                <Textarea
                  className="min-h-48 font-mono text-xs"
                  value={settings.specialOfferHtml}
                  onChange={(event) => setSettings((current) => ({ ...current, specialOfferHtml: event.target.value }))}
                  placeholder="<div>Offer HTML...</div>"
                />
              </div>
              <div className="space-y-2 rounded-md border border-border/70 p-3">
                <Label>Special Offer Renewal Prices</Label>
                <div className="grid gap-2 sm:grid-cols-5">
                  {promotionPriceTerms.map((term) => (
                    <div key={term.offerKey} className="space-y-1">
                      <Label className="text-xs">{term.label}</Label>
                      <Input
                        value={settings[term.offerKey]}
                        onChange={(event) => setSettings((current) => ({ ...current, [term.offerKey]: event.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Used first on customer renewals when Special Offer is enabled.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Send Email to</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={settings.specialOfferEmailAudience}
                    onChange={(event) => setSettings((current) => ({ ...current, specialOfferEmailAudience: event.target.value as PromotionAudience }))}
                  >
                    {promotionAudienceOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    className="w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => sendPromotionMessage.mutate({ kind: 'offer', channel: 'email' })}
                    disabled={sendPromotionMessage.isPending}
                  >
                    {activeSendKey === 'offer-email' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                    Send Offer Email
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Send Push Notification on Mobile App to</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={settings.specialOfferPushAudience}
                    onChange={(event) => setSettings((current) => ({ ...current, specialOfferPushAudience: event.target.value as PromotionAudience }))}
                  >
                    {promotionAudienceOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    className="w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => sendPromotionMessage.mutate({ kind: 'offer', channel: 'push' })}
                    disabled={sendPromotionMessage.isPending}
                  >
                    {activeSendKey === 'offer-push' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                    Send Offer Push
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Expiry Alerts</Label>
                  <p className="text-xs text-muted-foreground">Send email reminders before IPTV subscriptions expire.</p>
                </div>
                <Switch checked={settings.expiryEmailAlertsEnabled} onCheckedChange={(expiryEmailAlertsEnabled) => setSettings((current) => ({ ...current, expiryEmailAlertsEnabled }))} />
              </div>
              <div className="space-y-2">
                <Label>Send Every Hours Before Expire</Label>
                <Input value={settings.expiryEmailAlertEveryHours} onChange={(event) => setSettings((current) => ({ ...current, expiryEmailAlertEveryHours: event.target.value }))} placeholder="6" />
              </div>
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Expiry Alerts</Label>
                  <p className="text-xs text-muted-foreground">Send phone push reminders before IPTV subscriptions expire.</p>
                </div>
                <Switch checked={settings.expiryPushAlertsEnabled} onCheckedChange={(expiryPushAlertsEnabled) => setSettings((current) => ({ ...current, expiryPushAlertsEnabled }))} />
              </div>
              <div className="space-y-2">
                <Label>Push Hours Before Expire</Label>
                <Input value={settings.expiryPushAlertBeforeHours} onChange={(event) => setSettings((current) => ({ ...current, expiryPushAlertBeforeHours: event.target.value }))} placeholder="12" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_2fr]">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Wallet Balance</Label>
              <Switch checked={settings.paymentWalletEnabled} onCheckedChange={(paymentWalletEnabled) => setSettings((current) => ({ ...current, paymentWalletEnabled }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>USDT</Label>
              <Switch checked={settings.paymentUsdtEnabled} onCheckedChange={(paymentUsdtEnabled) => setSettings((current) => ({ ...current, paymentUsdtEnabled }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>PayPal</Label>
              <Switch checked={settings.paymentPaypalEnabled} onCheckedChange={(paymentPaypalEnabled) => setSettings((current) => ({ ...current, paymentPaypalEnabled }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Credit Card</Label>
              <Switch checked={settings.paymentCardEnabled} onCheckedChange={(paymentCardEnabled) => setSettings((current) => ({ ...current, paymentCardEnabled }))} />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <Label>Payment Priority</Label>
              <Input value={settings.paymentPriority} onChange={(event) => setSettings((current) => ({ ...current, paymentPriority: event.target.value }))} placeholder="wallet,usdt,paypal,card" />
              <p className="text-xs text-muted-foreground">Keep wallet first to make Wallet Balance the default renewal and package payment method.</p>
            </div>
          </div>

          <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
            {saveSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Feature Settings
          </Button>
        </CardContent>
      </Card>

      <Dialog open={Boolean(emailPreview)} onOpenChange={(open) => !open && setEmailPreview(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{emailPreview?.title || 'Email Preview'}</DialogTitle>
            <DialogDescription>
              This preview uses the current HTML, title, details, and button before sending.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border bg-white">
            <iframe
              title="IPTV promotion email preview"
              className="h-[70vh] w-full bg-white"
              srcDoc={emailPreview?.html || ''}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const IPTV_PRICE_TERMS = [
  { key: 'trial', label: 'Trial', providerLabel: 'Free' },
  { key: '1', label: '1 Month' },
  { key: '3', label: '3 Months' },
  { key: '6', label: '6 Months' },
  { key: '9', label: '9 Months' },
  { key: '12', label: '12 Months' },
] as const;

const IPTV_MONTHLY_PRICE_TERMS = IPTV_PRICE_TERMS.filter((term) => term.key !== 'trial');
const IPTV_TVPLUS_TRIAL_PRICE_TERMS = [
  { key: 'free_1h', label: '1 Hours' },
  { key: 'free_2h', label: '2 Hours' },
  { key: 'free_3h', label: '3 Hours' },
  { key: 'free_4h', label: '4 Hours' },
  { key: 'free_5h', label: '5 Hours' },
  { key: 'free_6h', label: '6 Hours' },
  { key: 'free_1d', label: '24 Hours' },
] as const;
const IPTV_IOTV_TRIAL_PRICE_TERMS = [
  { key: 'free_1d', label: '24 Hours' },
  { key: 'free_48h', label: '48 Hours' },
] as const;

function readPrice(prices: Record<string, any> | undefined, group: 'cost' | 'user' | 'reseller' | 'agent', term: string) {
  if (group === 'user' && term === 'trial') return prices?.user?.trial ?? prices?.demo ?? '';
  if (group === 'user') return prices?.user?.[term] ?? prices?.[term] ?? '';
  if (group === 'cost' && term === 'trial') return prices?.cost?.trial ?? '0';
  return prices?.[group]?.[term] ?? '';
}

function readTrialTermPrice(prices: Record<string, any> | undefined, group: 'user' | 'reseller' | 'agent', term: string) {
  return prices?.trialTerms?.[group]?.[term] ?? '';
}

type IptvPriceGroup = 'cost' | 'user' | 'reseller' | 'agent';
type IptvPackageDraft = {
  name: string;
  description: string;
  active: boolean;
  sortOrder: string;
  pricing: Record<IptvPriceGroup, Record<string, string>>;
  trialTerms: Record<'user' | 'reseller' | 'agent', Record<string, string>>;
  visibility: IptvPackageVisibility;
};

function buildPackageDraft(pkg: IptvPackage): IptvPackageDraft {
  return {
    name: pkg.name,
    description: pkg.description || '',
    active: pkg.active,
    sortOrder: String(pkg.sortOrder || 0),
    pricing: {
      cost: Object.fromEntries(IPTV_PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'cost', term.key)])) as Record<string, string>,
      user: Object.fromEntries(IPTV_PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'user', term.key)])) as Record<string, string>,
      reseller: Object.fromEntries(IPTV_PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'reseller', term.key)])) as Record<string, string>,
      agent: Object.fromEntries(IPTV_PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'agent', term.key)])) as Record<string, string>,
    },
    trialTerms: {
      user: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term, readTrialTermPrice(pkg.prices, 'user', term)])) as Record<string, string>,
      reseller: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term, readTrialTermPrice(pkg.prices, 'reseller', term)])) as Record<string, string>,
      agent: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term, readTrialTermPrice(pkg.prices, 'agent', term)])) as Record<string, string>,
    },
    visibility: normalizeIptvVisibility(pkg.metadata?.visibility),
  };
}

function buildPackageSavePatch(draft: IptvPackageDraft) {
  return {
    name: draft.name,
    description: draft.description,
    active: draft.active,
    sortOrder: Number(draft.sortOrder) || 0,
    prices: {
      demo: draft.pricing.user.trial,
      1: draft.pricing.user['1'],
      3: draft.pricing.user['3'],
      6: draft.pricing.user['6'],
      9: draft.pricing.user['9'],
      12: draft.pricing.user['12'],
      cost: draft.pricing.cost,
      user: draft.pricing.user,
      reseller: draft.pricing.reseller,
      agent: draft.pricing.agent,
      trialTerms: draft.trialTerms,
    },
    visibility: draft.visibility,
  };
}

function AdminIptvPackageTable({
  packages,
  activeProvider,
  isSaving,
  onSave,
  onSync,
  isSyncing,
}: {
  packages: IptvPackage[];
  activeProvider: 'tvplus' | 'iotv';
  isSaving: boolean;
  onSave: (id: string, patch: Record<string, any>) => void;
  onSync: () => void;
  isSyncing: boolean;
}) {
  const [drafts, setDrafts] = useState<Record<string, IptvPackageDraft>>({});

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, IptvPackageDraft> = {};
      for (const pkg of packages) {
        next[pkg.id] = current[pkg.id] || buildPackageDraft(pkg);
      }
      return next;
    });
  }, [packages]);

  const updateDraft = (packageId: string, patch: Partial<IptvPackageDraft>) => {
    setDrafts((current) => ({
      ...current,
      [packageId]: {
        ...(current[packageId] || buildPackageDraft(packages.find((pkg) => pkg.id === packageId)!)),
        ...patch,
      },
    }));
  };

  const updatePrice = (packageId: string, group: IptvPriceGroup, term: string, value: string) => {
    const currentDraft = drafts[packageId];
    if (!currentDraft) return;
    updateDraft(packageId, {
      pricing: {
        ...currentDraft.pricing,
        [group]: {
          ...currentDraft.pricing[group],
          [term]: value,
        },
      },
    });
  };

  const updateTrialTermPrice = (packageId: string, group: 'user' | 'reseller' | 'agent', term: string, value: string) => {
    const currentDraft = drafts[packageId];
    if (!currentDraft) return;
    updateDraft(packageId, {
      trialTerms: {
        ...currentDraft.trialTerms,
        [group]: {
          ...currentDraft.trialTerms[group],
          [term]: value,
        },
      },
    });
  };

  const updateVisibility = (packageId: string, key: keyof IptvPackageVisibility, value: boolean) => {
    const currentDraft = drafts[packageId];
    if (!currentDraft) return;
    updateDraft(packageId, {
      visibility: {
        ...currentDraft.visibility,
        [key]: value,
      },
    });
  };

  return (
    <Card className={lightPanelClass}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <ListVideo className="h-5 w-5 text-primary" />
              IPTV Provider Packages
            </CardTitle>
            <CardDescription className="text-slate-500">Show or hide each synced IPTV package one by one. Price and cost are managed from Cost & Price.</CardDescription>
          </div>
          <Button type="button" variant="outline" className={lightOutlineButtonClass} onClick={onSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Packages
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {packages.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No {activeProvider === 'iotv' ? 'IPTV Reseller Hub Provider' : 'TVPLUS'} packages synced yet. Sync packages from the selected provider to create the visibility list.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="hidden grid-cols-[220px_minmax(320px,1fr)_140px_170px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
              <div>Provider</div>
              <div>Package</div>
              <div>Status</div>
              <div className="text-right">Visibility</div>
            </div>
            <div className="divide-y divide-slate-200">
              {packages.map((pkg) => {
                const providerName = pkg.tvplusPackageId.startsWith('iotv-') ? 'IPTV Reseller Hub Provider' : 'TVPLUS';

                return (
                  <div
                    key={pkg.id}
                    className="grid gap-4 px-4 py-4 text-slate-900 transition hover:bg-slate-50 lg:grid-cols-[220px_minmax(320px,1fr)_140px_170px] lg:items-center"
                  >
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:hidden">Provider</div>
                      <Badge variant="outline" className="max-w-full truncate border-slate-200 bg-slate-50 text-slate-700">{providerName}</Badge>
                      <div className="text-xs text-slate-500">#{pkg.tvplusPackageId}</div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:hidden">Package</div>
                      <div className="mt-1 truncate text-sm font-semibold text-slate-950 lg:mt-0">{pkg.name}</div>
                      {pkg.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{pkg.description}</p>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:hidden">Status</div>
                      {pkg.active ? (
                        <Badge className="mt-1 gap-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 lg:mt-0">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Shown
                        </Badge>
                      ) : (
                        <Badge className="mt-1 gap-1.5 bg-rose-100 text-rose-700 hover:bg-rose-100 lg:mt-0">
                          <XCircle className="h-3.5 w-3.5" />
                          Hidden
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 lg:justify-end lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                      <Label className="text-sm font-medium text-slate-800">{pkg.active ? 'Show Package' : 'Hide Package'}</Label>
                      <div className="flex items-center gap-2">
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                        <Switch
                          checked={pkg.active}
                          disabled={isSaving}
                          onCheckedChange={(active) => onSave(pkg.id, { active })}
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
  );
}

function RateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Input
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder="0.00"
      className="h-9 rounded-none border-0 bg-transparent px-2 focus-visible:ring-1"
    />
  );
}

function TrialRateSheet({
  title,
  terms,
  draft,
  onChange,
}: {
  title: string;
  terms: ReadonlyArray<{ key: string; label: string }>;
  draft: IptvPackageDraft;
  onChange: (group: 'user' | 'agent' | 'reseller', term: string, value: string) => void;
}) {
  const rows = [
    { key: 'user', label: 'User Price' },
    { key: 'agent', label: 'Agent Price' },
    { key: 'reseller', label: 'Reseller Price' },
  ] as const;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border border-border text-sm">
        <thead>
          <tr>
            <th colSpan={terms.length + 1} className="border border-border p-2 text-center text-base font-semibold">
              {title}
            </th>
          </tr>
          <tr>
            <th className="w-[180px] border border-border p-2" />
            {terms.map((term) => (
              <th key={term.key} className="border border-border p-2 text-left text-base font-medium">
                {term.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="border border-border p-2 text-base font-medium">{row.label}</td>
              {terms.map((term) => (
                <td key={term.key} className="border border-border p-0">
                  <RateInput value={draft.trialTerms[row.key][term.key] || ''} onChange={(value) => onChange(row.key, term.key, value)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyRateSheet({
  draft,
  onChange,
}: {
  draft: IptvPackageDraft;
  onChange: (group: IptvPriceGroup, term: string, value: string) => void;
}) {
  const rows = [
    { key: 'cost', label: 'Provider Credits' },
    { key: 'user', label: 'User Price' },
    { key: 'agent', label: 'Agent Price' },
    { key: 'reseller', label: 'Reseller Price' },
  ] as const;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border border-border text-sm">
        <thead>
          <tr>
            <th colSpan={IPTV_MONTHLY_PRICE_TERMS.length + 1} className="border border-border p-2 text-center text-base font-semibold">
              IPTV Monthly Packages
            </th>
          </tr>
          <tr>
            <th className="w-[180px] border border-border p-2" />
            {IPTV_MONTHLY_PRICE_TERMS.map((term) => (
              <th key={term.key} className="border border-border p-2 text-left text-base font-medium">
                {term.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="border border-border p-2 text-base font-medium">{row.label}</td>
              {IPTV_MONTHLY_PRICE_TERMS.map((term) => (
                <td key={term.key} className="border border-border p-0">
                  <RateInput value={draft.pricing[row.key][term.key] || ''} onChange={(value) => onChange(row.key, term.key, value)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VisibilitySheet({
  draft,
  onChange,
}: {
  draft: IptvPackageDraft;
  onChange: (key: keyof IptvPackageVisibility, value: boolean) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-3 lg:grid-cols-2">
      <div>
        <div className="text-sm font-semibold">Package Visibility</div>
        <p className="text-xs text-muted-foreground">Choose which account types can see and buy this package.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {IPTV_VISIBILITY_ROLES.map((role) => (
          <div key={role.key} className="flex items-center justify-between rounded-md border p-3">
            <Label>{role.label}</Label>
            <Switch checked={draft.visibility[role.key]} onCheckedChange={(checked) => onChange(role.key, checked)} />
          </div>
        ))}
      </div>
      <div>
        <div className="text-sm font-semibold">Free Trial Visibility</div>
        <p className="text-xs text-muted-foreground">Hide or show trial options for each account type.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {IPTV_VISIBILITY_ROLES.map((role) => (
          <div key={role.trialKey} className="flex items-center justify-between rounded-md border p-3">
            <Label>{role.label}</Label>
            <Switch checked={draft.visibility[role.trialKey]} onCheckedChange={(checked) => onChange(role.trialKey, checked)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PackageEditor({
  pkg,
  isSaving,
  onSave,
}: {
  pkg: IptvPackage;
  isSaving: boolean;
  onSave: (patch: Record<string, any>) => void;
}) {
  const buildPricing = () => ({
    cost: Object.fromEntries(IPTV_PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'cost', term.key)])) as Record<string, string>,
    user: Object.fromEntries(IPTV_PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'user', term.key)])) as Record<string, string>,
    reseller: Object.fromEntries(IPTV_PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'reseller', term.key)])) as Record<string, string>,
    agent: Object.fromEntries(IPTV_PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'agent', term.key)])) as Record<string, string>,
  });

  const [draft, setDraft] = useState({
    name: pkg.name,
    description: pkg.description || '',
    active: pkg.active,
    sortOrder: String(pkg.sortOrder || 0),
    pricing: buildPricing(),
    visibility: normalizeIptvVisibility(pkg.metadata?.visibility),
  });

  useEffect(() => {
    setDraft({
      name: pkg.name,
      description: pkg.description || '',
      active: pkg.active,
      sortOrder: String(pkg.sortOrder || 0),
      pricing: buildPricing(),
      visibility: normalizeIptvVisibility(pkg.metadata?.visibility),
    });
  }, [pkg]);

  const setPricing = (group: 'cost' | 'user' | 'reseller' | 'agent', term: string, value: string) => {
    setDraft((current) => ({
      ...current,
      pricing: {
        ...current.pricing,
        [group]: {
          ...current.pricing[group],
          [term]: value,
        },
      },
    }));
  };

  const buildSavePrices = () => ({
    demo: draft.pricing.user.trial,
    1: draft.pricing.user['1'],
    3: draft.pricing.user['3'],
    6: draft.pricing.user['6'],
    9: draft.pricing.user['9'],
    12: draft.pricing.user['12'],
    cost: draft.pricing.cost,
    user: draft.pricing.user,
    reseller: draft.pricing.reseller,
    agent: draft.pricing.agent,
  });

  const setVisibility = (key: keyof IptvPackageVisibility, value: boolean) => {
    setDraft((current) => ({
      ...current,
      visibility: {
        ...current.visibility,
        [key]: value,
      },
    }));
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{pkg.tvplusPackageId.startsWith('iotv-') ? 'IPTV Reseller Hub Provider' : 'TVPLUS'} #{pkg.tvplusPackageId}</Badge>
              {draft.active ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-400" />}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input value={draft.sortOrder} onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Switch checked={draft.active} onCheckedChange={(active) => setDraft((current) => ({ ...current, active }))} />
            <Button
              disabled={isSaving}
              onClick={() =>
                onSave({
                  name: draft.name,
                  description: draft.description,
                  active: draft.active,
                  sortOrder: Number(draft.sortOrder) || 0,
                  prices: buildSavePrices(),
                  visibility: draft.visibility,
                })
              }
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border p-3 lg:grid-cols-2">
          <div>
            <div className="text-sm font-semibold">Package Visibility</div>
            <p className="text-xs text-muted-foreground">Choose which account types can see and buy this package.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {IPTV_VISIBILITY_ROLES.map((role) => (
              <div key={role.key} className="flex items-center justify-between rounded-md border p-3">
                <Label>{role.label}</Label>
                <Switch checked={draft.visibility[role.key]} onCheckedChange={(checked) => setVisibility(role.key, checked)} />
              </div>
            ))}
          </div>
          <div>
            <div className="text-sm font-semibold">Free Trial Visibility</div>
            <p className="text-xs text-muted-foreground">Hide or show trial options for each account type.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {IPTV_VISIBILITY_ROLES.map((role) => (
              <div key={role.trialKey} className="flex items-center justify-between rounded-md border p-3">
                <Label>{role.label}</Label>
                <Switch checked={draft.visibility[role.trialKey]} onCheckedChange={(checked) => setVisibility(role.trialKey, checked)} />
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="p-2">IPTV Provider Credits</th>
                {IPTV_PRICE_TERMS.map((term) => (
                  <th key={term.key} className="p-2">{term.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 font-medium">Provider Credits</td>
                {IPTV_PRICE_TERMS.map((term) => (
                  <td key={term.key} className="p-2">
                    {term.key === 'trial' ? (
                      <Input value={draft.pricing.cost.trial || '0'} onChange={(event) => setPricing('cost', 'trial', event.target.value)} placeholder={term.providerLabel} />
                    ) : (
                      <Input value={draft.pricing.cost[term.key] || ''} onChange={(event) => setPricing('cost', term.key, event.target.value)} placeholder="0.00" />
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">User Price</td>
                {IPTV_PRICE_TERMS.map((term) => (
                  <td key={term.key} className="p-2">
                    <Input value={draft.pricing.user[term.key] || ''} onChange={(event) => setPricing('user', term.key, event.target.value)} placeholder={term.key === 'trial' ? '0.00' : '0.00'} />
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Reseller Price</td>
                {IPTV_PRICE_TERMS.map((term) => (
                  <td key={term.key} className="p-2">
                    <Input value={draft.pricing.reseller[term.key] || ''} onChange={(event) => setPricing('reseller', term.key, event.target.value)} placeholder="0.00" />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2 font-medium">Agent Price</td>
                {IPTV_PRICE_TERMS.map((term) => (
                  <td key={term.key} className="p-2">
                    <Input value={draft.pricing.agent[term.key] || ''} onChange={(event) => setPricing('agent', term.key, event.target.value)} placeholder="0.00" />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminIptvContent({ content }: { content: IptvContentCatalog }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListVideo className="h-5 w-5 text-primary" />
          Countries, Channels & Movies
        </CardTitle>
        <CardDescription>Demo content shown to customers while TVPLUS only exposes bouquet/package sync in the panel API.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Globe2 className="h-4 w-4 text-primary" />
            Countries
          </div>
          <div className="space-y-2">
            {content.countries.map((country) => (
              <div key={country.code} className="flex items-center justify-between rounded-md bg-muted/40 p-2 text-sm">
                <span>{country.name}</span>
                <span className="text-xs text-muted-foreground">
                  {country.channelCount} ch / {country.movieCount} movies
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <ListVideo className="h-4 w-4 text-primary" />
            Channel List
          </div>
          <div className="space-y-2">
            {content.channels.map((channel) => (
              <div key={channel.id} className="rounded-md bg-muted/40 p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{channel.name}</span>
                  <Badge variant="outline">{channel.quality}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {channel.countryCode} - {channel.category} - {channel.language}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Clapperboard className="h-4 w-4 text-primary" />
            Movie Details
          </div>
          <div className="space-y-2">
            {content.movies.map((movie) => (
              <div key={movie.id} className="rounded-md bg-muted/40 p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{movie.title}</span>
                  <Badge variant="outline">{movie.quality}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {movie.genre} - {movie.year} - {movie.runtimeMinutes} min - {movie.rating}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
