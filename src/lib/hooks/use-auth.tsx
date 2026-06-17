"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isAdminEmail, isAdminLoginIdentifier } from "@/lib/auth";
import { resolveProfileMember } from "@/lib/resolve-profile-member";
import {
  normalizeLoginId,
  resolveFirebaseLoginEmail,
  formatFirebaseAuthError,
  signInAdminWithFirebase,
} from "@/lib/member-auth";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import type { AuthUser, Member } from "@/types";

const SESSION_KEY = "ac7_auth_user";

function readStoredUser(): AuthUser | null {
  const stored = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

function persistUser(user: AuthUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  sessionStorage.removeItem(SESSION_KEY);
}

function clearStoredUser(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

function buildAuthUserFromFirebase(
  identifier: string,
  uid: string,
  email: string,
  displayName?: string | null
): AuthUser {
  return {
    memberId: uid,
    name: displayName?.trim() || normalizeLoginId(identifier) || email.split("@")[0] || "User",
    email,
    isAdmin: isAdminLoginIdentifier(identifier) || isAdminEmail(email),
  };
}

function buildAuthUser(member: Member, fallbackEmail?: string): AuthUser {
  return {
    memberId: member.id,
    name: member.name,
    email: member.email ?? fallbackEmail,
    phone: member.phone,
    isAdmin: isAdminEmail(member.email ?? "") || isAdminEmail(fallbackEmail ?? ""),
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  reconcileWithMembers: (members: Member[]) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    setUser(readStoredUser());
    setReady(true);
  }, [hydrated]);

  const loading = !hydrated || !ready;

  const login = useCallback(async (identifier: string, password: string) => {
    const trimmedPassword = password.trim();
    const email = resolveFirebaseLoginEmail(identifier);
    if (!email) {
      return { success: false, error: "auth/invalid-login-id: Login ID waa lagama maarmaan" };
    }

    const adminLogin = isAdminLoginIdentifier(identifier);

    try {
      const credential = adminLogin
        ? await signInAdminWithFirebase(identifier, trimmedPassword)
        : await signInWithEmailAndPassword(auth(), email, trimmedPassword);

      const authUser = buildAuthUserFromFirebase(
        identifier,
        credential.user.uid,
        credential.user.email ?? email,
        credential.user.displayName
      );
      persistUser(authUser);
      setUser(authUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: formatFirebaseAuthError(error) };
    }
  }, []);

  const reconcileWithMembers = useCallback((members: Member[]) => {
    setUser((current) => {
      if (!current) return current;
      const member = resolveProfileMember(members, current);
      if (!member || member.id === "admin-profile") return current;

      const next = buildAuthUser(member, current.email ?? member.email);
      const sameMemberId = next.memberId === current.memberId;
      const sameName = next.name === current.name;
      const sameEmail =
        (next.email ?? "").trim().toLowerCase() === (current.email ?? "").trim().toLowerCase();
      if (sameMemberId && sameName && sameEmail) return current;

      persistUser(next);
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth());
    } catch {
      // ignore if not signed in to Firebase
    }
    clearStoredUser();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, reconcileWithMembers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
