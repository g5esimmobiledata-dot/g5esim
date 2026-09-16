// import { Link, useLocation } from 'wouter';
// import {
//   User,
//   Smartphone,
//   Package,
//   Shield,
//   Headphones,
//   ChevronRight,
//   Settings,
//   ArrowLeft,
//   Home,
//   BadgeCheck,
// } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { Button } from '@/components/ui/button';

// interface AccountLayoutProps {
//   children: React.ReactNode;
// }

// interface NavItem {
//   icon: React.ComponentType<{ className?: string }>;
//   label: string;
//   description: string;
//   href: string;
// }

// const accountNavItems: NavItem[] = [
//   {
//     icon: User,
//     label: 'Account Information',
//     description: 'Manage your personal details',
//     href: '/account/profile',
//   },
//   {
//     icon: Smartphone,
//     label: 'My E-Sim Details',
//     description: 'Manage your eSIM profiles',
//     href: '/account/esims',
//   },
//   {
//     icon: Package,
//     label: 'Order History',
//     description: 'View your purchase history',
//     href: '/account/orders',
//   },
//   {
//     icon: BadgeCheck,
//     label: 'KYC Verification',
//     description: 'Verify your identity',
//     href: '/account/kyc',
//   },
//   {
//     icon: Shield,
//     label: 'Referrals',
//     description: 'Get referrals',
//     href: '/account/referrals',
//   },
//   {
//     icon: Headphones,
//     label: 'Customer Support',
//     description: 'Get help and support',
//     href: '/account/support',
//   },
// ];

// export function AccountLayout({ children }: AccountLayoutProps) {
//   const [location] = useLocation();

//   const isActive = (href: string) => {
//     if (href === '/account') return location === '/account';
//     if (href.startsWith('/account/')) return location.startsWith(href);
//     return location === href;
//   };

//   const getCurrentPageName = () => {
//     const currentItem = accountNavItems.find((item) => isActive(item.href));
//     return currentItem?.label || 'Account';
//   };

//   const isSubPage = location !== '/account' && location.startsWith('/account/');

//   return (
//     <>
//       <main className="flex-1 pt-20 bg-background ">
//         <div className="container mx-auto px-4 py-8">
//           <div className="flex flex-col lg:flex-row gap-8">
//             {/* Sidebar */}
//             <aside className="lg:w-80 flex-shrink-0">
//               <div className="bg-card rounded-lg border p-4 lg:sticky lg:top-24">
//                 <div className="flex items-center gap-2 mb-6">
//                   <Settings className="h-5 w-5 text-foreground" />
//                   <h2 className="font-semibold text-lg text-foreground">Account Settings</h2>
//                 </div>

//                 <nav className="space-y-1">
//                   {accountNavItems.map((item) => {
//                     const Icon = item.icon;
//                     const active = isActive(item.href);

//                     return (
//                       <Link key={item.href} href={item.href}>
//                         <div
//                           className={cn(
//                             'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
//                             active ? 'bg-teal-500/10 border border-teal-500/20' : 'hover-elevate',
//                           )}
//                         >
//                           <div
//                             className={cn(
//                               'w-10 h-10 rounded-lg flex items-center justify-center',
//                               active ? 'bg-teal-500/20' : 'bg-muted',
//                             )}
//                           >
//                             <Icon
//                               className={cn(
//                                 'h-5 w-5',
//                                 active ? 'text-teal-500' : 'text-muted-foreground',
//                               )}
//                             />
//                           </div>

//                           <div className="flex-1 min-w-0">
//                             <div
//                               className={cn(
//                                 'font-medium text-sm',
//                                 active ? 'text-teal-500' : 'text-foreground',
//                               )}
//                             >
//                               {item.label}
//                             </div>
//                             <div className="text-xs text-muted-foreground truncate">
//                               {item.description}
//                             </div>
//                           </div>

//                           <ChevronRight className="h-4 w-4 text-muted-foreground" />
//                         </div>
//                       </Link>
//                     );
//                   })}
//                 </nav>
//               </div>
//             </aside>

//             {/* Content */}
//             <div className="flex-1 min-w-0">
//               <div className="flex items-center gap-2 mb-6 text-sm">
//                 <Link href="/">
//                   <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
//                     <Home className="h-4 w-4" />
//                     Home
//                   </Button>
//                 </Link>

//                 <ChevronRight className="h-4 w-4 text-muted-foreground" />

//                 {isSubPage ? (
//                   <>
//                     <Link href="/account">
//                       <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
//                         {/* <ArrowLeft className="h-4 w-4" /> */}
//                         Account
//                       </Button>
//                     </Link>
//                     <ChevronRight className="h-4 w-4 text-muted-foreground" />
//                     <span className="font-medium text-muted-foreground ">{getCurrentPageName()}</span>
//                   </>
//                 ) : (
//                   <span className="font-medium">Account</span>
//                 )}
//               </div>

//               {children}
//             </div>
//           </div>
//         </div>
//       </main>
//       {/* <SiteFooter /> */}
//     </>
//   );
// }





import { Link, useLocation } from 'wouter';
import {
  User,
  LayoutDashboard,
  Smartphone,
  Package,
  Shield,
  Headphones,
  ChevronRight,
  Settings,
  ArrowLeft,
  Home,
  BadgeCheck,
  BadgeDollarSign,
  Gift,
  Wallet,
  ArrowRightLeft,
  Ticket,
  ReceiptText,
  Phone,
  Tv,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useUser } from '@/hooks/use-user';
import { SandboxModeNotice } from '@/components/SandboxModeNotice';
import { useRoleModuleAccess } from '@/hooks/useRoleModuleAccess';

interface AccountLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  href: string;
  moduleKey?: string;
}



// const accountNavItems: NavItem[] = [
//   {
//     icon: User,
//     label: 'Account Information',
//     description: 'Manage your personal details',
//     href: '/account/profile',
//   },
//   {
//     icon: Smartphone,
//     label: 'My E-Sim Details',
//     description: 'Manage your eSIM profiles',
//     href: '/account/esims',
//   },
//   {
//     icon: Package,
//     label: 'Order History',
//     description: 'View your purchase history',
//     href: '/account/orders',
//   },
//   {
//     icon: BadgeCheck,
//     label: 'KYC Verification',
//     description: 'Verify your identity',
//     href: '/account/kyc',
//   },
//   {
//     icon: Shield,
//     label: 'Referrals',
//     description: 'Get referrals',
//     href: '/account/referrals',
//   },
//   {
//     icon: Headphones,
//     label: 'Customer Support',
//     description: 'Get help and support',
//     href: '/account/support',
//   },
// ];





export function AccountLayout({ children }: AccountLayoutProps) {
  const [location] = useLocation();
  const {t} = useTranslation()
  const { user } = useUser();
  const isResellerAccount = user?.role === 'reseller';
  const isAgentAccount = user?.role === 'agent';
  const { options: roleOptions } = useRoleModuleAccess('dashboard');
  const moduleEnabled = (moduleKey?: string) => {
    if (!moduleKey) return true;
    if (!roleOptions || !user) return true;
    const role = user.role === 'agent' || user.role === 'reseller' ? user.role : 'user';
    const modules = roleOptions.roles[role]?.modules;
    if (!modules || !(moduleKey in modules)) return true;
    return Boolean(modules[moduleKey]);
  };


  const accountNavItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: t("website.account.dashboard.title","Dashboard"),
    description: t("website.account.dashboard.desc","Wallet, rewards, and account overview"),
    href: '/account/dashboard',
  },
  {
    icon: User,
    label: t("website.account.info.title","Account Information"),
    description: t("website.account.info.desc","Manage your personal details"),
    href: '/account/profile',
    moduleKey: 'change_profile',
  },
  {
    icon: Smartphone,
    label: t("website.account.esim.title","My E-Sim Details"),
    description: t("website.account.esim.desc","Manage your eSIM profiles"),
    href: '/account/esims',
    moduleKey: 'module_esim_services',
  },
  {
    icon: Package,
    label: t("website.account.orders.title","Order History"),
    description: t("website.account.orders.desc","View your purchase history"),
    href: '/account/orders',
    moduleKey: user?.role === 'agent' || user?.role === 'reseller' ? 'module_order_management' : undefined,
  },
  {
    icon: Gift,
    label: t("website.account.giftcards.title","Gift Cards"),
    description: t("website.account.giftcards.desc","Manage your gift cards"),
    href: '/account/gift-cards',
    moduleKey: 'module_gift_cards',
  },
  {
    icon: Wallet,
    label: t("website.account.wallet.title","Wallet"),
    description: t("website.account.wallet.desc","Top up and redeem codes"),
    href: '/account/wallet',
    moduleKey: 'module_wallet_topup',
  },
  {
    icon: BadgeDollarSign,
    label: t("website.account.memberRewards.title","Member Rewards"),
    description: t("website.account.memberRewards.desc","Collect rewards and convert to wallet"),
    href: '/account/member-rewards',
    moduleKey: 'module_rewards',
  },
  {
    icon: Phone,
    label: 'eRoaming Numbers',
    description: 'Manage calls, SMS, and renewals',
    href: '/account/virtual-numbers',
    moduleKey: 'module_virtual_numbers',
  },
  {
    icon: Tv,
    label: 'IPTV Services',
    description: 'Manage IPTV subscriptions',
    href: '/account/iptv',
    moduleKey: 'module_iptv_services',
  },
  {
    icon: Ticket,
    label: t("website.account.vouchers.title","Vouchers"),
    description: t("website.account.vouchers.desc","Create or redeem wallet vouchers"),
    href: '/account/vouchers',
    moduleKey: 'module_vouchers',
  },
  ...(isAgentAccount ? [{
    icon: ReceiptText,
    label: t("website.account.invoices.title","Invoices"),
    description: t("website.account.invoices.desc","Create and send customer invoices"),
    href: '/account/invoices',
    moduleKey: 'module_invoice_system',
  }] : []),
  {
    icon: BadgeCheck,
    label: t("website.account.kyc.title","KYC Verification"),
    description: t("website.account.kyc.desc","Verify your identity"),
    href: '/account/kyc',
  },
  {
    icon: Shield,
    label: t("website.account.referrals.title","Referrals"),
    description: t("website.account.referrals.desc","Get referrals"),
    href: '/account/referrals',
    moduleKey: 'referral_program',
  },
  {
    icon: Headphones,
    label: t("website.account.support.title","VIP Concierge"),
    description: t("website.account.support.desc","VIP help and free support"),
    href: '/account/support',
    moduleKey: 'concierge',
  },
  {
    icon: ShieldCheck,
    label: 'Security',
    description: '2FA, IP logs, VPN policy, and IP access lists',
    href: '/account/security/2fa',
  },
];

  const visibleAccountNavItems = accountNavItems.filter((item) => moduleEnabled(item.moduleKey));

  const isActive = (href: string) => {
    if (href === '/account') return location === '/account';
    if (href.startsWith('/account/')) return location.startsWith(href);
    return location === href;
  };

  const getCurrentPageName = () => {
    const currentItem = visibleAccountNavItems.find((item) => isActive(item.href));
    return currentItem?.label || 'Account';
  };

  const isSubPage = location !== '/account' && location.startsWith('/account/');

  return (
    <>
      <main className="min-h-dvh flex-1 bg-[linear-gradient(180deg,#0b1730_0%,#071126_18rem,#071126_100%)] pt-20 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="rounded-lg border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-black/20 lg:sticky lg:top-24">
                <div className="flex items-center gap-2 mb-6">
                  <Settings className="h-5 w-5 text-slate-300" />
                  <h2 className="font-semibold text-lg text-white">{t("website.account.settings","Account Settings")}</h2>
                </div>

                {isResellerAccount && (
                  <Link href="/reseller/dashboard">
                    <div className="mb-4 flex cursor-pointer items-center gap-3 rounded-lg border border-primary/20 bg-primary/10 p-3 text-primary transition hover:bg-primary/15">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">
                          {t("website.account.resellerMode.title","Switch to Reseller Mode")}
                        </div>
                        <div className="truncate text-xs text-primary/80">
                          {t("website.account.resellerMode.desc","Account Type: WhiteLabel")}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    </div>
                  </Link>
                )}

                <nav className="space-y-1">
                  {visibleAccountNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                            active
                              ? 'border border-teal-300/30 bg-teal-400/15'
                              : 'border border-transparent hover:border-white/10 hover:bg-white/5',
                          )}
                        >
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center',
                              active ? 'bg-teal-300 text-slate-950' : 'bg-slate-100 text-slate-600',
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-5 w-5',
                                active ? 'text-slate-950' : 'text-slate-600',
                              )}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                'font-medium text-sm',
                                active ? 'text-teal-100' : 'text-slate-100',
                              )}
                            >
                              {item.label}
                            </div>
                            <div className={cn('text-xs truncate', active ? 'text-teal-100/75' : 'text-slate-400')}>
                              {item.description}
                            </div>
                          </div>

                          <ChevronRight className={cn('h-4 w-4', active ? 'text-teal-200' : 'text-slate-500')} />
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-6 text-sm">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="gap-1 text-slate-300 hover:bg-white/5 hover:text-white">
                    <Home className="h-4 w-4" />
                    {t("website.common.home","Home")}
                  </Button>
                </Link>

                <ChevronRight className="h-4 w-4 text-slate-500" />

                {isSubPage ? (
                  <>
                    <Link href="/account">
                      <Button variant="ghost" size="sm" className="gap-1 text-slate-300 hover:bg-white/5 hover:text-white">
                        {/* <ArrowLeft className="h-4 w-4" /> */}
                        {t("website.account.title","Account")}
                      </Button>
                    </Link>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                    <span className="font-medium text-slate-200">{getCurrentPageName()}</span>
                  </>
                ) : (
                  <span className="font-medium text-slate-200">Account</span>
                )}
              </div>

              <SandboxModeNotice className="mb-6" />

              {children}
            </div>
          </div>
        </div>
      </main>
      {/* <SiteFooter /> */}
    </>
  );
}

