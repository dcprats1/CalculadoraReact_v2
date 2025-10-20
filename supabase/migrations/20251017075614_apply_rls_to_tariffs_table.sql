/*
  # Apply RLS to tariffs table

  1. Security
    - Enable RLS on `tariffs` table
    - Users with active subscription can read tariffs
    - Service role has full access

  2. Notes
    - Protects tariff data - only accessible to paying customers
    - subscription_status must be 'active' AND subscription_end_date > now()
*/

-- Enable RLS
ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Active subscribers can read tariffs" ON tariffs;
DROP POLICY IF EXISTS "Service role has full access to tariffs" ON tariffs;

-- Policy: Active subscribers can read tariffs
CREATE POLICY "Active subscribers can read tariffs"
  ON tariffs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.subscription_status = 'active'
      AND user_profiles.subscription_end_date > now()
    )
  );

-- Policy: Service role has full access (for Edge Functions and admin)
CREATE POLICY "Service role has full access to tariffs"
  ON tariffs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);