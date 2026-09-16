import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Globe,
  Package,
  Download,
  RefreshCw,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  Smartphone,
  Signal,
  Database,
  Calendar,
  Phone,
  MessageSquare,
  Plus,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Order, UnifiedPackage, Destination } from '@shared/schema';
import { useTranslation } from '@/contexts/TranslationContext';
import { ESimDetailsModal } from '@/components/admin/ESimDetailsModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { normalizeAssetUrl } from '@/lib/assetUrl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import QRCode from 'qrcode';
import { formatDisplayValue } from '@/lib/displayText';

type OrderWithDetails = Order & {
  package: UnifiedPackage & { destination?: Destination };
};

export default function MyOrders() {
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/my-orders'],
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      processing: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || colors.pending;
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: t('common.copied', 'Copied!'),
      description: t('myOrders.copiedToClipboard', '{{field}} copied to clipboard', { field }),
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleViewDetails = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  // Fetch eSIM details
  const { data: esimData, isLoading: esimLoading } = useQuery<{ esim: any }>({
    queryKey: [`/api/orders/${selectedOrder?.id}/esim`],
    enabled: !!selectedOrder?.id && dialogOpen && !!selectedOrder?.iccid,
  });

  // Fetch installation instructions
  const { data: instructionsData } = useQuery<{ instructions: any }>({
    queryKey: [`/api/esims/${selectedOrder?.iccid}/instructions`],
    // enabled: !!selectedOrder?.iccid && dialogOpen,
  });

  // Fetch data usage
  const { data: usageData } = useQuery<{ usage: any }>({
    queryKey: [`/api/esims/${selectedOrder?.iccid}/usage`],
    enabled: !!selectedOrder?.iccid && dialogOpen,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch available top-up packages
  const { data: topupPackagesData } = useQuery<{ packages: any[]; topupMargin: number }>({
    queryKey: [`/api/esims/${selectedOrder?.iccid}/topup-packages`],
    enabled: !!selectedOrder?.iccid && dialogOpen,
  });

  // Fetch comprehensive eSIM info with multi-language support
  const { data: esimInfoData } = useQuery<{ info: any }>({
    queryKey: [`/api/esims/${selectedOrder?.iccid}/info/${selectedLanguage}`],
    enabled: !!selectedOrder?.iccid && dialogOpen,
  });

  // Fetch branded QR code
  const { data: brandedQrData } = useQuery<{ qrCode: any }>({
    queryKey: [`/api/esims/${selectedOrder?.iccid}/branded-qr`],
    enabled: !!selectedOrder?.iccid && dialogOpen,
  });

  // console.log("esimData", esimData);
  const esim = esimData?.esim;
  // console.log("esim", esim);

  const instructions = instructionsData?.instructions;
  // console.log("instructions", instructions);
  const usage = usageData?.usage;
  // console.log("usage", usage);
  const topupPackages = topupPackagesData?.packages || [];
  // console.log("topupPackages", topupPackages);
  const esimInfo = esimInfoData?.info;
  // console.log("esimInfo", esimInfo);
  const brandedQr = brandedQrData?.qrCode;
  // console.log("brandedQr", brandedQr);
  const topupMargin = topupPackagesData?.topupMargin || 40;
  // console.log("topupMargin", topupMargin);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
  ];

  // Manual status refresh mutation
  const refreshStatusMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/admin/orders/${selectedOrder?.id}/refresh-status`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', selectedOrder?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders', selectedOrder?.id, 'esim'] });
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

  // Apply top-up mutation
  const applyTopupMutation = useMutation({
    mutationFn: async (packageId: string) => {
      return apiRequest('POST', '/api/topups', {
        orderId: selectedOrder?.id,
        packageId,
        iccid: selectedOrder?.iccid,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/esims', selectedOrder?.iccid, 'usage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders', selectedOrder?.id] });
      toast({
        title: 'Top-Up Applied',
        description: 'Top-up has been successfully applied to the eSIM',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Top-Up Failed',
        description: error.message || 'Failed to apply top-up',
        variant: 'destructive',
      });
    },
  });

  // const copyToClipboard = (text: string) => {
  //   navigator.clipboard.writeText(text);
  //   setCopiedCode(true);
  //   toast({
  //     title: "Copied!",
  //     description: "Activation code copied to clipboard",
  //   });
  //   setTimeout(() => setCopiedCode(false), 2000);
  // };

  const formatPrice = (amount: string | number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  const isImageQrValue = (value?: string | null) => {
    const text = String(value || '').trim();
    return (
      text.startsWith('data:image/') ||
      /^https?:\/\//i.test(text) ||
      text.startsWith('/uploads/') ||
      text.startsWith('uploads/')
    );
  };

  const toQrImageUrl = async (value?: string | null) => {
    const text = String(value || '').trim();
    if (!text) return null;

    if (isImageQrValue(text)) {
      return normalizeAssetUrl(text.startsWith('uploads/') ? `/${text}` : text);
    }

    return QRCode.toDataURL(text, {
      margin: 1,
      width: 320,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    });
  };

  const getQrImage = async (order: OrderWithDetails) => {
    return (
      (await toQrImageUrl(order.qrCodeUrl)) ||
      (await toQrImageUrl(order.qrCode)) ||
      (await toQrImageUrl(order.lpaCode)) ||
      (await toQrImageUrl(instructions?.qr_code)) ||
      (await toQrImageUrl(instructions?.manual_code)) ||
      (await toQrImageUrl(instructions?.activation_code))
    );
  };


  const fetchInstructions = async (iccid: string) => {
    const response = await apiRequest(
      "GET",
      `/api/esims/${iccid}/instructions`
    );

    // 👇 IMPORTANT
    const data = await response.json();

    return data;
  };



  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          {t('website.myOrders.title', 'My Orders')}
        </h1>
        <p className="text-muted-foreground">
          {t('website.myOrders.description', 'View and manage your eSIM purchases')}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="hover-elevate" data-testid={`card-order-${order.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border-2 border-gray-100 dark:border-gray-700">
                      {order.package.destination?.countryCode ? (
                        <img
                          src={`https://flagcdn.com/${order.package.destination.countryCode.toLowerCase()}.svg`}
                          alt={order.package.destination.name || 'Flag'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Globe className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {order.package.destination?.name || 'eSIM'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {order.package?.title || `${order.dataAmount || ''} • ${order.validity || ''} ${t('website.common.days', 'days')}`}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(order.status)} variant="secondary">
                    {t(`website.myOrders.status.${order.status}`, formatDisplayValue(order.status))}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {t('website.myOrders.orderId', 'Order ID')}
                    </div>
                    <div className="font-mono text-sm">{order.displayOrderId}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {t('website.myOrders.amountPaid', 'Amount Paid')}
                    </div>
                    {/* <div className="font-medium">${order.price}</div> */}
                    <div className="font-medium">
                      {formatPrice(order.price, order.currency || order.orderCurrency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {t('website.myOrders.purchaseDate', 'Purchase Date')}
                    </div>
                    <div className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Status-based content */}
                {order.status === 'completed' && order.iccid && (
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                            {t('website.myOrders.esimReady', 'eSIM Ready for Installation')}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            {t(
                              'website.myOrders.esimReadyDesc',
                              'Your eSIM is ready! Installation instructions have been sent to your email.',
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleViewDetails(order)}
                        size="sm"
                        data-testid={`button-view-details-${order.id}`}
                      >
                        <Smartphone className="h-4 w-4 mr-2" />
                        {t('website.myOrders.viewInstallationDetails', 'View Installation Details')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            let qr = await getQrImage(order);

                            if (!qr && order.iccid) {
                              const res = await fetchInstructions(order.iccid);
                              const inst = res?.instructions;
                              qr =
                                (await toQrImageUrl(inst?.qr_code)) ||
                                (await toQrImageUrl(inst?.manual_code)) ||
                                (await toQrImageUrl(inst?.activation_code));
                            }

                            if (!qr) {
                              toast({
                                title: "QR Not Available",
                                description: "QR code not found.",
                                variant: "destructive",
                              });
                              return;
                            }

                            setQrUrl(qr);
                            setQrOpen(true);
                          } catch (err) {
                            console.error(err);
                            toast({
                              title: "QR Error",
                              description: "Failed to load QR code.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code
                      </Button>
                    </div>
                  </div>
                )}

                {order.status === 'processing' && (
                  <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600 mt-0.5"></div>
                      <div className="flex-1">
                        <p className="font-medium text-teal-900 dark:text-teal-100 mb-1">
                          {t('website.myOrders.processingOrder', 'Processing Your Order')}
                        </p>
                        <p className="text-sm text-teal-700 dark:text-teal-300">
                          {order.orderType === 'batch'
                            ? t(
                              'website.myOrders.processingBatch',
                              "Your eSIM is being provisioned. You'll receive installation instructions via email within a few minutes.",
                            )
                            : t(
                              'website.myOrders.processingRegular',
                              'Your eSIM is being processed. This usually takes a few moments.',
                            )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {order.status === 'failed' && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-red-900 dark:text-red-100 mb-1">
                          {t('website.myOrders.orderFailed', 'Order Failed')}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                          {t(
                            'website.myOrders.orderFailedDesc',
                            'Something went wrong with your order. Please contact support for assistance.',
                          )}
                        </p>
                        <Link href="/support">
                          <Button variant="outline" size="sm">
                            {t('website.myOrders.contactSupport', 'Contact Support')}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('website.myOrders.noOrders', 'No orders yet')}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t(
                'website.myOrders.noOrdersDesc',
                'Start exploring our destinations and get your first eSIM',
              )}
            </p>
            <Link href="/destinations">
              <Button
                className="bg-teal-500 hover:bg-teal-600 text-white"
                data-testid="button-browse-destinations"
              >
                {t('website.myOrders.browseDestinations', 'Browse Destinations')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}



      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          data-testid="dialog-esim-details"
        >
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <DialogTitle>eSIM Management</DialogTitle>
                <DialogDescription>
                  Order {selectedOrder?.displayOrderId} • ICCID: {selectedOrder?.iccid}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details" data-testid="tab-details">
                Details
              </TabsTrigger>
              <TabsTrigger value="installation" data-testid="tab-installation">
                Installation
              </TabsTrigger>
              <TabsTrigger value="usage" data-testid="tab-usage">
                Usage
              </TabsTrigger>
              {/* <TabsTrigger value="topups" data-testid="tab-topups">
                Top-Ups
              </TabsTrigger> */}
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-4 w-4" />
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-48" data-testid="select-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {esimLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : esim ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        eSIM Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">ICCID</p>
                          {/* <p className="font-mono text-xs font-medium" data-testid="text-iccid">{esim?.iccid || order?.iccid}</p> */}

                          <p className="font-mono text-xs font-medium" data-testid="text-iccid">
                            {esim?.iccid || selectedOrder?.iccid}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge
                            variant={esim.status === 'activated' ? 'default' : 'secondary'}
                            data-testid="badge-status"
                          >
                            {esim.status || 'Unknown'}
                          </Badge>
                        </div>
                        {esim.created_at && (
                          <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="text-sm font-medium">
                              {new Date(esim.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {esim.activation_date && (
                          <div>
                            <p className="text-sm text-muted-foreground">Activated</p>
                            <p className="text-sm font-medium">
                              {new Date(esim.activation_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {esim.expired_at && (
                          <div>
                            <p className="text-sm text-muted-foreground">Expires</p>
                            <p className="text-sm font-medium">
                              {new Date(esim.expired_at).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {esim.imsis && (
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">IMSI</p>
                            <p className="text-xs font-mono">
                              {Array.isArray(esim.imsis) ? esim.imsis.join(', ') : esim.imsis}
                            </p>
                          </div>
                        )}
                        {esim.lpa && (
                          <div>
                            <p className="text-sm text-muted-foreground">SM-DP+ Address</p>
                            <p className="text-xs font-mono">{esim.lpa}</p>
                          </div>
                        )}
                        {esim.matching_id && (
                          <div>
                            <p className="text-sm text-muted-foreground">Activation Code</p>
                            <p className="text-xs font-mono font-medium">{esim.matching_id}</p>
                          </div>
                        )}
                        {esim.qrcode && (
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">QR Code Data</p>
                            <p className="text-xs font-mono truncate">{esim.qrcode}</p>
                          </div>
                        )}
                        {esim.confirmation_code && (
                          <div>
                            <p className="text-sm text-muted-foreground">Confirmation Code</p>
                            <p className="font-medium">{esim.confirmation_code}</p>
                          </div>
                        )}
                        {esim.apn_type && (
                          <div>
                            <p className="text-sm text-muted-foreground">APN Type</p>
                            <Badge variant="outline">{esim.apn_type}</Badge>
                          </div>
                        )}
                        {esim.apn_value && (
                          <div>
                            <p className="text-sm text-muted-foreground">APN Value</p>
                            <p className="font-medium">{esim.apn_value}</p>
                          </div>
                        )}
                        {esim.is_roaming !== undefined && (
                          <div>
                            <p className="text-sm text-muted-foreground">Roaming</p>
                            <Badge variant={esim.is_roaming ? 'default' : 'secondary'}>
                              {esim.is_roaming ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        )}
                        {esim.voucher_code && (
                          <div>
                            <p className="text-sm text-muted-foreground">Voucher Code</p>
                            <p className="font-mono font-medium">{esim.voucher_code}</p>
                          </div>
                        )}
                        {/* {esim.airalo_code && (
                          <div>
                            <p className="text-sm text-muted-foreground">Airalo Code</p>
                            <p className="font-mono text-sm">{esim.airalo_code}</p>
                          </div>
                        )} */}
                      </div>
                    </CardContent>
                  </Card>

                  {esim.package && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Package Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        <div className="grid grid-cols-2 gap-4">
                          {esim.package.title && (
                            <div className="col-span-2">
                              <p className="text-sm text-muted-foreground">Package Name</p>
                              <p className="font-medium" data-testid="text-package">
                                {esim.package.title}
                              </p>
                            </div>
                          )}
                          {esim.package.id && (
                            <div className="col-span-2">
                              <p className="text-sm text-muted-foreground">Package ID</p>
                              <p className="text-xs font-mono">{esim.package.id}</p>
                            </div>
                          )}
                          {esim.package.data && (
                            <div>
                              <p className="text-sm text-muted-foreground">Data</p>
                              <p className="font-medium">{esim.package.data}</p>
                            </div>
                          )}
                          {esim.package.validity && (
                            <div>
                              <p className="text-sm text-muted-foreground">Validity</p>
                              <p className="font-medium">{esim.package.validity} days</p>
                            </div>
                          )}
                          {esim.package.price && (
                            <div>
                              <p className="text-sm text-muted-foreground">Price</p>
                              <p className="font-medium">${esim.package.price}</p>
                            </div>
                          )}
                          {esim.package.operator && (
                            <div>
                              <p className="text-sm text-muted-foreground">Operator</p>
                              <p className="font-medium">
                                {typeof esim.package.operator === 'string'
                                  ? esim.package.operator
                                  : esim.package.operator?.name || 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {esimInfo && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Globe className="h-5 w-5" />
                          Comprehensive Info (
                          {languages.find((l) => l.code === selectedLanguage)?.name})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          {esimInfo.description && (
                            <div>
                              <p className="font-medium text-muted-foreground">Description</p>
                              <p>{esimInfo.description}</p>
                            </div>
                          )}
                          {esimInfo.operator && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="font-medium text-muted-foreground">Operator</p>
                                <p>{esimInfo.operator.name || 'N/A'}</p>
                              </div>
                              {esimInfo.operator.country && (
                                <div>
                                  <p className="font-medium text-muted-foreground">Country</p>
                                  <p>{esimInfo.operator.country}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {esimInfo.coverage && (
                            <div>
                              <p className="font-medium text-muted-foreground">Coverage</p>
                              <p>{esimInfo.coverage}</p>
                            </div>
                          )}
                          {esimInfo.fair_usage_policy && (
                            <div>
                              <p className="font-medium text-muted-foreground">Fair Usage Policy</p>
                              <p>{esimInfo.fair_usage_policy}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Signal className="h-5 w-5" />
                        Order Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Order Status</p>
                          <Badge
                            variant={selectedOrder.status === 'completed' ? 'default' : 'secondary'}
                          >
                            {formatDisplayValue(selectedOrder.status)}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Customer Price</p>
                          <p className="font-medium">${selectedOrder.price}</p>
                        </div>
                        {/* <div>
                          <p className="text-sm text-muted-foreground">Airalo Cost</p>
                          <p className="font-medium">${selectedOrder.airaloPrice}</p>
                        </div> */}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Failed to load eSIM details</p>
                </div>
              )}
            </TabsContent>

            {/* Installation Tab */}
            <TabsContent value="installation" className="space-y-4 mt-4">
              {instructions ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" />
                        QR Code Installation
                      </CardTitle>
                      <CardDescription>
                        Scan this QR code with your device to install the eSIM
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                      {(brandedQr?.qr_code || instructions.qr_code) && (
                        <div className="p-4 bg-white rounded-lg">
                          <img
                            src={brandedQr?.qr_code || instructions.qr_code}
                            alt="eSIM QR Code"
                            className="w-64 h-64"
                            data-testid="img-qr-code"
                          />
                          {brandedQr?.qr_code && (
                            <p className="text-xs text-center text-muted-foreground mt-2">
                              Branded QR Code
                            </p>
                          )}
                        </div>
                      )}
                      {instructions.manual_code && (
                        <div className="w-full space-y-2">
                          <p className="text-sm font-medium">Manual Activation Code:</p>
                          <div className="flex items-center gap-2">
                            <code
                              className="flex-1 p-3 bg-muted rounded-md text-sm font-mono break-all"
                              data-testid="text-manual-code"
                            >
                              {instructions.manual_code}
                            </code>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                copyToClipboard(instructions.manual_code, 'manual_code')
                              }
                              data-testid="button-copy-code"
                            >
                              {copiedField === 'manual_code' ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {instructions.steps && instructions.steps.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Installation Steps</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-3">
                          {instructions.steps.map((step: string, index: number) => (
                            <li
                              key={index}
                              className="flex gap-3"
                              data-testid={`text-step-${index}`}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white text-sm font-medium">
                                {index + 1}
                              </span>
                              <span className="pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  )}

                  {instructions.device_compatibility && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Device Compatibility</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              instructions.device_compatibility.compatible
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {instructions.device_compatibility.compatible
                              ? 'Compatible'
                              : 'Not Compatible'}
                          </Badge>
                          {instructions.device_compatibility.requirements && (
                            <p className="text-sm text-muted-foreground">
                              {instructions.device_compatibility.requirements}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              )}
            </TabsContent>

            {/* Usage Tab */}
            <TabsContent value="usage" className="space-y-4 mt-4">
              {usage ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Data Usage
                      </CardTitle>
                      <CardDescription>
                        Real-time consumption tracking and validity details
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`
                                   px-3 py-1 text-xs rounded-full font-medium
                                   ${usage.status === 'active'
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-red-100 text-red-700 border border-red-300'
                          }
                                 `}
                      >
                        {usage.status === 'active' ? 'Active' : 'Inactive'}
                      </span>

                      {usage.isUnlimited && (
                        <span className="px-3 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-700 border border-blue-300">
                          Unlimited Plan
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* MAIN DATA USAGE */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Data Used</span>
                        <span className="font-semibold">
                          {usage.dataUsed || 'N/A'} MB / {usage.dataTotal || 'N/A'} MB
                        </span>
                      </div>

                      <Progress value={usage.percentageUsed || 0} className="h-2" />

                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{usage.dataRemaining} MB remaining</span>
                        <span>{usage.percentageUsed?.toFixed(1)}% used</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <p className="text-xs text-muted-foreground">ICCID</p>
                        <p className="text-sm font-semibold truncate">{usage.iccid || 'N/A'}</p>
                      </div>

                      <div className="p-4 rounded-lg border bg-muted/30">
                        <p className="text-xs text-muted-foreground">Validity</p>
                        <p className="text-sm font-semibold">
                          {usage.expiresAt ? new Date(usage.expiresAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* VOICE + SMS SECTION */}
                    {(usage.voiceTotal > 0 || usage.textTotal > 0) && (
                      <div className="pt-4 border-t space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Calls & Messages
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Voice */}
                          {usage.voiceTotal > 0 && (
                            <div className="space-y-2 p-4 rounded-lg border bg-muted/40">
                              <div className="flex justify-between text-sm">
                                <span>Voice</span>
                                <span className="font-medium">
                                  {usage.voiceUsed}/{usage.voiceTotal} mins
                                </span>
                              </div>
                              <Progress value={(usage.voicePercentageUsed || 0) * 100} />
                              <p className="text-xs text-right text-muted-foreground">
                                {Math.round((usage.voicePercentageUsed || 0) * 100)}% Used
                              </p>
                            </div>
                          )}

                          {/* SMS */}
                          {usage.textTotal > 0 && (
                            <div className="space-y-2 p-4 rounded-lg border bg-muted/40">
                              <div className="flex justify-between text-sm">
                                <span>SMS</span>
                                <span className="font-medium">
                                  {usage.textUsed}/{usage.textTotal}
                                </span>
                              </div>
                              <Progress value={(usage.textPercentageUsed || 0) * 100} />
                              <p className="text-xs text-right text-muted-foreground">
                                {Math.round((usage.textPercentageUsed || 0) * 100)}% Used
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* FOOTER */}
                    {usage.expiresAt && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Valid Until</p>
                        <p className="font-medium">{new Date(usage.expiresAt).toLocaleString()}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
            </TabsContent>

            {/* Top-Ups Tab */}
            <TabsContent value="topups" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Available Top-Up Packages
                  </CardTitle>
                  <CardDescription>
                    eSIM-specific top-up Packages with {topupMargin}% margin pricing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {topupPackages.length > 0 ? (
                    <div className="grid gap-4">
                      {topupPackages.map((pkg, index) => (
                        <div
                          key={pkg.id}
                          className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                          data-testid={`card-topup-${index}`}
                        >
                          <div className="flex-1 space-y-1">
                            <h4 className="font-medium">{pkg.title}</h4>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Zap className="h-4 w-4" />
                                {pkg.dataAmount}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {pkg.validity} days
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                              <span>Customer: ${pkg.price}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right">
                              <p className="text-2xl font-bold">${pkg.price}</p>
                              <p className="text-xs text-muted-foreground">
                                +{topupMargin}% margin
                              </p>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => applyTopupMutation.mutate(pkg.id)}
                              disabled={applyTopupMutation.isPending}
                            >
                              {applyTopupMutation.isPending ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4 mr-2" />
                              )}
                              Apply Top-Up
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Plus className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No top-up Packages available for this eSIM</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>

          {qrUrl ? (
            <div className="mx-auto rounded-xl border border-slate-700 bg-white p-3">
              <img
                src={qrUrl}
                alt="QR Code"
                className="h-64 w-64 object-contain"
                onError={() => {
                  setQrOpen(false);
                  setQrUrl(null);
                  toast({
                    title: 'QR Error',
                    description: 'The saved QR image could not be loaded. Please refresh the order status or contact support.',
                    variant: 'destructive',
                  });
                }}
              />
            </div>
          ) : (
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-400">
              QR code not available
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-2">
            Scan this QR with your phone to install eSIM
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
