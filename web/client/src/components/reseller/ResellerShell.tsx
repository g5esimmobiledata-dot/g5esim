import { lazy, Suspense } from 'react';
import type React from 'react';
import { Link, Redirect, Route, Switch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ResellerLayout } from './ResellerLayout';
import { useRoleModuleAccess } from '@/hooks/useRoleModuleAccess';
import {
  LayoutDashboard,
  ArrowRight,
  Users,
  UserPlus,
  Smartphone,
  PhoneCall,
  Tv,
  DollarSign,
  ClipboardList,
  Settings,
  Wallet,
  ShoppingCart,
  TrendingUp,
  Package,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  RadioTower,
  Server,
  ListVideo,
} from 'lucide-react';

const WalletPage = lazy(() => import('@/pages/Wallet'));
const MyOrders = lazy(() => import('@/pages/MyOrders'));
const Profile = lazy(() => import('@/pages/Profile'));
const AccountSupport = lazy(() => import('@/pages/AccountSupport'));
const AccountInvoices = lazy(() => import('@/pages/admin/AdminInvoices'));
const AccountVouchers = lazy(() => import('@/pages/admin/AdminVouchers'));
const IPTVServices = lazy(() => import('@/pages/IPTVServices'));
const VirtualNumbers = lazy(() => import('@/pages/VirtualNumbers'));
const SecurityCenter = lazy(() => import('@/pages/SecurityCenter'));
const ResellerDashboard = lazy(() => import('@/pages/reseller/ResellerDashboard'));
const ResellerStatistics = lazy(() => import('@/pages/reseller/ResellerStatistics'));
const ResellerPriceCost = lazy(() => import('@/pages/reseller/ResellerPriceCost'));
const ResellerRates = lazy(() => import('@/pages/reseller/ResellerRates'));
const ResellerCustomers = lazy(() => import('@/pages/reseller/ResellerCustomers'));
const ResellerPaymentGateways = lazy(() => import('@/pages/reseller/ResellerPaymentGateways'));
const ResellerCurrencies = lazy(() => import('@/pages/reseller/ResellerCurrencies'));
const ResellerStorefrontSmtp = lazy(() => import('@/pages/reseller/ResellerStorefrontSmtp'));
const ResellerStorefrontSection = lazy(() => import('@/pages/reseller/ResellerStorefrontSection'));
const ApiDocs = lazy(() => import('@/pages/admin/ApiDocs'));
const FaqManagement = lazy(() => import('@/pages/admin/FaqManagement'));
const PagesManagement = lazy(() => import('@/pages/admin/PagesManagement'));
const BannerManagement = lazy(() => import('@/pages/admin/BannerManagement'));
const FailoverSettings = lazy(() => import('@/pages/admin/FailoverSettings'));
const AdminLanguages = lazy(() => import('@/pages/admin/AdminLanguages'));
const AdminTranslations = lazy(() => import('@/pages/admin/AdminTranslations'));
const PushNotifications = lazy(() => import('@/pages/PushNotifications'));

function ModuleRoute({ moduleKey, children }: { moduleKey: string; children: React.ReactNode }) {
  const { enabled, isLoading } = useRoleModuleAccess(moduleKey);

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading...</div>;
  }

  if (!enabled) {
    return <Redirect to="/reseller/dashboard" />;
  }

  return <>{children}</>;
}

function PlatformSetupPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-blue-300/10 bg-slate-900/70 p-6 text-white shadow-xl shadow-black/20">
      <p className="text-sm font-semibold text-lime-200">Storefront Setup</p>
      <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-300">
        This storefront section is ready for reseller-specific setup tools.
      </p>
    </div>
  );
}

function ModuleDashboardPage({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
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

type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
};

async function fetchDashboardData<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  const json = await response.json();
  return (json?.data ?? json) as T;
}

function money(value: unknown) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function numberText(value: unknown) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
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

const UPPERCASE_WORDS = new Set(['API', 'IPTV', 'SMS', 'USDT', 'USD', 'M3U', 'QR', 'DID']);

function titleCaseText(value: unknown) {
  return String(value ?? '')
    .split(/(\s+|[|/])/)
    .map((part) => {
      if (!part.trim() || part === '|' || part === '/') return part;
      return part
        .split('-')
        .map((word) => {
          if (!word) return word;
          if (word.toLowerCase() === 'eroaming') return 'eRoaming';
          if (word.toLowerCase() === "eroaming's") return "eRoaming's";
          if (word.toLowerCase() === 'esim') return 'eSIM';
          if (word.toLowerCase() === 'esims') return 'eSIMs';
          const upper = word.toUpperCase();
          if (UPPERCASE_WORDS.has(upper)) return upper;
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('-');
    })
    .join('');
}

function DashboardMetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className={`relative min-h-[166px] overflow-hidden rounded-xl border border-white/10 p-6 text-white shadow-xl shadow-black/20 ${metric.tone}`}
          >
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-cyan-100">{titleCaseText(metric.label)}</p>
                <div className="mt-3 text-3xl font-semibold tracking-tight">{metric.value}</div>
                <p className="mt-2 text-sm text-slate-300">{titleCaseText(metric.helper)}</p>
                {metric.badge && (
                  <span className="mt-4 inline-flex rounded-md bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                    {titleCaseText(metric.badge)}
                  </span>
                )}
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-lg shadow-white/10">
                <Icon className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -bottom-10 -right-6 h-32 w-40 bg-white/15 blur-2xl" />
          </div>
        );
      })}
    </div>
  );
}

function DashboardPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#10141f] p-6 text-white shadow-xl shadow-black/20">
      <h2 className="text-xl font-semibold">{titleCaseText(title)}</h2>
      <p className="mt-1 text-sm text-slate-300">{titleCaseText(description)}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function DashboardShell({
  title,
  description,
  metrics,
  quickStats,
  children,
}: {
  title: string;
  description: string;
  metrics: DashboardMetric[];
  quickStats: Array<{ label: string; value: string; icon: React.ComponentType<{ className?: string }> }>;
  children: React.ReactNode;
}) {
  return (
    <div className="-m-4 min-h-[calc(100vh-8rem)] space-y-6 bg-[#050917] p-4 text-white sm:-m-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titleCaseText(title)}</h1>
        <p className="mt-1 max-w-4xl text-sm text-slate-300">{titleCaseText(description)}</p>
      </div>
      <DashboardMetricGrid metrics={metrics} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-[#10141f] p-5 shadow-lg shadow-black/10">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Icon className="h-4 w-4" />
                {titleCaseText(stat.label)}
              </div>
              <div className="mt-2 text-2xl font-semibold">{titleCaseText(stat.value)}</div>
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}

function ESIMDashboard() {
  const { data: stats } = useQuery<any>({ queryKey: ['/api/reseller/stats'] });
  const { data: pricesResponse } = useQuery<any>({
    queryKey: ['/api/reseller/prices', { dashboard: true }],
    queryFn: () => fetchDashboardData('/api/reseller/prices?limit=500'),
  });

  const priceStats = pricesResponse?.stats || {};
  const packages = pricesResponse?.packages || [];
  const totalProfit = Number(stats?.totals?.totalProfit || 0);
  const totalRevenue = Number(stats?.totals?.totalSpend || 0);
  const activePackages = Number(priceStats.activePackages || packages.filter((pkg: any) => pkg.isEnabled).length);
  const inactivePackages = Number(priceStats.disabledPackages || packages.filter((pkg: any) => !pkg.isEnabled).length);

  return (
    <DashboardShell
      title="eSIM Packages Dashboard"
      description="Full statistics and performance for eSIM packages, profit, active catalog rows, inactive rows, and recent package purchases."
      metrics={[
        { label: 'eSIM Revenue', value: money(totalRevenue), helper: `${numberText(stats?.totals?.totalOrders)} package orders`, badge: `${numberText(stats?.totals?.completedOrders)} completed`, icon: DollarSign, tone: 'bg-[linear-gradient(115deg,#11233c,#132c5c)]' },
        { label: 'eSIM Profit', value: money(totalProfit), helper: 'Selling price minus wholesale cost', badge: `${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0'}% margin`, icon: TrendingUp, tone: 'bg-[linear-gradient(115deg,#12332d,#1f5a45)]' },
        { label: 'Active Packages', value: numberText(activePackages), helper: 'Available for reseller purchase', badge: 'Active rows', icon: CheckCircle2, tone: 'bg-[linear-gradient(115deg,#17311f,#2d5a2c)]' },
        { label: 'Inactive Packages', value: numberText(inactivePackages), helper: 'Disabled or hidden catalog rows', badge: 'Inactive rows', icon: AlertCircle, tone: 'bg-[linear-gradient(115deg,#3b1f2d,#65232c)]' },
        { label: 'eSIMs Sold', value: numberText(stats?.totals?.totalEsims), helper: 'Total purchased eSIM quantity', badge: 'Package purchases', icon: Smartphone, tone: 'bg-[linear-gradient(115deg,#172642,#243a62)]' },
        { label: 'Custom Prices', value: numberText(priceStats.customPrices), helper: 'Packages with reseller price override', badge: 'Pricing rules', icon: ClipboardList, tone: 'bg-[linear-gradient(115deg,#38251d,#63391f)]' },
      ]}
      quickStats={[
        { label: 'Total Packages', value: numberText(priceStats.totalPackages), icon: Package },
        { label: 'Average Profit', value: stats?.totals?.completedOrders ? money(totalProfit / Number(stats.totals.completedOrders || 1)) : money(0), icon: TrendingUp },
        { label: 'Active Voucher Value', value: money(stats?.totals?.activeVoucherValue), icon: Wallet },
        { label: 'Redeemed Voucher Value', value: money(stats?.totals?.redeemedVoucherValue), icon: CheckCircle2 },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-3">
        <DashboardPanel title="eSIM Actions" description="Open the main eSIM package workspaces.">
          <div className="grid gap-3">
            {[
              { title: 'Cost & Price', href: '/reseller/price-cost', icon: DollarSign },
              { title: "Log's", href: '/reseller/esims/logs', icon: ClipboardList },
              { title: 'Statistics', href: '/reseller/statistics', icon: Activity },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-lime-200" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Recent eSIM Purchases" description="Latest purchased package activity.">
          <div className="space-y-3">
            {(stats?.recentOrders || []).slice(0, 5).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{order.packageTitle || order.destinationName || 'eSIM Package'}</div>
                  <div className="text-xs text-slate-400">{order.status} | {order.quantity || 1} item</div>
                </div>
                <div className="text-sm font-semibold">{money(order.price)}</div>
              </div>
            ))}
            {!(stats?.recentOrders || []).length && <div className="text-sm text-slate-400">No eSIM purchases yet.</div>}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Profit Snapshot" description="Revenue and margin view for eSIM package purchases.">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-300">eSIM revenue</span><span>{money(totalRevenue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">eSIM profit</span><span>{money(totalProfit)}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Profit rate</span><span>{totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0%'}</span></div>
          </div>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}

function ESIMLogs() {
  const { data: ordersResponse, isLoading } = useQuery<any>({
    queryKey: ['/api/reseller/esim-orders', { logs: true }],
    queryFn: () => fetchDashboardData('/api/reseller/esim-orders?limit=1000'),
  });
  const orders = ordersResponse?.orders || [];
  const activeCount = orders.filter((order: any) => order.packageStatus === 'active').length;
  const inactiveCount = orders.length - activeCount;

  return (
    <div className="-m-4 min-h-[calc(100vh-8rem)] space-y-6 bg-[#050917] p-4 text-white sm:-m-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">eSIM Package Log's</h1>
        <p className="mt-1 max-w-4xl text-sm text-slate-300">All ordered eSIM packages purchased through this workspace, including active and inactive package rows.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#10141f] p-5">
          <div className="text-sm text-slate-300">Total Ordered Packages</div>
          <div className="mt-2 text-3xl font-semibold">{numberText(orders.length)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#10141f] p-5">
          <div className="text-sm text-slate-300">Active Packages</div>
          <div className="mt-2 text-3xl font-semibold">{numberText(activeCount)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#10141f] p-5">
          <div className="text-sm text-slate-300">Inactive Packages</div>
          <div className="mt-2 text-3xl font-semibold">{numberText(inactiveCount)}</div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#10141f]">
        <div className="hidden min-w-[1040px] grid-cols-[minmax(280px,1fr)_170px_110px_120px_120px_120px_120px] border-b border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:grid">
          <div>Package</div>
          <div>Customer</div>
          <div>Quantity</div>
          <div>Total Price</div>
          <div>Profit</div>
          <div>Order Status</div>
          <div>Package Status</div>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-slate-400">Loading eSIM Order Package Log's...</div>
        ) : orders.length ? (
          <div className="divide-y divide-white/10 lg:min-w-[1040px]">
            {orders.map((order: any) => (
              <div key={order.id} className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[minmax(280px,1fr)_170px_110px_120px_120px_120px_120px] lg:items-center">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white">{order.packageTitle || order.destinationName || 'eSIM Package'}</div>
                  <div className="mt-1 text-xs text-slate-400">#{order.displayOrderId || order.id} | {order.destinationName || 'Global'} | {order.dataAmount} | {order.validity} days</div>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-white/5 p-3 lg:contents lg:border-0 lg:bg-transparent lg:p-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Customer</div>
                  <div className="truncate">{order.customerName || order.customerEmail || 'Workspace Order'}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Quantity</div>
                  <div>{numberText(order.quantity || 1)}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Total Price</div>
                  <div>{money(order.totalPrice ?? order.price)}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Profit</div>
                  <div className="font-semibold text-lime-200">{money(order.profit)}</div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Order Status</div>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-semibold text-slate-200">
                    {titleCaseText(order.status)}
                  </span>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Package Status</div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${order.packageStatus === 'active' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>
                    {titleCaseText(order.packageStatus)}
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

function CustomersDashboard() {
  const { data: stats } = useQuery<any>({ queryKey: ['/api/reseller/stats'] });
  const { data: customersResponse } = useQuery<any>({
    queryKey: ['/api/reseller/customers', { dashboard: true }],
    queryFn: () => fetchDashboardData('/api/reseller/customers?limit=500'),
  });

  const customers = customersResponse?.customers || customersResponse?.data || customersResponse?.items || [];
  const agents = customers.filter((customer: any) => customer.role === 'agent').length;
  const resellers = customers.filter((customer: any) => customer.role === 'reseller').length;
  const users = customers.filter((customer: any) => !customer.role || customer.role === 'customer').length;
  const activeCustomers = customers.filter((customer: any) => customer.status === 'active' || customer.isActive).length;
  const totalOrders = Number(stats?.totals?.totalOrders || 0);
  const completedOrders = Number(stats?.totals?.completedOrders || 0);
  const totalRevenue = Number(stats?.totals?.totalSpend || 0);
  const totalProfit = Number(stats?.totals?.totalProfit || 0);

  return (
    <DashboardShell
      title="Customers Dashboard"
      description="Full statistics and performance for customers, agents, sub resellers, orders, revenue, and reseller profit."
      metrics={[
        { label: 'Total Revenue', value: money(totalRevenue), helper: `${totalOrders} orders tracked`, badge: `${completedOrders} completed`, icon: DollarSign, tone: 'bg-[linear-gradient(115deg,#11233c,#132c5c)]' },
        { label: 'Total Profit', value: money(totalProfit), helper: 'Selling price minus wholesale cost', badge: 'Live margin', icon: TrendingUp, tone: 'bg-[linear-gradient(115deg,#12332d,#1f5a45)]' },
        { label: 'Customers', value: numberText(users), helper: 'Retail user accounts', badge: `${activeCustomers} active`, icon: Users, tone: 'bg-[linear-gradient(115deg,#172642,#243a62)]' },
        { label: 'Agents', value: numberText(agents), helper: 'Managed agent accounts', badge: 'Rate assignment ready', icon: UserPlus, tone: 'bg-[linear-gradient(115deg,#352044,#5a2462)]' },
        { label: 'Sub Resellers', value: numberText(resellers), helper: 'Downstream reseller accounts', badge: 'WhiteLabel network', icon: Server, tone: 'bg-[linear-gradient(115deg,#38251d,#63391f)]' },
        { label: 'Wallet Balance', value: money(stats?.totals?.walletBalance), helper: 'Available reseller funds', badge: `${stats?.totals?.walletTopupCount || 0} top-ups`, icon: Wallet, tone: 'bg-[linear-gradient(115deg,#10243b,#213a68)]' },
      ]}
      quickStats={[
        { label: 'eSIMs Sold', value: numberText(stats?.totals?.totalEsims), icon: Package },
        { label: 'Active Voucher Value', value: money(stats?.totals?.activeVoucherValue), icon: ClipboardList },
        { label: 'Redeemed Voucher Value', value: money(stats?.totals?.redeemedVoucherValue), icon: CheckCircle2 },
        { label: 'Estimated Savings', value: money(stats?.totals?.estimatedSavings), icon: TrendingUp },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-3">
        <DashboardPanel title="Customer Actions" description="Open the common workflows from one place.">
          <div className="grid gap-3">
            {[
              { title: 'Agents', href: '/reseller/customers?role=agent', icon: Users },
              { title: 'Sub Resellers', href: '/reseller/customers?role=reseller', icon: UserPlus },
              { title: 'Users', href: '/reseller/customers?role=customer', icon: Users },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-lime-200" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Recent Orders" description="Latest package purchases through this reseller.">
          <div className="space-y-3">
            {(stats?.recentOrders || []).slice(0, 5).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{order.packageTitle || order.destinationName || 'Package order'}</div>
                  <div className="text-xs text-slate-400">{order.status} | {order.quantity || 1} item</div>
                </div>
                <div className="text-sm font-semibold">{money(order.price)}</div>
              </div>
            ))}
            {!(stats?.recentOrders || []).length && <div className="text-sm text-slate-400">No orders yet.</div>}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Profit Snapshot" description="Margin view for reseller sales.">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-300">Total sales</span><span>{money(totalRevenue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Total profit</span><span>{money(totalProfit)}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Profit rate</span><span>{totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0%'}</span></div>
          </div>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}

function ERoamingDashboard() {
  const { data } = useQuery<any>({ queryKey: ['/api/vonage/dashboard'] });
  const { data: selection } = useQuery<any>({
    queryKey: ['/api/vonage/selection', 'dashboard'],
    queryFn: () => fetchDashboardData('/api/vonage/selection?countryCode=US'),
    enabled: Boolean(data?.enabled),
  });

  const numbers = data?.numbers || (data?.number ? [data.number] : []);
  const activeNumbers = numbers.filter((number: any) => number.status === 'active').length;
  const pendingOrders = data?.application ? 1 : 0;
  const messages = data?.messages || [];
  const monthlyRevenue = numbers.reduce((sum: number, number: any) => sum + Number(number?.subscription?.renewalPrice || number?.pricing?.monthlyFee || 0), 0);
  const monthlyCost = numbers.reduce((sum: number, number: any) => sum + Number(number?.pricing?.monthlyFee || 0), 0);
  const availableStock = selection?.numbers?.length || 0;
  const topCountry = selection?.countries?.[0]?.code || data?.defaultCountry || 'US';

  return (
    <DashboardShell
      title="eRoaming Dashboard"
      description="Full statistics and performance for inventory, profit, pending orders, active assignments, SMS, and voice usage."
      metrics={[
        { label: 'eRoaming Monthly Revenue', value: money(monthlyRevenue), helper: `${numbers.length} numbers in inventory`, badge: `${topCountry} top country`, icon: DollarSign, tone: 'bg-[linear-gradient(115deg,#11233c,#132c5c)]' },
        { label: 'eRoaming Monthly Cost', value: money(monthlyCost), helper: 'Estimated platform service cost', badge: 'Service cost', icon: ClipboardList, tone: 'bg-[linear-gradient(115deg,#3b1f2d,#65232c)]' },
        { label: 'eRoaming Profit', value: money(monthlyRevenue - monthlyCost), helper: 'Revenue minus estimated cost', badge: `${numbers.length} renewals`, icon: TrendingUp, tone: 'bg-[linear-gradient(115deg,#123333,#1f5a54)]' },
        { label: 'Active Numbers', value: numberText(activeNumbers), helper: `${numbers.length} linked inventory rows`, badge: `${activeNumbers} assigned rows`, icon: PhoneCall, tone: 'bg-[linear-gradient(115deg,#123333,#235a4d)]' },
        { label: 'Pending Orders', value: numberText(pendingOrders), helper: 'Manual processing queue', badge: data?.autoAssign ? 'Auto assign on' : 'Manual assign', icon: ShoppingCart, tone: 'bg-[linear-gradient(115deg,#17311f,#2d5a2c)]' },
        { label: 'Available Stock', value: numberText(availableStock), helper: 'Selectable eRoaming numbers', badge: `${topCountry} stock`, icon: Package, tone: 'bg-[linear-gradient(115deg,#38251d,#63391f)]' },
        { label: 'Messages', value: numberText(messages.length), helper: 'Recent number activity', badge: 'SMS history', icon: RadioTower, tone: 'bg-[linear-gradient(115deg,#2f221d,#633719)]' },
        { label: 'Wallet Balance', value: money(data?.walletBalance), helper: 'Used before SMS and voice', badge: data?.billingRole || 'billing', icon: Wallet, tone: 'bg-[linear-gradient(115deg,#172642,#243a62)]' },
      ]}
      quickStats={[
        { label: 'Service Source', value: 'Platform Managed', icon: Server },
        { label: 'Auto Assign', value: data?.autoAssign ? 'On' : 'Off', icon: Activity },
        { label: 'Default Country', value: data?.defaultCountry || 'US', icon: Smartphone },
        { label: 'Premium Inventory Share', value: availableStock ? `${Math.round(((selection?.numbers || []).filter((n: any) => n.isPremium).length / availableStock) * 100)}%` : '0%', icon: TrendingUp },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-3">
        <DashboardPanel title="Profit Snapshot" description="Revenue and margin view for active eRoaming numbers.">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-300">Monthly revenue</span><span>{money(monthlyRevenue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Monthly cost</span><span>{money(monthlyCost)}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Monthly profit</span><span>{money(monthlyRevenue - monthlyCost)}</span></div>
          </div>
        </DashboardPanel>
        <DashboardPanel title="Top Countries" description="Countries with available eRoaming stock.">
          <div className="space-y-3">
            {(selection?.countries || []).slice(0, 6).map((country: any) => (
              <div key={country.code} className="flex justify-between text-sm">
                <span className="text-slate-300">{country.code}</span>
                <span>{numberText(country.count)}</span>
              </div>
            ))}
            {!(selection?.countries || []).length && <div className="text-sm text-slate-400">No inventory loaded.</div>}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Manual Work Queue" description="Pending requests and available stock at a glance.">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-300">Pending requests</span><span>{pendingOrders}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Available inventory</span><span>{availableStock}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Active numbers</span><span>{activeNumbers}</span></div>
            <Link href="/reseller/virtual-numbers">
              <div className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm hover:bg-white/10">
                Open eRoaming workspace <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}

function IptvDashboard() {
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ['/api/iptv/orders'] });
  const { data: catalog } = useQuery<any>({ queryKey: ['/api/iptv/catalog'] });
  const { data: retailPrices = [] } = useQuery<any[]>({ queryKey: ['/api/iptv/retail-prices'] });
  const packages = catalog?.packages || [];
  const activeOrders = orders.filter((order: any) => order.status === 'active').length;
  const failedOrders = orders.filter((order: any) => order.status === 'failed').length;
  const trialOrders = orders.filter((order: any) => order.subscriptionTermType === 'hours' || order.subscriptionMonths === 99).length;
  const renewals = orders.filter((order: any) => Number(order.subscriptionMonths || 0) > 1).length;
  const expiringSoon = orders.filter((order: any) => {
    if (!order.expiresAt) return false;
    const ms = new Date(order.expiresAt).getTime() - Date.now();
    return ms > 0 && ms < 1000 * 60 * 60 * 24 * 7;
  }).length;
  const monthlyTerms = orders.reduce((sum: number, order: any) => sum + Number(order.subscriptionMonths || 0), 0);
  const iptvTotals = calculateIptvProfit(orders, retailPrices);
  const iptvProfit = iptvTotals.revenue - iptvTotals.cost;

  return (
    <DashboardShell
      title="IPTV Services Dashboard"
      description="Full statistics and performance for subscriptions, profit, active users, orders, renewal workload, package visibility, and service health."
      metrics={[
        { label: 'IPTV Revenue', value: money(iptvTotals.revenue), helper: 'Paid and active subscription value', badge: `${orders.length} orders`, icon: DollarSign, tone: 'bg-[linear-gradient(115deg,#11233c,#132c5c)]' },
        { label: 'IPTV Cost', value: money(iptvTotals.cost), helper: 'Estimated platform service cost', badge: 'Service cost', icon: ClipboardList, tone: 'bg-[linear-gradient(115deg,#3b1f2d,#65232c)]' },
        { label: 'IPTV Profit', value: money(iptvProfit), helper: 'Revenue minus service cost', badge: `${iptvTotals.revenue > 0 ? ((iptvProfit / iptvTotals.revenue) * 100).toFixed(1) : '0.0'}% margin`, icon: TrendingUp, tone: 'bg-[linear-gradient(115deg,#123333,#1f5a54)]' },
        { label: 'Total Orders', value: numberText(orders.length), helper: 'All IPTV subscription orders', badge: `${activeOrders} active`, icon: ShoppingCart, tone: 'bg-[linear-gradient(115deg,#11233c,#132c5c)]' },
        { label: 'Active Users', value: numberText(activeOrders), helper: 'Subscriptions currently active', badge: `${expiringSoon} expiring soon`, icon: Users, tone: 'bg-[linear-gradient(115deg,#123333,#235a4d)]' },
        { label: 'Package Catalog', value: numberText(packages.length), helper: 'Visible reseller IPTV packages', badge: catalog?.settings?.enabled ? 'Service enabled' : 'Service off', icon: Tv, tone: 'bg-[linear-gradient(115deg,#352044,#5a2462)]' },
        { label: 'Renewals', value: numberText(renewals), helper: 'Multi-month subscription terms', badge: `${monthlyTerms} total months`, icon: Clock, tone: 'bg-[linear-gradient(115deg,#38251d,#63391f)]' },
        { label: 'Trial Orders', value: numberText(trialOrders), helper: 'Free hour/day subscriptions', badge: catalog?.settings?.allowWebTrial ? 'Trial on' : 'Trial off', icon: CheckCircle2, tone: 'bg-[linear-gradient(115deg,#17311f,#2d5a2c)]' },
        { label: 'Failed Orders', value: numberText(failedOrders), helper: 'Orders needing attention', badge: failedOrders ? 'Review logs' : 'Healthy', icon: AlertCircle, tone: 'bg-[linear-gradient(115deg,#3b1f2d,#65232c)]' },
        { label: 'Service Source', value: 'Managed', helper: 'Platform Managed Service', badge: catalog?.settings?.enabled ? 'Service Ready' : 'Service Paused', icon: Server, tone: 'bg-[linear-gradient(115deg,#10243b,#213a68)]' },
        { label: 'Content Library', value: numberText((catalog?.content?.channels || []).length), helper: 'Channels available in preview', badge: `${(catalog?.content?.movies || []).length} movies`, icon: ListVideo, tone: 'bg-[linear-gradient(115deg,#2f221d,#633719)]' },
      ]}
      quickStats={[
        { label: 'Payment Wallet', value: catalog?.settings?.paymentWalletEnabled ? 'On' : 'Off', icon: Wallet },
        { label: 'PayPal', value: catalog?.settings?.paymentPaypalEnabled ? 'On' : 'Off', icon: DollarSign },
        { label: 'Card', value: catalog?.settings?.paymentCardEnabled ? 'On' : 'Off', icon: Settings },
        { label: 'USDT', value: catalog?.settings?.paymentUsdtEnabled ? 'On' : 'Off', icon: Activity },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-3">
        <DashboardPanel title="IPTV Actions" description="Open the main IPTV workspaces.">
          <div className="grid gap-3">
            {[
              { title: "User's", href: '/reseller/iptv', icon: Tv },
              { title: 'Cost & Price', href: '/reseller/iptv/cost-price', icon: DollarSign },
              { title: "IPTV Log's", href: '/reseller/iptv/logs', icon: ClipboardList },
              { title: "User's List", href: '/reseller/iptv/users-list', icon: Users },
              { title: 'Setting', href: '/reseller/iptv/settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-lime-200" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Recent IPTV Orders" description="Latest subscriptions and service status.">
          <div className="space-y-3">
            {orders.slice(0, 5).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{order.packageName || order.deviceType || 'IPTV subscription'}</div>
                  <div className="text-xs text-slate-400">{order.status} | {order.userEmail || 'No user email'}</div>
                </div>
                <div className="text-sm font-semibold">{order.subscriptionLabel || `${order.subscriptionMonths || 1} mo`}</div>
              </div>
            ))}
            {!orders.length && <div className="text-sm text-slate-400">No IPTV orders yet.</div>}
          </div>
        </DashboardPanel>
        <DashboardPanel title="IPTV Profit Snapshot" description="Revenue, service cost, and margin for IPTV subscriptions.">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-300">IPTV revenue</span><span>{money(iptvTotals.revenue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">IPTV cost</span><span>{money(iptvTotals.cost)}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">IPTV profit</span><span>{money(iptvProfit)}</span></div>
          </div>
        </DashboardPanel>
        <DashboardPanel title="Service Health" description="Operational snapshot for IPTV.">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-300">Enabled</span><span>{catalog?.settings?.enabled ? 'Yes' : 'No'}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Service Ready</span><span>{catalog?.settings?.enabled ? 'Yes' : 'No'}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Promotion</span><span>{catalog?.settings?.specialPromotionEnabled ? 'On' : 'Off'}</span></div>
            <div className="flex justify-between"><span className="text-slate-300">Special offer</span><span>{catalog?.settings?.specialOfferEnabled ? 'On' : 'Off'}</span></div>
          </div>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}

export default function ResellerShell() {
  return (
    <ResellerLayout>
      <Suspense fallback={<div className="p-6 text-foreground">Loading...</div>}>
        <Switch>
          <Route path="/reseller">
            <Redirect to="/reseller/dashboard" />
          </Route>
          <Route path="/reseller/dashboard" component={ResellerDashboard} />
          <Route path="/reseller/statistics" component={ResellerStatistics} />
          <Route path="/reseller/esims/dashboard">
            <ModuleRoute moduleKey="module_master_esim_packages">
              <ESIMDashboard />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/esims/logs">
            <ModuleRoute moduleKey="module_master_esim_packages">
              <ESIMLogs />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/customers/dashboard" component={CustomersDashboard} />
          <Route path="/reseller/virtual-numbers/dashboard">
            <ModuleRoute moduleKey="module_virtual_numbers">
              <ERoamingDashboard />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/iptv/dashboard">
            <ModuleRoute moduleKey="module_iptv_services">
              <IptvDashboard />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/iptv/cost-price">
            <ModuleRoute moduleKey="module_iptv_services">
              <IPTVServices mode="cost-price" />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/iptv/logs">
            <ModuleRoute moduleKey="module_iptv_services">
              <IPTVServices mode="logs" />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/iptv/users-list">
            <ModuleRoute moduleKey="module_iptv_services">
              <IPTVServices mode="users-list" />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/iptv/settings">
            <ModuleRoute moduleKey="module_iptv_services">
              <IPTVServices mode="settings" />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/iptv">
            <ModuleRoute moduleKey="module_iptv_services">
              <IPTVServices />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/virtual-numbers">
            <ModuleRoute moduleKey="module_virtual_numbers">
              <VirtualNumbers />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/storefront">
            <ModuleRoute moduleKey="module_platform_setup">
              <ResellerDashboard />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/price-cost">
            <ModuleRoute moduleKey="module_master_esim_packages">
              <ResellerPriceCost />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/esim-packages">
            <Redirect to="/reseller/esims/dashboard" />
          </Route>
          <Route path="/reseller/resellers-agents-rates">
            <ModuleRoute moduleKey="module_master_esim_packages">
              <ResellerRates />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/rates">
            <Redirect to="/reseller/resellers-agents-rates" />
          </Route>
          <Route path="/reseller/rates-cost">
            <Redirect to="/reseller/resellers-agents-rates" />
          </Route>
          <Route path="/reseller/customers" component={ResellerCustomers} />
          <Route path="/reseller/payment-gateways">
            <ModuleRoute moduleKey="module_platform_setup">
              <ResellerPaymentGateways />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/wallet">
            <WalletPage walletPath="/reseller/wallet" />
          </Route>
          <Route path="/reseller/vouchers/create">
            <ModuleRoute moduleKey="module_vouchers">
              <AccountVouchers
                mode="account"
                createOnly
                listPath="/reseller/vouchers"
                createPath="/reseller/vouchers/create"
                title="Reseller Vouchers"
                description="Create wallet top-up voucher batches with Series#, Serial#, value, and quantity."
              />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/vouchers">
            <ModuleRoute moduleKey="module_vouchers">
              <AccountVouchers
                mode="account"
                listPath="/reseller/vouchers"
                createPath="/reseller/vouchers/create"
                title="Reseller Vouchers"
                description="Create wallet top-up voucher batches with Series#, Serial#, value, and quantity."
              />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/invoices">
            <ModuleRoute moduleKey="module_invoice_system">
              <AccountInvoices
                mode="account"
                title="Reseller Invoices"
                description="Create, send, download, and Track invoices issued from your Reseller brand."
              />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/push-notifications">
            <ModuleRoute moduleKey="module_push_notifications">
              <PushNotifications />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/platform-setup/settings">
            <Redirect to="/reseller/platform-setup/app-stores" />
          </Route>
          <Route path="/reseller/platform-setup/smtp">
            <ModuleRoute moduleKey="module_platform_setup">
              <ResellerStorefrontSmtp />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/platform-setup/currencies">
            <ModuleRoute moduleKey="module_platform_setup">
              <ResellerCurrencies />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/platform-setup/api-docs">
            <ModuleRoute moduleKey="module_platform_setup">
              <ApiDocs />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/platform-setup/faq">
            <ModuleRoute moduleKey="module_platform_setup">
              <FaqManagement />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/platform-setup/pages">
            <ModuleRoute moduleKey="module_platform_setup">
              <PagesManagement />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/platform-setup/banner">
            <ModuleRoute moduleKey="module_platform_setup">
              <BannerManagement />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/platform-setup/failover-settings">
            <ModuleRoute moduleKey="module_platform_setup">
              <FailoverSettings />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/platform-setup/languages">
            <ModuleRoute moduleKey="module_platform_setup">
              <AdminLanguages />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/platform-setup/translations">
            <ModuleRoute moduleKey="module_platform_setup">
              <AdminTranslations />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/platform-setup/:section">
            {(params) => (
              <ModuleRoute moduleKey="module_platform_setup">
                <ResellerStorefrontSection section={String(params.section || 'settings')} />
              </ModuleRoute>
            )}
          </Route>
          <Route path="/reseller/orders">
            <ModuleRoute moduleKey="module_order_management">
              <MyOrders />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/esims">
            <ModuleRoute moduleKey="module_master_esim_packages">
              <Redirect to="/reseller/esims/dashboard" />
            </ModuleRoute>
          </Route>
          <Route path="/reseller/profile" component={Profile} />
          <Route path="/reseller/security/2fa">
            <SecurityCenter section="2fa" />
          </Route>
          <Route path="/reseller/security/ip-logs">
            <SecurityCenter section="ip-logs" />
          </Route>
          <Route path="/reseller/support">
            <ModuleRoute moduleKey="module_support_system">
              <AccountSupport />
            </ModuleRoute>
          </Route>
          <Route>
            <Redirect to="/reseller/dashboard" />
          </Route>
        </Switch>
      </Suspense>
    </ResellerLayout>
  );
}
