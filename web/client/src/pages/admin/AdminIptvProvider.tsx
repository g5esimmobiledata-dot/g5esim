import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeDollarSign, BarChart3, CheckCircle2, Clapperboard, Coins, Film, Layers, ListVideo, Loader2, PackageOpen, RefreshCw, Save, Server, Settings2, Tv, Users, Wifi, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type ProviderName = 'tvplus' | 'iotv';

type CurrencyRate = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  conversionRate: string | number;
  isDefault?: boolean;
  isEnabled?: boolean;
};

type Dashboard = {
  settings: {
    enabled: boolean;
    activeProvider: ProviderName;
    apiKeyConfigured: boolean;
    apiKeyPreview: string;
    baseUrl: string;
    demoEnabled: boolean;
    iotvTokenConfigured: boolean;
    iotvTokenPreview: string;
    iotvApiBaseUrl: string;
    iotvResellerUsernameConfigured: boolean;
    iotvResellerUsernamePreview: string;
    iotvResellerPasswordConfigured: boolean;
    iotvResellerPasswordPreview: string;
    iotvPlayerBaseUrl: string;
    tvplusCurrency?: string;
    tvplusCreditsPaidAmount?: string;
    tvplusCreditsReceived?: string;
    tvplusCreditUnitCost?: string;
    iotvCurrency?: string;
    iotvCreditsPaidUsd?: string;
    iotvCreditsReceived?: string;
    iotvCreditUnitCostUsd?: string;
    conversionDisplayCurrency?: string;
  };
  currencyRates?: Array<{
    code: string;
    conversionRate: string | number;
  }>;
  packages?: Array<{
    id: string;
    tvplusPackageId: string;
    active: boolean;
  }>;
  content?: {
    channels?: Array<Record<string, any>>;
    movies?: Array<Record<string, any>>;
    series?: Array<Record<string, any>>;
  };
  providerCatalog?: {
    provider: ProviderName;
    label: string;
    source: string;
    liveCount: number;
    movieCount: number;
    seriesCount: number;
    liveCategories: number;
    movieCategories: number;
    seriesCategories: number;
    updatedAt: string | null;
    fetchedAt: string;
    errors?: string[];
  };
  tvplusCatalog?: {
    provider: ProviderName;
    label: string;
    source: string;
    liveCount: number;
    movieCount: number;
    seriesCount: number;
    updatedAt: string | null;
  };
  orders: Array<{
    status: string;
    price?: string | number | null;
    currency?: string | null;
    providerResponse?: Record<string, any>;
  }>;
};

function toUsd(amount: string | number | null | undefined, currency: string | null | undefined, rates: Dashboard['currencyRates']) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return 0;

  const code = String(currency || 'USD').toUpperCase();
  if (code === 'USD') return value;

  const rate = Number((rates || []).find((item) => item.code === code)?.conversionRate || 0);
  if (!Number.isFinite(rate) || rate <= 0) return value;
  return value / rate;
}

function packageProvider(tvplusPackageId: string): ProviderName {
  return String(tvplusPackageId || '').startsWith('iotv-') ? 'iotv' : 'tvplus';
}

function formatCount(value: number) {
  return Number(value || 0).toLocaleString();
}

const lightPanelClass = 'overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm';
const lightInputClass =
  'border-[#24445f] bg-[#071b35] text-white placeholder:text-slate-400 focus-visible:ring-teal-500';
const lightOutlineButtonClass =
  'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const sectionButtonClass =
  'border-[#24445f] bg-[#071b35] text-white shadow-sm hover:border-[#2f5f84] hover:bg-[#0b2748] hover:text-white';
const primaryButtonClass = 'bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';
const lightInnerPanelClass = 'rounded-md border border-slate-200 bg-slate-50 text-slate-950';

export default function AdminIptvProvider() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    enabled: false,
    activeProvider: 'iotv' as ProviderName,
    apiKey: '',
    apiBaseUrl: 'https://tvpluspanel.net/api/api.php',
    demoEnabled: true,
    tvplusCurrency: 'USD',
    tvplusCreditsPaidAmount: '0',
    tvplusCreditsReceived: '0',
    iotvApiToken: '',
    iotvApiBaseUrl: 'https://panel.irhdns.com',
    iotvResellerUsername: '',
    iotvResellerPassword: '',
    iotvPlayerBaseUrl: 'https://panel.irhdns.com',
    iotvCurrency: 'USD',
    iotvCreditsPaidUsd: '0',
    iotvCreditsReceived: '0',
  });
  const [resellerInfo, setResellerInfo] = useState<Record<string, any> | null>(null);

  const { data, isLoading } = useQuery<Dashboard>({
    queryKey: ['/api/admin/iptv/dashboard'],
  });

  useEffect(() => {
    if (!data) return;
    setSettings((current) => ({
      ...current,
      enabled: data.settings.enabled,
      activeProvider: data.settings.activeProvider || 'iotv',
      apiBaseUrl: data.settings.baseUrl || current.apiBaseUrl,
      demoEnabled: data.settings.demoEnabled,
      tvplusCurrency: data.settings.tvplusCurrency || 'USD',
      tvplusCreditsPaidAmount: data.settings.tvplusCreditsPaidAmount || '0',
      tvplusCreditsReceived: data.settings.tvplusCreditsReceived || '0',
      iotvApiBaseUrl: data.settings.iotvApiBaseUrl || current.iotvApiBaseUrl,
      iotvPlayerBaseUrl: data.settings.iotvPlayerBaseUrl || data.settings.iotvApiBaseUrl || current.iotvPlayerBaseUrl,
      iotvCurrency: data.settings.iotvCurrency || 'USD',
      iotvCreditsPaidUsd: data.settings.iotvCreditsPaidUsd || '0',
      iotvCreditsReceived: data.settings.iotvCreditsReceived || '0',
    }));
  }, [data]);

  const providerOrders = useMemo(() => {
    const selected = settings.activeProvider;
    return (data?.orders || []).filter((order) => {
      const provider = String(order.providerResponse?.provider || order.providerResponse?.source || '').toLowerCase();
      return provider ? provider === selected : selected === 'tvplus';
    });
  }, [data?.orders, settings.activeProvider]);
  const providerPackages = useMemo(() => {
    return (data?.packages || []).filter((pkg) => !pkg.metadata?.virtualTrial && packageProvider(pkg.tvplusPackageId) === settings.activeProvider && pkg.active !== false);
  }, [data?.packages, settings.activeProvider]);

  const activeUsers = providerOrders.filter((order) => order.status === 'active').length;
  const providerCatalog = settings.activeProvider === 'iotv' ? data?.providerCatalog : data?.tvplusCatalog;
  const availableChannels = providerCatalog?.liveCount ?? data?.content?.channels?.length ?? 0;
  const availableMovies = providerCatalog?.movieCount ?? data?.content?.movies?.length ?? 0;
  const availableSeries = providerCatalog?.seriesCount ?? data?.content?.series?.length ?? 0;
  const availableBouquets = providerPackages.length;
  const totalProfitUsd = providerOrders.reduce((sum, order) => sum + toUsd(order.price, order.currency, data?.currencyRates), 0);
  const selectedCreditsPaid = settings.activeProvider === 'tvplus' ? settings.tvplusCreditsPaidAmount : settings.iotvCreditsPaidUsd;
  const selectedCreditsReceived = settings.activeProvider === 'tvplus' ? settings.tvplusCreditsReceived : settings.iotvCreditsReceived;
  const selectedCurrency = settings.activeProvider === 'tvplus' ? settings.tvplusCurrency : settings.iotvCurrency;
  const creditUnitCost = Number(selectedCreditsReceived || 0) > 0
    ? Number(selectedCreditsPaid || 0) / Number(selectedCreditsReceived || 0)
    : 0;
  const availableCredits = Number(resellerInfo?.credits ?? selectedCreditsReceived ?? 0) || 0;
  const calculatedAvailableBalance = availableCredits * creditUnitCost;
  const providerLabel = settings.activeProvider === 'iotv' ? 'IPTV Reseller Hub Provider' : 'TVPLUS';
  const apiConnected = settings.activeProvider === 'tvplus'
    ? Boolean(data?.settings.apiKeyConfigured || settings.apiKey.trim())
    : Boolean(
      (data?.settings.iotvTokenConfigured || settings.iotvApiToken.trim())
      && (data?.settings.iotvResellerUsernameConfigured || settings.iotvResellerUsername.trim())
      && (data?.settings.iotvResellerPasswordConfigured || settings.iotvResellerPassword.trim())
      && settings.iotvApiBaseUrl.trim(),
    );
  const providerInitial = settings.activeProvider === 'iotv' ? 'IRH' : 'TV+';
  const providerSubtitle = settings.activeProvider === 'iotv'
    ? 'Portal API, reseller credentials, player link, credits, and IPTV Reseller Hub catalog.'
    : 'TVPLUS API key, package catalog, reseller credits, and TVPLUS channel data.';

  const saveSettings = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        enabled: settings.enabled,
        active_provider: settings.activeProvider,
        demo_enabled: settings.demoEnabled,
      };

      if (settings.activeProvider === 'tvplus') {
        payload.api_base_url = settings.apiBaseUrl;
        payload.tvplus_currency = settings.tvplusCurrency;
        payload.tvplus_credits_paid_amount = settings.tvplusCreditsPaidAmount;
        payload.tvplus_credits_received = settings.tvplusCreditsReceived;
        if (settings.apiKey) payload.api_key = settings.apiKey;
      } else {
        payload.iotv_api_base_url = settings.iotvApiBaseUrl;
        payload.iotv_player_base_url = settings.iotvPlayerBaseUrl;
        payload.iotv_currency = settings.iotvCurrency;
        payload.iotv_credits_paid_usd = settings.iotvCreditsPaidUsd;
        payload.iotv_credits_received = settings.iotvCreditsReceived;
        if (settings.iotvApiToken) payload.iotv_api_token = settings.iotvApiToken;
        if (settings.iotvResellerUsername) payload.iotv_reseller_username = settings.iotvResellerUsername;
        if (settings.iotvResellerPassword) payload.iotv_reseller_password = settings.iotvResellerPassword;
      }

      const response = await apiRequest('PUT', '/api/admin/iptv/settings', payload);
      return response.json();
    },
    onSuccess: async () => {
      setSettings((current) => ({ ...current, apiKey: '', iotvApiToken: '', iotvResellerPassword: '' }));
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      toast({ title: 'Provider saved', description: 'IPTV provider API settings were saved.' });
    },
    onError: (error: any) => {
      toast({ title: 'Save failed', description: error.message || 'Could not save provider settings.', variant: 'destructive' });
    },
  });

  const loadResellerInfo = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/admin/iptv/reseller-info');
      return response.json();
    },
    onSuccess: (response) => {
      setResellerInfo(response.data || {});
      toast({ title: 'Provider info loaded', description: 'Credits and balance were refreshed from the selected provider.' });
    },
    onError: (error: any) => {
      toast({ title: 'Provider info failed', description: error.message || 'Could not load provider credits.', variant: 'destructive' });
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
      <Card className={lightPanelClass}>
        <CardContent className="p-0">
          <div className="grid gap-0 xl:grid-cols-[1fr_420px]">
            <div className="space-y-6 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Tv className="h-3.5 w-3.5" />
                  IPTV Services
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                  Active provider control center
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">IPTV Provider</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-500">
                  Select the IPTV provider, verify its connection, refresh credit balance, and jump into catalog, pricing, channels, or users.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SectionButton href={`/admin/iptv/bouquets?provider=${settings.activeProvider}`} title="Bouquets" icon={Server} />
                <SectionButton href={`/admin/iptv/cost-price?provider=${settings.activeProvider}`} title="Cost & Price" icon={Layers} />
                <SectionButton href={`/admin/iptv/channels?provider=${settings.activeProvider}`} title="Channels" icon={ListVideo} />
                <SectionButton href={`/admin/iptv/users?provider=${settings.activeProvider}`} title="User Logs" icon={Users} />
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-6 xl:border-l xl:border-t-0">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-lg font-bold text-primary">
                  {providerInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Provider</div>
                  <div className="mt-1 text-xl font-bold text-slate-950">{providerLabel}</div>
                  <p className="mt-1 text-xs text-slate-500">{providerSubtitle}</p>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <Label className="text-slate-700">Switch Provider</Label>
                <select
                  className={`h-11 w-full rounded-md border px-3 text-sm font-medium ${lightInputClass}`}
                  value={settings.activeProvider}
                  onChange={(event) => setSettings((current) => ({ ...current, activeProvider: event.target.value as ProviderName }))}
                >
                  <option value="iotv">IPTV Reseller Hub Provider</option>
                  <option value="tvplus">TVPLUS</option>
                </select>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ProviderStatusPill label="Orders" active={settings.enabled} activeText="Enabled" inactiveText="Disabled" />
                <ProviderStatusPill label="API" active={apiConnected} activeText="Connected" inactiveText="Missing" />
              </div>
              <Button className={`mt-4 w-full ${lightOutlineButtonClass}`} variant="outline" onClick={() => loadResellerInfo.mutate()} disabled={loadResellerInfo.isPending}>
                {loadResellerInfo.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeDollarSign className="mr-2 h-4 w-4" />}
                Refresh Provider Balance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="TV Channels" value={formatCount(availableChannels)} icon={Tv} />
        <StatCard title="Movies" value={formatCount(availableMovies)} icon={Film} />
        <StatCard title="Series" value={formatCount(availableSeries)} icon={Clapperboard} />
        <StatCard title="Bouquets" value={formatCount(availableBouquets)} icon={PackageOpen} />
      </div>
      {providerCatalog && (
        <p className="text-xs text-slate-300">
          {providerCatalog.label} catalog from {providerCatalog.source}
          {providerCatalog.updatedAt ? `, updated ${new Date(providerCatalog.updatedAt).toLocaleString()}` : ''}.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Active User" value={activeUsers} icon={Users} />
        <StatCard title="Available Credits" value={availableCredits || '0'} icon={Coins} />
        <StatCard title={`Available Balance ${selectedCurrency}`} value={`${selectedCurrency} ${calculatedAvailableBalance.toFixed(2)}`} icon={BadgeDollarSign} />
        <StatCard title="Total Profit USD" value={`$${totalProfitUsd.toFixed(2)}`} icon={BarChart3} />
      </div>

      <Card className={lightPanelClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </span>
            <span>{providerLabel} API Setting</span>
          </CardTitle>
          <CardDescription className="text-slate-500">Only settings for the selected provider are shown here. Save after changing credentials, credits, or trial availability.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className={`flex items-center justify-between p-4 ${lightInnerPanelClass}`}>
            <div>
              <Label className="text-slate-700">Enable IPTV</Label>
              <p className="text-xs text-slate-500">Allow users to order IPTV from this provider.</p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(enabled) => setSettings((current) => ({ ...current, enabled }))} />
          </div>
          <div className={`flex items-center justify-between p-4 ${lightInnerPanelClass}`}>
            <div>
              <Label className="text-slate-700">Enable Trial</Label>
              <p className="text-xs text-slate-500">Allow trial creation where this provider supports it.</p>
            </div>
            <Switch checked={settings.demoEnabled} onCheckedChange={(demoEnabled) => setSettings((current) => ({ ...current, demoEnabled }))} />
          </div>

          {settings.activeProvider === 'tvplus' ? (
            <>
              <div className="space-y-2">
                <Label className="text-slate-700">TVPLUS API Key</Label>
                <Input
                  className={lightInputClass}
                  value={settings.apiKey}
                  onChange={(event) => setSettings((current) => ({ ...current, apiKey: event.target.value }))}
                  placeholder={data?.settings.apiKeyConfigured ? `Saved: ${data.settings.apiKeyPreview}` : 'TVPLUS reseller API key'}
                  type="password"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">TVPLUS API Base URL</Label>
                <Input className={lightInputClass} value={settings.apiBaseUrl} onChange={(event) => setSettings((current) => ({ ...current, apiBaseUrl: event.target.value }))} />
              </div>
              <CreditCalculator
                providerLabel="TVPLUS"
                currency={settings.tvplusCurrency}
                paid={settings.tvplusCreditsPaidAmount}
                received={settings.tvplusCreditsReceived}
                unitCost={creditUnitCost}
                onCurrencyChange={(tvplusCurrency) => setSettings((current) => ({ ...current, tvplusCurrency }))}
                onPaidChange={(tvplusCreditsPaidAmount) => setSettings((current) => ({ ...current, tvplusCreditsPaidAmount }))}
                onReceivedChange={(tvplusCreditsReceived) => setSettings((current) => ({ ...current, tvplusCreditsReceived }))}
              />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-slate-700">IPTV Reseller Hub Provider API Token</Label>
                <Input
                  className={lightInputClass}
                  value={settings.iotvApiToken}
                  onChange={(event) => setSettings((current) => ({ ...current, iotvApiToken: event.target.value }))}
                  placeholder={data?.settings.iotvTokenConfigured ? `Saved: ${data.settings.iotvTokenPreview}` : 'Bearer API token'}
                  type="password"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">IPTV Reseller Hub Provider Portal API Base URL</Label>
                <Input className={lightInputClass} value={settings.iotvApiBaseUrl} onChange={(event) => setSettings((current) => ({ ...current, iotvApiBaseUrl: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">IPTV Reseller Hub Provider Reseller Username</Label>
                <Input
                  className={lightInputClass}
                  value={settings.iotvResellerUsername}
                  onChange={(event) => setSettings((current) => ({ ...current, iotvResellerUsername: event.target.value }))}
                  placeholder={data?.settings.iotvResellerUsernameConfigured ? `Saved: ${data.settings.iotvResellerUsernamePreview}` : 'Header username'}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">IPTV Reseller Hub Provider Reseller Password</Label>
                <Input
                  className={lightInputClass}
                  value={settings.iotvResellerPassword}
                  onChange={(event) => setSettings((current) => ({ ...current, iotvResellerPassword: event.target.value }))}
                  placeholder={data?.settings.iotvResellerPasswordConfigured ? `Saved: ${data.settings.iotvResellerPasswordPreview}` : 'Header password'}
                  type="password"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">IPTV Reseller Hub Provider Player Base URL</Label>
                <Input className={lightInputClass} value={settings.iotvPlayerBaseUrl} onChange={(event) => setSettings((current) => ({ ...current, iotvPlayerBaseUrl: event.target.value }))} />
              </div>
              <CreditCalculator
                providerLabel="IPTV Reseller Hub Provider"
                currency={settings.iotvCurrency}
                paid={settings.iotvCreditsPaidUsd}
                received={settings.iotvCreditsReceived}
                unitCost={creditUnitCost}
                onCurrencyChange={(iotvCurrency) => setSettings((current) => ({ ...current, iotvCurrency }))}
                onPaidChange={(iotvCreditsPaidUsd) => setSettings((current) => ({ ...current, iotvCreditsPaidUsd }))}
                onReceivedChange={(iotvCreditsReceived) => setSettings((current) => ({ ...current, iotvCreditsReceived }))}
              />
            </>
          )}

          <div className="flex items-end lg:col-span-2">
            <Button className={`min-w-44 ${primaryButtonClass}`} onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Provider
            </Button>
          </div>
        </CardContent>
      </Card>

      <CurrencyConversionRates />
    </div>
  );
}

function CreditCalculator({
  providerLabel,
  currency,
  paid,
  received,
  unitCost,
  onCurrencyChange,
  onPaidChange,
  onReceivedChange,
}: {
  providerLabel: string;
  currency: string;
  paid: string;
  received: string;
  unitCost: number;
  onCurrencyChange: (value: string) => void;
  onPaidChange: (value: string) => void;
  onReceivedChange: (value: string) => void;
}) {
  return (
    <div className={`grid gap-3 p-4 md:grid-cols-4 lg:col-span-2 ${lightInnerPanelClass}`}>
      <div className="md:col-span-4">
        <div className="text-sm font-semibold text-slate-950">{providerLabel} Credit Cost</div>
        <p className="text-xs text-slate-500">Use this to calculate real provider cost from paid amount and received credits.</p>
      </div>
      <div className="space-y-2">
        <Label className="text-slate-700">{providerLabel} Currency</Label>
        <Input className={lightInputClass} value={currency} maxLength={3} onChange={(event) => onCurrencyChange(event.target.value.toUpperCase())} placeholder="USD" />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-700">Total Paid in USD</Label>
        <Input className={lightInputClass} value={paid} onChange={(event) => onPaidChange(event.target.value)} placeholder="100" />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-700">Total Credits You Receive</Label>
        <Input className={lightInputClass} value={received} onChange={(event) => onReceivedChange(event.target.value)} placeholder="120" />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-700">Each Credit Cost USD</Label>
        <Input className={lightInputClass} readOnly value={unitCost ? unitCost.toFixed(9).replace(/0+$/, '').replace(/\.$/, '') : '0'} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: any }) {
  return (
    <Card className={lightPanelClass}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{title}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderStatusPill({
  label,
  active,
  activeText,
  inactiveText,
}: {
  label: string;
  active: boolean;
  activeText: string;
  inactiveText: string;
}) {
  return (
    <div className={`rounded-md border p-3 ${active ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 flex items-center gap-2 text-sm font-semibold ${active ? 'text-emerald-700' : 'text-rose-700'}`}>
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        {active ? activeText : inactiveText}
      </div>
    </div>
  );
}

function CurrencyConversionRates() {
  const { toast } = useToast();
  const [selectedCurrencyId, setSelectedCurrencyId] = useState('');
  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['/api/admin/iptv/dashboard'],
  });
  const { data: currencies = [], isLoading } = useQuery<CurrencyRate[]>({
    queryKey: ['/api/admin/currencies'],
  });

  useEffect(() => {
    if (selectedCurrencyId || currencies.length === 0) return;
    const savedCurrency = currencies.find((currency) => currency.code === dashboard?.settings?.conversionDisplayCurrency);
    const firstEditable = savedCurrency || currencies.find((currency) => currency.code !== 'USD') || currencies[0];
    setSelectedCurrencyId(firstEditable.id);
  }, [currencies, dashboard?.settings?.conversionDisplayCurrency, selectedCurrencyId]);

  const usdCurrency = currencies.find((currency) => currency.code === 'USD');
  const selectableCurrencies = currencies.filter((currency) => currency.code !== 'USD');
  const selectedCurrency = selectableCurrencies.find((currency) => currency.id === selectedCurrencyId) || selectableCurrencies[0] || currencies[0];
  const selectedRate = Number(selectedCurrency?.conversionRate || 1);
  const sampleUsd = 100;
  const sampleConverted = Number.isFinite(selectedRate) && selectedRate > 0 ? sampleUsd * selectedRate : 0;

  const syncRates = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/iptv/currency-rates/sync');
      return response.json();
    },
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/currencies'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] }),
      ]);
      const count = response?.data?.updated?.length || 0;
      toast({ title: 'Rates synced', description: `${count} currency conversion rate${count === 1 ? '' : 's'} updated automatically.` });
    },
    onError: (error: any) => {
      toast({ title: 'Auto sync failed', description: error.message || 'Could not fetch free currency conversion rates.', variant: 'destructive' });
    },
  });

  const updateCurrency = useMutation({
    mutationFn: async ({ id, conversionRate }: { id: string; conversionRate: string }) => {
      const response = await apiRequest('PUT', `/api/admin/currencies/${id}`, { conversionRate });
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/currencies'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] }),
      ]);
      toast({ title: 'Rate saved', description: 'Manual conversion rate was saved.' });
    },
    onError: (error: any) => {
      toast({ title: 'Save failed', description: error.message || 'Could not save manual conversion rate.', variant: 'destructive' });
    },
  });

  const saveSelectedCurrency = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', '/api/admin/iptv/settings', {
        conversion_display_currency: selectedCurrency?.code || 'EUR',
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      toast({ title: 'Currency saved', description: `${selectedCurrency?.code || 'Currency'} will be shown in the conversion section.` });
    },
    onError: (error: any) => {
      toast({ title: 'Save failed', description: error.message || 'Could not save selected currency.', variant: 'destructive' });
    },
  });

  return (
    <Card className={lightPanelClass}>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <BadgeDollarSign className="h-5 w-5 text-primary" />
              Currency Conversion Rates
            </CardTitle>
            <CardDescription className="text-slate-500">
              USD is the main base currency. Select one second currency to set how much 1 USD converts to, so provider cost and Total Profit can be calculated correctly.
            </CardDescription>
          </div>
          <Button className={primaryButtonClass} onClick={() => syncRates.mutate()} disabled={syncRates.isPending}>
            {syncRates.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Automatic Rates
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <div className="py-6 text-center text-sm text-slate-500">Loading currency conversion rates...</div>}
        {!isLoading && currencies.length === 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No currencies are configured yet.</div>
        )}
        {!isLoading && currencies.length > 0 && (
          <>
            <div className={`grid gap-3 p-3 md:grid-cols-[1fr_minmax(320px,1fr)] md:items-start ${lightInnerPanelClass}`}>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <div className="text-xs font-medium text-slate-500">Main Currency</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">USD</div>
                <div className="text-xs text-slate-500">Base rate: 1 USD = {usdCurrency?.conversionRate || '1'} USD</div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Convert USD To</Label>
                <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]">
                  <select
                    className={`h-10 w-full rounded-md border px-3 text-sm ${lightInputClass}`}
                    value={selectedCurrency?.id || ''}
                    onChange={(event) => setSelectedCurrencyId(event.target.value)}
                  >
                    {(selectableCurrencies.length > 0 ? selectableCurrencies : currencies).map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    className={`h-10 whitespace-nowrap ${lightOutlineButtonClass}`}
                    onClick={() => saveSelectedCurrency.mutate()}
                    disabled={saveSelectedCurrency.isPending || !selectedCurrency}
                  >
                    {saveSelectedCurrency.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Selected
                  </Button>
                </div>
                {selectedCurrency && selectedCurrency.code !== 'USD' && (
                  <p className="text-xs text-slate-500">
                    Example: {sampleUsd.toFixed(2)} USD = {sampleConverted.toFixed(2)} {selectedCurrency.code}
                  </p>
                )}
              </div>
            </div>
            {selectedCurrency && (
              <CurrencyRateRow
                key={selectedCurrency.id}
                currency={selectedCurrency}
                isSaving={updateCurrency.isPending}
                onSave={(conversionRate) => updateCurrency.mutate({ id: selectedCurrency.id, conversionRate })}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CurrencyRateRow({
  currency,
  isSaving,
  onSave,
}: {
  currency: CurrencyRate;
  isSaving: boolean;
  onSave: (conversionRate: string) => void;
}) {
  const [rate, setRate] = useState(String(currency.conversionRate || '1'));

  useEffect(() => {
    setRate(String(currency.conversionRate || '1'));
  }, [currency.conversionRate]);

  return (
    <div className={`grid gap-3 p-3 md:grid-cols-[minmax(180px,1fr)_minmax(220px,320px)_auto] md:items-end ${lightInnerPanelClass}`}>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl">{currency.symbol || currency.code}</span>
          <div>
            <div className="font-semibold text-slate-950">{currency.code}</div>
            <div className="text-xs text-slate-500">{currency.name}</div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-slate-700">Conversion Rate: 1 USD = {currency.code}</Label>
        <Input
          className={lightInputClass}
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          placeholder="1.000000"
          disabled={currency.code === 'USD'}
        />
        <p className="text-xs text-slate-500">
          Profit in USD is calculated as {currency.code} amount divided by this rate.
        </p>
      </div>
      <Button
        variant="outline"
        className={lightOutlineButtonClass}
        onClick={() => onSave(rate)}
        disabled={isSaving || currency.code === 'USD'}
      >
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save Manual
      </Button>
    </div>
  );
}

function ProviderStatusCard({
  title,
  description,
  active,
  icon: Icon,
}: {
  title: string;
  description: string;
  active: boolean;
  icon: any;
}) {
  const StatusIcon = active ? Icon : XCircle;

  return (
    <Card className={active ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-destructive/40 bg-destructive/10'}>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className={active ? 'text-sm font-semibold text-emerald-600' : 'text-sm font-semibold text-destructive'}>
            {title}
          </div>
          <div className="mt-1 text-2xl font-bold">{active ? 'Active' : 'Inactive'}</div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className={active ? 'rounded-full bg-emerald-500/15 p-3 text-emerald-600' : 'rounded-full bg-destructive/15 p-3 text-destructive'}>
          <StatusIcon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function SectionButton({ href, title, icon: Icon }: { href: string; title: string; icon: any }) {
  return (
    <Button variant="outline" className={`h-12 justify-between rounded-md px-4 ${sectionButtonClass}`} asChild>
      <Link href={href}>
        <span className="flex w-full items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[#58cbbb]" />
            <span className="font-medium text-white">{title}</span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate-300" />
        </span>
      </Link>
    </Button>
  );
}
