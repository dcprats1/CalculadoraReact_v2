/*
  # Agregar Campo subscription_interval a user_profiles

  ## Descripción
  Este campo permite almacenar el intervalo de facturación de la suscripción
  (mensual, anual o trial) para mostrar correctamente el tipo de plan contratado
  y calcular las fechas de renovación correctamente.

  ## Problema Resuelto
  Actualmente, cuando un usuario contrata un plan anual, el sistema solo almacena
  la fecha de expiración pero no el tipo de intervalo. Esto causa que la interfaz
  no pueda distinguir entre planes mensuales y anuales, mostrando información incorrecta.

  ## Cambios
  1. Agregar columna `subscription_interval` a la tabla `user_profiles`
     - Tipo: text
     - Valores permitidos: 'monthly', 'annual', 'trial'
     - Valor por defecto: 'monthly'
     - NOT NULL para garantizar integridad

  2. Actualizar registros existentes basándose en la fecha de expiración:
     - Si la suscripción expira en más de 60 días desde subscription_start_date: 'annual'
     - Si subscription_status = 'trial': 'trial'
     - Resto: 'monthly'

  ## Seguridad
  - No se modifican políticas RLS existentes
  - No se elimina ningún dato
  - Cambio compatible con código existente (valor por defecto garantiza compatibilidad)
*/

-- ============================================================================
-- PASO 1: Agregar columna subscription_interval
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'subscription_interval'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN subscription_interval text DEFAULT 'monthly' NOT NULL 
    CHECK (subscription_interval IN ('monthly', 'annual', 'trial'));
    
    RAISE NOTICE 'Columna subscription_interval agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna subscription_interval ya existe, omitiendo creación';
  END IF;
END $$;

-- ============================================================================
-- PASO 2: Actualizar registros existentes con lógica inteligente
-- ============================================================================

-- Actualizar a 'trial' para usuarios con subscription_status = 'trial'
UPDATE user_profiles
SET subscription_interval = 'trial'
WHERE subscription_status = 'trial'
  AND subscription_interval = 'monthly';

-- Actualizar a 'annual' para suscripciones con más de 60 días de duración
-- Esto captura suscripciones anuales (365 días) pero no mensuales (30 días)
UPDATE user_profiles
SET subscription_interval = 'annual'
WHERE payment_method = 'stripe'
  AND subscription_end_date > subscription_start_date + interval '60 days'
  AND subscription_interval = 'monthly';

-- Registrar en comentario para auditoría
COMMENT ON COLUMN user_profiles.subscription_interval IS 
'Intervalo de facturación: monthly (30 días), annual (365 días), trial (periodo de prueba). Agregado el 2025-10-23 para corregir visualización de planes anuales vs mensuales.';

-- ============================================================================
-- PASO 3: Crear índice para consultas eficientes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_interval 
ON user_profiles(subscription_interval);

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  monthly_count integer;
  annual_count integer;
  trial_count integer;
  total_count integer;
BEGIN
  SELECT COUNT(*) INTO monthly_count FROM user_profiles WHERE subscription_interval = 'monthly';
  SELECT COUNT(*) INTO annual_count FROM user_profiles WHERE subscription_interval = 'annual';
  SELECT COUNT(*) INTO trial_count FROM user_profiles WHERE subscription_interval = 'trial';
  SELECT COUNT(*) INTO total_count FROM user_profiles;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE MIGRACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total usuarios: %', total_count;
  RAISE NOTICE 'Suscripciones mensuales: %', monthly_count;
  RAISE NOTICE 'Suscripciones anuales: %', annual_count;
  RAISE NOTICE 'Periodos de prueba: %', trial_count;
  RAISE NOTICE '========================================';
END $$;
