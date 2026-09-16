import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const isAdminPage = window.location.pathname.startsWith("/admin");

    if (isAdminPage) {
      const reloadKey = "admin-sw-cleared-v4";
      Promise.all([
        navigator.serviceWorker
          .getRegistrations()
          .then(async (registrations) => {
            const rootScope = `${window.location.origin}/`;
            const pwaRegistrations = registrations.filter((registration) => {
              const scriptUrl =
                registration.active?.scriptURL ||
                registration.installing?.scriptURL ||
                registration.waiting?.scriptURL ||
                "";
              return registration.scope === rootScope || scriptUrl.endsWith("/sw.js");
            });
            await Promise.all(pwaRegistrations.map((registration) => registration.unregister()));
            return pwaRegistrations.length;
          }),
        "caches" in window
          ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          : Promise.resolve([]),
      ])
        .then(([registrationCount]) => {
          if (
            (navigator.serviceWorker.controller || registrationCount > 0) &&
            !sessionStorage.getItem(reloadKey)
          ) {
            sessionStorage.setItem(reloadKey, "true");
            window.location.reload();
          }
        })
        .catch((error) => {
          console.error("Failed to clear admin service worker cache:", error);
        });
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registered successfully:", registration.scope);
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
