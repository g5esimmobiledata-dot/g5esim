import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Globe2,
  Headphones,
  Loader2,
  Mail,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Smartphone,
  Wallet,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

type TelegramWebApp = {
  initData: string;
  colorScheme?: "light" | "dark";
  platform?: string;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  MainButton?: {
    hide: () => void;
  };
};

type TelegramUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  displayName: string;
};

type MiniAppUser = {
  id: string;
  email: string;
  name: string | null;
  walletBalance: string;
};

type TelegramAuthData = {
  linked: boolean;
  user?: MiniAppUser;
  telegramUser?: TelegramUser;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type QuickAction = {
  label: string;
  description: string;
  path: string;
  icon: typeof Globe2;
  tone: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

const TELEGRAM_SDK_ID = "telegram-web-app-sdk";
const G5_LOGO_DARK_SRC = "/g5-logo-dark.png";
const G5_LOGO_LIGHT_SRC = "/g5-logo-light.png";
const FALLBACK_BOT_USERNAME = "G5esimBot";

function loadTelegramSdk() {
  if (typeof window === "undefined" || window.Telegram?.WebApp) {
    return Promise.resolve();
  }

  const existing = document.getElementById(TELEGRAM_SDK_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise<void>((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      setTimeout(() => resolve(), 1200);
    });
  }

  return new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.id = TELEGRAM_SDK_ID;
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

async function apiJson<T>(method: string, url: string, data?: unknown) {
  const res = await apiRequest(method, url, data);
  return (await res.json()) as ApiEnvelope<T>;
}

function getTelegramWebApp() {
  return window.Telegram?.WebApp || null;
}

function openAppPath(path: string) {
  window.location.href = path;
}

export default function TelegramMiniApp() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [booting, setBooting] = useState(true);
  const [linking, setLinking] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState("");

  const greetingName = useMemo(
    () => user?.name || telegramUser?.displayName || "G5eSIM customer",
    [telegramUser?.displayName, user?.name],
  );

  const walletDisplay = useMemo(() => {
    const value = Number(user?.walletBalance ?? 0);
    return Number.isFinite(value) ? `$${value.toFixed(2)}` : user?.walletBalance || "$0.00";
  }, [user?.walletBalance]);

  const telegramHandle = telegramUser?.username ? `@${telegramUser.username}` : `@${FALLBACK_BOT_USERNAME}`;

  useEffect(() => {
    let active = true;

    async function boot() {
      await loadTelegramSdk();
      if (!active) return;

      const tg = getTelegramWebApp();
      tg?.ready?.();
      tg?.expand?.();
      tg?.MainButton?.hide?.();
      tg?.setHeaderColor?.("#f4f8fb");
      tg?.setBackgroundColor?.("#f4f8fb");

      const rawInitData = tg?.initData || "";
      setInitData(rawInitData);

      if (!rawInitData) {
        setError("Open this page inside Telegram from @G5esimBot to connect your account.");
        setBooting(false);
        return;
      }

      try {
        const response = await apiJson<TelegramAuthData>("POST", "/api/telegram/auth", {
          initData: rawInitData,
        });

        if (response.data?.telegramUser) {
          setTelegramUser(response.data.telegramUser);
        }

        if (response.data?.linked && response.data.user) {
          setUser(response.data.user);
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        }
      } catch (authError: any) {
        setError(authError.message || "Telegram login failed");
      } finally {
        setBooting(false);
      }
    }

    void boot();
    return () => {
      active = false;
    };
  }, []);

  async function requestOtp(event: React.FormEvent) {
    event.preventDefault();
    if (!initData) return;

    setLinking(true);
    setError(null);
    try {
      await apiJson("POST", "/api/telegram/link/start", { initData, email: email.trim() });
      setOtpSent(true);
      toast({
        title: "Verification sent",
        description: "Check your email for the G5eSIM code.",
      });
    } catch (linkError: any) {
      setError(linkError.message || "Could not send verification code");
    } finally {
      setLinking(false);
    }
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    if (!initData) return;

    setLinking(true);
    setError(null);
    try {
      const response = await apiJson<TelegramAuthData>("POST", "/api/telegram/link/verify", {
        initData,
        email: email.trim(),
        otp: otp.trim(),
      });

      if (response.data?.telegramUser) {
        setTelegramUser(response.data.telegramUser);
      }
      if (response.data?.user) {
        setUser(response.data.user);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Connected",
        description: "Your Telegram account is linked with G5eSIM.",
      });
    } catch (verifyError: any) {
      setError(verifyError.message || "Could not verify the code");
    } finally {
      setLinking(false);
    }
  }

  const quickActions: QuickAction[] = [
    {
      label: "Buy eSIM",
      description: "Countries and data plans",
      path: "/destinations",
      icon: Globe2,
      tone: "bg-[#bff36b] text-[#102033]",
    },
    {
      label: "My eSIMs",
      description: "QR codes and activation",
      path: "/account/esims",
      icon: Smartphone,
      tone: "bg-[#6ea2cc] text-white",
    },
    {
      label: "eRoaming",
      description: "Numbers, SMS, voice, voicemail",
      path: "/account/my-dids",
      icon: PhoneCall,
      tone: "bg-[#1c2b40] text-white",
    },
    {
      label: "Wallet",
      description: "Top up and balance history",
      path: "/account/wallet",
      icon: Wallet,
      tone: "bg-[#edf4fa] text-[#1c2b40]",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#162235]" style={{ minHeight: "100dvh" }}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-5 pt-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md border border-[#d8e5ef] bg-white px-2">
              <img src={G5_LOGO_DARK_SRC} alt="G5" className="h-8 w-auto object-contain" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-bold leading-5">G5eSIM</div>
              <div className="truncate text-xs font-medium text-[#6b7b8f]">Telegram access</div>
            </div>
          </div>
          <div className="shrink-0 rounded-md border border-[#cfe0ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#31506d]">
            {telegramHandle}
          </div>
        </header>

        {booting ? (
          <section className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="flex h-24 w-32 items-center justify-center rounded-md border border-[#d8e5ef] bg-white px-4">
              <img src={G5_LOGO_DARK_SRC} alt="G5eSIM" className="h-14 w-auto object-contain" />
            </div>
            <Loader2 className="mt-6 h-8 w-8 animate-spin text-[#6ea2cc]" />
            <p className="mt-4 text-sm font-medium text-[#52647a]">Opening your secure Telegram session</p>
          </section>
        ) : user ? (
          <section className="mt-5 flex flex-1 flex-col gap-4">
            <div className="overflow-hidden rounded-md border border-[#d8e5ef] bg-white">
              <div className="bg-[#162235] px-5 py-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-[#bff36b]">Connected account</p>
                    <h1 className="mt-2 truncate text-2xl font-bold leading-tight">{greetingName}</h1>
                    <p className="mt-2 truncate text-sm text-[#c8d6e3]">{user.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <div className="flex h-11 w-16 items-center justify-center rounded-md border border-white/10 bg-white/5 px-2">
                      <img src={G5_LOGO_LIGHT_SRC} alt="G5" className="h-8 w-auto object-contain" />
                    </div>
                    <CheckCircle2 className="h-6 w-6 text-[#bff36b]" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-[#d8e5ef]">
                <div className="px-5 py-4">
                  <div className="text-xs font-semibold uppercase text-[#738397]">Wallet</div>
                  <div className="mt-1 text-2xl font-bold">{walletDisplay}</div>
                </div>
                <div className="px-5 py-4">
                  <div className="text-xs font-semibold uppercase text-[#738397]">Status</div>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-[#e9f8d5] px-2.5 py-1 text-sm font-bold text-[#254915]">
                    <Zap className="h-4 w-4" />
                    Ready
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-[#d8e5ef] bg-white p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-[#203149]">Quick actions</h2>
                <span className="text-xs font-medium text-[#738397]">Open in app</span>
              </div>
              <div className="grid gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.path}
                      type="button"
                      onClick={() => openAppPath(action.path)}
                      className="flex w-full items-center gap-3 rounded-md border border-[#e1ebf2] bg-[#fbfdff] p-3 text-left transition hover:border-[#6ea2cc] hover:bg-[#f1f7fb]"
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${action.tone}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-[#172235]">{action.label}</span>
                        <span className="mt-0.5 block truncate text-xs font-medium text-[#6b7b8f]">{action.description}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#6ea2cc]" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3 pt-1">
              <Button
                type="button"
                className="h-12 gap-2 rounded-md bg-[#bff36b] font-bold text-[#102033] hover:bg-[#aeea54]"
                onClick={() => setLocation("/account/support")}
              >
                <Headphones className="h-4 w-4" />
                Support
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 gap-2 rounded-md border-[#cfe0ec] bg-white font-bold text-[#22344b] hover:bg-[#edf4fa]"
                onClick={() => setLocation("/account/profile")}
              >
                <CreditCard className="h-4 w-4" />
                Profile
              </Button>
            </div>
          </section>
        ) : (
          <section className="mt-5 flex flex-1 flex-col gap-4">
            <div className="rounded-md border border-[#d8e5ef] bg-white">
              <div className="px-5 pt-5">
                <div className="flex h-16 w-24 items-center justify-center rounded-md border border-[#d8e5ef] bg-[#fbfdff] px-3">
                  <img src={G5_LOGO_DARK_SRC} alt="G5" className="h-10 w-auto object-contain" />
                </div>
                <h1 className="mt-5 text-2xl font-bold leading-tight text-[#162235]">Connect G5eSIM to Telegram</h1>
                <p className="mt-2 text-sm leading-6 text-[#52647a]">
                  Link your G5eSIM account once, then open eSIMs, eRoaming, wallet, and support directly from Telegram.
                </p>
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-[#d8e5ef] bg-[#f8fbfd] px-5 py-4 text-sm font-semibold text-[#31506d]">
                <ShieldCheck className="h-4 w-4 text-[#6ea2cc]" />
                Secure email verification
              </div>
            </div>

            {error ? (
              <Alert className="rounded-md border-[#e9b75f] bg-[#fff7e8] text-[#6b4315]">
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {!otpSent ? (
              <form className="space-y-3 rounded-md border border-[#d8e5ef] bg-white p-4" onSubmit={requestOtp}>
                <label className="text-sm font-bold text-[#22344b]" htmlFor="telegram-email">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#738397]" />
                  <Input
                    id="telegram-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-12 rounded-md border-[#cfe0ec] bg-[#fbfdff] pl-10 text-[#162235] placeholder:text-[#98a8b8]"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-md bg-[#162235] font-bold text-white hover:bg-[#22344b]"
                  disabled={linking || !initData}
                >
                  {linking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Send Verification Code
                </Button>
              </form>
            ) : (
              <form className="space-y-3 rounded-md border border-[#d8e5ef] bg-white p-4" onSubmit={verifyOtp}>
                <label className="text-sm font-bold text-[#22344b]" htmlFor="telegram-otp">
                  Verification code
                </label>
                <Input
                  id="telegram-otp"
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="6-digit code"
                  className="h-12 rounded-md border-[#cfe0ec] bg-[#fbfdff] text-center text-lg font-bold text-[#162235] placeholder:text-[#98a8b8]"
                  maxLength={8}
                  required
                />
                <Button
                  type="submit"
                  className="h-12 w-full rounded-md bg-[#162235] font-bold text-white hover:bg-[#22344b]"
                  disabled={linking || !initData}
                >
                  {linking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Connect Account
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full rounded-md font-semibold text-[#31506d] hover:bg-[#edf4fa] hover:text-[#162235]"
                  onClick={() => {
                    setOtp("");
                    setOtpSent(false);
                  }}
                >
                  Change email
                </Button>
              </form>
            )}

            <div className="mt-auto flex items-center justify-center gap-2 pt-2 text-xs font-semibold text-[#738397]">
              <MessageSquareText className="h-4 w-4" />
              Powered by G5eSIM customer services
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
