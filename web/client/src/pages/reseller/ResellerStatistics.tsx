import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  ChevronDown,
  CircleDollarSign,
  Download,
  Filter,
  Handshake,
  MoreHorizontal,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import WorldMap from '@/components/WorldMap';
import { useUser } from '@/hooks/use-user';
import { useSettingByKey } from '@/hooks/useSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  buildDocumentHtml,
  exportHtmlDocument,
  rowsToHtmlTable,
  type DocumentExportFormat,
} from '@/lib/documentExport';

type ResellerStats = {
  reseller?: {
    email?: string | null;
    name?: string | null;
  };
  totals: {
    totalOrders: number;
    completedOrders: number;
    totalEsims: number;
    totalSpend: number;
    totalProfit: number;
    estimatedSavings: number;
    walletBalance: number;
    walletCredits: number;
    walletDebits: number;
    walletTopupCount: number;
    generatedVouchers: number;
    activeVoucherValue: number;
    redeemedVoucherValue: number;
  };
  monthlySpend: Array<{ month: string; spend: number; orders: number }>;
  totalCustomers?: number;
  customerTypeStats?: {
    customer?: { total: number; totalProfit: number };
    agent?: { total: number; totalProfit: number };
    reseller?: { total: number; totalProfit: number };
  };
  ordersByStatus?: Array<{ status: string; count: number }>;
  topDestinations?: Array<{ country: string; iso2?: string | null; count: number; revenue: number }>;
  ordersByCountry?: Array<{ country: string; iso2: string; count: number }>;
  recentOrders: ResellerOrder[];
  latestOrders?: ResellerOrder[];
};

type ResellerOrder = {
  id: string;
  displayOrderId: number;
  packageTitle?: string | null;
  destinationName?: string | null;
  userEmail?: string | null;
  customerName?: string | null;
  dataAmount: string;
  validity: number;
  price: number;
  quantity: number;
  status: string;
  createdAt: string;
};

interface KpiCardProps {
  title: string;
  value: string;
  trend: number;
  trendLabel: string;
  href: string;
  icon: LucideIcon;
  accentClass: string;
}

const completedStatuses = new Set(['completed', 'ready', 'active', 'paid']);
const failedStatuses = new Set(['failed', 'cancelled', 'refunded']);
const pendingStatuses = new Set(['pending', 'processing', 'provisioning']);
const statusColors = ['#84cc16', '#fb923c', '#38bdf8', '#a78bfa', '#f43f5e', '#94a3b8'];
const cardClass =
  'rounded-[18px] border border-white/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.07)] transition-all duration-200 dark:border-slate-800/80 dark:bg-slate-900/95 dark:shadow-black/25';
const softCardClass =
  'rounded-[14px] border border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60';

const compactCurrency = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function formatCurrency(value: number | undefined, digits = 2) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatCompactCurrency(value: number | undefined) {
  return `$${compactCurrency.format(Number(value || 0))}`;
}

function formatNumber(value: number | undefined) {
  return Number(value || 0).toLocaleString();
}

function normalizeStatus(status: string | undefined) {
  return (status || 'pending').toLowerCase();
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(value: string) {
  return (
    value
      .split(/[ @._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'RS'
  );
}

function formatDate(value: string | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusClass(status: string) {
  const normalized = normalizeStatus(status);
  if (completedStatuses.has(normalized)) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20';
  }
  if (pendingStatuses.has(normalized)) {
    return 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20';
  }
  if (failedStatuses.has(normalized)) {
    return 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20';
  }
  return 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';
}

function TrendText({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex min-w-0 items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
      <Icon className={cn('h-3 w-3 shrink-0', isPositive ? 'text-emerald-500' : 'text-rose-500')} />
      <span className={cn('font-medium', isPositive ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300')}>
        {isPositive ? '+' : '-'}
        {Math.abs(value).toFixed(1)}%
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function KpiCard({ title, value, trend, trendLabel, href, icon: Icon, accentClass }: KpiCardProps) {
  return (
    <Link href={href}>
      <div className={cn(cardClass, 'group cursor-pointer p-4 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)] dark:hover:shadow-black/40')}>
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-normal text-slate-600 dark:text-slate-300">{title}</p>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-[12px]', accentClass)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-8 text-[34px] font-medium leading-none tracking-normal text-slate-950 dark:text-white">
          {value}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <TrendText value={trend} label={trendLabel} />
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-normal text-slate-500 transition group-hover:text-lime-600 dark:text-slate-400 dark:group-hover:text-lime-300">
            Details
            <TrendingUp className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function LogoMark() {
  return (
    <div className="flex h-10 w-10 flex-col justify-center gap-1.5">
      <span className="h-2 w-9 rounded-sm bg-slate-950 dark:bg-white" />
      <span className="h-2 w-11 rounded-sm bg-slate-950 dark:bg-white" />
      <span className="h-2 w-7 self-end rounded-sm bg-slate-950 dark:bg-white" />
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const segments = Array.from({ length: 17 });
  const activeSegments = Math.round((Math.max(0, Math.min(100, value)) / 100) * segments.length);

  return (
    <div className="relative mx-auto mt-8 h-44 max-w-[330px]">
      <div className="absolute left-1/2 top-8 h-28 w-28 -translate-x-1/2 rounded-[18px] bg-white shadow-sm dark:bg-slate-900">
        <div className="absolute -left-6 top-2 flex items-center gap-2 rounded-[14px] bg-white px-3 py-2 text-xs font-medium text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
          {value.toFixed(1)}%
        </div>
      </div>
      {segments.map((_, index) => {
        const angle = -82 + index * (164 / (segments.length - 1));
        const isActive = index < activeSegments;
        const opacity = isActive ? 1 - index * 0.018 : 0.24;
        return (
          <span
            key={index}
            className="absolute bottom-1 left-1/2 h-[86px] w-[26px] origin-bottom rounded-[10px]"
            style={{
              transform: `translateX(-50%) rotate(${angle}deg) translateY(-74px)`,
              backgroundColor: isActive ? `rgba(185, 240, 104, ${opacity})` : 'rgba(148, 163, 184, 0.28)',
            }}
          />
        );
      })}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <div className="text-[34px] font-medium leading-none text-slate-950 dark:text-white">{value.toFixed(1)}%</div>
        <p className="mt-2 text-[11px] font-normal text-slate-500 dark:text-slate-400">Completed Orders</p>
      </div>
    </div>
  );
}

export default function ResellerStatistics() {
  const { user } = useUser();
  const platformName = useSettingByKey('platform_name') || 'AYA eSIM Mobile';
  const resellerName = user?.name || user?.email?.split('@')[0] || 'Reseller';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlyCompleted, setOnlyCompleted] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | 'lifetime'>('lifetime');

  const { data: stats, isLoading } = useQuery<ResellerStats>({
    queryKey: ['/api/reseller/stats'],
  });

  const totals = stats?.totals;
  const allOrders = stats?.latestOrders || stats?.recentOrders || [];
  const availableStatuses = useMemo(
    () =>
      stats?.ordersByStatus?.length
        ? stats.ordersByStatus.map((item) => normalizeStatus(item.status)).sort()
        : Array.from(new Set(allOrders.map((order) => normalizeStatus(order.status)))).sort(),
    [allOrders, stats?.ordersByStatus],
  );

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return allOrders.filter((order) => {
      const status = normalizeStatus(order.status);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesCompleted = !onlyCompleted || completedStatuses.has(status);
      const searchable = [
        order.displayOrderId,
        order.packageTitle,
        order.destinationName,
        order.status,
        order.price,
        order.dataAmount,
        order.validity,
        order.userEmail,
        order.customerName,
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !query || searchable.includes(query);

      return matchesStatus && matchesCompleted && matchesSearch;
    });
  }, [allOrders, onlyCompleted, searchTerm, statusFilter]);

  const totalOrders = Number(totals?.totalOrders || 0);
  const completedOrders = Number(totals?.completedOrders || 0);
  const totalRevenue = Number(totals?.totalSpend || 0);
  const totalProfit = Number(totals?.totalProfit || 0);
  const activeCustomers = Number(stats?.totalCustomers || 0);
  const refundRequests = (stats?.ordersByStatus || [])
    .filter((item) => ['failed', 'cancelled', 'refunded', 'refund_requested'].includes(normalizeStatus(item.status)))
    .reduce((sum, item) => sum + Number(item.count || 0), 0);
  const successRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
  const profitRatio = totalRevenue > 0 ? Math.max(0.08, Math.min(0.92, totalProfit / totalRevenue)) : 0;
  const fallbackMonths = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthData =
    stats?.monthlySpend && stats.monthlySpend.length > 0
      ? stats.monthlySpend.slice(-8).map((item) => ({
          month: item.month,
          profit: Math.max(Number(item.spend || 0) * profitRatio, 0),
          revenue: Math.max(Number(item.spend || 0), 0),
        }))
      : fallbackMonths.map((month) => ({ month, profit: 0, revenue: 0 }));
  const highlightedMonthIndex = Math.min(4, Math.max(0, monthData.length - 1));
  const statusBreakdown = availableStatuses.map((status, index) => {
    const apiCount = stats?.ordersByStatus?.find((item) => normalizeStatus(item.status) === status)?.count;
    return {
      name: titleCase(status),
      value: Number(apiCount ?? allOrders.filter((order) => normalizeStatus(order.status) === status).length),
      color: statusColors[index % statusColors.length],
    };
  });
  const visibleOrders = filteredOrders.slice(0, 6);
  const hasActiveFilters = searchTerm.trim() || statusFilter !== 'all' || onlyCompleted;
  const roleStats = [
    {
      key: 'customer',
      label: 'User Profit',
      display: 'Users',
      total: Number(stats?.customerTypeStats?.customer?.total || activeCustomers || 0),
      profit: Number(stats?.customerTypeStats?.customer?.totalProfit || totalProfit || 0),
      icon: Users,
      color: '#7c63e6',
      iconClass: 'bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
    },
    {
      key: 'agent',
      label: 'Agent Profit',
      display: 'Agents',
      total: Number(stats?.customerTypeStats?.agent?.total || 0),
      profit: Number(stats?.customerTypeStats?.agent?.totalProfit || 0),
      icon: Handshake,
      color: '#22c5d8',
      iconClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300',
    },
    {
      key: 'reseller',
      label: 'Reseller Profit',
      display: 'Resellers',
      total: Number(stats?.customerTypeStats?.reseller?.total || 0),
      profit: Number(stats?.customerTypeStats?.reseller?.totalProfit || 0),
      icon: UserCheck,
      color: '#5d8beb',
      iconClass: 'bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300',
    },
  ];
  const roleProfitTotal = Math.max(roleStats.reduce((sum, item) => sum + Math.max(0, item.profit), 0), 1);

  const navItems = [
    { label: 'Dashboard', href: '/reseller/statistics', active: true },
    { label: 'Sales', href: '/reseller/price-cost' },
    { label: 'Customers', href: '/reseller/customers' },
    { label: 'Reports', href: '/reseller/statistics' },
    { label: 'Orders', href: '/reseller/orders' },
  ];

  const kpiCards: KpiCardProps[] = [
    {
      title: 'Total Sales',
      value: formatNumber(totalOrders),
      trend: 0,
      trendLabel: 'vs Last Week',
      href: '/reseller/orders',
      icon: TrendingUp,
      accentClass: 'bg-lime-100 text-lime-700 dark:bg-lime-400/10 dark:text-lime-300',
    },
    {
      title: 'Total Revenue',
      value: formatCompactCurrency(totalRevenue),
      trend: 0,
      trendLabel: 'vs Last Week',
      href: '/reseller/orders',
      icon: CircleDollarSign,
      accentClass: 'bg-orange-100 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300',
    },
    {
      title: 'Active Customers',
      value: formatNumber(activeCustomers),
      trend: activeCustomers > 0 ? 4 : 0,
      trendLabel: 'New Customers',
      href: '/reseller/customers',
      icon: Users,
      accentClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300',
    },
    {
      title: 'Refund Requests',
      value: formatNumber(refundRequests),
      trend: refundRequests > 0 ? -0.6 : 0,
      trendLabel: 'Needs Review',
      href: '/reseller/orders',
      icon: ShoppingCart,
      accentClass: 'bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
    },
  ];

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setOnlyCompleted(false);
  };

  const exportProfitReport = (format: DocumentExportFormat) => {
    const summaryRows: Array<Array<string | number>> = [
      ['Metric', 'Value'],
      ['Total Sales', totalOrders],
      ['Completed Orders', completedOrders],
      ['Total Revenue', formatCurrency(totalRevenue)],
      ['Total Profit', formatCurrency(totalProfit)],
      ['Wallet Balance', formatCurrency(totals?.walletBalance)],
    ];
    const orderRows: Array<Array<string | number>> = [
      ['Order ID', 'Package', 'Destination', 'Status', 'Amount', 'Created At'],
      ...filteredOrders.map((order) => [
        `#${order.displayOrderId || order.id}`,
        order.packageTitle || 'eSIM Package',
        order.destinationName || 'Global',
        titleCase(order.status || 'pending'),
        formatCurrency(order.price),
        formatDate(order.createdAt),
      ]),
    ];

    const html = buildDocumentHtml({
      title: `${platformName} Reseller Statistics Report`,
      subtitle: `Generated ${new Date().toLocaleString()} by ${resellerName}`,
      sections: [
        { title: 'Summary', html: rowsToHtmlTable(summaryRows) },
        { title: 'Recent Orders', html: rowsToHtmlTable(orderRows) },
      ],
    });

    exportHtmlDocument(html, 'reseller-statistics-report', format);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-b-2 border-lime-400" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading statistics dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 text-slate-950 dark:text-white sm:p-6">
      <div className="mx-auto max-w-[1820px] overflow-hidden rounded-[22px] border border-white/80 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70 dark:shadow-black/30 sm:p-8">
        <header className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <Link href="/reseller/dashboard">
            <div className="flex cursor-pointer items-center gap-4">
              <LogoMark />
              <div className="max-w-[260px] truncate text-[24px] font-medium leading-none">{platformName}</div>
            </div>
          </Link>

          <nav className="flex w-full max-w-[650px] items-center justify-between overflow-x-auto rounded-[18px] border border-white/80 bg-white/90 p-1.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}>
                <button
                  type="button"
                  className={cn(
                    'h-11 shrink-0 rounded-[14px] px-5 text-sm font-normal text-slate-500 transition-colors dark:text-slate-300',
                    item.active
                      ? 'bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 dark:text-slate-950'
                      : 'hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white',
                  )}
                >
                  {item.label}
                </button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/reseller/support">
              <button
                type="button"
                className="relative flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/80 bg-white/90 shadow-sm transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-3.5 top-3 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500 dark:border-slate-900" />
              </button>
            </Link>
            <Link href="/reseller/profile">
              <div className="flex h-12 cursor-pointer items-center gap-3 rounded-[16px] border border-white/80 bg-white/90 px-3 pr-4 shadow-sm transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-slate-100 text-xs font-medium text-slate-950 dark:bg-slate-800 dark:text-white">
                  {initials(resellerName)}
                </div>
                <div className="leading-tight">
                  <div className="max-w-[150px] truncate text-sm font-medium">{resellerName}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Reseller</div>
                </div>
                <ChevronDown className="h-5 w-5" />
              </div>
            </Link>
          </div>
        </header>

        <section className="mt-12 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[28px] font-medium leading-none tracking-normal">Welcome, {resellerName}</h1>
            <p className="mt-2 text-[15px] font-normal text-slate-600 dark:text-slate-300">
              Live Customer, Order, and Profit Performance for your Reseller Store.
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-12 w-fit items-center gap-3 rounded-[16px] border border-white/80 bg-white/90 px-5 text-base font-medium text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-lime-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-slate-100 dark:bg-slate-800">
                  <Download className="h-5 w-5" />
                </span>
                Export Report
                <ChevronDown className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => exportProfitReport('excel')}>
                Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportProfitReport('word')}>
                Word (.doc)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportProfitReport('pdf')}>
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </section>

        <section className="mt-10 grid gap-5 2xl:grid-cols-[680px_minmax(480px,1fr)_470px]">
          <div className="grid gap-5 sm:grid-cols-2">
            {kpiCards.map((card) => (
              <KpiCard key={card.title} {...card} />
            ))}
          </div>

          <div className={cn(cardClass, 'p-6')}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-medium leading-none">Total Profit Overview</h2>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <span className="text-[36px] font-medium leading-none">{formatCurrency(totalProfit)}</span>
                  <span className="rounded-[14px] bg-lime-300 px-3 py-1.5 text-xs font-medium text-slate-950">
                    <span className="flex items-center gap-1">
                      {profitRatio > 0 ? `${(profitRatio * 100).toFixed(1)}%` : '0.0%'}
                      <TrendingUp className="h-3.5 w-3.5" />
                    </span>
                  </span>
                </div>
              </div>
              <Link href="/reseller/orders">
                <button type="button" className="rounded-[12px] p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Open orders">
                  <MoreHorizontal className="h-6 w-6" />
                </button>
              </Link>
            </div>

            <div className="mt-5 flex justify-end gap-5 text-xs font-normal text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-700" />
                Monthly Profit
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-orange-400" />
                Total Revenue
              </span>
            </div>

            <div className="mt-6 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <pattern id="resellerProfitStripe" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(35)">
                      <rect width="8" height="8" fill="#e2e8f0" />
                      <path d="M 0 0 L 0 8" stroke="#f8fafc" strokeWidth="4" />
                    </pattern>
                    <pattern id="resellerOrangeStripe" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(35)">
                      <rect width="8" height="8" fill="#fb923c" />
                      <path d="M 0 0 L 0 8" stroke="#fdba74" strokeWidth="4" />
                    </pattern>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#dbe3ea" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(132, 204, 22, 0.08)' }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'profit' ? 'Profit' : 'Revenue']}
                    labelStyle={{ color: '#0f172a', fontWeight: 700 }}
                    contentStyle={{ border: '0', borderRadius: 14, boxShadow: '0 14px 35px rgba(15, 23, 42, 0.14)' }}
                  />
                  <Bar dataKey="profit" radius={[7, 7, 0, 0]} barSize={34} fill="url(#resellerProfitStripe)" />
                  <Bar dataKey="revenue" radius={[7, 7, 0, 0]} barSize={34}>
                    {monthData.map((_, index) => (
                      <Cell key={index} fill={index === highlightedMonthIndex ? 'url(#resellerOrangeStripe)' : 'rgba(148, 163, 184, 0.18)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cn(cardClass, 'p-6')}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-[22px] font-medium leading-none">Success Rate</h2>
              <Link href="/reseller/orders">
                <button type="button" className="rounded-[12px] p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Open orders">
                  <MoreHorizontal className="h-6 w-6" />
                </button>
              </Link>
            </div>

            <Gauge value={successRate} />

            <div className="mt-7 grid grid-cols-2 gap-4">
              <Link href="/reseller/orders">
                <div className={cn(softCardClass, 'cursor-pointer p-4 transition hover:-translate-y-0.5')}>
                  <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-[10px] bg-white dark:bg-slate-900">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Sales Number</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <span className="text-[32px] font-medium">{formatNumber(totalOrders)}</span>
                    <span className="flex items-center gap-1 rounded-[12px] bg-lime-300 px-2 py-1 text-[10px] font-medium text-slate-950">
                      {successRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Link>

              <Link href="/reseller/orders">
                <div className={cn(softCardClass, 'cursor-pointer p-4 transition hover:-translate-y-0.5')}>
                  <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-[10px] bg-white dark:bg-slate-900">
                    <CircleDollarSign className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Total Revenue</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <span className="text-[32px] font-medium">{formatCompactCurrency(totalRevenue)}</span>
                    <span className="rounded-[12px] bg-orange-400 px-2 py-1 text-[10px] font-medium text-white">
                      Live
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 2xl:grid-cols-[1.85fr_1fr]">
          <div className={cn(cardClass, 'p-6')}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[22px] font-medium leading-none">Recent Orders</h2>
                <p className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                  Showing {visibleOrders.length} of {filteredOrders.length} Matched Orders
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <label className="flex h-11 min-w-[240px] items-center gap-3 rounded-[14px] border border-slate-200 bg-white/80 px-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search orders"
                    className="w-full bg-transparent text-xs font-normal outline-none placeholder:text-slate-400"
                  />
                </label>

                <label className="relative flex h-11 min-w-[160px] items-center rounded-[14px] border border-slate-200 bg-white/80 px-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full appearance-none bg-transparent pr-7 text-xs font-normal outline-none"
                    aria-label="Filter by order status"
                  >
                    <option value="all">All Status</option>
                    {availableStatuses.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-slate-400" />
                </label>

                <button
                  type="button"
                  onClick={() => setOnlyCompleted((current) => !current)}
                  className={cn(
                    'flex h-11 items-center gap-3 rounded-[14px] border px-4 text-xs font-normal transition',
                    onlyCompleted
                      ? 'border-lime-300 bg-lime-300 text-slate-950'
                      : 'border-slate-200 bg-white/80 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:bg-slate-800',
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Completed
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex h-11 items-center gap-2 rounded-[14px] border border-slate-200 bg-white/80 px-4 text-xs font-normal transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="mt-7 overflow-x-auto rounded-[14px] border border-slate-200 dark:border-slate-800">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[48px_110px_1.6fr_1.1fr_120px_110px_120px_70px] bg-slate-50 px-5 py-4 text-xs font-medium text-slate-600 dark:bg-slate-950/70 dark:text-slate-300">
                  <span className="h-5 w-5 rounded border border-slate-300 dark:border-slate-700" />
                  <span>Order ID</span>
                  <span>Product Name</span>
                  <span>Customer</span>
                  <span>Date</span>
                  <span>Payment</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>

                {visibleOrders.length > 0 ? (
                  visibleOrders.map((order, index) => (
                    <div
                      key={order.id || index}
                      className="grid grid-cols-[48px_110px_1.6fr_1.1fr_120px_110px_120px_70px] items-center border-t border-slate-100 px-5 py-4 text-xs transition hover:bg-lime-50/60 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <span className="h-5 w-5 rounded border border-slate-300 dark:border-slate-700" />
                      <span className="font-medium">#{order.displayOrderId || index + 1}</span>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-slate-100 text-[10px] font-medium dark:bg-slate-800">
                          {initials(order.packageTitle || 'ES')}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{order.packageTitle || 'eSIM Package'}</p>
                          <p className="truncate text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            {order.destinationName || 'Global'} - {formatCurrency(order.price)}
                          </p>
                        </div>
                      </div>
                      <span className="truncate">{order.userEmail || order.customerName || 'Store Customer'}</span>
                      <span>{formatDate(order.createdAt)}</span>
                      <span>Wallet</span>
                      <span>
                        <span className={cn('rounded-[12px] px-3 py-1.5 text-[10px] font-medium ring-1', statusClass(order.status))}>
                          {titleCase(order.status || 'pending')}
                        </span>
                      </span>
                      <Link href="/reseller/orders">
                        <button type="button" className="rounded-[12px] p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="View order">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    No orders match the selected filters.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={cn(cardClass, 'p-6')}>
            <div className="mb-7 flex items-start justify-between gap-4">
              <h2 className="text-[22px] font-medium leading-none">Sales Overview</h2>
              <Link href="/reseller/customers">
                <button type="button" className="rounded-[12px] p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Open customers">
                  <MoreHorizontal className="h-6 w-6" />
                </button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {roleStats.map((item) => {
                const percent = (Math.max(0, item.profit) / roleProfitTotal) * 100;
                return (
                  <div key={item.key} className="rounded-[14px] p-2">
                    <div className="flex items-center gap-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                      <span className="h-4 w-4 rounded" style={{ backgroundColor: item.color }} />
                      {item.display}
                    </div>
                    <div className="mt-3 text-[22px] font-medium leading-none">{percent.toFixed(2)}%</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex gap-2">
              {roleStats.map((item) => (
                <div key={item.key} className="flex flex-1 gap-1">
                  {Array.from({ length: 18 }).map((_, index) => (
                    <span
                      key={index}
                      className="h-12 flex-1 rounded-[12px]"
                      style={{
                        backgroundColor: item.color,
                        opacity: 0.95 - index * 0.018,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-[1.5fr_0.7fr_1fr] gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Account Type</span>
              <span>Percent</span>
              <span className="text-right">Amount</span>
            </div>

            <div className="mt-5 space-y-5">
              {roleStats.map((item) => {
                const Icon = item.icon;
                const percent = (Math.max(0, item.profit) / roleProfitTotal) * 100;
                return (
                  <Link key={item.key} href="/reseller/customers">
                    <div className="grid cursor-pointer grid-cols-[1.5fr_0.7fr_1fr] items-center gap-4 rounded-[14px] p-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]', item.iconClass)}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="block truncate text-sm font-medium">
                          {item.label}
                          <span className="mt-0.5 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            {formatNumber(item.total)} Accounts
                          </span>
                        </span>
                      </div>
                      <span className="text-sm font-medium">{percent.toFixed(0)}%</span>
                      <span className="text-right text-sm font-medium">{formatCurrency(item.profit, 0)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <div className={cn(cardClass, 'p-6')}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-[22px] font-medium leading-none">Revenue Trend</h2>
                <p className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                  Monthly Revenue and Profit Performance
                </p>
              </div>
              <Link href="/reseller/orders">
                <button type="button" className="rounded-[12px] p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Open orders">
                  <MoreHorizontal className="h-6 w-6" />
                </button>
              </Link>
            </div>

            <div className="mt-7 h-[330px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthData} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="rgba(148, 163, 184, 0.28)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip
                    cursor={{ stroke: '#84cc16', strokeDasharray: '4 4' }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'profit' ? 'Profit' : 'Revenue']}
                    labelStyle={{ color: '#0f172a', fontWeight: 700 }}
                    contentStyle={{ border: '0', borderRadius: 14, boxShadow: '0 14px 35px rgba(15, 23, 42, 0.14)' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#fb923c" strokeWidth={3} dot={{ r: 4, fill: '#fb923c', strokeWidth: 0 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="profit" stroke="#84cc16" strokeWidth={3} dot={{ r: 4, fill: '#84cc16', strokeWidth: 0 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cn(cardClass, 'p-6')}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-medium leading-none">Order Status</h2>
                <p className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400">Live distribution overview</p>
              </div>
              <Link href="/reseller/orders">
                <button type="button" className="rounded-[12px] p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Open orders">
                  <MoreHorizontal className="h-6 w-6" />
                </button>
              </Link>
            </div>

            <div className="mt-7 h-[260px]">
              {statusBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={62} outerRadius={96} paddingAngle={4} dataKey="value">
                      {statusBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatNumber(value), 'Orders']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No order status data yet.
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {statusBreakdown.map((item) => (
                <div key={item.name} className={cn(softCardClass, 'flex items-center justify-between gap-3 px-4 py-3')}>
                  <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="text-xs font-medium">{formatNumber(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <WorldMap
            data={stats?.ordersByCountry || []}
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
          />

          <div className={cn(cardClass, 'p-6')}>
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-medium leading-none">Top Destinations</h2>
                <p className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400">Most popular packages by country</p>
              </div>
              <Link href="/reseller/orders">
                <button type="button" className="rounded-[12px] p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Open orders">
                  <MoreHorizontal className="h-6 w-6" />
                </button>
              </Link>
            </div>

            <div className="space-y-3">
              {(stats?.topDestinations || []).length > 0 ? (
                stats?.topDestinations?.map((destination) => (
                  <Link key={`${destination.country}-${destination.iso2 || 'xx'}`} href="/reseller/orders">
                    <div className="flex cursor-pointer items-center justify-between gap-4 rounded-[14px] border border-slate-100 bg-slate-50/70 px-4 py-3 transition hover:-translate-y-0.5 hover:bg-lime-50 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-slate-800/70">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-slate-200 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-white">
                          {(destination.iso2 || destination.country || 'GL').slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{destination.country || 'Global'}</p>
                          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            {formatNumber(destination.count)} Orders
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                          {formatCurrency(destination.revenue)}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Revenue</p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[14px] border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  Destination data will appear after reseller orders are placed.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
