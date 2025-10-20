/*
  # Sistema de Logs de Autenticación

  ## Descripción
  Registro detallado de todos los eventos de autenticación:
  - Códigos enviados
  - Intentos de login exitosos/fallidos
  - Límite de dispositivos alcanzado
  - Sesiones cerradas

  ## 1. Nueva Tabla: auth_logs

  - `id` (uuid, PK)
  - `user_id` (uuid, FK a user_profiles, nullable)
  - `email` (text)
  - `event_type` (text: 'code_sent', 'login_success', 'login_failed', 'device_limit_exceeded', 'access_denied', 'logout')
  - `ip_address` (text)
  - `user_agent` (text)
  - `success` (boolean)
  - `error_message` (text, nullable)
  - `metadata` (jsonb, datos adicionales)
  - `created_at` (timestamptz)

  ## 2. Seguridad RLS

  - Tabla PRIVADA: solo accesible por service_role
  - Admin (dcprats@gmail.com) puede ver todos los logs
  - Usuarios normales pueden ver sus propios logs

  ## 3. Índices

  - Búsqueda por user_id
  - Búsqueda por email
  - Búsqueda por event_type
  - Búsqueda por created_at (orden descendente)

  ## 4. Retención

  - Logs se mantienen por 90 días (limpieza manual o pg_cron)
*/

-- ============================================================================
-- TABLA: auth_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  email text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'code_sent',
    'login_success',
    'login_failed',
    'device_limit_exceeded',
    'access_denied',
    'logout',
    'session_expired',
    'session_revoked'
  )),
  ip_address text,
  user_agent text,
  success boolean DEFAULT true NOT NULL,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_email ON auth_logs(email);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_success ON auth_logs(success);

-- Enable RLS
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own auth logs" ON auth_logs;
DROP POLICY IF EXISTS "Admin can view all auth logs" ON auth_logs;
DROP POLICY IF EXISTS "Service role has full access to auth_logs" ON auth_logs;

-- ============================================================================
-- POLÍTICAS RLS: auth_logs
-- ============================================================================

CREATE POLICY "Users can view own auth logs"
  ON auth_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all auth logs"
  ON auth_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND email = 'dcprats@gmail.com'
    )
  );

CREATE POLICY "Service role has full access to auth_logs"
  ON auth_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNCIÓN: Limpieza de logs antiguos
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_auth_logs()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Eliminar logs de más de 90 días
  DELETE FROM auth_logs
  WHERE created_at < now() - interval '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
