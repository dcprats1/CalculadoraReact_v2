/*
  # Configurar usuario de prueba damaso.prats@logicalogistica.com

  ## Descripción
  Este usuario ya existe en el sistema pero necesita ser configurado como usuario
  de prueba tipo 1 para poder realizar testing de funcionalidades regulares de usuario
  sin privilegios administrativos.

  ## Cambios realizados
  1. Actualizar perfil de damaso.prats@logicalogistica.com:
     - subscription_tier: 1 (Plan Básico)
     - max_devices: 1 (Un único dispositivo)
     - subscription_status: active
     - payment_method: manual
     - subscription_end_date: 2099-12-31 (permanente para pruebas continuas)

  ## Propósito del usuario
  - Usuario de prueba para desarrollo y QA
  - Se comporta como usuario regular tipo 1 (sin privilegios admin)
  - Permite probar flujos de suscripción, cambios de plan vía Stripe (modo prueba)
  - Suscripción activa permanente para testing continuo sin necesidad de renovación
  - NO tiene privilegios de administrador (solo dcprats@gmail.com es admin)

  ## Notas importantes
  - Este usuario es una EXCEPCIÓN al dominio @gls-spain.es
  - La validación de email permite: @gls-spain.es, dcprats@gmail.com, y damaso.prats@logicalogistica.com
  - La fecha de expiración lejana (2099) garantiza que no expire durante pruebas
  - Se mantiene payment_method: 'manual' para diferenciar de suscripciones Stripe reales
*/

-- ============================================================================
-- ACTUALIZAR USUARIO DE PRUEBA
-- ============================================================================

-- Actualizar perfil del usuario de prueba a configuración Tier 1
UPDATE user_profiles
SET
  subscription_tier = 1,
  max_devices = 1,
  subscription_status = 'active',
  payment_method = 'manual',
  subscription_end_date = '2099-12-31 23:59:59+00',
  updated_at = now()
WHERE email = 'damaso.prats@logicalogistica.com';

-- Verificar que el usuario existe y fue actualizado correctamente
DO $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM user_profiles
  WHERE email = 'damaso.prats@logicalogistica.com'
    AND subscription_tier = 1
    AND max_devices = 1;

  IF user_count = 0 THEN
    RAISE EXCEPTION 'Error: Usuario damaso.prats@logicalogistica.com no fue actualizado correctamente';
  END IF;

  RAISE NOTICE 'Usuario de prueba damaso.prats@logicalogistica.com configurado correctamente como Tier 1';
END $$;
