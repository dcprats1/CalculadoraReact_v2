/*
  # Añadir Campos de Agencia Faltantes a user_preferences

  ## Descripción
  Añade los campos de agencia que faltan en la tabla user_preferences
  para que el frontend pueda guardar y recuperar estos datos correctamente.

  ## Cambios

  1. Añadir campos de agencia faltantes:
     - `agency_name` (text, nullable)
     - `agency_address` (text, nullable)
     - `agency_postal_code` (text, nullable)
     - `agency_city` (text, nullable)
     - `agency_province` (text, nullable)
     - `agency_email` (text, nullable con validación)
     - `agency_name_number` (text, nullable)
     - `agency_postal_town` (text, nullable)

  2. Añadir alias para compatibilidad:
     - `fixed_spc` (alias de fixed_spc_value)
     - `fixed_linear_discount` (alias de fixed_discount_percentage)

  ## Seguridad
  - NO se eliminan columnas existentes (DATA SAFETY)
  - Todos los campos nuevos son nullable (no rompe datos existentes)
  - Se usa IF NOT EXISTS para idempotencia

  ## Punto de Retorno
  Si algo sale mal, ejecutar:
  ```sql
  ALTER TABLE user_preferences
    DROP COLUMN IF EXISTS agency_name,
    DROP COLUMN IF EXISTS agency_address,
    DROP COLUMN IF EXISTS agency_postal_code,
    DROP COLUMN IF EXISTS agency_city,
    DROP COLUMN IF EXISTS agency_province,
    DROP COLUMN IF EXISTS agency_email,
    DROP COLUMN IF EXISTS agency_name_number,
    DROP COLUMN IF EXISTS agency_postal_town,
    DROP COLUMN IF EXISTS fixed_spc,
    DROP COLUMN IF EXISTS fixed_linear_discount;
  ```
*/

-- ============================================================================
-- AÑADIR CAMPOS DE AGENCIA
-- ============================================================================

DO $$
BEGIN
  -- Campo: agency_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'agency_name'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN agency_name text;
    RAISE NOTICE 'Añadido campo: agency_name';
  END IF;

  -- Campo: agency_address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'agency_address'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN agency_address text;
    RAISE NOTICE 'Añadido campo: agency_address';
  END IF;

  -- Campo: agency_postal_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'agency_postal_code'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN agency_postal_code text;
    RAISE NOTICE 'Añadido campo: agency_postal_code';
  END IF;

  -- Campo: agency_city
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'agency_city'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN agency_city text;
    RAISE NOTICE 'Añadido campo: agency_city';
  END IF;

  -- Campo: agency_province
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'agency_province'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN agency_province text;
    RAISE NOTICE 'Añadido campo: agency_province';
  END IF;

  -- Campo: agency_email (con validación)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'agency_email'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN agency_email text
      CHECK (agency_email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' OR agency_email IS NULL);
    RAISE NOTICE 'Añadido campo: agency_email';
  END IF;

  -- Campo: agency_name_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'agency_name_number'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN agency_name_number text;
    RAISE NOTICE 'Añadido campo: agency_name_number';
  END IF;

  -- Campo: agency_postal_town
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'agency_postal_town'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN agency_postal_town text;
    RAISE NOTICE 'Añadido campo: agency_postal_town';
  END IF;

  -- Campo: fixed_spc (alias de fixed_spc_value para compatibilidad)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'fixed_spc'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN fixed_spc numeric(10,2)
      CHECK (fixed_spc >= 0);
    RAISE NOTICE 'Añadido campo: fixed_spc';
  END IF;

  -- Campo: fixed_linear_discount (alias de fixed_discount_percentage)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'fixed_linear_discount'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN fixed_linear_discount numeric(5,2)
      CHECK (fixed_linear_discount >= 0 AND fixed_linear_discount <= 100);
    RAISE NOTICE 'Añadido campo: fixed_linear_discount';
  END IF;

END $$;

-- ============================================================================
-- CREAR ÍNDICE PARA BÚSQUEDAS POR AGENCIA
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_preferences_agency_name
  ON user_preferences(agency_name_number)
  WHERE agency_name_number IS NOT NULL;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  campo_count integer;
BEGIN
  SELECT COUNT(*) INTO campo_count
  FROM information_schema.columns
  WHERE table_name = 'user_preferences'
    AND column_name IN (
      'agency_name', 'agency_address', 'agency_postal_code', 'agency_city',
      'agency_province', 'agency_email', 'agency_name_number', 'agency_postal_town',
      'fixed_spc', 'fixed_linear_discount'
    );

  IF campo_count = 10 THEN
    RAISE NOTICE '✅ Migración completada: 10/10 campos añadidos correctamente';
  ELSE
    RAISE WARNING '⚠️ Atención: Solo se añadieron % de 10 campos', campo_count;
  END IF;
END $$;
