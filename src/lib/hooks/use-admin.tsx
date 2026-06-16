"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { ADMIN_PIN, MAX_PIN_ATTEMPTS } from "@/lib/constants";
import { useHydrated } from "@/lib/hooks/use-hydrated";

const ATTEMPTS_KEY = "ac7_pin_attempts";
const UNLOCK_KEY = "ac7_admin_unlocked";

interface AdminContextValue {
  isUnlocked: boolean;
  failedAttempts: number;
  isLocked: boolean;
  unlock: (pin: string, expectedPin?: string) => boolean;
  unlockWithRecovery: (code: string) => Promise<boolean>;
  lock: () => void;
  resetAttempts: () => void;
  requestRecovery: () => Promise<{ success: boolean; message: string }>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    const attempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) ?? "0", 10);
    setFailedAttempts(attempts);
    setIsUnlocked(sessionStorage.getItem(UNLOCK_KEY) === "true");
  }, [hydrated]);

  const isLocked = failedAttempts >= MAX_PIN_ATTEMPTS;

  const unlock = useCallback((pin: string, expectedPin: string = ADMIN_PIN): boolean => {
    if (pin === expectedPin) {
      setIsUnlocked(true);
      setFailedAttempts(0);
      sessionStorage.setItem(UNLOCK_KEY, "true");
      sessionStorage.setItem(ATTEMPTS_KEY, "0");
      return true;
    }

    const newAttempts = failedAttempts + 1;
    sessionStorage.setItem(ATTEMPTS_KEY, String(newAttempts));
    setFailedAttempts(newAttempts);
    return false;
  }, [failedAttempts]);

  const unlockWithRecovery = useCallback(async (code: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/recovery/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        setIsUnlocked(true);
        setFailedAttempts(0);
        sessionStorage.setItem(UNLOCK_KEY, "true");
        sessionStorage.setItem(ATTEMPTS_KEY, "0");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const requestRecovery = useCallback(async () => {
    try {
      const res = await fetch("/api/recovery/send", { method: "POST" });
      const data = await res.json();
      return { success: res.ok, message: data.message ?? "" };
    } catch {
      return { success: false, message: "Khalad ayaa dhacay" };
    }
  }, []);

  const lock = useCallback(() => {
    setIsUnlocked(false);
    sessionStorage.removeItem(UNLOCK_KEY);
  }, []);

  const resetAttempts = useCallback(() => {
    setFailedAttempts(0);
    sessionStorage.setItem(ATTEMPTS_KEY, "0");
  }, []);

  return (
    <AdminContext.Provider
      value={{
        isUnlocked,
        failedAttempts,
        isLocked,
        unlock,
        unlockWithRecovery,
        lock,
        resetAttempts,
        requestRecovery,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within AdminProvider");
  return context;
}
