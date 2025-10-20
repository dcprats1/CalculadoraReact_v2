/*
  # Create Verification Codes Table

  1. New Tables
    - `verification_codes`
      - `id` (uuid, primary key)
      - `email` (text, not null) - Email address
      - `code` (text, not null) - 6-digit verification code
      - `expires_at` (timestamptz, not null) - When code expires (5 minutes)
      - `used` (boolean, default false) - Whether code has been used
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `verification_codes` table
    - Codes are managed server-side only via Edge Functions
*/

CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- No public policies - codes are managed server-side only