# Firebase + Vercel Setup (AC7 Keydka)

## 1. GitHub

Repo: `https://github.com/A2Dalla17/Saving-Tracking`

Push `main` — Vercel auto-deploys on every push when the project is linked.

## 2. Vercel

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Import **A2Dalla17/Saving-Tracking**
3. **Root Directory:** `.` (repo root)
4. **Framework:** Next.js (auto)
5. **Build Command:** `npm run build`
6. **Install Command:** `npm install`

## 3. Environment Variables (Vercel → Settings → Environment Variables)

| Variable | Required | Notes |
|----------|----------|-------|
| `FIREBASE_PROJECT_ID` | Yes | `ac7-group` |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account |
| `FIREBASE_PRIVATE_KEY` | Yes | Full private key (paste with `\n` newlines) |
| `SMTP_HOST` | Optional | Gmail recovery |
| `SMTP_USER` | Optional | |
| `SMTP_PASS` | Optional | App password |
| `GOOGLE_GENAI_API_KEY` | Optional | AI statements |

Copy from `.env.example`. **Never commit real keys to Git.**

### Get Firebase Admin credentials

1. [Firebase Console](https://console.firebase.google.com) → **ac7-group**
2. Project Settings → **Service accounts** → **Generate new private key**
3. From JSON: `client_email` → `FIREBASE_CLIENT_EMAIL`, `private_key` → `FIREBASE_PRIVATE_KEY`

## 4. Firebase Auth (client)

Client config is in `src/lib/firebase-public-config.ts` (already in repo).

Enable **Email/Password** in Firebase → Authentication → Sign-in method.

Create admin user: `admin@ac7group.app` / `Hooyo114` (or use app login once).

## 5. Firestore

Deploy rules (optional):

```bash
firebase deploy --only firestore:rules
```

## 6. After deploy

1. Open Vercel URL → `/login`
2. Admin: `admin` / `Hooyo114`
3. POST `/api/setup/admin-auth` runs on first load (creates admin if server credentials set)

## 7. Custom domain

Vercel → Project → **Domains** → add your domain → update DNS at registrar.
