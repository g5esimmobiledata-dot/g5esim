import { Link, useLocation } from 'wouter';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Building2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Gift,
  Globe2,
  ImageIcon,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  Percent,
  PhoneCall,
  Save,
  ShoppingCart,
  Sparkles,
  Ticket,
  TrendingUp,
  Trash2,
  Tv,
  Upload,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { SiPaypal } from 'react-icons/si';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDisplayValue } from '@/lib/displayText';
import { useToast } from '@/hooks/use-toast';
import { SandboxModeNotice } from '@/components/SandboxModeNotice';

type ResellerStats = {
  reseller: {
    id: string;
    email: string;
    name?: string | null;
    walletBalance: string;
  };
  totals: {
    totalOrders: number;
    completedOrders: number;
    totalEsims: number;
    totalSpend: number;
    totalProfit: number;
    estimatedSavings: number;
    walletBalance: number;
    walletCredits: number;
    walletDebits: number;
    walletTopupCount: number;
    generatedVouchers: number;
    activeVoucherValue: number;
    redeemedVoucherValue: number;
  };
  monthlySpend: Array<{ month: string; spend: number; orders: number }>;
  recentOrders: Array<{
    id: string;
    displayOrderId: number;
    packageTitle?: string | null;
    destinationName?: string | null;
    dataAmount: string;
    validity: number;
    price: number;
    quantity: number;
    status: string;
    createdAt: string;
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    balanceAfter: number;
    description?: string | null;
    createdAt: string;
  }>;
  recommendedPackages: Array<{
    id: string;
    slug: string;
    title: string;
    dataAmount: string;
    validity: number;
    retailPrice: number;
    resellerPrice: number;
    savings: number;
    destinationName?: string | null;
    countryCode?: string | null;
  }>;
};

type StorefrontSettings = {
  subdomain: string;
  storeName: string;
  tagline?: string | null;
  contactEmail?: string | null;
  defaultCurrencyId?: string | null;
  storefrontConfig?: StorefrontConfig | null;
  logoUrl?: string | null;
  whatsappNumber?: string | null;
  isActive: boolean;
  url?: string | null;
};

type StorefrontConfig = {
  whatsappEnabled: boolean;
  whatsappScheduleEnabled: boolean;
  whatsappStartTime: string;
  whatsappEndTime: string;
  whatsappWorkingDays: string[];
  conciergeEnabled: boolean;
  conciergePricingMode: 'free' | 'paid';
  conciergeBillingCycle: 'one_time' | 'monthly';
  conciergeFee: string;
  conciergeTrialEnabled: boolean;
  conciergeTrialDays: string;
  supportSipEnabled: boolean;
  supportSipLabel: string;
  supportSipUri: string;
  supportSipServer: string;
  supportSipExtension: string;
  supportSipUsername: string;
  faviconUrl: string;
  copyrightText: string;
};

type CurrencyRate = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
  isEnabled?: boolean;
  isDefault?: boolean;
};

const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  whatsappEnabled: true,
  whatsappScheduleEnabled: false,
  whatsappStartTime: '09:00',
  whatsappEndTime: '18:00',
  whatsappWorkingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  conciergeEnabled: true,
  conciergePricingMode: 'free',
  conciergeBillingCycle: 'one_time',
  conciergeFee: '29.00',
  conciergeTrialEnabled: true,
  conciergeTrialDays: '7',
  supportSipEnabled: false,
  supportSipLabel: 'Call Center',
  supportSipUri: '',
  supportSipServer: '',
  supportSipExtension: '',
  supportSipUsername: '',
  faviconUrl: '',
  copyrightText: '',
};

const WORKING_DAYS = [
  { key: 'sun', label: 'Sun' },
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
];

function mergeStorefrontConfig(config?: StorefrontConfig | null): StorefrontConfig {
  return {
    ...DEFAULT_STOREFRONT_CONFIG,
    ...(config || {}),
    whatsappWorkingDays: config?.whatsappWorkingDays?.length
      ? config.whatsappWorkingDays
      : DEFAULT_STOREFRONT_CONFIG.whatsappWorkingDays,
  };
}

function formatMoney(amount: string | number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount || 0));
}

function iptvTermKey(order: any) {
  if (order?.subscriptionTermType === 'hours' || Number(order?.subscriptionMonths || 0) === 99) return 'trial';
  return String(order?.subscriptionMonths || 1);
}

function calculateIptvProfit(orders: any[] = [], retailRows: any[] = []) {
  const rowsByPackage = new Map<string, any>();
  retailRows.forEach((row) => {
    if (row.packageId) rowsByPackage.set(String(row.packageId), row);
    if (row.tvplusPackageId) rowsByPackage.set(String(row.tvplusPackageId), row);
    if (row.name) rowsByPackage.set(String(row.name).toLowerCase(), row);
  });

  return orders
    .filter((order) => !['failed', 'cancelled', 'canceled', 'refunded'].includes(String(order.status || '').toLowerCase()))
    .reduce(
      (totals, order) => {
        const key = iptvTermKey(order);
        const row =
          rowsByPackage.get(String(order.packageId || '')) ||
          rowsByPackage.get(String(order.tvplusPackageId || '')) ||
          rowsByPackage.get(String(order.packageName || '').toLowerCase());
        const revenue = Number(order.price ?? row?.retailPrices?.[key] ?? row?.basePrices?.[key] ?? 0);
        const cost = Number(row?.providerCostUsd?.[key] ?? 0);
        totals.revenue += revenue;
        totals.cost += cost;
        return totals;
      },
      { revenue: 0, cost: 0 },
    );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  href?: string;
}) {
  const content = (
    <Card className={`relative overflow-hidden border-0 shadow-xl shadow-black/20 ${tone}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-100">{label}</p>
            <h3 className="mt-2 text-3xl font-bold text-white">{value}</h3>
            <p className="mt-2 text-xs text-slate-300">{helper}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 shadow-lg shadow-blue-500/25">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
      <div className="absolute -bottom-10 -right-6 h-28 w-36 bg-white/20 blur-2xl" />
    </Card>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}

export default function ResellerDashboard() {
  const { toast } = useToast();
  const [location] = useLocation();
  const isAccountPanel = location.startsWith('/account');
  const panelBase = isAccountPanel ? '/account' : '/reseller';
  const priceCostPath = isAccountPanel ? '/account/esims/cost-price' : '/reseller/price-cost';
  const isSiteSettingsPage = location === '/reseller/platform-setup/settings' || location === '/account/platform-setup/settings';
  const isStorefrontPage = location === '/reseller/storefront' || location === '/account/storefront' || isSiteSettingsPage;
  const [storeName, setStoreName] = useState('');
  const [tagline, setTagline] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [defaultCurrencyId, setDefaultCurrencyId] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig>(DEFAULT_STOREFRONT_CONFIG);

  const { data: stats, isLoading } = useQuery<ResellerStats>({
    queryKey: ['/api/reseller/stats'],
    enabled: !isStorefrontPage,
  });

  const { data: virtualNumberDashboard } = useQuery<any>({
    queryKey: ['/api/vonage/dashboard'],
    enabled: !isStorefrontPage,
  });

  const { data: iptvOrders = [] } = useQuery<any[]>({
    queryKey: ['/api/iptv/orders'],
    enabled: !isStorefrontPage,
  });

  const { data: iptvRetailPrices = [] } = useQuery<any[]>({
    queryKey: ['/api/iptv/retail-prices'],
    enabled: !isStorefrontPage,
  });

  const { data: storefront } = useQuery<StorefrontSettings>({
    queryKey: ['/api/reseller/storefront/settings'],
  });

  const { data: currencies = [] } = useQuery<CurrencyRate[]>({
    queryKey: ['/api/currencies'],
  });
  const enabledCurrencies = currencies.filter((currency) => currency.isEnabled !== false);
  const fallbackCurrency = enabledCurrencies.find((currency) => currency.isDefault) || enabledCurrencies[0];

  useEffect(() => {
    if (!storefront) return;
    setStoreName(storefront.storeName || '');
    setTagline(storefront.tagline || '');
    setContactEmail(storefront.contactEmail || '');
    setDefaultCurrencyId(storefront.defaultCurrencyId || fallbackCurrency?.id || '');
    setSubdomain(storefront.subdomain || '');
    setWhatsappNumber(storefront.whatsappNumber || '');
    setStorefrontConfig(mergeStorefrontConfig(storefront.storefrontConfig));
  }, [fallbackCurrency?.id, storefront]);

  const updateStorefrontConfig = (updates: Partial<StorefrontConfig>) => {
    setStorefrontConfig((current) => mergeStorefrontConfig({ ...current, ...updates }));
  };

  const toggleWorkingDay = (day: string) => {
    setStorefrontConfig((current) => {
      const days = new Set(current.whatsappWorkingDays);
      if (days.has(day)) {
        days.delete(day);
      } else {
        days.add(day);
      }
      return mergeStorefrontConfig({
        ...current,
        whatsappWorkingDays: WORKING_DAYS.map((item) => item.key).filter((key) => days.has(key)),
      });
    });
  };

  const storefrontMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PATCH', '/api/reseller/storefront/settings', {
        storeName,
        tagline,
        contactEmail,
        defaultCurrencyId,
        subdomain,
        whatsappNumber,
        storefrontConfig,
        isActive: true,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not save storefront');
      return data.data as StorefrontSettings;
    },
    onSuccess: (data) => {
      setStoreName(data.storeName || '');
      setTagline(data.tagline || '');
      setContactEmail(data.contactEmail || '');
      setDefaultCurrencyId(data.defaultCurrencyId || fallbackCurrency?.id || '');
      setSubdomain(data.subdomain || '');
      setWhatsappNumber(data.whatsappNumber || '');
      setStorefrontConfig(mergeStorefrontConfig(data.storefrontConfig));
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/storefront/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/storefront/current'] });
      toast({ title: 'Storefront saved', description: 'Your subdomain settings are Ready.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Storefront update failed',
        description: error.message || 'Could not save storefront settings.',
        variant: 'destructive',
      });
    },
  });

  const logoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await apiRequest('POST', '/api/reseller/storefront/logo', formData);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not upload logo');
      return data.data as StorefrontSettings;
    },
    onSuccess: () => {
      setSelectedLogoFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/storefront/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/storefront/current'] });
      toast({ title: 'Logo uploaded', description: 'Your WhiteLabel store logo is Ready.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Logo upload failed',
        description: error.message || 'Could not upload the logo.',
        variant: 'destructive',
      });
    },
  });

  const logoRemoveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/reseller/storefront/logo');
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not remove logo');
      return data.data as StorefrontSettings;
    },
    onSuccess: () => {
      setSelectedLogoFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/storefront/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/storefront/current'] });
      toast({ title: 'Logo removed', description: 'Your store will use the platform logo until you upload another one.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Logo remove failed',
        description: error.message || 'Could not remove the logo.',
        variant: 'destructive',
      });
    },
  });

  const uploadAsset = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiRequest('POST', '/api/upload', formData);
    if (!res.ok) throw new Error('Image upload failed');
    const data = await res.json();
    return data?.data?.fileUrl || '';
  };

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const path = await uploadAsset(file);
      updateStorefrontConfig({ faviconUrl: path });
      toast({
        title: 'Favicon ready',
        description: 'Save the storefront to apply this favicon.',
      });
    } catch (error: any) {
      toast({
        title: 'Favicon upload failed',
        description: error.message || 'Could not upload favicon.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Reseller dashboard...</p>
        </div>
      </div>
    );
  }

  const totals = stats?.totals;
  const virtualNumbers = virtualNumberDashboard?.numbers || (virtualNumberDashboard?.number ? [virtualNumberDashboard.number] : []);
  const virtualNumberRevenue = virtualNumbers.reduce((sum: number, number: any) => sum + Number(number?.subscription?.renewalPrice || number?.pricing?.monthlyFee || 0), 0);
  const virtualNumberCost = virtualNumbers.reduce((sum: number, number: any) => sum + Number(number?.pricing?.monthlyFee || 0), 0);
  const virtualNumberProfit = virtualNumberRevenue - virtualNumberCost;
  const iptvTotals = calculateIptvProfit(iptvOrders, iptvRetailPrices);
  const iptvProfit = iptvTotals.revenue - iptvTotals.cost;
  const allServicesProfit = Number(totals?.totalProfit || 0) + virtualNumberProfit + iptvProfit;
  const hasOrders = Boolean(totals && totals.totalOrders > 0);
  const storefrontUrl = storefront?.url || '';
  const storefrontLogoUrl = storefront?.logoUrl || '';
  const isLogoBusy = logoUploadMutation.isPending || logoRemoveMutation.isPending;
  let storefrontSuffix = 'yourdomain.com';
  try {
    if (storefrontUrl) {
      const host = new URL(storefrontUrl).hostname;
      storefrontSuffix = subdomain && host.startsWith(`${subdomain}.`)
        ? host.slice(subdomain.length + 1)
        : host;
    }
  } catch {
    storefrontSuffix = 'yourdomain.com';
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge className="border-blue-300/30 bg-blue-400/10 text-blue-300 hover:bg-blue-400/10" variant="outline">
              Reseller Workspace
            </Badge>
            <Badge className="border-blue-300/40 bg-blue-400/10 text-blue-100 hover:bg-blue-400/10" variant="outline">
              Account Type: WhiteLabel
            </Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            {isSiteSettingsPage ? 'Site Settings' : isStorefrontPage ? 'WhiteLabel Storefront' : 'Dashboard'}
          </h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            {isStorefrontPage
              ? 'Manage your storefront name, logo, WhatsApp number, and dedicated customer store link.'
              : 'Manage Reseller Wallet Funds, Track Package Purchases, and Generate Customer Top-Up Vouchers.'}
          </p>
        </div>
        {!isStorefrontPage && (
          <div className="flex flex-wrap gap-3">
            <Link href={`${panelBase}/wallet`}>
              <Button className="border border-blue-300/20 bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/15 hover:from-blue-400 hover:to-blue-600">
                <Wallet className="mr-2 h-4 w-4" />
                Top Up Wallet
              </Button>
            </Link>
            <Link href={`${panelBase}/wallet?gateway=paypal`}>
              <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <SiPaypal className="mr-2 h-4 w-4 text-[#00457C]" />
                PayPal Top Up
              </Button>
            </Link>
            <Link href="/destinations">
              <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Package className="mr-2 h-4 w-4" />
                Buy Package
              </Button>
            </Link>
            <Link href={priceCostPath}>
              <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <DollarSign className="mr-2 h-4 w-4" />
                Cost & Retail Price
              </Button>
            </Link>
            <Link href={`${panelBase}/customers`}>
              <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <UserPlus className="mr-2 h-4 w-4" />
                Customers
              </Button>
            </Link>
          </div>
        )}
      </div>

      {!isStorefrontPage && <SandboxModeNotice role="reseller" />}

      {isStorefrontPage && (
      <Card id="whitelabel-storefront" className="scroll-mt-20 border-0 shadow-lg">
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.45fr)]">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-400/80 text-slate-950">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-teal-300">Storefront Information</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    Configure your storefront's basic information and branding.
                  </p>
                </div>
              </div>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="reseller-store-name" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-teal-400" />
                    Store Name
                  </Label>
                  <Input
                    id="reseller-store-name"
                    value={storeName}
                    onChange={(event) => setStoreName(event.target.value)}
                    placeholder="AYA eSIM Mobile"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="reseller-store-tagline">Tagline</Label>
                  <Input
                    id="reseller-store-tagline"
                    value={tagline}
                    onChange={(event) => setTagline(event.target.value)}
                    placeholder="Global Connectivity"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="reseller-contact-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-teal-400" />
                    Email
                  </Label>
                  <Input
                    id="reseller-contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="hello@yourstore.com"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="reseller-default-currency">Default Currency</Label>
                  <Select value={defaultCurrencyId} onValueChange={setDefaultCurrencyId}>
                    <SelectTrigger id="reseller-default-currency" className="mt-2">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledCurrencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                          {currency.symbol ? `${currency.symbol} ` : ''}{currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 rounded-md border border-slate-200 px-3 py-2 text-xs text-muted-foreground dark:border-slate-800">
                    Manage currencies in Platform Setup.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="bg-primary-gradient text-white"
                    onClick={() => storefrontMutation.mutate()}
                    disabled={storefrontMutation.isPending}
                  >
                    {storefrontMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Information
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800">
                <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
                  <div className="flex h-14 w-36 shrink-0 items-center justify-center rounded-md border bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                    {storefrontLogoUrl ? (
                      <img
                        src={storefrontLogoUrl}
                        alt="Store logo"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                        No Logo
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 self-center">
                    <p className="text-sm font-medium text-slate-950 dark:text-white">Store Logo</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload the logo Customers will see on your WhiteLabel storefront header and footer.
                    </p>
                    {selectedLogoFile && (
                      <p className="mt-2 truncate text-xs text-teal-500 dark:text-teal-300">
                        Ready to save: {selectedLogoFile.name}
                      </p>
                    )}
                  </div>
                  <div className="grid shrink-0 grid-cols-1 items-center gap-2 self-center justify-self-end sm:grid-cols-3">
                    <Input
                      id="reseller-logo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) setSelectedLogoFile(file);
                        event.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLogoBusy}
                      className="min-w-32 justify-center"
                      onClick={() => document.getElementById('reseller-logo-upload')?.click()}
                    >
                      {logoUploadMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Upload Logo
                    </Button>
                    <Button
                      type="button"
                      className="min-w-28 justify-center bg-primary-gradient text-white"
                      disabled={isLogoBusy || !selectedLogoFile}
                      onClick={() => selectedLogoFile && logoUploadMutation.mutate(selectedLogoFile)}
                    >
                      {logoUploadMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Logo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLogoBusy || !storefrontLogoUrl}
                      className="min-w-28 justify-center"
                      onClick={() => logoRemoveMutation.mutate()}
                    >
                      {logoRemoveMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Remove
                    </Button>
                  </div>
                </div>
                  <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                      {storefrontConfig.faviconUrl ? (
                        <img
                          src={storefrontConfig.faviconUrl}
                          alt="Favicon"
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 self-center">
                      <p className="text-sm font-medium text-slate-950 dark:text-white">Favicon</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Recommended: 32x32 or 48x48 PNG, ICO, or SVG.
                      </p>
                    </div>
                    <Input
                      type="file"
                      accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                      className="max-w-sm"
                      onChange={handleFaviconUpload}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reseller-copyright-text">Copyright Text</Label>
                    <Textarea
                      id="reseller-copyright-text"
                      value={storefrontConfig.copyrightText}
                      onChange={(event) => updateStorefrontConfig({ copyrightText: event.target.value })}
                      placeholder="(c) 2026 Your Store. All rights reserved."
                      rows={3}
                      className="mt-2 resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className="bg-primary-gradient text-white"
                      onClick={() => storefrontMutation.mutate()}
                      disabled={storefrontMutation.isPending}
                    >
                      {storefrontMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Storefront Branding
                    </Button>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-center">
                  <div className="min-w-0 self-center">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-950 dark:text-white">Customer Store Link</p>
                      {storefront?.isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" variant="outline">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" variant="outline">
                          Save to activate
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Share this link with retail Customers so they can buy from your WhiteLabel store.
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 self-center sm:flex-row sm:items-center">
                    <Input
                      readOnly
                      value={storefrontUrl || 'Enter a subdomain and save storefront'}
                      className="font-mono text-sm"
                    />
                    <div className="grid shrink-0 grid-cols-2 items-center gap-2 justify-self-end">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!storefrontUrl}
                        className="min-w-24 justify-center"
                        onClick={async () => {
                          await navigator.clipboard.writeText(storefrontUrl);
                          toast({
                            title: 'Store link copied',
                            description: storefrontUrl,
                          });
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!storefrontUrl}
                        className="min-w-24 justify-center"
                        onClick={() => window.open(storefrontUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Globe2 className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">WhiteLabel Storefront</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connect this storefront information to your dedicated storefront subdomain.
                  </p>
                </div>
                <div>
                  <Label htmlFor="reseller-subdomain">Subdomain</Label>
                  <div className="mt-2 flex rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                    <Input
                      id="reseller-subdomain"
                      value={subdomain}
                      onChange={(event) => setSubdomain(event.target.value.toLowerCase())}
                      placeholder="my-store"
                      className="border-0 focus-visible:ring-0"
                    />
                    <span className="flex items-center whitespace-nowrap px-3 text-sm text-muted-foreground">
                      .{storefrontSuffix}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 p-5 dark:border-slate-800">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-teal-400" />
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">WhatsApp Support</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    Set the support number and control when the chat icon appears.
                  </p>
                </div>
                <Switch
                  checked={storefrontConfig.whatsappEnabled}
                  onCheckedChange={(checked) => updateStorefrontConfig({ whatsappEnabled: checked })}
                  aria-label="Toggle WhatsApp support"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="reseller-whatsapp-number">WhatsApp Number</Label>
                  <Input
                    id="reseller-whatsapp-number"
                    value={whatsappNumber}
                    onChange={(event) => setWhatsappNumber(event.target.value)}
                    placeholder="+971501234567"
                    className="mt-2"
                    disabled={!storefrontConfig.whatsappEnabled}
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-teal-400" />
                        <p className="font-medium text-slate-950 dark:text-white">Use Working Schedule</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Only show WhatsApp during working hours.
                      </p>
                    </div>
                    <Switch
                      checked={storefrontConfig.whatsappScheduleEnabled}
                      onCheckedChange={(checked) => updateStorefrontConfig({ whatsappScheduleEnabled: checked })}
                      disabled={!storefrontConfig.whatsappEnabled}
                      aria-label="Toggle WhatsApp working schedule"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="reseller-whatsapp-start">Start Time</Label>
                    <Input
                      id="reseller-whatsapp-start"
                      type="time"
                      value={storefrontConfig.whatsappStartTime}
                      onChange={(event) => updateStorefrontConfig({ whatsappStartTime: event.target.value })}
                      className="mt-2"
                      disabled={!storefrontConfig.whatsappEnabled || !storefrontConfig.whatsappScheduleEnabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reseller-whatsapp-end">End Time</Label>
                    <Input
                      id="reseller-whatsapp-end"
                      type="time"
                      value={storefrontConfig.whatsappEndTime}
                      onChange={(event) => updateStorefrontConfig({ whatsappEndTime: event.target.value })}
                      className="mt-2"
                      disabled={!storefrontConfig.whatsappEnabled || !storefrontConfig.whatsappScheduleEnabled}
                    />
                  </div>
                </div>

                <div>
                  <Label>Working Days</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WORKING_DAYS.map((day) => {
                      const selected = storefrontConfig.whatsappWorkingDays.includes(day.key);
                      return (
                        <Button
                          key={day.key}
                          type="button"
                          variant="outline"
                          className={`h-9 min-w-14 ${
                            selected
                              ? 'border-teal-400/50 bg-teal-500/60 text-white hover:bg-teal-500/70'
                              : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
                          }`}
                          disabled={!storefrontConfig.whatsappEnabled || !storefrontConfig.whatsappScheduleEnabled}
                          onClick={() => toggleWorkingDay(day.key)}
                        >
                          {day.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

              <div className="rounded-2xl border border-slate-200/80 p-5 dark:border-slate-800">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-teal-400" />
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Concierge</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    Choose whether Concierge is free or paid.
                  </p>
                </div>
                <Switch
                  checked={storefrontConfig.conciergeEnabled}
                  onCheckedChange={(checked) => updateStorefrontConfig({ conciergeEnabled: checked })}
                  aria-label="Toggle Concierge"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,auto)_minmax(260px,1fr)] lg:items-start">
                <div className="min-w-0">
                  <Label>Pricing</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <div className="flex gap-2">
                      {(['free', 'paid'] as const).map((mode) => (
                        <Button
                          key={mode}
                          type="button"
                          variant="outline"
                          className={storefrontConfig.conciergePricingMode === mode
                            ? 'border-teal-400/50 bg-teal-500/70 text-white hover:bg-teal-500/80'
                            : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'}
                          disabled={!storefrontConfig.conciergeEnabled}
                          onClick={() => updateStorefrontConfig({ conciergePricingMode: mode })}
                        >
                          {mode === 'free' ? 'Free' : 'Paid'}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {(['one_time', 'monthly'] as const).map((cycle) => (
                        <Button
                          key={cycle}
                          type="button"
                          variant="outline"
                          className={storefrontConfig.conciergeBillingCycle === cycle
                            ? 'border-teal-400/50 bg-teal-500/40 text-white hover:bg-teal-500/50'
                            : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'}
                          disabled={!storefrontConfig.conciergeEnabled || storefrontConfig.conciergePricingMode !== 'paid'}
                          onClick={() => updateStorefrontConfig({ conciergeBillingCycle: cycle })}
                        >
                          {cycle === 'one_time' ? 'One Time' : 'Monthly'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Select the fee mode and billing cycle.
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <Label htmlFor="reseller-concierge-fee">Concierge Fee</Label>
                  <Input
                    id="reseller-concierge-fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={storefrontConfig.conciergeFee}
                    onChange={(event) => updateStorefrontConfig({ conciergeFee: event.target.value })}
                    className="mt-2"
                    disabled={!storefrontConfig.conciergeEnabled || storefrontConfig.conciergePricingMode !== 'paid'}
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Current display: {storefrontConfig.conciergeEnabled
                      ? storefrontConfig.conciergePricingMode === 'free'
                        ? 'Free'
                        : `${storefrontConfig.conciergeBillingCycle === 'monthly' ? 'Monthly' : 'One Time'} ${formatMoney(storefrontConfig.conciergeFee || 0)}`
                      : 'Hidden'}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-end">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div>
                    <Label className="text-sm font-semibold text-slate-950 dark:text-white">Free Trial</Label>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Let storefront users try Concierge before payment is required.
                    </p>
                  </div>
                  <Switch
                    checked={storefrontConfig.conciergeTrialEnabled}
                    onCheckedChange={(checked) => updateStorefrontConfig({ conciergeTrialEnabled: checked })}
                    disabled={!storefrontConfig.conciergeEnabled || storefrontConfig.conciergePricingMode !== 'paid'}
                    aria-label="Toggle Concierge free trial"
                  />
                </div>
                <div>
                  <Label htmlFor="reseller-concierge-trial-days">Trial Days</Label>
                  <Input
                    id="reseller-concierge-trial-days"
                    type="number"
                    min="1"
                    max="30"
                    step="1"
                    value={storefrontConfig.conciergeTrialDays}
                    onChange={(event) => updateStorefrontConfig({ conciergeTrialDays: event.target.value })}
                    className="mt-2"
                    disabled={
                      !storefrontConfig.conciergeEnabled ||
                      storefrontConfig.conciergePricingMode !== 'paid' ||
                      !storefrontConfig.conciergeTrialEnabled
                    }
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    After the trial, users must activate and pay for Concierge.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-sky-400" />
                      <Label className="text-sm font-semibold text-slate-950 dark:text-white">Call Center SIP</Label>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Customers registered under this account will call this SIP support target.
                    </p>
                  </div>
                  <Switch
                    checked={storefrontConfig.supportSipEnabled}
                    onCheckedChange={(checked) => updateStorefrontConfig({ supportSipEnabled: checked })}
                    disabled={!storefrontConfig.conciergeEnabled}
                    aria-label="Toggle Call Center SIP"
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="reseller-support-sip-label">Button Label</Label>
                    <Input
                      id="reseller-support-sip-label"
                      value={storefrontConfig.supportSipLabel}
                      onChange={(event) => updateStorefrontConfig({ supportSipLabel: event.target.value })}
                      placeholder="Call Center"
                      className="mt-2"
                      disabled={!storefrontConfig.conciergeEnabled || !storefrontConfig.supportSipEnabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reseller-support-sip-uri">SIP URI</Label>
                    <Input
                      id="reseller-support-sip-uri"
                      value={storefrontConfig.supportSipUri}
                      onChange={(event) => updateStorefrontConfig({ supportSipUri: event.target.value })}
                      placeholder="support@sip.example.com"
                      className="mt-2"
                      disabled={!storefrontConfig.conciergeEnabled || !storefrontConfig.supportSipEnabled}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="reseller-support-sip-server">SIP Server</Label>
                    <Input
                      id="reseller-support-sip-server"
                      value={storefrontConfig.supportSipServer}
                      onChange={(event) => updateStorefrontConfig({ supportSipServer: event.target.value })}
                      placeholder="sip.example.com"
                      className="mt-2"
                      disabled={!storefrontConfig.conciergeEnabled || !storefrontConfig.supportSipEnabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reseller-support-sip-username">Username</Label>
                    <Input
                      id="reseller-support-sip-username"
                      value={storefrontConfig.supportSipUsername}
                      onChange={(event) => updateStorefrontConfig({ supportSipUsername: event.target.value })}
                      placeholder="1001"
                      className="mt-2"
                      disabled={!storefrontConfig.conciergeEnabled || !storefrontConfig.supportSipEnabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reseller-support-sip-extension">Extension</Label>
                    <Input
                      id="reseller-support-sip-extension"
                      value={storefrontConfig.supportSipExtension}
                      onChange={(event) => updateStorefrontConfig({ supportSipExtension: event.target.value })}
                      placeholder="1001"
                      className="mt-2"
                      disabled={!storefrontConfig.conciergeEnabled || !storefrontConfig.supportSipEnabled}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button
                  className="bg-primary-gradient text-white"
                  onClick={() => storefrontMutation.mutate()}
                  disabled={storefrontMutation.isPending}
                >
                  {storefrontMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Storefront
                </Button>
              </div>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>
      )}

      {!isStorefrontPage && (
        <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard
          label="Available Wallet Balance"
          value={formatMoney(totals?.walletBalance || 0)}
          helper="Top up by voucher, card, or PayPal"
          icon={Wallet}
          tone="bg-[radial-gradient(circle_at_82%_76%,rgba(96,165,250,0.25),transparent_22%),linear-gradient(105deg,#09152d,#0d1b35_55%,#1e2c46)]"
          href={`${panelBase}/wallet`}
        />
        <KpiCard
          label="Package Sales"
          value={formatMoney(totals?.totalSpend || 0)}
          helper={`${totals?.totalOrders || 0} total Orders`}
          icon={DollarSign}
          tone="bg-[radial-gradient(circle_at_82%_76%,rgba(96,165,250,0.25),transparent_22%),linear-gradient(105deg,#0a1830,#0d1e3d_55%,#23314e)]"
          href={`${panelBase}/orders`}
        />
        <KpiCard
          label="All Services Profit"
          value={formatMoney(allServicesProfit)}
          helper="eSIM, eRoaming, and IPTV profit"
          icon={TrendingUp}
          tone="bg-[radial-gradient(circle_at_82%_76%,rgba(96,165,250,0.25),transparent_22%),linear-gradient(105deg,#08172b,#101f3b_55%,#27334c)]"
          href={priceCostPath}
        />
        <KpiCard
          label="eRoaming Profit"
          value={formatMoney(virtualNumberProfit)}
          helper="eRoaming monthly service margin"
          icon={PhoneCall}
          tone="bg-[radial-gradient(circle_at_82%_76%,rgba(45,212,191,0.25),transparent_22%),linear-gradient(105deg,#08231f,#0d342f_55%,#214f48)]"
          href={`${panelBase}/virtual-numbers/dashboard`}
        />
        <KpiCard
          label="IPTV Profit"
          value={formatMoney(iptvProfit)}
          helper="Subscription revenue minus service cost"
          icon={Tv}
          tone="bg-[radial-gradient(circle_at_82%_76%,rgba(217,70,239,0.22),transparent_22%),linear-gradient(105deg,#21102c,#301b42_55%,#4c2b61)]"
          href={`${panelBase}/iptv/dashboard`}
        />
        <KpiCard
          label="eSIMs Sold"
          value={`${totals?.totalEsims || 0}`}
          helper={`${totals?.completedOrders || 0} completed package sales`}
          icon={ShoppingCart}
          tone="bg-[radial-gradient(circle_at_82%_76%,rgba(96,165,250,0.25),transparent_22%),linear-gradient(105deg,#10172d,#121b35_55%,#293653)]"
          href={`${panelBase}/esims`}
        />
        <KpiCard
          label="Reseller Savings"
          value={formatMoney(totals?.estimatedSavings || 0)}
          helper="Estimated vs retail catalog price"
          icon={Percent}
          tone="bg-[radial-gradient(circle_at_82%_76%,rgba(96,165,250,0.25),transparent_22%),linear-gradient(105deg,#11162a,#181d32_55%,#34344a)]"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-7">
        <Card className="border-0 bg-[#0b1226] text-white shadow-xl shadow-black/20 xl:col-span-4">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Monthly Spend</h2>
                <p className="text-sm text-slate-300">
                  Reseller purchase activity over recent months.
                </p>
              </div>
              <Badge className="border-white/10 bg-black/20 text-white hover:bg-black/20" variant="outline">{hasOrders ? 'Live data' : 'No Orders yet'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {hasOrders ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats?.monthlySpend || []}>
                  <defs>
                    <linearGradient id="resellerSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#273244" />
                  <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: 12 }} />
                  <YAxis
                    stroke="#94a3b8"
                    style={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                  />
                  <Tooltip formatter={(value: number) => [formatMoney(value), 'Spend']} />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#resellerSpend)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 text-center">
                <ShoppingCart className="mb-3 h-10 w-10 text-slate-400" />
                <h3 className="font-semibold text-white">No purchases yet</h3>
                <p className="mt-1 text-sm text-slate-400">Start by buying reseller-priced Packages.</p>
                <Link href="/destinations">
                  <Button className="mt-4 border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white" variant="outline">
                    Browse Packages
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-[#0b1226] text-white shadow-xl shadow-black/20 xl:col-span-3">
          <CardHeader className="border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Wallet Actions</h2>
            <p className="text-sm text-slate-300">
              Add funds or create QR vouchers for Customers.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <Link href={`${panelBase}/wallet?gateway=paypal`}>
              <div className="flex cursor-pointer items-center justify-between rounded-xl border border-sky-900/70 bg-slate-950/20 p-4 transition hover:border-sky-600/70 hover:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-sky-950 p-2 text-[#00457C] shadow-sm">
                    <SiPaypal className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">PayPal Top-up</p>
                    <p className="text-sm text-slate-400">Open PayPal checkout for wallet funds</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
            <Link href={`${panelBase}/wallet?gateway=stripe`}>
              <div className="flex cursor-pointer items-center justify-between rounded-xl border border-sky-900/70 bg-slate-950/20 p-4 transition hover:border-cyan-700/70 hover:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Card Top-up</p>
                    <p className="text-sm text-slate-400">Use the enabled card gateway</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
            <Link href={`${panelBase}/wallet`}>
              <div className="flex cursor-pointer items-center justify-between rounded-xl border border-sky-900/70 bg-slate-950/20 p-4 transition hover:border-cyan-700/70 hover:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Redeem Voucher</p>
                    <p className="text-sm text-slate-400">Apply wallet credit code</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
            <Link href={`${panelBase}/wallet`}>
              <div className="flex cursor-pointer items-center justify-between rounded-xl border border-sky-900/70 bg-slate-950/20 p-4 transition hover:border-cyan-700/70 hover:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Generate QR Voucher</p>
                    <p className="text-sm text-slate-400">
                      {formatMoney(totals?.activeVoucherValue || 0)} active voucher value
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Orders</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Latest reseller package purchases.</p>
              </div>
              <Link href={`${panelBase}/orders`}>
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {stats?.recentOrders?.length ? (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          OID{String(order.displayOrderId).padStart(3, '0')}
                        </Badge>
                        <Badge variant={order.status === 'completed' ? 'default' : 'outline'}>
                          {formatDisplayValue(order.status)}
                        </Badge>
                      </div>
                      <p className="truncate font-semibold text-slate-900 dark:text-white">
                        {order.packageTitle || `${order.dataAmount} package`}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {order.destinationName || 'Global'} | {order.dataAmount} | {order.validity} days
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(order.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No reseller Orders yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recommended Packages</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Latest enabled Packages with reseller pricing.
                </p>
              </div>
              <Link href="/destinations">
                <Button variant="outline" size="sm">
                  Browse
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {stats?.recommendedPackages?.length ? (
              <div className="space-y-3">
                {stats.recommendedPackages.map((pkg) => (
                  <Link key={pkg.id} href={`/packages/${pkg.slug}`}>
                    <div className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-primary/50 dark:border-slate-800">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{pkg.title}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {pkg.destinationName || 'Global'} | {pkg.dataAmount} | {pkg.validity} days
                        </p>
                        {pkg.savings > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="h-3 w-3" />
                            Save {formatMoney(pkg.savings)} vs retail
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatMoney(pkg.resellerPrice)}</p>
                        <p className="text-xs text-muted-foreground line-through">
                          {formatMoney(pkg.retailPrice)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No active Packages found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}
