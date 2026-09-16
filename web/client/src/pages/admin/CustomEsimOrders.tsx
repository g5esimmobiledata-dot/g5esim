import { useState, useEffect } from 'react';
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import {
  Search,
  UserPlus,
  Package as PackageIcon,
  Globe,
  ArrowLeft,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Order, UnifiedPackage, Destination, Region, User } from '@shared/schema';
import { Link } from 'wouter';
import { formatDisplayOrderId, formatDisplayUserId } from '@shared/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatDisplayValue } from '@/lib/displayText';

type OrderWithDetails = Order & {
  package: UnifiedPackage & { destination?: Destination; region?: Region };
};

const statusStyles: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  processing: 'border-teal-200 bg-teal-50 text-teal-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-700',
  canceled: 'border-slate-200 bg-slate-100 text-slate-700',
};

export default function CustomEsimOrders() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const { toast } = useToast();

  // const { data: customOrders, isLoading } = useQuery<OrderWithDetails[]>({
  //   queryKey: ["/api/admin/orders/custom"],
  // });

  const { data: customOrders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/admin/get-custom-orders'],
    queryFn: async () => {
      const res = await fetch('/api/admin/get-custom-orders');
      const json = await res.json();

      // 🔥 IMPORTANT: extract actual array
      return Array.isArray(json)
        ? json
        : Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.data?.data)
            ? json.data.data
            : [];
    },
  });

  const [search, setSearch] = useState('');

  // const { data: customersRes } = useQuery<User[]>({
  //   queryKey: ["/api/admin/customers", search],
  //   queryFn: () => fetch(`/api/admin/customers?search=${search}`).then(res => res.json())
  // });

  // console.log(customersRes);

  /* -------------------- Customers Infinite Query -------------------- */

  const {
    data: customersPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: customersLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['/api/admin/customers', customerSearchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(
        `/api/admin/customers?page=${pageParam}&limit=10&search=${customerSearchQuery}`,
      );
      return res.json();
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination || lastPage?.data?.pagination;

      if (!pagination) return undefined;

      const { page, totalPages } = pagination;

      return page < totalPages ? page + 1 : undefined;
    },
  });

  // console.log("check customer pages data", customersPages)

  /* Flatten customers */
  const customers = customersPages?.pages.flatMap((p) => p.data?.data) ?? [];

  /* Reset scroll + data on search */
  useEffect(() => {
    refetch();
  }, [customerSearchQuery]);

  /* -------------------- Scroll Handler -------------------- */

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    if (scrollTop + clientHeight >= scrollHeight - 20) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const assignOrderMutation = useMutation({
    mutationFn: async ({ orderId, userId }: { orderId: string; userId: string }) => {
      return await apiRequest('POST', `/api/admin/orders/${orderId}/assign`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/get-custom-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders/custom'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      setAssignDialogOpen(false);
      setSelectedOrder(null);
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
      toast({
        title: t('admin.customOrders.success.title', 'Success'),
        description: t(
          'admin.customOrders.success.assigned',
          'eSIM assigned to customer successfully',
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.customOrders.error.title', 'Error'),
        description:
          error.message || t('admin.customOrders.error.assignFailed', 'Failed to assign eSIM'),
        variant: 'destructive',
      });
    },
  });

  const filteredOrders = customOrders?.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(search) ||
      order.requestId?.toLowerCase().includes(search) ||
      order.package.destination?.name.toLowerCase().includes(search) ||
      order.package.region?.name.toLowerCase().includes(search)
    );
  });

  const filteredCustomers = customers?.filter((customer) => {
    if (!customerSearchQuery) return true;
    const search = customerSearchQuery.toLowerCase();
    const displayId = formatDisplayUserId(customer.displayUserId).toLowerCase();
    return (
      customer.name?.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      displayId.includes(search)
    );
  });

  const totalCustomOrders = customOrders.length;
  const completedCustomOrders = customOrders.filter((order) => order.status === 'completed').length;
  const unassignedCustomOrders = customOrders.filter((order) => !order.isAssigned).length;

  const handleAssignClick = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setAssignDialogOpen(true);
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
  };

  const handleAssign = () => {
    if (!selectedOrder || !selectedCustomer) return;
    assignOrderMutation.mutate({ orderId: selectedOrder.id, userId: selectedCustomer.id });
  };

  // Group orders by requestId for batch orders (only show batches with 2+ eSIMs)
  const ordersGroupedByRequest: Record<string, OrderWithDetails[]> = {};
  const requestIdCounts: Record<string, number> = {};

  // First pass: count orders per requestId
  filteredOrders?.forEach((order) => {
    if (order.requestId) {
      requestIdCounts[order.requestId] = (requestIdCounts[order.requestId] || 0) + 1;
    }
  });

  // Second pass: only include batches with 2+ orders
  filteredOrders?.forEach((order) => {
    if (order.requestId && requestIdCounts[order.requestId] >= 2) {
      if (!ordersGroupedByRequest[order.requestId]) {
        ordersGroupedByRequest[order.requestId] = [];
      }
      ordersGroupedByRequest[order.requestId].push(order);
    }
  });

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-slate-100 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              {t('adminPanel.admin.customOrders.title', 'Custom eSIM Orders')}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t(
                'adminPanel.admin.customOrders.description',
                'View and assign pre-purchased eSIMs to customers',
              )}
            </p>
          </div>
        </div>
        <Link href="/admin/purchase-orders" className="w-full sm:w-auto">
          <Button data-testid="button-order-more" className="w-full bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]">
            <PackageIcon className="h-4 w-4 mr-2" />
            {t('adminPanel.admin.customOrders.button.orderMore', 'Order More eSIMs')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#168b80]">
                {t('adminPanel.admin.customOrders.stats.total', 'Total Custom Orders')}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">{totalCustomOrders}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#58cbbb]">
              <PackageIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                {t('adminPanel.admin.customOrders.stats.ready', 'Ready To Assign')}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">{completedCustomOrders}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500">
              <Check className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">
                {t('adminPanel.admin.customOrders.stats.unassigned', 'Unassigned eSIMs')}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-950">{unassignedCustomOrders}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid items-end gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t(
                    'adminPanel.admin.customOrders.search.placeholder',
                    'Search by order ID, request ID, or destination...',
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-slate-300 bg-white pl-9 text-slate-950 placeholder:text-slate-400"
                  data-testid="input-search-orders"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="px-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                {t('adminPanel.admin.customOrders.filter.orderStatus', 'Order Status')}
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  className="border-slate-300 bg-white text-slate-950"
                  data-testid="select-status-filter"
                >
                  <SelectValue
                    placeholder={t('admin.customOrders.filter.status', 'Filter by status')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('adminPanel.admin.customOrders.filter.allStatuses', 'All Statuses')}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t('adminPanel.admin.customOrders.filter.pending', 'Pending')}
                  </SelectItem>
                  <SelectItem value="processing">
                    {t('adminPanel.admin.customOrders.filter.processing', 'Processing')}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t('adminPanel.admin.customOrders.filter.completed', 'Completed')}
                  </SelectItem>
                  <SelectItem value="failed">
                    {t('adminPanel.admin.customOrders.filter.failed', 'Failed')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="border-slate-300 text-slate-600">
                {filteredOrders?.length || 0} {t('adminPanel.admin.customOrders.orders', 'orders')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Orders Summary */}
      {Object.keys(ordersGroupedByRequest).length > 0 && (
        <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-950">{t('adminPanel.admin.customOrders.batch.title', 'Batch Orders')}</CardTitle>
            <CardDescription className="text-slate-500">
              {t(
                'adminPanel.admin.customOrders.batch.description',
                'Orders grouped by request ID (asynchronous batch orders)',
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(ordersGroupedByRequest).map(([requestId, orders]) => (
                <div
                  key={requestId}
                  className="rounded-md border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-slate-950">
                        {t('adminPanel.admin.customOrders.batch.requestId', 'Request ID')}:{' '}
                        <span className="font-mono text-xs">{requestId}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {t('adminPanel.admin.customOrders.batch.count', '{{count}} eSIM{{plural}} in batch', {
                          count: orders.length,
                          plural: orders.length > 1 ? 's' : '',
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusStyles[orders[0].status]}>
                      {formatDisplayValue(orders[0].status)}
                    </Badge>
                  </div>
                  <div className="grid gap-2">
                    {orders.map((order, idx) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded bg-white p-2"
                        data-testid={`batch-order-${order.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-slate-500 min-w-[60px]">
                            {t('adminPanel.admin.customOrders.batch.esimNumber', 'eSIM #{{number}}', {
                              number: idx + 1,
                            })}
                          </span>
                          {order.package.destination && (
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{order.package.destination.flagEmoji}</span>
                              <span className="text-sm font-medium text-slate-950">
                                {order.package.destination.name}
                              </span>
                            </div>
                          )}
                          {order.package.region && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-slate-400" />
                              <span className="text-sm font-medium text-slate-950">
                                {order.package.region.name}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-slate-500">
                            {order.dataAmount} • {order.validity} days
                          </span>
                        </div>
                        {order.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#58cbbb] text-slate-700 hover:bg-[#e9fbf8] hover:text-[#168b80]"
                            onClick={() => handleAssignClick(order)}
                            disabled={order.isAssigned}
                            data-testid={`button-assign-${order.id}`}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            {/* {t('admin.customOrders.button.assign', 'Assign')} */}
                            {order.isAssigned ? 'Assigned' : 'Assign'}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Custom Orders Table */}
      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-950">{t('adminPanel.admin.customOrders.table.title', 'All Custom Orders')}</CardTitle>
          <CardDescription className="text-slate-500">
            {t('adminPanel.admin.customOrders.table.description', 'Complete list of unassigned eSIMs')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoading && (!filteredOrders || filteredOrders?.length === 0) ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <PackageIcon className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-950">
                {t('admin.customOrders.empty.title', 'No custom orders')}
              </h3>
              <p className="text-sm text-slate-500">
                {t(
                  'admin.customOrders.empty.description',
                  'Order eSIMs to assign to customers',
                )}
              </p>
              <Link href="/admin/purchase-orders">
                <Button className="mt-4 bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]" data-testid="button-start-ordering">
                  <PackageIcon className="h-4 w-4 mr-2" />
                  {t('admin.customOrders.button.orderEsims', 'Order eSIMs')}
                </Button>
              </Link>
            </div>
          ) : (<div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-medium text-slate-600">
                    {t('adminPanel.admin.customOrders.table.orderId', 'Order ID')}
                  </TableHead>
                  <TableHead className="font-medium text-slate-600">
                    {t('adminPanel.admin.customOrders.table.requestId', 'Request ID')}
                  </TableHead>
                  <TableHead className="font-medium text-slate-600">
                    {t('adminPanel.admin.customOrders.table.destination', 'Destination')}
                  </TableHead>
                  <TableHead className="font-medium text-slate-600">
                    {t('adminPanel.admin.customOrders.table.package', 'Package')}
                  </TableHead>
                  <TableHead className="font-medium text-slate-600">
                    {t('adminPanel.admin.customOrders.table.iccid', 'ICCID')}
                  </TableHead>
                  <TableHead className="font-medium text-slate-600">
                    {t('adminPanel.admin.customOrders.table.status', 'Status')}
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600">
                    {t('adminPanel.admin.customOrders.table.action', 'Action')}
                  </TableHead>
                  <TableHead className="font-medium text-slate-600">{t("adminPanel.admin.customOrders.table.assignedTo", "Assigned To")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                        <p className="text-sm text-slate-500">
                          {t('admin.customOrders.loading', 'Loading orders...')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !filteredOrders || filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                          <PackageIcon className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-950">
                          {t('adminPanel.admin.customOrders.empty.title', 'No custom orders')}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {t(
                            'adminPanel.admin.customOrders.empty.description',
                            'Order eSIMs to assign to customers',
                          )}
                        </p>
                        <Link href="/admin/purchase-orders">
                          <Button className="mt-4 bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]" data-testid="button-start-ordering">
                            <PackageIcon className="h-4 w-4 mr-2" />
                            {t('adminPanel.admin.customOrders.button.orderEsims', 'Order eSIMs')}
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="border-slate-200 hover:bg-slate-50"
                      data-testid={`row-order-${order.id}`}
                    >
                      <TableCell className="font-mono text-xs font-medium text-slate-950">
                        {formatDisplayOrderId(order.displayOrderId)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {order.requestId
                          ? `${order.requestId.slice(0, 8)}...`
                          : t('admin.customOrders.table.na', 'N/A')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.package.destination && (
                            <>
                              <span className="text-xl">{order.package.destination.flagEmoji}</span>
                              <span className="font-medium text-slate-950">
                                {order.package.destination.name}
                              </span>
                            </>
                          )}
                          {order.package.region && (
                            <>
                              <Globe className="h-4 w-4 text-slate-400" />
                              <span className="font-medium text-slate-950">
                                {order.package.region.name}
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium text-slate-950">
                            {order.dataAmount}
                          </div>
                          <div className="text-xs text-slate-500">
                            {order.validity} days
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {order.iccid || t('admin.customOrders.table.pending', 'Pending')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[order.status]}>
                          {formatDisplayValue(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {order.status === 'completed' ? (
                          <Button
                            size="sm"
                            className="bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]"
                            onClick={() => handleAssignClick(order)}
                            disabled={order.isAssigned}
                            data-testid={`button-assign-${order.id}`}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            {/* {t('admin.customOrders.button.assign', 'Assign')} */}
                            {order.isAssigned ? 'Assigned' : 'Assign'}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {order.status === 'processing'
                              ? t('admin.customOrders.table.processingStatus', 'Processing...')
                              : formatDisplayValue(order.status)}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {order.isAssigned && order.user ? (
                          <div className="text-sm">
                            <div className="font-medium text-slate-950">
                              {order.user.name || 'No Name'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {order.user.email}
                            </div>
                            <div className="text-xs font-mono text-slate-500">
                              {formatDisplayUserId(order.user.displayUserId)}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>)}

        </CardContent>
      </Card>

      {/* Assign Customer Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent
          className="border-slate-200 bg-white text-slate-950 sm:max-w-md"
          data-testid="dialog-assign-customer"
        >
          <DialogHeader>
            <DialogTitle className="text-slate-950">
              {t('adminPanel.admin.customOrders.dialog.title', 'Assign eSIM to Customer')}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {t('adminPanel.admin.customOrders.dialog.description', 'Select a customer to assign this eSIM')}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="rounded-md bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  {selectedOrder.package.destination && (
                    <>
                      <span className="text-2xl">
                        {selectedOrder.package.destination.flagEmoji}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-950">
                          {selectedOrder.package.destination.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {selectedOrder.dataAmount} • {selectedOrder.validity} days
                        </p>
                      </div>
                    </>
                  )}
                  {selectedOrder.package.region && (
                    <>
                      <Globe className="h-8 w-8 text-slate-400" />
                      <div>
                        <p className="font-semibold text-slate-950">
                          {selectedOrder.package.region.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {selectedOrder.dataAmount} • {selectedOrder.validity} days
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {selectedOrder.iccid && (
                  <div className="mt-2 border-t border-slate-200 pt-2">
                    <p className="text-xs text-slate-500">
                      ICCID: <span className="font-mono">{selectedOrder.iccid}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Customer Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-950">
                  {t('adminPanel.admin.customOrders.dialog.searchLabel', 'Search Customer')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={t(
                      'adminPanel.admin.customOrders.dialog.searchPlaceholder',
                      'Search by name, email, or customer ID...',
                    )}
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="border-slate-300 bg-white pl-9 text-slate-950 placeholder:text-slate-400"
                    data-testid="input-search-customers"
                  />
                </div>
              </div>

              {/* Customer List */}
              <div
                onScroll={handleScroll}
                className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-2"
              >
                {customersLoading ? (
                  <div className="py-6 text-center text-sm text-slate-500">
                    Loading Customers...
                  </div>
                ) : filteredCustomers.length > 0 ? (
                  <>
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedCustomer?.id === customer.id
                          ? 'border border-[#58cbbb] bg-teal-50'
                          : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-950">
                              {customer.name || 'No Name'}
                            </p>

                            <p className="text-xs text-slate-500">
                              {customer.email}
                            </p>

                            <p className="text-xs font-mono text-slate-500 mt-0.5">
                              {customer.displayUserId
                                ? formatDisplayUserId(customer.displayUserId)
                                : 'UID---'}
                            </p>
                          </div>

                          {selectedCustomer?.id === customer.id && (
                            <Check className="h-5 w-5 text-teal-600" />
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Loader bottom */}
                    {isFetchingNextPage && (
                      <div className="py-2 text-center text-sm text-slate-500">Loading more...</div>
                    )}

                    {/* No more users */}
                    {!hasNextPage && (
                      <div className="text-center py-2 text-xs text-slate-400">
                        No more Customers
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No Customers found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
              onClick={() => setAssignDialogOpen(false)}
              data-testid="button-cancel-assign"
            >
              {t('adminPanel.admin.customOrders.dialog.cancel', 'Cancel')}
            </Button>
            <Button
              className="bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]"
              onClick={handleAssign}
              disabled={!selectedCustomer || assignOrderMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {assignOrderMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-slate-950"></div>
                  {t('adminPanel.admin.customOrders.dialog.assigning', 'Assigning...')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('adminPanel.admin.customOrders.dialog.assignButton', 'Assign eSIM')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
