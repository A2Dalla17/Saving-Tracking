"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { ADMIN_PIN, MAX_PIN_ATTEMPTS } from "@/lib/constants";
import { ensureAdminFirebaseSession, clearAdminFirebaseSession } from "@/lib/admin-firebase-auth";
import { useHydrated } from "@/lib/hooks/use-hydrated";

const ATTEMPTS_KEY = "ac7_pin_attempts";
const UNLOCK_KEY = "ac7_admin_unlocked";

interface UnlockResult {
  ok: boolean;
  error?: string;
  warning?: string;
}

interface AdminContextValue {
  isUnlocked: boolean;
  failedAttempts: number;
  isLocked: boolean;
  unlock: (pin: string, expectedPin?: string) => Promise<UnlockResult>;
  unlockWithRecovery: (code: string) => Promise<UnlockResult>;
  lock: () => void;
  resetAttempts: () => void;
  requestRecovery: () => Promise<{ success: boolean; message: string }>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

async function activateAdminFirestoreSession(): Promise<UnlockResult> {
  const firebaseResult = await ensureAdminFirebaseSession();
  if (!firebaseResult.success) {
    return {
      ok: false,
      error: firebaseResult.error ?? "Firebase admin login ma guulaysan",
    };
  }
  return { ok: true };
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    const attempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) ?? "0", 10);
    setFailedAttempts(attempts);

    if (sessionStorage.getItem(UNLOCK_KEY) !== "true") return;

    setIsUnlocked(true);
    void activateAdminFirestoreSession().then((result) => {
      if (!result.ok) {
        console.warn("Admin Firebase session restore failed:", result.error);
      }
    });
  }, [hydrated]);

  const isLocked = failedAttempts >= MAX_PIN_ATTEMPTS;

  const unlock = useCallback(async (pin: string, expectedPin: string = ADMIN_PIN): Promise<UnlockResult> => {
    const normalizedPin = pin.trim();
    const normalizedExpected = (expectedPin || ADMIN_PIN).trim();

    if (normalizedPin !== normalizedExpected) {
      const newAttempts = failedAttempts + 1;
      sessionStorage.setItem(ATTEMPTS_KEY, String(newAttempts));
      setFailedAttempts(newAttempts);
      return { ok: false };
    }

    setIsUnlocked(true);
    setFailedAttempts(0);
    sessionStorage.setItem(UNLOCK_KEY, "true");
    sessionStorage.setItem(ATTEMPTS_KEY, "0");

    const firebaseResult = await activateAdminFirestoreSession();
    if (!firebaseResult.ok) {
      return {
        ok: true,
        warning:
          firebaseResult.error ??
          "Maamulka waa la furay. Firebase qoraalka weli ma diyaar ahayn — isku day mar kale kadib.",
      };
    }

    return { ok: true };
  }, [failedAttempts]);

  const unlockWithRecovery = useCallback(async (code: string): Promise<UnlockResult> => {
    try {
      const res = await fetch("/api/recovery/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        return { ok: false };
      }

      setIsUnlocked(true);
      setFailedAttempts(0);
      sessionStorage.setItem(UNLOCK_KEY, "true");
      sessionStorage.setItem(ATTEMPTS_KEY, "0");

      const firebaseResult = await activateAdminFirestoreSession();
      if (!firebaseResult.ok) {
        return {
          ok: true,
          warning: firebaseResult.error ?? "Recovery waa la aqbalay. Firebase qoraalka weli ma diyaar ahayn.",
        };
      }

      return { ok: true };
    } catch {
      return { ok: false };
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
    void clearAdminFirebaseSession();
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
