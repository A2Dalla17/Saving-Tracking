"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      document.documentElement.classList.add("pwa-standalone");
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker optional in dev
    });
  }, []);

  return null;
}
