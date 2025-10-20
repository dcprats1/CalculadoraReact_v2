/*
  # Sistema de Códigos de Verificación (Login sin contraseña)

  ## Descripción
  Códigos de 6 dígitos enviados por email para autenticación.
  Expiran en 5 minutos y tienen máximo 3 intentos.

  ## 1. Nueva Tabla: verification_codes

  - `id` (uuid, PK)
  - `email` (text, email del usuario)
  - `code` (text, código de 6 dígitos)
  - `expires_at` (timestamptz, created_at + 5 minutos)
  - `used` (boolean, si ya fue usado)
  - `attempts` (integer, contador de intentos fallidos)
  - `created_at` (timestamptz)

  ## 2. Seguridad RLS

  - Tabla PRIVADA: solo accesible por service_role (Edge Functions)
  - Los usuarios NO pueden consultar directamente sus códigos

  ## 3. Índices

  - Búsqueda por email + code
  - Búsqueda por expires_at (para limpieza)

  ## 4. Limpieza Automática

  - Elimina códigos expirados después de 24 horas
*/

-- ============================================================================
-- TABLA: verification_codes
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
  code text NOT NULL CHECK (length(code) = 6 AND code ~ '^[0-9]+$'),
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false NOT NULL,
  attempts integer DEFAULT 0 NOT NULL CHECK (attempts >= 0),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_code ON verification_codes(email, code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_used ON verification_codes(used) WHERE used = false;

-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to verification_codes" ON verification_codes;

-- ============================================================================
-- POLÍTICAS RLS: verification_codes
-- ============================================================================

-- Solo service_role puede acceder (Edge Functions)
CREATE POLICY "Service role has full access to verification_codes"
  ON verification_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNCIÓN: Limpieza de códigos expirados
-- ============================================================================

DROP FUNCTION IF EXISTS cleanup_expired_verification_codes();

CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Eliminar códigos expirados hace más de 24 horas
  DELETE FROM verification_codes
  WHERE expires_at < now() - interval '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
