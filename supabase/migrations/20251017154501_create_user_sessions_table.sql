/*
  # Sistema de Sesiones de Usuario (Control de Dispositivos)

  ## Descripción
  Gestiona las sesiones activas de cada usuario, limitadas por max_devices.
  Cada sesión expira automáticamente a las 24 horas de la última autenticación.

  ## 1. Nueva Tabla: user_sessions

  - `id` (uuid, PK)
  - `user_id` (uuid, FK a user_profiles)
  - `device_fingerprint` (text, hash único del dispositivo)
  - `device_name` (text, nombre amigable del dispositivo)
  - `last_authenticated_at` (timestamptz, última vez que se autenticó)
  - `expires_at` (timestamptz, last_authenticated_at + 24h)
  - `is_active` (boolean, puede desactivarse manualmente)
  - `ip_address` (text)
  - `user_agent` (text)
  - `created_at` (timestamptz)

  ## 2. Seguridad RLS

  - Usuarios solo ven sus propias sesiones
  - Service role tiene acceso completo

  ## 3. Índices

  - Búsqueda por user_id + is_active
  - Búsqueda por device_fingerprint
  - Búsqueda por expires_at (para limpieza automática)

  ## 4. Limpieza Automática

  - Función que elimina sesiones expiradas (se ejecutará vía pg_cron o manual)
*/

-- ============================================================================
-- TABLA: user_sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_name text DEFAULT 'Unknown Device' NOT NULL,
  last_authenticated_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '24 hours') NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_fingerprint ON user_sessions(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Constraint único: Un device_fingerprint solo puede tener una sesión activa por usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_user_device_active
  ON user_sessions(user_id, device_fingerprint)
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Service role has full access to user_sessions" ON user_sessions;

-- ============================================================================
-- POLÍTICAS RLS: user_sessions
-- ============================================================================

CREATE POLICY "Users can view own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to user_sessions"
  ON user_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNCIÓN: Limpieza de sesiones expiradas
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Eliminar sesiones que expiraron hace más de 7 días
  DELETE FROM user_sessions
  WHERE expires_at < now() - interval '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCIÓN: Desactivar automáticamente sesiones expiradas
-- ============================================================================

CREATE OR REPLACE FUNCTION deactivate_expired_sessions()
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Desactivar sesiones que ya expiraron pero is_active=true
  UPDATE user_sessions
  SET is_active = false
  WHERE expires_at < now()
    AND is_active = true;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
