"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar, MobileNav, LogoCorner } from "@/components/layout/sidebar";
import { useAuth } from "@/lib/hooks/use-auth";
import { useData } from "@/lib/hooks/use-data";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { t } from "@/lib/somali";

function AppFrame({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  return (
    <div className="min-h-screen page-gradient safe-top">
      <Sidebar />
      <LogoCorner />
      <main className="app-main-layer lg:pl-72 surface-dark">
        <div key={pathname} className="w-full px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen page-gradient flex items-center justify-center p-4 sm:p-6 safe-top pb-safe">
      <LogoCorner showOnMobile />
      {children}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const { user, loading: authLoading } = useAuth();
  const { loading: dataLoading } = useData();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (!hydrated || authLoading || user || isLoginPage) return;
    router.replace("/login");
  }, [hydrated, user, authLoading, isLoginPage, router]);

  if (isLoginPage) {
    return <LoginShell>{children}</LoginShell>;
  }

  if (!hydrated || authLoading || !user || dataLoading) {
    return (
      <AppFrame pathname={pathname}>
        <p className="text-muted-foreground py-4">{t.common.loading}</p>
      </AppFrame>
    );
  }

  return <AppFrame pathname={pathname}>{children}</AppFrame>;
}
