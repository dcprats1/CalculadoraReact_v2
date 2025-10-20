/*
  # Renombrar Tablas Deprecadas a Nombres Correctos
  
  ## Descripción
  Las tablas fueron creadas con el prefijo "_deprecated_" por error.
  Esta migración renombra las tablas a sus nombres correctos para que
  las Edge Functions puedan acceder a ellas correctamente.
  
  ## Cambios
  
  1. **verification_codes**
     - Renombra: _deprecated_verification_codes → verification_codes
     - Mantiene todos los datos, índices y políticas RLS
  
  2. **auth_logs**
     - Renombra: _deprecated_auth_logs → auth_logs
     - Mantiene todos los datos, índices y políticas RLS
  
  3. **user_sessions**
     - Renombra: _deprecated_user_sessions → user_sessions
     - Mantiene todos los datos, índices y políticas RLS
  
  ## Seguridad
  
  - Todas las políticas RLS se mantienen intactas
  - Los datos históricos se preservan
  - Las relaciones de foreign keys se actualizan automáticamente
  
  ## Notas
  
  - Esta operación es segura y no causa pérdida de datos
  - El rename es una operación atómica en PostgreSQL
  - Los índices y constraints se renombran automáticamente
*/

-- ============================================================================
-- RENOMBRAR TABLAS
-- ============================================================================

-- 1. Renombrar verification_codes
ALTER TABLE IF EXISTS _deprecated_verification_codes 
  RENAME TO verification_codes;

-- 2. Renombrar auth_logs
ALTER TABLE IF EXISTS _deprecated_auth_logs 
  RENAME TO auth_logs;

-- 3. Renombrar user_sessions
ALTER TABLE IF EXISTS _deprecated_user_sessions 
  RENAME TO user_sessions;

-- ============================================================================
-- VERIFICAR POLÍTICAS RLS
-- ============================================================================

-- Las políticas RLS se renombran automáticamente con la tabla,
-- pero vamos a verificar que siguen activas

DO $$
BEGIN
  -- Verificar que RLS está habilitado en verification_codes
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'verification_codes'
  ) THEN
    ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado en verification_codes';
  END IF;

  -- Verificar que RLS está habilitado en auth_logs
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'auth_logs'
  ) THEN
    ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado en auth_logs';
  END IF;

  -- Verificar que RLS está habilitado en user_sessions
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_sessions'
  ) THEN
    ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado en user_sessions';
  END IF;
END $$;
