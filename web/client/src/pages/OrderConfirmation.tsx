import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Helmet } from 'react-helmet-async';
import {
  Check,
  Copy,
  Download,
  Mail,
  Phone,
  Smartphone,
  Clock,
  Wifi,
  AlertCircle,
  QrCode,
  ChevronDown,
  ChevronUp,
  Loader2,
  Home,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
// import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from '@/components/layout/SiteFooter';
import ReactCountryFlag from 'react-country-flag';
import QRCode from 'qrcode';
import { normalizeAssetUrl } from '@/lib/assetUrl';

type OrderDetails = {
  id: string;
  displayOrderId: number;
  status: string;
  dataAmount: string;
  validity: number;
  price: string;
  currency: string;
  qrCode: string | null;
  qrCodeUrl: string | null;
  lpaCode: string | null;
  smdpAddress: string | null;
  activationCode: string | null;
  iccid: string | null;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  usageData: {
    used: string;
    total: string;
    percentage: number;
  } | null;
  guestEmail: string | null;
  guestPhone: string | null;
  package: {
    title: string;
    countryCode: string | null;
    countryName: string | null;
  } | null;
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Processing', color: 'bg-yellow-500', icon: Clock },
  processing: { label: 'Processing', color: 'bg-teal-500', icon: Loader2 },
  completed: { label: 'Ready to Install', color: 'bg-green-500', icon: Check },
  failed: { label: 'Failed', color: 'bg-red-500', icon: AlertCircle },
};

export default function OrderConfirmation() {
  const { token } = useParams();
  const { toast } = useToast();
  const { currencies } = useCurrency();
  const [showInstallSteps, setShowInstallSteps] = useState(true);
  const [resolvedQrUrl, setResolvedQrUrl] = useState<string | null>(null);

  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find((c) => c.code === currencyCode)?.symbol || '$';
  };

  const {
    data: order,
    isLoading,
    error,
  } = useQuery<OrderDetails>({
    queryKey: [`/api/guest/order/${token}`],
    enabled: !!token,
    refetchInterval: (data) => {
      if (data?.status === 'pending' || data?.status === 'processing') {
        return 5000;
      }
      return false;
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function resolveQrUrl() {
      if (!order) {
        setResolvedQrUrl(null);
        return;
      }

      const qrSource = order.lpaCode || order.qrCode || null;
      if (!qrSource) {
        if (order.qrCodeUrl) {
          setResolvedQrUrl(normalizeAssetUrl(order.qrCodeUrl));
          return;
        }

        setResolvedQrUrl(null);
        return;
      }

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
    }

    resolveQrUrl();

    return () => {
      cancelled = true;
    };
  }, [order]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* <SiteHeader /> */}
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-500 border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading your order...</p>
          </div>
        </div>
        {/* <SiteFooter /> */}
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* <SiteHeader /> */}
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center max-w-md mx-auto px-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Order Not Found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find this order. Please check your email for the correct link.
            </p>
            <Link href="/">
              <Button data-testid="button-home">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
        {/* <SiteFooter /> */}
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{`Order #${order?.displayOrderId ?? '—'} | eSIMConnect`}</title>
      </Helmet>

      {/* <SiteHeader /> */}

      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${status.color} text-white mb-4`}
            >
              <StatusIcon
                className={`w-8 h-8 ${order.status === 'processing' ? 'animate-spin' : ''}`}
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {order.status === 'completed' ? 'Your eSIM is Ready!' : 'Order Processing'}
            </h1>
            <p className="text-muted-foreground">
              Order #{order.displayOrderId?.toString().padStart(5, '0') || order.id.slice(0, 8)}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {order.status === 'completed' && resolvedQrUrl && (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                      <div className="bg-white p-4 rounded-lg shadow-inner">
                        <img
                          src={resolvedQrUrl}
                          alt="eSIM QR Code"
                          className="w-48 h-48"
                          data-testid="img-qr-code"
                        />
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="font-semibold text-foreground text-lg mb-2">
                          Scan to Install
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Open your phone's camera and scan this QR code to install your eSIM
                          automatically.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = resolvedQrUrl;
                              link.download = `esim-${order.displayOrderId}.png`;
                              link.click();
                            }}
                            data-testid="button-download-qr"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download QR
                          </Button>
                          {order.lpaCode && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(order.lpaCode!, 'LPA code')}
                              data-testid="button-copy-lpa"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy LPA Code
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(order.status === 'pending' || order.status === 'processing') && (
                <Card className="border-0 shadow-lg border-l-4 border-l-teal-500">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">
                          Your eSIM is Being Prepared
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          This usually takes less than a minute. This page will automatically update
                          when your eSIM is Ready.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {order.usageData && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wifi className="w-5 h-5" />
                      Data Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Used</span>
                        <span className="font-medium">
                          {order.usageData.used} / {order.usageData.total}
                        </span>
                      </div>
                      <Progress value={order.usageData.percentage} className="h-3" />
                      <p className="text-xs text-muted-foreground">
                        {100 - order.usageData.percentage}% remaining
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-0 shadow-lg">
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setShowInstallSteps(!showInstallSteps)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5" />
                      Installation Guide
                    </CardTitle>
                    {showInstallSteps ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </CardHeader>
                {showInstallSteps && (
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 font-semibold">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Open Camera or Settings</p>
                          <p className="text-sm text-muted-foreground">
                            Go to Settings &gt; Cellular &gt; Add eSIM, or simply open your camera.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 font-semibold">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Scan QR Code</p>
                          <p className="text-sm text-muted-foreground">
                            Point your camera at the QR code above to start the installation.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 font-semibold">
                          3
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Activate When Ready</p>
                          <p className="text-sm text-muted-foreground">
                            Turn on the eSIM when you arrive at your destination. Data starts
                            counting from first use.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    {order.package?.countryCode && (
                      <div className="w-10 h-8 rounded overflow-hidden border border-border flex-shrink-0">
                        <ReactCountryFlag
                          countryCode={order.package.countryCode}
                          svg
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        {order.package?.countryName || order.package?.title}
                      </p>
                      <p className="text-sm text-muted-foreground">eSIM Data Plan</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Data</span>
                      <span className="font-medium text-foreground">{order.dataAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Validity</span>
                      <span className="font-medium text-foreground">{order.validity} Days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={`${status.color} text-white`}>{status.label}</Badge>
                    </div>
                    {order.iccid && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ICCID</span>
                        <span className="font-mono text-xs text-foreground">
                          {order.iccid.slice(0, 10)}...
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-3 border-t border-border">
                      <span className="font-semibold text-foreground">Total Paid</span>
                      <span className="font-bold text-foreground">
                        {getCurrencySymbol(order.currency)}
                        {order.price}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {(order.guestEmail || order.guestPhone) && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base">Contact Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {order.guestEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{order.guestEmail}</span>
                      </div>
                    )}
                    {order.guestPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{order.guestPhone}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="border-0 shadow-lg bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-sm mb-1">Need Help?</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Save this page URL to Access your eSIM details anytime.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(window.location.href, 'Page URL')}
                        data-testid="button-copy-url"
                      >
                        <Copy className="w-3 h-3 mr-2" />
                        Copy Page URL
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* <SiteFooter /> */}
    </div>
  );
}
