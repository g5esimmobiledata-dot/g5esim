// components/admin/tabs/GeneralSettings.tsx - Complete with internal state management
import { useState, useEffect, useMemo } from 'react';
import {
  Save,
  Building2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Brain,
  Zap,
  TrendingUp,
  Settings2,
  Play,
  RefreshCw,
  Globe,
  MessageCircle,
  Clock3,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useTranslation } from '@/contexts/TranslationContext';
import type { CurrencyRate } from '@shared/schema';

import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { SettingsResponse } from '@/types/types';
import { useAppDispatch } from '@/redux/store/store';
import { setSettings } from '@/redux/slice/settingsSlice';

interface AIStatus {
  isConfigured: boolean;
  isReady: boolean;
  maskedKey: string | null;
  apiKeySource?: 'env' | 'admin' | null;
  aiEnabled: boolean;
  weights: {
    price: number;
    quality: number;
    provider: number;
  };
  usage: {
    totalRequests: number;
    totalTokens: number;
    estimatedCost: number;
    errors: number;
    lastRequestAt: string | null;
  };
}

function AISettingsCard() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [aiEnabled, setAiEnabled] = useState(false);
  const [priceWeight, setPriceWeight] = useState(50);
  const [qualityWeight, setQualityWeight] = useState(30);
  const [providerWeight, setProviderWeight] = useState(20);
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const { data: aiStatus, refetch: refetchStatus } = useQuery<AIStatus>({
    queryKey: ['/api/admin/ai-settings/status'],
  });

  useEffect(() => {
    if (aiStatus) {
      setAiEnabled(aiStatus.aiEnabled);
      setPriceWeight(aiStatus.weights.price);
      setQualityWeight(aiStatus.weights.quality);
      setProviderWeight(aiStatus.weights.provider);
    }
  }, [aiStatus]);

  const saveAISettings = useMutation({
    mutationFn: async (data: {
      enabled?: boolean;
      priceWeight?: number;
      qualityWeight?: number;
      providerWeight?: number;
      apiKey?: string;
    }) => {
      return await apiRequest('POST', '/api/admin/ai-settings/update', data);
    },
    onSuccess: () => {
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-settings'] });
      toast({ title: 'Success', description: 'AI settings updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await apiRequest('POST', '/api/admin/ai-settings/test');
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Connection Successful',
          description: `Latency: ${data.data?.latencyMs}ms`,
        });
      } else {
        toast({ title: 'Connection Failed', description: data.message, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const runAISelection = async () => {
    setRunning(true);
    try {
      const res = await apiRequest('POST', '/api/admin/ai-settings/run-selection');
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'AI Selection Complete',
          description: `Enabled: ${data.data?.packagesEnabled}, Disabled: ${data.data?.packagesDisabled}`,
        });
        refetchStatus();
      } else {
        toast({ title: 'Failed', description: data.message, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const handleSaveWeights = () => {
    const total = priceWeight + qualityWeight + providerWeight;
    if (total !== 100) {
      toast({
        title: 'Invalid Weights',
        description: 'Weights must sum to 100%',
        variant: 'destructive',
      });
      return;
    }
    saveAISettings.mutate({ priceWeight, qualityWeight, providerWeight });
  };

  const handleToggleAI = (enabled: boolean) => {
    setAiEnabled(enabled);
    saveAISettings.mutate({ enabled });
  };

  const handleSaveApiKey = () => {
    const value = apiKey.trim();
    if (!value) {
      toast({ title: 'API key required', description: 'Paste an OpenAI API key before saving.', variant: 'destructive' });
      return;
    }
    saveAISettings.mutate(
      { apiKey: value },
      {
        onSuccess: () => {
          setApiKey('');
          refetchStatus();
          toast({ title: 'OpenAI key saved', description: 'The AI client was updated and is ready to test.' });
        },
      },
    );
  };

  return (
    <Card className="border-0 shadow-xl hover:shadow-[0_25px_50px_-12px_color-mix(in_srgb,var(--primary-hex)_30%,transparent)] transition-all duration-500">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent flex items-center gap-2">
          <Brain className="h-6 w-6 text-[var(--primary-hex)]" />
          {t('adminPanel.admin.settings.ai.title', 'AI-Enhanced Package Selection')}
        </CardTitle>
        <CardDescription className="text-lg text-[var(--primary-hex)]/70">
          {t(
            'adminPanel.admin.settings.ai.description',
            'Use AI to intelligently select the best packages considering price, quality, and provider reliability',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-8">
        {/* Connection Status */}
        <div className="p-4 md:p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-muted/30 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 md:gap-3">
              <Zap className="h-4 w-4 md:h-5 md:w-5 text-[var(--primary-hex)]" />
              <span className="text-lg md:text-xl font-bold">OpenAI Connection</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={aiStatus?.isReady ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}>
                {aiStatus?.isReady ? 'Connected' : 'Not Connected'}
              </Badge>
              {aiStatus?.maskedKey && (
                <span className="text-[10px] md:text-xs text-muted-foreground font-mono">
                  {aiStatus.maskedKey}
                  {aiStatus.apiKeySource ? ` (${aiStatus.apiKeySource})` : ''}
                </span>
              )}
            </div>
          </div>

          {!aiStatus?.isConfigured && (
            <div className="p-3 md:p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4">
              <p className="text-xs md:text-sm text-amber-600 dark:text-amber-400">
                Add <code className="font-mono bg-muted px-1 rounded">OPENAI_API_KEY</code> here or in the server environment to enable features.
              </p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Paste OpenAI API key"
              autoComplete="off"
              className="font-mono"
            />
            <Button
              type="button"
              onClick={handleSaveApiKey}
              disabled={saveAISettings.isPending || !apiKey.trim()}
              className="w-full md:w-auto"
            >
              {saveAISettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Key
            </Button>
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing || !aiStatus?.isConfigured}
              className="w-full md:w-auto text-sm h-10"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Test Connection
            </Button>
          </div>
        </div>

        {/* AI Toggle */}
        <div className="p-6 rounded-2xl border-2 border-border">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xl font-bold mb-1 flex items-center gap-2">
                <Brain className="h-5 w-5 text-[var(--primary-hex)]" />
                Enable AI Selection
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, AI analyzes Packages and scores them based on value, not just price
              </p>
            </div>
            <Switch
              checked={aiEnabled}
              onCheckedChange={handleToggleAI}
              disabled={!aiStatus?.isReady || saveAISettings.isPending}
              data-testid="switch-ai-enabled"
            />
          </div>
        </div>

        {/* Scoring Weights */}
        {aiEnabled && (
          <div className="p-6 rounded-2xl border-2 border-[var(--primary-hex)]/30 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent">
            <div className="flex items-center gap-2 mb-6">
              <Settings2 className="h-5 w-5 text-[var(--primary-hex)]" />
              <span className="text-xl font-bold">Scoring Weights</span>
              <Badge variant="outline" className="ml-auto">
                Total: {priceWeight + qualityWeight + providerWeight}%
              </Badge>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Price Weight</Label>
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {priceWeight}%
                  </span>
                </div>
                <Slider
                  value={[priceWeight]}
                  onValueChange={([v]) => setPriceWeight(v)}
                  max={100}
                  step={5}
                  data-testid="slider-price-weight"
                />
                <p className="text-xs text-muted-foreground">How much to prioritize lower prices</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Quality Weight</Label>
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {qualityWeight}%
                  </span>
                </div>
                <Slider
                  value={[qualityWeight]}
                  onValueChange={([v]) => setQualityWeight(v)}
                  max={100}
                  step={5}
                  data-testid="slider-quality-weight"
                />
                <p className="text-xs text-muted-foreground">
                  AI-analyzed value (data/price ratio, validity, features)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Provider Weight</Label>
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {providerWeight}%
                  </span>
                </div>
                <Slider
                  value={[providerWeight]}
                  onValueChange={([v]) => setProviderWeight(v)}
                  max={100}
                  step={5}
                  data-testid="slider-provider-weight"
                />
                <p className="text-xs text-muted-foreground">
                  Provider reliability and reputation score
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleSaveWeights}
                disabled={saveAISettings.isPending}
                className="bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)]"
                data-testid="button-save-weights"
              >
                {saveAISettings.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Weights
              </Button>
              <Button
                variant="outline"
                onClick={runAISelection}
                disabled={running}
                data-testid="button-run-ai"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Run AI Selection Now
              </Button>
            </div>
          </div>
        )}

        {/* Usage Stats */}
        {aiStatus?.usage && aiStatus.usage.totalRequests > 0 && (
          <div className="p-6 rounded-xl bg-gradient-to-r from-[var(--primary-light-hex)]/20 to-transparent border border-[var(--primary-hex)]/30">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-[var(--primary-hex)]" />
              <span className="text-lg font-bold text-[var(--primary-hex)]">
                AI Usage Statistics
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{aiStatus.usage.totalRequests}</div>
                <div className="text-xs text-muted-foreground">Requests</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {(aiStatus.usage.totalTokens / 1000).toFixed(1)}k
                </div>
                <div className="text-xs text-muted-foreground">Tokens</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">${aiStatus.usage.estimatedCost.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Est. Cost</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{aiStatus.usage.errors}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>
          </div>
        )}

        {/* AI Features List */}
        <div className="p-6 rounded-xl bg-gradient-to-r from-[var(--primary-light-hex)]/20 to-transparent border border-[var(--primary-hex)]/30">
          <p className="text-lg font-bold mb-3 text-[var(--primary-hex)]">AI-Powered Features</p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Composite scoring combining price, quality, and provider reliability
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Intelligent package analysis with value assessments
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Automatic fallback to price-only mode if AI unavailable
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              24-hour result caching to minimize API costs
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

type FileUploadControlProps = {
  id: string;
  accept?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  hasFile: boolean;
  chooseLabel: string;
  selectedLabel: string;
  emptyLabel: string;
  dark?: boolean;
};

function FileUploadControl({
  id,
  accept,
  onChange,
  hasFile,
  chooseLabel,
  selectedLabel,
  emptyLabel,
  dark = false,
}: FileUploadControlProps) {
  return (
    <div
      className={`flex h-10 min-w-0 flex-1 items-center justify-between gap-3 rounded-md border px-3 text-sm ${
        dark
          ? 'border-slate-700 bg-slate-950 text-slate-200'
          : 'border-[var(--primary-hex)]/20 bg-slate-950 text-white'
      }`}
    >
      <input id={id} type="file" accept={accept} onChange={onChange} className="sr-only" />
      <span className="min-w-0 truncate text-xs">{hasFile ? selectedLabel : emptyLabel}</span>
      <label
        htmlFor={id}
        className="shrink-0 cursor-pointer rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20"
      >
        {chooseLabel}
      </label>
    </div>
  );
}

export function GeneralSettings() {
  const { t, isRTL } = useTranslation();
  const { toast } = useToast();

  const dispatch = useAppDispatch();

  // Internal state management
  const [platformName, setPlatformName] = useState('');
  const [platformTagline, setPlatformTagline] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [darkLogo, setDarkLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [copyrightText, setCopyrightText] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [email, setEmail] = useState('');
  const [packageSelectionMode, setPackageSelectionMode] = useState<'auto' | 'manual'>('auto');
  const [showDemoLogin, setShowDemoLogin] = useState(false);
  const [supportWhatsappNumber, setSupportWhatsappNumber] = useState('');
  const [supportWhatsappEnabled, setSupportWhatsappEnabled] = useState(true);
  const [supportWhatsappScheduleEnabled, setSupportWhatsappScheduleEnabled] = useState(false);
  const [supportWhatsappStartTime, setSupportWhatsappStartTime] = useState('09:00');
  const [supportWhatsappEndTime, setSupportWhatsappEndTime] = useState('18:00');
  const [supportWhatsappWorkingDays, setSupportWhatsappWorkingDays] = useState<string[]>([
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
  ]);
  const [conciergeEnabled, setConciergeEnabled] = useState(true);
  const [conciergePricingMode, setConciergePricingMode] = useState<'free' | 'paid'>('free');
  const [conciergeBillingCycle, setConciergeBillingCycle] = useState<'one_time' | 'monthly'>('one_time');
  const [conciergeFee, setConciergeFee] = useState('');
  const [conciergeTrialEnabled, setConciergeTrialEnabled] = useState(true);
  const [conciergeTrialDays, setConciergeTrialDays] = useState('7');

  const weekdayOptions = [
    { value: 'sun', label: 'Sun' },
    { value: 'mon', label: 'Mon' },
    { value: 'tue', label: 'Tue' },
    { value: 'wed', label: 'Wed' },
    { value: 'thu', label: 'Thu' },
    { value: 'fri', label: 'Fri' },
    { value: 'sat', label: 'Sat' },
  ];

  // Fetch settings from API
  const { data: settingsResponse } = useQuery<SettingsResponse>({
    queryKey: ['/api/admin/settings'],
  });



  // console.log('settingsResponse', settingsResponse);

  // Fetch available currencies
  const { data: currencies = [] } = useQuery<CurrencyRate[]>({
    queryKey: ['/api/admin/currencies'],
  });

  // Transform settings array to object
  const settings = useMemo(() => {
    if (!settingsResponse) return {};

    return settingsResponse?.reduce((acc: Record<string, string>, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  }, [settingsResponse]);

  // Load settings into state
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setPlatformName(settings.platform_name || '');
      setPlatformTagline(settings.platform_tagline || '');
      setLogo(settings.logo || null);
      setDarkLogo(settings.dark_logo || null);
      setFavicon(settings.favicon || null);
      setCopyrightText(settings.copyright_text || '');
      setCurrency(settings.currency || 'USD');
      setEmail(settings.email || '')
      setPackageSelectionMode((settings.package_selection_mode as 'auto' | 'manual') || 'auto');
      setShowDemoLogin(settings.show_demo_login === 'true');
      setSupportWhatsappNumber(settings.support_whatsapp_number || '');
      setSupportWhatsappEnabled(settings.support_whatsapp_enabled !== 'false');
      setSupportWhatsappScheduleEnabled(settings.support_whatsapp_schedule_enabled === 'true');
      setSupportWhatsappStartTime(settings.support_whatsapp_start_time || '09:00');
      setSupportWhatsappEndTime(settings.support_whatsapp_end_time || '18:00');
      setSupportWhatsappWorkingDays(
        String(settings.support_whatsapp_working_days || 'mon,tue,wed,thu,fri')
          .split(',')
          .map((day) => day.trim().toLowerCase())
          .filter(Boolean),
      );
      setConciergeEnabled(settings.concierge_enabled !== 'false');
      setConciergePricingMode((settings.concierge_pricing_mode as 'free' | 'paid') || 'free');
      setConciergeBillingCycle((settings.concierge_billing_cycle as 'one_time' | 'monthly') || 'one_time');
      setConciergeFee(settings.concierge_fee || '');
      setConciergeTrialEnabled(settings.concierge_trial_enabled !== 'false');
      setConciergeTrialDays(settings.concierge_trial_days || '7');
    }
  }, [settings]);

  // Update setting mutation
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
      queryClient.invalidateQueries({ queryKey: ['/api/public/settings'] });
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

  // Save single setting
  const saveSetting = async (key: string, value: string, category: string = 'general') => {
    await updateSettingMutation.mutateAsync({ key, value, category });
  };

  // Handle general settings save
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
    await saveSetting('email', email, 'general');
    await saveSetting('show_demo_login', String(showDemoLogin), 'general');
    await saveSetting('package_selection_mode', packageSelectionMode, 'general');
    await saveSetting('support_whatsapp_number', supportWhatsappNumber, 'general');
    await saveSetting('support_whatsapp_enabled', String(supportWhatsappEnabled), 'general');
    await saveSetting('support_whatsapp_schedule_enabled', String(supportWhatsappScheduleEnabled), 'general');
    await saveSetting('support_whatsapp_start_time', supportWhatsappStartTime, 'general');
    await saveSetting('support_whatsapp_end_time', supportWhatsappEndTime, 'general');
    await saveSetting('support_whatsapp_working_days', supportWhatsappWorkingDays.join(','), 'general');
    await saveSetting('concierge_enabled', String(conciergeEnabled), 'general');
    await saveSetting('concierge_pricing_mode', conciergePricingMode, 'general');
    await saveSetting('concierge_billing_cycle', conciergeBillingCycle, 'general');
    await saveSetting('concierge_fee', conciergeFee, 'general');
    await saveSetting('concierge_trial_enabled', String(conciergeTrialEnabled), 'general');
    await saveSetting('concierge_trial_days', conciergeTrialDays, 'general');
    if (logo) {
      await saveSetting('logo', logo, 'general');
    }
    if (darkLogo) {
      await saveSetting('dark_logo', darkLogo, 'general');
    }
    if (favicon) {
      await saveSetting('favicon', favicon, 'general');
    }
  };

  // Upload image helper
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await apiRequest('POST', '/api/upload', formData);

    if (!res.ok) {
      throw new Error(t('adminPanel.admin.settings.general.imageUploadFailed', 'Image upload failed'));
    }

    const data = await res.json();
    const fileUrl = data?.data?.fileUrl || data?.fileUrl;

    if (!fileUrl) {
      throw new Error(
        t(
          'adminPanel.admin.settings.general.uploadMissingUrl',
          'Upload completed but no file URL was returned',
        ),
      );
    }

    return fileUrl;
  };

  const getUploadErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const path = await uploadImage(file);
      // console.log('path', path);
      setLogo(path);
      toast({
        title: t('adminPanel.admin.settings.success', 'Success'),
        description: t('adminPanel.admin.settings.general.logoUploaded', 'Logo uploaded successfully'),
      });
    } catch (err) {
      console.error(err);
      toast({
        title: t('adminPanel.admin.settings.error', 'Error'),
        description: getUploadErrorMessage(
          err,
          t('adminPanel.admin.settings.general.logoUploadFailed', 'Failed to upload logo'),
        ),
        variant: 'destructive',
      });
    }
  };

  // Handle dark logo upload
  const handleDarkLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const path = await uploadImage(file);
      setDarkLogo(path);
      toast({
        title: t('adminPanel.admin.settings.success', 'Success'),
        description: t('adminPanel.admin.settings.general.darkLogoUploaded', 'Dark logo uploaded successfully'),
      });
    } catch (err) {
      console.error(err);
      toast({
        title: t('adminPanel.admin.settings.error', 'Error'),
        description: getUploadErrorMessage(
          err,
          t('adminPanel.admin.settings.general.darkLogoUploadFailed', 'Failed to upload dark logo'),
        ),
        variant: 'destructive',
      });
    }
  };

  // Handle favicon upload
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const path = await uploadImage(file);
      // console.log('path', path);
      setFavicon(path);
      toast({
        title: t('adminPanel.admin.settings.success', 'Success'),
        description: t('adminPanel.admin.settings.general.faviconUploaded', 'Favicon uploaded successfully'),
      });
    } catch (err) {
      console.error(err);
      toast({
        title: t('adminPanel.admin.settings.error', 'Error'),
        description: getUploadErrorMessage(
          err,
          t('adminPanel.admin.settings.general.faviconUploadFailed', 'Failed to upload favicon'),
        ),
        variant: 'destructive',
      });
    }
  };

  const toggleWorkingDay = (day: string) => {
    setSupportWhatsappWorkingDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  const conciergePricingDisplay = useMemo(() => {
    if (conciergePricingMode !== 'paid') {
      return t('adminPanel.admin.settings.general.free', 'Free');
    }

    const amount = conciergeFee.trim() ? `$${conciergeFee.trim()}` : '';
    if (!amount) {
      return conciergeBillingCycle === 'monthly'
        ? t('adminPanel.admin.settings.general.paidMonthly', 'Paid monthly')
        : t('adminPanel.admin.settings.general.paidOneTime', 'Paid one time');
    }

    return conciergeBillingCycle === 'monthly'
      ? t('adminPanel.admin.settings.general.amountPerMonth', '{amount}/month', { amount })
      : t('adminPanel.admin.settings.general.amountOneTime', '{amount} one time', { amount });
  }, [conciergeBillingCycle, conciergeFee, conciergePricingMode, t]);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Platform Information Card */}
      <Card className="border-0 shadow-xl hover:shadow-[0_25px_50px_-12px_color-mix(in_srgb,var(--primary-hex)_30%,transparent)] transition-all duration-500">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Icon Container: Responsive sizing and brand gradient */}
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
              <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            </div>

            <div className="space-y-1">
              {/* Title: Gradient text with responsive sizing */}
              <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] via-[var(--primary-second-hex)] to-[var(--primary-light-hex)] bg-clip-text text-transparent">
                {t('adminPanel.admin.settings.general.platformInfoTitle', 'Platform Information')}
              </CardTitle>

              {/* Description: Clean typography with primary-hex opacity */}
              <CardDescription className="text-sm sm:text-base md:text-lg text-[var(--primary-hex)]/70 leading-relaxed">
                {t(
                  'adminPanel.admin.settings.general.platformInfoDescription',
                  "Configure your platform's basic information and branding"
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>


        <CardContent className="p-4 sm:p-8 space-y-6 sm:space-y-8">
          <div className="flex flex-col gap-8">
            {/* Form Section */}
            <div className="space-y-5">
              {/* Platform Name */}
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[var(--primary-hex)]" />
                  {t('adminPanel.admin.settings.general.platformName', 'Platform Name')}
                </Label>
                <Input
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder={t('adminPanel.admin.settings.general.platformNamePlaceholder', 'My eSIM Store')}
                  className="h-12 text-base ring-1 ring-[var(--primary-hex)]/20 focus:ring-2"
                />
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  {t('adminPanel.admin.settings.general.tagline', 'Tagline')}
                </Label>
                <Input
                  value={platformTagline}
                  onChange={(e) => setPlatformTagline(e.target.value)}
                  placeholder={t('adminPanel.admin.settings.general.taglinePlaceholder', 'Global connectivity made easy')}
                  className="h-12"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[var(--primary-hex)]" />
                  {t('adminPanel.admin.settings.general.email', 'Email')}
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-12"
                />
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  {t('adminPanel.admin.settings.general.currency', 'Default Currency')}
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={t('adminPanel.admin.settings.general.selectCurrency', 'Select currency')} />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.id} value={curr.code}>
                        <span className="flex items-center gap-2 text-sm">
                          <span className="font-mono">{curr.symbol}</span>
                          <span>{curr.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs font-medium p-3 bg-[var(--primary-light-hex)]/10 rounded-lg border border-[var(--primary-hex)]/10">
                  {t('adminPanel.admin.settings.general.currencyHelp', 'Manage currencies in Platform Setup.')}
                </p>
              </div>

              <div className="space-y-4 rounded-2xl border border-[var(--primary-hex)]/20 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-lg font-semibold flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-[var(--primary-hex)]" />
                      {t('adminPanel.admin.settings.general.whatsappSupport', 'WhatsApp Support')}
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(
                        'adminPanel.admin.settings.general.whatsappSupportDescription',
                        'Set the support number and control when the chat icon appears.',
                      )}
                    </p>
                  </div>
                  <Switch checked={supportWhatsappEnabled} onCheckedChange={setSupportWhatsappEnabled} />
                </div>

                <div className="space-y-2">
                  <Label>{t('adminPanel.admin.settings.general.whatsappNumber', 'WhatsApp Number')}</Label>
                  <Input
                    value={supportWhatsappNumber}
                    onChange={(e) => setSupportWhatsappNumber(e.target.value)}
                    placeholder="+971501234567"
                    className="h-12"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[var(--primary-hex)]/20 bg-background/70 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-[var(--primary-hex)]" />
                    <div>
                      <p className="font-medium">
                        {t('adminPanel.admin.settings.general.useWorkingSchedule', 'Use Working Schedule')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          'adminPanel.admin.settings.general.useWorkingScheduleDescription',
                          'Only show WhatsApp during working hours.',
                        )}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={supportWhatsappScheduleEnabled}
                    onCheckedChange={setSupportWhatsappScheduleEnabled}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('adminPanel.admin.settings.general.startTime', 'Start Time')}</Label>
                    <Input
                      type="time"
                      value={supportWhatsappStartTime}
                      onChange={(e) => setSupportWhatsappStartTime(e.target.value)}
                      disabled={!supportWhatsappScheduleEnabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('adminPanel.admin.settings.general.endTime', 'End Time')}</Label>
                    <Input
                      type="time"
                      value={supportWhatsappEndTime}
                      onChange={(e) => setSupportWhatsappEndTime(e.target.value)}
                      disabled={!supportWhatsappScheduleEnabled}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('adminPanel.admin.settings.general.workingDays', 'Working Days')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {weekdayOptions.map((day) => {
                      const active = supportWhatsappWorkingDays.includes(day.value);
                      return (
                        <Button
                          key={day.value}
                          type="button"
                          variant={active ? 'default' : 'outline'}
                          className={active ? 'bg-primary-gradient text-white' : ''}
                          disabled={!supportWhatsappScheduleEnabled}
                          onClick={() => toggleWorkingDay(day.value)}
                        >
                          {t(`adminPanel.admin.settings.general.weekdays.${day.value}`, day.label)}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-[var(--primary-hex)]/20 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[var(--primary-hex)]" />
                      {t('adminPanel.admin.settings.general.concierge', 'Concierge')}
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(
                        'adminPanel.admin.settings.general.conciergeDescription',
                        'Choose whether Concierge is free or paid.',
                      )}
                    </p>
                  </div>
                  <Switch checked={conciergeEnabled} onCheckedChange={setConciergeEnabled} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={conciergePricingMode === 'free' ? 'default' : 'outline'}
                    className={conciergePricingMode === 'free' ? 'bg-primary-gradient text-white' : ''}
                    disabled={!conciergeEnabled}
                    onClick={() => setConciergePricingMode('free')}
                  >
                    {t('adminPanel.admin.settings.general.free', 'Free')}
                  </Button>
                  <Button
                    type="button"
                    variant={conciergePricingMode === 'paid' ? 'default' : 'outline'}
                    className={conciergePricingMode === 'paid' ? 'bg-primary-gradient text-white' : ''}
                    disabled={!conciergeEnabled}
                    onClick={() => setConciergePricingMode('paid')}
                  >
                    {t('adminPanel.admin.settings.general.paid', 'Paid')}
                  </Button>
                  <Button
                    type="button"
                    variant={conciergeBillingCycle === 'one_time' ? 'default' : 'outline'}
                    className={conciergeBillingCycle === 'one_time' ? 'bg-primary-gradient text-white' : ''}
                    disabled={!conciergeEnabled || conciergePricingMode !== 'paid'}
                    onClick={() => setConciergeBillingCycle('one_time')}
                  >
                    {t('adminPanel.admin.settings.general.oneTime', 'One Time')}
                  </Button>
                  <Button
                    type="button"
                    variant={conciergeBillingCycle === 'monthly' ? 'default' : 'outline'}
                    className={conciergeBillingCycle === 'monthly' ? 'bg-primary-gradient text-white' : ''}
                    disabled={!conciergeEnabled || conciergePricingMode !== 'paid'}
                    onClick={() => setConciergeBillingCycle('monthly')}
                  >
                    {t('adminPanel.admin.settings.general.monthly', 'Monthly')}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>{t('adminPanel.admin.settings.general.conciergeFee', 'Concierge Fee')}</Label>
                  <Input
                    value={conciergeFee}
                    onChange={(e) => setConciergeFee(e.target.value)}
                    placeholder="29.00"
                    disabled={!conciergeEnabled || conciergePricingMode !== 'paid'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('adminPanel.admin.settings.general.currentDisplay', 'Current display: {value}', {
                      value: conciergePricingDisplay,
                    })}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-xl border border-[var(--primary-hex)]/20 bg-background/70 px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {t('adminPanel.admin.settings.general.freeTrial', 'Free Trial')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          'adminPanel.admin.settings.general.freeTrialDescription',
                          'Let users try paid Concierge before paying.',
                        )}
                      </p>
                    </div>
                    <Switch
                      checked={conciergeTrialEnabled}
                      onCheckedChange={setConciergeTrialEnabled}
                      disabled={!conciergeEnabled || conciergePricingMode !== 'paid'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('adminPanel.admin.settings.general.trialDays', 'Trial Days')}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={conciergeTrialDays}
                      onChange={(e) => setConciergeTrialDays(e.target.value)}
                      disabled={
                        !conciergeEnabled ||
                        conciergePricingMode !== 'paid' ||
                        !conciergeTrialEnabled
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {t(
                        'adminPanel.admin.settings.general.trialDaysDescription',
                        'The customer app will show this trial before paid activation.',
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Assets Section (Logo Uploads) */}
            <div className="space-y-4">
              {/* Light Logo */}
              <div className="p-4 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent border border-[var(--primary-hex)]/20 rounded-xl">
                <Label className="text-sm font-bold text-[var(--primary-hex)] flex items-center gap-2 mb-3">
                  <ImageIcon className="h-4 w-4" />
                  {t('adminPanel.admin.settings.general.logo', 'Platform Logo')}
                </Label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden dark:bg-slate-900 dark:text-white bg-white shadow-sm border border-[var(--primary-hex)]/20 flex items-center justify-center">
                    {logo ? (
                      <img
                        src={logo}
                        alt={t('adminPanel.admin.settings.general.logoPreview', 'Logo preview')}
                        className="max-h-16 max-w-16 object-contain"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 opacity-30" />
                    )}
                  </div>
                  <FileUploadControl
                    id="platform-logo-upload"
                    onChange={handleLogoUpload}
                    hasFile={Boolean(logo)}
                    chooseLabel={t('adminPanel.admin.settings.general.chooseFile', 'Choose File')}
                    selectedLabel={t('adminPanel.admin.settings.general.fileSelected', 'File selected')}
                    emptyLabel={t('adminPanel.admin.settings.general.noFileChosen', 'No file chosen')}
                  />
                </div>
              </div>

              {/* Dark Logo */}
              <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl">
                <Label className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <ImageIcon className="h-4 w-4" />
                  {t('adminPanel.admin.settings.general.darkLogo', 'Platform Dark Logo')}
                </Label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-slate-800 border border-slate-600 flex items-center justify-center">
                    {darkLogo ? (
                      <img
                        src={darkLogo}
                        alt={t('adminPanel.admin.settings.general.darkLogoPreview', 'Dark logo preview')}
                        className="max-h-16 max-w-16 object-contain"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-slate-500 opacity-50" />
                    )}
                  </div>
                  <FileUploadControl
                    id="platform-dark-logo-upload"
                    onChange={handleDarkLogoUpload}
                    hasFile={Boolean(darkLogo)}
                    chooseLabel={t('adminPanel.admin.settings.general.chooseFile', 'Choose File')}
                    selectedLabel={t('adminPanel.admin.settings.general.fileSelected', 'File selected')}
                    emptyLabel={t('adminPanel.admin.settings.general.noFileChosen', 'No file chosen')}
                    dark
                  />
                </div>
              </div>

              {/* Favicon Upload */}
              <div className="space-y-4 p-6 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent border border-[var(--primary-hex)]/20 rounded-2xl">
                <Label className="text-lg font-bold text-[var(--primary-hex)]">
                  {t('adminPanel.admin.settings.general.favicon', 'Favicon')}
                </Label>

                <div className="flex items-center gap-4">
                  {favicon ? (
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-white dark:bg-black/20 shadow-lg border-2 border-[var(--primary-hex)]/30 flex items-center justify-center hover:scale-105 transition-all duration-300">
                      <img
                        src={favicon}
                        alt={t('adminPanel.admin.settings.general.faviconPreview', 'Favicon preview')}
                        className="h-10 w-10 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-lg border-2 border-dashed border-[var(--primary-hex)]/50 flex items-center justify-center text-[var(--primary-hex)] bg-[var(--primary-light-hex)]/20 text-xs font-semibold hover:scale-105 transition-all duration-300">
                      {t('adminPanel.admin.settings.general.noFavicon', 'No Favicon')}
                    </div>
                  )}

                  <div className="flex-1">
                    <FileUploadControl
                      id="platform-favicon-upload"
                      accept="image/png,image/x-icon,image/svg+xml"
                      onChange={handleFaviconUpload}
                      hasFile={Boolean(favicon)}
                      chooseLabel={t('adminPanel.admin.settings.general.chooseFile', 'Choose File')}
                      selectedLabel={t('adminPanel.admin.settings.general.fileSelected', 'File selected')}
                      emptyLabel={t('adminPanel.admin.settings.general.noFileChosen', 'No file chosen')}
                    />
                  </div>
                </div>

                <p className="text-xs text-[var(--primary-hex)]/70 px-3 py-1.5 bg-[var(--primary-light-hex)]/30 rounded-lg">
                  {t('adminPanel.admin.settings.general.faviconHelp', 'Recommended: 32x32 or 48x48 PNG/ICO')}
                </p>
              </div>
            </div>
          </div>

          {/* Copyright Text */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold">
              {t('adminPanel.admin.settings.general.copyright', 'Copyright Text')}
            </Label>
            <Textarea
              value={copyrightText}
              onChange={(e) => setCopyrightText(e.target.value)}
              placeholder={t(
                'adminPanel.admin.settings.general.copyrightPlaceholder',
                '© 2024 My Company. All rights reserved.',
              )}
              rows={3}
              className="ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] resize-none"
              data-testid="textarea-copyright"
            />
          </div>

          <Button
            onClick={handleSaveGeneral}
            disabled={updateSettingMutation.isPending}
            className="gap-2 h-12 px-8 text-lg bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] hover:from-[var(--primary-dark-hex)] hover:to-[var(--primary-hex)] shadow-lg hover:shadow-glow transition-all duration-300"
            data-testid="button-save-general"
          >
            {updateSettingMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('adminPanel.admin.settings.general.saving', 'Saving...')}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t('adminPanel.admin.settings.general.saveGeneralSettings', 'Save General Settings')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Admin Login Settings Card */}
      <Card className="border-0 shadow-xl hover:shadow-[0_25px_50px_-12px_color-mix(in_srgb,var(--primary-hex)_30%,transparent)] transition-all duration-500">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] flex items-center justify-center shadow-lg">
              <Settings2 className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] via-[var(--primary-second-hex)] to-[var(--primary-light-hex)] bg-clip-text text-transparent">
                {t('adminPanel.admin.settings.general.adminSettingsTitle', 'Admin Panel Settings')}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base md:text-lg text-[var(--primary-hex)]/70 leading-relaxed">
                {t(
                  'adminPanel.admin.settings.general.adminSettingsDescription',
                  'Configure settings for the administrative interface'
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-8 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-border bg-gradient-to-br from-muted/30 to-transparent">
            <div className="space-y-0.5">
              <Label className="text-base font-bold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--primary-hex)]" />
                {t('adminPanel.admin.settings.general.showDemoLogin', 'Show Demo Login Details')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('adminPanel.admin.settings.general.showDemoLoginDesc', 'Toggle display of demo credentials on the admin login page')}
              </p>
            </div>
            <Switch
              checked={showDemoLogin}
              onCheckedChange={setShowDemoLogin}
              data-testid="switch-show-demo-login"
            />
          </div>

          <Button
            onClick={async () => {
              await saveSetting('show_demo_login', String(showDemoLogin), 'general');
            }}
            disabled={updateSettingMutation.isPending}
            className="gap-2 h-12 px-8 text-lg bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] hover:from-[var(--primary-dark-hex)] hover:to-[var(--primary-hex)] shadow-lg hover:shadow-glow transition-all duration-300"
          >
            {updateSettingMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('adminPanel.admin.settings.general.saving', 'Saving...')}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t('adminPanel.admin.settings.general.saveAdminSettings', 'Save Admin Settings')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Package Selection Mode Card */}
      <Card className="border-0 shadow-xl hover:shadow-[0_25px_50px_-12px_color-mix(in_srgb,var(--primary-hex)_30%,transparent)] transition-all duration-500">
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
            {t('adminPanel.admin.settings.general.packageModeTitle', 'Package Selection Mode')}
          </CardTitle>
          <CardDescription className="text-lg text-[var(--primary-hex)]/70">
            {t(
              'adminPanel.admin.settings.general.packageModeDescription',
              'Configure how packages are automatically enabled from multiple providers',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <div className="space-y-4">
            {/* Auto Mode */}
            <div
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${packageSelectionMode === 'auto'
                ? 'border-[var(--primary-hex)] bg-gradient-to-br from-[var(--primary-light-hex)]/20 to-[var(--primary-hex)]/10 shadow-[0_10px_30px_-10px_color-mix(in_srgb,var(--primary-hex)_40%,transparent)]'
                : 'border-border hover:border-[var(--primary-hex)]/50 hover-elevate'
                }`}
              onClick={() => setPackageSelectionMode('auto')}
              data-testid="option-auto-mode"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center h-6">
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${packageSelectionMode === 'auto'
                      ? 'border-[var(--primary-hex)] shadow-[0_0_10px_color-mix(in_srgb,var(--primary-hex)_50%,transparent)]'
                      : 'border-muted-foreground'
                      }`}
                  >
                    {packageSelectionMode === 'auto' && (
                      <div className="h-3 w-3 rounded-full bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] shadow-glow-sm"></div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xl font-bold mb-2 flex items-center gap-2">
                    {t('adminPanel.admin.settings.general.autoMode', 'Auto (Best Price)')}
                    {packageSelectionMode === 'auto' && (
                      <Badge className="bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] text-black font-semibold shadow-md">
                        {t('adminPanel.admin.settings.general.active', 'Active')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {t(
                      'adminPanel.admin.settings.general.autoModeDescription',
                      'Automatically enable packages with the best price across all providers. When multiple providers offer the same best price, packages from the preferred provider are enabled.',
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs border-[var(--primary-hex)]/40 bg-[var(--primary-light-hex)]/20 text-[var(--primary-hex)]"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('adminPanel.admin.settings.general.priceComparison', 'Price Comparison')}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs border-[var(--primary-hex)]/40 bg-[var(--primary-light-hex)]/20 text-[var(--primary-hex)]"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t(
                        'adminPanel.admin.settings.general.preferredProviderFallback',
                        'Preferred Provider Fallback',
                      )}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs border-[var(--primary-hex)]/40 bg-[var(--primary-light-hex)]/20 text-[var(--primary-hex)]"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('adminPanel.admin.settings.general.automaticUpdates', 'Automatic Updates')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Mode */}
            <div
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${packageSelectionMode === 'manual'
                ? 'border-[var(--primary-hex)] bg-gradient-to-br from-[var(--primary-light-hex)]/20 to-[var(--primary-hex)]/10 shadow-[0_10px_30px_-10px_color-mix(in_srgb,var(--primary-hex)_40%,transparent)]'
                : 'border-border hover:border-[var(--primary-hex)]/50 hover-elevate'
                }`}
              onClick={() => setPackageSelectionMode('manual')}
              data-testid="option-manual-mode"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center h-6">
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${packageSelectionMode === 'manual'
                      ? 'border-[var(--primary-hex)] shadow-[0_0_10px_color-mix(in_srgb,var(--primary-hex)_50%,transparent)]'
                      : 'border-muted-foreground'
                      }`}
                  >
                    {packageSelectionMode === 'manual' && (
                      <div className="h-3 w-3 rounded-full bg-gradient-to-br from-[var(--primary-hex)] to-[var(--primary-second-hex)] shadow-glow-sm"></div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xl font-bold mb-2 flex items-center gap-2">
                    {t('adminPanel.admin.settings.general.manualMode', 'Manual Selection')}
                    {packageSelectionMode === 'manual' && (
                      <Badge className="bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] text-black font-semibold shadow-md">
                        {t('adminPanel.admin.settings.general.active', 'Active')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {t(
                      'adminPanel.admin.settings.general.manualModeDescription',
                      'Full control over which packages are enabled. You manually choose which packages from which providers are visible to customers. Price comparison still runs but packages are not auto-enabled.',
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs border-[var(--primary-hex)]/40 bg-[var(--primary-light-hex)]/20 text-[var(--primary-hex)]"
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {t('adminPanel.admin.settings.general.manualControl', 'Manual Control')}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs border-[var(--primary-hex)]/40 bg-[var(--primary-light-hex)]/20 text-[var(--primary-hex)]"
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {t('adminPanel.admin.settings.general.noAutoUpdates', 'No Auto Updates')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Mode Info */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-[var(--primary-light-hex)]/20 to-transparent border border-[var(--primary-hex)]/30 backdrop-blur-sm">
            <p className="text-lg font-bold mb-3 text-[var(--primary-hex)]">
              {t('adminPanel.admin.settings.general.currentMode', 'Current Mode')}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {packageSelectionMode === 'auto'
                ? t(
                  'adminPanel.admin.settings.general.autoModeActive',
                  'Auto mode is active. Packages are automatically enabled based on best price. Configure your preferred provider in the Providers page to set the fallback when multiple providers have the same price.',
                )
                : t(
                  'adminPanel.admin.settings.general.manualModeActive',
                  'Manual mode is active. You have full control over package visibility. Use the Package Management page to enable/disable specific packages.',
                )}
            </p>
          </div>

          <Button
            onClick={() => saveSetting('package_selection_mode', packageSelectionMode, 'general')}
            disabled={updateSettingMutation.isPending}
            className="gap-2 h-12 px-8 text-lg bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] hover:from-[var(--primary-dark-hex)] hover:to-[var(--primary-hex)] shadow-lg hover:shadow-glow transition-all duration-300"
            data-testid="button-save-package-mode"
          >
            {updateSettingMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('adminPanel.admin.settings.general.saving', 'Saving...')}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t('adminPanel.admin.settings.general.savePackageMode', 'Save Package Mode')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* AI-Enhanced Package Selection Card */}
      <AISettingsCard />
    </div >
  );
}
