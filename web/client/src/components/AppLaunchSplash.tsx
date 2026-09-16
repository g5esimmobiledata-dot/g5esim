import { useEffect, useState } from 'react';

const SPLASH_SKIP_ROUTES = /^\/(admin|reseller|enterprise|telegram)(\/|$)/i;
const SPLASH_DURATION_MS = 2000;

export function AppLaunchSplash({ children }: { readonly children: React.ReactNode }) {
  const [hasStarted, setHasStarted] = useState(() => {
    if (typeof window === 'undefined') return true;
    return SPLASH_SKIP_ROUTES.test(window.location.pathname);
  });

  useEffect(() => {
    if (hasStarted) return;
    const timer = window.setTimeout(() => setHasStarted(true), SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [hasStarted]);

  if (hasStarted) {
    return <>{children}</>;
  }

  return (
    <main
      className="relative isolate flex min-h-screen items-center overflow-hidden bg-[#061226] px-6 py-8 text-white"
      style={{ minHeight: '100dvh' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(45,212,191,0.24),transparent_34%),radial-gradient(circle_at_82%_72%,rgba(74,168,255,0.22),transparent_36%),linear-gradient(180deg,#001b46_0%,#061226_58%,#020713_100%)]" />
      <img
        src="/IMAGE+4.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 hidden w-[58rem] max-w-[62vw] translate-x-16 opacity-45 lg:block"
      />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        <img
          src="/g5-app-icon-192.png"
          alt="G5 eSIM"
          className="mb-6 h-20 w-20 rounded-2xl bg-white/95 p-4 shadow-2xl shadow-cyan-500/20"
        />
        <p className="text-base font-semibold text-cyan-200">G5 eSIM</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Stay connected anywhere
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
          Global eSIM, eRoaming, SMS, and voice services in one simple app.
        </p>
        <div className="mt-10 h-1.5 w-44 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-full origin-left animate-[g5-splash-bar_2s_linear_forwards] rounded-full bg-cyan-300" />
        </div>
      </div>
    </main>
  );
}
