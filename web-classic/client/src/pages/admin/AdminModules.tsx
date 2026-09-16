import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CheckCircle2,
  Code2,
  Crown,
  CreditCard,
  Eye,
  FileText,
  LifeBuoy,
  Loader2,
  Megaphone,
  Newspaper,
  PackageCheck,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Ticket,
  Tv,
  UserCog,
  Users,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  type RoleOptionRole,
  type RoleOptionsConfig,
} from '@shared/roleOptions';

type AdminModuleRole = RoleOptionRole;
type ModuleSurfaceKey = 'modules' | 'mobileModules';
type SaveModulesPayload = {
  nextConfig: RoleOptionsConfig;
  version: number;
  auto?: boolean;
};

const MODULE_ROLES: AdminModuleRole[] = ['user', 'reseller', 'agent'];
const PREMIUM_BADGE_MODULE_KEY = 'show_premium_badge';

const ROLE_META: Record<AdminModuleRole, {
  icon: LucideIcon;
  eyebrow: string;
  description: string;
  iconClass: string;
}> = {
  user: {
    icon: Users,
    eyebrow: 'User Modules',
    description: 'Enable or disable services and tools for customer accounts.',
    iconClass: 'bg-sky-300/10 text-sky-300',
  },
  reseller: {
    icon: Users,
    eyebrow: 'Reseller Portal',
    description: 'Enable or disable services and platform tools for reseller accounts.',
    iconClass: 'bg-lime-300/10 text-lime-300',
  },
  agent: {
    icon: ShieldCheck,
    eyebrow: 'Agent Workspace',
    description: 'Control which services and tools are available for agent accounts.',
    iconClass: 'bg-cyan-300/10 text-cyan-300',
  },
};

function getModuleIcon(moduleKey: string): LucideIcon {
  if (moduleKey === 'module_premium_services') return Crown;
  if (moduleKey === PREMIUM_BADGE_MODULE_KEY) return Eye;
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
  return UserCog;
}

function serviceModules(role: AdminModuleRole): RoleModuleDefinition[] {
  return ROLE_OPTION_MODULES[role];
}

function surfaceModules(role: AdminModuleRole, surface: ModuleSurfaceKey): RoleModuleDefinition[] {
  const modules = serviceModules(role);
  if (surface === 'modules') {
    return modules.filter((module) => module.key !== PREMIUM_BADGE_MODULE_KEY);
  }
  return modules;
}

function roleLabelKey(role: AdminModuleRole) {
  return `adminPanel.admin.modules.roles.${role}`;
}

function roleTotals(config: RoleOptionsConfig, role: AdminModuleRole) {
  const webModules = surfaceModules(role, 'modules');
  const mobileModules = surfaceModules(role, 'mobileModules');
  const webEnabled = webModules.filter((module) => config.roles[role].modules[module.key]).length;
  const mobileEnabled = mobileModules.filter((module) => config.roles[role].mobileModules[module.key]).length;
  const total = webModules.length + mobileModules.length;
  return {
    enabled: webEnabled + mobileEnabled,
    webEnabled,
    mobileEnabled,
    total,
    percent: total > 0 ? Math.round(((webEnabled + mobileEnabled) / total) * 100) : 0,
  };
}

function setRoleModules(
  config: RoleOptionsConfig,
  role: AdminModuleRole,
  surface: ModuleSurfaceKey,
  enabled: boolean,
): RoleOptionsConfig {
  const nextModules = { ...config.roles[role][surface] };
  surfaceModules(role, surface).forEach((module) => {
    nextModules[module.key] = enabled;
  });

  return {
    ...config,
    roles: {
      ...config.roles,
      [role]: {
        ...config.roles[role],
        [surface]: nextModules,
      },
    },
  };
}

function setPremiumBadgeForAllRoles(config: RoleOptionsConfig, enabled: boolean): RoleOptionsConfig {
  return {
    ...config,
    roles: MODULE_ROLES.reduce((roles, role) => ({
      ...roles,
      [role]: {
        ...roles[role],
        mobileModules: {
          ...roles[role].mobileModules,
          [PREMIUM_BADGE_MODULE_KEY]: enabled,
        },
      },
    }), config.roles),
  };
}

function StatusPill({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const Icon = enabled ? CheckCircle2 : XCircle;
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none',
        enabled
          ? 'border-lime-300 bg-lime-300 text-slate-950 dark:border-lime-300 dark:bg-lime-300 dark:text-slate-950'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200',
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {enabled
        ? t('adminPanel.customers.modules.enabled', 'Enabled')
        : t('adminPanel.customers.modules.disabled', 'Disabled')}
    </span>
  );
}

function ModuleSurfaceSection({
  title,
  description,
  role,
  surface,
  modules,
  values,
  onToggle,
}: {
  title: string;
  description: string;
  role: AdminModuleRole;
  surface: ModuleSurfaceKey;
  modules: RoleModuleDefinition[];
  values: Record<string, boolean>;
  onToggle: (role: AdminModuleRole, surface: ModuleSurfaceKey, moduleKey: string, enabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const enabled = modules.filter((module) => values[module.key]).length;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/45">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
            <Badge variant="outline" className="border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {t('adminPanel.customers.modules.enabledCount', '{enabled}/{total} enabled', {
                enabled,
                total: modules.length,
              })}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggle(role, surface, '__all__', true)}
          >
            {t('adminPanel.customers.modules.enableAll', 'Enable All')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggle(role, surface, '__all__', false)}
          >
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
                'flex min-h-16 items-center justify-between gap-3 rounded-md border px-3 py-2.5',
                checked
                  ? 'border-slate-200 bg-white shadow-sm dark:border-emerald-400/15 dark:bg-slate-900'
                  : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/55',
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
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
                onCheckedChange={(next) => onToggle(role, surface, module.key, next)}
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

export default function AdminModules() {
  const { toast } = useToast();
  const { t, isRTL } = useTranslation();
  const [config, setConfig] = useState<RoleOptionsConfig>(() => getDefaultRoleOptionsConfig());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveVersionRef = useRef(0);

  const { data, isLoading } = useQuery<RoleOptionsConfig>({
    queryKey: ['/api/admin/options'],
  });

  useEffect(() => {
    if (data) {
      setConfig(normalizeRoleOptionsConfig(data));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async ({ nextConfig }: SaveModulesPayload) => {
      const response = await apiRequest('PUT', '/api/admin/options', nextConfig);
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || t('adminPanel.admin.modules.saveFailedDescription', 'Could not save modules.'));
      }
      return json;
    },
    onMutate: () => {
      setSaveError(null);
    },
    onSuccess: async (response, variables) => {
      if (variables.version !== saveVersionRef.current) {
        return;
      }
      const nextConfig = normalizeRoleOptionsConfig(response.data);
      setConfig(nextConfig);
      setLastSavedAt(new Date());
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/options'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/options'] });
      if (!variables.auto) {
        toast({
          title: t('adminPanel.admin.modules.saveSuccess', 'Modules saved'),
          description: t(
            'adminPanel.admin.modules.saveSuccessDescription',
            'User, Agent, and Reseller module access was updated.',
          ),
        });
      }
    },
    onError: (error: any, variables) => {
      const message = error.message || t('adminPanel.admin.modules.saveFailedDescription', 'Could not save modules.');
      if (variables?.version === saveVersionRef.current) {
        setSaveError(message);
      }
      toast({
        title: t('adminPanel.admin.modules.saveFailed', 'Modules failed'),
        description: message,
        variant: 'destructive',
      });
    },
  });

  const saveConfig = (nextConfig: RoleOptionsConfig, auto = true) => {
    const version = saveVersionRef.current + 1;
    saveVersionRef.current = version;
    saveMutation.mutate({ nextConfig, version, auto });
  };

  const updateAndAutoSave = (updater: (current: RoleOptionsConfig) => RoleOptionsConfig) => {
    const nextConfig = updater(config);
    setConfig(nextConfig);
    saveConfig(nextConfig, true);
  };

  const totals = useMemo(() => {
    return MODULE_ROLES.reduce((acc, role) => {
      acc[role] = roleTotals(config, role);
      return acc;
    }, {} as Record<AdminModuleRole, ReturnType<typeof roleTotals>>);
  }, [config]);

  const toggleModule = (
    role: AdminModuleRole,
    surface: ModuleSurfaceKey,
    moduleKey: string,
    enabled: boolean,
  ) => {
    if (moduleKey === '__all__') {
      updateAndAutoSave((current) => setRoleModules(current, role, surface, enabled));
      return;
    }

    updateAndAutoSave((current) => ({
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

  const saveStatus = saveMutation.isPending
    ? t('adminPanel.admin.modules.autoSaving', 'Auto-save on - saving changes...')
    : saveError
      ? t('adminPanel.admin.modules.autoSaveFailed', 'Auto-save failed')
      : lastSavedAt
        ? t('adminPanel.admin.modules.autoSaved', 'Auto-save on - saved')
        : t('adminPanel.admin.modules.autoSaveOn', 'Auto-save on');

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn('admin-light-surface space-y-6 p-6 lg:p-8', isRTL ? 'text-right' : 'text-left')}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-3 border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-200 dark:hover:bg-cyan-300/10" variant="outline">
            {t('adminPanel.admin.modules.badge', 'Settings')}
          </Badge>
          <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">
            {t('adminPanel.admin.modules.title', 'Modules')}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            {t(
              'adminPanel.admin.modules.description',
              'Enable or disable platform modules separately for web and mobile app access.',
            )}
          </p>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <span className={cn('text-xs font-medium', saveError ? 'text-red-500 dark:text-red-300' : 'text-slate-500 dark:text-slate-400')}>
            {saveStatus}
          </span>
          <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => updateAndAutoSave((current) => setPremiumBadgeForAllRoles(current, true))}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {t('adminPanel.admin.modules.showPremiumBadgeAll', 'Show Premium Badge - All')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => updateAndAutoSave((current) => setPremiumBadgeForAllRoles(current, false))}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {t('adminPanel.admin.modules.hidePremiumBadgeAll', 'Hide Premium Badge - All')}
            </Button>
            <Button
              type="button"
              onClick={() => saveConfig(config, false)}
              disabled={saveMutation.isPending}
              className="gap-2 bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('adminPanel.admin.modules.save', 'Save Modules')}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="user" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 md:grid-cols-3">
          {MODULE_ROLES.map((role) => {
            const meta = ROLE_META[role];
            const RoleIcon = meta.icon;
            const translatedRoleLabel = t(roleLabelKey(role), ROLE_OPTION_LABELS[role]);
            return (
              <TabsTrigger
                key={role}
                value={role}
                className="h-auto justify-start gap-3 rounded-md border border-transparent px-4 py-3 text-left data-[state=active]:border-lime-300 data-[state=active]:bg-lime-50 data-[state=active]:text-slate-950 data-[state=active]:shadow-none dark:data-[state=active]:bg-lime-300 dark:data-[state=active]:text-slate-950"
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', meta.iconClass)}>
                  <RoleIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {t('adminPanel.admin.modules.roleModulesTab', "{role}'s Modules", {
                      role: translatedRoleLabel,
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

        {MODULE_ROLES.map((role) => {
          const meta = ROLE_META[role];
          const RoleIcon = meta.icon;
          const translatedRoleLabel = t(roleLabelKey(role), ROLE_OPTION_LABELS[role]);
          const modules = [...serviceModules(role)].sort((left, right) =>
            t(`adminPanel.customers.modules.${left.key}`, left.label).localeCompare(
              t(`adminPanel.customers.modules.${right.key}`, right.label),
            ),
          );
          const webModules = modules.filter((module) => module.key !== PREMIUM_BADGE_MODULE_KEY);
          return (
            <TabsContent key={role} value={role} className="mt-0">
              <Card className="overflow-hidden rounded-lg border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/60">
                <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/80">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-md', meta.iconClass)}>
                        <RoleIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-slate-950 dark:text-white">
                          {t('adminPanel.admin.modules.roleModulesTab', "{role}'s Modules", {
                            role: translatedRoleLabel,
                          })}
                        </CardTitle>
                        <CardDescription className="mt-1 text-slate-600 dark:text-slate-400">
                          {t(
                            'adminPanel.admin.modules.roleDescription',
                            'Select which modules this account type can access on web and mobile.',
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
                        onClick={() => updateAndAutoSave((current) => setRoleModules(setRoleModules(current, role, 'modules', true), role, 'mobileModules', true))}
                      >
                        {t('adminPanel.admin.options.enableAllSurfaces', 'Enable All Surfaces')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateAndAutoSave((current) => setRoleModules(setRoleModules(current, role, 'modules', false), role, 'mobileModules', false))}
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
                <CardContent className="p-5">
                  <div className="grid gap-5 xl:grid-cols-2">
                    <ModuleSurfaceSection
                      title={t('adminPanel.admin.options.webAccess', 'Web UI Access')}
                      description={t(
                        'adminPanel.admin.options.webAccessDescription',
                        'Controls what this role can see and use in the browser portal.',
                      )}
                      role={role}
                      surface="modules"
                      modules={webModules}
                      values={config.roles[role].modules}
                      onToggle={toggleModule}
                    />
                    <ModuleSurfaceSection
                      title={t('adminPanel.admin.options.mobileAccess', 'Mobile App Access')}
                      description={t(
                        'adminPanel.admin.options.mobileAccessDescription',
                        'Controls what this role can see and use in the mobile app.',
                      )}
                      role={role}
                      surface="mobileModules"
                      modules={modules}
                      values={config.roles[role].mobileModules}
                      onToggle={toggleModule}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
        <div className="flex flex-col items-end gap-2">
          <span className={cn('text-xs font-medium', saveError ? 'text-red-500 dark:text-red-300' : 'text-slate-500 dark:text-slate-400')}>
            {saveStatus}
          </span>
          <Button
            type="button"
            onClick={() => saveConfig(config, false)}
            disabled={saveMutation.isPending}
            className="gap-2 bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200"
            data-testid="button-save-modules-bottom"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('adminPanel.admin.modules.save', 'Save Modules')}
          </Button>
        </div>
      </div>
    </div>
  );
}
