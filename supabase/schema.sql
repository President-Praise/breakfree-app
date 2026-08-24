-- Run this in your Supabase SQL editor:
-- https://supabase.com/dashboard/project/sqiorquamoxmgwvbgqxs/sql/new

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_type TEXT NOT NULL,
  habit_name TEXT NOT NULL,
  streak_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  grace_days_used INTEGER NOT NULL DEFAULT 0,
  grace_days_limit INTEGER NOT NULL DEFAULT 1,
  daily_cost INTEGER,
  checkin_notification_time TEXT,
  last_milestone_notified INTEGER NOT NULL DEFAULT 0,
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  motivation TEXT,
  last_milestone_shown INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"
  ON profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Check-ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('clean', 'relapse')),
  note TEXT,
  relapse_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own check_ins"
  ON check_ins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Migration: run these if the tables already exist
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS motivation TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_milestone_shown INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grace_days_used INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grace_days_limit INTEGER NOT NULL DEFAULT 1;
-- ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS relapse_plan TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_cost INTEGER;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS checkin_notification_time TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_milestone_notified INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT false;
