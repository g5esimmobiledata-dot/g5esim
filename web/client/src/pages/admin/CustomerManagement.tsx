import { type ReactNode, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Search,
  BarChart3,
  Code2,
  Eye,
  Download,
  DollarSign,
  FileText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Package,
  Activity,
  CheckCircle,
  XCircle,
  Ban,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Mail,
  Megaphone,
  MapPin,
  Phone,
  Power,
  ExternalLink,
  Copy,
  Trash2,
  Server,
  RefreshCcw,
  Save,
  LogIn,
  Ticket,
  Tv,
  Smartphone,
  LifeBuoy,
  SlidersHorizontal,
  Gift,
  CreditCard,
  Award,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from "@/lib/utils";
import type { User, Order, AiraloPackage as PackageType, Destination, WalletTransaction } from '@shared/schema';
import { MoreVertical } from 'lucide-react';
import { formatDisplayUserId, formatDisplayOrderId } from '@shared/utils';
import {
  normalizeRoleOptionsConfig,
  ROLE_OPTION_MODULES,
  type RoleModuleDefinition,
  type RoleOptionRole,
  type RoleOptionsConfig,
} from '@shared/roleOptions';
import { useTranslation } from '@/contexts/TranslationContext';
import { useAdmin } from '@/hooks/use-admin';
import { formatDisplayValue } from '@/lib/displayText';

type OrderWithDetails = Order & {
  package: PackageType & { destination?: Destination };
};

type CustomerActionType = 'balance' | 'password' | 'email' | 'package' | 'voucherLimit' | 'modules' | 'security' | null;
type CustomerRole = 'customer' | 'agent' | 'reseller';
type CustomerAccountMode = 'live' | 'sandbox' | 'demo';

type CustomerManagementProps = {
  roleFilter?: CustomerRole;
  title?: string;
  description?: string;
  detailsCustomerId?: string;
  createMode?: boolean;
};

type AdminPackageOption = {
  id: string;
  title: string;
  dataAmount: string;
  validity: number;
  destinationName?: string | null;
  regionName?: string | null;
  providerName?: string | null;
  price?: string | number;
  currency?: string;
  isEnabled?: boolean;
};

type ResellerProviderAccess = {
  providerId: string;
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
  platformEnabled: boolean;
  totalPackages: number;
  activePackages: number;
  customPrices: number;
  resellerPriceFrom?: string | null;
};

type CustomerModuleSettings = {
  customerId: string;
  role: RoleOptionRole;
  modules: Record<string, boolean>;
  mobileModules: Record<string, boolean>;
  defaults?: Record<string, boolean>;
  mobileDefaults?: Record<string, boolean>;
};

type ResellerProviderAccessResponse = {
  providers: ResellerProviderAccess[];
};

type RateTableOption = {
  id: string;
  name: string;
  defaultMarginPercent?: string;
  packages?: number;
  enabledPackages?: number;
};

type KycReviewDocument = {
  id: string;
  documentType: string;
  fileName: string;
  filePath: string;
  status: string;
  rejectionReason?: string | null;
  createdAt: string;
};

type CustomerRateAssignment = {
  id?: string;
  rateTableId?: string;
  userId?: string;
  rateName?: string | null;
};

type CustomerDetailsTab = 'details' | 'orders' | 'wallet' | 'modules' | 'activity';

type AdminWalletTransaction = WalletTransaction & {
  refundedAmount?: string;
  refundableAmount?: string;
  refundDirection?: 'credit' | 'debit';
};

type CustomerVoucherLimit = {
  limit: string;
  used: string;
  remaining: string | null;
  unlimited: boolean;
  applies: boolean;
};

type CustomerSecuritySettings = {
  twoFactorEnabled: boolean;
  otpEmailEnabled: boolean;
  otpPhoneEnabled: boolean;
  authenticatorConfigured?: boolean;
};

type SenderIdLimitStatus = {
  customerId?: string;
  role?: CustomerRole;
  defaultLimit: number;
  overrideLimit: number | null;
  effectiveLimit: number;
  used: number;
  remaining: number;
  senders: string[];
};

function formatDateForInput(value?: Date | string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function CustomerSheetRow({
  leftLabel,
  left,
  rightLabel,
  right,
  highlight = false,
}: {
  leftLabel: string;
  left: ReactNode;
  rightLabel?: string;
  right?: ReactNode;
  highlight?: boolean;
}) {
  const { isRTL } = useTranslation();
  const rowClass = rightLabel ? 'xl:grid-cols-2' : '';
  const fieldGroupClass = cn(
    'grid min-h-[46px] items-center gap-x-4 gap-y-1',
    isRTL ? 'xl:grid-cols-[minmax(0,1fr)_170px]' : 'xl:grid-cols-[145px_minmax(0,1fr)]',
  );
  const getRtlLabelText = (label: string) => label.trim().replace(/[:：]+$/, '').trim();
  const renderFieldGroup = (label: string, content: ReactNode) => (
    <div className={fieldGroupClass} dir="ltr">
      {isRTL ? (
        <>
          <div className="min-w-0 [&>*]:w-full" dir="rtl">{content}</div>
          <label className="flex w-full items-center justify-between gap-3 whitespace-nowrap text-sm font-medium text-slate-950" dir="rtl">
            <span className="min-w-0 text-right">{getRtlLabelText(label)}</span>
            <span className="shrink-0" aria-hidden="true">:</span>
          </label>
        </>
      ) : (
        <>
          <label className="whitespace-nowrap text-left text-sm font-medium text-slate-950">{label}</label>
          <div className="min-w-0 [&>*]:w-full">{content}</div>
        </>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'grid items-center gap-x-4 gap-y-1 px-3 py-1',
        rowClass,
        highlight && 'rounded-sm bg-slate-100',
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {renderFieldGroup(leftLabel, left)}
      {rightLabel && right ? renderFieldGroup(rightLabel, right) : null}
    </div>
  );
}

const customerFormFieldClass =
  'h-9 rounded-md border border-slate-300 !bg-[#071226] px-3 !text-white shadow-sm !placeholder:text-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100';
const customerFormSelectTriggerClass =
  'h-9 rounded-md border border-slate-300 !bg-[#071226] px-3 !text-white shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 data-[placeholder]:!text-slate-300';
const customerFormLightFieldClass =
  'h-9 rounded-md border border-slate-300 bg-white px-3 text-slate-950 shadow-sm placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100';
const customerFormActionClass =
  'customer-form-action h-9 rounded-md border border-slate-300 bg-slate-100 px-3 text-slate-950 shadow-sm hover:bg-slate-200 disabled:opacity-100';
const customerFormSheetClass =
  'customer-form-sheet mt-4 rounded-md bg-white p-4 text-slate-950 shadow-sm dark:bg-white dark:text-slate-950 lg:p-5';



const userStatusStyles: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blocked: 'border-orange-200 bg-orange-50 text-orange-700',
  deleted: 'border-red-200 bg-red-50 text-red-700',
};

const userRoleStyles: Record<string, string> = {
  customer: 'border-slate-200 bg-slate-100 text-slate-700',
  agent: 'border-sky-200 bg-sky-50 text-sky-700',
  reseller: 'border-indigo-200 bg-indigo-50 text-indigo-700',
};

const userRoleOptions: Array<{ value: CustomerRole; label: string }> = [
  { value: 'customer', label: 'User' },
  { value: 'agent', label: 'Agent' },
  { value: 'reseller', label: 'Reseller' },
];

const rolePluralLabels: Record<CustomerRole, string> = {
  customer: 'Users',
  agent: 'Agents',
  reseller: 'Resellers',
};

const roleManagementTitles: Record<CustomerRole, string> = {
  customer: 'User Management',
  agent: 'Agent Management',
  reseller: 'Reseller Management',
};

const roleManagementDescriptions: Record<CustomerRole, string> = {
  customer: 'View and manage User Accounts',
  agent: 'View and manage Agent Accounts',
  reseller: 'View and manage Reseller Accounts',
};

const customerListPaths: Record<CustomerRole, string> = {
  customer: '/admin/customers/users',
  agent: '/admin/customers/agents',
  reseller: '/admin/customers/resellers',
};

const validCustomerDetailsTabs = new Set<CustomerDetailsTab>([
  'details',
  'orders',
  'wallet',
  'modules',
  'activity',
]);

function getCustomerListPath(role?: string | null) {
  return customerListPaths[getCustomerRole(role)];
}

function getCustomerDetailsPath(customer: User, tab: CustomerDetailsTab = 'details') {
  const tabQuery = tab === 'details' ? '' : `?tab=${tab}`;
  return `${getCustomerListPath(customer.role)}/${customer.id}${tabQuery}`;
}

function getCustomerCreatePath(role?: string | null) {
  return `${getCustomerListPath(role)}/create`;
}

function getCustomerDetailsTabFromSearch(): CustomerDetailsTab {
  const tab = new URLSearchParams(window.location.search).get('tab') as CustomerDetailsTab | null;
  return tab && validCustomerDetailsTabs.has(tab) ? tab : 'details';
}

const accountModeStyles: Record<CustomerAccountMode, string> = {
  live: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  sandbox: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  demo: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
};

function getAccountModeOptions(role: CustomerRole): Array<{ value: CustomerAccountMode; label: string }> {
  if (role === 'agent' || role === 'reseller') {
    return [
      { value: 'live', label: 'Live' },
      { value: 'sandbox', label: 'Sandbox' },
    ];
  }
  return [
    { value: 'live', label: 'Live' },
    { value: 'demo', label: 'Demo' },
  ];
}

function normalizeAccountMode(role: CustomerRole, value?: string | null): CustomerAccountMode {
  if (role === 'agent' || role === 'reseller') return value === 'sandbox' ? 'sandbox' : 'live';
  return value === 'demo' ? 'demo' : 'live';
}

function getAccountModeLabel(role: CustomerRole, value?: string | null) {
  const mode = normalizeAccountMode(role, value);
  return getAccountModeOptions(role).find((option) => option.value === mode)?.label || 'Live';
}

function getCustomerRole(value?: string | null): CustomerRole {
  return value === 'agent' || value === 'reseller' ? value : 'customer';
}

function getCustomerRoleLabel(value?: string | null) {
  return userRoleOptions.find((option) => option.value === getCustomerRole(value))?.label || 'User';
}

function getLoginAsCustomerLabel(value?: string | null) {
  return `Login as ${getCustomerRoleLabel(value)}`;
}

function getLoginAsCustomerPath(value?: string | null) {
  return '/account/dashboard';
}

function isRateAccount(value?: string | null) {
  const role = getCustomerRole(value);
  return role === 'agent' || role === 'reseller';
}

function getRoleOptionKey(role: CustomerRole): 'user' | 'agent' | 'reseller' {
  return role === 'customer' ? 'user' : role;
}

function getAssignableModules(role: CustomerRole): RoleModuleDefinition[] {
  return ROLE_OPTION_MODULES[getRoleOptionKey(role)]
    .sort((left, right) => left.label.localeCompare(right.label));
}

function getAssignableModuleIcon(moduleKey: string) {
  if (moduleKey === 'module_premium_services') return Crown;
  if (moduleKey === 'module_wallet_topup') return DollarSign;
  if (moduleKey === 'module_gift_cards') return Gift;
  if (moduleKey === 'module_virtual_prepaid_cards') return CreditCard;
  if (moduleKey === 'module_rewards') return Award;
  if (moduleKey === 'module_dial_pad') return Phone;
  if (moduleKey === 'chat_module') return LifeBuoy;
  if (moduleKey === 'voicemail') return Phone;
  if (moduleKey === 'pbx') return Server;
  if (moduleKey === 'call_forward') return Phone;
  if (moduleKey === 'do_not_disturb') return Ban;
  if (moduleKey === 'callback') return Phone;
  if (moduleKey === 'conference_call') return Phone;
  if (moduleKey === 'clear_hide_caller_id') return Eye;
  if (moduleKey === 'caller_id') return UserCircle;
  if (moduleKey === 'call_recording') return Activity;
  if (moduleKey === 'ring_group') return Phone;
  if (moduleKey === 'trace_me') return MapPin;
  if (moduleKey === 'fax') return FileText;
  if (moduleKey === 'did_allocation') return Phone;
  if (moduleKey === 'receive_international_calls') return Phone;
  if (moduleKey === 'allow_international_calls' || moduleKey === 'allow_internal_calls') return Phone;
  if (moduleKey === 'concierge') return LifeBuoy;
  if (moduleKey === 'module_iptv_services') return Tv;
  if (moduleKey === 'module_virtual_numbers') return Phone;
  if (moduleKey === 'module_vouchers') return Ticket;
  if (moduleKey === 'module_invoice_system') return FileText;
  if (moduleKey === 'module_esim_services') return Smartphone;
  if (moduleKey === 'module_marketing') return Megaphone;
  if (moduleKey === 'module_api_docs') return Code2;
  if (moduleKey === 'module_support_system') return LifeBuoy;
  if (moduleKey === 'module_master_esim_packages') return Package;
  if (moduleKey === 'module_transactions') return DollarSign;
  if (moduleKey === 'module_platform_setup') return Server;
  if (moduleKey === 'module_report') return FileText;
  if (moduleKey === 'module_order_management') return Package;
  if (moduleKey === 'module_statistics') return BarChart3;
  if (moduleKey === 'module_blog') return FileText;
  if (moduleKey === 'module_in_app_purchases') return DollarSign;
  return ShieldCheck;
}

type AssignableModuleSection = {
  key: string;
  title: string;
  modules: RoleModuleDefinition[];
};

const USER_SERVICE_MODULE_KEYS = new Set([
  'module_esim_services',
  'module_wallet_topup',
  'module_gift_cards',
  'module_virtual_prepaid_cards',
  'module_rewards',
  'module_virtual_numbers',
  'module_vouchers',
  'concierge',
  'module_iptv_services',
]);

const USER_PREMIUM_MODULE_KEYS = new Set([
  'module_premium_services',
  'chat_module',
  'voicemail',
  'pbx',
  'call_forward',
  'do_not_disturb',
  'callback',
  'conference_call',
  'clear_hide_caller_id',
  'caller_id',
  'call_recording',
  'ring_group',
  'trace_me',
  'fax',
  'did_allocation',
  'receive_international_calls',
]);

const USER_CALLING_MODULE_KEYS = new Set([
  'module_dial_pad',
  'allow_international_calls',
  'allow_internal_calls',
]);

function getAssignableModuleSectionTitle(role: CustomerRole, moduleKey: string) {
  if (role === 'customer' && USER_PREMIUM_MODULE_KEYS.has(moduleKey)) return 'Premium services';
  if (role === 'customer' && USER_SERVICE_MODULE_KEYS.has(moduleKey)) return 'Service modules';
  if (role === 'customer' && USER_CALLING_MODULE_KEYS.has(moduleKey)) return 'Calling controls';
  if (moduleKey.startsWith('module_')) return 'Portal modules';
  if (moduleKey.includes('agent')) return role === 'agent' ? 'Agent permissions' : 'Agent management';
  if (moduleKey.includes('reseller') || moduleKey === 'sub_domain' || moduleKey === 'store_front' || moduleKey === 'payment_gateway' || moduleKey === 'upload_logo') {
    return role === 'reseller' ? 'Reseller permissions' : 'Reseller access';
  }
  if (moduleKey.includes('user') || moduleKey.includes('customer') || moduleKey.includes('kyc')) return 'User/customer permissions';
  return 'General permissions';
}

function getAssignableModuleSections(role: CustomerRole, modules: RoleModuleDefinition[]): AssignableModuleSection[] {
  const order = [
    'Service modules',
    'Premium services',
    'Calling controls',
    'Portal modules',
    'Reseller permissions',
    'Agent permissions',
    'Agent management',
    'User/customer permissions',
    'Reseller access',
    'General permissions',
  ];
  const sections = modules.reduce<Record<string, RoleModuleDefinition[]>>((acc, module) => {
    const title = getAssignableModuleSectionTitle(role, module.key);
    acc[title] = acc[title] || [];
    acc[title].push(module);
    return acc;
  }, {});

  return order
    .filter((title) => sections[title]?.length)
    .map((title) => ({
      key: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title,
      modules: sections[title],
    }));
}

function ModuleStatusChip({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const Icon = enabled ? CheckCircle : XCircle;
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none',
        enabled
          ? 'border-emerald-200/70 bg-emerald-50/70 text-emerald-700'
          : 'border-slate-200/80 bg-slate-100/70 text-slate-500',
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {enabled
        ? t('adminPanel.customers.modules.enabled', 'Enabled')
        : t('adminPanel.customers.modules.disabled', 'Disabled')}
    </span>
  );
}

function ModuleSelectionChip({ selected }: { selected: boolean }) {
  const { t } = useTranslation();
  const Icon = selected ? CheckCircle : XCircle;
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none',
        selected
          ? 'border-sky-200/70 bg-sky-50/70 text-sky-700'
          : 'border-slate-200/80 bg-slate-100/70 text-slate-500',
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {selected
        ? t('adminPanel.customers.modules.selected', 'Selected')
        : t('adminPanel.customers.modules.notSelected', 'Not selected')}
    </span>
  );
}

type ModuleValuesUpdater =
  | Record<string, boolean>
  | ((current: Record<string, boolean>) => Record<string, boolean>);

function ModuleAccessPanel({
  title,
  description,
  role,
  modules,
  values,
  onValuesChange,
  selectionMode = false,
}: {
  title: string;
  description: string;
  role: CustomerRole;
  modules: RoleModuleDefinition[];
  values: Record<string, boolean>;
  onValuesChange: (next: ModuleValuesUpdater) => void;
  selectionMode?: boolean;
}) {
  const { t, isRTL } = useTranslation();
  const selectedCount = modules.filter((module) => Boolean(values[module.key])).length;

  return (
    <div className="customer-module-panel rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-slate-950">{title}</p>
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px] font-medium">
              {t('adminPanel.customers.modules.enabledCount', '{enabled}/{total} enabled', {
                enabled: selectedCount,
                total: modules.length,
              })}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="h-7 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 shadow-none hover:bg-emerald-100"
            onClick={() => onValuesChange(modules.reduce<Record<string, boolean>>((acc, module) => {
              acc[module.key] = true;
              return acc;
            }, {}))}
          >
            <CheckCircle className={cn('h-3.5 w-3.5', isRTL ? 'ml-1.5' : 'mr-1.5')} />
            {t('adminPanel.customers.modules.enableAll', 'Enable All')}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 shadow-none hover:bg-slate-50"
            onClick={() => onValuesChange(modules.reduce<Record<string, boolean>>((acc, module) => {
              acc[module.key] = false;
              return acc;
            }, {}))}
          >
            <XCircle className={cn('h-3.5 w-3.5', isRTL ? 'ml-1.5' : 'mr-1.5')} />
            {t('adminPanel.customers.modules.disableAll', 'Disable All')}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {getAssignableModuleSections(role, modules).map((section) => (
          <div key={section.key}>
            <div className="mb-1.5 flex items-center gap-2">
              <p className="customer-module-section-title text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {t(`adminPanel.customers.moduleSections.${section.key}`, section.title)}
              </p>
              <div className="customer-module-divider h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {section.modules.map((module) => {
                const enabled = Boolean(values[module.key]);
                const ModuleIcon = getAssignableModuleIcon(module.key);
                const moduleLabel = t(`adminPanel.customers.modules.${module.key}`, module.label);
                const toggleModule = () =>
                  onValuesChange((current) => ({
                    ...current,
                    [module.key]: !Boolean(current[module.key]),
                  }));

                return (
                  <div
                    role="button"
                    tabIndex={0}
                    data-enabled={enabled ? 'true' : 'false'}
                    key={module.key}
                    onClick={toggleModule}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      toggleModule();
                    }}
                    className={cn(
                      'customer-module-item group flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                      isRTL ? 'text-right' : 'text-left',
                      enabled
                        ? 'border-cyan-200 bg-cyan-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={cn(
                          'customer-module-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
                          enabled
                            ? 'bg-cyan-100 text-cyan-700'
                            : 'bg-slate-100 text-slate-400',
                        )}
                      >
                        <ModuleIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="customer-module-title text-sm font-semibold leading-5 text-slate-900">{moduleLabel}</p>
                        <div className="mt-1">
                          {selectionMode ? (
                            <ModuleSelectionChip selected={enabled} />
                          ) : (
                            <ModuleStatusChip enabled={enabled} />
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onClick={(event) => event.stopPropagation()}
                      onCheckedChange={(checked) => onValuesChange((current) => ({
                        ...current,
                        [module.key]: checked,
                      }))}
                      aria-label={`${moduleLabel} ${title}`}
                      className="h-5 w-9 shrink-0 data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-slate-300 [&>span]:h-4 [&>span]:w-4 [&>span[data-state=checked]]:translate-x-4"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function isVerifiedKycStatus(status?: string | null) {
  return status === 'approved' || status === 'verified';
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  const statusPayload = rawMessage.match(/^\d+:\s*(.*)$/)?.[1];
  const messageText = statusPayload || rawMessage;

  if (messageText.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(messageText);
      if (typeof parsed?.message === 'string' && parsed.message.trim()) {
        return parsed.message;
      }
    } catch {
      return fallback;
    }
  }

  return messageText || fallback;
}

function formatMoney(amount: string | number | null | undefined, currency = 'USD') {
  const numeric = typeof amount === 'number' ? amount : Number(amount || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(numeric);
}

function toMoneyNumber(amount: string | number | null | undefined) {
  const numeric = typeof amount === 'number' ? amount : Number(amount || 0);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

function isWalletTransactionDebit(transaction: AdminWalletTransaction) {
  const balanceBefore = toMoneyNumber(transaction.balanceBefore);
  const balanceAfter = toMoneyNumber(transaction.balanceAfter);
  if (balanceAfter < balanceBefore) return true;
  if (balanceAfter > balanceBefore) return false;
  return transaction.type.includes('debit');
}

function canRefundWalletTransaction(transaction: AdminWalletTransaction) {
  return (
    transaction.status === 'completed' &&
    !transaction.type.includes('refund') &&
    toMoneyNumber(transaction.refundableAmount) > 0
  );
}

function getKycDocumentUrl(filePath?: string | null) {
  if (!filePath) return '';
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const cleanPath = filePath.replace(/\\/g, '/');
  return `${window.location.origin}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

function getResellerStoreUrl(subdomain?: string | null) {
  const normalizedSubdomain = String(subdomain || '').trim().toLowerCase();
  if (!normalizedSubdomain) return '';

  const { protocol, hostname, port } = window.location;
  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

  if (localHosts.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.lvh.me')) {
    return `${protocol}//${normalizedSubdomain}.lvh.me${port ? `:${port}` : ''}`;
  }

  const parts = hostname.split('.');
  const baseDomain =
    parts.length > 2 && ['admin', 'app', 'www'].includes(parts[0])
      ? parts.slice(1).join('.')
      : hostname.replace(/^www\./, '');

  return `${protocol}//${normalizedSubdomain}.${baseDomain}`;
}

export default function CustomerManagement({
  roleFilter,
  title,
  description,
  detailsCustomerId,
  createMode = false,
}: CustomerManagementProps = {}) {
  const { t, isRTL } = useTranslation();
  const [, navigate] = useLocation();
  const isDedicatedCreatePage = Boolean(createMode);
  const isDedicatedDetailsPage = Boolean(detailsCustomerId) && !isDedicatedCreatePage;
  const [searchQuery, setSearchQuery] = useState('');
  const [kycFilter, setKycFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [customerDetailsTab, setCustomerDetailsTab] = useState<CustomerDetailsTab>('details');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPassword, setNewCustomerPassword] = useState('');
  const [newCustomerRole, setNewCustomerRole] = useState<CustomerRole>(roleFilter || 'customer');
  const [newCustomerAccountMode, setNewCustomerAccountMode] = useState<CustomerAccountMode>('live');
  const [newCustomerRateTableId, setNewCustomerRateTableId] = useState('');
  const [newCustomerKycRequired, setNewCustomerKycRequired] = useState(true);
  const [newCustomerModules, setNewCustomerModules] = useState<Record<string, boolean>>({});
  const [newCustomerMobileModules, setNewCustomerMobileModules] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [customerAction, setCustomerAction] = useState<{
    type: CustomerActionType;
    customer: User | null;
  }>({ type: null, customer: null });
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceDescription, setBalanceDescription] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [customerDetailsDraft, setCustomerDetailsDraft] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [voucherLimitAmount, setVoucherLimitAmount] = useState('');
  const [customerModuleDraft, setCustomerModuleDraft] = useState<Record<string, boolean>>({});
  const [customerMobileModuleDraft, setCustomerMobileModuleDraft] = useState<Record<string, boolean>>({});
  const [customerSecurityDraft, setCustomerSecurityDraft] = useState<CustomerSecuritySettings>({
    twoFactorEnabled: false,
    otpEmailEnabled: true,
    otpPhoneEnabled: false,
  });
  const [packageSearch, setPackageSearch] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [resellerStoreName, setResellerStoreName] = useState('');
  const [resellerSubdomain, setResellerSubdomain] = useState('');
  const [resellerRetailMarkup, setResellerRetailMarkup] = useState('');
  const [selectedCustomerRateTableId, setSelectedCustomerRateTableId] = useState('');
  const [senderIdLimitDraft, setSenderIdLimitDraft] = useState('');
  const [kycReviewCustomer, setKycReviewCustomer] = useState<User | null>(null);
  const [kycRejectReason, setKycRejectReason] = useState('');
  const [walletRefundTransaction, setWalletRefundTransaction] = useState<AdminWalletTransaction | null>(null);
  const [walletRefundAmount, setWalletRefundAmount] = useState('');
  const [walletRefundReason, setWalletRefundReason] = useState('Customer requested refund');
  const [walletRefundNotes, setWalletRefundNotes] = useState('');
  const { toast } = useToast();

  const { user } = useAdmin();
  const getTranslatedRoleLabel = (role: CustomerRole) =>
    t(`adminPanel.customers.roles.${role}`, getCustomerRoleLabel(role));
  const getTranslatedRolePluralLabel = (role: CustomerRole) =>
    t(`adminPanel.customers.rolePlurals.${role}`, rolePluralLabels[role]);
  const getTranslatedAccountModeLabel = (mode: CustomerAccountMode) =>
    t(`adminPanel.customers.accountModes.${mode}`, getAccountModeOptions(newCustomerRole).find((option) => option.value === mode)?.label || 'Live');
  const currentRoleLabel = roleFilter ? getTranslatedRoleLabel(roleFilter) : t('adminPanel.customers.roles.customerGeneric', 'Customer');
  const currentRolePluralLabel = roleFilter ? getTranslatedRolePluralLabel(roleFilter) : t('adminPanel.customers.rolePlurals.customersGeneric', 'Customers');
  const translatedRoleManagementTitle = roleFilter
    ? t(`adminPanel.customers.managementTitles.${roleFilter}`, roleManagementTitles[roleFilter])
    : t('adminPanel.admin.customers.title', 'Customer Management');
  const translatedRoleManagementDescription = roleFilter
    ? t(`adminPanel.customers.managementDescriptions.${roleFilter}`, roleManagementDescriptions[roleFilter])
    : t('adminPanel.admin.customers.description', 'View and manage all registered customers');
  const pageTitle = roleFilter ? translatedRoleManagementTitle : title || translatedRoleManagementTitle;
  const pageDescription = roleFilter ? translatedRoleManagementDescription : description || translatedRoleManagementDescription;
  const tableDirection = isRTL ? 'rtl' : 'ltr';
  const tableTextAlignClass = isRTL ? 'text-right' : 'text-left';
  const lockCreateRole = roleFilter === 'agent' || roleFilter === 'reseller';
  const createRoleLabel = getTranslatedRoleLabel(newCustomerRole);
  const createRolePluralLabel = getTranslatedRolePluralLabel(roleFilter || newCustomerRole);
  const assignableModules = getAssignableModules(newCustomerRole);

  useEffect(() => {
    if (roleFilter) {
      setNewCustomerRole(roleFilter);
    }
  }, [roleFilter]);

  useEffect(() => {
    setNewCustomerAccountMode((current) => normalizeAccountMode(newCustomerRole, current));
  }, [newCustomerRole]);

  useEffect(() => {
    if (!selectedCustomer) return;
    setCustomerDetailsDraft({
      name: selectedCustomer.name || '',
      phone: selectedCustomer.phone || '',
      address: selectedCustomer.address || '',
    });
    setResellerStoreName(selectedCustomer.resellerStoreName || selectedCustomer.name || selectedCustomer.email || '');
    setResellerSubdomain(selectedCustomer.resellerSubdomain || '');
    setResellerRetailMarkup('');
    setSelectedCustomerRateTableId('');
  }, [selectedCustomer]);

  // ---------------------------------------------------------------------------
  // UPDATED BACKEND DATA FETCHING (pagination + search + kycFilter)
  // ---------------------------------------------------------------------------

  const { data: customersRes, isLoading, error: customersError } = useQuery({
    queryKey: ['/api/admin/customers', currentPage, searchQuery, kycFilter, statusFilter, itemsPerPage, roleFilter],
    enabled: !isDedicatedDetailsPage && !isDedicatedCreatePage,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
        search: searchQuery,
        kycStatus: kycFilter,
        status: statusFilter,
      });
      if (roleFilter) {
        params.set('role', roleFilter);
      }
      const res = await fetch(`/api/admin/customers?${params.toString()}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || 'Failed to load Customers');
      }
      return json;
    },
  });

  const {
    data: dedicatedCustomer,
    isLoading: isDedicatedCustomerLoading,
    error: dedicatedCustomerError,
  } = useQuery<User>({
    queryKey: ['/api/admin/customers/detail', detailsCustomerId],
    enabled: isDedicatedDetailsPage,
    queryFn: async () => {
      const res = await fetch(`/api/admin/customers/${detailsCustomerId}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || 'Failed to load Customer details');
      }
      return json.data ?? json;
    },
  });

  useEffect(() => {
    if (!detailsCustomerId) return;
    setSelectedCustomer(null);
    setCustomerDetailsTab(getCustomerDetailsTabFromSearch());
  }, [detailsCustomerId]);

  useEffect(() => {
    if (dedicatedCustomer) {
      setSelectedCustomer(dedicatedCustomer);
    }
  }, [dedicatedCustomer]);

  const customersPayload = customersRes?.data ?? customersRes;
  const customers: User[] = Array.isArray(customersPayload)
    ? customersPayload
    : customersPayload?.data || [];
  const pagination = Array.isArray(customersPayload) ? {} : customersPayload?.pagination || {};
  const totalPages = pagination.totalPages || 1;
  const totalItems = pagination.total ?? customers.length;
  const stats = Array.isArray(customersPayload) ? {} : customersPayload?.stats || {};

  const { data: roleOptionsData } = useQuery<RoleOptionsConfig>({
    queryKey: ['/api/admin/options'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/options');
      const json = await res.json();
      return normalizeRoleOptionsConfig(json?.data || json);
    },
  });

  useEffect(() => {
    const role = getRoleOptionKey(newCustomerRole);
    const source = roleOptionsData || normalizeRoleOptionsConfig(null);
    const defaults = getAssignableModules(newCustomerRole).reduce<Record<string, boolean>>((acc, module) => {
      acc[module.key] = Boolean(source.roles[role].modules[module.key]);
      return acc;
    }, {});
    const mobileDefaults = getAssignableModules(newCustomerRole).reduce<Record<string, boolean>>((acc, module) => {
      acc[module.key] = Boolean(source.roles[role].mobileModules[module.key]);
      return acc;
    }, {});

    setNewCustomerModules(defaults);
    setNewCustomerMobileModules(mobileDefaults);
  }, [newCustomerRole, roleOptionsData]);

  // console.log("Customers Res:", customersRes);

  // ---------------------------------------------------------------------------
  // Existing orders fetch
  // ---------------------------------------------------------------------------

  const { data: customerOrders } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/admin/orders', selectedCustomer?.id],
    enabled: !!selectedCustomer,
  });

  const {
    data: walletTransactionsData,
    isLoading: isWalletTransactionsLoading,
  } = useQuery<{
    balance: string;
    currency: string;
    transactions: AdminWalletTransaction[];
  }>({
    queryKey: ['/api/admin/customers/wallet-transactions', selectedCustomer?.id],
    enabled: Boolean(selectedCustomer?.id),
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/admin/customers/${selectedCustomer!.id}/wallet-transactions`,
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to load wallet transactions');
      return data.data;
    },
  });

  const { data: packagesRes, isLoading: isPackagesLoading } = useQuery<{
    data: AdminPackageOption[];
  }>({
    queryKey: [
      '/api/admin/unified-packages',
      { search: packageSearch, limit: 50, sort: 'priceLowToHigh' },
    ],
    enabled: customerAction.type === 'package',
  });

  const packageOptions = packagesRes?.data || [];

  const {
    data: resellerProvidersData,
    isLoading: isResellerProvidersLoading,
  } = useQuery<ResellerProviderAccessResponse>({
    queryKey: ['/api/admin/customers/reseller-providers', selectedCustomer?.id],
    enabled: selectedCustomer?.role === 'reseller',
    queryFn: async () => {
      const res = await fetch(`/api/admin/customers/${selectedCustomer!.id}/reseller-providers`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || 'Failed to load Reseller providers');
      }
      return json.data;
    },
  });

  const resellerProviders = resellerProvidersData?.providers || [];

  const { data: ratesResponse } = useQuery({
    queryKey: ['/api/admin/rates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/rates');
      return res.json();
    },
  });

  const rateTables: RateTableOption[] = ratesResponse?.data?.rates || [];

  const { data: rateAssignmentResponse } = useQuery({
    queryKey: ['/api/admin/customers/rate', selectedCustomer?.id],
    enabled: Boolean(selectedCustomer?.id && isRateAccount(selectedCustomer.role)),
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/customers/${selectedCustomer!.id}/rate`);
      return res.json();
    },
  });

  const currentRateAssignment: CustomerRateAssignment | null = rateAssignmentResponse?.data || null;

  useEffect(() => {
    if (currentRateAssignment?.rateTableId) {
      setSelectedCustomerRateTableId(currentRateAssignment.rateTableId);
    }
  }, [currentRateAssignment?.rateTableId]);

  const { data: kycReviewResponse, isLoading: isKycReviewLoading } = useQuery({
    queryKey: ['/api/admin/customers/kyc-review', kycReviewCustomer?.id],
    enabled: Boolean(kycReviewCustomer?.id),
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/customers/${kycReviewCustomer!.id}/kyc`);
      return res.json();
    },
  });

  const kycReviewData = kycReviewResponse?.data || null;
  const kycReviewCurrentCustomer: User | null = kycReviewData?.customer || kycReviewCustomer;
  const kycReviewDocuments: KycReviewDocument[] = kycReviewData?.documents || [];

  const { data: voucherLimitData } = useQuery<CustomerVoucherLimit>({
    queryKey: ['/api/admin/customers/voucher-limit', customerAction.customer?.id],
    enabled: Boolean(customerAction.type === 'voucherLimit' && customerAction.customer?.id),
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/admin/customers/${customerAction.customer!.id}/voucher-limit`,
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to load voucher limit');
      return data.data;
    },
  });

  const { data: customerModuleSettings, isLoading: isCustomerModulesLoading } = useQuery<CustomerModuleSettings>({
    queryKey: ['/api/admin/customers/modules', customerAction.customer?.id],
    enabled: Boolean(
      customerAction.type === 'modules' &&
      customerAction.customer?.id,
    ),
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/admin/customers/${customerAction.customer!.id}/modules`,
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to load customer modules');
      return data.data as CustomerModuleSettings;
    },
  });

  const { data: selectedCustomerModuleSettings, isLoading: isSelectedCustomerModulesLoading } = useQuery<CustomerModuleSettings>({
    queryKey: ['/api/admin/customers/modules', selectedCustomer?.id, 'details'],
    enabled: Boolean(selectedCustomer?.id && customerDetailsTab === 'modules'),
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/admin/customers/${selectedCustomer!.id}/modules`,
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to load customer modules');
      return data.data as CustomerModuleSettings;
    },
  });

  const {
    data: senderIdLimitStatus,
    isLoading: isSenderIdLimitLoading,
  } = useQuery<SenderIdLimitStatus>({
    queryKey: ['/api/admin/customers/sender-id-limit', selectedCustomer?.id],
    enabled: Boolean(selectedCustomer?.id),
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/admin/customers/${selectedCustomer!.id}/sender-id-limit`,
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to load Sender ID limit');
      return data.data as SenderIdLimitStatus;
    },
  });

  const { data: customerSecuritySettings, isLoading: isCustomerSecurityLoading } = useQuery<CustomerSecuritySettings>({
    queryKey: ['/api/admin/customers/security', customerAction.customer?.id],
    enabled: Boolean(customerAction.type === 'security' && customerAction.customer?.id),
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/admin/customers/${customerAction.customer!.id}/security`,
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to load customer security');
      return data.data as CustomerSecuritySettings;
    },
  });

  useEffect(() => {
    if (customerAction.type === 'voucherLimit' && voucherLimitData) {
      setVoucherLimitAmount(voucherLimitData.unlimited ? '0' : String(voucherLimitData.limit || ''));
    }
  }, [customerAction.type, voucherLimitData]);

  useEffect(() => {
    if (customerAction.type === 'modules' && customerModuleSettings?.modules) {
      setCustomerModuleDraft(customerModuleSettings.modules);
      setCustomerMobileModuleDraft(customerModuleSettings.mobileModules || customerModuleSettings.modules);
    }
  }, [customerAction.type, customerModuleSettings?.modules, customerModuleSettings?.mobileModules]);

  useEffect(() => {
    if (selectedCustomer && customerDetailsTab === 'modules' && selectedCustomerModuleSettings?.modules) {
      setCustomerModuleDraft(selectedCustomerModuleSettings.modules);
      setCustomerMobileModuleDraft(selectedCustomerModuleSettings.mobileModules || selectedCustomerModuleSettings.modules);
    }
  }, [customerDetailsTab, selectedCustomer, selectedCustomerModuleSettings?.modules, selectedCustomerModuleSettings?.mobileModules]);

  useEffect(() => {
    if (!selectedCustomer?.id) {
      setSenderIdLimitDraft('');
      return;
    }
    setSenderIdLimitDraft(
      senderIdLimitStatus?.overrideLimit === null || senderIdLimitStatus?.overrideLimit === undefined
        ? ''
        : String(senderIdLimitStatus.overrideLimit),
    );
  }, [selectedCustomer?.id, senderIdLimitStatus?.overrideLimit]);

  useEffect(() => {
    if (customerAction.type === 'security' && customerSecuritySettings) {
      setCustomerSecurityDraft({
        twoFactorEnabled: Boolean(customerSecuritySettings.twoFactorEnabled),
        otpEmailEnabled: customerSecuritySettings.otpEmailEnabled !== false,
        otpPhoneEnabled: Boolean(customerSecuritySettings.otpPhoneEnabled),
        authenticatorConfigured: Boolean(customerSecuritySettings.authenticatorConfigured),
      });
    }
  }, [customerAction.type, customerSecuritySettings]);

  // ---------------------------------------------------------------------------
  // Mutations (UNCHANGED)
  // ---------------------------------------------------------------------------

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: Partial<User> }) => {
      return await apiRequest('PATCH', `/api/admin/customers/${customerId}`, data);
    },
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers/detail', variables.customerId] });
      setSelectedCustomer((current) =>
        current?.id === variables.customerId ? { ...current, ...variables.data } : current,
      );
      toast({
        title: t('common.success', 'Success'),
        description: t('admin.customers.updateSuccess', 'Customer updated successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin.customers.failedToUpdate', 'Failed to update customer'),
        variant: 'destructive',
      });
    },
  });

  const updateKycMutation = useMutation({
    mutationFn: async ({ customerId, kycStatus }: { customerId: string; kycStatus: string }) => {
      return await apiRequest('PATCH', `/api/admin/customers/${customerId}`, { kycStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      toast({
        title: t('common.success', 'Success'),
        description: t(
          'admin.customers.kycStatusUpdated',
          'Customer KYC status updated successfully',
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description:
          error.message || t('admin.customers.failedToUpdateKyc', 'Failed to update KYC status'),
        variant: 'destructive',
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      return await apiRequest('DELETE', `/api/admin/customers/${customerId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      toast({
        title: t('common.success', 'Success'),
        description: t('admin.customers.deleteSuccess', 'Customer deleted successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description:
          error.message || t('admin.customers.failedToDelete', 'Failed to delete customer'),
        variant: 'destructive',
      });
    },
  });

  // State for premium confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive' | 'warning';
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => { },
  });

  const handleConfirm = (config: {
    title: string;
    description: string;
    confirmText?: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive' | 'warning';
  }) => {
    setConfirmDialog({
      open: true,
      ...config,
    });
  };

  const confirmRoleChange = (customer: User, nextRole: CustomerRole) => {
    const currentRole = getCustomerRole(customer.role);
    if (currentRole === nextRole) return;

    const nextRoleLabel = getCustomerRoleLabel(nextRole);
    const descriptions: Record<CustomerRole, string> = {
      customer: 'This account will return to standard user Access and retail package pricing.',
      agent: 'This Account will be grouped separately as an Agent Account.',
      reseller: 'This Account will buy Packages at Reseller cost and can set Reseller selling prices.',
    };

    handleConfirm({
      title: `Set Account as ${nextRoleLabel}`,
      description: descriptions[nextRole],
      confirmText: `Set as ${nextRoleLabel}`,
      onConfirm: () => {
        customerRoleMutation.mutate({
          customerId: customer.id,
          role: nextRole,
        });
      },
    });
  };

  const loginAsCustomerMutation = useMutation({
    mutationFn: async ({ customer }: { customer: User; popup: Window | null }) => {
      const role = getCustomerRole(customer.role);
      const response = await apiRequest('POST', `/api/admin/customers/${customer.id}/login-as`, {
        role,
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || `Failed to ${getLoginAsCustomerLabel(role)}`);
      }
      return {
        role,
        loginUrl: data.data?.loginUrl as string,
        expiresInSeconds: Number(data.data?.expiresInSeconds || 300),
      };
    },
    onSuccess: async ({ role, loginUrl, expiresInSeconds }, { popup }) => {
      if (!loginUrl) {
        if (popup && !popup.closed) popup.close();
        toast({
          title: 'Login as customer failed',
          description: 'Login link was not returned by the server',
          variant: 'destructive',
        });
        return;
      }

      if (popup && !popup.closed) {
        popup.location.href = loginUrl;
      } else {
        window.open(loginUrl, '_blank', 'noopener,noreferrer');
      }

      try {
        await navigator.clipboard?.writeText(loginUrl);
      } catch {
        // Clipboard can be blocked on some browsers; the opened tab still works.
      }

      toast({
        title: getLoginAsCustomerLabel(role),
        description: `Opened in a separate tab. The ${Math.round(expiresInSeconds / 60)} minute login link is copied for another browser.`,
      });
    },
    onError: (error: any, variables) => {
      if (variables?.popup && !variables.popup.closed) {
        variables.popup.close();
      }
      toast({
        title: 'Login as customer failed',
        description: error.message || 'Failed to open customer Account',
        variant: 'destructive',
      });
    },
  });

  const openLoginAsCustomer = (customer: User) => {
    const popup = window.open('', '_blank');
    if (popup) {
      popup.document.title = `Opening ${getCustomerRoleLabel(customer.role)} Account`;
      popup.document.body.innerHTML = '<p style="font-family: system-ui, sans-serif; padding: 24px;">Opening customer account...</p>';
    }
    loginAsCustomerMutation.mutate({ customer, popup });
  };

  const resetCreateCustomerForm = (role: CustomerRole = roleFilter || 'customer') => {
    setNewCustomerEmail('');
    setNewCustomerName('');
    setNewCustomerPassword('');
    setNewCustomerRole(role);
    setNewCustomerAccountMode(normalizeAccountMode(role, 'live'));
    setNewCustomerRateTableId('');
    setNewCustomerKycRequired(true);
    const roleKey = getRoleOptionKey(role);
    const source = roleOptionsData || normalizeRoleOptionsConfig(null);
    const modules = getAssignableModules(role);
    setNewCustomerModules(modules.reduce<Record<string, boolean>>((acc, module) => {
      acc[module.key] = Boolean(source.roles[roleKey].modules[module.key]);
      return acc;
    }, {}));
    setNewCustomerMobileModules(modules.reduce<Record<string, boolean>>((acc, module) => {
      acc[module.key] = Boolean(source.roles[roleKey].mobileModules[module.key]);
      return acc;
    }, {}));
  };

  const openCreateCustomerDialog = () => {
    navigate(getCustomerCreatePath(roleFilter || 'customer'));
  };

  useEffect(() => {
    if (!isDedicatedCreatePage) return;
    resetCreateCustomerForm(roleFilter || 'customer');
  }, [isDedicatedCreatePage, roleFilter, roleOptionsData]);

  const createCustomerMutation = useMutation({
    mutationFn: async ({
      email,
      name,
      password,
      role,
      accountMode,
      rateTableId,
      kycVerificationRequired,
      modules,
      mobileModules,
    }: {
      email: string;
      name: string;
      password?: string;
      role: CustomerRole;
      accountMode: CustomerAccountMode;
      rateTableId?: string;
      kycVerificationRequired: boolean;
      modules?: Record<string, boolean>;
      mobileModules?: Record<string, boolean>;
    }) => {
      return await apiRequest('POST', '/api/admin/customers', {
        email,
        name,
        password: password?.trim() || undefined,
        role,
        accountMode,
        rateTableId: rateTableId || null,
        kycVerificationRequired,
        modules: modules || {},
        mobileModules: mobileModules || modules || {},
      });
    },
    onSuccess: async (response, variables) => {
      const payload = await response.json().catch(() => null);
      const createdCustomer = payload?.data || payload;
      const createdRole = getCustomerRole(createdCustomer?.role || variables.role);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      setCreateDialogOpen(false);
      setNewCustomerEmail('');
      setNewCustomerName('');
      setNewCustomerPassword('');
      setNewCustomerRole(roleFilter || 'customer');
      setNewCustomerAccountMode(normalizeAccountMode(roleFilter || 'customer', 'live'));
      setNewCustomerRateTableId('');
      setNewCustomerKycRequired(true);
      setNewCustomerModules({});
      setNewCustomerMobileModules({});
      toast({
        title: t('common.success', 'Success'),
        description: `${getCustomerRoleLabel(createdRole)} created successfully`,
      });
      if (isDedicatedCreatePage) {
        navigate(getCustomerListPath(createdRole));
      }
    },
    onError: (error: any) => {
      const isDuplicate = error.message?.includes('Email already exists');
      toast({
        title: t('common.error', 'Error'),
        description: isDuplicate
          ? t('admin.customers.emailExists', 'User with this email already exists')
          : (error.message || t('admin.customers.failedToCreate', 'Failed to create customer')),
        variant: 'destructive',
      });
    },
  });

  const customerRateMutation = useMutation({
    mutationFn: async ({
      customerId,
      rateTableId,
    }: {
      customerId: string;
      rateTableId: string;
    }) => {
      const response = await apiRequest('POST', `/api/admin/customers/${customerId}/rate`, {
        rateTableId,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to assign rate table');
      return data.data as { applied?: number; rateTableId: string };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers/rate', variables.customerId] });
      toast({
        title: 'Rate assigned',
        description: `${data.applied || 0} package prices were applied.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Rate assignment failed',
        description: error.message || 'Failed to assign rate table',
        variant: 'destructive',
      });
    },
  });

  const customerKycRequiredMutation = useMutation({
    mutationFn: async ({
      customerId,
      required,
    }: {
      customerId: string;
      required: boolean;
    }) => {
      const response = await apiRequest('PATCH', `/api/admin/customers/${customerId}`, {
        kycVerificationRequired: required,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to update KYC requirement');
      return data.data as User;
    },
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      updateSelectedCustomer(updatedCustomer);
      setKycReviewCustomer((current) =>
        current?.id === updatedCustomer.id ? { ...current, ...updatedCustomer } : current,
      );
      toast({
        title: 'KYC setting saved',
        description: 'Customer KYC requirement was updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'KYC setting failed',
        description: error.message || 'Failed to update KYC requirement',
        variant: 'destructive',
      });
    },
  });

  const approveCustomerKycMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await apiRequest('POST', `/api/admin/customers/${customerId}/kyc/approve`, {});
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to approve KYC');
      return data.data as User;
    },
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers/kyc-review', updatedCustomer.id] });
      updateSelectedCustomer(updatedCustomer);
      setKycReviewCustomer(null);
      setKycRejectReason('');
      toast({
        title: 'KYC Approved',
        description: 'Customer verification has been accepted.',
      });
    },
    onError: (error: any) => {
      const message = getApiErrorMessage(error, 'Failed to approve KYC');
      toast({
        title: message === 'Already Approved' ? 'Already Approved' : 'KYC approval failed',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const rejectCustomerKycMutation = useMutation({
    mutationFn: async ({ customerId, reason }: { customerId: string; reason: string }) => {
      const response = await apiRequest('POST', `/api/admin/customers/${customerId}/kyc/reject`, {
        reason,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to reject KYC');
      return data.data as User;
    },
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers/kyc-review', updatedCustomer.id] });
      updateSelectedCustomer(updatedCustomer);
      setKycReviewCustomer((current) =>
        current?.id === updatedCustomer.id ? { ...current, ...updatedCustomer } : current,
      );
      setKycRejectReason('');
      toast({
        title: 'KYC rejected',
        description: 'Customer verification has been rejected.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'KYC rejection failed',
        description: error.message || 'Failed to reject KYC',
        variant: 'destructive',
      });
    },
  });

  const resellerStorefrontMutation = useMutation({
    mutationFn: async ({
      customerId,
      storeName,
      subdomain,
    }: {
      customerId: string;
      storeName: string;
      subdomain: string;
    }) => {
      const res = await apiRequest('PATCH', `/api/admin/customers/${customerId}/reseller-storefront`, {
        storeName,
        subdomain,
        isActive: true,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to update storefront');
      return data.data as User;
    },
    onSuccess: (updatedCustomer) => {
      setSelectedCustomer(updatedCustomer);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      toast({
        title: 'Storefront saved',
        description: 'Reseller subdomain has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Storefront update failed',
        description: error.message || 'Failed to update Reseller storefront',
        variant: 'destructive',
      });
    },
  });

  const resellerProviderMutation = useMutation({
    mutationFn: async ({
      customerId,
      providerId,
      isEnabled,
    }: {
      customerId: string;
      providerId: string;
      isEnabled: boolean;
    }) => {
      const response = await apiRequest(
        'PATCH',
        `/api/admin/customers/${customerId}/reseller-providers/${providerId}`,
        { isEnabled },
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to update Reseller provider');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/customers/reseller-providers', selectedCustomer?.id],
      });
      toast({
        title: 'Provider Access saved',
        description: 'The Reseller provider availability has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Provider update failed',
        description: error.message || 'Failed to update Reseller provider Access',
        variant: 'destructive',
      });
    },
  });

  const resellerRetailMarkupMutation = useMutation({
    mutationFn: async ({
      customerId,
      markupPercent,
    }: {
      customerId: string;
      markupPercent: string;
    }) => {
      const response = await apiRequest(
        'POST',
        `/api/admin/customers/${customerId}/reseller-prices/bulk-markup`,
        { markupPercent },
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to update Reseller retail selling prices');
      return data.data;
    },
    onSuccess: (data) => {
      setResellerRetailMarkup('');
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/customers/reseller-providers', selectedCustomer?.id],
      });
      toast({
        title: 'Reseller selling prices updated',
        description: `${data.updated} Packages were updated from Reseller cost.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Bulk Reseller pricing failed',
        description: error.message || 'Failed to apply Reseller retail margin',
        variant: 'destructive',
      });
    },
  });

  const closeCustomerAction = () => {
    setCustomerAction({ type: null, customer: null });
    setBalanceAmount('');
    setBalanceDescription('');
    setNewPassword('');
    setNewEmail('');
    setVoucherLimitAmount('');
    setCustomerModuleDraft({});
    setCustomerMobileModuleDraft({});
    setCustomerSecurityDraft({
      twoFactorEnabled: false,
      otpEmailEnabled: true,
      otpPhoneEnabled: false,
    });
    setPackageSearch('');
    setSelectedPackageId('');
  };

  const openCustomerAction = (type: Exclude<CustomerActionType, null>, customer: User) => {
    if (!isDedicatedDetailsPage) {
      setSelectedCustomer(null);
    }
    setCustomerAction({ type, customer });
    setBalanceAmount('');
    setBalanceDescription('');
    setNewPassword('');
    setNewEmail(type === 'email' ? customer.email || '' : '');
    setVoucherLimitAmount(type === 'voucherLimit' ? '0' : '');
    setCustomerSecurityDraft({
      twoFactorEnabled: false,
      otpEmailEnabled: true,
      otpPhoneEnabled: false,
    });
    if (type === 'modules') {
      const customerRole = getCustomerRole(customer.role);
      const role = getRoleOptionKey(customerRole);
      const source = roleOptionsData || normalizeRoleOptionsConfig(null);
      setCustomerModuleDraft(getAssignableModules(customerRole).reduce<Record<string, boolean>>((acc, module) => {
        acc[module.key] = Boolean(source.roles[role].modules[module.key]);
        return acc;
      }, {}));
      setCustomerMobileModuleDraft(getAssignableModules(customerRole).reduce<Record<string, boolean>>((acc, module) => {
        acc[module.key] = Boolean(source.roles[role].mobileModules[module.key]);
        return acc;
      }, {}));
    } else {
      setCustomerModuleDraft({});
      setCustomerMobileModuleDraft({});
    }
    setPackageSearch('');
    setSelectedPackageId('');
  };

  const openCustomerDetails = (customer: User, tab: CustomerDetailsTab = 'details') => {
    setCustomerAction({ type: null, customer: null });
    navigate(getCustomerDetailsPath(customer, tab));
  };

  const handleCustomerDetailsTabChange = (value: string) => {
    const nextTab = validCustomerDetailsTabs.has(value as CustomerDetailsTab)
      ? (value as CustomerDetailsTab)
      : 'details';
    setCustomerDetailsTab(nextTab);

    if (isDedicatedDetailsPage && selectedCustomer) {
      window.history.replaceState(null, '', getCustomerDetailsPath(selectedCustomer, nextTab));
    }
  };

  const openKycReview = (customer: User) => {
    if (!isDedicatedDetailsPage) {
      setSelectedCustomer(null);
    }
    setKycReviewCustomer(customer);
    setKycRejectReason('');
  };

  const openWalletRefundDialog = (transaction: AdminWalletTransaction) => {
    const refundableAmount = toMoneyNumber(transaction.refundableAmount || transaction.amount);
    setWalletRefundTransaction(transaction);
    setWalletRefundAmount(refundableAmount > 0 ? refundableAmount.toFixed(2) : '');
    setWalletRefundReason('Customer requested refund');
    setWalletRefundNotes('');
  };

  const closeWalletRefundDialog = () => {
    setWalletRefundTransaction(null);
    setWalletRefundAmount('');
    setWalletRefundReason('Customer requested refund');
    setWalletRefundNotes('');
  };

  const updateSelectedCustomer = (updatedUser?: User) => {
    if (!updatedUser) return;
    queryClient.setQueryData<User | undefined>(
      ['/api/admin/customers/detail', updatedUser.id],
      (current) => (current ? { ...current, ...updatedUser } : updatedUser),
    );
    setSelectedCustomer((current) =>
      current?.id === updatedUser.id ? { ...current, ...updatedUser } : current,
    );
    setCustomerAction((current) =>
      current.customer?.id === updatedUser.id
        ? { ...current, customer: { ...current.customer, ...updatedUser } }
        : current,
    );
  };

  const addBalanceMutation = useMutation({
    mutationFn: async ({
      customerId,
      amount,
      description,
    }: {
      customerId: string;
      amount: number;
      description?: string;
    }) => {
      const response = await apiRequest('POST', `/api/admin/customers/${customerId}/balance`, {
        amount,
        description,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      updateSelectedCustomer(data?.data?.user);
      closeCustomerAction();
      toast({
        title: t('common.success', 'Success'),
        description: 'Balance added successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || 'Failed to add balance',
        variant: 'destructive',
      });
    },
  });

  const saveVoucherLimitMutation = useMutation({
    mutationFn: async ({ customerId, limit }: { customerId: string; limit: number }) => {
      const response = await apiRequest('POST', `/api/admin/customers/${customerId}/voucher-limit`, {
        limit,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to save voucher limit');
      return data.data as CustomerVoucherLimit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/customers/voucher-limit', customerAction.customer?.id],
      });
      closeCustomerAction();
      toast({
        title: 'Voucher limit saved',
        description: 'Agent or Reseller voucher creation is now limited by this amount.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Voucher limit failed',
        description: error.message || 'Failed to save voucher limit',
        variant: 'destructive',
      });
    },
  });

  const saveCustomerModulesMutation = useMutation({
    mutationFn: async ({
      customerId,
      modules,
      mobileModules,
    }: {
      customerId: string;
      modules: Record<string, boolean>;
      mobileModules: Record<string, boolean>;
    }) => {
      const response = await apiRequest('PUT', `/api/admin/customers/${customerId}/modules`, {
        modules,
        mobileModules,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to save customer modules');
      return data.data as CustomerModuleSettings;
    },
    onSuccess: (data, variables) => {
      const nextSettings = {
        customerId: variables.customerId,
        role: data.role,
        modules: data.modules || variables.modules,
        mobileModules: data.mobileModules || variables.mobileModules,
        defaults: data.defaults,
        mobileDefaults: data.mobileDefaults,
      };

      setCustomerModuleDraft(nextSettings.modules);
      setCustomerMobileModuleDraft(nextSettings.mobileModules);
      queryClient.setQueryData(
        ['/api/admin/customers/modules', variables.customerId],
        nextSettings,
      );
      queryClient.setQueryData(
        ['/api/admin/customers/modules', variables.customerId, 'details'],
        nextSettings,
      );
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/customers/modules', variables.customerId],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/customers/modules', variables.customerId, 'details'],
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/options'] });
      if (customerAction.type === 'modules') {
        closeCustomerAction();
      }
      toast({
        title: 'Modules saved',
        description: 'This account now uses the selected module access.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Modules failed',
        description: error.message || 'Failed to save customer modules',
        variant: 'destructive',
      });
    },
  });

  const saveSenderIdLimitMutation = useMutation({
    mutationFn: async ({ customerId, limit }: { customerId: string; limit: string }) => {
      const trimmedLimit = limit.trim();
      const response = await apiRequest('PUT', `/api/admin/customers/${customerId}/sender-id-limit`, {
        limit: trimmedLimit ? Number(trimmedLimit) : null,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to save Sender ID limit');
      return data.data as SenderIdLimitStatus;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ['/api/admin/customers/sender-id-limit', variables.customerId],
        data,
      );
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/customers/sender-id-limit', variables.customerId],
      });
      setSenderIdLimitDraft(data.overrideLimit === null ? '' : String(data.overrideLimit));
      toast({
        title: 'Sender ID limit saved',
        description: 'This account now uses the selected Sender ID limit.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Sender ID limit failed',
        description: error.message || 'Failed to save Sender ID limit',
        variant: 'destructive',
      });
    },
  });

  const saveCustomerSecurityMutation = useMutation({
    mutationFn: async ({
      customerId,
      settings,
    }: {
      customerId: string;
      settings: Pick<CustomerSecuritySettings, 'twoFactorEnabled' | 'otpEmailEnabled' | 'otpPhoneEnabled'>;
    }) => {
      const response = await apiRequest('PATCH', `/api/admin/customers/${customerId}/security`, settings);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to save customer security');
      return data.data as { user?: User; security: CustomerSecuritySettings };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/customers/security', customerAction.customer?.id],
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      if (data?.user) updateSelectedCustomer(data.user);
      closeCustomerAction();
      toast({
        title: 'Security saved',
        description: 'Login security settings were updated for this Account.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Security failed',
        description: error.message || 'Failed to save customer security',
        variant: 'destructive',
      });
    },
  });

  const refundWalletTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!walletRefundTransaction) throw new Error('Select a wallet transaction to refund');
      const response = await apiRequest(
        'POST',
        `/api/admin/customers/wallet-transactions/${walletRefundTransaction.id}/refund`,
        {
          amount: walletRefundAmount ? Number(walletRefundAmount) : undefined,
          reason: walletRefundReason,
          notes: walletRefundNotes,
        },
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to refund wallet transaction');
      return data.data as { user?: User };
    },
    onSuccess: (data) => {
      const customerId = data?.user?.id || selectedCustomer?.id;
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: ['/api/admin/customers/wallet-transactions', customerId],
        });
      }
      if (data?.user) updateSelectedCustomer(data.user);
      closeWalletRefundDialog();
      toast({
        title: 'Wallet transaction refunded',
        description: 'The customer wallet balance was updated and the refund was recorded.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Refund failed',
        description: error.message || 'Failed to refund wallet transaction',
        variant: 'destructive',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ customerId, password }: { customerId: string; password: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/customers/${customerId}/password`, {
        password,
      });
      return response.json();
    },
    onSuccess: (data) => {
      updateSelectedCustomer(data?.data);
      closeCustomerAction();
      toast({
        title: t('common.success', 'Success'),
        description: 'Password changed successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: async ({ customerId, email }: { customerId: string; email: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/customers/${customerId}/email`, {
        email,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      updateSelectedCustomer(data?.data);
      closeCustomerAction();
      toast({
        title: t('common.success', 'Success'),
        description: data?.message || 'Email address changed successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: getApiErrorMessage(error, 'Failed to change email address'),
        variant: 'destructive',
      });
    },
  });

  const customerStatusMutation = useMutation({
    mutationFn: async ({
      customerId,
      status,
    }: {
      customerId: string;
      status: 'active' | 'inactive';
    }) => {
      const response = await apiRequest('PATCH', `/api/admin/customers/${customerId}/status`, {
        status,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      updateSelectedCustomer(data?.data);
      toast({
        title: t('common.success', 'Success'),
        description: data?.message || 'Customer status updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || 'Failed to update customer status',
        variant: 'destructive',
      });
    },
  });

  const customerRoleMutation = useMutation({
    mutationFn: async ({
      customerId,
      role,
    }: {
      customerId: string;
      role: CustomerRole;
    }) => {
      const response = await apiRequest('PATCH', `/api/admin/customers/${customerId}/role`, {
        role,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      updateSelectedCustomer(data?.data);
      toast({
        title: t('common.success', 'Success'),
        description: data?.message || 'Customer role updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || 'Failed to update customer role',
        variant: 'destructive',
      });
    },
  });

  const customerAccountModeMutation = useMutation({
    mutationFn: async ({
      customerId,
      accountMode,
    }: {
      customerId: string;
      accountMode: CustomerAccountMode;
    }) => {
      const response = await apiRequest('PATCH', `/api/admin/customers/${customerId}`, {
        accountMode,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      updateSelectedCustomer(data?.data);
      toast({
        title: t('common.success', 'Success'),
        description: data?.message || 'Account status updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || 'Failed to update account status',
        variant: 'destructive',
      });
    },
  });

  const applyPackageMutation = useMutation({
    mutationFn: async ({ customerId, packageId }: { customerId: string; packageId: string }) => {
      const response = await apiRequest(
        'POST',
        `/api/admin/customers/${customerId}/apply-package`,
        { packageId, sendEmail: true },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      closeCustomerAction();
      toast({
        title: t('common.success', 'Success'),
        description: 'Package applied to customer successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || 'Failed to apply package',
        variant: 'destructive',
      });
    },
  });

  // ---------------------------------------------------------------------------
  // CSV Export Function (UNCHANGED)
  // ---------------------------------------------------------------------------

  const exportToCSV = async () => {
    try {

      if (user?.email === "de****@di***") {
        return toast({
          title: t("comman.error", "Error"),
          description: "Demo users are not allowed to perform this action",
          variant: 'destructive',
        })
      }

      const exportParams = new URLSearchParams({
        page: '1',
        limit: '1000000',
      });
      if (roleFilter) {
        exportParams.set('role', roleFilter);
      }

      const res = await fetch(`/api/admin/customers?${exportParams.toString()}`, {
        credentials: 'include',
      });

      const json = await res.json();
      const payload = json?.data ?? json;
      const allCustomers: User[] = Array.isArray(payload) ? payload : payload?.data || [];

      if (!allCustomers.length) {
        toast({
          title: t('common.noData', 'No Data'),
          description: t(
            'admin.customers.noCustomersToExport',
            'There are no Customers to export.',
          ),
          variant: 'destructive',
        });
        return;
      }

      const headers = [
        t('admin.customers.customerId', 'Customer ID'),
        t('common.name', 'Name'),
        t('common.email', 'Email'),
        t('admin.customers.phone', 'Phone'),
        t('admin.customers.address', 'Address'),
        'Role',
        t('admin.customers.kycStatus', 'KYC Status'),
        t('admin.customers.accountStatus', 'Account Status'),
        t('admin.customers.joinedDate', 'Joined Date'),
      ];

      const rows: Array<Array<string | number>> = allCustomers.map((customer) => [
        formatDisplayUserId(customer.displayUserId),
        customer.name || '',
        customer.email,
        customer.phone || '',
        customer.address || '',
        getCustomerRoleLabel(customer.role),
        customer.kycStatus,
        customer.isDeleted ? 'Deleted' : customer.isBlocked ? 'Blocked' : 'Active',
        new Date(customer.createdAt).toLocaleDateString(),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `${currentRolePluralLabel.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: t('admin.customers.exportSuccess', 'Export Successful'),
        description: t(
          'admin.customers.exportedCustomers',
          `Exported ${allCustomers.length} Customers to CSV.`,
        ),
      });
    } catch (err) {
      toast({
        title: t('common.error', 'Error'),
        description: 'Failed to export Customers.',
        variant: 'destructive',
      });
    }
  };

  // ---------------------------------------------------------------------------
  // KYC Status Styles (unchanged)
  // ---------------------------------------------------------------------------

  const kycStatusStyles: Record<string, string> = {
    pending: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    submitted: 'border-blue-200 bg-blue-50 text-blue-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-red-200 bg-red-50 text-red-700',
  };

  const selectedPackage = packageOptions.find((pkg) => pkg.id === selectedPackageId);
  const selectedCustomerOrders = selectedCustomer
    ? (customerOrders || []).filter((order) => order.userId === selectedCustomer.id)
    : [];
  const selectedCustomerWalletTransactions = walletTransactionsData?.transactions || [];
  const selectedCustomerStatus = selectedCustomer?.isDeleted
    ? 'Deleted'
    : selectedCustomer?.isBlocked
      ? 'Inactive'
      : 'Active';
  const selectedCustomerStatusStyle = selectedCustomer?.isDeleted
    ? userStatusStyles.deleted
    : selectedCustomer?.isBlocked
      ? userStatusStyles.blocked
      : userStatusStyles.active;
  const senderIdLimitUsage = isSenderIdLimitLoading
    ? 'Loading...'
    : senderIdLimitStatus
      ? `${senderIdLimitStatus.used}/${senderIdLimitStatus.effectiveLimit} used`
      : 'Not loaded';
  const senderIdLimitNote = senderIdLimitStatus
    ? senderIdLimitStatus.overrideLimit === null
      ? `Using default ${senderIdLimitStatus.defaultLimit}. ${senderIdLimitStatus.remaining} remaining.`
      : `${senderIdLimitStatus.remaining} remaining. Default is ${senderIdLimitStatus.defaultLimit}.`
    : 'Applies to web, mobile app, and PWA Sender ID requests.';
  const resellerStoreUrl = getResellerStoreUrl(resellerSubdomain || selectedCustomer?.resellerSubdomain);
  const activeEsimsCount = selectedCustomerOrders.filter((order) => order.status === 'completed').length;
  const failedEsimsCount = selectedCustomerOrders.filter((order) => order.status === 'failed').length;
  const selectedCustomerRateTable = rateTables.find(
    (rate) => rate.id === (selectedCustomerRateTableId || currentRateAssignment?.rateTableId),
  );
  const dedicatedCustomerListPath = selectedCustomer
    ? getCustomerListPath(selectedCustomer.role)
    : roleFilter
      ? customerListPaths[roleFilter]
      : '/admin/customers/users';

  const renderDedicatedCreateCustomer = () => {
    const createListPath = roleFilter ? customerListPaths[roleFilter] : getCustomerListPath(newCustomerRole);
    const passwordIsTooShort =
      newCustomerPassword.trim().length > 0 && newCustomerPassword.trim().length < 8;

    const submitCreateCustomer = () => {
      createCustomerMutation.mutate({
        email: newCustomerEmail.trim(),
        name: newCustomerName.trim(),
        password: newCustomerPassword,
        role: newCustomerRole,
        accountMode: newCustomerAccountMode,
        rateTableId: newCustomerRateTableId || undefined,
        kycVerificationRequired: newCustomerKycRequired,
        modules: newCustomerModules,
        mobileModules: newCustomerMobileModules,
      });
    };

    return (
      <div
        className={cn('customer-create-content w-full space-y-4', isRTL && 'text-right')}
        data-testid="page-create-customer"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              {t('adminPanel.customers.create.title', 'Create New {role}', { role: createRoleLabel })}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {t(
                'adminPanel.customers.create.description',
                'Add a new {role} account with portal access, account status, and module permissions.',
                { role: createRoleLabel.toLowerCase() },
              )}
            </p>
          </div>
          <Button
            variant="outline"
            className="customer-form-action w-full border-slate-300 bg-white text-slate-950 shadow-sm hover:bg-slate-50 sm:w-auto"
            onClick={() => navigate(createListPath)}
            data-testid="button-back-to-customers"
          >
            {t('adminPanel.customers.create.backToRole', 'Back to {role}', {
              role: createRolePluralLabel,
            })}
          </Button>
        </div>

        <div className={customerFormSheetClass} dir={isRTL ? 'rtl' : 'ltr'}>
          <div
            className={cn(
              'grid items-start gap-7',
              '2xl:grid-cols-[minmax(0,1.2fr)_minmax(430px,0.8fr)]',
            )}
          >
            <section className={cn(isRTL && '2xl:order-1')}>
              <h3 className="text-xl font-semibold text-slate-950">
                {t('adminPanel.customers.create.general', 'General')}
              </h3>
              <div className="mt-4 space-y-1">
                <CustomerSheetRow
                  leftLabel={t('adminPanel.customers.create.emailLabel', 'Email:')}
                  left={(
                    <Input
                      type="email"
                      value={newCustomerEmail}
                      onChange={(event) => setNewCustomerEmail(event.target.value)}
                      placeholder={t('adminPanel.customers.create.emailPlaceholder', 'customer@example.com')}
                      className={cn(customerFormFieldClass, isRTL && 'text-left')}
                      dir="ltr"
                      data-testid="input-create-customer-email"
                    />
                  )}
                  rightLabel={t('adminPanel.customers.create.nameLabel', 'Name:')}
                  right={(
                    <Input
                      value={newCustomerName}
                      onChange={(event) => setNewCustomerName(event.target.value)}
                      placeholder={t('adminPanel.customers.create.namePlaceholder', 'John Doe')}
                      className={customerFormFieldClass}
                      data-testid="input-create-customer-name"
                    />
                  )}
                  highlight
                />
                <CustomerSheetRow
                  leftLabel={t('adminPanel.customers.create.accountStatusLabel', 'Account Status:')}
                  left={(
                    <Select
                      value={newCustomerAccountMode}
                      onValueChange={(value) => setNewCustomerAccountMode(value as CustomerAccountMode)}
                    >
                      <SelectTrigger className={customerFormSelectTriggerClass} data-testid="select-create-customer-account-mode">
                        <SelectValue placeholder={t('adminPanel.customers.create.selectAccountStatus', 'Select account status')} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAccountModeOptions(newCustomerRole).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(`adminPanel.customers.accountModes.${option.value}`, option.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  rightLabel={t('adminPanel.customers.create.accountTypeLabel', 'Account Type:')}
                  right={(
                    <Select
                      value={newCustomerRole}
                      onValueChange={(value) => {
                        const nextRole = value as CustomerRole;
                        setNewCustomerRole(nextRole);
                        if (nextRole === 'customer') setNewCustomerRateTableId('');
                      }}
                      disabled={lockCreateRole}
                    >
                      <SelectTrigger className={customerFormSelectTriggerClass} data-testid="select-create-customer-role">
                        <SelectValue placeholder={t('adminPanel.customers.create.selectAccountType', 'Select account type')} />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {getTranslatedRoleLabel(option.value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <CustomerSheetRow
                  leftLabel={t('adminPanel.customers.create.passwordLabel', 'Password:')}
                  left={(
                    <Input
                      type="password"
                      value={newCustomerPassword}
                      onChange={(event) => setNewCustomerPassword(event.target.value)}
                      placeholder={t('adminPanel.customers.create.passwordPlaceholder', 'Set initial password')}
                      autoComplete="new-password"
                      className={customerFormFieldClass}
                      data-testid="input-create-customer-password"
                    />
                  )}
                  rightLabel={t('adminPanel.customers.create.kycRequiredLabel', 'KYC Required:')}
                  right={(
                    <Select
                      value={newCustomerKycRequired ? 'yes' : 'no'}
                      onValueChange={(value) => setNewCustomerKycRequired(value === 'yes')}
                    >
                      <SelectTrigger className={customerFormSelectTriggerClass} data-testid="select-create-customer-kyc-required">
                        <SelectValue placeholder={t('adminPanel.customers.create.selectKycRequirement', 'Select KYC requirement')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">{t('common.yes', 'Yes')}</SelectItem>
                        <SelectItem value="no">{t('common.no', 'No')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {passwordIsTooShort && (
                  <p className="px-3 text-xs text-red-600">
                    {t(
                      'adminPanel.customers.create.passwordTooShort',
                      'Password must be at least 8 characters, or leave it blank for setup later.',
                    )}
                  </p>
                )}
                {isRateAccount(newCustomerRole) && (
                  <CustomerSheetRow
                    leftLabel={t('adminPanel.customers.create.rateTableLabel', 'Rate Table:')}
                    left={(
                      <Select
                        value={newCustomerRateTableId}
                        onValueChange={setNewCustomerRateTableId}
                        disabled={rateTables.length === 0}
                      >
                        <SelectTrigger className={customerFormSelectTriggerClass} data-testid="select-create-customer-rate">
                          <SelectValue placeholder={t('adminPanel.customers.create.chooseRateTable', 'Choose rate table')} />
                        </SelectTrigger>
                        <SelectContent>
                          {rateTables.map((rate) => (
                            <SelectItem key={rate.id} value={rate.id}>
                              {rate.name} ({Number(rate.defaultMarginPercent || 0).toFixed(2)}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    rightLabel={t('adminPanel.customers.create.rateStatusLabel', 'Rate Status:')}
                    right={(
                      <Input
                        readOnly
                        value={rateTables.length === 0
                          ? t('adminPanel.customers.create.noRateTableAvailable', 'No rate table available')
                          : t('adminPanel.customers.create.optional', 'Optional')}
                        className={customerFormFieldClass}
                      />
                    )}
                  />
                )}
              </div>
            </section>

            <aside className={cn('space-y-6', isRTL && '2xl:order-2')}>
              <section>
                <h3 className="text-xl font-semibold text-slate-950">
                  {t('adminPanel.customers.create.accessLogin', 'Access Login')}
                </h3>
                <div className="mt-4 space-y-1">
                  <CustomerSheetRow
                    leftLabel={t('adminPanel.customers.create.usernameLabel', 'Username:')}
                    left={(
                      <Input
                        type="email"
                        value={newCustomerEmail}
                        onChange={(event) => setNewCustomerEmail(event.target.value)}
                        placeholder={t('adminPanel.customers.create.emailPlaceholder', 'customer@example.com')}
                        className={cn(customerFormFieldClass, isRTL && 'text-left')}
                        dir="ltr"
                        data-testid="input-create-customer-username"
                      />
                    )}
                  />
                  <CustomerSheetRow
                    leftLabel={t('adminPanel.customers.create.accountModeLabel', 'Account Mode:')}
                    left={<Input value={getTranslatedAccountModeLabel(normalizeAccountMode(newCustomerRole, newCustomerAccountMode))} readOnly tabIndex={-1} className={customerFormFieldClass} />}
                  />
                  <CustomerSheetRow
                    leftLabel={t('adminPanel.customers.create.roleLabel', 'Role:')}
                    left={<Input value={createRoleLabel} readOnly tabIndex={-1} className={customerFormFieldClass} />}
                  />
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-slate-950">
                  {t('adminPanel.customers.create.quickActions', 'Quick Actions')}
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className={customerFormActionClass} onClick={() => navigate(createListPath)}>
                    {t('common.button.cancel', 'Cancel')}
                  </Button>
                <Button
                  type="button"
                    className="customer-form-submit h-9 rounded-md border border-[#3eab9f] bg-[#58cbbb] px-4 text-white shadow-sm hover:bg-[#4fb8aa] disabled:border-[#3eab9f] disabled:bg-[#d8f1ee] disabled:text-[#0f766e] disabled:opacity-100"
                    onClick={submitCreateCustomer}
                    disabled={!newCustomerEmail.trim() || passwordIsTooShort || createCustomerMutation.isPending}
                    data-testid="button-submit-create-customer"
                  >
                    {createCustomerMutation.isPending
                      ? t('adminPanel.customers.create.creating', 'Creating...')
                      : t('adminPanel.customers.create.submit', 'Create {role}', { role: createRoleLabel })}
                  </Button>
                </div>
              </section>
            </aside>
          </div>

          {assignableModules.length > 0 && (
            <section className="mt-6 space-y-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">
                  {t('adminPanel.customers.create.modules', 'Modules')}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {t('adminPanel.customers.create.modulesDescription', 'Select the modules this account can see and use.')}
                </p>
              </div>
              <ModuleAccessPanel
                title={t('adminPanel.customers.create.webModulesTitle', 'Web UI Modules for {role}', {
                  role: createRoleLabel,
                })}
                description={t(
                  'adminPanel.customers.create.webModulesDescription',
                  'Select the modules this account can see and use on the web portal.',
                )}
                role={newCustomerRole}
                modules={assignableModules}
                values={newCustomerModules}
                onValuesChange={setNewCustomerModules}
                selectionMode
              />
              <ModuleAccessPanel
                title={t('adminPanel.customers.create.mobileModulesTitle', 'Mobile App Modules for {role}', {
                  role: createRoleLabel,
                })}
                description={t(
                  'adminPanel.customers.create.mobileModulesDescription',
                  'Select the modules this account can see and use inside the mobile app.',
                )}
                role={newCustomerRole}
                modules={assignableModules}
                values={newCustomerMobileModules}
                onValuesChange={setNewCustomerMobileModules}
                selectionMode
              />
            </section>
          )}
        </div>
      </div>
    );
  };

  const renderDedicatedCustomerDetails = () => {
    if (isDedicatedCustomerLoading || (!selectedCustomer && !dedicatedCustomerError)) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#58cbbb]" />
          <p className="text-sm text-slate-400">Loading customer details...</p>
        </div>
      );
    }

    if (dedicatedCustomerError || !selectedCustomer) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <ShieldAlert className="h-12 w-12 text-red-400" />
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Customer not found</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {(dedicatedCustomerError as Error)?.message || 'This customer could not be loaded.'}
            </p>
          </div>
          <Button
            variant="outline"
            className="border-slate-300 bg-white text-slate-950 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={() => navigate(dedicatedCustomerListPath)}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to customers
          </Button>
        </div>
      );
    }

    const customerRole = getCustomerRole(selectedCustomer.role);
    const modules = getAssignableModules(customerRole);
    const lineInputClass = customerFormFieldClass;
    const lightInputClass = customerFormLightFieldClass;
    const selectTriggerClass = customerFormSelectTriggerClass;
    const quietActionClass = customerFormActionClass;
    const tabTriggerClass =
      'rounded-none border-b-2 border-transparent px-4 py-2 text-slate-500 outline-none ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-slate-950 data-[state=active]:shadow-none dark:text-slate-300 dark:data-[state=active]:text-white';
    const sheetClass = customerFormSheetClass;
    const customerDetailsSectionTitle: Record<CustomerDetailsTab, string> = {
      details: 'Details',
      orders: 'Orders',
      wallet: 'Wallet',
      modules: 'Modules',
      activity: 'Activity',
    };
    const saveDedicatedCustomer = () => {
      updateCustomerMutation.mutate({
        customerId: selectedCustomer.id,
        data: {
          name: customerDetailsDraft.name.trim(),
          phone: customerDetailsDraft.phone.trim(),
          address: customerDetailsDraft.address.trim(),
        },
      });
    };

    return (
      <div className="w-full space-y-4" data-testid="page-customer-details">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Edit Customer</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-500">
              Update customer account details, login access, wallet, modules, and record dates.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full border-slate-300 bg-white text-slate-950 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800 dark:hover:text-white sm:w-auto"
            onClick={() => navigate(dedicatedCustomerListPath)}
            data-testid="button-back-to-customers"
          >
            Back to {rolePluralLabels[customerRole]}
          </Button>
        </div>

        <Tabs value={customerDetailsTab} onValueChange={handleCustomerDetailsTabChange} className="w-full">
          <TabsList className="h-auto w-full justify-start rounded-none border-b border-slate-200 bg-transparent p-0 dark:border-slate-800">
            <TabsTrigger value="details" className={tabTriggerClass}>Customer Details</TabsTrigger>
            <TabsTrigger value="orders" className={tabTriggerClass}>Orders ({selectedCustomerOrders.length})</TabsTrigger>
            <TabsTrigger value="wallet" className={tabTriggerClass}>Wallet ({selectedCustomerWalletTransactions.length})</TabsTrigger>
            <TabsTrigger value="modules" className={tabTriggerClass}>Modules</TabsTrigger>
            <TabsTrigger value="activity" className={tabTriggerClass}>Activity</TabsTrigger>
          </TabsList>

          <div className="mt-4 text-base font-semibold text-slate-950 dark:text-white">
            {customerDetailsSectionTitle[customerDetailsTab]}
          </div>

          <TabsContent value="details" className={sheetClass}>
            <div className="grid items-start gap-7 2xl:grid-cols-[minmax(0,1.35fr)_minmax(430px,0.65fr)]">
              <section>
                <h3 className="text-xl font-semibold text-slate-950">General</h3>
                <div className="mt-4 space-y-1">
                  <CustomerSheetRow
                    leftLabel="Customer Name:"
                    left={(
                      <Input
                        value={customerDetailsDraft.name}
                        onChange={(event) => setCustomerDetailsDraft((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Customer name"
                        className={lineInputClass}
                      />
                    )}
                    rightLabel="Customer ID:"
                    right={(
                      <Input
                        value={formatDisplayUserId(selectedCustomer.displayUserId)}
                        readOnly
                        className={lineInputClass}
                      />
                    )}
                    highlight
                  />
                  <CustomerSheetRow
                    leftLabel="Phone:"
                    left={(
                      <Input
                        value={customerDetailsDraft.phone}
                        onChange={(event) => setCustomerDetailsDraft((current) => ({ ...current, phone: event.target.value }))}
                        placeholder="Phone number"
                        className={lineInputClass}
                      />
                    )}
                    rightLabel="Email:"
                    right={<Input value={selectedCustomer.email} readOnly className={lineInputClass} />}
                  />
                  <CustomerSheetRow
                    leftLabel="Address:"
                    left={(
                      <Input
                        value={customerDetailsDraft.address}
                        onChange={(event) => setCustomerDetailsDraft((current) => ({ ...current, address: event.target.value }))}
                        placeholder="Street address"
                        className={lineInputClass}
                      />
                    )}
                    rightLabel="Wallet:"
                    right={<Input value={formatMoney(walletTransactionsData?.balance || selectedCustomer.walletBalance || '0.00')} readOnly className={lineInputClass} />}
                  />
                  <CustomerSheetRow
                    leftLabel="Role:"
                    left={(
                      <Select
                        value={customerRole}
                        onValueChange={(value) => confirmRoleChange(selectedCustomer, value as CustomerRole)}
                        disabled={customerRoleMutation.isPending}
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {userRoleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    rightLabel="Status:"
                    right={(
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            lightInputClass,
                            !selectedCustomer.isBlocked && !selectedCustomer.isDeleted && 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
                          )}
                          disabled={customerStatusMutation.isPending || (!selectedCustomer.isBlocked && !selectedCustomer.isDeleted)}
                          onClick={() =>
                            customerStatusMutation.mutate({
                              customerId: selectedCustomer.id,
                              status: 'active',
                            })
                          }
                        >
                          Active
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            lightInputClass,
                            (selectedCustomer.isBlocked || selectedCustomer.isDeleted) && 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-50',
                          )}
                          disabled={customerStatusMutation.isPending || selectedCustomer.isBlocked || selectedCustomer.isDeleted}
                          onClick={() =>
                            handleConfirm({
                              title: 'Deactivate Customer',
                              description: 'Are you sure you want to deactivate this customer?',
                              confirmText: 'Deactivate',
                              variant: 'destructive',
                              onConfirm: () =>
                                customerStatusMutation.mutate({
                                  customerId: selectedCustomer.id,
                                  status: 'inactive',
                                }),
                            })
                          }
                        >
                          Inactive
                        </Button>
                      </div>
                    )}
                  />
                  <CustomerSheetRow
                    leftLabel="KYC Required:"
                    left={(
                      <Select
                        value={selectedCustomer.kycVerificationRequired === false ? 'no' : 'yes'}
                        onValueChange={(value) =>
                          customerKycRequiredMutation.mutate({
                            customerId: selectedCustomer.id,
                            required: value === 'yes',
                          })
                        }
                        disabled={customerKycRequiredMutation.isPending}
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Required</SelectItem>
                          <SelectItem value="no">Not required</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    rightLabel="KYC Status:"
                    right={<Input value={formatDisplayValue(selectedCustomer.kycStatus)} readOnly className={lineInputClass} />}
                  />
                  <CustomerSheetRow
                    leftLabel="Sender ID Limit:"
                    left={(
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={senderIdLimitDraft}
                          onChange={(event) => setSenderIdLimitDraft(event.target.value)}
                          placeholder={senderIdLimitStatus ? `Default ${senderIdLimitStatus.defaultLimit}` : 'Use default'}
                          className={lineInputClass}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(quietActionClass, 'px-4')}
                          disabled={saveSenderIdLimitMutation.isPending || isSenderIdLimitLoading}
                          onClick={() =>
                            saveSenderIdLimitMutation.mutate({
                              customerId: selectedCustomer.id,
                              limit: senderIdLimitDraft,
                            })
                          }
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    )}
                    rightLabel="Sender IDs:"
                    right={<Input value={senderIdLimitUsage} readOnly className={lineInputClass} />}
                  />
                </div>
              </section>

              <aside className="space-y-6">
                <section>
                  <h3 className="text-xl font-semibold text-slate-950">Access Login</h3>
                  <div className="mt-4 space-y-1">
                    <CustomerSheetRow
                      leftLabel="Username:"
                      left={<Input value={selectedCustomer.email} readOnly className={lineInputClass} />}
                    />
                    <CustomerSheetRow
                      leftLabel="Password:"
                      left={(
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(quietActionClass, 'justify-start')}
                          onClick={() => openCustomerAction('password', selectedCustomer)}
                        >
                          Set Password
                        </Button>
                      )}
                    />
                    <CustomerSheetRow
                      leftLabel="Account Type:"
                      left={(
                        <Select
                          value={normalizeAccountMode(customerRole, selectedCustomer.accountMode)}
                          onValueChange={(value) =>
                            customerAccountModeMutation.mutate({
                              customerId: selectedCustomer.id,
                              accountMode: value as CustomerAccountMode,
                            })
                          }
                          disabled={customerAccountModeMutation.isPending}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAccountModeOptions(customerRole).map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-slate-950">Record Dates</h3>
                  <div className="mt-4 space-y-1">
                    <CustomerSheetRow
                      leftLabel="Date Created:"
                      left={<Input type="date" value={formatDateForInput(selectedCustomer.createdAt)} readOnly className={lineInputClass} />}
                    />
                    <CustomerSheetRow
                      leftLabel="Date Modified:"
                      left={<Input type="date" value={formatDateForInput(selectedCustomer.updatedAt)} readOnly className={lineInputClass} />}
                    />
                    <CustomerSheetRow
                      leftLabel="Last Login:"
                      left={<Input value={(selectedCustomer as User & { lastLoginAt?: Date | string | null }).lastLoginAt ? new Date((selectedCustomer as User & { lastLoginAt?: Date | string | null }).lastLoginAt as Date | string).toLocaleString() : 'Never'} readOnly className={lineInputClass} />}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-slate-950">Quick Actions</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className={quietActionClass} onClick={() => openCustomerAction('balance', selectedCustomer)}>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Add Balance
                    </Button>
                    <Button type="button" variant="outline" className={quietActionClass} onClick={() => openCustomerAction('email', selectedCustomer)}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={quietActionClass}
                      onClick={() => openCustomerAction('package', selectedCustomer)}
                      disabled={selectedCustomer.isBlocked || selectedCustomer.isDeleted}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Package
                    </Button>
                    <Button type="button" variant="outline" className={quietActionClass} onClick={() => openKycReview(selectedCustomer)}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      KYC
                    </Button>
                    <Button type="button" variant="outline" className={quietActionClass} onClick={() => openCustomerAction('security', selectedCustomer)}>
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      Security
                    </Button>
                    <Button type="button" variant="outline" className={quietActionClass} onClick={() => handleCustomerDetailsTabChange('modules')}>
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Modules
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(quietActionClass, 'col-span-2')}
                      onClick={() => openLoginAsCustomer(selectedCustomer)}
                      disabled={selectedCustomer.isBlocked || selectedCustomer.isDeleted || loginAsCustomerMutation.isPending}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      {getLoginAsCustomerLabel(selectedCustomer.role)}
                    </Button>
                  </div>
                </section>
              </aside>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                className="bg-[#58cbbb] px-6 text-white hover:bg-[#4fb8aa]"
                onClick={saveDedicatedCustomer}
                disabled={updateCustomerMutation.isPending}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                {updateCustomerMutation.isPending ? 'Updating...' : 'Update Customer'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="orders" className={sheetClass}>
            <div className="space-y-3">
              {selectedCustomerOrders.length > 0 ? (
                selectedCustomerOrders.map((order) => (
                  <Card key={order.id} className="border-slate-200 bg-slate-50 p-4 shadow-none">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {order.package?.destination?.name || order.package?.title || 'Global'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDisplayOrderId(order.displayOrderId)} - {order.dataAmount} - {order.validity} days
                        </p>
                      </div>
                      <Badge variant="outline">{formatDisplayValue(order.status)}</Badge>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <Package className="mb-3 h-12 w-12 text-slate-400" />
                  <p className="font-medium text-slate-950">No Orders Yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="wallet" className={sheetClass}>
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h4 className="font-semibold text-slate-950">Wallet Transactions</h4>
                <Badge variant="outline" className="border-slate-300 text-slate-700">
                  Balance {formatMoney(walletTransactionsData?.balance || selectedCustomer.walletBalance || '0.00')}
                </Badge>
              </div>
              {isWalletTransactionsLoading ? (
                <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                  Loading wallet transactions...
                </div>
              ) : selectedCustomerWalletTransactions.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomerWalletTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-950">
                          {transaction.description || transaction.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-slate-500">{new Date(transaction.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            isWalletTransactionDebit(transaction)
                              ? 'font-semibold text-red-400'
                              : 'font-semibold text-green-400'
                          }
                        >
                          {isWalletTransactionDebit(transaction) ? '-' : '+'}
                          {formatMoney(transaction.amount, transaction.currency)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openWalletRefundDialog(transaction)}
                          disabled={
                            !canRefundWalletTransaction(transaction) ||
                            refundWalletTransactionMutation.isPending
                          }
                        >
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          Refund
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center text-center">
                  <DollarSign className="mb-3 h-12 w-12 text-slate-400" />
                  <p className="font-medium text-slate-950">No Wallet Activity</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="modules" className={sheetClass}>
            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-semibold text-slate-950">Modules</h4>
                  <p className="text-sm text-slate-500">
                    Control which services this user can see and use on web and mobile.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#58cbbb] text-white hover:bg-[#4fb8aa]"
                  disabled={isSelectedCustomerModulesLoading || saveCustomerModulesMutation.isPending}
                  onClick={() =>
                    saveCustomerModulesMutation.mutate({
                      customerId: selectedCustomer.id,
                      modules: customerModuleDraft,
                      mobileModules: customerMobileModuleDraft,
                    })
                  }
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {saveCustomerModulesMutation.isPending ? 'Saving...' : 'Save Modules'}
                </Button>
              </div>
              {isSelectedCustomerModulesLoading ? (
                <div className="flex h-48 items-center justify-center text-sm text-slate-500">Loading modules...</div>
              ) : (
                <div className="space-y-4">
                  <ModuleAccessPanel
                    title="Web UI Access"
                    description="Controls what this account can see and use in the browser portal."
                    role={customerRole}
                    modules={modules}
                    values={customerModuleDraft}
                    onValuesChange={setCustomerModuleDraft}
                  />
                  <ModuleAccessPanel
                    title="Mobile App Access"
                    description="Controls what this account can see and use in the mobile app."
                    role={customerRole}
                    modules={modules}
                    values={customerMobileModuleDraft}
                    onValuesChange={setCustomerMobileModuleDraft}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className={sheetClass}>
            <div className="space-y-3">
              <div className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                <UserCircle className="h-5 w-5 text-[#4fb8aa]" />
                <div>
                  <p className="text-sm font-medium text-slate-950">Account Created</p>
                  <p className="text-xs text-slate-500">
                    {new Date(selectedCustomer.createdAt).toLocaleDateString()} at{' '}
                    {new Date(selectedCustomer.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                <Activity className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-950">
                    KYC Status: {formatDisplayValue(selectedCustomer.kycStatus)}
                  </p>
                  <p className="text-xs text-slate-500">Current verification status</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // START OF JSX (UNCHANGED — FULL UI PRESERVED)
  // ---------------------------------------------------------------------------

  return (
    <div
      className={cn(
        'space-y-6 p-6 lg:p-8',
        isDedicatedCreatePage
          ? 'customer-create-shell admin-mode-surface m-6 h-[calc(100vh-7rem)] overflow-y-auto rounded-[18px] bg-white text-slate-950 shadow-sm no-visible-scrollbar dark:bg-white dark:text-slate-950'
          : 'text-slate-900 dark:text-slate-100',
      )}
    >
      {isDedicatedDetailsPage ? (
        renderDedicatedCustomerDetails()
      ) : isDedicatedCreatePage ? (
        renderDedicatedCreateCustomer()
      ) : (
        <>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {pageDescription}
          </p>
        </div>
        <div className="flex gap-2 flex-col md:flex-row">
          <Button
            className="bg-[#58cbbb] text-slate-950 hover:bg-[#67d8c8]"
            onClick={openCreateCustomerDialog}
            data-testid="button-create-customer"
          >
            {t('adminPanel.admin.customers.createRole', 'Create {role}', {
              role: currentRoleLabel,
            })}
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={exportToCSV}
            data-testid="button-export-customers"
          >
            <Download className="h-4 w-4" />
            {t('adminPanel.admin.customers.exportRolePlural', 'Export {rolePlural}', {
              rolePlural: currentRolePluralLabel,
            })}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm"
          data-testid="card-total-customers-stat"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#168b80]">
                {t('adminPanel.admin.customers.totalMetric', 'Total {rolePlural}', {
                  rolePlural: currentRolePluralLabel,
                })}
              </p>
              <h3
                className="mt-1 text-2xl font-semibold text-slate-950"
                data-testid="text-total-customers-count"
              >
                {totalItems}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#58cbbb]">
              <UserCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card
          className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm"
          data-testid="card-verified-customers"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                {t('adminPanel.admin.customers.verified', 'Verified')}
              </p>
              <h3
                className="mt-1 text-2xl font-semibold text-slate-950"
                data-testid="text-verified-count"
              >
                {stats?.totalVerified}
              </h3>
            </div>
          </div>
        </Card>

        <Card
          className="rounded-md border border-slate-200 bg-white p-6 text-slate-950 shadow-sm"
          data-testid="card-blocked-customers"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">
                {t('adminPanel.admin.customers.blockedMetric', 'Blocked {rolePlural}', {
                  rolePlural: currentRolePluralLabel,
                })}
              </p>
              <h3
                className="mt-1 text-2xl font-semibold text-slate-950"
                data-testid="text-blocked-count"
              >
                {stats?.totalBlocked || 0}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
              <Ban className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-5 items-end">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className={cn(
                  'absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400',
                  isRTL ? 'right-3' : 'left-3',
                )} />
                <Input
                  placeholder={t(
                    'adminPanel.admin.customers.searchPlaceholder',
                    'Search by name, email, or ID...',
                  )}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  dir={tableDirection}
                  className={cn(
                    'border-slate-300 bg-white text-slate-950 placeholder:text-slate-400',
                    isRTL ? 'pr-9 text-right' : 'pl-9',
                  )}
                  data-testid="input-search-customers"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="px-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                {t("adminPanel.admin.customers.kycStatus", "KYC Status")}
              </label>
              <Select
                value={kycFilter}
                onValueChange={(value) => {
                  setKycFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="border-slate-300 bg-white text-slate-950">
                  <SelectValue
                    placeholder={t('adminPanel.admin.customers.filterByKyc', 'Filter by KYC status')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('adminPanel.admin.customers.allKyc', 'All KYC')}
                  </SelectItem>
                  <SelectItem value="pending">{t('common.common.pending', 'Pending')}</SelectItem>
                  <SelectItem value="approved">
                    {t('adminPanel.admin.customers.approved', 'Approved')}
                  </SelectItem>
                  <SelectItem value="submitted">
                    {t('adminPanel.admin.customers.submitted', 'Submitted')}
                  </SelectItem>
                  <SelectItem value="rejected">
                    {t('adminPanel.admin.customers.rejected', 'Rejected')}
                  </SelectItem>
                  <SelectItem value="verified">
                    {t('adminPanel.admin.customers.verified', 'Verified')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="px-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                {t("adminPanel.admin.customers.accountStatus", "Account Status")}
              </label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="border-slate-300 bg-white text-slate-950">
                  <SelectValue
                    placeholder={t('admin.customers.filterByStatus', 'Filter by status')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('adminPanel.admin.customers.allStatuses', 'All Statuses')}
                  </SelectItem>
                  <SelectItem value="active">{t('adminPanel.admin.customers.activeCustomers', 'Active')}</SelectItem>
                  <SelectItem value="blocked">{t('adminPanel.admin.customers.blockedCustomers', 'Blocked')}</SelectItem>
                  <SelectItem value="deleted">{t('adminPanel.admin.customers.deletedCustomers', 'Deleted')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-slate-300 text-slate-600">
                {totalItems} {currentRolePluralLabel.toLowerCase()}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

    

      {/* Customers Table */}
      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <div className="overflow-x-auto" dir={tableDirection}>
          <Table className={cn('min-w-[1500px]', tableTextAlignClass)} dir={tableDirection}>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                <TableHead className={cn(tableTextAlignClass, 'font-medium text-slate-600')}>
                  {t('adminPanel.admin.customers.customerId', 'Customer ID')}
                </TableHead>
                <TableHead className={cn(tableTextAlignClass, 'font-medium text-slate-600')}>{t('adminPanel.admin.customers.table.customer', 'Name')}</TableHead>
                <TableHead className={cn(tableTextAlignClass, 'font-medium text-slate-600')}>{t('adminPanel.admin.customers.table.email', 'Email')}</TableHead>
                <TableHead className={cn(tableTextAlignClass, 'font-medium text-slate-600')}>
                  {t('adminPanel.admin.customers.phone', 'Phone')}
                </TableHead>
                <TableHead className={cn(tableTextAlignClass, 'font-medium text-slate-600')}>
                  {t('adminPanel.admin.customers.wallet', 'Wallet')}
                </TableHead>
                <TableHead className={cn(tableTextAlignClass, 'font-medium text-slate-600')}>
                  {t('adminPanel.admin.customers.role', 'Role')}
                </TableHead>
                <TableHead className={cn(tableTextAlignClass, 'font-medium text-slate-600')}>
                  {t('adminPanel.admin.customers.table.status', 'KYC Status')}
                </TableHead>
                <TableHead className={cn(tableTextAlignClass, 'font-medium text-slate-600')}>
                  {t("adminPanel.admin.customers.table.userStatus", "User Status")}
                </TableHead>

                <TableHead className={cn(tableTextAlignClass, 'font-medium text-slate-600')}>
                  {t('adminPanel.admin.customers.joined', 'Joined')}
                </TableHead>
                <TableHead className="text-right font-medium text-slate-600">
                  {t('common.common.actions', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                      <p className="text-sm text-slate-500">
                        {t('admin.customers.loadingCustomers', 'Loading customers...')}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : customersError ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <ShieldAlert className="h-8 w-8 text-red-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        Could not load Customers
                      </h3>
                      <p className="text-sm text-slate-500">
                        {(customersError as Error).message}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                        <UserCircle className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        {`No ${currentRolePluralLabel.toLowerCase()} found`}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {searchQuery || kycFilter !== 'all'
                          ? t('common.tryAdjustingFilters', 'Try adjusting your filters')
                          : `${currentRolePluralLabel} will appear here once they register`}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="border-slate-200 hover:bg-slate-50"
                    data-testid={`row-customer-${customer.id}`}
                  >
                    <TableCell className={cn('font-mono text-xs font-medium text-slate-950', tableTextAlignClass)} dir={tableDirection}>
                      <div className={cn('flex', isRTL ? 'justify-end' : 'justify-start')}>
                        <span dir="ltr">{formatDisplayUserId(customer.displayUserId)}</span>
                      </div>
                    </TableCell>

                    <TableCell className={tableTextAlignClass} dir={tableDirection}>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-white text-xs font-semibold">
                          {customer.name?.charAt(0).toUpperCase() ||
                            customer.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-950" dir="auto">
                          {customer.name || t('common.na', 'N/A')}
                        </span>
                      </div>
                      <div className={cn('mt-2 flex items-center gap-2', isRTL ? 'pr-10' : 'pl-10')}>
                        <span className="text-[11px] font-medium text-slate-500">
                          {t('adminPanel.customers.create.accountStatusLabel', 'Account Status')}
                        </span>
                        <Badge
                          variant="outline"
                          className={accountModeStyles[normalizeAccountMode(getCustomerRole(customer.role), customer.accountMode)]}
                        >
                          {getTranslatedAccountModeLabel(normalizeAccountMode(getCustomerRole(customer.role), customer.accountMode))}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell className={cn('text-slate-600', tableTextAlignClass)} dir="ltr">
                      {customer.email}
                    </TableCell>

                    <TableCell className={cn('text-slate-600', tableTextAlignClass)} dir="ltr">
                      {customer.phone || t('common.na', 'N/A')}
                    </TableCell>

                    <TableCell className={cn('font-medium text-slate-950', tableTextAlignClass)} dir="ltr">
                      {formatMoney(customer.walletBalance || '0.00')}
                    </TableCell>

                    <TableCell className={tableTextAlignClass}>
                      <Badge
                        className={`${userRoleStyles[getCustomerRole(customer.role)]} capitalize`}
                        variant="outline"
                      >
                        {getTranslatedRoleLabel(getCustomerRole(customer.role))}
                      </Badge>
                    </TableCell>

                    <TableCell className={tableTextAlignClass}>
                      <Badge className={kycStatusStyles[customer.kycStatus]} variant="outline">
                        {t(`adminPanel.admin.customers.kyc.${customer.kycStatus}`, formatDisplayValue(customer.kycStatus))}
                      </Badge>
                    </TableCell>


                    <TableCell className={tableTextAlignClass}>
                      <div className="flex flex-col gap-1">
                        <Badge
                          className={
                            customer.isDeleted
                              ? userStatusStyles.deleted
                              : customer.isBlocked
                                ? userStatusStyles.blocked
                                : userStatusStyles.active
                          }
                          variant="outline"
                        >
                          {customer.isDeleted
                            ? t('adminPanel.admin.customers.deletedCustomers', 'Deleted')
                            : customer.isBlocked
                              ? t('adminPanel.admin.customers.blockedCustomers', 'Blocked')
                              : t('adminPanel.admin.customers.activeCustomers', 'Active')}
                        </Badge>
                      </div>
                    </TableCell>


                    <TableCell className={cn('text-sm text-slate-600', tableTextAlignClass)}>
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="border border-[#58cbbb] text-slate-700 hover:bg-[#e9fbf8] hover:text-[#168b80]"
                            data-testid={`button-actions-customer-${customer.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openCustomerDetails(customer)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('common.common.viewDetails', 'View Details')}
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openCustomerDetails(customer, 'wallet')}>
                            <RefreshCcw className="mr-2 h-4 w-4 text-emerald-600" />
                            Wallet Transactions
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openCustomerAction('balance', customer)}>
                            <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                            Add Balance
                          </DropdownMenuItem>

                          {isRateAccount(customer.role) && (
                            <DropdownMenuItem onClick={() => openCustomerAction('voucherLimit', customer)}>
                              <Ticket className="mr-2 h-4 w-4 text-lime-600" />
                              Set Voucher Limit
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => openCustomerAction('modules', customer)}>
                            <SlidersHorizontal className="mr-2 h-4 w-4 text-cyan-600" />
                            Set Modules
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openCustomerAction('password', customer)}>
                            <KeyRound className="mr-2 h-4 w-4 text-teal-600" />
                            Change Password
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openCustomerAction('email', customer)}>
                            <Mail className="mr-2 h-4 w-4 text-indigo-600" />
                            Change Email
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openCustomerAction('security', customer)}>
                            <ShieldAlert className="mr-2 h-4 w-4 text-cyan-600" />
                            Security
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => openKycReview(customer)}>
                            <ShieldCheck className="mr-2 h-4 w-4 text-blue-600" />
                            KYC Review
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => openLoginAsCustomer(customer)}
                            disabled={customer.isBlocked || customer.isDeleted || loginAsCustomerMutation.isPending}
                          >
                            <LogIn className="mr-2 h-4 w-4 text-cyan-600" />
                            {getLoginAsCustomerLabel(customer.role)}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => openCustomerAction('package', customer)}
                            disabled={customer.isBlocked || customer.isDeleted}
                          >
                            <Package className="mr-2 h-4 w-4 text-indigo-600" />
                            Apply Package
                          </DropdownMenuItem>

                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger disabled={customerRoleMutation.isPending}>
                              <ShieldCheck className="mr-2 h-4 w-4 text-indigo-600" />
                              Set Role
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {userRoleOptions.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  disabled={getCustomerRole(customer.role) === option.value}
                                  onClick={() => confirmRoleChange(customer, option.value)}
                                >
                                  Set as {option.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger disabled={customerAccountModeMutation.isPending}>
                              <Server className="mr-2 h-4 w-4 text-blue-600" />
                              Account Status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {getAccountModeOptions(getCustomerRole(customer.role)).map((option) => {
                                const currentMode = normalizeAccountMode(getCustomerRole(customer.role), customer.accountMode);
                                return (
                                  <DropdownMenuItem
                                    key={option.value}
                                    disabled={currentMode === option.value}
                                    onClick={() =>
                                      customerAccountModeMutation.mutate({
                                        customerId: customer.id,
                                        accountMode: option.value,
                                      })
                                    }
                                  >
                                    Set {option.label}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                                        <DropdownMenuItem
                                          className={customer.isBlocked || customer.isDeleted ? undefined : 'text-red-600 focus:text-red-700'}
                                          onClick={() => {
                                            const nextStatus = customer.isBlocked || customer.isDeleted ? 'active' : 'inactive';
                                            const title =
                                              nextStatus === 'active' ? 'Activate Customer' : 'Deactivate Customer';

                              const description =
                                nextStatus === 'active'
                                  ? 'Are you sure you want to activate this customer? They will regain account Access.'
                                  : 'Are you sure you want to deactivate this customer? They will be prevented from accessing their account.';

                              handleConfirm({
                                title,
                                description,
                                confirmText: nextStatus === 'active' ? 'Activate' : 'Deactivate',
                                variant: nextStatus === 'active' ? 'default' : 'destructive',
                                onConfirm: () => {
                                  customerStatusMutation.mutate({
                                    customerId: customer.id,
                                    status: nextStatus,
                                  });
                                }
                              });
                            }}
                            disabled={customerStatusMutation.isPending}
                          >
                            {customer.isBlocked || customer.isDeleted ? (
                              <>
                                <Power className="mr-2 h-4 w-4 text-green-600" />
                                Activate Customer
                                            </>
                                          ) : (
                                            <>
                                              <Ban className="mr-2 h-4 w-4 text-red-600" />
                                              Deactivate Customer
                                            </>
                                          )}
                                        </DropdownMenuItem>

                          {/* <DropdownMenuItem
                            onClick={() =>
                              updateKycMutation.mutate({
                                customerId: customer.id,
                                kycStatus: 'verified',
                              })
                            }
                            disabled={
                              updateKycMutation.isPending || customer.kycStatus === 'verified'
                            }
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            {t('admin.customers.verifyKyc', 'Verify KYC')}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              updateKycMutation.mutate({
                                customerId: customer.id,
                                kycStatus: 'rejected',
                              })
                            }
                            disabled={
                              updateKycMutation.isPending || customer.kycStatus === 'rejected'
                            }
                          >
                            <XCircle className="mr-2 h-4 w-4 text-red-600" />
                            {t('admin.customers.rejectKyc', 'Reject KYC')}
                          </DropdownMenuItem> */}

                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              handleConfirm({
                                title: t('admin.customers.deleteTitle', 'Delete Customer'),
                                description: t(
                                  'adminPanel.admin.customers.deleteConfirm',
                                  'Are you sure you want to delete this customer? This action cannot be undone and will permanently deactivate their account.',
                                ),
                                confirmText: t('common.delete', 'Delete'),
                                variant: 'destructive',
                                onConfirm: () => {
                                  deleteCustomerMutation.mutate(customer.id);
                                }
                              });
                            }}
                            disabled={deleteCustomerMutation.isPending}
                            data-testid={`button-delete-customer-${customer.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('adminPanel.admin.customers.deleteCustomer', 'Delete Customer')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 md:flex-row">
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div>
                {t('common.showing', 'Showing')} {(currentPage - 1) * itemsPerPage + 1}{' '}
                {t('common.to', 'to')} {Math.min(currentPage * itemsPerPage, totalItems)}{' '}
                {t('common.of', 'of')} {totalItems} {currentRolePluralLabel.toLowerCase()}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  {t('common.perPage', 'Per Page')}
                </span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px] border-slate-300 bg-white text-slate-950">
                    <SelectValue placeholder="Limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {(() => {
                  const delta = 1;
                  const range = [];
                  for (
                    let i = Math.max(2, currentPage - delta);
                    i <= Math.min(totalPages - 1, currentPage + delta);
                    i++
                  ) {
                    range.push(i);
                  }

                  if (currentPage - delta > 2) {
                    range.unshift('...');
                  }
                  if (currentPage + delta < totalPages - 1) {
                    range.push('...');
                  }

                  range.unshift(1);
                  if (totalPages > 1) {
                    range.push(totalPages);
                  }

                  return range.map((page, index) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={`page-${page}`}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page as number)}
                        className="w-8"
                      >
                        {page}
                      </Button>
                    );
                  });
                })()}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
        </>
      )}

      {/* Create Customer Dialog */}
      <Dialog open={false} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[92vh] !w-[96vw] !max-w-7xl grid-rows-[auto,minmax(0,1fr),auto] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <DialogTitle>
              {`Create New ${createRoleLabel}`}
            </DialogTitle>
            <DialogDescription>
              {`Add a new ${createRoleLabel.toLowerCase()} to the system`}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-3 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <label className="text-sm font-medium">{t('common.email', 'Email')}</label>
                <Input
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  data-testid="input-create-customer-email"
                />
              </div>

              <div>
                <label className="text-sm font-medium">{t('common.name', 'Name')}</label>
                <Input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="John Doe"
                  data-testid="input-create-customer-name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Account Status</label>
              <Select
                value={newCustomerAccountMode}
                onValueChange={(value) => setNewCustomerAccountMode(value as CustomerAccountMode)}
              >
                <SelectTrigger data-testid="select-create-customer-account-mode">
                  <SelectValue placeholder="Select account status" />
                </SelectTrigger>
                <SelectContent>
                  {getAccountModeOptions(newCustomerRole).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {isRateAccount(newCustomerRole)
                  ? 'Reseller and Agent accounts can be Live or Sandbox.'
                  : 'User accounts can be Live or Demo.'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Account Password</label>
              <Input
                type="password"
                value={newCustomerPassword}
                onChange={(e) => setNewCustomerPassword(e.target.value)}
                placeholder="Set initial password"
                autoComplete="new-password"
                data-testid="input-create-customer-password"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Optional. Leave blank to let the account use OTP/password setup later. Minimum 8 characters.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Account Type</label>
                <Select
                  value={newCustomerRole}
                  onValueChange={(value) => {
                    const nextRole = value as CustomerRole;
                    setNewCustomerRole(nextRole);
                    if (nextRole === 'customer') setNewCustomerRateTableId('');
                  }}
                  disabled={lockCreateRole}
                >
                  <SelectTrigger data-testid="select-create-customer-role">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {lockCreateRole && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    This page creates {createRoleLabel.toLowerCase()} accounts.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">KYC Verification Required</label>
                <Select
                  value={newCustomerKycRequired ? 'yes' : 'no'}
                  onValueChange={(value) => setNewCustomerKycRequired(value === 'yes')}
                >
                  <SelectTrigger data-testid="select-create-customer-kyc-required">
                    <SelectValue placeholder="Select KYC requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isRateAccount(newCustomerRole) && (
                <div>
                  <label className="text-sm font-medium">Rate Table</label>
                  <Select
                    value={newCustomerRateTableId}
                    onValueChange={setNewCustomerRateTableId}
                    disabled={rateTables.length === 0}
                  >
                    <SelectTrigger data-testid="select-create-customer-rate">
                      <SelectValue placeholder="Choose rate table" />
                    </SelectTrigger>
                    <SelectContent>
                      {rateTables.map((rate) => (
                        <SelectItem key={rate.id} value={rate.id}>
                          {rate.name} ({Number(rate.defaultMarginPercent || 0).toFixed(2)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rateTables.length === 0 && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      No rate table yet. You can create this account now and assign rates later.
                    </p>
                  )}
                </div>
            )}

            {assignableModules.length > 0 && (
                <div className="space-y-3">
                  <ModuleAccessPanel
                    title={`Web UI Modules for ${createRoleLabel}`}
                    description="Select the modules this account can see and use on the web portal."
                    role={newCustomerRole}
                    modules={assignableModules}
                    values={newCustomerModules}
                    onValuesChange={setNewCustomerModules}
                    selectionMode
                  />
                  <ModuleAccessPanel
                    title={`Mobile App Modules for ${createRoleLabel}`}
                    description="Select the modules this account can see and use inside the mobile app."
                    role={newCustomerRole}
                    modules={assignableModules}
                    values={newCustomerMobileModules}
                    onValuesChange={setNewCustomerMobileModules}
                    selectionMode
                  />
                </div>
            )}

          </div>
          <DialogFooter className="border-t border-slate-200 bg-card px-5 py-3 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() =>
                createCustomerMutation.mutate({
                  email: newCustomerEmail,
                  name: newCustomerName,
                  password: newCustomerPassword,
                  role: newCustomerRole,
                  accountMode: newCustomerAccountMode,
                  rateTableId: newCustomerRateTableId || undefined,
                  kycVerificationRequired: newCustomerKycRequired,
                  modules: newCustomerModules,
                  mobileModules: newCustomerMobileModules,
                })
              }
              disabled={
                !newCustomerEmail ||
                (newCustomerPassword.trim().length > 0 && newCustomerPassword.trim().length < 8) ||
                createCustomerMutation.isPending
              }
              className="min-w-40 bg-sky-600 text-white hover:bg-sky-700 disabled:bg-sky-600/45"
              data-testid="button-submit-create-customer"
            >
              {createCustomerMutation.isPending
                ? t('adminPanel.admin.customers.creating', 'Creating...')
                : `Create ${createRoleLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Review Dialog */}
      <Dialog
        open={!!kycReviewCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setKycReviewCustomer(null);
            setKycRejectReason('');
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Review</DialogTitle>
            <DialogDescription>
              {kycReviewCurrentCustomer?.email || 'Review customer verification status'}
            </DialogDescription>
          </DialogHeader>

          {isKycReviewLoading ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading KYC details...
            </div>
          ) : kycReviewCurrentCustomer ? (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-lg border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer</p>
                  <p className="font-medium text-slate-950 dark:text-white">
                    {kycReviewCurrentCustomer.name || kycReviewCurrentCustomer.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
                  <Badge
                    className={`${kycStatusStyles[kycReviewCurrentCustomer.kycStatus] || ''} capitalize`}
                    variant="outline"
                  >
                    {formatDisplayValue(kycReviewCurrentCustomer.kycStatus)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    KYC Required
                  </p>
                  <Select
                    value={kycReviewCurrentCustomer.kycVerificationRequired === false ? 'no' : 'yes'}
                    onValueChange={(value) =>
                      customerKycRequiredMutation.mutate({
                        customerId: kycReviewCurrentCustomer.id,
                        required: value === 'yes',
                      })
                    }
                    disabled={customerKycRequiredMutation.isPending}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Select KYC requirement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-950 dark:text-white">Submitted Documents</h4>
                  <Badge variant="outline">{kycReviewDocuments.length} files</Badge>
                </div>

                {kycReviewDocuments.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    No KYC documents were uploaded. Admin can still accept this customer without a document.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kycReviewDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="flex flex-col gap-3 rounded-lg border p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium capitalize text-slate-950 dark:text-white">
                            {document.documentType.replace(/_/g, ' ')}
                          </p>
                          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                            {document.fileName} - {new Date(document.createdAt).toLocaleString()}
                          </p>
                          {document.rejectionReason && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                              {document.rejectionReason}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {formatDisplayValue(document.status)}
                          </Badge>
                          <Button asChild size="sm" variant="outline">
                            <a href={getKycDocumentUrl(document.filePath)} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <label className="text-sm font-medium">Rejection Reason</label>
                <Textarea
                  value={kycRejectReason}
                  onChange={(event) => setKycRejectReason(event.target.value)}
                  placeholder="Explain why KYC was rejected"
                  className="mt-2 min-h-[90px]"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="destructive"
                  disabled={
                    rejectCustomerKycMutation.isPending ||
                    !kycRejectReason.trim()
                  }
                  onClick={() =>
                    rejectCustomerKycMutation.mutate({
                      customerId: kycReviewCurrentCustomer.id,
                      reason: kycRejectReason,
                    })
                  }
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {rejectCustomerKycMutation.isPending ? 'Rejecting...' : 'Reject KYC'}
                </Button>
                <Button
                  disabled={approveCustomerKycMutation.isPending}
                  onClick={() =>
                    handleConfirm({
                      title: kycReviewDocuments.length === 0 ? 'Accept Without KYC Document' : 'Approve KYC',
                      description:
                        kycReviewDocuments.length === 0
                          ? 'This will mark the customer as KYC Approved even though no document was uploaded.'
                          : 'This will mark the customer KYC as Approved.',
                      confirmText: 'Approve',
                      variant: 'default',
                      onConfirm: () => approveCustomerKycMutation.mutate(kycReviewCurrentCustomer.id),
                    })
                  }
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {approveCustomerKycMutation.isPending
                    ? 'Approving...'
                    : kycReviewDocuments.length === 0
                      ? 'Accept Without KYC'
                      : 'Approve KYC'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Customer Admin Action Dialog */}
      <Dialog open={!!customerAction.type} onOpenChange={(open) => !open && closeCustomerAction()}>
        <DialogContent
          className={cn(
            'sm:max-w-lg',
            customerAction.type === 'modules' &&
              'h-[92vh] !w-[96vw] !max-w-7xl grid-rows-[auto,minmax(0,1fr)] gap-0 overflow-hidden p-0',
          )}
        >
          <DialogHeader
            className={cn(
              customerAction.type === 'modules' &&
                'border-b border-slate-200 px-5 py-4 pr-12 dark:border-slate-800',
            )}
          >
            <DialogTitle>
              {customerAction.type === 'balance' && 'Add Balance'}
              {customerAction.type === 'password' && 'Change Password'}
              {customerAction.type === 'email' && 'Change Email Address'}
              {customerAction.type === 'package' && 'Apply Package'}
              {customerAction.type === 'voucherLimit' && 'Set Voucher Limit'}
              {customerAction.type === 'modules' && 'Set Modules'}
              {customerAction.type === 'security' && 'Security'}
            </DialogTitle>
            <DialogDescription>
              {customerAction.customer?.email}
            </DialogDescription>
          </DialogHeader>

          {customerAction.customer && customerAction.type === 'balance' && (
            <div className="space-y-4">
              <div className="rounded-md border bg-slate-50 p-3 text-sm dark:bg-slate-900">
                Current wallet balance:{' '}
                <span className="font-semibold">
                  {formatMoney(customerAction.customer.walletBalance || '0.00')}
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={balanceAmount}
                  onChange={(event) => setBalanceAmount(event.target.value)}
                  placeholder="25.00"
                  data-testid="input-add-balance-amount"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Note</label>
                <Input
                  value={balanceDescription}
                  onChange={(event) => setBalanceDescription(event.target.value)}
                  placeholder="Support credit"
                  data-testid="input-add-balance-note"
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  addBalanceMutation.mutate({
                    customerId: customerAction.customer!.id,
                    amount: Number(balanceAmount),
                    description: balanceDescription || undefined,
                  })
                }
                disabled={Number(balanceAmount) <= 0 || addBalanceMutation.isPending}
                data-testid="button-submit-add-balance"
              >
                {addBalanceMutation.isPending ? 'Adding...' : 'Add Balance'}
              </Button>
            </div>
          )}

          {customerAction.customer && customerAction.type === 'password' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  data-testid="input-change-customer-password"
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  changePasswordMutation.mutate({
                    customerId: customerAction.customer!.id,
                    password: newPassword,
                  })
                }
                disabled={newPassword.length < 8 || changePasswordMutation.isPending}
                data-testid="button-submit-change-password"
              >
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          )}

          {customerAction.customer && customerAction.type === 'email' && (
            <div className="space-y-4">
              <div className="rounded-md border bg-slate-50 p-3 text-sm dark:bg-slate-900">
                Current email:{' '}
                <span className="font-semibold">{customerAction.customer.email}</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Email Address</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="customer@example.com"
                  data-testid="input-change-customer-email"
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  changeEmailMutation.mutate({
                    customerId: customerAction.customer!.id,
                    email: newEmail,
                  })
                }
                disabled={
                  changeEmailMutation.isPending ||
                  !newEmail.trim() ||
                  !newEmail.includes('@') ||
                  newEmail.trim().toLowerCase() === customerAction.customer.email.toLowerCase()
                }
                data-testid="button-submit-change-email"
              >
                {changeEmailMutation.isPending ? 'Changing...' : 'Change Email'}
              </Button>
            </div>
          )}

          {customerAction.customer && customerAction.type === 'voucherLimit' && (
            <div className="space-y-4">
              <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <span>Current active voucher exposure</span>
                  <span className="font-semibold">{formatMoney(voucherLimitData?.used || '0.00')}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Remaining limit</span>
                  <span className="font-semibold">
                    {voucherLimitData?.unlimited
                      ? 'Unlimited'
                      : formatMoney(voucherLimitData?.remaining || '0.00')}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Use 0 for unlimited. The limit applies to active wallet vouchers generated by this Agent or Reseller.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Maximum Voucher Limit</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={voucherLimitAmount}
                  onChange={(event) => setVoucherLimitAmount(event.target.value)}
                  placeholder="0.00"
                  data-testid="input-voucher-limit"
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  saveVoucherLimitMutation.mutate({
                    customerId: customerAction.customer!.id,
                    limit: Number(voucherLimitAmount || 0),
                  })
                }
                disabled={
                  Number(voucherLimitAmount || 0) < 0 ||
                  saveVoucherLimitMutation.isPending ||
                  !Number.isFinite(Number(voucherLimitAmount || 0))
                }
                data-testid="button-submit-voucher-limit"
              >
                {saveVoucherLimitMutation.isPending ? 'Saving...' : 'Save Voucher Limit'}
              </Button>
            </div>
          )}

          {customerAction.customer && customerAction.type === 'modules' && (
            <div className="min-h-0">
              {(() => {
                const role = getCustomerRole(customerAction.customer.role);
                const modules = getAssignableModules(role);
                return (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950">
                      <div className="border-b border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/45">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-300/10 dark:text-cyan-300 dark:ring-cyan-300/20">
                              <SlidersHorizontal className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                Modules for {getCustomerRoleLabel(role)}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Control Web UI access separately from Mobile App access.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <ScrollArea className="min-h-0 flex-1">
                        <div className="space-y-3 p-3">
                          <ModuleAccessPanel
                            title="Web UI Access"
                            description="Controls what this account can see and use in the browser portal."
                            role={role}
                            modules={modules}
                            values={customerModuleDraft}
                            onValuesChange={setCustomerModuleDraft}
                          />
                          <ModuleAccessPanel
                            title="Mobile App Access"
                            description="Controls what this account can see and use in the mobile app."
                            role={role}
                            modules={modules}
                            values={customerMobileModuleDraft}
                            onValuesChange={setCustomerMobileModuleDraft}
                          />
                        </div>
                      </ScrollArea>

                      <DialogFooter className="border-t border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/45 sm:justify-between">
                        <Button type="button" variant="outline" size="sm" onClick={closeCustomerAction}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-cyan-600 px-5 text-white hover:bg-cyan-700"
                          onClick={() =>
                            saveCustomerModulesMutation.mutate({
                              customerId: customerAction.customer!.id,
                              modules: customerModuleDraft,
                              mobileModules: customerMobileModuleDraft,
                            })
                          }
                          disabled={isCustomerModulesLoading || saveCustomerModulesMutation.isPending || modules.length === 0}
                          data-testid="button-submit-customer-modules"
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          {saveCustomerModulesMutation.isPending ? 'Saving...' : 'Save Modules'}
                        </Button>
                      </DialogFooter>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {customerAction.customer && customerAction.type === 'security' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" />
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">Login Security Control</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      These settings apply directly to this Account when they log in.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">2FA Security</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Require a second verification step during login.
                    </p>
                  </div>
                  <Switch
                    checked={customerSecurityDraft.twoFactorEnabled}
                    onCheckedChange={(checked) =>
                      setCustomerSecurityDraft((current) => ({ ...current, twoFactorEnabled: checked }))
                    }
                    disabled={isCustomerSecurityLoading}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">Email OTP</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Allow OTP codes by email.
                      </p>
                    </div>
                    <Switch
                      checked={customerSecurityDraft.otpEmailEnabled}
                      onCheckedChange={(checked) =>
                        setCustomerSecurityDraft((current) => ({ ...current, otpEmailEnabled: checked }))
                      }
                      disabled={isCustomerSecurityLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">Phone OTP</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Allow OTP codes by phone when SMS is available.
                      </p>
                    </div>
                    <Switch
                      checked={customerSecurityDraft.otpPhoneEnabled}
                      onCheckedChange={(checked) =>
                        setCustomerSecurityDraft((current) => ({ ...current, otpPhoneEnabled: checked }))
                      }
                      disabled={isCustomerSecurityLoading}
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  Authenticator App:{' '}
                  <span className="font-semibold">
                    {customerSecurityDraft.authenticatorConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCustomerAction}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    saveCustomerSecurityMutation.mutate({
                      customerId: customerAction.customer!.id,
                      settings: {
                        twoFactorEnabled: customerSecurityDraft.twoFactorEnabled,
                        otpEmailEnabled: customerSecurityDraft.otpEmailEnabled,
                        otpPhoneEnabled: customerSecurityDraft.otpPhoneEnabled,
                      },
                    })
                  }
                  disabled={isCustomerSecurityLoading || saveCustomerSecurityMutation.isPending}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {saveCustomerSecurityMutation.isPending ? 'Saving...' : 'Save Security'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {customerAction.customer && customerAction.type === 'package' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Package</label>
                <Input
                  value={packageSearch}
                  onChange={(event) => setPackageSearch(event.target.value)}
                  placeholder="Search country, region, provider, or package"
                  data-testid="input-apply-package-search"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Package</label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger data-testid="select-apply-package">
                    <SelectValue
                      placeholder={isPackagesLoading ? 'Loading Packages...' : 'Select a package'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {packageOptions.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.destinationName || pkg.regionName || 'Global'} - {pkg.dataAmount} -{' '}
                        {pkg.validity} days - {formatMoney(pkg.price || 0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPackage && (
                <div className="rounded-md border bg-slate-50 p-3 text-sm dark:bg-slate-900">
                  <p className="font-medium">{selectedPackage.title}</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {selectedPackage.providerName || 'Provider'} -{' '}
                    {selectedPackage.destinationName || selectedPackage.regionName || 'Global'}
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() =>
                  applyPackageMutation.mutate({
                    customerId: customerAction.customer!.id,
                    packageId: selectedPackageId,
                  })
                }
                disabled={!selectedPackageId || applyPackageMutation.isPending}
                data-testid="button-submit-apply-package"
              >
                {applyPackageMutation.isPending ? 'Applying...' : 'Apply Package'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={!isDedicatedDetailsPage && !!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto" data-testid="dialog-customer-details">
          <DialogHeader>
            <DialogTitle>{t('adminPanel.admin.customers.customerDetails', 'Customer Details')}</DialogTitle>
            <DialogDescription>
              {t('adminPanel.admin.customers.completeInformation', 'Complete information about this customer')}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-5">
              <div className="rounded-lg border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-900 text-2xl font-semibold text-white dark:bg-white dark:text-slate-950">
                      {selectedCustomer.name?.charAt(0).toUpperCase() ||
                        selectedCustomer.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div>
                        <h3 className="truncate text-xl font-semibold text-slate-950 dark:text-white">
                          {selectedCustomer.name || t('admin.customers.customer', 'Customer')}
                        </h3>
                        <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Mail className="h-4 w-4 shrink-0" />
                          <span className="truncate">{selectedCustomer.email}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={selectedCustomerStatusStyle} variant="outline">
                          {selectedCustomerStatus}
                        </Badge>
                        <Badge
                          className={`${kycStatusStyles[selectedCustomer.kycStatus]} capitalize`}
                          variant="outline"
                        >
                          KYC {formatDisplayValue(selectedCustomer.kycStatus)}
                        </Badge>
                        <Badge
                          className={`${userRoleStyles[getCustomerRole(selectedCustomer.role)]} capitalize`}
                          variant="outline"
                        >
                          {getCustomerRoleLabel(selectedCustomer.role)}
                        </Badge>
                        <Badge variant="outline" className="font-mono">
                          {formatDisplayUserId(selectedCustomer.displayUserId)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-[260px] grid-cols-2 gap-3">
                    <div className="rounded-md border bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <DollarSign className="h-4 w-4" />
                        Balance
                      </div>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                        {formatMoney(selectedCustomer.walletBalance || '0.00')}
                      </p>
                    </div>
                    <div className="rounded-md border bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <Package className="h-4 w-4" />
                        eSIMs
                      </div>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                        {selectedCustomerOrders.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-7">
                <Button variant="outline" onClick={() => openCustomerAction('balance', selectedCustomer)}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Add Balance
                </Button>
                <Button variant="outline" onClick={() => openCustomerAction('password', selectedCustomer)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Password
                </Button>
                <Button variant="outline" onClick={() => openCustomerAction('email', selectedCustomer)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openCustomerAction('package', selectedCustomer)}
                  disabled={selectedCustomer.isBlocked || selectedCustomer.isDeleted}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Package
                </Button>
                <Button variant="outline" onClick={() => openKycReview(selectedCustomer)}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  KYC
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={customerRoleMutation.isPending}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Role: {getCustomerRoleLabel(selectedCustomer.role)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {userRoleOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        disabled={getCustomerRole(selectedCustomer.role) === option.value}
                        onClick={() => confirmRoleChange(selectedCustomer, option.value)}
                      >
                        Set as {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" onClick={() => handleCustomerDetailsTabChange('modules')}>
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Modules
                </Button>
                                    <Button
                                      variant={
                                        selectedCustomer.isBlocked || selectedCustomer.isDeleted
                                          ? 'outline'
                                          : 'destructive'
                                      }
                                      onClick={() => {
                                        const nextStatus =
                                          selectedCustomer.isBlocked || selectedCustomer.isDeleted ? 'active' : 'inactive';
                    handleConfirm({
                      title: nextStatus === 'active' ? 'Activate Customer' : 'Deactivate Customer',
                      description:
                        nextStatus === 'active'
                          ? 'Are you sure you want to activate this customer?'
                          : 'Are you sure you want to deactivate this customer?',
                      confirmText: nextStatus === 'active' ? 'Activate' : 'Deactivate',
                      variant: nextStatus === 'active' ? 'default' : 'destructive',
                      onConfirm: () =>
                        customerStatusMutation.mutate({
                          customerId: selectedCustomer.id,
                          status: nextStatus,
                        }),
                    });
                                      }}
                                      disabled={customerStatusMutation.isPending}
                                    >
                                      {selectedCustomer.isBlocked || selectedCustomer.isDeleted ? (
                                        <Power className="mr-2 h-4 w-4" />
                                      ) : (
                                        <Ban className="mr-2 h-4 w-4" />
                                      )}
                                      {selectedCustomer.isBlocked || selectedCustomer.isDeleted ? 'Activate' : 'Deactivate'}
                                    </Button>
              </div>

              {isRateAccount(selectedCustomer.role) && (
                <div className="rounded-lg border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                        Assigned Rate
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Package prices are copied from the selected rate table to this account.
                      </p>
                    </div>
                    {(selectedCustomerRateTable?.name || currentRateAssignment?.rateTableId) && (
                      <Badge variant="outline">
                        {selectedCustomerRateTable?.name || currentRateAssignment?.rateTableId}
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                      <label htmlFor="admin-customer-rate-table" className="text-sm font-medium">
                        Rate Table
                      </label>
                      <Select
                        value={selectedCustomerRateTableId}
                        onValueChange={setSelectedCustomerRateTableId}
                        disabled={rateTables.length === 0}
                      >
                        <SelectTrigger id="admin-customer-rate-table" className="mt-2">
                          <SelectValue placeholder="Choose rate table" />
                        </SelectTrigger>
                        <SelectContent>
                          {rateTables.map((rate) => (
                            <SelectItem key={rate.id} value={rate.id}>
                              {rate.name} ({Number(rate.defaultMarginPercent || 0).toFixed(2)}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {rateTables.length === 0 && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Create a rate table first from Admin Rates.
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={() =>
                        customerRateMutation.mutate({
                          customerId: selectedCustomer.id,
                          rateTableId: selectedCustomerRateTableId,
                        })
                      }
                      disabled={!selectedCustomerRateTableId || customerRateMutation.isPending}
                    >
                      {customerRateMutation.isPending ? 'Applying...' : 'Apply Rate'}
                    </Button>
                  </div>
                </div>
              )}

              {selectedCustomer.role === 'reseller' && (
                <>
                  <div className="rounded-lg border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                          WhiteLabel Storefront
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Account Type: WhiteLabel
                        </p>
                      </div>
                      {selectedCustomer.resellerSubdomain && (
                        <Badge variant="outline" className="font-mono">
                          {selectedCustomer.resellerSubdomain}
                        </Badge>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                      <div>
                        <label htmlFor="admin-reseller-store-name" className="text-sm font-medium">
                          Store Name
                        </label>
                        <Input
                          id="admin-reseller-store-name"
                          value={resellerStoreName}
                          onChange={(event) => setResellerStoreName(event.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <label htmlFor="admin-reseller-subdomain" className="text-sm font-medium">
                          Subdomain
                        </label>
                        <Input
                          id="admin-reseller-subdomain"
                          value={resellerSubdomain}
                          onChange={(event) => setResellerSubdomain(event.target.value.toLowerCase())}
                          placeholder="reseller-store"
                          className="mt-2 font-mono"
                        />
                      </div>
                      <Button
                        onClick={() =>
                          resellerStorefrontMutation.mutate({
                            customerId: selectedCustomer.id,
                            storeName: resellerStoreName,
                            subdomain: resellerSubdomain,
                          })
                        }
                        disabled={resellerStorefrontMutation.isPending}
                      >
                        {resellerStorefrontMutation.isPending ? 'Saving...' : 'Save Storefront'}
                      </Button>
                    </div>
                    <div className="mt-4 rounded-md border bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-950 dark:text-white">
                            Customer Store Link
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Share this link with the Reseller's retail Customers.
                          </p>
                        </div>
                        {selectedCustomer.resellerStoreActive ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" variant="outline">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" variant="outline">
                            Save to activate
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          readOnly
                          value={resellerStoreUrl || 'Enter a subdomain and save storefront'}
                          className="font-mono text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!resellerStoreUrl}
                            onClick={async () => {
                              await navigator.clipboard.writeText(resellerStoreUrl);
                              toast({
                                title: 'Store link copied',
                                description: resellerStoreUrl,
                              });
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!resellerStoreUrl}
                            onClick={() => window.open(resellerStoreUrl, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                          <Server className="h-4 w-4 text-primary" />
                          Provider Access
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Reseller cost is the Admin price assigned to this Account.
                        </p>
                      </div>
                      <Badge variant="outline">{resellerProviders.length} providers</Badge>
                    </div>

                    <div className="mb-4 rounded-md border bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                        <div>
                          <label htmlFor="admin-reseller-retail-markup" className="text-sm font-medium">
                            Bulk Reseller Retail Margin %
                          </label>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Sets this Reseller's selling price from Reseller cost for all enabled Packages in allowed providers.
                          </p>
                          <Input
                            id="admin-reseller-retail-markup"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Example: 20"
                            value={resellerRetailMarkup}
                            onChange={(event) => setResellerRetailMarkup(event.target.value)}
                            className="mt-2 max-w-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() =>
                            resellerRetailMarkupMutation.mutate({
                              customerId: selectedCustomer.id,
                              markupPercent: resellerRetailMarkup,
                            })
                          }
                          disabled={
                            resellerRetailMarkupMutation.isPending ||
                            resellerRetailMarkup.trim() === '' ||
                            Number(resellerRetailMarkup) < 0
                          }
                        >
                          {resellerRetailMarkupMutation.isPending ? 'Applying...' : 'Apply Selling Margin'}
                        </Button>
                      </div>
                    </div>

                    {isResellerProvidersLoading ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {[1, 2, 3, 4].map((item) => (
                          <div
                            key={item}
                            className="h-32 animate-pulse rounded-md border bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
                          />
                        ))}
                      </div>
                    ) : resellerProviders.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        No enabled providers are available.
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {resellerProviders.map((provider) => (
                          <div
                            key={provider.providerId}
                            className={cn(
                              'rounded-md border p-3 transition-colors dark:border-slate-800',
                              provider.isEnabled
                                ? 'bg-white dark:bg-slate-950'
                                : 'bg-slate-50 opacity-75 dark:bg-slate-900',
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-950 dark:text-white">
                                  {provider.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {provider.activePackages} / {provider.totalPackages} active Packages
                                </p>
                              </div>
                              <Switch
                                checked={provider.isEnabled}
                                onCheckedChange={(checked) =>
                                  resellerProviderMutation.mutate({
                                    customerId: selectedCustomer.id,
                                    providerId: provider.providerId,
                                    isEnabled: checked,
                                  })
                                }
                                disabled={resellerProviderMutation.isPending || !provider.platformEnabled}
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                              <span className="text-slate-500 dark:text-slate-400">Reseller cost from</span>
                              <span className="font-semibold text-slate-950 dark:text-white">
                                {provider.resellerPriceFrom ? formatMoney(provider.resellerPriceFrom) : 'N/A'}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <Badge variant={provider.isEnabled ? 'default' : 'secondary'}>
                                {provider.isEnabled ? 'Enabled' : 'Off'}
                              </Badge>
                              {provider.customPrices > 0 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {provider.customPrices} custom prices
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Tabs */}
              <Tabs
                value={customerDetailsTab}
                onValueChange={handleCustomerDetailsTabChange}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="details" data-testid="tab-customer-details">
                    {t('adminPanel.admin.customers.details', 'Details')}
                  </TabsTrigger>
                  <TabsTrigger value="orders" data-testid="tab-customer-orders">
                    {t('adminPanel.admin.customers.orders', 'Orders')} ({selectedCustomerOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="wallet" data-testid="tab-customer-wallet">
                    Wallet ({selectedCustomerWalletTransactions.length})
                  </TabsTrigger>
                  <TabsTrigger value="modules" data-testid="tab-customer-modules">
                    Modules
                  </TabsTrigger>
                  <TabsTrigger value="activity" data-testid="tab-customer-activity">
                    {t('adminPanel.admin.customers.activity', 'Activity')}
                  </TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-semibold text-slate-950 dark:text-white">Profile</h4>
                        <Badge className={selectedCustomerStatusStyle} variant="outline">
                          {selectedCustomerStatus}
                        </Badge>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            {t('adminPanel.admin.customers.customerId', 'Customer ID')}
                          </p>
                          <p className="font-mono text-sm">
                            {formatDisplayUserId(selectedCustomer.displayUserId)}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            {t('adminPanel.admin.customers.kycStatus', 'KYC Status')}
                          </p>
                          <Badge
                            className={`${kycStatusStyles[selectedCustomer.kycStatus]} capitalize`}
                            variant="outline"
                          >
                            {formatDisplayValue(selectedCustomer.kycStatus)}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            KYC Verification Required
                          </p>
                          <Select
                            value={selectedCustomer.kycVerificationRequired === false ? 'no' : 'yes'}
                            onValueChange={(value) =>
                              customerKycRequiredMutation.mutate({
                                customerId: selectedCustomer.id,
                                required: value === 'yes',
                              })
                            }
                            disabled={customerKycRequiredMutation.isPending}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select KYC requirement" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Account Role
                          </p>
                          <Badge
                            className={`${userRoleStyles[getCustomerRole(selectedCustomer.role)]} capitalize`}
                            variant="outline"
                          >
                            {getCustomerRoleLabel(selectedCustomer.role)}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            {t('common.email', 'Email')}
                          </p>
                          <p className="flex min-w-0 items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                            <span className="truncate">{selectedCustomer.email}</span>
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            {t('adminPanel.admin.customers.phoneNumber', 'Phone Number')}
                          </p>
                          <p className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-slate-500" />
                            {selectedCustomer.phone || t('adminPanel.admin.customers.notProvided', 'Not provided')}
                          </p>
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            {t('adminPanel.admin.customers.address', 'Address')}
                          </p>
                          <p className="flex items-start gap-2 text-sm">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                            <span>
                              {selectedCustomer.address ||
                                t('adminPanel.admin.customers.notProvided', 'Not provided')}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                      <h4 className="mb-4 font-semibold text-slate-950 dark:text-white">Account</h4>
                      <div className="space-y-4">
                        <div className="rounded-md border bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                            <DollarSign className="h-4 w-4" />
                            Available Balance
                          </div>
                          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                            {formatMoney(selectedCustomer.walletBalance || '0.00')}
                          </p>
                        </div>

                        <div className="rounded-md border bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                            <Megaphone className="h-4 w-4" />
                            Sender ID Limit
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={senderIdLimitDraft}
                              onChange={(event) => setSenderIdLimitDraft(event.target.value)}
                              placeholder={senderIdLimitStatus ? `Default ${senderIdLimitStatus.defaultLimit}` : 'Use default'}
                              className="h-9"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={saveSenderIdLimitMutation.isPending || isSenderIdLimitLoading}
                              onClick={() =>
                                saveSenderIdLimitMutation.mutate({
                                  customerId: selectedCustomer.id,
                                  limit: senderIdLimitDraft,
                                })
                              }
                            >
                              <Save className="mr-2 h-4 w-4" />
                              Save
                            </Button>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {senderIdLimitUsage}. {senderIdLimitNote}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              {t('adminPanel.admin.customers.joinedDate', 'Joined Date')}
                            </p>
                            <p className="flex items-center gap-2 text-sm">
                              <CalendarDays className="h-4 w-4 text-slate-500" />
                              {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              {t('adminPanel.admin.customers.lastUpdated', 'Last Updated')}
                            </p>
                            <p className="flex items-center gap-2 text-sm">
                              <CalendarDays className="h-4 w-4 text-slate-500" />
                              {new Date(selectedCustomer.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* eSIM Statistics */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Total eSIMs
                        </p>
                      </div>
                      <p className="text-2xl font-bold">
                        {selectedCustomerOrders.length}
                      </p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Active eSIMs
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {activeEsimsCount}
                      </p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Failed
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                        {failedEsimsCount}
                      </p>
                    </Card>
                  </div>
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders">
                  <ScrollArea className="h-[400px] pr-4">
                    {selectedCustomerOrders.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCustomerOrders.map((order) => (
                            <Card
                              key={order.id}
                              className="p-4"
                              data-testid={`card-customer-order-${order.id}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      <Package className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-900 dark:text-white">
                                        {order.package?.destination?.name || order.package?.title || 'Global'}
                                      </p>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">
                                        {order.dataAmount} - {order.validity} days
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                      <span className="text-slate-600 dark:text-slate-400">
                                        Order ID:
                                      </span>
                                      <p className="font-mono">
                                        {formatDisplayOrderId(order.displayOrderId)}
                                      </p>
                                    </div>

                                    <div>
                                      <span className="text-slate-600 dark:text-slate-400">
                                        Price:
                                      </span>
                                      <p className="font-semibold">${order.price}</p>
                                    </div>

                                    <div>
                                      <span className="text-slate-600 dark:text-slate-400">
                                        Date:
                                      </span>
                                      <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                  </div>

                                  {order.iccid && (
                                    <div className="mt-2 text-xs">
                                      <span className="text-slate-600 dark:text-slate-400">
                                        ICCID:
                                      </span>
                                      <p className="font-mono text-slate-900 dark:text-white">
                                        {order.iccid}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <Badge
                                  className={
                                    order.status === 'completed'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                      : order.status === 'processing'
                                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
                                        : order.status === 'failed'
                                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  }
                                  variant="outline"
                                >
                                  {formatDisplayValue(order.status)}
                                </Badge>
                              </div>
                            </Card>
                          ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Package className="h-12 w-12 text-slate-400 mb-3" />
                        <p className="font-medium text-slate-900 dark:text-white">No Orders Yet</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          This customer hasn't made any purchases
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Wallet Tab */}
                <TabsContent value="wallet">
                  <div className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-950 dark:text-white">Wallet Transactions</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Refund or reverse completed wallet credits and debits.
                        </p>
                      </div>
                      <Badge variant="outline">
                        Balance {formatMoney(walletTransactionsData?.balance || selectedCustomer.walletBalance || '0.00')}
                      </Badge>
                    </div>

                    <ScrollArea className="h-[420px] pr-4">
                      {isWalletTransactionsLoading ? (
                        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Loading wallet transactions...
                          </p>
                        </div>
                      ) : selectedCustomerWalletTransactions.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Transaction</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Balance</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedCustomerWalletTransactions.map((transaction) => {
                              const isDebit = isWalletTransactionDebit(transaction);
                              const refundableAmount = toMoneyNumber(transaction.refundableAmount);
                              return (
                                <TableRow key={transaction.id}>
                                  <TableCell className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                    {new Date(transaction.createdAt).toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium text-slate-950 dark:text-white">
                                        {transaction.description || transaction.type.replace(/_/g, ' ')}
                                      </p>
                                      <p className="font-mono text-xs text-slate-500">
                                        {transaction.id.slice(0, 8)}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className={isDebit ? 'font-semibold text-red-600' : 'font-semibold text-green-600'}>
                                    {isDebit ? '-' : '+'}
                                    {formatMoney(transaction.amount, transaction.currency)}
                                  </TableCell>
                                  <TableCell>{formatMoney(transaction.balanceAfter, transaction.currency)}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      <Badge variant={transaction.status === 'completed' ? 'default' : 'outline'}>
                                        {formatDisplayValue(transaction.status)}
                                      </Badge>
                                      {refundableAmount <= 0 && !transaction.type.includes('refund') && (
                                        <span className="text-xs text-slate-500">Fully refunded</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openWalletRefundDialog(transaction)}
                                      disabled={
                                        !canRefundWalletTransaction(transaction) ||
                                        refundWalletTransactionMutation.isPending
                                      }
                                    >
                                      <RefreshCcw className="mr-2 h-4 w-4" />
                                      Refund
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="flex h-64 flex-col items-center justify-center text-center">
                          <DollarSign className="mb-3 h-12 w-12 text-slate-400" />
                          <p className="font-medium text-slate-900 dark:text-white">No Wallet Activity</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Wallet top-ups, voucher activity, purchases, and refunds will appear here.
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>

                {/* Modules Tab */}
                <TabsContent value="modules">
                  <div className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-950 dark:text-white">Modules</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Control which services this user can see and use on web and mobile.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-cyan-600 text-white hover:bg-cyan-700"
                          disabled={isSelectedCustomerModulesLoading || saveCustomerModulesMutation.isPending}
                          onClick={() =>
                            saveCustomerModulesMutation.mutate({
                              customerId: selectedCustomer.id,
                              modules: customerModuleDraft,
                              mobileModules: customerMobileModuleDraft,
                            })
                          }
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          {saveCustomerModulesMutation.isPending ? 'Saving...' : 'Save Modules'}
                        </Button>
                      </div>
                    </div>

                    {isSelectedCustomerModulesLoading ? (
                      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-slate-500 dark:text-slate-400">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-500" />
                        Loading modules...
                      </div>
                    ) : (
                      (() => {
                        const role = getCustomerRole(selectedCustomer.role);
                        const modules = getAssignableModules(role);

                        return (
                          <div className="space-y-4">
                            <ModuleAccessPanel
                              title="Web UI Access"
                              description="Controls what this account can see and use in the browser portal."
                              role={role}
                              modules={modules}
                              values={customerModuleDraft}
                              onValuesChange={setCustomerModuleDraft}
                            />
                            <ModuleAccessPanel
                              title="Mobile App Access"
                              description="Controls what this account can see and use in the mobile app."
                              role={role}
                              modules={modules}
                              values={customerMobileModuleDraft}
                              onValuesChange={setCustomerMobileModuleDraft}
                            />
                          </div>
                        );
                      })()
                    )}
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      <div className="flex gap-3" data-testid="activity-account-created">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
                          <UserCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Account Created</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {new Date(selectedCustomer.createdAt).toLocaleDateString()} at{' '}
                            {new Date(selectedCustomer.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3" data-testid="activity-kyc-status">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${isVerifiedKycStatus(selectedCustomer.kycStatus)
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : selectedCustomer.kycStatus === 'rejected'
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : 'bg-yellow-100 dark:bg-yellow-900/30'
                            }`}
                        >
                          <Activity
                            className={`h-4 w-4 ${isVerifiedKycStatus(selectedCustomer.kycStatus)
                              ? 'text-green-600 dark:text-green-400'
                              : selectedCustomer.kycStatus === 'rejected'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-yellow-600 dark:text-yellow-400'
                              }`}
                          />
                        </div>

                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            KYC Status: {formatDisplayValue(selectedCustomer.kycStatus)}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Current verification status
                          </p>
                        </div>
                      </div>

                      {selectedCustomerOrders.map((order) => (
                          <div
                            key={order.id}
                            className="flex gap-3"
                            data-testid={`activity-order-${order.id}`}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
                              <Package className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                            </div>

                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                Purchased eSIM for {order.package?.destination?.name || order.package?.title || 'Global'}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {new Date(order.createdAt).toLocaleDateString()} - ${order.price} -{' '}
                                {formatDisplayValue(order.status)}
                              </p>
                            </div>
                          </div>
                        ))}

                      {selectedCustomerOrders.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Activity className="h-12 w-12 text-slate-400 mb-3" />
                            <p className="font-medium text-slate-900 dark:text-white">
                              No Activity Yet
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Customer activity will appear here
                            </p>
                          </div>
                        )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!walletRefundTransaction}
        onOpenChange={(open) => {
          if (!open) closeWalletRefundDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Wallet Transaction</DialogTitle>
            <DialogDescription>
              Create a refund transaction and update the customer wallet balance.
            </DialogDescription>
          </DialogHeader>

          {walletRefundTransaction && (
            <div className="space-y-4">
              <div className="rounded-md border bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-400">Original transaction</span>
                  <span className="font-mono">{walletRefundTransaction.id.slice(0, 8)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-400">Action</span>
                  <Badge variant="outline">
                    {walletRefundTransaction.refundDirection === 'debit'
                      ? 'Debit wallet reversal'
                      : 'Credit wallet refund'}
                  </Badge>
                </div>
                <p className="mt-2 text-slate-700 dark:text-slate-300">
                  {walletRefundTransaction.description || walletRefundTransaction.type.replace(/_/g, ' ')}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="wallet-refund-amount" className="text-sm font-medium">
                  Refund Amount
                </label>
                <Input
                  id="wallet-refund-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={walletRefundAmount}
                  onChange={(event) => setWalletRefundAmount(event.target.value)}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Remaining refundable: {formatMoney(walletRefundTransaction.refundableAmount || '0.00')}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="wallet-refund-reason" className="text-sm font-medium">
                  Reason
                </label>
                <Input
                  id="wallet-refund-reason"
                  value={walletRefundReason}
                  onChange={(event) => setWalletRefundReason(event.target.value)}
                  placeholder="Customer requested refund"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="wallet-refund-notes" className="text-sm font-medium">
                  Notes
                </label>
                <Textarea
                  id="wallet-refund-notes"
                  value={walletRefundNotes}
                  onChange={(event) => setWalletRefundNotes(event.target.value)}
                  placeholder="Internal notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeWalletRefundDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => refundWalletTransactionMutation.mutate()}
              disabled={
                refundWalletTransactionMutation.isPending ||
                !walletRefundTransaction ||
                !walletRefundReason.trim() ||
                Number(walletRefundAmount) <= 0
              }
            >
              {refundWalletTransactionMutation.isPending ? 'Refunding...' : 'Issue Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="max-w-md border-0 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "p-2 rounded-full",
                confirmDialog.variant === 'destructive' ? "bg-red-100 dark:bg-red-900/30 text-red-600" :
                  confirmDialog.variant === 'warning' ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" :
                    "bg-teal-100 dark:bg-teal-900/30 text-teal-600"
              )}>
                {confirmDialog.variant === 'destructive' ? <ShieldAlert className="h-5 w-5" /> :
                  confirmDialog.variant === 'warning' ? <ShieldAlert className="h-5 w-5" /> :
                    <ShieldCheck className="h-5 w-5" />}
              </div>
              <AlertDialogTitle className="text-xl font-bold tracking-tight">
                {confirmDialog.title}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
              {confirmDialog.cancelText || t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "rounded-xl font-semibold shadow-lg transition-all duration-200 active:scale-95",
                confirmDialog.variant === 'destructive'
                  ? "bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 shadow-red-500/20"
                  : confirmDialog.variant === 'warning'
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/20"
                    : "bg-gradient-to-r from-teal-600 to-teal-600 hover:from-teal-700 hover:to-teal-700 shadow-teal-500/20"
              )}
              onClick={() => {
                confirmDialog.onConfirm();
              }}
            >
              {confirmDialog.confirmText || t('common.confirm', 'Confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
