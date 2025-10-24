/*
  # Agregar session_token a user_sessions

  ## Descripción
  Agrega la columna session_token a la tabla user_sessions para persistir
  los tokens de sesión generados durante la autenticación OTP.

  ## 1. Cambios en la Tabla
  
  - `session_token` (text, nullable)
    - Almacena el token JWT codificado en base64
    - NULL para sesiones existentes (compatibilidad hacia atrás)
    - Se genera y guarda durante el login exitoso
    - Se usa para auto-login en sesiones activas

  ## 2. Índice
  
  - Índice en session_token para búsquedas rápidas (opcional)
  - Ayuda a validar tokens de forma eficiente

  ## 3. Compatibilidad

  - Sesiones existentes NO se rompen (NULL permitido)
  - Nuevas sesiones tendrán el token persistido
  - check-active-session manejará NULL regenerando token si es necesario

  ## 4. Seguridad

  - RLS existente se mantiene intacto
  - Sin cambios en las políticas de acceso
  - Token solo accesible por el usuario propietario o service role

  ## 5. Rollback

  Si es necesario revertir:
  ```sql
  ALTER TABLE user_sessions DROP COLUMN IF EXISTS session_token;
  ```

  ## Notas Importantes

  - NO afecta la lógica de autenticación OTP
  - NO modifica límites de dispositivos
  - NO cambia expiración de sesiones (24h)
  - Preserva todas las validaciones de seguridad existentes
*/

-- Agregar columna session_token (nullable para compatibilidad)
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS session_token text;

-- Crear índice para búsquedas eficientes (opcional pero recomendado)
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token 
  ON user_sessions(session_token) 
  WHERE session_token IS NOT NULL;

-- Comentario en la columna para documentación
COMMENT ON COLUMN user_sessions.session_token IS 
  'Token JWT codificado en base64. Generado durante login OTP. NULL para sesiones antiguas.';
