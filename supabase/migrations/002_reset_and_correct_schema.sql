-- SUPABASE IS THE SOURCE OF TRUTH
-- Never reset or re-seed this data on deploy
-- Check for existing records before inserting
-- All user data persists in Supabase independently of code changes
--
-- Run this ONCE in Supabase SQL Editor.
-- Safe to run: all old tables are empty. Drops and recreates with correct schema.
-- After running this, the app auto-seeds on first load.

-- Drop old mismatched tables (all empty — no data loss)
DROP TABLE IF EXISTS accounts        CASCADE;
DROP TABLE IF EXISTS transactions     CASCADE;
DROP TABLE IF EXISTS bills            CASCADE;
DROP TABLE IF EXISTS paychecks        CASCADE;
DROP TABLE IF EXISTS tilt_logs        CASCADE;
DROP TABLE IF EXISTS earnin_logs      CASCADE;
DROP TABLE IF EXISTS afterpay_items   CASCADE;
DROP TABLE IF EXISTS debts            CASCADE;
DROP TABLE IF EXISTS savings_goals    CASCADE;
DROP TABLE IF EXISTS settings         CASCADE;
DROP TABLE IF EXISTS pending_income   CASCADE;

-- ── accounts ──────────────────────────────────────────────────────────────────
CREATE TABLE accounts (
  key         TEXT          PRIMARY KEY,
  balance     DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── transactions ──────────────────────────────────────────────────────────────
CREATE TABLE transactions (
  id          TEXT          PRIMARY KEY,
  date        DATE          NOT NULL,
  type        TEXT          NOT NULL CHECK (type IN ('in','out')),
  amount      DECIMAL(12,2) NOT NULL,
  category    TEXT,
  note        TEXT,
  account     TEXT          DEFAULT 'chaseDebit',
  is_one_time BOOLEAN       DEFAULT false,
  source      TEXT,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_tx_date    ON transactions(date DESC);
CREATE INDEX idx_tx_account ON transactions(account);

-- ── bills ─────────────────────────────────────────────────────────────────────
CREATE TABLE bills (
  id              TEXT          PRIMARY KEY,
  name            TEXT          NOT NULL,
  amount          DECIMAL(12,2) DEFAULT 0,
  due_day         INTEGER,
  frequency       TEXT          DEFAULT 'monthly',
  is_active       BOOLEAN       DEFAULT true,
  category        TEXT,
  note            TEXT,
  paid_this_month BOOLEAN       DEFAULT false
);
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON bills FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── paychecks ─────────────────────────────────────────────────────────────────
CREATE TABLE paychecks (
  id          TEXT          PRIMARY KEY,
  date        DATE          NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  source      TEXT,
  account     TEXT          DEFAULT 'chaseDebit',
  note        TEXT,
  received    BOOLEAN       DEFAULT false,
  is_one_time BOOLEAN       DEFAULT false
);
ALTER TABLE paychecks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON paychecks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_pc_date ON paychecks(date);

-- ── tilt_logs ─────────────────────────────────────────────────────────────────
CREATE TABLE tilt_logs (
  id               TEXT          PRIMARY KEY,
  amount_used      DECIMAL(12,2) DEFAULT 0,
  credit_limit     DECIMAL(12,2) DEFAULT 400,
  instant_delivery BOOLEAN       DEFAULT true,
  instant_fee      DECIMAL(12,2) DEFAULT 12,
  repayment_date   DATE,
  repayment_option TEXT          DEFAULT 'A',
  status           TEXT          DEFAULT 'active' CHECK (status IN ('active','repaid')),
  repaid_at        DATE,
  note             TEXT,
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE tilt_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON tilt_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── earnin_logs ───────────────────────────────────────────────────────────────
CREATE TABLE earnin_logs (
  id               TEXT          PRIMARY KEY,
  cycle_start_date DATE          NOT NULL,
  fri_taken        BOOLEAN       DEFAULT false,
  sat_taken        BOOLEAN       DEFAULT false,
  sun_taken        BOOLEAN       DEFAULT false,
  mon_taken        BOOLEAN       DEFAULT false,
  amounts          JSONB         DEFAULT '{"fri":155.99,"sat":155.99,"sun":155.99,"mon":53.99}'::jsonb,
  repayment_amount DECIMAL(12,2) DEFAULT 521.96,
  status           TEXT          DEFAULT 'active' CHECK (status IN ('active','repaid')),
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE earnin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON earnin_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── afterpay_items ────────────────────────────────────────────────────────────
CREATE TABLE afterpay_items (
  id           TEXT          PRIMARY KEY,
  name         TEXT          NOT NULL,
  total_amount DECIMAL(12,2) DEFAULT 0,
  payments     JSONB         DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE afterpay_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON afterpay_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── debts ─────────────────────────────────────────────────────────────────────
CREATE TABLE debts (
  id              TEXT          PRIMARY KEY,
  name            TEXT          NOT NULL,
  total_balance   DECIMAL(12,2) DEFAULT 0,
  minimum_payment DECIMAL(12,2) DEFAULT 0,
  apr             DECIMAL(5,2)  DEFAULT 0,
  payment_history JSONB         DEFAULT '[]'::jsonb
);
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON debts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── savings_goals ─────────────────────────────────────────────────────────────
CREATE TABLE savings_goals (
  id             TEXT          PRIMARY KEY,
  name           TEXT          NOT NULL,
  target_amount  DECIMAL(12,2) DEFAULT 0,
  current_amount DECIMAL(12,2) DEFAULT 0,
  target_date    DATE,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON savings_goals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── settings (singleton) ──────────────────────────────────────────────────────
CREATE TABLE settings (
  id                TEXT          PRIMARY KEY DEFAULT 'singleton',
  earn_in           JSONB         DEFAULT '{}'::jsonb,
  tilt_cfg          JSONB         DEFAULT '{}'::jsonb,
  paycheck_cfg      JSONB         DEFAULT '{}'::jsonb,
  theme             TEXT          DEFAULT 'dark',
  projected_balance DECIMAL(12,2)
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── pending_income ────────────────────────────────────────────────────────────
CREATE TABLE pending_income (
  id         TEXT          PRIMARY KEY,
  label      TEXT          NOT NULL,
  amount     DECIMAL(12,2) NOT NULL,
  details    JSONB         DEFAULT '[]'::jsonb,
  note       TEXT,
  status     TEXT          DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at DATE          DEFAULT CURRENT_DATE
);
ALTER TABLE pending_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON pending_income FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
