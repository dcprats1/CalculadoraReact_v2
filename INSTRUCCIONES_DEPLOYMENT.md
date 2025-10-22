# Instrucciones de Deployment - Flujo de Activación Post-Pago

**Fecha:** 22 de Octubre de 2025
**Estado:** ✅ Código listo para deployment

---

## 📋 Pre-requisitos

Antes de proceder con el deployment, verificar:

- ✅ Build exitoso (`npm run build` sin errores)
- ✅ Commits creados con cambios documentados
- ✅ Variables de entorno configuradas
- ✅ Acceso a Supabase Dashboard
- ✅ Acceso a Stripe Dashboard

---

## 🚀 Paso 1: Desplegar Edge Function

### Opción A: Usando MCP Tool (Recomendado)

La Edge Function `check-user-activation-status` necesita ser desplegada en Supabase.

**Archivos a desplegar:**
```
supabase/functions/check-user-activation-status/index.ts
```

**Parámetros del deployment:**
- **Nombre:** `check-user-activation-status`
- **Slug:** `check-user-activation-status`
- **Verify JWT:** `false` (es una función pública que usa ANON_KEY)
- **Entrypoint:** `index.ts`

**Comando (si tienes acceso al MCP tool):**
```typescript
mcp__supabase__deploy_edge_function({
  name: "check-user-activation-status",
  slug: "check-user-activation-status",
  verify_jwt: false,
  entrypoint_path: "index.ts",
  files: [
    {
      name: "index.ts",
      content: "..." // contenido del archivo
    }
  ]
})
```

### Opción B: Deployment Manual via Supabase CLI

Si no tienes acceso al MCP tool, usar Supabase CLI:

```bash
# 1. Instalar Supabase CLI (si no está instalado)
npm install -g supabase

# 2. Login a Supabase
supabase login

# 3. Link al proyecto
supabase link --project-ref <tu-project-ref>

# 4. Desplegar la función
supabase functions deploy check-user-activation-status
```

### Verificación del Deployment:

1. **Ir a Supabase Dashboard:**
   - Edge Functions > Lista de funciones
   - Verificar que `check-user-activation-status` aparece

2. **Probar el endpoint:**
   ```bash
   curl -X GET "https://<tu-project-ref>.supabase.co/functions/v1/check-user-activation-status?email=test@gls-spain.es" \
     -H "Authorization: Bearer <ANON_KEY>"
   ```

3. **Respuesta esperada:**
   ```json
   {
     "status": "pending",
     "message": "Usuario aún no activado...",
     "email": "test@gls-spain.es"
   }
   ```

---

## 🌐 Paso 2: Deployment del Frontend

### Build de Producción:

```bash
# Ya ejecutado, pero para referencia:
npm run build

# Output estará en /dist
# Archivos generados:
# - dist/index.html
# - dist/assets/index-BjU8H1AE.css
# - dist/assets/index-DTI28M_E.js
```

### Subir a Servidor:

Dependiendo de tu configuración de hosting:

**Opción A: Hosting en Servidor Web (Nginx/Apache)**
```bash
# Copiar archivos de dist/ al directorio web
scp -r dist/* usuario@servidor:/var/www/html/area-privada2/calculadora/

# Verificar que se respetan las rutas del basename
# basename="/area-privada2/calculadora" en App.tsx
```

**Opción B: Hosting en Vercel/Netlify**
```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod
```

**Opción C: Hosting en servidor existente**
- Reemplazar contenido de `/area-privada2/calculadora/` con archivos de `dist/`
- Mantener configuración de Nginx/Apache para SPA routing

---

## ⚙️ Paso 3: Verificar Variables de Entorno

### En Supabase (Edge Functions):

Verificar que estas variables están configuradas en Supabase > Settings > Edge Functions:

```
✅ SUPABASE_URL
✅ SUPABASE_SERVICE_ROLE_KEY
✅ STRIPE_SECRET_KEY
✅ STRIPE_WEBHOOK_SECRET
✅ RESEND_API_KEY (opcional, para emails)
```

### En Frontend (.env):

Verificar que el archivo `.env` tiene:

```env
VITE_SUPABASE_URL=https://<tu-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

**⚠️ IMPORTANTE:** Estas variables deben estar configuradas ANTES del build.

---

## 🧪 Paso 4: Testing en Stripe Test Mode

### 4.1 Preparación:

1. **Activar Test Mode en Stripe:**
   - Stripe Dashboard > Toggle "Test mode"

2. **Obtener tarjetas de prueba:**
   ```
   Número: 4242 4242 4242 4242
   Fecha: Cualquier fecha futura
   CVC: Cualquier 3 dígitos
   ```

### 4.2 Flujo de Prueba Completo:

```
PASO 1: Acceder sin cuenta
✅ Ir a https://<tu-dominio>/area-privada2/calculadora/
✅ Verificar que muestra LoginContainer
✅ Introducir email: test@gls-spain.es (o tu email de prueba)
✅ Verificar que muestra UnregisteredUserView

PASO 2: Ir a Pricing
✅ Click en "Ver Planes y Precios"
✅ Verificar que abre PricingPage
✅ Seleccionar un plan (ej: Plan Profesional, Anual)
✅ Click en "Seleccionar Plan Profesional"

PASO 3: Completar Pago
✅ Verificar que redirige a Stripe Checkout
✅ URL debe incluir: ?session_id=cs_test_...&email=test@gls-spain.es
✅ Rellenar datos de tarjeta con 4242 4242 4242 4242
✅ Completar checkout

PASO 4: Verificar PaymentSuccess
✅ Debe redireccionar a /payment-success?session_id=cs_test_...&email=...
✅ Debe mostrar pantalla de procesamiento
✅ Debe mostrar barra de progreso
✅ Debe mostrar mensajes rotativos
✅ Debe mostrar contador de tiempo

PASO 5: Esperar Activación (10-30s típicamente)
✅ Verificar que progreso avanza
✅ Verificar que mensajes cambian cada fase
✅ Esperar hasta ver "¡Cuenta activada!"
✅ Verificar que muestra detalles de suscripción
✅ Debe redirigir automáticamente a "/" en 2s

PASO 6: Verificar Login
✅ Debe mostrar LoginContainer con banner verde
✅ Banner debe decir "¡Bienvenido! Tu cuenta está lista"
✅ Campo email debe estar pre-rellenado con test@gls-spain.es
✅ Click en "Enviar código de acceso"

PASO 7: Verificar OTP
✅ Debe recibir email con código de 6 dígitos
✅ Introducir código en CodeVerificationForm
✅ Verificar que valida correctamente
✅ Debe redirigir a TariffCalculator

PASO 8: Verificar Acceso
✅ Debe mostrar calculadora completa
✅ Verificar que subscription_status = 'active'
✅ Verificar que max_devices corresponde al tier seleccionado
```

### 4.3 Verificar Logs:

**En Supabase:**
```sql
-- Ver eventos de activación
SELECT * FROM auth_logs
WHERE email = 'test@gls-spain.es'
ORDER BY created_at DESC
LIMIT 20;

-- Eventos esperados:
-- 1. checkout_session_created
-- 2. activation_check_pending (varios)
-- 3. activation_check_success
-- 4. code_sent
-- 5. login_success
```

**En Stripe Dashboard:**
```
Webhooks > Logs > Buscar por session_id

Eventos esperados:
1. checkout.session.completed
2. invoice.payment_succeeded
3. customer.subscription.created
```

**En Browser Console:**
```javascript
// Verificar localStorage
console.log(localStorage.getItem('pending_activation'));
console.log(localStorage.getItem('recently_activated'));
console.log(localStorage.getItem('user_session'));
```

---

## ⚠️ Paso 5: Testing de Escenarios de Error

### 5.1 Timeout (más de 120 segundos):

**Método de prueba:**
- Temporalmente desactivar el webhook en Stripe Dashboard
- Completar un pago
- Verificar que después de 120s muestra pantalla de timeout
- Verificar las 3 opciones: Reintentar, Ir al login, Contactar soporte

### 5.2 Recarga de Página:

**Método de prueba:**
- Iniciar pago y esperar a PaymentSuccess
- Recargar página mientras está verificando
- Verificar que retoma verificación desde donde quedó
- Verificar que contador no se resetea

### 5.3 Banner de Bienvenida:

**Método de prueba:**
- Completar activación exitosa
- Cerrar navegador completamente
- Abrir navegador nuevamente
- Ir a login
- Verificar que banner aparece (si no pasaron 5 minutos)
- Esperar 5 minutos y verificar que banner no aparece

---

## 📊 Paso 6: Monitoreo Post-Deployment

### Métricas a Monitorear (Primera Semana):

1. **Tiempo de Activación:**
   ```sql
   SELECT
     AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds,
     MIN(EXTRACT(EPOCH FROM (completed_at - created_at))) as min_seconds,
     MAX(EXTRACT(EPOCH FROM (completed_at - created_at))) as max_seconds
   FROM (
     SELECT
       email,
       MIN(created_at) FILTER (WHERE event_type = 'activation_check_pending') as created_at,
       MIN(created_at) FILTER (WHERE event_type = 'activation_check_success') as completed_at
     FROM auth_logs
     WHERE created_at > NOW() - INTERVAL '7 days'
     GROUP BY email
   ) activation_times
   WHERE completed_at IS NOT NULL;
   ```

2. **Tasa de Timeouts:**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE event_type = 'activation_check_success') as activations_ok,
     COUNT(*) FILTER (WHERE metadata->>'status' = 'timeout') as timeouts,
     ROUND(
       COUNT(*) FILTER (WHERE metadata->>'status' = 'timeout')::numeric /
       NULLIF(COUNT(*) FILTER (WHERE event_type = 'activation_check_success'), 0) * 100,
       2
     ) as timeout_rate_percent
   FROM auth_logs
   WHERE created_at > NOW() - INTERVAL '7 days'
     AND (event_type = 'activation_check_success' OR metadata->>'status' = 'timeout');
   ```

3. **Usuarios Nuevos vs Renovaciones:**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE event_type = 'stripe_new_user_created') as new_users,
     COUNT(*) FILTER (WHERE event_type = 'stripe_user_renewed') as renewals
   FROM auth_logs
   WHERE created_at > NOW() - INTERVAL '7 days';
   ```

### Alertas a Configurar:

1. **Timeout Rate > 5%:**
   - Indica problema con webhook de Stripe
   - Revisar configuración de webhook secret
   - Verificar latencia de Supabase

2. **Tiempo Promedio > 45 segundos:**
   - Indica latencia en webhook
   - Considerar optimizaciones

3. **Errores en check-user-activation-status:**
   - Revisar logs de la función
   - Verificar conectividad con Supabase

---

## 🆘 Paso 7: Troubleshooting Común

### Problema 1: Edge Function no responde

**Síntomas:**
- PaymentSuccess se queda verificando indefinidamente
- Network error en console

**Solución:**
```bash
# 1. Verificar que la función está desplegada
curl https://<project-ref>.supabase.co/functions/v1/check-user-activation-status

# 2. Verificar logs en Supabase Dashboard
# Edge Functions > check-user-activation-status > Logs

# 3. Re-desplegar si necesario
supabase functions deploy check-user-activation-status
```

### Problema 2: Webhook no llega

**Síntomas:**
- Usuario se queda en pending más de 60 segundos
- Stripe logs muestran errores

**Solución:**
```bash
# 1. Verificar webhook endpoint en Stripe
# https://<project-ref>.supabase.co/functions/v1/stripe-webhook

# 2. Verificar que STRIPE_WEBHOOK_SECRET está configurado
# Supabase Dashboard > Settings > Edge Functions

# 3. Probar webhook manualmente desde Stripe Dashboard
# Webhooks > Select endpoint > Send test webhook
```

### Problema 3: Usuario no aparece en user_profiles

**Síntomas:**
- Timeout después de 120s
- Pago confirmado en Stripe
- Usuario no existe en DB

**Solución:**
```sql
-- 1. Verificar si usuario existe en auth.users
SELECT * FROM auth.users WHERE email = 'usuario@ejemplo.com';

-- 2. Verificar logs del webhook
SELECT * FROM auth_logs
WHERE email = 'usuario@ejemplo.com'
  AND event_type LIKE 'stripe%'
ORDER BY created_at DESC;

-- 3. Crear manualmente si necesario (último recurso)
-- Ver: supabase/functions/admin-create-client/index.ts
```

---

## 🔄 Rollback si Necesario

Si encuentras problemas críticos post-deployment:

### Rollback del Frontend:

```bash
# 1. Revertir al commit de backup
git reset --hard ec23262

# 2. Rebuild
npm run build

# 3. Re-desplegar dist/
# (mismo proceso que deployment normal)
```

### Rollback de Edge Function:

```bash
# 1. Eliminar la función en Supabase Dashboard
# Edge Functions > check-user-activation-status > Delete

# 2. O desplegar versión vacía
# (crear función que retorna error 501 Not Implemented)
```

### Verificación Post-Rollback:

```bash
# 1. Verificar que PaymentSuccess muestra pantalla estática (comportamiento anterior)
# 2. Verificar que login funciona normalmente
# 3. Verificar que usuarios existentes pueden acceder
```

---

## ✅ Checklist Final de Deployment

Antes de dar por completado el deployment:

### Backend:
- [ ] Edge Function `check-user-activation-status` desplegada
- [ ] Endpoint responde correctamente
- [ ] Variables de entorno configuradas
- [ ] Logs de auth_logs funcionando

### Frontend:
- [ ] Build de producción completado sin errores
- [ ] Archivos desplegados en servidor
- [ ] Rutas funcionando (basename correcto)
- [ ] Variables .env configuradas correctamente

### Testing:
- [ ] Usuario nuevo puede registrarse y activarse
- [ ] Usuario existente puede renovar
- [ ] PaymentSuccess muestra progreso correctamente
- [ ] Activación completa en <30 segundos (típico)
- [ ] Banner de bienvenida aparece
- [ ] Email pre-rellenado funciona
- [ ] Login con OTP funciona
- [ ] Acceso a calculadora exitoso

### Monitoring:
- [ ] Logs de auth_logs revisados
- [ ] Webhook de Stripe funcionando
- [ ] Tiempos de activación normales (<45s promedio)
- [ ] Sin errores en console del navegador

### Documentación:
- [ ] Equipo informado de los cambios
- [ ] Documentación accesible
- [ ] Procedimientos de rollback claros
- [ ] Contacto de soporte definido

---

## 📞 Contacto Post-Deployment

**Para reportar problemas:**
- Email: dcprats@gmail.com
- Incluir: Session ID, email de usuario, timestamp, descripción

**Documentación de referencia:**
- `FLUJO_ACTIVACION_POST_PAGO.md` - Detalles técnicos
- `CHANGELOG_ACTIVACION_POST_PAGO.md` - Historial de cambios
- `RESUMEN_IMPLEMENTACION_ACTIVACION.md` - Resumen ejecutivo

---

**FIN DE INSTRUCCIONES DE DEPLOYMENT**

¡Buena suerte con el deployment! 🚀
