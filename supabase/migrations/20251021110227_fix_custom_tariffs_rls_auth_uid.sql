/*
  # Fix Custom Tariffs RLS Policies - Use auth.uid()

  1. Problem Identified
    - Current policies use USING (true) which doesn't validate user identity
    - This causes 401 errors because the client isn't properly authenticated
    - Users ARE in auth.users (created during OTP registration)
    - Solution: Use auth.uid() = user_id like user_preferences and custom_cost_overrides
  
  2. Changes
    - Drop permissive policies with USING (true)
    - Create proper policies that validate auth.uid() = user_id
    - Add service_role policy for Edge Functions
    - Follow the exact pattern from user_preferences table (which works)
  
  3. Security
    - Users can only access their own custom tariffs
    - Service role (Edge Functions) has full access
    - Standard Supabase Auth pattern
  
  4. Tables Affected
    - custom_tariffs
    - custom_tariffs_active
*/

-- =====================================================
-- CUSTOM_TARIFFS TABLE
-- =====================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.custom_tariffs;

-- Create proper RLS policies matching user_preferences pattern
CREATE POLICY "Service role has full access to custom_tariffs"
  ON public.custom_tariffs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own custom tariffs"
  ON public.custom_tariffs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom tariffs"
  ON public.custom_tariffs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom tariffs"
  ON public.custom_tariffs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom tariffs"
  ON public.custom_tariffs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- CUSTOM_TARIFFS_ACTIVE TABLE
-- =====================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.custom_tariffs_active;

-- Create proper RLS policies matching user_preferences pattern
CREATE POLICY "Service role has full access to custom_tariffs_active"
  ON public.custom_tariffs_active
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own activation states"
  ON public.custom_tariffs_active
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activation states"
  ON public.custom_tariffs_active
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activation states"
  ON public.custom_tariffs_active
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activation states"
  ON public.custom_tariffs_active
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
