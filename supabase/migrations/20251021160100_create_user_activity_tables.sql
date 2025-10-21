/*
  # Sistema de Estadísticas de Uso de Usuario

  ## Descripción
  Crea tablas para registrar y monitorear la actividad de usuarios en la aplicación,
  permitiendo calcular métricas de uso, ROI y análisis de adopción.

  ## 1. Nueva Tabla: user_activity_stats

  Estadísticas consolidadas por usuario:
  - `user_id` (uuid, PK, FK a user_profiles)
  - `sop_downloads_count` (integer) - Total de SOP completos descargados
  - `minisop_downloads_count` (integer) - Total de Mini-SOP descargados
  - `package_calculations_count` (integer) - Total de cálculos realizados (Gestión de Bultos)
  - `first_activity_date` (timestamptz) - Primera actividad registrada
  - `last_activity_date` (timestamptz) - Última actividad registrada
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Nueva Tabla: user_daily_activity

  Registro de actividad diaria granular:
  - `id` (uuid, PK)
  - `user_id` (uuid, FK a user_profiles)
  - `activity_date` (date) - Fecha de la actividad (único por usuario)
  - `login_count` (integer) - Número de inicios de sesión ese día
  - `calculation_count` (integer) - Número de cálculos ese día
  - `sop_count` (integer) - Número de SOP descargados ese día
  - `minisop_count` (integer) - Número de Mini-SOP descargados ese día
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 3. Seguridad RLS

  - Usuarios autenticados pueden ver solo sus propias estadísticas
  - Service role tiene acceso completo (para Edge Functions)
  - Admin (dcprats@gmail.com) puede ver estadísticas de todos

  ## 4. Índices

  - Búsqueda rápida por usuario
  - Búsqueda por fecha para agregaciones
  - Constraint único (user_id, activity_date) en daily_activity

  ## 5. Notas Importantes

  - NO se eliminan datos (DATA SAFETY)
  - Contadores se incrementan atómicamente
  - Tracking con debounce de 1 minuto para cálculos
  - Promedio diario = total_calculations / días con actividad
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
CREATE INDEX IF NOT EXISTS idx_activity_stats_last_activity ON user_activity_stats(last_activity_date DESC);

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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
