# Firebase + Vercel Setup — AC7 Keydka

Hagahaan wuxuu kuu ogolaanayaa in **dhammaan browser-yada iyo telefoonnada** hal xog arkaan (Firestore cloud). Xogtu ma lumin doonto marka cache la nadiifiyo.

---

## Qaabka (Architecture)

```
Telefoon / Laptop / Browser kasta
        ↓
Vercel (your-app.vercel.app ama domain-kaaga)
        ↓
Firebase Firestore (database-ka dhabta ah)
```

---

## TALLAABO 1 — Firebase Project Samee

1. Tag [Firebase Console](https://console.firebase.google.com)
2. **Add project** → magac: `ac7-keydka` (ama magac kale)
3. Firestore → **Create database** → **Production mode** → goob dooro (e.g. `europe-west1`)
4. **Authentication** → Get started (custom tokens — app-ku wuu isticmaalaa)

### Web App Config

1. Project Settings (⚙️) → **Your apps** → **Web** (`</>`)
2. App nickname: `AC7 Keydka`
3. Copy **firebaseConfig** values

### Service Account (Server/Vercel)

1. Project Settings → **Service accounts**
2. **Generate new private key** → JSON file soo dejiso
3. JSON-ka oo dhan hal saf ku rid (Vercel env var)

---

## TALLAABO 2 — Firestore Rules Deploy

Kombuyuutarkaaga:

```bash
cd ac7-keydka
npm install -g firebase-tools
firebase login
firebase use ac7-keydka
npm run firebase:deploy
```

Tani waxay deploy gareysaa `firestore.rules` iyo indexes.

---

## TALLAABO 3 — Environment Variables

### Local development

```bash
copy .env.example .env.local
```

Buuxi `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ac7-keydka.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ac7-keydka
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ac7-keydka.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"ac7-keydka",...}
```

> **FIREBASE_SERVICE_ACCOUNT_JSON**: JSON file-ka oo dhan hal saf ah, aan lahayn line breaks.

### Vercel Production

1. Tag [vercel.com](https://vercel.com) → project-kaaga `ac7-keydka`
2. **Settings** → **Environment Variables**
3. Ku dar **dhamaan** variables kor ku xusan
4. Environment: **Production**, **Preview**, **Development** (dhamaan)
5. **Redeploy** project-ka

| Variable | Meesha laga helo |
|----------|------------------|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Project Settings → Web app |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase → Service accounts → Private key JSON |

---

## TALLAABO 4 — Firebase Authorized Domains

Firebase Console → **Authentication** → **Settings** → **Authorized domains**

Ku dar:
- `localhost` (dev)
- `your-project.vercel.app`
- domain-kaaga gaarka ah (haddii aad iibsatay)

---

## TALLAABO 5 — Hubi inuu Shaqaynayo

Kadib deploy:

1. Fur URL-ka Vercel
2. Login: `Ghaalabh10@gmail.com` / `Hooyo114`
3. Admin → Settings → **System** waa inuu muujiyaa **Connected** (ma aha Demo)
4. Ama fur: `https://your-app.vercel.app/api/setup/status`

Jawaabta wanaagsan:
```json
{
  "mode": "firebase",
  "clientFirebase": true,
  "adminSdk": true,
  "firestoreEmpty": false,
  "ready": true
}
```

### Marka hore (database madhan)

App-ku si toos ah u seed gareynayaa xubnaha default marka Firestore madhan yahay.

Haddii aad hore u lahayd xog **browser-ka** (demo), app-ku wuxuu isku dayayaa inuu u wareejiyo Firestore marka ugu horreysa.

---

## TALLAABO 6 — GitHub Push

```bash
git add .
git commit -m "Firebase cloud setup for shared data"
git push origin main
```

Vercel wuxuu si toos ah u deploy gareynayaa.

---

## Login Credentials (Default)

| Role | Login ID | Password |
|------|----------|----------|
| Admin | `Ghaalabh10@gmail.com` | `Hooyo114` |
| Xubnaha | (admin wuu dejinayaa) | (admin wuu dejinayaa) |

**PIN Admin:** `1596`

---

## Dhibaatooyinka Caadiga ah

| Dhibaato | Xalka |
|----------|-------|
| "Demo" mode weli | `NEXT_PUBLIC_FIREBASE_*` ma jiraan Vercel → redeploy |
| Login ma shaqeeyo | `FIREBASE_SERVICE_ACCOUNT_JSON` ma saxna Vercel |
| Permission denied | `npm run firebase:deploy` mar kale |
| Browser kala duwan xog kala duwan | Firebase env vars ma jiraan — wali demo/localStorage |
| Xog lumin | Hubi `mode: firebase` in `/api/setup/status` |

---

## Kharashka

| Adeeg | Qiimo |
|-------|-------|
| Vercel Hobby | Bilaash |
| Firebase Spark | Bilaash (koox yar) |
| Domain (.com) | ~$12/sannad (ikhtiyaari) |

---

## Taageero

Haddii aad Firebase project sameysay, ii soo dir:
- Project ID
- Vercel URL

Waan kaa caawin karaa inaan hubiyo env vars.
