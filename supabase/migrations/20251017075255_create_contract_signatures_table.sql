/*
  # Create contract_signatures table

  1. New Tables
    - `contract_signatures`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `contract_version` (text, ej: 'v1.0')
      - `signed_at` (timestamptz, default now())
      - `ip_address` (text, nullable)
      - `user_agent` (text, nullable)

  2. Security
    - Enable RLS on `contract_signatures` table
    - Users can only read their own signatures
    - Users can insert their own signature (only once)
    - Service role has full access

  3. Notes
    - Registro de aceptación del NDA
    - Un usuario solo puede firmar una vez por versión de contrato
*/

-- Create contract_signatures table
CREATE TABLE IF NOT EXISTS contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  contract_version text NOT NULL DEFAULT 'v1.0',
  signed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  UNIQUE(user_id, contract_version)
);

-- Enable RLS
ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own signatures
CREATE POLICY "Users can read own signatures"
  ON contract_signatures
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own signature
CREATE POLICY "Users can insert own signature"
  ON contract_signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full access (for Edge Functions)
CREATE POLICY "Service role has full access to contract_signatures"
  ON contract_signatures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_contract_signatures_user_id ON contract_signatures(user_id);

-- Create index on contract_version for version queries
CREATE INDEX IF NOT EXISTS idx_contract_signatures_version ON contract_signatures(contract_version);