// src/components/layouts/PublicLayout.tsx
import { ReactNode } from 'react';
import { useLocation } from 'wouter';
// import { Header } from './Header';
// import NewFooter from './NewFooter';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { FloatingButtons } from '@/components/sections/FloatingButtons';
// import { TopBanner } from './marketing';

interface PublicLayoutProps {
  readonly children: ReactNode;
}

export function PublicLayout({ children }: Readonly<PublicLayoutProps>) {
  const [location] = useLocation();
  const isAccountRoute = location.startsWith('/account');

  if (isAccountRoute) {
    return (
      <div className="min-h-dvh overflow-x-hidden bg-[linear-gradient(180deg,#0b1730_0%,#071126_18rem,#071126_100%)]">
        <SiteHeader />
        <main className="min-h-dvh bg-[linear-gradient(180deg,#0b1730_0%,#071126_18rem,#071126_100%)]">
          {children}
        </main>
        <FloatingButtons />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* <TopBanner
        message="Get your eSIM in just 2 minutes on your mobile"
        ctaText="Order Here"
        ctaLink="/destinations"
      /> */}
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <FloatingButtons />
    </div>
  );
}

// src/components/layouts/EmptyLayout.tsx

interface EmptyLayoutProps {
  readonly children: ReactNode;
}

export function EmptyLayout({ children }: EmptyLayoutProps) {
  return <>{children}</>;
}
