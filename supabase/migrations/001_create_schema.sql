-- SUPABASE IS THE SOURCE OF TRUTH
-- Never reset or re-seed this data on deploy
-- Check for existing records before inserting
-- All user data persists in Supabase independently of code changes
--
-- Run this ONCE in the Supabase SQL Editor (dashboard → SQL Editor → New query).
-- After running this once, the app seeds itself automatically on first load.

-- ── Account balances ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  key         TEXT         PRIMARY KEY,
  balance     DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;

-- ── Transactions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT         PRIMARY KEY,
  date        DATE         NOT NULL,
  type        TEXT         NOT NULL CHECK (type IN ('in','out')),
  amount      DECIMAL(12,2) NOT NULL,
  category    TEXT,
  note        TEXT,
  account     TEXT         DEFAULT 'chaseDebit',
  is_one_time BOOLEAN      DEFAULT false,
  source      TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tx_date    ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account);

-- ── Bills / Subscriptions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
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
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;

-- ── Paychecks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paychecks (
  id          TEXT          PRIMARY KEY,
  date        DATE          NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  source      TEXT,
  account     TEXT          DEFAULT 'chaseDebit',
  note        TEXT,
  received    BOOLEAN       DEFAULT false,
  is_one_time BOOLEAN       DEFAULT false
);
ALTER TABLE paychecks DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pc_date ON paychecks(date);

-- ── TILT logs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tilt_logs (
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
ALTER TABLE tilt_logs DISABLE ROW LEVEL SECURITY;

-- ── Earn In logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS earnin_logs (
  id                TEXT          PRIMARY KEY,
  cycle_start_date  DATE          NOT NULL,
  fri_taken         BOOLEAN       DEFAULT false,
  sat_taken         BOOLEAN       DEFAULT false,
  sun_taken         BOOLEAN       DEFAULT false,
  mon_taken         BOOLEAN       DEFAULT false,
  amounts           JSONB         DEFAULT '{"fri":155.99,"sat":155.99,"sun":155.99,"mon":53.99}'::jsonb,
  repayment_amount  DECIMAL(12,2) DEFAULT 521.96,
  status            TEXT          DEFAULT 'active' CHECK (status IN ('active','repaid')),
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE earnin_logs DISABLE ROW LEVEL SECURITY;

-- ── Afterpay items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS afterpay_items (
  id           TEXT          PRIMARY KEY,
  name         TEXT          NOT NULL,
  total_amount DECIMAL(12,2) DEFAULT 0,
  payments     JSONB         DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE afterpay_items DISABLE ROW LEVEL SECURITY;

-- ── Debts ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debts (
  id              TEXT          PRIMARY KEY,
  name            TEXT          NOT NULL,
  total_balance   DECIMAL(12,2) DEFAULT 0,
  minimum_payment DECIMAL(12,2) DEFAULT 0,
  apr             DECIMAL(5,2)  DEFAULT 0,
  payment_history JSONB         DEFAULT '[]'::jsonb
);
ALTER TABLE debts DISABLE ROW LEVEL SECURITY;

-- ── Savings goals ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_goals (
  id             TEXT          PRIMARY KEY,
  name           TEXT          NOT NULL,
  target_amount  DECIMAL(12,2) DEFAULT 0,
  current_amount DECIMAL(12,2) DEFAULT 0,
  target_date    DATE,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE savings_goals DISABLE ROW LEVEL SECURITY;

-- ── Settings (singleton) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id                TEXT          PRIMARY KEY DEFAULT 'singleton',
  earn_in           JSONB         DEFAULT '{}'::jsonb,
  tilt_cfg          JSONB         DEFAULT '{}'::jsonb,
  paycheck_cfg      JSONB         DEFAULT '{}'::jsonb,
  theme             TEXT          DEFAULT 'dark',
  projected_balance DECIMAL(12,2)
);
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- ── Pending income ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_income (
  id         TEXT          PRIMARY KEY,
  label      TEXT          NOT NULL,
  amount     DECIMAL(12,2) NOT NULL,
  details    JSONB         DEFAULT '[]'::jsonb,
  note       TEXT,
  status     TEXT          DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at DATE          DEFAULT CURRENT_DATE
);
ALTER TABLE pending_income DISABLE ROW LEVEL SECURITY;
