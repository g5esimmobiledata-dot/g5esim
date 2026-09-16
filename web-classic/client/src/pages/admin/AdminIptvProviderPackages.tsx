import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Ban, CheckCircle2, CircleDollarSign, Eye, Film, Info, Layers, Loader2, RefreshCw, Save, Search, Server, SlidersHorizontal, Tv } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type ProviderName = 'iotv' | 'tvplus';
type PageMode = 'bouquets' | 'cost-price';

type IptvPackage = {
  id: string;
  tvplusPackageId: string;
  name: string;
  description?: string | null;
  active: boolean;
  sortOrder: number;
  prices?: Record<string, any>;
  metadata?: {
    visibility?: Partial<IptvPackageVisibility>;
    [key: string]: any;
  };
};

type Dashboard = {
  settings: {
    activeProvider: ProviderName;
    defaultPackageId?: string;
    defaultPackageName?: string;
    tvplusCurrency?: string;
    iotvCurrency?: string;
    iotvConnectionPriceMultiplierEnabled?: boolean;
  };
  packages: IptvPackage[];
};

type BouquetCategory = {
  category: string;
  total: number;
  active: number;
  blocked: number;
};

type BouquetChannel = {
  id: string;
  name: string;
  category: string;
  countryCode: string;
  quality: string;
  active: boolean;
  metadata?: Record<string, any>;
};

type BouquetContentResponse = {
  provider: ProviderName;
  contentType: 'live' | 'vod' | 'series';
  selectedCategory: string;
  categories: BouquetCategory[];
  channels: BouquetChannel[];
  totals: { live: number; vod: number; series: number };
};

const PACKAGE_PRICE_TERMS = [
  { key: '1', label: '1 Month' },
  { key: '3', label: '3 Months' },
  { key: '6', label: '6 Months' },
  { key: '9', label: '9 Months' },
  { key: '12', label: '12 Months' },
] as const;

const PRICE_TERMS = [
  { key: 'trial', label: 'Trial' },
  ...PACKAGE_PRICE_TERMS,
] as const;

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
  { key: 'free_1h', label: 'Free 1 Hour' },
  { key: 'free_2h', label: 'Free 2 Hours' },
  { key: 'free_3h', label: 'Free 3 Hours' },
  { key: 'free_4h', label: 'Free 4 Hours' },
  { key: 'free_5h', label: 'Free 5 Hours' },
  { key: 'free_6h', label: 'Free 6 Hours' },
  { key: 'free_1d', label: 'Free 24 Hours' },
  { key: 'free_48h', label: 'Free 48 Hours' },
] as const;

const TVPLUS_TRIAL_TERMS = IPTV_TRIAL_TERMS.filter((term) => term.key !== 'free_48h');
const IOTV_TRIAL_TERMS = IPTV_TRIAL_TERMS.filter((term) => term.key === 'free_1d' || term.key === 'free_48h').map((term) => (
  term.key === 'free_1d' ? { ...term, label: 'Free 24 Hours' } : term
));

function defaultTrialTermVisibility() {
  return Object.fromEntries(
    IPTV_TRIAL_TERMS.map((term) => [
      term.key,
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

const PRICE_GROUPS = [
  { key: 'user', label: 'User Price' },
  { key: 'agent', label: 'Agent Price' },
  { key: 'reseller', label: 'Reseller Price' },
] as const;

const PACKAGE_PRICE_GROUPS = [
  { key: 'cost', label: 'Provider Cost' },
  ...PRICE_GROUPS,
] as const;

function normalizeIptvVisibility(input?: Partial<IptvPackageVisibility>): IptvPackageVisibility {
  const trialTerms = defaultTrialTermVisibility();
  const inputTrialTerms = input?.trialTerms || {};
  IPTV_TRIAL_TERMS.forEach((term) => {
    const termVisibility = inputTrialTerms[term.key] || {};
    trialTerms[term.key] = {
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

function initialProvider(): ProviderName {
  if (typeof window === 'undefined') return 'iotv';
  return new URLSearchParams(window.location.search).get('provider') === 'tvplus' ? 'tvplus' : 'iotv';
}

function packageProvider(pkg: IptvPackage): ProviderName {
  return pkg.tvplusPackageId.startsWith('iotv-') ? 'iotv' : 'tvplus';
}

function packageConnections(pkg: IptvPackage) {
  const metadataConnections = Number(pkg.metadata?.connections);
  if (Number.isFinite(metadataConnections) && metadataConnections > 0) return Math.round(metadataConnections);

  const match = String(pkg.tvplusPackageId || '').match(/iotv-connections-(\d+)/);
  return match ? Number(match[1]) : 1;
}

function isMainMonthlyPackage(pkg: IptvPackage, settings?: Dashboard['settings']) {
  const defaultPackageId = String(settings?.defaultPackageId || '').trim();
  const defaultPackageName = String(settings?.defaultPackageName || '').trim().toLowerCase();
  const packageKey = String(pkg.tvplusPackageId || '').trim();
  const packageName = String(pkg.name || '').trim().toLowerCase();

  return (
    (defaultPackageId && (pkg.id === defaultPackageId || packageKey === defaultPackageId)) ||
    (defaultPackageName && packageName === defaultPackageName) ||
    packageKey === 'all' ||
    packageName === 'all bouquets'
  );
}

function providerDisplayName(provider: ProviderName) {
  return provider === 'iotv' ? 'IPTV Reseller Hub Provider' : 'TVPLUS';
}

function providerTrialTerms(provider: ProviderName) {
  return provider === 'iotv' ? IOTV_TRIAL_TERMS : TVPLUS_TRIAL_TERMS;
}

const lightPanelClass = 'overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm';
const lightInputClass =
  'border-[#24445f] bg-[#071b35] text-white placeholder:text-slate-400 focus-visible:ring-teal-500';
const lightOutlineButtonClass =
  'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const primaryButtonClass = 'bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';

function readPrice(prices: Record<string, any> | undefined, group: 'cost' | 'user' | 'reseller' | 'agent', term: string) {
  if (group === 'user' && term === 'trial') return prices?.user?.trial ?? prices?.demo ?? '';
  if (group === 'user') return prices?.user?.[term] ?? prices?.[term] ?? '';
  if (group === 'cost' && term === 'trial') return prices?.cost?.trial ?? '0';
  return prices?.[group]?.[term] ?? '';
}

function readTrialPrice(prices: Record<string, any> | undefined, group: 'user' | 'reseller' | 'agent', term: string) {
  return prices?.trialTerms?.[group]?.[term] ?? prices?.[group]?.trial ?? (group === 'user' ? prices?.demo ?? '' : '');
}

function multipliedPrice(value: unknown, multiplier: number) {
  const numeric = Number(String(value ?? '').trim() || 0);
  if (!Number.isFinite(numeric) || numeric < 0) return '0.00';
  return (Math.round(numeric * multiplier * 100) / 100).toFixed(2);
}

function pricingFromBasePackage(basePackage: IptvPackage, multiplier: number) {
  return {
    cost: Object.fromEntries(
      PRICE_TERMS.map((term) => [term.key, multipliedPrice(readPrice(basePackage.prices, 'cost', term.key), multiplier)]),
    ) as Record<string, string>,
    user: Object.fromEntries(
      PRICE_TERMS.map((term) => [term.key, multipliedPrice(readPrice(basePackage.prices, 'user', term.key), multiplier)]),
    ) as Record<string, string>,
    reseller: Object.fromEntries(
      PRICE_TERMS.map((term) => [term.key, multipliedPrice(readPrice(basePackage.prices, 'reseller', term.key), multiplier)]),
    ) as Record<string, string>,
    agent: Object.fromEntries(
      PRICE_TERMS.map((term) => [term.key, multipliedPrice(readPrice(basePackage.prices, 'agent', term.key), multiplier)]),
    ) as Record<string, string>,
  };
}

function trialPricingFromBasePackage(basePackage: IptvPackage, multiplier: number) {
  return {
    user: Object.fromEntries(
      IPTV_TRIAL_TERMS.map((term) => [term.key, multipliedPrice(readTrialPrice(basePackage.prices, 'user', term.key), multiplier)]),
    ) as Record<string, string>,
    reseller: Object.fromEntries(
      IPTV_TRIAL_TERMS.map((term) => [term.key, multipliedPrice(readTrialPrice(basePackage.prices, 'reseller', term.key), multiplier)]),
    ) as Record<string, string>,
    agent: Object.fromEntries(
      IPTV_TRIAL_TERMS.map((term) => [term.key, multipliedPrice(readTrialPrice(basePackage.prices, 'agent', term.key), multiplier)]),
    ) as Record<string, string>,
  };
}

function iptvPricesPayload(
  pricing: Record<'cost' | 'user' | 'reseller' | 'agent', Record<string, string>>,
  trialPricing: Record<'user' | 'reseller' | 'agent', Record<string, string>>,
) {
  return {
    demo: pricing.user.trial,
    1: pricing.user['1'],
    3: pricing.user['3'],
    6: pricing.user['6'],
    9: pricing.user['9'],
    12: pricing.user['12'],
    cost: pricing.cost,
    user: pricing.user,
    reseller: pricing.reseller,
    agent: pricing.agent,
    trialTerms: trialPricing,
  };
}

export default function AdminIptvProviderPackages({ mode }: { mode: PageMode }) {
  const { toast } = useToast();
  const [provider, setProvider] = useState<ProviderName>(initialProvider);
  const [contentType, setContentType] = useState<'live' | 'vod' | 'series'>('live');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [focusedPackageId, setFocusedPackageId] = useState<string | null>(null);
  const [bulkPackagePriceForm, setBulkPackagePriceForm] = useState({
    term: 'monthly',
    cost: '',
    user: '',
    agent: '',
    reseller: '',
  });

  const { data, isLoading } = useQuery<Dashboard>({
    queryKey: ['/api/admin/iptv/dashboard'],
  });
  const bouquetQuery = useQuery<BouquetContentResponse>({
    queryKey: ['/api/admin/iptv/bouquets/content', { provider, contentType, category: selectedCategory, search }],
    enabled: mode === 'bouquets',
  });

  useEffect(() => {
    if (!data) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get('provider')) setProvider(mode === 'cost-price' ? 'iotv' : data.settings.activeProvider || 'iotv');
  }, [data, mode]);

  const visiblePackages = useMemo(
    () => (data?.packages || []).filter((pkg) => !pkg.metadata?.virtualTrial && packageProvider(pkg) === provider),
    [data?.packages, provider],
  );
  const baseConnectionPackage = useMemo(
    () => visiblePackages.find((pkg) => packageProvider(pkg) === 'iotv' && packageConnections(pkg) === 1) || null,
    [visiblePackages],
  );
  const bulkConnectionPackages = useMemo(
    () => visiblePackages.filter((pkg) => packageProvider(pkg) === 'iotv' && packageConnections(pkg) >= 2 && packageConnections(pkg) <= 5),
    [visiblePackages],
  );
  const mainMonthlyPackage = useMemo(
    () => visiblePackages.find((pkg) => provider !== 'iotv' && isMainMonthlyPackage(pkg, data?.settings)) || visiblePackages[0] || null,
    [data?.settings, provider, visiblePackages],
  );
  const addOnPackages = useMemo(
    () => provider === 'iotv'
      ? []
      : visiblePackages.filter((pkg) => !mainMonthlyPackage || pkg.id !== mainMonthlyPackage.id),
    [mainMonthlyPackage, provider, visiblePackages],
  );
  const editablePackages = visiblePackages;
  const displayedPackages = focusedPackageId ? editablePackages.filter((pkg) => pkg.id === focusedPackageId) : editablePackages;
  const providerCurrency = provider === 'tvplus' ? data?.settings.tvplusCurrency || 'USD' : data?.settings.iotvCurrency || 'USD';
  const providerLabel = providerDisplayName(provider);
  const providerInitial = provider === 'iotv' ? 'IRH' : 'TV+';
  const providerSubtitle = provider === 'iotv'
    ? 'Set IPTV Reseller Hub package cost, selling price, trial price, and visibility rules.'
    : 'Set TVPLUS package cost, selling price, trial price, and visibility rules.';
  const selectedProviderTone = provider === 'iotv'
    ? 'from-cyan-500/20 via-primary/10 to-blue-500/10'
    : 'from-amber-500/20 via-primary/10 to-emerald-500/10';

  const setProviderAndUrl = (next: ProviderName) => {
    setProvider(next);
    setFocusedPackageId(null);
    const url = `${window.location.pathname}?provider=${next}`;
    window.history.replaceState(null, '', url);
  };

  const syncPackages = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/iptv/sync-packages');
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      toast({ title: 'Bouquets synced', description: 'Provider packages were refreshed.' });
    },
    onError: (error: any) => {
      toast({ title: 'Sync failed', description: error.message || 'Could not sync provider bouquets.', variant: 'destructive' });
    },
  });

  const syncTvplusDinoBouquets = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/iptv/channels/sync', { provider: 'tvplus', source: 'dino' });
      return response.json();
    },
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/bouquets/content'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] }),
      ]);
      const data = response?.data || {};
      toast({ title: 'TVPLUS bouquets synced', description: `${data.totalCount || 0} channels were imported with bouquet category counts.` });
    },
    onError: (error: any) => {
      toast({ title: 'Sync failed', description: error.message || 'Could not sync TVPLUS bouquet categories.', variant: 'destructive' });
    },
  });

  const updatePackage = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const response = await apiRequest('PATCH', `/api/admin/iptv/packages/${id}`, patch);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      toast({ title: 'Package saved', description: 'The provider package was updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Save failed', description: error.message || 'Could not save the package.', variant: 'destructive' });
    },
  });

  const bulkUpdateConnections = useMutation({
    mutationFn: async ({ action, active }: { action: 'prices' | 'status'; active?: boolean }) => {
      if (provider !== 'iotv') return [];
      if (action === 'prices' && !baseConnectionPackage) throw new Error('1 Connection base package is not available');

      const requests = bulkConnectionPackages.map((pkg) => {
        const patch: Record<string, any> = {};
        if (action === 'status') {
          patch.active = Boolean(active);
        } else {
          const multiplier = packageConnections(pkg);
          patch.prices = iptvPricesPayload(
            pricingFromBasePackage(baseConnectionPackage as IptvPackage, multiplier),
            trialPricingFromBasePackage(baseConnectionPackage as IptvPackage, multiplier),
          );
        }
        return apiRequest('PATCH', `/api/admin/iptv/packages/${pkg.id}`, patch).then((response) => response.json());
      });

      return Promise.all(requests);
    },
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      if (variables.action === 'prices') {
        toast({ title: 'Connection prices updated', description: '2, 3, 4, and 5 Connection rates were set from the 1 Connection base.' });
      } else {
        toast({
          title: variables.active ? 'Connections enabled' : 'Connections disabled',
          description: variables.active ? '2, 3, 4, and 5 Connection packages are now enabled.' : '2, 3, 4, and 5 Connection packages are now disabled.',
        });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Bulk update failed', description: error.message || 'Could not update connection packages.', variant: 'destructive' });
    },
  });

  const bulkUpdatePackages = useMutation({
    mutationFn: async ({ action, active }: { action: 'base' | 'prices' | 'status'; active?: boolean }) => {
      if (provider === 'iotv') return [];
      if (addOnPackages.length === 0) return [];
      if (action === 'base' && !mainMonthlyPackage) {
        throw new Error('Main Monthly Package is not available');
      }

      const hasManualPrice = ['cost', 'user', 'agent', 'reseller'].some((key) =>
        String(bulkPackagePriceForm[key as keyof typeof bulkPackagePriceForm] || '').trim() !== '',
      );
      if (action === 'prices' && !hasManualPrice) {
        throw new Error('Enter at least one price to apply');
      }

      const selectedTerm = bulkPackagePriceForm.term;
      const termsToUpdate = selectedTerm === 'monthly'
        ? PACKAGE_PRICE_TERMS.map((term) => term.key)
        : selectedTerm === 'all'
        ? PRICE_TERMS.map((term) => term.key)
        : [selectedTerm];

      const requests = addOnPackages.map((pkg) => {
        const patch: Record<string, any> = {};
        if (action === 'status') {
          patch.active = Boolean(active);
        } else if (action === 'base') {
          const pricing = {
            cost: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'cost', term.key)])) as Record<string, string>,
            user: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'user', term.key)])) as Record<string, string>,
            reseller: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'reseller', term.key)])) as Record<string, string>,
            agent: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'agent', term.key)])) as Record<string, string>,
          };
          const trialPricing = {
            user: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term.key, readTrialPrice(pkg.prices, 'user', term.key)])) as Record<string, string>,
            reseller: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term.key, readTrialPrice(pkg.prices, 'reseller', term.key)])) as Record<string, string>,
            agent: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term.key, readTrialPrice(pkg.prices, 'agent', term.key)])) as Record<string, string>,
          };

          for (const term of PACKAGE_PRICE_TERMS) {
            pricing.cost[term.key] = readPrice((mainMonthlyPackage as IptvPackage).prices, 'cost', term.key);
            pricing.user[term.key] = readPrice((mainMonthlyPackage as IptvPackage).prices, 'user', term.key);
            pricing.agent[term.key] = readPrice((mainMonthlyPackage as IptvPackage).prices, 'agent', term.key);
            pricing.reseller[term.key] = readPrice((mainMonthlyPackage as IptvPackage).prices, 'reseller', term.key);
          }

          patch.prices = iptvPricesPayload(pricing, trialPricing);
        } else {
          const pricing = {
            cost: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'cost', term.key)])) as Record<string, string>,
            user: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'user', term.key)])) as Record<string, string>,
            reseller: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'reseller', term.key)])) as Record<string, string>,
            agent: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'agent', term.key)])) as Record<string, string>,
          };
          const trialPricing = {
            user: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term.key, readTrialPrice(pkg.prices, 'user', term.key)])) as Record<string, string>,
            reseller: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term.key, readTrialPrice(pkg.prices, 'reseller', term.key)])) as Record<string, string>,
            agent: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term.key, readTrialPrice(pkg.prices, 'agent', term.key)])) as Record<string, string>,
          };

          for (const term of termsToUpdate) {
            if (bulkPackagePriceForm.cost.trim()) pricing.cost[term] = bulkPackagePriceForm.cost.trim();
            if (bulkPackagePriceForm.user.trim()) pricing.user[term] = bulkPackagePriceForm.user.trim();
            if (bulkPackagePriceForm.agent.trim()) pricing.agent[term] = bulkPackagePriceForm.agent.trim();
            if (bulkPackagePriceForm.reseller.trim()) pricing.reseller[term] = bulkPackagePriceForm.reseller.trim();

            if (term === 'trial') {
              for (const trialTerm of providerTrialTerms(provider)) {
                if (bulkPackagePriceForm.user.trim()) trialPricing.user[trialTerm.key] = bulkPackagePriceForm.user.trim();
                if (bulkPackagePriceForm.agent.trim()) trialPricing.agent[trialTerm.key] = bulkPackagePriceForm.agent.trim();
                if (bulkPackagePriceForm.reseller.trim()) trialPricing.reseller[trialTerm.key] = bulkPackagePriceForm.reseller.trim();
              }
            }
          }

          patch.prices = iptvPricesPayload(pricing, trialPricing);
        }

        return apiRequest('PATCH', `/api/admin/iptv/packages/${pkg.id}`, patch).then((response) => response.json());
      });

      return Promise.all(requests);
    },
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/dashboard'] });
      if (variables.action === 'base') {
        toast({ title: 'Package prices updated', description: 'Other package options now use the Main Monthly Package monthly prices.' });
      } else if (variables.action === 'prices') {
        toast({ title: 'Package prices updated', description: 'The manual price set was applied to the other package options only.' });
      } else {
        toast({
          title: variables.active ? 'Package options enabled' : 'Package options disabled',
          description: variables.active
            ? 'Other package options are now enabled. Main Monthly Package was kept unchanged.'
            : 'Other package options are now disabled. Main Monthly Package was kept enabled.',
        });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Bulk update failed', description: error.message || 'Could not update provider packages.', variant: 'destructive' });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ category, active }: { category: string; active: boolean }) => {
      const response = await apiRequest('PATCH', '/api/admin/iptv/bouquets/category', { provider, contentType, category, active });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/bouquets/content'] });
      toast({ title: 'Category saved', description: 'The bouquet category visibility was updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Save failed', description: error.message || 'Could not update this category.', variant: 'destructive' });
    },
  });

  const updateChannel = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/iptv/channels/${id}`, { active });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/iptv/bouquets/content'] });
    },
    onError: (error: any) => {
      toast({ title: 'Save failed', description: error.message || 'Could not update this channel.', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[30rem] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCost = mode === 'cost-price';
  const bouquetData = bouquetQuery.data;
  const categories = bouquetData?.categories || [];
  const activeCategory = selectedCategory || bouquetData?.selectedCategory || categories[0]?.category || '';
  const categoryRow = categories.find((item) => item.category === activeCategory);

  if (!isCost) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Tv className="h-4 w-4" />
              IPTV Services
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">Bouquets</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Open provider categories, block full bouquets, or block individual channels inside each category.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className={`h-10 rounded-md border px-3 text-sm ${lightInputClass}`}
              value={provider}
              onChange={(event) => {
                setProviderAndUrl(event.target.value as ProviderName);
                setSelectedCategory('');
              }}
            >
              <option value="iotv">IPTV Reseller Hub Provider</option>
              <option value="tvplus">TVPLUS</option>
            </select>
            <Button className={primaryButtonClass} onClick={() => syncPackages.mutate()} disabled={syncPackages.isPending}>
              {syncPackages.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync Bouquets
            </Button>
            {provider === 'tvplus' && (
              <Button className={lightOutlineButtonClass} variant="outline" onClick={() => syncTvplusDinoBouquets.mutate()} disabled={syncTvplusDinoBouquets.isPending}>
                {syncTvplusDinoBouquets.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sync Category Channels
              </Button>
            )}
          </div>
        </div>

        <Card className={lightPanelClass}>
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button className={contentType === 'live' ? primaryButtonClass : lightOutlineButtonClass} variant={contentType === 'live' ? 'default' : 'outline'} onClick={() => { setContentType('live'); setSelectedCategory(''); }}>Live TV ({bouquetData?.totals.live || 0})</Button>
              <Button className={contentType === 'vod' ? primaryButtonClass : lightOutlineButtonClass} variant={contentType === 'vod' ? 'default' : 'outline'} onClick={() => { setContentType('vod'); setSelectedCategory(''); }}><Film className="mr-2 h-4 w-4" />Movies ({bouquetData?.totals.vod || 0})</Button>
              <Button className={contentType === 'series' ? primaryButtonClass : lightOutlineButtonClass} variant={contentType === 'series' ? 'default' : 'outline'} onClick={() => { setContentType('series'); setSelectedCategory(''); }}>Series ({bouquetData?.totals.series || 0})</Button>
            </div>
            <div className="relative min-w-[260px] xl:w-[520px]">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className={`pl-9 ${lightInputClass}`} placeholder="Search e.g. USA, HBO, Sports, Formula..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </div>

          <div className="grid min-h-[34rem] lg:grid-cols-[320px_1fr]">
            <aside className="border-r border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</div>
              <div className="max-h-[42rem] space-y-2 overflow-y-auto pr-1">
                {categories.map((category) => {
                  const active = category.category === activeCategory;
                  const blocked = category.active === 0;
                  return (
                    <button
                      key={category.category}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left text-sm text-slate-800 transition ${active ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-100'} ${blocked ? 'opacity-60' : ''}`}
                      onClick={() => setSelectedCategory(category.category)}
                    >
                      <span className="font-medium">{category.category || 'Uncategorized'}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{category.total}</span>
                    </button>
                  );
                })}
                {categories.length === 0 && <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">No bouquet categories found. Sync channels first.</div>}
              </div>
            </aside>

            <section className="p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">{contentType === 'live' ? 'Live TV' : contentType === 'vod' ? 'Movies' : 'Series'} - {activeCategory || 'No Category'}</h2>
                  <p className="text-sm text-slate-500">{categoryRow?.total || 0} item(s), {categoryRow?.blocked || 0} blocked</p>
                </div>
                {activeCategory && (
                  <Button
                    className={categoryRow?.active === 0 ? primaryButtonClass : ''}
                    variant={categoryRow?.active === 0 ? 'default' : 'destructive'}
                    onClick={() => updateCategory.mutate({ category: activeCategory, active: categoryRow?.active === 0 })}
                    disabled={updateCategory.isPending}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    {categoryRow?.active === 0 ? 'Unblock Category' : 'Block Category'}
                  </Button>
                )}
              </div>

              {bouquetQuery.isLoading ? (
                <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
              ) : (
                <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                  {(bouquetData?.channels || []).map((channel) => (
                    <div key={channel.id} className={`flex items-center gap-3 rounded-md border p-3 text-slate-900 ${channel.active ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-rose-200 bg-rose-50 opacity-75'}`}>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">{channel.quality || 'TV'}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-950">{channel.name}</div>
                        <div className="truncate text-xs text-slate-500">{channel.category}</div>
                      </div>
                      <Switch checked={channel.active} onCheckedChange={(active) => updateChannel.mutate({ id: channel.id, active })} />
                    </div>
                  ))}
                  {(bouquetData?.channels || []).length === 0 && <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 xl:col-span-2 2xl:col-span-3">No channels found in this category.</div>}
                </div>
              )}
            </section>
          </div>
        </Card>
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
                  {isCost ? <CircleDollarSign className="h-3.5 w-3.5" /> : <Server className="h-3.5 w-3.5" />}
                  IPTV Services
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                  Active provider pricing center
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{isCost ? 'Cost & Price' : 'Bouquets'}</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-500">
                  {isCost
                    ? 'Open one package at a time, then set trial prices, monthly prices, provider cost, and account role visibility.'
                    : 'Fetch and manage available IPTV provider packages with focused package controls.'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniStat title="Packages" value={visiblePackages.length} icon={Layers} />
                <MiniStat title="Visible Now" value={displayedPackages.length} icon={Eye} />
                <MiniStat title="Currency" value={providerCurrency} icon={CircleDollarSign} />
                <MiniStat title="Mode" value={focusedPackageId ? 'Edit' : 'List'} icon={SlidersHorizontal} />
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
                  value={provider}
                  onChange={(event) => setProviderAndUrl(event.target.value as ProviderName)}
                >
                  <option value="iotv">IPTV Reseller Hub Provider</option>
                  <option value="tvplus">TVPLUS</option>
                </select>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <CostModePill label="View" active={Boolean(focusedPackageId)} activeText="Focused" inactiveText="Package List" />
                <CostModePill label="Editor" active={isCost} activeText="Pricing" inactiveText="Bouquets" />
              </div>
              {!isCost && (
                <Button className={`mt-4 w-full ${primaryButtonClass}`} onClick={() => syncPackages.mutate()} disabled={syncPackages.isPending}>
                  {syncPackages.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Sync Bouquets
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {provider === 'iotv' && (
        <Card className={lightPanelClass}>
          <CardContent className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-primary">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-slate-950">Bulk Connection Actions</div>
                <p className="mt-1 max-w-3xl text-sm text-slate-500">
                  Apply 1 Connection pricing to 2, 3, 4, and 5 Connections in one click, or enable/disable those connection packages together.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className={`gap-2 ${primaryButtonClass}`}
                disabled={bulkUpdateConnections.isPending || !baseConnectionPackage || bulkConnectionPackages.length === 0}
                onClick={() => bulkUpdateConnections.mutate({ action: 'prices' })}
              >
                {bulkUpdateConnections.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleDollarSign className="h-4 w-4" />}
                Set 2-5 Prices
              </Button>
              <Button
                variant="outline"
                className={`gap-2 ${lightOutlineButtonClass}`}
                disabled={bulkUpdateConnections.isPending || bulkConnectionPackages.length === 0}
                onClick={() => bulkUpdateConnections.mutate({ action: 'status', active: true })}
              >
                <CheckCircle2 className="h-4 w-4" />
                Enable 2-5
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={bulkUpdateConnections.isPending || bulkConnectionPackages.length === 0}
                onClick={() => bulkUpdateConnections.mutate({ action: 'status', active: false })}
              >
                <Ban className="h-4 w-4" />
                Disable 2-5
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {provider !== 'iotv' && (
        <Card className={lightPanelClass}>
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-primary">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-slate-950">Bulk Package Actions</div>
                  <p className="mt-1 max-w-3xl text-sm text-slate-500">
                    Keep <span className="font-semibold text-slate-950">Main Monthly Package</span> as the base setting. The actions below update only the other package options.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className={`gap-2 ${primaryButtonClass}`}
                  disabled={bulkUpdatePackages.isPending || !mainMonthlyPackage || addOnPackages.length === 0}
                  onClick={() => bulkUpdatePackages.mutate({ action: 'base' })}
                >
                  {bulkUpdatePackages.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleDollarSign className="h-4 w-4" />}
                  Use Main Monthly Prices
                </Button>
                <Button
                  variant="outline"
                  className={`gap-2 ${lightOutlineButtonClass}`}
                  disabled={bulkUpdatePackages.isPending || addOnPackages.length === 0}
                  onClick={() => bulkUpdatePackages.mutate({ action: 'status', active: true })}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Enable Other Options
                </Button>
                <Button
                  variant="destructive"
                  className="gap-2"
                  disabled={bulkUpdatePackages.isPending || addOnPackages.length === 0}
                  onClick={() => bulkUpdatePackages.mutate({ action: 'status', active: false })}
                >
                  <Ban className="h-4 w-4" />
                  Disable Other Options
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Main Monthly Package</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{mainMonthlyPackage?.name || 'Not selected'}</div>
                <p className="mt-1 text-xs text-slate-500">
                  This package stays as the main pricing source and is not changed by enable/disable actions.
                </p>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Other Package Options</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{addOnPackages.length} option{addOnPackages.length === 1 ? '' : 's'} targeted</div>
                <p className="mt-1 text-xs text-slate-500">
                  Use the main monthly prices for these options, or apply a manual price only to the selected duration.
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-amber-400/20 bg-background/70 p-4">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-semibold">Manual Price Set For Other Package Options</div>
                <p className="text-xs text-muted-foreground">
                  Choose the duration, enter only the prices you want to change, then apply them to the other package options. Empty fields keep their current price.
                </p>
              </div>
              <div className="grid gap-3 xl:grid-cols-[220px_repeat(4,1fr)]">
                <div className="space-y-2">
                  <Label>Duration To Update</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input px-3 text-sm"
                    value={bulkPackagePriceForm.term}
                    onChange={(event) => setBulkPackagePriceForm((current) => ({ ...current, term: event.target.value }))}
                  >
                    <option value="monthly">All Monthly Durations</option>
                    <option value="trial">Trial</option>
                    {PACKAGE_PRICE_TERMS.map((term) => (
                      <option key={term.key} value={term.key}>{term.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Provider Cost ({providerCurrency})</Label>
                  <Input
                    value={bulkPackagePriceForm.cost}
                    onChange={(event) => setBulkPackagePriceForm((current) => ({ ...current, cost: event.target.value }))}
                    placeholder="Keep current"
                  />
                </div>
                <div className="space-y-2">
                  <Label>User Price ({providerCurrency})</Label>
                  <Input
                    value={bulkPackagePriceForm.user}
                    onChange={(event) => setBulkPackagePriceForm((current) => ({ ...current, user: event.target.value }))}
                    placeholder="Keep current"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Agent Price ({providerCurrency})</Label>
                  <Input
                    value={bulkPackagePriceForm.agent}
                    onChange={(event) => setBulkPackagePriceForm((current) => ({ ...current, agent: event.target.value }))}
                    placeholder="Keep current"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reseller Price ({providerCurrency})</Label>
                  <Input
                    value={bulkPackagePriceForm.reseller}
                    onChange={(event) => setBulkPackagePriceForm((current) => ({ ...current, reseller: event.target.value }))}
                    placeholder="Keep current"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Example: enter only User Price to update customer prices for the other package options while keeping provider, agent, and reseller prices unchanged.
                </p>
                <Button
                  className="gap-2"
                  disabled={bulkUpdatePackages.isPending || addOnPackages.length === 0}
                  onClick={() => bulkUpdatePackages.mutate({ action: 'prices' })}
                >
                  {bulkUpdatePackages.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleDollarSign className="h-4 w-4" />}
                  Apply Manual Prices
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {displayedPackages.map((pkg) => (
          <PackageEditor
            key={pkg.id}
            pkg={pkg}
            mode={mode}
            providerCurrency={providerCurrency}
            baseConnectionPackage={provider === 'iotv' ? baseConnectionPackage : null}
            isSaving={updatePackage.isPending}
            isFocused={focusedPackageId === pkg.id}
            onFocus={() => setFocusedPackageId(pkg.id)}
            onBack={() => setFocusedPackageId(null)}
            onSave={(patch) => updatePackage.mutate({ id: pkg.id, patch })}
          />
        ))}
        {editablePackages.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {mode === 'cost-price'
                ? 'No pricing tables are available for this provider yet.'
                : 'No packages are available for this provider yet.'}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PackageEditor({
  pkg,
  mode,
  providerCurrency,
  baseConnectionPackage,
  isSaving,
  isFocused,
  onFocus,
  onBack,
  onSave,
}: {
  pkg: IptvPackage;
  mode: PageMode;
  providerCurrency: string;
  baseConnectionPackage?: IptvPackage | null;
  isSaving: boolean;
  isFocused: boolean;
  onFocus: () => void;
  onBack: () => void;
  onSave: (patch: Record<string, any>) => void;
}) {
  const buildPricing = () => ({
    cost: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'cost', term.key)])) as Record<string, string>,
    user: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'user', term.key)])) as Record<string, string>,
    reseller: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'reseller', term.key)])) as Record<string, string>,
    agent: Object.fromEntries(PRICE_TERMS.map((term) => [term.key, readPrice(pkg.prices, 'agent', term.key)])) as Record<string, string>,
  });
  const buildTrialPricing = () => ({
    user: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term.key, readTrialPrice(pkg.prices, 'user', term.key)])) as Record<string, string>,
    reseller: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term.key, readTrialPrice(pkg.prices, 'reseller', term.key)])) as Record<string, string>,
    agent: Object.fromEntries(IPTV_TRIAL_TERMS.map((term) => [term.key, readTrialPrice(pkg.prices, 'agent', term.key)])) as Record<string, string>,
  });
  const [draft, setDraft] = useState({
    name: pkg.name,
    description: pkg.description || '',
    active: pkg.active,
    sortOrder: String(pkg.sortOrder || 0),
    pricing: buildPricing(),
    trialPricing: buildTrialPricing(),
    visibility: normalizeIptvVisibility(pkg.metadata?.visibility),
  });

  useEffect(() => {
    setDraft({
      name: pkg.name,
      description: pkg.description || '',
      active: pkg.active,
      sortOrder: String(pkg.sortOrder || 0),
      pricing: buildPricing(),
      trialPricing: buildTrialPricing(),
      visibility: normalizeIptvVisibility(pkg.metadata?.visibility),
    });
  }, [pkg]);

  const setPricing = (group: 'cost' | 'user' | 'reseller' | 'agent', term: string, value: string) => {
    setDraft((current) => ({
      ...current,
      pricing: { ...current.pricing, [group]: { ...current.pricing[group], [term]: value } },
    }));
  };

  const setTrialPricing = (group: 'user' | 'reseller' | 'agent', term: string, value: string) => {
    setDraft((current) => ({
      ...current,
      trialPricing: { ...current.trialPricing, [group]: { ...current.trialPricing[group], [term]: value } },
    }));
  };

  const savePayload = () => ({
    name: draft.name,
    description: draft.description,
    active: draft.active,
    sortOrder: Number(draft.sortOrder) || 0,
    visibility: draft.visibility,
    prices: iptvPricesPayload(draft.pricing, draft.trialPricing),
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

  const setTrialTermVisibility = (termKey: string, roleKey: 'user' | 'reseller' | 'agent', value: boolean) => {
    setDraft((current) => ({
      ...current,
      visibility: {
        ...current.visibility,
        trialTerms: {
          ...current.visibility.trialTerms,
          [termKey]: {
            ...current.visibility.trialTerms[termKey],
            [roleKey]: value,
          },
        },
      },
    }));
  };

  const currentProvider = packageProvider(pkg);
  const packageProviderName = providerDisplayName(currentProvider);
  const visibleTrialTerms = providerTrialTerms(currentProvider);
  const connectionCount = packageConnections(pkg);
  const canSetFromBaseConnection =
    mode === 'cost-price' &&
    currentProvider === 'iotv' &&
    connectionCount > 1 &&
    Boolean(baseConnectionPackage);
  const [openPanel, setOpenPanel] = useState<null | 'details' | 'price'>(mode === 'cost-price' ? 'price' : null);
  const closeFocusedView = () => {
    setOpenPanel(null);
    onBack();
  };
  const togglePanel = (panel: 'details' | 'price') => {
    setOpenPanel((current) => {
      if (current === panel) {
        onBack();
        return null;
      }
      onFocus();
      return panel;
    });
  };
  const applyBaseConnectionPricing = () => {
    if (!baseConnectionPackage) return;
    setDraft((current) => ({
      ...current,
      pricing: pricingFromBasePackage(baseConnectionPackage, connectionCount),
      trialPricing: trialPricingFromBasePackage(baseConnectionPackage, connectionCount),
    }));
  };

  return (
    <Card className={`${lightPanelClass} ${isFocused ? 'ring-1 ring-primary/30' : ''}`}>
      <CardContent className="space-y-4 p-0">
        <div className={`flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between ${isFocused ? 'bg-teal-50' : 'bg-white'}`}>
          <div className="min-w-0 flex flex-1 gap-4 p-4">
            <div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${draft.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              <Tv className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-teal-200 bg-teal-50 text-primary">{packageProviderName}</Badge>
                <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-700">#{pkg.tvplusPackageId}</Badge>
                <Badge className={draft.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-100'}>
                  {draft.active ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="truncate text-lg font-semibold tracking-tight text-slate-950">{draft.name}</div>
              <div className="mt-1 line-clamp-1 max-w-4xl text-sm text-slate-500">
                {draft.description || 'No description'}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-4 xl:pb-0 xl:pr-5">
            {isFocused && (
              <Button variant="outline" className={`gap-2 ${lightOutlineButtonClass}`} onClick={closeFocusedView}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div className="mr-1 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-500">Status</span>
              <Switch checked={draft.active} onCheckedChange={(active) => setDraft((current) => ({ ...current, active }))} />
            </div>
            <Button
              variant={openPanel === 'details' ? 'default' : 'outline'}
              className={`gap-2 ${openPanel === 'details' ? primaryButtonClass : lightOutlineButtonClass}`}
              onClick={() => togglePanel('details')}
            >
              <Info className="h-4 w-4" />
              Details
            </Button>
            {mode === 'cost-price' && (
              <Button
                variant={openPanel === 'price' ? 'default' : 'outline'}
                className={`gap-2 ${openPanel === 'price' ? primaryButtonClass : lightOutlineButtonClass}`}
                onClick={() => togglePanel('price')}
              >
                <CircleDollarSign className="h-4 w-4" />
                Set Price
              </Button>
            )}
            {!(mode === 'cost-price' && openPanel === 'price') && (
              <Button disabled={isSaving} className={`gap-2 ${primaryButtonClass}`} onClick={() => onSave(savePayload())}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            )}
          </div>
        </div>

        {openPanel === 'details' && (
          <div className="mx-4 mb-4 space-y-5 rounded-md border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Info className="h-5 w-5 text-primary" />
                  <span className="text-slate-950">Package Details</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Edit the package information and choose which account types can see it.</p>
              </div>
              <Badge variant="outline" className="w-fit border-slate-200 bg-white text-slate-700">{packageProviderName}</Badge>
            </div>
            <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-700">Name</Label>
                <Input className={lightInputClass} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Sort Order</Label>
                <Input className={lightInputClass} value={draft.sortOrder} onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Description</Label>
              <Textarea className={lightInputClass} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            </div>

            <div className="grid gap-4 rounded-xl border bg-card/60 p-4 lg:grid-cols-2">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <Eye className="h-5 w-5" />
                </span>
                <div>
                <div className="text-sm font-semibold">Package Visibility - {packageProviderName}</div>
                <p className="text-xs text-muted-foreground">{pkg.name} #{pkg.tvplusPackageId}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {IPTV_VISIBILITY_ROLES.map((role) => (
                  <div key={role.key} className="flex items-center justify-between rounded-xl border bg-background/60 p-3">
                    <Label>{role.label}</Label>
                    <Switch checked={draft.visibility[role.key]} onCheckedChange={(checked) => setVisibility(role.key, checked)} />
                  </div>
                ))}
              </div>
              <div className="lg:col-span-2">
                <div className="text-sm font-semibold">Free Trial Visibility - {packageProviderName}</div>
                <p className="text-xs text-muted-foreground">Hide one trial duration while keeping other trial durations available.</p>
              </div>
              <div className="grid gap-3 lg:col-span-2">
                <div className="grid gap-3 sm:grid-cols-3">
                  {IPTV_VISIBILITY_ROLES.map((role) => (
                    <div key={role.trialKey} className="flex items-center justify-between rounded-xl border bg-background/60 p-3">
                      <div>
                        <Label>{role.label}</Label>
                        <div className="text-[11px] text-muted-foreground">All trials</div>
                      </div>
                      <Switch checked={draft.visibility[role.trialKey]} onCheckedChange={(checked) => setVisibility(role.trialKey, checked)} />
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="p-2">Trial Available</th>
                        {IPTV_VISIBILITY_ROLES.map((role) => (
                          <th key={role.key} className="p-2">{role.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTrialTerms.map((term) => (
                        <tr key={term.key} className="border-b last:border-b-0">
                          <td className="p-2 font-medium">{term.label}</td>
                          {IPTV_VISIBILITY_ROLES.map((role) => (
                            <td key={role.key} className="p-2">
                              <Switch
                                checked={draft.visibility.trialTerms[term.key]?.[role.key] !== false}
                                onCheckedChange={(checked) => setTrialTermVisibility(term.key, role.key, checked)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'cost-price' && openPanel === 'price' && (
          <div className="mx-4 mb-4 space-y-6 rounded-md border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <CircleDollarSign className="h-5 w-5 text-primary" />
                  <span className="text-slate-950">Set Package Rates</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Manage trial and monthly rates in the spreadsheet style.</p>
              </div>
              <Badge variant="outline" className="w-fit border-slate-200 bg-white text-slate-700">{providerCurrency}</Badge>
            </div>
            {draft.active && canSetFromBaseConnection && (
              <div className="flex flex-col gap-3 rounded-md border border-cyan-200 bg-cyan-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-cyan-700">
                    Set Price Connections = Base price x {connectionCount}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Fill this {connectionCount} Connections package with all 1 Connection cost, user, agent, reseller, and trial rates multiplied by {connectionCount}. Review the values, then click Save.
                  </p>
                </div>
                <Button type="button" className={`shrink-0 gap-2 ${primaryButtonClass}`} onClick={applyBaseConnectionPricing}>
                  <CircleDollarSign className="h-4 w-4" />
                  Set Price x {connectionCount}
                </Button>
              </div>
            )}
            {!draft.active ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
                This package is disabled, so its price tables are hidden. Enable the package Status above and save to show these tables again.
              </div>
            ) : (
              <>
                <ProviderTrialRateSheet
                  title={currentProvider === 'iotv' ? 'IPTV Reseller Hub' : 'TRIAL TvPLUS'}
                  terms={visibleTrialTerms}
                  draft={draft}
                  onChange={setTrialPricing}
                  accent={currentProvider === 'iotv' ? 'emerald' : 'primary'}
                />
                <ProviderMonthlyRateSheet
                  providerCurrency={providerCurrency}
                  draft={draft}
                  onChange={setPricing}
                />
              </>
            )}
            <div className="flex justify-end border-t border-slate-200 pt-4">
              <Button disabled={isSaving} className={`min-w-32 gap-2 ${primaryButtonClass}`} onClick={() => onSave(savePayload())}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Rates
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function compactTrialLabel(label: string) {
  const compact = label.replace(/^Free\s+/, '');
  return compact.replace(/^1 Hours$/, '1 Hour');
}

function SheetInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Input
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder="0.00"
      className={lightInputClass}
    />
  );
}

function ProviderTrialRateSheet({
  title,
  terms,
  draft,
  onChange,
  accent = 'primary',
}: {
  title: string;
  terms: ReadonlyArray<{ key: string; label: string }>;
  draft: {
    trialPricing: Record<'user' | 'agent' | 'reseller', Record<string, string>>;
  };
  onChange: (group: 'user' | 'agent' | 'reseller', term: string, value: string) => void;
  accent?: 'primary' | 'emerald';
}) {
  const accentClasses = accent === 'emerald'
    ? {
      wrapper: 'border-emerald-400/20',
      header: 'border-emerald-400/20 bg-emerald-500/10',
      hover: 'hover:bg-emerald-500/5',
    }
    : {
      wrapper: 'border-primary/20',
      header: 'border-primary/20 bg-primary/10',
      hover: 'hover:bg-primary/5',
    };

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-teal-50 px-4 py-3">
        <div>
          <div className="text-lg font-semibold text-slate-950">{title}</div>
          <div className="text-xs text-slate-500">Trial selling prices by account type</div>
        </div>
        <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">Trial</Badge>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-[180px] border-b border-r border-slate-200 bg-slate-50 p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Price Type</th>
            {terms.map((term) => (
              <th key={term.key} className="border-b border-r border-slate-200 bg-slate-50 p-3 text-left text-sm font-semibold text-slate-700 last:border-r-0">
                {compactTrialLabel(term.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PRICE_GROUPS.map((group) => (
            <tr key={group.key} className="transition hover:bg-slate-50">
              <td className="border-r border-t border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800">{group.label}</td>
              {terms.map((term) => (
                <td key={term.key} className="border-r border-t border-slate-200 p-2 last:border-r-0">
                  <SheetInput
                    value={draft.trialPricing[group.key][term.key] || ''}
                    onChange={(value) => onChange(group.key, term.key, value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function ProviderMonthlyRateSheet({
  providerCurrency,
  draft,
  onChange,
}: {
  providerCurrency: string;
  draft: {
    pricing: Record<'cost' | 'user' | 'agent' | 'reseller', Record<string, string>>;
  };
  onChange: (group: 'cost' | 'user' | 'agent' | 'reseller', term: string, value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-emerald-50 px-4 py-3">
        <div>
          <div className="text-lg font-semibold text-slate-950">Package Price</div>
          <div className="text-xs text-slate-500">Provider cost and retail prices by duration</div>
        </div>
        <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">{providerCurrency}</Badge>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-[200px] border-b border-r border-slate-200 bg-slate-50 p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Price Type</th>
            {PACKAGE_PRICE_TERMS.map((term) => (
              <th key={term.key} className="border-b border-r border-slate-200 bg-slate-50 p-3 text-left text-sm font-semibold text-slate-700 last:border-r-0">
                {term.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PACKAGE_PRICE_GROUPS.map((group) => (
            <tr key={group.key} className="transition hover:bg-slate-50">
              <td className="border-r border-t border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800">
                {group.key === 'cost' ? `${group.label} (${providerCurrency})` : group.label}
              </td>
              {PACKAGE_PRICE_TERMS.map((term) => (
                <td key={term.key} className="border-r border-t border-slate-200 p-2 last:border-r-0">
                  <SheetInput
                    value={draft.pricing[group.key][term.key] || ''}
                    onChange={(value) => onChange(group.key, term.key, value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function MiniStat({ title, value, icon: Icon }: { title: string; value: string | number; icon: any }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</div>
        <div className="truncate text-lg font-semibold text-slate-950">{value}</div>
      </div>
    </div>
  );
}

function CostModePill({
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
    <div className={`rounded-md border p-3 ${active ? 'border-emerald-200 bg-emerald-50' : 'border-teal-200 bg-teal-50'}`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 flex items-center gap-2 text-sm font-semibold ${active ? 'text-emerald-700' : 'text-primary'}`}>
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-primary'}`} />
        {active ? activeText : inactiveText}
      </div>
    </div>
  );
}
