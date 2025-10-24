# Plan de Reparación: Session Token Error

**Fecha**: 2025-10-24 11:30:21
**Ticket**: Error 500 en autenticación OTP
**Afectados**: admin@logicalogistica.com, damaso.prats@logicalogistica.com, todos los usuarios

## Problema Identificado

### Estado Actual de la Base de Datos
Tabla `user_sessions` tiene estas columnas:
- id (uuid)
- user_id (uuid)
- device_fingerprint (text)
- device_name (text)
- last_authenticated_at (timestamptz)
- expires_at (timestamptz)
- is_active (boolean)
- ip_address (text)
- user_agent (text)
- created_at (timestamptz)

**FALTA**: `session_token` (text)

### Funciones con Problema

1. **check-active-session/index.ts** (línea 90):
   ```typescript
   .select('id, session_token, expires_at, last_authenticated_at')
   ```
   Intenta leer un campo que no existe → Error 500

2. **verify-login-code/index.ts** (líneas 239-244, 352-357):
   ```typescript
   const sessionToken = btoa(JSON.stringify({...}));
   ```
   Genera token pero NO lo guarda en la BD

## Solución Propuesta

### 1. Migración de Base de Datos
- Agregar columna `session_token TEXT NULL`
- Mantener NULL para sesiones existentes (no romper nada)
- Crear índice para búsquedas rápidas

### 2. Actualizar verify-login-code
- Guardar session_token al crear nueva sesión
- Guardar session_token al actualizar sesión existente
- Mantener toda la lógica de validación actual

### 3. Actualizar check-active-session
- Manejar NULL session_token (sesiones antiguas)
- Regenerar token si es NULL
- Mantener compatibilidad hacia atrás

## Puntos Críticos de Seguridad

### NO TOCAR:
1. Validación de códigos OTP
2. Límite de intentos (3 máximo)
3. Límite de dispositivos por tier
4. Validación de suscripción activa
5. Logging de eventos de autenticación
6. Excepciones de dominio @logicalogistica.com

### Preservar:
1. Sistema de device_fingerprint
2. Expiración de sesiones (24h)
3. Sincronización de expires_at entre dispositivos
4. RLS policies existentes

## Backups Creados
- `/tmp/cc-agent/58932075/project/BACKUPS/20251024_113021/verify-login-code_BACKUP.ts`
- `/tmp/cc-agent/58932075/project/BACKUPS/20251024_113021/check-active-session_BACKUP.ts`

## Rollback Plan
Si algo falla:
1. Restaurar funciones desde backups
2. Rollback de migración: `DROP COLUMN session_token`
3. Verificar que el sistema vuelve al estado anterior

## Testing Plan
1. Admin: admin@logicalogistica.com
2. Usuario normal: damaso.prats@logicalogistica.com
3. Verificar auto-login con sesión existente
4. Verificar creación de nueva sesión
5. Verificar límite de dispositivos

## Estado del Sistema
- **Before**: Error 500 al verificar código OTP
- **After**: Sesiones creadas correctamente con token persistido
