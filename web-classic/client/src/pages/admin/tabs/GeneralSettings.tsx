// components/admin/tabs/GeneralSettings.tsx - Complete with internal state management
import React, { useState, useEffect } from 'react';
import {
  Save,
  Building2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
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
import { useTranslation } from '@/contexts/TranslationContext';

import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AdminPlatformSettings } from '@/types/types';

export function GeneralSettings() {
  const { t } = useTranslation();

  const { toast } = useToast();

  // Internal state management
  const [platformName, setPlatformName] = useState('');
  const [platformTagline, setPlatformTagline] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [copyrightText, setCopyrightText] = useState('');
  const [currency, setCurrency] = useState('USD');
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
  const [packageSelectionMode, setPackageSelectionMode] = useState<'auto' | 'manual'>('auto');

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
  const { data: settings } = useQuery<AdminPlatformSettings>({
    queryKey: ['/api/admin/settings'],
  });

  // Load settings into state
  useEffect(() => {
    if (settings) {
      setPlatformName(settings.platform_name || '');
      setPlatformTagline(settings.platform_tagline || '');
      setLogo(settings.logo || null);
      setFavicon(settings.favicon || null);
      setCopyrightText(settings.copyright_text || '');
      setCurrency(settings.currency || 'USD');
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
      setPackageSelectionMode((settings.package_selection_mode as 'auto' | 'manual') || 'auto');
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
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/packages'] });
      toast({
        title: t('admin.settings.success', 'Success'),
        description: t('admin.settings.settingsUpdatedSuccess', 'Settings updated successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.settings.error', 'Error'),
        description:
          error.message || t('admin.settings.failedToUpdateSettings', 'Failed to update settings'),
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
        title: t('admin.settings.validationError', 'Validation Error'),
        description: t('admin.settings.platformNameRequired', 'Platform name is required'),
        variant: 'destructive',
      });
      return;
    }
    await saveSetting('platform_name', platformName, 'general');
    await saveSetting('platform_tagline', platformTagline, 'general');
    await saveSetting('copyright_text', copyrightText, 'general');
    await saveSetting('currency', currency, 'general');
    await saveSetting('support_whatsapp_number', supportWhatsappNumber, 'general');
    await saveSetting('support_whatsapp_enabled', String(supportWhatsappEnabled), 'general');
    await saveSetting(
      'support_whatsapp_schedule_enabled',
      String(supportWhatsappScheduleEnabled),
      'general',
    );
    await saveSetting('support_whatsapp_start_time', supportWhatsappStartTime, 'general');
    await saveSetting('support_whatsapp_end_time', supportWhatsappEndTime, 'general');
    await saveSetting(
      'support_whatsapp_working_days',
      supportWhatsappWorkingDays.join(','),
      'general',
    );
    await saveSetting('concierge_enabled', String(conciergeEnabled), 'general');
    await saveSetting('concierge_pricing_mode', conciergePricingMode, 'general');
    await saveSetting('concierge_billing_cycle', conciergeBillingCycle, 'general');
    await saveSetting('concierge_fee', conciergeFee, 'general');
    if (logo) {
      await saveSetting('logo', logo, 'general');
    }
    if (favicon) {
      await saveSetting('favicon', favicon, 'general');
    }
  };

  const toggleWorkingDay = (day: string) => {
    setSupportWhatsappWorkingDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  // Upload image helper
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await apiRequest('POST', '/api/upload', formData);

    if (!res.ok) {
      throw new Error('Image upload failed');
    }

    const data = await res.json();
    return data.fileUrl;
  };

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const path = await uploadImage(file);
      setLogo(path);
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
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
      setFavicon(path);
      toast({
        title: 'Success',
        description: 'Favicon uploaded successfully',
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to upload favicon',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Information Card */}
      <Card className="border-0 shadow-xl hover:shadow-[0_25px_50px_-12px_color-mix(in_srgb,var(--primary-hex)_30%,transparent)] transition-all duration-500">
        <CardHeader>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-[var(--primary-hex)] via-[var(--primary-second-hex)] to-[var(--primary-light-hex)] bg-clip-text text-transparent">
            {t('admin.settings.general.platformInfoTitle', 'Platform Information')}
          </CardTitle>
          
          <CardDescription className="text-lg text-[var(--primary-hex)]/80">
            {t(
              'admin.settings.general.platformInfoDescription',
              "Configure your platform's basic information and branding",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Text Inputs */}
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[var(--primary-hex)]" />
                  {t('admin.settings.general.platformName', 'Platform Name')}
                </Label>
                <Input
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder={t('admin.settings.general.platformNamePlaceholder', 'My eSIM Store')}
                  className="h-14 text-lg ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
                  data-testid="input-platform-name"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  {t('admin.settings.general.tagline', 'Tagline')}
                </Label>
                <Input
                  value={platformTagline}
                  onChange={(e) => setPlatformTagline(e.target.value)}
                  placeholder={t(
                    'admin.settings.general.taglinePlaceholder',
                    'Global connectivity made easy',
                  )}
                  className="h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
                  data-testid="input-platform-tagline"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  {t('admin.settings.general.currency', 'Currency')}
                </Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder={t('admin.settings.general.currencyPlaceholder', 'USD')}
                  maxLength={3}
                  className="h-12 text-lg tracking-widest font-mono uppercase ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)]"
                  data-testid="input-currency"
                />
                <p className="text-sm font-medium px-3 py-2 bg-[var(--primary-light-hex)]/20 rounded-lg border border-[var(--primary-hex)]/20">
                  {t(
                    'admin.settings.general.currencyHelp',
                    '3-letter currency code (e.g., USD, EUR, GBP)',
                  )}
                </p>
              </div>
            </div>

            {/* Right Column - Logo & Favicon */}
            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-4 p-6 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent border border-[var(--primary-hex)]/20 rounded-2xl">
                <Label className="text-lg font-bold text-[var(--primary-hex)] flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  {t('admin.settings.general.logo', 'Platform Logo')}
                </Label>

                <div className="flex items-center gap-4">
                  {logo ? (
                    <div className="h-24 w-24 rounded-xl overflow-hidden bg-white dark:bg-black/20 shadow-xl border-2 border-[var(--primary-hex)]/30 flex items-center justify-center hover:scale-105 transition-all duration-300">
                      <img
                        src={logo}
                        alt="Logo Preview"
                        className="max-h-20 max-w-20 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-[var(--primary-hex)]/50 flex flex-col items-center justify-center text-[var(--primary-hex)] bg-[var(--primary-light-hex)]/20 hover:scale-105 transition-all duration-300">
                      <Building2 className="h-8 w-8 mb-1 opacity-70" />
                      <span className="text-xs font-semibold">No Logo</span>
                    </div>
                  )}

                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="h-12 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-[var(--primary-hex)] file:to-[var(--primary-second-hex)] file:text-black hover:file:brightness-110 cursor-pointer"
                    />
                  </div>
                </div>

                <p className="text-xs text-[var(--primary-hex)]/70 px-3 py-1.5 bg-[var(--primary-light-hex)]/30 rounded-lg">
                  {t(
                    'admin.settings.general.logoHelp',
                    'Recommended: PNG or SVG, transparent background',
                  )}
                </p>
              </div>

              {/* Favicon Upload */}
              <div className="space-y-4 p-6 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent border border-[var(--primary-hex)]/20 rounded-2xl">
                <Label className="text-lg font-bold text-[var(--primary-hex)]">
                  {t('admin.settings.general.favicon', 'Favicon')}
                </Label>

                <div className="flex items-center gap-4">
                  {favicon ? (
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-white dark:bg-black/20 shadow-lg border-2 border-[var(--primary-hex)]/30 flex items-center justify-center hover:scale-105 transition-all duration-300">
                      <img
                        src={favicon}
                        alt="Favicon Preview"
                        className="h-10 w-10 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-lg border-2 border-dashed border-[var(--primary-hex)]/50 flex items-center justify-center text-[var(--primary-hex)] bg-[var(--primary-light-hex)]/20 text-xs font-semibold hover:scale-105 transition-all duration-300">
                      No Favicon
                    </div>
                  )}

                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/png,image/x-icon,image/svg+xml"
                      onChange={handleFaviconUpload}
                      className="h-12 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-[var(--primary-hex)] file:to-[var(--primary-second-hex)] file:text-black hover:file:brightness-110 cursor-pointer"
                    />
                  </div>
                </div>

                <p className="text-xs text-[var(--primary-hex)]/70 px-3 py-1.5 bg-[var(--primary-light-hex)]/30 rounded-lg">
                  {t('admin.settings.general.faviconHelp', 'Recommended: 32×32 or 48×48 PNG/ICO')}
                </p>
              </div>
            </div>
          </div>

          {/* Copyright Text */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold">
              {t('admin.settings.general.copyright', 'Copyright Text')}
            </Label>
            <Textarea
              value={copyrightText}
              onChange={(e) => setCopyrightText(e.target.value)}
              placeholder={t(
                'admin.settings.general.copyrightPlaceholder',
                '© 2024 My Company. All rights reserved.',
              )}
              rows={3}
              className="ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] resize-none"
              data-testid="textarea-copyright"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[var(--primary-hex)]" />
              WhatsApp Support Number
            </Label>
            <div className="flex items-center justify-between rounded-xl border border-[var(--primary-hex)]/20 bg-[var(--primary-light-hex)]/10 px-4 py-3">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Enable WhatsApp Chat</p>
                <p className="text-xs text-muted-foreground">
                  Show the WhatsApp chat button across the app when this is on.
                </p>
              </div>
              <Switch checked={supportWhatsappEnabled} onCheckedChange={setSupportWhatsappEnabled} />
            </div>
            <Input
              value={supportWhatsappNumber}
              onChange={(e) => setSupportWhatsappNumber(e.target.value)}
              placeholder="+971501234567"
              className="h-12 ring-2 ring-[var(--primary-hex)]/20 focus:ring-[var(--primary-hex)] focus:border-[var(--primary-hex)] transition-all duration-300"
              data-testid="input-support-whatsapp-number"
            />
            <p className="text-xs text-[var(--primary-hex)]/70 px-3 py-1.5 bg-[var(--primary-light-hex)]/30 rounded-lg">
              This is the default WhatsApp number used for customer support across the app.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-[var(--primary-hex)]/20 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-[var(--primary-hex)]" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">WhatsApp Working Schedule</p>
                  <p className="text-xs text-muted-foreground">
                    Control when the WhatsApp icon should appear.
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
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={supportWhatsappStartTime}
                  onChange={(e) => setSupportWhatsappStartTime(e.target.value)}
                  disabled={!supportWhatsappScheduleEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={supportWhatsappEndTime}
                  onChange={(e) => setSupportWhatsappEndTime(e.target.value)}
                  disabled={!supportWhatsappScheduleEnabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Working Days</Label>
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
                      {day.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Schedule uses your platform timezone from settings.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-[var(--primary-hex)]/20 bg-gradient-to-br from-[var(--primary-light-hex)]/10 to-transparent p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--primary-hex)]" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Concierge Pricing</p>
                  <p className="text-xs text-muted-foreground">
                    Configure whether Concierge is free or paid.
                  </p>
                </div>
              </div>
              <Switch checked={conciergeEnabled} onCheckedChange={setConciergeEnabled} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Mode</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={conciergePricingMode === 'free' ? 'default' : 'outline'}
                    className={conciergePricingMode === 'free' ? 'bg-primary-gradient text-white' : ''}
                    onClick={() => setConciergePricingMode('free')}
                    disabled={!conciergeEnabled}
                  >
                    Free
                  </Button>
                  <Button
                    type="button"
                    variant={conciergePricingMode === 'paid' ? 'default' : 'outline'}
                    className={conciergePricingMode === 'paid' ? 'bg-primary-gradient text-white' : ''}
                    onClick={() => setConciergePricingMode('paid')}
                    disabled={!conciergeEnabled}
                  >
                    Paid
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Billing</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={conciergeBillingCycle === 'one_time' ? 'default' : 'outline'}
                    className={conciergeBillingCycle === 'one_time' ? 'bg-primary-gradient text-white' : ''}
                    onClick={() => setConciergeBillingCycle('one_time')}
                    disabled={!conciergeEnabled || conciergePricingMode !== 'paid'}
                  >
                    One Time
                  </Button>
                  <Button
                    type="button"
                    variant={conciergeBillingCycle === 'monthly' ? 'default' : 'outline'}
                    className={conciergeBillingCycle === 'monthly' ? 'bg-primary-gradient text-white' : ''}
                    onClick={() => setConciergeBillingCycle('monthly')}
                    disabled={!conciergeEnabled || conciergePricingMode !== 'paid'}
                  >
                    Monthly
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fee</Label>
              <Input
                value={conciergeFee}
                onChange={(e) => setConciergeFee(e.target.value)}
                placeholder="29.00"
                disabled={!conciergeEnabled || conciergePricingMode !== 'paid'}
              />
              <p className="text-xs text-muted-foreground">
                Used for displaying concierge price in the support UI.
              </p>
            </div>
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
                {t('admin.settings.general.saving', 'Saving...')}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t('admin.settings.general.saveGeneralSettings', 'Save General Settings')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Package Selection Mode Card */}
      <Card className="border-0 shadow-xl hover:shadow-[0_25px_50px_-12px_color-mix(in_srgb,var(--primary-hex)_30%,transparent)] transition-all duration-500">
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] bg-clip-text text-transparent">
            {t('admin.settings.general.packageModeTitle', 'Package Selection Mode')}
          </CardTitle>
          <CardDescription className="text-lg text-[var(--primary-hex)]/70">
            {t(
              'admin.settings.general.packageModeDescription',
              'Configure how packages are automatically enabled from multiple providers',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <div className="space-y-4">
            {/* Auto Mode */}
            <div
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                packageSelectionMode === 'auto'
                  ? 'border-[var(--primary-hex)] bg-gradient-to-br from-[var(--primary-light-hex)]/20 to-[var(--primary-hex)]/10 shadow-[0_10px_30px_-10px_color-mix(in_srgb,var(--primary-hex)_40%,transparent)]'
                  : 'border-border hover:border-[var(--primary-hex)]/50 hover-elevate'
              }`}
              onClick={() => setPackageSelectionMode('auto')}
              data-testid="option-auto-mode"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center h-6">
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      packageSelectionMode === 'auto'
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
                    {t('admin.settings.general.autoMode', 'Auto (Best Price)')}
                    {packageSelectionMode === 'auto' && (
                      <Badge className="bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] text-black font-semibold shadow-md">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {t(
                      'admin.settings.general.autoModeDescription',
                      'Automatically enable packages with the best price across all providers. When multiple providers offer the same best price, packages from the preferred provider are enabled.',
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs border-[var(--primary-hex)]/40 bg-[var(--primary-light-hex)]/20 text-[var(--primary-hex)]"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('admin.settings.general.priceComparison', 'Price Comparison')}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs border-[var(--primary-hex)]/40 bg-[var(--primary-light-hex)]/20 text-[var(--primary-hex)]"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t(
                        'admin.settings.general.preferredProviderFallback',
                        'Preferred Provider Fallback',
                      )}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs border-[var(--primary-hex)]/40 bg-[var(--primary-light-hex)]/20 text-[var(--primary-hex)]"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('admin.settings.general.automaticUpdates', 'Automatic Updates')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Mode */}
            <div
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                packageSelectionMode === 'manual'
                  ? 'border-[var(--primary-hex)] bg-gradient-to-br from-[var(--primary-light-hex)]/20 to-[var(--primary-hex)]/10 shadow-[0_10px_30px_-10px_color-mix(in_srgb,var(--primary-hex)_40%,transparent)]'
                  : 'border-border hover:border-[var(--primary-hex)]/50 hover-elevate'
              }`}
              onClick={() => setPackageSelectionMode('manual')}
              data-testid="option-manual-mode"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center h-6">
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      packageSelectionMode === 'manual'
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
                    {t('admin.settings.general.manualMode', 'Manual Selection')}
                    {packageSelectionMode === 'manual' && (
                      <Badge className="bg-gradient-to-r from-[var(--primary-hex)] to-[var(--primary-second-hex)] text-black font-semibold shadow-md">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {t(
                      'admin.settings.general.manualModeDescription',
                      'Full control over which packages are enabled. You manually choose which packages from which providers are visible to customers. Price comparison still runs but packages are not auto-enabled.',
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs border-[var(--primary-hex)]/40 bg-[var(--primary-light-hex)]/20 text-[var(--primary-hex)]"
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {t('admin.settings.general.manualControl', 'Manual Control')}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs border-[var(--primary-hex)]/40 bg-[var(--primary-light-hex)]/20 text-[var(--primary-hex)]"
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {t('admin.settings.general.noAutoUpdates', 'No Auto Updates')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Mode Info */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-[var(--primary-light-hex)]/20 to-transparent border border-[var(--primary-hex)]/30 backdrop-blur-sm">
            <p className="text-lg font-bold mb-3 text-[var(--primary-hex)]">
              {t('admin.settings.general.currentMode', 'Current Mode')}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {packageSelectionMode === 'auto'
                ? t(
                    'admin.settings.general.autoModeActive',
                    'Auto mode is active. Packages are automatically enabled based on best price. Configure your preferred provider in the Providers page to set the fallback when multiple providers have the same price.',
                  )
                : t(
                    'admin.settings.general.manualModeActive',
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
                {t('admin.settings.general.saving', 'Saving...')}
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t('admin.settings.general.savePackageMode', 'Save Package Mode')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
