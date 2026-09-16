import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Loader2,
  Package,
  Pencil,
  Percent,
  Search,
  SlidersHorizontal,
  ShoppingCart,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
import { resellerProviderDisplayName } from '@shared/providerNames';

type PricePackage = {
  packageId: string;
  slug: string;
  title: string;
  providerId?: string | null;
  providerName?: string | null;
  providerSlug?: string | null;
  destinationName?: string | null;
  regionName?: string | null;
  type: string;
  dataAmount: string;
  validity: number;
  publicRetailPrice: number;
  wholesaleCost: number;
  sellingPrice: number;
  markupPercent: number;
  profit: number;
  isEnabled: boolean;
  resellerEnabled: boolean;
  platformEnabled: boolean;
  providerEnabled: boolean;
  providerPlatformEnabled: boolean;
  isBestPrice: boolean;
  hasCustomPrice: boolean;
};

type ProviderControl = {
  providerId: string;
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
  platformEnabled: boolean;
  totalPackages: number;
  activePackages: number;
  customPrices: number;
  resellerPriceFrom?: string | null;
};

type ProvidersResponse = {
  providers: ProviderControl[];
};

type PriceResponse = {
  packages: PricePackage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: {
    totalPackages: number;
    activePackages: number;
    disabledPackages: number;
    customPrices: number;
  };
};

type ResellerStatsResponse = {
  totals?: {
    totalOrders: number;
    completedOrders: number;
    totalSpend: number;
    totalProfit: number;
    walletBalance: number;
  };
};

function formatMoney(amount: string | number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount || 0));
}

function displayProviderName(provider?: {
  slug?: string | null;
  providerSlug?: string | null;
  name?: string | null;
  providerName?: string | null;
}) {
  return resellerProviderDisplayName(
    provider?.providerSlug || provider?.slug,
    provider?.providerName || provider?.name,
  );
}

export default function ResellerPriceCost() {
  const { toast } = useToast();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('price-low');
  const [page, setPage] = useState(1);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkMarkup, setBulkMarkup] = useState('');
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState('');

  const { data, isLoading, isFetching } = useQuery<PriceResponse>({
    queryKey: ['/api/reseller/prices', { page, limit: 50, search, status: statusFilter, providerId: providerFilter, sort: sortFilter }],
    placeholderData: keepPreviousData,
  });

  const { data: providersData } = useQuery<ProvidersResponse>({
    queryKey: ['/api/reseller/providers'],
  });
  const { data: resellerStats } = useQuery<ResellerStatsResponse>({
    queryKey: ['/api/reseller/stats'],
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({
      packageId,
      sellingPrice,
      isEnabled,
    }: {
      packageId: string;
      sellingPrice?: string;
      isEnabled?: boolean;
    }) => {
      const payload: { sellingPrice?: string; isEnabled?: boolean } = {};
      if (sellingPrice !== undefined) payload.sellingPrice = sellingPrice;
      if (isEnabled !== undefined) payload.isEnabled = isEnabled;

      const res = await apiRequest('PATCH', `/api/reseller/prices/${packageId}`, payload);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could Not Update Package');
      return data.data;
    },
    onSuccess: () => {
      setEditingPackageId(null);
      setEditingPrice('');
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/prices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/stats'] });
      toast({ title: 'Package Updated', description: 'Reseller Package Settings Have Been Saved.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Could Not Save This Package.',
        variant: 'destructive',
      });
    },
  });

  const updateProviderMutation = useMutation({
    mutationFn: async ({
      providerId,
      isEnabled,
    }: {
      providerId: string;
      isEnabled: boolean;
    }) => {
      const res = await apiRequest('PATCH', `/api/reseller/providers/${providerId}`, { isEnabled });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could Not Update Catalog Source');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/prices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/stats'] });
      toast({ title: 'Source Updated', description: 'Catalog Source Availability Has Been Saved.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Source Update Failed',
        description: error.message || 'Could Not Save Catalog Source Availability.',
        variant: 'destructive',
      });
    },
  });

  const bulkMarkupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/reseller/prices/bulk-markup', {
        markupPercent: bulkMarkup,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could Not Apply Markup');
      return data.data;
    },
    onSuccess: (result) => {
      setBulkDialogOpen(false);
      setBulkMarkup('');
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/prices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/stats'] });
      toast({
        title: 'Bulk Markup Applied',
        description: `${result.updated} Package Selling Prices Were Updated.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk Update Failed',
        description: error.message || 'Could Not Apply Markup.',
        variant: 'destructive',
      });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      const res = await apiRequest('POST', '/api/reseller/prices/bulk-status', { isEnabled });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could Not Update Package Status');
      return data.data as { updated: number; isEnabled: boolean };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/prices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/stats'] });
      toast({
        title: result.isEnabled ? 'All Packages Enabled' : 'All Packages Disabled',
        description: `${result.updated} Reseller Packages Were Updated.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk Status Update Failed',
        description: error.message || 'Could Not Update Packages.',
        variant: 'destructive',
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (csv: string) => {
      const res = await apiRequest('POST', '/api/reseller/prices/import', { csv });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Import Failed');
      return data.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/prices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/stats'] });
      toast({
        title: 'Packages Imported',
        description: `${result.updated} Updated, ${result.skipped} Skipped.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Import Failed',
        description: error.message || 'Could Not Import Reseller Packages.',
        variant: 'destructive',
      });
    },
  });

  const exportPrices = async () => {
    try {
      const res = await fetch('/api/reseller/prices/export', { credentials: 'include' });
      if (!res.ok) throw new Error('Could Not Export Packages');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reseller-packages-price-cost.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Export Ready', description: 'Reseller Package CSV Has Been Downloaded.' });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Could Not Export Packages.',
        variant: 'destructive',
      });
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    importMutation.mutate(await file.text());
  };

  const startEdit = (pkg: PricePackage) => {
    setEditingPackageId(pkg.packageId);
    setEditingPrice(pkg.sellingPrice.toFixed(2));
  };

  const packages = data?.packages || [];
  const providers = providersData?.providers || [];
  const pagination = data?.pagination;
  const stats = data?.stats || {
    totalPackages: pagination?.total || 0,
    activePackages: packages.filter((pkg) => pkg.isEnabled).length,
    disabledPackages: packages.filter((pkg) => !pkg.isEnabled).length,
    customPrices: packages.filter((pkg) => pkg.hasCustomPrice).length,
  };

  const orderTotals = resellerStats?.totals;

  const resetToFirstPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge className="border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300" variant="outline">
              Account Type: WhiteLabel
            </Badge>
            <Badge variant="outline">Package Manager</Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Cost & Retail Price
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
            Activate Packages For Your Reseller Catalog, Disable Packages You Do Not Sell, And Manage Your Retail Selling Prices.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            onClick={() => bulkStatusMutation.mutate(true)}
            disabled={bulkStatusMutation.isPending}
          >
            {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Enable All Packages
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
            onClick={() => bulkStatusMutation.mutate(false)}
            disabled={bulkStatusMutation.isPending}
          >
            {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Disable All Packages
          </Button>
          <Button
            className="gap-2 bg-blue-600 text-white shadow-lg shadow-blue-950/20 hover:bg-blue-700"
            onClick={() => setBulkDialogOpen(true)}
          >
            <Percent className="h-4 w-4" />
            Markup %
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportPrices}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => importInputRef.current?.click()}
            disabled={importMutation.isPending}
          >
            <Upload className="h-4 w-4" />
              {importMutation.isPending ? 'Importing...' : 'Import'}
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

      <Card className="overflow-hidden border-blue-300/40 bg-blue-50 text-blue-950 shadow-sm dark:border-blue-500/30 dark:bg-blue-950/35 dark:text-blue-50">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Apply Margin Markup % To All eSIM Packages</CardTitle>
              <CardDescription className="mt-1 max-w-3xl text-blue-800/80 dark:text-blue-100/75">
                Update Every Active Package Selling Price From Your Assigned Reseller Cost In One Bulk Action.
                IPTV And eRoaming Use Their Own Service Pricing Pages.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              onClick={() => bulkStatusMutation.mutate(true)}
              disabled={bulkStatusMutation.isPending}
            >
              {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Enable All Packages
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
              onClick={() => bulkStatusMutation.mutate(false)}
              disabled={bulkStatusMutation.isPending}
            >
              {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Disable All Packages
            </Button>
            <Button
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setBulkDialogOpen(true)}
            >
              <Percent className="h-4 w-4" />
              Apply To All Packages
            </Button>
            <Button variant="outline" asChild>
              <a href="/reseller/iptv">IPTV Services</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/reseller/virtual-numbers">eRoaming</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Packages</CardDescription>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle>{stats.totalPackages}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Active For Reseller</CardDescription>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-primary">{stats.activePackages}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Disabled</CardDescription>
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle>{stats.disabledPackages}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Custom Prices</CardDescription>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle>{stats.customPrices}</CardTitle>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {providers.map((provider) => (
          <Card key={provider.providerId} className={!provider.isEnabled ? 'opacity-75' : undefined}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardDescription>Packages Available</CardDescription>
                <CardTitle className="text-base">{displayProviderName(provider)}</CardTitle>
              </div>
              <Switch
                checked={provider.isEnabled}
                onCheckedChange={(checked) =>
                  updateProviderMutation.mutate({
                    providerId: provider.providerId,
                    isEnabled: checked,
                  })
                }
                disabled={updateProviderMutation.isPending || !provider.platformEnabled}
                className="data-[state=checked]:bg-blue-600"
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {provider.activePackages} / {provider.totalPackages} Active
                </p>
                <Badge
                  variant={provider.isEnabled ? 'default' : 'secondary'}
                  className={provider.isEnabled ? 'bg-blue-600 text-white hover:bg-blue-600' : undefined}
                >
                  {provider.isEnabled ? 'Enabled' : 'Off'}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Reseller Cost From</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {provider.resellerPriceFrom ? formatMoney(provider.resellerPriceFrom) : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Real Order Revenue</CardDescription>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle>{formatMoney(orderTotals?.totalSpend || 0)}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              From {orderTotals?.totalOrders || 0} Reseller Orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Real Order Profit</CardDescription>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-blue-600 dark:text-blue-300">
              {formatMoney(orderTotals?.totalProfit || 0)}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Completed Order Retail Minus Reseller Cost
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Completed Orders</CardDescription>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle>{orderTotals?.completedOrders || 0}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Real Sales, Not Page Catalog Margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Statistics Page</CardDescription>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <a href="/reseller/statistics">
                <BarChart3 className="h-4 w-4" />
                Open Statistics
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>All Packages</CardTitle>
              <CardDescription>
                Reseller Cost Is The Admin Price Assigned To You. Reseller Selling Is Your Retail Customer Price.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <div className="relative flex-1 xl:w-80">
                {isFetching ? (
                  <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  className="pl-9"
                  placeholder="Search Packages..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetToFirstPage();
                  }}
                />
              </div>
              <Select
                value={providerFilter}
                onValueChange={(value) => {
                  setProviderFilter(value);
                  resetToFirstPage();
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.providerId} value={provider.providerId}>
                      {displayProviderName(provider)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  resetToFirstPage();
                }}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="disabled">Disabled Only</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortFilter}
                onValueChange={(value) => {
                  setSortFilter(value);
                  resetToFirstPage();
                }}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price-low">Price</SelectItem>
                  <SelectItem value="price-high">Higher Price</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : packages.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No Packages Found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Reseller Cost</TableHead>
                  <TableHead>Store Front Retail Price</TableHead>
                  <TableHead>Markup</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => {
                  const isEditing = editingPackageId === pkg.packageId;
                  const statusLabel = pkg.isEnabled
                    ? 'Active'
                    : !pkg.providerEnabled
                      ? 'Source Off'
                      : pkg.platformEnabled
                      ? 'Disabled'
                      : 'Admin Disabled';

                  return (
                    <TableRow key={pkg.packageId}>
                      <TableCell className="min-w-[260px]">
                        <p className="font-semibold text-slate-900 dark:text-white">{pkg.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {pkg.dataAmount} | {pkg.validity} Days | {pkg.slug}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {pkg.hasCustomPrice && <Badge variant="secondary">Custom Price</Badge>}
                          {pkg.isBestPrice && <Badge variant="outline">Best Price</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{displayProviderName(pkg)}</p>
                        <p className="text-sm text-muted-foreground">
                          {pkg.destinationName || pkg.regionName || 'Global'} | {pkg.type}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{formatMoney(pkg.wholesaleCost)}</p>
                        <p className="text-xs text-muted-foreground">Your Reseller Cost</p>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            className="h-9 w-32"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingPrice}
                            onChange={(event) => setEditingPrice(event.target.value)}
                          />
                        ) : (
                          <>
                            <p className="font-semibold text-blue-600 dark:text-blue-300">{formatMoney(pkg.sellingPrice)}</p>
                            <p className="text-xs text-muted-foreground">
                              Public {formatMoney(pkg.publicRetailPrice)}
                            </p>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{Number(pkg.markupPercent || 0).toFixed(2)}%</p>
                        <p className="text-xs text-blue-600 dark:text-blue-300">
                          {formatMoney(pkg.profit)} Profit
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={pkg.isEnabled}
                            onCheckedChange={(checked) =>
                              updatePackageMutation.mutate({
                                packageId: pkg.packageId,
                                isEnabled: checked,
                              })
                            }
                            disabled={updatePackageMutation.isPending || !pkg.platformEnabled || !pkg.providerEnabled}
                            className="data-[state=checked]:bg-blue-600"
                          />
                          <div>
                            <Badge
                              variant={pkg.isEnabled ? 'default' : 'secondary'}
                              className={pkg.isEnabled ? 'bg-blue-600 text-white hover:bg-blue-600' : undefined}
                            >
                              {statusLabel}
                            </Badge>
                            {!pkg.platformEnabled && (
                              <p className="mt-1 text-xs text-muted-foreground">Hidden By Admin</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() =>
                                updatePackageMutation.mutate({
                                  packageId: pkg.packageId,
                                  sellingPrice: editingPrice,
                                })
                              }
                              disabled={updatePackageMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingPackageId(null);
                                setEditingPrice('');
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => startEdit(pkg)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} | {pagination.total} Packages
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Margin Markup % To All Packages</DialogTitle>
            <DialogDescription>
              Apply One Margin Markup Percentage To Every Package In This Account. Retail Selling Price Is Calculated From The Assigned Cost.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reseller-bulk-markup">Margin Markup %</Label>
              <Input
                id="reseller-bulk-markup"
                type="number"
                min="0"
                step="0.01"
                placeholder="Example: 20"
                value={bulkMarkup}
                onChange={(event) => setBulkMarkup(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Example: 20% Changes A $10.00 Assigned Cost Into A $12.00 Retail Selling Price.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => bulkMarkupMutation.mutate()}
              disabled={bulkMarkupMutation.isPending || !bulkMarkup}
            >
              {bulkMarkupMutation.isPending ? 'Applying...' : 'Apply Margin To All Packages'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
