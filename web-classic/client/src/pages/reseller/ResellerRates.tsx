import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { resellerProviderDisplayName } from '@shared/providerNames';
import { ChevronLeft, ChevronRight, Layers, Loader2, Pencil, Plus, Save, Search, UserCheck } from 'lucide-react';

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
  providerSlug?: string | null;
  costPrice: string;
  sellingPrice: string;
  marginPercent?: string | null;
  isEnabled: boolean;
};

type AssignableAccount = {
  id: string;
  displayUserId?: number | null;
  name?: string | null;
  email: string;
  role: 'agent' | 'reseller';
  isBlocked?: boolean;
  isDeleted?: boolean;
  rateTableId?: string | null;
  rateName?: string | null;
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

function displayProviderName(pkg: RatePackage) {
  return resellerProviderDisplayName(pkg.providerSlug, pkg.providerName);
}

function roleLabel(role?: string | null) {
  return role === 'agent' ? 'Agent' : role === 'reseller' ? 'Sub Reseller' : 'Account';
}

export default function ResellerRates() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [newRateName, setNewRateName] = useState('');
  const [newRateDescription, setNewRateDescription] = useState('');
  const [newRateMargin, setNewRateMargin] = useState('10');
  const [selectedRateId, setSelectedRateId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [bulkMarkup, setBulkMarkup] = useState('');
  const [editingPackageId, setEditingPackageId] = useState('');
  const [editingPrice, setEditingPrice] = useState('');

  const { data: ratesData, isLoading: isRatesLoading } = useQuery({
    queryKey: ['/api/reseller/rates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/reseller/rates');
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

  const { data: accountsData } = useQuery({
    queryKey: ['/api/reseller/rates/assignable-accounts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/reseller/rates/assignable-accounts');
      return res.json();
    },
  });

  const accounts: AssignableAccount[] = accountsData?.data?.accounts || [];

  const { data: packagesData, isLoading: isPackagesLoading } = useQuery({
    queryKey: ['/api/reseller/rates/packages', selectedRate?.id, page, search],
    enabled: Boolean(selectedRate?.id),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
        search,
      });
      const res = await apiRequest('GET', `/api/reseller/rates/${selectedRate!.id}/packages?${params.toString()}`);
      return res.json();
    },
  });

  const packages: RatePackage[] = packagesData?.data?.packages || [];
  const pagination = packagesData?.data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/reseller/rates', {
        name: newRateName,
        description: newRateDescription,
        marginPercent: Number(newRateMargin || 0),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Could not create rate table');
      return json;
    },
    onSuccess: (json) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/rates'] });
      setSelectedRateId(json.data?.id || '');
      setCreateOpen(false);
      setNewRateName('');
      setNewRateDescription('');
      setNewRateMargin('10');
      toast({ title: 'Rate created', description: 'Prices were generated from your Cost & Retail Price table.' });
    },
    onError: (error: any) => {
      toast({ title: 'Create failed', description: error.message || 'Could not create rate table', variant: 'destructive' });
    },
  });

  const applyMarkupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/reseller/rates/${selectedRate!.id}/apply-margin`, {
        marginPercent: Number(bulkMarkup || 0),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Could not apply markup');
      return json;
    },
    onSuccess: (json) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/rates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/rates/packages'] });
      toast({ title: 'Markup applied', description: `${json.data?.updated || 0} package prices were refreshed.` });
    },
    onError: (error: any) => {
      toast({ title: 'Markup failed', description: error.message || 'Could not apply markup', variant: 'destructive' });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ packageId, sellingPrice, isEnabled }: { packageId: string; sellingPrice?: string; isEnabled?: boolean }) => {
      const payload: Record<string, unknown> = {};
      if (sellingPrice !== undefined) payload.sellingPrice = sellingPrice;
      if (isEnabled !== undefined) payload.isEnabled = isEnabled;
      const res = await apiRequest('PATCH', `/api/reseller/rates/${selectedRate!.id}/packages/${packageId}`, payload);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Could not update package rate');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/rates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/rates/packages'] });
      setEditingPackageId('');
      setEditingPrice('');
      toast({ title: 'Package rate saved', description: 'The package customization price was updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Save failed', description: error.message || 'Could not update package rate', variant: 'destructive' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAccountId) throw new Error('Select an Agent or Sub Reseller');
      const res = await apiRequest('POST', `/api/reseller/rates/${selectedRate!.id}/assign`, {
        customerId: selectedAccountId,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Could not assign rate');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/rates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/rates/assignable-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/customers'] });
      toast({
        title: 'Rate assigned',
        description: selectedAccount
          ? `${selectedRate?.name} was applied to ${selectedAccount.name || selectedAccount.email}.`
          : 'The selected rate was applied.',
      });
    },
    onError: (error: any) => {
      toast({ title: 'Assignment failed', description: error.message || 'Could not assign rate', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge variant="outline" className="mb-3">Agents / Sub Reseller Pricing</Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Resellers/Agents Rates</h1>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
            Create rates only for Agents and Sub Resellers. These prices start from your Cost & Retail Price table, then apply markup.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Rate
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[330px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Rate Tables</CardTitle>
            <CardDescription>{rates.length} Agents / Sub Reseller rate tables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isRatesLoading ? (
              <div className="h-24 rounded-md bg-muted animate-pulse" />
            ) : rates.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Create your first Resellers/Agents rate table.
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
                    'w-full rounded-md border p-3 text-left transition-colors',
                    selectedRate?.id === rate.id
                      ? 'border-primary bg-primary/10'
                      : 'hover:border-primary/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{rate.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(rate.defaultMarginPercent || 0).toFixed(2)}% default markup
                      </p>
                    </div>
                    <Badge variant="outline">{rate.enabledPackages}/{rate.packages}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Assigned to {rate.assignedCustomers} account{rate.assignedCustomers === 1 ? '' : 's'}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    {selectedRate?.name || 'Select Rate'}
                  </CardTitle>
                  <CardDescription>
                    Your Cost & Retail Price plus markup becomes the package cost for the selected Agent or Sub Reseller.
                  </CardDescription>
                </div>
                {selectedRate && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative w-full sm:w-36">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bulkMarkup}
                        onChange={(event) => setBulkMarkup(event.target.value)}
                        placeholder="Markup"
                        className="pr-8"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                        %
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => applyMarkupMutation.mutate()}
                      disabled={!bulkMarkup || applyMarkupMutation.isPending}
                    >
                      {applyMarkupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Apply Markup
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            {selectedRate && (
              <CardContent className="border-t pt-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Agent or Sub Reseller" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.length === 0 ? (
                        <SelectItem value="no-accounts" disabled>
                          No Agent or Sub Reseller accounts
                        </SelectItem>
                      ) : (
                        accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name || account.email} | {roleLabel(account.role)}
                            {account.rateName ? ` | Current: ${account.rateName}` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => assignMutation.mutate()} disabled={!selectedAccountId || assignMutation.isPending}>
                    {assignMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="mr-2 h-4 w-4" />
                    )}
                    Apply to Account
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <CardTitle>Package Customization Prices</CardTitle>
                  <CardDescription>Edit one Agents / Sub Reseller package price at a time after applying the default markup.</CardDescription>
                </div>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search Packages Or Country"
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedRate ? (
                <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
                  No rate table selected.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Package</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Your Retail Price</TableHead>
                          <TableHead>Markup (%)</TableHead>
                          <TableHead>Agents / Sub Reseller Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isPackagesLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                              Loading Packages...
                            </TableCell>
                          </TableRow>
                        ) : packages.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                              No package rates found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          packages.map((pkg) => {
                            const isEditing = editingPackageId === pkg.packageId;
                            const displayMarkup = pkg.marginPercent || marginFrom(pkg.costPrice, pkg.sellingPrice);

                            return (
                              <TableRow key={pkg.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{pkg.packageTitle}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {pkg.countryName || pkg.type} | {pkg.dataAmount} | {pkg.validity} days
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground">Source</p>
                                    <p className="font-medium">{displayProviderName(pkg)}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">{formatMoney(pkg.costPrice)}</TableCell>
                                <TableCell>{Number(displayMarkup || 0).toFixed(2)}%</TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      min={Number(pkg.costPrice || 0)}
                                      step="0.01"
                                      value={editingPrice}
                                      onChange={(event) => setEditingPrice(event.target.value)}
                                      className="w-32"
                                    />
                                  ) : (
                                    <span className="font-semibold text-primary">
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
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  {isEditing ? (
                                    <Button
                                      size="sm"
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

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{pagination.total || 0} Packages</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {pagination.page || page} of {pagination.totalPages || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
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
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Resellers/Agents Rate Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rate Name</label>
              <Input value={newRateName} onChange={(event) => setNewRateName(event.target.value)} placeholder="Agent Level 1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={newRateDescription}
                onChange={(event) => setNewRateDescription(event.target.value)}
                placeholder="Optional internal note"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Markup Percentage</label>
              <div className="relative mt-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newRateMargin}
                  onChange={(event) => setNewRateMargin(event.target.value)}
                  placeholder="10"
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  %
                </span>
              </div>
            </div>
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!newRateName.trim() || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Rate Table
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
