# Cambios en Sistema de Autenticación - Usuario de Prueba

**Fecha:** 2025-10-21
**Tipo de cambio:** CRÍTICO - Modificación de protocolos de autenticación y validación de emails
**Estado:** ✅ COMPLETADO Y DESPLEGADO

---

## 📋 Resumen Ejecutivo

Se ha añadido una excepción segura al sistema de autenticación para permitir el acceso del usuario `damaso.prats@logicalogistica.com` como usuario de prueba tipo 1. Este usuario permite realizar testing de funcionalidades regulares sin comprometer la seguridad del sistema ni afectar la validación del dominio `@gls-spain.es`.

---

## 🎯 Objetivo

Crear un usuario de prueba permanente que permita:
- Probar flujos de suscripción y cambios de plan
- Realizar testing de funcionalidades de usuario regular (no admin)
- Validar integraciones con Stripe en modo prueba
- Reproducir errores y excepciones reportadas por usuarios
- Debugging continuo sin necesidad de renovar suscripciones

---

## 📁 Archivos Modificados

### 1. **Frontend - AuthContext**
**Archivo:** `src/contexts/AuthContext.tsx`

**Cambios:**
- ✅ Añadido import de configuración centralizada: `isAllowedEmail`, `INVALID_EMAIL_ERROR`
- ✅ Reemplazada validación hardcoded por función `isAllowedEmail(email)`
- ✅ Simplificado código de validación de emails

**Líneas modificadas:**
```typescript
// ANTES:
if (!email.endsWith('@gls-spain.es') && email !== 'dcprats@gmail.com') {
  return { success: false, error: 'Solo usuarios @gls-spain.es pueden iniciar sesión' };
}

// DESPUÉS:
if (!isAllowedEmail(email)) {
  return { success: false, error: INVALID_EMAIL_ERROR };
}
```

### 2. **Edge Function - send-login-code**
**Archivo:** `supabase/functions/send-login-code/index.ts`

**Cambios:**
- ✅ Añadidas constantes: `TEST_USER_EMAIL`, `ALLOWED_EXCEPTIONS`
- ✅ Actualizada validación para incluir array de excepciones
- ✅ Mantenida seguridad y mensajes de error

**Líneas modificadas:**
```typescript
// AÑADIDO:
const TEST_USER_EMAIL = 'damaso.prats@logicalogistica.com';
const ALLOWED_EXCEPTIONS = [ADMIN_EMAIL, TEST_USER_EMAIL];

// ACTUALIZADO:
const isAllowed = ALLOWED_EXCEPTIONS.includes(normalizedEmail) || normalizedEmail.endsWith(ALLOWED_DOMAIN);
```

### 3. **Edge Function - create-checkout-session**
**Archivo:** `supabase/functions/create-checkout-session/index.ts`

**Cambios:**
- ✅ Añadidas constantes: `ALLOWED_DOMAIN`, `ADMIN_EMAIL`, `TEST_USER_EMAIL`, `ALLOWED_EXCEPTIONS`
- ✅ Actualizada validación de email para suscripciones Stripe
- ✅ Permite al usuario de prueba crear sesiones de pago en Stripe

**Líneas modificadas:**
```typescript
// AÑADIDO:
const ALLOWED_DOMAIN = '@gls-spain.es';
const ADMIN_EMAIL = 'dcprats@gmail.com';
const TEST_USER_EMAIL = 'damaso.prats@logicalogistica.com';
const ALLOWED_EXCEPTIONS = [ADMIN_EMAIL, TEST_USER_EMAIL];

// ACTUALIZADO:
const isAllowed = ALLOWED_EXCEPTIONS.includes(normalizedEmail) || normalizedEmail.endsWith(ALLOWED_DOMAIN);
```

---

## 📄 Archivos Nuevos Creados

### 1. **Configuración Centralizada de Emails**
**Archivo:** `src/config/allowedEmails.ts`

**Contenido:**
- Constantes centralizadas para emails permitidos
- Función helper `isAllowedEmail(email: string): boolean`
- Documentación detallada del propósito de cada excepción
- Mensaje de error estandarizado

**Propósito:**
- Centralizar la lógica de validación de emails
- Evitar duplicación de código
- Facilitar auditoría y mantenimiento
- Documentar excepciones de forma clara

### 2. **Migración de Base de Datos**
**Archivo:** `supabase/migrations/[timestamp]_add_test_user_damaso_prats.sql`

**Operaciones:**
- ✅ UPDATE del usuario existente a configuración Tier 1
- ✅ Configuración: `subscription_tier = 1`, `max_devices = 1`
- ✅ Suscripción activa permanente hasta 2099-12-31
- ✅ Payment method: `manual`
- ✅ Validación de actualización correcta

---

## 🗄️ Estado del Usuario en Base de Datos

**Usuario:** `damaso.prats@logicalogistica.com`
**ID:** `6d652e08-74cb-4d66-a731-b4b18aef7280`

**Configuración actual:**
```json
{
  "email": "damaso.prats@logicalogistica.com",
  "subscription_status": "active",
  "subscription_tier": 1,
  "max_devices": 1,
  "payment_method": "manual",
  "subscription_end_date": "2099-12-31 23:59:59+00"
}
```

**Características:**
- ✅ Plan Básico (Tier 1)
- ✅ 1 dispositivo simultáneo
- ✅ Suscripción activa
- ✅ Sin fecha de expiración práctica (año 2099)
- ✅ Payment method: manual (para diferenciar de Stripe)
- ❌ NO tiene privilegios de administrador

---

## 🔐 Seguridad y Validaciones

### Emails Permitidos en el Sistema

**Dominio principal:** `@gls-spain.es` (todos los usuarios)

**Excepciones documentadas:**
1. **`dcprats@gmail.com`** - Administrador principal
   - Privilegios administrativos completos
   - Acceso a estadísticas de todos los usuarios
   - Panel de administración
   - Sin límites de dispositivos

2. **`damaso.prats@logicalogistica.com`** - Usuario de prueba
   - Usuario regular tipo 1 (sin privilegios admin)
   - 1 dispositivo simultáneo
   - Permite testing de funcionalidades de usuario
   - Suscripción permanente para pruebas continuas

### Verificación de Privilegios

**Admin:** Solo se determina por `data.email === 'dcprats@gmail.com'`

**Lugares donde se verifica:**
- `src/contexts/AuthContext.tsx` línea 72
- `src/components/settings/SubscriptionTab.tsx` línea 70

**Confirmación:**
- ✅ `damaso.prats@logicalogistica.com` NO tiene `is_admin: true`
- ✅ No muestra banner de "Cuenta Administrador"
- ✅ No tiene acceso a panel de administración
- ✅ Se comporta como usuario regular tipo 1

---

## 💾 Backups Realizados

Se han creado backups de todos los archivos críticos antes de realizar cambios:

1. **`BACKUP_AUTH_CHANGES_20251021_AuthContext.tsx`**
   Backup del contexto de autenticación del frontend

2. **`BACKUP_AUTH_CHANGES_20251021_send-login-code.ts`**
   Backup de Edge Function de envío de códigos OTP

**Nota:** También existe `BACKUP_AuthContext.tsx.backup` como backup adicional.

---

## 🔄 Procedimiento de Rollback

### Si necesitas revertir los cambios:

#### 1. Revertir Frontend
```bash
# Restaurar AuthContext original
cp BACKUP_AUTH_CHANGES_20251021_AuthContext.tsx src/contexts/AuthContext.tsx

# Eliminar archivo de configuración
rm src/config/allowedEmails.ts
```

#### 2. Revertir Edge Functions
```bash
# Opción A: Usar backups locales
cp BACKUP_AUTH_CHANGES_20251021_send-login-code.ts supabase/functions/send-login-code/index.ts

# Opción B: Revertir manualmente las constantes
# Editar supabase/functions/send-login-code/index.ts
# Eliminar: TEST_USER_EMAIL, ALLOWED_EXCEPTIONS
# Restaurar validación original: if (normalizedEmail !== ADMIN_EMAIL && !normalizedEmail.endsWith(ALLOWED_DOMAIN))

# Lo mismo para create-checkout-session
```

#### 3. Re-desplegar Edge Functions
```bash
# Desplegar las versiones revertidas
# (usar herramienta de deployment de Supabase)
```

#### 4. Revertir Base de Datos (Opcional)
```sql
-- Solo si quieres revertir la configuración del usuario de prueba
UPDATE user_profiles
SET
  subscription_tier = 5,
  max_devices = 12,
  subscription_end_date = '2035-10-17 18:04:48.802+00'
WHERE email = 'damaso.prats@logicalogistica.com';
```

**IMPORTANTE:**
- Los cambios en Edge Functions requieren re-deployment
- La base de datos NO necesita revertirse a menos que sea crítico
- El archivo de configuración `allowedEmails.ts` debe eliminarse si se revierte

---

## ✅ Verificación Post-Implementación

### Checklist de Validación

- [x] Usuario `damaso.prats@logicalogistica.com` configurado en BD como Tier 1
- [x] Edge Function `send-login-code` desplegada correctamente
- [x] Edge Function `create-checkout-session` desplegada correctamente
- [x] Archivo de configuración `allowedEmails.ts` creado
- [x] AuthContext actualizado e importa configuración
- [x] Backups creados de archivos críticos
- [x] Usuario NO tiene privilegios de administrador
- [x] Validación de dominio `@gls-spain.es` permanece intacta

### Pruebas Recomendadas

**Login:**
1. Intentar login con `damaso.prats@logicalogistica.com`
2. Verificar recepción de código OTP
3. Completar verificación de código
4. Confirmar acceso exitoso

**Perfil de Usuario:**
1. Verificar que muestra "Plan Básico" (no "Plan Administrador")
2. Confirmar que max_devices = 1
3. Verificar que no aparece banner de administrador
4. Comprobar que subscription_status = "active"

**Suscripción Stripe:**
1. Intentar crear sesión de checkout con el usuario de prueba
2. Verificar que permite acceso a Stripe (modo prueba)
3. Confirmar que se crea sesión correctamente

**Seguridad:**
1. Verificar que otros dominios siguen siendo rechazados
2. Confirmar que usuarios `@gls-spain.es` funcionan normalmente
3. Validar que `dcprats@gmail.com` mantiene privilegios admin

---

## 📝 Notas Importantes

### Para Desarrolladores

1. **Añadir nuevas excepciones:**
   - Editar `src/config/allowedEmails.ts`
   - Añadir email a `ALLOWED_EXCEPTIONS`
   - Documentar el propósito en comentarios
   - Actualizar constantes en Edge Functions si es necesario
   - Re-desplegar Edge Functions

2. **Mantener consistencia:**
   - Frontend y backend deben usar la misma lista de excepciones
   - Documentar SIEMPRE el propósito de cada excepción
   - Evitar hardcodear validaciones fuera de la configuración central

3. **Auditoría:**
   - El archivo `allowedEmails.ts` es la fuente de verdad para excepciones
   - Revisar este archivo al añadir o eliminar usuarios especiales
   - Mantener documentación actualizada

### Diferencias entre Tipos de Usuario

| Característica | Admin (dcprats@gmail.com) | Test User (damaso.prats) | Usuario Regular (@gls-spain.es) |
|---|---|---|---|
| Privilegios admin | ✅ Sí | ❌ No | ❌ No |
| Panel administración | ✅ Acceso | ❌ Sin acceso | ❌ Sin acceso |
| Ver estadísticas globales | ✅ Todas | ❌ Solo propias | ❌ Solo propias |
| Límite dispositivos | ∞ Sin límite | 1 dispositivo | Según plan (1-12) |
| Fecha expiración | Permanente | Permanente (2099) | Según suscripción |
| Payment method | admin_grant | manual | stripe/manual/promo |
| Aparece en lista excepciones | ✅ Sí | ✅ Sí | ❌ No (usa dominio) |

---

## 🚀 Deployment

**Edge Functions desplegadas:**
- ✅ `send-login-code` - Versión con excepciones
- ✅ `create-checkout-session` - Versión con excepciones

**Estado:** ACTIVAS EN PRODUCCIÓN

**Timestamp deployment:** 2025-10-21

---

## 📞 Soporte

**En caso de problemas:**

1. Verificar logs de Edge Functions en Supabase Dashboard
2. Revisar tabla `auth_logs` para eventos de autenticación
3. Consultar este documento para procedimiento de rollback
4. Revisar backups en archivos `BACKUP_AUTH_CHANGES_20251021_*`

**Contacto técnico:** Equipo de desarrollo

---

## 📊 Métricas de Impacto

**Archivos modificados:** 5
**Edge Functions re-desplegadas:** 2
**Nuevos archivos creados:** 2
**Migraciones aplicadas:** 1
**Backups creados:** 2

**Tiempo estimado de rollback:** 5-10 minutos

**Riesgo:** BAJO
- Cambios documentados y con backups
- No afecta funcionalidad existente
- Solo añade excepción controlada
- Validación original permanece intacta

---

**Documento creado:** 2025-10-21
**Última actualización:** 2025-10-21
**Versión:** 1.0
