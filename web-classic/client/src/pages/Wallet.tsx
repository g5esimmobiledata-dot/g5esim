import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle,
  Coins,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Gift,
  History,
  Loader2,
  QrCode,
  Ticket,
  Wallet as WalletIcon,
} from 'lucide-react';
import { SiPaypal } from 'react-icons/si';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDisplayValue } from '@/lib/displayText';
import { cn } from '@/lib/utils';
import {
  buildDocumentHtml,
  exportHtmlDocument,
  rowsToHtmlTable,
  type DocumentExportFormat,
} from '@/lib/documentExport';

type Gateway = {
  id: string;
  provider: 'stripe' | 'paypal' | 'nowpayments' | 'cryptomus' | string;
  displayName: string;
  publicKey?: string;
  config?: Record<string, unknown>;
};

type WalletTransaction = {
  id: string;
  type: string;
  status: string;
  amount: string;
  currency: string;
  balanceBefore: string;
  balanceAfter: string;
  provider?: string | null;
  description?: string | null;
  createdAt: string;
};

type WalletData = {
  balance: string;
  currency: string;
  transactions: WalletTransaction[];
};

type WalletVoucher = {
  id: string;
  code: string;
  type: string;
  value: string;
  seriesCode?: string | null;
  serialNumber?: string | null;
  maxUses: number | null;
  currentUses: number;
  status: string;
  validUntil: string;
  description?: string | null;
  qrCode?: string | null;
  qrPayload?: string | null;
  createdAt: string;
};

type ResellerPaymentSettings = {
  paypalEmail: string;
};

type RedeemedVoucherReceipt = {
  balance: string;
  voucher: Pick<
    WalletVoucher,
    'id' | 'code' | 'type' | 'value' | 'seriesCode' | 'serialNumber' | 'status' | 'currentUses' | 'maxUses' | 'validUntil'
  >;
  transaction: WalletTransaction & {
    voucherId?: string | null;
    referenceId?: string | null;
    completedAt?: string | null;
  };
};

type PaymentConfig =
  | {
      provider: 'stripe';
      clientSecret: string;
      publicKey: string;
      paymentIntentId: string;
      amount: number;
      currency: string;
    }
  | {
      provider: 'paypal';
      orderId: string;
      publicKey: string;
      amount: number;
      currency: string;
      config?: Record<string, unknown>;
    }
  | {
      provider: 'ayamerchant';
      orderId: string;
      redirectUrl: string;
      amount: number;
      currency: string;
    }
  | {
      provider: 'nowpayments' | 'cryptomus';
      paymentId: string;
      paymentStatus: string;
      payAddress?: string;
      payAmount: number;
      payCurrency: string;
      network: string;
      priceAmount: number;
      priceCurrency: string;
      paymentUrl?: string | null;
      qrCode?: string | null;
      amount: number;
      currency: string;
    };

function formatMoney(amount: string | number, currency = 'USD') {
  const numeric = typeof amount === 'number' ? amount : Number(amount || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(numeric);
}

function formatCryptoAmount(amount: number, currency: string) {
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 8,
  }).format(Number(amount || 0))} ${currency.toUpperCase()}`;
}

function formatVoucherCode(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1-');
}

function displayVoucherCode(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 16 && /^[\d-]+$/.test(value)) {
    return formatVoucherCode(value);
  }
  return value;
}

function displayVoucherSeries(value?: string | null) {
  return value || 'S-0000000000';
}

function displayVoucherSerial(value?: string | null) {
  return value || 'SN-0000000000';
}

function addMonthsFromNow(months: number) {
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + months);
  return expiryDate;
}

function WalletStripeForm({
  transactionId,
  amount,
  currency,
  walletPath,
  onSuccess,
}: {
  transactionId: string;
  amount: number;
  currency: string;
  walletPath: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const confirmWalletTopup = async (paymentIntentId: string) => {
    const res = await apiRequest('POST', '/api/wallet/topup/confirm', {
      providerType: 'stripe',
      paymentIntentId,
      walletTransactionId: transactionId,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Wallet top-up confirmation failed');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const returnUrl = new URL(`${window.location.origin}${walletPath}`);
      returnUrl.searchParams.set('walletProvider', 'stripe');
      returnUrl.searchParams.set('walletTransactionId', transactionId);

      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: returnUrl.toString(),
        },
      });

      if (result.error) {
        throw new Error(result.error.message || 'Payment failed');
      }

      if (result.paymentIntent?.status === 'succeeded') {
        await confirmWalletTopup(result.paymentIntent.id);
        toast({
          title: 'Wallet topped up',
          description: `${formatMoney(amount, currency)} has been added to your wallet.`,
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Payment failed',
        description: error.message || 'Could not complete wallet top-up.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={!stripe || isProcessing}>
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing
          </>
        ) : (
          <>Pay {formatMoney(amount, currency)}</>
        )}
      </Button>
    </form>
  );
}

function WalletPaypalButton({
  transactionId,
  orderId,
  publicKey,
  amount,
  currency,
  onSuccess,
}: {
  transactionId: string;
  orderId: string;
  publicKey: string;
  amount: number;
  currency: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerId = `paypal-wallet-buttons-${transactionId}`;

  useEffect(() => {
    if (!publicKey) {
      setError('PayPal is not configured.');
      setIsLoading(false);
      return;
    }

    const scriptId = 'paypal-wallet-js-sdk';

    const renderButtons = () => {
      const paypal = (window as any).paypal;
      if (!paypal) {
        setError('PayPal failed to load.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = '';
      paypal
        .Buttons({
          createOrder: () => orderId,
          onApprove: async (data: any) => {
            try {
              const res = await apiRequest('POST', '/api/wallet/topup/confirm', {
                providerType: 'paypal',
                orderId: data.orderID,
                walletTransactionId: transactionId,
              });
              const result = await res.json();
              if (!result.success) throw new Error(result.message || 'Wallet top-up failed');

              toast({
                title: 'Wallet topped up',
                description: `${formatMoney(amount, currency)} has been added to your wallet.`,
              });
              onSuccess();
            } catch (err: any) {
              toast({
                title: 'PayPal payment failed',
                description: err.message || 'Could not confirm PayPal payment.',
                variant: 'destructive',
              });
            }
          },
          onError: (err: any) => {
            setError(err.message || 'PayPal checkout failed.');
          },
        })
        .render(`#${containerId}`);
    };

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      const currentClientId = new URL(existingScript.src).searchParams.get('client-id');
      if (currentClientId === publicKey) {
        if ((window as any).paypal) renderButtons();
        else existingScript.onload = renderButtons;
        return;
      }
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${publicKey}&currency=${currency}`;
    script.async = true;
    script.onload = renderButtons;
    script.onerror = () => {
      setError('Could not load PayPal.');
      setIsLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = '';
    };
  }, [amount, containerId, currency, orderId, publicKey, toast, transactionId, onSuccess]);

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-[150px]">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/70">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <div id={containerId} />
    </div>
  );
}

function WalletCryptoPayment({
  transactionId,
  payment,
  onSuccess,
}: {
  transactionId: string;
  payment: Extract<PaymentConfig, { provider: 'nowpayments' | 'cryptomus' }>;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const completedRef = useRef(false);
  const [paymentStatus, setPaymentStatus] = useState(payment.paymentStatus || 'waiting');
  const [isChecking, setIsChecking] = useState(false);
  const providerLabel = payment.provider === 'cryptomus' ? 'Cryptomus' : 'NOWPayments';
  const canShowAddress = Boolean(payment.payAddress);

  const copyValue = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    toast({ title: 'Copied', description: `${label} copied.` });
  };

  const checkPayment = useCallback(
    async (silent = false) => {
      if (completedRef.current) return;

      setIsChecking(true);
      try {
        const res = await apiRequest('POST', '/api/wallet/topup/confirm', {
          providerType: payment.provider,
          providerPaymentId: payment.paymentId,
          walletTransactionId: transactionId,
        });
        const data = await res.json();

        if (data.success) {
          completedRef.current = true;
          toast({
            title: 'Wallet topped up',
            description: `${formatMoney(payment.priceAmount, payment.priceCurrency)} has been added to your wallet.`,
          });
          onSuccess();
          return;
        }

        const nextStatus = data.data?.paymentStatus || paymentStatus;
        setPaymentStatus(nextStatus);
        if (!silent) {
          toast({
            title: `${providerLabel} payment pending`,
            description: data.message || `Current status: ${nextStatus}`,
          });
        }
      } catch (error: any) {
        if (!silent) {
          toast({
            title: `Could not confirm ${providerLabel} payment`,
            description: error.message || 'Please try again in a moment.',
            variant: 'destructive',
          });
        }
      } finally {
        setIsChecking(false);
      }
    },
    [
      onSuccess,
      payment.paymentId,
      payment.priceAmount,
      payment.priceCurrency,
      payment.provider,
      paymentStatus,
      providerLabel,
      toast,
      transactionId,
    ],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      checkPayment(true);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [checkPayment]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        {payment.qrCode ? (
          <img
            src={payment.qrCode}
            alt={`${providerLabel} payment QR`}
            className="h-40 w-40 rounded-md border bg-white p-2"
          />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-md border bg-muted">
            <QrCode className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Send exactly</p>
            <p className="text-2xl font-semibold">
              {formatCryptoAmount(payment.payAmount, payment.payCurrency)}
            </p>
            <p className="text-sm text-muted-foreground">
              Wallet credit: {formatMoney(payment.priceAmount, payment.priceCurrency)}
            </p>
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{payment.network}</span>
              <Badge variant="outline" className="capitalize">{paymentStatus || 'waiting'}</Badge>
            </div>
            {canShowAddress ? (
              <p className="break-all font-mono text-sm">{payment.payAddress}</p>
            ) : payment.paymentUrl ? (
              <a
                href={payment.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Open secure {providerLabel} payment page
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">Payment details are being prepared.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {canShowAddress && (
              <Button type="button" variant="outline" onClick={() => copyValue(payment.payAddress || '', 'Wallet address')}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Address
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => copyValue(String(payment.payAmount), 'USDT amount')}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Amount
            </Button>
            {payment.paymentUrl && (
              <Button type="button" variant="outline" asChild>
                <a href={payment.paymentUrl} target="_blank" rel="noreferrer">
                  Open Payment
                </a>
              </Button>
            )}
            <Button type="button" onClick={() => checkPayment(false)} disabled={isChecking}>
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking
                </>
              ) : (
                'Check Payment'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WalletAyaMerchantPayment({
  payment,
}: {
  transactionId: string;
  payment: Extract<PaymentConfig, { provider: 'ayamerchant' }>;
  onSuccess: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.href = payment.redirectUrl;
    }, 700);

    return () => window.clearTimeout(timer);
  }, [payment.redirectUrl]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-4">
        <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">AYAMERCHANT Payment</p>
          <p className="text-sm text-muted-foreground">
            You will be redirected to AYAMERCHANT to complete this wallet top-up.
          </p>
        </div>
      </div>
      <Button type="button" asChild>
        <a href={payment.redirectUrl}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Continue to AYAMERCHANT
        </a>
      </Button>
    </div>
  );
}

type WalletPageProps = {
  walletPath?: string;
  initialTab?: WalletTab;
  [key: string]: unknown;
};

type WalletTab = 'topup' | 'voucher' | 'generate' | 'history';
type WalletGatewayShortcut = 'stripe' | 'paypal' | 'crypto';

function getInitialGatewayShortcut(): WalletGatewayShortcut | '' {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const provider = (params.get('gateway') || '').toLowerCase();
  if (provider === 'stripe' || provider === 'paypal') return provider;
  if (provider === 'crypto' || provider === 'nowpayments' || provider === 'cryptomus') return 'crypto';
  return '';
}

type VoucherLimitData = {
  limit: string;
  used: string;
  remaining: string | null;
  unlimited: boolean;
  applies: boolean;
};

export default function WalletPage({ walletPath = '/account/wallet', initialTab = 'topup' }: WalletPageProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const autoRedeemRef = useRef(false);
  const [activeWalletTab, setActiveWalletTab] = useState<WalletTab>(initialTab);
  const [amount, setAmount] = useState('25');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherAmount, setVoucherAmount] = useState('10');
  const [voucherDescription, setVoucherDescription] = useState('');
  const [voucherValidityMonths, setVoucherValidityMonths] = useState('12');
  const [generatedVoucher, setGeneratedVoucher] = useState<WalletVoucher | null>(null);
  const [selectedGatewayId, setSelectedGatewayId] = useState('');
  const [requestedGatewayShortcut, setRequestedGatewayShortcut] = useState<WalletGatewayShortcut | ''>(
    () => getInitialGatewayShortcut(),
  );
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [paymentTransactionId, setPaymentTransactionId] = useState<string | null>(null);
  const [redeemedVoucherReceipt, setRedeemedVoucherReceipt] = useState<RedeemedVoucherReceipt | null>(null);
  const [selectedGeneratedVoucherIds, setSelectedGeneratedVoucherIds] = useState<string[]>([]);
  const [paypalEmail, setPaypalEmail] = useState('');
  const isResellerWallet = walletPath.startsWith('/reseller');

  const { data: wallet, isLoading: isWalletLoading } = useQuery<WalletData>({
    queryKey: ['/api/wallet'],
  });

  const { data: publicSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ['/api/public/settings'],
  });

  const { data: gateways = [], isLoading: isGatewaysLoading } = useQuery<Gateway[]>({
    queryKey: ['/api/payments/gateways', { currency: 'USD', scope: 'wallet' }],
  });

  const { data: generatedVouchers = [] } = useQuery<WalletVoucher[]>({
    queryKey: ['/api/wallet/vouchers'],
  });

  const selectedGeneratedVoucherSet = useMemo(
    () => new Set(selectedGeneratedVoucherIds),
    [selectedGeneratedVoucherIds],
  );
  const selectedGeneratedVouchers = useMemo(
    () => generatedVouchers.filter((voucher) => selectedGeneratedVoucherSet.has(voucher.id)),
    [generatedVouchers, selectedGeneratedVoucherSet],
  );
  const allGeneratedSelected =
    generatedVouchers.length > 0 && generatedVouchers.every((voucher) => selectedGeneratedVoucherSet.has(voucher.id));

  const { data: voucherLimit } = useQuery<VoucherLimitData>({
    queryKey: ['/api/wallet/voucher-limit'],
  });

  const { data: resellerPaymentSettings } = useQuery<ResellerPaymentSettings>({
    queryKey: ['/api/reseller/payment-settings'],
    enabled: isResellerWallet,
  });

  const walletGateways = useMemo(
    () => gateways.filter((gateway) => ['stripe', 'paypal', 'nowpayments', 'cryptomus', 'ayamerchant'].includes(gateway.provider)),
    [gateways],
  );
  const findShortcutGateway = useCallback(
    (shortcut: WalletGatewayShortcut) => {
      if (shortcut === 'crypto') {
        return walletGateways.find((gateway) => ['nowpayments', 'cryptomus'].includes(gateway.provider));
      }
      return walletGateways.find((gateway) => gateway.provider === shortcut);
    },
    [walletGateways],
  );
  const selectedGateway = walletGateways.find((gateway) => gateway.id === selectedGatewayId);
  const isPaypalSelected = selectedGateway?.provider === 'paypal';
  const paypalEmailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail.trim());
  const sandboxAccountRole =
    user?.role === 'agent' || user?.role === 'reseller'
      ? user.role
      : isResellerWallet
        ? 'reseller'
        : 'customer';
  const sandboxAppliesToRole =
    sandboxAccountRole === 'reseller'
      ? publicSettings.sandbox_apply_reseller !== 'false'
      : sandboxAccountRole === 'agent'
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
  const sandboxWalletTopupEnabled = publicSettings.sandbox_wallet_topup_enabled !== 'false';
  const maxSandboxTopupAmount = Number(publicSettings.sandbox_wallet_topup_max || 500);

  useEffect(() => {
    if (requestedGatewayShortcut && walletGateways.length > 0) {
      const requestedGateway = findShortcutGateway(requestedGatewayShortcut);
      if (requestedGateway) {
        setSelectedGatewayId(requestedGateway.id);
        setRequestedGatewayShortcut('');
        return;
      }
    }

    if (!selectedGatewayId && walletGateways.length > 0) {
      setSelectedGatewayId(walletGateways[0].id);
    }
  }, [findShortcutGateway, requestedGatewayShortcut, selectedGatewayId, walletGateways]);

  useEffect(() => {
    if (resellerPaymentSettings?.paypalEmail) {
      setPaypalEmail(resellerPaymentSettings.paypalEmail);
    }
  }, [resellerPaymentSettings]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const walletProvider = params.get('walletProvider');
    const walletTransactionId = params.get('walletTransactionId');
    const paymentIntentId = params.get('payment_intent');
    const ayamerchantOrderId = params.get('orderId') || params.get('tx_ref') || params.get('txRef');

    if (!walletProvider || !walletTransactionId) return;
    if (walletProvider === 'stripe' && !paymentIntentId) return;
    if (walletProvider === 'ayamerchant' && !ayamerchantOrderId) return;
    if (!['stripe', 'ayamerchant'].includes(walletProvider)) return;

    let cancelled = false;
    apiRequest('POST', '/api/wallet/topup/confirm', {
      providerType: walletProvider,
      ...(walletProvider === 'stripe'
        ? { paymentIntentId }
        : { orderId: ayamerchantOrderId, providerPaymentId: ayamerchantOrderId }),
      walletTransactionId,
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) throw new Error(data.message || 'Wallet top-up confirmation failed');
        toast({ title: 'Wallet topped up', description: 'Your wallet balance has been updated.' });
        queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
        window.history.replaceState({}, '', walletPath);
      })
      .catch((error: any) => {
        if (cancelled) return;
        toast({
          title: 'Wallet top-up failed',
          description: error.message || 'Could not confirm wallet top-up.',
          variant: 'destructive',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [toast, walletPath]);

  const topupMutation = useMutation({
    mutationFn: async () => {
      const numericAmount = Number(amount);
      const res = await apiRequest('POST', '/api/wallet/topup/init', {
        amount: numericAmount,
        currency: 'USD',
        gatewayId: selectedGatewayId,
        walletPath,
        ...(isResellerWallet && isPaypalSelected ? { paypalEmail: paypalEmail.trim() } : {}),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.success) throw new Error(data.message || 'Could not initialize wallet top-up');
      setPaymentTransactionId(data.data.transactionId);
      setPaymentConfig(data.data.payment);
    },
    onError: (error: any) => {
      toast({
        title: 'Top-up failed',
        description: error.message || 'Could not initialize wallet top-up.',
        variant: 'destructive',
      });
    },
  });

  const sandboxTopupMutation = useMutation({
    mutationFn: async () => {
      const numericAmount = Number(amount);
      const res = await apiRequest('POST', '/api/wallet/sandbox/topup', {
        amount: numericAmount,
        currency: 'USD',
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.success) throw new Error(data.message || 'Could not add sandbox funds');
      setPaymentConfig(null);
      setPaymentTransactionId(null);
      toast({
        title: 'Sandbox funds added',
        description: `${formatMoney(amount, 'USD')} in test funds has been added to your wallet.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Sandbox top-up failed',
        description: error.message || 'Could not add sandbox funds.',
        variant: 'destructive',
      });
    },
  });

  const paypalSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PATCH', '/api/reseller/payment-settings', {
        paypalEmail: paypalEmail.trim(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.success) throw new Error(data.message || 'Could not save PayPal email');
      setPaypalEmail(data.data.paypalEmail || '');
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/payment-settings'] });
      toast({
        title: 'PayPal email saved',
        description: 'Your Reseller PayPal Account email was saved for wallet deposits.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'PayPal email failed',
        description: error.message || 'Could not save PayPal email.',
        variant: 'destructive',
      });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (codeOverride?: string) => {
      const res = await apiRequest('POST', '/api/wallet/redeem-voucher', {
        code: codeOverride || voucherCode,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.success) throw new Error(data.message || 'Could not redeem voucher');
      setVoucherCode('');
      setRedeemedVoucherReceipt(data.data || null);
      toast({
        title: 'Voucher redeemed',
        description: 'The voucher amount has been added to your wallet.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/voucher-limit'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Redeem failed',
        description: error.message || 'Could not redeem this voucher.',
        variant: 'destructive',
      });
    },
  });

  const generateVoucherMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/wallet/vouchers', {
        amount: Number(voucherAmount),
        description: voucherDescription || undefined,
        validUntil: addMonthsFromNow(Number(voucherValidityMonths || 12)).toISOString(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.success) throw new Error(data.message || 'Could not generate voucher');
      setGeneratedVoucher(data.data.voucher);
      setVoucherDescription('');
      toast({
        title: 'Voucher generated',
        description: 'The QR code is Ready to share or redeem.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/voucher-limit'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Voucher failed',
        description: error.message || 'Could not generate this voucher.',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redeemCode = params.get('redeemVoucher') || params.get('voucherCode');
    if (!redeemCode || autoRedeemRef.current) return;

    autoRedeemRef.current = true;
    const normalizedCode = formatVoucherCode(redeemCode);
    setVoucherCode(normalizedCode);
    redeemMutation.mutate(normalizedCode, {
      onSettled: () => {
        window.history.replaceState({}, '', walletPath);
      },
    });
  }, [redeemMutation, walletPath]);

  const handlePaymentSuccess = () => {
    setPaymentConfig(null);
    setPaymentTransactionId(null);
    queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
  };

  const clearPendingPayment = useCallback(() => {
    setPaymentConfig(null);
    setPaymentTransactionId(null);
  }, []);

  const downloadRedeemedVoucher = useCallback(
    (format: DocumentExportFormat) => {
      if (!redeemedVoucherReceipt) return;

      const transaction = redeemedVoucherReceipt.transaction;
      const voucher = redeemedVoucherReceipt.voucher;
      const completedDate = transaction.completedAt || transaction.createdAt || new Date().toISOString();
      const rows = [
        ['Field', 'Value'],
        ['Voucher Code', displayVoucherCode(voucher.code)],
        ['Series#', displayVoucherSeries(voucher.seriesCode)],
        ['Serial#', displayVoucherSerial(voucher.serialNumber)],
        ['Amount Credited', formatMoney(transaction.amount || voucher.value, transaction.currency || 'USD')],
        ['Transaction ID', transaction.id],
        ['Reference', transaction.referenceId || voucher.code],
        ['Redeemed By', user?.email || user?.id || 'Account user'],
        ['Redeemed At', new Date(completedDate).toLocaleString()],
        ['Balance Before', formatMoney(transaction.balanceBefore || 0, transaction.currency || 'USD')],
        ['Balance After', formatMoney(transaction.balanceAfter || redeemedVoucherReceipt.balance, transaction.currency || 'USD')],
        ['Status', transaction.status || 'completed'],
      ];

      const html = buildDocumentHtml({
        title: 'Redeemed Voucher Receipt',
        subtitle: `Generated ${new Date().toLocaleString()} | ${displayVoucherCode(voucher.code)}`,
        sections: [
          {
            title: 'Redemption Details',
            html: rowsToHtmlTable(rows),
          },
        ],
      });

      exportHtmlDocument(html, `redeemed-voucher-${voucher.code}`, format);
      toast({
        title: 'Voucher receipt ready',
        description: `Downloaded redeemed voucher receipt as ${format.toUpperCase()}.`,
      });
    },
    [redeemedVoucherReceipt, toast, user?.email, user?.id],
  );

  const toggleGeneratedVoucherSelection = useCallback((voucherId: string, checked: boolean | 'indeterminate') => {
    setSelectedGeneratedVoucherIds((current) => {
      const next = new Set(current);
      if (checked === true) {
        next.add(voucherId);
      } else {
        next.delete(voucherId);
      }
      return Array.from(next);
    });
  }, []);

  const toggleAllGeneratedVouchers = useCallback(
    (checked: boolean | 'indeterminate') => {
      setSelectedGeneratedVoucherIds(checked === true ? generatedVouchers.map((voucher) => voucher.id) : []);
    },
    [generatedVouchers],
  );

  const downloadSelectedGeneratedVouchers = useCallback(
    (format: DocumentExportFormat) => {
      if (!selectedGeneratedVouchers.length) {
        toast({
          title: 'Select vouchers to download',
          description: 'Choose one or more generated vouchers first.',
          variant: 'destructive',
        });
        return;
      }

      const rows = [
        [
          'Series#',
          'Serial#',
          'Voucher Code',
          'Value',
          'Status',
          'Usage',
          'Valid Until',
          'Created At',
          'Description',
          'Redeem Link',
        ],
        ...selectedGeneratedVouchers.map((voucher) => [
          displayVoucherSeries(voucher.seriesCode),
          displayVoucherSerial(voucher.serialNumber),
          displayVoucherCode(voucher.code),
          formatMoney(voucher.value, 'USD'),
          voucher.status,
          `${voucher.currentUses}${voucher.maxUses ? ` / ${voucher.maxUses}` : ''}`,
          voucher.validUntil ? new Date(voucher.validUntil).toLocaleString() : '',
          voucher.createdAt ? new Date(voucher.createdAt).toLocaleString() : '',
          voucher.description || '',
          voucher.qrPayload || '',
        ]),
      ];

      const html = buildDocumentHtml({
        title: 'Generated Voucher Codes',
        subtitle: `Generated ${new Date().toLocaleString()} | ${selectedGeneratedVouchers.length} selected vouchers`,
        sections: [
          {
            title: 'Selected Generated Vouchers',
            html: rowsToHtmlTable(rows),
          },
        ],
      });

      exportHtmlDocument(html, `generated-vouchers-${new Date().toISOString().slice(0, 10)}`, format);
      toast({
        title: 'Generated vouchers downloaded',
        description: `Downloaded ${selectedGeneratedVouchers.length} selected vouchers.`,
      });
    },
    [selectedGeneratedVouchers, toast],
  );

  const scrollToWalletActionPanel = useCallback(() => {
    window.setTimeout(() => {
      document.getElementById('wallet-action-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, []);

  const selectTopupShortcut = useCallback(
    (shortcut: WalletGatewayShortcut) => {
      setActiveWalletTab('topup');
      clearPendingPayment();
      scrollToWalletActionPanel();

      const gateway = findShortcutGateway(shortcut);
      if (gateway) {
        setSelectedGatewayId(gateway.id);
        setRequestedGatewayShortcut('');
        return;
      }

      setRequestedGatewayShortcut(shortcut);
      if (!isGatewaysLoading) {
        const methodName = shortcut === 'crypto' ? 'Crypto' : shortcut === 'paypal' ? 'PayPal' : 'Card';
        toast({
          title: `${methodName} is not configured`,
          description:
            shortcut === 'paypal'
              ? 'PayPal needs Enabled status, USD currency, Client ID, and Secret in Payment Gateways.'
              : `${methodName} needs Enabled status, USD currency, and valid gateway Credentials.`,
          variant: 'destructive',
        });
      }
    },
    [clearPendingPayment, findShortcutGateway, isGatewaysLoading, scrollToWalletActionPanel, toast],
  );

  const openWalletTab = useCallback(
    (tab: WalletTab) => {
      setActiveWalletTab(tab);
      clearPendingPayment();
      scrollToWalletActionPanel();
    },
    [clearPendingPayment, scrollToWalletActionPanel],
  );

  const copyVoucher = (voucher: Pick<WalletVoucher, 'code' | 'qrPayload'>) => {
    navigator.clipboard?.writeText(voucher.qrPayload || displayVoucherCode(voucher.code));
    toast({ title: 'Copied', description: 'Voucher link copied.' });
  };

  const selectedGatewayShortcut: WalletGatewayShortcut | '' =
    selectedGateway?.provider === 'stripe'
      ? 'stripe'
      : selectedGateway?.provider === 'paypal'
        ? 'paypal'
        : selectedGateway && ['nowpayments', 'cryptomus'].includes(selectedGateway.provider)
          ? 'crypto'
          : '';
  const shortcutAvailable = (shortcut: WalletGatewayShortcut) => Boolean(findShortcutGateway(shortcut));
  const unavailableText = 'Not configured for USD';
  const voucherAmountNumber = Number(voucherAmount || 0);
  const voucherRemainingNumber = Number(voucherLimit?.remaining ?? 0);
  const voucherLimitExceeded = Boolean(
    voucherLimit?.applies &&
      !voucherLimit.unlimited &&
      voucherAmountNumber > voucherRemainingNumber + 0.001,
  );
  const walletOptionClass = (active: boolean, available = true) =>
    cn(
      'rounded-md border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border',
      !available && 'border-dashed opacity-70',
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardDescription>Available balance</CardDescription>
                <CardTitle className="mt-2 text-4xl">
                  {isWalletLoading ? '...' : formatMoney(wallet?.balance || '0.00', 'USD')}
                </CardTitle>
              </div>
              <div className="rounded-full bg-primary/15 p-3 text-primary">
                <WalletIcon className="h-7 w-7" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add Funds with a Voucher, Crypto, Card Payment, or PayPal.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
            <CardDescription>Top up and Track wallet activity from one place.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <button
                type="button"
                onClick={() => selectTopupShortcut('stripe')}
                className={walletOptionClass(
                  activeWalletTab === 'topup' && selectedGatewayShortcut === 'stripe',
                  shortcutAvailable('stripe'),
                )}
                aria-pressed={activeWalletTab === 'topup' && selectedGatewayShortcut === 'stripe'}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  {activeWalletTab === 'topup' && selectedGatewayShortcut === 'stripe' && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="font-medium">Card</p>
                <p className="text-sm text-muted-foreground">
                  {shortcutAvailable('stripe') ? 'Credit and debit card via Stripe' : unavailableText}
                </p>
              </button>
              <button
                type="button"
                onClick={() => selectTopupShortcut('paypal')}
                className={walletOptionClass(
                  activeWalletTab === 'topup' && selectedGatewayShortcut === 'paypal',
                  shortcutAvailable('paypal'),
                )}
                aria-pressed={activeWalletTab === 'topup' && selectedGatewayShortcut === 'paypal'}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <SiPaypal className="h-5 w-5 text-[#00457C]" />
                  {activeWalletTab === 'topup' && selectedGatewayShortcut === 'paypal' && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="font-medium">PayPal</p>
                <p className="text-sm text-muted-foreground">
                  {shortcutAvailable('paypal') ? 'PayPal account checkout' : unavailableText}
                </p>
              </button>
              <button
                type="button"
                onClick={() => selectTopupShortcut('crypto')}
                className={walletOptionClass(
                  activeWalletTab === 'topup' && selectedGatewayShortcut === 'crypto',
                  shortcutAvailable('crypto'),
                )}
                aria-pressed={activeWalletTab === 'topup' && selectedGatewayShortcut === 'crypto'}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  {activeWalletTab === 'topup' && selectedGatewayShortcut === 'crypto' && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="font-medium">Crypto</p>
                <p className="text-sm text-muted-foreground">
                  {shortcutAvailable('crypto') ? 'USDT wallet payment' : unavailableText}
                </p>
              </button>
              <button
                type="button"
                onClick={() => openWalletTab('voucher')}
                className={walletOptionClass(activeWalletTab === 'voucher')}
                aria-pressed={activeWalletTab === 'voucher'}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Ticket className="h-5 w-5 text-primary" />
                  {activeWalletTab === 'voucher' && <CheckCircle className="h-4 w-4 text-primary" />}
                </div>
                <p className="font-medium">Voucher</p>
                <p className="text-sm text-muted-foreground">Redeem wallet credit codes</p>
              </button>
              <button
                type="button"
                onClick={() => openWalletTab('generate')}
                className={walletOptionClass(activeWalletTab === 'generate')}
                aria-pressed={activeWalletTab === 'generate'}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  {activeWalletTab === 'generate' && <CheckCircle className="h-4 w-4 text-primary" />}
                </div>
                <p className="font-medium">QR Voucher</p>
                <p className="text-sm text-muted-foreground">Generate scannable top-up codes</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        id="wallet-action-panel"
        value={activeWalletTab}
        onValueChange={(value) => setActiveWalletTab(value as WalletTab)}
        className="scroll-mt-6 space-y-4"
      >
        <TabsList>
          <TabsTrigger value="topup">Top Up</TabsTrigger>
          <TabsTrigger value="voucher">Redeem Code</TabsTrigger>
          <TabsTrigger value="generate">Generate Voucher</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="topup">
          <Card>
            <CardHeader>
              <CardTitle>Add Funds</CardTitle>
              <CardDescription>Wallet top-ups are processed in USD.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wallet-amount">Amount</Label>
                  <Input
                    id="wallet-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setPaymentConfig(null);
                      setPaymentTransactionId(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input value="USD" disabled />
                </div>
              </div>

              {sandboxModeActive && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
                  <div className="mb-3 flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-medium">Sandbox Demo Mode</p>
                      <p className="text-sm">
                        Add test funds without charging a payment processor. Orders paid with these funds will receive fake eSIM details.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => sandboxTopupMutation.mutate()}
                    disabled={
                      !sandboxWalletTopupEnabled ||
                      sandboxTopupMutation.isPending ||
                      Number(amount) <= 0 ||
                      Number(amount) > maxSandboxTopupAmount
                    }
                  >
                    {sandboxTopupMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding Funds
                      </>
                    ) : (
                      <>Add Sandbox Funds</>
                    )}
                  </Button>
                  {!sandboxWalletTopupEnabled && (
                    <p className="mt-2 text-xs">Sandbox wallet top-up is disabled by admin.</p>
                  )}
                  {Number(amount) > maxSandboxTopupAmount && (
                    <p className="mt-2 text-xs">
                      Maximum sandbox top-up is {formatMoney(maxSandboxTopupAmount, 'USD')}.
                    </p>
                  )}
                </div>
              )}

              {!sandboxModeActive && (
                <>
              <div className="space-y-3">
                <Label>Payment Method</Label>
                {isGatewaysLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading gateways
                  </div>
                ) : walletGateways.length === 0 ? (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>No Stripe, PayPal, AYAMERCHANT, or crypto gateway is enabled for USD yet.</span>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {walletGateways.map((gateway) => {
                      const selected = selectedGatewayId === gateway.id;
                      return (
                        <button
                          key={gateway.id}
                          type="button"
                          onClick={() => {
                            setSelectedGatewayId(gateway.id);
                            setPaymentConfig(null);
                            setPaymentTransactionId(null);
                          }}
                          className={`flex items-center gap-3 rounded-md border p-4 text-left transition ${
                            selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'
                          }`}
                        >
                          {gateway.provider === 'paypal' ? (
                            <SiPaypal className="h-5 w-5 text-[#00457C]" />
                          ) : ['nowpayments', 'cryptomus'].includes(gateway.provider) ? (
                            <Coins className="h-5 w-5 text-primary" />
                          ) : gateway.provider === 'ayamerchant' ? (
                            <CreditCard className="h-5 w-5 text-primary" />
                          ) : (
                            <CreditCard className="h-5 w-5 text-primary" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium">{gateway.displayName || gateway.provider}</p>
                            <p className="text-sm capitalize text-muted-foreground">{gateway.provider}</p>
                          </div>
                          {selected && <CheckCircle className="ml-auto h-5 w-5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {isResellerWallet && isPaypalSelected && (
                <div className="rounded-md border border-[#00457C]/20 bg-[#00457C]/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <SiPaypal className="h-5 w-5 text-[#00457C]" />
                    <div>
                      <p className="font-medium">Reseller PayPal Account</p>
                      <p className="text-sm text-muted-foreground">
                        Add the PayPal email you want associated with wallet deposits.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <Label htmlFor="reseller-paypal-email">PayPal Email</Label>
                      <Input
                        id="reseller-paypal-email"
                        type="email"
                        value={paypalEmail}
                        onChange={(event) => {
                          setPaypalEmail(event.target.value);
                          setPaymentConfig(null);
                          setPaymentTransactionId(null);
                        }}
                        placeholder="reseller@example.com"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="self-end"
                      onClick={() => paypalSettingsMutation.mutate()}
                      disabled={paypalSettingsMutation.isPending || !paypalEmailIsValid}
                    >
                      {paypalSettingsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : (
                        'Save PayPal Email'
                      )}
                    </Button>
                  </div>
                  {!paypalEmailIsValid && paypalEmail.trim() && (
                    <p className="mt-2 text-xs text-destructive">Enter a valid PayPal email address.</p>
                  )}
                </div>
              )}

              {!paymentConfig && (
                <Button
                  onClick={() => topupMutation.mutate()}
                  disabled={
                    !selectedGatewayId ||
                    topupMutation.isPending ||
                    (isResellerWallet && isPaypalSelected && !paypalEmailIsValid)
                  }
                >
                  {topupMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing payment
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              )}

              {paymentConfig && paymentTransactionId && (
                <div className="rounded-md border p-4">
                  {paymentConfig.provider === 'stripe' ? (
                    <Elements
                      stripe={loadStripe(paymentConfig.publicKey)}
                      options={{ clientSecret: paymentConfig.clientSecret }}
                    >
                      <WalletStripeForm
                        transactionId={paymentTransactionId}
                        amount={paymentConfig.amount}
                        currency={paymentConfig.currency}
                        walletPath={walletPath}
                        onSuccess={handlePaymentSuccess}
                      />
                    </Elements>
                  ) : paymentConfig.provider === 'paypal' ? (
                    <WalletPaypalButton
                      transactionId={paymentTransactionId}
                      orderId={paymentConfig.orderId}
                      publicKey={paymentConfig.publicKey}
                      amount={paymentConfig.amount}
                      currency={paymentConfig.currency}
                      onSuccess={handlePaymentSuccess}
                    />
                  ) : paymentConfig.provider === 'ayamerchant' ? (
                    <WalletAyaMerchantPayment
                      transactionId={paymentTransactionId}
                      payment={paymentConfig}
                      onSuccess={handlePaymentSuccess}
                    />
                  ) : (
                    <WalletCryptoPayment
                      transactionId={paymentTransactionId}
                      payment={paymentConfig}
                      onSuccess={handlePaymentSuccess}
                    />
                  )}
                </div>
              )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voucher">
          <Card>
            <CardHeader>
              <CardTitle>Redeem Voucher</CardTitle>
              <CardDescription>Wallet credit voucher codes can be added to your wallet.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="voucher-code">Voucher Code</Label>
                <Input
                  id="voucher-code"
                  value={voucherCode}
                  onChange={(event) => setVoucherCode(formatVoucherCode(event.target.value))}
                  placeholder="0000-0000-0000-0000"
                  inputMode="numeric"
                  maxLength={19}
                />
              </div>
              <Button
                onClick={() => redeemMutation.mutate(undefined)}
                disabled={!voucherCode.trim() || redeemMutation.isPending}
              >
                {redeemMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redeeming
                  </>
                ) : (
                  'Redeem'
                )}
              </Button>

              {redeemedVoucherReceipt && (
                <div className="rounded-md border bg-muted/30 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Voucher Redeemed</p>
                          <p className="text-sm text-muted-foreground">
                            {formatMoney(
                              redeemedVoucherReceipt.transaction.amount || redeemedVoucherReceipt.voucher.value,
                              redeemedVoucherReceipt.transaction.currency || 'USD',
                            )}{' '}
                            was added to your wallet.
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-muted-foreground">Voucher Code</p>
                          <p className="font-mono font-medium">
                            {displayVoucherCode(redeemedVoucherReceipt.voucher.code)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Transaction ID</p>
                          <p className="font-mono font-medium break-all">{redeemedVoucherReceipt.transaction.id}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Series#</p>
                          <p className="font-mono font-medium">
                            {displayVoucherSeries(redeemedVoucherReceipt.voucher.seriesCode)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Serial#</p>
                          <p className="font-mono font-medium">
                            {displayVoucherSerial(redeemedVoucherReceipt.voucher.serialNumber)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" className="shrink-0">
                          <Download className="mr-2 h-4 w-4" />
                          Download Receipt
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => downloadRedeemedVoucher('excel')}>
                          <FileText className="mr-2 h-4 w-4" />
                          Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadRedeemedVoucher('word')}>
                          <FileText className="mr-2 h-4 w-4" />
                          Word
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadRedeemedVoucher('pdf')}>
                          <FileText className="mr-2 h-4 w-4" />
                          PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Generate Voucher</CardTitle>
              <CardDescription>Create a QR voucher from your wallet balance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {voucherLimit?.applies && (
                <div className="rounded-md border border-lime-300 bg-lime-50 p-4 text-sm text-lime-950 dark:border-lime-400/30 dark:bg-lime-400/10 dark:text-lime-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-medium">Voucher Limit</span>
                    <span>
                      {voucherLimit.unlimited
                        ? 'Unlimited'
                        : `${formatMoney(voucherLimit.remaining || 0, 'USD')} remaining of ${formatMoney(voucherLimit.limit, 'USD')}`}
                    </span>
                  </div>
                  <p className="mt-2 text-xs opacity-80">
                    Admin controls the maximum active voucher value for Agent and Reseller accounts.
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="voucher-amount">Amount</Label>
                  <Input
                    id="voucher-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={voucherAmount}
                    onChange={(event) => setVoucherAmount(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voucher-validity">Auto Validity</Label>
                  <Select value={voucherValidityMonths} onValueChange={setVoucherValidityMonths}>
                    <SelectTrigger id="voucher-validity" data-testid="select-wallet-voucher-validity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="9">9 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voucher-note">Note</Label>
                  <Input
                    id="voucher-note"
                    value={voucherDescription}
                    onChange={(event) => setVoucherDescription(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <Button
                onClick={() => generateVoucherMutation.mutate()}
                disabled={generateVoucherMutation.isPending || !voucherAmountNumber || voucherLimitExceeded}
              >
                {generateVoucherMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  <>
                    <Gift className="mr-2 h-4 w-4" />
                    Generate Voucher
                  </>
                )}
              </Button>
              {voucherLimitExceeded && (
                <p className="text-sm text-destructive">
                  This voucher exceeds your remaining limit of {formatMoney(voucherLimit?.remaining || 0, 'USD')}.
                </p>
              )}

              {generatedVoucher && (
                <div className="grid gap-4 rounded-md border p-4 md:grid-cols-[auto_1fr]">
                  {generatedVoucher.qrCode && (
                    <img
                      src={generatedVoucher.qrCode}
                      alt={`${generatedVoucher.code} QR`}
                      className="h-40 w-40 rounded-md border bg-white p-2"
                    />
                  )}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Generated code</p>
                      <p className="font-mono text-xl font-semibold">
                        {displayVoucherCode(generatedVoucher.code)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Value {formatMoney(generatedVoucher.value, 'USD')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => copyVoucher(generatedVoucher)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => redeemMutation.mutate(generatedVoucher.code)}
                      >
                        Redeem
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {generatedVouchers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label>Generated Vouchers</Label>
                      <p className="text-sm text-muted-foreground">
                        Select one or more vouchers to download them together.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                        <Checkbox
                          checked={allGeneratedSelected}
                          onCheckedChange={toggleAllGeneratedVouchers}
                          aria-label="Select all generated vouchers"
                        />
                        <span className="text-sm">Select All</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" disabled={selectedGeneratedVouchers.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Selected
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            {selectedGeneratedVouchers.length} selected
                          </div>
                          <DropdownMenuItem onClick={() => downloadSelectedGeneratedVouchers('excel')}>
                            <FileText className="mr-2 h-4 w-4" />
                            Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadSelectedGeneratedVouchers('word')}>
                            <FileText className="mr-2 h-4 w-4" />
                            Word
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadSelectedGeneratedVouchers('pdf')}>
                            <FileText className="mr-2 h-4 w-4" />
                            PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {generatedVouchers.map((voucher) => (
                      <div
                        key={voucher.id}
                        className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedGeneratedVoucherSet.has(voucher.id)}
                            onCheckedChange={(checked) => toggleGeneratedVoucherSelection(voucher.id, checked)}
                            aria-label={`Select voucher ${displayVoucherCode(voucher.code)}`}
                          />
                          {voucher.qrCode ? (
                            <img src={voucher.qrCode} alt={`${voucher.code} QR`} className="h-14 w-14 rounded border bg-white p-1" />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded border">
                              <QrCode className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-mono font-semibold">{displayVoucherCode(voucher.code)}</p>
                              <Badge variant={voucher.currentUses >= (voucher.maxUses || 1) ? 'outline' : 'default'}>
                                {voucher.currentUses >= (voucher.maxUses || 1) ? 'redeemed' : voucher.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatMoney(voucher.value, 'USD')} expires {new Date(voucher.validUntil).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {displayVoucherSeries(voucher.seriesCode)} / {displayVoucherSerial(voucher.serialNumber)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => copyVoucher(voucher)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          {voucher.currentUses < (voucher.maxUses || 1) && (
                            <Button type="button" size="sm" variant="outline" onClick={() => redeemMutation.mutate(voucher.code)}>
                              Redeem
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle>Wallet History</CardTitle>
              </div>
              <CardDescription>Your recent wallet transactions.</CardDescription>
            </CardHeader>
            <CardContent>
              {wallet?.transactions?.length ? (
                <div className="space-y-3">
                  {wallet.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {transaction.description || transaction.type.replace(/_/g, ' ')}
                          </p>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'outline'}>
                            {formatDisplayValue(transaction.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-semibold">
                          {transaction.type.includes('debit') ? '-' : '+'}
                          {formatMoney(transaction.amount, transaction.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Balance {formatMoney(transaction.balanceAfter, transaction.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No wallet activity yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
