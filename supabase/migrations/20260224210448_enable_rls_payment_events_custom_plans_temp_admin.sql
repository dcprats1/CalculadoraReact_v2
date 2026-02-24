/*
  # Enable RLS on remaining tables and add basic policies

  1. Tables Modified
    - `payment_events` - Enable RLS, add SELECT/INSERT/UPDATE/DELETE policies scoped to client_id
    - `custom_commercial_plans` - Enable RLS, add SELECT/INSERT/UPDATE/DELETE policies scoped to user_id
    - `temp_rls_admin_oid` - Enable RLS only (admin-internal table, no user-facing policies needed)

  2. Security
    - payment_events: authenticated users can only access rows where client_id matches auth.uid()
    - custom_commercial_plans: authenticated users can only access rows where user_id matches auth.uid()
    - temp_rls_admin_oid: locked down entirely (no policies = no access), as intended for admin use
*/

-- payment_events
ALTER TABLE IF EXISTS payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment events"
  ON payment_events FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Users can insert own payment events"
  ON payment_events FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update own payment events"
  ON payment_events FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can delete own payment events"
  ON payment_events FOR DELETE
  TO authenticated
  USING (client_id = auth.uid());

-- custom_commercial_plans
ALTER TABLE IF EXISTS custom_commercial_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commercial plans"
  ON custom_commercial_plans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own commercial plans"
  ON custom_commercial_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own commercial plans"
  ON custom_commercial_plans FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own commercial plans"
  ON custom_commercial_plans FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- temp_rls_admin_oid
ALTER TABLE IF EXISTS temp_rls_admin_oid ENABLE ROW LEVEL SECURITY;
