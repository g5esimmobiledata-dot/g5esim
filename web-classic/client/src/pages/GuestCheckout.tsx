import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation, Link } from 'wouter';
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
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import ReactCountryFlag from 'react-country-flag';
import { apiRequest } from '@/lib/queryClient';
import { useSettingByKey } from '@/hooks/useSettings';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

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

function PaymentForm({
  packageData,
  clientSecret,
  customerInfo,
  totalPrice,
}: {
  packageData: UnifiedPackage;
  clientSecret: string;
  customerInfo: CheckoutFormData;
  totalPrice: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const { currencies } = useCurrency();

  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find((c) => c.code === currencyCode)?.symbol || '$';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/order/processing',
          receipt_email: customerInfo.email,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: 'Payment Failed',
          description: error.message,
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // SECURITY: Only send paymentIntentId, email/phone are retrieved from Stripe metadata
        const res = await apiRequest('POST', '/api/guest/confirm-payment', {
          paymentIntentId: paymentIntent.id,
        });
        const data = await res.json();

        if (data.success && data.guestAccessToken) {
          setLocation(`/order/${data.guestAccessToken}`);
        } else {
          toast({
            title: 'Order Created',
            description: 'Your order is being processed.',
          });
          setLocation('/');
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Something went wrong',
        variant: 'destructive',
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </h3>
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
        <Lock className="w-4 h-4" />
        <span>Secure payment powered by Stripe</span>
      </div>

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white py-6 text-lg"
        data-testid="button-pay"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Pay {getCurrencySymbol(packageData.currency)}
            {totalPrice.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

export default function GuestCheckout() {
  const { packageSlug } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currency, currencies } = useCurrency();
  const { user, isAuthenticated } = useUser();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CheckoutFormData | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const siteName = useSettingByKey('platform_name');
  const [promoCodeType, setPromoCodeType] = useState<'voucher' | 'giftcard' | 'referral'>(
    'voucher',
  );

  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    type: string;
    voucherId?: string;
    giftCardId?: string;
    referrerId?: string;
    balance?: number;
    description?: string;
  } | null>(null);
  const [appliedReferralCredits, setAppliedReferralCredits] = useState<number>(0);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find((c) => c.code === currencyCode)?.symbol || '$';
  };

  const { data: referralBalanceData } = useQuery<{ success: boolean; balance: number }>({
    queryKey: ['/api/referrals/my-balance'],
    enabled: isAuthenticated,
  });

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: '',
      phone: '',
      acceptTerms: false,
    },
  });

  const { data: packageData, isLoading: isLoadingPackage } = useQuery<UnifiedPackage>({
    queryKey: [`/api/unified-packages/slug/${packageSlug}`, { currency }],
    enabled: !!packageSlug,
  });

  const createPaymentIntent = useMutation({
    mutationFn: async (formData: CheckoutFormData) => {
      const res = await apiRequest('POST', '/api/guest/create-payment-intent', {
        packageId: packageData?.id,
        email: formData.email,
        phone: formData.phone,
        quantity,
        promoCode: appliedPromo?.code || null,
        promoType: appliedPromo?.type || null,
        promoDiscount: appliedPromo?.discount || 0,
        voucherId: appliedPromo?.voucherId || null,
        giftCardId: appliedPromo?.giftCardId || null,
        referrerId: appliedPromo?.referrerId || null,
        referralCredits: appliedReferralCredits > 0 ? appliedReferralCredits : undefined,
        requestedCurrency: currency,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setCustomerInfo(form.getValues());
        setConfirmedTotal(data.amount || 0);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payment',
        variant: 'destructive',
      });
    },
  });

  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast({
        title: 'Enter a code',
        description: 'Please enter a promo code, gift card, or referral code',
        variant: 'destructive',
      });
      return;
    }

    // Only one code can be applied at a time
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
        orderAmount: orderAmount,
      });

      const data = await res.json();

      if (!data.success) {
        toast({
          title: 'Invalid Code',
          description: data.message || 'This code is not valid',
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

      toast({
        title: 'Code Applied',
        description: data.description || `Discount of $${data.discount.toFixed(2)} applied`,
      });
      setPromoCode('');
      setIsPromoOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to validate code',
        variant: 'destructive',
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    toast({
      title: 'Code Removed',
      description: 'Promo code has been removed',
    });
  };

  const calculateTotal = () => {
    const basePrice = parseFloat(packageData?.retailPrice || packageData?.price || '0');
    const subtotal = basePrice * quantity;
    const promoDiscount = appliedPromo?.discount || 0;
    const creditsDiscount = appliedReferralCredits;
    const totalDiscount = promoDiscount + creditsDiscount;
    return Math.max(subtotal - totalDiscount, 0).toFixed(2);
  };

  const availableCredits = referralBalanceData?.balance || 0;

  const handleApplyCredits = (amount: number) => {
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

  const onSubmit = (data: CheckoutFormData) => {
    createPaymentIntent.mutate(data);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{`Checkout - ${formatDataAmount(packageData)} eSIM | ${siteName}`}</title>
      </Helmet>
      <SiteHeader />

      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-6"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Checkout</h1>
                <p className="text-muted-foreground">
                  Complete your purchase to get instant Access to your eSIM
                </p>
              </div>

              {!clientSecret ? (
                <>
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-foreground mb-4">Contact Information</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        We'll send your eSIM details to this email. No account required.
                      </p>

                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                      data-testid="input-email"
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
                                      placeholder="+1 234 567 8900"
                                      className="pl-10"
                                      data-testid="input-phone"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="acceptTerms"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4 bg-muted/30">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="checkbox-terms"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    I agree to the{' '}
                                    <Link href="/terms-and-condition" className="text-teal-600 hover:underline">
                                      Terms of Service
                                    </Link>{' '}
                                    and{' '}
                                    <Link href="/privacy-policy" className="text-teal-600 hover:underline">
                                      Privacy Policy
                                    </Link>
                                  </FormLabel>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />

                          <Button
                            type="submit"
                            disabled={createPaymentIntent.isPending}
                            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                            data-testid="button-continue"
                          >
                            {createPaymentIntent.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              'Continue to Payment'
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

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
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                type="button"
                                variant={promoCodeType === 'voucher' ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setPromoCodeType('voucher')}
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                Voucher
                              </Button>
                              <Button
                                type="button"
                                variant={promoCodeType === 'giftcard' ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setPromoCodeType('giftcard')}
                              >
                                <Gift className="w-3 h-3 mr-1" />
                                Gift Card
                              </Button>
                              <Button
                                type="button"
                                variant={promoCodeType === 'referral' ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setPromoCodeType('referral')}
                              >
                                <Users className="w-3 h-3 mr-1" />
                                Referral
                              </Button>
                            </div>
                          )}

                          {!appliedPromo && (
                            <div className="flex gap-2">
                              <Input
                                placeholder={`Enter ${promoCodeType === 'voucher' ? 'voucher' : promoCodeType === 'giftcard' ? 'gift card' : 'referral'} code`}
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value)}
                                data-testid="input-promo-code"
                              />
                              <Button
                                type="button"
                                onClick={handleApplyPromo}
                                variant="outline"
                                disabled={isValidatingPromo}
                                data-testid="button-apply-promo"
                              >
                                {isValidatingPromo ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Apply'
                                )}
                              </Button>
                            </div>
                          )}

                          {appliedPromo && (
                            <p className="text-xs text-muted-foreground">
                              Only one code can be applied per order. Remove the current code to
                              apply a different one.
                            </p>
                          )}

                          {appliedPromo && (
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
                                <span className="text-xs text-green-600 dark:text-green-500 ml-6">
                                  {appliedPromo.type === 'giftcard' && appliedPromo.balance
                                    ? `$${appliedPromo.discount.toFixed(2)} applied (Balance: $${appliedPromo.balance.toFixed(2)})`
                                    : appliedPromo.discount > 0
                                      ? `-$${appliedPromo.discount.toFixed(2)} discount`
                                      : appliedPromo.description || 'Discount applied'}
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
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>

                  {isAuthenticated && availableCredits > 0 && (
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-6">
                        <Collapsible open={isCreditsOpen} onOpenChange={setIsCreditsOpen}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <Coins className="w-4 h-4 text-amber-500" />
                              <span className="font-medium text-foreground">
                                Use Referral Credits
                              </span>
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
                              You have referral credits that can be used as a discount on this
                              order.
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
                                  data-testid="button-remove-credits"
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
                                  data-testid="button-apply-all-credits"
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
                                  data-testid="button-apply-half-credits"
                                >
                                  Apply Half ($
                                  {Math.min(
                                    availableCredits / 2,
                                    parseFloat(calculateTotal()),
                                  ).toFixed(2)}
                                  )
                                </Button>
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#8b5cf6',
                      },
                    },
                  }}
                >
                  <PaymentForm
                    packageData={packageData}
                    clientSecret={clientSecret}
                    customerInfo={customerInfo!}
                    totalPrice={confirmedTotal}
                  />
                </Elements>
              )}

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

            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg sticky top-24">
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
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Coverage</span>
                      <span className="font-medium text-foreground">{packageData.countryName}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Quantity</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          data-testid="button-quantity-minus"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-medium text-foreground w-8 text-center">
                          {quantity}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => setQuantity(Math.min(10, quantity + 1))}
                          disabled={quantity >= 10}
                          data-testid="button-quantity-plus"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
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
                      {appliedPromo && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600 dark:text-green-400">
                            Promo Discount ({appliedPromo.code})
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
      </main>

      {/* <SiteFooter /> */}
    </div>
  );
}
