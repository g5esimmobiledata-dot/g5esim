const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG = {
  appName: "G5 eSIM Admin",
  apiBaseUrl: "https://g5esim.mobile",
  adminUrl: "https://g5esim.mobile/admin/login?desktop=1",
  desktopToken: "",
};

let mainWindow;

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
  if (!mainWindow) return;
  const config = getDesktopConfig();
  await mainWindow.loadURL(config.adminUrl || DEFAULT_CONFIG.adminUrl);
}

async function loadInitialScreen() {
  await loadPrivacyScreen();
}

async function fetchPrivacyConfig() {
  const config = getDesktopConfig();
  const apiBaseUrl = String(config.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl).replace(/\/+$/, "");
  const endpoint = `${apiBaseUrl}/api/desktop/privacy`;
  const headers = {};
  if (config.desktopToken) {
    headers["x-desktop-app-token"] = config.desktopToken;
  }

  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return {
      ...json.data,
      adminUrl: config.adminUrl || json.data?.adminUrl || DEFAULT_CONFIG.adminUrl,
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
        "You can still review this privacy notice, but the admin backend requires an internet connection to work with live orders, customers, eSIM providers, wallets, SIP, SMS, and payments.",
      ].join("\n"),
      termsUrl: `${apiBaseUrl}/terms`,
      privacyUrl: `${apiBaseUrl}/privacy`,
      adminUrl: config.adminUrl || DEFAULT_CONFIG.adminUrl,
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
    title: "G5 eSIM Admin",
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
