import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Server,
  RefreshCw,
  Settings as SettingsIcon,
  Check,
  X,
  Clock,
  Package,
  Star,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import ProviderConfigModal from '@/components/admin/ProviderConfigModal';
import { useTranslation } from '@/contexts/TranslationContext';
import {
  adminProviderDisplayName,
  resellerProviderDisplayName,
} from '@shared/providerNames';

interface Provider {
  id: string;
  name: string;
  slug: string;
  apiBaseUrl: string | null;
  enabled: boolean;
  isPreferred: boolean;
  pricingMargin: string;
  syncIntervalMinutes: number;
  lastSyncAt: string | null;
  apiRateLimitPerHour: number;
  webhookSecret: string | null;
  totalPackages: number | null;
  createdAt: string;
  updatedAt: string;
}

function adminProviderLabel(provider: Provider) {
  return adminProviderDisplayName(provider.slug, provider.name);
}

function resellerProviderLabel(provider: Provider) {
  return resellerProviderDisplayName(provider.slug, provider.name);
}

export default function Providers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const { data: providers, isLoading } = useQuery<Provider[]>({
    queryKey: ['/api/admin/providers'],
  });

  const syncProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const res = await fetch(`/api/admin/providers/${providerId}/sync`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.errorMessage || data.message || 'Failed to sync provider Packages.');
      }
      return data;
    },
    onSuccess: (data, providerId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/providers'] });
      toast({
        title: t('adminPanel.admin.providers.syncCompletedTitle', 'Sync Completed'),
        description:
          data?.packagesSynced !== undefined || data?.packagesUpdated !== undefined
            ? `Synced ${data.packagesSynced || 0} new and ${data.packagesUpdated || 0} updated Packages.`
            : t(
                'adminPanel.admin.providers.syncCompletedDescription',
                'Provider Packages have been synchronized successfully.',
              ),
      });
      setSyncingProvider(null);
    },
    onError: (error: any, providerId) => {
      toast({
        title: t('admin.providers.syncFailedTitle', 'Sync Failed'),
        description:
          error.message ||
          t('adminPanel.admin.providers.syncFailedDescription', 'Failed to sync provider Packages.'),
        variant: 'destructive',
      });
      setSyncingProvider(null);
    },
  });

  const runPriceComparisonMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/providers/price-comparison');
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/providers'] });
      toast({
        title: t('adminPanel.admin.providers.priceComparisonCompleteTitle', 'Price Comparison Complete'),
        description: t(
          'adminPanel.admin.providers.priceComparisonCompleteDescription',
          'Analyzed {{total}} Packages, found {{best}} best price Packages.',
          { total: data.totalPackages, best: data.bestPricePackages },
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('adminPanel.admin.providers.priceComparisonFailedTitle', 'Price Comparison Failed'),
        description:
          error.message ||
          t('adminPanel.admin.providers.priceComparisonFailedDescription', 'Failed to run price comparison.'),
        variant: 'destructive',
      });
    },
  });

  const testProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const res = await fetch(`/api/admin/providers/${providerId}/health`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || 'Provider health check failed.');
      }
      return data.data || data;
    },
    onSuccess: (data: any) => {
      toast({
        title: data.healthy ? 'Provider Connected' : 'Provider Test Failed',
        description: data.healthy
          ? `Response time: ${data.responseTime ?? 0}ms`
          : data.errorMessage || 'The provider did not pass the health check.',
        variant: data.healthy ? 'default' : 'destructive',
      });
      setTestingProvider(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Provider Test Failed',
        description: error.message || 'Provider health check failed.',
        variant: 'destructive',
      });
      setTestingProvider(null);
    },
  });

  const handleSyncProvider = (providerId: string) => {
    setSyncingProvider(providerId);
    syncProviderMutation.mutate(providerId);
  };

  const handleTestProvider = (providerId: string) => {
    setTestingProvider(providerId);
    testProviderMutation.mutate(providerId);
  };

  const getApiHealthStatus = (provider: Provider) => {
    if (!provider.enabled) {
      return {
        status: 'disabled',
        label: t('adminPanel.admin.providers.status.disabled', 'Disabled'),
        variant: 'outline' as const,
        className: 'border-slate-200 bg-slate-100 text-slate-700',
        icon: X,
      };
    }

    if (!provider.lastSyncAt) {
      return {
        status: 'pending',
        label: t('adminPanel.admin.providers.status.neverSynced', 'Never Synced'),
        variant: 'outline' as const,
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: Clock,
      };
    }

    const lastSync = new Date(provider.lastSyncAt);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    // If last sync was within 2x the sync interval, consider it healthy
    const healthyThreshold = (provider.syncIntervalMinutes / 60) * 2;

    if (hoursSinceSync < healthyThreshold) {
      return {
        status: 'healthy',
        label: t('adminPanel.admin.providers.status.healthy', 'Healthy'),
        variant: 'outline' as const,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: Check,
      };
    }

    return {
      status: 'warning',
      label: t('adminPanel.admin.providers.status.stale', 'Stale'),
      variant: 'outline' as const,
      className: 'border-orange-200 bg-orange-50 text-orange-700',
      icon: X,
    };
  };

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return t('admin.providers.never', 'Never');
    try {
      return formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true });
    } catch {
      return t('adminPanel.admin.providers.invalidDate', 'Invalid date');
    }
  };

  const providerList = providers || [];
  const enabledProviders = providerList.filter((provider) => provider.enabled).length;
  const healthyProviders = providerList.filter(
    (provider) => getApiHealthStatus(provider).status === 'healthy',
  ).length;
  const totalPackages = providerList.reduce(
    (sum, provider) => sum + (provider.totalPackages || 0),
    0,
  );

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-slate-900 dark:text-slate-100">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm text-slate-500">{t('adminPanel.admin.providers.loading', 'Loading providers...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {t('adminPanel.admin.providers.title', 'Provider Management')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t(
              'adminPanel.admin.providers.subtitle',
              'Manage eSIM providers, sync Packages, and configure integrations',
            )}
          </p>
        </div>
        <div className="flex w-full gap-2 md:w-auto">
          <Button
            className="w-full gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800 dark:hover:text-white md:w-auto"
            variant="outline"
            onClick={() => runPriceComparisonMutation.mutate()}
            disabled={runPriceComparisonMutation.isPending}
            data-testid="button-run-price-comparison"
          >
            {runPriceComparisonMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t('adminPanel.admin.providers.runPriceComparison', 'Run Price Comparison')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#168b80]">
                {t('adminPanel.admin.providers.totalProviders', 'Total Providers')}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">{providerList.length}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#58cbbb]">
              <Server className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                {t('adminPanel.admin.providers.enabledProviders', 'Enabled Providers')}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">{enabledProviders}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500">
              <Check className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-700">
                {t('adminPanel.admin.providers.healthyProviders', 'Healthy Providers')}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">{healthyProviders}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">
                {t('adminPanel.admin.providers.totalPackages', 'Total Packages')}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">{totalPackages.toLocaleString()}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>


      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-950">{t('adminPanel.admin.providers.cardTitle', 'Providers')}</CardTitle>
          <CardDescription className="text-slate-500">
            {t('adminPanel.admin.providers.cardDescription', 'View and manage all eSIM provider integrations')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!providers || providers.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Server className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">{t('adminPanel.admin.providers.noProviders', 'No providers configured')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-providers">
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-medium text-slate-600">{t('adminPanel.admin.providers.table.provider', 'Provider')}</TableHead>
                    <TableHead className="font-medium text-slate-600">{t('adminPanel.admin.providers.table.status', 'Status')}</TableHead>
                    <TableHead className="font-medium text-slate-600">{t('adminPanel.admin.providers.table.apiHealth', 'API Health')}</TableHead>
                    <TableHead className="font-medium text-slate-600">{t('adminPanel.admin.providers.table.lastSync', 'Last Sync')}</TableHead>
                    <TableHead className="font-medium text-slate-600">{t('adminPanel.admin.providers.table.packages', 'Packages')}</TableHead>
                    <TableHead className="font-medium text-slate-600">{t('adminPanel.admin.providers.table.syncInterval', 'Sync Interval')}</TableHead>
                    <TableHead className="font-medium text-slate-600">{t('adminPanel.admin.providers.table.margin', 'Margin')}</TableHead>
                    <TableHead className="text-right font-medium text-slate-600">
                      {t('adminPanel.admin.providers.table.actions', 'Actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((provider) => {
                    const healthStatus = getApiHealthStatus(provider);
                    const HealthIcon = healthStatus.icon;
                    const providerLabel = adminProviderLabel(provider);
                    const resellerLabel = resellerProviderLabel(provider);

                  return (
                    <TableRow
                      key={provider.id}
                      data-testid={`row-provider-${provider.id}`}
                      className="border-slate-200 hover:bg-slate-50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2 font-medium text-slate-950">
                              {providerLabel}
                              {provider.isPreferred && (
                                <Badge
                                  variant="default"
                                  className="gap-1 bg-[#58cbbb] text-slate-950 hover:bg-[#58cbbb]"
                                  data-testid={`badge-preferred-${provider.id}`}
                                >
                                  <Star className="h-3 w-3" />
                                  {t('adminPanel.admin.providers.preferred', 'Preferred')}
                                </Badge>
                              )}
                            </div>
                            {provider.name !== providerLabel && (
                              <div className="text-sm text-slate-500">{provider.name}</div>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
                                Reseller sees
                              </Badge>
                              <span className="font-medium text-slate-950">{resellerLabel}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            provider.enabled
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-100 text-slate-700'
                          }
                          data-testid={`badge-status-${provider.id}`}
                        >
                          {provider.enabled
                            ? t('adminPanel.admin.providers.enabled', 'Enabled')
                            : t('adminPanel.admin.providers.disabled', 'Disabled')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={healthStatus.variant}
                          className={`gap-1.5 ${healthStatus.className || ''}`}
                          data-testid={`badge-health-${provider.id}`}
                        >
                          <HealthIcon className="h-3 w-3" />
                          {healthStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-950" data-testid={`text-last-sync-${provider.id}`}>
                          {formatLastSync(provider.lastSyncAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-1 text-sm text-slate-950"
                          data-testid={`text-total-packages-${provider.id}`}
                        >
                          <Package className="h-3 w-3 text-slate-500" />
                          {provider.totalPackages?.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-slate-950">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {provider.syncIntervalMinutes < 60
                            ? `${provider.syncIntervalMinutes}m`
                            : `${(provider.syncIntervalMinutes / 60).toFixed(0)}h`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-950">
                          {parseFloat(provider.pricingMargin).toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                            onClick={() => handleTestProvider(provider.id)}
                            disabled={testingProvider === provider.id}
                            data-testid={`button-test-${provider.id}`}
                          >
                            {testingProvider === provider.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Activity className="mr-1 h-4 w-4" />
                                Test
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                            onClick={() => handleSyncProvider(provider.id)}
                            disabled={!provider.enabled || syncingProvider === provider.id}
                            data-testid={`button-sync-${provider.id}`}
                          >
                            {syncingProvider === provider.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="mr-1 h-4 w-4" />
                                {t('adminPanel.admin.providers.sync', 'Sync')}
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            onClick={() => {
                              setSelectedProvider(provider);
                              setConfigModalOpen(true);
                            }}
                            data-testid={`button-configure-${provider.id}`}
                          >
                            <SettingsIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProviderConfigModal
        provider={selectedProvider}
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
      />
    </div>
  );
}
