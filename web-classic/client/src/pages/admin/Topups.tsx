import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCcw,
  DollarSign,
  TrendingUp,
  ReceiptText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/TranslationContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDisplayValue } from '@/lib/displayText';

const statusStyles: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  processing: 'border-teal-200 bg-teal-50 text-teal-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
  partial_refund: 'border-orange-200 bg-orange-50 text-orange-700',
  refunded: 'border-slate-200 bg-slate-100 text-slate-700',
};

export default function AdminTopupsPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refundTopup, setRefundTopup] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('Customer requested refund');
  const [refundNotes, setRefundNotes] = useState('');
  const itemsPerPage = 10;
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/topups', currentPage, itemsPerPage, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/admin/topups?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch topups');
      return res.json();
    },
    keepPreviousData: true,
  });

  const topups = data?.topups || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const stats = data?.stats || { totalRevenue: 0, totalCost: 0, totalProfit: 0 };

  const openRefundDialog = (topup: any) => {
    const amount = Number(topup.customerPrice ?? topup.price ?? 0);
    setRefundTopup(topup);
    setRefundAmount(Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : '');
    setRefundReason('Customer requested refund');
    setRefundNotes('');
  };

  const closeRefundDialog = () => {
    setRefundTopup(null);
    setRefundAmount('');
    setRefundReason('Customer requested refund');
    setRefundNotes('');
  };

  const refundTopupMutation = useMutation({
    mutationFn: async () => {
      if (!refundTopup) throw new Error('Select a top-up to refund');
      const response = await apiRequest('POST', `/api/admin/topups/${refundTopup.id}/refund`, {
        amount: refundAmount ? Number(refundAmount) : undefined,
        reason: refundReason,
        notes: refundNotes,
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to refund top-up');
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/topups'] });
      closeRefundDialog();
      toast({
        title: 'Top-up refunded',
        description: 'The refund was credited to the customer wallet.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Refund failed',
        description: error.message || 'Failed to refund top-up.',
        variant: 'destructive',
      });
    },
  });

  // CSV Export Function
  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '10000'); // Fetch large batch for export
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/admin/topups?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch export data');

      const exportData = await res.json();
      const exportTopups = exportData.topups || [];

      if (exportTopups.length === 0) {
        toast({
          title: t('admin.topups.noData', 'No Data'),
          description: t('admin.topups.noTopupsToExport', 'There are no top-ups to export.'),
          variant: 'destructive',
        });
        return;
      }

      const headers = [
        t('admin.topups.topupId', 'Topup ID'),
        t('admin.topups.customerEmail', 'Customer Email'),
        t('admin.topups.iccid', 'ICCID'),
        t('admin.topups.package', 'Package'),
        t('admin.topups.dataAmount', 'Data Amount'),
        t('admin.topups.validityDays', 'Validity (Days)'),
        t('admin.topups.customerPrice', 'Customer Price'),
        t('admin.topups.airalosCost', 'Airalo Cost'),
        t('admin.topups.marginPercent', 'Margin (%)'),
        t('admin.topups.profit', 'Profit'),
        t('admin.topups.status', 'Status'),
        t('admin.topups.date', 'Date'),
      ];

      const rows = exportTopups.map((topup: any) => {
        const customerPrice = parseFloat(topup.customerPrice ?? topup.price ?? '0');
        const airaloPrice = parseFloat(topup.airaloPrice || '0');
        const profit = (customerPrice - airaloPrice).toFixed(2);
        const margin = topup.margin || '40';

        return [
          topup.displayTopupId || topup.id,
          topup.user?.email || 'N/A',
          topup.iccid || 'N/A',
          topup.package?.title || `${topup.dataAmount} - ${topup.validity} Days`,
          topup.dataAmount || 'N/A',
          topup.validity || 'N/A',
          `$${customerPrice.toFixed(2)}`,
          `$${topup.airaloPrice}`,
          `${margin}%`,
          `$${profit}`,
          topup.status,
          new Date(topup.createdAt).toLocaleString(),
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topups-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: t('admin.topups.exportSuccessful', 'Export Successful'),
        description: t(
          'admin.topups.topupsExportedToCSV',
          `${exportTopups.length} top-ups exported to CSV`,
        ),
      });
    } catch (error) {
      toast({
        title: t('admin.topups.exportFailed', 'Export Failed'),
        description: t('admin.topups.failedToExport', 'Failed to export top-ups.'),
        variant: 'destructive',
      });
    }
  };

  const totalRevenue = stats.totalRevenue || 0;
  const totalCost = stats.totalCost || 0;
  const totalProfit = stats.totalProfit || 0;

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8" data-testid="page-admin-topups">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {t('adminPanel.admin.topups.title', 'Top-Up Management')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('adminPanel.admin.topups.description', 'Manage all top-up orders and track revenue')}
          </p>
        </div>
        <Button
          className="w-full gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800 dark:hover:text-white sm:w-auto"
          variant="outline"
          onClick={exportToCSV}
          disabled={!topups || topups.length === 0}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4" />
          {t('adminPanel.admin.topups.exportCSV', 'Export CSV')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#168b80]">
                {t('adminPanel.admin.topups.totalTopUps', 'Total Top-Ups')}
              </p>
              <p
                className="mt-1 text-2xl font-semibold text-slate-950"
                data-testid="text-total-topups"
              >
                {pagination.total}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#58cbbb]">
              <Plus className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                {t('adminPanel.admin.topups.totalRevenue', 'Total Revenue')}
              </p>
              <p
                className="mt-1 text-2xl font-semibold text-emerald-600"
                data-testid="text-total-revenue"
              >
                ${totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">
                {t('adminPanel.admin.topups.totalCost', 'Total Cost')}
              </p>
              <p
                className="mt-1 text-2xl font-semibold text-orange-600"
                data-testid="text-total-cost"
              >
                ${totalCost.toFixed(2)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500">
              <ReceiptText className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                {t('adminPanel.admin.topups.totalProfit', 'Total Profit')}
              </p>
              <p
                className="mt-1 text-2xl font-semibold text-emerald-600"
                data-testid="text-total-profit"
              >
                ${totalProfit.toFixed(2)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <div className="p-6">
          <div className="grid items-end gap-4 md:grid-cols-5">
            <div className="md:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t(
                    'adminPanel.admin.topups.searchPlaceholder',
                    'Search by email, ICCID, or Topup ID...',
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-slate-300 bg-white pl-9 text-slate-950 placeholder:text-slate-400"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="px-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                {t('adminPanel.admin.topups.orderStatus', 'Order Status')}
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full border-slate-300 bg-white text-slate-950" data-testid="select-status-filter">
                  <SelectValue placeholder={t('adminPanel.admin.topups.filterByStatus', 'Filter by status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('adminPanel.admin.topups.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="pending">{t('adminPanel.admin.topups.pending', 'Pending')}</SelectItem>
                  <SelectItem value="processing">
                    {t('adminPanel.admin.topups.processing', 'Processing')}
                  </SelectItem>
                  <SelectItem value="completed">{t('adminPanel.admin.topups.completed', 'Completed')}</SelectItem>
                  <SelectItem value="failed">{t('adminPanel.admin.topups.failed', 'Failed')}</SelectItem>
                  <SelectItem value="partial_refund">Partial Refund</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="border-slate-300 text-slate-600">
                {pagination.total} {t('adminPanel.admin.topups.topups', 'top-ups')}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        {
          !isLoading && (!topups || topups.length === 0) ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Plus className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-950">
                {t('adminPanel.admin.topups.noTopupsFound', 'No top-ups found')}
              </h3>
              <p className="text-sm text-slate-500">
                {searchQuery || statusFilter !== 'all'
                  ? t('adminPanel.admin.topups.tryAdjustingFilters', 'Try adjusting your filters')
                  : t('adminPanel.admin.topups.topupsWillAppear', 'Top-up orders will appear here')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-medium text-slate-600">
                      {t('adminPanel.admin.topups.topupId', 'Topup ID')}
                    </TableHead>
                    <TableHead className="font-medium text-slate-600">
                      {t('adminPanel.admin.topups.customer', 'Customer')}
                    </TableHead>
                    <TableHead className="font-medium text-slate-600">{t('admin.topups.iccid', 'ICCID')}</TableHead>
                    <TableHead className="font-medium text-slate-600">
                      {t('adminPanel.admin.topups.package', 'Package')}
                    </TableHead>
                    <TableHead className="font-medium text-slate-600">
                      {t('adminPanel.admin.topups.customerPrice', 'Customer Price')}
                    </TableHead>
                    <TableHead className="font-medium text-slate-600">
                      {t('adminPanel.admin.topups.airalosCost', 'Airalo Cost')}
                    </TableHead>
                    <TableHead className="font-medium text-slate-600">
                      {t('adminPanel.admin.topups.margin', 'Margin')}
                    </TableHead>
                    <TableHead className="font-medium text-slate-600">
                      {t('adminPanel.admin.topups.profit', 'Profit')}
                    </TableHead>
                    <TableHead className="font-medium text-slate-600">
                      {t('adminPanel.admin.topups.status', 'Status')}
                    </TableHead>
                    <TableHead className="font-medium text-slate-600">{t('adminPanel.admin.topups.date', 'Date')}</TableHead>
                    <TableHead className="text-right font-medium text-slate-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600"></div>
                          <p className="text-sm text-slate-500">
                            {t('adminPanel.admin.topups.loadingTopups', 'Loading top-ups...')}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !topups || topups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                            <Plus className="h-8 w-8 text-slate-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-950">
                            {t('adminPanel.admin.topups.noTopupsFound', 'No top-ups found')}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {searchQuery || statusFilter !== 'all'
                              ? t('adminPanel.admin.topups.tryAdjustingFilters', 'Try adjusting your filters')
                              : t('adminPanel.admin.topups.topupsWillAppear', 'Top-up orders will appear here')}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    topups.map((topup: any) => {
                      const customerPrice = parseFloat(topup.customerPrice ?? topup.price ?? '0');
                      const airaloPrice = parseFloat(topup.airaloPrice || '0');
                      const profit = (customerPrice - airaloPrice).toFixed(2);
                      const profitColor =
                        parseFloat(profit) > 0
                          ? 'text-emerald-600'
                          : 'text-red-600';

                      return (
                        <TableRow
                          key={topup.id}
                          className="border-slate-200 hover:bg-slate-50"
                          data-testid={`row-topup-${topup.id}`}
                        >
                          <TableCell
                            className="font-mono text-xs font-medium text-slate-950"
                            data-testid={`text-topup-id-${topup.id}`}
                          >
                            {topup.displayTopupId || topup.id.substring(0, 8)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-950">
                                {topup.user?.name || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {topup.user?.email || 'N/A'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{topup.iccid || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium text-slate-950">
                                {topup.package?.title || `${topup.dataAmount} - ${topup.validity} Days`}
                              </div>
                              <div className="text-xs text-slate-500">
                                {topup.dataAmount} • {topup.validity} days
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-600">
                            ${Number(customerPrice || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-medium text-orange-600">
                            ${topup.airaloPrice}
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline" className="border-slate-300 text-slate-600">
                              +{topup.margin || 40}%
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-semibold ${profitColor}`}>${profit}</TableCell>
                          <TableCell>
                            <Badge className={statusStyles[topup.status] || 'border-slate-200 bg-slate-100 text-slate-700'} variant="outline">
                              {formatDisplayValue(topup.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {new Date(topup.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                              onClick={() => openRefundDialog(topup)}
                              disabled={topup.status === 'refunded' || refundTopupMutation.isPending}
                              data-testid={`button-refund-topup-${topup.id}`}
                            >
                              <RefreshCcw className="mr-2 h-4 w-4" />
                              Refund
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )
        }
      

        {/* Pagination */}
        {pagination.total > itemsPerPage && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <div className="text-sm text-slate-500">
              {t('adminPanel.admin.topups.showing', 'Showing')} {(currentPage - 1) * itemsPerPage + 1}{' '}
              {t('adminPanel.admin.topups.to', 'to')}{' '}
              {Math.min(currentPage * itemsPerPage, pagination.total)}{' '}
              {t('adminPanel.admin.topups.of', 'of')} {pagination.total}{' '}
              {t('adminPanel.admin.topups.topups', 'top-ups')}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={
                        currentPage === pageNum
                          ? 'w-8 bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]'
                          : 'w-8 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                      }
                      data-testid={`button-page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage >= pagination.totalPages}
                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog
        open={!!refundTopup}
        onOpenChange={(open) => {
          if (!open) closeRefundDialog();
        }}
      >
        <DialogContent className="border-slate-200 bg-white text-slate-950">
          <DialogHeader>
            <DialogTitle className="text-slate-950">Refund Top-Up</DialogTitle>
            <DialogDescription className="text-slate-500">
              Credit the customer wallet for this top-up and keep a refund transaction record.
            </DialogDescription>
          </DialogHeader>

          {refundTopup && (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Top-up</span>
                  <span className="font-mono text-slate-950">{refundTopup.displayTopupId || refundTopup.id}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-slate-500">Customer</span>
                  <span className="truncate font-medium text-slate-950">{refundTopup.user?.email || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-950" htmlFor="topup-refund-amount">
                  Refund Amount
                </label>
                <Input
                  id="topup-refund-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  className="border-slate-300 bg-white text-slate-950"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-950" htmlFor="topup-refund-reason">
                  Reason
                </label>
                <Input
                  id="topup-refund-reason"
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  placeholder="Customer requested refund"
                  className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-950" htmlFor="topup-refund-notes">
                  Notes
                </label>
                <Textarea
                  id="topup-refund-notes"
                  value={refundNotes}
                  onChange={(event) => setRefundNotes(event.target.value)}
                  placeholder="Internal notes"
                  className="border-slate-300 bg-white text-slate-950 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
              onClick={closeRefundDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]"
              onClick={() => refundTopupMutation.mutate()}
              disabled={
                refundTopupMutation.isPending ||
                !refundTopup ||
                !refundReason.trim() ||
                Number(refundAmount) <= 0
              }
            >
              {refundTopupMutation.isPending ? 'Refunding...' : 'Issue Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
