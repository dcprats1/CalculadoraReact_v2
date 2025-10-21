/*
  # Crear Tablas de Actividad de Usuario (Si No Existen)

  ## Descripción
  Crea las tablas y funciones RPC necesarias para el sistema de estadísticas
  de actividad de usuario que usa el hook useUserStats.

  ## 1. Tablas Nuevas

  ### user_activity_stats
  Estadísticas consolidadas por usuario:
  - `user_id` (uuid, PK, FK a user_profiles)
  - `sop_downloads_count` (integer) - Total de SOP completos descargados
  - `minisop_downloads_count` (integer) - Total de Mini-SOP descargados
  - `package_calculations_count` (integer) - Total de cálculos realizados
  - `first_activity_date` (timestamptz) - Primera actividad registrada
  - `last_activity_date` (timestamptz) - Última actividad registrada
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### user_daily_activity
  Registro de actividad diaria granular:
  - `id` (uuid, PK)
  - `user_id` (uuid, FK a user_profiles)
  - `activity_date` (date) - Fecha de la actividad
  - `login_count` (integer) - Número de inicios de sesión ese día
  - `calculation_count` (integer) - Número de cálculos ese día
  - `sop_count` (integer) - Número de SOP descargados ese día
  - `minisop_count` (integer) - Número de Mini-SOP descargados ese día
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Función RPC

  ### get_user_activity_summary(p_user_id uuid)
  Retorna estadísticas agregadas de actividad de un usuario específico.

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Usuarios solo pueden ver sus propias estadísticas
  - Service role tiene acceso completo
  - Admin (dcprats@gmail.com) puede ver todo

  ## Punto de Retorno
  Si algo sale mal, ejecutar:
  ```sql
  DROP FUNCTION IF EXISTS get_user_activity_summary(uuid);
  DROP TABLE IF EXISTS user_daily_activity;
  DROP TABLE IF EXISTS user_activity_stats;
  ```
*/

-- ============================================================================
-- TABLA: user_activity_stats
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity_stats (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  sop_downloads_count integer DEFAULT 0 NOT NULL CHECK (sop_downloads_count >= 0),
  minisop_downloads_count integer DEFAULT 0 NOT NULL CHECK (minisop_downloads_count >= 0),
  package_calculations_count integer DEFAULT 0 NOT NULL CHECK (package_calculations_count >= 0),
  first_activity_date timestamptz DEFAULT now() NOT NULL,
  last_activity_date timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_activity_stats_last_activity
  ON user_activity_stats(last_activity_date DESC);

-- Enable RLS
ALTER TABLE user_activity_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own activity stats" ON user_activity_stats;
DROP POLICY IF EXISTS "Service role has full access to activity stats" ON user_activity_stats;
DROP POLICY IF EXISTS "Admin can view all activity stats" ON user_activity_stats;

-- Políticas RLS
CREATE POLICY "Users can view own activity stats"
  ON user_activity_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to activity stats"
  ON user_activity_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política para admin (dcprats@gmail.com)
CREATE POLICY "Admin can view all activity stats"
  ON user_activity_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.email = 'dcprats@gmail.com'
    )
  );

-- ============================================================================
-- TABLA: user_daily_activity
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  login_count integer DEFAULT 0 NOT NULL CHECK (login_count >= 0),
  calculation_count integer DEFAULT 0 NOT NULL CHECK (calculation_count >= 0),
  sop_count integer DEFAULT 0 NOT NULL CHECK (sop_count >= 0),
  minisop_count integer DEFAULT 0 NOT NULL CHECK (minisop_count >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_activity_date UNIQUE (user_id, activity_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_id ON user_daily_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON user_daily_activity(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON user_daily_activity(user_id, activity_date DESC);

-- Enable RLS
ALTER TABLE user_daily_activity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own daily activity" ON user_daily_activity;
DROP POLICY IF EXISTS "Service role has full access to daily activity" ON user_daily_activity;
DROP POLICY IF EXISTS "Admin can view all daily activity" ON user_daily_activity;

-- Políticas RLS
CREATE POLICY "Users can view own daily activity"
  ON user_daily_activity
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to daily activity"
  ON user_daily_activity
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política para admin
CREATE POLICY "Admin can view all daily activity"
  ON user_daily_activity
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.email = 'dcprats@gmail.com'
    )
  );

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

-- Verificar que existe la función update_updated_at_column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_activity_stats_updated_at ON user_activity_stats;
CREATE TRIGGER update_activity_stats_updated_at
  BEFORE UPDATE ON user_activity_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_activity_updated_at ON user_daily_activity;
CREATE TRIGGER update_daily_activity_updated_at
  BEFORE UPDATE ON user_daily_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCIÓN: Calcular días activos y promedio diario
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_activity_summary(p_user_id uuid)
RETURNS TABLE (
  total_sop integer,
  total_minisop integer,
  total_calculations integer,
  days_active bigint,
  average_calculations_per_day numeric,
  first_activity timestamptz,
  last_activity timestamptz
)
SECURITY DEFINER
SET search_path = public
AS $$
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
$$ LANGUAGE plpgsql;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_user_activity_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary(uuid) TO service_role;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  tablas_count integer;
  funcion_exists boolean;
BEGIN
  -- Verificar tablas
  SELECT COUNT(*) INTO tablas_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('user_activity_stats', 'user_daily_activity');

  -- Verificar función
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_user_activity_summary'
  ) INTO funcion_exists;

  IF tablas_count = 2 AND funcion_exists THEN
    RAISE NOTICE '✅ Migración completada: Tablas de actividad y función RPC creadas correctamente';
  ELSE
    RAISE WARNING '⚠️ Atención: Tablas creadas: %/2, Función existe: %', tablas_count, funcion_exists;
  END IF;
END $$;
