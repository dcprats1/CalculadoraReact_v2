/*
  # Sistema de Perfiles de Usuario Individual

  ## Descripción
  Modelo simplificado donde cada usuario @gls-spain.es tiene su propia suscripción
  y puede tener múltiples sesiones activas según su tier.

  ## 1. Nueva Tabla: user_profiles

  Usuarios individuales con suscripción propia
  - `id` (uuid, PK, referencia a auth.users)
  - `email` (text, único, @gls-spain.es o dcprats@gmail.com)
  - `subscription_status` (text: 'trial', 'active', 'past_due', 'cancelled')
  - `subscription_tier` (integer: 1-5, determina max_devices)
  - `max_devices` (integer: 1, 3, 5, 8, 12)
  - `subscription_start_date` (timestamptz)
  - `subscription_end_date` (timestamptz)
  - `stripe_customer_id` (text, único)
  - `stripe_subscription_id` (text, único)
  - `payment_method` (text: 'stripe', 'manual', 'promo')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Seguridad RLS

  - Usuarios autenticados pueden ver/actualizar solo sus propios datos
  - Service role tiene acceso completo (para Edge Functions)

  ## 3. Índices

  - Búsqueda por email
  - Búsqueda por Stripe customer_id
  - Búsqueda por estado de suscripción

  ## 4. Notas Importantes

  - NO eliminamos datos con DROP
  - Validación de email se hace en Edge Functions
  - Tier determina automáticamente max_devices
*/

-- ============================================================================
-- TABLA: user_profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE CHECK (email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
  subscription_status text DEFAULT 'trial' NOT NULL CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled')),
  subscription_tier integer DEFAULT 1 NOT NULL CHECK (subscription_tier >= 1 AND subscription_tier <= 5),
  max_devices integer DEFAULT 1 NOT NULL CHECK (max_devices > 0),
  subscription_start_date timestamptz DEFAULT now() NOT NULL,
  subscription_end_date timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  payment_method text DEFAULT 'trial' NOT NULL CHECK (payment_method IN ('stripe', 'manual', 'promo', 'trial')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_end ON user_profiles(subscription_end_date);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role has full access to user_profiles" ON user_profiles;

-- ============================================================================
-- POLÍTICAS RLS: user_profiles
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role has full access to user_profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCIÓN: Actualizar max_devices según tier
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_max_devices_from_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Mapeo tier → max_devices
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_user_profiles_max_devices ON user_profiles;
CREATE TRIGGER sync_user_profiles_max_devices
  BEFORE INSERT OR UPDATE OF subscription_tier ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_max_devices_from_tier();
