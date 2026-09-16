import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  QrCode,
  Database,
  Plus,
  Copy,
  Check,
  Smartphone,
  Signal,
  Calendar,
  Zap,
  Phone,
  MessageSquare,
  Globe,
  Package
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Order, User } from "@shared/schema";
import { formatDisplayValue } from "@/lib/displayText";
import QRCode from "qrcode";
import { normalizeAssetUrl } from "@/lib/assetUrl";

interface ESimDetailsModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type OrderWithUser = Order & { user?: User | null };

export function ESimDetailsModal({ orderId, isOpen, onClose }: ESimDetailsModalProps) {
  console.log("orderId", orderId);
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [resolvedQrUrl, setResolvedQrUrl] = useState<string | null>(null);
  const [directQrFailed, setDirectQrFailed] = useState(false);

  // Fetch order details
  const { data: order } = useQuery<OrderWithUser>({
    queryKey: [`/api/admin/orders/${orderId}`],
    enabled: !!orderId && isOpen,
  });

  // Fetch eSIM details
  const { data: esimData, isLoading: esimLoading } = useQuery<{ esim: any }>({
    queryKey: [`/api/orders/${orderId}/esim`],
    enabled: !!orderId && isOpen && !!order?.iccid,
  });

  // Fetch installation instructions
  const { data: instructionsData } = useQuery<{ instructions: any }>({
    queryKey: [`/api/esims/${order?.iccid}/instructions`],
    enabled: !!order?.iccid && isOpen,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Fetch data usage
  const { data: usageData } = useQuery<{ usage: any }>({
    queryKey: [`/api/esims/${order?.iccid}/usage`],
    enabled: !!order?.iccid && isOpen,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch available top-up packages
  const { data: topupPackagesData } = useQuery<{ packages: any[]; topupMargin: number }>({
    queryKey: [`/api/esims/${order?.iccid}/topup-packages`],
    enabled: !!order?.iccid && isOpen,
  });

  // Fetch comprehensive eSIM info with multi-language support
  const { data: esimInfoData } = useQuery<{ info: any }>({
    queryKey: [`/api/esims/${order?.iccid}/info/${selectedLanguage}`],
    enabled: !!order?.iccid && isOpen,
  });

  // Fetch branded QR code
  const { data: brandedQrData } = useQuery<{ qrCode: any }>({
    queryKey: [`/api/esims/${order?.iccid}/branded-qr`],
    enabled: !!order?.iccid && isOpen,
  });

  // Manual status refresh mutation
  const refreshStatusMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/admin/orders/${orderId}/refresh-status`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "esim"] });
      toast({
        title: "Status Refreshed",
        description: "Order status has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh order status",
        variant: "destructive",
      });
    },
  });

  // Apply top-up mutation
  const applyTopupMutation = useMutation({
    mutationFn: async (packageId: string) => {
      return apiRequest("POST", "/api/topups", {
        orderId,
        packageId,
        iccid: order?.iccid,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/esims", order?.iccid, "usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", orderId] });
      toast({
        title: "Top-Up Applied",
        description: "Top-up has been successfully applied to the eSIM",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Top-Up Failed",
        description: error.message || "Failed to apply top-up",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast({
      title: "Copied!",
      description: "Activation code copied to clipboard",
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // console.log("order", order);

  // console.log("esimData", esimData);
  const esim = esimData?.esim;
  // console.log("esim", esim);

  const instructions = instructionsData?.instructions;
  // console.log("instructions", instructions);
  const usage = usageData?.usage;
  console.log("usage", usage);
  const topupPackages = topupPackagesData?.packages || [];
  // console.log("topupPackages", topupPackages);
  const esimInfo = esimInfoData?.info;
  // console.log("esimInfo", esimInfo);
  const brandedQr = brandedQrData?.qrCode;
  // console.log("brandedQr", brandedQr);
  const topupMargin = topupPackagesData?.topupMargin || 40;
  // console.log("topupMargin", topupMargin);

  const manualActivationCode =
    instructions?.manual_code ||
    instructions?.manualCode ||
    (order as any)?.manualCode ||
    (order as any)?.manual_code ||
    order?.lpaCode ||
    (order?.qrCode && !isQrImageSource(order.qrCode) ? order.qrCode : null) ||
    (order?.smdpAddress && order?.activationCode
      ? `LPA:1$${order.smdpAddress}$${order.activationCode}`
      : null) ||
    instructions?.activation_code ||
    order?.activationCode ||
    null;
  const directQrUrl =
    order && !directQrFailed
      ? `/api/esims/${encodeURIComponent(order.id || order.iccid || "")}/qr.png?v=${encodeURIComponent(String((order as any).updatedAt || order.id || Date.now()))}`
      : null;
  const displayedQrUrl = resolvedQrUrl || directQrUrl;

  function isQrImageSource(value?: string | null) {
    const text = String(value || "").trim();
    return (
      text.startsWith("data:image/") ||
      /^https?:\/\//i.test(text) ||
      text.startsWith("/uploads/") ||
      text.startsWith("uploads/")
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function resolveQrUrl() {
      const qrSource =
        manualActivationCode ||
        esim?.lpaCode ||
        esim?.qrcode ||
        esim?.qrCode ||
        order?.lpaCode ||
        order?.qrCode ||
        instructions?.qr_code ||
        brandedQr?.qr_code ||
        null;

      if (qrSource && !isQrImageSource(qrSource)) {
        try {
          const dataUrl = await QRCode.toDataURL(qrSource);
          if (!cancelled) {
            setResolvedQrUrl(dataUrl);
          }
        } catch {
          if (!cancelled) {
            setResolvedQrUrl(null);
          }
        }
        return;
      }

      const directQr =
        instructions?.qr_code_image ||
        instructions?.qrCodeImage ||
        (order as any)?.qrCodeImage ||
        (order as any)?.qr_code_image ||
        instructions?.qr_code ||
        brandedQr?.qr_code ||
        esim?.qrCodeUrl ||
        order?.qrCodeUrl ||
        order?.lpaCode ||
        order?.qrCode ||
        null;

      if (directQr) {
        setResolvedQrUrl(normalizeAssetUrl(directQr));
        return;
      }

      const manualFallback =
        order?.activationCode ||
        instructions?.activation_code ||
        null;

      if (!manualFallback) {
        setResolvedQrUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(manualFallback);
        if (!cancelled) {
          setResolvedQrUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setResolvedQrUrl(null);
        }
      }
    }

    if (isOpen) {
      resolveQrUrl();
    } else {
      setResolvedQrUrl(null);
    }

    return () => {
      cancelled = true;
    };
  }, [brandedQr, instructions, esim, order, manualActivationCode]);

  useEffect(() => {
    setDirectQrFailed(false);
  }, [order?.id, isOpen]);

  if (!order || !order.iccid) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent data-testid="dialog-esim-details">
          <DialogHeader>
            <DialogTitle>eSIM Details</DialogTitle>
            <DialogDescription>
              No eSIM assigned to this order yet
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <Signal className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>This order doesn't have an eSIM assigned yet.</p>
            <p className="text-sm mt-2">eSIM details will appear once the order is processed.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
    { code: "it", name: "Italiano" },
    { code: "pt", name: "Português" },
    { code: "ru", name: "Русский" },
    { code: "zh", name: "中文" },
    { code: "ja", name: "日本語" },
    { code: "ko", name: "한국어" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-esim-details">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle>eSIM Management</DialogTitle>
              <DialogDescription>
                Order {order.displayOrderId} • ICCID: {order.iccid}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshStatusMutation.mutate()}
              disabled={refreshStatusMutation.isPending}
              data-testid="button-refresh-status"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshStatusMutation.isPending ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
            <TabsTrigger value="installation" data-testid="tab-installation">Installation</TabsTrigger>
            <TabsTrigger value="usage" data-testid="tab-usage">Usage</TabsTrigger>
            <TabsTrigger value="topups" data-testid="tab-topups">Top-Ups</TabsTrigger>
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
                  {languages.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {esimLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                        <p className="font-mono text-xs font-medium" data-testid="text-iccid">{esim.iccid || order.iccid}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={usage?.status === 'active' ? 'default' : 'secondary'} data-testid="badge-status">
                          {esim.status || 'Unknown'}
                        </Badge>
                      </div>
                      {esim.created_at && (
                        <div>
                          <p className="text-sm text-muted-foreground">Created</p>
                          <p className="text-sm font-medium">{new Date(esim.created_at).toLocaleDateString()}</p>
                        </div>
                      )}
                      {esim.activation_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Activated</p>
                          <p className="text-sm font-medium">{new Date(esim.activation_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {esim.expired_at && (
                        <div>
                          <p className="text-sm text-muted-foreground">Expires</p>
                          <p className="text-sm font-medium">{new Date(esim.expired_at).toLocaleDateString()}</p>
                        </div>
                      )}
                      {esim.imsis && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">IMSI</p>
                          <p className="text-xs font-mono">{Array.isArray(esim.imsis) ? esim.imsis.join(', ') : esim.imsis}</p>
                        </div>
                      )}
                      {esim.lpa && (
                        <div>
                          <p className="text-sm text-muted-foreground">SM-DP+ Address</p>
                          <p className="mt-1 rounded-md border border-slate-200 bg-white p-2 text-xs font-mono text-slate-950 shadow-sm break-all dark:border-slate-200 dark:bg-white dark:text-slate-950">{esim.lpa}</p>
                        </div>
                      )}
                      {esim.matching_id && (
                        <div>
                          <p className="text-sm text-muted-foreground">Activation Code</p>
                          <p className="mt-1 rounded-md border border-slate-200 bg-white p-2 text-xs font-mono font-medium text-slate-950 shadow-sm break-all dark:border-slate-200 dark:bg-white dark:text-slate-950">{esim.matching_id}</p>
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
                      {esim.airalo_code && (
                        <div>
                          <p className="text-sm text-muted-foreground">Airalo Code</p>
                          <p className="font-mono text-sm">{esim.airalo_code}</p>
                        </div>
                      )}
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
                            <p className="font-medium" data-testid="text-package">{esim.package.title}</p>
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
                            <p className="font-medium">{typeof esim.package.operator === 'string' ? esim.package.operator : esim.package.operator?.name || 'N/A'}</p>
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
                        Comprehensive Info ({languages.find(l => l.code === selectedLanguage)?.name})
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
                        <p className="text-sm text-muted-foreground">Customer Email</p>
                        <p className="font-medium" data-testid="text-customer-email">{order.user?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Order Status</p>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {formatDisplayValue(order.status)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Customer Price</p>
                        <p className="font-medium">${order.price}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{(order as any).providerName || 'Provider'} Cost</p>
                        <p className="font-medium">${(order as any).providerCost || order.airaloPrice || 'N/A'}</p>
                      </div>
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
            {order ? (
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
                    {displayedQrUrl ? (
                      <div className="p-4 bg-white rounded-lg">
                        <img
                          src={displayedQrUrl}
                          alt="eSIM QR Code"
                          className="w-64 h-64"
                          data-testid="img-qr-code"
                          onError={() => {
                            if (resolvedQrUrl) {
                              setResolvedQrUrl(null);
                            } else {
                              setDirectQrFailed(true);
                            }
                          }}
                        />
                        {brandedQr?.qr_code && (
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            Branded QR Code
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="w-full rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                        QR code is being prepared. Use the manual activation code below if it does not appear.
                      </div>
                    )}
                    {manualActivationCode && (
                      <div className="w-full space-y-2">
                        <p className="text-sm font-medium">Manual Activation Code:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 rounded-md border border-slate-200 bg-white p-3 text-sm font-mono text-slate-950 shadow-sm break-all dark:border-slate-200 dark:bg-white dark:text-slate-950" data-testid="text-manual-code">
                            {manualActivationCode}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(manualActivationCode)}
                            data-testid="button-copy-code"
                          >
                            {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {instructions?.steps && instructions.steps.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Installation Steps</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-3">
                        {instructions.steps.map((step: string, index: number) => (
                          <li key={index} className="flex gap-3" data-testid={`text-step-${index}`}>
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                              {index + 1}
                            </span>
                            <span className="pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                )}

                {instructions?.device_compatibility && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Device Compatibility</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant={instructions.device_compatibility.compatible ? 'default' : 'destructive'}>
                          {instructions.device_compatibility.compatible ? 'Compatible' : 'Not Compatible'}
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                        ${usage.status === "active" ? "bg-green-100 text-green-700 border border-green-300"
                          : "bg-red-100 text-red-700 border border-red-300"}
                      `}
                    >
                      {usage.status === "active" ? "Active" : "Inactive"}
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
                        {usage.dataUsed || "N/A"} MB / {usage.dataTotal || "N/A"} MB
                      </span>
                    </div>

                    <Progress
                      value={usage.percentageUsed || 0}
                      className="h-2"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{usage.dataRemaining} MB remaining</span>
                      <span>{usage.percentageUsed?.toFixed(1)}% used</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-xs text-muted-foreground">ICCID</p>
                      <p className="text-sm font-semibold truncate">{usage.iccid || "N/A"}</p>
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-xs text-muted-foreground">Validity</p>
                      <p className="text-sm font-semibold">
                        {usage.expiresAt ? new Date(usage.expiresAt).toLocaleDateString() : "N/A"}
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
                      <p className="font-medium">
                        {new Date(usage.expiresAt).toLocaleString()}
                      </p>
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
                            <span>Cost: ${pkg.wholesalePrice}</span>
                            <span>•</span>
                            <span>Customer: ${pkg.price}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <p className="text-2xl font-bold">
                              ${pkg.price}
                            </p>
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
  );
}
