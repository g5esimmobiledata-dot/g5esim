import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Coins,
  CreditCard,
  Edit2,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { SiPaypal, SiStripe } from 'react-icons/si';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

type GatewayProvider = 'stripe' | 'paypal' | 'nowpayments' | 'cryptomus' | 'ayamerchant';

type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string;
};

type ResellerGateway = {
  id: string;
  provider: GatewayProvider;
  displayName: string;
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  isEnabled: boolean;
  config?: Record<string, any>;
  supportedCurrencies?: Array<{ currencyId: string }>;
};

type GatewayForm = {
  provider: GatewayProvider;
  displayName: string;
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  isEnabled: boolean;
  supportedCurrencies: string[];
  config: Record<string, any>;
};

const providers: Array<{ value: GatewayProvider; label: string }> = [
  { value: 'stripe', label: 'Stripe Card' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'nowpayments', label: 'USDT NOWPayments' },
  { value: 'cryptomus', label: 'USDT Cryptomus' },
  { value: 'ayamerchant', label: 'AYAMERCHANT' },
];

const nowPaymentsNetworks = [
  { value: 'usdttrc20', label: 'USDT TRC20' },
  { value: 'usdterc20', label: 'USDT ERC20' },
  { value: 'usdtbsc', label: 'USDT BEP20' },
  { value: 'usdtmatic', label: 'USDT Polygon' },
  { value: 'usdtton', label: 'USDT TON' },
];

const cryptomusNetworks = [
  { value: 'tron', label: 'USDT TRC20' },
  { value: 'eth', label: 'USDT ERC20' },
  { value: 'bsc', label: 'USDT BEP20' },
  { value: 'polygon', label: 'USDT Polygon' },
  { value: 'ton', label: 'USDT TON' },
];

function defaultConfig(provider: GatewayProvider) {
  if (provider === 'nowpayments') {
    return { mode: 'live', payCurrency: 'usdttrc20', creditOn: 'finished', ipnCallbackUrl: '' };
  }

  if (provider === 'cryptomus') {
    return { mode: 'live', toCurrency: 'USDT', network: 'tron', callbackUrl: '' };
  }

  return { mode: 'test' };
}

function providerIcon(provider: GatewayProvider) {
  if (provider === 'stripe') return <SiStripe className="h-5 w-5 text-[#635BFF]" />;
  if (provider === 'paypal') return <SiPaypal className="h-5 w-5 text-[#00457C]" />;
  if (provider === 'nowpayments' || provider === 'cryptomus') return <Coins className="h-5 w-5 text-primary" />;
  if (provider === 'ayamerchant') return <CreditCard className="h-5 w-5 text-primary" />;
  return <CreditCard className="h-5 w-5 text-primary" />;
}

function providerLabel(provider: GatewayProvider) {
  return providers.find((item) => item.value === provider)?.label || provider;
}

function credentialLabels(provider: GatewayProvider) {
  if (provider === 'stripe') {
    return {
      publicKey: 'Stripe Publishable Key',
      secretKey: 'Stripe Secret Key',
      webhookSecret: 'Stripe Webhook Secret',
    };
  }

  if (provider === 'paypal') {
    return {
      publicKey: 'PayPal Client ID',
      secretKey: 'PayPal Secret',
      webhookSecret: 'Webhook Secret',
    };
  }

  if (provider === 'nowpayments') {
    return {
      publicKey: 'Public Key (Optional)',
      secretKey: 'NOWPayments API Key',
      webhookSecret: 'NOWPayments IPN Secret',
    };
  }

  if (provider === 'ayamerchant') {
    return {
      publicKey: 'Public Key (Optional)',
      secretKey: 'AYAMERCHANT API Key',
      webhookSecret: 'Webhook Secret (Optional)',
    };
  }

  return {
    publicKey: 'Cryptomus Merchant UUID',
    secretKey: 'Cryptomus Payment API Key',
    webhookSecret: 'Cryptomus Webhook Secret',
  };
}

export default function ResellerPaymentGateways() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ResellerGateway | null>(null);
  const [form, setForm] = useState<GatewayForm>({
    provider: 'stripe',
    displayName: 'Stripe Card',
    publicKey: '',
    secretKey: '',
    webhookSecret: '',
    isEnabled: true,
    supportedCurrencies: [],
    config: defaultConfig('stripe'),
  });

  const { data: gateways = [], isLoading } = useQuery<ResellerGateway[]>({
    queryKey: ['/api/reseller/payment-gateways'],
  });

  const { data: currencies = [] } = useQuery<Currency[]>({
    queryKey: ['/api/reseller/payment-gateways/currencies'],
  });

  const defaultCurrencyIds = useMemo(() => {
    const usd = currencies.find((currency) => currency.code === 'USD');
    return usd ? [usd.id] : currencies[0] ? [currencies[0].id] : [];
  }, [currencies]);

  useEffect(() => {
    if (!editing && form.supportedCurrencies.length === 0 && defaultCurrencyIds.length > 0) {
      setForm((current) => ({ ...current, supportedCurrencies: defaultCurrencyIds }));
    }
  }, [defaultCurrencyIds, editing, form.supportedCurrencies.length]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      provider: 'stripe',
      displayName: 'Stripe Card',
      publicKey: '',
      secretKey: '',
      webhookSecret: '',
      isEnabled: true,
      supportedCurrencies: defaultCurrencyIds,
      config: defaultConfig('stripe'),
    });
    setOpen(false);
  };

  const openCreate = (provider: GatewayProvider = 'stripe') => {
    setEditing(null);
    setForm({
      provider,
      displayName: providerLabel(provider),
      publicKey: '',
      secretKey: '',
      webhookSecret: '',
      isEnabled: true,
      supportedCurrencies: defaultCurrencyIds,
      config: defaultConfig(provider),
    });
    setOpen(true);
  };

  const openEdit = (gateway: ResellerGateway) => {
    setEditing(gateway);
    setForm({
      provider: gateway.provider,
      displayName: gateway.displayName,
      publicKey: gateway.publicKey || '',
      secretKey: gateway.secretKey || '',
      webhookSecret: gateway.webhookSecret || '',
      isEnabled: gateway.isEnabled,
      supportedCurrencies: gateway.supportedCurrencies?.map((item) => item.currencyId) || defaultCurrencyIds,
      config: { ...defaultConfig(gateway.provider), ...(gateway.config || {}) },
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        provider: form.provider,
        displayName: form.displayName,
        publicKey: form.publicKey,
        secretKey: form.secretKey,
        webhookSecret: form.webhookSecret,
        isEnabled: form.isEnabled,
        config: form.config,
        supportedCurrencies: form.supportedCurrencies.map((currencyId) => ({ currencyId })),
      };
      const res = await apiRequest(
        editing ? 'PUT' : 'POST',
        editing ? `/api/reseller/payment-gateways/${editing.id}` : '/api/reseller/payment-gateways',
        payload,
      );
      return res.json();
    },
    onSuccess: (data) => {
      if (!data.success) throw new Error(data.message || 'Could not save payment gateway');
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/payment-gateways'] });
      resetForm();
      toast({ title: 'Gateway saved', description: 'Your Reseller payment gateway is Ready.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Gateway failed',
        description: error.message || 'Could not save payment gateway.',
        variant: 'destructive',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const res = await apiRequest('PATCH', `/api/reseller/payment-gateways/${id}/status`, { isEnabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/payment-gateways'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/reseller/payment-gateways/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/payment-gateways'] });
      toast({ title: 'Gateway deleted', description: 'The payment gateway was removed.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message || 'Could not delete payment gateway.',
        variant: 'destructive',
      });
    },
  });

  const labels = credentialLabels(form.provider);
  const enabledCount = gateways.filter((gateway) => gateway.isEnabled).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-3 bg-primary/10 text-primary hover:bg-primary/10" variant="outline">
            Reseller Payments
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Payment Gateways</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Manage Stripe, PayPal, NOWPayments, and Cryptomus for your WhiteLabel payment flows.
          </p>
        </div>
        <Button className="bg-primary-gradient text-white" onClick={() => openCreate()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Gateway
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Configured</p>
            <p className="mt-1 text-3xl font-bold">{gateways.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Enabled</p>
            <p className="mt-1 text-3xl font-bold">{enabledCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">USD Ready</p>
            <p className="mt-1 text-3xl font-bold">
              {
                gateways.filter((gateway) =>
                  gateway.supportedCurrencies?.some((item) =>
                    currencies.find((currency) => currency.id === item.currencyId)?.code === 'USD',
                  ),
                ).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Configured Gateways</CardTitle>
            <CardDescription>Stripe and PayPal support checkout; USDT gateways support customer wallet top-ups.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {providers.map((provider) => (
              <Button key={provider.value} type="button" size="sm" variant="outline" onClick={() => openCreate(provider.value)}>
                {providerIcon(provider.value)}
                <span className="ml-2">{provider.label}</span>
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading gateways
            </div>
          ) : gateways.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No reseller payment gateways configured.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {gateways.map((gateway) => {
                const gatewayCurrencies =
                  gateway.supportedCurrencies
                    ?.map((item) => currencies.find((currency) => currency.id === item.currencyId)?.code)
                    .filter(Boolean)
                    .join(', ') || 'No currency';

                return (
                  <div
                    key={gateway.id}
                    className="rounded-md border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          {providerIcon(gateway.provider)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950 dark:text-white">{gateway.displayName}</p>
                            <Badge variant={gateway.isEnabled ? 'default' : 'secondary'}>
                              {gateway.isEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{providerLabel(gateway.provider)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Currencies: {gatewayCurrencies}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={gateway.isEnabled}
                          onCheckedChange={(isEnabled) => statusMutation.mutate({ id: gateway.id, isEnabled })}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => openEdit(gateway)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (window.confirm('Delete this payment gateway?')) {
                              deleteMutation.mutate(gateway.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : resetForm())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Payment Gateway' : 'Add Payment Gateway'}</DialogTitle>
          </DialogHeader>

          <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={form.provider}
                onValueChange={(value) => {
                  const provider = value as GatewayProvider;
                  setForm((current) => ({
                    ...current,
                    provider,
                    displayName: providerLabel(provider),
                    config: defaultConfig(provider),
                  }));
                }}
                disabled={Boolean(editing)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={form.displayName}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{labels.publicKey}</Label>
              <Input
                value={form.publicKey}
                onChange={(event) => setForm((current) => ({ ...current, publicKey: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{labels.secretKey}</Label>
              <Input
                type="password"
                value={form.secretKey}
                onChange={(event) => setForm((current) => ({ ...current, secretKey: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{labels.webhookSecret}</Label>
              <Input
                type="password"
                value={form.webhookSecret}
                onChange={(event) => setForm((current) => ({ ...current, webhookSecret: event.target.value }))}
                placeholder="Optional"
              />
            </div>

            {form.provider === 'paypal' && (
              <div className="space-y-2 md:col-span-2">
                <Label>PayPal Account Email</Label>
                <Input
                  type="email"
                  value={form.config.paypalEmail || ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      config: { ...current.config, paypalEmail: event.target.value },
                    }))
                  }
                  placeholder="merchant@example.com"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Gateway Mode</Label>
              <Select
                value={form.config.mode || 'test'}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, config: { ...current.config, mode: value } }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.provider === 'nowpayments' && (
              <>
                <div className="space-y-2">
                  <Label>USDT Network</Label>
                  <Select
                    value={form.config.payCurrency || 'usdttrc20'}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, config: { ...current.config, payCurrency: value } }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {nowPaymentsNetworks.map((network) => (
                        <SelectItem key={network.value} value={network.value}>
                          {network.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Credit Wallet After</Label>
                  <Select
                    value={form.config.creditOn || 'finished'}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, config: { ...current.config, creditOn: value } }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finished">Payment Finished</SelectItem>
                      <SelectItem value="confirmed">Blockchain Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>IPN Callback URL</Label>
                  <Input
                    value={form.config.ipnCallbackUrl || ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        config: { ...current.config, ipnCallbackUrl: event.target.value },
                      }))
                    }
                    placeholder={`${window.location.origin}/api/wallet/crypto/nowpayments/ipn`}
                  />
                </div>
              </>
            )}

            {form.provider === 'cryptomus' && (
              <>
                <div className="space-y-2">
                  <Label>USDT Network</Label>
                  <Select
                    value={form.config.network || 'tron'}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        config: { ...current.config, network: value, toCurrency: 'USDT' },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptomusNetworks.map((network) => (
                        <SelectItem key={network.value} value={network.value}>
                          {network.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Callback URL</Label>
                  <Input
                    value={form.config.callbackUrl || ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        config: { ...current.config, callbackUrl: event.target.value },
                      }))
                    }
                    placeholder={`${window.location.origin}/api/wallet/crypto/cryptomus/webhook`}
                  />
                </div>
              </>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>Supported Currencies</Label>
              <div className="flex flex-wrap gap-2">
                {currencies.map((currency) => {
                  const checked = form.supportedCurrencies.includes(currency.id);
                  return (
                    <Button
                      key={currency.id}
                      type="button"
                      size="sm"
                      variant={checked ? 'default' : 'outline'}
                      onClick={() => {
                        setForm((current) => ({
                          ...current,
                          supportedCurrencies: checked
                            ? current.supportedCurrencies.filter((id) => id !== currency.id)
                            : [...current.supportedCurrencies, currency.id],
                        }));
                      }}
                    >
                      {currency.symbol} {currency.code}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 md:col-span-2">
              <Switch
                checked={form.isEnabled}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, isEnabled: checked }))}
              />
              <span className="text-sm">{form.isEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.displayName.trim()) {
                  toast({ title: 'Display name required', variant: 'destructive' });
                  return;
                }
                if (form.supportedCurrencies.length === 0) {
                  toast({ title: 'Select at least one currency', variant: 'destructive' });
                  return;
                }
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending}
              className={cn('text-white', saveMutation.isPending ? '' : 'bg-primary-gradient')}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
