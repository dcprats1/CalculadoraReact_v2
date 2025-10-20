/*
  # Create verification_codes table

  1. New Tables
    - `verification_codes`
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `code` (text, 6 dígitos numéricos)
      - `expires_at` (timestamptz, created_at + 5 minutos)
      - `attempts` (integer, default 0, max 3)
      - `used` (boolean, default false)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `verification_codes` table
    - No direct access (solo vía Edge Functions)
    - Service role has full access

  3. Notes
    - Código válido solo 5 minutos
    - Máximo 3 intentos fallidos
    - Un código solo se puede usar una vez
*/

-- Create verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL CHECK (code ~ '^[0-9]{6}$'),
  expires_at timestamptz NOT NULL,
  attempts integer DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 3),
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (no public access)
CREATE POLICY "Service role has full access to verification_codes"
  ON verification_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index on email for lookup
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);

-- Create index on code for verification
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);

-- Create composite index for active code queries
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_active 
  ON verification_codes(email, used, expires_at);

-- Create function to clean up expired codes (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < now() - interval '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;