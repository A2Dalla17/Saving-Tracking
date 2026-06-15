# Supabase + Vercel Setup — AC7 Keydka

Xogtu waxay ku kaydsan tahay **Supabase** (PostgreSQL cloud). Dhammaan browser-yadu hal xog arkaan.

---

## TALLAABO 1 — Supabase Project

1. Tag [supabase.com](https://supabase.com) → **Start your project**
2. Magac: `ac7-group` ama `ac7-keydka`
3. Database password dooro → **Create project**

---

## TALLAABO 2 — Database Tables (SQL)

1. Supabase Dashboard → **SQL Editor** → **New query**
2. Copy **dhammaan** `supabase/schema.sql` → **Run**

---

## TALLAABO 3 — API Keys

Supabase → **Project Settings** → **API**

| Vercel Variable | Supabase Field |
|-----------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (sir — ha wadaagin) |

---

## TALLAABO 4 — Vercel

1. [vercel.com](https://vercel.com) → **saving-tracking-xi** → **Settings** → **Environment Variables**
2. Ku dar 3 variables kor ku xusan
3. **Redeploy**

---

## TALLAABO 5 — Hubi

Fur: `https://saving-tracking-xi.vercel.app/api/setup/status`

```json
{
  "mode": "supabase",
  "ready": true
}
```

Login: `Ghaalabh10@gmail.com` / `Hooyo114`

Admin → Settings → **"Ku xiran (Supabase)"**

---

## Local dev

```bash
copy .env.example .env.local
# Buuxi values
npm run dev
```

---

## Dhibaatooyin

| Dhibaato | Xalka |
|----------|-------|
| Demo mode | Env vars ma jiraan Vercel |
| Login fail | `SUPABASE_SERVICE_ROLE_KEY` sax ma aha |
| Table error | Run `supabase/schema.sql` mar kale |
| Empty data | Fur app → auto seed `/api/setup/seed` |
