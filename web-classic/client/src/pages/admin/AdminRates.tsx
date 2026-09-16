import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Layers, Loader2, Pencil, Plus, Save, Search } from 'lucide-react';

type RateTable = {
  id: string;
  name: string;
  description?: string | null;
  defaultMarginPercent: string;
  status: string;
  packages: number;
  enabledPackages: number;
  assignedCustomers: number;
  updatedAt: string;
};

type RatePackage = {
  id: string;
  packageId: string;
  packageTitle: string;
  dataAmount: string;
  validity: number;
  countryName?: string | null;
  type?: string | null;
  providerName?: string | null;
  costPrice: string;
  sellingPrice: string;
  marginPercent?: string | null;
  isEnabled: boolean;
};

function formatMoney(value: string | number | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function marginFrom(cost: string | number, selling: string | number) {
  const c = Number(cost || 0);
  const s = Number(selling || 0);
  if (!Number.isFinite(c) || c <= 0) return '0.00';
  return (((s - c) / c) * 100).toFixed(2);
}

const lightInputClass =
  'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500';
const lightOutlineButtonClass =
  'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const tableSwitchClass = [
  'h-7 w-14 border border-slate-300 bg-rose-500 shadow-inner',
  'data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500',
  'data-[state=unchecked]:border-rose-300 data-[state=unchecked]:bg-rose-500',
  '[&>span]:h-6 [&>span]:w-6 [&>span]:bg-white [&>span]:shadow-md [&>span]:data-[state=checked]:translate-x-7',
].join(' ');

export default function AdminRates() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [newRateName, setNewRateName] = useState('');
  const [newRateDescription, setNewRateDescription] = useState('');
  const [newRateMargin, setNewRateMargin] = useState('15');
  const [selectedRateId, setSelectedRateId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [bulkMargin, setBulkMargin] = useState('');
  const [editingPackageId, setEditingPackageId] = useState('');
  const [editingPrice, setEditingPrice] = useState('');

  const { data: ratesData, isLoading: isRatesLoading } = useQuery({
    queryKey: ['/api/admin/rates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/rates');
      return res.json();
    },
  });

  const rates: RateTable[] = ratesData?.data?.rates || [];
  const selectedRate = useMemo(
    () => rates.find((rate) => rate.id === selectedRateId) || rates[0],
    [rates, selectedRateId],
  );

  useEffect(() => {
    if (!selectedRateId && rates[0]?.id) setSelectedRateId(rates[0].id);
  }, [rates, selectedRateId]);

  const { data: packagesData, isLoading: isPackagesLoading } = useQuery({
    queryKey: ['/api/admin/rates/packages', selectedRate?.id, page, search],
    enabled: Boolean(selectedRate?.id),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
        search,
      });
      const res = await apiRequest('GET', `/api/admin/rates/${selectedRate!.id}/packages?${params.toString()}`);
      return res.json();
    },
  });

  const packages: RatePackage[] = packagesData?.data?.packages || [];
  const pagination = packagesData?.data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/rates', {
        name: newRateName,
        description: newRateDescription,
        marginPercent: Number(newRateMargin || 0),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rates'] });
      setSelectedRateId(data.data?.id || '');
      setCreateOpen(false);
      setNewRateName('');
      setNewRateDescription('');
      setNewRateMargin('15');
      toast({ title: 'Rate created', description: 'Package prices were generated from provider cost.' });
    },
    onError: (error: any) => {
      toast({ title: 'Create failed', description: error.message || 'Could not create rate table', variant: 'destructive' });
    },
  });

  const applyMarginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/admin/rates/${selectedRate!.id}/apply-margin`, {
        marginPercent: Number(bulkMargin || 0),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rates/packages'] });
      toast({ title: 'Margin applied', description: `${data.data?.updated || 0} package prices were refreshed.` });
    },
    onError: (error: any) => {
      toast({ title: 'Margin failed', description: error.message || 'Could not apply margin', variant: 'destructive' });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ packageId, sellingPrice, isEnabled }: { packageId: string; sellingPrice?: string; isEnabled?: boolean }) => {
      const payload: Record<string, unknown> = {};
      if (sellingPrice !== undefined) payload.sellingPrice = sellingPrice;
      if (isEnabled !== undefined) payload.isEnabled = isEnabled;
      const res = await apiRequest('PATCH', `/api/admin/rates/${selectedRate!.id}/packages/${packageId}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rates/packages'] });
      setEditingPackageId('');
      setEditingPrice('');
      toast({ title: 'Package rate saved', description: 'The package price was updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Save failed', description: error.message || 'Could not update package rate', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Rates</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Create named package rate tables from provider cost and assign them to Agents or Resellers.
          </p>
        </div>
        <Button
          className="w-full gap-2 bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae] md:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Rate
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
        <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-950">Rate Tables</CardTitle>
            <CardDescription className="text-slate-500">{rates.length} saved rate tables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isRatesLoading ? (
              <div className="h-24 animate-pulse rounded-md bg-slate-100" />
            ) : rates.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Create your first rate table.
              </div>
            ) : (
              rates.map((rate) => (
                <button
                  key={rate.id}
                  type="button"
                  onClick={() => {
                    setSelectedRateId(rate.id);
                    setPage(1);
                  }}
                  className={cn(
                    'w-full rounded-md border p-3 text-left text-slate-950 transition-colors',
                    selectedRate?.id === rate.id
                      ? 'border-[#58cbbb] bg-teal-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{rate.name}</p>
                      <p className="text-xs text-slate-600">
                        {Number(rate.defaultMarginPercent || 0).toFixed(2)}% default margin
                      </p>
                    </div>
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                      {rate.enabledPackages}/{rate.packages}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    Assigned to {rate.assignedCustomers} account{rate.assignedCustomers === 1 ? '' : 's'}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-950">
                  <Layers className="h-5 w-5 text-[#168b80]" />
                  {selectedRate?.name || 'Select Rate'}
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Provider cost plus margin becomes the assigned Agent or Reseller package price.
                </CardDescription>
              </div>
              {selectedRate && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative w-full sm:w-36">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bulkMargin}
                      onChange={(event) => setBulkMargin(event.target.value)}
                      placeholder="Margin"
                      className={cn('pr-8', lightInputClass)}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                      %
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className={lightOutlineButtonClass}
                    onClick={() => applyMarginMutation.mutate()}
                    disabled={!bulkMargin || applyMarginMutation.isPending}
                  >
                    {applyMarginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Apply Margin
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedRate ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                No rate table selected.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search Packages, country, provider"
                    className={cn('pl-9', lightInputClass)}
                  />
                </div>

                <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                        <TableHead className="font-semibold text-slate-700">Package</TableHead>
                        <TableHead className="font-semibold text-slate-700">Provider</TableHead>
                        <TableHead className="font-semibold text-slate-700">Cost</TableHead>
                        <TableHead className="font-semibold text-slate-700">Margin (%)</TableHead>
                        <TableHead className="font-semibold text-slate-700">Rate Price</TableHead>
                        <TableHead className="font-semibold text-slate-700">Status</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isPackagesLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                            Loading Packages...
                          </TableCell>
                        </TableRow>
                      ) : packages.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                            No package rates found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        packages.map((pkg) => {
                          const isEditing = editingPackageId === pkg.packageId;
                          const displayMargin = pkg.marginPercent || marginFrom(pkg.costPrice, pkg.sellingPrice);

                          return (
                            <TableRow key={pkg.id} className="border-slate-200 hover:bg-slate-50">
                              <TableCell>
                                <div>
                                  <p className="font-semibold text-slate-950">{pkg.packageTitle}</p>
                                  <p className="text-xs font-medium text-slate-600">
                                    {pkg.countryName || pkg.type} | {pkg.dataAmount} | {pkg.validity} days
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-slate-900">{pkg.providerName || 'Provider'}</TableCell>
                              <TableCell className="font-semibold text-slate-950">{formatMoney(pkg.costPrice)}</TableCell>
                              <TableCell className="font-medium text-slate-900">{Number(displayMargin || 0).toFixed(2)}%</TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={editingPrice}
                                    onChange={(event) => setEditingPrice(event.target.value)}
                                    className={cn('w-28', lightInputClass)}
                                  />
                                ) : (
                                  <span className="font-semibold text-[#168b80]">
                                    {formatMoney(pkg.sellingPrice)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={pkg.isEnabled}
                                  onCheckedChange={(checked) =>
                                    updatePackageMutation.mutate({
                                      packageId: pkg.packageId,
                                      isEnabled: checked,
                                    })
                                  }
                                  disabled={updatePackageMutation.isPending}
                                  className={tableSwitchClass}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <Button
                                    size="sm"
                                    className="bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]"
                                    onClick={() =>
                                      updatePackageMutation.mutate({
                                        packageId: pkg.packageId,
                                        sellingPrice: editingPrice,
                                      })
                                    }
                                    disabled={!editingPrice || updatePackageMutation.isPending}
                                  >
                                    <Save className="mr-2 h-4 w-4" />
                                    Save
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={lightOutlineButtonClass}
                                    onClick={() => {
                                      setEditingPackageId(pkg.packageId);
                                      setEditingPrice(String(pkg.sellingPrice));
                                    }}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    {pagination.total || 0} Packages
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={lightOutlineButtonClass}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-slate-700">
                      Page {pagination.page || page} of {pagination.totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className={lightOutlineButtonClass}
                      onClick={() => setPage((value) => value + 1)}
                      disabled={page >= (pagination.totalPages || 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-950">
          <DialogHeader>
            <DialogTitle className="text-slate-950">Create Rate Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Rate Name</label>
              <Input
                value={newRateName}
                onChange={(event) => setNewRateName(event.target.value)}
                placeholder="Agent Level 1"
                className={cn('mt-2', lightInputClass)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Description</label>
              <Input
                value={newRateDescription}
                onChange={(event) => setNewRateDescription(event.target.value)}
                placeholder="Optional internal note"
                className={cn('mt-2', lightInputClass)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Margin Percentage</label>
              <div className="relative mt-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newRateMargin}
                  onChange={(event) => setNewRateMargin(event.target.value)}
                  placeholder="15"
                  className={cn('pr-8', lightInputClass)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                  %
                </span>
              </div>
            </div>
            <Button
              className="w-full bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]"
              onClick={() => createMutation.mutate()}
              disabled={!newRateName.trim() || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Rate Table
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
