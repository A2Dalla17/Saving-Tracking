# AC7 Group — Aragti Cad

Private savings platform for the AC7 Group. Somali UI, professional fintech design.

## Quick Start

```bash
cd ac7-keydka
npm install
npm run dev
```

Open **http://localhost:3000**

## Features

| Page | Who | What |
|------|-----|------|
| **Dashboard-ka** | Everyone | Total savings, debt, goal progress, chart |
| **Xubnaha** | Everyone | Member cards with share %, ownership, debt |
| **Kalandarka** | Everyone | Monthly calendar — see who paid on which day & time |
| **Taariikhda** | Everyone | Full payment timeline |
| **Warbixintayda** | Members | Select your name → download/share PDF via WhatsApp |
| **Maamulka** | Admin only | PIN `1596` — tick payments, edit settings, Excel table |

## Admin (PIN: 1596)

- **Diiwaanka** — Tick ✅ payments (auto-escalates: miss 1 month → next due $110, $165...)
- **Dejinta** — Monthly fee, group goal, start date, reminder day (15th), PIN, Gmail
- **Tafatirka** — Excel-like member table (name, phone, join/end dates)

### PIN Recovery

After **5 wrong attempts** → Gmail recovery to **Ghaalabh10@gmail.com**

Configure SMTP in `.env.local` (see `.env.example`).

## Default Team

- Abdullahi A2
- Hassan Kaafi
- Abduweli Enjoy
- Ahmed Rash

## Business Rules

- Monthly fee: **$55** (editable in admin)
- Start: **June 2026**
- Share % = `(Your Paid ÷ Group Total) × 100`
- Late fee: unpaid month → next month doubles ($55 → $110 → $165...)
- Auto reminder banner on the **15th** of each month

## Brand

- Color: **#690957**
- Logo: top-right corner + sidebar
- AC7 Group = Aragti Cad

## Configuration

Copy `.env.example` → `.env.local` for Firebase cloud sync and Gmail recovery.

Without Firebase: runs in **demo mode** (localStorage) — works offline on your computer.

## Production Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full guide:
- Buy domain + connect to Vercel
- Firebase database setup
- App Store + Play Store (Capacitor)
- Environment variables
- Security checklist
