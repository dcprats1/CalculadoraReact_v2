/*
  # Apply RLS to custom_cost_overrides table

  1. Security
    - Enable RLS on existing `custom_cost_overrides` table
    - Service role has full access (for Edge Functions)
    - Authenticated users have read access to all overrides (temporary)

  2. Notes
    - Table already exists with different structure than planned
    - Using service_role for now until user-client relationship is established
*/

-- Enable RLS if not already enabled
ALTER TABLE custom_cost_overrides ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to custom_cost_overrides" ON custom_cost_overrides;
DROP POLICY IF EXISTS "Authenticated users can read cost overrides" ON custom_cost_overrides;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to custom_cost_overrides"
  ON custom_cost_overrides
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read (temporary - will be refined later)
CREATE POLICY "Authenticated users can read cost overrides"
  ON custom_cost_overrides
  FOR SELECT
  TO authenticated
  USING (true);