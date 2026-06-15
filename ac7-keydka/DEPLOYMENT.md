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
Supabase (Database)
  PostgreSQL + Row Level Security + service role for API
```

**Monthly cost estimate (small private group):**

| Service | Cost |
|---------|------|
| Domain (.com) | ~$12/year |
| Vercel (Hobby) | Free |
| Supabase (Free tier) | Free |
| Apple Developer | $99/year |
| Google Play | $25 one-time |

---

## Step 1 — Buy a Domain

Registrars: [Namecheap](https://www.namecheap.com), [Cloudflare](https://www.cloudflare.com/products/registrar/)

Suggested: `ac7group.com`, `ac7kayd.com`, `aragticad.com`

---

## Step 2 — Supabase (Database)

**Full guide:** see [SUPABASE_VERCEL_SETUP.md](./SUPABASE_VERCEL_SETUP.md) (Somali step-by-step)

1. [Supabase](https://supabase.com) → Create project
2. SQL Editor → run `supabase/schema.sql`
3. Project Settings → API → copy URL, anon key, service_role key

---

## Step 3 — Environment Variables

Copy `.env.example` → `.env.local`. Set on Vercel for production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
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
- Backup Supabase (Dashboard → Database → Backups)
- Change admin PIN and default passwords after launch

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails | Check `SUPABASE_SERVICE_ROLE_KEY` on Vercel |
| Demo mode | Set all 3 Supabase env vars → redeploy |
| Table errors | Run `supabase/schema.sql` in SQL Editor |
| No recovery email | Set Gmail `SMTP_PASS` |
| Blank mobile app | Set `CAPACITOR_SERVER_URL` to HTTPS URL |
