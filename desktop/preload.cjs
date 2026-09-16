const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("g5Desktop", {
  getPrivacyConfig: () => ipcRenderer.invoke("desktop:getPrivacyConfig"),
  setPrivacyConsent: (consent) => ipcRenderer.invoke("desktop:setPrivacyConsent", consent),
  openAdmin: () => ipcRenderer.invoke("desktop:openAdmin"),
  openLoginTarget: (target) => ipcRenderer.invoke("desktop:openLoginTarget", target),
  openPrivacy: () => ipcRenderer.invoke("desktop:openPrivacy"),
  closeApp: () => ipcRenderer.invoke("desktop:closeApp"),
  openExternal: (url) => ipcRenderer.invoke("desktop:openExternal", url),
});
