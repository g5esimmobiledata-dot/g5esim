import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  BellRing,
  Bot,
  Building2,
  BarChart3,
  CheckCircle2,
  Code2,
  Clock3,
  CreditCard,
  Crown,
  FileText,
  Gift,
  KeyRound,
  LifeBuoy,
  Loader2,
  MailCheck,
  Megaphone,
  Newspaper,
  PackageCheck,
  PenLine,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  Store,
  Ticket,
  Tv,
  UserCog,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/contexts/TranslationContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import {
  getDefaultRoleOptionsConfig,
  normalizeRoleOptionsConfig,
  ROLE_OPTION_LABELS,
  ROLE_OPTION_MODULES,
  type RoleModuleDefinition,
  type RoleModuleSettings,
  type RoleOptionRole,
  type RoleOptionsConfig,
} from '@shared/roleOptions';

const ROLE_ORDER: RoleOptionRole[] = ['user', 'agent', 'reseller'];
const ROLE_TAB_ORDER: RoleOptionRole[] = ['user', 'reseller', 'agent'];
type ModuleSurfaceKey = 'modules' | 'mobileModules';
const PREMIUM_SERVICES_MODULE_KEY = 'module_premium_services';

const ROLE_META: Record<RoleOptionRole, {
  icon: LucideIcon;
  eyebrow: string;
  description: string;
  iconClass: string;
  surfaceClass: string;
}> = {
  user: {
    icon: Users,
    eyebrow: 'Customer Access',
    description: 'Retail customer account tools and reminders.',
    iconClass: 'bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300',
    surfaceClass: 'border-sky-100/80 dark:border-sky-400/15',
  },
  agent: {
    icon: ShieldCheck,
    eyebrow: 'Agent Workspace',
    description: 'Agent controls, selling tools, and customer actions.',
    iconClass: 'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
    surfaceClass: 'border-violet-100/80 dark:border-violet-400/15',
  },
  reseller: {
    icon: Crown,
    eyebrow: 'Reseller Portal',
    description: 'Wholesale, storefront, voucher, and team modules.',
    iconClass: 'bg-lime-50 text-lime-700 dark:bg-lime-300/10 dark:text-lime-300',
    surfaceClass: 'border-lime-100/80 dark:border-lime-300/15',
  },
};

function enabledCount(config: RoleOptionsConfig, role: RoleOptionRole, surface: ModuleSurfaceKey) {
  return ROLE_OPTION_MODULES[role].filter((module) => config.roles[role][surface][module.key]).length;
}

function progressValue(enabled: number, total: number) {
  return total > 0 ? Math.round((enabled / total) * 100) : 0;
}

function roleLabelKey(role: RoleOptionRole) {
  return `adminPanel.admin.options.roles.${role}`;
}

function setAllModules(
  config: RoleOptionsConfig,
  role: RoleOptionRole,
  surface: ModuleSurfaceKey,
  enabled: boolean,
): RoleOptionsConfig {
  return {
    ...config,
    roles: {
      ...config.roles,
      [role]: {
        ...config.roles[role],
        [surface]: ROLE_OPTION_MODULES[role].reduce<Record<string, boolean>>((acc, module) => {
          acc[module.key] = enabled;
          return acc;
        }, {}),
      },
    },
  };
}

function setPremiumServicesForAllRoles(config: RoleOptionsConfig, enabled: boolean): RoleOptionsConfig {
  return {
    ...config,
    roles: ROLE_ORDER.reduce((acc, role) => {
      acc[role] = {
        ...config.roles[role],
        modules: {
          ...config.roles[role].modules,
          [PREMIUM_SERVICES_MODULE_KEY]: enabled,
        },
        mobileModules: {
          ...config.roles[role].mobileModules,
          [PREMIUM_SERVICES_MODULE_KEY]: enabled,
        },
      };
      return acc;
    }, {} as RoleOptionsConfig['roles']),
  };
}

function getModuleIcon(moduleKey: string): LucideIcon {
  if (moduleKey === 'module_premium_services') return Crown;
  if (moduleKey === 'module_iptv_services') return Tv;
  if (moduleKey === 'module_virtual_numbers') return Smartphone;
  if (moduleKey === 'module_vouchers') return Ticket;
  if (moduleKey === 'module_invoice_system') return FileText;
  if (moduleKey === 'module_esim_services') return Smartphone;
  if (moduleKey === 'module_marketing') return Megaphone;
  if (moduleKey === 'module_api_docs') return Code2;
  if (moduleKey === 'module_support_system') return LifeBuoy;
  if (moduleKey === 'module_master_esim_packages') return PackageCheck;
  if (moduleKey === 'module_transactions') return Wallet;
  if (moduleKey === 'module_platform_setup') return SlidersHorizontal;
  if (moduleKey === 'module_report') return FileText;
  if (moduleKey === 'module_order_management') return PackageCheck;
  if (moduleKey === 'module_statistics') return BarChart3;
  if (moduleKey === 'module_blog') return Newspaper;
  if (moduleKey === 'module_in_app_purchases') return CreditCard;
  if (moduleKey.includes('voucher')) return Ticket;
  if (moduleKey.includes('invoice')) return FileText;
  if (moduleKey.includes('kyc')) return ShieldCheck;
  if (moduleKey.includes('concierge')) return Sparkles;
  if (moduleKey.includes('fund') || moduleKey.includes('balance')) return Wallet;
  if (moduleKey.includes('reminder')) return BellRing;
  if (moduleKey.includes('offer') || moduleKey.includes('bonus') || moduleKey.includes('referral')) return Gift;
  if (moduleKey.includes('payment')) return CreditCard;
  if (moduleKey.includes('rate') || moduleKey.includes('store')) return Store;
  if (moduleKey.includes('chat') || moduleKey.includes('ai')) return Bot;
  if (moduleKey.includes('support')) return LifeBuoy;
  if (moduleKey.includes('logo') || moduleKey.includes('profile') || moduleKey.includes('edit')) return PenLine;
  if (moduleKey.includes('sub_domain')) return Building2;
  if (moduleKey.includes('switch')) return KeyRound;
  if (moduleKey.includes('package')) return PackageCheck;
  if (moduleKey.includes('auto_logout')) return Clock3;
  return UserCog;
}

function StatusPill({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const Icon = enabled ? CheckCircle2 : XCircle;
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold',
        enabled
          ? 'border-lime-300 bg-lime-300 text-slate-950 dark:border-lime-300 dark:bg-lime-300 dark:text-slate-950'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200',
      )}
    >
      <Icon className="h-3 w-3" />
      {enabled
        ? t('adminPanel.customers.modules.enabled', 'Enabled')
        : t('adminPanel.customers.modules.disabled', 'Disabled')}
    </span>
  );
}

function ModuleSurfaceGrid({
  title,
  description,
  role,
  surface,
  modules,
  values,
  onToggle,
  onSetAll,
}: {
  title: string;
  description: string;
  role: RoleOptionRole;
  surface: ModuleSurfaceKey;
  modules: RoleModuleDefinition[];
  values: Record<string, boolean>;
  onToggle: (role: RoleOptionRole, surface: ModuleSurfaceKey, moduleKey: string, enabled: boolean) => void;
  onSetAll: (role: RoleOptionRole, surface: ModuleSurfaceKey, enabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const enabled = modules.filter((module) => Boolean(values[module.key])).length;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/45">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-950 dark:text-white">{title}</h3>
            <Badge variant="outline" className="text-xs">
              {t('adminPanel.customers.modules.enabledCount', '{enabled}/{total} enabled', {
                enabled,
                total: modules.length,
              })}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onSetAll(role, surface, true)}>
            {t('adminPanel.customers.modules.enableAll', 'Enable All')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onSetAll(role, surface, false)}>
            {t('adminPanel.customers.modules.disableAll', 'Disable All')}
          </Button>
        </div>
      </div>
      <div className="grid gap-2">
        {modules.map((module) => {
          const checked = Boolean(values[module.key]);
          const ModuleIcon = getModuleIcon(module.key);
          const moduleLabel = t(`adminPanel.customers.modules.${module.key}`, module.label);
          return (
            <div
              key={`${surface}-${module.key}`}
              className={cn(
                'group flex min-h-20 items-center justify-between gap-4 rounded-md border px-4 py-3 transition-colors',
                checked
                  ? 'border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900'
                  : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/45',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors',
                    checked
                      ? 'bg-lime-300 text-slate-950 dark:bg-lime-300 dark:text-slate-950'
                      : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200',
                  )}
                >
                  <ModuleIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-5 text-slate-900 dark:text-white">{moduleLabel}</p>
                  <div className="mt-2">
                    <StatusPill enabled={checked} />
                  </div>
                </div>
              </div>
              <Switch
                checked={checked}
                onCheckedChange={(nextEnabled) => onToggle(role, surface, module.key, nextEnabled)}
                aria-label={`${moduleLabel} ${title} ${checked
                  ? t('adminPanel.customers.modules.enabled', 'Enabled')
                  : t('adminPanel.customers.modules.disabled', 'Disabled')}`}
                className="h-5 w-9 data-[state=checked]:bg-emerald-800 data-[state=unchecked]:bg-red-600 dark:data-[state=checked]:bg-emerald-700 dark:data-[state=unchecked]:bg-red-600 [&>span]:h-4 [&>span]:w-4 [&>span[data-state=checked]]:translate-x-4"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminOptions() {
  const { toast } = useToast();
  const { t, isRTL } = useTranslation();
  const [config, setConfig] = useState<RoleOptionsConfig>(() => getDefaultRoleOptionsConfig());

  const { data, isLoading } = useQuery<RoleOptionsConfig>({
    queryKey: ['/api/admin/options'],
  });

  useEffect(() => {
    if (data) {
      setConfig(normalizeRoleOptionsConfig(data));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', '/api/admin/options', config);
      return response.json();
    },
    onSuccess: async (response) => {
      if (!response.success) {
        throw new Error(response.message || t('adminPanel.admin.options.saveFailedDescription', 'Could not save features.'));
      }
      const nextConfig = normalizeRoleOptionsConfig(response.data);
      setConfig(nextConfig);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/options'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/options'] });
      toast({
        title: t('adminPanel.admin.options.saveSuccess', 'Features saved'),
        description: t(
          'adminPanel.admin.options.saveSuccessDescription',
          'Customer type features were updated successfully.',
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('adminPanel.admin.options.saveFailed', 'Features failed'),
        description: error.message || t('adminPanel.admin.options.saveFailedDescription', 'Could not save features.'),
        variant: 'destructive',
      });
    },
  });

  const totals = useMemo(() => {
    return ROLE_ORDER.reduce<Record<RoleOptionRole, {
      enabled: number;
      webEnabled: number;
      mobileEnabled: number;
      total: number;
      percent: number;
    }>>((acc, role) => {
      const webEnabled = enabledCount(config, role, 'modules');
      const mobileEnabled = enabledCount(config, role, 'mobileModules');
      const total = ROLE_OPTION_MODULES[role].length;
      acc[role] = {
        enabled: webEnabled + mobileEnabled,
        webEnabled,
        mobileEnabled,
        total: total * 2,
        percent: progressValue(webEnabled + mobileEnabled, total * 2),
      };
      return acc;
    }, {} as Record<RoleOptionRole, {
      enabled: number;
      webEnabled: number;
      mobileEnabled: number;
      total: number;
      percent: number;
    }>);
  }, [config]);

  const overallTotals = useMemo(() => {
    return ROLE_ORDER.reduce(
      (acc, role) => {
        acc.enabled += totals[role].enabled;
        acc.total += totals[role].total;
        return acc;
      },
      { enabled: 0, total: 0 },
    );
  }, [totals]);

  const premiumVisibility = useMemo(() => {
    const visibleRoles = ROLE_ORDER.filter((role) =>
      config.roles[role].modules[PREMIUM_SERVICES_MODULE_KEY] === true &&
      config.roles[role].mobileModules[PREMIUM_SERVICES_MODULE_KEY] === true,
    );

    return {
      visibleRoles,
      enabledForAll: visibleRoles.length === ROLE_ORDER.length,
    };
  }, [config]);

  const sortedModulesByRole = useMemo(() => {
    return ROLE_ORDER.reduce<Record<RoleOptionRole, RoleModuleDefinition[]>>((acc, role) => {
      acc[role] = [...ROLE_OPTION_MODULES[role]].sort((left, right) =>
        t(`adminPanel.customers.modules.${left.key}`, left.label).localeCompare(
          t(`adminPanel.customers.modules.${right.key}`, right.label),
        ),
      );
      return acc;
    }, {} as Record<RoleOptionRole, RoleModuleDefinition[]>);
  }, [t]);

  const toggleModule = (
    role: RoleOptionRole,
    surface: ModuleSurfaceKey,
    moduleKey: string,
    enabled: boolean,
  ) => {
    setConfig((current) => ({
      ...current,
      roles: {
        ...current.roles,
        [role]: {
          ...current.roles[role],
          [surface]: {
            ...current.roles[role][surface],
            [moduleKey]: enabled,
          },
        },
      },
    }));
  };

  const updateTimeout = (role: RoleOptionRole, value: string) => {
    const minutes = Math.max(1, Math.min(1440, Number(value) || 1));
    setConfig((current) => ({
      ...current,
      roles: {
        ...current.roles,
        [role]: {
          ...current.roles[role],
          loginTimeoutMinutes: minutes,
        },
      },
    }));
  };

  const updateRoleSetting = (
    role: RoleOptionRole,
    updates: Partial<Omit<RoleModuleSettings, 'modules' | 'mobileModules'>>,
  ) => {
    setConfig((current) => ({
      ...current,
      roles: {
        ...current.roles,
        [role]: {
          ...current.roles[role],
          ...updates,
        },
      },
    }));
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn(
        'admin-light-surface space-y-6 p-6 lg:p-8 [&_h1]:font-normal [&_h2]:font-normal [&_h3]:font-normal [&_h4]:font-normal [&_label]:font-normal [&_p]:font-normal [&_span]:font-normal',
        isRTL ? 'text-right' : 'text-left',
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge className="gap-1 border-lime-200 bg-lime-50 text-lime-800 hover:bg-lime-50 dark:border-lime-300/20 dark:bg-lime-300/10 dark:text-lime-200">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t('adminPanel.admin.options.customerModules', 'Customer Modules')}
            </Badge>
            <Badge variant="outline" className="gap-1 text-slate-600 dark:text-slate-300">
              <Sparkles className="h-3.5 w-3.5" />
              {t('adminPanel.admin.options.enabledSummary', '{enabled} / {total} Enabled', {
                enabled: overallTotals.enabled,
                total: overallTotals.total,
              })}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
            {t('adminPanel.admin.options.title', 'Features')}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            {t(
              'adminPanel.admin.options.description',
              'Manage account modules for Users, Agents, and Resellers.',
            )}
          </p>
        </div>
        <Button
          className="gap-2 bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
          data-testid="button-save-options"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('adminPanel.admin.options.save', 'Save Features')}
        </Button>
      </div>

      {isLoading ? (
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="flex min-h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-lime-500" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-lime-50 text-lime-700 dark:bg-lime-300/10 dark:text-lime-300">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-950 dark:text-white">
                      {t('adminPanel.admin.options.mobilePremiumBox', 'Mobile Premium Box')}
                    </h2>
                    <Badge variant="outline" className="text-xs">
                      {t('adminPanel.admin.options.mobilePremiumVisibleRoles', '{visible}/{total} roles visible', {
                        visible: premiumVisibility.visibleRoles.length,
                        total: ROLE_ORDER.length,
                      })}
                    </Badge>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                    {t(
                      'adminPanel.admin.options.mobilePremiumBoxDescription',
                      'Master show/hide control for the Premium card in the mobile app for Users, Agents, and Resellers.',
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {premiumVisibility.enabledForAll
                    ? t('adminPanel.customers.modules.enabled', 'Enabled')
                    : t('adminPanel.customers.modules.disabled', 'Disabled')}
                </span>
                <Switch
                  checked={premiumVisibility.enabledForAll}
                  onCheckedChange={(enabled) => setConfig((current) => setPremiumServicesForAllRoles(current, enabled))}
                  aria-label={t('adminPanel.admin.options.mobilePremiumBox', 'Mobile Premium Box')}
                  className="h-6 w-11 data-[state=checked]:bg-emerald-700 data-[state=unchecked]:bg-red-600 [&>span]:h-5 [&>span]:w-5 [&>span[data-state=checked]]:translate-x-5"
                />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="user" className="space-y-5">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
              {ROLE_TAB_ORDER.map((role) => {
                const meta = ROLE_META[role];
                const Icon = meta.icon;
                return (
                  <TabsTrigger
                    key={role}
                    value={role}
                    className="h-auto justify-start gap-3 rounded-md border border-transparent px-4 py-3 text-left data-[state=active]:border-lime-300 data-[state=active]:bg-lime-50 data-[state=active]:text-slate-950 data-[state=active]:shadow-none dark:data-[state=active]:bg-lime-300 dark:data-[state=active]:text-slate-950"
                  >
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', meta.iconClass)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">
                        {t('adminPanel.admin.options.roleModulesTab', "{role}'s Modules", {
                          role: t(roleLabelKey(role), ROLE_OPTION_LABELS[role]),
                        })}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        {t('adminPanel.admin.options.enabledSummary', '{enabled} / {total} Enabled', {
                          enabled: totals[role].enabled,
                          total: totals[role].total,
                        })}
                      </span>
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {ROLE_TAB_ORDER.map((role) => {
              const meta = ROLE_META[role];
              const RoleIcon = meta.icon;
              const autoLogoutEnabled = Boolean(config.roles[role].modules.auto_logout);
              const balanceAlertEnabled = Boolean(config.roles[role].modules.balance_alert);
              const unusedPackageReminderEnabled = Boolean(config.roles[role].modules.unused_active_package_reminder);
              const specialOfferReminderEnabled = Boolean(config.roles[role].modules.special_offer_reminder);
              const translatedRoleLabel = t(roleLabelKey(role), ROLE_OPTION_LABELS[role]);
              return (
                <TabsContent key={role} value={role} className="mt-0">
                  <Card
                    className={cn(
                      'overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-slate-900',
                      meta.surfaceClass,
                    )}
                  >
                  <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/35">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-md', meta.iconClass)}>
                          <RoleIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-slate-950 dark:text-white">
                            {t('adminPanel.admin.options.roleModulesTab', "{role}'s Modules", {
                              role: translatedRoleLabel,
                            })}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {t(
                              'adminPanel.admin.options.roleModulesTabDescription',
                              'Use the two columns below to control browser access and mobile app access separately.',
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="gap-1 bg-slate-950 text-white hover:bg-slate-950 dark:bg-lime-300 dark:text-slate-950 dark:hover:bg-lime-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t('adminPanel.admin.options.enabledCount', '{count} Enabled', {
                            count: totals[role].enabled,
                          })}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setConfig((current) =>
                            setAllModules(setAllModules(current, role, 'modules', true), role, 'mobileModules', true),
                          )}
                        >
                          {t('adminPanel.admin.options.enableAllSurfaces', 'Enable All Surfaces')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setConfig((current) =>
                            setAllModules(setAllModules(current, role, 'modules', false), role, 'mobileModules', false),
                          )}
                        >
                          {t('adminPanel.admin.options.disableAllSurfaces', 'Disable All Surfaces')}
                        </Button>
                      </div>
                    </div>
                    <Progress
                      value={totals[role].percent}
                      className="mt-4 h-2 bg-slate-100 dark:bg-slate-800 [&>div]:bg-lime-300"
                    />
                  </CardHeader>
                  <CardContent className="space-y-5 p-5">
                    <div className="grid gap-5 xl:grid-cols-2">
                      <ModuleSurfaceGrid
                        title={t('adminPanel.admin.options.webAccess', 'Web UI Access')}
                        description={t(
                          'adminPanel.admin.options.webAccessDescription',
                          'Controls what this role can see and use in the browser portal.',
                        )}
                        role={role}
                        surface="modules"
                        modules={sortedModulesByRole[role]}
                        values={config.roles[role].modules}
                        onToggle={toggleModule}
                        onSetAll={(targetRole, surface, enabled) =>
                          setConfig((current) => setAllModules(current, targetRole, surface, enabled))
                        }
                      />
                      <ModuleSurfaceGrid
                        title={t('adminPanel.admin.options.mobileAccess', 'Mobile App Access')}
                        description={t(
                          'adminPanel.admin.options.mobileAccessDescription',
                          'Controls what this role can see and use in the mobile app.',
                        )}
                        role={role}
                        surface="mobileModules"
                        modules={sortedModulesByRole[role]}
                        values={config.roles[role].mobileModules}
                        onToggle={toggleModule}
                        onSetAll={(targetRole, surface, enabled) =>
                          setConfig((current) => setAllModules(current, targetRole, surface, enabled))
                        }
                      />
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/45">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-950 dark:text-white">
                            {t('adminPanel.admin.options.automationSettings', 'Automation Settings')}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {t(
                              'adminPanel.admin.options.automationDescription',
                              'These fields control when enabled reminders should be sent for {role} accounts.',
                              { role: translatedRoleLabel },
                            )}
                          </p>
                        </div>
                        <Badge variant="outline" className="w-fit gap-1">
                          <MailCheck className="h-3.5 w-3.5" />
                          {t('adminPanel.admin.options.reminders', 'Reminders')}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        <div
                          className={cn(
                            'rounded-md border p-4',
                            balanceAlertEnabled
                              ? 'border-lime-200 bg-white dark:border-lime-300/20 dark:bg-slate-900'
                              : 'border-slate-200 bg-white/60 opacity-70 dark:border-slate-800 dark:bg-slate-900/60',
                          )}
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-lime-50 text-lime-700 dark:bg-lime-300/10 dark:text-lime-300">
                              <Wallet className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-950 dark:text-white">
                                {t('adminPanel.admin.options.balanceAlert', 'Balance Alert')}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('adminPanel.admin.options.minimumWalletBalance', 'Minimum wallet balance')}
                              </p>
                            </div>
                          </div>
                          <Label htmlFor={`${role}-balance-alert-minimum`} className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {t('adminPanel.admin.options.balanceBelowUsd', 'Send alert when balance is below USD')}
                          </Label>
                          <Input
                            id={`${role}-balance-alert-minimum`}
                            type="number"
                            min={0}
                            step="0.01"
                            value={config.roles[role].balanceAlertMinimum}
                            onChange={(event) => updateRoleSetting(role, {
                              balanceAlertMinimum: Math.max(0, Number(event.target.value) || 0),
                            })}
                            disabled={!balanceAlertEnabled}
                            className="mt-1 bg-white dark:bg-slate-950"
                          />
                        </div>

                        <div
                          className={cn(
                            'rounded-md border p-4',
                            unusedPackageReminderEnabled
                              ? 'border-sky-200 bg-white dark:border-sky-400/20 dark:bg-slate-900'
                              : 'border-slate-200 bg-white/60 opacity-70 dark:border-slate-800 dark:bg-slate-900/60',
                          )}
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300">
                              <PackageCheck className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-950 dark:text-white">
                                {t('adminPanel.admin.options.unusedActivePackage', 'Unused Active Package')}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('adminPanel.admin.options.reminderTiming', 'Reminder timing')}
                              </p>
                            </div>
                          </div>
                          <Label htmlFor={`${role}-unused-package-days`} className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {t('adminPanel.admin.options.remindAfterDaysUnused', 'Remind after days unused')}
                          </Label>
                          <Input
                            id={`${role}-unused-package-days`}
                            type="number"
                            min={1}
                            max={365}
                            value={config.roles[role].unusedActivePackageReminderDays}
                            onChange={(event) => updateRoleSetting(role, {
                              unusedActivePackageReminderDays: Math.max(1, Math.min(365, Number(event.target.value) || 1)),
                            })}
                            disabled={!unusedPackageReminderEnabled}
                            className="mt-1 bg-white dark:bg-slate-950"
                          />
                        </div>

                        <div
                          className={cn(
                            'rounded-md border p-4',
                            specialOfferReminderEnabled
                              ? 'border-violet-200 bg-white dark:border-violet-400/20 dark:bg-slate-900'
                              : 'border-slate-200 bg-white/60 opacity-70 dark:border-slate-800 dark:bg-slate-900/60',
                          )}
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
                              <Gift className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-950 dark:text-white">
                                {t('adminPanel.admin.options.specialOffer', 'Special Offer')}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('adminPanel.admin.options.reminderContent', 'Reminder content')}
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-3">
                            <div>
                              <Label htmlFor={`${role}-special-offer-days`} className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {t('adminPanel.admin.options.sendEveryDays', 'Send every days')}
                              </Label>
                              <Input
                                id={`${role}-special-offer-days`}
                                type="number"
                                min={1}
                                max={365}
                                value={config.roles[role].specialOfferReminderDays}
                                onChange={(event) => updateRoleSetting(role, {
                                  specialOfferReminderDays: Math.max(1, Math.min(365, Number(event.target.value) || 1)),
                                })}
                                disabled={!specialOfferReminderEnabled}
                                className="mt-1 bg-white dark:bg-slate-950"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`${role}-special-offer-subject`} className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {t('adminPanel.admin.options.emailSubject', 'Email subject')}
                              </Label>
                              <Input
                                id={`${role}-special-offer-subject`}
                                value={config.roles[role].specialOfferSubject}
                                onChange={(event) => updateRoleSetting(role, {
                                  specialOfferSubject: event.target.value,
                                })}
                                disabled={!specialOfferReminderEnabled}
                                className="mt-1 bg-white dark:bg-slate-950"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`${role}-special-offer-message`} className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {t('adminPanel.admin.options.emailMessage', 'Email message')}
                              </Label>
                              <Textarea
                                id={`${role}-special-offer-message`}
                                value={config.roles[role].specialOfferMessage}
                                onChange={(event) => updateRoleSetting(role, {
                                  specialOfferMessage: event.target.value,
                                })}
                                disabled={!specialOfferReminderEnabled}
                                rows={3}
                                className="mt-1 resize-none bg-white dark:bg-slate-950"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'rounded-lg border p-4',
                        autoLogoutEnabled
                          ? 'border-lime-200 bg-lime-50/70 dark:border-lime-300/20 dark:bg-lime-300/10'
                          : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/45',
                      )}
                    >
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                        <div className="flex gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
                              autoLogoutEnabled
                                ? 'bg-lime-300 text-slate-950'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                            )}
                          >
                            <Clock3 className="h-5 w-5" />
                          </div>
                          <div>
                            <Label htmlFor={`${role}-timeout`} className="text-sm font-semibold text-slate-950 dark:text-white">
                              {t('adminPanel.admin.options.loginTime', 'Login Time')}
                            </Label>
                            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <span>{t('adminPanel.admin.options.autoLogoutIs', 'Auto logout is')}</span>
                              <StatusPill enabled={autoLogoutEnabled} />
                              <span>
                                {t('adminPanel.admin.options.forRoleAccounts', 'for {role} accounts.', {
                                  role: translatedRoleLabel,
                                })}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`${role}-timeout`} className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {t('adminPanel.admin.options.minutes', 'Minutes')}
                          </Label>
                          <Input
                            id={`${role}-timeout`}
                            type="number"
                            min={1}
                            max={1440}
                            value={config.roles[role].loginTimeoutMinutes}
                            onChange={(event) => updateTimeout(role, event.target.value)}
                            disabled={!autoLogoutEnabled}
                            className="mt-1 bg-white dark:bg-slate-950"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </>
      )}
    </div>
  );
}
