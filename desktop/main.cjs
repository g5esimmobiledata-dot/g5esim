const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG = {
  appName: "G5 eSIM Desktop",
  apiBaseUrl: "https://g5esim.mobile",
  adminUrl: "https://g5esim.mobile/admin/login?desktop=1",
  userLoginUrl: "https://g5esim.mobile/login?desktop=1&role=user&redirect=%2Faccount%2Fdashboard",
  agentLoginUrl: "https://g5esim.mobile/login?desktop=1&role=agent&redirect=%2Faccount%2Fdashboard",
  resellerLoginUrl: "https://g5esim.mobile/login?desktop=1&role=reseller&redirect=%2Freseller%2Fdashboard",
  desktopUrlLink: "https://g5esim.mobile/api/desktop/config",
  requestTimeoutMs: 8000,
  desktopToken: "",
};

const PORTAL_LOGIN_TARGETS = new Set(["user", "agent", "reseller"]);

let mainWindow;
let activeDesktopConfig = null;

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function mergeConfig(...configs) {
  const merged = {};
  for (const config of configs) {
    for (const [key, value] of Object.entries(config || {})) {
      if (value === undefined || value === null) continue;
      if (typeof value === "string" && value.trim() === "") continue;
      merged[key] = value;
    }
  }
  return merged;
}

function getDesktopConfig() {
  const bundledConfigPath = app.isPackaged
    ? path.join(process.resourcesPath, "desktop-config.json")
    : path.join(__dirname, "desktop-config.json");
  const userConfigPath = path.join(app.getPath("userData"), "desktop-config.json");
  const bundledConfig = readJson(bundledConfigPath);

  if (!fs.existsSync(userConfigPath)) {
    try {
      fs.writeFileSync(userConfigPath, JSON.stringify(mergeConfig(DEFAULT_CONFIG, bundledConfig), null, 2));
    } catch {
      // The bundled defaults are enough if the user config cannot be written.
    }
  }

  return mergeConfig(DEFAULT_CONFIG, bundledConfig, readJson(userConfigPath));
}

function desktopUrlCachePath() {
  return path.join(app.getPath("userData"), "desktop-url-cache.json");
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function normalizeDesktopConfigPayload(payload) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const loginTargets = data?.loginTargets && typeof data.loginTargets === "object" ? data.loginTargets : {};
  const normalized = {};

  if (isHttpUrl(data?.apiBaseUrl)) {
    normalized.apiBaseUrl = normalizeBaseUrl(data.apiBaseUrl);
  }

  if (isHttpUrl(data?.adminUrl)) {
    normalized.adminUrl = String(data.adminUrl);
  }

  const loginUrlKeys = ["userLoginUrl", "agentLoginUrl", "resellerLoginUrl"];
  for (const key of loginUrlKeys) {
    const targetKey = key.replace("LoginUrl", "");
    const url = data?.[key] || loginTargets[key] || loginTargets[targetKey];
    if (isHttpUrl(url)) {
      normalized[key] = String(url);
    }
  }

  if (isHttpUrl(data?.desktopUrlLink || data?.desktopConfigUrl)) {
    normalized.desktopUrlLink = String(data.desktopUrlLink || data.desktopConfigUrl);
  }

  return normalized;
}

async function fetchJsonWithTimeout(url, timeoutMs, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(Number(timeoutMs) || 8000, 1000));

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function writeDesktopUrlCache(config) {
  const payload = normalizeDesktopConfigPayload(config);
  if (!payload.apiBaseUrl && !payload.adminUrl) return;

  try {
    fs.mkdirSync(path.dirname(desktopUrlCachePath()), { recursive: true });
    fs.writeFileSync(
      desktopUrlCachePath(),
      JSON.stringify({ ...payload, cachedAt: new Date().toISOString() }, null, 2),
    );
  } catch {
    // The app can still run with bundled config if the cache cannot be written.
  }
}

async function resolveDesktopConfig() {
  const localConfig = getDesktopConfig();
  const headers = {};
  const timeoutMs = localConfig.requestTimeoutMs || DEFAULT_CONFIG.requestTimeoutMs;
  const desktopUrlLink = localConfig.desktopUrlLink || localConfig.desktopConfigUrl;

  if (localConfig.desktopToken) {
    headers["x-desktop-app-token"] = localConfig.desktopToken;
  }

  if (isHttpUrl(desktopUrlLink)) {
    try {
      const remotePayload = await fetchJsonWithTimeout(desktopUrlLink, timeoutMs, headers);
      const remoteConfig = normalizeDesktopConfigPayload(remotePayload);
      if (remoteConfig.apiBaseUrl || remoteConfig.adminUrl) {
        const resolved = mergeConfig(localConfig, remoteConfig);
        writeDesktopUrlCache(resolved);
        activeDesktopConfig = resolved;
        return resolved;
      }
    } catch {
      // Fall back to the last good remote URL below.
    }
  }

  const cachedConfig = normalizeDesktopConfigPayload(readJson(desktopUrlCachePath()));
  const resolved = mergeConfig(localConfig, cachedConfig);
  activeDesktopConfig = resolved;
  return resolved;
}

function desktopFile(fileName) {
  return path.join(__dirname, fileName);
}

function privacyConsentPath() {
  return path.join(app.getPath("userData"), "privacy-consent.json");
}

function savePrivacyConsent(consent = {}) {
  const payload = {
    accepted: true,
    optionalData: consent.optionalData !== false,
    acceptedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
  };

  fs.mkdirSync(path.dirname(privacyConsentPath()), { recursive: true });
  fs.writeFileSync(privacyConsentPath(), JSON.stringify(payload, null, 2));
  return payload;
}

async function loadPrivacyScreen() {
  if (!mainWindow) return;
  await mainWindow.loadFile(desktopFile("privacy.html"));
}

async function loadOfflineScreen() {
  if (!mainWindow) return;
  await mainWindow.loadFile(desktopFile("offline.html"));
}

async function openAdmin() {
  await openLoginTarget(null, "user");
}

function getLoginTargetUrl(config, target) {
  switch (target) {
    case "reseller":
      return config.resellerLoginUrl || DEFAULT_CONFIG.resellerLoginUrl;
    case "agent":
      return config.agentLoginUrl || DEFAULT_CONFIG.agentLoginUrl;
    case "user":
      return config.userLoginUrl || DEFAULT_CONFIG.userLoginUrl;
    case "admin":
    default:
      return config.adminUrl || DEFAULT_CONFIG.adminUrl;
  }
}

async function openLoginTarget(_event, target = "user") {
  if (!mainWindow) return;
  const config = activeDesktopConfig || (await resolveDesktopConfig());
  const safeTarget = PORTAL_LOGIN_TARGETS.has(String(target)) ? String(target) : "user";
  await mainWindow.loadURL(getLoginTargetUrl(config, safeTarget));
}

async function loadInitialScreen() {
  await loadPrivacyScreen();
}

async function fetchPrivacyConfig() {
  const config = await resolveDesktopConfig();
  const apiBaseUrl = normalizeBaseUrl(config.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl);
  const endpoint = `${apiBaseUrl}/api/desktop/privacy`;
  const headers = {};
  if (config.desktopToken) {
    headers["x-desktop-app-token"] = config.desktopToken;
  }

  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const remotePrivacyConfig = normalizeDesktopConfigPayload(json);
    const loginConfig = {
      adminUrl: remotePrivacyConfig.adminUrl || config.adminUrl || DEFAULT_CONFIG.adminUrl,
      userLoginUrl: remotePrivacyConfig.userLoginUrl || config.userLoginUrl || DEFAULT_CONFIG.userLoginUrl,
      agentLoginUrl: remotePrivacyConfig.agentLoginUrl || config.agentLoginUrl || DEFAULT_CONFIG.agentLoginUrl,
      resellerLoginUrl:
        remotePrivacyConfig.resellerLoginUrl || config.resellerLoginUrl || DEFAULT_CONFIG.resellerLoginUrl,
    };
    if (
      loginConfig.adminUrl !== config.adminUrl ||
      loginConfig.userLoginUrl !== config.userLoginUrl ||
      loginConfig.agentLoginUrl !== config.agentLoginUrl ||
      loginConfig.resellerLoginUrl !== config.resellerLoginUrl
    ) {
      activeDesktopConfig = mergeConfig(config, loginConfig);
      writeDesktopUrlCache(activeDesktopConfig);
    }
    return {
      ...json.data,
      ...loginConfig,
      apiBaseUrl,
      offline: false,
    };
  } catch (error) {
    return {
      enabled: true,
      title: "Your data and privacy",
      cardTitle: "We value your privacy",
      body: [
        "The desktop app could not reach the live G5 eSIM backend right now.",
        "",
        "You can still review this privacy notice, but the portal requires an internet connection to work with live orders, customers, eSIM providers, wallets, and payments.",
      ].join("\n"),
      termsUrl: `${apiBaseUrl}/terms`,
      privacyUrl: `${apiBaseUrl}/privacy`,
      adminUrl: config.adminUrl || DEFAULT_CONFIG.adminUrl,
      userLoginUrl: config.userLoginUrl || DEFAULT_CONFIG.userLoginUrl,
      agentLoginUrl: config.agentLoginUrl || DEFAULT_CONFIG.agentLoginUrl,
      resellerLoginUrl: config.resellerLoginUrl || DEFAULT_CONFIG.resellerLoginUrl,
      acceptLabel: "Accept all",
      declineLabel: "Exit",
      manageLabel: "Connection info",
      accentColor: "#2563eb",
      showCredentials: false,
      adminUsername: "",
      adminPassword: "",
      apiBaseUrl,
      offline: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: "#e9ebf7",
    title: "G5 eSIM Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-fail-load", (_event, _errorCode, _errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && /^https?:\/\//i.test(validatedURL || "")) {
      void loadOfflineScreen();
    }
  });

  void loadInitialScreen();
}

ipcMain.handle("desktop:getPrivacyConfig", fetchPrivacyConfig);
ipcMain.handle("desktop:setPrivacyConsent", (_event, consent) => savePrivacyConsent(consent));
ipcMain.handle("desktop:openAdmin", openAdmin);
ipcMain.handle("desktop:openLoginTarget", openLoginTarget);
ipcMain.handle("desktop:openPrivacy", loadPrivacyScreen);
ipcMain.handle("desktop:closeApp", () => app.quit());
ipcMain.handle("desktop:openExternal", (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  }
});

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
