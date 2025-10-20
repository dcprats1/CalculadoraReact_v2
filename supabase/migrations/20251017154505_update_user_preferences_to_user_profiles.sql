/*
  # Actualizar user_preferences para referenciar user_profiles

  ## Descripción
  Modifica la tabla user_preferences existente para que referencie correctamente
  a user_profiles en lugar de una tabla users inexistente.

  ## Cambios

  1. Eliminar FK antigua (si existe)
  2. Crear FK a user_profiles
  3. Actualizar políticas RLS
  4. Añadir campos para datos de agencia SOP
*/

-- ============================================================================
-- ACTUALIZAR TABLA: user_preferences
-- ============================================================================

-- Si existe constraint antigua, eliminarla
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_preferences_user_id_fkey'
      AND table_name = 'user_preferences'
  ) THEN
    ALTER TABLE user_preferences DROP CONSTRAINT user_preferences_user_id_fkey;
  END IF;
END $$;

-- Añadir FK a user_profiles si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_preferences_user_id_fkey_to_profiles'
      AND table_name = 'user_preferences'
  ) THEN
    ALTER TABLE user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey_to_profiles
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Añadir columnas faltantes si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'uses_custom_cost_table') THEN
    ALTER TABLE user_preferences ADD COLUMN uses_custom_cost_table boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'ui_theme') THEN
    ALTER TABLE user_preferences ADD COLUMN ui_theme text DEFAULT 'light' NOT NULL CHECK (ui_theme IN ('light', 'dark'));
  END IF;
END $$;

-- ============================================================================
-- ACTUALIZAR TABLA: custom_cost_overrides
-- ============================================================================

-- Eliminar tabla custom_cost_overrides antigua si existe (usaba client_id)
-- y recrearla con user_id

DO $$
BEGIN
  -- Si existe la tabla con client_id, eliminarla
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_cost_overrides'
      AND column_name = 'client_id'
  ) THEN
    DROP TABLE IF EXISTS custom_cost_overrides CASCADE;
  END IF;
END $$;

-- Recrear tabla custom_cost_overrides con user_id
CREATE TABLE IF NOT EXISTS custom_cost_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  weight_from numeric(10,2) NOT NULL,
  weight_to numeric(10,2),
  cost_factor_name text NOT NULL,
  override_value numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_custom_costs_user_id ON custom_cost_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_costs_service ON custom_cost_overrides(service_name);
CREATE INDEX IF NOT EXISTS idx_custom_costs_active ON custom_cost_overrides(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE custom_cost_overrides ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own cost overrides" ON custom_cost_overrides;
DROP POLICY IF EXISTS "Users can manage own cost overrides" ON custom_cost_overrides;
DROP POLICY IF EXISTS "Service role has full access to custom_cost_overrides" ON custom_cost_overrides;

-- Políticas RLS
CREATE POLICY "Users can view own cost overrides"
  ON custom_cost_overrides
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cost overrides"
  ON custom_cost_overrides
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to custom_cost_overrides"
  ON custom_cost_overrides
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_custom_cost_overrides_updated_at ON custom_cost_overrides;
CREATE TRIGGER update_custom_cost_overrides_updated_at
  BEFORE UPDATE ON custom_cost_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
