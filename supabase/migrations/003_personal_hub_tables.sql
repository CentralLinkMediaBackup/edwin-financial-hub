-- Personal Hub expansion tables
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS goals (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text NOT NULL,
  category     text,
  deadline     date,
  progress     integer DEFAULT 0,
  status       text DEFAULT 'active',
  key_results  jsonb DEFAULT '[]',
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habits (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  category   text,
  color      text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id   uuid REFERENCES habits(id) ON DELETE CASCADE,
  date       date NOT NULL,
  completed  boolean DEFAULT false,
  notes      text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(habit_id, date)
);

CREATE TABLE IF NOT EXISTS workouts (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date             date NOT NULL,
  type             text,
  duration_minutes integer,
  exercises        jsonb DEFAULT '[]',
  notes            text,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date       date NOT NULL,
  weight_lbs numeric,
  notes      text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (adjust policies per your setup)
ALTER TABLE goals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-user app with anon key)
CREATE POLICY IF NOT EXISTS "allow_all_goals"       ON goals       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "allow_all_habits"      ON habits      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "allow_all_habit_logs"  ON habit_logs  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "allow_all_workouts"    ON workouts    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "allow_all_weight_logs" ON weight_logs FOR ALL USING (true) WITH CHECK (true);
