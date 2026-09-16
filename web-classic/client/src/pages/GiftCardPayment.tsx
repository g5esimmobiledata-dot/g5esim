import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Loader2,
  Gift,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ArrowLeft,
  Shield,
  Lock,
} from 'lucide-react';
import { SiPaypal } from 'react-icons/si';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import PaymentGatewayRenderer from '@/components/payments/PaymentGatewayRenderer';
import { apiRequest } from '@/lib/queryClient';
import { Wallet } from 'lucide-react';

/**
 * GiftCardPayment - A compact, WebView-friendly page for gift card payments.
 *
 * Used by the mobile app via WebView. The mobile app opens this page with
 * query params containing all the gift card purchase details.
 *
 * Query Params:
 * - amount (required): Gift card amount
 * - currency (required): Currency code (e.g., USD, INR)
 * - email (required): Buyer's email
 * - name (optional): Buyer's name
 * - recipientName (optional): Recipient name
 * - recipientEmail (optional): Recipient email
 * - message (optional): Personal message
 * - gatewayId (optional): Pre-selected gateway ID
 * - token (optional): Auth token for mobile app session
 */

interface GatewayInfo {
  id: string;
  provider: string;
  displayName: string;
  publicKey?: string;
}

type PageState =
  | 'loading'
  | 'select_gateway'
  | 'processing'
  | 'payment'
  | 'success'
  | 'error';

export default function GiftCardPayment() {
  const params = new URLSearchParams(window.location.search);

  // Extract params from URL
  const amount = parseFloat(params.get('amount') || '0');
  const currency = params.get('currency') || 'USD';
  const email = params.get('email') || '';
  const name = params.get('name') || '';
  const recipientName = params.get('recipientName') || '';
  const recipientEmail = params.get('recipientEmail') || '';
  const message = params.get('message') || '';
  const preSelectedGatewayId = params.get('gatewayId') || '';
  const token = params.get('token') || '';

  const [pageState, setPageState] = useState<PageState>('loading');
  const [gateways, setGateways] = useState<GatewayInfo[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<GatewayInfo | null>(null);
  const [initResponse, setInitResponse] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Notify mobile app of events via postMessage
  const notifyMobile = useCallback((event: string, data?: any) => {
    try {
      const message = JSON.stringify({ type: 'giftcard_payment', event, ...data });
      // For React Native WebView
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(message);
      }
      // For Flutter WebView
      if ((window as any).flutter_inappwebview) {
        (window as any).flutter_inappwebview.callHandler('onPaymentEvent', message);
      }
      // Generic parent postMessage
      window.parent.postMessage(message, '*');
    } catch (e) {
      console.warn('Failed to notify mobile app:', e);
    }
  }, []);

  // Validate required params
  useEffect(() => {
    if (!amount || amount < 1) {
      setErrorMessage('Invalid or missing amount parameter.');
      setPageState('error');
      notifyMobile('error', { error: 'Invalid amount' });
      return;
    }
    if (!email) {
      setErrorMessage('Email is required.');
      setPageState('error');
      notifyMobile('error', { error: 'Missing email' });
      return;
    }
    // Fetch gateways
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      const res = await apiRequest('GET', `/api/payments/gateways?currency=${currency}`);
      const data = await res.json();
      const gatewayList: GatewayInfo[] = data.data || [];
      setGateways(gatewayList);

      if (gatewayList.length === 0) {
        setErrorMessage('No payment methods available for this currency.');
        setPageState('error');
        notifyMobile('error', { error: 'No gateways' });
        return;
      }

      // Auto-select if pre-selected or only one gateway
      if (preSelectedGatewayId) {
        const found = gatewayList.find((g) => g.id === preSelectedGatewayId);
        if (found) {
          setSelectedGateway(found);
          // Auto-initiate payment if gateway is pre-selected
          handleInitPayment(found);
          return;
        }
      }

      if (gatewayList.length === 1) {
        setSelectedGateway(gatewayList[0]);
        handleInitPayment(gatewayList[0]);
        return;
      }

      setPageState('select_gateway');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load payment methods.');
      setPageState('error');
      notifyMobile('error', { error: err.message });
    }
  };

  const handleInitPayment = async (gateway: GatewayInfo) => {
    setPageState('processing');
    setSelectedGateway(gateway);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // If token is provided from mobile app, include it
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await apiRequest('POST', '/api/payments/init-gift-card', {
        amount,
        currency,
        recipientName,
        recipientEmail,
        message,
        gatewayId: gateway.id,
        email,
        name,
      });

      const resData = await response.json();

      if (!resData.success) {
        throw new Error(resData.message || 'Failed to initialize payment');
      }

      // Handle PowerTranz HPP redirect
      if (gateway.provider === 'powertranz' && resData.powertranz?.method === 'hpp') {
        setInitResponse({
          provider: 'powertranz',
          orderId: resData.powertranz.orderId,
          redirectData: resData.powertranz.redirectData,
          spiToken: resData.powertranz.spiToken,
        });
      } else {
        setInitResponse(resData.payment);
      }

      setPageState('payment');
      notifyMobile('payment_initiated', { provider: gateway.provider });
    } catch (error: any) {
      setErrorMessage(error.message || 'Payment initialization failed.');
      setPageState('error');
      notifyMobile('error', { error: error.message });
    }
  };

  // Get currency symbol
  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      AED: 'د.إ',
      CAD: 'C$',
      AUD: 'A$',
      SGD: 'S$',
      JPY: '¥',
    };
    return symbols[code] || code + ' ';
  };

  const symbol = getCurrencySymbol(currency);

  // ─── RENDER: LOADING ───
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  // ─── RENDER: ERROR ───
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <title>Payment Error</title>
        </Helmet>
        <Card className="w-full max-w-md border-destructive/30 shadow-xl">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Payment Error</h2>
              <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setErrorMessage('');
                setPageState('loading');
                fetchGateways();
              }}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── RENDER: GATEWAY SELECTION ───
  if (pageState === 'select_gateway') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Helmet>
          <title>Select Payment Method - Gift Card</title>
        </Helmet>

        {/* Header */}
        <div className="bg-primary-gradient px-4 py-6 text-white">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">Gift Card Purchase</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{symbol}{amount}</span>
              <span className="text-sm opacity-80">{currency}</span>
            </div>
            {recipientName && (
              <p className="text-sm opacity-80 mt-1">For {recipientName}</p>
            )}
          </div>
        </div>

        {/* Gateway List */}
        <div className="flex-1 px-4 py-6">
          <div className="max-w-md mx-auto space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Select Payment Method</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how you'd like to pay
              </p>
            </div>

            <RadioGroup
              value={selectedGateway?.id || ''}
              onValueChange={(val) => {
                const gw = gateways.find((g) => g.id === val);
                if (gw) setSelectedGateway(gw);
              }}
              className="space-y-3"
            >
              {gateways.map((gateway) => (
                <div
                  key={gateway.id}
                  className={`relative flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all hover:border-primary/50 ${
                    selectedGateway?.id === gateway.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                      : 'border-muted bg-card'
                  }`}
                  onClick={() => setSelectedGateway(gateway)}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={gateway.id} id={gateway.id} className="sr-only" />
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border shadow-sm">
                      {gateway.provider === 'stripe' && (
                        <CreditCard className="h-5 w-5 text-[#6366f1]" />
                      )}
                      {gateway.provider === 'paypal' && (
                        <SiPaypal className="h-5 w-5 text-[#00457C]" />
                      )}
                      {gateway.provider === 'razorpay' && (
                        <div className="font-bold text-xs text-primary">RZP</div>
                      )}
                      {gateway.provider === 'powertranz' && (
                        <CreditCard className="h-5 w-5 text-gray-600" />
                      )}
                      {!['stripe', 'paypal', 'razorpay', 'powertranz'].includes(
                        gateway.provider
                      ) && <Wallet className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold capitalize">{gateway.displayName || gateway.provider}</p>
                      <p className="text-xs text-muted-foreground">Secure Payment</p>
                    </div>
                  </div>
                  {selectedGateway?.id === gateway.id && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </RadioGroup>

            <Separator />

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center py-2">
              <Shield className="h-3.5 w-3.5" />
              <span>Secured & encrypted payment</span>
              <Lock className="h-3.5 w-3.5 ml-1" />
            </div>

            <Button
              className="w-full h-12 text-base font-semibold"
              disabled={!selectedGateway}
              onClick={() => selectedGateway && handleInitPayment(selectedGateway)}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Pay {symbol}{amount}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: PROCESSING ───
  if (pageState === 'processing') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <title>Processing Payment...</title>
        </Helmet>
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">Initializing Payment</p>
            <p className="text-sm text-muted-foreground mt-1">
              Setting up secure payment for {symbol}{amount}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: PAYMENT FORM ───
  if (pageState === 'payment' && initResponse) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Helmet>
          <title>Complete Payment - Gift Card</title>
        </Helmet>

        {/* Compact Header */}
        <div className="bg-primary-gradient px-4 py-4 text-white">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              <span className="font-medium">Gift Card</span>
            </div>
            <Badge className="bg-white/20 text-white border-0 text-sm">
              {symbol}{amount} {currency}
            </Badge>
          </div>
        </div>

        {/* Payment Gateway */}
        <div className="flex-1 px-4 py-6">
          <div className="max-w-lg mx-auto space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Complete Your Payment</CardTitle>
                <CardDescription>
                  {symbol}{amount} Gift Card
                  {recipientEmail && ` for ${recipientEmail}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentGatewayRenderer
                  initData={initResponse}
                  email={email}
                  name={name}
                />
              </CardContent>
            </Card>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setInitResponse(null);
                if (gateways.length > 1) {
                  setPageState('select_gateway');
                } else {
                  setPageState('loading');
                  fetchGateways();
                }
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center py-2">
              <Shield className="h-3.5 w-3.5" />
              <span>Your payment is secure & encrypted</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
  );
}
