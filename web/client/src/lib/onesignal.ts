type OneSignalPublicConfig = {
  enabled: boolean;
  appId: string;
  safariWebId?: string;
  promptEnabled?: boolean;
  serviceWorkerPath?: string;
  serviceWorkerScope?: string;
};

type CurrentUser = {
  id: string;
  email?: string | null;
  role?: string | null;
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>;
  }
}

const SDK_SCRIPT_ID = "onesignal-web-sdk";
const SDK_SCRIPT_SRC = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
const PROMPT_SESSION_KEY = "onesignal-push-prompt-shown";

let configPromise: Promise<OneSignalPublicConfig | null> | null = null;
let sdkLoadPromise: Promise<void> | null = null;
let initPromise: Promise<any | null> | null = null;

function isAdminPath() {
  return window.location.pathname.startsWith("/admin");
}

function browserCanUsePush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    window.isSecureContext
  );
}

async function getOneSignalConfig() {
  if (!configPromise) {
    configPromise = fetch("/api/onesignal/config", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        const json = await response.json();
        return (json?.data || json) as OneSignalPublicConfig;
      })
      .catch((error) => {
        console.warn("OneSignal config could not be loaded:", error);
        return null;
      });
  }

  return configPromise;
}

function loadOneSignalScript() {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    if (document.getElementById(SDK_SCRIPT_ID)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = SDK_SCRIPT_ID;
    script.src = SDK_SCRIPT_SRC;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load OneSignal Web SDK"));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

async function initOneSignal() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (isAdminPath() || !browserCanUsePush()) return null;

    const config = await getOneSignalConfig();
    if (!config?.enabled || !config.appId) return null;

    window.OneSignalDeferred = window.OneSignalDeferred || [];

    const instancePromise = new Promise<any | null>((resolve) => {
      window.OneSignalDeferred!.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: config.appId,
            safari_web_id: config.safariWebId || undefined,
            serviceWorkerPath: config.serviceWorkerPath || "push/onesignal/OneSignalSDKWorker.js",
            serviceWorkerParam: {
              scope: config.serviceWorkerScope || "/push/onesignal/",
            },
            notifyButton: {
              enable: false,
            },
          });
          resolve(OneSignal);
        } catch (error) {
          console.warn("OneSignal initialization failed:", error);
          resolve(null);
        }
      });
    });

    await loadOneSignalScript();
    return instancePromise;
  })();

  return initPromise;
}

async function maybePromptForPush(OneSignal: any, promptEnabled?: boolean) {
  if (!promptEnabled || !OneSignal?.Slidedown?.promptPush) return;
  if (sessionStorage.getItem(PROMPT_SESSION_KEY)) return;
  if (Notification.permission === "denied") return;
  if (OneSignal.Notifications?.permission === true) return;
  if (OneSignal.Notifications?.isPushSupported && !OneSignal.Notifications.isPushSupported()) return;

  sessionStorage.setItem(PROMPT_SESSION_KEY, "true");
  window.setTimeout(() => {
    OneSignal.Slidedown.promptPush().catch((error: unknown) => {
      console.warn("OneSignal prompt failed:", error);
    });
  }, 1200);
}

export async function identifyOneSignalUser(user: CurrentUser | null) {
  if (!user?.id || isAdminPath()) return;

  const [config, OneSignal] = await Promise.all([getOneSignalConfig(), initOneSignal()]);
  if (!config?.enabled || !OneSignal) return;

  try {
    await OneSignal.login(String(user.id));
    if (user.email && OneSignal.User?.addEmail) {
      await OneSignal.User.addEmail(user.email);
    }
    await maybePromptForPush(OneSignal, config.promptEnabled);
  } catch (error) {
    console.warn("OneSignal user identification failed:", error);
  }
}

export async function clearOneSignalUser() {
  if (isAdminPath()) return;

  const OneSignal = await initOneSignal();
  if (!OneSignal?.logout) return;

  try {
    await OneSignal.logout();
  } catch (error) {
    console.warn("OneSignal logout failed:", error);
  }
}
