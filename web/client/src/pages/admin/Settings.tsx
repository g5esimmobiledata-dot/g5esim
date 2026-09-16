import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Save,
  Building2,
  Mail,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Plus,
  Trash2,
  CreditCard,
  Wallet,
  Loader2,
  Palette,
  User,
  Flame,
  Bot,
  ImageIcon,
  Globe,
  Gift,
  MessageCircle,
  Clock3,
  Headset,
  Phone,
  MessageSquareText,
  Star,
  Search,
  BellRing,
} from 'lucide-react';
import { SiPaypal, SiApplepay, SiGooglepay } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { CurrencyRate } from '@shared/schema';
import { useTranslation } from '@/contexts/TranslationContext';
import { CurrencyManagement } from '@/components/admin/tabs/CurrencyManagement';
import { GeneralSettings } from '@/components/admin/tabs/GeneralSettings';
import { SMTPSettings } from '@/components/admin/tabs/SMTPSettings';
import { FirebaseSettings } from '@/components/admin/tabs/FirebaseSettings';
import { OneSignalSettings } from '@/components/admin/tabs/OneSignalSettings';
import { ReCaptchaSettings } from '@/components/admin/tabs/ReCaptchaSettings';
import { ThemeSettings } from './tabs/ThemeSettings';
import { useSettingByKey } from '@/hooks/useSettings';
import { SocialMediaSettings } from '@/components/admin/tabs/SocialMediaSettings';
import { AdminAccountSettings } from '@/components/admin/tabs/AdminAccountSettings';
import { HomepagePopupSettings } from '@/components/admin/tabs/HomepagePopupSettings';
import { AppStoreSettings } from '@/components/admin/tabs/AppStoreSettings';
import { SEOSettings } from '@/components/admin/tabs/SEOSettings';
import { getConciergePricingLabel } from '@/lib/supportAvailability';

type NumberPlanPriceRow = {
  providerCost: string;
  resellerPrice: string;
  agentPrice: string;
  retailPrice: string;
};

type NumberPlanKey = 'setup' | 'monthly' | 'inbound' | 'outbound' | 'sms' | 'mms' | 'voice';

type NumberPlan = {
  setup: NumberPlanPriceRow;
  monthly: NumberPlanPriceRow;
  inbound: NumberPlanPriceRow;
  outbound: NumberPlanPriceRow;
  sms: NumberPlanPriceRow;
  mms: NumberPlanPriceRow;
  voice: NumberPlanPriceRow;
};

type VonageCountryRateMatrix = {
  providerCurrency: string;
  standardPlan: NumberPlan;
  premiumPlan: NumberPlan;
  messagesApiPrice: string;
  messagesApiNotes: string;
};

type VonageCountryRateMatrixMap = Record<string, VonageCountryRateMatrix>;

type VonageProviderCriteriaDraft = {
  enabled: boolean;
  apiKey: string;
  apiSecret: string;
  applicationId: string;
  privateKey: string;
  brandName: string;
  inboundWebhookUrl: string;
  statusWebhookUrl: string;
  defaultCountry: string;
  autoAssign: boolean;
  voiceBackend: string;
  linphoneEnabled: boolean;
  linphoneSipDomain: string;
  linphoneSipPort: string;
  linphoneSipTransport: string;
  linphoneSipUsernamePrefix: string;
  linphoneSipPassword: string;
  linphoneSipOutboundProxy: string;
  linphoneVoicemailExtension: string;
};

const VONAGE_PROVIDER_CRITERIA_DRAFT_KEY = 'vonage-provider-criteria-draft';

function emptyNumberPlanPriceRow(): NumberPlanPriceRow {
  return {
    providerCost: '0.00',
    resellerPrice: '0.00',
    agentPrice: '0.00',
    retailPrice: '0.00',
  };
}

function emptyNumberPlan(): NumberPlan {
  return {
    setup: emptyNumberPlanPriceRow(),
    monthly: emptyNumberPlanPriceRow(),
    inbound: emptyNumberPlanPriceRow(),
    outbound: emptyNumberPlanPriceRow(),
    sms: emptyNumberPlanPriceRow(),
    mms: emptyNumberPlanPriceRow(),
    voice: emptyNumberPlanPriceRow(),
  };
}

function cloneNumberPlan(plan: NumberPlan): NumberPlan {
  return {
    setup: { ...plan.setup },
    monthly: { ...plan.monthly },
    inbound: { ...plan.inbound },
    outbound: { ...plan.outbound },
    sms: { ...plan.sms },
    mms: { ...plan.mms },
    voice: { ...plan.voice },
  };
}

function parseVonageCountryRateMatrixMap(rawValue?: string): VonageCountryRateMatrixMap {
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as VonageCountryRateMatrixMap;
  } catch {
    return {};
  }
}

function parseVonageProviderCriteriaDraft(rawValue?: string | null): VonageProviderCriteriaDraft | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as VonageProviderCriteriaDraft;
  } catch {
    return null;
  }
}

function PaymentMethodsManagement() {
  const { toast } = useToast();
  const [paymentSettings, setPaymentSettings] = useState<any[]>([
    {
      method: 'card',
      enabled: true,
      minimumAmount: '0',
      settings: { instructions: 'Credit/Debit cards accepted' },
    },
    {
      method: 'paypal',
      enabled: true,
      minimumAmount: '0',
      settings: { instructions: 'Pay with your PayPal account' },
    },
    {
      method: 'apple_pay',
      enabled: true,
      minimumAmount: '0',
      settings: { instructions: 'Available on Safari and iOS devices' },
    },
    {
      method: 'google_pay',
      enabled: true,
      minimumAmount: '0',
      settings: { instructions: 'Available on Chrome and Android devices' },
    },
  ]);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/payment-settings'],
    onSuccess: (data: any) => {
      if (data && data.length > 0) {
        setPaymentSettings(data);
      }
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any[]) => {
      return await apiRequest('PUT', '/api/admin/payment-settings', {
        settings,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/payment-settings'],
      });
      toast({
        title: 'Success',
        description: 'Payment methods settings saved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save payment settings',
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (method: string) => {
    setPaymentSettings((prev) =>
      prev.map((setting) =>
        setting.method === method ? { ...setting, enabled: !setting.enabled } : setting,
      ),
    );
  };

  const handleMinAmountChange = (method: string, value: string) => {
    setPaymentSettings((prev) =>
      prev.map((setting) =>
        setting.method === method ? { ...setting, minimumAmount: value } : setting,
      ),
    );
  };

  const handleInstructionsChange = (method: string, value: string) => {
    setPaymentSettings((prev) =>
      prev.map((setting) =>
        setting.method === method
          ? {
            ...setting,
            settings: { ...setting.settings, instructions: value },
          }
          : setting,
      ),
    );
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(paymentSettings);
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="h-5 w-5" />;
      case 'paypal':
        return <SiPaypal className="h-5 w-5 text-[#00457C]" />;
      case 'apple_pay':
        return <SiApplepay className="h-5 w-5" />;
      case 'google_pay':
        return <SiGooglepay className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'card':
        return 'Credit/Debit Cards';
      case 'paypal':
        return 'PayPal';
      case 'apple_pay':
        return 'Apple Pay';
      case 'google_pay':
        return 'Google Pay';
      default:
        return method;
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>Configure available payment methods for Customers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {paymentSettings.map((setting) => (
          <Card key={setting.method} className="bg-muted/30">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getMethodIcon(setting.method)}
                  <div>
                    <div className="font-medium">{getMethodName(setting.method)}</div>
                    <div className="text-xs text-muted-foreground">
                      {setting.method === 'card'
                        ? 'Always enabled (primary payment method)'
                        : 'Can be enabled or disabled'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={setting.enabled}
                  onCheckedChange={() => handleToggle(setting.method)}
                  disabled={setting.method === 'card'}
                  data-testid={`switch-${setting.method}`}
                />
              </div>

              {setting.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`min-${setting.method}`}>Minimum Amount ($)</Label>
                      <Input
                        id={`min-${setting.method}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={setting.minimumAmount}
                        onChange={(e) => handleMinAmountChange(setting.method, e.target.value)}
                        data-testid={`input-min-${setting.method}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Badge variant={setting.enabled ? 'default' : 'secondary'}>
                        {setting.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`instructions-${setting.method}`}>
                      Instructions for Customers
                    </Label>
                    <Textarea
                      id={`instructions-${setting.method}`}
                      value={setting.settings?.instructions || ''}
                      onChange={(e) => handleInstructionsChange(setting.method, e.target.value)}
                      placeholder="Enter instructions displayed to Customers"
                      rows={2}
                      data-testid={`textarea-instructions-${setting.method}`}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}

        <Button
          onClick={handleSave}
          disabled={saveSettingsMutation.isPending}
          className="w-full"
          data-testid="button-save-payment-settings"
        >
          {saveSettingsMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Payment Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function normalizeSettingsPayload(payload: any): Record<string, string> {
  const settingsPayload = payload?.data ?? payload;
  if (Array.isArray(settingsPayload)) {
    return settingsPayload.reduce((acc: Record<string, string>, setting: any) => {
      if (setting?.key) acc[setting.key] = setting.value;
      return acc;
    }, {});
  }
  return settingsPayload && typeof settingsPayload === 'object' ? settingsPayload : {};
}

const DESKTOP_PRIVACY_DEFAULT_BODY = [
  'When you use the G5 eSIM desktop admin app, we collect the data required to securely connect you to the admin backend and provide platform management tools.',
  '',
  'Optional analytics and diagnostic data may be used to improve reliability, support, and security. You can adjust these choices before continuing.',
  '',
  'By using this app, you agree to the Terms and Privacy Policy configured by the platform administrator.',
].join('\n');

function DesktopPrivacySettings() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState('Your data and privacy');
  const [cardTitle, setCardTitle] = useState('We value your privacy');
  const [body, setBody] = useState(DESKTOP_PRIVACY_DEFAULT_BODY);
  const [termsUrl, setTermsUrl] = useState('https://g5esim.mobile/terms');
  const [privacyUrl, setPrivacyUrl] = useState('https://g5esim.mobile/privacy');
  const [adminUrl, setAdminUrl] = useState('https://g5esim.mobile/admin/login?desktop=1');
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [acceptLabel, setAcceptLabel] = useState('Accept all');
  const [declineLabel, setDeclineLabel] = useState('Decline optional data');
  const [manageLabel, setManageLabel] = useState('Manage choices');
  const [showCredentials, setShowCredentials] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const { data: desktopSettings } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings', 'desktop-privacy'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/settings');
      const data = await response.json();
      return normalizeSettingsPayload(data);
    },
  });

  useEffect(() => {
    if (!desktopSettings) return;
    setEnabled(desktopSettings.desktop_privacy_enabled !== 'false');
    setTitle(desktopSettings.desktop_privacy_title || 'Your data and privacy');
    setCardTitle(desktopSettings.desktop_privacy_card_title || 'We value your privacy');
    setBody(desktopSettings.desktop_privacy_body || DESKTOP_PRIVACY_DEFAULT_BODY);
    setTermsUrl(desktopSettings.desktop_terms_url || 'https://g5esim.mobile/terms');
    setPrivacyUrl(desktopSettings.desktop_privacy_url || 'https://g5esim.mobile/privacy');
    setAdminUrl(desktopSettings.desktop_admin_url || 'https://g5esim.mobile/admin/login?desktop=1');
    setAccentColor(desktopSettings.desktop_accent_color || '#2563eb');
    setAcceptLabel(desktopSettings.desktop_accept_label || 'Accept all');
    setDeclineLabel(desktopSettings.desktop_decline_label || 'Decline optional data');
    setManageLabel(desktopSettings.desktop_manage_label || 'Manage choices');
    setShowCredentials(desktopSettings.desktop_show_admin_credentials === 'true');
    setAdminUsername(desktopSettings.desktop_admin_username || '');
    setAdminPassword(desktopSettings.desktop_admin_password || '');
    setAccessToken(desktopSettings.desktop_app_access_token || '');
  }, [desktopSettings]);

  const saveDesktopPrivacyMutation = useMutation({
    mutationFn: async () => {
      const updates: Array<[string, string]> = [
        ['desktop_privacy_enabled', String(enabled)],
        ['desktop_privacy_title', title],
        ['desktop_privacy_card_title', cardTitle],
        ['desktop_privacy_body', body],
        ['desktop_terms_url', termsUrl],
        ['desktop_privacy_url', privacyUrl],
        ['desktop_admin_url', adminUrl],
        ['desktop_accent_color', accentColor],
        ['desktop_accept_label', acceptLabel],
        ['desktop_decline_label', declineLabel],
        ['desktop_manage_label', manageLabel],
        ['desktop_show_admin_credentials', String(showCredentials)],
        ['desktop_admin_username', adminUsername],
        ['desktop_admin_password', adminPassword],
        ['desktop_app_access_token', accessToken],
      ];

      await Promise.all(
        updates.map(([key, value]) =>
          apiRequest('PUT', `/api/admin/settings/${key}`, {
            value,
            category: 'desktop_privacy',
          }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings', 'desktop-privacy'] });
      toast({
        title: 'Desktop privacy saved',
        description: 'Desktop app welcome and privacy settings were updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save desktop privacy settings',
        variant: 'destructive',
      });
    },
  });

  const generateToken = () => {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    setAccessToken(Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Desktop Privacy</CardTitle>
          <CardDescription>
            Configure the first screen shown by the Windows desktop admin app before it opens the admin backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">Enable desktop welcome screen</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, the desktop app shows this privacy screen before loading admin login.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Page title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Card title</Label>
              <Input value={cardTitle} onChange={(event) => setCardTitle(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Privacy and terms text</Label>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={11}
              className="font-mono text-sm"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Terms URL</Label>
              <Input value={termsUrl} onChange={(event) => setTermsUrl(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Privacy URL</Label>
              <Input value={privacyUrl} onChange={(event) => setPrivacyUrl(event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_160px]">
            <div className="space-y-2">
              <Label>Admin URL opened after accept</Label>
              <Input value={adminUrl} onChange={(event) => setAdminUrl(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Accent color</Label>
              <Input value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Manage button</Label>
              <Input value={manageLabel} onChange={(event) => setManageLabel(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Decline button</Label>
              <Input value={declineLabel} onChange={(event) => setDeclineLabel(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Accept button</Label>
              <Input value={acceptLabel} onChange={(event) => setAcceptLabel(event.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
            Displaying admin credentials is only suitable for a trusted internal installer. Use a strong Desktop App Access Token so these values are not returned to normal website visitors.
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">Show admin login credentials on desktop welcome</Label>
              <p className="text-sm text-muted-foreground">
                The desktop app must include the matching access token before these values are shown.
              </p>
            </div>
            <Switch checked={showCredentials} onCheckedChange={setShowCredentials} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Admin username</Label>
              <Input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Admin password</Label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label>Desktop App Access Token</Label>
              <Input value={accessToken} onChange={(event) => setAccessToken(event.target.value)} />
            </div>
            <Button type="button" variant="outline" className="self-end" onClick={generateToken}>
              Generate Token
            </Button>
          </div>

          <Button
            type="button"
            onClick={() => saveDesktopPrivacyMutation.mutate()}
            disabled={saveDesktopPrivacyMutation.isPending}
            className="gap-2"
          >
            {saveDesktopPrivacyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Desktop Privacy
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 bg-[#e9ebf7] text-slate-950 shadow-lg">
        <CardContent className="space-y-6 p-6">
          <h2 className="text-3xl font-light">{title || 'Your data and privacy'}</h2>
          <div className="rounded-[1.5rem] bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">{cardTitle || 'We value your privacy'}</h3>
            <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-800">
              {body || DESKTOP_PRIVACY_DEFAULT_BODY}
            </div>
            <p className="mt-5 text-sm text-slate-700">
              By using this app, you agree to the{' '}
              <span className="font-medium underline" style={{ color: accentColor }}>Terms</span>
              {' '}and{' '}
              <span className="font-medium underline" style={{ color: accentColor }}>Privacy Policy</span>.
            </p>
          </div>
          {showCredentials && (
            <div className="rounded-xl border border-slate-300 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin login</p>
              <p className="mt-2 text-sm">Username: <span className="font-mono">{adminUsername || 'not set'}</span></p>
              <p className="text-sm">Password: <span className="font-mono">{adminPassword ? 'configured' : 'not set'}</span></p>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline">{manageLabel || 'Manage choices'}</Button>
            <Button variant="outline">{declineLabel || 'Decline optional data'}</Button>
            <Button style={{ backgroundColor: accentColor }}>{acceptLabel || 'Accept all'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RegistrationBonusSettings() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState('0.00');

  const { data: registrationSettings } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings', 'registration-bonus'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/settings');
      const data = await response.json();
      return normalizeSettingsPayload(data);
    },
  });

  useEffect(() => {
    if (!registrationSettings) return;
    setEnabled(registrationSettings.registration_bonus_enabled === 'true');
    setAmount(registrationSettings.registration_bonus_amount || '0.00');
  }, [registrationSettings]);

  const saveRegistrationBonusMutation = useMutation({
    mutationFn: async () => {
      const numericAmount = Number(amount || 0);
      if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        throw new Error('Bonus amount must be zero or greater');
      }

      await Promise.all([
        apiRequest('PUT', '/api/admin/settings/registration_bonus_enabled', {
          value: String(enabled),
          category: 'wallet',
        }),
        apiRequest('PUT', '/api/admin/settings/registration_bonus_amount', {
          value: numericAmount.toFixed(2),
          category: 'wallet',
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings', 'registration-bonus'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/settings'] });
      toast({
        title: 'Registration bonus saved',
        description: enabled
          ? `New customers will receive $${Number(amount || 0).toFixed(2)} in wallet credit.`
          : 'Registration bonus is disabled.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save registration bonus settings',
        variant: 'destructive',
      });
    },
  });

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Registration Bonus
        </CardTitle>
        <CardDescription>
          Automatically credit a wallet bonus once when a new customer account is created.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 p-4">
          <div>
            <Label className="text-base">Enable Registration Bonus</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              When enabled, each new signup receives the configured amount in their wallet.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="switch-registration-bonus" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="registration-bonus-amount">Wallet Bonus Amount</Label>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="registration-bonus-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="pl-9"
                data-testid="input-registration-bonus-amount"
              />
            </div>
          </div>
          <div className="rounded-md border bg-background p-4">
            <p className="text-sm font-medium">Current rule</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {enabled
                ? `Credit $${Number(amount || 0).toFixed(2)} to every new customer's wallet.`
                : 'Do not award a signup wallet bonus.'}
            </p>
          </div>
        </div>

        <Button
          onClick={() => saveRegistrationBonusMutation.mutate()}
          disabled={saveRegistrationBonusMutation.isPending}
          data-testid="button-save-registration-bonus"
        >
          {saveRegistrationBonusMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Registration Bonus
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function SandboxDemoSettings() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [environment, setEnvironment] = useState<'live' | 'sandbox'>('live');
  const [walletTopupEnabled, setWalletTopupEnabled] = useState(true);
  const [maxTopupAmount, setMaxTopupAmount] = useState('500.00');
  const [applyToCustomers, setApplyToCustomers] = useState(true);
  const [applyToAgents, setApplyToAgents] = useState(true);
  const [applyToResellers, setApplyToResellers] = useState(true);

  const { data: sandboxSettings } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings', 'sandbox-demo'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/settings');
      const data = await response.json();
      return normalizeSettingsPayload(data);
    },
  });

  useEffect(() => {
    if (!sandboxSettings) return;
    setEnabled(sandboxSettings.demo_mode_enabled === 'true');
    setEnvironment(sandboxSettings.demo_mode_environment === 'sandbox' ? 'sandbox' : 'live');
    setWalletTopupEnabled(sandboxSettings.sandbox_wallet_topup_enabled !== 'false');
    setMaxTopupAmount(sandboxSettings.sandbox_wallet_topup_max || '500.00');
    setApplyToCustomers(sandboxSettings.sandbox_apply_customer !== 'false');
    setApplyToAgents(sandboxSettings.sandbox_apply_agent !== 'false');
    setApplyToResellers(sandboxSettings.sandbox_apply_reseller !== 'false');
  }, [sandboxSettings]);

  const isSandboxActive = enabled && environment === 'sandbox';
  const activeSandboxRoles = [
    applyToCustomers ? 'Customers' : null,
    applyToAgents ? 'Agents' : null,
    applyToResellers ? 'Resellers' : null,
  ].filter(Boolean);

  const saveSandboxSettingsMutation = useMutation({
    mutationFn: async () => {
      const numericMaxTopup = Number(maxTopupAmount || 0);
      if (!Number.isFinite(numericMaxTopup) || numericMaxTopup <= 0) {
        throw new Error('Maximum sandbox top-up must be greater than zero');
      }

      await Promise.all([
        apiRequest('PUT', '/api/admin/settings/demo_mode_enabled', {
          value: String(enabled),
          category: 'demo',
        }),
        apiRequest('PUT', '/api/admin/settings/demo_mode_environment', {
          value: environment,
          category: 'demo',
        }),
        apiRequest('PUT', '/api/admin/settings/sandbox_wallet_topup_enabled', {
          value: String(walletTopupEnabled),
          category: 'demo',
        }),
        apiRequest('PUT', '/api/admin/settings/sandbox_wallet_topup_max', {
          value: numericMaxTopup.toFixed(2),
          category: 'demo',
        }),
        apiRequest('PUT', '/api/admin/settings/sandbox_apply_customer', {
          value: String(applyToCustomers),
          category: 'demo',
        }),
        apiRequest('PUT', '/api/admin/settings/sandbox_apply_agent', {
          value: String(applyToAgents),
          category: 'demo',
        }),
        apiRequest('PUT', '/api/admin/settings/sandbox_apply_reseller', {
          value: String(applyToResellers),
          category: 'demo',
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings', 'sandbox-demo'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/settings'] });
      toast({
        title: 'Sandbox demo saved',
        description: isSandboxActive
          ? `Sandbox mode is active for ${activeSandboxRoles.join(', ') || 'no account types'}.`
          : 'Sandbox mode is not active.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save sandbox demo settings',
        variant: 'destructive',
      });
    },
  });

  const modeButtonClass = (active: boolean) =>
    `rounded-md border px-4 py-3 text-left transition ${
      active
        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
        : 'border-border bg-background hover:border-primary/50'
    }`;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Sandbox Demo
        </CardTitle>
        <CardDescription>
          Run checkout as a developer demo with test wallet funds and fake eSIM provider details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 p-4">
          <div>
            <Label className="text-base">Enable Demo Mode</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Demo mode lets the platform switch between live behavior and sandbox testing.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="switch-demo-mode" />
        </div>

        <div className="space-y-3">
          <Label>Demo Environment</Label>
          <div className="grid gap-3 md:grid-cols-2">
            <button type="button" className={modeButtonClass(environment === 'live')} onClick={() => setEnvironment('live')}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">Live</span>
                {environment === 'live' && <CheckCircle className="h-4 w-4" />}
              </div>
              <p className="text-sm text-muted-foreground">Use real payment and provider purchase behavior.</p>
            </button>
            <button type="button" className={modeButtonClass(environment === 'sandbox')} onClick={() => setEnvironment('sandbox')}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">Sandbox</span>
                {environment === 'sandbox' && <CheckCircle className="h-4 w-4" />}
              </div>
              <p className="text-sm text-muted-foreground">Add test funds and deliver fake eSIM details without provider purchase.</p>
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start justify-between gap-4 rounded-md border p-4">
            <div>
              <Label className="text-base">Sandbox Wallet Top-up</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Show a test funds button on wallet pages for account types selected below.
              </p>
            </div>
            <Switch
              checked={walletTopupEnabled}
              onCheckedChange={setWalletTopupEnabled}
              data-testid="switch-sandbox-wallet-topup"
            />
          </div>
          <div className="space-y-2 rounded-md border p-4">
            <Label htmlFor="sandbox-wallet-topup-max">Max Test Top-up Amount</Label>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="sandbox-wallet-topup-max"
                type="number"
                min="1"
                step="0.01"
                value={maxTopupAmount}
                onChange={(event) => setMaxTopupAmount(event.target.value)}
                className="pl-9"
                data-testid="input-sandbox-wallet-topup-max"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Apply Sandbox To</Label>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-start justify-between gap-3 rounded-md border p-4">
              <div>
                <Label className="text-base">Customers</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use sandbox checkout and wallet test funds for customer accounts.
                </p>
              </div>
              <Switch
                checked={applyToCustomers}
                onCheckedChange={setApplyToCustomers}
                data-testid="switch-sandbox-apply-customer"
              />
            </div>
            <div className="flex items-start justify-between gap-3 rounded-md border p-4">
              <div>
                <Label className="text-base">Agents</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use sandbox checkout and wallet test funds for Agent accounts.
                </p>
              </div>
              <Switch
                checked={applyToAgents}
                onCheckedChange={setApplyToAgents}
                data-testid="switch-sandbox-apply-agent"
              />
            </div>
            <div className="flex items-start justify-between gap-3 rounded-md border p-4">
              <div>
                <Label className="text-base">Resellers</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use sandbox checkout and wallet test funds for Reseller accounts.
                </p>
              </div>
              <Switch
                checked={applyToResellers}
                onCheckedChange={setApplyToResellers}
                data-testid="switch-sandbox-apply-reseller"
              />
            </div>
          </div>
        </div>

        <div className={`rounded-md border p-4 ${isSandboxActive ? 'border-amber-300 bg-amber-50 text-amber-950' : 'bg-muted/30'}`}>
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <p className="text-sm">
              {isSandboxActive
                ? `Sandbox is active for ${activeSandboxRoles.join(', ') || 'no account types'}: purchases complete with fake eSIM details and no provider order is placed.`
                : 'Live behavior is active unless demo mode is enabled and environment is set to sandbox.'}
            </p>
          </div>
        </div>

        <Button
          onClick={() => saveSandboxSettingsMutation.mutate()}
          disabled={saveSandboxSettingsMutation.isPending}
          data-testid="button-save-sandbox-demo"
        >
          {saveSandboxSettingsMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Sandbox Demo
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function WhatsAppSettingsTab() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [number, setNumber] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [workingDays, setWorkingDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [mode, setMode] = useState<'link' | 'cloud_api'>('link');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [apiVersion, setApiVersion] = useState('v23.0');

  const weekdayOptions = [
    { value: 'sun', label: 'Sun' },
    { value: 'mon', label: 'Mon' },
    { value: 'tue', label: 'Tue' },
    { value: 'wed', label: 'Wed' },
    { value: 'thu', label: 'Thu' },
    { value: 'fri', label: 'Fri' },
    { value: 'sat', label: 'Sat' },
  ];

  const { data: whatsappSettings } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings', 'whatsapp'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/settings');
      const data = await response.json();
      return normalizeSettingsPayload(data);
    },
  });

  useEffect(() => {
    if (!whatsappSettings) return;
    setEnabled(whatsappSettings.support_whatsapp_enabled !== 'false');
    setNumber(whatsappSettings.support_whatsapp_number || '');
    setScheduleEnabled(whatsappSettings.support_whatsapp_schedule_enabled === 'true');
    setStartTime(whatsappSettings.support_whatsapp_start_time || '09:00');
    setEndTime(whatsappSettings.support_whatsapp_end_time || '18:00');
    setMode((whatsappSettings.support_whatsapp_mode as 'link' | 'cloud_api') || 'link');
    setPhoneNumberId(whatsappSettings.support_whatsapp_phone_number_id || '');
    setAccessToken(whatsappSettings.support_whatsapp_access_token || '');
    setVerifyToken(whatsappSettings.support_whatsapp_verify_token || '');
    setApiVersion(whatsappSettings.support_whatsapp_api_version || 'v23.0');
    setWorkingDays(
      String(whatsappSettings.support_whatsapp_working_days || 'mon,tue,wed,thu,fri')
        .split(',')
        .map((day) => day.trim().toLowerCase())
        .filter(Boolean),
    );
  }, [whatsappSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        apiRequest('PUT', '/api/admin/settings/support_whatsapp_enabled', {
          value: String(enabled),
          category: 'general',
        }),
        apiRequest('PUT', '/api/admin/settings/support_whatsapp_number', {
          value: number,
          category: 'general',
        }),
        apiRequest('PUT', '/api/admin/settings/support_whatsapp_schedule_enabled', {
          value: String(scheduleEnabled),
          category: 'general',
        }),
        apiRequest('PUT', '/api/admin/settings/support_whatsapp_start_time', {
          value: startTime,
          category: 'general',
        }),
        apiRequest('PUT', '/api/admin/settings/support_whatsapp_end_time', {
          value: endTime,
          category: 'general',
        }),
        apiRequest('PUT', '/api/admin/settings/support_whatsapp_working_days', {
          value: workingDays.join(','),
          category: 'general',
        }),
        apiRequest('PUT', '/api/admin/settings/support_whatsapp_mode', {
          value: mode,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/support_whatsapp_phone_number_id', {
          value: phoneNumberId,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/support_whatsapp_access_token', {
          value: accessToken,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/support_whatsapp_verify_token', {
          value: verifyToken,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/support_whatsapp_api_version', {
          value: apiVersion,
          category: 'integrations',
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings', 'whatsapp'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/settings'] });
      toast({ title: 'WhatsApp settings saved', description: 'Support chat controls updated successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save WhatsApp settings',
        variant: 'destructive',
      });
    },
  });

  const toggleWorkingDay = (day: string) => {
    setWorkingDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          WhatsApp Support
        </CardTitle>
        <CardDescription>
          Choose between a simple free WhatsApp chat button or the advanced Cloud API integration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 p-4">
          <div>
            <Label className="text-base">Enable WhatsApp Support</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Show the WhatsApp chat option to users when support is available.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => {
              setEnabled(checked);
              setTimeout(() => {
                saveProviderCriteriaMutation.mutate();
              }, 0);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Connection Mode</Label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={mode === 'link' ? 'default' : 'outline'} onClick={() => setMode('link')}>
              Simple Free Chat
            </Button>
            <Button type="button" variant={mode === 'cloud_api' ? 'default' : 'outline'} onClick={() => setMode('cloud_api')}>
              Advanced Cloud API
            </Button>
          </div>
          <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
            {mode === 'link'
              ? 'Simple Free Chat only opens WhatsApp with your number. No API, no webhook, and no inbox inside the app.'
              : 'Advanced Cloud API connects Meta WhatsApp Cloud API so messages can be synced into your app with webhook support.'}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="support-whatsapp-number">WhatsApp Number</Label>
          <Input
            id="support-whatsapp-number"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="+971501234567"
          />
        </div>

        {mode === 'cloud_api' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="support-whatsapp-phone-number-id">Phone Number ID</Label>
              <Input
                id="support-whatsapp-phone-number-id"
                value={phoneNumberId}
                onChange={(event) => setPhoneNumberId(event.target.value)}
                placeholder="Meta phone number ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-whatsapp-api-version">API Version</Label>
              <Input
                id="support-whatsapp-api-version"
                value={apiVersion}
                onChange={(event) => setApiVersion(event.target.value)}
                placeholder="v23.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-whatsapp-access-token">Access Token</Label>
              <Input
                id="support-whatsapp-access-token"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                placeholder="Meta system user token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-whatsapp-verify-token">Verify Token</Label>
              <Input
                id="support-whatsapp-verify-token"
                value={verifyToken}
                onChange={(event) => setVerifyToken(event.target.value)}
                placeholder="Webhook verify token"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Webhook Callback URL</Label>
              <Input readOnly value={`${window.location.origin}/api/whatsapp/webhook/meta`} />
              <p className="text-sm text-muted-foreground">
                Use this callback URL in Meta and subscribe the webhook to the `messages` field.
              </p>
            </div>
          </div>
        )}

        {mode === 'link' && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-100">
            This mode works like common WordPress WhatsApp chat plugins: just set your number and the app opens WhatsApp directly for the user.
          </div>
        )}

        <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <Label className="text-base">Use Working Schedule</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Only display WhatsApp chat during configured days and hours.
              </p>
            </div>
          </div>
          <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              disabled={!scheduleEnabled}
            />
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              disabled={!scheduleEnabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Working Days</Label>
          <div className="flex flex-wrap gap-2">
            {weekdayOptions.map((day) => {
              const active = workingDays.includes(day.value);
              return (
                <Button
                  key={day.value}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  disabled={!scheduleEnabled}
                  onClick={() => toggleWorkingDay(day.value)}
                >
                  {day.label}
                </Button>
              );
            })}
          </div>
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save WhatsApp Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function ConciergeSettingsTab() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [pricingMode, setPricingMode] = useState<'free' | 'paid'>('free');
  const [billingCycle, setBillingCycle] = useState<'one_time' | 'monthly'>('one_time');
  const [fee, setFee] = useState('');
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [trialDays, setTrialDays] = useState('7');

  const { data: conciergeSettings } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings', 'concierge'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/settings');
      const data = await response.json();
      return normalizeSettingsPayload(data);
    },
  });

  useEffect(() => {
    if (!conciergeSettings) return;
    setEnabled(conciergeSettings.concierge_enabled !== 'false');
    setPricingMode((conciergeSettings.concierge_pricing_mode as 'free' | 'paid') || 'free');
    setBillingCycle((conciergeSettings.concierge_billing_cycle as 'one_time' | 'monthly') || 'one_time');
    setFee(conciergeSettings.concierge_fee || '');
    setTrialEnabled(conciergeSettings.concierge_trial_enabled !== 'false');
    setTrialDays(conciergeSettings.concierge_trial_days || '7');
  }, [conciergeSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const normalizedTrialDays = Math.min(30, Math.max(1, Math.round(Number(trialDays || 7) || 7)));

      await Promise.all([
        apiRequest('PUT', '/api/admin/settings/concierge_enabled', {
          value: String(enabled),
          category: 'general',
        }),
        apiRequest('PUT', '/api/admin/settings/concierge_pricing_mode', {
          value: pricingMode,
          category: 'general',
        }),
        apiRequest('PUT', '/api/admin/settings/concierge_billing_cycle', {
          value: billingCycle,
          category: 'general',
        }),
        apiRequest('PUT', '/api/admin/settings/concierge_fee', {
          value: fee,
          category: 'general',
        }),
        apiRequest('PUT', '/api/admin/settings/concierge_trial_enabled', {
          value: String(trialEnabled),
          category: 'general',
        }),
        apiRequest('PUT', '/api/admin/settings/concierge_trial_days', {
          value: String(normalizedTrialDays),
          category: 'general',
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings', 'concierge'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/settings'] });
      toast({ title: 'Concierge settings saved', description: 'Concierge pricing updated successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save Concierge settings',
        variant: 'destructive',
      });
    },
  });

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headset className="h-5 w-5 text-primary" />
          Concierge
        </CardTitle>
        <CardDescription>
          Configure whether Concierge is enabled and whether it is free, one-time paid, or monthly paid.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 p-4">
          <div>
            <Label className="text-base">Enable Concierge</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Controls whether Concierge features appear for eligible users.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label>Pricing Mode</Label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={pricingMode === 'free' ? 'default' : 'outline'} onClick={() => setPricingMode('free')} disabled={!enabled}>
              Free
            </Button>
            <Button type="button" variant={pricingMode === 'paid' ? 'default' : 'outline'} onClick={() => setPricingMode('paid')} disabled={!enabled}>
              Paid
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Billing Type</Label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={billingCycle === 'one_time' ? 'default' : 'outline'} onClick={() => setBillingCycle('one_time')} disabled={!enabled || pricingMode !== 'paid'}>
              One Time
            </Button>
            <Button type="button" variant={billingCycle === 'monthly' ? 'default' : 'outline'} onClick={() => setBillingCycle('monthly')} disabled={!enabled || pricingMode !== 'paid'}>
              Monthly
            </Button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 p-4">
          <div>
            <Label className="text-base">Enable Free Trial</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Let users start Concierge access from the app or website before paying.
            </p>
          </div>
          <Switch
            checked={trialEnabled}
            onCheckedChange={setTrialEnabled}
            disabled={!enabled || pricingMode !== 'paid'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="concierge-trial-days">Trial Length (days)</Label>
          <Input
            id="concierge-trial-days"
            type="number"
            min="1"
            max="30"
            value={trialDays}
            onChange={(event) => setTrialDays(event.target.value)}
            disabled={!enabled || pricingMode !== 'paid' || !trialEnabled}
          />
          <p className="text-sm text-muted-foreground">
            Trial is available once per user account.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="concierge-fee">Fee</Label>
          <Input
            id="concierge-fee"
            value={fee}
            onChange={(event) => setFee(event.target.value)}
            placeholder="29.00"
            disabled={!enabled || pricingMode !== 'paid'}
          />
          <p className="text-sm text-muted-foreground">
            Current display: {getConciergePricingLabel({
              concierge_pricing_mode: pricingMode,
              concierge_billing_cycle: billingCycle,
              concierge_fee: fee,
            })}
          </p>
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Concierge Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function VonageSettingsTab() {
  const { toast } = useToast();
  const providerCriteriaHydratedRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [brandName, setBrandName] = useState('eSIMConnect');
  const [inboundWebhookUrl, setInboundWebhookUrl] = useState('');
  const [statusWebhookUrl, setStatusWebhookUrl] = useState('');
  const [smsCarrierEnabled, setSmsCarrierEnabled] = useState(true);
  const [smsCarrierApiUrl, setSmsCarrierApiUrl] = useState('https://api.easysendsms.app/bulksms');
  const [smsCarrierUsername, setSmsCarrierUsername] = useState('');
  const [smsCarrierPassword, setSmsCarrierPassword] = useState('');
  const [smsCarrierSenderId, setSmsCarrierSenderId] = useState('');
  const [senderIdDefaultLimit, setSenderIdDefaultLimit] = useState('1');
  const [adminAlertEmails, setAdminAlertEmails] = useState('');
  const [senderIdAlertEmails, setSenderIdAlertEmails] = useState('');
  const [esimOrderAlertEmails, setEsimOrderAlertEmails] = useState('');
  const [eroamingOrderAlertEmails, setEroamingOrderAlertEmails] = useState('');
  const [servicesModulesAlertEmails, setServicesModulesAlertEmails] = useState('');
  const [chargesFeesAlertEmails, setChargesFeesAlertEmails] = useState('');
  const [defaultCountry, setDefaultCountry] = useState('US');
  const [autoAssign, setAutoAssign] = useState(true);
  const [voiceBackend, setVoiceBackend] = useState('vonage');
  const [linphoneEnabled, setLinphoneEnabled] = useState(false);
  const [linphoneSipDomain, setLinphoneSipDomain] = useState('');
  const [linphoneSipPort, setLinphoneSipPort] = useState('5061');
  const [linphoneSipTransport, setLinphoneSipTransport] = useState('tls');
  const [linphoneSipUsernamePrefix, setLinphoneSipUsernamePrefix] = useState('user-');
  const [linphoneSipPassword, setLinphoneSipPassword] = useState('');
  const [linphoneSipOutboundProxy, setLinphoneSipOutboundProxy] = useState('');
  const [linphoneVoicemailExtension, setLinphoneVoicemailExtension] = useState('*98');
  const [setupFee, setSetupFee] = useState('0.00');
  const [monthlyFee, setMonthlyFee] = useState('0.00');
  const [inboundFee, setInboundFee] = useState('0.00');
  const [outboundFee, setOutboundFee] = useState('0.00');
  const [premiumSetupFee, setPremiumSetupFee] = useState('0.00');
  const [premiumMonthlyFee, setPremiumMonthlyFee] = useState('0.00');
  const [premiumInboundFee, setPremiumInboundFee] = useState('0.00');
  const [premiumOutboundFee, setPremiumOutboundFee] = useState('0.00');
  const [messagesApiPrice, setMessagesApiPrice] = useState('0.00');
  const [messagesApiNotes, setMessagesApiNotes] = useState('');
  const [providerId, setProviderId] = useState('');
  const [providerCurrency, setProviderCurrency] = useState('USD');
  const [pricingCountry, setPricingCountry] = useState('US');
  const [countryRateMatrix, setCountryRateMatrix] = useState<VonageCountryRateMatrixMap>({});
  const [standardPlan, setStandardPlan] = useState<NumberPlan>(emptyNumberPlan());
  const [premiumPlan, setPremiumPlan] = useState<NumberPlan>(emptyNumberPlan());
  const [liveProviderPricing, setLiveProviderPricing] = useState<{
    countryCode: string;
    smsApiPricing: Array<{
      dest_network_type?: string;
      rate_increment?: string;
      currency?: string;
      price?: string;
    }>;
    voiceApiPricing: Array<{
      dest_network_type?: string;
      rate_increment?: string;
      currency?: string;
      price?: string;
    }>;
    messagesApiPricing: Array<{
      dest_network_type?: string;
      currency?: string;
      price?: string;
    }>;
    numberPricingPreview?: {
      msisdn?: string;
      setupCost?: string;
      monthlyCost?: string;
    } | null;
    numberPricingNote?: string;
    smsApiNote: string;
    voiceApiNote: string;
    messagesApiNote: string;
    pricingWarnings?: string[];
  } | null>(null);

  const { data: vonageSettings } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings', 'vonage'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/settings');
      const data = await response.json();
      return normalizeSettingsPayload(data);
    },
  });

  const { data: currenciesResponse } = useQuery<{ data?: CurrencyRate[] }>({
    queryKey: ['/api/currencies', 'vonage-provider-currencies'],
    queryFn: async () => {
      const response = await fetch('/api/currencies', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to load currencies');
      }
      return response.json();
    },
  });

  const { data: countriesResponse } = useQuery<{ data?: { countries?: Array<{ country_name: string; country_code: string }> } }>({
    queryKey: ['/api/countries', 'vonage-pricing-countries'],
    queryFn: async () => {
      const response = await fetch('/api/countries', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to load countries');
      }
      return response.json();
    },
  });

  const enabledCurrencies = currenciesResponse?.data || [];
  const countryOptions = (countriesResponse?.data?.countries || [])
    .map((country) => ({
      code: String(country.country_code || '').toUpperCase(),
      name: country.country_name || String(country.country_code || '').toUpperCase(),
    }))
    .filter((country) => country.code)
    .sort((a, b) => a.name.localeCompare(b.name));
  const providerCurrencyOptions = enabledCurrencies.some((currency) => currency.code === providerCurrency)
    ? enabledCurrencies
    : [
        ...enabledCurrencies,
        {
          id: `virtual-provider-${providerCurrency}`,
          code: providerCurrency,
          symbol: '',
          name: providerCurrency,
          conversionRate: '1.000000',
          isDefault: false,
          isEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as CurrencyRate,
      ];
  const selectedProviderCurrency =
    providerCurrencyOptions.find((currency) => currency.code === providerCurrency) || null;
  const providerCurrencySuffix = selectedProviderCurrency?.symbol
    ? `${providerCurrency} (${selectedProviderCurrency.symbol})`
    : providerCurrency;
  const appWebhookOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const inboundSmsWebhookUrl = appWebhookOrigin
    ? `${appWebhookOrigin}/api/webhooks/vonage/inbound-sms`
    : '/api/webhooks/vonage/inbound-sms';
  const deliveryStatusWebhookUrl = appWebhookOrigin
    ? `${appWebhookOrigin}/api/webhooks/vonage/sms/status`
    : '/api/webhooks/vonage/sms/status';

  const updatePlanRow = (
    planType: 'standard' | 'premium',
    rowKey: NumberPlanKey,
    field: keyof NumberPlanPriceRow,
    value: string,
  ) => {
    const setter = planType === 'standard' ? setStandardPlan : setPremiumPlan;
    setter((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        [field]: value,
      },
    }));
  };

  const updateStandardPlanRow = (
    rowKey: NumberPlanKey,
    field: keyof NumberPlanPriceRow,
    value: string,
  ) => {
    updatePlanRow('standard', rowKey, field, value);
  };

  const updatePremiumPlanRow = (
    rowKey: NumberPlanKey,
    field: keyof NumberPlanPriceRow,
    value: string,
  ) => {
    updatePlanRow('premium', rowKey, field, value);
  };

  const buildCurrentCountryMatrix = (): VonageCountryRateMatrix => ({
    providerCurrency,
    standardPlan: cloneNumberPlan(standardPlan),
    premiumPlan: cloneNumberPlan(premiumPlan),
    messagesApiPrice,
    messagesApiNotes,
  });

  const persistCurrentCountryDraft = () => {
    const currentCountryCode = pricingCountry.toUpperCase();
    if (!currentCountryCode) return;

    setCountryRateMatrix((current) => ({
      ...current,
      [currentCountryCode]: buildCurrentCountryMatrix(),
    }));
  };

  const persistSmsCarrierSettings = async () => {
    const normalizedSenderIdLimit = String(
      Math.max(0, Math.min(100, Math.trunc(Number(senderIdDefaultLimit) || 0))),
    );

    await Promise.all([
      apiRequest('PUT', '/api/admin/settings/sms_carrier_enabled', {
        value: String(smsCarrierEnabled),
        category: 'sms',
      }),
      apiRequest('PUT', '/api/admin/settings/sms_carrier_provider', {
        value: 'easysendsms',
        category: 'sms',
      }),
      apiRequest('PUT', '/api/admin/settings/sms_carrier_api_url', {
        value: smsCarrierApiUrl.trim() || 'https://api.easysendsms.app/bulksms',
        category: 'sms',
      }),
      apiRequest('PUT', '/api/admin/settings/sms_carrier_username', {
        value: smsCarrierUsername.trim(),
        category: 'sms',
      }),
      apiRequest('PUT', '/api/admin/settings/sms_carrier_password', {
        value: smsCarrierPassword,
        category: 'sms',
      }),
      apiRequest('PUT', '/api/admin/settings/sms_carrier_sender_id', {
        value: smsCarrierSenderId.trim(),
        category: 'sms',
      }),
      apiRequest('PUT', '/api/admin/settings/sender_id_default_limit', {
        value: normalizedSenderIdLimit,
        category: 'sms',
      }),
      apiRequest('PUT', '/api/admin/settings/sms_carrier_method', {
        value: 'POST',
        category: 'sms',
      }),
      apiRequest('PUT', '/api/admin/settings/sms_carrier_content_type', {
        value: 'application/x-www-form-urlencoded',
        category: 'sms',
      }),
      apiRequest('PUT', '/api/admin/settings/sms_carrier_success_statuses', {
        value: '200',
        category: 'sms',
      }),
      apiRequest('PUT', '/api/admin/settings/admin_alert_emails', {
        value: adminAlertEmails.trim(),
        category: 'notifications',
      }),
      apiRequest('PUT', '/api/admin/settings/admin_alert_sender_id_emails', {
        value: senderIdAlertEmails.trim(),
        category: 'notifications',
      }),
      apiRequest('PUT', '/api/admin/settings/admin_alert_esim_order_emails', {
        value: esimOrderAlertEmails.trim(),
        category: 'notifications',
      }),
      apiRequest('PUT', '/api/admin/settings/admin_alert_eroaming_order_emails', {
        value: eroamingOrderAlertEmails.trim(),
        category: 'notifications',
      }),
      apiRequest('PUT', '/api/admin/settings/admin_alert_services_modules_emails', {
        value: servicesModulesAlertEmails.trim(),
        category: 'notifications',
      }),
      apiRequest('PUT', '/api/admin/settings/admin_alert_charges_fees_emails', {
        value: chargesFeesAlertEmails.trim(),
        category: 'notifications',
      }),
    ]);
  };

  const persistVonageProviderCriteria = async () => {
    await Promise.all([
      apiRequest('PUT', '/api/admin/settings/vonage_enabled', {
        value: String(enabled),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/vonage_api_key', {
        value: apiKey.trim(),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/vonage_api_secret', {
        value: apiSecret.trim(),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/vonage_application_id', {
        value: applicationId.trim(),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/vonage_private_key', {
        value: privateKey,
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/vonage_brand_name', {
        value: brandName.trim(),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/vonage_inbound_webhook_url', {
        value: inboundWebhookUrl.trim(),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/vonage_status_webhook_url', {
        value: statusWebhookUrl.trim(),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/vonage_virtual_number_default_country', {
        value: defaultCountry.toUpperCase().trim(),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/vonage_virtual_number_auto_assign', {
        value: String(autoAssign),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/voice_backend', {
        value: voiceBackend,
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/linphone_enabled', {
        value: String(linphoneEnabled),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/linphone_sip_domain', {
        value: linphoneSipDomain.trim(),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/linphone_sip_port', {
        value: linphoneSipPort.trim(),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/linphone_sip_transport', {
        value: linphoneSipTransport,
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/linphone_sip_username_prefix', {
        value: linphoneSipUsernamePrefix.trim(),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/linphone_sip_password', {
        value: linphoneSipPassword,
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/linphone_sip_outbound_proxy', {
        value: linphoneSipOutboundProxy.trim(),
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/linphone_voicemail_extension', {
        value: linphoneVoicemailExtension.trim(),
        category: 'integrations',
      }),
      persistSmsCarrierSettings(),
    ]);
  };

  const persistVonageCredentials = async (
    nextApiKey: string,
    nextApiSecret: string,
    nextPrivateKey: string,
  ) => {
    await Promise.all([
      apiRequest('PUT', '/api/admin/settings/vonage_api_key', {
        value: nextApiKey,
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/vonage_api_secret', {
        value: nextApiSecret,
        category: 'integrations',
      }),
      apiRequest('PUT', '/api/admin/settings/vonage_private_key', {
        value: nextPrivateKey,
        category: 'integrations',
      }),
    ]);
  };

  const saveCredentialsMutation = useMutation({
    mutationFn: async ({
      nextApiKey,
      nextApiSecret,
      nextPrivateKey,
    }: {
      nextApiKey: string;
      nextApiSecret: string;
      nextPrivateKey: string;
    }) => {
      await persistVonageCredentials(nextApiKey, nextApiSecret, nextPrivateKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings', 'vonage'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Credentials save failed',
        description: error.message || 'Could not save the Vonage API key, secret, and private key.',
        variant: 'destructive',
      });
    },
  });

  const saveProviderCriteriaMutation = useMutation({
    mutationFn: async () => {
      await persistVonageProviderCriteria();
    },
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          VONAGE_PROVIDER_CRITERIA_DRAFT_KEY,
          JSON.stringify({
            enabled,
            apiKey,
            apiSecret,
            applicationId,
            privateKey,
            brandName,
            inboundWebhookUrl,
            statusWebhookUrl,
            defaultCountry,
            autoAssign,
            voiceBackend,
            linphoneEnabled,
            linphoneSipDomain,
            linphoneSipPort,
            linphoneSipTransport,
            linphoneSipUsernamePrefix,
            linphoneSipPassword,
            linphoneSipOutboundProxy,
            linphoneVoicemailExtension,
          }),
        );
      }
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings', 'vonage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/virtual-numbers/dashboard'] });
      toast({
        title: 'Provider criteria saved',
        description: 'Vonage API and webhook settings were saved successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Provider criteria save failed',
        description: error.message || 'Could not save the Vonage provider criteria.',
        variant: 'destructive',
      });
    },
  });

  const handlePersistCredentials = async () => {
    const nextApiKey = apiKey.trim();
    const nextApiSecret = apiSecret.trim();
    const savedApiKey = vonageSettings?.vonage_api_key || '';
    const savedApiSecret = vonageSettings?.vonage_api_secret || '';
    const savedPrivateKey = vonageSettings?.vonage_private_key || '';

    if (!nextApiKey || !nextApiSecret || !privateKey.trim()) return;
    if (nextApiKey === savedApiKey && nextApiSecret === savedApiSecret && privateKey === savedPrivateKey) return;

    await saveCredentialsMutation.mutateAsync({
      nextApiKey,
      nextApiSecret,
      nextPrivateKey: privateKey,
    });
  };

  useEffect(() => {
    if (!vonageSettings) return;
    const savedDraft =
      typeof window !== 'undefined'
        ? parseVonageProviderCriteriaDraft(window.localStorage.getItem(VONAGE_PROVIDER_CRITERIA_DRAFT_KEY))
        : null;
    const nextDefaultCountry = vonageSettings.vonage_virtual_number_default_country || 'US';
    const nextCountryRateMatrix = parseVonageCountryRateMatrixMap(vonageSettings.vonage_country_rate_matrix);
    const baseStandardPlan: NumberPlan = {
      setup: {
        providerCost: vonageSettings.vonage_standard_setup_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_setup_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_setup_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_setup_retail_price || vonageSettings.vonage_setup_fee || '0.00',
      },
      monthly: {
        providerCost: vonageSettings.vonage_standard_monthly_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_monthly_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_monthly_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_monthly_retail_price || vonageSettings.vonage_monthly_fee || '0.00',
      },
      inbound: {
        providerCost: vonageSettings.vonage_standard_inbound_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_inbound_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_inbound_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_inbound_retail_price || vonageSettings.vonage_inbound_fee || '0.00',
      },
      outbound: {
        providerCost: vonageSettings.vonage_standard_outbound_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_outbound_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_outbound_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_outbound_retail_price || vonageSettings.vonage_outbound_fee || '0.00',
      },
      sms: {
        providerCost: vonageSettings.vonage_standard_sms_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_sms_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_sms_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_sms_retail_price || vonageSettings.vonage_outbound_fee || '0.00',
      },
      mms: {
        providerCost: vonageSettings.vonage_standard_mms_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_mms_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_mms_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_mms_retail_price || vonageSettings.vonage_messages_api_price || '0.00',
      },
      voice: {
        providerCost: vonageSettings.vonage_standard_voice_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_voice_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_voice_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_voice_retail_price || vonageSettings.vonage_outbound_fee || '0.00',
      },
    };
    const basePremiumPlan: NumberPlan = {
      setup: {
        providerCost: vonageSettings.vonage_premium_setup_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_setup_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_setup_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_setup_retail_price || vonageSettings.vonage_premium_setup_fee || '0.00',
      },
      monthly: {
        providerCost: vonageSettings.vonage_premium_monthly_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_monthly_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_monthly_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_monthly_retail_price || vonageSettings.vonage_premium_monthly_fee || '0.00',
      },
      inbound: {
        providerCost: vonageSettings.vonage_premium_inbound_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_inbound_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_inbound_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_inbound_retail_price || vonageSettings.vonage_premium_inbound_fee || '0.00',
      },
      outbound: {
        providerCost: vonageSettings.vonage_premium_outbound_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_outbound_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_outbound_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_outbound_retail_price || vonageSettings.vonage_premium_outbound_fee || '0.00',
      },
      sms: {
        providerCost: vonageSettings.vonage_premium_sms_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_sms_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_sms_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_sms_retail_price || vonageSettings.vonage_premium_outbound_fee || '0.00',
      },
      mms: {
        providerCost: vonageSettings.vonage_premium_mms_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_mms_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_mms_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_mms_retail_price || vonageSettings.vonage_messages_api_price || '0.00',
      },
      voice: {
        providerCost: vonageSettings.vonage_premium_voice_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_voice_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_voice_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_voice_retail_price || vonageSettings.vonage_premium_outbound_fee || '0.00',
      },
    };

    setEnabled(savedDraft?.enabled ?? (vonageSettings.vonage_enabled === 'true'));
    setApiKey(vonageSettings.vonage_api_key || savedDraft?.apiKey || '');
    setApiSecret(vonageSettings.vonage_api_secret || savedDraft?.apiSecret || '');
    setApplicationId(vonageSettings.vonage_application_id || savedDraft?.applicationId || '');
    setPrivateKey(vonageSettings.vonage_private_key || savedDraft?.privateKey || '');
    setBrandName(vonageSettings.vonage_brand_name || savedDraft?.brandName || 'eSIMConnect');
    setInboundWebhookUrl(vonageSettings.vonage_inbound_webhook_url || savedDraft?.inboundWebhookUrl || '');
    setStatusWebhookUrl(
      vonageSettings.vonage_status_webhook_url ||
        savedDraft?.statusWebhookUrl ||
        deliveryStatusWebhookUrl,
    );
    setSmsCarrierEnabled(vonageSettings.sms_carrier_enabled !== 'false');
    setSmsCarrierApiUrl(vonageSettings.sms_carrier_api_url || 'https://api.easysendsms.app/bulksms');
    setSmsCarrierUsername(vonageSettings.sms_carrier_username || '');
    setSmsCarrierPassword(vonageSettings.sms_carrier_password || '');
    setSmsCarrierSenderId(vonageSettings.sms_carrier_sender_id || '');
    setSenderIdDefaultLimit(vonageSettings.sender_id_default_limit || '1');
    setAdminAlertEmails(vonageSettings.admin_alert_emails || '');
    setSenderIdAlertEmails(vonageSettings.admin_alert_sender_id_emails || '');
    setEsimOrderAlertEmails(vonageSettings.admin_alert_esim_order_emails || '');
    setEroamingOrderAlertEmails(vonageSettings.admin_alert_eroaming_order_emails || '');
    setServicesModulesAlertEmails(vonageSettings.admin_alert_services_modules_emails || '');
    setChargesFeesAlertEmails(vonageSettings.admin_alert_charges_fees_emails || '');
    setDefaultCountry(savedDraft?.defaultCountry || nextDefaultCountry);
    setAutoAssign(savedDraft?.autoAssign ?? (vonageSettings.vonage_virtual_number_auto_assign !== 'false'));
    setVoiceBackend(savedDraft?.voiceBackend || vonageSettings.voice_backend || 'vonage');
    setLinphoneEnabled(savedDraft?.linphoneEnabled ?? (vonageSettings.linphone_enabled === 'true'));
    setLinphoneSipDomain(vonageSettings.linphone_sip_domain || savedDraft?.linphoneSipDomain || '');
    setLinphoneSipPort(vonageSettings.linphone_sip_port || savedDraft?.linphoneSipPort || '5061');
    setLinphoneSipTransport(vonageSettings.linphone_sip_transport || savedDraft?.linphoneSipTransport || 'tls');
    setLinphoneSipUsernamePrefix(vonageSettings.linphone_sip_username_prefix || savedDraft?.linphoneSipUsernamePrefix || 'user-');
    setLinphoneSipPassword(vonageSettings.linphone_sip_password || savedDraft?.linphoneSipPassword || '');
    setLinphoneSipOutboundProxy(vonageSettings.linphone_sip_outbound_proxy || savedDraft?.linphoneSipOutboundProxy || '');
    setLinphoneVoicemailExtension(vonageSettings.linphone_voicemail_extension || savedDraft?.linphoneVoicemailExtension || '*98');
    setSetupFee(vonageSettings.vonage_setup_fee || '0.00');
    setMonthlyFee(vonageSettings.vonage_monthly_fee || '0.00');
    setInboundFee(vonageSettings.vonage_inbound_fee || '0.00');
    setOutboundFee(vonageSettings.vonage_outbound_fee || '0.00');
    setPremiumSetupFee(vonageSettings.vonage_premium_setup_fee || vonageSettings.vonage_setup_fee || '0.00');
    setPremiumMonthlyFee(vonageSettings.vonage_premium_monthly_fee || vonageSettings.vonage_monthly_fee || '0.00');
    setPremiumInboundFee(vonageSettings.vonage_premium_inbound_fee || vonageSettings.vonage_inbound_fee || '0.00');
    setPremiumOutboundFee(vonageSettings.vonage_premium_outbound_fee || vonageSettings.vonage_outbound_fee || '0.00');
    setMessagesApiPrice(vonageSettings.vonage_messages_api_price || '0.00');
    setMessagesApiNotes(vonageSettings.vonage_messages_api_notes || '');
    setProviderId(vonageSettings.vonage_provider_id || '');
    setCountryRateMatrix(nextCountryRateMatrix);

    const nextPricingCountry = (pricingCountry || nextDefaultCountry || 'US').toUpperCase();
    setPricingCountry(nextPricingCountry);

    const selectedCountryMatrix = nextCountryRateMatrix[nextPricingCountry];
    setProviderCurrency(selectedCountryMatrix?.providerCurrency || vonageSettings.vonage_provider_currency || 'USD');
    setStandardPlan(cloneNumberPlan(selectedCountryMatrix?.standardPlan || baseStandardPlan));
    setPremiumPlan(cloneNumberPlan(selectedCountryMatrix?.premiumPlan || basePremiumPlan));
    setMessagesApiPrice(selectedCountryMatrix?.messagesApiPrice || vonageSettings.vonage_messages_api_price || '0.00');
    setMessagesApiNotes(selectedCountryMatrix?.messagesApiNotes || vonageSettings.vonage_messages_api_notes || '');
    providerCriteriaHydratedRef.current = true;
  }, [vonageSettings]);

  useEffect(() => {
    if (!providerCriteriaHydratedRef.current) return;
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      VONAGE_PROVIDER_CRITERIA_DRAFT_KEY,
      JSON.stringify({
        enabled,
        apiKey,
        apiSecret,
        applicationId,
        privateKey,
        brandName,
        inboundWebhookUrl,
        statusWebhookUrl,
        defaultCountry,
        autoAssign,
        voiceBackend,
        linphoneEnabled,
        linphoneSipDomain,
        linphoneSipPort,
        linphoneSipTransport,
        linphoneSipUsernamePrefix,
        linphoneSipPassword,
        linphoneSipOutboundProxy,
        linphoneVoicemailExtension,
      }),
    );
  }, [
    enabled,
    apiKey,
    apiSecret,
    applicationId,
    privateKey,
    brandName,
    inboundWebhookUrl,
    statusWebhookUrl,
    defaultCountry,
    autoAssign,
    voiceBackend,
    linphoneEnabled,
    linphoneSipDomain,
    linphoneSipPort,
    linphoneSipTransport,
    linphoneSipUsernamePrefix,
    linphoneSipPassword,
    linphoneSipOutboundProxy,
    linphoneVoicemailExtension,
  ]);

  useEffect(() => {
    if (!vonageSettings || !pricingCountry) return;

    const selectedCountryMatrix = countryRateMatrix[pricingCountry.toUpperCase()];
    const fallbackStandardPlan: NumberPlan = {
      setup: {
        providerCost: vonageSettings.vonage_standard_setup_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_setup_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_setup_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_setup_retail_price || vonageSettings.vonage_setup_fee || '0.00',
      },
      monthly: {
        providerCost: vonageSettings.vonage_standard_monthly_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_monthly_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_monthly_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_monthly_retail_price || vonageSettings.vonage_monthly_fee || '0.00',
      },
      inbound: {
        providerCost: vonageSettings.vonage_standard_inbound_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_inbound_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_inbound_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_inbound_retail_price || vonageSettings.vonage_inbound_fee || '0.00',
      },
      outbound: {
        providerCost: vonageSettings.vonage_standard_outbound_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_outbound_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_outbound_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_outbound_retail_price || vonageSettings.vonage_outbound_fee || '0.00',
      },
      sms: {
        providerCost: vonageSettings.vonage_standard_sms_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_sms_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_sms_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_sms_retail_price || vonageSettings.vonage_outbound_fee || '0.00',
      },
      mms: {
        providerCost: vonageSettings.vonage_standard_mms_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_mms_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_mms_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_mms_retail_price || vonageSettings.vonage_messages_api_price || '0.00',
      },
      voice: {
        providerCost: vonageSettings.vonage_standard_voice_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_standard_voice_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_standard_voice_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_standard_voice_retail_price || vonageSettings.vonage_outbound_fee || '0.00',
      },
    };
    const fallbackPremiumPlan: NumberPlan = {
      setup: {
        providerCost: vonageSettings.vonage_premium_setup_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_setup_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_setup_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_setup_retail_price || vonageSettings.vonage_premium_setup_fee || '0.00',
      },
      monthly: {
        providerCost: vonageSettings.vonage_premium_monthly_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_monthly_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_monthly_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_monthly_retail_price || vonageSettings.vonage_premium_monthly_fee || '0.00',
      },
      inbound: {
        providerCost: vonageSettings.vonage_premium_inbound_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_inbound_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_inbound_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_inbound_retail_price || vonageSettings.vonage_premium_inbound_fee || '0.00',
      },
      outbound: {
        providerCost: vonageSettings.vonage_premium_outbound_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_outbound_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_outbound_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_outbound_retail_price || vonageSettings.vonage_premium_outbound_fee || '0.00',
      },
      sms: {
        providerCost: vonageSettings.vonage_premium_sms_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_sms_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_sms_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_sms_retail_price || vonageSettings.vonage_premium_outbound_fee || '0.00',
      },
      mms: {
        providerCost: vonageSettings.vonage_premium_mms_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_mms_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_mms_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_mms_retail_price || vonageSettings.vonage_messages_api_price || '0.00',
      },
      voice: {
        providerCost: vonageSettings.vonage_premium_voice_provider_cost || '0.00',
        resellerPrice: vonageSettings.vonage_premium_voice_reseller_price || '0.00',
        agentPrice: vonageSettings.vonage_premium_voice_agent_price || '0.00',
        retailPrice: vonageSettings.vonage_premium_voice_retail_price || vonageSettings.vonage_premium_outbound_fee || '0.00',
      },
    };

    setProviderCurrency(selectedCountryMatrix?.providerCurrency || vonageSettings.vonage_provider_currency || 'USD');
    setStandardPlan(cloneNumberPlan(selectedCountryMatrix?.standardPlan || fallbackStandardPlan));
    setPremiumPlan(cloneNumberPlan(selectedCountryMatrix?.premiumPlan || fallbackPremiumPlan));
    setMessagesApiPrice(selectedCountryMatrix?.messagesApiPrice || vonageSettings.vonage_messages_api_price || '0.00');
    setMessagesApiNotes(selectedCountryMatrix?.messagesApiNotes || vonageSettings.vonage_messages_api_notes || '');
  }, [pricingCountry, countryRateMatrix, vonageSettings]);

  const loadPricingMutation = useMutation({
    mutationFn: async () => {
      if (!apiKey.trim() || !apiSecret.trim()) {
        throw new Error('Enter the Vonage API key and secret first to load live pricing.');
      }
      await handlePersistCredentials();
      const response = await fetch('/api/admin/virtual-numbers/provider-pricing', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryCode: pricingCountry.toUpperCase(),
          defaultCountry: pricingCountry.toUpperCase(),
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
        }),
      });
      if (!response.ok) {
        let message = 'Failed to load provider pricing';
        try {
          const payload = await response.json();
          message = payload?.message || payload?.error || message;
        } catch {
          const text = await response.text();
          message = text || message;
        }
        throw new Error(message);
      }
      const payload = await response.json();
      return payload.data;
    },
    onSuccess: (result) => {
      setLiveProviderPricing(result);
      const providerCurrencyFromApi =
        result?.smsApiPricing?.[0]?.currency ||
        result?.voiceApiPricing?.[0]?.currency ||
        result?.messagesApiPricing?.[0]?.currency;
      if (providerCurrencyFromApi) {
        setProviderCurrency(providerCurrencyFromApi);
      }
      if (result?.messagesApiPricing?.[0]?.price) {
        setMessagesApiPrice(result.messagesApiPricing[0].price);
      }
      if (result?.messagesApiNote) {
        setMessagesApiNotes(result.messagesApiNote);
      }
      setStandardPlan((current) => ({
        ...current,
        setup: {
          ...current.setup,
          providerCost: result?.numberPricingPreview?.setupCost || current.setup.providerCost,
        },
        monthly: {
          ...current.monthly,
          providerCost: result?.numberPricingPreview?.monthlyCost || current.monthly.providerCost,
        },
        sms: {
          ...current.sms,
          providerCost: result?.smsApiPricing?.[0]?.price || current.sms.providerCost,
        },
        voice: {
          ...current.voice,
          providerCost: result?.voiceApiPricing?.[0]?.price || current.voice.providerCost,
        },
        mms: {
          ...current.mms,
          providerCost: result?.messagesApiPricing?.[0]?.price || current.mms.providerCost,
        },
      }));
      setPremiumPlan((current) => ({
        ...current,
        setup: {
          ...current.setup,
          providerCost: result?.numberPricingPreview?.setupCost || current.setup.providerCost,
        },
        monthly: {
          ...current.monthly,
          providerCost: result?.numberPricingPreview?.monthlyCost || current.monthly.providerCost,
        },
        sms: {
          ...current.sms,
          providerCost: result?.smsApiPricing?.[0]?.price || current.sms.providerCost,
        },
        voice: {
          ...current.voice,
          providerCost: result?.voiceApiPricing?.[0]?.price || current.voice.providerCost,
        },
        mms: {
          ...current.mms,
          providerCost: result?.messagesApiPricing?.[0]?.price || current.mms.providerCost,
        },
      }));
      const hasWarnings = Array.isArray(result?.pricingWarnings) && result.pricingWarnings.length > 0;
      toast({
        title: hasWarnings ? 'Provider pricing loaded with fallback' : 'Provider pricing loaded',
        description: hasWarnings
          ? result.pricingWarnings.join(' ')
          : `Live Vonage API pricing loaded for ${result.countryCode}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Provider pricing failed',
        description: error.message || 'Could not load live Vonage pricing',
        variant: 'destructive',
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const pricingEntries: Array<[string, string]> = [
        ['vonage_provider_id', providerId],
        ['vonage_provider_currency', providerCurrency],
        ['vonage_standard_setup_provider_cost', standardPlan.setup.providerCost],
        ['vonage_standard_setup_reseller_price', standardPlan.setup.resellerPrice],
        ['vonage_standard_setup_agent_price', standardPlan.setup.agentPrice],
        ['vonage_standard_setup_retail_price', standardPlan.setup.retailPrice],
        ['vonage_standard_monthly_provider_cost', standardPlan.monthly.providerCost],
        ['vonage_standard_monthly_reseller_price', standardPlan.monthly.resellerPrice],
        ['vonage_standard_monthly_agent_price', standardPlan.monthly.agentPrice],
        ['vonage_standard_monthly_retail_price', standardPlan.monthly.retailPrice],
        ['vonage_standard_inbound_provider_cost', standardPlan.inbound.providerCost],
        ['vonage_standard_inbound_reseller_price', standardPlan.inbound.resellerPrice],
        ['vonage_standard_inbound_agent_price', standardPlan.inbound.agentPrice],
        ['vonage_standard_inbound_retail_price', standardPlan.inbound.retailPrice],
        ['vonage_standard_outbound_provider_cost', standardPlan.outbound.providerCost],
        ['vonage_standard_outbound_reseller_price', standardPlan.outbound.resellerPrice],
        ['vonage_standard_outbound_agent_price', standardPlan.outbound.agentPrice],
        ['vonage_standard_outbound_retail_price', standardPlan.outbound.retailPrice],
        ['vonage_standard_sms_provider_cost', standardPlan.sms.providerCost],
        ['vonage_standard_sms_reseller_price', standardPlan.sms.resellerPrice],
        ['vonage_standard_sms_agent_price', standardPlan.sms.agentPrice],
        ['vonage_standard_sms_retail_price', standardPlan.sms.retailPrice],
        ['vonage_standard_mms_provider_cost', standardPlan.mms.providerCost],
        ['vonage_standard_mms_reseller_price', standardPlan.mms.resellerPrice],
        ['vonage_standard_mms_agent_price', standardPlan.mms.agentPrice],
        ['vonage_standard_mms_retail_price', standardPlan.mms.retailPrice],
        ['vonage_standard_voice_provider_cost', standardPlan.voice.providerCost],
        ['vonage_standard_voice_reseller_price', standardPlan.voice.resellerPrice],
        ['vonage_standard_voice_agent_price', standardPlan.voice.agentPrice],
        ['vonage_standard_voice_retail_price', standardPlan.voice.retailPrice],
        ['vonage_premium_setup_provider_cost', premiumPlan.setup.providerCost],
        ['vonage_premium_setup_reseller_price', premiumPlan.setup.resellerPrice],
        ['vonage_premium_setup_agent_price', premiumPlan.setup.agentPrice],
        ['vonage_premium_setup_retail_price', premiumPlan.setup.retailPrice],
        ['vonage_premium_monthly_provider_cost', premiumPlan.monthly.providerCost],
        ['vonage_premium_monthly_reseller_price', premiumPlan.monthly.resellerPrice],
        ['vonage_premium_monthly_agent_price', premiumPlan.monthly.agentPrice],
        ['vonage_premium_monthly_retail_price', premiumPlan.monthly.retailPrice],
        ['vonage_premium_inbound_provider_cost', premiumPlan.inbound.providerCost],
        ['vonage_premium_inbound_reseller_price', premiumPlan.inbound.resellerPrice],
        ['vonage_premium_inbound_agent_price', premiumPlan.inbound.agentPrice],
        ['vonage_premium_inbound_retail_price', premiumPlan.inbound.retailPrice],
        ['vonage_premium_outbound_provider_cost', premiumPlan.outbound.providerCost],
        ['vonage_premium_outbound_reseller_price', premiumPlan.outbound.resellerPrice],
        ['vonage_premium_outbound_agent_price', premiumPlan.outbound.agentPrice],
        ['vonage_premium_outbound_retail_price', premiumPlan.outbound.retailPrice],
        ['vonage_premium_sms_provider_cost', premiumPlan.sms.providerCost],
        ['vonage_premium_sms_reseller_price', premiumPlan.sms.resellerPrice],
        ['vonage_premium_sms_agent_price', premiumPlan.sms.agentPrice],
        ['vonage_premium_sms_retail_price', premiumPlan.sms.retailPrice],
        ['vonage_premium_mms_provider_cost', premiumPlan.mms.providerCost],
        ['vonage_premium_mms_reseller_price', premiumPlan.mms.resellerPrice],
        ['vonage_premium_mms_agent_price', premiumPlan.mms.agentPrice],
        ['vonage_premium_mms_retail_price', premiumPlan.mms.retailPrice],
        ['vonage_premium_voice_provider_cost', premiumPlan.voice.providerCost],
        ['vonage_premium_voice_reseller_price', premiumPlan.voice.resellerPrice],
        ['vonage_premium_voice_agent_price', premiumPlan.voice.agentPrice],
        ['vonage_premium_voice_retail_price', premiumPlan.voice.retailPrice],
      ];
      const nextCountryRateMatrix: VonageCountryRateMatrixMap = {
        ...countryRateMatrix,
        [pricingCountry.toUpperCase()]: buildCurrentCountryMatrix(),
      };

      await Promise.all([
        apiRequest('PUT', '/api/admin/settings/vonage_enabled', {
          value: String(enabled),
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_api_key', {
          value: apiKey,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_api_secret', {
          value: apiSecret,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_application_id', {
          value: applicationId,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_private_key', {
          value: privateKey,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_brand_name', {
          value: brandName,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_inbound_webhook_url', {
          value: inboundWebhookUrl,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_status_webhook_url', {
          value: statusWebhookUrl,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_virtual_number_default_country', {
          value: defaultCountry.toUpperCase(),
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_virtual_number_auto_assign', {
          value: String(autoAssign),
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/voice_backend', {
          value: voiceBackend,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/linphone_enabled', {
          value: String(linphoneEnabled),
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/linphone_sip_domain', {
          value: linphoneSipDomain.trim(),
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/linphone_sip_port', {
          value: linphoneSipPort.trim(),
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/linphone_sip_transport', {
          value: linphoneSipTransport,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/linphone_sip_username_prefix', {
          value: linphoneSipUsernamePrefix.trim(),
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/linphone_sip_password', {
          value: linphoneSipPassword,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/linphone_sip_outbound_proxy', {
          value: linphoneSipOutboundProxy.trim(),
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/linphone_voicemail_extension', {
          value: linphoneVoicemailExtension.trim(),
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_setup_fee', {
          value: standardPlan.setup.retailPrice || setupFee,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_monthly_fee', {
          value: standardPlan.monthly.retailPrice || monthlyFee,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_inbound_fee', {
          value: standardPlan.inbound.retailPrice || inboundFee,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_outbound_fee', {
          value: standardPlan.outbound.retailPrice || outboundFee,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_premium_setup_fee', {
          value: premiumPlan.setup.retailPrice || premiumSetupFee,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_premium_monthly_fee', {
          value: premiumPlan.monthly.retailPrice || premiumMonthlyFee,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_premium_inbound_fee', {
          value: premiumPlan.inbound.retailPrice || premiumInboundFee,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_premium_outbound_fee', {
          value: premiumPlan.outbound.retailPrice || premiumOutboundFee,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_messages_api_price', {
          value: messagesApiPrice,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_messages_api_notes', {
          value: messagesApiNotes,
          category: 'integrations',
        }),
        apiRequest('PUT', '/api/admin/settings/vonage_country_rate_matrix', {
          value: JSON.stringify(nextCountryRateMatrix),
          category: 'integrations',
        }),
        persistSmsCarrierSettings(),
        ...pricingEntries.map(([key, value]) =>
          apiRequest('PUT', `/api/admin/settings/${key}`, {
            value,
            category: 'integrations',
          }),
        ),
      ]);
    },
    onSuccess: () => {
      setCountryRateMatrix((current) => ({
        ...current,
        [pricingCountry.toUpperCase()]: buildCurrentCountryMatrix(),
      }));
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings', 'vonage'] });
      toast({
        title: 'Vonage settings saved',
        description: 'Virtual number and SMS configuration updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save Vonage settings',
        variant: 'destructive',
      });
    },
  });

  return (
    <Card className="overflow-hidden border border-white/70 bg-gradient-to-br from-white to-slate-50 shadow-[0_22px_70px_rgba(15,23,42,0.08)] dark:border-slate-800/80 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950">
      <CardHeader className="border-b border-slate-200/70 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 dark:border-slate-800 dark:from-cyan-950/20 dark:via-slate-900 dark:to-emerald-950/20">
        <CardTitle className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-500/30">
            <Phone className="h-5 w-5 text-white" />
          </span>
          <span>Vonage eRoaming's</span>
        </CardTitle>
        <CardDescription className="text-slate-950 dark:text-white">
          Configure Vonage DID receiving, EasySendSMS outbound SMS, live pricing, and selling plans.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div>
            <Label className="text-base">Enable Vonage Feature</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Turns on virtual number applications and SMS tools in the user account area.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Voice Backend</Label>
            <Select
              value={voiceBackend}
              onValueChange={(value) => {
                setVoiceBackend(value);
                setTimeout(() => saveProviderCriteriaMutation.mutate(), 0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voice backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vonage">Vonage Client SDK + Voice API</SelectItem>
                <SelectItem value="linphone">Linphone SIP Backend</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Keep Vonage as the default voice path, or switch mobile session scaffolding to Linphone SIP credentials.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <Label className="text-base">Enable Linphone SIP Backend</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Turn this on to allow SIP session scaffolding alongside Vonage voice.
              </p>
            </div>
            <Switch
              checked={linphoneEnabled}
              onCheckedChange={(checked) => {
                setLinphoneEnabled(checked);
                setTimeout(() => saveProviderCriteriaMutation.mutate(), 0);
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vonage-api-key">API Key</Label>
            <Input
              id="vonage-api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={() => {
                saveProviderCriteriaMutation.mutate();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vonage-api-secret">API Secret</Label>
            <Input
              id="vonage-api-secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              onBlur={() => {
                saveProviderCriteriaMutation.mutate();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vonage-application-id">Application ID</Label>
            <Input
              id="vonage-application-id"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              onBlur={() => saveProviderCriteriaMutation.mutate()}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="vonage-private-key">Private Key</Label>
            <Textarea
              id="vonage-private-key"
              rows={6}
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              onBlur={() => saveProviderCriteriaMutation.mutate()}
              placeholder="-----BEGIN PRIVATE KEY-----"
            />
            <p className="text-xs text-muted-foreground">
              Required for Vonage Client SDK voice tokens. Paste the application private key exactly as downloaded from Vonage.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vonage-brand-name">SMS Brand / Sender</Label>
            <Input
              id="vonage-brand-name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              onBlur={() => saveProviderCriteriaMutation.mutate()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vonage-default-country">Default Number Country</Label>
            <Input
              id="vonage-default-country"
              maxLength={2}
              value={defaultCountry}
              onChange={(e) => setDefaultCountry(e.target.value)}
              onBlur={() => saveProviderCriteriaMutation.mutate()}
            />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div>
              <Label className="text-base">Auto Assign Number</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                If enabled, the app will try to buy and assign an available number immediately after application.
              </p>
            </div>
            <Switch
              checked={autoAssign}
              onCheckedChange={(checked) => {
                setAutoAssign(checked);
                setTimeout(() => {
                  saveProviderCriteriaMutation.mutate();
                }, 0);
              }}
            />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="vonage-inbound-webhook">Inbound SMS Webhook URL</Label>
            <Input
              id="vonage-inbound-webhook"
              value={inboundWebhookUrl}
              onChange={(e) => setInboundWebhookUrl(e.target.value)}
              onBlur={() => saveProviderCriteriaMutation.mutate()}
              placeholder={inboundSmsWebhookUrl}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vonage-status-webhook">Delivery Status Webhook URL</Label>
            <Input
              id="vonage-status-webhook"
              value={statusWebhookUrl}
              onChange={(e) => setStatusWebhookUrl(e.target.value)}
              onBlur={() => saveProviderCriteriaMutation.mutate()}
              placeholder={deliveryStatusWebhookUrl}
            />
            <p className="text-xs text-muted-foreground">
              Vonage delivery receipts will update sent SMS status through this callback.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900/40 dark:bg-gradient-to-br dark:from-emerald-950/10 dark:to-slate-950">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-base font-semibold">Outbound SMS Carrier</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  EasySendSMS sends outbound SMS. Inbound SMS for eRoaming numbers stays on the Vonage webhook above.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="sms-carrier-enabled" className="text-sm">Enabled</Label>
                <Switch
                  id="sms-carrier-enabled"
                  checked={smsCarrierEnabled}
                  onCheckedChange={setSmsCarrierEnabled}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sms-carrier-provider">Provider</Label>
                <Input id="sms-carrier-provider" value="EasySendSMS" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-carrier-api-url">API URL</Label>
                <Input
                  id="sms-carrier-api-url"
                  value={smsCarrierApiUrl}
                  onChange={(e) => setSmsCarrierApiUrl(e.target.value)}
                  placeholder="https://api.easysendsms.app/bulksms"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-carrier-username">API Username</Label>
                <Input
                  id="sms-carrier-username"
                  value={smsCarrierUsername}
                  onChange={(e) => setSmsCarrierUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-carrier-password">API Password</Label>
                <Input
                  id="sms-carrier-password"
                  type="password"
                  value={smsCarrierPassword}
                  onChange={(e) => setSmsCarrierPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sms-carrier-sender-id">Main / Fallback Sender ID</Label>
                <Input
                  id="sms-carrier-sender-id"
                  value={smsCarrierSenderId}
                  onChange={(e) => setSmsCarrierSenderId(e.target.value)}
                  placeholder="Brand name or approved sender"
                />
                <p className="text-xs text-muted-foreground">
                  Used automatically when EasySendSMS rejects a customer Sender ID, for example unsupported US numeric sender IDs.
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sender-id-default-limit">Default Sender ID Limit Per User</Label>
                <Input
                  id="sender-id-default-limit"
                  type="number"
                  min={0}
                  max={100}
                  value={senderIdDefaultLimit}
                  onChange={(e) => setSenderIdDefaultLimit(e.target.value)}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  Applies to User, Agent, and Reseller accounts unless a different limit is set in User Details. Use 0 to block custom Sender IDs.
                </p>
              </div>
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-emerald-500" />
                  <Label>System Alert Emails</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add one or more emails separated by commas. Event-specific emails override the default alert email list.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin-alert-emails">Default Alert Emails</Label>
                    <Textarea
                      id="admin-alert-emails"
                      value={adminAlertEmails}
                      onChange={(e) => setAdminAlertEmails(e.target.value)}
                      placeholder="support@example.com, admin@example.com"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-id-alert-emails">Sender ID Approval Emails</Label>
                    <Textarea
                      id="sender-id-alert-emails"
                      value={senderIdAlertEmails}
                      onChange={(e) => setSenderIdAlertEmails(e.target.value)}
                      placeholder="senderid-approval@example.com"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="esim-order-alert-emails">eSIM Data Order Emails</Label>
                    <Textarea
                      id="esim-order-alert-emails"
                      value={esimOrderAlertEmails}
                      onChange={(e) => setEsimOrderAlertEmails(e.target.value)}
                      placeholder="orders@example.com"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eroaming-order-alert-emails">eRoaming Number Order Emails</Label>
                    <Textarea
                      id="eroaming-order-alert-emails"
                      value={eroamingOrderAlertEmails}
                      onChange={(e) => setEroamingOrderAlertEmails(e.target.value)}
                      placeholder="eroaming@example.com"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="services-modules-alert-emails">Services & Modules Emails</Label>
                    <Textarea
                      id="services-modules-alert-emails"
                      value={servicesModulesAlertEmails}
                      onChange={(e) => setServicesModulesAlertEmails(e.target.value)}
                      placeholder="modules@example.com"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="charges-fees-alert-emails">Charges & Fees Emails</Label>
                    <Textarea
                      id="charges-fees-alert-emails"
                      value={chargesFeesAlertEmails}
                      onChange={(e) => setChargesFeesAlertEmails(e.target.value)}
                      placeholder="billing@example.com"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-10 rounded-xl px-5"
              onClick={() => saveProviderCriteriaMutation.mutate()}
              disabled={saveProviderCriteriaMutation.isPending}
            >
              {saveProviderCriteriaMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save eRoaming & SMS Settings
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-50 to-white p-5 shadow-sm dark:border-fuchsia-900/40 dark:bg-gradient-to-br dark:from-fuchsia-950/10 dark:to-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">Linphone SIP Backend</h3>
              <p className="text-sm text-muted-foreground">
                Configure the second voice backend with separate SIP credentials and routing defaults for mobile session scaffolding.
              </p>
            </div>
            <Badge variant={linphoneEnabled ? 'default' : 'secondary'}>
              {linphoneEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linphone-sip-domain">SIP Domain</Label>
              <Input
                id="linphone-sip-domain"
                value={linphoneSipDomain}
                onChange={(e) => setLinphoneSipDomain(e.target.value)}
                onBlur={() => saveProviderCriteriaMutation.mutate()}
                placeholder="sip.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linphone-sip-port">SIP Port</Label>
              <Input
                id="linphone-sip-port"
                value={linphoneSipPort}
                onChange={(e) => setLinphoneSipPort(e.target.value)}
                onBlur={() => saveProviderCriteriaMutation.mutate()}
                placeholder="5061"
              />
            </div>
            <div className="space-y-2">
              <Label>SIP Transport</Label>
              <Select
                value={linphoneSipTransport}
                onValueChange={(value) => {
                  setLinphoneSipTransport(value);
                  setTimeout(() => saveProviderCriteriaMutation.mutate(), 0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select SIP transport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="udp">UDP</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="tls">TLS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linphone-username-prefix">Username Prefix</Label>
              <Input
                id="linphone-username-prefix"
                value={linphoneSipUsernamePrefix}
                onChange={(e) => setLinphoneSipUsernamePrefix(e.target.value)}
                onBlur={() => saveProviderCriteriaMutation.mutate()}
                placeholder="user-"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linphone-password">SIP Password</Label>
              <Input
                id="linphone-password"
                type="password"
                value={linphoneSipPassword}
                onChange={(e) => setLinphoneSipPassword(e.target.value)}
                onBlur={() => saveProviderCriteriaMutation.mutate()}
                placeholder="Shared SIP password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linphone-outbound-proxy">Outbound Proxy</Label>
              <Input
                id="linphone-outbound-proxy"
                value={linphoneSipOutboundProxy}
                onChange={(e) => setLinphoneSipOutboundProxy(e.target.value)}
                onBlur={() => saveProviderCriteriaMutation.mutate()}
                placeholder="sip:sip.example.com;transport=tls"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="linphone-voicemail-extension">Voice Mail Extension</Label>
              <Input
                id="linphone-voicemail-extension"
                value={linphoneVoicemailExtension}
                onChange={(e) => setLinphoneVoicemailExtension(e.target.value)}
                onBlur={() => saveProviderCriteriaMutation.mutate()}
                placeholder="*98"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-fuchsia-300/60 bg-white/80 p-4 text-sm text-muted-foreground dark:border-fuchsia-800/50 dark:bg-slate-950/50">
            Linphone here is saved as a second SIP backend. It prepares SIP login details for the mobile app, but full background SIP registration and native call lifecycle handling still need the next Android/iOS bridge phase.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Country Price List</Label>
              <Select
                value={pricingCountry}
                onValueChange={(value) => {
                  persistCurrentCountryDraft();
                  setPricingCountry(value.toUpperCase());
                  setLiveProviderPricing(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country for rates" />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </SelectItem>
                  ))}
                  {countryOptions.length === 0 && <SelectItem value={pricingCountry || 'US'}>{pricingCountry || 'US'}</SelectItem>}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Switch country here to trace provider cost and save a separate virtual number price list for each country.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Current Country Matrix</Label>
              <div className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/80 p-4 text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-950/50">
                Editing rates for <span className="font-semibold text-foreground">{pricingCountry}</span>. The current matrix is saved per country when you click <span className="font-semibold text-foreground">Save Vonage Settings</span>.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-cyan-50/40 p-5 shadow-sm dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900/80 dark:to-cyan-950/10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-base font-semibold">Live API Pricing Preview</h3>
              <p className="text-sm text-muted-foreground">
                Load current Vonage API pricing for {pricingCountry} so you can compare your selling fees with provider costs.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-slate-300/70 bg-white/80 dark:border-slate-700 dark:bg-slate-900/70"
              onClick={() => loadPricingMutation.mutate()}
              disabled={loadPricingMutation.isPending}
            >
              {loadPricingMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Load Live API Pricing
            </Button>
          </div>

          {!enabled ? (
            <p className="text-sm text-muted-foreground">Vonage feature is currently disabled, but you can still load live provider pricing for setup.</p>
          ) : null}

          {liveProviderPricing && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-sm font-medium">Number Cost Preview</div>
                {liveProviderPricing.numberPricingPreview ? (
                  <>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Sample: {liveProviderPricing.numberPricingPreview.msisdn || '--'}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Setup: {liveProviderPricing.numberPricingPreview.setupCost || '0.00'} {providerCurrency}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Monthly: {liveProviderPricing.numberPricingPreview.monthlyCost || '0.00'} {providerCurrency}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No live number cost preview returned for this country.</p>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                  {liveProviderPricing.numberPricingNote || 'Setup and monthly cost stay manual if Vonage does not return sample number pricing.'}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-sm font-medium">SMS API Pricing</div>
                {liveProviderPricing.smsApiPricing.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No live SMS API pricing returned for this country.</p>
                ) : (
                  liveProviderPricing.smsApiPricing.slice(0, 5).map((item, index) => (
                    <div key={`settings-sms-${index}`} className="mt-2 text-sm text-muted-foreground">
                      {item.dest_network_type || 'ALL'}: {item.price || '0'} {item.currency || ''}{item.rate_increment ? ` • Increment ${item.rate_increment}` : ''}
                    </div>
                  ))
                )}
                <div className="mt-3 text-xs text-muted-foreground">{liveProviderPricing.smsApiNote}</div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-sm font-medium">Voice API Pricing</div>
                {liveProviderPricing.voiceApiPricing.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No live Voice API pricing returned for this country.</p>
                ) : (
                  liveProviderPricing.voiceApiPricing.slice(0, 5).map((item, index) => (
                    <div key={`settings-voice-${index}`} className="mt-2 text-sm text-muted-foreground">
                      {item.dest_network_type || 'ALL'}: {item.price || '0'} {item.currency || ''}{item.rate_increment ? ` • Increment ${item.rate_increment}` : ''}
                    </div>
                  ))
                )}
                <div className="mt-3 text-xs text-muted-foreground">{liveProviderPricing.voiceApiNote}</div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-sm font-medium">Messages API Pricing</div>
                {liveProviderPricing.messagesApiPricing.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No public live Messages API pricing endpoint is exposed by Vonage, so use the manual cost below.</p>
                ) : (
                  liveProviderPricing.messagesApiPricing.slice(0, 5).map((item, index) => (
                    <div key={`settings-messages-${index}`} className="mt-2 text-sm text-muted-foreground">
                      {item.dest_network_type || 'MANUAL'}: {item.price || '0'} {item.currency || ''}
                    </div>
                  ))
                )}
                <div className="mt-3 text-xs text-muted-foreground">{liveProviderPricing.messagesApiNote}</div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900/80 dark:to-slate-950/80">
          <div className="space-y-2">
            <h3 className="text-base font-semibold">Standard Normal Numbers Plan</h3>
            <p className="text-sm text-muted-foreground">
              Set provider cost plus reseller, agent, and retail prices for the standard virtual number plan in {pricingCountry}.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vonage-provider-name">Provider Name</Label>
              <Input id="vonage-provider-name" value="Vonage" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vonage-provider-id">Provider ID</Label>
              <Input id="vonage-provider-id" value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="100010012" />
            </div>
            <div className="space-y-2">
              <Label>Provider Currency</Label>
                <Select value={providerCurrency} onValueChange={setProviderCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider currency" />
                </SelectTrigger>
                <SelectContent>
                  {providerCurrencyOptions.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} {currency.symbol ? `(${currency.symbol})` : ''}
                    </SelectItem>
                  ))}
                  {providerCurrencyOptions.length === 0 && <SelectItem value="USD">USD</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 p-4 text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-950/50">
            Use the provider currency above so Vonage costs match the provider billing currency. Provider Cost is read-only and comes from your saved baseline or live API load. Only reseller, agent, and retail prices should be edited here.
          </div>

          {([
            ['setup', 'eRoaming Setup Fees Cost'],
            ['monthly', 'eRoaming Monthly Fees'],
            ['inbound', 'Inbound Price'],
            ['outbound', 'Outbound Price'],
            ['sms', 'SMS Price'],
            ['mms', 'MMS Price'],
            ['voice', 'Voice Price'],
          ] as Array<[NumberPlanKey, string]>).map(([rowKey, title]) => (
            <div key={rowKey} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="mb-4 text-center text-base font-semibold">{title}</div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>{`Provider Cost ${providerCurrencySuffix ? `(${providerCurrencySuffix})` : ''}`}</Label>
                  <Input
                    value={standardPlan[rowKey].providerCost}
                    readOnly
                    className="cursor-not-allowed bg-slate-100/90 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{'Reseller Price'}</Label>
                  <Input
                    value={standardPlan[rowKey].resellerPrice}
                    onChange={(e) => updateStandardPlanRow(rowKey, 'resellerPrice', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{'Agent Price'}</Label>
                  <Input
                    value={standardPlan[rowKey].agentPrice}
                    onChange={(e) => updateStandardPlanRow(rowKey, 'agentPrice', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{'Retail Price'}</Label>
                  <Input
                    value={standardPlan[rowKey].retailPrice}
                    onChange={(e) => updateStandardPlanRow(rowKey, 'retailPrice', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm dark:bg-gradient-to-br dark:from-amber-950/10 dark:to-slate-950">
          <div className="flex items-start gap-3">
            <Star className="mt-0.5 h-4 w-4 text-amber-500" />
            <div className="space-y-2">
              <h3 className="text-base font-semibold">Premium Normal Numbers Plan</h3>
              <p className="text-sm text-muted-foreground">
                Set provider cost plus reseller, agent, and retail prices for premium eRoaming's in {pricingCountry}.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-amber-300/60 bg-white/80 p-4 text-sm text-muted-foreground dark:border-amber-800/50 dark:bg-slate-950/50">
            Premium retail prices here also feed the legacy premium default fee settings used when a number is marked as premium in the eRoaming dashboard. Provider Cost is read-only and should come from your saved baseline or live provider load.
          </div>

          {([
            ['setup', 'eRoaming Setup Fees Cost'],
            ['monthly', 'eRoaming Monthly Fees'],
            ['inbound', 'Inbound Price'],
            ['outbound', 'Outbound Price'],
            ['sms', 'SMS Price'],
            ['mms', 'MMS Price'],
            ['voice', 'Voice Price'],
          ] as Array<[NumberPlanKey, string]>).map(([rowKey, title]) => (
            <div key={`premium-${rowKey}`} className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="mb-4 text-center text-base font-semibold">{title}</div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>{`Provider Cost ${providerCurrencySuffix ? `(${providerCurrencySuffix})` : ''}`}</Label>
                  <Input
                    value={premiumPlan[rowKey].providerCost}
                    readOnly
                    className="cursor-not-allowed bg-slate-100/90 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reseller Price</Label>
                  <Input
                    value={premiumPlan[rowKey].resellerPrice}
                    onChange={(e) => updatePremiumPlanRow(rowKey, 'resellerPrice', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Agent Price</Label>
                  <Input
                    value={premiumPlan[rowKey].agentPrice}
                    onChange={(e) => updatePremiumPlanRow(rowKey, 'agentPrice', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Retail Price</Label>
                  <Input
                    value={premiumPlan[rowKey].retailPrice}
                    onChange={(e) => updatePremiumPlanRow(rowKey, 'retailPrice', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm dark:bg-gradient-to-br dark:from-sky-950/10 dark:to-slate-950">
          <div>
            <h3 className="text-base font-semibold">Messages API Provider Baseline</h3>
            <p className="text-sm text-muted-foreground">
              Save your manual Vonage Messages API cost here. This is used because Vonage does not expose a public live `messages` product in the Pricing API.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vonage-messages-api-price">Messages API Cost</Label>
              <Input id="vonage-messages-api-price" value={messagesApiPrice} onChange={(e) => setMessagesApiPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vonage-messages-api-notes">Messages API Notes</Label>
              <Input id="vonage-messages-api-notes" value={messagesApiNotes} onChange={(e) => setMessagesApiNotes(e.target.value)} placeholder="WhatsApp, RCS, omnichannel, or contract note" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-950/50">
          In Vonage, outbound SMS uses the SMS API, while inbound SMS is delivered to the webhook configured on the virtual number itself.
          The app can auto-update the number webhook when auto assignment is enabled and credentials are valid.
        </div>

        <Button className="h-11 rounded-xl px-6" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Vonage Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { t, isRTL } = useTranslation();
  const { toast } = useToast();
  const [settingsTab, setSettingsTab] = useState('general');
  const [platformName, setPlatformName] = useState('');
  const [platformTagline, setPlatformTagline] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [copyrightText, setCopyrightText] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('noreply@gmail.com');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');

  // Package selection mode
  const [packageSelectionMode, setPackageSelectionMode] = useState('auto');

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings'],
  });

  const siteName = useSettingByKey('platform_name');

  // console.log('siteName', siteName);

  useEffect(() => {
    if (settings) {
      setPlatformName(settings.platform_name || '');
      setPlatformTagline(settings.platform_tagline || '');
      setLogo(settings.logo || null);
      setFavicon(settings.favicon || null);
      setCopyrightText(settings.copyright_text || '');
      setCurrency(settings.currency || 'USD');
      setSmtpHost(settings.smtp_host || '');
      setSmtpPort(settings.smtp_port || '');
      setSmtpUser(settings.smtp_user || '');
      setSmtpFromEmail(settings.smtp_from_email);
      setSmtpPass(settings.smtp_pass || '');
      setPackageSelectionMode(settings.package_selection_mode || 'auto');
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({
      key,
      value,
      category,
    }: {
      key: string;
      value: string;
      category: string;
    }) => {
      return await apiRequest('PUT', `/api/admin/settings/${key}`, {
        value,
        category,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/packages'] });
      toast({
        title: t('adminPanel.admin.settings.success', 'Success'),
        description: t('adminPanel.admin.settings.settingsUpdatedSuccess', 'Settings updated successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('adminPanel.admin.settings.error', 'Error'),
        description:
          error.message || t('adminPanel.admin.settings.failedToUpdateSettings', 'Failed to update settings'),
        variant: 'destructive',
      });
    },
  });

  const saveSetting = async (key: string, value: string, category: string = 'general') => {
    await updateSettingMutation.mutateAsync({ key, value, category });
  };

  const handleSaveGeneral = async () => {
    if (!platformName.trim()) {
      toast({
        title: t('adminPanel.admin.settings.validationError', 'Validation Error'),
        description: t('adminPanel.admin.settings.platformNameRequired', 'Platform name is required'),
        variant: 'destructive',
      });
      return;
    }
    await saveSetting('platform_name', platformName, 'general');
    await saveSetting('platform_tagline', platformTagline, 'general');
    await saveSetting('copyright_text', copyrightText, 'general');
    await saveSetting('currency', currency, 'general');
    if (logo) {
      await saveSetting('logo', logo, 'general');
    }
    if (favicon) {
      await saveSetting('favicon', favicon, 'general');
    }
  };

  const handleSaveSmtp = async () => {
    await saveSetting('smtp_host', smtpHost, 'smtp');
    await saveSetting('smtp_port', smtpPort, 'smtp');
    await saveSetting('smtp_user', smtpUser, 'smtp');
    await saveSetting('smtp_pass', smtpPass, 'smtp');
    await saveSetting('smtp_from_email', smtpFromEmail, 'smtp');
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await apiRequest('POST', '/api/upload', formData);

    if (!res.ok) {
      throw new Error('Image upload failed');
    }

    const data = await res.json();
    return data.fileUrl; // 👈 saved path
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const path = await uploadImage(file);
      console.log('Uploaded logo path:', path);
      setLogo(path); // 👈 store path, not base64
    } catch (err) {
      console.error(err);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const path = await uploadImage(file);
      console.log('Uploaded favicon path:', path);
      setFavicon(path);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    console.log('LOGO STATE:', logo);
    console.log('FAVICON STATE:', favicon);
  }, [logo, favicon]);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`admin-light-surface p-6 lg:p-8 space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
          {t('adminPanel.admin.settings.title', 'Global Settings')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          {t('adminPanel.admin.settings.description', 'Configure system-wide settings')}
        </p>
      </div>

      <Tabs value={settingsTab} onValueChange={setSettingsTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="relative rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
          <div className="overflow-x-auto scrollbar-hide pb-2" dir={isRTL ? 'rtl' : 'ltr'}>
            <TabsList
              className="admin-settings-tabs flex h-auto w-full min-w-max gap-2 bg-transparent p-0 text-slate-600 dark:text-slate-300 [&_[data-state=active]]:bg-slate-100 [&_[data-state=active]]:text-slate-950 [&_[data-state=active]]:shadow-none dark:[&_[data-state=active]]:bg-slate-800 dark:[&_[data-state=active]]:text-white"
              data-testid="tabs-settings"
            >
              <TabsTrigger
                value="general"
                className="h-9 gap-1 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-general"
              >
                <Building2 className="h-4 shrink-0" />
                <span className="hidden sm:inline">{t('adminPanel.admin.settings.generalTab', 'General')}</span>
                <span className="sm:hidden">{t('adminPanel.admin.settings.generalTab', 'General')}</span>
              </TabsTrigger>
              {/* <TabsTrigger
                value="currency"
                className="gap-1 whitespace-nowrap"
                data-testid="tab-currency"
              >
                <DollarSign className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t('adminPanel.admin.settings.currencyTab', 'Currency')}</span>
                <span className="sm:hidden">Currency</span>
              </TabsTrigger> */}
              <TabsTrigger value="smtp" className="h-9 gap-1 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white" data-testid="tab-smtp">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t('adminPanel.admin.settings.smtpTab', 'SMTP')}</span>
                <span className="sm:hidden">{t('adminPanel.admin.settings.smtpTab', 'SMTP')}</span>
              </TabsTrigger>
              <TabsTrigger
                value="firebase"
                className="h-9 gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-firebase"
              >
                <Flame className="h-4 w-4 shrink-0" />
                {t('adminPanel.admin.settings.firebaseTab', 'Firebase')}
              </TabsTrigger>

              <TabsTrigger
                value="onesignal"
                className="h-9 gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-onesignal"
              >
                <BellRing className="h-4 w-4 shrink-0" />
                {t('adminPanel.admin.settings.onesignalTab', 'OneSignal')}
              </TabsTrigger>

              <TabsTrigger
                value="recaptcha"
                className="h-9 gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-recaptcha"
              >
                <Bot className="h-4 w-4 shrink-0" />
                {t("adminPanel.admin.settings.recaptchaTab","reCAPTCHA")}
              </TabsTrigger>

              <TabsTrigger
                value="app-store"
                className="h-9 gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-app-store"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("adminPanel.admin.settings.appStoresTab", "App Stores")}</span>
                <span className="sm:hidden">{t("adminPanel.admin.settings.appStoresShortTab", "Apps")}</span>
              </TabsTrigger>

              <TabsTrigger
                value="registration-bonus"
                className="h-9 gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-registration-bonus"
              >
                <Gift className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("adminPanel.admin.settings.registrationBonusTab", "Registration Bonus")}</span>
                <span className="sm:hidden">{t("adminPanel.admin.settings.registrationBonusShortTab", "Bonus")}</span>
              </TabsTrigger>

              <TabsTrigger
                value="sandbox-demo"
                className="h-9 gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-sandbox-demo"
              >
                <Bot className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("adminPanel.admin.settings.sandboxDemoTab", "Sandbox Demo")}</span>
                <span className="sm:hidden">{t("adminPanel.admin.settings.sandboxShortTab", "Sandbox")}</span>
              </TabsTrigger>

              <TabsTrigger
                value="whatsapp"
                className="h-9 gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-whatsapp"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("adminPanel.admin.settings.whatsappTab", "WhatsApp")}</span>
                <span className="sm:hidden">{t("adminPanel.admin.settings.whatsappTab", "WhatsApp")}</span>
              </TabsTrigger>

              <TabsTrigger
                value="desktop-privacy"
                className="h-9 gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-desktop-privacy"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Desktop Privacy</span>
                <span className="sm:hidden">Desktop</span>
              </TabsTrigger>

              <TabsTrigger
                value="concierge"
                className="h-9 gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-concierge"
              >
                <Headset className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("adminPanel.admin.settings.conciergeTab", "Concierge")}</span>
                <span className="sm:hidden">{t("adminPanel.admin.settings.conciergeTab", "Concierge")}</span>
              </TabsTrigger>

              <TabsTrigger
                value="vonage"
                className="h-9 gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-vonage"
              >
                <MessageSquareText className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("adminPanel.admin.settings.vonageTab", "Vonage")}</span>
                <span className="sm:hidden">{t("adminPanel.admin.settings.vonageTab", "Vonage")}</span>
              </TabsTrigger>

              <TabsTrigger
                value="theme"
                className="h-9 gap-1 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-theme"
              >
                <Palette className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("adminPanel.admin.settings.appearanceTab", "Appearance")}</span>
                <span className="sm:hidden">{t("adminPanel.admin.settings.themeShortTab", "Theme")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="social-media"
                className="h-9 gap-1 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="social-media"
              >
                <Palette className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("adminPanel.admin.settings.socialMediaTab","Social Media")}</span>
                <span className="sm:hidden">{t("adminPanel.admin.settings.socialMediaShortTab","Social")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="seo"
                className="h-9 gap-1 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-seo"
              >
                <Globe className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("adminPanel.admin.settings.seoTab","SEO & Meta")}</span>
                <span className="sm:hidden">{t("adminPanel.admin.settings.seoShortTab","SEO")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="account"
                className="h-9 gap-1 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-account"
              >
                <User className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("adminPanel.admin.settings.accountTab","Account & Security")}</span>
                <span className="sm:hidden">{t("adminPanel.admin.settings.accountShortTab","Account")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="popup"
                className="h-9 gap-1 rounded-md px-3 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white"
                data-testid="tab-popup"
              >
                <ImageIcon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("adminPanel.admin.settings.popupTab","Homepage Popup")}</span>
                <span className="sm:hidden">{t("adminPanel.admin.settings.popupShortTab","Popup")}</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>

        {/* Currency Management Tab */}
        <TabsContent value="currency" className="space-y-4">
          <CurrencyManagement />
        </TabsContent>

        {/* Payment Methods Tab */}
        {/* <TabsContent value="payment-methods" className="space-y-4">
          <PaymentMethodsManagement />
        </TabsContent> */}

        <TabsContent value="smtp" className="space-y-4">
          <SMTPSettings />
        </TabsContent>

        <TabsContent value="firebase" className="space-y-4">
          <FirebaseSettings />
        </TabsContent>

        <TabsContent value="onesignal" className="space-y-4">
          <OneSignalSettings />
        </TabsContent>

        <TabsContent value="recaptcha" className="space-y-4">
          <ReCaptchaSettings />
        </TabsContent>

        <TabsContent value="app-store" className="space-y-4">
          <AppStoreSettings />
        </TabsContent>

        <TabsContent value="registration-bonus" className="space-y-4">
          <RegistrationBonusSettings />
        </TabsContent>

        <TabsContent value="sandbox-demo" className="space-y-4">
          <SandboxDemoSettings />
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <WhatsAppSettingsTab />
        </TabsContent>

        <TabsContent value="desktop-privacy" className="space-y-4">
          <DesktopPrivacySettings />
        </TabsContent>

        <TabsContent value="concierge" className="space-y-4">
          <ConciergeSettingsTab />
        </TabsContent>

        <TabsContent value="vonage" className="space-y-4">
          <VonageSettingsTab />
        </TabsContent>

        <TabsContent value="theme" className="space-y-4">
          <ThemeSettings />
        </TabsContent>

        <TabsContent value="social-media" className="space-y-4">
          <SocialMediaSettings />
        </TabsContent>
        <TabsContent value="seo" className="space-y-4">
          <SEOSettings />
        </TabsContent>
        <TabsContent value="account" className="space-y-4">
          <AdminAccountSettings />
        </TabsContent>
        <TabsContent value="popup" className="space-y-4">
          <HomepagePopupSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
