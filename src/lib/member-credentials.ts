/** Server + client safe — Login ID ↔ Firebase Auth email helpers. */

export const MEMBER_AUTH_DOMAIN = "@ac7group.app";

export function normalizeLoginId(raw: string): string {
  return raw.trim().split("@")[0]?.toLowerCase() ?? "";
}

/** Login ID → Firebase Auth email (e.g. hassan → hassan@ac7group.app). */
export function loginIdToEmail(loginId: string): string {
  return `${normalizeLoginId(loginId)}${MEMBER_AUTH_DOMAIN}`;
}

export function isValidMemberLoginId(loginId: string): boolean {
  const local = normalizeLoginId(loginId);
  return local.length >= 2 && !/\s/.test(local) && /^[a-zA-Z0-9._-]+$/.test(local);
}
