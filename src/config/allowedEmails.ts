/**
 * Configuración centralizada de emails permitidos en el sistema
 *
 * Este archivo centraliza la lógica de validación de emails para mantener
 * consistencia entre el frontend y las Edge Functions.
 */

export const ALLOWED_DOMAIN = '@gls-spain.es';

/**
 * ADMIN_EMAIL: dcprats@gmail.com
 * - Usuario administrador principal del sistema
 * - Tiene acceso completo a funcionalidades administrativas
 * - Puede ver estadísticas de todos los usuarios
 * - No tiene límites de dispositivos ni fecha de expiración
 */
export const ADMIN_EMAIL = 'dcprats@gmail.com';

/**
 * TEST_USER_EMAIL: damaso.prats@logicalogistica.com
 * - Usuario de prueba para desarrollo y QA
 * - Se comporta como usuario regular tipo 1 (sin privilegios admin)
 * - Permite probar flujos de suscripción, cambios de plan, etc.
 * - Tiene suscripción activa permanente para testing continuo
 * - Plan: Tier 1, 1 dispositivo, payment_method: manual
 */
export const TEST_USER_EMAIL = 'damaso.prats@logicalogistica.com';

/**
 * Array de emails excepcionales permitidos además del dominio @gls-spain.es
 */
export const ALLOWED_EXCEPTIONS = [ADMIN_EMAIL, TEST_USER_EMAIL];

/**
 * Valida si un email está permitido en el sistema
 *
 * @param email - Email a validar (será normalizado internamente)
 * @returns true si el email pertenece al dominio permitido o está en las excepciones
 */
export function isAllowedEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();

  // Verificar si está en la lista de excepciones
  if (ALLOWED_EXCEPTIONS.includes(normalizedEmail)) {
    return true;
  }

  // Verificar si termina con el dominio permitido
  if (normalizedEmail.endsWith(ALLOWED_DOMAIN)) {
    return true;
  }

  return false;
}

/**
 * Mensaje de error estándar para emails no permitidos
 */
export const INVALID_EMAIL_ERROR = 'Solo usuarios @gls-spain.es pueden iniciar sesión';
