"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => void reg.unregister());
      });
      void caches.keys().then((keys) => {
        keys.forEach((key) => void caches.delete(key));
      });
      return;
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      document.documentElement.classList.add("pwa-standalone");
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker optional if registration fails
    });
  }, []);

  return null;
}
