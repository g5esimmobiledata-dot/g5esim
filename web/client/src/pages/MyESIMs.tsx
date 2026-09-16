import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Smartphone, QrCode, Plus, Loader2, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Order } from '@shared/schema';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslation } from '@/contexts/TranslationContext';
import { useUser } from '@/hooks/use-user';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Copy } from "lucide-react";
import { useSettingByKey } from '@/hooks/useSettings';
import { loadRazorpayCheckout } from '@/lib/razorpay';
import { normalizeAssetUrl } from '@/lib/assetUrl';

// Razorpay Top-up Component
function RazorpayTopup({
  orderId,
  amount,
  currency,
  publicKey,
  email,
  onSuccess,
  onError,
}: {
  orderId: string;
  amount: number;
  currency: string;
  publicKey: string;
  email?: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      await loadRazorpayCheckout();
    } catch (err: any) {
      onError(err.message || 'Failed to load Razorpay checkout');
      setIsProcessing(false);
      return;
    }

    const options = {
      key: publicKey,
      amount: amount, // Amount is already in smallest unit from backend init
      currency: currency,
      name: useSettingByKey('platform_name') || 'eSIM Connect',
      description: 'Top-up Payment',
      order_id: orderId,
      prefill: { email },
      handler: async (response: any) => {
        try {
          const res = await apiRequest('POST', '/api/confirm-payment', {
            providerType: 'razorpay',
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });

          const data = await res.json();
          if (data.success) {
            onSuccess();
          } else {
            throw new Error(data.message || 'Payment verification failed');
          }
        } catch (err: any) {
          onError(err.message);
          setIsProcessing(false);
        }
      },
      modal: {
        ondismiss: () => {
          setIsProcessing(false);
        },
      },
    };

    const rzp = new window.Razorpay!(options);
    rzp.open();
  };

  return (
    <Button
      onClick={handlePayment}
      className="w-full bg-[#3399cc] hover:bg-[#287aa3] text-white"
      disabled={isProcessing}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        'Pay with Razorpay'
      )}
    </Button>
  );
}

// PayPal Top-up Component
function PaypalTopup({
  orderId,
  amount,
  currency,
  onSuccess,
  onError,
}: {
  orderId: string;
  amount: number; // For display/context
  currency: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if PayPal SDK is loaded
    if ((window as any).paypal) {
      setIsLoaded(true);
      renderPaypalButtons();
    } else {
      // In a real app we might want to ensure SDK is loaded here
      // But it's usually loaded in index.html
      const interval = setInterval(() => {
        if ((window as any).paypal) {
          setIsLoaded(true);
          renderPaypalButtons();
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const renderPaypalButtons = () => {
    const container = document.getElementById('paypal-button-container-topup');
    if (container) container.innerHTML = '';

    (window as any).paypal
      .Buttons({
        createOrder: () => orderId,
        onApprove: async (data: any) => {
          try {
            const res = await apiRequest('POST', '/api/confirm-payment', {
              providerType: 'paypal',
              orderId: data.orderID,
            });

            const result = await res.json();
            if (result.success) {
              onSuccess();
            } else {
              throw new Error(result.message || 'Payment verification failed');
            }
          } catch (err: any) {
            onError(err.message);
          }
        },
        onError: (err: any) => {
          onError(err.message || 'PayPal error');
        },
      })
      .render('#paypal-button-container-topup');
  };

  return (
    <div className="w-full min-h-[150px] flex items-center justify-center">
      <div id="paypal-button-container-topup" className="w-full"></div>
      {!isLoaded && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
    </div>
  );
}

// Paystack Top-up Component
function PaystackTopup({
  redirectUrl,
}: {
  redirectUrl: string;
}) {
  // For Paystack, we typically redirect the user
  // In a modal context, this interrupts the flow, but it's the standard Paystack flow
  return (
    <div className="text-center space-y-4">
      <Button
        onClick={() => window.location.href = redirectUrl}
        className="w-full bg-[#0aa5db] hover:bg-[#088ab8] text-white"
      >
        Proceed to Paystack
      </Button>
      <p className="text-xs text-muted-foreground">
        You will be redirected to complete payment.
      </p>
    </div>
  );
}


function parseLPA(code: string) {
  if (!code?.startsWith("LPA:1$")) return null;

  const parts = code.replace("LPA:1$", "").split("$");

  return {
    smdpAddress: parts[0] || "",
    activationCode: parts[1] || "",
  };
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function buildLpaCode(smdpAddress?: string | null, activationCode?: string | null) {
  if (!smdpAddress || !activationCode) return null;
  return `LPA:1$${smdpAddress}$${activationCode}`;
}

function isQrImageSource(value?: string | null) {
  const text = String(value || '').trim();
  return (
    text.startsWith('data:image/') ||
    /^https?:\/\//i.test(text) ||
    text.startsWith('/uploads/') ||
    text.startsWith('uploads/')
  );
}

function getInstructionManualCode(instructions: any, order: Order | null) {
  const orderData = order as any;
  const smdpAddress = firstText(
    instructions?.smdp_address,
    instructions?.smdpAddress,
    instructions?.smdp,
    orderData?.smdpAddress,
  );
  const activationCode = firstText(
    instructions?.activation_code,
    instructions?.activationCode,
    instructions?.matching_id,
    instructions?.matchingId,
    instructions?.manual_activation_code,
    orderData?.activationCode,
  );

  return firstText(
    instructions?.manual_code,
    instructions?.manualCode,
    instructions?.lpa_code,
    instructions?.lpaCode,
    typeof instructions?.lpa === 'string' && instructions.lpa.startsWith('LPA:') ? instructions.lpa : null,
    instructions?.installation?.manualCode,
    instructions?.installation?.manual_code,
    orderData?.manualCode,
    orderData?.manual_code,
    orderData?.installation?.manualCode,
    orderData?.installation?.manual_code,
    orderData?.lpaCode,
    orderData?.qrCode && !isQrImageSource(orderData.qrCode) ? orderData.qrCode : null,
    buildLpaCode(smdpAddress, activationCode),
    activationCode,
  );
}

async function toQrImageUrl(value?: string | null, allowRawText = false) {
  const text = String(value || '').trim();
  if (!text) return null;

  if (isQrImageSource(text)) {
    return normalizeAssetUrl(text.startsWith('uploads/') ? `/${text}` : text);
  }

  const payload = text.startsWith('1$') ? `LPA:${text}` : text;
  if (!allowRawText && !payload.startsWith('LPA:')) {
    return null;
  }

  const QRCodeModule = await import('qrcode');
  const QRCode = QRCodeModule.default || QRCodeModule;
  return QRCode.toDataURL(payload, {
    margin: 1,
    width: 320,
    color: {
      dark: '#020617',
      light: '#ffffff',
    },
  });
}

async function resolveInstructionQrImage(instructions: any, order: Order | null) {
  const orderData = order as any;
  const manualCode = getInstructionManualCode(instructions, order);
  const qrPayloadCandidates = [
    manualCode?.startsWith('LPA:') ? manualCode : null,
    instructions?.qr_code,
    instructions?.qrCode,
    instructions?.qrcode,
    orderData?.qrCode,
  ];

  for (const candidate of qrPayloadCandidates) {
    if (isQrImageSource(candidate)) continue;
    const imageUrl = await toQrImageUrl(candidate, true);
    if (imageUrl) return imageUrl;
  }

  const qrImageCandidates = [
    instructions?.qr_code_image,
    instructions?.qrCodeImage,
    instructions?.installation?.qrCodeImage,
    instructions?.installation?.qr_code_image,
    instructions?.qr_code,
    instructions?.qrCode,
    instructions?.qrcode,
    instructions?.qr_code_url,
    instructions?.qrCodeUrl,
    instructions?.qrcode_url,
    orderData?.qrCodeImage,
    orderData?.qr_code_image,
    orderData?.installation?.qrCodeImage,
    orderData?.installation?.qr_code_image,
    orderData?.qrCode,
    orderData?.qrCodeUrl,
  ];

  for (const candidate of qrImageCandidates) {
    if (!isQrImageSource(candidate)) continue;
    const imageUrl = await toQrImageUrl(candidate, true);
    if (imageUrl) return imageUrl;
  }

  return null;
}

// Top-up payment form component

function TopupPaymentForm({
  packageId,
  iccid,
  orderId,
  amount,
  onSuccess,
}: {
  packageId: string;
  iccid: string;
  orderId: string;
  amount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: t('myEsims.paymentFailed', 'Payment Failed'),
          description: error.message,
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        try {
          // Confirm payment on backend
          const res = await apiRequest('POST', '/api/confirm-payment', {
            providerType: 'stripe',
            paymentIntentId: paymentIntent.id,
          });

          const response = await res.json();

          // Verify backend actually created the top-up
          if (!response || !response.topup) {
            throw new Error('Top-up creation failed on backend');
          }

          queryClient.invalidateQueries({ queryKey: ['/api/customer/orders'] });
          queryClient.invalidateQueries({ queryKey: ['/api/user/topups'] });
          queryClient.invalidateQueries({ queryKey: ['/api/esims/' + iccid + '/usage'] });

          toast({
            title: t('myEsims.topupSuccessful', 'Top-Up Successful!'),
            description: t(
              'myEsims.topupSuccessfulDesc',
              'Your additional data has been added to your eSIM',
            ),
          });

          onSuccess();
        } catch (confirmError: any) {
          toast({
            title: t('myEsims.topupFailed', 'Top-Up Failed'),
            description:
              confirmError.message ||
              t(
                'myEsims.topupFailedDesc',
                'Payment succeeded but top-up creation failed. Please contact support.',
              ),
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }
      }
    } catch (err: any) {
      toast({
        title: t('myEsims.purchaseFailed', 'Purchase Failed'),
        description: err.message || t('myEsims.purchaseFailedDesc', 'Failed to purchase top-up'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        className="w-full bg-teal-500 hover:bg-teal-600 text-white"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('myEsims.processingPayment', 'Processing Payment...')}
          </>
        ) : (
          t('myEsims.payAmount', 'Pay ${{amount}}', { amount: amount.toFixed(2) })
        )}
      </Button>
    </form>
  );
}



// ===== Static Steps =====

const ANDROID_QR_STEPS = (t: any) => [
  t("website.esim.android.step1", "Go to Settings > Network & Internet > SIMs"),
  t("website.esim.android.step2", "Tap on Download a SIM instead or Add eSIM"),
  t("website.esim.android.step3", "Tap 'Scan QR Code' or 'Use QR code'"),
  t("website.esim.android.step4", "Point your camera at the QR code below"),
  t("website.esim.android.step5", "Follow on-screen instructions to activate the eSIM"),
  t("website.esim.android.step6", "Name your eSIM (optional) and tap 'Done'")
];

const ANDROID_MANUAL_STEPS = [
  "Go to Settings > Network & Internet > SIMs",
  "Tap on \"Download a SIM instead\" or \"Add eSIM\"",
  "Select \"Enter code manually\"",
  "Enter the activation code from below",
  "Follow on-screen instructions to activate the eSIM",
  "Name your eSIM (optional) and tap \"Done\"",
];

const IOS_QR_STEPS = (t: any) => [
  t("website.esim.ios.step1", "Go to Settings > Cellular"),
  t("website.esim.ios.step2", "Tap 'Add Cellular Plan'"),
  t("website.esim.ios.step3", "Tap 'Scan QR Code'"),
  t("website.esim.ios.step4", "Point your camera at the QR code below"),
  t("website.esim.ios.step5", "Follow on-screen instructions to activate the eSIM"),
  t("website.esim.ios.step6", "Name your eSIM (optional) and tap 'Done'")
];

const IOS_MANUAL_STEPS = [
  "Go to Settings > Cellular",
  "Tap \"Add Cellular Plan\"",
  "Tap \"Enter Details Manually\"",
  "Enter the SM-DP+ Address and Activation Code",
  "Follow on-screen instructions to activate the eSIM",
  "Name your eSIM (optional) and tap \"Done\"",
];


// ===== Dialog =====

export default function MyESIMsPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useUser();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showTopups, setShowTopups] = useState(false);
  const [selectedTopupPackage, setSelectedTopupPackage] = useState<any>(null);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [selectedGateway, setSelectedGateway] = useState<any>(null); // New state for manual gateway selection
  const topupRequestIdRef = useRef(0);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [instructionQrImage, setInstructionQrImage] = useState<string | null>(null);
  const [instructionQrLoading, setInstructionQrLoading] = useState(false);
  const [instructionDirectQrFailed, setInstructionDirectQrFailed] = useState(false);

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['/api/customer/orders'],
  });

  // Filter to only completed orders with ICCIDs
  const esimOrders = orders?.filter((order) => order.status === 'completed' && order.iccid);

  const selectedInstructionIdentifier = selectedOrder?.id || selectedOrder?.iccid;

  // Fetch installation instructions
  const { data: instructionsData } = useQuery<{ instructions: any }>({
    queryKey: ['/api/esims/' + selectedInstructionIdentifier + '/instructions'],
    enabled: !!selectedInstructionIdentifier && showInstructions,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch top-up packages
  const { data: topupPackagesData } = useQuery<{ packages: any[] }>({
    queryKey: ['/api/esims/' + selectedOrder?.iccid + '/topup-packages'],
    enabled: !!selectedOrder?.iccid && showTopups,
  });

  const { data: gatewaysData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/payments/gateways'],
    enabled: showTopups,
  });

  const instructions = instructionsData?.instructions;
  const topupPackages = topupPackagesData?.packages || [];
  // Robust gateway finding
  const gatewaysList = gatewaysData?.data || (Array.isArray(gatewaysData) ? gatewaysData : []);

  // Create top-up payment intent when package AND gateway are selected
  useEffect(() => {
    // Wait for manual gateway selection
    if (selectedTopupPackage && selectedOrder && selectedGateway) {
      const topupId = selectedTopupPackage.id || selectedTopupPackage.package_id || selectedTopupPackage.providerPackageId;

      console.log('[Topup] Initiating for:', {
        iccid: selectedOrder.iccid,
        topupId,
        gatewayId: selectedGateway.id
      });

      // Increment request ID to track this specific request
      const currentRequestId = ++topupRequestIdRef.current;

      apiRequest('POST', '/api/payments/topup/init', {
        gatewayId: selectedGateway.id,
        packageId: selectedOrder.packageId,
        topupId,
        iccid: selectedOrder.iccid,
        orderId: selectedOrder.id,
      })
        .then((res) => res.json())
        .then((data: any) => {
          console.log('[Topup] Response:', data);

          // Only apply response if this is still the latest request
          if (currentRequestId === topupRequestIdRef.current) {

            // Handle success response (check for payment object)
            if (data?.payment) {

              // Stripe specific setup
              if (data.payment.provider === 'stripe' && data.payment.publicKey) {
                setStripePromise(loadStripe(data.payment.publicKey));
              }

              // Store config
              setPaymentConfig(data.payment);

            } else {
              console.error('[Topup] No payment config in response', data);
              toast({
                title: t('common.error', 'Error'),
                description: data?.message || t('myEsims.initializePaymentFailed', 'Failed to initialize payment'),
                variant: 'destructive',
              });
            }
          }
        })
        .catch((error: any) => {
          console.error('[Topup] Error:', error);
          if (currentRequestId === topupRequestIdRef.current) {
            toast({
              title: t('common.error', 'Error'),
              description:
                error.message ||
                t('myEsims.initializePaymentFailed', 'Failed to initialize payment'),
              variant: 'destructive',
            });
            setPaymentConfig(null);
          }
        });
    }
  }, [selectedTopupPackage, selectedOrder, selectedGateway, toast, t]);

  const handleSelectTopupPackage = (pkg: any) => {
    setSelectedTopupPackage(pkg);
    setPaymentConfig(null);
  };

  const handleTopupSuccess = () => {
    setSelectedTopupPackage(null);
    setPaymentConfig(null);
    setShowTopups(false);
  };






  const [activeTab, setActiveTab] = useState("android");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) setActiveTab("ios");
    if (/Android/i.test(ua)) setActiveTab("android");
  }, []);

  const manualCode = getInstructionManualCode(instructions || {}, selectedOrder);
  const lpaData = manualCode
    ? parseLPA(manualCode)
    : null;
  const directInstructionQrUrl =
    selectedOrder && !instructionDirectQrFailed
      ? `/api/esims/${encodeURIComponent(selectedOrder.id || selectedOrder.iccid || '')}/qr.png?v=${encodeURIComponent(String((selectedOrder as any).updatedAt || selectedOrder.id || Date.now()))}`
      : null;
  const displayedInstructionQrImage = directInstructionQrUrl || instructionQrImage;

  const handleCopy = async () => {
    if (!manualCode) return;
    await navigator.clipboard.writeText(manualCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let cancelled = false;

    if (!showInstructions || !selectedOrder) {
      setInstructionQrImage(null);
      setInstructionQrLoading(false);
      return;
    }

    if (!instructionDirectQrFailed) {
      setInstructionQrImage(null);
      setInstructionQrLoading(false);
      return;
    }

    setInstructionQrLoading(true);
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setInstructionQrLoading(false);
      }
    }, 8000);

    resolveInstructionQrImage(instructions || {}, selectedOrder)
      .then((imageUrl) => {
        if (!cancelled) {
          setInstructionQrImage(imageUrl);
        }
      })
      .catch((error) => {
        console.error('Failed to prepare eSIM QR image:', error);
        if (!cancelled) {
          setInstructionQrImage(null);
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!cancelled) {
          setInstructionQrLoading(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [instructions, instructionDirectQrFailed, selectedOrder, showInstructions]);

  useEffect(() => {
    setInstructionDirectQrFailed(false);
  }, [selectedOrder?.id, showInstructions]);

  return (
    <div data-testid="page-my-esims">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          {t('website.myEsims.title', 'My eSIMs')}
        </h1>
        <p className="text-muted-foreground">
          {t('website.myEsims.description', 'Manage your active eSIM packages and data usage')}
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <p className="text-slate-600 dark:text-slate-400">
              {t('myEsims.loading', 'Loading your eSIMs...')}
            </p>
          </div>
        </div>
      ) : !esimOrders || esimOrders.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent className="space-y-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mx-auto">
              <Smartphone className="h-10 w-10 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {t('myEsims.noEsims', 'No eSIMs Yet')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {t('myEsims.noEsimsDesc', 'Purchase a package to get started with your first eSIM')}
              </p>
              <Button asChild className="bg-teal-500 hover:bg-teal-600 text-white">
                <a href="/destinations">{t('myEsims.browsePackages', 'Browse Packages')}</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {esimOrders.map((order) => (
            <ESimCard
              key={order.id}
              order={order}
              onViewInstructions={() => {
                setSelectedOrder(order);
                setShowInstructions(true);
              }}
              onViewTopups={() => {
                setSelectedOrder(order);
                setShowTopups(true);
              }}
            />
          ))}
        </div>
      )}


      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("website.esim.installationInstructions", "Installation Instructions")}</DialogTitle>
            <DialogDescription>
              {t("website.esim.followSteps", "Follow these steps to activate your eSIM")}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="space-y-8">

              {/* ================= QR CODE ================= */}
              {displayedInstructionQrImage ? (
                <div className="rounded-xl border p-6 bg-slate-50 dark:bg-slate-900 flex flex-col items-center gap-4">
                  <h3 className="font-semibold text-lg">{t("website.esim.scanQr", "Scan QR Code")}</h3>
                  <div className="p-4 bg-white rounded-xl shadow">
                    <img
                      src={displayedInstructionQrImage}
                      alt="eSIM QR Code"
                      className="w-60 h-60 object-contain"
                      decoding="async"
                      loading="eager"
                      onError={() => {
                        if (displayedInstructionQrImage === directInstructionQrUrl) {
                          setInstructionDirectQrFailed(true);
                        } else {
                          setInstructionQrImage(null);
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-5 bg-muted/30 text-center text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    {instructionQrLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>
                      {t(
                        "website.esim.qrPreparing",
                        "QR code is being prepared. Use the manual activation details below if it does not appear."
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* ================= TABS ================= */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="android">{t("website.common.android", "Android")}</TabsTrigger>
                  <TabsTrigger value="ios">{t("website.common.ios", "iOS")}</TabsTrigger>
                </TabsList>

                {/* ANDROID */}
                <TabsContent value="android" className="mt-6 space-y-6">
                  <ol className="space-y-2">
                    {ANDROID_QR_STEPS(t).map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="h-6 w-6 flex items-center justify-center rounded-full bg-green-600 text-white text-sm">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </TabsContent>

                {/* IOS */}
                <TabsContent value="ios" className="mt-6 space-y-6">
                  <ol className="space-y-2">
                    {IOS_QR_STEPS(t).map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="h-6 w-6 flex items-center justify-center rounded-full bg-blue-600 text-white text-sm">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </TabsContent>
              </Tabs>

              {/* ================= ACTIVATION DETAILS ================= */}
              {manualCode && (
                <div className="rounded-xl border p-5 bg-muted/40 space-y-4">

                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">{t("website.esim.activationDetails", "Activation Details")}</h3>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md bg-black text-white hover:opacity-90 transition"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied
                        ? t("website.common.copied", "Copied")
                        : t("website.common.copy", "Copy")}
                    </button>
                  </div>

                  {lpaData && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("website.esim.smdpAddress", "SM-DP+ Address")}</p>
                        <code className="block mt-1 rounded-md border border-slate-200 bg-white p-3 text-sm font-mono text-slate-950 shadow-sm break-all dark:border-slate-200 dark:bg-white dark:text-slate-950">
                          {lpaData.smdpAddress}
                        </code>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">{t("website.esim.activationCode", "Activation Code")}</p>
                        <code className="block mt-1 rounded-md border border-slate-200 bg-white p-3 text-sm font-mono text-slate-950 shadow-sm break-all dark:border-slate-200 dark:bg-white dark:text-slate-950">
                          {lpaData.activationCode}
                        </code>
                      </div>
                    </>
                  )}

                  {!lpaData && (
                    <code className="block rounded-md border border-slate-200 bg-white p-3 text-sm font-mono text-slate-950 shadow-sm break-all dark:border-slate-200 dark:bg-white dark:text-slate-950">
                      {manualCode}
                    </code>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Top-Up Purchase Modal */}
      <Dialog
        open={showTopups}
        onOpenChange={(open) => {
          setShowTopups(open);
          if (!open) {
            setSelectedTopupPackage(null);
            setSelectedGateway(null);
            setPaymentConfig(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl w-full max-h-[90vh] flex flex-col p-0 gap-0 border-none bg-background shadow-none" data-testid="dialog-topup-packages">
          <div className="p-6 pb-4">
            <DialogHeader>
              <DialogTitle>
                {selectedTopupPackage
                  ? t('myEsims.completePayment', 'Complete Payment')
                  : t('myEsims.purchaseTopup', 'Purchase Top-Up')}
              </DialogTitle>
              <DialogDescription>
                {selectedTopupPackage
                  ? t('myEsims.securelyPay', 'Securely pay for your top-up')
                  : t('myEsims.addMoreData', 'Add more data to your eSIM')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pt-0">
            {selectedTopupPackage ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/40 rounded-xl border border-border">
                  <h3 className="font-medium mb-1">
                    {selectedTopupPackage.title ||
                      `${selectedTopupPackage.data} - ${selectedTopupPackage.validity} Days`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTopupPackage.data} • {selectedTopupPackage.validity} days validity
                  </p>
                  <p className="text-2xl font-bold mt-2">
                    ${selectedTopupPackage.customer_price || selectedTopupPackage.price}
                  </p>
                </div>

                {!selectedGateway ? (
                  /* Step 2: Gateway Selection */
                  <div className="space-y-3">
                    <h4 className="font-medium">Select Payment Method</h4>
                    {gatewaysList && gatewaysList.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {gatewaysList.map((gateway: any) => (
                          <div
                            key={gateway.id}
                            onClick={() => setSelectedGateway(gateway)}
                            className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:bg-muted/50 transition-all hover:border-primary/50"
                          >
                            <span className="font-medium">{(gateway.provider || 'unknown').toUpperCase()} ({gateway.displayName}) </span>
                            <Button variant="ghost" size="sm">Select</Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No payment methods available.</p>
                    )}
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        setSelectedTopupPackage(null); // Go back to Step 1
                      }}
                    >
                      {t('myEsims.backToPackages', 'Back to Packages')}
                    </Button>
                  </div>
                ) : (
                  /* Step 3: Payment Form */
                  <>
                    {!paymentConfig ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        <p className="ml-2 text-sm text-muted-foreground">Initializing payment...</p>
                      </div>
                    ) : selectedGateway.provider === 'stripe' ? (
                      <Elements
                        key={paymentConfig.clientSecret}
                        stripe={stripePromise}
                        options={{
                          clientSecret: paymentConfig.clientSecret,
                          appearance: {
                            theme: 'stripe',
                          },
                        }}
                      >
                        <TopupPaymentForm
                          packageId={selectedTopupPackage.id || selectedTopupPackage.package_id}
                          iccid={selectedOrder!.iccid!}
                          orderId={selectedOrder!.id}
                          amount={parseFloat(
                            selectedTopupPackage.customer_price || selectedTopupPackage.price,
                          )}
                          onSuccess={handleTopupSuccess}
                        />
                      </Elements>
                    ) : selectedGateway.provider === 'razorpay' ? (
                      <RazorpayTopup
                        orderId={paymentConfig.orderId}
                        amount={paymentConfig.amount}
                        currency={paymentConfig.currency}
                        publicKey={paymentConfig.publicKey}
                        email={user?.email}
                        onSuccess={handleTopupSuccess}
                        onError={(msg) => toast({ title: "Payment Error", description: msg, variant: "destructive" })}
                      />
                    ) : selectedGateway.provider === 'paypal' ? (
                      <PaypalTopup
                        orderId={paymentConfig.orderId}
                        amount={paymentConfig.amount}
                        currency={paymentConfig.currency}
                        onSuccess={handleTopupSuccess}
                        onError={(msg) => toast({ title: "Payment Error", description: msg, variant: "destructive" })}
                      />
                    ) : selectedGateway.provider === 'paystack' ? (
                      <PaystackTopup
                        redirectUrl={paymentConfig.redirectUrl}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p>Selected Gateway: {selectedGateway.displayName}</p>
                        <p className="text-sm text-muted-foreground">Provider not supported yet.</p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        setSelectedGateway(null); // Go back to Step 2
                        setPaymentConfig(null);
                      }}
                    >
                      Back to Payment Methods
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {topupPackages.length > 0 ? (
                  topupPackages.map((pkg: any, index: number) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row justify-between sm:items-center p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                      onClick={() => handleSelectTopupPackage(pkg)}
                      data-testid={`card-topup-${index}`}
                    >
                      <div className="mb-3 sm:mb-0">
                        <h3 className="font-medium text-foreground">
                          {pkg.title ||
                            `${pkg.data} - ${pkg.validity} ${t('common.days', 'Days')}`}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {pkg.data} • {pkg.validity} {t('myEsims.daysValidity', 'days validity')}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                        <p className="text-lg font-bold text-foreground">${pkg.customer_price || pkg.price}</p>
                        <Button
                          size="sm"
                          className="bg-teal-500 hover:bg-teal-600 text-white"
                          data-testid={`button-select-topup-${index}`}
                        >
                          {t('myEsims.select', 'Select')}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Plus className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>{t('myEsims.noTopupPackages', 'No top-up packages available')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ESimCard({
  order,
  onViewInstructions,
  onViewTopups,
}: {
  order: Order;
  onViewInstructions: () => void;
  onViewTopups: () => void;
}) {
  const { t } = useTranslation();

  const { data: usageData, isLoading } = useQuery<{ usage: any }>({
    queryKey: ['/api/esims/' + order.iccid + '/usage'],
    enabled: !!order.iccid,
    refetchInterval: 60000,
  });

  const usage = usageData?.usage;

  const formatData = (mb?: number) => {
    if (mb === undefined || mb === null) return 'N/A';
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb} MB`;
  };

  const status =
    usage?.status === 'active' || (order as any).esimStatus === 'active'
      ? 'active'
      : (usage?.expiresAt && new Date(usage.expiresAt) < new Date()) || (order as any).esimStatus === 'expired'
        ? 'expired'
        : 'inactive';

  return (
    <Card className="hover-elevate" data-testid={`card-esim-${order.id}`}>
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border-2 border-gray-100 dark:border-gray-700">
            {(order as any).package?.destination?.countryCode ? (
              <img
                src={`https://flagcdn.com/${(order as any).package.destination.countryCode.toLowerCase()}.svg`}
                alt={(order as any).package.destination.name || 'Flag'}
                className="w-full h-full object-cover"
              />
            ) : (
              <Globe className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold flex flex-col gap-1">
              <span className="truncate">{(order as any).package?.destination?.name || 'eSIM'}</span>
              <span className="text-sm font-normal text-muted-foreground truncate">
                {order.package?.title || `${order.dataAmount || ''} - ${order.validity || ''} Days`}
              </span>
            </CardTitle>
          </div>
          <div className="flex-shrink-0 self-start">
            <Badge
              variant={
                status === 'active' ? 'default' : status === 'expired' ? 'destructive' : 'secondary'
              }
            >
              {status === 'active'
                ? t('myEsims.active', 'Active')
                : status === 'expired'
                  ? t('myEsims.expired', 'Expired')
                  : t('myEsims.inactive', 'Inactive')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ICCID */}
        <div>
          <p className="text-xs text-muted-foreground">ICCID</p>
          <p className="text-sm font-mono mt-1" data-testid="text-iccid">
            {order.iccid || 'N/A'}
          </p>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-2 bg-muted rounded animate-pulse" />
          </div>
        )}

        {/* Usage Section */}
        {!isLoading && usage && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('myEsims.dataUsed', 'Data Used')}</span>

              <span className="font-medium" data-testid="text-data-usage">
                {formatData(usage.dataUsed)} / {formatData(usage.dataTotal)}
              </span>
            </div>

            <Progress value={usage.percentageUsed ?? 0} />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {(usage.percentageUsed ?? 0).toFixed(1)}% {t('website.myEsims.used', 'used')}
              </span>

              <span>
                {formatData(usage.dataRemaining)} {t('website.myEsims.remaining', 'remaining')}
              </span>
            </div>

            {usage.expiresAt && (
              <p className="text-xs text-right text-muted-foreground">
                {t('website.myEsims.validUntil', 'Valid until')}{' '}
                <span className="font-medium">
                  {new Date(usage.expiresAt).toLocaleDateString()}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onViewInstructions}
            data-testid="button-view-instructions"
          >
            <QrCode className="mr-2 h-4 w-4" />
            {t('website.myEsims.setup', 'Setup')}
          </Button>

          <Button
            size="sm"
            className="flex-1"
            onClick={onViewTopups}
            data-testid="button-purchase-topup"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('website.myEsims.topUp', 'Top Up')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

