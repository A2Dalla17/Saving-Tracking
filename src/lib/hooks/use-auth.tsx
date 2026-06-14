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
import { signInWithCustomToken, signOut as firebaseSignOut } from "firebase/auth";
import { verifyPassword, isAdminEmail } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import type { AuthUser, Member } from "@/types";

const SESSION_KEY = "ac7_auth_user";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (
    identifier: string,
    password: string,
    members: Member[]
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function findMemberByIdentifier(members: Member[], identifier: string): Member | undefined {
  const id = identifier.trim().toLowerCase();
  return members.find(
    (m) =>
      m.email?.toLowerCase() === id ||
      m.phone?.replace(/\s/g, "") === identifier.replace(/\s/g, "")
  );
}

async function loginWithFirebase(identifier: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  const data = await res.json();
  if (res.status === 503) {
    return { success: false as const, fallbackLocal: true as const };
  }
  if (!res.ok) {
    return { success: false as const, error: data.error ?? "Login failed" };
  }

  const auth = getFirebaseAuth();
  if (auth && data.token) {
    await signInWithCustomToken(auth, data.token);
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
  return { success: true as const, user: data.user as AuthUser };
}

function loginLocally(identifier: string, password: string, members: Member[]) {
  const member = findMemberByIdentifier(members, identifier);
  if (!member) return { success: false as const, error: "Login ID lama helin" };
  if (!member.loginActive) {
    return { success: false as const, error: "Login-kaaga weli ma active gashan. La xiriir admin-ka." };
  }
  if (member.status === "removed") {
    return { success: false as const, error: "Waxaa lagaa saaray kooxda. La xiriir admin-ka." };
  }
  if (!member.password || !verifyPassword(password, member.password)) {
    return { success: false as const, error: "Password-ka waa khaldan yahay" };
  }

  const authUser: AuthUser = {
    memberId: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    isAdmin:
      isAdminEmail(member.email ?? "") ||
      member.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
  return { success: true as const, user: authUser };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string, members: Member[]) => {
      if (isFirebaseConfigured()) {
        try {
          const result = await loginWithFirebase(identifier, password);
          if (result.success) {
            setUser(result.user);
            return { success: true };
          }
          if ("fallbackLocal" in result && result.fallbackLocal) {
            const local = loginLocally(identifier, password, members);
            if (!local.success) return local;
            setUser(local.user);
            return { success: true };
          }
          return { success: false, error: result.error };
        } catch {
          const local = loginLocally(identifier, password, members);
          if (!local.success) return local;
          setUser(local.user);
          return { success: true };
        }
      }

      const local = loginLocally(identifier, password, members);
      if (!local.success) return local;
      setUser(local.user);
      return { success: true };
    },
    []
  );

  const logout = useCallback(async () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    const auth = getFirebaseAuth();
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch {
        // ignore sign-out errors
      }
    }
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
