/*
  # Sistema de Códigos Promocionales

  ## Descripción
  Códigos promocionales generados por admin para dar acceso gratuito o trial extendido.

  ## 1. Nueva Tabla: promotional_codes

  - `id` (uuid, PK)
  - `code` (text, único, ej: "GLS2025FREE")
  - `description` (text, ej: "Acceso gratuito 30 días")
  - `tier` (integer, 1-5, tier que otorga)
  - `duration_days` (integer, días de acceso)
  - `max_uses` (integer, máximo de usos totales, NULL = ilimitado)
  - `current_uses` (integer, contador de usos)
  - `is_active` (boolean, si está activo)
  - `expires_at` (timestamptz, fecha de expiración del código)
  - `created_by` (uuid, FK a user_profiles, admin que lo creó)
  - `created_at` (timestamptz)

  ## 2. Nueva Tabla: promotional_code_usage

  Registro de uso de códigos promocionales
  - `id` (uuid, PK)
  - `code_id` (uuid, FK a promotional_codes)
  - `user_id` (uuid, FK a user_profiles)
  - `used_at` (timestamptz)

  ## 3. Seguridad RLS

  - promotional_codes: Solo admin puede crear/editar
  - promotional_code_usage: Service role inserta, usuarios ven sus propios usos

  ## 4. Validaciones

  - Código debe ser único
  - Usuario solo puede usar un código una vez
  - Verificar max_uses antes de aplicar
*/

-- ============================================================================
-- TABLA: promotional_codes
-- ============================================================================

CREATE TABLE IF NOT EXISTS promotional_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (length(code) >= 4 AND code ~ '^[A-Z0-9_-]+$'),
  description text NOT NULL,
  tier integer DEFAULT 1 NOT NULL CHECK (tier >= 1 AND tier <= 5),
  duration_days integer DEFAULT 30 NOT NULL CHECK (duration_days > 0),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  current_uses integer DEFAULT 0 NOT NULL CHECK (current_uses >= 0),
  is_active boolean DEFAULT true NOT NULL,
  expires_at timestamptz,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Añadir columna expires_at si no existe (para compatibilidad con migraciones anteriores)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotional_codes' AND column_name = 'expires_at') THEN
    ALTER TABLE promotional_codes ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_promotional_codes_code ON promotional_codes(code);
CREATE INDEX IF NOT EXISTS idx_promotional_codes_is_active ON promotional_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotional_codes_expires_at ON promotional_codes(expires_at);

-- Enable RLS
ALTER TABLE promotional_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON promotional_codes;
DROP POLICY IF EXISTS "Admin can manage promo codes" ON promotional_codes;
DROP POLICY IF EXISTS "Service role has full access to promotional_codes" ON promotional_codes;

-- ============================================================================
-- POLÍTICAS RLS: promotional_codes
-- ============================================================================

CREATE POLICY "Anyone can view active promo codes"
  ON promotional_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admin can manage promo codes"
  ON promotional_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND email = 'dcprats@gmail.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND email = 'dcprats@gmail.com'
    )
  );

CREATE POLICY "Service role has full access to promotional_codes"
  ON promotional_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TABLA: promotional_code_usage
-- ============================================================================

CREATE TABLE IF NOT EXISTS promotional_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES promotional_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  used_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(code_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_promotional_code_usage_code_id ON promotional_code_usage(code_id);
CREATE INDEX IF NOT EXISTS idx_promotional_code_usage_user_id ON promotional_code_usage(user_id);

-- Enable RLS
ALTER TABLE promotional_code_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own promo usage" ON promotional_code_usage;
DROP POLICY IF EXISTS "Service role has full access to promotional_code_usage" ON promotional_code_usage;

-- ============================================================================
-- POLÍTICAS RLS: promotional_code_usage
-- ============================================================================

CREATE POLICY "Users can view own promo usage"
  ON promotional_code_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to promotional_code_usage"
  ON promotional_code_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNCIÓN: Validar y aplicar código promocional
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_promotional_code(
  p_user_id uuid,
  p_code text
)
RETURNS jsonb AS $$
DECLARE
  v_promo_code promotional_codes%ROWTYPE;
  v_already_used boolean;
  v_new_end_date timestamptz;
BEGIN
  -- 1. Buscar código
  SELECT * INTO v_promo_code
  FROM promotional_codes
  WHERE code = UPPER(p_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido o expirado');
  END IF;

  -- 2. Verificar si usuario ya lo usó
  SELECT EXISTS(
    SELECT 1 FROM promotional_code_usage
    WHERE code_id = v_promo_code.id
      AND user_id = p_user_id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya has usado este código');
  END IF;

  -- 3. Verificar límite de usos
  IF v_promo_code.max_uses IS NOT NULL AND v_promo_code.current_uses >= v_promo_code.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código agotado');
  END IF;

  -- 4. Calcular nueva fecha de fin
  v_new_end_date := now() + (v_promo_code.duration_days || ' days')::interval;

  -- 5. Actualizar user_profile
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

  -- 6. Registrar uso
  INSERT INTO promotional_code_usage (code_id, user_id)
  VALUES (v_promo_code.id, p_user_id);

  -- 7. Incrementar contador
  UPDATE promotional_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo_code.id;

  RETURN jsonb_build_object(
    'success', true,
    'tier', v_promo_code.tier,
    'expires_at', v_new_end_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
