import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

function getFallbackRoute(location: string) {
  if (location === '/admin/login' || location === '/login') return '/';
  if (location.startsWith('/admin')) return '/admin/dashboard';
  if (location.startsWith('/reseller')) return '/reseller/dashboard';
  if (location.startsWith('/account')) return '/account/profile';
  if (location.startsWith('/enterprise/dashboard')) return '/enterprise/dashboard';
  if (location.startsWith('/enterprise')) return '/enterprise';
  return '/';
}

export function GlobalBackButton() {
  const [location, setLocation] = useLocation();
  const isPanelPage = location.startsWith('/admin') || location.startsWith('/reseller');
  const isPublicFloatingNavVisible =
    !isPanelPage &&
    !location.startsWith('/enterprise/dashboard') &&
    !location.startsWith('/enterprise/quotes') &&
    !location.startsWith('/enterprise/orders') &&
    !location.startsWith('/enterprise/esims') &&
    !location.startsWith('/enterprise/login') &&
    !location.startsWith('/checkout') &&
    !location.startsWith('/login') &&
    !location.startsWith('/mobile-topup') &&
    !location.startsWith('/order/processing') &&
    !location.startsWith('/unified-checkout');

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    setLocation(getFallbackRoute(location));
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        'fixed z-[9998] inline-flex h-11 items-center rounded-full border border-slate-200 bg-white/95 px-4 text-sm font-semibold text-slate-800 shadow-lg shadow-slate-900/10 backdrop-blur transition hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-900/95 dark:text-white dark:hover:bg-slate-800',
        isPanelPage ? 'bottom-5 left-4 lg:left-[17.5rem]' : 'left-4',
        isPublicFloatingNavVisible ? 'bottom-20 md:bottom-6' : 'bottom-5',
      )}
      aria-label="Go back"
      data-testid="button-global-back"
    >
      <span>Back</span>
    </button>
  );
}
