import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  CheckCircle2,
  Code2,
  CreditCard,
  Edit2,
  FileText,
  LifeBuoy,
  Loader2,
  Megaphone,
  Newspaper,
  PackageCheck,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Ticket,
  Trash2,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { ROLE_OPTION_LABELS, ROLE_OPTION_MODULES } from '@shared/roleOptions';

type StorefrontSectionConfig = {
  section: string;
  isEnabled: boolean;
  title: string;
  description: string;
  primaryUrl: string;
  agentEnabled: boolean;
  subResellerEnabled: boolean;
  settings?: Record<string, any>;
};

type StorefrontItem = {
  id: string;
  title?: string;
  slug?: string;
  url?: string;
  imageUrl?: string;
  subtitle?: string;
  content?: string;
  question?: string;
  answer?: string;
  locale?: string;
  key?: string;
  value?: string;
  method?: string;
  endpoint?: string;
  isEnabled?: boolean;
};

type Props = {
  section: string;
};

const defaultForm: StorefrontSectionConfig = {
  section: '',
  isEnabled: true,
  title: '',
  description: '',
  primaryUrl: '',
  agentEnabled: false,
  subResellerEnabled: false,
  settings: {},
};

const textBySection: Record<string, { singular: string; plural: string; description: string }> = {
  banner: {
    singular: 'Banner',
    plural: 'Banners',
    description: 'Create storefront banner slides with image links and package or campaign URLs.',
  },
  pages: {
    singular: 'Page',
    plural: 'Pages',
    description: 'Create storefront pages for this reseller or agent brand.',
  },
  faq: {
    singular: 'FAQ',
    plural: 'FAQ',
    description: 'Create storefront questions and answers for customers.',
  },
  blog: {
    singular: 'Blog Post',
    plural: 'Blog',
    description: 'Create storefront blog posts for this reseller or agent brand.',
  },
  languages: {
    singular: 'Language',
    plural: 'Languages',
    description: 'Choose languages available on this storefront.',
  },
  translations: {
    singular: 'Translation',
    plural: 'Translations',
    description: 'Manage storefront translation keys and values.',
  },
  'api-docs': {
    singular: 'API Endpoint',
    plural: 'API Docs',
    description: 'Publish storefront API documentation for this account.',
  },
};

function sectionTitle(section: string) {
  if (section === 'app-stores') return 'App Stores';
  return textBySection[section]?.plural || section.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function settingValue(settings: Record<string, unknown> | undefined, key: string) {
  return String(settings?.[key] || '');
}

function itemsFromSettings(settings?: Record<string, any>): StorefrontItem[] {
  return Array.isArray(settings?.items) ? settings.items : [];
}

function blankItem(section: string): StorefrontItem {
  const id = `${section}-${Date.now()}`;
  if (section === 'faq') return { id, question: '', answer: '', isEnabled: true };
  if (section === 'languages') return { id, title: '', locale: '', isEnabled: true };
  if (section === 'translations') return { id, key: '', locale: 'en', value: '', isEnabled: true };
  if (section === 'api-docs') return { id, title: '', method: 'GET', endpoint: '', content: '', isEnabled: true };
  if (section === 'banner') return { id, title: '', subtitle: '', imageUrl: '', url: '', isEnabled: true };
  return { id, title: '', slug: '', content: '', isEnabled: true };
}

function displayTitle(section: string, item: StorefrontItem) {
  if (section === 'faq') return item.question || 'Untitled FAQ';
  if (section === 'translations') return item.key || 'Untitled translation';
  if (section === 'api-docs') return `${item.method || 'GET'} ${item.endpoint || 'Endpoint'}`;
  if (section === 'languages') return item.title || item.locale || 'Untitled language';
  return item.title || 'Untitled item';
}

type ModuleTargetRole = 'agent' | 'reseller';

const MODULE_ROLE_META: Record<ModuleTargetRole, {
  icon: LucideIcon;
  eyebrow: string;
  description: string;
  iconClass: string;
}> = {
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

function modulesForRole(role: ModuleTargetRole) {
  return [...ROLE_OPTION_MODULES[role]].sort((left, right) => left.label.localeCompare(right.label));
}

function defaultModuleEnabled(moduleKey: string) {
  return ![
    'auto_logout',
    'balance_alert',
    'unused_active_package_reminder',
    'special_offer_reminder',
  ].includes(moduleKey);
}

function moduleEnabled(settings: StorefrontSectionConfig['settings'], role: ModuleTargetRole, moduleKey: string) {
  const value = settings?.modules?.[role]?.[moduleKey];
  return typeof value === 'boolean' ? value : defaultModuleEnabled(moduleKey);
}

function roleTotals(settings: StorefrontSectionConfig['settings'], role: ModuleTargetRole) {
  const modules = ROLE_OPTION_MODULES[role];
  const enabled = modules.filter((module) => moduleEnabled(settings, role, module.key)).length;
  const total = modules.length;
  return {
    enabled,
    total,
    percent: total > 0 ? Math.round((enabled / total) * 100) : 0,
  };
}

function StatusPill({ enabled }: { enabled: boolean }) {
  const Icon = enabled ? CheckCircle2 : XCircle;
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none',
        enabled
          ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
          : 'border-slate-700/70 bg-slate-800/55 text-slate-400',
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  );
}

function ItemEditor({
  section,
  item,
  onChange,
}: {
  section: string;
  item: StorefrontItem;
  onChange: (item: StorefrontItem) => void;
}) {
  const update = (field: keyof StorefrontItem, value: string | boolean) => onChange({ ...item, [field]: value });

  if (section === 'faq') {
    return (
      <div className="grid gap-4">
        <div>
          <Label>Question</Label>
          <Input className="mt-2" value={item.question || ''} onChange={(event) => update('question', event.target.value)} />
        </div>
        <div>
          <Label>Answer</Label>
          <Textarea className="mt-2 min-h-28" value={item.answer || ''} onChange={(event) => update('answer', event.target.value)} />
        </div>
      </div>
    );
  }

  if (section === 'translations') {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label>Key</Label>
          <Input className="mt-2" value={item.key || ''} onChange={(event) => update('key', event.target.value)} />
        </div>
        <div>
          <Label>Locale</Label>
          <Input className="mt-2" value={item.locale || ''} onChange={(event) => update('locale', event.target.value)} placeholder="en" />
        </div>
        <div>
          <Label>Value</Label>
          <Input className="mt-2" value={item.value || ''} onChange={(event) => update('value', event.target.value)} />
        </div>
      </div>
    );
  }

  if (section === 'languages') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Language Name</Label>
          <Input className="mt-2" value={item.title || ''} onChange={(event) => update('title', event.target.value)} placeholder="English" />
        </div>
        <div>
          <Label>Locale Code</Label>
          <Input className="mt-2" value={item.locale || ''} onChange={(event) => update('locale', event.target.value)} placeholder="en" />
        </div>
      </div>
    );
  }

  if (section === 'api-docs') {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
          <div>
            <Label>Method</Label>
            <Input className="mt-2" value={item.method || ''} onChange={(event) => update('method', event.target.value.toUpperCase())} placeholder="GET" />
          </div>
          <div>
            <Label>Endpoint</Label>
            <Input className="mt-2" value={item.endpoint || ''} onChange={(event) => update('endpoint', event.target.value)} placeholder="/api/storefront/orders" />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea className="mt-2 min-h-28" value={item.content || ''} onChange={(event) => update('content', event.target.value)} />
        </div>
      </div>
    );
  }

  if (section === 'banner') {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input className="mt-2" value={item.title || ''} onChange={(event) => update('title', event.target.value)} />
          </div>
          <div>
            <Label>Button / Link URL</Label>
            <Input className="mt-2" value={item.url || ''} onChange={(event) => update('url', event.target.value)} />
          </div>
        </div>
        <div>
          <Label>Image URL</Label>
          <Input className="mt-2" value={item.imageUrl || ''} onChange={(event) => update('imageUrl', event.target.value)} />
        </div>
        <div>
          <Label>Subtitle</Label>
          <Textarea className="mt-2 min-h-24" value={item.subtitle || ''} onChange={(event) => update('subtitle', event.target.value)} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Title</Label>
          <Input className="mt-2" value={item.title || ''} onChange={(event) => update('title', event.target.value)} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input className="mt-2" value={item.slug || ''} onChange={(event) => update('slug', event.target.value)} placeholder="/about" />
        </div>
      </div>
      <div>
        <Label>Content</Label>
        <Textarea className="mt-2 min-h-36" value={item.content || ''} onChange={(event) => update('content', event.target.value)} />
      </div>
    </div>
  );
}

export default function ResellerStorefrontSection({ section }: Props) {
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StorefrontSectionConfig>({ ...defaultForm, section });
  const [draftItem, setDraftItem] = useState<StorefrontItem | null>(null);
  const title = useMemo(() => sectionTitle(section), [section]);
  const itemMeta = textBySection[section];

  const { data, isLoading } = useQuery<StorefrontSectionConfig>({
    queryKey: ['/api/reseller/storefront/setup', section],
    queryFn: async () => {
      const response = await fetch(`/api/reseller/storefront/setup/${section}`, { credentials: 'include' });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.message || 'Failed to load storefront section');
      return json.data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({ ...defaultForm, ...data, settings: data.settings || {} });
    }
  }, [data]);

  const updateField = (field: keyof StorefrontSectionConfig, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateSetting = (field: string, value: string) => {
    setForm((current) => ({
      ...current,
      settings: {
        ...(current.settings || {}),
        [field]: value,
      },
    }));
  };

  const updateModule = (targetRole: 'agent' | 'reseller', moduleKey: string, enabled: boolean) => {
    setForm((current) => {
      const modules = current.settings?.modules || {};
      return {
        ...current,
        settings: {
          ...(current.settings || {}),
          modules: {
            ...modules,
            [targetRole]: {
              ...(modules[targetRole] || {}),
              [moduleKey]: enabled,
            },
          },
        },
      };
    });
  };

  const setAllRoleModules = (targetRole: ModuleTargetRole, enabled: boolean) => {
    setForm((current) => {
      const modules = current.settings?.modules || {};
      const nextRoleModules = ROLE_OPTION_MODULES[targetRole].reduce<Record<string, boolean>>((acc, module) => {
        acc[module.key] = enabled;
        return acc;
      }, {});

      return {
        ...current,
        agentEnabled: targetRole === 'agent' ? true : current.agentEnabled,
        subResellerEnabled: targetRole === 'reseller' ? true : current.subResellerEnabled,
        settings: {
          ...(current.settings || {}),
          modules: {
            ...modules,
            [targetRole]: nextRoleModules,
          },
        },
      };
    });
  };

  const upsertItem = () => {
    if (!draftItem) return;
    setForm((current) => {
      const items = itemsFromSettings(current.settings);
      const exists = items.some((item) => item.id === draftItem.id);
      const nextItems = exists
        ? items.map((item) => (item.id === draftItem.id ? draftItem : item))
        : [...items, draftItem];
      return {
        ...current,
        settings: {
          ...(current.settings || {}),
          items: nextItems,
        },
      };
    });
    setDraftItem(null);
  };

  const deleteItem = (id: string) => {
    setForm((current) => ({
      ...current,
      settings: {
        ...(current.settings || {}),
        items: itemsFromSettings(current.settings).filter((item) => item.id !== id),
      },
    }));
  };

  const toggleItem = (id: string, enabled: boolean) => {
    setForm((current) => ({
      ...current,
      settings: {
        ...(current.settings || {}),
        items: itemsFromSettings(current.settings).map((item) => (
          item.id === id ? { ...item, isEnabled: enabled } : item
        )),
      },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/reseller/storefront/setup/${section}`, form);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reseller/storefront/setup', section] });
      toast({
        title: `${title} saved`,
        description: 'Your storefront setup changes have been saved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Could not save storefront setup.',
        variant: 'destructive',
      });
    },
  });

  const items = itemsFromSettings(form.settings);
  const moduleTargets: Array<'agent' | 'reseller'> =
    user?.role === 'agent' ? ['agent'] : ['agent', 'reseller'];

  if (section === 'modules') {
    const totals = moduleTargets.reduce<Record<ModuleTargetRole, ReturnType<typeof roleTotals>>>((acc, role) => {
      acc[role] = roleTotals(form.settings, role);
      return acc;
    }, {} as Record<ModuleTargetRole, ReturnType<typeof roleTotals>>);

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-3 border-cyan-300/25 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300/10" variant="outline">
              Settings
            </Badge>
            <h1 className="text-3xl font-semibold text-white">Modules</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Enable or disable platform modules separately for Reseller and Agent accounts.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
            className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Modules
          </Button>
        </div>

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {moduleTargets.map((role) => {
                const meta = MODULE_ROLE_META[role];
                const RoleIcon = meta.icon;
                return (
                  <Card key={role} className="rounded-lg border-slate-700 bg-slate-950/60">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-11 w-11 items-center justify-center rounded-md', meta.iconClass)}>
                          <RoleIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-400">{meta.eyebrow}</p>
                          <h2 className="text-lg font-semibold text-white">Modules for {ROLE_OPTION_LABELS[role]}</h2>
                        </div>
                        <Badge className="bg-slate-800 text-slate-200 hover:bg-slate-800">
                          {totals[role].enabled}/{totals[role].total}
                        </Badge>
                      </div>
                      <Progress value={totals[role].percent} className="mt-4 h-2 bg-slate-800 [&>div]:bg-cyan-300" />
                      <p className="mt-3 text-sm text-slate-400">{meta.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-6">
              {moduleTargets.map((role) => {
                const meta = MODULE_ROLE_META[role];
                const RoleIcon = meta.icon;
                const modules = modulesForRole(role);
                return (
                  <Card key={role} className="overflow-hidden rounded-lg border-slate-700 bg-slate-950/60">
                    <CardHeader className="border-b border-slate-800 bg-slate-950/80 px-5 py-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-md', meta.iconClass)}>
                            <RoleIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-white">Modules for {ROLE_OPTION_LABELS[role]}</CardTitle>
                            <CardDescription className="mt-1 text-slate-400">
                              Select which modules this account type can access.
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="gap-1 bg-cyan-300 text-slate-950 hover:bg-cyan-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {totals[role].enabled} Enabled
                          </Badge>
                          <Button type="button" variant="outline" size="sm" onClick={() => setAllRoleModules(role, true)}>
                            Enable All
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setAllRoleModules(role, false)}>
                            Disable All
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {modules.map((module) => {
                          const checked = moduleEnabled(form.settings, role, module.key);
                          const ModuleIcon = getModuleIcon(module.key);
                          return (
                            <div
                              key={module.key}
                              className={cn(
                                'flex min-h-16 items-center justify-between gap-3 rounded-md border px-3 py-2.5',
                                checked
                                  ? 'border-emerald-400/15 bg-slate-900'
                                  : 'border-slate-800 bg-slate-950/55',
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div
                                  className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                                    checked ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-800/70 text-slate-500',
                                  )}
                                >
                                  <ModuleIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold leading-5 text-white">{module.label}</p>
                                  <div className="mt-2">
                                    <StatusPill enabled={checked} />
                                  </div>
                                </div>
                              </div>
                              <Switch
                                checked={checked}
                                onCheckedChange={(enabled) => updateModule(role, module.key, enabled)}
                                aria-label={`${module.label} ${checked ? 'enabled' : 'disabled'}`}
                                className="h-5 w-9 data-[state=checked]:bg-cyan-300 data-[state=unchecked]:bg-slate-700 [&>span]:h-4 [&>span]:w-4 [&>span[data-state=checked]]:translate-x-4"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-teal-300" />
          <h1 className="text-3xl font-semibold text-white">{title}</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          {itemMeta?.description || 'Configure this section for your own reseller or agent storefront.'}
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-950/70 text-white">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{title} Setup</CardTitle>
              <CardDescription className="text-slate-400">
                These controls are scoped to this reseller or agent storefront.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3">
              <Label htmlFor={`${section}-enabled`} className="text-sm text-slate-200">
                Enable
              </Label>
              <Switch
                id={`${section}-enabled`}
                checked={form.isEnabled}
                onCheckedChange={(checked) => updateField('isEnabled', checked)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="flex items-center gap-2 py-10 text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading section settings...
            </div>
          ) : (
            <>
              {section === 'app-stores' && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="app-stores-apple">Apple App Store URL</Label>
                    <Input
                      id="app-stores-apple"
                      className="mt-2"
                      value={settingValue(form.settings, 'appleAppStoreUrl')}
                      onChange={(event) => updateSetting('appleAppStoreUrl', event.target.value)}
                      placeholder="https://apps.apple.com/app/..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="app-stores-google">Google Play URL</Label>
                    <Input
                      id="app-stores-google"
                      className="mt-2"
                      value={settingValue(form.settings, 'googlePlayUrl')}
                      onChange={(event) => updateSetting('googlePlayUrl', event.target.value)}
                      placeholder="https://play.google.com/store/apps/details?id=..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="app-stores-huawei">AppGallery URL</Label>
                    <Input
                      id="app-stores-huawei"
                      className="mt-2"
                      value={settingValue(form.settings, 'appGalleryUrl')}
                      onChange={(event) => updateSetting('appGalleryUrl', event.target.value)}
                      placeholder="https://appgallery.huawei.com/app/..."
                    />
                  </div>
                </div>
              )}

              {section === 'modules' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                      <div>
                        <p className="font-medium text-slate-100">Apply to own Agents</p>
                        <p className="mt-1 text-sm text-slate-400">Use this storefront module setup for Agent accounts.</p>
                      </div>
                      <Switch
                        checked={form.agentEnabled}
                        onCheckedChange={(checked) => updateField('agentEnabled', checked)}
                      />
                    </div>
                    {user?.role !== 'agent' && (
                      <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                        <div>
                          <p className="font-medium text-slate-100">Apply to own Sub Resellers</p>
                          <p className="mt-1 text-sm text-slate-400">Use this storefront module setup for Sub Resellers.</p>
                        </div>
                        <Switch
                          checked={form.subResellerEnabled}
                          onCheckedChange={(checked) => updateField('subResellerEnabled', checked)}
                        />
                      </div>
                    )}
                  </div>

                  {moduleTargets.map((targetRole) => (
                    <div key={targetRole} className="rounded-lg border border-slate-800">
                      <div className="border-b border-slate-800 px-4 py-3">
                        <h3 className="font-semibold capitalize text-slate-100">{targetRole} Modules</h3>
                      </div>
                      <div className="grid gap-0 md:grid-cols-2">
                        {ROLE_OPTION_MODULES[targetRole].map((module) => {
                          const moduleConfig = form.settings?.modules?.[targetRole] || {};
                          const checked = moduleConfig[module.key] !== false;
                          return (
                            <div key={module.key} className="flex items-center justify-between gap-4 border-b border-slate-800/70 p-4 last:border-b-0 md:odd:border-r">
                              <div>
                                <p className="font-medium text-slate-100">{module.label}</p>
                                <p className="mt-1 text-sm text-slate-400">{module.description}</p>
                              </div>
                              <Switch checked={checked} onCheckedChange={(enabled) => updateModule(targetRole, module.key, enabled)} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {section !== 'modules' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor={`${section}-title`}>Section Title</Label>
                    <Input
                      id={`${section}-title`}
                      className="mt-2"
                      value={form.title}
                      onChange={(event) => updateField('title', event.target.value)}
                      placeholder={`${title} title`}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${section}-url`}>{section === 'app-stores' ? 'Landing Page URL' : 'URL or Slug'}</Label>
                    <Input
                      id={`${section}-url`}
                      className="mt-2"
                      value={form.primaryUrl}
                      onChange={(event) => updateField('primaryUrl', event.target.value)}
                      placeholder={section === 'app-stores' ? '/apps' : '/storefront-section'}
                    />
                  </div>
                </div>
              )}

              {section !== 'modules' && (
                <div>
                  <Label htmlFor={`${section}-description`}>Section Description</Label>
                  <Textarea
                    id={`${section}-description`}
                    className="mt-2 min-h-24"
                    value={form.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    placeholder={`Write the storefront ${title.toLowerCase()} setup details here.`}
                  />
                </div>
              )}

              {itemMeta && (
                <Card className="border-slate-800 bg-slate-900/50 text-white">
                  <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle>{itemMeta.plural} Items</CardTitle>
                        <CardDescription className="text-slate-400">
                          Add, edit, disable, or remove storefront-scoped {itemMeta.plural.toLowerCase()}.
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDraftItem(blankItem(section))}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add {itemMeta.singular}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {draftItem && (
                      <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-4">
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <h3 className="font-semibold text-slate-100">
                            {items.some((item) => item.id === draftItem.id) ? 'Edit' : 'Add'} {itemMeta.singular}
                          </h3>
                          <div className="flex items-center gap-3">
                            <Label className="text-sm text-slate-300">Enabled</Label>
                            <Switch
                              checked={draftItem.isEnabled !== false}
                              onCheckedChange={(checked) => setDraftItem({ ...draftItem, isEnabled: checked })}
                            />
                          </div>
                        </div>
                        <ItemEditor section={section} item={draftItem} onChange={setDraftItem} />
                        <div className="mt-4 flex justify-end gap-2">
                          <Button type="button" variant="ghost" onClick={() => setDraftItem(null)}>
                            Cancel
                          </Button>
                          <Button type="button" className="bg-primary-gradient text-white" onClick={upsertItem}>
                            Save Item
                          </Button>
                        </div>
                      </div>
                    )}

                    {items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-700 py-10 text-center text-sm text-slate-400">
                        No {itemMeta.plural.toLowerCase()} added for this storefront yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-slate-100">{displayTitle(section, item)}</p>
                                <Badge variant="outline" className={item.isEnabled === false ? 'border-slate-700 text-slate-400' : 'border-emerald-400/40 text-emerald-300'}>
                                  {item.isEnabled === false ? 'Disabled' : 'Enabled'}
                                </Badge>
                              </div>
                              <p className="mt-1 truncate text-sm text-slate-400">
                                {item.slug || item.url || item.endpoint || item.locale || item.subtitle || item.content || item.answer || 'Storefront item'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={item.isEnabled !== false} onCheckedChange={(checked) => toggleItem(item.id, checked)} />
                              <Button type="button" variant="outline" size="icon" onClick={() => setDraftItem(item)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="destructive" size="icon" onClick={() => deleteItem(item.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button
                  className="bg-primary-gradient text-white"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save {title}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
