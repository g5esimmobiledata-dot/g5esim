import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, ShoppingCart, Package, Globe, Check, ArrowLeft, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { useTranslation } from "@/contexts/TranslationContext";
import { useDebounce } from "@/hooks/use-debounce";
import type { Provider, Destination, UnifiedPackage } from "@shared/schema";
import { useCurrency } from "@/contexts/CurrencyContext";

interface PackageWithDetails extends UnifiedPackage {
  destination?: Destination | null;
  region?: { id: string; name: string } | null;
  provider?: Provider | null;
}

interface OrderResponse {
  success?: boolean;
  orders?: unknown[];
  quantity?: number;
  requestId?: string;
}

export default function AdminOrderEsim() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedPackage, setSelectedPackage] = useState<PackageWithDetails | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>("");
  const { toast } = useToast();
  const { currency } = useCurrency();

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch providers for filter dropdown
  const { data: providers } = useQuery<Provider[]>({
    queryKey: ["/api/providers"],
  });

  // Fetch destinations for filter dropdown
  const { data: destinationsData } = useQuery<Destination[]>({
    queryKey: [`/api/destinations/with-pricing?currency=${currency}`],
  });


  const [search, setSearch] = useState("");

  const filteredDestinations = useMemo(() => {
    if (!destinationsData) return [];
    return destinationsData
      .filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [destinationsData, search]);


  // console.log(destinationsData)

  const { data: response, isLoading } = useQuery({
    queryKey: ["/api/admin/packages", page, limit, debouncedSearch, selectedProviderId, selectedDestinationId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(selectedProviderId && { providerId: selectedProviderId }),
        ...(selectedDestinationId && { destinationId: selectedDestinationId }),
      });
      const res = await fetch(`/api/admin/packages?${params}`);
      if (!res.ok) throw new Error("Failed to fetch Packages");
      return res.json();
    },
  });

  const packages = response?.data || [];
  const pagination = response?.pagination;

  const placeOrderMutation = useMutation({
    mutationFn: async ({ packageId, qty }: { packageId: string; qty: number }): Promise<OrderResponse> => {
      const response = await apiRequest("POST", "/api/admin/orders/esim", { packageId, quantity: qty });
      return response as unknown as OrderResponse;
    },
    onSuccess: (data: OrderResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setOrderDialogOpen(false);
      setSelectedPackage(null);
      setQuantity(1);

      const isMultiple = data.orders && data.orders.length > 1;
      toast({
        title: t('admin.orderEsim.success.title', 'Order Placed Successfully'),
        description: isMultiple
          ? t('admin.orderEsim.success.batch', `${data.quantity} eSIMs ordered. Request ID: ${data.requestId}`)
          : t('admin.orderEsim.success.single', 'eSIM provisioned successfully. You can now assign it to a customer.'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('admin.orderEsim.error.title', 'Order Failed'),
        description: error.message || t('admin.orderEsim.error.description', 'Failed to place order'),
        variant: "destructive",
      });
    },
  });

  const handleSelectPackage = (pkg: PackageWithDetails) => {
    setSelectedPackage(pkg);
    setQuantity(1);
    setOrderDialogOpen(true);
  };

  const handlePlaceOrder = () => {
    if (!selectedPackage) return;
    placeOrderMutation.mutate({ packageId: selectedPackage.id, qty: quantity });
  };

  const totalPrice = selectedPackage ? parseFloat(selectedPackage.retailPrice?.toString() || "0") * quantity : 0;

  const handlePageChange = (newPage: number) => {
    if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/orders">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t('admin.orderEsim.title', 'Order eSIMs')}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {t('admin.orderEsim.description', 'Pre-purchase eSIMs to assign to customers later')}
              </p>
            </div>
          </div>
        </div>
        <Link href="/admin/manual-orders">
          <Button variant="outline" data-testid="button-view-custom-orders">
            <ShoppingCart className="h-4 w-4 mr-2" />
            {t('admin.orderEsim.button.viewCustom', 'View Custom Orders')}
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('admin.orderEsim.search.placeholder', 'Search packages by destination, data amount, or validity...')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-slate-50 dark:bg-slate-900"
              data-testid="input-search-packages"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Filters:</span>
            </div>
            <Select
              value={selectedProviderId}
              onValueChange={(value) => {
                setSelectedProviderId(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-provider-filter">
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers?.filter(p => p.enabled).map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedDestinationId}
              onValueChange={(value) => {
                setSelectedDestinationId(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger
                className="w-[200px]"
                data-testid="select-destination-filter"
              >
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>

              <SelectContent>
                {/* 🔍 Search Input */}
                <div className="p-2">
                  <Input
                    placeholder="Search country..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8"
                  />
                </div>

                <SelectItem value="all">All Countries</SelectItem>

                {filteredDestinations.map((destination) => (
                  <SelectItem key={destination.id} value={destination.id}>
                    {destination.name}
                  </SelectItem>
                ))}

                {filteredDestinations.length === 0 && (
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    No results found
                  </div>
                )}
              </SelectContent>
            </Select>
            {(selectedProviderId || selectedDestinationId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedProviderId("");
                  setSelectedDestinationId("");
                  setPage(1);
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Packages Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('admin.orderEsim.packages.title', 'Available Packages')}</CardTitle>
              <CardDescription>
                {t('admin.orderEsim.packages.description', 'Select a package to order eSIMs for later assignment')}
              </CardDescription>
            </div>
            {pagination && pagination.total > 0 && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, pagination.total)} of {pagination.total}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-800">
                  <TableHead className="font-semibold">{t('admin.orderEsim.table.destination', 'Destination')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.orderEsim.table.data', 'Data')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.orderEsim.table.validity', 'Validity')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.orderEsim.table.price', 'Price')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.orderEsim.table.operator', 'Operator')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.orderEsim.table.provider', 'Provider')}</TableHead>
                  <TableHead className="font-semibold text-right">{t('admin.orderEsim.table.action', 'Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{t('admin.orderEsim.loading', 'Loading packages...')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !packages || packages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                          <Package className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.orderEsim.empty.title', 'No packages found')}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {searchQuery ? t('admin.orderEsim.empty.searchHint', 'Try adjusting your search') : t('admin.orderEsim.empty.noPackages', 'No packages available')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  packages.map((pkg: PackageWithDetails) => (
                    <TableRow
                      key={pkg.id}
                      className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                      data-testid={`row-package-${pkg.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {pkg.destination ? (
                            <>
                              <span className="text-2xl">{pkg.destination.flagEmoji}</span>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {pkg.destination.name}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {pkg.destination.countryCode}
                                </p>
                              </div>
                            </>
                          ) : pkg.region ? (
                            <>
                              <Globe className="h-5 w-5 text-slate-400" />
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {pkg.region.name}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {t('admin.orderEsim.table.regional', 'Regional Package')}
                                </p>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {pkg.dataAmount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {pkg.validity} days
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ${pkg.price}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {pkg.operator || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {pkg.providerPackageTable || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleSelectPackage(pkg)}
                          size="sm"
                          data-testid={`button-order-${pkg.id}`}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {t('admin.orderEsim.button.order', 'Order')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page Numbers */}
                {(() => {
                  const pages = [];
                  const totalPages = pagination.totalPages;
                  const currentPage = page;

                  // Always show first page
                  if (totalPages > 0) {
                    pages.push(
                      <Button
                        key={1}
                        variant={currentPage === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        className="min-w-[2.5rem]"
                      >
                        1
                      </Button>
                    );
                  }

                  // Show ellipsis if needed before current range
                  if (currentPage > 3) {
                    pages.push(
                      <span key="ellipsis-start" className="px-2 text-slate-400">
                        ...
                      </span>
                    );
                  }

                  // Show pages around current page
                  const startPage = Math.max(2, currentPage - 1);
                  const endPage = Math.min(totalPages - 1, currentPage + 1);

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <Button
                        key={i}
                        variant={currentPage === i ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(i)}
                        className="min-w-[2.5rem]"
                      >
                        {i}
                      </Button>
                    );
                  }

                  // Show ellipsis if needed after current range
                  if (currentPage < totalPages - 2) {
                    pages.push(
                      <span key="ellipsis-end" className="px-2 text-slate-400">
                        ...
                      </span>
                    );
                  }

                  // Always show last page
                  if (totalPages > 1) {
                    pages.push(
                      <Button
                        key={totalPages}
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        className="min-w-[2.5rem]"
                      >
                        {totalPages}
                      </Button>
                    );
                  }

                  return pages;
                })()}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === pagination.totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Confirmation Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-order-confirm">
          <DialogHeader>
            <DialogTitle>{t('admin.orderEsim.dialog.title', 'Order eSIMs')}</DialogTitle>
            <DialogDescription>
              {t('admin.orderEsim.dialog.description', 'Configure your eSIM order. These will be unassigned and can be distributed to customers later.')}
            </DialogDescription>
          </DialogHeader>

          {selectedPackage && (
            <div className="space-y-4">
              {/* Package Info */}
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 space-y-2">
                <div className="flex items-center gap-3">
                  {selectedPackage.destination && (
                    <>
                      <span className="text-2xl">{selectedPackage.destination.flagEmoji}</span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {selectedPackage.destination.name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {selectedPackage.dataAmount} • {selectedPackage.validity} days
                        </p>
                      </div>
                    </>
                  )}
                  {selectedPackage.region && (
                    <>
                      <Globe className="h-8 w-8 text-slate-400" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {selectedPackage.region.name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {selectedPackage.dataAmount} • {selectedPackage.validity} days
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-white">
                  {t('admin.orderEsim.dialog.quantityLabel', 'Quantity (1-100 eSIMs)')}
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(Math.max(1, Math.min(100, val)));
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    if (val < 1 || val > 100) {
                      setQuantity(Math.max(1, Math.min(100, val)));
                      toast({
                        title: t('admin.orderEsim.dialog.invalidTitle', 'Invalid Quantity'),
                        description: t('admin.orderEsim.dialog.invalidDesc', 'Please enter a quantity between 1 and 100'),
                        variant: "destructive",
                      });
                    }
                  }}
                  className="bg-slate-50 dark:bg-slate-900"
                  data-testid="input-quantity"
                />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {quantity === 1
                    ? t('admin.orderEsim.dialog.singleOrder', 'Single order (synchronous - instant provisioning)')
                    : `Batch order (asynchronous - webhook delivery for ${quantity} eSIMs)`}
                </p>
              </div>

              {/* Total Price */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {t('admin.orderEsim.dialog.totalPrice', 'Total Price')}
                </span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOrderDialogOpen(false)}
              data-testid="button-cancel-order"
            >
              {t('admin.orderEsim.dialog.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={placeOrderMutation.isPending}
              data-testid="button-confirm-order"
            >
              {placeOrderMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('admin.orderEsim.dialog.ordering', 'Ordering...')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('admin.orderEsim.dialog.placeOrder', 'Place Order')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
