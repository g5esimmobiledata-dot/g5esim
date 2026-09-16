'use client';

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  Menu,
  Globe,
  User,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
  Headphones,
  MessageCircle,
  X,
  Gift,
  ArrowRightLeft,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { CurrencySelector } from '@/components/CurrencySelector';
import { useUser } from '@/hooks/use-user';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/TranslationContext';
import ReactCountryFlag from 'react-country-flag';
import { NotificationBell } from '../NotificationBell';
import { useQuery } from '@tanstack/react-query';
import { useSettingByKey } from '@/hooks/useSettings';
import { GiFastBackwardButton } from 'react-icons/gi';
import { TfiGift } from 'react-icons/tfi';
import { LanguageSwitcher } from '../LanguageSwitcher';

type StorefrontInfo = {
  storeName?: string | null;
  logoUrl?: string | null;
};

export function SiteHeader() {
  const { isAuthenticated, isLoading, user, refetchUser } = useUser();
  const { toast } = useToast();
  const { languages, languageCode, setLanguage, t, language } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  const { theme } = useTheme();
  const isHomePage = location === '/';
  const lightLogo = useSettingByKey('logo');
  const darkLogo = useSettingByKey('dark_logo');
  const platformLogo = theme === 'dark' ? (darkLogo || lightLogo) : lightLogo;
  const { data: storefront } = useQuery<StorefrontInfo | null>({
    queryKey: ['/api/reseller/storefront/current'],
  });
  const logo = storefront?.logoUrl || platformLogo;
  const displayName = storefront?.storeName || 'eSIMConnect';

  // console.log('logo', theme);

  const { data: navlinks } = useQuery({
    queryKey: ['/api/pages'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/pages');
      return res.json();
    },
  });
  const { data: settings } = useQuery({
    queryKey: ['/api/public/settings'],
  });

  // console.log('settings_users', settings);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.removeQueries({ queryKey: ['/api/notifications'] });
      refetchUser();
      toast({ title: 'Success', description: 'Logged out successfully' });
      setLocation('/');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to logout', variant: 'destructive' });
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setResourcesOpen(false);
    setPagesOpen(false);
    setLanguageOpen(false);
  };

  const mobileMenuLinkClass =
    'block py-2.5 sm:py-3 px-3 text-sm sm:text-base font-medium text-slate-900 hover:text-slate-950 hover:bg-slate-100 rounded-md transition-all';
  const mobileMenuButtonClass =
    'w-full flex items-center justify-between py-2.5 sm:py-3 px-3 text-sm sm:text-base font-medium text-slate-900 hover:text-slate-950 hover:bg-slate-100 rounded-md transition-all';
  const mobileMenuSubItemClass =
    'flex items-center gap-2 py-2 px-3 text-sm text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-md transition-all';
  const mobileMenuCompactLinkClass =
    'block py-2 px-3 text-sm font-medium text-slate-800 hover:text-slate-950 hover:bg-slate-100 rounded-md transition-all';

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-sm
        ${isScrolled || isHomePage
          ? 'dark:bg-background/95 bg-white/95 dark:bg-black/95 shadow-sm border-b dark:border-border/50 border-border/50'
          : 'bg-transparent backdrop-blur-sm'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-0">
        <div className="flex h-14 sm:h-16 md:h-18 items-center justify-between gap-2 sm:gap-4 px-3">
          {/* Logo */}
          {logo ? (
            <Link href="/" data-testid="link-home" className="flex-shrink-0">
              <img src={logo} alt={displayName} className="h-12 max-w-[220px] object-contain" />
            </Link>
          ) : (
            <Link href="/" data-testid="link-home" className="flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all duration-200 hover:scale-105 group">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center transition-transform duration-200 hover:rotate-12">
                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
                <span className="font-bold text-base sm:text-lg dark:text-white text-foreground group-hover:text-teal-500 transition-colors duration-200">
                  {displayName}
                </span>
              </div>
            </Link>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1" data-testid="nav-main">
            <Link href="/what-is-esim">
              <span className="px-3 py-2 text-sm font-medium dark:text-white/90 text-foreground/90  hover:text-primary   transition-all duration-200 cursor-pointer">
                {t('website.nav.whatIsEsim', 'What is an eSIM')}
              </span>
            </Link>

            <Link href="/about-us">
              <span className="px-3 py-2 text-sm font-medium 0 dark:text-white/90 text-foreground/90  hover:text-primary   transition-all duration-200 cursor-pointer">
                {t('website.nav.aboutUs', 'About Us')}
              </span>
            </Link>

            {/* Resources Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="px-3 py-2 text-sm font-medium dark:text-white/90 text-foreground/90 hover:dark:text-white hover:text-foreground   transition-all duration-200 cursor-pointer flex items-center gap-1 group">
                  {t('website.nav.resources', 'Resources')}
                  <ChevronDown className="h-4 w-4 dark:text-white/80 transition-transform duration-200 group-hover:rotate-180" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 dark:bg-background/95 bg-white/95 backdrop-blur-lg dark:border-border/50 border-border/50"
              >
                <DropdownMenuItem asChild>
                  <Link
                    href="/account/support"
                    className="flex items-center gap-2 cursor-pointer text-foreground hover:bg-accent dark:text-white"
                  >
                    <Headphones className="h-4 w-4" />
                    {t('website.nav.helpCenter', 'Support Ticket')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/blog"
                    className="flex items-center gap-2 cursor-pointer text-foreground hover:bg-accent dark:text-white"
                  >
                    <BookOpen className="h-4 w-4" />
                    {t('website.nav.blog', 'Blog')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/faq"
                    className="flex items-center gap-2 cursor-pointer text-foreground hover:bg-accent dark:text-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('website.nav.faqs', 'FAQs')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/gift-cards"
                    className="flex items-center gap-2 cursor-pointer text-foreground hover:bg-accent dark:text-white"
                  >
                    <Gift className="h-4 w-4" />
                    {t('website.nav.giftCards', 'Gift Cards')}
                  </Link>
                </DropdownMenuItem>
                {/* <DropdownMenuItem asChild>
                  <a
                    href="/account/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 cursor-pointer text-foreground hover:bg-accent dark:text-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t("website.nav.helpCenterExternal", "Help Center")}
                  </a>
                </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Pages Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="px-3 py-2 text-sm font-medium dark:text-white/90 text-foreground/90 hover:dark:text-white hover:text-foreground hover:dark:bg-white/10 hover:bg-black/5  transition-all duration-200 cursor-pointer flex items-center gap-1 group">
                  {t("website.nav.pages", "Pages")}
                  <ChevronDown className="h-4 w-4 dark:text-white/80 transition-transform duration-200 group-hover:rotate-180" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 dark:bg-background/95 bg-white/95 backdrop-blur-lg dark:border-border/50 border-border/50"
              >
                {navlinks?.data?.map((page: any) => (
                  <DropdownMenuItem key={page.id} asChild>
                    <Link
                      href={`/pages/${page.slug}`}
                      className="flex items-center gap-2 cursor-pointer text-foreground hover:bg-accent dark:text-white"
                    >
                      <FileText className="h-4 w-4" />
                      {page.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {navlinks?.data?.length === 0 && (
                  <DropdownMenuItem disabled>No pages available</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/supported-devices">
              <span className="px-3 py-2 text-sm font-medium dark:text-white/90 text-foreground/90  hover:text-primary   transition-all duration-200 cursor-pointer">
                {t('website.nav.supportedDevices', 'Supported Devices')}
              </span>
            </Link>
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* <Link href="/gift-cards" className="flex-shrink-0 animate-bounce pr-2 ">
              {' '}
              <TfiGift className=" h-5 w-5" />
            </Link> */}
            {/* Language Selector - Desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="hidden md:flex items-center gap-2 rounded-full px-2.5 sm:px-3 py-1.5 sm:py-2 border dark:border-white/20 border-border/30 hover:dark:border-white/40 hover:border-foreground/30 hover:dark:bg-white/10 hover:bg-black/5 backdrop-blur-sm transition-all duration-200 cursor-pointer">
                  <ReactCountryFlag
                    countryCode={language?.flagCode || 'US'}
                    svg
                    style={{ width: '16px', height: '12px' }}
                  />
                  <span className="text-xs sm:text-sm font-medium dark:text-white/90 text-foreground/90">
                    {languageCode.toUpperCase()}
                  </span>
                  <ChevronDown className="h-3 w-3 dark:text-white/80" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="
    w-56
    bg-card/95
    backdrop-blur-lg
    border border-border/50
  "
              >
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('common.button.selectLanguage', 'Select Language')}
                </div>

                {languages.map((lang) => {
                  const active = languageCode === lang.code;

                  return (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={cn(
                        'flex items-center justify-between cursor-pointer',
                        'hover:bg-accent ',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <ReactCountryFlag
                          countryCode={lang.flagCode}
                          svg
                          style={{ width: '20px', height: '15px' }}
                        />
                        <div>
                          <div
                            className={cn(
                              'font-medium',
                              active ? 'text-foreground  ' : 'text-foreground',
                            )}
                          >
                            {lang.nativeName}
                          </div>
                          <div className="text-xs text-muted-foreground">{lang.name}</div>
                        </div>
                      </div>

                      {active && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {isAuthenticated && (
              <div className="">
                <NotificationBell
                  className="text-white hover:bg-white/10 hover:text-white"
                  iconClassName="text-white"
                />
              </div>
            )}
            <div className="hidden sm:block">
              <CurrencySelector variant="header" />
            </div>
            <div className="hidden sm:block">
              <ThemeToggle
                className="text-white hover:bg-white/10 hover:text-white"
                iconClassName="text-white"
              />
            </div>

            {/* Primary CTA - Desktop */}
            <Link href="/destinations">
              <span className="hidden md:flex text-xs sm:text-sm font-semibold bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-full px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl whitespace-nowrap">
                {t('website.nav.seePacks', 'See packs')}
              </span>
            </Link>

            {/* Auth buttons - Desktop */}
            {!isLoading && !isAuthenticated && (
              <Link href="/login">
                <span className="hidden md:flex text-xs sm:text-sm font-medium text-white/90 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 border border-white/20 hover:border-white/40 hover:bg-white/10 hover:text-white backdrop-blur-sm transition-all duration-200 gap-2 items-center whitespace-nowrap">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {t('website.nav.signIn', 'Sign In')}
                </span>
              </Link>
            )}

            {!isLoading && isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <span className="hidden md:block rounded-full p-1 hover:bg-white/10 backdrop-blur-sm transition-all duration-200 cursor-pointer">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all duration-200">
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white dark:bg-gray-900 backdrop-blur-lg border border-gray-200 dark:border-gray-800"
                >
                  <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{user?.email}</p>
                  </div>
                  {user?.role === 'reseller' && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/reseller/dashboard"
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-primary"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Switch to Reseller Mode
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link
                      href="/account/profile"
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-900 dark:text-gray-100"
                    >
                      <User className="h-4 w-4" />
                      {t("website.nav.profile", "Profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/account/orders"
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-900 dark:text-gray-100"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {t("website.nav.myOrders", "My Orders")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {t("website.nav.signOut", "Sign Out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <div className="flex items-center gap-1 xl:hidden">
                 <LanguageSwitcher/>

                 <ThemeToggle
                   className="text-white hover:bg-white/10 hover:text-white"
                   iconClassName="text-white"
                 />
               
                <SheetTrigger asChild>
                  <button className="p-1.5 sm:p-2 hover:bg-white/10 rounded-md transition-all duration-200">
                    <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    <span className="sr-only">Toggle Menu</span>
                  </button>
                </SheetTrigger>
              </div>
              <SheetContent
                side="right"
                closeClassName="text-slate-500 hover:text-slate-950 dark:text-slate-500 dark:hover:text-slate-950"
                className="
    w-[85vw] sm:w-80
    p-0
    border-slate-200
    bg-white
    text-slate-950
    dark:border-slate-200
    dark:bg-white
    dark:text-slate-950
    backdrop-blur-lg
    overflow-y-auto
    pb-20
  "
              >
                <SheetHeader className="border-b border-slate-200 p-4 sm:p-6 pr-12 text-left">
                  <SheetTitle className="text-lg text-slate-950">
                    {t("website.nav.menu", "Menu")}
                  </SheetTitle>
                </SheetHeader>

                <nav className="flex flex-col p-4 sm:p-6 space-y-1 bg-white text-slate-950 dark:bg-white dark:text-slate-950">
                  {/* User Profile - Mobile */}
                  {isAuthenticated && (
                    <div className="mb-4 pb-4 border-b border-slate-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-700" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-950">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {user?.role === 'reseller' && (
                          <Link href="/reseller/dashboard" onClick={closeMobileMenu}>
                            <span className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/15">
                              <ArrowRightLeft className="h-4 w-4" />
                              Switch to Reseller Mode
                            </span>
                          </Link>
                        )}
                        <Link href="/account/profile" onClick={closeMobileMenu}>
                          <span className={mobileMenuCompactLinkClass}>
                            {t("website.nav.profile", "Profile")}
                          </span>
                        </Link>
                        <Link href="/account/orders" onClick={closeMobileMenu}>
                          <span className={mobileMenuCompactLinkClass}>
                            {t("website.nav.myOrders", "My Orders")}
                          </span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Main Navigation */}
                  <Link href="/what-is-esim" onClick={closeMobileMenu}>
                    <span className={mobileMenuLinkClass}>
                      {t('website.nav.whatIsEsim', 'What is an eSIM')}
                    </span>
                  </Link>

                  <Link href="/about-us" onClick={closeMobileMenu}>
                    <span className={mobileMenuLinkClass}>
                      {t('website.nav.aboutUs', 'About Us')}
                    </span>
                  </Link>

                  {/* Resources Dropdown - Mobile */}
                  <div className="space-y-1">
                    <button
                      onClick={() => setResourcesOpen(!resourcesOpen)}
                      className={mobileMenuButtonClass}
                    >
                      {t('website.nav.resources', 'Resources')}
                      <ChevronRight
                        className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${resourcesOpen ? 'rotate-90' : ''
                          }`}
                      />
                    </button>
                    {resourcesOpen && (
                      <div className="ml-4 space-y-1 border-l-2 border-teal-500/30 pl-3">
                        <Link href="/account/support" onClick={closeMobileMenu}>
                          <span className={mobileMenuSubItemClass}>
                            <Headphones className="h-4 w-4" />
                            {t('website.nav.helpCenter', 'Support Ticket')}
                          </span>
                        </Link>
                        <Link href="/blog" onClick={closeMobileMenu}>
                          <span className={mobileMenuSubItemClass}>
                            <BookOpen className="h-4 w-4" />
                            {t('website.nav.blog', 'Blog')}
                          </span>
                        </Link>
                        <Link href="/faq" onClick={closeMobileMenu}>
                          <span className={mobileMenuSubItemClass}>
                            <MessageCircle className="h-4 w-4" />
                            {t('website.nav.faqs', 'FAQs')}
                          </span>
                        </Link>
                            <Link href="/gift-cards" onClick={closeMobileMenu}>
                          <span className={mobileMenuSubItemClass}>
                            <Gift className="h-4 w-4" />
                           {t('website.nav.giftCards', 'Gift Cards')}
                          </span>
                        </Link>
                        <a
                          href="/account/support"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={closeMobileMenu}
                        >
                          <span className={mobileMenuSubItemClass}>
                            <MessageCircle className="h-4 w-4" />
                            {t("website.nav.helpCenterExternal", "Help Center")}
                          </span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Pages Dropdown - Mobile */}
                  {navlinks?.data && navlinks.data.length > 0 && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setPagesOpen(!pagesOpen)}
                        className={mobileMenuButtonClass}
                      >
                        {t("website.nav.pages", "Pages")}
                        <ChevronRight
                          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${pagesOpen ? 'rotate-90' : ''
                            }`}
                        />
                      </button>
                      {pagesOpen && (
                        <div className="ml-4 space-y-1 border-l-2 border-teal-500/30 pl-3">
                          {navlinks.data.map((page: any) => (
                            <Link
                              key={page.id}
                              href={`/pages/${page.slug}`}
                              onClick={closeMobileMenu}
                            >
                              <span className={mobileMenuSubItemClass}>
                                <FileText className="h-4 w-4" />
                                {page.title}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Link href="/supported-devices" onClick={closeMobileMenu}>
                    <span className={mobileMenuLinkClass}>
                      {t('website.nav.supportedDevices', 'Supported Devices')}
                    </span>
                  </Link>

                  <div className="pt-4">
                    <Link href="/destinations" onClick={closeMobileMenu}>
                      <span className="block w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-sm font-semibold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-center">
                        {t('website.nav.seePacks', 'See packs')}
                      </span>
                    </Link>
                  </div>

                  {/* Mobile Settings Section */}
                  <div className="pt-4 mt-4 border-t border-slate-200 space-y-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3">
                      {t("website.nav.settings", "Settings")}
                    </p>

                    {/* Language Selector - Mobile */}
                    <div>
                      <button
                        onClick={() => setLanguageOpen(!languageOpen)}
                        className="w-full flex items-center justify-between py-2.5 px-3 text-sm font-medium text-slate-900 hover:bg-slate-100 rounded-md transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          {t('common.button.selectLanguage', 'Language')}
                        </div>
                        <div className="flex items-center gap-2">
                          <ReactCountryFlag
                            countryCode={language?.flagCode || 'US'}
                            svg
                            style={{ width: '16px', height: '12px' }}
                          />
                          <span className="text-xs text-slate-700">
                            {languageCode.toUpperCase()}
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${languageOpen ? 'rotate-90' : ''
                              }`}
                          />
                        </div>
                      </button>
                      {languageOpen && (
                        <div className="ml-4 mt-2 space-y-1 border-l-2 border-teal-500/30 pl-3 max-h-60 overflow-y-auto">
                          {languages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                setLanguage(lang.code);
                                setLanguageOpen(false);
                              }}
                              className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-all ${languageCode === lang.code
                                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <ReactCountryFlag
                                  countryCode={lang.flagCode}
                                  svg
                                  style={{ width: '18px', height: '13px' }}
                                />
                                <span>{lang.nativeName}</span>
                              </div>
                              {languageCode === lang.code && (
                                <div className="h-2 w-2 rounded-full bg-white" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Theme, Currency, Notifications */}
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm font-medium text-slate-900">
                        Theme
                      </span>
                      <ThemeToggle />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm font-medium text-slate-900">
                        Currency
                      </span>
                      <CurrencySelector />
                    </div>
                    {isAuthenticated && (
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm font-medium text-slate-900">
                          Notifications
                        </span>
                        <NotificationBell />
                      </div>
                    )}
                  </div>

                  {/* Auth Section - Mobile */}
                  {!isAuthenticated && (
                    <div className="pt-4 mt-4 border-t border-slate-200">
                      <Link href="/login" onClick={closeMobileMenu}>
                        <span className="flex items-center justify-center gap-2 w-full border border-slate-200 text-sm font-medium text-slate-900 py-2.5 px-4 rounded-xl hover:bg-slate-100 transition-all">
                          <User className="h-4 w-4" />
                          {t('website.nav.signIn', 'Sign In')}
                        </span>
                      </Link>
                    </div>
                  )}

                  {isAuthenticated && (
                    <div className="pt-4 mt-4 border-t border-slate-200">
                      <button
                        onClick={() => {
                          handleLogout();
                          closeMobileMenu();
                        }}
                        className="w-full text-destructive hover:bg-destructive/10 text-sm font-medium py-2.5 px-4 rounded-xl transition-all"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
