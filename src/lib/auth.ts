export function hashPassword(password: string): string {
  const value = `ac7:${password}`;
  if (typeof btoa !== "undefined") return btoa(value);
  return Buffer.from(value).toString("base64");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

import { ADMIN_EMAIL, ADMIN_FIREBASE_EMAIL } from "./constants";

export function isAdminEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  return (
    lower === ADMIN_EMAIL.toLowerCase() ||
    lower === ADMIN_FIREBASE_EMAIL.toLowerCase() ||
    lower === "admin"
  );
}

/** Login field values that should use the admin Firebase account. */
export function isAdminLoginIdentifier(identifier: string): boolean {
  const trimmed = identifier.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower === "admin") return true;
  if (lower === ADMIN_FIREBASE_EMAIL.toLowerCase()) return true;
  if (lower === ADMIN_EMAIL.toLowerCase()) return true;
  return false;
}

export function isValidLoginId(loginId: string): boolean {
  const id = loginId.trim();
  return id.includes("@") && id.length >= 3 && !/\s/.test(id);
}

export function isLoginIdTaken(
  members: { id: string; email?: string; loginId?: string }[],
  loginId: string,
  excludeId?: string
): boolean {
  const normalized = loginId.trim().toLowerCase();
  const localPart = normalized.split("@")[0];
  return members.some((m) => {
    if (m.id === excludeId) return false;
    const memberLocal = (m.loginId ?? m.email ?? "").trim().toLowerCase().split("@")[0];
    const memberEmail = m.email?.trim().toLowerCase();
    return memberLocal === localPart || memberEmail === normalized;
  });
}
