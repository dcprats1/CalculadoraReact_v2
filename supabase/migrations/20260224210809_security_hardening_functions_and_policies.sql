/*
  # Security Hardening: Functions search_path + Restrictive RLS Policies

  1. Function Hardening (search_path)
    - All 16 public functions updated with SET search_path = public, extensions
    - Prevents schema-impersonation attacks (function_search_path_mutable)
    - get_user_activity_summary already had it, re-applied for consistency

  2. Policy Fixes - tariffs table
    - DROP dangerous USING(true) policies for INSERT, UPDATE, DELETE, ALL
    - Keep public SELECT for tariff lookups
    - Add admin-only INSERT, UPDATE, DELETE policies (check user_profiles.is_admin)

  3. Policy Fixes - discount_plans table
    - DROP dangerous ALL and duplicate SELECT policies
    - Keep one public SELECT
    - Add admin-only INSERT, UPDATE, DELETE policies

  4. Policy Fixes - constants_by_service table
    - DROP dangerous ALL policy for authenticated
    - DROP duplicate SELECT policies
    - Keep one public SELECT
    - Add admin-only INSERT, UPDATE, DELETE policies

  5. Policy Fixes - custom_tariffs table
    - DROP all anon INSERT, UPDATE, DELETE policies (anon keeps SELECT only)
    - Authenticated user policies for own data remain unchanged

  6. Policy Fixes - custom_tariffs_active table
    - DROP all anon INSERT, UPDATE, DELETE policies (anon keeps SELECT only)
    - Authenticated user policies for own data remain unchanged

  7. Security Notes
    - Admin check uses: EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
    - service_role full-access policies left untouched (needed for edge functions)
    - All changes are additive-safe using IF EXISTS on drops
*/

-- ============================================================
-- PART 1: HARDEN ALL PUBLIC FUNCTIONS WITH search_path
-- ============================================================

-- 1. cleanup_expired_sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < now() - interval '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- 2. set_activation_date
CREATE OR REPLACE FUNCTION public.set_activation_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, extensions
AS $function$
BEGIN
  IF NEW.is_activated = true AND (OLD.is_activated IS NULL OR OLD.is_activated = false) THEN
    NEW.activation_date = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, extensions
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. apply_promotional_code
CREATE OR REPLACE FUNCTION public.apply_promotional_code(p_user_id uuid, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
DECLARE
  v_promo_code promotional_codes%ROWTYPE;
  v_already_used boolean;
  v_new_end_date timestamptz;
BEGIN
  SELECT * INTO v_promo_code
  FROM promotional_codes
  WHERE code = UPPER(p_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido o expirado');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM promotional_code_usage
    WHERE code_id = v_promo_code.id
      AND user_id = p_user_id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya has usado este código');
  END IF;

  IF v_promo_code.max_uses IS NOT NULL AND v_promo_code.current_uses >= v_promo_code.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código agotado');
  END IF;

  v_new_end_date := now() + (v_promo_code.duration_days || ' days')::interval;

  UPDATE user_profiles
  SET
    subscription_status = 'active',
    subscription_tier = v_promo_code.tier,
    max_devices = CASE v_promo_code.tier
      WHEN 1 THEN 1
      WHEN 2 THEN 3
      WHEN 3 THEN 5
      WHEN 4 THEN 8
      WHEN 5 THEN 12
    END,
    subscription_end_date = v_new_end_date,
    payment_method = 'promo'
  WHERE id = p_user_id;

  INSERT INTO promotional_code_usage (code_id, user_id)
  VALUES (v_promo_code.id, p_user_id);

  UPDATE promotional_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo_code.id;

  RETURN jsonb_build_object(
    'success', true,
    'tier', v_promo_code.tier,
    'expires_at', v_new_end_date
  );
END;
$function$;

-- 5. check_user_and_profile
CREATE OR REPLACE FUNCTION public.check_user_and_profile(user_email text)
 RETURNS TABLE(id uuid, email text, user_created timestamp with time zone, confirmed_at timestamp with time zone, email_confirmed_at timestamp with time zone, profile_id uuid, profile_created timestamp with time zone, is_admin boolean, subscription_tier integer, max_devices integer, subscription_status text)
 LANGUAGE plpgsql
 SET search_path = public, extensions
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.created_at as user_created,
    u.email_confirmed_at as confirmed_at,
    u.email_confirmed_at,
    p.id as profile_id,
    p.created_at as profile_created,
    COALESCE(p.is_admin, false) as is_admin,
    p.subscription_tier,
    p.max_devices,
    p.subscription_status
  FROM auth.users u
  LEFT JOIN user_profiles p ON u.id = p.id
  WHERE u.email = user_email;
END;
$function$;

-- 6. cleanup_expired_login_codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_login_codes()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
BEGIN
  DELETE FROM login_codes
  WHERE expires_at < now() - interval '1 day';
END;
$function$;

-- 7. cleanup_expired_verification_codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < now() - interval '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- 8. cleanup_old_auth_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_auth_logs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM auth_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- 9. create_user_profile_on_signup
CREATE OR REPLACE FUNCTION public.create_user_profile_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
DECLARE
  is_admin_user boolean;
BEGIN
  is_admin_user := (NEW.email = 'dcprats@gmail.com' OR NEW.email = 'damaso.prats@logicalogistica.com');

  INSERT INTO public.user_profiles (
    id, email, subscription_status, subscription_tier, max_devices,
    subscription_start_date, subscription_end_date, payment_method,
    is_admin, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.email,
    CASE WHEN is_admin_user THEN 'active' ELSE 'trial' END,
    CASE WHEN is_admin_user THEN 5 ELSE 1 END,
    CASE WHEN is_admin_user THEN 12 ELSE 1 END,
    now(),
    CASE WHEN is_admin_user THEN now() + interval '10 years' ELSE now() + interval '7 days' END,
    CASE WHEN is_admin_user THEN 'manual' ELSE NULL END,
    is_admin_user, now(), now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- 10. deactivate_expired_sessions
CREATE OR REPLACE FUNCTION public.deactivate_expired_sessions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
DECLARE
  updated_count integer;
BEGIN
  UPDATE user_sessions
  SET is_active = false
  WHERE expires_at < now()
    AND is_active = true;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$;

-- 11. get_user_activity_summary (already had search_path, re-applied)
CREATE OR REPLACE FUNCTION public.get_user_activity_summary(p_user_id uuid)
 RETURNS TABLE(total_sop integer, total_minisop integer, total_calculations integer, days_active bigint, average_calculations_per_day numeric, first_activity timestamp with time zone, last_activity timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
BEGIN
RETURN QUERY
SELECT
  COALESCE(uas.sop_downloads_count, 0)::integer,
  COALESCE(uas.minisop_downloads_count, 0)::integer,
  COALESCE(uas.package_calculations_count, 0)::integer,
  COALESCE((
    SELECT COUNT(DISTINCT activity_date)
    FROM user_daily_activity
    WHERE user_id = p_user_id
  ), 0),
  CASE
    WHEN COALESCE((
      SELECT COUNT(DISTINCT activity_date)
      FROM user_daily_activity
      WHERE user_id = p_user_id
    ), 0) > 0
    THEN ROUND(
      COALESCE(uas.package_calculations_count, 0)::numeric /
      (SELECT COUNT(DISTINCT activity_date) FROM user_daily_activity WHERE user_id = p_user_id)::numeric,
      2
    )
    ELSE 0
  END,
  uas.first_activity_date,
  uas.last_activity_date
FROM user_activity_stats uas
WHERE uas.user_id = p_user_id;
END;
$function$;

-- 12. increment_promo_code_usage
CREATE OR REPLACE FUNCTION public.increment_promo_code_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
BEGIN
  UPDATE promotional_codes
  SET current_uses = current_uses + 1
  WHERE id = NEW.code_id;
  RETURN NEW;
END;
$function$;

-- 13. set_tariffs_updated_at
CREATE OR REPLACE FUNCTION public.set_tariffs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, extensions
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 14. sync_max_devices_from_tier
CREATE OR REPLACE FUNCTION public.sync_max_devices_from_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, extensions
AS $function$
BEGIN
  CASE NEW.subscription_tier
    WHEN 1 THEN NEW.max_devices := 1;
    WHEN 2 THEN NEW.max_devices := 3;
    WHEN 3 THEN NEW.max_devices := 5;
    WHEN 4 THEN NEW.max_devices := 8;
    WHEN 5 THEN NEW.max_devices := 12;
    ELSE NEW.max_devices := 1;
  END CASE;
  RETURN NEW;
END;
$function$;

-- 15. update_custom_commercial_plans_updated_at
CREATE OR REPLACE FUNCTION public.update_custom_commercial_plans_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, extensions
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 16. update_custom_tariffs_updated_at
CREATE OR REPLACE FUNCTION public.update_custom_tariffs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, extensions
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 17. update_user_tariff_activation_updated_at
CREATE OR REPLACE FUNCTION public.update_user_tariff_activation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, extensions
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;


-- ============================================================
-- PART 2: FIX TARIFFS TABLE POLICIES
-- ============================================================

-- Drop dangerous permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete tariffs" ON tariffs;
DROP POLICY IF EXISTS "Authenticated users can insert tariffs" ON tariffs;
DROP POLICY IF EXISTS "Authenticated users can manage tariffs" ON tariffs;
DROP POLICY IF EXISTS "Authenticated users can update tariffs" ON tariffs;

-- Keep: "Anyone can read tariffs" (public SELECT) and "Active subscribers can read tariffs"
-- Keep: "Service role has full access to tariffs"
-- Drop duplicate SELECT
DROP POLICY IF EXISTS "Tariffs are viewable by everyone" ON tariffs;

-- Admin-only write policies
CREATE POLICY "Admins can insert tariffs"
  ON tariffs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update tariffs"
  ON tariffs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete tariffs"
  ON tariffs FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );


-- ============================================================
-- PART 3: FIX DISCOUNT_PLANS TABLE POLICIES
-- ============================================================

-- Drop dangerous policies
DROP POLICY IF EXISTS "Authenticated users can manage discount plans" ON discount_plans;
DROP POLICY IF EXISTS "Discount plans are viewable by everyone" ON discount_plans;

-- Keep: "Public Read Discounts" (public SELECT)

-- Admin-only write policies
CREATE POLICY "Admins can insert discount plans"
  ON discount_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update discount plans"
  ON discount_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete discount plans"
  ON discount_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );


-- ============================================================
-- PART 4: FIX CONSTANTS_BY_SERVICE TABLE POLICIES
-- ============================================================

-- Drop dangerous policies
DROP POLICY IF EXISTS "Authenticated users can manage constants" ON constants_by_service;
DROP POLICY IF EXISTS "Constants are viewable by everyone" ON constants_by_service;

-- Keep: "Public Read Constants" (public SELECT)

-- Admin-only write policies
CREATE POLICY "Admins can insert constants"
  ON constants_by_service FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update constants"
  ON constants_by_service FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete constants"
  ON constants_by_service FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );


-- ============================================================
-- PART 5: REMOVE ANON WRITE ACCESS FROM CUSTOM_TARIFFS
-- ============================================================

DROP POLICY IF EXISTS "Anon users can insert custom tariffs" ON custom_tariffs;
DROP POLICY IF EXISTS "Anon users can update custom tariffs" ON custom_tariffs;
DROP POLICY IF EXISTS "Anon users can delete custom tariffs" ON custom_tariffs;

-- Keep: "Anon users can read custom tariffs" (SELECT only)
-- Keep: All authenticated user own-data policies
-- Keep: Service role full access


-- ============================================================
-- PART 6: REMOVE ANON WRITE ACCESS FROM CUSTOM_TARIFFS_ACTIVE
-- ============================================================

DROP POLICY IF EXISTS "Anon users can insert activation states" ON custom_tariffs_active;
DROP POLICY IF EXISTS "Anon users can update activation states" ON custom_tariffs_active;
DROP POLICY IF EXISTS "Anon users can delete activation states" ON custom_tariffs_active;

-- Keep: "Anon users can read activation states" (SELECT only)
-- Keep: All authenticated user own-data policies
-- Keep: Service role full access
