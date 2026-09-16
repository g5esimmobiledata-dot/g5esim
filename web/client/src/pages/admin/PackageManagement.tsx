import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Edit,
  MoreVertical,
  Database,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Package, Destination, Region } from '@shared/schema';
import { useTranslation } from '@/contexts/TranslationContext';

type PackageWithDetails = Package & {
  destination?: Destination | null;
  region?: Region | null;
};

export default function PackageManagement() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageWithDetails | null>(null);
  const [customImage, setCustomImage] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const itemsPerPage = 20;
  const { toast } = useToast();

  const { data: packages, isLoading } = useQuery<PackageWithDetails[]>({
    queryKey: ['/api/admin/packages'],
  });

  console.log('packages', packages);

  const { data: destinations } = useQuery<Destination[]>({
    queryKey: ['/api/destinations'],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ['/api/regions'],
  });

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings'],
  });
  const marginPercent = parseFloat(settings?.pricing_margin || '0');

  // Calculate unique counts
  // const uniqueCountries = packages
  //   ? new Set(packages.filter((p) => p.destinationId).map((p) => p.destinationId)).size
  //   : 0;
  const uniqueCountries =
    Array.isArray(packages) && packages.length > 0
      ? new Set(packages.filter((p) => p.destinationId).map((p) => p.destinationId)).size
      : 0;

  const uniqueRegions =
    Array.isArray(packages) && packages.length > 0
      ? new Set(packages.filter((p) => p.regionId).map((p) => p.regionId)).size
      : 0;

  console.log('uniqueCountries', uniqueCountries);

  // CSV Export Function
  const exportToCSV = () => {
    if (!packages || packages.length === 0) {
      toast({
        title: t('admin.packages.export.noDataTitle', 'No Data'),
        description: t(
          'admin.packages.export.noDataDescription',
          'There are no packages to export.',
        ),
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      t('admin.packages.export.headers.airaloId', 'Airalo ID'),
      t('admin.packages.export.headers.packageName', 'Package Name'),
      t('admin.packages.export.headers.countryRegion', 'Country/Region'),
      t('admin.packages.export.headers.type', 'Type'),
      t('admin.packages.export.headers.operator', 'Operator'),
      t('admin.packages.export.headers.data', 'Data'),
      t('admin.packages.export.headers.validity', 'Validity (Days)'),
      t('admin.packages.export.headers.voiceCredits', 'Voice Credits (Min)'),
      t('admin.packages.export.headers.smsCredits', 'SMS Credits'),
      t('admin.packages.export.headers.unlimited', 'Unlimited'),
      t('admin.packages.export.headers.airaloPrice', 'Airalo Price'),
      t('admin.packages.export.headers.customerPrice', 'Customer Price'),
      t('admin.packages.export.headers.currency', 'Currency'),
      t('admin.packages.export.headers.active', 'Active'),
      t('admin.packages.export.headers.popular', 'Popular'),
      t('admin.packages.export.headers.trending', 'Trending'),
      t('admin.packages.export.headers.recommended', 'Recommended'),
      t('admin.packages.export.headers.bestValue', 'Best Value'),
      t('admin.packages.export.headers.createdAt', 'Created At'),
      t('admin.packages.export.headers.updatedAt', 'Updated At'),
    ];

    const rows = packages.map((pkg) => [
      pkg.airaloId,
      pkg.title,
      pkg.destination?.name || pkg.region?.name || t('admin.packages.unknown', 'Unknown'),
      pkg.type,
      pkg.operator || '',
      pkg.dataAmount,
      pkg.validity,
      pkg.voiceCredits || 0,
      pkg.smsCredits || 0,
      pkg.isUnlimited ? t('common.yes', 'Yes') : t('common.no', 'No'),
      pkg.airaloPrice || '',
      pkg.price,
      pkg.currency,
      pkg.active ? t('common.yes', 'Yes') : t('common.no', 'No'),
      pkg.isPopular ? t('common.yes', 'Yes') : t('common.no', 'No'),
      pkg.isTrending ? t('common.yes', 'Yes') : t('common.no', 'No'),
      pkg.isRecommended ? t('common.yes', 'Yes') : t('common.no', 'No'),
      pkg.isBestValue ? t('common.yes', 'Yes') : t('common.no', 'No'),
      new Date(pkg.createdAt).toLocaleDateString(),
      new Date(pkg.updatedAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `esim-packages-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t('admin.packages.export.successTitle', 'Export Successful'),
      description: t(
        'admin.packages.export.successDescription',
        'Exported {{count}} packages to CSV.',
        { count: packages.length },
      ),
    });
  };

  const updateFlagsMutation = useMutation({
    mutationFn: async ({ packageId, flags }: { packageId: string; flags: Partial<Package> }) => {
      return await apiRequest('PUT', `/api/admin/packages/${packageId}/flags`, flags);
    },
    onMutate: async ({ packageId, flags }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/admin/packages'] });

      // Snapshot the previous value
      const previousPackages = queryClient.getQueryData<PackageWithDetails[]>([
        '/api/admin/packages',
      ]);

      // Optimistically update the cache
      if (previousPackages) {
        queryClient.setQueryData<PackageWithDetails[]>(
          ['/api/admin/packages'],
          previousPackages.map((pkg) => (pkg.id === packageId ? { ...pkg, ...flags } : pkg)),
        );
      }

      return { previousPackages };
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousPackages) {
        queryClient.setQueryData(['/api/admin/packages'], context.previousPackages);
      }
      toast({
        title: t('common.error', 'Error'),
        description:
          error.message || t('admin.packages.updateFlagsError', 'Failed to update package flags'),
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: t('common.success', 'Success'),
        description: t('admin.packages.updateFlagsSuccess', 'Package flags updated successfully'),
      });
    },
    onSettled: () => {
      // Refetch to ensure we're in sync
      queryClient.invalidateQueries({ queryKey: ['/api/admin/packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
    },
  });

  const updateCustomMutation = useMutation({
    mutationFn: async ({
      packageId,
      customImage,
      customDescription,
    }: {
      packageId: string;
      customImage: string;
      customDescription: string;
    }) => {
      return await apiRequest('PUT', `/api/admin/packages/${packageId}/custom`, {
        customImage,
        customDescription,
      });
    },
    onSuccess: () => {
      // Invalidate both admin and public package caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      setEditDialogOpen(false);
      setSelectedPackage(null);
      setCustomImage('');
      setCustomDescription('');
      toast({
        title: t('common.success', 'Success'),
        description: t(
          'admin.packages.updateCustomSuccess',
          'Package custom fields updated successfully',
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description:
          error.message || t('admin.packages.updateCustomError', 'Failed to update package'),
        variant: 'destructive',
      });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (packageId: string) => {
      return await apiRequest('DELETE', `/api/admin/packages/${packageId}`, {});
    },
    onSuccess: () => {
      // Invalidate both admin and public package caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: t('common.success', 'Success'),
        description: t('admin.packages.deleteSuccess', 'Package deleted successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin.packages.deleteError', 'Failed to delete package'),
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (pkg: PackageWithDetails, field: keyof Package, value: boolean) => {
    updateFlagsMutation.mutate({
      packageId: pkg.id,
      flags: { [field]: value },
    });
  };

  const openEditDialog = (pkg: PackageWithDetails) => {
    setSelectedPackage(pkg);
    setCustomImage(pkg.customImage || '');
    setCustomDescription(pkg.customDescription || '');
    setEditDialogOpen(true);
  };

  const handleSaveCustom = () => {
    if (!selectedPackage) return;
    updateCustomMutation.mutate({
      packageId: selectedPackage.id,
      customImage,
      customDescription,
    });
  };

  // ✅ SAFE VERSION - Check if packages is array FIRST
  const filteredPackages =
    Array.isArray(packages) && packages.length > 0
      ? packages.filter((pkg) => {
          const destinationName = pkg.destination?.name || pkg.region?.name || '';
          const matchesSearch =
            pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            destinationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pkg.id.toLowerCase().includes(searchQuery.toLowerCase());

          let matchesType = true;
          if (typeFilter === 'all') {
            matchesType = true;
          } else if (typeFilter === 'with-voice') {
            matchesType = (pkg.voiceCredits || 0) > 0;
          } else if (typeFilter === 'with-sms') {
            matchesType = (pkg.smsCredits || 0) > 0;
          } else if (typeFilter === 'data-only') {
            matchesType = (pkg.voiceCredits || 0) === 0 && (pkg.smsCredits || 0) === 0;
          } else {
            matchesType = pkg.type === typeFilter;
          }

          return matchesSearch && matchesType;
        })
      : [];

  const totalPages = Math.ceil((filteredPackages?.length || 0) / itemsPerPage);
  const paginatedPackages = filteredPackages?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="admin-light-surface admin-mode-surface p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            {t('admin.packages.title', 'Package Management')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('admin.packages.subtitle', 'Manage eSIM packages, tags, and custom content')}
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={exportToCSV}
          disabled={!packages || packages.length === 0}
          data-testid="button-export-packages"
        >
          <Download className="h-4 w-4" />
          {t('admin.packages.exportButton', 'Export Packages')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
        <Card className="border-0 bg-gradient-to-br from-teal-50 to-indigo-50 dark:from-teal-950/30 dark:to-indigo-950/30 shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-600 dark:text-teal-400">
                {t('admin.packages.stats.totalPackages', 'Total Packages')}
              </p>
              <h3
                className="text-2xl font-bold text-slate-900 dark:text-white mt-1"
                data-testid="text-total-packages"
              >
                {packages?.length || 0}
              </h3>
            </div>
          </div>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {t('admin.packages.stats.countries', 'Countries')}
              </p>
              <h3
                className="text-2xl font-bold text-slate-900 dark:text-white mt-1"
                data-testid="text-total-countries"
              >
                {uniqueCountries}
              </h3>
            </div>
          </div>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-teal-50 to-teal-50 dark:from-violet-950/30 dark:to-purple-950/30 shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-600 dark:text-teal-400">
                {t('admin.packages.stats.regions', 'Regions')}
              </p>
              <h3
                className="text-2xl font-bold text-slate-900 dark:text-white mt-1"
                data-testid="text-total-regions"
              >
                {uniqueRegions}
              </h3>
            </div>
          </div>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                {t('admin.packages.stats.popular', 'Popular')}
              </p>
              {/* <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {(packages ?? []).filter((p) => p.isPopular).length}
              </h3> */}

              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {Array.isArray(packages) ? packages.filter((p) => p.isPopular).length : 0}
              </h3>
            </div>
          </div>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30 shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                {t('admin.packages.stats.trending', 'Trending')}
              </p>
              <h3
                className="text-2xl font-bold text-slate-900 dark:text-white mt-1"
                data-testid="text-trending-count"
              >
                {Array.isArray(packages) ? packages.filter((p) => p.isTrending).length : 0}
              </h3>
            </div>
          </div>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-pink-600 dark:text-pink-400">
                {t('admin.packages.stats.recommended', 'Recommended')}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {Array.isArray(packages) ? packages.filter((p) => p.isRecommended).length : 0}
              </h3>
            </div>
          </div>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                {t('admin.packages.stats.bestValue', 'Best Value')}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {Array.isArray(packages) ? packages.filter((p) => p.isBestValue).length : 0}
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t(
                    'admin.packages.searchPlaceholder',
                    'Search by package name, destination, or ID...',
                  )}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 bg-slate-50 dark:bg-slate-900"
                  data-testid="input-search-packages"
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="bg-slate-50 dark:bg-slate-900"
                  data-testid="select-type-filter"
                >
                  <SelectValue placeholder={t('admin.packages.filterByType', 'Filter by type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('admin.packages.filters.allTypes', 'All Types')}
                  </SelectItem>
                  <SelectItem value="local">
                    {t('admin.packages.filters.local', 'Local')}
                  </SelectItem>
                  <SelectItem value="regional">
                    {t('admin.packages.filters.regional', 'Regional')}
                  </SelectItem>
                  <SelectItem value="global">
                    {t('admin.packages.filters.global', 'Global')}
                  </SelectItem>
                  <SelectItem value="with-voice">
                    {t('admin.packages.filters.withVoice', 'With Voice Calls')}
                  </SelectItem>
                  <SelectItem value="with-sms">
                    {t('admin.packages.filters.withSms', 'With SMS')}
                  </SelectItem>
                  <SelectItem value="data-only">
                    {t('admin.packages.filters.dataOnly', 'Data Only')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Packages Table */}
      <Card className="border-0 shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {/* Loading skeletons */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-md dark:text-white">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900">
                  <TableHead className="font-semibold w-10 text-sm">#</TableHead>
                  <TableHead className="font-semibold text-sm">
                    {t('admin.packages.table.country', 'Country')}
                  </TableHead>
                  <TableHead className="font-semibold text-sm w-24">
                    {t('admin.packages.table.operator', 'Operator')}
                  </TableHead>
                  <TableHead className="font-semibold text-sm">
                    {t('admin.packages.table.package', 'Package')}
                  </TableHead>
                  <TableHead className="font-semibold text-sm w-20 text-center">
                    {t('admin.packages.table.valid', 'Valid')}
                  </TableHead>
                  <TableHead className="font-semibold text-sm w-32 text-center">
                    {t('admin.packages.table.includes', 'Includes')}
                  </TableHead>
                  <TableHead className="font-semibold text-sm w-20 text-center">
                    {t('admin.packages.table.active', 'Active')}
                  </TableHead>
                  <TableHead className="font-semibold text-sm w-20 text-center">
                    {t('admin.packages.table.popular', 'Popular')}
                  </TableHead>
                  <TableHead className="font-semibold text-sm w-20 text-center">
                    {t('admin.packages.table.trend', 'Trend')}
                  </TableHead>
                  <TableHead className="font-semibold text-sm w-20 text-center">
                    {t('admin.packages.table.rec', 'Rec.')}
                  </TableHead>
                  <TableHead className="font-semibold text-sm w-20 text-center">
                    {t('admin.packages.table.value', 'Value')}
                  </TableHead>
                  <TableHead className="font-semibold text-sm w-28">
                    {t('admin.packages.table.date', 'Date')}
                  </TableHead>
                  <TableHead className="text-sm w-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPackages?.map((pkg, index) => {
                  const locationName =
                    pkg.destination?.name ||
                    pkg.region?.name ||
                    t('admin.packages.unknown', 'Unknown');
                  const countryCode = pkg.destination?.countryCode?.toLowerCase();

                  return (
                    <TableRow key={pkg.id} data-testid={`row-package-${pkg.id}`}>
                      <TableCell className="text-sm text-muted-foreground p-3">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="p-3">
                        <div className="flex items-center gap-2">
                          {countryCode && (
                            <img
                              src={`https://flagcdn.com/w160/${countryCode}.png`}
                              alt={locationName}
                              className="h-12 w-20 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                              {locationName}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{pkg.type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-3">
                        <div className="flex items-center gap-1.5">
                          {pkg.operatorImage && (
                            <img
                              src={pkg.operatorImage}
                              alt={pkg.operator || ''}
                              className="w-6 h-6 rounded object-cover flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <span className="text-sm truncate" title={pkg.operator || '---'}>
                            {pkg.operator || '---'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="p-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate" title={pkg.title}>
                            {pkg.title}
                          </p>
                          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {pkg.airaloId}
                          </code>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">
                              ${pkg.airaloPrice}
                            </span>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              →${pkg.price}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {pkg.validity}d
                        </Badge>
                      </TableCell>
                      <TableCell className="p-3">
                        <div className="flex flex-col gap-1">
                          <div
                            className="flex items-center gap-1.5"
                            title={
                              pkg.isUnlimited
                                ? t('admin.packages.unlimitedData', 'Unlimited Data')
                                : pkg.dataAmount
                            }
                          >
                            <Database className="h-4 w-4 text-teal-500" />
                            <span className="text-xs">
                              {pkg.isUnlimited ? '∞' : pkg.dataAmount}
                            </span>
                          </div>
                          {(pkg.voiceCredits || 0) > 0 && (
                            <div
                              className="flex items-center gap-1.5"
                              title={t('admin.packages.voiceMinutes', '{{minutes}} minutes', {
                                minutes: pkg.voiceCredits,
                              })}
                            >
                              <Phone className="h-4 w-4 text-green-500" />
                              <span className="text-xs">{pkg.voiceCredits}min</span>
                            </div>
                          )}
                          {(pkg.smsCredits || 0) > 0 && (
                            <div
                              className="flex items-center gap-1.5"
                              title={t('admin.packages.smsCount', '{{count}} SMS', {
                                count: pkg.smsCredits,
                              })}
                            >
                              <MessageSquare className="h-4 w-4 text-teal-500" />
                              <span className="text-xs">{pkg.smsCredits} SMS</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Switch
                          checked={pkg.active}
                          onCheckedChange={(checked) => handleToggle(pkg, 'active', checked)}
                          data-testid={`switch-active-${pkg.id}`}
                        />
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Switch
                          checked={pkg.isPopular}
                          onCheckedChange={(checked) => handleToggle(pkg, 'isPopular', checked)}
                          data-testid={`switch-popular-${pkg.id}`}
                        />
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Switch
                          checked={pkg.isTrending}
                          onCheckedChange={(checked) => handleToggle(pkg, 'isTrending', checked)}
                          data-testid={`switch-trending-${pkg.id}`}
                        />
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Switch
                          checked={pkg.isRecommended}
                          onCheckedChange={(checked) => handleToggle(pkg, 'isRecommended', checked)}
                          data-testid={`switch-recommended-${pkg.id}`}
                        />
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Switch
                          checked={pkg.isBestValue}
                          onCheckedChange={(checked) => handleToggle(pkg, 'isBestValue', checked)}
                          data-testid={`switch-best-value-${pkg.id}`}
                        />
                      </TableCell>
                      <TableCell className="p-3">
                        <div className="flex flex-col gap-1">
                          <div
                            className="text-xs font-medium text-slate-900 dark:text-white"
                            title={t('admin.packages.created', 'Created')}
                          >
                            {new Date(pkg.createdAt).toLocaleDateString()}
                          </div>
                          <div
                            className="text-xs text-muted-foreground whitespace-nowrap"
                            title={t('admin.packages.updated', 'Updated')}
                          >
                            {new Date(pkg.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-more-${pkg.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(pkg)}
                              data-testid={`menu-edit-${pkg.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {t('admin.packages.actions.edit', 'Edit Custom')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Empty State */}
            {!paginatedPackages || paginatedPackages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {t('admin.packages.noPackages', 'No packages found')}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t(
              'admin.packages.pagination.showing',
              'Showing {{start}} to {{end}} of {{total}} packages',
              {
                start: (currentPage - 1) * itemsPerPage + 1,
                end: Math.min(currentPage * itemsPerPage, filteredPackages?.length || 0),
                total: filteredPackages?.length || 0,
              },
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('admin.packages.pagination.previous', 'Previous')}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                })
                .map((page, i, arr) => (
                  <div key={page}>
                    {i > 0 && arr[i - 1] !== page - 1 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      data-testid={`button-page-${page}`}
                    >
                      {page}
                    </Button>
                  </div>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              {t('admin.packages.pagination.next', 'Next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-package">
          <DialogHeader>
            <DialogTitle>
              {t('admin.packages.editDialog.title', 'Edit Package Custom Fields')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'admin.packages.editDialog.description',
                'Customize the image and description for this package',
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedPackage.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPackage.destination?.name || selectedPackage.region?.name}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t('admin.packages.editDialog.customImage', 'Custom Image URL')}
                </label>
                <Input
                  value={customImage}
                  onChange={(e) => setCustomImage(e.target.value)}
                  placeholder={t(
                    'admin.packages.editDialog.customImagePlaceholder',
                    'https://example.com/image.jpg',
                  )}
                  data-testid="input-custom-image"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {t(
                    'admin.packages.editDialog.customImageHelp',
                    'Override the default destination/region image',
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t('admin.packages.editDialog.customDescription', 'Custom Description')}
                </label>
                <Textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder={t(
                    'admin.packages.editDialog.customDescriptionPlaceholder',
                    'Add a custom description...',
                  )}
                  rows={4}
                  data-testid="input-custom-description"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {t(
                    'admin.packages.editDialog.customDescriptionHelp',
                    'Add additional information about this package',
                  )}
                </p>
              </div>
              <Button
                onClick={handleSaveCustom}
                disabled={updateCustomMutation.isPending}
                className="w-full"
                data-testid="button-save-custom"
              >
                {updateCustomMutation.isPending
                  ? t('admin.packages.editDialog.saving', 'Saving...')
                  : t('admin.packages.editDialog.save', 'Save Custom Fields')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
