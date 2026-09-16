import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CirclePlus, CircleX, Copy, Edit3, Eye, PhoneCall, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type Tariff = {
  id: string;
  name: string;
  tariffType: 'internal' | 'international';
  description: string;
  currency: string;
  connectionFee: string;
  ratePerMinute: string;
  billingIncrementSeconds: number;
  status: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

type RateGroup = {
  id: string;
  name: string;
  description: string;
  status: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

const inputClass = 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500';
const primaryButtonClass = 'gap-2 bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';
const tariffActionButtonClass = 'h-9 gap-2 rounded-md bg-[#51459a] px-3 text-sm font-medium text-white shadow-sm hover:bg-[#463b86]';
const tariffDeleteButtonClass = 'h-9 gap-2 rounded-md border border-[#d83a7a] bg-white px-3 text-sm font-medium text-[#d83a7a] shadow-sm hover:bg-[#fff5f8] hover:text-[#c62d6d]';
const tariffTabClass = 'rounded-md px-4 py-2 text-sm font-medium text-slate-500 transition-colors focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:ring-offset-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900';
const rateGroupHeadClass = 'h-10 whitespace-normal border-b border-slate-300 bg-slate-100 px-2 text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-700';
const rateGroupBodyClass = '[&_td]:px-2 [&_td]:py-2 [&_td]:align-middle [&_td]:text-xs [&_td]:leading-tight [&_td]:text-slate-800';
const rateGroupSwitchClass = 'h-6 w-11 border-red-500 bg-red-500 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:border-red-500 data-[state=unchecked]:bg-red-500';

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await response.json();
  return (payload?.data ?? payload) as T;
}

function parseError(error: Error) {
  return error.message.replace(/^\d+:\s*/, '');
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function compactDateParts(value?: string) {
  if (!value) return ['-', ''];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return ['-', ''];
  return [
    date.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }),
    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  ];
}

function routingTypeLabel(value?: string) {
  if (value === 'LCR') return 'LCR - Cheapest First';
  if (value === 'Quality' || value === 'Priority') return 'Quality First';
  if (value === 'Balanced' || value === 'Weight') return 'Balanced Cost / Quality';
  if (value === 'Manual') return 'Manual Priority';
  return value || 'LCR - Cheapest First';
}

function rateAssignmentTypeLabel(metadata: Record<string, any>) {
  const rateTypes = Array.isArray(metadata.rateTypes) ? metadata.rateTypes : metadata.rateType ? [metadata.rateType] : [];
  const labels = rateTypes
    .map((value: string) => {
      if (value === 'reseller') return 'Reseller';
      if (value === 'agent') return 'Agent';
      if (value === 'normal_user') return 'Normal User';
      return '';
    })
    .filter(Boolean);
  if (labels.length > 0) return labels.join(', ');
  const value = metadata.rateType;
  if (value === 'reseller') return 'Reseller';
  if (value === 'agent') return 'Agent';
  return 'Normal User';
}

function rateAssignmentLabel(metadata: Record<string, any>) {
  if (metadata.assignedAccountLabel) return metadata.assignedAccountLabel;
  const rateTypes = Array.isArray(metadata.rateTypes) ? metadata.rateTypes : metadata.rateType ? [metadata.rateType] : [];
  const assignedAccounts = Array.isArray(metadata.assignedAccounts) ? metadata.assignedAccounts : [];
  const labels = [
    rateTypes.includes('normal_user') ? 'All Normal Users' : '',
    ...assignedAccounts.map((account: any) => account?.label).filter(Boolean),
  ].filter(Boolean);
  if (labels.length > 0) return labels.join(', ');
  if (!metadata.rateType || metadata.rateType === 'normal_user') return 'All Normal Users';
  return metadata.assignedAccountLabel || metadata.reseller || 'Account Not Selected';
}

function rateGroupProviderLabel(metadata: Record<string, any>) {
  if (metadata.providerName) return metadata.providerName;
  if (metadata.routeProvider?.name) return metadata.routeProvider.name;
  if (metadata.providerId === 'astpp') return 'ASTPP Community';
  if (metadata.providerId === 'freepbx') return 'FreePBX / Asterisk';
  if (metadata.providerId === 'local') return 'Local SIP';
  return metadata.providerId || 'No Provider';
}

export default function AdminSipTariffs() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedInternalIds, setSelectedInternalIds] = useState<string[]>([]);
  const [selectedOriginationIds, setSelectedOriginationIds] = useState<string[]>([]);
  const [selectedRateGroupIds, setSelectedRateGroupIds] = useState<string[]>([]);

  const tariffsQuery = useQuery<{ data: Tariff[] }>({
    queryKey: ['/api/admin/sip-tariffs', { search: search || undefined, tariffType: 'internal', kind: 'internal_tariff' }],
  });
  const originationTariffsQuery = useQuery<{ data: Tariff[] }>({
    queryKey: ['/api/admin/sip-tariffs', { search: search || undefined, tariffType: 'international', kind: 'origination_tariff' }],
  });
  const rateGroupsQuery = useQuery<{ data: RateGroup[] }>({
    queryKey: ['/api/admin/sip-rate-groups', { search: search || undefined }],
  });

  const tariffs = tariffsQuery.data?.data || [];
  const originationTariffs = originationTariffsQuery.data?.data || [];
  const rateGroups = rateGroupsQuery.data?.data || [];
  const internalTariffs = tariffs;
  const allInternalSelected = internalTariffs.length > 0 && internalTariffs.every((tariff) => selectedInternalIds.includes(tariff.id));
  const allOriginationSelected = originationTariffs.length > 0 && originationTariffs.every((tariff) => selectedOriginationIds.includes(tariff.id));
  const allRateGroupsSelected = rateGroups.length > 0 && rateGroups.every((group) => selectedRateGroupIds.includes(group.id));

  const deleteInternalMutation = useMutation({
    mutationFn: async () => unwrap(await apiRequest('DELETE', '/api/admin/sip-tariffs', { ids: selectedInternalIds })),
    onSuccess: async () => {
      setSelectedInternalIds([]);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-tariffs'] });
      toast({ title: 'Internal Tariff Names Deleted', description: 'Selected Internal Tariff Names And Their Destinations Were Deleted Successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Delete Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => unwrap(await apiRequest('DELETE', '/api/admin/sip-tariffs', { ids: selectedOriginationIds })),
    onSuccess: async () => {
      setSelectedOriginationIds([]);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-tariffs'] });
      toast({ title: 'Tariff Names Deleted', description: 'Selected Tariff Names And Their Destinations Were Deleted Successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Delete Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const deleteRateGroupsMutation = useMutation({
    mutationFn: async () => unwrap(await apiRequest('DELETE', '/api/admin/sip-rate-groups', { ids: selectedRateGroupIds })),
    onSuccess: async () => {
      setSelectedRateGroupIds([]);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-rate-groups'] });
      toast({ title: 'Rate Groups Deleted', description: 'Selected Rate Groups Were Deleted Successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Delete Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const duplicateRateGroupsMutation = useMutation({
    mutationFn: async () => unwrap(await apiRequest('POST', '/api/admin/sip-rate-groups/duplicate', { ids: selectedRateGroupIds })),
    onSuccess: async () => {
      setSelectedRateGroupIds([]);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-rate-groups'] });
      toast({ title: 'Rate Groups Duplicated', description: 'Selected Rate Groups Were Duplicated Successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Duplicate Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const updateRateGroupStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => unwrap(await apiRequest('PATCH', `/api/admin/sip-rate-groups/${id}`, { status })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-rate-groups'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Status Update Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const toggleOrigination = (id: string, checked: boolean) => {
    setSelectedOriginationIds((current) => checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id));
  };

  const toggleInternal = (id: string, checked: boolean) => {
    setSelectedInternalIds((current) => checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id));
  };

  const toggleRateGroup = (id: string, checked: boolean) => {
    setSelectedRateGroupIds((current) => checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id));
  };

  const handleDelete = () => {
    if (selectedOriginationIds.length === 0) {
      toast({ title: 'Select Tariff Names First', description: 'Please Select At Least One Tariff Name To Delete.', variant: 'destructive' });
      return;
    }
    if (window.confirm('Delete Selected Tariff Names And Their Destinations?')) {
      deleteMutation.mutate();
    }
  };

  const handleInternalDelete = () => {
    if (selectedInternalIds.length === 0) {
      toast({ title: 'Select Internal Tariff Names First', description: 'Please Select At Least One Internal Tariff Name To Delete.', variant: 'destructive' });
      return;
    }
    if (window.confirm('Delete Selected Internal Tariff Names And Their Destinations?')) {
      deleteInternalMutation.mutate();
    }
  };

  const handleRateGroupDelete = () => {
    if (selectedRateGroupIds.length === 0) {
      toast({ title: 'Select Rate Groups First', description: 'Please Select At Least One Rate Group To Delete.', variant: 'destructive' });
      return;
    }
    if (window.confirm('Delete Selected Rate Groups?')) {
      deleteRateGroupsMutation.mutate();
    }
  };

  const handleRateGroupDuplicate = () => {
    if (selectedRateGroupIds.length === 0) {
      toast({ title: 'Select Rate Groups First', description: 'Please Select At Least One Rate Group To Duplicate.', variant: 'destructive' });
      return;
    }
    duplicateRateGroupsMutation.mutate();
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <PhoneCall className="h-8 w-8 text-cyan-300" />
            SIP Tariff's
          </h1>
          <p className="mt-2 text-slate-400">Manage Internal SIP Rates And Origination Rates For Outgoing Calls.</p>
        </div>
      </div>

      <Card className="border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Tariff List</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className={`${inputClass} pl-9 sm:w-80`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Tariff Name" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="internal" className="space-y-4">
            <TabsList className="h-auto w-fit justify-start rounded-lg bg-slate-100 p-1">
              <TabsTrigger className={tariffTabClass} value="internal">
                Internal
              </TabsTrigger>
              <TabsTrigger className={tariffTabClass} value="origination">
                Origination Rates
              </TabsTrigger>
              <TabsTrigger className={tariffTabClass} value="rate-groups">
                Rate Group
              </TabsTrigger>
            </TabsList>

            <TabsContent value="internal" className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild className={tariffActionButtonClass}>
                  <Link href="/admin/sip-configuration/tariffs/create?type=internal&kind=internal_tariff">
                    <CirclePlus className="h-4 w-4" />
                    Create Tariff Name
                  </Link>
                </Button>
                <Button className={tariffDeleteButtonClass} onClick={handleInternalDelete} disabled={deleteInternalMutation.isPending}>
                  <CircleX className="h-4 w-4 fill-[#d83a7a] text-white" />
                  Delete
                </Button>
              </div>
              <TariffNameTable
                tariffs={internalTariffs}
                selectedIds={selectedInternalIds}
                allSelected={allInternalSelected}
                onToggle={toggleInternal}
                onToggleAll={(checked) => setSelectedInternalIds(checked ? internalTariffs.map((tariff) => tariff.id) : [])}
                routeSegment="internal"
                emptyMessage="No Internal Tariff Names Found."
              />
            </TabsContent>

            <TabsContent value="origination" className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild className={tariffActionButtonClass}>
                  <Link href="/admin/sip-configuration/tariffs/create?type=international&kind=origination_tariff">
                    <CirclePlus className="h-4 w-4" />
                    Create Tariff Name
                  </Link>
                </Button>
                <Button className={tariffDeleteButtonClass} onClick={handleDelete} disabled={deleteMutation.isPending}>
                  <CircleX className="h-4 w-4 fill-[#d83a7a] text-white" />
                  Delete
                </Button>
              </div>
              <TariffNameTable
                tariffs={originationTariffs}
                selectedIds={selectedOriginationIds}
                allSelected={allOriginationSelected}
                onToggle={toggleOrigination}
                onToggleAll={(checked) => setSelectedOriginationIds(checked ? originationTariffs.map((tariff) => tariff.id) : [])}
                routeSegment="origination"
                emptyMessage="No Origination Tariff Names Found."
              />
            </TabsContent>

            <TabsContent value="rate-groups" className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild className={tariffActionButtonClass}>
                  <Link href="/admin/sip-configuration/tariffs/rate-groups/create">
                    <CirclePlus className="h-4 w-4" />
                    Create
                  </Link>
                </Button>
                <Button className={tariffDeleteButtonClass} onClick={handleRateGroupDelete} disabled={deleteRateGroupsMutation.isPending}>
                  <CircleX className="h-4 w-4 fill-[#d83a7a] text-white" />
                  Delete
                </Button>
                <Button className={tariffActionButtonClass} onClick={handleRateGroupDuplicate} disabled={duplicateRateGroupsMutation.isPending}>
                  <Copy className="h-4 w-4" />
                  Duplicate
                </Button>
              </div>
              <RateGroupTable
                rateGroups={rateGroups}
                originationTariffs={originationTariffs}
                selectedIds={selectedRateGroupIds}
                allSelected={allRateGroupsSelected}
                onToggle={toggleRateGroup}
                onToggleAll={(checked) => setSelectedRateGroupIds(checked ? rateGroups.map((group) => group.id) : [])}
                onStatusChange={(id, status) => updateRateGroupStatusMutation.mutate({ id, status })}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function statusBadge(status: string) {
  return (
    <Badge className={status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-700'}>
      {status === 'active' ? 'Active' : 'Inactive'}
    </Badge>
  );
}

function TariffTable({ tariffs, emptyMessage }: { tariffs: Tariff[]; emptyMessage: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Connection Fee</TableHead>
          <TableHead>Rate Per Minute</TableHead>
          <TableHead>Billing Increment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tariffs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-10 text-center text-slate-500">{emptyMessage}</TableCell>
          </TableRow>
        ) : (
          tariffs.map((tariff) => (
            <TableRow key={tariff.id}>
              <TableCell>
                <div className="font-medium">{tariff.name}</div>
                <div className="text-xs text-slate-500">{tariff.description}</div>
              </TableCell>
              <TableCell>{tariff.currency} {tariff.connectionFee}</TableCell>
              <TableCell>{tariff.currency} {tariff.ratePerMinute}</TableCell>
              <TableCell>{tariff.billingIncrementSeconds} Seconds</TableCell>
              <TableCell>{statusBadge(tariff.status)}</TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" className={primaryButtonClass}>
                  <Link href={`/admin/sip-configuration/tariffs/${tariff.id}/edit`}>
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function TariffNameTable({
  tariffs,
  selectedIds,
  allSelected,
  onToggle,
  onToggleAll,
  routeSegment,
  emptyMessage,
}: {
  tariffs: Tariff[];
  selectedIds: string[];
  allSelected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  routeSegment: 'internal' | 'origination';
  emptyMessage: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox checked={allSelected} onCheckedChange={(checked) => onToggleAll(checked === true)} />
          </TableHead>
          <TableHead>Tariff Name</TableHead>
          <TableHead>Destinations</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Created Date</TableHead>
          <TableHead>Modified Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tariffs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-10 text-center text-slate-500">{emptyMessage}</TableCell>
          </TableRow>
        ) : (
          tariffs.map((tariff) => (
            <TableRow key={tariff.id}>
              <TableCell>
                <Checkbox checked={selectedIds.includes(tariff.id)} onCheckedChange={(checked) => onToggle(tariff.id, checked === true)} />
              </TableCell>
              <TableCell>
                <Link className="font-medium text-[#3b2f7f] hover:underline" href={`/admin/sip-configuration/tariffs/${routeSegment}/${tariff.id}`}>
                  {tariff.name}
                </Link>
                <div className="text-xs text-slate-500">Open To Manage Destinations</div>
              </TableCell>
              <TableCell>{Number(tariff.metadata?.destinationCount || tariff.metadata?.ratesCount || 0).toLocaleString()}</TableCell>
              <TableCell>{tariff.description || '-'}</TableCell>
              <TableCell>{formatDate(tariff.createdAt)}</TableCell>
              <TableCell>{formatDate(tariff.updatedAt)}</TableCell>
              <TableCell>{statusBadge(tariff.status)}</TableCell>
              <TableCell className="flex justify-end gap-2">
                <Button asChild size="sm" className={tariffActionButtonClass}>
                  <Link href={`/admin/sip-configuration/tariffs/${routeSegment}/${tariff.id}`}>
                    <Eye className="h-4 w-4" />
                    Open
                  </Link>
                </Button>
                <Button asChild size="sm" className={primaryButtonClass}>
                  <Link href={`/admin/sip-configuration/tariffs/${tariff.id}/edit`}>
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function RateGroupTable({
  rateGroups,
  originationTariffs,
  selectedIds,
  allSelected,
  onToggle,
  onToggleAll,
  onStatusChange,
}: {
  rateGroups: RateGroup[];
  originationTariffs: Tariff[];
  selectedIds: string[];
  allSelected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const ratesCountByGroup = new Map<string, number>();
  const groupIdByName = new Map(rateGroups.map((group) => [group.name, group.id]));
  originationTariffs.forEach((tariff) => {
    const metadata = tariff.metadata || {};
    const rateGroupCounts = metadata.rateGroupCounts && typeof metadata.rateGroupCounts === 'object' ? metadata.rateGroupCounts : {};
    Object.entries(rateGroupCounts).forEach(([name, count]) => {
      const groupId = groupIdByName.get(name);
      if (!groupId) return;
      ratesCountByGroup.set(groupId, (ratesCountByGroup.get(groupId) || 0) + Number(count || 0));
    });
    const groupId = String(tariff.metadata?.rateGroupId || '');
    if (!groupId) return;
    ratesCountByGroup.set(groupId, (ratesCountByGroup.get(groupId) || 0) + Number(tariff.metadata?.destinationCount || 1));
  });

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={`${rateGroupHeadClass} w-[2%]`}>
              <Checkbox checked={allSelected} onCheckedChange={(checked) => onToggleAll(checked === true)} />
            </TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[9%]`}>Name</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[6%]`}>Routing Prefix</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[9%]`}>Routing Type</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[9%]`}>Provider</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[6%] text-right`}>Initial Increment</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[5%] text-right`}>Increment</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[5%] text-right`}>Markup (%)</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[6%] text-right`}>Rates Count</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[7%]`}>Rate Type</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[9%]`}>Assigned To</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[7%]`}>Created Date</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[7%]`}>Modified Date</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[8%] text-center`}>Status</TableHead>
            <TableHead className={`${rateGroupHeadClass} w-[5%] text-right`}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={rateGroupBodyClass}>
          {rateGroups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={15} className="py-10 text-center text-slate-500">No Rate Groups Found.</TableCell>
            </TableRow>
          ) : (
            rateGroups.map((group) => {
              const metadata = group.metadata || {};
              const isActive = group.status === 'active';
              const createdDate = compactDateParts(group.createdAt);
              const modifiedDate = compactDateParts(group.updatedAt);
              return (
                <TableRow key={group.id} className="bg-white hover:bg-slate-50">
                  <TableCell>
                    <Checkbox checked={selectedIds.includes(group.id)} onCheckedChange={(checked) => onToggle(group.id, checked === true)} />
                  </TableCell>
                  <TableCell>
                    <Link className="font-medium text-[#3b2f7f] hover:underline" href={`/admin/sip-configuration/tariffs/rate-groups/${group.id}/edit`}>
                      {group.name}
                    </Link>
                    {group.description ? <div className="text-xs text-slate-500">{group.description}</div> : null}
                  </TableCell>
                  <TableCell className="break-words">{metadata.routingPrefix || '--'}</TableCell>
                  <TableCell className="break-words">{metadata.routingLabel || routingTypeLabel(metadata.routingType)}</TableCell>
                  <TableCell className="break-words">
                    <div className="font-medium">{rateGroupProviderLabel(metadata)}</div>
                    {metadata.providerDomain ? <div className="text-xs text-slate-500">{metadata.providerDomain}</div> : null}
                  </TableCell>
                  <TableCell className="text-right">{metadata.initialIncrement || 0}</TableCell>
                  <TableCell className="text-right">{metadata.increment || 60}</TableCell>
                  <TableCell className="text-right">{metadata.markupPercent || 0}</TableCell>
                  <TableCell className="text-right">{(ratesCountByGroup.get(group.id) || 0).toLocaleString()}</TableCell>
                  <TableCell className="break-words">{metadata.rateTypeLabel || rateAssignmentTypeLabel(metadata)}</TableCell>
                  <TableCell className="break-words">
                    <div>{rateAssignmentLabel(metadata)}</div>
                    {metadata.parentAccountLabel ? <div className="text-xs text-slate-500">Under {metadata.parentAccountLabel}</div> : null}
                    {metadata.inheritanceMode === 'include_downline_with_child_override' ? (
                      <div className="text-xs text-slate-500">Downline Inherits Unless Overridden</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className="block">{createdDate[0]}</span>
                    <span className="block text-slate-500">{createdDate[1]}</span>
                  </TableCell>
                  <TableCell>
                    <span className="block">{modifiedDate[0]}</span>
                    <span className="block text-slate-500">{modifiedDate[1]}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => onStatusChange(group.id, checked ? 'active' : 'inactive')}
                        className={rateGroupSwitchClass}
                        aria-label={isActive ? 'Disable Rate Group' : 'Enable Rate Group'}
                      />
                      <span className={`text-[11px] font-semibold ${isActive ? 'text-emerald-700' : 'text-red-600'}`}>
                        {isActive ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="icon" className={`${primaryButtonClass} h-8 w-8`} title="Edit Rate Group">
                      <Link href={`/admin/sip-configuration/tariffs/rate-groups/${group.id}/edit`}>
                        <Edit3 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between bg-slate-100 px-3 py-2 text-xs text-slate-600">
        <span>Page 1 Of 1</span>
        <span>{rateGroups.length ? `1 - ${rateGroups.length}` : '0 - 0'} Of {rateGroups.length} Records</span>
      </div>
    </div>
  );
}
