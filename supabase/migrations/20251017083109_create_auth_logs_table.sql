/*
  # Create Auth Logs Table

  1. New Tables
    - `auth_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References user_profiles (nullable for failed attempts)
      - `email` (text, not null) - Email used in auth attempt
      - `event_type` (text, not null) - Type: login_requested, login_success, login_failed, logout
      - `ip_address` (text) - IP address
      - `user_agent` (text) - Browser/device info
      - `metadata` (jsonb) - Additional context
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `auth_logs` table
    - Users can view their own logs only
*/

CREATE TABLE IF NOT EXISTS auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  email text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('login_requested', 'login_success', 'login_failed', 'logout', 'session_expired')),
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_email ON auth_logs(email);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);

ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own auth logs"
  ON auth_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);