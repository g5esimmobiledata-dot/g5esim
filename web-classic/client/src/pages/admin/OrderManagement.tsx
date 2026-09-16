import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search,
  Eye,
  Mail,
  Download,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Order, UnifiedPackage, User, Destination } from '@shared/schema';
import { formatDisplayOrderId, formatDisplayUserId } from '@shared/utils';
import { ESimDetailsModal } from '@/components/admin/ESimDetailsModal';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAdmin } from '@/hooks/use-admin';
import { formatDisplayValue } from '@/lib/displayText';
import QRCode from 'qrcode';
import { normalizeAssetUrl } from '@/lib/assetUrl';

type FailoverAttempt = {
  providerId: string;
  providerName?: string;
  timestamp: string;
  success: boolean;
  error?: string;
  margin?: number;
};

type OrderWithDetails = Order & {
  user: User | null;
  package: UnifiedPackage & { destination?: Destination };
  originalProviderName?: string;
  finalProviderName?: string;
};

function hasProviderFulfillment(order: OrderWithDetails) {
  return Boolean(order.iccid) && (
    Boolean(order.providerOrderId) ||
    Boolean(order.airaloOrderId) ||
    Boolean(order.qrCode) ||
    Boolean(order.qrCodeUrl) ||
    Boolean(order.activationCode) ||
    Boolean(order.smdpAddress)
  );
}

const statusStyles: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  processing: 'border-teal-200 bg-teal-50 text-teal-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
  permanently_failed: 'border-slate-200 bg-slate-100 text-slate-700',
  'permanently failed': 'border-slate-200 bg-slate-100 text-slate-700',
  refunded: 'border-blue-200 bg-blue-50 text-blue-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-700',
  canceled: 'border-slate-200 bg-slate-100 text-slate-700',
};

export default function OrderManagement() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [selectedOrderQrUrl, setSelectedOrderQrUrl] = useState<string | null>(null);
  const [esimDetailsOrderId, setEsimDetailsOrderId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();
  const { user } = useAdmin();


  // console.log('orders', selectedOrder);
  // console.log('esimDetailsOrderId', esimDetailsOrderId);

  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/admin/orders'],
  });

  useEffect(() => {
    let cancelled = false;

    async function resolveSelectedOrderQr() {
      if (!selectedOrder) {
        setSelectedOrderQrUrl(null);
        return;
      }

      if (selectedOrder.qrCodeUrl) {
        setSelectedOrderQrUrl(normalizeAssetUrl(selectedOrder.qrCodeUrl));
        return;
      }

      const qrSource = selectedOrder.qrCode || selectedOrder.lpaCode || selectedOrder.activationCode;
      if (!qrSource) {
        setSelectedOrderQrUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(qrSource);
        if (!cancelled) {
          setSelectedOrderQrUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setSelectedOrderQrUrl(null);
        }
      }
    }

    resolveSelectedOrderQr();

    return () => {
      cancelled = true;
    };
  }, [selectedOrder]);

  const sendInstructionsMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest('POST', `/api/admin/orders/${orderId}/resend-installation-email`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: t('common.common.success', 'Success'),
        description: t(
          'admin.orders.instructionsSent',
          'Installation instructions sent successfully',
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.common.error', 'Error'),
        description:
          error.message ||
          t('admin.orders.failedToSendInstructions', 'Failed to send instructions'),
        variant: 'destructive',
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest('PUT', `/api/admin/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: t('common.common.success', 'Success'),
        description: t('admin.orders.statusUpdated', 'Order status updated successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.common.error', 'Error'),
        description:
          error.message || t('admin.orders.failedToUpdateStatus', 'Failed to update order status'),
        variant: 'destructive',
      });
    },
  });

  const fulfillOrderMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      return await apiRequest('PATCH', `/api/admin/orders/${orderId}`, { status: 'completed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: t('common.common.success', 'Success'),
        description: t('admin.orders.fulfillmentStarted', 'Provider fulfillment completed successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.common.error', 'Error'),
        description:
          error.message || t('admin.orders.failedToFulfill', 'Failed to fulfill order with provider'),
        variant: 'destructive',
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest('DELETE', `/api/admin/orders/${orderId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: t('common.common.success', 'Success'),
        description: t('admin.orders.deleteSuccess', 'Order deleted successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.common.error', 'Error'),
        description: error.message || t('admin.orders.failedToDelete', 'Failed to delete order'),
        variant: 'destructive',
      });
    },
  });

  const fetchPendingOrdersMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/orders/fetch-pending', {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: t('admin.orders.fetchComplete', 'Fetch Complete'),
        description:
          data.message ||
          t('admin.orders.pendingOrdersChecked', 'Pending orders checked successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.common.error', 'Error'),
        description:
          error.message || t('admin.orders.failedToFetchPending', 'Failed to fetch pending orders'),
        variant: 'destructive',
      });
    },
  });

  // CSV Export Function
  const exportToCSV = () => {

    // console.log(user?.email, user?.email === "de****@di***")
    // return
    if (user?.email === "de****@di***") {
      return toast({
        title: t("comman.error", "Error"),
        description: "Demo users are not allowed to perform this action",
        variant: 'destructive',
      })
    }

    if (!orders || orders.length === 0) {
      toast({
        title: t('common.common.noData', 'No Data'),
        description: t('admin.orders.noOrdersToExport', 'There are no orders to export.'),
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      t('admin.orders.orderId', 'Order ID'),
      t('admin.orders.customerName', 'Customer Name'),
      t('admin.orders.customerEmail', 'Customer Email'),
      t('admin.orders.customerId', 'Customer ID'),
      t('admin.orders.destination', 'Destination'),
      t('admin.orders.package', 'Package'),
      t('admin.orders.dataAmount', 'Data Amount'),
      t('admin.orders.validityDays', 'Validity (Days)'),
      t('admin.orders.quantity', 'Quantity'),
      t('admin.orders.customerPrice', 'Customer Price'),
      t('admin.orders.airaloCost', 'Airalo Cost'),
      t('admin.orders.profit', 'Profit'),
      t('admin.orders.currency', 'Currency'),
      t('admin.orders.status', 'Status'),
      t('admin.orders.iccid', 'ICCID'),
      t('admin.orders.qrCode', 'QR Code'),
      t('admin.orders.orderDate', 'Order Date'),
      t('admin.orders.webhookReceived', 'Webhook Received'),
    ];

    const rows = orders.map((order) => {
      const customerPrice = parseFloat(order.price as string);
      const airaloPrice = order.airaloPrice ? parseFloat(order.airaloPrice as string) : 0;
      const profit = (customerPrice - airaloPrice) * order.quantity;
      return [
        formatDisplayOrderId(order.displayOrderId),
        order.user?.name || t('common.unassigned', 'Unassigned'),
        order.user?.email || t('admin.orders.notAssigned', 'Not assigned'),
        order.user ? formatDisplayUserId(order.user.displayUserId) : t('common.na', 'N/A'),
        order.package.destination?.name || t('common.global', 'Global'),
        order.package.title,
        order.dataAmount,
        order.validity,
        order.quantity,
        customerPrice.toFixed(2),
        airaloPrice.toFixed(2),
        profit.toFixed(2),
        order.currency,
        order.status,
        order.iccid || t('common.pending', 'Pending'),
        order.qrCodeUrl ? t('common.available', 'Available') : t('common.pending', 'Pending'),
        new Date(order.createdAt).toLocaleString(),
        order.webhookReceivedAt
          ? new Date(order.webhookReceivedAt).toLocaleString()
          : t('common.na', 'N/A'),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `esim-orders-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t('admin.orders.exportSuccess', 'Export Successful'),
      description: t('admin.orders.exportedOrders', `Exported ${orders.length} orders to CSV.`),
    });
  };

  const filteredOrders = orders?.filter((order) => {
    const matchesSearch =
      order.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.package.destination?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false;

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
  const totalOrders = orders?.length || 0;
  const completedOrders = orders?.filter((order) => order.status === 'completed').length || 0;
  const failedOrders =
    orders?.filter((order) =>
      ['failed', 'permanently_failed', 'permanently failed', 'cancelled', 'canceled'].includes(order.status),
    ).length || 0;

  const totalPages = Math.ceil((filteredOrders?.length || 0) / itemsPerPage);
  const paginatedOrders = filteredOrders?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Manual status refresh mutation
  const refreshStatusMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      return apiRequest('POST', `/api/admin/orders/${orderId}/refresh-status`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: 'Status Refreshed',
        description: 'Order status has been updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Refresh Failed',
        description: error.message || 'Failed to refresh order status',
        variant: 'destructive',
      });
    },
  });

  const refundOrderMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      return apiRequest('POST', `/api/admin/orders/${orderId}/refund`, {});
    },
    onSuccess: async (data) => {
      const res = await data.json();
      console.log('Refund response data:', res);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      const providerResult = res.data?.providerResult;
      const isSuccess = res.success && providerResult?.success !== false;
      toast({
        title: isSuccess ? 'Refund Processed' : 'Refund Failed',
        description:
          providerResult?.errorMessage ||
          providerResult?.message ||
          res.message ||
          'Order has been refunded successfully',
        variant: isSuccess ? 'default' : 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Refund Failed',
        description: error.message || 'Failed to process refund',
        variant: 'destructive',
      });
    },
  });


  const formatPrice = (amount: string | number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {t('adminPanel.admin.orders.title', 'Order Management')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('adminPanel.admin.orders.description', 'Manage and track all eSIM orders')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800 dark:hover:text-white sm:w-auto"
            onClick={() => fetchPendingOrdersMutation.mutate()}
            disabled={fetchPendingOrdersMutation.isPending}
            data-testid="button-fetch-pending"
          >
            <RefreshCw
              className={`h-4 w-4 ${fetchPendingOrdersMutation.isPending ? 'animate-spin' : ''}`}
            />
            {t('adminPanel.admin.orders.fetchPending', 'Fetch Pending')}
          </Button>

          <Link href="/admin/purchase-orders" className="w-full sm:w-auto">
            <Button data-testid="button-order-esim" className="w-full bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]">
              <ShoppingCart className="h-4 w-4 mr-2" />
              {t('adminPanel.admin.orders.orderEsims', 'Order eSIMs')}
            </Button>
          </Link>

          <Button
            variant="outline"
            className="w-full gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800 dark:hover:text-white sm:w-auto"
            onClick={exportToCSV}
            data-testid="button-export-orders"
          >
            <Download className="h-4 w-4" />
            {t('adminPanel.admin.orders.exportOrders', 'Export Orders')}
          </Button>
        </div>

      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#168b80]">
                {t('adminPanel.admin.orders.totalOrders', 'Total Orders')}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">{totalOrders}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#58cbbb]">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                {t('adminPanel.admin.orders.completedOrders', 'Completed Orders')}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">{completedOrders}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">
                {t('adminPanel.admin.orders.failedOrders', 'Failed Orders')}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">{failedOrders}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
              <XCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <div className="p-6">
          <div className="grid items-end gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t(
                    'adminPanel.admin.orders.searchPlaceholder',
                    'Search by email, order ID, or destination...',
                  )}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border-slate-300 bg-white pl-9 text-slate-950 placeholder:text-slate-400"
                  data-testid="input-search-orders"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="px-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                {t('adminPanel.admin.orders.orderStatus', 'Order Status')}
              </label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="border-slate-300 bg-white text-slate-950"
                  data-testid="select-status-filter"
                >
                  <SelectValue placeholder={t('admin.orders.filterByStatus', 'Filter by status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('adminPanel.admin.orders.allStatuses', 'All Statuses')}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t('common.pending', 'Pending')}
                  </SelectItem>
                  <SelectItem value="processing">
                    {t('adminPanel.admin.orders.processing', 'Processing')}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t('adminPanel.admin.orders.completed', 'Completed')}
                  </SelectItem>
                  <SelectItem value="failed">{t('admin.orders.failed', 'Failed')}</SelectItem>
                  <SelectItem value="cancelled">
                    {t('adminPanel.admin.orders.cancelled', 'Cancelled')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="border-slate-300 text-slate-600">
                {filteredOrders?.length || 0} {t('admin.orders.orders', 'orders')}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        {
            !isLoading && (!paginatedOrders || paginatedOrders.length === 0) ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-slate-100">
                <Search className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
              </div>
              <div className="space-y-1 max-w-[280px] sm:max-w-md">
                <h3 className="text-base sm:text-lg font-semibold text-slate-950 leading-tight">
                  {t('admin.orders.noOrdersFound', 'No orders found')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {searchQuery || statusFilter !== 'all'
                    ? t('common.tryAdjustingFilters', 'Try adjusting your filters')
                    : t(
                      'admin.orders.ordersWillAppear',
                      'Orders will appear here once customers start purchasing',
                    )}
                </p>
              </div>
            </div> ) : (
                <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                <TableHead className="font-medium text-slate-600">
                  {t('adminPanel.admin.orders.orderId', 'Order ID')}
                </TableHead>
                <TableHead className="font-medium text-slate-600">
                  {t('adminPanel.admin.orders.customer', 'Customer')}
                </TableHead>
                <TableHead className="font-medium text-slate-600">
                  {t('adminPanel.admin.orders.destination', 'Destination')}
                </TableHead>
                <TableHead className="font-medium text-slate-600">
                  {t('adminPanel.admin.orders.package', 'Package')}
                </TableHead>
                <TableHead className="font-medium text-slate-600">
                  {t('adminPanel.admin.orders.amount', 'Amount')}
                </TableHead>
                <TableHead className="font-medium text-slate-600">
                  {t('adminPanel.admin.orders.status', 'Status')}
                </TableHead>
                <TableHead className="font-medium text-slate-600">{t('common.common.date', 'Date')}</TableHead>
                <TableHead className="text-right font-medium text-slate-600">
                  {t('common.common.actions', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                      <p className="text-sm text-slate-500">
                        {t('adminPanel.admin.orders.loadingOrders', 'Loading orders...')}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !paginatedOrders || paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                        <Search className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        {t('adminPanel.admin.orders.noOrdersFound', 'No orders found')}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {searchQuery || statusFilter !== 'all'
                          ? t('common.common.tryAdjustingFilters', 'Try adjusting your filters')
                          : t(
                            'adminPanel.admin.orders.ordersWillAppear',
                            'Orders will appear here once customers start purchasing',
                          )}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="border-slate-200 hover:bg-slate-50"
                    data-testid={`row-order-${order.id}`}
                  >
                    <TableCell className="font-mono text-xs font-medium text-slate-950">
                      {formatDisplayOrderId(order.displayOrderId)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-950">
                          {order.user?.name || t('common.common.unassigned', 'Unassigned')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {order.user?.email ||
                            t('adminPanel.admin.orders.notAssignedToCustomer', 'Not assigned to customer')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {order.package?.destination?.flagEmoji ?? '🌍'}
                        </span>
                        <span className="font-medium text-slate-950">
                          {order.package?.destination?.name ?? t('common.common.global', 'Global')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium text-slate-950">
                          {order.dataAmount}
                        </div>
                        <div className="text-xs text-slate-500">
                          {order.validity} {t('common.common.days', 'days')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      {/* ${order.price} */}
                      {formatPrice(order.price, order.currency || order.orderCurrency)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusStyles[order.status]} variant="outline">
                        {formatDisplayValue(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="border border-[#58cbbb] text-slate-700 hover:bg-[#e9fbf8] hover:text-[#168b80]"
                            data-testid={`button-actions-${order.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* View Details - Always available */}
                          <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('common.common.viewDetails', 'View Details')}
                          </DropdownMenuItem>

                          {/* Refresh Status - Always available */}
                          <DropdownMenuItem
                            onClick={() => refreshStatusMutation.mutate({ orderId: order.id })}
                            disabled={
                              refreshStatusMutation.isPending || order.status === 'refunded'
                            }
                            data-testid="button-refresh-status"
                          >
                            <RefreshCw
                              className={`h-4 w-4 mr-2 ${refreshStatusMutation.isPending ? 'animate-spin' : ''}`}
                            />
                            Refresh Status
                          </DropdownMenuItem>

                          {/* Refund - Only for completed orders */}
                          {order.status === 'completed' && (
                            <DropdownMenuItem
                              onClick={() => refundOrderMutation.mutate({ orderId: order.id })}
                              disabled={refundOrderMutation.isPending}
                              data-testid={`button-refund-${order.id}`}
                            >
                              <RefreshCw
                                className={`h-4 w-4 mr-2 ${refundOrderMutation.isPending ? 'animate-spin' : ''}`}
                              />
                              Refund
                            </DropdownMenuItem>
                          )}

                          {/* View eSIM - Only for completed orders with real provider fulfillment */}
                          {hasProviderFulfillment(order) && order.status === 'completed' && (
                            <DropdownMenuItem
                              onClick={() => setEsimDetailsOrderId(order.id)}
                              data-testid={`button-view-esim-${order.id}`}
                            >
                              <Smartphone className="mr-2 h-4 w-4" />
                              {t('adminPanel.admin.orders.viewEsim', 'View eSIM')}
                            </DropdownMenuItem>
                          )}

                          {/* Send Instructions - Only for completed orders with real provider fulfillment */}
                          {hasProviderFulfillment(order) && order.status === 'completed' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => sendInstructionsMutation.mutate(order.id)}
                                disabled={sendInstructionsMutation.isPending}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                {t('adminPanel.admin.orders.sendInstructions', 'Send Instructions')}
                              </DropdownMenuItem>
                            </>
                          )}

                          {/* Mark as Completed is not allowed until the provider returns eSIM data. */}
                          {['pending', 'processing', 'failed'].includes(order.status) &&
                            hasProviderFulfillment(order) && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: 'completed',
                                })
                              }
                              disabled={updateOrderStatusMutation.isPending}
                              data-testid={`button-mark-complete-${order.id}`}
                            >
                              {t('adminPanel.admin.orders.markAsCompleted', 'Mark as Completed')}
                            </DropdownMenuItem>
                          )}

                          {['pending', 'processing', 'failed', 'completed'].includes(order.status) &&
                            !hasProviderFulfillment(order) && (
                              <DropdownMenuItem
                                onClick={() => fulfillOrderMutation.mutate({ orderId: order.id })}
                                disabled={fulfillOrderMutation.isPending}
                                data-testid={`button-fulfill-provider-${order.id}`}
                              >
                                <RefreshCw
                                  className={`h-4 w-4 mr-2 ${fulfillOrderMutation.isPending ? 'animate-spin' : ''}`}
                                />
                                Fulfill with Provider
                              </DropdownMenuItem>
                            )}

                          {/* Delete Order - Only for non-terminal states */}
                          {['pending', 'processing', 'failed'].includes(order.status) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                if (
                                  confirm(
                                    t(
                                      'adminPanel.admin.orders.deleteConfirm',
                                      'Are you sure you want to delete this order?',
                                    ),
                                  )
                                ) {
                                  deleteOrderMutation.mutate(order.id);
                                }
                              }}
                              disabled={deleteOrderMutation.isPending}
                              data-testid={`button-delete-order-${order.id}`}
                            >
                              {t('adminPanel.admin.orders.deleteOrder', 'Delete Order')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
            )
        }
      

        {/* Pagination */}
        {filteredOrders && filteredOrders.length > itemsPerPage && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 md:flex-row">
            <div className="text-sm text-slate-600">
              {t('common.common.showing', 'Showing')} {(currentPage - 1) * itemsPerPage + 1}{' '}
              {t('common.common.to', 'to')} {Math.min(currentPage * itemsPerPage, filteredOrders.length)}{' '}
              {t('common.common.of', 'of')} {filteredOrders.length} {t('admin.orders.orders', 'orders')}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={currentPage === pageNum ? 'w-8 bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]' : 'w-8'}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('adminPanel.admin.orders.orderDetails', 'Order Details')}</DialogTitle>
            <DialogDescription>
              {t('adminPanel.admin.orders.completeInformation', 'Complete information about this order')}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('adminPanel.admin.orders.orderId', 'Order ID')}
                  </p>
                  <p className="text-sm font-mono mt-1">
                    {formatDisplayOrderId(selectedOrder.displayOrderId)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('adminPanel.admin.orders.status', 'Status')}
                  </p>
                  <Badge className={`${statusStyles[selectedOrder.status]} mt-1`} variant="outline">
                    {formatDisplayValue(selectedOrder.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('adminPanel.admin.orders.customer', 'Customer')}
                  </p>
                  <p className="text-sm mt-1">
                    {selectedOrder.user?.email || t('common.unassigned', 'Unassigned')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('adminPanel.admin.orders.amount', 'Amount')}
                  </p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    ${selectedOrder.price}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('adminPanel.admin.orders.package', 'Package')}
                  </p>
                  <p className="text-sm mt-1">
                    {selectedOrder.dataAmount} • {selectedOrder.validity} {t('common.common.days', 'days')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('common.common.date', 'Date')}
                  </p>
                  <p className="text-sm mt-1">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {selectedOrder.iccid && (
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('adminPanel.admin.orders.iccid', 'ICCID')}
                  </p>
                  <p className="text-sm font-mono mt-1">{selectedOrder.iccid}</p>
                </div>
              )}
              {selectedOrderQrUrl && (
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    QR Code
                  </p>
                  <img
                    src={selectedOrderQrUrl}
                    alt="QR Code"
                    className="w-48 h-48 border rounded-lg"
                  />
                </div>
              )}

              {/* Failover History Section */}
              {(() => {
                const failoverAttempts = Array.isArray(selectedOrder.failoverAttempts)
                  ? (selectedOrder.failoverAttempts as FailoverAttempt[])
                  : [];
                const showFailoverSection =
                  selectedOrder.originalProviderId ||
                  selectedOrder.finalProviderId ||
                  failoverAttempts.length > 0;

                if (!showFailoverSection) return null;

                return (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <p className="text-sm font-medium">
                        {t('adminPanel.admin.orders.providerInfo', 'Provider Information')}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {selectedOrder.originalProviderId && (
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('adminPanel.admin.orders.originalProvider', 'Original Provider')}
                          </p>
                          <p className="text-sm font-medium mt-1">
                            {selectedOrder.originalProviderName || selectedOrder.originalProviderId}
                          </p>
                        </div>
                      )}
                      {selectedOrder.finalProviderId && (
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('adminPanel.admin.orders.finalProvider', 'Final Provider')}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm font-medium">
                              {selectedOrder.finalProviderName || selectedOrder.finalProviderId}
                            </p>
                            {selectedOrder.originalProviderId &&
                              selectedOrder.originalProviderId !==
                              selectedOrder.finalProviderId && (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 text-xs"
                                >
                                  {t('adminPanel.admin.orders.failover', 'Failover')}
                                </Badge>
                              )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Failover Attempts History */}
                    {failoverAttempts.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">
                          {t('admin.orders.failoverHistory', 'Failover History')}
                        </p>
                        <div className="space-y-2">
                          {failoverAttempts.map((attempt, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md text-sm"
                            >
                              {attempt.success ? (
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              )}
                              <span className="font-medium">
                                {attempt.providerName || attempt.providerId}
                              </span>
                              {attempt.margin !== undefined && (
                                <Badge variant="outline" className="text-xs">
                                  {attempt.margin.toFixed(1)}% margin
                                </Badge>
                              )}
                              {attempt.error && (
                                <span className="text-red-500 text-xs truncate flex-1">
                                  {attempt.error}
                                </span>
                              )}
                              <span className="text-slate-400 text-xs ml-auto">
                                {new Date(attempt.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* eSIM Details Modal */}
      <ESimDetailsModal
        orderId={esimDetailsOrderId}
        isOpen={!!esimDetailsOrderId}
        onClose={() => setEsimDetailsOrderId(null)}
      />
    </div>
  );
}
