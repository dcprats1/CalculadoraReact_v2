/*
  # Añadir campos de perfil de agencia para autocompletado de SOP

  ## Descripción
  Añade campos adicionales a user_preferences para almacenar datos de agencia
  que se utilizarán para autocompletar formularios de SOP.

  ## 1. Cambios en user_preferences

  Añade nuevos campos:
  - `agency_name_number` (text, nullable) - Nombre y número de agencia como dato único
  - `agency_postal_town` (text, nullable) - CP y población unificado (ej: "28540 Valdemoro (Madrid)")

  Los campos existentes se mantienen:
  - `agency_name` - Se mantiene para compatibilidad
  - `agency_address` - Dirección (calle y número)
  - `agency_postal_code` - Se mantiene para compatibilidad
  - `agency_city` - Se mantiene para compatibilidad
  - `agency_province` - Provincia
  - `agency_email` - Email de contacto de la agencia

  ## 2. Notas Importantes

  - NO se eliminan campos existentes (DATA SAFETY)
  - Los nuevos campos son opcionales (nullable)
  - Compatibilidad con código existente mantenida
  - Usuario puede actualizar desde ProfileTab
  - Datos se autocargan en SOPGenerator
*/

-- Añadir nuevos campos a user_preferences si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'agency_name_number'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN agency_name_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'agency_postal_town'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN agency_postal_town text;
  END IF;
END $$;

-- Crear índice para búsquedas rápidas por agencia (útil para admin)
CREATE INDEX IF NOT EXISTS idx_user_preferences_agency_name ON user_preferences(agency_name_number)
  WHERE agency_name_number IS NOT NULL;
