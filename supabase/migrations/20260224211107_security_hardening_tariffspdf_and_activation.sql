/*
  # Security Hardening: tariffspdf + user_tariff_activation

  1. tariffspdf table
    - DROP all anon INSERT, UPDATE, DELETE policies (USING true - critical)
    - DROP all authenticated INSERT, UPDATE, DELETE policies (USING true - critical)
    - DROP anon SELECT (anonymous users should not see raw PDF tariff data)
    - KEEP authenticated SELECT for activated users (existing secure policy)
    - ADD admin-only INSERT, UPDATE, DELETE policies

  2. user_tariff_activation table
    - DROP all anon SELECT, INSERT, UPDATE, DELETE policies (USING true - critical)
    - DROP authenticated INSERT policy (users should not self-activate)
    - DROP authenticated UPDATE policy (users should not self-modify activation)
    - KEEP authenticated SELECT own-data policy (user_id = auth.uid())
    - ADD admin-only INSERT, UPDATE, DELETE policies

  3. Security Notes
    - Admin check: EXISTS(SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    - No anonymous access at all on either table after this migration
    - Normal users can only READ their own activation status
    - Only admins can manage tariff PDF data and activation records
*/

-- ============================================================
-- PART 1: TARIFFSPDF - Remove all dangerous policies
-- ============================================================

-- Drop ALL anon policies (no anonymous access)
DROP POLICY IF EXISTS "Anonymous users can delete tariffspdf" ON tariffspdf;
DROP POLICY IF EXISTS "Anonymous users can insert tariffspdf" ON tariffspdf;
DROP POLICY IF EXISTS "Anonymous users can view tariffspdf" ON tariffspdf;

-- Drop dangerous authenticated write policies (USING true)
DROP POLICY IF EXISTS "Authenticated users can delete tariffsPDF" ON tariffspdf;
DROP POLICY IF EXISTS "Authenticated users can insert tariffsPDF" ON tariffspdf;
DROP POLICY IF EXISTS "Authenticated users can update tariffsPDF" ON tariffspdf;

-- KEEP: "Only activated users can view tariffsPDF" (secure SELECT with activation check)

-- Add admin-only write policies
CREATE POLICY "Admins can insert tariffspdf"
  ON tariffspdf FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update tariffspdf"
  ON tariffspdf FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete tariffspdf"
  ON tariffspdf FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );


-- ============================================================
-- PART 2: USER_TARIFF_ACTIVATION - Lock down completely
-- ============================================================

-- Drop ALL anon policies (no anonymous access whatsoever)
DROP POLICY IF EXISTS "Permissive DELETE for anon" ON user_tariff_activation;
DROP POLICY IF EXISTS "Permissive INSERT for anon" ON user_tariff_activation;
DROP POLICY IF EXISTS "Permissive SELECT for anon" ON user_tariff_activation;
DROP POLICY IF EXISTS "Permissive UPDATE for anon" ON user_tariff_activation;

-- Drop authenticated write policies (activation must be admin-controlled)
DROP POLICY IF EXISTS "Users can create their own activation record" ON user_tariff_activation;
DROP POLICY IF EXISTS "Users can update their own activation record" ON user_tariff_activation;

-- KEEP: "Users can view their own activation status" (SELECT with auth.uid() = user_id)

-- Add admin-only write policies
CREATE POLICY "Admins can insert activation records"
  ON user_tariff_activation FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update activation records"
  ON user_tariff_activation FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete activation records"
  ON user_tariff_activation FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );
