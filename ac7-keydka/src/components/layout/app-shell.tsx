"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Sidebar, MobileNav, LogoCorner } from "@/components/layout/sidebar";
import { MonthlyReminder } from "@/components/shared/monthly-reminder";
import { AnnouncementBanner } from "@/components/shared/announcement-banner";
import { useAuth } from "@/lib/hooks/use-auth";
import { useData } from "@/lib/hooks/use-data";
import { InstallAppBanner } from "@/components/shared/install-app-banner";
import { t } from "@/lib/somali";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { loading: dataLoading } = useData();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!authLoading && !dataLoading && !user && !isLoginPage) {
      router.replace("/login");
    }
  }, [user, authLoading, dataLoading, isLoginPage, router]);

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-top pb-safe">
        <div className="fixed top-6 right-6">
          <div className="relative h-20 w-20">
            <Image src="/logo.png" alt="AC7" fill className="object-contain" />
          </div>
        </div>
        {children}
      </div>
    );
  }

  if (authLoading || dataLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top">
      <Sidebar />
      <LogoCorner />
      <main className="lg:pl-72">
        <div className="px-4 sm:px-6 lg:px-8 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8">
          <InstallAppBanner />
          <AnnouncementBanner />
          <MonthlyReminder />
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
