-- AC7 Keydka — Supabase schema
-- Run in Supabase Dashboard → SQL Editor → New query → Run

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  password TEXT,
  join_date TEXT NOT NULL,
  end_date TEXT,
  monthly_fee INTEGER,
  annual_target INTEGER,
  login_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS savings (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'app',
  monthly_fee INTEGER DEFAULT 55,
  group_goal INTEGER DEFAULT 10000,
  group_start_date TEXT DEFAULT '2026-06-01',
  admin_pin TEXT DEFAULT '1596',
  admin_email TEXT DEFAULT 'Ghaalabh10@gmail.com',
  reminder_day INTEGER DEFAULT 15,
  late_fee_escalation BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  from_admin BOOLEAN DEFAULT false,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS bin (
  id TEXT PRIMARY KEY,
  member JSONB NOT NULL,
  payments JSONB DEFAULT '[]',
  chats JSONB DEFAULT '[]',
  archived_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  total_paid NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recovery_codes (
  id TEXT PRIMARY KEY DEFAULT 'current',
  code TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_savings_paid_at ON savings(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_savings_member_id ON savings(member_id);
CREATE INDEX IF NOT EXISTS idx_bin_archived_at ON bin(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_sent_at ON chats(sent_at ASC);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bin ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;

-- App uses its own login gate; anon key + open RLS for private group app
CREATE POLICY "members_all" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "payments_all" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "savings_all" ON savings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "settings_all" ON app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "announcements_all" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chats_all" ON chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "bin_all" ON bin FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "recovery_all" ON recovery_codes FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE savings;
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE bin;
