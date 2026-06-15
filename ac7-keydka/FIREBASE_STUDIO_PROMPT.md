# Firebase Setup — App-ka Hore ee AC7 Keydka

> **Ma baahnid app cusub.** Code-ka GitHub/Vercel waa diyaar. Kaliya Firebase backend u habee.

---

## ✅ Waxa horey u diyaarsan (code-kaaga)

| Wax | Status |
|-----|--------|
| Firestore read/write | ✅ `src/lib/firestore.ts` |
| Login API (custom token) | ✅ `/api/auth/login` |
| Cloud seed + migrate | ✅ `/api/setup/seed`, `/api/setup/migrate` |
| Hubinta status | ✅ `/api/setup/status` |
| Security rules file | ✅ `firestore.rules` |
| Indexes | ✅ `firestore.indexes.json` |

Marka env vars la geliyo → dhammaan browser-yadu **hal xog** arkaan.

---

## TALLAABO 1 — Gemini in Firebase (copy-paste)

Tag [Firebase Console](https://console.firebase.google.com) → **Gemini** (chat) → paste:

```
I have an EXISTING Next.js 15 app "AC7 Keydka" already deployed on Vercel. Do NOT create a new app or frontend code. Only configure Firebase backend for this project.

Project ID: ac7-keydka

Do these steps and give me exact values/checklist:

1. Create Firebase project "ac7-keydka" (or use if exists)
2. Enable Cloud Firestore — Production mode — region europe-west1
3. Enable Firebase Authentication (we use custom tokens from server, NOT email/password sign-in provider)
4. Register Web app "AC7 Keydka" — output all 6 config values:
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID

5. Service account: generate private key JSON for FIREBASE_SERVICE_ACCOUNT_JSON (Vercel, one line)

6. Firestore collections (already in my code): members, payments, settings, announcements, chats, bin

7. Security rules:
   - signed-in: read members, payments, settings, announcements, chats
   - admin only (token claim admin=true): write members, payments, settings, announcements, bin
   - member can update ONLY own avatarUrl
   - signed-in can create chats; admin deletes chats

8. Authorized domains: localhost + my Vercel URL [KU QOR URL HALKAN]

9. Default seed (first run via my API):
   - Admin: Maamulaha, Ghaalabh10@gmail.com, password hash of ac7:Hooyo114, loginActive true
   - Members: Abdullahi A2, Hassan Kaafi, Abduweli Enjoy, Ahmed Rash — default password ac7@2026

Output: table of all Vercel env var names + where to copy each value. No new app code.
```

---

## TALLAABO 2 — Vercel Environment Variables

Vercel → Project → **Settings** → **Environment Variables**

Ku dar **7** variables (Production + Preview + Development):

| # | Variable | Meesha |
|---|----------|--------|
| 1 | `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase → Project Settings → Web app |
| 2 | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | isla meesha |
| 3 | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | isla meesha |
| 4 | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | isla meesha |
| 5 | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | isla meesha |
| 6 | `NEXT_PUBLIC_FIREBASE_APP_ID` | isla meesha |
| 7 | `FIREBASE_SERVICE_ACCOUNT_JSON` | Service accounts → Private key (JSON hal saf) |

**Redeploy** kadib.

---

## TALLAABO 3 — Firestore Rules (kombuyuutarkaaga)

```bash
cd ac7-keydka
npm install -g firebase-tools
firebase login
firebase use ac7-keydka
npm run firebase:deploy
```

---

## TALLAABO 4 — Local test (ikhtiyaari)

```bash
copy .env.example .env.local
# Buuxi .env.local values-ka Firebase
npm run dev
```

Hubi: Admin → Settings → **"Ku xiran (Firebase)"** (ma aha Demo)

---

## TALLAABO 5 — Hubi inuu shaqeeyo

Fur browser:

```
https://YOUR-VERCEL-URL/api/setup/status
```

**Waa inuu noqdaa:**
```json
{
  "mode": "firebase",
  "clientFirebase": true,
  "adminSdk": true,
  "ready": true
}
```

Login: `Ghaalabh10@gmail.com` / `Hooyo114`

---

## Dhibaatooyin

| Muuqaal | Xalka |
|---------|-------|
| Weli "Demo" | Env vars ma jiraan Vercel → redeploy |
| Login fail | `FIREBASE_SERVICE_ACCOUNT_JSON` sax ma aha |
| Permission denied | `npm run firebase:deploy` |
| Browser kala duwan xog kala duwan | Firebase ma xiran — hubi `/api/setup/status` |

---

## Waxa ii soo dir karto (taageero)

1. Vercel URL-kaaga
2. Screenshot Firebase Web app config (API key qarsoodi ha noqon public chat)
3. Jawaabta `/api/setup/status`

Waan kaa caawin karaa waxa khaldan.

---

## ❌ HA ISTICMAALIN

Prompt-ka "dhis app cusub" — ma baahnid. App-kaaga hore waa ku filan yahay.

Hagaha buuxa: [FIREBASE_VERCEL_SETUP.md](./FIREBASE_VERCEL_SETUP.md)
