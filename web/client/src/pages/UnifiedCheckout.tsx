import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  ArrowLeft,
  Shield,
  Lock,
  CreditCard,
  Mail,
  Phone,
  Check,
  Loader2,
  Zap,
  Plus,
  Minus,
  Tag,
  Gift,
  Users,
  Coins,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useCurrency } from '@/contexts/CurrencyContext';
import ReactCountryFlag from 'react-country-flag';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CheckoutAuth } from '@/components/CheckoutAuth';
import PaymentGatewayRenderer from '@/components/payments/PaymentGatewayRenderer';
import { useSettingByKey } from '@/hooks/useSettings';
import { PackageDataApiRes } from '@/types/types';

type UnifiedPackage = {
  id: string;
  slug: string;
  title: string;
  dataAmount: string;
  dataMb: number | null;
  validity: number;
  validityDays: number;
  price: string;
  retailPrice: string;
  currency: string;
  isUnlimited: boolean;
  providerId: string;
  providerName: string;
  destinationId: string | null;
  operator: string | null;
  countryCode: string | null;
  countryName: string | null;
};

const formatDataAmount = (pkg: any): string => {
  if (!pkg) return 'eSIM';
  const dataMb = Number(pkg.dataMb);
  if (
    pkg.isUnlimited ||
    dataMb === -1 ||
    dataMb < 0 ||
    pkg.dataAmount === '-1MB' ||
    pkg.dataAmount?.includes('-1')
  ) {
    return 'Unlimited';
  }
  if (!isNaN(dataMb) && dataMb > 0) {
    if (dataMb >= 1024) {
      const gb = dataMb / 1024;
      if (gb === Math.floor(gb)) {
        return `${Math.floor(gb)}GB`;
      }
      return `${gb.toFixed(1)}GB`;
    }
    return `${dataMb}MB`;
  }
  if (pkg.dataAmount && !pkg.dataAmount.includes('-1')) {
    return pkg.dataAmount;
  }
  return 'Data';
};

const formatPackageTitle = (pkg: any): string => {
  const data = formatDataAmount(pkg);
  let validity = pkg.validity ?? pkg.validityDays ?? 0;
  const country = pkg.countryName || pkg.countryCode || '';

  if (validity === 0 && pkg.title) {
    const daysMatch = pkg.title.match(/(\d+)\s*Days?/i);
    if (daysMatch) {
      validity = parseInt(daysMatch[1], 10);
    }
  }

  if (country && data) {
    if (validity > 0) {
      return `${data} - ${validity} Days - ${country}`;
    }
    return `${data} - ${country}`;
  }
  if (pkg.title) {
    let formattedTitle = pkg.title
      .replace(/-1MB/g, 'Unlimited')
      .replace(/-1 MB/g, 'Unlimited')
      .replace(/-1mb/g, 'Unlimited');
    const parts = formattedTitle.match(/^(.+?)\s+(\d+(?:GB|MB)|Unlimited)\s+(\d+)\s*Days?$/i);
    if (parts) {
      return `${parts[2]} - ${parts[3]} Days - ${parts[1]}`;
    }
    return formattedTitle;
  }
  return `${data} eSIM`;
};

const checkoutSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(5, 'Please enter a valid phone number'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and privacy policy',
  }),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function UnifiedCheckout() {
  const { packageSlug } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currency, currencies } = useCurrency();
  const { user, isAuthenticated, isLoading: userLoading, refetchUser } = useUser();

  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [useWalletPayment, setUseWalletPayment] = useState(false);
  const [initResponse, setInitResponse] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Promo states
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeType, setPromoCodeType] = useState('voucher');
  const [isPromoOpen, setIsPromoOpen] = useState(true);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const siteName = useSettingByKey('platform_name');
  const [showPromo, setShowPromo] = useState(true);

  // Credits states
  const [appliedReferralCredits, setAppliedReferralCredits] = useState(0);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  const getCurrencySymbol = (currencyCode) =>
    currencies.find((c) => c.code === currencyCode)?.symbol || '$';

  // useEffect(() => {
  //   apiRequest('GET', '/api/payments/gateways')
  //     .then((res) => res.json())
  //     .then((data) => {
  //       setGateways(data.data || []);
  //       if (data.data?.length === 1) setSelectedGateway(data.data[0]);
  //     });
  // }, []);

  useEffect(() => {
    apiRequest('GET', `/api/payments/gateways?currency=${currency}&scope=checkout`)
      .then((res) => res.json())
      .then((data) => {
        setGateways(data.data || []);
        if (data.data?.length === 1) setSelectedGateway(data.data[0]);
      });
  }, [currency]);

  const { data: referralBalanceData } = useQuery({
    queryKey: ['/api/referrals/my-balance'],
    enabled: isAuthenticated,
  });

  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet'],
    enabled: isAuthenticated,
  });

  const { data: publicSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ['/api/public/settings'],
  });

  const form = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email || '',
      phone: user?.phone || '',
      acceptTerms: false,
    },
  });

  const { data: packageData, isLoading: isLoadingPackage } = useQuery<PackageDataApiRes>({
    queryKey: [`/api/unified-packages/slug/${packageSlug}`, { currency }],
    enabled: !!packageSlug,
  });

  console.log('packageData', packageData?.coverage);

  const calculateTotal = () => {
    const basePrice = parseFloat(packageData?.retailPrice || packageData?.price || '0');
    const subtotal = basePrice * quantity;
    const totalDiscount = (appliedPromo?.discount || 0) + appliedReferralCredits;
    return Math.max(subtotal - totalDiscount, 0).toFixed(2);
  };

  const availableCredits = referralBalanceData?.balance || 0;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast({
        title: 'Enter a code',
        description: 'Please enter a promo code, gift card, or referral code',
        variant: 'destructive',
      });
      return;
    }
    if (appliedPromo) {
      toast({
        title: 'Code Already Applied',
        description: 'Remove the current code first to apply a different one',
        variant: 'destructive',
      });
      return;
    }

    setIsValidatingPromo(true);
    try {
      const basePrice = parseFloat(packageData?.retailPrice || packageData?.price || '0');
      const orderAmount = basePrice * quantity;

      const res = await apiRequest('POST', '/api/validate-promo-code', {
        code: promoCode.trim(),
        type: promoCodeType,
        orderAmount,
      });

      const data = await res.json();

      if (!data.success) {
        toast({
          title: 'Invalid Code',
          description: 'This code is not valid',
          variant: 'destructive',
        });
        return;
      }

      setAppliedPromo({
        code: data.code,
        discount: data.discount,
        type: data.type,
        voucherId: data.voucherId,
        giftCardId: data.giftCardId,
        referrerId: data.referrerId,
        balance: data.balance,
        description: data.description,
      });

      // toast({
      //   title: 'Code Applied',
      //   description: data.description || `Discount of $${data.discount.toFixed(2)} applied`,
      // });

      toast({
        title: 'Code Applied',
        description:
          data.description ||
          `Discount of ${getCurrencySymbol(packageData.currency)}${data.discount.toFixed(2)} applied`,
      });

      setPromoCode('');
      setIsPromoOpen(false);
    } catch (error) {
      const extractErrorMessage = (error: any): string => {
        if (typeof error?.message !== 'string') return 'Something went wrong';

        try {
          const json = error.message.slice(error.message.indexOf('{'));
          return JSON.parse(json).message;
        } catch {
          return error.message;
        }
      };
      toast({
        title: 'Error',
        description: extractErrorMessage(error) || 'Failed to validate code',
        variant: 'destructive',
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    toast({ title: 'Code Removed', description: 'Promo code has been removed' });
  };

  const handleApplyCredits = (amount) => {
    const basePrice = parseFloat(packageData?.retailPrice || packageData?.price || '0');
    const subtotal = basePrice * quantity;
    const promoDiscount = appliedPromo?.discount || 0;
    const maxCredits = Math.min(amount, subtotal - promoDiscount, availableCredits);

    if (maxCredits <= 0) {
      toast({
        title: 'Cannot apply credits',
        description: 'Credits cannot exceed the order total',
        variant: 'destructive',
      });
      return;
    }

    setAppliedReferralCredits(Math.round(maxCredits * 100) / 100);
    toast({
      title: 'Credits Applied',
      description: `$${maxCredits.toFixed(2)} in referral credits applied to your order`,
    });
  };

  const removeCredits = () => {
    setAppliedReferralCredits(0);
    toast({
      title: 'Credits Removed',
      description: 'Referral credits have been removed from your order',
    });
  };
  const totalAmount = Number(calculateTotal());
  const isFreeOrder = totalAmount === 0;
  const orderCurrency = packageData?.currency || currency || 'USD';
  const orderCurrencyRate = Number(
    currencies.find((c) => c.code === orderCurrency)?.conversionRate || 1,
  );
  const walletBalance = Number(walletData?.balance || 0);
  const walletAmountNeededUsd = Number(
    (orderCurrency === 'USD' ? totalAmount : totalAmount / Math.max(orderCurrencyRate, 0.000001)).toFixed(2),
  );
  const walletHasFunds = isAuthenticated && walletBalance + 0.005 >= walletAmountNeededUsd;
  const checkoutSandboxRole =
    user?.role === 'agent' || user?.role === 'reseller' ? user.role : 'customer';
  const sandboxAppliesToRole =
    checkoutSandboxRole === 'reseller'
      ? publicSettings.sandbox_apply_reseller !== 'false'
      : checkoutSandboxRole === 'agent'
        ? publicSettings.sandbox_apply_agent !== 'false'
        : publicSettings.sandbox_apply_customer !== 'false';
  const accountSandboxModeActive = user?.accountMode === 'sandbox' || user?.accountMode === 'demo';
  const sandboxModeActive =
    accountSandboxModeActive ||
    (
      publicSettings.demo_mode_enabled === 'true' &&
      publicSettings.demo_mode_environment === 'sandbox' &&
      sandboxAppliesToRole
    );
  const isCryptoGateway = (gateway) => ['nowpayments', 'cryptomus'].includes(gateway?.provider);
  const getGatewayCopy = (gateway) => {
    if (gateway?.provider === 'paypal') {
      return { label: 'PayPal', detail: 'Pay with PayPal balance or linked card' };
    }
    if (gateway?.provider === 'stripe' || gateway?.provider === 'powertranz') {
      return { label: 'Credit Card', detail: gateway.displayName || 'Card payment' };
    }
    if (isCryptoGateway(gateway)) {
      return { label: 'Crypto', detail: gateway.displayName || 'USDT payment' };
    }
    return { label: gateway?.displayName || gateway?.provider?.toUpperCase(), detail: 'Payment gateway' };
  };
  const formatMoney = (amount, code = orderCurrency) =>
    `${getCurrencySymbol(code)}${Number(amount || 0).toFixed(2)}`;

  const onSubmit = async (data) => {
    // If it's a paid order but no gateway is selected
    if (!isFreeOrder && !useWalletPayment && !selectedGateway) {
      toast({
        title: 'Select payment method',
        description: 'Please choose wallet, PayPal, credit card, or crypto',
        variant: 'destructive',
      });
      return;
    }

    if (!isFreeOrder && useWalletPayment && !walletHasFunds) {
      toast({
        title: 'Wallet balance is too low',
        description: `You need ${formatMoney(walletAmountNeededUsd, 'USD')} in your wallet for this order.`,
        variant: 'destructive',
      });
      return;
    }

    if (!isFreeOrder && sandboxModeActive && !useWalletPayment) {
      toast({
        title: 'Sandbox wallet required',
        description: 'Sandbox mode uses wallet test funds so no real payment processor is charged.',
        variant: 'destructive',
      });
      return;
    }

    if (!isFreeOrder && selectedGateway && isCryptoGateway(selectedGateway) && !isAuthenticated) {
      toast({
        title: 'Login required',
        description: 'Crypto checkout is available after logging in.',
        variant: 'destructive',
      });
      return;
    }

    setCustomerInfo(data);

    const payload = {
      gatewayId: useWalletPayment ? null : selectedGateway?.id || 'free_gateway', // Optional if free/wallet
      packageId: packageData.id,
      quantity,
      currency: packageData.currency,
      orderId: `ORDER_${Date.now()}`,
      paymentMethod: useWalletPayment ? 'wallet' : 'checkout',

      // Promo
      promoCode: appliedPromo?.code || null,
      promoType: appliedPromo?.type || null,
      voucherId: appliedPromo?.voucherId || null,
      giftCardId: appliedPromo?.giftCardId || null,

      // Referral
      referralCredits: appliedReferralCredits || 0,

      // Guest info
      email: data.email,
      name: data.name || 'Guest',
    };

    apiRequest('POST', '/api/payments/init', payload)
      .then((res) => res.json())
      .then((resData) => {
        if (!resData.success) {
          toast({
            title: 'Payment Init Failed',
            description: resData.message,
            variant: 'destructive',
          });
          return;
        }

        if (resData.builtInComplete) {
          // Free order successfully verified on backend 
          // Trigger confirm-payment with 'free' provider
          const providerType = resData.payment.provider || 'free';
          const confirmUrl =
            providerType === 'wallet' || user?.id ? '/api/confirm-payment' : '/api/guest/confirm-payment';
          const metadata =
            providerType === 'wallet'
              ? resData.payment.metadata
              : {
                  packageId: packageData.id,
                  quantity: String(quantity),
                  guestAccessToken: resData.payment.guestAccessToken,
                  guestEmail: data.email,
                  guestPhone: data.phone || '',
                  promoCode: appliedPromo?.code || '',
                  promoType: appliedPromo?.type || '',
                  promoDiscount: String((appliedPromo?.discount || 0) + (appliedReferralCredits || 0)),
                  voucherId: appliedPromo?.voucherId || '',
                  giftCardId: appliedPromo?.giftCardId || '',
                  referralCredits: String(appliedReferralCredits || 0),
                  type: user?.id ? 'package_purchase' : 'guest_purchase',
                  userId: user?.id || '',
                  email: data.email,
                  currency: packageData.currency,
                  existingOrderId: resData.payment.orderId,
                };
          toast({ title: 'Processing', description: 'Finalizing order...' });
          return apiRequest('POST', confirmUrl, {
             providerType,
             orderId: resData.payment.orderId,
             walletTransactionId: resData.payment.walletTransactionId,
             metadata,
          })
          .then((r) => r.json())
          .then((confirmRes) => {
             if (confirmRes.success) {
                toast({
                  title: 'Order Confirmed 🎉',
                  description: 'Your eSIM has been activated successfully',
                });
                if (providerType === 'wallet') {
                  queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
                }
                setLocation('/account/orders');
             } else {
                toast({ title: 'Order Failed', description: confirmRes.message, variant: 'destructive' });
             }
          });
        }

        if (selectedGateway?.provider === 'powertranz') {
          console.log('PowerTranz init response:', {
            redirectData: resData.powertranz?.redirectData,
            spiToken: resData.powertranz?.spiToken,
          });
          setInitResponse({
            provider: 'powertranz',
            orderId: resData.powertranz.orderId,
            redirectData: resData.powertranz.redirectData,
            spiToken: resData.powertranz.spiToken,
          });
          return;
        }

        setInitResponse(resData.payment);
      })
      .catch((err) => {
        toast({
          title: 'Payment Init Error',
          description: err.message || 'Failed to call payment init API',
          variant: 'destructive',
        });
      });
  };

  // 3DS postMessage handling is done by PaymentGatewayRenderer component
  // which calls /api/payments/powertranz/confirm with proper credentials

  const onSubmitOLD = (data) => {
    if (!selectedGateway) {
      toast({
        title: 'Select payment method',
        description: 'Please choose a payment gateway',
        variant: 'destructive',
      });
      return;
    }

    setCustomerInfo(data);

    const payload = {
      gatewayId: selectedGateway.id,

      // 🔑 Pricing inputs (NOT amount)
      packageId: packageData.id,
      quantity,
      currency: packageData.currency,
      orderId: `ORDER_${Date.now()}`,

      // Promo
      promoCode: appliedPromo?.code || null,
      promoType: appliedPromo?.type || null,
      voucherId: appliedPromo?.voucherId || null,
      giftCardId: appliedPromo?.giftCardId || null,

      // Referral
      referralCredits: appliedReferralCredits || 0,

      // Guest info
      email: data.email,
      name: data.name || 'Guest',
    };

    apiRequest('POST', '/api/payments/init', payload)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setShowPromo(false);
          setInitResponse(resData.payment);
          toast({ title: 'Payment Initialized', description: 'You can now complete your payment' });
        } else {
          toast({
            title: 'Payment Init Failed',
            description: resData.message || 'Could not initialize payment',
            variant: 'destructive',
          });
        }
      })
      .catch((err) => {
        toast({
          title: 'Payment Init Error',
          description: err.message || 'Failed to call payment init API',
          variant: 'destructive',
        });
      });
  };

  if (isLoadingPackage) {
    return (
      <div className="min-h-screen bg-background flex flex-col dark:text-white">
        {/* <SiteHeader /> */}
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-500 border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
        {/* <SiteFooter /> */}
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* <SiteHeader /> */}
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center">
            <p className="text-muted-foreground">Package not found</p>
            <Button onClick={() => setLocation('/')} className="mt-4">
              Go Home
            </Button>
          </div>
        </div>
        {/* <SiteFooter /> */}
      </div>
    );
  }

  const unitPrice = parseFloat(packageData.retailPrice || packageData.price || '0');
  const renderPaymentOptions = () => {
    if (isFreeOrder) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Select Payment Method</h3>

        {sandboxModeActive && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="flex items-start gap-2">
              <Shield className="mt-0.5 h-4 w-4" />
              <div>
                <p className="font-medium">Sandbox Demo Mode</p>
                <p>Use wallet test funds. Checkout will create fake eSIM details and skip provider purchase.</p>
                {!isAuthenticated && <p className="mt-1">Sign in to use sandbox wallet checkout.</p>}
              </div>
            </div>
          </div>
        )}

        {isAuthenticated && (
          <button
            type="button"
            disabled={!walletHasFunds}
            onClick={() => {
              if (!walletHasFunds) return;
              setUseWalletPayment(true);
              setSelectedGateway(null);
            }}
            className={`w-full rounded-lg border p-4 text-left transition ${
              useWalletPayment
                ? 'border-teal-500 bg-teal-50 text-teal-950 dark:bg-teal-950/30 dark:text-teal-50'
                : 'border-border bg-background hover:border-teal-300'
            } ${walletHasFunds ? '' : 'opacity-60'}`}
          >
            <div className="flex items-start gap-3">
              <Wallet className="h-5 w-5 mt-0.5 text-teal-600" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">Wallet Balance</span>
                  <span className="text-sm font-semibold">{formatMoney(walletBalance, 'USD')}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {walletHasFunds
                    ? `Use ${formatMoney(walletAmountNeededUsd, 'USD')} from wallet`
                    : `Needs ${formatMoney(walletAmountNeededUsd, 'USD')} in wallet`}
                </p>
              </div>
            </div>
          </button>
        )}

        {!sandboxModeActive && (
        <div className="grid gap-3 sm:grid-cols-2">
          {gateways.map((gateway) => {
            const copy = getGatewayCopy(gateway);
            const disabled = isCryptoGateway(gateway) && !isAuthenticated;

            return (
              <button
                key={gateway.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  setUseWalletPayment(false);
                  setSelectedGateway(gateway);
                }}
                className={`rounded-lg border p-4 text-left transition ${
                  selectedGateway?.id === gateway.id && !useWalletPayment
                    ? 'border-teal-500 bg-teal-50 text-teal-950 dark:bg-teal-950/30 dark:text-teal-50'
                    : 'border-border bg-background hover:border-teal-300'
                } ${disabled ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {isCryptoGateway(gateway) ? (
                    <Coins className="h-5 w-5 mt-0.5 text-amber-600" />
                  ) : (
                    <CreditCard className="h-5 w-5 mt-0.5 text-teal-600" />
                  )}
                  <div>
                    <p className="font-medium">{copy.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {disabled ? 'Login required' : copy.detail}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{`Checkout - ${formatDataAmount(packageData)} eSIM | ${siteName}`}</title>
      </Helmet>
      {/* <SiteHeader /> */}

      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <Button variant="ghost" onClick={() => window.history.back()} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <div
            className="grid
  grid-cols-1
  lg:grid-cols-5
  gap-6 lg:gap-8"
          >
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Checkout</h1>
                <p className="text-muted-foreground">
                  Complete your purchase to get instant Access to your eSIM
                </p>
              </div>

              {showPromo && isAuthenticated && (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <Collapsible open={isPromoOpen} onOpenChange={setIsPromoOpen}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            Have promo, giftcard or referral?
                          </span>
                        </div>
                        <Plus
                          className={`w-4 h-4 transition-transform ${isPromoOpen ? 'rotate-45' : ''}`}
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4 space-y-4">
                        {!appliedPromo && (
                          <>
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                type="button"
                                variant={promoCodeType === 'voucher' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setPromoCodeType('voucher')}
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                Voucher
                              </Button>
                              <Button
                                type="button"
                                variant={promoCodeType === 'giftcard' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setPromoCodeType('giftcard')}
                              >
                                <Gift className="w-3 h-3 mr-1" />
                                Gift Card
                              </Button>
                              <Button
                                type="button"
                                variant={promoCodeType === 'referral' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setPromoCodeType('referral')}
                              >
                                <Users className="w-3 h-3 mr-1" />
                                Referral
                              </Button>
                            </div>

                            <div className="flex gap-2">
                              <Input
                                placeholder={`Enter ${promoCodeType === 'voucher' ? 'voucher' : promoCodeType === 'giftcard' ? 'gift card' : 'referral'} code`}
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value)}
                              />
                              <Button
                                type="button"
                                onClick={handleApplyPromo}
                                variant="outline"
                                disabled={isValidatingPromo}
                              >
                                {isValidatingPromo ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Apply'
                                )}
                              </Button>
                            </div>
                          </>
                        )}

                        {appliedPromo && (
                          <>
                            <p className="text-xs text-muted-foreground">
                              Only one code can be applied per order. Remove the current code to
                              apply a different one.
                            </p>
                            <div className="flex items-center justify-between bg-green-50 dark:bg-green-500/10 p-3 rounded-lg">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Check className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                    {appliedPromo.type === 'voucher'
                                      ? 'Voucher'
                                      : appliedPromo.type === 'giftcard'
                                        ? 'Gift Card'
                                        : 'Referral'}
                                    : {appliedPromo.code}
                                  </span>
                                </div>
                                {/* <span className="text-xs text-green-600 dark:text-green-500 ml-6">
                                  {appliedPromo.type === 'giftcard' && appliedPromo.balance
                                    ? `$${appliedPromo.discount.toFixed(2)} applied (Balance: $${appliedPromo.balance.toFixed(2)})`
                                    : appliedPromo.discount > 0
                                      ? `-$${appliedPromo.discount.toFixed(2)} discount`
                                      : appliedPromo.description || 'Discount applied'}
                                </span> */}

                                <span className="text-xs text-green-600 dark:text-green-500 ml-6">
                                  {appliedPromo.type === 'giftcard' && appliedPromo.balance ? (
                                    <>
                                      {getCurrencySymbol(packageData.currency)}
                                      {appliedPromo.discount.toFixed(2)} applied (Balance:
                                      {getCurrencySymbol(packageData.currency)}
                                      {appliedPromo.balance.toFixed(2)})
                                    </>
                                  ) : appliedPromo.discount > 0 ? (
                                    <>
                                      -{getCurrencySymbol(packageData.currency)}
                                      {appliedPromo.discount.toFixed(2)} discount
                                    </>
                                  ) : (
                                    appliedPromo.description || 'Discount applied'
                                  )}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removePromo}
                                className="text-red-500 hover:text-red-600"
                              >
                                Remove
                              </Button>
                            </div>
                          </>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              )}

              {/* REFERRAL CREDITS - Only for authenticated users */}
              {isAuthenticated && availableCredits > 0 && (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <Collapsible open={isCreditsOpen} onOpenChange={setIsCreditsOpen}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-amber-500" />
                          <span className="font-medium text-foreground">Use Referral Credits</span>
                          <span className="text-sm text-muted-foreground">
                            (${availableCredits.toFixed(2)} available)
                          </span>
                        </div>
                        <Plus
                          className={`w-4 h-4 transition-transform ${isCreditsOpen ? 'rotate-45' : ''}`}
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                          You have referral credits that can be used as a discount on this order.
                        </p>

                        {appliedReferralCredits > 0 ? (
                          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-amber-600" />
                              <span className="text-sm text-amber-700 dark:text-amber-400">
                                ${appliedReferralCredits.toFixed(2)} credits applied
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeCredits}
                              className="text-red-500 hover:text-red-600"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleApplyCredits(availableCredits)}
                            >
                              Apply All (${availableCredits.toFixed(2)})
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const basePrice = parseFloat(
                                  packageData?.retailPrice || packageData?.price || '0',
                                );
                                const subtotal = basePrice * quantity;
                                const halfCredits = Math.min(availableCredits / 2, subtotal);
                                handleApplyCredits(halfCredits);
                              }}
                            >
                              Apply Half ($
                              {Math.min(availableCredits / 2, parseFloat(calculateTotal())).toFixed(
                                2,
                              )}
                              )
                            </Button>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              )}

              {/* CONTACT FORM - Only show for guest users */}
              {!isAuthenticated && !initResponse && (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">Contact Information</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      We'll send your eSIM details to this email. No account required.
                    </p>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                      {...field}
                                      type="email"
                                      placeholder="your@email.com"
                                      className="pl-10"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                      {...field}
                                      type="tel"
                                      inputMode="numeric"
                                      maxLength={12}
                                      placeholder="1234567890"
                                      className="pl-10"
                                      onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        field.onChange(value);
                                      }}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="acceptTerms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4 bg-muted/30">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  I agree to the{' '}
                                  <Link href="/terms" className="text-teal-600 hover:underline">
                                    Terms of Service
                                  </Link>{' '}
                                  and{' '}
                                  <Link href="/privacy" className="text-teal-600 hover:underline">
                                    Privacy Policy
                                  </Link>
                                </FormLabel>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )}
                        />

                        {/* PAYMENT GATEWAY SELECTION */}
                        {/* {gateways.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="font-semibold text-foreground">Select Payment Method</h3>
                            <div className="flex flex-col md:flex-row gap-3 justify-center">
                              {gateways.map((gateway) => (
                                <Button
                                  key={gateway.id}
                                  type="button"
                                  variant={selectedGateway?.id === gateway.id ? '' : 'outline'}
                                  className="w-fit justify-start"
                                  onClick={() => setSelectedGateway(gateway)}
                                >
                                  {gateway.provider.toUpperCase()}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )} */}

                        {renderPaymentOptions()}

                        <Button type="submit" className="w-full bg-teal-500 text-white">
                          Continue to Payment
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              {/* PAYMENT UI - For logged in users or after guest submits */}
              {(isAuthenticated || initResponse) && (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">Payment</h3>

                    {!initResponse ? (
                      <div className="space-y-4">
                        {/* PAYMENT GATEWAY SELECTION */}
                        {/* {gateways.length > 0 && (
                          <>
                            <h3 className="font-semibold text-foreground">Select Payment Method</h3>
                            {gateways.map((gateway) => (
                              <Button
                                key={gateway.id}
                                type="button"
                                variant={selectedGateway?.id === gateway.id ? 'default' : 'outline'}
                                className="w-full
sm:w-auto
justify-start"
                                onClick={() => setSelectedGateway(gateway)}
                              >
                                {gateway.provider.toUpperCase()}
                              </Button>
                            ))}
                          </>
                        )} */}

                        {renderPaymentOptions()}

                        {/* <Button
                          onClick={() =>
                            onSubmit({
                              email: user?.email || customerInfo?.email,
                              phone: user?.phone || customerInfo?.phone,
                              acceptTerms: true,
                            })
                          }
                          className="w-full bg-teal-500 text-white"
                        >
                          Complete Payment
                        </Button> */}

                        <Button
                          onClick={() =>
                            onSubmit({
                              email: user?.email || customerInfo?.email,
                              phone: user?.phone || customerInfo?.phone,
                              acceptTerms: true,
                            })
                          }
                          className="w-full bg-teal-500 text-white"
                        >
                          {isFreeOrder ? 'Confirm Order' : 'Complete Payment'}
                        </Button>
                      </div>
                    ) : (
                      <PaymentGatewayRenderer
                        initData={initResponse}
                        email={customerInfo?.email || user?.email}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* PROMO CODE SECTION - Available for all users */}

              <div className="flex items-center gap-4 justify-center text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  <span>Secure Checkout</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  <span>Instant Delivery</span>
                </div>
              </div>
            </div>

            {/* ORDER SUMMARY */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-24">
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>

                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                      {packageData.countryCode && (
                        <div className="w-10 h-8 rounded overflow-hidden border border-border flex-shrink-0">
                          <ReactCountryFlag
                            countryCode={packageData.countryCode}
                            svg
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}

                      <div>
                        <p className="font-medium text-foreground">
                          {formatPackageTitle(packageData)}
                        </p>
                        <p className="text-sm text-muted-foreground">eSIM Data Plan</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4 pb-4 border-b border-border">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Data</span>
                        <span className="font-medium text-foreground">
                          {formatDataAmount(packageData)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Validity</span>
                        <span className="font-medium text-foreground">
                          {packageData.validity} Days
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground block mb-2">Coverage</span>

                        <div className="flex flex-wrap gap-2">
                          {packageData.coverage.map((res, i) => (
                            <span
                              key={i}
                              className="
        px-2 py-1
        bg-muted
        rounded-md
        text-xs
        font-medium
      "
                            >
                              {res}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Quantity</span>
                        <div className="flex items-center gap-2">
                          {/* <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </Button> */}
                          <span className="font-medium text-foreground w-8 text-center">
                            {quantity}
                          </span>
                          {/* <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => setQuantity(Math.min(10, quantity + 1))}
                          disabled={quantity >= 10}
                        >
                          <Plus className="w-3 h-3" />
                        </Button> */}
                        </div>
                      </div>
                    </div>

                    {quantity > 1 && (
                      <div className="space-y-2 mb-4 pb-4 border-b border-border">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Price per eSIM</span>
                          <span className="text-foreground">
                            {getCurrencySymbol(packageData.currency)}
                            {packageData.retailPrice || packageData.price}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal ({quantity} eSIMs)</span>
                          <span className="text-foreground">
                            {getCurrencySymbol(packageData.currency)}
                            {(
                              parseFloat(packageData.retailPrice || packageData.price) * quantity
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {(appliedPromo || appliedReferralCredits > 0) && (
                      <div className="space-y-2 mb-4 pb-4 border-b border-border">
                        {/* {appliedPromo && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600 dark:text-green-400">
                            Promo Discount ({appliedPromo.code})
                          </span>
                          <span className="text-green-600 dark:text-green-400">
                            -{getCurrencySymbol(packageData.currency)}
                            {appliedPromo.discount.toFixed(2)}
                          </span>
                        </div>
                      )} */}

                        {appliedPromo && (
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600 dark:text-green-400">
                              {appliedPromo.type === 'voucher' &&
                                `Voucher Applied (${appliedPromo.code})`}
                              {appliedPromo.type === 'giftcard' &&
                                `Gift Card Applied (${appliedPromo.code})`}
                              {appliedPromo.type === 'referral' &&
                                `Referral Applied (${appliedPromo.code})`}
                            </span>
                            <span className="text-green-600 dark:text-green-400">
                              -{getCurrencySymbol(packageData.currency)}
                              {appliedPromo.discount.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {appliedReferralCredits > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-amber-600 dark:text-amber-400">
                              Referral Credits
                            </span>
                            <span className="text-amber-600 dark:text-amber-400">
                              -{getCurrencySymbol(packageData.currency)}
                              {appliedReferralCredits.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-2xl font-bold text-foreground">
                        {getCurrencySymbol(packageData.currency)}
                        {calculateTotal()}
                      </span>
                    </div>

                    {isFreeOrder && (
                      <div className="mt-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        🎉 Fully covered by credits. No payment required.
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-500/10 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-green-700 dark:text-green-400">
                          Instant activation after payment.{' '}
                          {quantity > 1 ? `Your ${quantity} eSIMs will be` : 'Your eSIM will be'}{' '}
                          Ready immediately.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* <SiteFooter /> */}
    </div>
  );
}
