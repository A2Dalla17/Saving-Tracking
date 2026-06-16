"use client";

import { PageHeader } from "@/components/layout/page-header";
import { InstallAppBanner } from "@/components/shared/install-app-banner";
import { AnnouncementBanner } from "@/components/shared/announcement-banner";
import { MonthlyReminder } from "@/components/shared/monthly-reminder";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function PageLayout({ title, subtitle, action, children }: PageLayoutProps) {
  return (
    <div className="w-full">
      <PageHeader title={title} subtitle={subtitle} action={action} />
      <div className="page-alerts">
        <InstallAppBanner />
        <AnnouncementBanner />
        <MonthlyReminder />
      </div>
      <div className="page-content">{children}</div>
    </div>
  );
}
