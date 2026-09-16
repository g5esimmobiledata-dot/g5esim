import { useLocation } from 'wouter';
import { FloatingDock } from '@/components/ui/floating-dock';
import { Home, Globe, Smartphone, ShoppingBag, HeadphonesIcon, User } from 'lucide-react';
import { RiCustomerService2Fill } from 'react-icons/ri';
import { useTranslation } from '@/contexts/TranslationContext';

export function GlobalFloatingNav() {
  const [location] = useLocation();
  const { t } = useTranslation();

  const navLinks = [
    {
      title: t('website.nav.home', 'Home'),
      icon: <Home className="h-full w-full" />,
      href: '/',
    },
    {
      title: t('website.nav.destinations', 'Destinations'),
      icon: <Globe className="h-full w-full" />,
      href: '/destinations',
    },
    {
      title: t('website.nav.supported', 'Supported'),
      icon: <Smartphone className="h-full w-full" />,
      href: '/supported-devices',
    },
    {
      title: t('website.nav.orders', 'Orders'),
      icon: <ShoppingBag className="h-full w-full" />,
      href: '/account/orders',
    },
    {
      title: t('website.nav.support', 'Support'),
      icon: <RiCustomerService2Fill className="h-full w-full" />,
      href: '/account/support',
    },
    {
      title: t('website.nav.account', 'Account'),
      icon: <User className="h-full w-full" />,
      href: '/account/profile',
    },
  ];

  const hiddenPaths = [
    '/admin',
    '/enterprise/dashboard',
    '/enterprise/quotes',
    '/enterprise/orders',
    '/enterprise/esims',
    '/enterprise/login',
    '/checkout',
    '/login',
    '/mobile-topup',
    '/order/processing',
    '/unified-checkout',
  ];

  const shouldHide = hiddenPaths.some((path) => location.startsWith(path));

  if (shouldHide) {
    return null;
  }

  return <FloatingDock items={navLinks} />;
}
