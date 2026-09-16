import { Link, Redirect, Route, Switch, useLocation } from 'wouter';
import type React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  Activity,
  BellRing,
  ArrowRight,
  ClipboardList,
  DollarSign,
  Gift,
  Globe2,
  Headphones,
  Image,
  Languages,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Newspaper,
  Package,
  Puzzle,
  Phone,
  PhoneCall,
  ReceiptText,
  Settings,
  Code2,
  Coins,
  FileQuestion,
  FileText,
  Shield,
  Smartphone,
  Store,
  Ticket,
  TrendingUp,
  Tv,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { ResellerLayout, type ResellerNavItem } from '@/components/reseller/ResellerLayout';
import AccountDashboard from '@/pages/AccountDashboard';
import Profile from '@/pages/Profile';
import MyESIMs from '@/pages/MyESIMs';
import MyOrders from '@/pages/MyOrders';
import ResellerPriceCost from '@/pages/reseller/ResellerPriceCost';
import ResellerDashboard from '@/pages/reseller/ResellerDashboard';
import ResellerCurrencies from '@/pages/reseller/ResellerCurrencies';
import ResellerStorefrontSmtp from '@/pages/reseller/ResellerStorefrontSmtp';
import ResellerStorefrontSection from '@/pages/reseller/ResellerStorefrontSection';
import ResellerPaymentGateways from '@/pages/reseller/ResellerPaymentGateways';
import ResellerCustomers from '@/pages/reseller/ResellerCustomers';
import ApiDocs from '@/pages/admin/ApiDocs';
import FaqManagement from '@/pages/admin/FaqManagement';
import PagesManagement from '@/pages/admin/PagesManagement';
import BannerManagement from '@/pages/admin/BannerManagement';
import FailoverSettings from '@/pages/admin/FailoverSettings';
import AdminLanguages from '@/pages/admin/AdminLanguages';
import AdminTranslations from '@/pages/admin/AdminTranslations';
import Referrals from '@/pages/Referrals';
import AccountSupport from '@/pages/AccountSupport';
import KYCSubmission from '@/pages/KYCSubmission';
import AccountGiftCards from '@/pages/AccountGiftCards';
import WalletPage from '@/pages/Wallet';
import MemberRewards from '@/pages/MemberRewards';
import AccountChat from '@/pages/AccountChat';
import AccountInvoices from '@/pages/admin/AdminInvoices';
import AccountVouchers from '@/pages/admin/AdminVouchers';
import SecurityCenter from '@/pages/SecurityCenter';
import VirtualNumbers from '@/pages/VirtualNumbers';
import MyDIDs from '@/pages/MyDIDs';
import IPTVServices from '@/pages/IPTVServices';
import PushNotifications from '@/pages/PushNotifications';
import { useUser } from '@/hooks/use-user';
import { useRoleModuleAccess } from '@/hooks/useRoleModuleAccess';

const agentNavigation: ResellerNavItem[] = [
  { name: 'Dashboard', href: '/account/dashboard', icon: LayoutDashboard },
  { name: 'Profile', href: '/account/profile', icon: User, moduleKey: 'change_profile' },
  {
    name: 'Customers',
    href: '/account/customers/dashboard',
    icon: Users,
    children: [
      { name: 'Dashboard', href: '/account/customers/dashboard', icon: LayoutDashboard },
      { name: 'Agent', href: '/account/customers?role=agent', icon: Users },
      { name: 'Reseller', href: '/account/customers?role=reseller', icon: Users },
      { name: 'User', href: '/account/customers?role=customer', icon: User },
    ],
  },
  {
    name: 'eSIM Packages',
    href: '/account/esims/dashboard',
    icon: Smartphone,
    moduleKey: 'module_esim_services',
    children: [
      { name: 'Dashboard', href: '/account/esims/dashboard', icon: LayoutDashboard, moduleKey: 'module_esim_services' },
      { name: 'Cost & Price', href: '/account/esims/cost-price', icon: DollarSign, moduleKey: 'module_esim_services' },
      { name: "Log's", href: '/account/esims/logs', icon: ClipboardList, moduleKey: 'module_esim_services' },
    ],
  },
  { name: 'Orders', href: '/account/orders', icon: Package, moduleKey: 'module_order_management' },
  {
    name: "eRoaming's",
    href: '/account/virtual-numbers/dashboard',
    icon: Phone,
    moduleKey: 'module_virtual_numbers',
    children: [
      { name: 'Dashboard', href: '/account/virtual-numbers/dashboard', icon: LayoutDashboard, moduleKey: 'module_virtual_numbers' },
      { name: "User's", href: '/account/virtual-numbers', icon: User, moduleKey: 'module_virtual_numbers' },
      { name: "My DID's", href: '/account/my-dids', icon: PhoneCall, moduleKey: 'module_virtual_numbers' },
    ],
  },
  {
    name: 'IPTV Services',
    href: '/account/iptv/dashboard',
    icon: Tv,
    moduleKey: 'module_iptv_services',
    children: [
      { name: 'Dashboard', href: '/account/iptv/dashboard', icon: LayoutDashboard, moduleKey: 'module_iptv_services' },
      { name: "User's", href: '/account/iptv', icon: User, moduleKey: 'module_iptv_services' },
      { name: 'Cost & Price', href: '/account/iptv/cost-price', icon: DollarSign, moduleKey: 'module_iptv_services' },
      { name: "IPTV Log's", href: '/account/iptv/logs', icon: ClipboardList, moduleKey: 'module_iptv_services' },
      { name: "User's List", href: '/account/iptv/users-list', icon: Users, moduleKey: 'module_iptv_services' },
      { name: 'Setting', href: '/account/iptv/settings', icon: Settings, moduleKey: 'module_iptv_services' },
    ],
  },
  { name: 'Vouchers', href: '/account/vouchers', icon: Ticket, moduleKey: 'module_vouchers' },
  { name: 'Invoices', href: '/account/invoices', icon: ReceiptText, moduleKey: 'module_invoice_system' },
  { name: 'Wallet', href: '/account/wallet', icon: Wallet },
  { name: 'Gift Cards', href: '/account/gift-cards', icon: Gift },
  { name: 'KYC Verification', href: '/account/kyc', icon: BadgeCheck },
  { name: 'Referrals', href: '/account/referrals', icon: Shield, moduleKey: 'referral_program' },
  { name: 'Chat', href: '/account/chat', icon: MessageCircle, moduleKey: 'chat_module' },
  { name: 'Push Notifications', href: '/account/push-notifications', icon: BellRing, moduleKey: 'module_push_notifications' },
  { name: 'VIP Concierge', href: '/account/support', icon: Headphones, moduleKey: 'support' },
  {
    name: 'Security',
    href: '/account/security/2fa',
    icon: Shield,
    children: [
      { name: '2FA', href: '/account/security/2fa', icon: Shield },
      { name: "IP Log's", href: '/account/security/ip-logs', icon: Activity },
    ],
  },
  {
    name: 'Platform Setup',
    href: '/account/platform-setup/app-stores',
    icon: Settings,
    moduleKey: 'module_platform_setup',
    children: [
      { name: 'Storefront', href: '/account/storefront', icon: Globe2, moduleKey: 'module_platform_setup' },
      { name: 'SMTP', href: '/account/platform-setup/smtp', icon: Mail, moduleKey: 'module_platform_setup' },
      { name: 'App Stores', href: '/account/platform-setup/app-stores', icon: Store, moduleKey: 'module_platform_setup' },
      { name: 'Currencies', href: '/account/platform-setup/currencies', icon: Coins, moduleKey: 'module_platform_setup' },
      { name: 'Payment Gateways', href: '/account/payment-gateways', icon: Wallet, moduleKey: 'module_platform_setup' },
      { name: 'Modules', href: '/account/platform-setup/modules', icon: Puzzle, moduleKey: 'module_platform_setup' },
      { name: 'Failover & API', href: '/account/platform-setup/failover-settings', icon: Activity, moduleKey: 'module_platform_setup' },
      { name: 'Banner', href: '/account/platform-setup/banner', icon: Image, moduleKey: 'module_platform_setup' },
      { name: 'Pages', href: '/account/platform-setup/pages', icon: FileText, moduleKey: 'module_platform_setup' },
      { name: 'FAQ', href: '/account/platform-setup/faq', icon: FileQuestion, moduleKey: 'module_platform_setup' },
      { name: 'Blog', href: '/account/platform-setup/blog', icon: Newspaper, moduleKey: 'module_platform_setup' },
      { name: 'Language', href: '/account/platform-setup/languages', icon: Languages, moduleKey: 'module_platform_setup' },
      { name: 'Translation', href: '/account/platform-setup/translations', icon: Languages, moduleKey: 'module_platform_setup' },
      { name: 'API Docs', href: '/account/platform-setup/api-docs', icon: Code2, moduleKey: 'module_platform_setup' },
    ],
  },
];

const customerNavigation: ResellerNavItem[] = [
  { name: 'Dashboard', href: '/account/dashboard', icon: LayoutDashboard },
  { name: 'Profile', href: '/account/profile', icon: User, moduleKey: 'change_profile' },
  { name: 'My eSIMs', href: '/account/esims', icon: Smartphone, moduleKey: 'module_esim_services' },
  { name: 'Orders', href: '/account/orders', icon: Package },
  { name: 'Wallet', href: '/account/wallet', icon: Wallet, moduleKey: 'module_wallet_topup' },
  { name: 'Gift Cards', href: '/account/gift-cards', icon: Gift, moduleKey: 'module_gift_cards' },
  { name: 'Member Rewards', href: '/account/member-rewards', icon: TrendingUp, moduleKey: 'module_rewards' },
  { name: "eRoaming's", href: '/account/virtual-numbers', icon: Phone, moduleKey: 'module_virtual_numbers' },
  { name: "My DID's", href: '/account/my-dids', icon: PhoneCall, moduleKey: 'module_virtual_numbers' },
  { name: 'IPTV Services', href: '/account/iptv', icon: Tv, moduleKey: 'module_iptv_services' },
  { name: 'Vouchers', href: '/account/vouchers', icon: Ticket, moduleKey: 'module_vouchers' },
  { name: 'KYC Verification', href: '/account/kyc', icon: BadgeCheck },
  { name: 'Referrals', href: '/account/referrals', icon: Shield, moduleKey: 'referral_program' },
  { name: 'Chat', href: '/account/chat', icon: MessageCircle, moduleKey: 'chat_module' },
  { name: 'VIP Concierge', href: '/account/support', icon: Headphones, moduleKey: 'concierge' },
  {
    name: 'Security',
    href: '/account/security/2fa',
    icon: Shield,
    children: [
      { name: '2FA', href: '/account/security/2fa', icon: Shield },
      { name: "IP Log's", href: '/account/security/ip-logs', icon: Activity },
    ],
  },
];

function ModuleRoute({ moduleKey, children }: { moduleKey: string; children: React.ReactNode }) {
  const { enabled, isLoading } = useRoleModuleAccess(moduleKey);

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading...</div>;
  }

  if (!enabled) {
    return <Redirect to="/account/dashboard" />;
  }

  return <>{children}</>;
}

function AccountVouchersRoute({ createOnly = false }: { createOnly?: boolean }) {
  const { user } = useUser();

  if (user?.role === 'agent' || user?.role === 'reseller') {
    return (
      <AccountVouchers
        mode="account"
        createOnly={createOnly}
        listPath="/account/vouchers"
        createPath="/account/vouchers/create"
        title="Agent Vouchers"
        description="Create wallet top-up voucher batches with Series#, Serial#, value, and quantity."
      />
    );
  }

  return <WalletPage walletPath="/account/vouchers" initialTab="voucher" />;
}

function AccountESIMsRoute() {
  const { user } = useUser();

  if (user?.role === 'agent' || user?.role === 'reseller') {
    return <Redirect to="/account/esims/dashboard" />;
  }

  return <MyESIMs />;
}

function PlatformSetupPlaceholder({ section, role }: { section: string; role?: string | null }) {
  const title = section
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const description =
    section === 'modules'
      ? role === 'agent'
        ? 'Apply storefront modules for your own Agent workspace and downstream Agent setup.'
        : 'Apply storefront modules for your own Sub Resellers and Agent setup.'
      : 'This storefront section is ready for reseller and agent-specific setup controls.';

  return (
    <div className="rounded-2xl border border-blue-300/10 bg-slate-900/70 p-6 text-white shadow-xl shadow-black/20">
      <p className="text-sm font-semibold text-lime-200">Storefront Setup</p>
      <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-300">{description}</p>
    </div>
  );
}

function money(value: unknown) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

function numberText(value: unknown) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

async function fetchAccountData<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  const json = await response.json();
  return (json?.data ?? json) as T;
}

function iptvTermKey(order: any) {
  if (order?.subscriptionTermType === 'hours' || Number(order?.subscriptionMonths || 0) === 99) return 'trial';
  return String(order?.subscriptionMonths || 1);
}

function calculateIptvProfit(orders: any[] = [], retailRows: any[] = []) {
  const rowsByPackage = new Map<string, any>();
  retailRows.forEach((row) => {
    if (row.packageId) rowsByPackage.set(String(row.packageId), row);
    if (row.tvplusPackageId) rowsByPackage.set(String(row.tvplusPackageId), row);
    if (row.name) rowsByPackage.set(String(row.name).toLowerCase(), row);
  });

  return orders
    .filter((order) => !['failed', 'cancelled', 'canceled', 'refunded'].includes(String(order.status || '').toLowerCase()))
    .reduce(
      (totals, order) => {
        const key = iptvTermKey(order);
        const row =
          rowsByPackage.get(String(order.packageId || '')) ||
          rowsByPackage.get(String(order.tvplusPackageId || '')) ||
          rowsByPackage.get(String(order.packageName || '').toLowerCase());
        const revenue = Number(order.price ?? row?.retailPrices?.[key] ?? row?.basePrices?.[key] ?? 0);
        const cost = Number(row?.providerCostUsd?.[key] ?? 0);
        totals.revenue += revenue;
        totals.cost += cost;
        return totals;
      },
      { revenue: 0, cost: 0 },
    );
}

function ModuleDashboardPage({
  eyebrow,
  title,
  description,
  metrics = [],
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  metrics?: Array<{
    label: string;
    value: string;
    helper: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  actions: Array<{
    title: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-300/10 bg-slate-900/70 p-6 text-white shadow-xl shadow-black/20">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-lime-200">
          <LayoutDashboard className="h-4 w-4" />
          {eyebrow}
        </div>
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">{description}</p>
      </div>

      {metrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-2xl border border-blue-300/10 bg-[#0b1226]/80 p-5 text-white shadow-xl shadow-black/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-300">{metric.label}</p>
                    <div className="mt-2 text-3xl font-semibold">{metric.value}</div>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-lime-300/20 bg-lime-300/10 text-lime-200">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-400">{metric.helper}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="block h-full">
              <div className="group flex h-full cursor-pointer items-start gap-4 rounded-2xl border border-blue-300/10 bg-[#0b1226]/80 p-5 text-white transition hover:border-lime-300/40 hover:bg-slate-900">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lime-300/20 bg-lime-300/10 text-lime-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold">{action.title}</h2>
                  <p className="mt-1 text-sm text-slate-400">{action.description}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-lime-200" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function AccountCustomersDashboard() {
  const { data: stats } = useQuery<any>({ queryKey: ['/api/reseller/stats'] });
  const totalProfit = Number(stats?.totals?.totalProfit || 0);
  const totalRevenue = Number(stats?.totals?.totalSpend || 0);

  return (
    <ModuleDashboardPage
      eyebrow="Customers Dashboard"
      title="Customers"
      description="Open the customer workspace before managing agents, sub resellers, retail users, and service profit."
      metrics={[
        { label: 'Customer Profit', value: money(totalProfit), helper: 'Selling price minus wholesale cost', icon: TrendingUp },
        { label: 'Customer Revenue', value: money(totalRevenue), helper: `${numberText(stats?.totals?.totalOrders)} total orders`, icon: DollarSign },
      ]}
      actions={[
        { title: 'Agents', description: 'Create and manage agent accounts with assigned rates.', href: '/account/customers?role=agent', icon: Users },
        { title: 'Sub Resellers', description: 'Manage downstream reseller accounts and pricing assignments.', href: '/account/customers?role=reseller', icon: Users },
        { title: 'Users', description: 'View retail users, wallet balances, package activity, and status.', href: '/account/customers?role=customer', icon: User },
      ]}
    />
  );
}

function AccountESIMDashboard() {
  const { data: stats } = useQuery<any>({ queryKey: ['/api/reseller/stats'] });
  const { data: pricesResponse } = useQuery<any>({
    queryKey: ['/api/reseller/prices', { dashboard: true }],
    queryFn: () => fetchAccountData('/api/reseller/prices?limit=500'),
  });
  const priceStats = pricesResponse?.stats || {};
  const packages = pricesResponse?.packages || [];
  const totalProfit = Number(stats?.totals?.totalProfit || 0);
  const totalRevenue = Number(stats?.totals?.totalSpend || 0);

  return (
    <ModuleDashboardPage
      eyebrow="eSIM Packages Dashboard"
      title="eSIM Packages"
      description="Review eSIM package statistics, profit, active rows, inactive rows, and package purchase activity."
      metrics={[
        { label: 'eSIM Profit', value: money(totalProfit), helper: 'Selling price minus wholesale cost', icon: TrendingUp },
        { label: 'eSIM Revenue', value: money(totalRevenue), helper: `${numberText(stats?.totals?.totalOrders)} package orders`, icon: DollarSign },
        { label: 'Active Packages', value: numberText(priceStats.activePackages || packages.filter((pkg: any) => pkg.isEnabled).length), helper: 'Available package rows', icon: BadgeCheck },
        { label: 'Inactive Packages', value: numberText(priceStats.disabledPackages || packages.filter((pkg: any) => !pkg.isEnabled).length), helper: 'Disabled or hidden rows', icon: ClipboardList },
      ]}
      actions={[
        { title: 'Cost & Price', description: 'Set reseller or agent retail prices for eSIM packages.', href: '/account/esims/cost-price', icon: DollarSign },
        { title: "Log's", description: 'Review active and inactive eSIM package purchase rows.', href: '/account/esims/logs', icon: ClipboardList },
        { title: 'Orders', description: 'Open purchased eSIM orders and fulfillment details.', href: '/account/orders', icon: Package },
      ]}
    />
  );
}

function AccountESIMLogs() {
  const { data: ordersResponse, isLoading } = useQuery<any>({
    queryKey: ['/api/reseller/esim-orders', { logs: true }],
    queryFn: () => fetchAccountData('/api/reseller/esim-orders?limit=1000'),
  });
  const orders = ordersResponse?.orders || [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-300/10 bg-slate-900/70 p-6 text-white shadow-xl shadow-black/20">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-lime-200">
          <ClipboardList className="h-4 w-4" />
          eSIM Package Log's
        </div>
        <h1 className="mt-3 text-3xl font-semibold">Active And Inactive Packages</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          All ordered eSIM packages purchased through this workspace, including active and inactive package rows.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-blue-300/10 bg-[#0b1226]/80 text-white shadow-xl shadow-black/10">
        <div className="hidden min-w-[1020px] grid-cols-[minmax(260px,1fr)_170px_100px_120px_120px_120px_120px] border-b border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:grid">
          <div>Package</div>
          <div>Customer</div>
          <div>Qty</div>
          <div>Total Price</div>
          <div>Profit</div>
          <div>Order Status</div>
          <div>Package Status</div>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-slate-400">Loading eSIM Order Package Log's...</div>
        ) : orders.length ? (
          <div className="divide-y divide-white/10 lg:min-w-[1020px]">
            {orders.map((order: any) => (
              <div key={order.id} className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[minmax(260px,1fr)_170px_100px_120px_120px_120px_120px] lg:items-center">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white">{order.packageTitle || order.destinationName || 'eSIM Package'}</div>
                  <div className="mt-1 text-xs text-slate-400">#{order.displayOrderId || order.id} | {order.destinationName || 'Global'} | {order.dataAmount} | {order.validity} days</div>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-white/5 p-3 lg:contents lg:border-0 lg:bg-transparent lg:p-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Customer</div>
                  <div className="truncate">{order.customerName || order.customerEmail || 'Workspace Order'}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Qty</div>
                  <div>{numberText(order.quantity || 1)}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Total Price</div>
                  <div>{money(order.totalPrice ?? order.price)}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Profit</div>
                  <div className="font-semibold text-lime-200">{money(order.profit)}</div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Order Status</div>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-semibold text-slate-200">
                    {String(order.status || '').replace(/^\w/, (char) => char.toUpperCase())}
                  </span>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Package Status</div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${order.packageStatus === 'active' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>
                    {String(order.packageStatus || 'inactive').replace(/^\w/, (char) => char.toUpperCase())}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-400">No ordered eSIM packages found.</div>
        )}
      </div>
    </div>
  );
}

function AccountERoamingDashboard() {
  const { data } = useQuery<any>({ queryKey: ['/api/vonage/dashboard'] });
  const numbers = data?.numbers || (data?.number ? [data.number] : []);
  const monthlyRevenue = numbers.reduce((sum: number, number: any) => sum + Number(number?.subscription?.renewalPrice || number?.pricing?.monthlyFee || 0), 0);
  const monthlyCost = numbers.reduce((sum: number, number: any) => sum + Number(number?.pricing?.monthlyFee || 0), 0);
  const monthlyProfit = monthlyRevenue - monthlyCost;

  return (
    <ModuleDashboardPage
      eyebrow="eRoaming Dashboard"
      title="eRoaming's"
      description="Manage virtual number requests, profit, SMS, voice access, forwarding, and wallet-based usage."
      metrics={[
        { label: 'eRoaming Profit', value: money(monthlyProfit), helper: 'eRoaming revenue minus service cost', icon: TrendingUp },
        { label: 'Monthly Revenue', value: money(monthlyRevenue), helper: `${numberText(numbers.length)} active inventory rows`, icon: DollarSign },
        { label: 'Monthly Cost', value: money(monthlyCost), helper: 'Estimated platform service cost', icon: ClipboardList },
      ]}
      actions={[
        { title: "User's", description: 'Request numbers, manage active numbers, and review messages.', href: '/account/virtual-numbers', icon: Smartphone },
        { title: "My DID's", description: 'Open bought DID numbers for SMS, calls, receiving SMS, and Voice Mail.', href: '/account/my-dids', icon: PhoneCall },
        { title: 'Voice & SMS', description: 'Open the eRoaming workspace for messaging, calls, and routing.', href: '/account/virtual-numbers', icon: PhoneCall },
      ]}
    />
  );
}

function AccountIptvDashboard() {
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ['/api/iptv/orders'] });
  const { data: retailPrices = [] } = useQuery<any[]>({ queryKey: ['/api/iptv/retail-prices'] });
  const iptvTotals = calculateIptvProfit(orders, retailPrices);
  const iptvProfit = iptvTotals.revenue - iptvTotals.cost;

  return (
    <ModuleDashboardPage
      eyebrow="IPTV Dashboard"
      title="IPTV Services"
      description="Open the IPTV workspace before creating subscriptions, reviewing profit, setting retail prices, checking logs, and configuring storefront rules."
      metrics={[
        { label: 'IPTV Profit', value: money(iptvProfit), helper: 'Subscription revenue minus service cost', icon: TrendingUp },
        { label: 'IPTV Revenue', value: money(iptvTotals.revenue), helper: `${numberText(orders.length)} subscription orders`, icon: DollarSign },
        { label: 'IPTV Cost', value: money(iptvTotals.cost), helper: 'Estimated platform service cost', icon: ClipboardList },
      ]}
      actions={[
        { title: "User's", description: 'Create IPTV subscriptions and assign them to existing users.', href: '/account/iptv', icon: Tv },
        { title: 'Cost & Price', description: 'Set retail IPTV prices from the admin base package costs.', href: '/account/iptv/cost-price', icon: DollarSign },
        { title: "IPTV Log's", description: 'Review IPTV order activity and provider responses.', href: '/account/iptv/logs', icon: ClipboardList },
        { title: "User's List", description: 'Manage active IPTV users, renewals, credentials, and actions.', href: '/account/iptv/users-list', icon: Users },
        { title: 'Setting', description: 'Configure IPTV package visibility and storefront features.', href: '/account/iptv/settings', icon: Settings },
      ]}
    />
  );
}

export function AccountShell() {
  const [location] = useLocation();
  const { user } = useUser();

  // Handle the base /account route or unknown sub-paths
  if (location === '/account' || location === '/account/') {
    return <Redirect to="/account/dashboard" />;
  }

  const routes = (
    <Switch>
        <Route path="/account/dashboard" component={AccountDashboard} />
        <Route path="/account/profile" component={Profile} />
        <Route path="/account/esims/dashboard">
          <ModuleRoute moduleKey="module_esim_services">
            <AccountESIMDashboard />
          </ModuleRoute>
        </Route>
        <Route path="/account/esims/cost-price">
          <ModuleRoute moduleKey="module_esim_services">
            <ResellerPriceCost />
          </ModuleRoute>
        </Route>
        <Route path="/account/esims/logs">
          <ModuleRoute moduleKey="module_esim_services">
            <AccountESIMLogs />
          </ModuleRoute>
        </Route>
        <Route path="/account/esims">
          <ModuleRoute moduleKey="module_esim_services">
            <AccountESIMsRoute />
          </ModuleRoute>
        </Route>
        <Route path="/account/orders" component={MyOrders} />
        <Route path="/account/customers/dashboard" component={AccountCustomersDashboard} />
        <Route path="/account/customers" component={ResellerCustomers} />
        <Route path="/account/referrals" component={Referrals} />
        <Route path="/account/chat">
          <ModuleRoute moduleKey="chat_module">
            <AccountChat />
          </ModuleRoute>
        </Route>
        <Route path="/account/push-notifications">
          <ModuleRoute moduleKey="module_push_notifications">
            <PushNotifications />
          </ModuleRoute>
        </Route>
        <Route path="/account/support">
          <ModuleRoute moduleKey="concierge">
            <AccountSupport />
          </ModuleRoute>
        </Route>
        <Route path="/account/security/2fa">
          <SecurityCenter section="2fa" />
        </Route>
        <Route path="/account/security/ip-logs">
          <SecurityCenter section="ip-logs" />
        </Route>
        <Route path="/account/kyc" component={KYCSubmission} />
        <Route path="/account/gift-cards">
          <ModuleRoute moduleKey="module_gift_cards">
            <AccountGiftCards />
          </ModuleRoute>
        </Route>
        <Route path="/account/wallet">
          <ModuleRoute moduleKey="module_wallet_topup">
            <WalletPage />
          </ModuleRoute>
        </Route>
        <Route path="/account/member-rewards">
          <ModuleRoute moduleKey="module_rewards">
            <MemberRewards />
          </ModuleRoute>
        </Route>
        <Route path="/account/virtual-numbers/dashboard">
          <ModuleRoute moduleKey="module_virtual_numbers">
            <AccountERoamingDashboard />
          </ModuleRoute>
        </Route>
        <Route path="/account/my-dids/:id">
          {(params) => (
            <ModuleRoute moduleKey="module_virtual_numbers">
              <MyDIDs selectedId={String(params.id || '')} />
            </ModuleRoute>
          )}
        </Route>
        <Route path="/account/my-dids">
          <ModuleRoute moduleKey="module_virtual_numbers">
            <MyDIDs />
          </ModuleRoute>
        </Route>
        <Route path="/account/virtual-numbers">
          <ModuleRoute moduleKey="module_virtual_numbers">
            <VirtualNumbers />
          </ModuleRoute>
        </Route>
        <Route path="/account/eroaming-numbers">
          <ModuleRoute moduleKey="module_virtual_numbers">
            <VirtualNumbers />
          </ModuleRoute>
        </Route>
        <Route path="/account/iptv/dashboard">
          <ModuleRoute moduleKey="module_iptv_services">
            <AccountIptvDashboard />
          </ModuleRoute>
        </Route>
        <Route path="/account/iptv/cost-price">
          <ModuleRoute moduleKey="module_iptv_services">
            <IPTVServices mode="cost-price" />
          </ModuleRoute>
        </Route>
        <Route path="/account/iptv/logs">
          <ModuleRoute moduleKey="module_iptv_services">
            <IPTVServices mode="logs" />
          </ModuleRoute>
        </Route>
        <Route path="/account/iptv/users-list">
          <ModuleRoute moduleKey="module_iptv_services">
            <IPTVServices mode="users-list" />
          </ModuleRoute>
        </Route>
        <Route path="/account/iptv/settings">
          <ModuleRoute moduleKey="module_iptv_services">
            <IPTVServices mode="settings" />
          </ModuleRoute>
        </Route>
        <Route path="/account/iptv">
          <ModuleRoute moduleKey="module_iptv_services">
            <IPTVServices />
          </ModuleRoute>
        </Route>
        <Route path="/account/vouchers/create">
          <ModuleRoute moduleKey="module_vouchers">
            <AccountVouchersRoute createOnly />
          </ModuleRoute>
        </Route>
        <Route path="/account/vouchers">
          <ModuleRoute moduleKey="module_vouchers">
            <AccountVouchersRoute />
          </ModuleRoute>
        </Route>
        <Route path="/account/invoices">
          <ModuleRoute moduleKey="module_invoice_system">
            <AccountInvoices
              mode="account"
              title="Agent Invoices"
              description="Create, send, download, and Track invoices from your Agent account."
            />
          </ModuleRoute>
        </Route>
        <Route path="/account/storefront">
          <ModuleRoute moduleKey="module_platform_setup">
            <ResellerDashboard />
          </ModuleRoute>
        </Route>
        <Route path="/account/platform-setup/settings">
          <Redirect to="/account/platform-setup/app-stores" />
        </Route>
        <Route path="/account/platform-setup/smtp">
          <ModuleRoute moduleKey="module_platform_setup">
            <ResellerStorefrontSmtp />
          </ModuleRoute>
        </Route>
        <Route path="/account/platform-setup/currencies">
          <ModuleRoute moduleKey="module_platform_setup">
            <ResellerCurrencies />
          </ModuleRoute>
        </Route>
        <Route path="/account/payment-gateways">
          <ModuleRoute moduleKey="module_platform_setup">
            <ResellerPaymentGateways />
          </ModuleRoute>
        </Route>
        <Route path="/account/platform-setup/api-docs">
          <ModuleRoute moduleKey="module_platform_setup">
            <ApiDocs />
          </ModuleRoute>
        </Route>
        <Route path="/account/platform-setup/faq">
          <ModuleRoute moduleKey="module_platform_setup">
            <FaqManagement />
          </ModuleRoute>
        </Route>
        <Route path="/account/platform-setup/pages">
          <ModuleRoute moduleKey="module_platform_setup">
            <PagesManagement />
          </ModuleRoute>
        </Route>
        <Route path="/account/platform-setup/banner">
          <ModuleRoute moduleKey="module_platform_setup">
            <BannerManagement />
          </ModuleRoute>
        </Route>
        <Route path="/account/platform-setup/failover-settings">
          <ModuleRoute moduleKey="module_platform_setup">
            <FailoverSettings />
          </ModuleRoute>
        </Route>
        <Route path="/account/platform-setup/languages">
          <ModuleRoute moduleKey="module_platform_setup">
            <AdminLanguages />
          </ModuleRoute>
        </Route>
        <Route path="/account/platform-setup/translations">
          <ModuleRoute moduleKey="module_platform_setup">
            <AdminTranslations />
          </ModuleRoute>
        </Route>
        <Route path="/account/platform-setup/:section">
          {(params) => (
            <ModuleRoute moduleKey="module_platform_setup">
              <ResellerStorefrontSection section={String(params.section || 'settings')} />
            </ModuleRoute>
          )}
        </Route>
        
        {/* Fallback for unmatched /account/* routes */}
        <Route>
          <Redirect to="/account/dashboard" />
        </Route>
      </Switch>
  );

  if (user?.role === 'agent' || user?.role === 'reseller') {
    return (
      <ResellerLayout
        navigationItems={agentNavigation}
        panelLabel={user.role === 'agent' ? 'Agent Panel' : 'Reseller Panel'}
        homeHref="/account/dashboard"
        showStorefront={false}
      >
        {routes}
      </ResellerLayout>
    );
  }

  return (
    <ResellerLayout
      navigationItems={customerNavigation}
      panelLabel="Customer Account"
      homeHref="/account/dashboard"
      showStorefront={false}
    >
      {routes}
    </ResellerLayout>
  );
}
