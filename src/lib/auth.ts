export function hashPassword(password: string): string {
  const value = `ac7:${password}`;
  if (typeof btoa !== "undefined") return btoa(value);
  return Buffer.from(value).toString("base64");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function isAdminEmail(email: string): boolean {
  return email.toLowerCase() === "Ghaalabh10@gmail.com".toLowerCase();
}

export function isValidLoginId(loginId: string): boolean {
  const id = loginId.trim();
  return id.includes("@") && id.length >= 3 && !/\s/.test(id);
}

export function isLoginIdTaken(members: { id: string; email?: string }[], loginId: string, excludeId?: string): boolean {
  const normalized = loginId.trim().toLowerCase();
  return members.some(
    (m) => m.id !== excludeId && m.email?.trim().toLowerCase() === normalized
  );
}
