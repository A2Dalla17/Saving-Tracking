#!/usr/bin/env node
import { loadEnvLocal, normalizePrivateKey } from "./load-env.mjs";
loadEnvLocal();
const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "ac7-group";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY?.trim();
const { JWT } = await import("google-auth-library");
const jwt = new JWT({
  email: clientEmail,
  key: normalizePrivateKey(privateKeyRaw),
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const token = await jwt.getAccessToken();
const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases`, {
  headers: { Authorization: `Bearer ${token.token}` },
});
const body = await res.json();
for (const db of body.databases ?? []) {
  console.log({
    name: db.name,
    type: db.type,
    locationId: db.locationId,
    createTime: db.createTime,
    deleteProtectionState: db.deleteProtectionState,
    earliestVersionTime: db.earliestVersionTime,
    pointInTimeRecoveryEnablement: db.pointInTimeRecoveryEnablement,
  });
}
