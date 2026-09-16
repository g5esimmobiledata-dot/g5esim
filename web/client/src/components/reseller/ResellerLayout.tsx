import { Link, useLocation } from 'wouter';
import type React from 'react';
import {
  Activity,
  BarChart3,
  ArrowRightLeft,
  BellRing,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Code2,
  Coins,
  DollarSign,
  ExternalLink,
  FileQuestion,
  FileText,
  Globe2,
  Headphones,
  Image,
  Languages,
  LayoutDashboard,
  Layers,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  Puzzle,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  Ticket,
  Tv,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useUser } from '@/hooks/use-user';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSettingByKey } from '@/hooks/useSettings';
import { SEOHead } from '@/components/SEOHead';
import { normalizeRoleOptionsConfig, type RoleOptionRole, type RoleOptionsConfig } from '@shared/roleOptions';

export type ResellerNavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey?: string;
  children?: ResellerNavItem[];
};

type StorefrontSettings = {
  subdomain: string;
  storeName: string;
  isActive: boolean;
  url?: string | null;
};

async function fetchRoleOptions(): Promise<RoleOptionsConfig> {
  const response = await fetch('/api/options', { credentials: 'include' });
  if (!response.ok) return normalizeRoleOptionsConfig(null);

  const json = await response.json();
  return normalizeRoleOptionsConfig(json?.data || json);
}

function getRoleKey(role?: string | null): RoleOptionRole {
  if (role === 'agent') return 'agent';
  if (role === 'reseller') return 'reseller';
  return 'user';
}

const navigation: ResellerNavItem[] = [
  { name: 'Dashboard', href: '/reseller/dashboard', icon: LayoutDashboard },
  { name: 'Statistics', href: '/reseller/statistics', icon: BarChart3 },
  {
    name: 'Customers',
    href: '/reseller/customers/dashboard',
    icon: Users,
    children: [
      { name: 'Dashboard', href: '/reseller/customers/dashboard', icon: LayoutDashboard },
      { name: 'Agent', href: '/reseller/customers?role=agent', icon: Users },
      { name: 'Reseller', href: '/reseller/customers?role=reseller', icon: Users },
      { name: 'User', href: '/reseller/customers?role=customer', icon: User },
    ],
  },
  {
    name: 'eSIM Packages',
    href: '/reseller/esims/dashboard',
    icon: DollarSign,
    moduleKey: 'module_master_esim_packages',
    children: [
      { name: 'Dashboard', href: '/reseller/esims/dashboard', icon: LayoutDashboard, moduleKey: 'module_master_esim_packages' },
      { name: 'Cost & Price', href: '/reseller/price-cost', icon: DollarSign, moduleKey: 'module_master_esim_packages' },
      { name: "Log's", href: '/reseller/esims/logs', icon: ClipboardList, moduleKey: 'module_master_esim_packages' },
    ],
  },
  {
    name: "eRoaming's",
    href: '/reseller/virtual-numbers/dashboard',
    icon: Smartphone,
    moduleKey: 'module_virtual_numbers',
    children: [
      { name: 'Dashboard', href: '/reseller/virtual-numbers/dashboard', icon: LayoutDashboard, moduleKey: 'module_virtual_numbers' },
      { name: "User's", href: '/reseller/virtual-numbers', icon: User, moduleKey: 'module_virtual_numbers' },
    ],
  },
  {
    name: 'IPTV Services',
    href: '/reseller/iptv/dashboard',
    icon: Tv,
    moduleKey: 'module_iptv_services',
    children: [
      { name: 'Dashboard', href: '/reseller/iptv/dashboard', icon: LayoutDashboard, moduleKey: 'module_iptv_services' },
      { name: "User's", href: '/reseller/iptv', icon: User, moduleKey: 'module_iptv_services' },
      { name: 'Cost & Price', href: '/reseller/iptv/cost-price', icon: DollarSign, moduleKey: 'module_iptv_services' },
      { name: "IPTV Log's", href: '/reseller/iptv/logs', icon: ClipboardList, moduleKey: 'module_iptv_services' },
      { name: "User's List", href: '/reseller/iptv/users-list', icon: Users, moduleKey: 'module_iptv_services' },
      { name: 'Setting', href: '/reseller/iptv/settings', icon: Settings, moduleKey: 'module_iptv_services' },
    ],
  },
  { name: "Wallet's", href: '/reseller/wallet', icon: Wallet },
  { name: 'Rates', href: '/reseller/resellers-agents-rates', icon: Layers, moduleKey: 'module_master_esim_packages' },
  { name: 'Orders', href: '/reseller/orders', icon: ShoppingCart, moduleKey: 'module_order_management' },
  { name: 'Vouchers', href: '/reseller/vouchers', icon: Ticket, moduleKey: 'module_vouchers' },
  { name: 'Invoices', href: '/reseller/invoices', icon: ReceiptText, moduleKey: 'module_invoice_system' },
  { name: 'Push Notifications', href: '/reseller/push-notifications', icon: BellRing, moduleKey: 'module_push_notifications' },
  { name: 'Support', href: '/reseller/support', icon: Headphones, moduleKey: 'module_support_system' },
  {
    name: 'Security',
    href: '/reseller/security/2fa',
    icon: ShieldCheck,
    children: [
      { name: '2FA', href: '/reseller/security/2fa', icon: ShieldCheck },
      { name: "IP Log's", href: '/reseller/security/ip-logs', icon: Activity },
    ],
  },
  {
    name: 'Platform Setup',
    href: '/reseller/platform-setup/app-stores',
    icon: Settings,
    moduleKey: 'module_platform_setup',
    children: [
      { name: 'Storefront', href: '/reseller/storefront', icon: Globe2, moduleKey: 'module_platform_setup' },
      { name: 'SMTP', href: '/reseller/platform-setup/smtp', icon: Mail, moduleKey: 'module_platform_setup' },
      { name: 'App Stores', href: '/reseller/platform-setup/app-stores', icon: Store, moduleKey: 'module_platform_setup' },
      { name: 'Currencies', href: '/reseller/platform-setup/currencies', icon: Coins, moduleKey: 'module_platform_setup' },
      { name: 'Payment Gateways', href: '/reseller/payment-gateways', icon: Wallet, moduleKey: 'module_platform_setup' },
      { name: 'Modules', href: '/reseller/platform-setup/modules', icon: Puzzle, moduleKey: 'module_platform_setup' },
      { name: 'Failover & API', href: '/reseller/platform-setup/failover-settings', icon: Activity, moduleKey: 'module_platform_setup' },
      { name: 'Banner', href: '/reseller/platform-setup/banner', icon: Image, moduleKey: 'module_platform_setup' },
      { name: 'Pages', href: '/reseller/platform-setup/pages', icon: FileText, moduleKey: 'module_platform_setup' },
      { name: 'FAQ', href: '/reseller/platform-setup/faq', icon: FileQuestion, moduleKey: 'module_platform_setup' },
      { name: 'Blog', href: '/reseller/platform-setup/blog', icon: Newspaper, moduleKey: 'module_platform_setup' },
      { name: 'Language', href: '/reseller/platform-setup/languages', icon: Languages, moduleKey: 'module_platform_setup' },
      { name: 'Translation', href: '/reseller/platform-setup/translations', icon: Languages, moduleKey: 'module_platform_setup' },
      { name: 'API Docs', href: '/reseller/platform-setup/api-docs', icon: Code2, moduleKey: 'module_platform_setup' },
    ],
  },
  { name: 'Profile', href: '/reseller/profile', icon: User },
];

export function ResellerLayout({
  children,
  navigationItems,
  panelLabel,
  homeHref,
  showStorefront = true,
}: {
  children: React.ReactNode;
  navigationItems?: ResellerNavItem[];
  panelLabel?: string;
  homeHref?: string;
  showStorefront?: boolean;
}) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const { user, refetchUser } = useUser();
  const { toast } = useToast();
  const sitename = useSettingByKey('platform_name') || 'eSIM Marketplace';
  const currentPath = location.split('?')[0];
  const roleLabel = panelLabel || 'Administration';
  const accountTypeLabel =
    user?.role === 'agent'
      ? 'Account Type: Agent'
      : user?.role === 'reseller'
        ? 'Account Type: WhiteLabel'
        : 'Account Type: Customer';
  const accountPrefix = currentPath.startsWith('/account') ? '/account' : '/reseller';
  const dashboardHref = homeHref || (user?.role === 'agent' ? '/account/dashboard' : '/reseller/dashboard');
  const { data: storefront } = useQuery<StorefrontSettings>({
    queryKey: ['/api/reseller/storefront/settings'],
    enabled: showStorefront && (user?.role === 'reseller' || user?.role === 'agent'),
  });
  const { data: roleOptions } = useQuery<RoleOptionsConfig>({
    queryKey: ['/api/options', user?.id || 'guest'],
    queryFn: fetchRoleOptions,
    enabled: Boolean(user),
    retry: false,
    staleTime: 30_000,
  });
  const roleKey = getRoleKey(user?.role);
  const moduleEnabled = (moduleKey?: string) => {
    if (!moduleKey) return true;
    if (!roleOptions) return true;
    return Boolean(roleOptions.roles[roleKey]?.modules?.[moduleKey]);
  };
  const filterNavigation = (items: ResellerNavItem[]): ResellerNavItem[] =>
    items
      .filter((item) => moduleEnabled(item.moduleKey))
      .map((item) => ({
        ...item,
        children: item.children ? filterNavigation(item.children) : undefined,
      }))
      .filter((item) => !item.children || item.children.length > 0);
  const visibleNavigation = filterNavigation(navigationItems || navigation);
  const bottomProfileItem = visibleNavigation.find((item) => item.name === 'Profile');
  const BottomProfileIcon = bottomProfileItem?.icon;
  const mainNavigation = visibleNavigation.filter((item) => item.name !== 'Profile');
  const findActiveNavItem = (items: ResellerNavItem[]): ResellerNavItem | undefined => {
    for (const item of items) {
      const itemPath = item.href.split('?')[0];
      if (location === item.href || currentPath === itemPath) return item;
      const childMatch = item.children ? findActiveNavItem(item.children) : undefined;
      if (childMatch) return childMatch;
    }
    return undefined;
  };
  const itemIsActive = (item: ResellerNavItem) => {
    const itemPath = item.href.split('?')[0];
    if (item.href.includes('?')) {
      return location === item.href;
    }
    return location === item.href || currentPath === itemPath;
  };
  const groupIsActive = (item: ResellerNavItem) =>
    itemIsActive(item) || Boolean(item.children?.some((child) => groupIsActive(child)));

  const activeNavItem = findActiveNavItem(visibleNavigation);
  const storefrontUrl = showStorefront && storefront?.isActive ? storefront.url || '' : '';
  const storefrontPlatformName =
    storefront?.storeName ||
    (user as any)?.resellerStoreName ||
    (user as any)?.name ||
    sitename;
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'RS';
  const storefrontSetupPrefix = accountPrefix;
  const platformSetupPrefix = `${storefrontSetupPrefix}/platform-setup`;
  const platformSetupMenuItems: ResellerNavItem[] = [
    { name: 'Storefront', href: `${storefrontSetupPrefix}/storefront`, icon: Globe2, moduleKey: 'module_platform_setup' },
    { name: 'SMTP', href: `${platformSetupPrefix}/smtp`, icon: Mail, moduleKey: 'module_platform_setup' },
    { name: 'App Stores', href: `${platformSetupPrefix}/app-stores`, icon: Store, moduleKey: 'module_platform_setup' },
    { name: 'Currencies', href: `${platformSetupPrefix}/currencies`, icon: Coins, moduleKey: 'module_platform_setup' },
    { name: 'Payment Gateways', href: `${storefrontSetupPrefix}/payment-gateways`, icon: Wallet, moduleKey: 'module_platform_setup' },
    { name: 'Modules', href: `${platformSetupPrefix}/modules`, icon: Puzzle, moduleKey: 'module_platform_setup' },
    { name: 'Failover & API', href: `${platformSetupPrefix}/failover-settings`, icon: Activity, moduleKey: 'module_platform_setup' },
    { name: 'Banner', href: `${platformSetupPrefix}/banner`, icon: Image, moduleKey: 'module_platform_setup' },
    { name: 'Pages', href: `${platformSetupPrefix}/pages`, icon: FileText, moduleKey: 'module_platform_setup' },
    { name: 'FAQ', href: `${platformSetupPrefix}/faq`, icon: FileQuestion, moduleKey: 'module_platform_setup' },
    { name: 'Blog', href: `${platformSetupPrefix}/blog`, icon: Newspaper, moduleKey: 'module_platform_setup' },
    { name: 'Language', href: `${platformSetupPrefix}/languages`, icon: Languages, moduleKey: 'module_platform_setup' },
    { name: 'Translation', href: `${platformSetupPrefix}/translations`, icon: Languages, moduleKey: 'module_platform_setup' },
    { name: 'API Docs', href: `${platformSetupPrefix}/api-docs`, icon: Code2, moduleKey: 'module_platform_setup' },
  ];
  const platformSetupContextActive =
    currentPath === '/reseller/storefront' ||
    currentPath === '/reseller/payment-gateways' ||
    currentPath.startsWith('/reseller/platform-setup') ||
    currentPath === '/account/storefront' ||
    currentPath === '/account/payment-gateways' ||
    currentPath.startsWith('/account/platform-setup');
  const showPlatformSetupMenu = (user?.role === 'reseller' || user?.role === 'agent') && platformSetupContextActive;
  const activePlatformSetupItem = platformSetupContextActive
    ? platformSetupMenuItems.find((item) => itemIsActive(item))
    : undefined;
  const pageTitle = activePlatformSetupItem?.name || activeNavItem?.name || roleLabel;

  useEffect(() => {
    const nextExpandedGroups: Record<string, boolean> = {};
    for (const item of mainNavigation) {
      if (item.children?.length && groupIsActive(item)) {
        nextExpandedGroups[item.name] = true;
      }
    }
    setExpandedGroups(nextExpandedGroups);
  }, [location]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      refetchUser();
      setLocation('/login');
      toast({ title: 'Signed out', description: 'You have been signed out successfully.' });
    } catch (error: any) {
      toast({
        title: 'Logout failed',
        description: error.message || 'Could not sign out.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="dark fixed inset-0 h-dvh w-full overflow-hidden bg-[#071126] text-white">
      <SEOHead
        title={`${pageTitle} | ${roleLabel}`}
        description={`Manage Reseller wallet and Orders for ${sitename}`}
        noIndex
        noFollow
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close Reseller navigation"
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-64 transform flex-col border-r border-blue-300/10 bg-[#0b1226]/95 text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-blue-300/10 px-5">
          <Link href={dashboardHref}>
            <div className="flex cursor-pointer items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold text-white">{roleLabel}</h1>
                <p className="mt-1 truncate text-xs text-slate-400">{storefrontPlatformName}</p>
              </div>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="dark-blue-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
          {mainNavigation.map((item) => {
            const hasChildren = Boolean(item.children?.length);
            const active = groupIsActive(item);
            const expanded = expandedGroups[item.name] ?? false;
            const Icon = item.icon;

            if (hasChildren) {
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroups((current) => ({
                        ...current,
                        [item.name]: !(current[item.name] ?? false),
                      }))
                    }
                    className={cn(
                      'group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors',
                      active
                        ? 'bg-lime-300 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        active ? 'text-slate-950' : 'text-slate-500 group-hover:text-slate-300',
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform',
                        expanded ? 'rotate-180' : 'rotate-0',
                        active ? 'text-slate-950' : 'text-slate-500 group-hover:text-slate-300',
                      )}
                    />
                  </button>

                  {expanded && (
                    <div className="ml-5 space-y-1 border-l border-slate-800 pl-3">
                      {item.children!.map((child) => {
                        const childActive = itemIsActive(child);
                        const ChildIcon = child.icon;
                        return (
                          <Link key={child.href} href={child.href}>
                            <div
                              className={cn(
                                'group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-normal transition-colors',
                                childActive
                                  ? 'bg-lime-300/90 text-slate-950 shadow-sm'
                                  : 'text-slate-400 hover:bg-slate-900 hover:text-white',
                              )}
                            >
                              <ChildIcon
                                className={cn(
                                  'h-4 w-4 shrink-0',
                                  childActive ? 'text-slate-950' : 'text-slate-600 group-hover:text-slate-300',
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
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors',
                    active
                      ? 'bg-lime-300 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      active ? 'text-slate-950' : 'text-slate-500 group-hover:text-slate-300',
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          {bottomProfileItem && (
            <Link href={bottomProfileItem.href}>
              <div
                className={cn(
                  'mb-2 flex cursor-pointer items-center gap-3 rounded-xl p-3 text-sm font-bold transition-colors',
                  itemIsActive(bottomProfileItem)
                    ? 'bg-lime-300 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                )}
              >
                {BottomProfileIcon && (
                  <BottomProfileIcon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      itemIsActive(bottomProfileItem)
                        ? 'text-slate-950'
                        : 'text-slate-500',
                    )}
                  />
                )}
                <span className="truncate">{bottomProfileItem.name}</span>
              </div>
            </Link>
          )}
          {storefrontUrl && (
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-2 flex cursor-pointer items-center gap-3 rounded-xl p-3 text-sm font-bold text-lime-200 transition hover:bg-slate-900"
            >
              <Globe2 className="h-4 w-4" />
              <span className="min-w-0 flex-1">Customer Store</span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          )}
          {(user?.role === 'reseller' || user?.role === 'agent') && (
            <Link href="/account/profile">
              <div className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-900 p-3 text-sm font-bold text-slate-100 transition hover:bg-slate-800">
                <ArrowRightLeft className="h-4 w-4" />
                Switch to Customer Mode
              </div>
            </Link>
          )}
        </div>
      </aside>

      <div className="h-dvh bg-[#071126] lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-blue-300/10 bg-[#0b1226]/90 px-4 text-white backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-900 hover:text-white lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-base font-semibold text-white">
                  {pageTitle}
                </h2>
                <Badge className="hidden border-lime-300/40 bg-lime-300/10 text-lime-200 hover:bg-lime-300/10 sm:inline-flex" variant="outline">
                  {accountTypeLabel}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 sm:hidden">
                {accountTypeLabel}
              </p>
            </div>

            <div className="relative hidden xl:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search Orders, eSIMs, vouchers..."
                className="h-9 w-[370px] border-slate-700 bg-slate-800 pl-9 text-slate-100 placeholder:text-slate-400 focus-visible:ring-lime-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {storefrontUrl && (
              <Button asChild variant="outline" className="hidden h-9 border-lime-300/30 bg-transparent text-lime-100 hover:bg-lime-300/10 hover:text-lime-100 xl:inline-flex">
                <a href={storefrontUrl} target="_blank" rel="noreferrer">
                  <Globe2 className="h-4 w-4" />
                  Customer Store
                </a>
              </Button>
            )}
            <LanguageSwitcher />
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-3 pl-2 text-white hover:bg-slate-900 hover:text-white">
                  <Avatar className="h-8 w-8 border-2 border-white/20 shadow-sm">
                    <AvatarFallback className="bg-lime-300 text-sm font-semibold text-slate-950">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-medium text-white">{user?.name || 'Reseller'}</p>
                    <p className="text-xs text-slate-400">{accountTypeLabel}</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <div className="px-2 pb-2 text-xs text-muted-foreground">
                  {accountTypeLabel}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`${accountPrefix}/profile`}>Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`${accountPrefix}/wallet`}>Wallet</Link>
                </DropdownMenuItem>
                {storefrontUrl && (
                  <DropdownMenuItem asChild>
                    <a href={storefrontUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Open Customer Store
                    </a>
                  </DropdownMenuItem>
                )}
                {(user?.role === 'reseller' || user?.role === 'agent') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account/profile" className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        Switch to Customer Mode
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          className={cn(
            'h-[calc(100dvh-4rem)] bg-[linear-gradient(180deg,#0b1730_0%,#071126_18rem,#071126_100%)] p-4 sm:p-6',
            currentPath === '/account/kyc' ? 'overflow-hidden' : 'overflow-y-auto',
          )}
        >
          {showPlatformSetupMenu && (
            <div className="mb-5 rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-3 shadow-sm">
              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-max gap-2">
                  {platformSetupMenuItems.map((item) => {
                    const active = platformSetupContextActive && itemIsActive(item);
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            'flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors',
                            active
                              ? 'bg-slate-800 text-white shadow-none'
                              : 'text-slate-300 hover:bg-slate-900/80 hover:text-white',
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
