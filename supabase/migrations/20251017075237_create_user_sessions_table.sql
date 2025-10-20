/*
  # Create user_sessions table

  1. New Tables
    - `user_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `device_fingerprint` (text, hash único del dispositivo)
      - `device_name` (text, ej: "Chrome 120 - Windows 11")
      - `last_authenticated_at` (timestamptz, not null)
      - `expires_at` (timestamptz, not null, last_authenticated_at + 24h)
      - `is_active` (boolean, default true)
      - `ip_address` (text, nullable)
      - `user_agent` (text, nullable)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `user_sessions` table
    - Users can only read/manage their own sessions
    - Service role has full access

  3. Notes
    - Máximo N sesiones activas según tier (validado en Edge Function)
    - Sesión válida si expires_at > now()
    - Si usuario supera límite → Error "Máximo de dispositivos alcanzado"
*/

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_name text,
  last_authenticated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own sessions
CREATE POLICY "Users can read own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
  ON user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON user_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON user_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role has full access (for Edge Functions)
CREATE POLICY "Service role has full access to user_sessions"
  ON user_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Create index on device_fingerprint for duplicate detection
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_fingerprint ON user_sessions(device_fingerprint);

-- Create index on expires_at for active session queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create composite index for active sessions per user
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active 
  ON user_sessions(user_id, is_active, expires_at);