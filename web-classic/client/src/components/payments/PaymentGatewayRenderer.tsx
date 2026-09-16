import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripeCheckoutForm from './StripeCheckoutForm';
import RazorpayPayment from './RazorpayPayment';
import PaypalPayment from './PaypalPayment';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, AlertCircle, Copy, ExternalLink, QrCode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PowerTranzCardForm from './Powertranzcardform';

interface PaymentGatewayRendererProps {
  initData: {
    provider: 'stripe' | 'razorpay' | 'paypal' | 'powertranz' | 'nowpayments' | 'cryptomus' | 'ayamerchant';
    publicKey?: string;
    clientSecret?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    guestAccessToken?: string;
    redirectData?: string;      // PowerTranz 3DS HTML
    spiToken?: string;          // PowerTranz token
    purchaseType?: string;
    paymentId?: string;
    transactionId?: string;
    payAddress?: string;
    payAmount?: number;
    payCurrency?: string;
    network?: string;
    paymentUrl?: string | null;
    redirectUrl?: string | null;
    qrCode?: string | null;
  };
  email?: string;
  name?: string;
  packageData?: any;            // For debugging
}

export default function PaymentGatewayRenderer({
  initData,
  email,
  name,
  packageData,
}: PaymentGatewayRendererProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [powertranzState, setPowertranzState] = useState<
    'card_form' | 'processing' | '3ds_challenge' | 'error'
  >('card_form');
  const [powertranzError, setPowertranzError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log('🎯 PaymentGatewayRenderer initialized with:', {
    provider: initData.provider,
    hasClientSecret: !!initData.clientSecret,
    hasOrderId: !!initData.orderId,
    hasSpiToken: !!initData.spiToken,
    hasRedirectData: !!initData.redirectData,
  });

  useEffect(() => {
    if (initData.provider !== 'ayamerchant' || !initData.redirectUrl) return;

    const timer = window.setTimeout(() => {
      window.location.href = initData.redirectUrl!;
    }, 700);

    return () => window.clearTimeout(timer);
  }, [initData.provider, initData.redirectUrl]);

  // =============== STRIPE ===============
  if (initData.provider === 'stripe') {
    if (!initData.clientSecret || !initData.publicKey) {
      console.error('❌ Stripe data missing', initData);
      return (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Payment Setup Error</p>
                <p className="text-sm text-red-700 mt-1">
                  Stripe configuration (client secret or public key) is missing. Please contact support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    let stripePublicKey = initData.publicKey
    const stripePromise = loadStripe(
      stripePublicKey
    );

    return (
      <Elements stripe={stripePromise} options={{ clientSecret: initData.clientSecret }}>
        <StripeCheckoutForm guestAccessToken={initData.guestAccessToken} purchaseType={initData?.purchaseType} />
      </Elements>
    );
  }

  // =============== RAZORPAY ===============
  if (initData.provider === 'razorpay') {
    if (!initData.orderId || !initData.amount || !initData.currency || !initData.publicKey) {
      console.error('❌ Razorpay data missing', initData);
      return (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Payment Setup Error</p>
                <p className="text-sm text-red-700 mt-1">
                  Required payment data is missing. Please try again.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <RazorpayPayment
        orderId={initData.orderId}
        amount={initData.amount}
        currency={initData.currency}
        publicKey={initData.publicKey}
        email={email}
        guestAccessToken={initData.guestAccessToken}
        purchaseType={initData.purchaseType}
      />
    );
  }

  // =============== PAYPAL ===============
  if (initData.provider === 'paypal') {
    if (!initData.orderId) {
      console.error('❌ PayPal orderId missing', initData);
      return (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Payment Setup Error</p>
                <p className="text-sm text-red-700 mt-1">
                  PayPal order ID is missing. Please try again.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <PaypalPayment
        orderId={initData.orderId}
        publicKey={initData.publicKey}
        mode={(initData as any).config?.mode || 'sandbox'}
        guestAccessToken={initData.guestAccessToken}
        purchaseType={initData.purchaseType}
        currency={initData.currency}
      />
    );
  }

  // =============== AYAMERCHANT ===============
  if (initData.provider === 'ayamerchant') {
    if (!initData.redirectUrl) {
      return (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Payment Setup Error</p>
                <p className="text-sm text-red-700 mt-1">
                  AYAMERCHANT checkout URL is missing. Please try again.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="h-5 w-5 mt-1 text-teal-600" />
            <div>
              <p className="font-medium">AYAMERCHANT Payment</p>
              <p className="text-sm text-muted-foreground">
                You will be redirected to AYAMERCHANT to complete payment securely.
              </p>
            </div>
          </div>
          <Button type="button" asChild>
            <a href={initData.redirectUrl}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Continue to AYAMERCHANT
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // =============== CRYPTO ===============
  if (initData.provider === 'nowpayments' || initData.provider === 'cryptomus') {
    const paymentId = initData.paymentId || initData.paymentIntentId;
    const providerLabel = initData.provider === 'cryptomus' ? 'Cryptomus' : 'NOWPayments';
    const cryptoAmount = initData.payAmount || initData.amount;
    const cryptoCurrency = initData.payCurrency || initData.currency;

    const confirmCryptoPayment = async () => {
      if (!paymentId && !initData.orderId) {
        toast({
          title: 'Payment reference missing',
          description: 'This crypto payment could not be checked.',
          variant: 'destructive',
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await apiRequest('POST', '/api/confirm-payment', {
          providerType: initData.provider,
          paymentId,
          orderId: initData.orderId || initData.transactionId,
        });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || 'Crypto payment is not completed yet');
        }

        toast({
          title: 'Payment confirmed',
          description: 'Your eSIM order is being finalized.',
        });
        setLocation('/account/orders');
      } catch (error: any) {
        toast({
          title: 'Payment not confirmed',
          description: error.message || 'Crypto payment is not completed yet.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <QrCode className="h-5 w-5 mt-1 text-teal-600" />
            <div>
              <p className="font-medium">Crypto Payment</p>
              <p className="text-sm text-muted-foreground">
                Send {cryptoAmount ? Number(cryptoAmount).toFixed(6) : 'the exact amount'} {cryptoCurrency} on {initData.network || providerLabel}.
              </p>
            </div>
          </div>

          {initData.qrCode && (
            <div className="flex justify-center">
              <img src={initData.qrCode} alt="Crypto payment QR code" className="h-44 w-44 rounded-md border bg-white p-2" />
            </div>
          )}

          {initData.payAddress && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1">Wallet address</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-sm">{initData.payAddress}</code>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(initData.payAddress || '');
                    toast({ title: 'Copied', description: 'Wallet address copied.' });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {initData.paymentUrl && (
              <Button type="button" variant="outline" asChild>
                <a href={initData.paymentUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Payment Page
                </a>
              </Button>
            )}
            <Button type="button" onClick={confirmCryptoPayment} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              I Have Paid
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // =============== POWERTRANZ ===============
  if (initData.provider === 'powertranz') {
    console.log('🔥 PowerTranz flow:', {
      state: powertranzState,
      hasRedirectData: !!initData.redirectData,
      hasSpiToken: !!initData.spiToken,
    });

    // ✅ STATE 1: CARD FORM (User enters card details)
    if (powertranzState === 'card_form') {
      return (
        <PowerTranzCardForm
          onCardSubmit={async (cardData) => {
            console.log('✅ Card form submitted:', cardData);
            setPowertranzState('processing');
            setPowertranzError(null);

            try {
              // Re-initialize payment with card data
              // (This would be called from parent component instead)
              // For now, we'll just move to 3DS
              setPowertranzState('3ds_challenge');
            } catch (error: any) {
              console.error('❌ Card submission error:', error);
              setPowertranzError(error.message || 'Failed to process card');
              setPowertranzState('card_form');
            }
          }}
          isLoading={powertranzState === 'processing'}
          error={powertranzError || undefined}
          onCancel={() => {
            console.log('❌ User cancelled card form');
          }}
        />
      );
    }

    // ✅ STATE 2: PROCESSING
    if (powertranzState === 'processing') {
      return (
        <Card className="border-blue-200">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-center">Processing your payment...</p>
            <p className="text-sm text-muted-foreground">
              Please wait while we initialize your 3D Secure authentication.
            </p>
          </CardContent>
        </Card>
      );
    }

    // ✅ STATE 3: 3DS CHALLENGE (PowerTranz 3D Secure challenge form)
    if (powertranzState === '3ds_challenge') {
      if (!initData.redirectData) {
        console.error('❌ PowerTranz redirectData missing!', initData);
        return (
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">3D Secure Error</p>
                  <p className="text-sm text-red-700 mt-1">
                    Failed to load 3D Secure challenge. Please try again.
                  </p>
                  <Button
                    onClick={() => {
                      setPowertranzState('card_form');
                      setPowertranzError(null);
                    }}
                    className="mt-3"
                    size="sm"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

      console.log('🔐 Rendering 3DS iframe...');

      return (
        <div className="w-full border rounded-md overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-3 border-b">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              🔒 3D Secure Authentication
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Please complete the verification below to confirm your payment.
            </p>
          </div>

          <iframe
            ref={iframeRef}
            title="PowerTranz 3DS Authentication"
            srcDoc={initData.redirectData}
            style={{
              width: '100%',
              height: '600px',
              border: 'none',
              backgroundColor: '#fff',
            }}
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
            onLoad={() => {
              console.log('✅ 3DS iframe loaded');
            }}
          />

          <div className="bg-gray-50 dark:bg-gray-900/50 p-3 border-t text-xs text-muted-foreground">
            <p>
              💡 The form above is secure and encrypted. Do not refresh or close this page while
              authenticating.
            </p>
          </div>
        </div>
      );
    }

    // ✅ STATE 4: ERROR
    if (powertranzState === 'error') {
      return (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Payment Error</p>
                <p className="text-sm text-red-700 mt-1">{powertranzError}</p>
                <Button
                  onClick={() => {
                    setPowertranzState('card_form');
                    setPowertranzError(null);
                  }}
                  className="mt-3"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  // =============== DEFAULT ===============
  console.error('❌ Unsupported payment provider:', initData.provider);
  return (
    <Card className="border-red-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Unsupported Payment Provider</p>
            <p className="text-sm text-red-700 mt-1">
              The selected payment provider is not supported. Please select another payment method.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
