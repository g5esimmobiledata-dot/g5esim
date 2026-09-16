import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  MessageSquare,
  BarChart3,
  Settings,
  Code,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Shield,
  Plus,
  Server,
  Star,
  Gift,
  TrendingUp,
  Send,
  RefreshCw,
  ChevronDown,
  Globe,
  MapPin,
  Megaphone,
  Headphones,
  Smartphone,
  Cog,
  DollarSign,
  Languages,
  FileText,
  Image,
  CreditCard,
  Zap,
  UserCheck,
  Cpu,
  Map,
  Ticket,
  UserPlus,
  LifeBuoy,
  Wallet,
  Tags,
  Activity,
  Layout,
  HelpCircle,
  Newspaper,
  ClipboardList,
  Layers,
  SlidersHorizontal,
  Award,
  Phone,
  Tv,
  ListVideo,
} from 'lucide-react';
import { useState, useEffect, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/use-admin';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettingByKey } from '@/hooks/useSettings';
import { version as appVersion } from '../../../../package.json';
import { SEOHead } from '../SEOHead';

declare const __APP_BUILD_TIME__: string;

type NavItem = {
  name: string;
  href: string;
  icon: any;
  children?: NavItem[];
};

type NavGroup = {
  groupName: string;
  icon: any;
  items: NavItem[];
  manualOpenOnly?: boolean;
};

type NavigationEntry = NavItem | NavGroup;





// const navigation: NavigationEntry[] = [
//   { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
//   {
//     groupName: 'Order Management',
//     icon: ShoppingCart,
//     items: [
//       { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
//       { name: 'Custom Orders', href: '/admin/manual-orders', icon: Package },
//       { name: 'Top-up Orders', href: '/admin/topups', icon: Plus },
//     ],
//   },
//   {
//     groupName: 'User Management',
//     icon: Users,
//     items: [
//       { name: 'Customers', href: '/admin/customers', icon: Users },
//       { name: 'KYC Verification', href: '/admin/kyc', icon: Shield },
//     ],
//   },
//   {
//     groupName: 'Master eSIM Packages',
//     icon: Smartphone,
//     items: [
//       { name: 'Providers', href: '/admin/providers', icon: Server },
//       { name: 'eSIM Catalog', href: '/admin/unified-packages', icon: Package },
//       { name: 'Topup Packages', href: '/admin/master-topups', icon: RefreshCw },
//       { name: 'Regions', href: '/admin/master-regions', icon: Globe },
//       { name: 'Countries', href: '/admin/master-countries', icon: MapPin },
//     ],
//   },
//   {
//     groupName: 'Marketing',
//     icon: Megaphone,
//     items: [
//       { name: 'Vouchers', href: '/admin/vouchers', icon: Gift },
//       { name: 'Gift Cards', href: '/admin/gift-cards', icon: Gift },
//       { name: 'Referral Program', href: '/admin/referrals', icon: Gift },
//       // { name: 'Email Marketing', href: '/admin/email-marketing', icon: Send },
//     ],
//   },
//   {
//     groupName: 'Support System',
//     icon: Headphones,
//     items: [{ name: 'Support', href: '/admin/tickets', icon: MessageSquare }],
//   },
//   {
//     groupName: 'In App Purchases',
//     icon: CreditCard,
//     items: [{ name: 'Price Brackets', href: '/admin/price-brackets', icon: CreditCard }],
//   },
//   {
//     groupName: 'Payment Gateways',
//     icon: CreditCard,
//     items: [{ name: 'Gateways', href: '/admin/payment-gateway', icon: CreditCard }],
//   },
//   {
//     groupName: 'Alerts',
//     icon: Bell,
//     items: [
//       { name: 'Notifications', href: '/admin/notifications', icon: Bell },
//       // { name: 'Email Templates', href: '/admin/email-templates', icon: Mail },
//     ],
//   },
//   {
//     groupName: 'Reporting',
//     icon: BarChart3,
//     items: [
//       { name: 'Analytics & Reports', href: '/admin/analytics', icon: BarChart3 },
//       { name: 'Advanced Analytics', href: '/admin/advanced-analytics', icon: TrendingUp },
//       { name: 'Reviews', href: '/admin/reviews', icon: Star },
//     ],
//   },
//   {
//     groupName: 'Platform Setup',
//     icon: Cog,
//     items: [
//       { name: 'Settings', href: '/admin/settings', icon: Settings },
//       { name: 'Currencies', href: '/admin/currencies', icon: DollarSign },
//       { name: 'Failover & API', href: '/admin/failover-settings', icon: Shield },
//       { name: 'Banner Management', href: '/admin/banner-management', icon: Image },
//       { name: 'Pages Management', href: '/admin/pages', icon: FileText },
//       { name: 'FAQ Management', href: '/admin/faq-management', icon: FileText },
//       // { name: "Privacy Policy", href:"/admin/privacy-policy", icon: FileText},
//       // { name: "Terms & Conditions", href:"/admin/terms-conditions", icon: FileText}
//     ],
//   },
//   {
//     groupName: 'Internationalization',
//     icon: Languages,
//     items: [
//       { name: 'Languages', href: '/admin/languages', icon: Globe },
//       { name: 'Translations', href: '/admin/translations', icon: FileText },
//     ],
//   },
//   // { name: 'Enterprise', href: '/admin/enterprise', icon: Users },
//   { name: 'Blog', href: '/admin/blog', icon: MessageSquare },
//   { name: 'API Docs', href: '/admin/api-docs', icon: Code },
// ];










export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
  //   getInitialExpandedGroups(location),
  // );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedSubmenus, setExpandedSubmenus] = useState<Record<string, boolean>>({});
  const { user, refetchUser } = useAdmin();
  const { theme, adminTheme } = useTheme();
  const { t, isRTL } = useTranslation();
  const { toast } = useToast();
  const sitename = useSettingByKey('platform_name')
  const isCustomerCreatePage = /^\/admin\/customers\/(users|agents|resellers)\/create\/?$/.test(location);
  const isKycPage = /^\/admin\/kyc\/?$/.test(location);
  const { data: transactionProviders } = useQuery<{
    esimProviders: Array<{ id: string; name: string; slug: string; enabled?: boolean }>;
    virtualNumberProviders: Array<{ id: string; name: string; slug: string }>;
  }>({
    queryKey: ['/api/admin/transactions/providers'],
    staleTime: 60_000,
  });

  function isNavGroup(entry: NavigationEntry): entry is NavGroup {
    return 'groupName' in entry;
  }
  const navigation: NavigationEntry[] = [
    { name: t('adminPanel.nav.dashboard', 'Dashboard'), href: '/admin/dashboard', icon: LayoutDashboard },
    { name: t('adminPanel.nav.statistics', 'Statistics'), href: '/admin/statistics', icon: BarChart3 },

    {
      groupName: t('adminPanel.nav.customers', 'Customers'),
      icon: Users,
      items: [
        { name: t('adminPanel.nav.users', 'User'), href: '/admin/customers/users', icon: Users },
        { name: t('adminPanel.nav.agents', 'Agent'), href: '/admin/customers/agents', icon: Headphones },
        { name: t('adminPanel.nav.resellers', 'Reseller'), href: '/admin/customers/resellers', icon: UserPlus },
        { name: t('adminPanel.nav.kycVerification', 'KYC Verification'), href: '/admin/kyc', icon: UserCheck },
      ],
    },

    {
      groupName: t('adminPanel.nav.transactions', 'Transactions'),
      icon: Wallet,
      items: [
        { name: t('adminPanel.nav.eroamingTransactions', 'eRoaming Transactions'), href: '/admin/transactions/virtual/all', icon: Phone },
        ...((transactionProviders?.virtualNumberProviders || [{ id: 'vonage', name: 'Vonage', slug: 'vonage' }]).map((provider) => ({
          name: provider.name,
          href: provider.slug === 'vonage' ? '/admin/transactions/vonage' : `/admin/transactions/virtual/${provider.slug}`,
          icon: Phone,
        }))),
        { name: t('adminPanel.nav.customers', 'Customers'), href: '/admin/transactions/customers', icon: ClipboardList },
        { name: t('adminPanel.nav.voucherLogs', "Vouchers Log's"), href: '/admin/transactions/vouchers', icon: Ticket },
        { name: t('adminPanel.nav.allEsimProviders', 'All eSIM Providers'), href: '/admin/transactions/esim/all', icon: Smartphone },
        ...((transactionProviders?.esimProviders || []).map((provider) => ({
          name: provider.name,
          href: `/admin/transactions/esim/${provider.slug}`,
          icon: Server,
        }))),
      ],
    },

    {
      groupName: t('adminPanel.nav.orderManagement', 'Order Management'),
      icon: ShoppingCart,
      manualOpenOnly: true,
      items: [
        { name: t('adminPanel.nav.orders', 'Orders'), href: '/admin/orders', icon: ShoppingCart },
        { name: t('adminPanel.nav.customOrders', 'Custom Orders'), href: '/admin/manual-orders', icon: ClipboardList },
        { name: t('adminPanel.nav.topupOrders', 'Top-up Orders'), href: '/admin/topups', icon: Zap },
      ],
    },

    {
      groupName: t('adminPanel.nav.masterEsimPackages', 'Master eSIM Packages'),
      icon: Smartphone,
      items: [
        { name: t('adminPanel.nav.providers', 'Providers'), href: '/admin/providers', icon: Server },
        { name: t('adminPanel.nav.esimCatalog', 'eSIM Catalog'), href: '/admin/unified-packages', icon: Cpu },
        { name: t('adminPanel.nav.rates', 'Rates'), href: '/admin/rates', icon: Layers },
        { name: t('adminPanel.nav.topupPackages', 'Topup Packages'), href: '/admin/master-topups', icon: RefreshCw },
        { name: t('adminPanel.nav.regions', 'Regions'), href: '/admin/master-regions', icon: Map },
        { name: t('adminPanel.nav.countries', 'Countries'), href: '/admin/master-countries', icon: MapPin },
      ],
    },

    {
      groupName: t('adminPanel.nav.marketing', 'Marketing'),
      icon: Megaphone,
      items: [
        { name: t('adminPanel.nav.vouchers', 'Vouchers'), href: '/admin/vouchers', icon: Ticket },
        { name: t('adminPanel.nav.giftCards', 'Gift Cards'), href: '/admin/gift-cards', icon: CreditCard },
        { name: t('adminPanel.nav.referrals', 'Referral Program'), href: '/admin/referrals', icon: UserPlus },
        { name: t('adminPanel.nav.memberRewards', 'Member Rewards'), href: '/admin/member-rewards', icon: Award },
        { name: t('adminPanel.nav.pushNotifications', 'Push Notifications'), href: '/admin/push-notifications', icon: Smartphone },
      ],
    },

    {
      groupName: t('adminPanel.nav.supportSystem', 'Support System'),
      icon: Headphones,
      items: [
        { name: t('adminPanel.nav.support', 'Support'), href: '/admin/tickets', icon: LifeBuoy },
        { name: t('adminPanel.nav.concierge', 'Concierge'), href: '/admin/concierge', icon: Headphones },
      ],
    },

    {
      groupName: t('adminPanel.nav.eroaming', "eRoaming's"),
      icon: Phone,
      items: [
        { name: t('adminPanel.nav.dashboard', 'Dashboard'), href: '/admin/virtual-numbers/dashboard', icon: LayoutDashboard },
        { name: t('adminPanel.nav.providers', 'Providers'), href: '/admin/virtual-numbers/providers', icon: Server },
        { name: t('adminPanel.nav.didNumbers', 'DID Numbers'), href: '/admin/virtual-numbers/numbers', icon: Phone },
        { name: t('adminPanel.nav.boughtDids', "Bought DID's"), href: '/admin/virtual-numbers/bought-dids', icon: ShoppingCart },
        { name: t('adminPanel.nav.costPrice', 'Cost & Price'), href: '/admin/virtual-numbers/cost-price', icon: DollarSign },
        { name: t('adminPanel.nav.logsPurchase', 'Logs & Purchase'), href: '/admin/virtual-numbers/logs', icon: ClipboardList },
        { name: t('adminPanel.nav.pending', 'Pending'), href: '/admin/virtual-numbers/pending', icon: Ticket },
        { name: t('adminPanel.nav.active', 'Active'), href: '/admin/virtual-numbers/active', icon: Activity },
      ],
    },

    {
      groupName: t('adminPanel.nav.debitCards', 'Debit Cards'),
      icon: CreditCard,
      items: [
        { name: 'PagoCards', href: '/admin/debit-cards', icon: CreditCard },
        { name: 'Sudo Africa', href: '/admin/debit-cards/sudo-africa', icon: CreditCard },
      ],
    },

    {
      groupName: t('adminPanel.nav.iptvServices', 'IPTV Services'),
      icon: Tv,
      items: [
        { name: t('adminPanel.nav.iptvProvider', 'IPTV Provider'), href: '/admin/iptv/provider', icon: Tv },
        { name: t('adminPanel.nav.bouquets', 'Bouquets'), href: '/admin/iptv/bouquets', icon: Server },
        { name: t('adminPanel.nav.costPrice', 'Cost & Price'), href: '/admin/iptv/cost-price', icon: DollarSign },
        { name: t('adminPanel.nav.channels', 'Channels'), href: '/admin/iptv/channels', icon: ListVideo },
        { name: t('adminPanel.nav.iptvLogs', "IPTV Log's"), href: '/admin/iptv/orders', icon: ClipboardList },
        { name: t('adminPanel.nav.userList', 'User List'), href: '/admin/iptv/users', icon: Users },
        { name: t('adminPanel.nav.setting', 'Setting'), href: '/admin/iptv/settings', icon: Settings },
      ],
    },

    {
      groupName: t('adminPanel.nav.inAppPurchases', 'In App Purchases'),
      icon: Wallet,
      items: [
        { name: t('adminPanel.nav.priceBrackets', 'Price Brackets'), href: '/admin/price-brackets', icon: Tags },
      ],
    },

    {
      groupName: t('adminPanel.nav.paymentGateways', 'Payment Gateways'),
      icon: CreditCard,
      items: [
        { name: t('adminPanel.nav.gateways', 'Gateways'), href: '/admin/payment-gateway', icon: CreditCard },
      ],
    },

    {
      groupName: t('adminPanel.nav.reportInvoice', 'Report & Invoice'),
      icon: BarChart3,
      items: [
        { name: t('adminPanel.nav.analyticsReports', 'Analytics & Reports'), href: '/admin/analytics', icon: BarChart3 },
        { name: t('adminPanel.nav.advancedAnalytics', 'Advanced'), href: '/admin/advanced-analytics', icon: TrendingUp },
        { name: t('adminPanel.nav.invoices', 'Invoices'), href: '/admin/invoices', icon: FileText },
        { name: t('adminPanel.nav.reviews', 'Reviews'), href: '/admin/reviews', icon: Star },
      ],
    },

    {
      groupName: t('adminPanel.nav.extra', 'Extra'),
      icon: Plus,
      manualOpenOnly: true,
      items: [
        { name: t('adminPanel.nav.eroamingSipUsers', 'eRoaming SIP Users'), href: '/admin/sip-users', icon: Users },
        {
          name: t('adminPanel.nav.sipConfiguration', 'SIP Configuration'),
          href: '/admin/sip-configuration',
          icon: Phone,
          children: [
            { name: t('adminPanel.nav.sipSettings', 'SIP Settings'), href: '/admin/sip-configuration', icon: Settings },
            { name: t('adminPanel.nav.sipTariffs', "Tariff's"), href: '/admin/sip-configuration/tariffs', icon: Tags },
            { name: t('adminPanel.nav.sipRegistrationProfile', 'Registration Profile'), href: '/admin/sip-configuration/registration-profiles', icon: UserCheck },
          ],
        },
        { name: t('adminPanel.nav.notifications', 'Notifications'), href: '/admin/notifications', icon: Bell },
        {
          name: t('adminPanel.nav.security', 'Security'),
          href: '/admin/security/2fa',
          icon: Shield,
          children: [
            { name: t('adminPanel.nav.twoFactor', '2FA'), href: '/admin/security/2fa', icon: Shield },
            { name: t('adminPanel.nav.ipLogs', "IP Log's"), href: '/admin/security/ip-logs', icon: Activity },
          ],
        },
        {
          name: t('adminPanel.nav.internationalization', 'International'),
          href: '/admin/languages',
          icon: Languages,
          children: [
            { name: t('adminPanel.nav.languages', 'Languages'), href: '/admin/languages', icon: Globe },
            { name: t('adminPanel.nav.translations', 'Translations'), href: '/admin/translations', icon: FileText },
          ],
        },
      ],
    },

    {
      groupName: t('adminPanel.nav.platformSetup', 'Platform Setup'),
      icon: Cog,
      items: [
        { name: t('adminPanel.nav.settings', 'Settings'), href: '/admin/settings', icon: Settings },
        { name: t('adminPanel.nav.features', 'Features'), href: '/admin/options', icon: SlidersHorizontal },
        { name: t('adminPanel.nav.modules', 'Modules'), href: '/admin/modules', icon: SlidersHorizontal },
        { name: t('adminPanel.nav.currencies', 'Currencies'), href: '/admin/currencies', icon: DollarSign },
        { name: t('adminPanel.nav.failoverApi', 'Failover & API'), href: '/admin/failover-settings', icon: Activity },
        { name: t('adminPanel.nav.bannerManagement', 'Banner Management'), href: '/admin/banner-management', icon: Image },
        { name: t('adminPanel.nav.pagesManagement', 'Pages Management'), href: '/admin/pages', icon: Layout },
        { name: t('adminPanel.nav.faqManagement', 'FAQ Management'), href: '/admin/faq-management', icon: HelpCircle },
        { name: t('adminPanel.nav.blog', 'Blog'), href: '/admin/blog', icon: Newspaper },
        { name: t('adminPanel.nav.apiDocs', 'API Docs'), href: '/admin/api-docs', icon: Code },
      ],
    },

  ];


  useEffect(() => {
    setExpandedGroups(getInitialExpandedGroups(location));
    setExpandedSubmenus(getInitialExpandedSubmenus(location));
  }, [location]);

  function normalizePath(path: string): string {
    return path.split('?')[0].replace(/\/+$/, '') || '/';
  }

  function isItemActive(item: NavItem, currentPath: string): boolean {
    const current = normalizePath(currentPath);
    const itemPath = normalizePath(item.href);
    return current === itemPath || Boolean(item.children?.some((child) => isItemActive(child, currentPath)));
  }

  function flattenNavItems(items: NavItem[]): NavItem[] {
    return items.flatMap((item) => [item, ...(item.children ? flattenNavItems(item.children) : [])]);
  }

  function getInitialExpandedGroups(currentPath: string): Record<string, boolean> {
    const expanded: Record<string, boolean> = {};
    for (const entry of navigation) {
      if (isNavGroup(entry)) {
        if (entry.manualOpenOnly) continue;
        const isActive = entry.items.some((item) => isItemActive(item, currentPath));
        if (isActive) {
          expanded[entry.groupName] = true;
        }
      }
    }
    return expanded;
  }

  function getInitialExpandedSubmenus(currentPath: string): Record<string, boolean> {
    const expanded: Record<string, boolean> = {};
    for (const entry of navigation) {
      if (!isNavGroup(entry)) continue;
      for (const item of entry.items) {
        if (item.children?.some((child) => isItemActive(child, currentPath))) {
          expanded[`${entry.groupName}:${item.name}`] = true;
        }
      }
    }
    return expanded;
  }

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const toggleSubmenu = (submenuKey: string) => {
    setExpandedSubmenus((prev) => ({
      ...prev,
      [submenuKey]: !prev[submenuKey],
    }));
  };

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/admin/logout', {});

      // React Query admin cache clean
      queryClient.setQueryData(['/api/admin/me'], null);
      refetchUser();

      setLocation('/admin/login');

      toast({
        title: t('common.success'),
        description: 'Logged out successfully',
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: 'Failed to logout',
        variant: 'destructive',
      });
    }
  };

  const currentPath = location;
  const allNavItems = navigation.flatMap((entry) => (isNavGroup(entry) ? flattenNavItems(entry.items) : [entry]));
  const activeNavItem = allNavItems.find((item) => isItemActive(item, currentPath));
  const pageTitle = activeNavItem ? activeNavItem.name : t('adminPanel.nav.adminPanel', 'Admin Panel');
  const isDarkTheme = theme === 'dark';
  const adminModeClass = adminTheme === 'half-dark' ? 'half-dark' : adminTheme;

  return (
    <div
      className={cn(
        'admin-shell min-h-screen transition-colors duration-200',
        adminModeClass,
        `admin-mode-${adminTheme}`,
        isRTL ? 'admin-rtl' : 'admin-ltr',
        isDarkTheme
          ? 'dark bg-[linear-gradient(180deg,#0b1730_0%,#071126_18rem,#071126_100%)] text-white'
          : 'light bg-[linear-gradient(180deg,#f8fafc_0%,#eef4fb_18rem,#f8fafc_100%)] text-slate-950',
      )}
    >
      <SEOHead
        title={pageTitle}
        description={`Manage ${sitename} platform - ${pageTitle}`}
        noIndex={true}
        noFollow={true}
      />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 z-50 flex h-screen w-64 transform flex-col backdrop-blur-xl transition-all duration-300 ease-in-out lg:translate-x-0',
          isRTL ? 'right-0 border-l' : 'left-0 border-r',
          isDarkTheme
            ? 'border-blue-300/10 bg-[#0b1226]/95 text-white shadow-2xl shadow-black/30'
            : 'border-slate-200 bg-white/95 text-slate-950 shadow-2xl shadow-slate-200/60',
          sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full',
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-blue-300/10 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-slate-950 dark:text-white">{t('adminPanel.nav.adminPanel', 'Admin Panel')}</h1>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{sitename}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            data-testid="button-close-sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="dark-blue-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map((entry, index) => {
            if (isNavGroup(entry)) {
              const isGroupActive = entry.items.some((item) => isItemActive(item, location));
              const isExpanded = expandedGroups[entry.groupName] ?? false;
              return (
                <div key={entry.groupName} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(entry.groupName)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/35',
                      isGroupActive
                        ? 'border-lime-200/60 bg-lime-50 text-lime-800 dark:border-lime-300/35 dark:bg-lime-300/10 dark:text-lime-200'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/80 dark:hover:text-slate-100',
                    )}
                    data-testid={`group-${entry.groupName.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <entry.icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isGroupActive ? 'text-lime-600 dark:text-lime-300' : 'text-slate-400 dark:text-slate-500',
                        )}
                      />
                      <span className="admin-main-menu-label truncate uppercase">{entry.groupName}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500',
                        isExpanded ? 'rotate-180' : '',
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <div
                      className={cn(
                        'space-y-1 border-slate-200 dark:border-slate-700/70',
                        isRTL ? 'mr-5 border-r pr-3' : 'ml-5 border-l pl-3',
                      )}
                    >
                      {entry.items.map((item) => {
                        const isActive = isItemActive(item, location);
                        if (item.children?.length) {
                          const submenuKey = `${entry.groupName}:${item.name}`;
                          const isSubmenuExpanded = expandedSubmenus[submenuKey] ?? false;
                          return (
                            <div key={item.name} className="space-y-1">
                              <button
                                type="button"
                                onClick={() => toggleSubmenu(submenuKey)}
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/35',
                                  isRTL ? 'text-right' : 'text-left',
                                  isActive
                                    ? 'border-lime-200/60 bg-lime-50 text-lime-800 dark:border-lime-300/35 dark:bg-lime-300/10 dark:text-lime-200'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white',
                                )}
                                data-testid={`menu-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                <item.icon
                                  className={cn(
                                    'h-4 w-4 shrink-0',
                                    isActive ? 'text-lime-600 dark:text-lime-300' : 'text-slate-400 dark:text-slate-500',
                                  )}
                                />
                                <span className="truncate">{item.name}</span>
                                <ChevronDown
                                  className={cn(
                                    'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
                                    isRTL ? 'mr-auto' : 'ml-auto',
                                    isSubmenuExpanded ? 'rotate-180' : '',
                                  )}
                                />
                              </button>
                              {isSubmenuExpanded && (
                                <div
                                  className={cn(
                                    'space-y-1 border-slate-200 dark:border-slate-700/70',
                                    isRTL ? 'mr-6 border-r pr-3' : 'ml-6 border-l pl-3',
                                  )}
                                >
                                  {item.children.map((child) => {
                                    const childActive = isItemActive(child, location);
                                    return (
                                      <Link key={child.name} href={child.href}>
                                        <div
                                          className={cn(
                                            'group flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-3 py-1.5 text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/35',
                                            childActive
                                              ? 'border-lime-200/60 bg-lime-50 text-lime-800 dark:border-lime-300/35 dark:bg-lime-300/10 dark:text-lime-200'
                                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white',
                                          )}
                                          data-testid={`link-${child.name.toLowerCase().replace(/\s+/g, '-')}`}
                                        >
                                          <child.icon
                                            className={cn(
                                              'h-3.5 w-3.5 shrink-0',
                                              childActive
                                                ? 'text-lime-600 dark:text-lime-300'
                                                : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300',
                                            )}
                                          />
                                          <span className="truncate">{child.name}</span>
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <Link key={item.name} href={item.href}>
                            <div
                              className={cn(
                                'group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/35',
                                isActive
                                  ? 'border-lime-200/60 bg-lime-50 text-lime-800 dark:border-lime-300/35 dark:bg-lime-300/10 dark:text-lime-200'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white',
                              )}
                              data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <item.icon
                                className={cn(
                                  'h-4 w-4 shrink-0',
                                  isActive
                                    ? 'text-lime-600 dark:text-lime-300'
                                    : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300',
                                )}
                              />
                              <span className="truncate">{item.name}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = location === entry.href;
            return (
              <Link key={entry.name} href={entry.href}>
                <div
                  className={cn(
                    'group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/35',
                    isActive
                      ? 'border-lime-200/60 bg-lime-50 text-lime-800 shadow-sm dark:border-lime-300/35 dark:bg-lime-300/10 dark:text-lime-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white',
                  )}
                  data-testid={`link-${entry.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <entry.icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isActive
                        ? 'text-lime-600 dark:text-lime-300'
                        : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300',
                    )}
                  />
                  <span className="admin-main-menu-label truncate uppercase">{entry.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-800">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">v{appVersion}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                {t('adminPanel.sidebar.systemVersion', 'System Version')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('adminPanel.sidebar.updated', 'Updated')} {__APP_BUILD_TIME__}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn(isRTL ? 'lg:pr-64' : 'lg:pl-64')}>
        {/* Top Header */}
        <header
          className={cn(
            'sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b px-6 backdrop-blur-xl transition-colors duration-200',
            isDarkTheme
              ? 'border-blue-300/10 bg-[#0b1226]/90 text-white'
              : 'border-slate-200 bg-white/90 text-slate-950 shadow-sm',
          )}
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-open-sidebar"
            >
              <Menu className={cn('h-5 w-5', isDarkTheme ? 'text-white' : 'text-slate-700')} />
            </Button>

            <div className="relative hidden md:block dark:text-white">
              <Search
                className={cn(
                  'absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400',
                  isRTL ? 'right-3' : 'left-3',
                )}
              />
              <Input
                placeholder={t('adminPanel.header.searchPlaceholder', 'Search Orders, Customers, Packages...')}
                className={cn(
                  'w-[400px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                  isRTL ? 'pr-9 text-right' : 'pl-9',
                )}
                data-testid="input-global-search"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/notifications">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'relative h-10 w-10 rounded-full',
                  isDarkTheme
                    ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                )}
                data-testid="button-admin-notifications"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </Link>

            <div className="flex items-center gap-1 sm:gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-3 pl-2" data-testid="button-user-menu">
                  <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-700 shadow-sm">
                    <AvatarFallback className="bg-primary-gradient text-white text-sm font-semibold">
                      {user?.name
                        ? user.name
                          .split(' ')
                          .map((word) => word.charAt(0).toUpperCase())
                          .join('')
                          .slice(0, 2)
                        : 'NA'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn('hidden md:block', isRTL ? 'text-right' : 'text-left')}>
                    <p className="text-sm font-medium text-foreground">{user?.name || 'N/A'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {user?.role || 'N/A'}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('adminPanel.header.myAccount', 'My Account')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="menuitem-profile">
                  {' '}
                  <Link href="/admin/settings" className="cursor-pointer flex items-center gap-2  ">
                    {t('adminPanel.header.profileSettings', 'Profile Settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menuitem-settings">
                  <Link
                    href="/admin/providers"
                    className="cursor-pointer flex items-center gap-2  "
                  >
                    {t('adminPanel.header.preferences', 'Preferences')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                  <span>{t('adminPanel.header.logout', 'Logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main
          className={cn(
            'admin-content-surface overflow-x-hidden',
            isCustomerCreatePage
              ? 'h-[calc(100vh-4rem)] overflow-hidden p-0'
              : isKycPage
                ? 'h-[calc(100vh-4rem)] overflow-hidden p-6'
                : 'min-h-[calc(100vh-4rem)] p-6',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
