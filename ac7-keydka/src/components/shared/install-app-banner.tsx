"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/somali";

const DISMISS_KEY = "ac7_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    setDismissed(false);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setDismissed(true);
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = isIos && !(window as Window & { MSStream?: unknown }).MSStream;
    if (isSafari) setShowIosHint(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowIosHint(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div className="mb-4 rounded-2xl border border-brand/20 bg-white p-4 shadow-sm animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl brand-gradient text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brand text-sm">{t.pwa.installTitle}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.pwa.installDesc}</p>
          {showIosHint && !deferredPrompt && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 flex-wrap">
              <Share className="h-3.5 w-3.5" />
              {t.pwa.iosHint}
              <Plus className="h-3.5 w-3.5" />
              {t.pwa.iosHint2}
            </p>
          )}
          <div className="flex gap-2 mt-3">
            {deferredPrompt && (
              <Button size="sm" variant="gold" onClick={handleInstall}>
                <Download className="h-4 w-4" />
                {t.pwa.installBtn}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              {t.pwa.later}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label={t.common.close}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
