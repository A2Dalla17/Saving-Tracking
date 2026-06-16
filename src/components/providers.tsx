"use client";

import { Toaster } from "sonner";
import { DataProvider } from "@/lib/hooks/use-data";
import { AdminProvider } from "@/lib/hooks/use-admin";
import { AuthProvider } from "@/lib/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { PwaRegister } from "@/components/shared/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        <AdminProvider>
          <PwaRegister />
          <AppShell>{children}</AppShell>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#0f2744",
                color: "#ffffff",
                border: "1px solid #ffffff",
                borderRadius: "12px",
              },
            }}
            richColors
          />
        </AdminProvider>
      </DataProvider>
    </AuthProvider>
  );
}
