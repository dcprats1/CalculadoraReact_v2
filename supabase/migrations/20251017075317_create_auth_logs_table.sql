/*
  # Create auth_logs table

  1. New Tables
    - `auth_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable, foreign key to user_profiles)
      - `email` (text, not null)
      - `event_type` (enum: 'code_sent' | 'code_verified' | 'login_success' | 
                             'login_failed' | 'access_denied' | 'logout' | 
                             'device_limit_exceeded' | 'plan_change_requested' | 
                             'support_ticket_sent')
      - `ip_address` (text, nullable)
      - `user_agent` (text, nullable)
      - `success` (boolean, default true)
      - `error_message` (text, nullable)
      - `metadata` (jsonb, datos adicionales)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `auth_logs` table
    - Only service role can read (admin access via Edge Function)
    - Service role can insert (logging from Edge Functions)

  3. Notes
    - Auditoría completa de accesos
    - Útil para debugging y detección de fraude
    - Admin puede consultar vía Edge Function dedicada
*/

-- Create event_type enum
CREATE TYPE auth_event_type AS ENUM (
  'code_sent',
  'code_verified',
  'login_success',
  'login_failed',
  'access_denied',
  'logout',
  'device_limit_exceeded',
  'plan_change_requested',
  'support_ticket_sent'
);

-- Create auth_logs table
CREATE TABLE IF NOT EXISTS auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  email text NOT NULL,
  event_type auth_event_type NOT NULL,
  ip_address text,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read (admin queries via Edge Function)
CREATE POLICY "Service role can read auth_logs"
  ON auth_logs
  FOR SELECT
  TO service_role
  USING (true);

-- Policy: Service role can insert (for logging)
CREATE POLICY "Service role can insert auth_logs"
  ON auth_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);

-- Create index on email for email-specific queries
CREATE INDEX IF NOT EXISTS idx_auth_logs_email ON auth_logs(email);

-- Create index on event_type for filtering
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_event_time 
  ON auth_logs(user_id, event_type, created_at DESC);