import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Check, Loader2, ChevronDown, Tag, CreditCard, Wallet, Plus, Gift, Users } from "lucide-react";
import { SiPaypal, SiApplepay, SiGooglepay } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Destination } from "@shared/schema";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { CheckoutAuth } from "@/components/CheckoutAuth";
import { useTranslation } from "@/contexts/TranslationContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { trackCheckoutStart, trackPurchase } from "@/lib/analytics";
// import SiteHeader from "@/components/layout/SiteHeader";

// Initialize Stripe
// if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
//   throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
// }

const stripePromise = loadStripe('pk_test_51Ry5KK74FnUP6weT399cLIDdcCBWhpjWmXLocmgLUiKLZfr65EUffqu6uUdgriGHExfFroFvLTzLkAlV6gCL1TXk0096kTqcJr');

// Feature Detection for Payment Methods
const isApplePayAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).ApplePaySession && (window as any).ApplePaySession.canMakePayments();
};

const isGooglePayAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).PaymentRequest;
};

type PaymentMethodType = 'card' | 'paypal' | 'apple_pay' | 'google_pay';

interface CheckoutFormProps {
  pkg: Package & { destination?: Destination };
  paymentMethod: PaymentMethodType;
  appliedVoucher: {
    code: string;
    discount: number;
    finalTotal: number;
  } | null;
  appliedReferral: {
    code: string;
    discount: number;
    finalTotal: number;
  } | null;
}

function CheckoutForm({ pkg, paymentMethod, appliedVoucher, appliedReferral }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { currencies } = useCurrency();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const subtotal = pkg.price;

  const referralDiscountAmt = appliedReferral?.discount ?? 0;

  // Determine price after voucher (fallback to original price)
  const priceAfterVoucher = typeof appliedVoucher?.finalTotal === "number"
    ? appliedVoucher.finalTotal
    : subtotal;

  // Final payable amount after referral
  const payableAmount = Math.max(0, priceAfterVoucher - referralDiscountAmt);


  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find(c => c.code === currencyCode)?.symbol || "$";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // console.log("Handling payment submission...");
    // console.log("Stripe object:", stripe );
    // console.log(" object:" , elements);

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      console.log("Submitting payment with method:", paymentMethod, "for package:", pkg);
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/my-esims`,
        },
      });

      if (error) {
        toast({
          title: t('checkout.paymentFailed', 'Payment Failed'),
          description: error.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        try {
          // Confirm payment on backend and create order
          const res: any = await apiRequest("POST", "/api/confirm-payment", {
            paymentIntentId: paymentIntent.id,
            referralCode: appliedReferral?.code,
            voucherCode: appliedVoucher?.code,
            orderAmount: payableAmount,
          });

          const response = await res.json();


          if (response.order) {
            if (appliedReferral?.code) {
              await apiRequest("POST", "/api/referrals/complete", {
                referralCode: appliedReferral.code,
                orderId: response.order.id,
                orderAmount: payableAmount, // final payment amount
              });
            }
          }

          // Verify backend actually created the order
          if (!response || !response.order) {
            throw new Error(t('checkout.orderCreationFailed', 'Order creation failed on backend'));
          }

          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          queryClient.invalidateQueries({ queryKey: ["/api/user/orders"] });

          // Track purchase completion
          trackPurchase(response.order.id, response.order.price);

          toast({
            title: t('checkout.orderSuccessful', 'Order Successful!'),
            description: t('checkout.orderSuccessDesc', 'Your eSIM has been sent to your email. Check your inbox for installation instructions.'),
          });

          setLocation("/my-esims");
        } catch (confirmError: any) {
          toast({
            title: t('checkout.orderFailed', 'Order Failed'),
            description: confirmError.message || t('checkout.orderFailedDesc', 'Payment succeeded but order creation failed. Please contact support.'),
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }
    } catch (err: any) {
      toast({
        title: t('checkout.orderFailed', 'Order Failed'),
        description: err.message || t('checkout.somethingWrong', 'Something went wrong. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* <SiteHeader /> */}
      <PaymentElement />
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || isProcessing}
        data-testid="button-complete-order"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('checkout.processingPayment', 'Processing Payment...')}
          </>
        ) : (
          <span className="flex items-center justify-center gap-2">
            {t('checkout.pay', 'Pay')}
            {(appliedVoucher || appliedReferral) && (
              <span className="line-through text-muted-foreground text-sm">
                {getCurrencySymbol(pkg.currency)}
                {Number(pkg.price).toFixed(2)}

              </span>
            )}

            {/* Final payable amount */}
            <span className="font-semibold">
              {getCurrencySymbol(pkg.currency)}
              {payableAmount.toFixed(2)}
            </span>


          </span>
        )}
      </Button>

      <div className="space-y-2">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span>{t('checkout.instantDelivery', 'Instant eSIM delivery via email')}</span>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span>{t('checkout.securePayment', 'Secure payment processing')}</span>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span>{t('checkout.support247', '24/7 customer support')}</span>
        </div>
      </div>
    </form>
  );
}

export default function Checkout() {
  const { slug } = useParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { currencies, currency } = useCurrency();
  const { user, isLoading: userLoading, isAuthenticated, refetchUser } = useUser();
  const [clientSecret, setClientSecret] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const requestIdRef = useRef(0);
  const [referralCode, setReferralCode] = useState("");
  const [appliedReferral, setAppliedReferral] = useState<{ code: string; discount: number } | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");


  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;      // ← Actual discount amount (e.g., 0.13)
    finalTotal: number;    // ← Final price after discount (e.g., 1.19)
  } | null>(null);


  const [appliedRefferalCode, setAppliedRefferalCode] = useState<{
    code: string;
    discount: number;
    finalTotal: number;
  } | null>(null);

  const [voucherOpen, setVoucherOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  const [applePaySupported, setApplePaySupported] = useState(false);
  const [googlePaySupported, setGooglePaySupported] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [promoCodeType, setPromoCodeType] = useState<"voucher" | "giftcard" | "referral">("voucher");
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);



  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    type: "voucher" | "giftcard" | "referral";
    discount: number;
    voucherId?: string;
    giftCardId?: string;
    referrerId?: string;
    balance?: number;
    description?: string;
  } | null>(null);


  const getCurrencySymbol = (currencyCode: string) => {
    return currencies.find(c => c.code === currencyCode)?.symbol || "$";
  };

  const { data: pkg, isLoading: pkgLoading } = useQuery<Package & { destination?: Destination }>({
    queryKey: [`/api/unified-packages/slug/${slug}`, { currency }],
    enabled: !!slug,
  });

  // Check for payment method support on mount
  useEffect(() => {
    setApplePaySupported(isApplePayAvailable());
    setGooglePaySupported(isGooglePayAvailable());
  }, []);

  // Track checkout start
  useEffect(() => {
    if (pkg?.id) {
      trackCheckoutStart(pkg.id, pkg.price);
    }
  }, [pkg?.id, pkg?.price]);



  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast({
        title: t("common.error"),
        description: t("checkout.enterPromo"),
        variant: "destructive",
      });
      return;
    }
    if (appliedPromo) {
      toast({
        title: t("common.error"),
        description: t("checkout.oneCodeAllowed"),
        variant: "destructive",
      });
      return;
    }

    setIsValidatingPromo(true);
    try {
      const subtotal = parseFloat(pkg.price.toString()) * quantity;
      const res = await apiRequest("POST", "/api/validate-promo-code", {
        code: promoCode.trim(),
        type: promoCodeType,
        orderAmount: subtotal,
      });
      const data = await res.json();

      if (!data.success) {
        toast({
          title: t("common.error"),
          description: data.message || t("checkout.invalidPromo"),
          variant: "destructive",
        });
        return;
      }

      setAppliedPromo({
        code: data.code,
        discount: data.discount,
        type: promoCodeType,
        voucherId: data.voucherId,
        giftCardId: data.giftCardId,
        referrerId: data.referrerId,
        balance: data.balance,
        description: data.description,
      });

      toast({
        title: t("common.success"),
        description: data.description || t("checkout.promoApplied"),
      });

      setIsPromoOpen(false);
      setPromoCode("");
      setClientSecret(""); // regenerate Stripe Intent w/ promo
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message || t("checkout.promoApplyErr"),
        variant: "destructive",
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    toast({ title: t("checkout.promoRemoved") });
    setClientSecret(""); // regenerate Stripe Intent w/o promo
  };



  const validateReferralMutation = useMutation({
    mutationFn: async ({ code, subtotal }) => {
      const res = await apiRequest("POST", "/api/referrals/apply", { code, subtotal });

      // parse JSON
      const data = await res.json();

      // return both res + parsed data
      return { status: res.status, data };
    },
    onSuccess: ({ status, data }) => {
      setAppliedRefferalCode({
        code: data.code,
        discount: data.discount,
        finalTotal: data.finalTotal,
      });
      if (status >= 400 || !data.success) {
        toast({
          title: t("common.error"),
          description: data.message || "Failed to apply referral code",
          variant: "destructive",
        });
        return;
      }

      setAppliedReferral({
        code: data.referralCode,
        discount: data.discount,
      });

      toast({
        title: t('common.success'),
        description: t('referrals.codeApplied', { discount: data.discount }),
      });

      setReferralOpen(false);
      setClientSecret("");
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || "Network error",
        variant: "destructive",
      });
    },
  });




  // Apply referral code mutation
  const applyReferralMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest("POST", "/api/referrals/applyy", { code: code.toUpperCase() });
    },
    onSuccess: (data: any) => {
      setAppliedReferral({
        code: referralCode.toUpperCase(),
        discount: data.discount || 0,
      });
      toast({
        title: t('common.success'),
        description: t('referrals.codeApplied', { discount: data.discount }),
      });
      setReferralOpen(false);
      // Trigger payment intent recreation with discount
      setClientSecret("");
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || "Failed to apply referral code",
        variant: "destructive",
      });
    },
  });


  const applyVoucherMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vouchers/apply", {
        code: voucherCode.toUpperCase(),
        subtotal,
      });

      const data = await res.json();
      return data;
    },

    onSuccess: (data: any) => {
      setAppliedVoucher({
        code: data.code,
        discount: data.discount,
        finalTotal: data.finalTotal,
      });

      // console.log("Voucher applied:", data);

      toast({
        title: "Voucher Applied",
        description: `You saved ${getCurrencySymbol(pkg.currency)}${data.discount}`,
      });

      setVoucherOpen(false);
      setClientSecret("");
    },

    onError: (error: any) => {
      toast({
        title: "Invalid Voucher",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const handleApplyVoucher = () => {
    if (!voucherCode.trim()) return;
    applyVoucherMutation.mutate();
  };


  const handleApplyReferral = () => {
    if (!referralCode.trim()) {
      toast({
        title: t('common.error'),
        description: "Please enter a referral code",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: t('common.error'),
        description: "Please sign in to apply a referral code",
        variant: "destructive",
      });
      return;
    }

    // Send both code and subtotal
    validateReferralMutation.mutate({
      code: referralCode.toUpperCase(),
      subtotal: subtotal,
    });
  };

  // Create payment intent when user is authenticated and package is loaded
  useEffect(() => {
    if (pkg && isAuthenticated && !userLoading) {
      // Increment request ID to track this specific request
      const currentRequestId = ++requestIdRef.current;

      setIsCreatingIntent(true);
      setClientSecret(""); // Clear old secret immediately

      apiRequest("POST", "/api/create-payment-intent", {
        packageId: pkg.id,
        quantity,
        referralCode: appliedReferral?.code,
        voucherCode: appliedVoucher?.code,
        paymentMethodType: paymentMethod,
        requestedCurrency: currency,
      })
        .then(async (resData: any) => {
          const data = await resData.json();
          // console.log("Payment Intent Data:", data , "Request ID:", currentRequestId , "Current Ref ID:", requestIdRef.current);
          if (currentRequestId === requestIdRef.current) {
            // console.log("Setting client secret:", data.clientSecret);
            setClientSecret(data.clientSecret);
          }
        })
        .catch((error: any) => {
          // Only show error if this is still the latest request
          if (currentRequestId === requestIdRef.current) {
            toast({
              title: t('common.error', 'Error'),
              description: error.message || t('checkout.paymentInitFailed', 'Failed to initialize payment'),
              variant: "destructive",
            });
            setClientSecret(""); // Ensure secret is cleared on error
          }
        })
        .finally(() => {
          // Only update loading state if this is still the latest request
          if (currentRequestId === requestIdRef.current) {
            setIsCreatingIntent(false);
          }
        });
    }
  }, [pkg, quantity, isAuthenticated, userLoading, appliedReferral, appliedVoucher, paymentMethod]);

  const handleAuthSuccess = () => {
    // Refetch user to update authentication state
    refetchUser();
  };

  if (pkgLoading || !pkg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const subtotal = parseFloat(pkg.price.toString()) * quantity;
  const referralDiscountAmount = appliedReferral ? (subtotal * appliedReferral.discount) / 100 : 0;
  // const voucherDiscountAmount = appliedVoucher 
  //   ? (appliedVoucher.type === "percentage" 
  //     ? (subtotal * appliedVoucher.value) / 100 
  //     : appliedVoucher.value)
  //   : 0;




  // const totalPrice = subtotal - referralDiscountAmount - voucherDiscountAmount;


  // const totalPricee =
  // typeof appliedVoucher?.finalTotal === "number"
  //   ? appliedVoucher.finalTotal
  //   : subtotal - referralDiscountAmount;


  const totalPrice = (() => {
    let priceAfterVoucher = subtotal;

    if (typeof appliedVoucher?.finalTotal === "number") {
      priceAfterVoucher = appliedVoucher.finalTotal;
    }

    const referralDiscountAmt = appliedReferral
      ? appliedReferral.discount
      : 0;

    // Ensure we don’t go below zero
    const finalPrice = Math.max(0, priceAfterVoucher - referralDiscountAmt);

    return finalPrice;
  })();




  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Checkout - {pkg.title} | eSIM Global</title>
        <meta name="description" content="Complete your eSIM purchase securely. Instant delivery via email." />
        <meta property="og:title" content={`Checkout - ${pkg.title} | eSIM Global`} />
        <meta property="og:description" content="Complete your eSIM purchase securely. Instant delivery via email." />
        <meta property="og:type" content="website" />
      </Helmet>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href={`/packages/${slug}`}>
            <div className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors cursor-pointer" data-testid="link-back">
              <ArrowLeft className="h-4 w-4" />
              {t('common.back', 'Back')}
            </div>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">{t('checkout.title', 'Complete Your Purchase')}</h1>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Payment Form */}
            <div className="md:col-span-2 space-y-6">
              {/* Quantity Selector */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('checkout.orderDetails', 'Order Details')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="quantity">{t('checkout.numberOfEsims', 'Number of eSIMs')}</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max="10"
                        value={quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          setQuantity(Math.max(1, Math.min(10, newQty)));
                        }}
                        disabled={isCreatingIntent}
                        data-testid="input-quantity"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        {quantity > 1
                          ? t('checkout.multipleEsimsNote', `You'll receive {{quantity}} separate eSIMs, each with {{dataAmount}} for {{validity}} days.`, { quantity: quantity.toString(), dataAmount: pkg.dataAmount, validity: pkg.validity.toString() })
                          : t('checkout.singleEsimNote', 'Each eSIM can be installed on one device.')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>



              {/* new applied voucher */}
              {/* Unified Promo Code */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <Collapsible open={isPromoOpen} onOpenChange={setIsPromoOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{t("checkout.havePromo")}</span>
                      </div>
                      <Plus className={`w-4 h-4 transition-transform ${isPromoOpen ? "rotate-45" : ""}`} />
                    </CollapsibleTrigger>

                    <CollapsibleContent className="pt-4 space-y-4">
                      {!appliedPromo && (
                        <>
                          {/* Toggle Buttons */}
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant={promoCodeType === "voucher" ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => setPromoCodeType("voucher")}
                            >
                              <Tag className="w-3 h-3 mr-1" /> {t("checkout.voucher")}
                            </Button>
                            <Button
                              variant={promoCodeType === "giftcard" ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => setPromoCodeType("giftcard")}
                            >
                              <Gift className="w-3 h-3 mr-1" /> {t("checkout.giftcard")}
                            </Button>
                            <Button
                              variant={promoCodeType === "referral" ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => setPromoCodeType("referral")}
                            >
                              <Users className="w-3 h-3 mr-1" /> {t("checkout.referral")}
                            </Button>
                          </div>

                          {/* Input + Apply */}
                          <div className="flex gap-2">
                            <Input
                              placeholder={t("checkout.enterPromoCode")}
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value)}
                              disabled={isValidatingPromo}
                            />
                            <Button
                              onClick={handleApplyPromo}
                              disabled={isValidatingPromo || !promoCode.trim()}
                            >
                              {isValidatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.apply")}
                            </Button>
                          </div>
                        </>
                      )}

                      {appliedPromo && (
                        <div className="flex items-center justify-between bg-green-50 dark:bg-green-500/10 p-3 rounded-lg">
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-2 items-center">
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                {appliedPromo.type.toUpperCase()}: {appliedPromo.code}
                              </span>
                            </div>

                            <span className="text-xs text-green-600 dark:text-green-500 ml-6">
                              {appliedPromo.description ||
                                `-${getCurrencySymbol(pkg.currency)}${appliedPromo.discount.toFixed(2)}`
                              }
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removePromo}
                            className="text-red-500 hover:text-red-600"
                          >
                            {t("common.remove")}
                          </Button>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>

              {/* new applied voucher */}



              {/* Voucher Code Section */}


              {/* Payment Method Selector */}
              {isAuthenticated && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethodType)} data-testid="radiogroup-payment-method">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 rounded-lg border p-4 hover-elevate active-elevate-2 cursor-pointer">
                          <RadioGroupItem value="card" id="payment-card" data-testid="radio-payment-card" />
                          <Label htmlFor="payment-card" className="flex items-center gap-3 cursor-pointer flex-1">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">Credit/Debit Card</div>
                              <div className="text-xs text-muted-foreground">Pay securely with your card</div>
                            </div>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-3 rounded-lg border p-4 hover-elevate active-elevate-2 cursor-pointer">
                          <RadioGroupItem value="paypal" id="payment-paypal" data-testid="radio-payment-paypal" />
                          <Label htmlFor="payment-paypal" className="flex items-center gap-3 cursor-pointer flex-1">
                            <SiPaypal className="h-5 w-5 text-[#00457C]" />
                            <div>
                              <div className="font-medium">PayPal</div>
                              <div className="text-xs text-muted-foreground">Pay with your PayPal account</div>
                            </div>
                          </Label>
                        </div>

                        {applePaySupported && (
                          <div className="flex items-center space-x-3 rounded-lg border p-4 hover-elevate active-elevate-2 cursor-pointer">
                            <RadioGroupItem value="apple_pay" id="payment-apple" data-testid="radio-payment-apple" />
                            <Label htmlFor="payment-apple" className="flex items-center gap-3 cursor-pointer flex-1">
                              <SiApplepay className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">Apple Pay</div>
                                <div className="text-xs text-muted-foreground">Quick and secure payment</div>
                              </div>
                            </Label>
                          </div>
                        )}

                        {googlePaySupported && (
                          <div className="flex items-center space-x-3 rounded-lg border p-4 hover-elevate active-elevate-2 cursor-pointer">
                            <RadioGroupItem value="google_pay" id="payment-google" data-testid="radio-payment-google" />
                            <Label htmlFor="payment-google" className="flex items-center gap-3 cursor-pointer flex-1">
                              <SiGooglepay className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">Google Pay</div>
                                <div className="text-xs text-muted-foreground">Fast checkout with Google</div>
                              </div>
                            </Label>
                          </div>
                        )}
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

              {/* Authentication or Payment Section */}
              {!isAuthenticated && !userLoading ? (
                <CheckoutAuth onAuthSuccess={handleAuthSuccess} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('checkout.paymentInfo', 'Payment Information')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!clientSecret || isCreatingIntent ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          {isCreatingIntent ? t('checkout.updatingPayment', 'Updating payment...') : t('checkout.initializingPayment', 'Initializing payment...')}
                        </p>
                      </div>
                    ) : (
                      <Elements
                        key={clientSecret}
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          appearance: {
                            theme: 'stripe',
                          },
                          fields: {
                            billingDetails: "always",  // <-- REQUIRED FOR INDIAN STRIPE + USD
                          },
                        }}
                      >
                        <CheckoutForm pkg={pkg} paymentMethod={paymentMethod} appliedVoucher={appliedVoucher} appliedReferral={appliedReferral} />
                      </Elements>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Order Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>{t('checkout.orderSummary', 'Order Summary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{pkg.destination?.flagEmoji || "🌍"}</span>
                      <div className="text-sm">
                        <div className="font-medium">{pkg.destination?.name}</div>
                        <div className="text-muted-foreground">{pkg.dataAmount} • {pkg.validity} {t('common.days', 'days')}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('checkout.pricePerEsim', 'Price per eSIM')}</span>
                      <span className="font-medium">{getCurrencySymbol(pkg.currency || 'USD')}{pkg.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('checkout.quantity', 'Quantity')}</span>
                      <span className="font-medium">×{quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('checkout.subtotal', 'Subtotal')}</span>
                      <span className="font-medium">{getCurrencySymbol(pkg.currency || 'USD')}{subtotal.toFixed(2)}</span>
                    </div>

                    {appliedVoucher && typeof appliedVoucher.discount === "number" && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          Voucher ({appliedVoucher.code})
                        </span>
                        <span className="font-medium" data-testid="text-voucher-discount">
                          -{getCurrencySymbol(pkg.currency || "USD")}{appliedVoucher.discount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {appliedReferral && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {t('checkout.referralDiscount', 'Referral Discount')} ({appliedReferral.discount}%)
                        </span>
                        <span className="font-medium" data-testid="text-referral-discount">
                          -{getCurrencySymbol(pkg.currency || 'USD')}{appliedReferral.discount.toFixed(2)}
                        </span>
                      </div>
                    )}



                  </div>

                  <Separator />

                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">{t('checkout.total', 'Total')}</span>
                    <span className="text-2xl font-bold text-primary">{getCurrencySymbol(pkg.currency || 'USD')}{totalPrice.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
