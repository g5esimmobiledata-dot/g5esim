import { useState, useEffect, useMemo, useRef } from 'react';
import type { ChangeEvent, SVGProps } from 'react';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import {
  Package as PackageIcon,
  Search,
  Filter,
  Star,
  DollarSign,
  Globe2,
  MapPin,
  Clock,
  Database,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Server,
  Smartphone,
  MessageSquare,
  Phone,
  Pencil,
  Percent,
  Upload,
  Power,
  PowerOff,
  Wifi,
  Info,
  Radio,
  QrCode,
  Settings,
  Router,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTranslation } from '@/contexts/TranslationContext';

interface UnifiedPackage {
  id: string;
  providerId: string;
  providerSlug: string;
  providerName: string;
  providerPackageId: string;
  providerPackageTable?: string;
  externalProviderPackageId?: string;
  countryCode: string | null;
  countryName: string | null;
  destinationId: string | null;
  destinationName: string | null;
  destinationFlag: string | null;
  destinationCountryCode: string | null;
  regionId: string | null;
  regionName: string | null;
  slug: string;
  title: string;
  dataAmount: string;
  validity: number;
  providerCost?: string;
  providerPrice: string;
  retailPrice?: string;
  price: string;
  resellerPrice?: string | null;
  resellerSellingCount?: number;
  resellerSellingMin?: string | null;
  resellerSellingMax?: string | null;
  currency: string;
  type: string;
  operator: string | null;
  operatorImage: string | null;
  coverage: string[];
  voiceCredits: number | null;
  smsCredits: number | null;
  activationMethod?: string | null;
  apnType?: string | null;
  apnValue?: string | null;
  networkType?: string | null;
  policyName?: string | null;
  additionalInfo?: string | null;
  travelDateRequired?: boolean;
  hotspotSupported?: boolean;
  topupAvailable?: boolean;
  validityType?: string | null;
  airhubPlanFamily?: string | null;
  airhubPlanFamilyLabel?: string | null;
  airhubPlanFamilyDescription?: string | null;
  isBestPrice: boolean;
  isPopular: boolean;
  isTrending: boolean;
  isRecommended: boolean;
  isBestValue: boolean;
  isUnlimited: boolean;
  isEnabled: boolean;
  manualOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Provider {
  id: string;
  name: string;
  slug: string;
}

interface PaginatedResponse {
  data: UnifiedPackage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    enabled: number;
    global: number;
    bestPrice: number;
    manualOverride: number;
  };
}

function GlobalMapBadge({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Global coverage map"
      className={className}
      {...props}
    >
      <circle cx="50" cy="50" r="47" fill="#dbeafe" />
      <circle cx="50" cy="50" r="44" fill="#60a5fa" />
      <path
        d="M17 38c4-10 14-18 26-21 4 2 6 5 5 9-4 1-8 1-11 4-3 3-2 7-5 9-4 3-9 0-15-1Z"
        fill="#ecfeff"
      />
      <path
        d="M36 49c6 0 11 4 12 10 1 6-4 9-7 14-2 4-1 9-5 11-7-7-12-16-13-27 3-5 7-8 13-8Z"
        fill="#ecfeff"
      />
      <path
        d="M51 24c9-6 24-3 33 7 6 7 8 16 7 25-5-1-9-4-11-8-2-5-6-6-11-5-6 2-10-2-11-8-1-5-5-6-7-11Z"
        fill="#ecfeff"
      />
      <path
        d="M57 47c4-2 9-2 13 1 4 2 7 6 11 7 3 2 7 2 9 5-3 10-11 18-21 22 0-6-2-10-7-14-5-5-9-11-5-21Z"
        fill="#ecfeff"
      />
      <path
        d="M72 76c6 0 10 2 13 6-5 4-10 7-17 9-2-5-1-10 4-15Z"
        fill="#ecfeff"
      />
      <path
        d="M10 50h80M50 6c-14 15-14 73 0 88M50 6c14 15 14 73 0 88"
        fill="none"
        stroke="#2563eb"
        strokeOpacity=".35"
        strokeWidth="2"
      />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#1d4ed8" strokeWidth="4" />
    </svg>
  );
}

export default function Packages() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [bestPriceFilter, setBestPriceFilter] = useState<boolean | null>(null);
  const [sortFilter, setSortFilter] = useState<string>('default');

  // New filters from public API
  const [filterUnlimited, setFilterUnlimited] = useState(false);
  const [filterPopular, setFilterPopular] = useState(false);
  const [filterDataPack, setFilterDataPack] = useState(false);
  const [filterVoicePack, setFilterVoicePack] = useState(false);
  const [filterSmsPack, setFilterSmsPack] = useState(false);
  const [filterVoiceAndDataPack, setFilterVoiceAndDataPack] = useState(false);
  const [filterVoiceAndSmsPack, setFilterVoiceAndSmsPack] = useState(false);
  const [filterDataAndSmsPack, setFilterDataAndSmsPack] = useState(false);
  const [filterVoiceAndDataAndSmsPack, setFilterVoiceAndDataAndSmsPack] = useState(false);
  const [filterAirhubPremiumPlan, setFilterAirhubPremiumPlan] = useState(false);
  const [filterAirhubStandardPlan, setFilterAirhubStandardPlan] = useState(false);
  const [filterAirhubLifetimePlan, setFilterAirhubLifetimePlan] = useState(false);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [selectedPricingPackage, setSelectedPricingPackage] = useState<UnifiedPackage | null>(null);
  const [pricingForm, setPricingForm] = useState({
    providerCost: '',
    retailPrice: '',
    resellerPrice: '',
    resellerSellingPrice: '',
  });
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkPricingDialogOpen, setBulkPricingDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDetailsPackage, setSelectedDetailsPackage] = useState<UnifiedPackage | null>(null);
  const [detailsEditMode, setDetailsEditMode] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState({
    title: '',
    dataAmount: '',
    validity: '',
    type: 'local',
    operator: '',
    coverage: '',
    activationMethod: '',
    apnValue: '',
    networkType: '',
    validityType: '',
    additionalInfo: '',
    hotspotSupported: false,
    topupAvailable: false,
    travelDateRequired: false,
  });
  const [bulkPricingForm, setBulkPricingForm] = useState({
    retailMarkupPercent: '',
    resellerMarkupPercent: '',
    resellerSellingMarkupPercent: '',
  });
  const { t } = useTranslation();
  const countryCodeToEmoji = (code?: string | null) => {
    const normalized = String(code || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) return null;
    return normalized
      .split('')
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  };

  const getPackageFlag = (pkg: UnifiedPackage) => {
    const fallbackCode =
      pkg.destinationCountryCode ||
      pkg.countryCode ||
      (Array.isArray(pkg.coverage) && pkg.coverage.length === 1 ? pkg.coverage[0] : null);
    return pkg.destinationFlag || countryCodeToEmoji(fallbackCode);
  };

  const getPackageFlagCode = (pkg: UnifiedPackage) => {
    const fallbackCode =
      pkg.destinationCountryCode ||
      pkg.countryCode ||
      (Array.isArray(pkg.coverage) && pkg.coverage.length === 1 ? pkg.coverage[0] : null);
    const normalized = String(fallbackCode || '').trim().toLowerCase();
    return /^[a-z]{2}$/.test(normalized) ? normalized : null;
  };

  const getPackageLocationName = (pkg: UnifiedPackage) =>
    pkg.type === 'global'
      ? 'Global'
      : pkg.destinationName ||
      pkg.countryName ||
      pkg.regionName ||
      (Array.isArray(pkg.coverage) && pkg.coverage.length === 1 ? pkg.coverage[0] : 'N/A');

  const getPackageCountryCount = (pkg: UnifiedPackage) => {
    if (pkg.type === 'global') return Math.max(pkg.coverage?.length || 0, 1);
    if (pkg.type === 'regional') return pkg.coverage?.length || 0;
    return 1;
  };

  const getPackagePlanMode = (pkg: UnifiedPackage) => {
    const modes = [];
    if (pkg.dataAmount && pkg.dataAmount !== '0MB') modes.push('Data');
    if ((pkg.voiceCredits || 0) > 0) modes.push('Voice');
    if ((pkg.smsCredits || 0) > 0) modes.push('SMS');
    return modes.join(' + ') || 'Data';
  };

  const getProviderPlanCode = (pkg: UnifiedPackage) =>
    pkg.externalProviderPackageId || pkg.providerPackageId || pkg.id;

  const getCoverageLabel = (pkg: UnifiedPackage) => {
    if (pkg.type === 'global') return 'Global coverage';
    if (pkg.type === 'regional') return pkg.regionName || `${pkg.coverage?.length || 0} countries`;
    return getPackageLocationName(pkg);
  };

  const getKnownValue = (value: string | number | null | undefined) => {
    const text = String(value ?? '').trim();
    return text || 'Not specified by provider';
  };

const isAirhubPackage = (pkg: UnifiedPackage) =>
  pkg.providerSlug === 'airhub' || pkg.providerPackageTable === 'airhub_packages';

const statusBadgeClass = (enabled: boolean) =>
  enabled
    ? 'w-fit min-w-[8rem] justify-center border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700'
    : 'w-fit min-w-[8rem] justify-center border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm text-rose-700';

const tableSwitchClass = (checkedColor: string) =>
  [
    'h-7 w-14 border border-slate-300 bg-slate-200 shadow-inner',
    'data-[state=unchecked]:border-slate-300 data-[state=unchecked]:bg-slate-200',
    checkedColor,
    '[&>span]:h-6 [&>span]:w-6 [&>span]:bg-white [&>span]:shadow-md [&>span]:data-[state=checked]:translate-x-7',
  ].join(' ');

  const getAirhubPlanType = (pkg: UnifiedPackage) => {
    const packageText = `${pkg.title || ''} ${pkg.slug || ''}`.toLowerCase();
    const includesVoiceOrSms =
      (pkg.voiceCredits || 0) > 0 ||
      (pkg.smsCredits || 0) > 0 ||
      /\b(call|calls|voice|minute|minutes|sms|text)\b/.test(packageText);

    return includesVoiceOrSms ? 'voicedata' : 'data';
  };

  const getAirhubApn = (pkg: UnifiedPackage) => {
    if (pkg.apnValue) return pkg.apnValue;
    const operator = String(pkg.operator || '').toLowerCase();
    if (operator.includes('orange')) return 'internet.orange.com';
    return getKnownValue(pkg.apnValue);
  };

  const getAirhubNetworkType = (pkg: UnifiedPackage) => {
    const title = `${pkg.title || ''} ${pkg.networkType || ''}`.toLowerCase();
    if (title.includes('5g')) return '4G/5G';
    return '4G/5G';
  };

  const stripHtml = (value?: string | null) =>
    String(value || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/li>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();

  const getAirhubPackageDetailsItems = (pkg: UnifiedPackage) => {
    const html = String(pkg.additionalInfo || '').trim();
    if (!html) return ['No additional package details provided.'];

    const listItems = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
      .map((match) => stripHtml(match[1]))
      .filter(Boolean);

    if (listItems.length > 0) return listItems;

    return stripHtml(html)
      .split(/\.\s+/)
      .map((item) => item.replace(/\.$/, '').trim())
      .filter(Boolean);
  };

  const getAirhubCallsText = (pkg: UnifiedPackage) => {
    const info = stripHtml(pkg.additionalInfo);
    const match = info.match(/Calls:\s*([^|]+?)\s*\|\s*SMS:\s*([^.]*(?:zones|included)?)/i);
    if (match) {
      return `Calls: ${match[1].trim()} | SMS: ${match[2].trim()}`;
    }

    if ((pkg.voiceCredits || 0) > 0 || (pkg.smsCredits || 0) > 0) {
      const parts = [];
      if ((pkg.voiceCredits || 0) > 0) parts.push(`Calls: ${pkg.voiceCredits} mins`);
      if ((pkg.smsCredits || 0) > 0) parts.push(`SMS: ${pkg.smsCredits} included`);
      return parts.join(' | ');
    }

    if (/\b(call|calls|voice|sms|text)\b/i.test(`${pkg.title || ''} ${info}`)) {
      return 'Calls and SMS included';
    }

    return 'NA';
  };

  const getAirhubValidFrom = (pkg: UnifiedPackage) => {
    const activation = `${pkg.activationMethod || ''} ${pkg.additionalInfo || ''}`.toLowerCase();
    if (activation.includes('first usage')) return 'Begins on first usage';
    if (activation.includes('network connection') || activation.includes('connecting network')) {
      return 'Begins on network connection';
    }
    return 'Begins on network connection';
  };

  const getAirhubInternationalCalls = (pkg: UnifiedPackage) => {
    const info = stripHtml(pkg.additionalInfo);
    const intlMatch = info.match(/(\d+\s*(?:intl|international)[^.|]+(?:minutes|mins)[^.]*)/i);
    return intlMatch ? intlMatch[1].trim() : 'NA';
  };

  const getPackageDetailsDraft = (pkg: UnifiedPackage) => ({
    title: pkg.title || '',
    dataAmount: pkg.dataAmount || '',
    validity: String(pkg.validity || ''),
    type: pkg.type || 'local',
    operator: pkg.operator || '',
    coverage: Array.isArray(pkg.coverage) ? pkg.coverage.join(', ') : '',
    activationMethod: pkg.activationMethod || '',
    apnValue: pkg.apnValue || '',
    networkType: pkg.networkType || '',
    validityType: pkg.validityType || '',
    additionalInfo: pkg.additionalInfo || '',
    hotspotSupported: Boolean(pkg.hotspotSupported),
    topupAvailable: Boolean(pkg.topupAvailable),
    travelDateRequired: Boolean(pkg.travelDateRequired),
  });

  const openDetailsDialog = (pkg: UnifiedPackage) => {
    setSelectedDetailsPackage(pkg);
    setDetailsDraft(getPackageDetailsDraft(pkg));
    setDetailsEditMode(false);
    setDetailsDialogOpen(true);
  };

  const formatUsd = (value: string | number | null | undefined) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `$${numeric.toFixed(2)}` : 'N/A';
  };

  const getResellerSellingDisplay = (pkg: UnifiedPackage) => {
    const count = Number(pkg.resellerSellingCount || 0);
    if (count <= 0) {
      return { value: 'Not set', note: 'Per Reseller' };
    }

    const min = Number(pkg.resellerSellingMin);
    const max = Number(pkg.resellerSellingMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { value: 'Not set', note: 'Per Reseller' };
    }

    const value = min === max
      ? formatUsd(min)
      : `${formatUsd(min)} - ${formatUsd(max)}`;
    return {
      value,
      note: `${count} ${count === 1 ? 'Reseller' : 'Resellers'}`,
    };
  };

  const getResellerSellingEditValue = (pkg: UnifiedPackage) => {
    const count = Number(pkg.resellerSellingCount || 0);
    const min = Number(pkg.resellerSellingMin);
    const max = Number(pkg.resellerSellingMax);

    if (count <= 0 || !Number.isFinite(min) || !Number.isFinite(max) || min !== max) {
      return '';
    }

    return min.toFixed(2);
  };

  // Debounce search input - wait 300ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Get page from URL or default to 1, and listen for URL changes
  const [currentPage, setCurrentPage] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return parseInt(searchParams.get('page') || '1', 10);
  });

  // Listen for URL changes (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      setCurrentPage(parseInt(searchParams.get('page') || '1', 10));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Helper to update page in both state and URL
  const goToPage = (page: number, options?: { replace?: boolean }) => {
    setCurrentPage(page);
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('page', page.toString());
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;

    if (options?.replace) {
      window.history.replaceState({}, '', newUrl);
    } else {
      window.history.pushState({}, '', newUrl);
    }
  };

  const { data: response, isLoading, isFetching } = useQuery<PaginatedResponse>({
    queryKey: [
      '/api/admin/unified-packages',
      currentPage,
      providerFilter,
      typeFilter,
      bestPriceFilter,
      sortFilter,
      filterUnlimited,
      filterPopular,
      filterDataPack,
      filterVoicePack,
      filterSmsPack,
      filterVoiceAndDataPack,
      filterVoiceAndSmsPack,
      filterDataAndSmsPack,
      filterVoiceAndDataAndSmsPack,
      filterAirhubPremiumPlan,
      filterAirhubStandardPlan,
      filterAirhubLifetimePlan,
      debouncedSearch,
    ],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
      });

      if (providerFilter !== 'all') params.append('provider', providerFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (bestPriceFilter !== null) params.append('isBestPrice', bestPriceFilter.toString());
      if (sortFilter !== 'default') params.append('sort', sortFilter);
      if (filterUnlimited) params.append('isUnlimited', 'true');
      if (filterPopular) params.append('isPopular', 'true');
      if (filterDataPack) params.append('dataPack', 'true');
      if (filterVoicePack) params.append('voicePack', 'true');
      if (filterSmsPack) params.append('smsPack', 'true');
      if (filterVoiceAndDataPack) params.append('voiceAndDataPack', 'true');
      if (filterVoiceAndSmsPack) params.append('voiceAndSmsPack', 'true');
      if (filterDataAndSmsPack) params.append('dataAndSmsPack', 'true');
      if (filterVoiceAndDataAndSmsPack) params.append('voiceAndDataAndSmsPack', 'true');
      if (filterAirhubPremiumPlan) params.append('airhubPremiumPlan', 'true');
      if (filterAirhubStandardPlan) params.append('airhubStandardPlan', 'true');
      if (filterAirhubLifetimePlan) params.append('airhubLifetimePlan', 'true');
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await fetch(`/api/admin/unified-packages?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch Packages');
      return res.json();
    },
  });

  const packages = response?.data;

  const { data: providers } = useQuery<Provider[]>({
    queryKey: ['/api/admin/providers'],
  });

  const selectedProvider = useMemo(
    () => providers?.find((provider) => provider.slug === providerFilter) ?? null,
    [providers, providerFilter],
  );

  const updatePackageMutation = useMutation({
    mutationFn: async ({
      packageId,
      data,
    }: {
      packageId: string;
      data: Partial<UnifiedPackage> & {
        wholesalePrice?: string;
        retailPrice?: string;
        resellerPrice?: string;
        resellerSellingPrice?: string;
      };
    }) => {
      return await apiRequest('PATCH', `/api/admin/unified-packages/${packageId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/unified-packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: 'Package Updated',
        description: 'Package settings have been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update package settings.',
        variant: 'destructive',
      });
    },
  });

  const updatePackageDetailsMutation = useMutation({
    mutationFn: async ({ packageId, data }: { packageId: string; data: Record<string, any> }) => {
      const response = await apiRequest('PATCH', `/api/admin/unified-packages/${packageId}`, data);
      const json = await response.json();
      return json?.data || json;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/unified-packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      setSelectedDetailsPackage((current) => {
        if (!current || current.id !== variables.packageId) return current;
        return {
          ...current,
          ...variables.data,
          validity: Number(variables.data.validity ?? current.validity),
          coverage: variables.data.coverage || current.coverage,
        };
      });
      setDetailsEditMode(false);
      toast({
        title: 'Details Updated',
        description: 'Package details have been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Details Update Failed',
        description: error.message || 'Failed to update package details.',
        variant: 'destructive',
      });
    },
  });

  const bulkPricingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/unified-packages/bulk-pricing', {
        retailMarkupPercent: bulkPricingForm.retailMarkupPercent || undefined,
        resellerMarkupPercent: bulkPricingForm.resellerMarkupPercent || undefined,
        resellerSellingMarkupPercent: bulkPricingForm.resellerSellingMarkupPercent || undefined,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Bulk pricing failed');
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/unified-packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      setBulkPricingDialogOpen(false);
      toast({
        title: 'Bulk Pricing Updated',
        description: `${data.updated} Packages were updated. ${data.resellerSellingUpdated || 0} Reseller selling prices were updated.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk Pricing Failed',
        description: error.message || 'Could not apply bulk pricing.',
        variant: 'destructive',
      });
    },
  });

  const bulkProviderStatusMutation = useMutation({
    mutationFn: async ({
      providerSlug,
      isEnabled,
    }: {
      providerSlug: string;
      isEnabled: boolean;
    }) => {
      const res = await apiRequest('POST', '/api/admin/unified-packages/bulk-status', {
        providerSlug,
        isEnabled,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Bulk status update failed');
      return data.data as { providerName: string; updated: number; isEnabled: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/unified-packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: data.isEnabled ? 'Provider Packages Enabled' : 'Provider Packages Disabled',
        description: `${data.updated} package${data.updated === 1 ? '' : 's'} updated for ${data.providerName}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk Update Failed',
        description: error.message || 'Could not update provider packages.',
        variant: 'destructive',
      });
    },
  });

  const importPricingMutation = useMutation({
    mutationFn: async (csv: string) => {
      const res = await apiRequest('POST', '/api/admin/unified-packages/import', { csv });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Import failed');
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/unified-packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: 'Package Prices Imported',
        description: `${data.updated} updated, ${data.skipped} skipped.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Import Failed',
        description: error.message || 'Could not import package prices.',
        variant: 'destructive',
      });
    },
  });

  const handleToggleEnabled = (pkg: UnifiedPackage) => {
    updatePackageMutation.mutate({
      packageId: pkg.id,
      data: { isEnabled: !pkg.isEnabled, manualOverride: true },
    });
  };

  const handleTogglePopular = (pkg: UnifiedPackage) => {
    updatePackageMutation.mutate({
      packageId: pkg.id,
      data: { isPopular: !pkg.isPopular },
    });
  };

  const handleToggleRecommended = (pkg: UnifiedPackage) => {
    updatePackageMutation.mutate({
      packageId: pkg.id,
      data: { isRecommended: !pkg.isRecommended },
    });
  };

  const handleToggleBestValue = (pkg: UnifiedPackage) => {
    updatePackageMutation.mutate({
      packageId: pkg.id,
      data: { isBestValue: !pkg.isBestValue },
    });
  };

  const handleSavePackageDetails = () => {
    if (!selectedDetailsPackage) return;
    const coverage = detailsDraft.coverage
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean);

    updatePackageDetailsMutation.mutate({
      packageId: selectedDetailsPackage.id,
      data: {
        title: detailsDraft.title,
        dataAmount: detailsDraft.dataAmount,
        validity: Number(detailsDraft.validity),
        type: detailsDraft.type,
        operator: detailsDraft.operator,
        coverage,
        activationMethod: detailsDraft.activationMethod,
        apnValue: detailsDraft.apnValue,
        networkType: detailsDraft.networkType,
        validityType: detailsDraft.validityType,
        additionalInfo: detailsDraft.additionalInfo,
        hotspotSupported: detailsDraft.hotspotSupported,
        topupAvailable: detailsDraft.topupAvailable,
        travelDateRequired: detailsDraft.travelDateRequired,
      },
    });
  };

  const handleBulkProviderStatus = (isEnabled: boolean) => {
    if (!selectedProvider) return;

    bulkProviderStatusMutation.mutate({
      providerSlug: selectedProvider.slug,
      isEnabled,
    });
  };

  const openPricingDialog = (pkg: UnifiedPackage) => {
    const providerCost = pkg.providerCost || pkg.providerPrice || '0.00';
    const retailPrice = pkg.retailPrice || pkg.price || '0.00';
    const resellerPrice = pkg.resellerPrice || retailPrice;

    setSelectedPricingPackage(pkg);
    setPricingForm({
      providerCost: Number(providerCost).toFixed(2),
      retailPrice: Number(retailPrice).toFixed(2),
      resellerPrice: Number(resellerPrice).toFixed(2),
      resellerSellingPrice: getResellerSellingEditValue(pkg),
    });
    setPricingDialogOpen(true);
  };

  const savePricing = () => {
    if (!selectedPricingPackage) return;

    updatePackageMutation.mutate({
      packageId: selectedPricingPackage.id,
      data: {
        wholesalePrice: pricingForm.providerCost,
        retailPrice: pricingForm.retailPrice,
        resellerPrice: pricingForm.resellerPrice,
        resellerSellingPrice: pricingForm.resellerSellingPrice.trim() || undefined,
      },
    });
    setPricingDialogOpen(false);
    setSelectedPricingPackage(null);
  };

  const exportPricing = async () => {
    try {
      const res = await fetch('/api/admin/unified-packages/export', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Could not export package prices');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'admin-package-prices.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Export Ready', description: 'Package pricing CSV has been downloaded.' });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Could not export package prices.',
        variant: 'destructive',
      });
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const csv = await file.text();
    importPricingMutation.mutate(csv);
  };

  const resetAllFilters = () => {
    setProviderFilter('all');
    setTypeFilter('all');
    setBestPriceFilter(null);
    setSortFilter('default');
    setFilterUnlimited(false);
    setFilterPopular(false);
    setFilterDataPack(false);
    setFilterVoicePack(false);
    setFilterSmsPack(false);
    setFilterVoiceAndDataPack(false);
    setFilterVoiceAndSmsPack(false);
    setFilterDataAndSmsPack(false);
    setFilterVoiceAndDataAndSmsPack(false);
    setFilterAirhubPremiumPlan(false);
    setFilterAirhubStandardPlan(false);
    setFilterAirhubLifetimePlan(false);
    setSearch('');
    if (currentPage !== 1) goToPage(1, { replace: true });
  };

  const activeFiltersCount = [
    providerFilter !== 'all',
    typeFilter !== 'all',
    bestPriceFilter !== null,
    sortFilter !== 'default',
    filterUnlimited,
    filterPopular,
    filterDataPack,
    filterVoicePack,
    filterSmsPack,
    filterVoiceAndDataPack,
    filterVoiceAndSmsPack,
    filterDataAndSmsPack,
    filterVoiceAndDataAndSmsPack,
    filterAirhubPremiumPlan,
    filterAirhubStandardPlan,
    filterAirhubLifetimePlan,
    search.length > 0,
  ].filter(Boolean).length;

  const stats = response?.stats || {
    total: 0,
    enabled: 0,
    global: 0,
    bestPrice: 0,
    manualOverride: 0,
  };



  return (
    <div className="admin-light-surface admin-mode-surface space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{t("adminPanel.admin.packages.title", "Package Management")}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t("adminPanel.admin.packages.description", "Manage unified packages from all providers with pricing and visibility controls")}

          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            className="gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={() => setBulkPricingDialogOpen(true)}
          >
            <Percent className="h-4 w-4" />
            Bulk Pricing
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={exportPricing}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={() => importInputRef.current?.click()}
            disabled={importPricingMutation.isPending}
          >
            <Upload className="h-4 w-4" />
            {importPricingMutation.isPending ? 'Importing...' : 'Import'}
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#168b80]">{t("adminPanel.admin.packages.stats.total", "Total Packages")}</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#58cbbb]">
              <Database className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-semibold text-slate-950" data-testid="text-total-packages">
              {stats.total}
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm transition-colors hover:border-[#58cbbb] hover:bg-teal-50"
          onClick={() => {
            setTypeFilter('global');
            if (currentPage !== 1) goToPage(1, { replace: true });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">Global</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
              <Globe2 className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-semibold text-slate-950" data-testid="text-global-packages">
              {stats.global}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">{t("adminPanel.admin.packages.stats.enabled", "Enabled")}</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
              <PackageIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-semibold text-slate-950" data-testid="text-enabled-packages">
              {stats.enabled}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">{t("adminPanel.admin.packages.stats.bestPrice", "Best Price")}</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
              <Star className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-semibold text-slate-950" data-testid="text-best-price-packages">
              {stats.bestPrice}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">{t("adminPanel.admin.packages.stats.manualOverride", "Manual Override")}</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-semibold text-slate-950" data-testid="text-manual-override-packages">
              {stats.manualOverride}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-slate-950">{t("adminPanel.admin.packages.table.title", "Unified Packages")}</CardTitle>
              <CardDescription className="text-slate-500">
                {t("adminPanel.admin.packages.table.description", "Filter and manage package visibility across providers")}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 md:w-64">
                {isFetching ? (
                  <RefreshCw className="absolute left-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                )}
                <Input
                  placeholder={t("adminPanel.admin.packages.searchPlaceholder", "Search packages...")}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (currentPage !== 1) goToPage(1, { replace: true });
                  }}
                  className="border-slate-300 bg-white pl-8 text-slate-950 placeholder:text-slate-400"
                  data-testid="input-search-packages"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-4">
            <Select
              value={providerFilter}
              onValueChange={(value) => {
                setProviderFilter(value);
                if (currentPage !== 1) goToPage(1, { replace: true });
              }}
            >
              <SelectTrigger className="w-48 border-slate-300 bg-white text-slate-950" data-testid="select-provider-filter">
                <SelectValue placeholder={t("adminPanel.admin.packages.filters.allProviders", "All Providers")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("adminPanel.admin.packages.filters.allProviders", "All Providers")}</SelectItem>
                {providers?.map((provider) => (
                  <SelectItem key={provider.id} value={provider.slug}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                if (currentPage !== 1) goToPage(1, { replace: true });
              }}
            >
              <SelectTrigger className="w-48 border-slate-300 bg-white text-slate-950" data-testid="select-type-filter">
                <SelectValue placeholder={t("adminPanel.admin.packages.filters.allTypes", "All Types")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("adminPanel.admin.packages.filters.allTypes", "All Types")}</SelectItem>
                <SelectItem value="local">{t("adminPanel.admin.packages.filters.local", "Local")}</SelectItem>
                <SelectItem value="regional">{t("adminPanel.admin.packages.filters.regional", "Regional")}</SelectItem>
                <SelectItem value="global">{t("adminPanel.admin.packages.filters.global", "Global")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={bestPriceFilter === null ? 'all' : bestPriceFilter ? 'yes' : 'no'}
              onValueChange={(value) => {
                setBestPriceFilter(value === 'all' ? null : value === 'yes');
                if (currentPage !== 1) goToPage(1, { replace: true });
              }}
            >
              <SelectTrigger className="w-48 border-slate-300 bg-white text-slate-950" data-testid="select-best-price-filter">
                <SelectValue placeholder={t("adminPanel.admin.packages.filters.allPrices", "All Prices")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("adminPanel.admin.packages.filters.allPrices", "All Prices")}</SelectItem>
                <SelectItem value="yes">{t("adminPanel.admin.packages.filters.bestPriceOnly", "Best Price Only")}</SelectItem>
                <SelectItem value="no">{t("adminPanel.admin.packages.filters.notBestPrice", "Not Best Price")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortFilter}
              onValueChange={(value) => {
                setSortFilter(value);
                if (currentPage !== 1) goToPage(1, { replace: true });
              }}
            >
              <SelectTrigger className="w-48 border-slate-300 bg-white text-slate-950" data-testid="select-sort-filter">
                <SelectValue placeholder={t("adminPanel.admin.packages.filters.defaultSort", "Default Sort")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("adminPanel.admin.packages.filters.defaultSort", "Default Sort")}</SelectItem>
                <SelectItem value="priceLowToHigh">{t("adminPanel.admin.packages.filters.priceLowToHigh", "Price: Low to High")}</SelectItem>
                <SelectItem value="priceHighToLow">{t("adminPanel.admin.packages.filters.priceHighToLow", "Price: High to Low")}</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950" data-testid="button-advanced-filters">
                  <Filter className="h-4 w-4" />
                  {t("adminPanel.admin.packages.filters.advanced", "Advanced Filters")}
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 border-slate-200 bg-white text-slate-950" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-950">{t("adminPanel.admin.packages.filters.advanced", "Advanced Filters")}</h4>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetAllFilters}
                        className="h-8 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      >
                        {t("adminPanel.admin.packages.filters.resetAll", "Reset All")}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="filter-unlimited"
                        checked={filterUnlimited}
                        onCheckedChange={(checked) => {
                          setFilterUnlimited(checked as boolean);
                          if (currentPage !== 1) goToPage(1, { replace: true });
                        }}
                      />
                      <Label
                        htmlFor="filter-unlimited"
                        className="cursor-pointer text-sm font-normal text-slate-700"
                      >
                        {t("adminPanel.admin.packages.filters.unlimitedData", "Unlimited Data")}
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="filter-popular"
                        checked={filterPopular}
                        onCheckedChange={(checked) => {
                          setFilterPopular(checked as boolean);
                          if (currentPage !== 1) goToPage(1, { replace: true });
                        }}
                      />
                      <Label
                        htmlFor="filter-popular"
                        className="cursor-pointer text-sm font-normal text-slate-700"
                      >
                        {t("adminPanel.admin.packages.filters.popularPackages", "Popular Packages")}
                      </Label>
                    </div>

                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="mb-2 text-xs font-semibold text-slate-500">
                        {t("adminPanel.admin.packages.filters.packageType", "Package Type")}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="filter-data-pack"
                            checked={filterDataPack}
                            onCheckedChange={(checked) => {
                              setFilterDataPack(checked as boolean);
                              if (currentPage !== 1) goToPage(1, { replace: true });
                            }}
                          />
                          <Label
                            htmlFor="filter-data-pack"
                            className="flex cursor-pointer items-center gap-1.5 text-sm font-normal text-slate-700"
                          >
                            <Smartphone className="h-3.5 w-3.5" />

                            {t("adminPanel.admin.packages.filters.dataOnly", "Data Only")}

                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="filter-voice-pack"
                            checked={filterVoicePack}
                            onCheckedChange={(checked) => {
                              setFilterVoicePack(checked as boolean);
                              if (currentPage !== 1) goToPage(1, { replace: true });
                            }}
                          />
                          <Label
                            htmlFor="filter-voice-pack"
                            className="flex cursor-pointer items-center gap-1.5 text-sm font-normal text-slate-700"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {t("adminPanel.admin.packages.filters.voiceOnly", "Voice Only")}

                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="filter-sms-pack"
                            checked={filterSmsPack}
                            onCheckedChange={(checked) => {
                              setFilterSmsPack(checked as boolean);
                              if (currentPage !== 1) goToPage(1, { replace: true });
                            }}
                          />
                          <Label
                            htmlFor="filter-sms-pack"
                            className="flex cursor-pointer items-center gap-1.5 text-sm font-normal text-slate-700"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {t("adminPanel.admin.packages.filters.smsOnly", "SMS Only")}

                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="filter-voice-data"
                            checked={filterVoiceAndDataPack}
                            onCheckedChange={(checked) => {
                              setFilterVoiceAndDataPack(checked as boolean);
                              if (currentPage !== 1) goToPage(1, { replace: true });
                            }}
                          />
                          <Label
                            htmlFor="filter-voice-data"
                            className="cursor-pointer text-sm font-normal text-slate-700"
                          >
                            {t("adminPanel.admin.packages.filters.voiceData", "Voice + Data")}

                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="filter-voice-sms"
                            checked={filterVoiceAndSmsPack}
                            onCheckedChange={(checked) => {
                              setFilterVoiceAndSmsPack(checked as boolean);
                              if (currentPage !== 1) goToPage(1, { replace: true });
                            }}
                          />
                          <Label
                            htmlFor="filter-voice-sms"
                            className="cursor-pointer text-sm font-normal text-slate-700"
                          >
                            {t("adminPanel.admin.packages.filters.voiceSms", "Voice + SMS")}

                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="filter-data-sms"
                            checked={filterDataAndSmsPack}
                            onCheckedChange={(checked) => {
                              setFilterDataAndSmsPack(checked as boolean);
                              if (currentPage !== 1) goToPage(1, { replace: true });
                            }}
                          />
                          <Label
                            htmlFor="filter-data-sms"
                            className="cursor-pointer text-sm font-normal text-slate-700"
                          >
                            {t("adminPanel.admin.packages.filters.dataSms", "Data + SMS")}

                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="filter-all-three"
                            checked={filterVoiceAndDataAndSmsPack}
                            onCheckedChange={(checked) => {
                              setFilterVoiceAndDataAndSmsPack(checked as boolean);
                              if (currentPage !== 1) goToPage(1, { replace: true });
                            }}
                          />
                          <Label
                            htmlFor="filter-all-three"
                            className="cursor-pointer text-sm font-normal text-slate-700"
                          >
                            {t("adminPanel.admin.packages.filters.allThree", "Voice + Data + SMS")}
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="mb-2 text-xs font-semibold text-slate-500">
                        {t("adminPanel.admin.packages.filters.airhubPlans", "Airhub Plans")}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="filter-airhub-premium"
                            checked={filterAirhubPremiumPlan}
                            onCheckedChange={(checked) => {
                              setFilterAirhubPremiumPlan(checked as boolean);
                              if (currentPage !== 1) goToPage(1, { replace: true });
                            }}
                          />
                          <Label
                            htmlFor="filter-airhub-premium"
                            className="flex cursor-pointer items-center gap-1.5 text-sm font-normal text-slate-700"
                          >
                            <Star className="h-3.5 w-3.5 text-cyan-600" />
                            {t("adminPanel.admin.packages.filters.airhubPremium", "Premium Plans")}
                            <span className="text-xs text-slate-500">Best Value</span>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="filter-airhub-standard"
                            checked={filterAirhubStandardPlan}
                            onCheckedChange={(checked) => {
                              setFilterAirhubStandardPlan(checked as boolean);
                              if (currentPage !== 1) goToPage(1, { replace: true });
                            }}
                          />
                          <Label
                            htmlFor="filter-airhub-standard"
                            className="flex cursor-pointer items-center gap-1.5 text-sm font-normal text-slate-700"
                          >
                            <PackageIcon className="h-3.5 w-3.5 text-blue-600" />
                            {t("adminPanel.admin.packages.filters.airhubStandard", "Standard Plans")}
                            <span className="text-xs text-slate-500">Basic Back</span>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="filter-airhub-lifetime"
                            checked={filterAirhubLifetimePlan}
                            onCheckedChange={(checked) => {
                              setFilterAirhubLifetimePlan(checked as boolean);
                              if (currentPage !== 1) goToPage(1, { replace: true });
                            }}
                          />
                          <Label
                            htmlFor="filter-airhub-lifetime"
                            className="flex cursor-pointer items-center gap-1.5 text-sm font-normal text-slate-700"
                          >
                            <Globe2 className="h-3.5 w-3.5 text-teal-600" />
                            {t("adminPanel.admin.packages.filters.airhubLifetime", "Lifetime Plan")}
                            <span className="text-xs text-slate-500">One-time payment</span>
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {selectedProvider && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-2 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() => handleBulkProviderStatus(true)}
                  disabled={bulkProviderStatusMutation.isPending}
                  data-testid="button-enable-all-provider-packages"
                >
                  <Power className="h-4 w-4" />
                  Enable All
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={() => handleBulkProviderStatus(false)}
                  disabled={bulkProviderStatusMutation.isPending}
                  data-testid="button-disable-all-provider-packages"
                >
                  <PowerOff className="h-4 w-4" />
                  Disable All
                </Button>
              </div>
            )}
          </div>
          {selectedProvider && (
            <p className="pt-2 text-sm text-slate-500">
              Bulk actions apply to all packages from {selectedProvider.name}. You can still manage
              each package one by one below.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && !packages ? (
            <div className="flex min-h-96 items-center justify-center">
              <div className="text-center">
                <PackageIcon className="mx-auto mb-4 h-8 w-8 animate-spin text-teal-600" />
                <p className="text-sm text-slate-500">Loading Packages...</p>
              </div>
            </div>
          ) : !packages || packages.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <PackageIcon className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No Packages found matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table data-testid="table-packages" className={isFetching ? "opacity-50 transition-opacity" : "transition-opacity"}>
              <TableHeader>
                <TableRow className="border-slate-300 bg-slate-50 hover:bg-slate-50">

                  <TableHead className="w-12 font-semibold text-slate-800">{t("admin.packages.table.index", "#")}</TableHead>
                  <TableHead className="font-semibold text-slate-800">{t("adminPanel.admin.packages.table.package", "Package")}</TableHead>
                  <TableHead className="font-semibold text-slate-800">{t("adminPanel.admin.packages.table.provider", "Provider")}</TableHead>
                  <TableHead className="font-semibold text-slate-800">{t("adminPanel.admin.packages.table.location", "Location")}</TableHead>
                  <TableHead className="font-semibold text-slate-800">{t("adminPanel.admin.packages.table.type", "Type")}</TableHead>
                  <TableHead className="font-semibold text-slate-800">{t("adminPanel.admin.packages.table.packageDetails", "Package Details")}</TableHead>
                  <TableHead className="font-semibold text-slate-800">{t("adminPanel.admin.packages.table.pricing", "Pricing")}</TableHead>
                  <TableHead className="font-semibold text-slate-800">{t("adminPanel.admin.packages.table.status", "Status")}</TableHead>
                  <TableHead className="text-center font-semibold text-slate-800">{t("adminPanel.admin.packages.table.popular", "Popular")}</TableHead>
                  <TableHead className="text-center font-semibold text-slate-800">{t("adminPanel.admin.packages.table.recommend", "Recommend")}</TableHead>
                  <TableHead className="text-center font-semibold text-slate-800">{t("adminPanel.admin.packages.table.bestValue", "Best Value")}</TableHead>
                  <TableHead className="text-center font-semibold text-slate-800">{t("adminPanel.admin.packages.table.enabled", "Enabled")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg, index) => {
                  const rowNumber = (currentPage - 1) * 50 + index + 1;
                  const providerCost = pkg.providerCost || pkg.providerPrice || '0';
                  const retailPrice = pkg.retailPrice || pkg.price || '0';
                  const resellerPrice = pkg.resellerPrice || retailPrice;
                  const resellerSellingDisplay = getResellerSellingDisplay(pkg);
                  const packageFlag = getPackageFlag(pkg);
                  const packageFlagCode = getPackageFlagCode(pkg);
                  const packageLocationName = getPackageLocationName(pkg);
                  return (
                    <TableRow key={pkg.id} data-testid={`row-package-${pkg.id}`} className="border-slate-200 hover:bg-slate-50">
                      <TableCell
                        className="font-medium text-slate-700"
                        data-testid={`text-row-number-${pkg.id}`}
                      >
                        {rowNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-950">{pkg.title}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pkg.isPopular && (
                            <Badge
                              variant="default"
                              className="text-xs bg-orange-500"
                              data-testid={`badge-popular-${pkg.id}`}
                            >
                              {t("adminPanel.admin.packages.badges.popular", "Popular")}

                            </Badge>
                          )}
                          {pkg.isRecommended && (
                            <Badge
                              variant="default"
                              className="text-xs bg-teal-500"
                              data-testid={`badge-recommended-${pkg.id}`}
                            >
                              {t("adminPanel.admin.packages.badges.recommended", "Recommend")}

                            </Badge>
                          )}
                          {pkg.isBestValue && (
                            <Badge
                              variant="default"
                              className="text-xs bg-green-500"
                              data-testid={`badge-best-value-${pkg.id}`}
                            >
                              {t("adminPanel.admin.packages.badges.bestValue", "Best Value")}

                            </Badge>
                          )}
                          {pkg.isUnlimited && (
                            <Badge
                              variant="default"
                              className="text-xs bg-purple-500"
                              data-testid={`badge-unlimited-${pkg.id}`}
                            >
                              {t("adminPanel.admin.packages.badges.unlimited", "Unlimited")}
                            </Badge>
                          )}
                          {pkg.airhubPlanFamilyLabel && (
                            <Badge
                              variant="outline"
                              className="border-cyan-200 bg-cyan-50 text-xs text-cyan-700"
                              data-testid={`badge-airhub-plan-${pkg.id}`}
                            >
                              {pkg.airhubPlanFamilyLabel}
                              {pkg.airhubPlanFamilyDescription ? ` - ${pkg.airhubPlanFamilyDescription}` : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">{pkg.slug}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-700" data-testid={`badge-provider-${pkg.id}`}>
                          {pkg.providerName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-4 text-sm text-slate-950"
                          data-testid={`text-location-${pkg.id}`}
                        >
                          {pkg.type === 'global' ? (
                            <GlobalMapBadge
                              className="h-16 w-16 shrink-0"
                              data-testid={`flag-${pkg.id}`}
                            />
                          ) : packageFlagCode ? (
                            <img
                              src={`https://flagcdn.com/w160/${packageFlagCode}.png`}
                              alt=""
                              className="h-12 w-20 rounded-lg object-cover"
                              data-testid={`flag-${pkg.id}`}
                              loading="lazy"
                            />
                          ) : packageFlag && (
                            <span className="text-4xl leading-none" data-testid={`flag-${pkg.id}`}>
                              {packageFlag}
                            </span>
                          )}
                          {pkg.type !== 'global' && !packageFlagCode && !packageFlag && <MapPin className="h-10 w-10 text-slate-600" />}
                          <span>{packageLocationName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pkg.type === 'local'
                              ? 'default'
                              : pkg.type === 'regional'
                                ? 'secondary'
                                : 'outline'
                          }
                          className={`capitalize ${pkg.type === 'local'
                            ? 'bg-teal-500 hover:bg-teal-600'
                            : pkg.type === 'regional'
                              ? 'bg-teal-500 hover:bg-teal-600'
                              : 'bg-orange-500 hover:bg-orange-600 text-white'
                            }`}
                          data-testid={`badge-type-${pkg.id}`}
                        >
                          {pkg.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Database className="h-3.5 w-3.5 text-teal-500" />
                            <span className="font-medium text-slate-950">{pkg.dataAmount}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-slate-700">
                            <Clock className="h-3.5 w-3.5 text-slate-600" />
                            <span>{pkg.validity} days</span>
                          </div>
                          {pkg.voiceCredits && pkg.voiceCredits > 0 && (
                            <div
                              className="flex items-center gap-1.5 text-xs text-slate-700"
                              data-testid={`text-voice-credits-${pkg.id}`}
                            >
                              <Phone className="h-3 w-3 text-slate-600" />
                              <span>{pkg.voiceCredits} mins</span>
                            </div>
                          )}
                          {pkg.smsCredits && pkg.smsCredits > 0 && (
                            <div
                              className="flex items-center gap-1.5 text-xs text-slate-700"
                              data-testid={`text-sms-credits-${pkg.id}`}
                            >
                              <MessageSquare className="h-3 w-3 text-slate-600" />
                              <span>{pkg.smsCredits} SMS</span>
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1 h-8 w-fit gap-1.5 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                            onClick={() => openDetailsDialog(pkg)}
                            data-testid={`button-package-details-${pkg.id}`}
                          >
                            <Info className="h-3.5 w-3.5" />
                            Details
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-700">Provider Cost:</span>
                            <span
                              className="text-sm font-medium text-slate-950"
                              data-testid={`text-provider-price-${pkg.id}`}
                            >
                              ${parseFloat(providerCost).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-700">Reseller Cost:</span>
                            <span
                              className="text-sm font-semibold text-indigo-600"
                              data-testid={`text-reseller-price-${pkg.id}`}
                            >
                              ${parseFloat(resellerPrice).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-700">Retail Selling:</span>
                            <span
                              className="text-sm font-semibold text-teal-600"
                              data-testid={`text-selling-price-${pkg.id}`}
                            >
                              ${parseFloat(retailPrice).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-medium text-slate-700">Reseller Selling:</span>
                            <span className="text-right">
                              <span
                                className="block text-sm font-semibold text-emerald-600"
                                data-testid={`text-reseller-selling-price-${pkg.id}`}
                              >
                                {resellerSellingDisplay.value}
                              </span>
                              <span className="block text-[11px] leading-tight text-slate-600">
                                {resellerSellingDisplay.note}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-1">
                            <span className="text-xs font-medium text-slate-700">Margin:</span>
                            <span
                              className="text-xs font-medium text-emerald-600"
                              data-testid={`text-margin-${pkg.id}`}
                            >
                              {(() => {
                                const providerPrice = parseFloat(providerCost);
                                const sellingPrice = parseFloat(retailPrice);
                                const marginAmount = sellingPrice - providerPrice;
                                const marginPercent =
                                  providerPrice > 0 ? (marginAmount / providerPrice) * 100 : 0;
                                return `$${marginAmount.toFixed(2)} (${marginPercent.toFixed(1)}%)`;
                              })()}
                            </span>
                          </div>
                          {pkg.isBestPrice && (
                            <Badge
                              variant="default"
                              className="mt-1 w-fit bg-[#58cbbb] text-xs text-slate-950 hover:bg-[#58cbbb]"
                              data-testid={`badge-best-price-${pkg.id}`}
                            >
                              <Star className="mr-1 h-3 w-3" />
                              Best Price
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1 h-8 w-fit gap-1.5 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                            onClick={() => openPricingDialog(pkg)}
                            data-testid={`button-edit-prices-${pkg.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit Prices
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={pkg.isEnabled ? 'default' : 'secondary'}
                            className={statusBadgeClass(pkg.isEnabled)}
                            data-testid={`badge-status-${pkg.id}`}
                          >
                            {pkg.isEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          {pkg.manualOverride && (
                            <Badge
                              variant="outline"
                              className="w-fit border-slate-200 bg-slate-50 text-xs text-slate-700"
                              data-testid={`badge-manual-override-${pkg.id}`}
                            >
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Manual
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={pkg.isPopular}
                          onCheckedChange={() => handleTogglePopular(pkg)}
                          disabled={updatePackageMutation.isPending}
                          className={tableSwitchClass('data-[state=checked]:border-orange-300/70 data-[state=checked]:bg-orange-500')}
                          data-testid={`switch-popular-${pkg.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={pkg.isRecommended}
                          onCheckedChange={() => handleToggleRecommended(pkg)}
                          disabled={updatePackageMutation.isPending}
                          className={tableSwitchClass('data-[state=checked]:border-teal-300/70 data-[state=checked]:bg-teal-500')}
                          data-testid={`switch-recommended-${pkg.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={pkg.isBestValue}
                          onCheckedChange={() => handleToggleBestValue(pkg)}
                          disabled={updatePackageMutation.isPending}
                          className={tableSwitchClass('data-[state=checked]:border-green-300/70 data-[state=checked]:bg-green-500')}
                          data-testid={`switch-best-value-${pkg.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={pkg.isEnabled}
                          onCheckedChange={() => handleToggleEnabled(pkg)}
                          disabled={updatePackageMutation.isPending}
                          className={tableSwitchClass('data-[state=checked]:border-teal-300/70 data-[state=checked]:bg-teal-500')}
                          data-testid={`switch-enabled-${pkg.id}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>

        {/* Pagination Controls */}
        {response && response.pagination && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 md:flex-row">
            <div className="text-sm text-slate-500">
              Showing {(response.pagination.page - 1) * response.pagination.limit + 1} to{' '}
              {Math.min(
                response.pagination.page * response.pagination.limit,
                response.pagination.total,
              )}{' '}
              of {response.pagination.total} Packages
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                data-testid="button-pagination-prev"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {(() => {
                  const totalPages = response.pagination.totalPages;
                  const pageButtons: JSX.Element[] = [];
                  const maxVisiblePages = 7;

                  if (totalPages <= maxVisiblePages) {
                    for (let i = 1; i <= totalPages; i++) {
                      pageButtons.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => goToPage(i)}
                          className={
                            currentPage === i
                              ? 'min-w-[2.5rem] bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]'
                              : 'min-w-[2.5rem] border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                          }
                          data-testid={`button-page-${i}`}
                        >
                          {i}
                        </Button>,
                      );
                    }
                  } else {
                    pageButtons.push(
                      <Button
                        key={1}
                        variant={currentPage === 1 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => goToPage(1)}
                        className={
                          currentPage === 1
                            ? 'min-w-[2.5rem] bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]'
                            : 'min-w-[2.5rem] border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                        }
                        data-testid="button-page-1"
                      >
                        1
                      </Button>,
                    );

                    if (currentPage > 3) {
                      pageButtons.push(
                        <span key="ellipsis-1" className="px-2 text-slate-400">
                          ...
                        </span>,
                      );
                    }

                    const startPage = Math.max(2, currentPage - 1);
                    const endPage = Math.min(totalPages - 1, currentPage + 1);

                    for (let i = startPage; i <= endPage; i++) {
                      pageButtons.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => goToPage(i)}
                          className={
                            currentPage === i
                              ? 'min-w-[2.5rem] bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]'
                              : 'min-w-[2.5rem] border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                          }
                          data-testid={`button-page-${i}`}
                        >
                          {i}
                        </Button>,
                      );
                    }

                    if (currentPage < totalPages - 2) {
                      pageButtons.push(
                        <span key="ellipsis-2" className="px-2 text-slate-400">
                          ...
                        </span>,
                      );
                    }

                    pageButtons.push(
                      <Button
                        key={totalPages}
                        variant={currentPage === totalPages ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        className={
                          currentPage === totalPages
                            ? 'min-w-[2.5rem] bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]'
                            : 'min-w-[2.5rem] border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                        }
                        data-testid={`button-page-${totalPages}`}
                      >
                        {totalPages}
                      </Button>,
                    );
                  }

                  return pageButtons;
                })()}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === response.pagination.totalPages}
                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                data-testid="button-pagination-next"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog
        open={detailsDialogOpen}
        onOpenChange={(open) => {
          setDetailsDialogOpen(open);
          if (!open) setDetailsEditMode(false);
        }}
      >
        <DialogContent className="max-w-[96vw] overflow-hidden border border-slate-700/70 bg-[#081225] p-0 text-slate-100 shadow-2xl shadow-black/50 sm:max-w-6xl [&>button:last-child]:hidden" data-testid="dialog-package-details">
          {selectedDetailsPackage && (() => {
            const pkg = selectedDetailsPackage;
            const locationName = getPackageLocationName(pkg);
            const countryCount = getPackageCountryCount(pkg);
            const flagCode = getPackageFlagCode(pkg);
            const planMode = getPackagePlanMode(pkg);
            const retailPrice = pkg.retailPrice || pkg.price || '0';
            const providerPlanCode = getProviderPlanCode(pkg);
            const coverageLabel = getCoverageLabel(pkg);
            const apnLabel = pkg.apnValue
              ? `${pkg.apnType ? `${pkg.apnType}: ` : ''}${pkg.apnValue}`
              : getKnownValue(pkg.apnType);
            const isAirhub = isAirhubPackage(pkg);
            const overviewCoverageLabel = isAirhub ? getKnownValue(pkg.networkType) : coverageLabel;
            const overviewPlanTypeLabel = isAirhub ? getAirhubPlanType(pkg) : planMode;
            const overviewApnLabel = isAirhub ? getAirhubApn(pkg) : apnLabel;
            const overviewNetworkTypeLabel = isAirhub ? getAirhubNetworkType(pkg) : getKnownValue(pkg.networkType);
            const overviewActivationMethod = isAirhub ? 'QR Code' : (pkg.activationMethod || 'QR Code after purchase');
            const overviewDeviceSupport = 'iOS & Android';
            const overviewNetworkRows = isAirhub
              ? [
                ['Operator:', getKnownValue(pkg.operator)],
                ['APN:', overviewApnLabel],
                ['Network Type:', overviewNetworkTypeLabel],
              ]
              : [
                ['Operator:', getKnownValue(pkg.operator)],
                ['Coverage:', coverageLabel],
                ['Connectivity:', overviewNetworkTypeLabel],
              ];
            const overviewPlanRows = isAirhub
              ? [
                ['Plan Code:', providerPlanCode],
                ['Activation Method:', overviewActivationMethod],
                ['Device Support:', overviewDeviceSupport],
              ]
              : [
                ['Provider Plan Code:', providerPlanCode],
                ['Provider:', pkg.providerName || 'Provider'],
                ['Validity Starts:', overviewActivationMethod],
              ];
            const airhubFeatureCards = [
              {
                label: 'Country/Region',
                value: String(countryCount || 1),
                icon: Globe2,
              },
              {
                label: 'Calls & Text',
                value: getAirhubCallsText(pkg),
                icon: MessageSquare,
              },
              {
                label: 'Autostart Enabled',
                value: 'Automatic activation',
                icon: Power,
              },
              {
                label: 'International Calls',
                value: getAirhubInternationalCalls(pkg),
                icon: Globe2,
              },
              {
                label: 'Hotspot',
                value: pkg.hotspotSupported ? 'Share your connection' : 'Not specified by provider',
                icon: Globe2,
              },
              {
                label: 'Compatibility',
                value: 'eSIM enabled devices',
                icon: Globe2,
              },
              {
                label: 'Valid From',
                value: getAirhubValidFrom(pkg),
                icon: Globe2,
              },
            ];
            const airhubPackageDetailsItems = getAirhubPackageDetailsItems(pkg);

            return (
              <div className="max-h-[90vh] overflow-y-auto bg-[#081225] text-slate-100">
                <div className="relative overflow-hidden border-b border-slate-700/70 bg-[linear-gradient(135deg,#1d3574_0%,#10213e_54%,#0b1428_100%)] px-6 pb-7 pt-7 text-white sm:px-8">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(94,234,212,0.16),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(96,165,250,0.14),transparent_32%)]" />
                  <div className="absolute right-5 top-5 z-10 flex items-center gap-2">
                    {detailsEditMode ? (
                      <>
                        <Button
                          variant="ghost"
                          className="h-10 rounded-full border border-white/10 bg-slate-950/30 px-4 text-white hover:bg-white/10 hover:text-white"
                          onClick={() => {
                            setDetailsDraft(getPackageDetailsDraft(pkg));
                            setDetailsEditMode(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="h-10 rounded-full bg-teal-400 px-4 text-slate-950 hover:bg-teal-300"
                          onClick={handleSavePackageDetails}
                          disabled={updatePackageDetailsMutation.isPending}
                        >
                          {updatePackageDetailsMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        className="h-10 rounded-full border border-white/10 bg-slate-950/30 px-4 text-white hover:bg-white/10 hover:text-white"
                        onClick={() => {
                          setDetailsDraft(getPackageDetailsDraft(pkg));
                          setDetailsEditMode(true);
                        }}
                      >
                        Edit Details
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full border border-white/10 bg-slate-950/30 text-white hover:bg-white/10 hover:text-white"
                      onClick={() => setDetailsDialogOpen(false)}
                      data-testid="button-close-package-details"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="relative z-0 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-6">
                      <span className="flex h-32 w-40 shrink-0 items-center justify-center rounded-2xl border border-teal-300/20 bg-slate-950/35 text-teal-200 shadow-lg shadow-black/20">
                        {pkg.type === 'global' ? (
                          <GlobalMapBadge className="h-24 w-24" />
                        ) : flagCode ? (
                          <img
                            src={`https://flagcdn.com/w160/${flagCode}.png`}
                            alt=""
                            className="h-24 w-32 rounded-xl object-cover"
                          />
                        ) : (
                          <Globe2 className="h-20 w-20" />
                        )}
                      </span>
                      <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-300/25 bg-teal-300/10 px-3 py-1 text-xs text-teal-100">
                          <Wifi className="h-3.5 w-3.5" />
                          Package Details
                        </div>
                        <h2 className="text-2xl text-white sm:text-3xl">{locationName} eSIM Plan</h2>
                        <p className="mt-1 max-w-2xl text-sm text-slate-300 sm:text-base">{pkg.title || `${pkg.dataAmount} for ${pkg.validity} days`} from {pkg.providerName || 'Provider'}.</p>
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-3 lg:min-w-[440px]">
                      <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-400">Data</div>
                        <div className="mt-1 text-xl text-white">{pkg.dataAmount}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-400">Validity</div>
                        <div className="mt-1 text-xl text-white">{pkg.validity} Days</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-400">Countries</div>
                        <div className="mt-1 text-xl text-white">{countryCount || 1}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="overview" className="px-5 py-5 sm:px-7">
                  <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-2xl border border-slate-700/70 bg-[#0b1730] p-1.5">
                    <TabsTrigger value="overview" className="gap-2 rounded-xl px-3 py-2.5 text-slate-300 data-[state=active]:bg-teal-400 data-[state=active]:text-slate-950">
                      <Wifi className="h-4 w-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="features" className="rounded-xl px-3 py-2.5 text-slate-300 data-[state=active]:bg-teal-400 data-[state=active]:text-slate-950">
                      Features
                    </TabsTrigger>
                    <TabsTrigger value="more" className="gap-2 rounded-xl px-3 py-2.5 text-slate-300 data-[state=active]:bg-teal-400 data-[state=active]:text-slate-950">
                      <Info className="h-4 w-4" />
                      More information
                    </TabsTrigger>
                  </TabsList>

                  {detailsEditMode && (
                    <div className="mt-5 rounded-2xl border border-teal-300/25 bg-[#0d1a34] p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-lg text-white">Edit Package Details</p>
                          <p className="text-sm text-slate-400">These values are saved to the package and used by the Details modal.</p>
                        </div>
                        <Badge className="bg-teal-400/15 text-teal-200 hover:bg-teal-400/15">Editable</Badge>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Package Title</Label>
                          <Input
                            value={detailsDraft.title}
                            onChange={(event) => setDetailsDraft((draft) => ({ ...draft, title: event.target.value }))}
                            className="border-slate-700 bg-[#09142a] text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Operator / Network</Label>
                          <Input
                            value={detailsDraft.operator}
                            onChange={(event) => setDetailsDraft((draft) => ({ ...draft, operator: event.target.value }))}
                            className="border-slate-700 bg-[#09142a] text-white"
                            placeholder="Multi-Network, Vodafone, Ooredoo..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Data Amount</Label>
                          <Input
                            value={detailsDraft.dataAmount}
                            onChange={(event) => setDetailsDraft((draft) => ({ ...draft, dataAmount: event.target.value }))}
                            className="border-slate-700 bg-[#09142a] text-white"
                            placeholder="7GB, 500MB, Unlimited"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Validity Days</Label>
                          <Input
                            type="number"
                            min="1"
                            value={detailsDraft.validity}
                            onChange={(event) => setDetailsDraft((draft) => ({ ...draft, validity: event.target.value }))}
                            className="border-slate-700 bg-[#09142a] text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Coverage Type</Label>
                          <Select
                            value={detailsDraft.type}
                            onValueChange={(value) => setDetailsDraft((draft) => ({ ...draft, type: value }))}
                          >
                            <SelectTrigger className="border-slate-700 bg-[#09142a] text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="local">Local</SelectItem>
                              <SelectItem value="regional">Regional</SelectItem>
                              <SelectItem value="global">Global</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Coverage Country Codes</Label>
                          <Input
                            value={detailsDraft.coverage}
                            onChange={(event) => setDetailsDraft((draft) => ({ ...draft, coverage: event.target.value }))}
                            className="border-slate-700 bg-[#09142a] text-white"
                            placeholder="FR, DE, ES"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Connectivity</Label>
                          <Input
                            value={detailsDraft.networkType}
                            onChange={(event) => setDetailsDraft((draft) => ({ ...draft, networkType: event.target.value }))}
                            className="border-slate-700 bg-[#09142a] text-white"
                            placeholder="Local, Roaming"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">APN</Label>
                          <Input
                            value={detailsDraft.apnValue}
                            onChange={(event) => setDetailsDraft((draft) => ({ ...draft, apnValue: event.target.value }))}
                            className="border-slate-700 bg-[#09142a] text-white"
                            placeholder="internet, plus, wap.tim.it"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Validity Starts</Label>
                          <Input
                            value={detailsDraft.activationMethod}
                            onChange={(event) => setDetailsDraft((draft) => ({ ...draft, activationMethod: event.target.value }))}
                            className="border-slate-700 bg-[#09142a] text-white"
                            placeholder="first network connection"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Validity Type</Label>
                          <Input
                            value={detailsDraft.validityType}
                            onChange={(event) => setDetailsDraft((draft) => ({ ...draft, validityType: event.target.value }))}
                            className="border-slate-700 bg-[#09142a] text-white"
                            placeholder="Days"
                          />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {[
                          ['hotspotSupported', 'Hotspot Supported'],
                          ['topupAvailable', 'Top-up Available'],
                          ['travelDateRequired', 'Travel Date Required'],
                        ].map(([key, label]) => (
                          <div key={key} className="flex items-center justify-between rounded-xl border border-slate-700 bg-[#09142a] px-4 py-3">
                            <Label className="text-slate-300">{label}</Label>
                            <Switch
                              checked={Boolean(detailsDraft[key as keyof typeof detailsDraft])}
                              onCheckedChange={(checked) => setDetailsDraft((draft) => ({ ...draft, [key]: checked }))}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 space-y-2">
                        <Label className="text-slate-300">More Information / Package Details</Label>
                        <Textarea
                          value={detailsDraft.additionalInfo}
                          onChange={(event) => setDetailsDraft((draft) => ({ ...draft, additionalInfo: event.target.value }))}
                          className="min-h-40 border-slate-700 bg-[#09142a] text-white"
                          placeholder="<ul><li>Calls: ...</li><li>Supported Countries: ...</li></ul>"
                        />
                        <p className="text-xs text-slate-500">
                          Airhub details can be plain text or HTML list items. This content appears under More information.
                        </p>
                      </div>
                    </div>
                  )}

                  <TabsContent value="overview" className="mt-5 space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-4 rounded-2xl border border-slate-700/70 bg-[#0d1a34] p-4">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/15 text-teal-200">
                          <MapPin className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm text-slate-400">Plan Coverage</p>
                          <p className="text-lg text-white">{overviewCoverageLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 rounded-2xl border border-slate-700/70 bg-[#0d1a34] p-4">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/15 text-sky-200">
                          <Radio className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm text-slate-400">{isAirhub ? 'Plan Type' : 'Included Services'}</p>
                          <p className="text-lg text-white">{overviewPlanTypeLabel}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-700/70 bg-[#0d1a34] p-5">
                        <div className="mb-5 flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/15 text-teal-200">
                            <Settings className="h-5 w-5" />
                          </span>
                          <h3 className="text-lg text-white">Network Configuration</h3>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-700/70">
                          {overviewNetworkRows.map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-700/70 bg-[#09142a] px-3 py-3 text-sm last:border-b-0">
                              <span className="text-slate-400">{label}</span>
                              <span className="text-right text-slate-100">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-700/70 bg-[#0d1a34] p-5">
                        <div className="mb-5 flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/15 text-sky-200">
                            <QrCode className="h-5 w-5" />
                          </span>
                          <h3 className="text-lg text-white">Plan Information</h3>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-700/70">
                          {overviewPlanRows.map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-700/70 bg-[#09142a] px-3 py-3 text-sm last:border-b-0">
                              <span className="text-slate-400">{label}</span>
                              <span className="text-right text-slate-100">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="features" className="mt-5">
                    {isAirhub ? (
                      <div className="grid gap-4 md:grid-cols-3">
                        {airhubFeatureCards.map(({ label, value, icon: Icon }) => (
                          <div key={label} className="flex min-h-[104px] items-center gap-4 rounded-2xl border border-slate-700/70 bg-[#0d1a34] p-5">
                            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-sky-200">
                              <Icon className="h-6 w-6" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-lg text-white">{label}</p>
                              <p className="mt-1 text-sm leading-5 text-slate-300">{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-3">
                        {[
                          ['Data Allowance', pkg.isUnlimited ? 'Unlimited' : pkg.dataAmount],
                          ['Validity', `${pkg.validity} days`],
                          ['Coverage', coverageLabel],
                          ['Voice', (pkg.voiceCredits || 0) > 0 ? `${pkg.voiceCredits} mins` : 'Not included'],
                          ['SMS', (pkg.smsCredits || 0) > 0 ? `${pkg.smsCredits} SMS` : 'Not included'],
                          ['Hotspot', pkg.hotspotSupported ? 'Supported' : 'Not specified by provider'],
                          ['Top-up', pkg.topupAvailable ? 'Available' : 'Not specified by provider'],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-slate-700/70 bg-[#0d1a34] p-5">
                            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
                            <p className="mt-2 text-lg text-white">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="more" className="mt-5">
                    {isAirhub ? (
                      <div className="rounded-2xl border border-slate-700/70 bg-[#0d1a34] p-5">
                        <div className="mb-5 flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/15 text-sky-200">
                            <Phone className="h-5 w-5" />
                          </span>
                          <h3 className="text-lg text-white">Package Details</h3>
                        </div>
                        <ul className="space-y-3 text-sm leading-6 text-slate-200">
                          {airhubPackageDetailsItems.map((item, index) => (
                            <li key={`${item}-${index}`} className="flex gap-3">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-700/70 bg-[#0d1a34] p-5">
                        <div className="grid gap-3 text-sm md:grid-cols-2">
                          <div className="flex justify-between gap-4 border-b border-slate-700/70 py-3">
                            <span className="text-slate-400">Provider Plan Code:</span>
                            <span className="text-right text-slate-100">{providerPlanCode}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-slate-700/70 py-3">
                            <span className="text-slate-400">Slug:</span>
                            <span className="text-right text-slate-100">{pkg.slug}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-slate-700/70 py-3">
                            <span className="text-slate-400">APN:</span>
                            <span className="text-right text-slate-100">{apnLabel}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-slate-700/70 py-3">
                            <span className="text-slate-400">Policy:</span>
                            <span className="text-right text-slate-100">{getKnownValue(pkg.policyName)}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-slate-700/70 py-3">
                            <span className="text-slate-400">Validity Type:</span>
                            <span className="text-right text-slate-100">{getKnownValue(pkg.validityType)}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-slate-700/70 py-3">
                            <span className="text-slate-400">Travel Date:</span>
                            <span className="text-right text-slate-100">{pkg.travelDateRequired ? 'Required by provider' : 'Not required'}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-slate-700/70 py-3">
                            <span className="text-slate-400">Provider Cost:</span>
                            <span className="text-slate-100">{formatUsd(pkg.providerCost || pkg.providerPrice)}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-slate-700/70 py-3">
                            <span className="text-slate-400">Status:</span>
                            <span className={pkg.isEnabled ? 'text-teal-200' : 'text-rose-300'}>{pkg.isEnabled ? 'Enabled' : 'Disabled'}</span>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-slate-700/70 py-3 md:col-span-2">
                            <span className="text-slate-400">Internal Package ID:</span>
                            <span className="break-all text-right text-slate-100">{pkg.id}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <div className="mx-auto mt-8 max-w-2xl">
                    <Button className="h-12 w-full rounded-xl bg-teal-400 text-base text-slate-950 hover:bg-teal-300">
                      Buy Now - {formatUsd(retailPrice)}
                    </Button>
                  </div>
                </Tabs>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={bulkPricingDialogOpen} onOpenChange={setBulkPricingDialogOpen}>
        <DialogContent className="sm:max-w-2xl" data-testid="dialog-bulk-package-pricing">
          <DialogHeader>
            <DialogTitle>Bulk Package Pricing</DialogTitle>
            <DialogDescription>
              Apply markup from provider cost to every package. Leave a field blank to keep that price unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bulk-retail-markup">Retail Markup %</Label>
                <Input
                  id="bulk-retail-markup"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Example: 25"
                  value={bulkPricingForm.retailMarkupPercent}
                  onChange={(event) =>
                    setBulkPricingForm((current) => ({
                      ...current,
                      retailMarkupPercent: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">Retail = provider cost + this percentage.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-reseller-markup">Reseller Cost Markup %</Label>
                <Input
                  id="bulk-reseller-markup"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Example: 10"
                  value={bulkPricingForm.resellerMarkupPercent}
                  onChange={(event) =>
                    setBulkPricingForm((current) => ({
                      ...current,
                      resellerMarkupPercent: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">Reseller cost = provider cost + this percentage.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk-reseller-selling-markup">Reseller Selling Markup %</Label>
                <Input
                  id="bulk-reseller-selling-markup"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Example: 20"
                  value={bulkPricingForm.resellerSellingMarkupPercent}
                  onChange={(event) =>
                    setBulkPricingForm((current) => ({
                      ...current,
                      resellerSellingMarkupPercent: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">Reseller selling = reseller cost + this percentage.</p>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => bulkPricingMutation.mutate()}
              disabled={
                bulkPricingMutation.isPending ||
                (!bulkPricingForm.retailMarkupPercent &&
                  !bulkPricingForm.resellerMarkupPercent &&
                  !bulkPricingForm.resellerSellingMarkupPercent)
              }
            >
              {bulkPricingMutation.isPending ? 'Applying...' : 'Apply Bulk Pricing'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent data-testid="dialog-edit-package-pricing">
          <DialogHeader>
            <DialogTitle>Edit Package Pricing</DialogTitle>
            <DialogDescription>
              Set provider cost, reseller cost, and main retail selling price. Reseller selling is shown from reseller-specific pricing.
            </DialogDescription>
          </DialogHeader>

          {selectedPricingPackage && (
            <div className="space-y-4">
              <div className="rounded-md border bg-slate-50 p-3 dark:bg-slate-900">
                <p className="text-sm font-medium">{selectedPricingPackage.title}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedPricingPackage.providerName} -{' '}
                  {selectedPricingPackage.destinationName || selectedPricingPackage.regionName || 'Global'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider-cost">Provider Cost</Label>
                  <Input
                    id="provider-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingForm.providerCost}
                    onChange={(event) =>
                      setPricingForm((current) => ({
                        ...current,
                        providerCost: event.target.value,
                      }))
                    }
                    data-testid="input-provider-cost"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reseller-price">Reseller Cost</Label>
                  <Input
                    id="reseller-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingForm.resellerPrice}
                    onChange={(event) =>
                      setPricingForm((current) => ({
                        ...current,
                        resellerPrice: event.target.value,
                      }))
                    }
                    data-testid="input-reseller-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retail-price">Retail Selling Price</Label>
                  <Input
                    id="retail-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingForm.retailPrice}
                    onChange={(event) =>
                      setPricingForm((current) => ({
                        ...current,
                        retailPrice: event.target.value,
                      }))
                    }
                    data-testid="input-retail-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reseller-selling-price">Reseller Selling</Label>
                  <Input
                    id="reseller-selling-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricingForm.resellerSellingPrice}
                    placeholder="Set for all resellers"
                    onChange={(event) =>
                      setPricingForm((current) => ({
                        ...current,
                        resellerSellingPrice: event.target.value,
                      }))
                    }
                    data-testid="input-reseller-selling-price"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: {getResellerSellingDisplay(selectedPricingPackage).value} ·{' '}
                    {getResellerSellingDisplay(selectedPricingPackage).note}
                  </p>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={savePricing}
                disabled={
                  updatePackageMutation.isPending ||
                  Number(pricingForm.providerCost) < 0 ||
                  Number(pricingForm.retailPrice) < 0 ||
                  Number(pricingForm.resellerPrice) < 0 ||
                  (pricingForm.resellerSellingPrice.trim() !== '' && Number(pricingForm.resellerSellingPrice) < 0)
                }
                data-testid="button-save-package-pricing"
              >
                {updatePackageMutation.isPending ? 'Saving...' : 'Save Prices'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
