"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Clock,
  FileText,
  Shield,
  User,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/use-auth";
import { t } from "@/lib/somali";

const navItems = [
  { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
  { href: "/members", label: t.nav.members, icon: Users },
  { href: "/calendar", label: t.nav.calendar, icon: CalendarDays },
  { href: "/timeline", label: t.nav.timeline, icon: Clock },
  { href: "/my-statement", label: t.nav.myStatement, icon: FileText },
  { href: "/profile", label: t.nav.profile, icon: User },
  { href: "/admin", label: t.nav.admin, icon: Shield, protected: true },
];

const mobilePrimary = ["/dashboard", "/members", "/calendar", "/my-statement"];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 border-r border-white/[0.08] bg-background">
      <div className="flex items-center gap-4 px-6 py-6 border-b border-white/[0.08]">
        <div className="relative h-14 w-14 shrink-0">
          <Image src="/logo.png" alt="AC7 Group" fill className="object-contain" priority />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-white">{t.appName}</h1>
          <p className="text-xs text-white/70">{user?.name}</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.protected && !user?.isAdmin) return null;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/60 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
              {item.protected && !isActive && (
                <span className="ml-auto text-[10px] bg-accent/20 text-blue-200 px-2 py-0.5 rounded-md font-bold">PIN</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/[0.08]">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          {t.login.logout}
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = navItems.filter((i) => mobilePrimary.includes(i.href));
  const moreItems = navItems.filter(
    (i) => !mobilePrimary.includes(i.href) && (!i.protected || user?.isAdmin)
  );
  const moreActive = moreItems.some(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-header border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-1 py-2">
          {primaryItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium min-w-[56px] min-h-[48px] justify-center transition-colors",
                  isActive ? "text-white" : "text-white/60"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-[56px]">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium min-w-[56px] min-h-[48px] justify-center transition-colors",
              moreActive ? "text-white" : "text-white/60"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>{t.common.more}</span>
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t.appName}</DialogTitle>
          </DialogHeader>
          <nav className="space-y-1 py-2">
            {moreItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium",
                    isActive ? "bg-accent/10 text-accent" : "hover:bg-muted text-slate-700"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                logout();
              }}
              className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              {t.login.logout}
            </button>
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LogoCorner() {
  return (
    <div className="fixed top-4 right-4 z-40 hidden md:block safe-top">
      <div className="relative h-16 w-16 opacity-90 hover:opacity-100 transition-opacity drop-shadow-lg">
        <Image src="/logo.png" alt="AC7" fill className="object-contain" />
      </div>
    </div>
  );
}
