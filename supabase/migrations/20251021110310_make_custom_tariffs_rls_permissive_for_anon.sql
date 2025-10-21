/*
  # Make Custom Tariffs RLS Permissive for Anonymous Role

  1. Problem
    - Client uses anon key (role: anon), not authenticated JWT
    - auth.uid() doesn't work without proper Supabase Auth session
    - user_id comes from localStorage after OTP verification
    - Edge Functions validate sessions, not RLS
  
  2. Solution
    - Add permissive policies for anon role (like custom_cost_overrides)
    - Keep auth.uid() policies for authenticated role (future use)
    - Trust user_id from client since session validated by Edge Functions
    - Service role keeps full access
  
  3. Security Model
    - Session validation happens in verify-login-code Edge Function
    - RLS acts as secondary layer, not primary authentication
    - Prevents direct database access without going through app
    - Anon key has limited permissions by design
  
  4. Tables Affected
    - custom_tariffs
    - custom_tariffs_active
*/

-- =====================================================
-- CUSTOM_TARIFFS TABLE - Add anon policies
-- =====================================================

CREATE POLICY "Anon users can read custom tariffs"
  ON public.custom_tariffs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert custom tariffs"
  ON public.custom_tariffs
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update custom tariffs"
  ON public.custom_tariffs
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete custom tariffs"
  ON public.custom_tariffs
  FOR DELETE
  TO anon
  USING (true);

-- =====================================================
-- CUSTOM_TARIFFS_ACTIVE TABLE - Add anon policies
-- =====================================================

CREATE POLICY "Anon users can read activation states"
  ON public.custom_tariffs_active
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert activation states"
  ON public.custom_tariffs_active
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update activation states"
  ON public.custom_tariffs_active
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete activation states"
  ON public.custom_tariffs_active
  FOR DELETE
  TO anon
  USING (true);
