import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, Search, Server, Package, Globe, MapPin, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/contexts/TranslationContext";

interface Provider {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  lastSyncAt: string | null;
}

interface TopupPackage {
  id: string;
  title: string;
  dataAmount: string;
  validity: number;
  price: string;
  currency: string;
  type: string;
  operator: string | null;
  operatorImage: string | null;
  destinationName: string | null;
  regionName: string | null;
  active: boolean;
  provider: string;
  providerName: string;
  createdAt: string;
  parentPackageId: string | null;
  parentOperator: string | null;
  hasParentPackage: boolean;
}

interface TopupsResponse {
  success: boolean;
  data: TopupPackage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    airalo: number;
    esimAccess: number;
    esimGo: number;
    maya: number;
    total: number;
  };
}

// Format data amount for display - handles eSIM Go's "-1" for unlimited
function formatDataAmount(dataAmount: string): string {
  if (!dataAmount) return "-";

  // eSIM Go uses "-1" or "-1MB" to mean unlimited
  if (dataAmount === "-1" || dataAmount === "-1MB" || dataAmount === "-1 MB") {
    return "Unlimited";
  }

  // Already formatted as "Unlimited"
  if (dataAmount.toLowerCase() === "unlimited") {
    return "Unlimited";
  }

  // Return as-is for normal data amounts (e.g., "1GB", "500MB")
  return dataAmount;
}

const lightInputClass =
  "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500";
const lightOutlineButtonClass =
  "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950";
const statCardClass = "rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm";
const syncCardClass =
  "flex items-center justify-between rounded-md border border-slate-200 bg-white p-4 text-slate-950 shadow-sm";

export default function MasterTopups() {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null);
  const itemsPerPage = 50;
  const { t } = useTranslation();

  // Debounce search - wait 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: providers, isLoading: loadingProviders } = useQuery<{
    success: boolean;
    data: Provider[];
  }>({
    queryKey: ["/api/admin/providers"],
    queryFn: async () => {
      const res = await fetch('/api/admin/providers', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    },
  });

  const { data: topupsData, isLoading: loadingTopups } = useQuery<TopupsResponse>({
    queryKey: ["/api/admin/master-topups", { provider: providerFilter, search: debouncedSearch, page: currentPage }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (providerFilter !== 'all') params.append('provider', providerFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('page', String(currentPage));
      const url = `/api/admin/master-topups?${params.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch topups');
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (providerId: string) => {
      setSyncingProviderId(providerId);
      const response = await apiRequest(
        "POST",
        `/api/admin/providers/${providerId}/sync-topups`
      );
      return response.json();
    },
    onSuccess: (data: any) => {
      setSyncingProviderId(null);
      if (data.success) {
        toast({
          title: "Topup Sync Complete",
          description: `Synced ${data.topupsSynced || 0} topups, updated ${data.topupsUpdated || 0}.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/master-topups"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/providers"] });
      } else {
        toast({
          title: "Topup Sync Failed",
          description: data.errorMessage || data.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setSyncingProviderId(null);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to trigger topup sync",
        variant: "destructive",
      });
    },
  });

  const topups = topupsData?.data || [];
  const stats = topupsData?.stats || { airalo: 0, esimAccess: 0, esimGo: 0, maya: 0, total: 0 };
  const pagination = topupsData?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'airalo':
        return 'border-teal-200 bg-teal-50 text-teal-700';
      case 'esim-access':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'esim-go':
        return 'border-cyan-200 bg-cyan-50 text-cyan-700';
      case 'maya':
        return 'border-orange-200 bg-orange-50 text-orange-700';
      default:
        return 'border-slate-200 bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            <RefreshCw className="h-6 w-6 text-[#168b80]" />
            {t('adminPanel.admin.topups.title2', 'Topup Packages')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t(
              'adminPanel.admin.topups.description2',
              'Manage topup packages for reloading existing eSIMs',
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#168b80]">
              {t('adminPanel.admin.topups.stats.total', 'Total Topup Packages')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-teal-700">
              <div className="h-3 w-3 rounded-full bg-teal-500" />
              {t('adminPanel.admin.topups.stats.airalo', 'Airalo Topups')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{stats.airalo.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              {t('adminPanel.admin.topups.stats.esimAccess', 'eSIM Access Topups')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{(stats.esimAccess || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-cyan-700">
              <div className="h-3 w-3 rounded-full bg-cyan-500" />
              {t('adminPanel.admin.topups.stats.esimGo', 'eSIM Go Topups')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{(stats.esimGo || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-orange-700">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              {t('adminPanel.admin.topups.stats.maya', 'Maya Mobile Topups')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-950">{(stats.maya || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-950">{t('adminPanel.admin.topups.sync.title', 'Topup Sync Status')}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {t(
              'adminPanel.admin.topups.sync.description',
              'Sync topup packages from all providers. Topups are also auto-synced after base package sync.',
            )}
          </p>
        </CardHeader>
        <CardContent>
          {loadingProviders ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {/* Airalo sync card - always visible */}
              <div
                className={syncCardClass}
                data-testid="card-sync-airalo"
              >
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-teal-500" />
                  <div>
                    <p className="font-semibold text-slate-950">
                      {t('adminPanel.admin.topups.provider.airalo', 'Airalo Topups')}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {t('adminPanel.admin.topups.lastSync', 'Last sync')}
                      {providers?.data?.find((p) => p.slug === 'airalo')?.lastSyncAt
                        ? new Date(
                          providers.data.find((p) => p.slug === 'airalo')!.lastSyncAt!,
                        ).toLocaleString()
                        : t('adminPanel.admin.topups.never', 'Never')}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className={lightOutlineButtonClass}
                  onClick={() => {
                    const airalo = providers?.data?.find((p) => p.slug === 'airalo');
                    if (airalo) syncMutation.mutate(airalo.id);
                  }}
                  disabled={
                    syncMutation.isPending || !providers?.data?.find((p) => p.slug === 'airalo')
                  }
                  data-testid="button-sync-topups-airalo"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncingProviderId === providers?.data?.find((p) => p.slug === 'airalo')?.id ? 'animate-spin' : ''}`}
                  />
                  <span className="ml-2">Sync</span>
                </Button>
              </div>

              {/* eSIM Access sync card */}
              <div
                className={syncCardClass}
                data-testid="card-sync-esim-access"
              >
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-emerald-500" />
                  <div>
                    <span className="flex items-center gap-2 font-semibold text-slate-950">
                      {t('adminPanel.admin.topups.provider.esimAccess', 'eSIM Access Topups')}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="max-w-xs">
                            {t(
                              'adminPanel.admin.topups.tooltip.esimAccess',
                              'Bulk sync available to fetch all topup packages at once. Also fetched on-demand when users request them.',
                            )}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <p className="text-xs font-medium text-slate-500">
                      {t('adminPanel.admin.topups.lastSync', 'Last sync')}
                      {providers?.data?.find((p) => p.slug === 'esim-access')?.lastSyncAt
                        ? new Date(
                          providers.data.find((p) => p.slug === 'esim-access')!.lastSyncAt!,
                        ).toLocaleString()
                        : t('adminPanel.admin.topups.never', 'Never')}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className={lightOutlineButtonClass}
                  onClick={() => {
                    const esimAccess = providers?.data?.find((p) => p.slug === 'esim-access');
                    if (esimAccess) syncMutation.mutate(esimAccess.id);
                  }}
                  disabled={
                    syncMutation.isPending || !providers?.data?.find((p) => p.slug === 'esim-access')
                  }
                  data-testid="button-sync-topups-esim-access"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncingProviderId === providers?.data?.find((p) => p.slug === 'esim-access')?.id ? 'animate-spin' : ''}`}
                  />
                  <span className="ml-2">Sync</span>
                </Button>
              </div>

              {/* eSIM Go sync card */}
              <div
                className={syncCardClass}
                data-testid="card-sync-esim-go"
              >
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-cyan-500" />
                  <div>
                    <span className="flex items-center gap-2 font-semibold text-slate-950">
                      {t('adminPanel.admin.topups.provider.esimGo', 'eSIM Go Topups')}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-slate-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="max-w-xs">
                            {t(
                              'adminPanel.admin.topups.tooltip.esimGo',
                              'Topups are fetched from base packages with canTopup=true. Auto-synced after base package sync.',
                            )}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <p className="text-xs font-medium text-slate-500">
                      {t('adminPanel.admin.topups.lastSync', 'Last sync')}
                      {providers?.data?.find((p) => p.slug === 'esim-go')?.lastSyncAt
                        ? new Date(
                          providers.data.find((p) => p.slug === 'esim-go')!.lastSyncAt!,
                        ).toLocaleString()
                        : t('adminPanel.admin.topups.never', 'Never')}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className={lightOutlineButtonClass}
                  onClick={() => {
                    const esimGo = providers?.data?.find((p) => p.slug === 'esim-go');
                    if (esimGo) syncMutation.mutate(esimGo.id);
                  }}
                  disabled={
                    syncMutation.isPending || !providers?.data?.find((p) => p.slug === 'esim-go')
                  }
                  data-testid="button-sync-topups-esim-go"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncingProviderId === providers?.data?.find((p) => p.slug === 'esim-go')?.id ? 'animate-spin' : ''}`}
                  />
                  <span className="ml-2">Sync</span>
                </Button>
              </div>

              {/* Maya sync card */}
              <div
                className={syncCardClass}
                data-testid="card-sync-maya"
              >
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-semibold text-slate-950">
                      {t('adminPanel.admin.topups.provider.maya', 'Maya Mobile Topups')}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {t('adminPanel.admin.topups.lastSync', 'Last sync')}
                      {providers?.data?.find((p) => p.slug === 'maya')?.lastSyncAt
                        ? new Date(
                          providers.data.find((p) => p.slug === 'maya')!.lastSyncAt!,
                        ).toLocaleString()
                        : t('adminPanel.admin.topups.never', 'Never')}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className={lightOutlineButtonClass}
                  onClick={() => {
                    const maya = providers?.data?.find((p) => p.slug === 'maya');
                    if (maya) syncMutation.mutate(maya.id);
                  }}
                  disabled={
                    syncMutation.isPending || !providers?.data?.find((p) => p.slug === 'maya')
                  }
                  data-testid="button-sync-topups-maya"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncingProviderId === providers?.data?.find((p) => p.slug === 'maya')?.id ? 'animate-spin' : ''}`}
                  />
                  <span className="ml-2">{t('adminPanel.admin.topups.sync', 'Sync')}</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-slate-950">{t('adminPanel.admin.topups.table.title', 'All Topup Packages')}</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder={t('adminPanel.admin.topups.search', 'Search topups...')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className={`w-full pl-9 sm:w-[200px] ${lightInputClass}`}
                  data-testid="input-search-topups"
                />
              </div>
              <Select
                value={providerFilter}
                onValueChange={(v) => {
                  setProviderFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={`w-full sm:w-[150px] ${lightInputClass}`} data-testid="select-provider">
                  <SelectValue placeholder="All Providers" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-900">
                  <SelectItem value="all">
                    {t('adminPanel.admin.topups.filters.allProviders', 'All Providers')}
                  </SelectItem>
                  <SelectItem value="airalo">Airalo</SelectItem>
                  <SelectItem value="esim-access">eSIM Access</SelectItem>
                  <SelectItem value="esim-go">eSIM Go</SelectItem>
                  <SelectItem value="maya">Maya Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTopups ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : topups.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center text-slate-500">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-950">No topup Packages found.</p>
              <p className="mt-2 text-sm text-slate-500">
                {debouncedSearch
                  ? 'Try a different search term.'
                  : 'Trigger a sync to fetch topup Packages.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-md border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                      <TableHead className="font-semibold text-slate-700">
                        {t('adminPanel.admin.topups.table.titleCol', 'Title')}
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        {t('adminPanel.admin.topups.table.provider', 'Provider')}
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        {t('adminPanel.admin.topups.table.destination', 'Destination')}
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">{t('adminPanel.admin.topups.table.data', 'Data')}</TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        {t('adminPanel.admin.topups.table.validity', 'Validity')}
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">{t('adminPanel.admin.topups.table.price', 'Price')}</TableHead>
                      <TableHead className="font-semibold text-slate-700">{t('adminPanel.admin.topups.table.linked', 'Linked')}</TableHead>
                      <TableHead className="font-semibold text-slate-700">{t('adminPanel.admin.topups.table.status', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topups.map((topup) => (
                      <TableRow key={`${topup.provider}-${topup.id}`} className="border-slate-200 hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {topup.operatorImage && (
                              <img
                                src={topup.operatorImage}
                                alt={topup.operator || ''}
                                className="w-8 h-8 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="text-sm font-semibold text-slate-950">{topup.title}</p>
                              {topup.operator && (
                                <p className="text-xs font-medium text-slate-500">{topup.operator}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getProviderBadgeColor(topup.provider)}
                            variant="outline"
                          >
                            {topup.providerName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm font-medium text-slate-800">
                            {topup.regionName ? (
                              <>
                                <Globe className="h-3 w-3 text-slate-500" />
                                {topup.regionName}
                              </>
                            ) : topup.destinationName ? (
                              <>
                                <MapPin className="h-3 w-3 text-slate-500" />
                                {topup.destinationName}
                              </>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-950">{formatDataAmount(topup.dataAmount)}</span>
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">{topup.validity} days</TableCell>
                        <TableCell>
                          <span className="font-semibold text-[#168b80]">${parseFloat(topup.price).toFixed(2)}</span>
                          <span className="ml-1 text-xs font-medium text-slate-500">{topup.currency}</span>
                        </TableCell>
                        <TableCell>
                          {topup.hasParentPackage ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-700"
                            >
                              Linked
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-slate-200 bg-slate-100 text-slate-600"
                            >
                              Unlinked
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              topup.active
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-100 text-slate-600'
                            }
                          >
                            {topup.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total}{' '}
                    Packages
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={lightOutlineButtonClass}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium text-slate-700">
                      Page {currentPage} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className={lightOutlineButtonClass}
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
