# AC7 Group — Full Production Deployment Guide

This guide takes AC7 Keydka from local demo to a **live website**, **permanent database**, and **App Store / Play Store** apps.

---

## Architecture Overview

```
Users (Web + iOS + Android)
  Website: https://yourdomain.com
  Mobile apps: Capacitor wrapper loads same URL
        |
Vercel (Frontend + Backend API)
  Next.js 15 + /api/auth/login + /api/recovery/*
        |
Firebase (Database)
  Firestore + Auth custom tokens + security rules
```

**Monthly cost estimate (small private group):**

| Service | Cost |
|---------|------|
| Domain (.com) | ~$12/year |
| Vercel (Hobby) | Free |
| Firebase Spark | Free |
| Apple Developer | $99/year |
| Google Play | $25 one-time |

---

## Step 1 — Buy a Domain

Registrars: [Namecheap](https://www.namecheap.com), [Cloudflare](https://www.cloudflare.com/products/registrar/)

Suggested: `ac7group.com`, `ac7kayd.com`, `aragticad.com`

---

## Step 2 — Firebase (Database)

**Full guide:** see [FIREBASE_VERCEL_SETUP.md](./FIREBASE_VERCEL_SETUP.md) (Somali step-by-step)

1. [Firebase Console](https://console.firebase.google.com) → Create project `ac7-keydka`
2. Enable **Firestore** (production mode)
3. Enable **Authentication** (custom tokens via API)
4. Add Web app → copy config values
5. Service accounts → Generate private key → use for `FIREBASE_SERVICE_ACCOUNT_JSON`

Deploy rules:
```bash
npm install -g firebase-tools
firebase login
cd ac7-keydka
firebase use --add
npm run firebase:deploy
```

---

## Step 3 — Environment Variables

Copy `.env.example` → `.env.local`. Set on Vercel for production:

- All `NEXT_PUBLIC_FIREBASE_*` vars
- `FIREBASE_SERVICE_ACCOUNT_JSON` (full JSON, one line)
- `SMTP_*` for Gmail recovery

Gmail app password: Google Account → Security → App passwords

---

## Step 4 — Deploy to Vercel

1. Push to GitHub
2. [vercel.com](https://vercel.com) → Import `ac7-keydka`
3. Add environment variables
4. Deploy
5. Settings → Domains → add your domain
6. DNS at registrar: A record `76.76.21.21`, CNAME www → `cname.vercel-dns.com`
7. Firebase Auth → Authorized domains → add your domain

---

## Step 5 — App Store + Play Store

```bash
npm install
set CAPACITOR_SERVER_URL=https://yourdomain.com
npx cap add android
npx cap add ios
npm run mobile:sync
npm run mobile:android   # Android Studio → signed AAB → Play Console
npm run mobile:ios       # Xcode → Archive → App Store Connect
```

**Requirements:** Apple Developer $99/yr, Google Play $25 once, privacy policy URL, app icons 1024×1024.

---

## Step 6 — Keep Forever

- Renew domain yearly
- Renew Apple Developer yearly
- Backup Firestore (Firebase Console export)
- Change admin PIN and default passwords after launch

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails | Check `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel |
| Permission denied | Run `npm run firebase:deploy` |
| No recovery email | Set Gmail `SMTP_PASS` |
| Blank mobile app | Set `CAPACITOR_SERVER_URL` to HTTPS URL |
