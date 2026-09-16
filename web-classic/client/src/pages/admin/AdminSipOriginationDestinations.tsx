import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CirclePlus, CircleX, Download, Edit3, Loader2, Search, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
};

type TariffListResponse = {
  data: Tariff[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ImportedDestination = {
  name: string;
  description: string;
  tariffType: 'internal' | 'international';
  currency: string;
  connectionFee: string;
  ratePerMinute: string;
  billingIncrementSeconds: number;
  status: 'active' | 'inactive';
  metadata: Record<string, any>;
};

const pageSize = 100;
const importChunkSize = 2000;
const inputClass = 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500';
const primaryButtonClass = 'gap-2 bg-[#58cbbb] text-slate-950 hover:bg-[#47bcae]';
const outlineButtonClass = 'gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950';
const tariffActionButtonClass = 'h-9 gap-2 rounded-md bg-[#51459a] px-3 text-sm font-medium text-white shadow-sm hover:bg-[#463b86]';
const tariffDeleteButtonClass = 'h-9 gap-2 rounded-md border border-[#d83a7a] bg-white px-3 text-sm font-medium text-[#d83a7a] shadow-sm hover:bg-[#fff5f8] hover:text-[#c62d6d]';

const originationRateHeaders = [
  'Tarrif Name',
  'Prefix',
  'Destination',
  'Country',
  'Buying Cost (USD)',
  'Selling Cost (USD)',
  'Grace Time',
  'Cost / Min(USD)',
  'Initial Increment',
  'Increment',
  'Rate Group',
  'Routing Type:',
  'Call Type',
  'Tarrif Type',
  'Created Date',
  'Modified Date',
  'Status',
];

type DestinationPageConfig = {
  tariffType: 'internal' | 'international';
  parentKind: string;
  destinationKind: string;
  routeSegment: string;
  tariffLabel: string;
  exportLabel: string;
  filePrefix: string;
};

const defaultConfig: DestinationPageConfig = {
  tariffType: 'international',
  parentKind: 'origination_tariff',
  destinationKind: 'origination_destination',
  routeSegment: 'origination',
  tariffLabel: 'Origination Tariff',
  exportLabel: 'Origination Rates',
  filePrefix: 'Our_Own_Origination_Rates',
};

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await response.json();
  return (payload?.data ?? payload) as T;
}

function parseError(error: Error) {
  return error.message.replace(/^\d+:\s*/, '');
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizeHeader(value: unknown) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function csvValue(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (value !== undefined && value !== '') return value;
  }
  return '';
}

function normalizeMoney(value: unknown, fallback = '0') {
  const normalized = String(value ?? fallback).trim();
  if (!normalized) return fallback;
  const numeric = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(numeric) && numeric >= 0 ? String(numeric) : fallback;
}

function positiveSeconds(value: unknown, fallback = 60) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : fallback;
}

function normalizeStatus(value: unknown): 'active' | 'inactive' {
  return String(value || 'Active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

function displayStatus(value: string) {
  return value === 'active' ? 'Active' : 'Inactive';
}

function formatTableDate(value?: string) {
  if (!value) return { date: '-', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value, time: '' };
  return {
    date: date.toISOString().slice(0, 10),
    time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
  };
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function rowsToRecords(rows: unknown[][]) {
  if (rows.length <= 1) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((cells) => headers.reduce<Record<string, string>>((record, key, index) => {
    record[key] = String(cells[index] ?? '').trim();
    return record;
  }, {})).filter((row) => Object.values(row).some(Boolean));
}

function csvToRecords(csv: string) {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return rowsToRecords(lines.map(parseCsvLine));
}

function excelSerialToText(value: unknown) {
  const text = String(value ?? '').trim();
  const serial = Number(text);
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return text;
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (Number.isNaN(date.getTime())) return text;
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

function callTypeValue(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized === 'local') return 'local';
  if (normalized === 'internalsip') return 'internal_sip';
  if (normalized === 'siptosip' || normalized === 'sip') return 'sip_to_sip';
  if (normalized === 'did') return 'did';
  return 'international';
}

function callTypeLabel(value?: string) {
  if (value === 'local') return 'Local';
  if (value === 'internal_sip') return 'Internal SIP';
  if (value === 'sip_to_sip') return 'SIP To SIP';
  if (value === 'did') return 'DID';
  return 'International';
}

function buildImportedDestination(
  row: Record<string, string>,
  parent: Tariff,
  rateGroupByName: Map<string, RateGroup>,
  config: DestinationPageConfig,
): ImportedDestination | null {
  const tariffName = csvValue(row, 'Tarrif Name', 'Tariff Name') || parent.name;
  const prefix = csvValue(row, 'Prefix');
  const destination = csvValue(row, 'Destination') || prefix;
  if (!prefix && !destination) return null;

  const country = csvValue(row, 'Country');
  const buyingCost = normalizeMoney(csvValue(row, 'Buying Cost (USD)', 'Buying Cost', 'Connection Cost(USD)', 'Connection Fee'));
  const sellingCost = normalizeMoney(csvValue(row, 'Selling Cost (USD)', 'Selling Cost', 'Selling Price (USD)', 'Rate Per Minute'));
  const costPerMinute = normalizeMoney(csvValue(row, 'Cost / Min(USD)', 'Cost / Min'), '0');
  const graceTime = csvValue(row, 'Grace Time') || '0';
  const initialIncrement = csvValue(row, 'Initial Increment') || '60';
  const increment = csvValue(row, 'Increment') || initialIncrement || '60';
  const rateGroupName = csvValue(row, 'Rate Group') || 'Standard Rate Group';
  const rateGroup = rateGroupByName.get(rateGroupName.trim().toLowerCase());
  const routingType = csvValue(row, 'Routing Type:', 'Routing Type') || 'Standard';
  const callType = callTypeValue(csvValue(row, 'Call Type') || 'International');
  const status = normalizeStatus(csvValue(row, 'Status'));
  const safeIncrement = positiveSeconds(increment, positiveSeconds(initialIncrement, 60));
  const importedCreatedDate = excelSerialToText(csvValue(row, 'Created Date'));
  const importedModifiedDate = excelSerialToText(csvValue(row, 'Modified Date'));

  return {
    name: destination || prefix,
    description: tariffName,
    tariffType: config.tariffType,
    currency: 'USD',
    connectionFee: buyingCost,
    ratePerMinute: sellingCost || costPerMinute,
    billingIncrementSeconds: safeIncrement,
    status,
    metadata: {
      kind: config.destinationKind,
      parentTariffId: parent.id,
      parentTariffName: parent.name,
      tariffName,
      prefix,
      destination,
      country,
      rateGroupId: rateGroup?.id || '',
      rateGroupName,
      routingType,
      callType,
      buyingCost,
      sellingPrice: sellingCost,
      graceTime,
      costPerMinute,
      initialIncrement,
      increment,
      importedCreatedDate,
      importedModifiedDate,
    },
  };
}

async function parseImportFile(file: File) {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false, cellText: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
    return rowsToRecords(rows);
  }
  return csvToRecords(await file.text());
}

function exportRow(tariff: Tariff, rateGroupById: Map<string, string>, parentName: string, exportLabel: string) {
  const metadata = tariff.metadata || {};
  return [
    metadata.tariffName || parentName,
    metadata.prefix || '',
    metadata.destination || tariff.name,
    metadata.country || '',
    metadata.buyingCost || tariff.connectionFee || '0',
    metadata.sellingPrice || tariff.ratePerMinute || '0',
    metadata.graceTime || '0',
    metadata.costPerMinute || '0',
    metadata.initialIncrement || tariff.billingIncrementSeconds || 60,
    metadata.increment || tariff.billingIncrementSeconds || 60,
    metadata.rateGroupName || rateGroupById.get(metadata.rateGroupId) || 'Standard Rate Group',
    metadata.routingType || 'Standard',
    callTypeLabel(metadata.callType),
    exportLabel,
    metadata.importedCreatedDate || tariff.createdAt || '',
    metadata.importedModifiedDate || tariff.updatedAt || '',
    displayStatus(tariff.status),
  ];
}

async function exportXlsx(rows: Tariff[], rateGroupById: Map<string, string>, parentName: string, config: DestinationPageConfig) {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.aoa_to_sheet([originationRateHeaders, ...rows.map((row) => exportRow(row, rateGroupById, parentName, config.exportLabel))]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, config.exportLabel);
  XLSX.writeFile(workbook, `${config.filePrefix}_${todayStamp()}.xlsx`);
}

function TableDate({ value }: { value?: string }) {
  const formatted = formatTableDate(value);
  return (
    <div className="leading-tight">
      <div>{formatted.date}</div>
      {formatted.time ? <div>{formatted.time}</div> : null}
    </div>
  );
}

export default function AdminSipOriginationDestinations({
  tariffId,
  config = defaultConfig,
}: {
  tariffId: string;
  config?: Partial<DestinationPageConfig>;
}) {
  const pageConfig = { ...defaultConfig, ...config };
  const { toast } = useToast();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState('');

  const parentQuery = useQuery<{ tariff: Tariff }>({
    queryKey: [`/api/admin/sip-tariffs/${tariffId}`],
  });
  const destinationsQuery = useQuery<TariffListResponse>({
    queryKey: ['/api/admin/sip-tariffs', {
      tariffType: pageConfig.tariffType,
      kind: pageConfig.destinationKind,
      parentTariffId: tariffId,
      search: search || undefined,
      page,
      limit: pageSize,
    }],
  });
  const rateGroupsQuery = useQuery<{ data: RateGroup[] }>({
    queryKey: ['/api/admin/sip-rate-groups'],
  });

  const parent = parentQuery.data?.tariff;
  const destinations = destinationsQuery.data?.data || [];
  const pagination = destinationsQuery.data?.pagination;
  const rateGroups = rateGroupsQuery.data?.data || [];
  const rateGroupById = new Map(rateGroups.map((group) => [group.id, group.name]));
  const allSelected = destinations.length > 0 && destinations.every((tariff) => selectedIds.includes(tariff.id));

  const deleteMutation = useMutation({
    mutationFn: async () => unwrap(await apiRequest('DELETE', '/api/admin/sip-tariffs', { ids: selectedIds })),
    onSuccess: async () => {
      setSelectedIds([]);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-tariffs'] });
      toast({ title: 'Destinations Deleted', description: 'Selected Destinations Were Deleted Successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Delete Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' }) => unwrap(await apiRequest('PATCH', `/api/admin/sip-tariffs/${id}`, { status })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-tariffs'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Status Update Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (records: Record<string, string>[]) => {
      if (!parent) throw new Error('Tariff Name Is Not Loaded Yet.');
      const knownRateGroups = new Map(rateGroups.map((group) => [group.name.trim().toLowerCase(), group]));
      const missingRateGroupNames = Array.from(
        new Set(records
          .map((row) => csvValue(row, 'Rate Group') || 'Standard Rate Group')
          .map((name) => name.trim())
          .filter((name) => name.length >= 2 && !knownRateGroups.has(name.toLowerCase()))),
      );

      for (const name of missingRateGroupNames) {
        const response = await apiRequest('POST', '/api/admin/sip-rate-groups', {
          name,
          description: `Imported From ${pageConfig.exportLabel} File.`,
          status: 'active',
          metadata: {
            routingType: 'LCR',
            routingLabel: 'LCR - Cheapest First',
            rateTypes: ['normal_user'],
            rateType: 'normal_user',
            assignedAccountLabel: 'All Normal Users',
            initialIncrement: 60,
            increment: 60,
            markupPercent: 0,
          },
        });
        const payload = await unwrap<{ rateGroup: RateGroup }>(response);
        knownRateGroups.set(payload.rateGroup.name.trim().toLowerCase(), payload.rateGroup);
      }

      const rows = records
        .map((row) => buildImportedDestination(row, parent, knownRateGroups, pageConfig))
        .filter((row): row is ImportedDestination => Boolean(row));
      if (rows.length === 0) throw new Error('The File Does Not Include Any Valid Destinations.');
      const rateGroupCounts = rows.reduce<Record<string, number>>((counts, row) => {
        const name = String(row.metadata.rateGroupName || 'Standard Rate Group');
        counts[name] = (counts[name] || 0) + 1;
        return counts;
      }, {});

      for (let index = 0; index < rows.length; index += importChunkSize) {
        const chunk = rows.slice(index, index + importChunkSize);
        setImportProgress(`Importing ${Math.min(index + chunk.length, rows.length)} Of ${rows.length} Destinations...`);
        await apiRequest('POST', '/api/admin/sip-tariffs/bulk', { rows: chunk });
      }

      const mergedRateGroupCounts = { ...((parent.metadata?.rateGroupCounts || {}) as Record<string, number>) };
      Object.entries(rateGroupCounts).forEach(([name, count]) => {
        mergedRateGroupCounts[name] = Number(mergedRateGroupCounts[name] || 0) + count;
      });

      await apiRequest('PATCH', `/api/admin/sip-tariffs/${parent.id}`, {
        metadata: {
          ...(parent.metadata || {}),
          kind: pageConfig.parentKind,
          tariffName: parent.name,
          destinationCount: Number(parent.metadata?.destinationCount || 0) + rows.length,
          rateGroupCounts: mergedRateGroupCounts,
          lastImportedAt: new Date().toISOString(),
        },
      });

      return rows.length;
    },
    onSuccess: async (count) => {
      setImportProgress('');
      setSelectedIds([]);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-tariffs'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/sip-rate-groups'] });
      toast({ title: `${pageConfig.exportLabel} Imported`, description: `${count} Destinations Were Imported Successfully.` });
    },
    onError: (error: Error) => {
      setImportProgress('');
      toast({ title: 'Import Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!parent) throw new Error('Tariff Name Is Not Loaded Yet.');
      const allRows: Tariff[] = [];
      let nextPage = 1;
      let totalPages = 1;
      do {
        const params = new URLSearchParams({
          tariffType: pageConfig.tariffType,
          kind: pageConfig.destinationKind,
          parentTariffId: tariffId,
          page: String(nextPage),
          limit: '5000',
        });
        const payload = await unwrap<TariffListResponse>(await apiRequest('GET', `/api/admin/sip-tariffs?${params.toString()}`));
        allRows.push(...(payload.data || []));
        totalPages = payload.pagination?.totalPages || 1;
        nextPage += 1;
      } while (nextPage <= totalPages);
      await exportXlsx(allRows, rateGroupById, parent.name, pageConfig);
      return allRows.length;
    },
    onSuccess: (count) => {
      toast({ title: `${pageConfig.exportLabel} Exported`, description: `${count} Destinations Were Exported Successfully.` });
    },
    onError: (error: Error) => {
      toast({ title: 'Export Failed', description: parseError(error), variant: 'destructive' });
    },
  });

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((current) => checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id));
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) {
      toast({ title: 'Select Destinations First', description: 'Please Select At Least One Destination To Delete.', variant: 'destructive' });
      return;
    }
    if (window.confirm('Delete Selected Destinations?')) {
      deleteMutation.mutate();
    }
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    setImportProgress('Reading Import File...');
    try {
      const records = await parseImportFile(file);
      importMutation.mutate(records);
    } catch (error: any) {
      setImportProgress('');
      toast({ title: 'Import Failed', description: parseError(error), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            {parent?.name || pageConfig.tariffLabel}
          </h1>
          <p className="mt-2 text-slate-400">Manage Destinations, Prefixes, Bulk Import, And Export For This Tariff Name.</p>
        </div>
        <Button asChild variant="outline" className={outlineButtonClass}>
          <Link href="/admin/sip-configuration/tariffs">
            <ArrowLeft className="h-4 w-4" />
            Back To Tariff's
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Destinations</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className={`${inputClass} pl-9 sm:w-80`}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  setSelectedIds([]);
                }}
                placeholder="Search Destination, Prefix, Country"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className={tariffActionButtonClass} disabled={!parent}>
              <Link href={`/admin/sip-configuration/tariffs/create?type=${pageConfig.tariffType}&parentId=${tariffId}`}>
                <CirclePlus className="h-4 w-4" />
                Create
              </Link>
            </Button>
            <Button className={tariffDeleteButtonClass} onClick={handleDelete} disabled={deleteMutation.isPending}>
              <CircleX className="h-4 w-4 fill-[#d83a7a] text-white" />
              Delete
            </Button>
            <Button className={tariffActionButtonClass} onClick={() => importInputRef.current?.click()} disabled={importMutation.isPending || !parent}>
              {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Import
            </Button>
            <Button className={tariffActionButtonClass} onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending || !pagination?.total}>
              {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Export
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv"
              className="hidden"
              onChange={(event) => {
                handleImportFile(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
          </div>

          {importProgress ? (
            <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
              {importProgress}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox checked={allSelected} onCheckedChange={(checked) => setSelectedIds(checked === true ? destinations.map((tariff) => tariff.id) : [])} />
                  </TableHead>
                  <TableHead>Destinations</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Buying Cost (USD)</TableHead>
                  <TableHead>Selling Price (USD)</TableHead>
                  <TableHead>Rate Group</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Modified Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {destinationsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-slate-500">Loading Destinations...</TableCell>
                  </TableRow>
                ) : destinations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-slate-500">No Destinations Found.</TableCell>
                  </TableRow>
                ) : (
                  destinations.map((tariff) => (
                    <TableRow key={tariff.id}>
                      <TableCell>
                        <Checkbox checked={selectedIds.includes(tariff.id)} onCheckedChange={(checked) => toggleOne(tariff.id, checked === true)} />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{tariff.name}</div>
                        <div className="text-xs text-slate-500">{tariff.metadata?.tariffName || parent?.name || ''}</div>
                      </TableCell>
                      <TableCell>
                        <div>{tariff.metadata?.prefix || tariff.metadata?.destination || '-'}</div>
                        <div className="text-xs text-slate-500">{tariff.metadata?.country || tariff.metadata?.destination || ''}</div>
                      </TableCell>
                      <TableCell>{tariff.currency} {tariff.metadata?.buyingCost || tariff.connectionFee}</TableCell>
                      <TableCell>{tariff.currency} {tariff.metadata?.sellingPrice || tariff.ratePerMinute}</TableCell>
                      <TableCell>{tariff.metadata?.rateGroupName || rateGroupById.get(tariff.metadata?.rateGroupId) || 'No Rate Group'}</TableCell>
                      <TableCell>
                        <TableDate value={tariff.metadata?.importedCreatedDate || tariff.createdAt} />
                      </TableCell>
                      <TableCell>
                        <TableDate value={tariff.metadata?.importedModifiedDate || tariff.updatedAt} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={tariff.status === 'active'}
                            onCheckedChange={(checked) => updateStatusMutation.mutate({ id: tariff.id, status: checked ? 'active' : 'inactive' })}
                            disabled={updateStatusMutation.isPending}
                            className="h-7 w-12 border-transparent bg-red-500 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-red-500"
                          />
                          <span className={tariff.status === 'active' ? 'text-sm font-medium text-emerald-700' : 'text-sm font-medium text-red-700'}>
                            {displayStatus(tariff.status)}
                          </span>
                        </div>
                      </TableCell>
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
            <div className="flex flex-col gap-3 bg-slate-100 px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {pagination?.page || page} Of {pagination?.totalPages || 1}
              </span>
              <div className="flex items-center gap-2">
                <span>{pagination?.total ? `${((pagination.page - 1) * pagination.limit) + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} Of ${pagination.total} Records` : '0 - 0 Of 0 Records'}</span>
                <Button variant="outline" size="sm" className="h-7 bg-white" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="h-7 bg-white" disabled={Boolean(pagination && page >= pagination.totalPages)} onClick={() => setPage((current) => current + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
