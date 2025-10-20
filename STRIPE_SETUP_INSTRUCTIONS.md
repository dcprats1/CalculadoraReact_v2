# Instrucciones de Configuración de Stripe

## Resumen
Este documento explica cómo configurar Stripe para el sistema de suscripciones de la Calculadora de Tarifas GLS.

---

## 1. Configuración Inicial de Stripe

### 1.1 Crear cuenta en Stripe
1. Ve a https://dashboard.stripe.com/register
2. Crea una cuenta corporativa
3. Completa la verificación de identidad y datos bancarios

### 1.2 Obtener API Keys
1. Ve a: https://dashboard.stripe.com/apikeys
2. Copia tu **Secret Key** (empieza con `sk_test_` o `sk_live_`)
3. Copia tu **Publishable Key** (empieza con `pk_test_` o `pk_live_`)

---

## 2. Configurar Variables de Entorno

### 2.1 En Supabase Dashboard
1. Ve a: Project Settings → Edge Functions → Secrets
2. Añade las siguientes variables:

```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=(se obtiene en el paso 3)
```

### 2.2 En tu archivo .env local (opcional para desarrollo)
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

---

## 3. Configurar Webhook

### 3.1 Crear Webhook Endpoint
1. Ve a: https://dashboard.stripe.com/webhooks
2. Haz clic en "Add endpoint"
3. URL del endpoint: `https://[TU-PROYECTO-ID].supabase.co/functions/v1/stripe-webhook`
4. Selecciona los siguientes eventos:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`

5. Copia el **Signing secret** (empieza con `whsec_`)
6. Añádelo como `STRIPE_WEBHOOK_SECRET` en Supabase

---

## 4. No es Necesario Crear Productos Manualmente

El sistema crea los productos y precios dinámicamente cuando un usuario selecciona un plan. La Edge Function `create-checkout-session` maneja esto automáticamente.

### Estructura de Precios (para referencia)

#### Planes Mensuales:
- **Tier 1 (Básico)**: €90/mes - 1 dispositivo
- **Tier 2 (Profesional)**: €180/mes - 3 dispositivos
- **Tier 3 (Empresa)**: €270/mes - 5 dispositivos
- **Tier 4 (Corporativo)**: €315/mes - 8 dispositivos

#### Planes Anuales (con descuento):
- **Tier 1**: €990/año (1 mes gratis)
- **Tier 2**: €1.890/año (1.5 meses gratis)
- **Tier 3**: €2.700/año (2 meses gratis)
- **Tier 4**: €3.150/año (2 meses gratis)

---

## 5. Probar el Sistema

### 5.1 Modo Test
En modo test, usa estas tarjetas de prueba:
- **Éxito**: 4242 4242 4242 4242
- **Fallo**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

Cualquier fecha futura y CVC válido (ej: 123)

### 5.2 Flujo Completo de Prueba
1. Inicia sesión con un email @gls-spain.es
2. Selecciona un plan en la página de precios
3. Completa el checkout con tarjeta de prueba
4. Verifica que:
   - Recibes redirección a `/payment-success`
   - Tu perfil se actualiza con el tier correcto
   - Puedes acceder a la calculadora

---

## 6. Activar Modo Producción

### 6.1 Requisitos
1. Verificación de cuenta completa en Stripe
2. Configuración bancaria para recibir pagos
3. Cumplimiento de políticas de Stripe

### 6.2 Cambiar a Live Keys
1. En Stripe Dashboard, cambia a "View live data"
2. Obtén las Live API Keys
3. Actualiza las variables de entorno en Supabase con las keys de producción
4. Crea un nuevo webhook endpoint usando las mismas URLs pero en modo producción

---

## 7. Monitoreo y Logs

### 7.1 Dashboard de Stripe
- **Pagos**: https://dashboard.stripe.com/payments
- **Suscripciones**: https://dashboard.stripe.com/subscriptions
- **Clientes**: https://dashboard.stripe.com/customers
- **Webhooks**: https://dashboard.stripe.com/webhooks (ver eventos recibidos)

### 7.2 Logs de Supabase
- Ve a: Supabase Dashboard → Edge Functions → Logs
- Filtra por función: `stripe-webhook` o `create-checkout-session`
- Revisa errores o eventos importantes

---

## 8. Seguridad y Mejores Prácticas

### 8.1 Claves API
- **NUNCA** expongas tu Secret Key en el frontend
- Usa solo Publishable Key en código cliente
- Rota las keys periódicamente

### 8.2 Webhooks
- Siempre verifica la firma del webhook (ya implementado)
- Usa HTTPS en todos los endpoints
- Monitorea intentos de webhook fallidos

### 8.3 Datos Sensibles
- No almacenes datos de tarjetas (Stripe lo maneja)
- Cumple con PCI DSS (Stripe te ayuda)
- Implementa logging de todas las transacciones

---

## 9. Solución de Problemas Comunes

### Webhook no recibe eventos
- Verifica que la URL sea correcta
- Comprueba que los eventos estén seleccionados
- Revisa logs de Stripe para ver errores de entrega

### Pago exitoso pero suscripción no activa
- Verifica logs de la función `stripe-webhook`
- Comprueba que el webhook esté correctamente firmado
- Revisa que el email del usuario exista en `user_profiles`

### Error "Stripe no configurado"
- Verifica que `STRIPE_SECRET_KEY` esté en variables de entorno de Supabase
- Comprueba que la key sea válida y no esté en modo test si estás en producción

---

## 10. Soporte

### Documentación Oficial
- Stripe Docs: https://stripe.com/docs
- Stripe Checkout: https://stripe.com/docs/payments/checkout
- Stripe Webhooks: https://stripe.com/docs/webhooks

### Contacto
Para problemas técnicos con la integración, contacta al desarrollador del sistema.

---

**Última actualización**: 2025-10-20
