import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  CreditCard,
  Crown,
  Gem,
  Gift,
  Headphones,
  Mail,
  Phone,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  Tv,
  User,
  Wallet,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { useRoleModuleAccess } from '@/hooks/useRoleModuleAccess';
import { formatDisplayValue } from '@/lib/displayText';
import { cn } from '@/lib/utils';
import ResellerDashboard from '@/pages/reseller/ResellerDashboard';

type WalletSummary = {
  balance: string;
  currency: string;
  transactions?: Array<{
    id: string;
    type: string;
    amount: string;
    status: string;
    description?: string | null;
    createdAt: string;
  }>;
};

type MemberTier = {
  key: 'standard' | 'gold' | 'platinum';
  label: string;
  rewardRatePercent: number;
  conversionThreshold: number;
};

type MemberRewardsDashboard = {
  enabled: boolean;
  tier: MemberTier;
  rewardBalance: number;
  lifetimeRewards: number;
  conversionThreshold: number;
  canConvert: boolean;
  progressPercent: number;
  remainingToConvert: number;
};

type DashboardService = {
  moduleKey: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Wallet;
};

const CUSTOMER_DASHBOARD_SERVICES: DashboardService[] = [
  {
    moduleKey: 'module_esim_services',
    title: 'eSIM',
    description: 'View and manage your eSIM packages.',
    href: '/account/esims',
    icon: Smartphone,
  },
  {
    moduleKey: 'module_wallet_topup',
    title: 'Top-Up Wallet',
    description: 'Add funds and review wallet activity.',
    href: '/account/wallet',
    icon: Wallet,
  },
  {
    moduleKey: 'module_gift_cards',
    title: 'Gift Cards',
    description: 'Manage purchased gift cards.',
    href: '/account/gift-cards',
    icon: Gift,
  },
  {
    moduleKey: 'module_virtual_prepaid_cards',
    title: 'Virtual Prepaid Card',
    description: 'Open card funding and payment tools.',
    href: '/account/wallet',
    icon: CreditCard,
  },
  {
    moduleKey: 'module_rewards',
    title: 'Rewards',
    description: 'Track and convert member rewards.',
    href: '/account/member-rewards',
    icon: BadgeDollarSign,
  },
  {
    moduleKey: 'module_virtual_numbers',
    title: "eRoaming's",
    description: 'Manage virtual numbers and calls.',
    href: '/account/virtual-numbers',
    icon: Phone,
  },
  {
    moduleKey: 'module_vouchers',
    title: 'Vouchers',
    description: 'Redeem vouchers into your wallet.',
    href: '/account/vouchers',
    icon: Ticket,
  },
  {
    moduleKey: 'concierge',
    title: 'VIP Concierge',
    description: 'Open premium support and requests.',
    href: '/account/support',
    icon: Headphones,
  },
  {
    moduleKey: 'module_iptv_services',
    title: 'IPTV',
    description: 'Create and manage IPTV subscriptions.',
    href: '/account/iptv',
    icon: Tv,
  },
];

function money(value: unknown) {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
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

function titleCase(value?: string | null) {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '-';
}

function tierIcon(tier?: string) {
  if (tier === 'gold') return Crown;
  if (tier === 'platinum') return Gem;
  return Sparkles;
}

function tierClass(tier?: string) {
  if (tier === 'gold') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (tier === 'platinum') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
  return 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-200';
}

function statusClass(status?: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved' || normalized === 'verified') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
  }
  if (normalized === 'rejected') {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
}

export default function AccountDashboard() {
  const { user, isLoading: isUserLoading } = useUser();
  const { options: moduleOptions, role: moduleRole, isLoading: isModulesLoading } = useRoleModuleAccess('module_iptv_services');
  const isBusinessAccount = user?.role === 'agent' || user?.role === 'reseller';

  const { data: wallet, isLoading: isWalletLoading } = useQuery<WalletSummary>({
    queryKey: ['/api/wallet'],
  });

  const { data: rewards, isLoading: isRewardsLoading } = useQuery<MemberRewardsDashboard>({
    queryKey: ['/api/member-rewards'],
  });

  const { data: resellerStats } = useQuery<any>({
    queryKey: ['/api/reseller/stats'],
    enabled: Boolean(isBusinessAccount),
  });

  const { data: virtualNumberDashboard } = useQuery<any>({
    queryKey: ['/api/vonage/dashboard'],
    enabled: Boolean(isBusinessAccount),
  });

  const { data: iptvOrders = [] } = useQuery<any[]>({
    queryKey: ['/api/iptv/orders'],
    enabled: Boolean(isBusinessAccount),
  });

  const { data: iptvRetailPrices = [] } = useQuery<any[]>({
    queryKey: ['/api/iptv/retail-prices'],
    enabled: Boolean(isBusinessAccount),
  });

  const TierIcon = tierIcon(rewards?.tier?.key || user?.memberTier);
  const loading = isUserLoading || isWalletLoading || isRewardsLoading || isModulesLoading;
  const moduleSettings = moduleOptions?.roles[moduleRole]?.modules;
  const moduleEnabled = (moduleKey: string) =>
    !moduleSettings || !(moduleKey in moduleSettings) || Boolean(moduleSettings[moduleKey]);
  const walletEnabled = moduleEnabled('module_wallet_topup');
  const rewardsEnabled = moduleEnabled('module_rewards');
  const enabledServices = CUSTOMER_DASHBOARD_SERVICES.filter((service) => moduleEnabled(service.moduleKey));
  const virtualNumbers = virtualNumberDashboard?.numbers || (virtualNumberDashboard?.number ? [virtualNumberDashboard.number] : []);
  const virtualNumberRevenue = virtualNumbers.reduce((sum: number, number: any) => sum + Number(number?.subscription?.renewalPrice || number?.pricing?.monthlyFee || 0), 0);
  const virtualNumberCost = virtualNumbers.reduce((sum: number, number: any) => sum + Number(number?.pricing?.monthlyFee || 0), 0);
  const iptvTotals = calculateIptvProfit(iptvOrders, iptvRetailPrices);
  const allServicesProfit =
    Number(resellerStats?.totals?.totalProfit || 0) +
    (virtualNumberRevenue - virtualNumberCost) +
    (iptvTotals.revenue - iptvTotals.cost);

  if (isBusinessAccount) {
    return <ResellerDashboard />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <User className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
                <h1 className="mt-1 text-3xl font-bold text-foreground">
                  {user?.name || user?.email || 'Member'}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('gap-1', tierClass(rewards?.tier?.key || user?.memberTier))}>
                    <TierIcon className="h-3.5 w-3.5" />
                    {rewards?.tier?.label || titleCase(user?.memberTier) || 'Standard Member'}
                  </Badge>
                  <Badge variant="outline" className={cn('gap-1', statusClass(user?.kycStatus))}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    KYC {titleCase(user?.kycStatus || 'pending')}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {user?.role || 'customer'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {walletEnabled && (
                <Link href="/account/wallet">
                  <Button className="gap-2">
                    <Wallet className="h-4 w-4" />
                    Wallet
                  </Button>
                </Link>
              )}
              {rewardsEnabled && (
                <Link href="/account/member-rewards">
                  <Button variant="outline" className="gap-2">
                    <Gift className="h-4 w-4" />
                    Rewards
                  </Button>
                </Link>
              )}
              {moduleEnabled('module_iptv_services') && (
                <Link href="/account/iptv">
                  <Button variant="outline" className="gap-2">
                    <Tv className="h-4 w-4" />
                    IPTV
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isBusinessAccount && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">All Services Profit</CardTitle>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>eSIM, eRoaming, and IPTV profit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{money(allServicesProfit)}</div>
              <p className="mt-2 text-sm text-muted-foreground">Combined service margin for this workspace.</p>
            </CardContent>
          </Card>
        )}

        {walletEnabled && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Wallet Balance</CardTitle>
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>Available wallet funds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{money(wallet?.balance || user?.walletBalance)}</div>
              <p className="mt-2 text-sm text-muted-foreground">Currency: {wallet?.currency || 'USD'}</p>
            </CardContent>
          </Card>
        )}

        {rewardsEnabled && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Member Type</CardTitle>
                <TierIcon className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>Current rewards level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rewards?.tier?.label || titleCase(user?.memberTier) || 'Standard Member'}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Earn {rewards?.tier?.rewardRatePercent || 0}% rewards on eligible purchases.
              </p>
            </CardContent>
          </Card>
        )}

        {rewardsEnabled && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Rewards Wallet</CardTitle>
                <BadgeDollarSign className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>Rewards ready for conversion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{money(rewards?.rewardBalance || user?.memberRewardBalance)}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Lifetime rewards: {money(rewards?.lifetimeRewards || user?.memberRewardLifetime)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {enabledServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>Open the services enabled for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {enabledServices.map((service) => {
                const Icon = service.icon;

                return (
                  <Link key={service.moduleKey} href={service.href}>
                    <div className="group flex min-h-28 cursor-pointer items-start justify-between gap-4 rounded-xl border bg-background p-4 transition-colors hover:border-primary/50 hover:bg-primary/5">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{service.title}</div>
                          <p className="mt-1 text-sm leading-5 text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className={cn('grid gap-6', rewardsEnabled && 'xl:grid-cols-[1fr_0.9fr]')}>
        {rewardsEnabled && (
          <Card>
            <CardHeader>
              <CardTitle>Reward Conversion Progress</CardTitle>
              <CardDescription>
                Convert rewards into wallet balance after reaching the required amount.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {money(rewards?.rewardBalance)} / {money(rewards?.conversionThreshold)}
                </span>
                <span className="text-muted-foreground">{rewards?.progressPercent || 0}%</span>
              </div>
              <Progress value={rewards?.progressPercent || 0} className="h-3" />
              <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                {rewards?.canConvert
                  ? 'Your rewards are ready to convert into wallet funds.'
                  : `${money(rewards?.remainingToConvert)} more rewards needed before conversion.`}
              </div>
              <Link href="/account/member-rewards">
                <Button variant="outline" className="gap-2">
                  <BadgeCheck className="h-4 w-4" />
                  Open Member Rewards
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Main profile information for this member.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Email</span>
              </div>
              <span className="text-sm font-medium">{user?.email || '-'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Phone</span>
              </div>
              <span className="text-sm font-medium">{user?.phone || '-'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Account Type</span>
              </div>
              <span className="text-sm font-medium capitalize">{user?.role || 'customer'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <div className="flex items-center gap-3">
                <Gift className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Referral Balance</span>
              </div>
              <span className="text-sm font-medium">{money(user?.referralBalance)}</span>
            </div>
            <Link href="/account/profile">
              <Button variant="outline" className="mt-2 w-full">
                Edit Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {walletEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Wallet Activity</CardTitle>
            <CardDescription>Latest wallet top-ups, purchases, and reward conversions.</CardDescription>
          </CardHeader>
          <CardContent>
            {!wallet?.transactions?.length ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No wallet activity yet.
              </div>
            ) : (
              <div className="space-y-3">
                {wallet.transactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col gap-2 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium capitalize">
                        {transaction.description || transaction.type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {formatDisplayValue(transaction.status)}
                      </Badge>
                      <span className="font-semibold">{money(transaction.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
