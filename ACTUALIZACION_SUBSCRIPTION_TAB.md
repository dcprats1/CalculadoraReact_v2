# Actualización de SubscriptionTab - Sistema de Suscripciones

**Fecha**: 2025-10-21
**Autor**: Claude Code
**Motivo**: Migración del sistema antiguo (clients/subscriptions) al nuevo sistema (user_profiles)

---

## Resumen Ejecutivo

Se ha actualizado completamente el componente `SubscriptionTab.tsx` para usar el nuevo sistema de suscripciones basado en `user_profiles` en lugar del sistema antiguo basado en `clients` y `subscriptions`.

### Problema Identificado

El componente buscaba datos en:
- Tabla `subscriptions` usando campo `client_id`
- Campo `client_id` NO existe en el sistema actual
- Resultado: Tab de suscripción mostraba "No se encontró información de suscripción"

### Solución Implementada

Migrar a usar datos de `userData` del `AuthContext`, que obtiene información directamente de `user_profiles`.

---

## Punto de Retorno

### Archivo de Backup

```
Ubicación: /tmp/cc-agent/58932075/project/BACKUP_SubscriptionTab.tsx.backup
Fecha: 2025-10-21
```

Para restaurar el archivo original:
```bash
cp BACKUP_SubscriptionTab.tsx.backup src/components/settings/SubscriptionTab.tsx
```

---

## Cambios Realizados

### 1. Eliminado

#### Sistema Antiguo:
```typescript
// ❌ ELIMINADO - No existe client_id
interface Subscription {
  plan_name: string;
  price_eur: number;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
}

async function loadSubscription() {
  const { data } = await supabase
    .from('subscriptions')
    .select('...')
    .eq('client_id', userData!.client_id)  // ❌ Este campo NO existe
    .maybeSingle();
}
```

### 2. Añadido

#### A. Imports Nuevos
```typescript
import { getPlanByTier, TIER_TO_DEVICES } from '../../data/plans.data';
import { Smartphone, Shield, Users } from 'lucide-react';
```

#### B. Interface para Sesiones Activas
```typescript
interface ActiveSession {
  id: string;
  device_info: string | null;
  last_activity: string;
}
```

#### C. Función para Cargar Sesiones Activas
```typescript
async function loadActiveSessions() {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('id, device_info, last_activity')
    .eq('user_id', userData!.id)
    .gt('expires_at', new Date().toISOString())
    .order('last_activity', { ascending: false });
}
```

#### D. Detección de Administrador
```typescript
const isAdmin = userData.is_admin || userData.email === 'dcprats@gmail.com';
```

#### E. Cálculos de Suscripción
```typescript
const subscriptionEndDate = userData.subscription_end_date
  ? new Date(userData.subscription_end_date)
  : null;

const daysUntilExpiration = subscriptionEndDate
  ? Math.ceil((subscriptionEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  : null;

const deviceUsagePercentage = userData.max_devices > 0
  ? (activeSessions.length / userData.max_devices) * 100
  : 0;
```

---

## Nuevas Funcionalidades

### 1. Badge de Administrador

Para usuarios con `is_admin: true` o email `dcprats@gmail.com`:

```tsx
<div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
  <Shield className="h-8 w-8" />
  <h3>Cuenta Administrador</h3>
  <p>Acceso completo al sistema</p>
</div>
```

### 2. Información de Plan Real

Usa datos de `/src/data/plans.data.ts`:

- **Tier 1**: 90€/mes, 990€/año, 1 dispositivo
- **Tier 2**: 180€/mes, 1.890€/año, 3 dispositivos
- **Tier 3**: 270€/mes, 2.700€/año, 5 dispositivos
- **Tier 4**: 315€/mes, 3.150€/año, 8 dispositivos
- **Tier 5**: Admin (12 dispositivos según DB, pero sin restricciones)

### 3. Monitoreo de Dispositivos Activos

**Características:**
- Consulta en tiempo real a `user_sessions`
- Filtra por sesiones no expiradas
- Muestra información de cada dispositivo
- Barra de progreso visual
- Alertas cuando se acerca al límite (>90%)

**Colores de la barra:**
- Verde: < 70% de capacidad
- Amarillo: 70-89% de capacidad
- Rojo: >= 90% de capacidad

### 4. Cálculo de Días Restantes

Muestra dinámicamente:
- Días restantes hasta renovación
- Alerta si quedan ≤ 7 días
- Mensaje de expiración si la fecha ya pasó

### 5. Vista Especial para Admin

**Diferencias para administrador:**
- Badge destacado "Cuenta Administrador"
- Texto "Plan Administrador" en lugar del tier
- "Sin coste · Acceso permanente"
- "Validez: Permanente"
- NO muestra sección de facturación
- NO muestra detalles del plan

### 6. Detalles del Plan (Solo usuarios normales)

Nueva sección que muestra:
- Precio mensual
- Precio anual
- Ahorro anual vs. pago mensual
- Precio por dispositivo/año

---

## Mapeo de Datos

### user_profiles → UI

| Campo DB | Uso en UI |
|----------|-----------|
| `subscription_tier` | Determina plan, dispositivos, precios |
| `subscription_status` | Badge de estado (activa/trial/past_due/cancelled) |
| `max_devices` | Límite de dispositivos simultáneos |
| `subscription_end_date` | Fecha de renovación y días restantes |
| `payment_method` | Método de pago mostrado |
| `is_admin` | Activa vista especial de administrador |
| `email` | Verificación adicional de admin (dcprats@gmail.com) |

### Estados de Suscripción

| Estado | Badge | Color |
|--------|-------|-------|
| `active` | Activa | Verde |
| `trial` | Periodo de prueba | Azul |
| `past_due` | Pago pendiente | Amarillo |
| `cancelled` | Cancelada | Rojo |

### Métodos de Pago

| Valor DB | Texto Mostrado |
|----------|----------------|
| `stripe` | Pago con tarjeta |
| `manual` | Transferencia bancaria |
| `promo` | Código promocional |
| `trial` | Periodo de prueba gratuito |
| `admin_grant` | Acceso administrativo |

---

## Estructura de la UI

### Sección 1: Badge de Admin (Condicional)
- Solo visible si `isAdmin === true`
- Fondo azul degradado
- Icono Shield

### Sección 2: Información de Suscripción
- Badge de estado
- Grid 2x2 con:
  - Plan contratado
  - Dispositivos máximos
  - Método de pago
  - Fecha de renovación (o "Permanente" para admin)

### Sección 3: Dispositivos Conectados
- Contador: X de Y en uso
- Barra de progreso coloreada
- Lista de sesiones activas con:
  - Nombre del dispositivo
  - Última actividad
- Alerta si >90% de capacidad (solo usuarios normales)

### Sección 4: Gestión de Facturación (Solo usuarios normales)
- Mensaje informativo
- Contacto con comercial

### Sección 5: Detalles del Plan (Solo usuarios normales)
- Grid 2x2 con precios y ahorros

---

## Validaciones Implementadas

### 1. Usuario sin datos
```typescript
if (!userData) {
  return <Loader />;
}
```

### 2. Plan no encontrado
```typescript
const plan = getPlanByTier(userData.subscription_tier);
// Si plan es undefined, muestra: `Tier ${userData.subscription_tier}`
```

### 3. Fecha de expiración
```typescript
const daysUntilExpiration = subscriptionEndDate
  ? Math.ceil((subscriptionEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  : null;

// Si <= 0: "Suscripción expirada" (rojo)
// Si <= 7: "Renovación próxima" (amarillo)
```

### 4. Capacidad de dispositivos
```typescript
const deviceUsagePercentage = userData.max_devices > 0
  ? (activeSessions.length / userData.max_devices) * 100
  : 0;

// Si >= 90% y !isAdmin: Mostrar alerta de upgrade
```

---

## Dependencias

### Componentes
- `useAuth()` - Obtener `userData`
- `supabase` - Cliente de base de datos
- Iconos de `lucide-react`

### Datos
- `getPlanByTier()` - De `/src/data/plans.data.ts`
- `TIER_TO_DEVICES` - De `/src/data/plans.data.ts`

### Tablas DB
- `user_profiles` - Información de suscripción
- `user_sessions` - Sesiones activas

---

## Consultas SQL Realizadas

### 1. Obtener Sesiones Activas
```sql
SELECT id, device_info, last_activity
FROM user_sessions
WHERE user_id = $1
  AND expires_at > NOW()
ORDER BY last_activity DESC;
```

---

## Testing Recomendado

### Casos de Prueba

#### 1. Usuario Admin (dcprats@gmail.com)
- ✅ Debe mostrar badge "Cuenta Administrador"
- ✅ Debe mostrar "Plan Administrador"
- ✅ Debe mostrar "Sin coste · Acceso permanente"
- ✅ Debe mostrar "Validez: Permanente"
- ✅ NO debe mostrar sección de facturación
- ✅ NO debe mostrar detalles del plan

#### 2. Usuario Normal con Tier 1-4
- ✅ Debe mostrar nombre del plan correcto
- ✅ Debe mostrar precios según tier
- ✅ Debe mostrar dispositivos según tier
- ✅ Debe mostrar fecha de renovación
- ✅ Debe mostrar días restantes
- ✅ Debe mostrar sección de facturación
- ✅ Debe mostrar detalles del plan

#### 3. Dispositivos Activos
- ✅ Debe contar sesiones no expiradas
- ✅ Debe mostrar lista de dispositivos
- ✅ Debe actualizar barra de progreso
- ✅ Debe mostrar alerta si >90% (solo usuarios normales)

#### 4. Estados de Suscripción
- ✅ `active`: Badge verde "Activa"
- ✅ `trial`: Badge azul "Periodo de prueba"
- ✅ `past_due`: Badge amarillo "Pago pendiente"
- ✅ `cancelled`: Badge rojo "Cancelada"

#### 5. Alertas de Renovación
- ✅ > 7 días: Sin alerta
- ✅ ≤ 7 días: Alerta amarilla "Renovación próxima"
- ✅ ≤ 0 días: Alerta roja "Suscripción expirada"

---

## Datos Reales del Admin

### Consulta a user_profiles
```sql
SELECT * FROM user_profiles WHERE email = 'dcprats@gmail.com';
```

### Resultado:
```json
{
  "id": "639efa1a-5582-4c37-8225-7804bba6045c",
  "email": "dcprats@gmail.com",
  "subscription_status": "active",
  "subscription_tier": 5,
  "max_devices": 12,
  "subscription_start_date": "2025-10-19T19:25:07.476Z",
  "subscription_end_date": "2035-10-17T19:25:07.477Z",
  "stripe_customer_id": null,
  "stripe_subscription_id": null,
  "payment_method": "manual",
  "created_at": "2025-10-19T18:04:47.104961Z",
  "updated_at": "2025-10-20T09:36:13.473835Z",
  "is_admin": true
}
```

### Interpretación:
- **Estado**: Activo
- **Tier**: 5 (máximo)
- **Dispositivos**: 12 (aunque es admin, sin restricciones prácticas)
- **Expiración**: 2035 (10 años de validez)
- **Método pago**: Manual (sin cargo, cuenta administrativa)
- **Es admin**: `true`

---

## Mejoras Futuras Sugeridas

### 1. Cerrar Sesión Remota
Añadir botón para cerrar sesiones individuales desde la UI.

### 2. Historial de Pagos
Integrar con Stripe para mostrar historial de facturas.

### 3. Comparativa de Planes
Modal o sección expandible con tabla comparativa de todos los planes.

### 4. Upgrade/Downgrade
Flujo para solicitar cambio de plan directamente desde el tab.

### 5. Notificaciones Push
Alertas automáticas 7 días antes de renovación.

### 6. Estadísticas de Uso
Gráficos de uso de dispositivos a lo largo del tiempo.

---

## Archivos Modificados

```
✅ MODIFICADO: /src/components/settings/SubscriptionTab.tsx
✅ CREADO: /BACKUP_SubscriptionTab.tsx.backup
✅ CREADO: /ACTUALIZACION_SUBSCRIPTION_TAB.md (este archivo)
```

---

## Verificación Post-Implementación

### Checklist

- [ ] El build se ejecuta sin errores
- [ ] La aplicación se inicia correctamente
- [ ] El tab "Suscripción" muestra información
- [ ] Como admin, se ve el badge especial
- [ ] Como admin, se muestra "Plan Administrador"
- [ ] Como admin, NO se ve sección de facturación
- [ ] Los dispositivos activos se cuentan correctamente
- [ ] La barra de progreso refleja el uso
- [ ] Las fechas se formatean correctamente en español
- [ ] Los precios coinciden con plans.data.ts

---

## Comandos de Verificación

### 1. Build del proyecto
```bash
npm run build
```

### 2. Verificar usuario admin en DB
```sql
SELECT
  email,
  subscription_tier,
  max_devices,
  subscription_status,
  is_admin,
  subscription_end_date
FROM user_profiles
WHERE email = 'dcprats@gmail.com';
```

### 3. Verificar sesiones activas
```sql
SELECT COUNT(*) as active_sessions
FROM user_sessions
WHERE user_id = '639efa1a-5582-4c37-8225-7804bba6045c'
  AND expires_at > NOW();
```

---

## Contacto

Para problemas o preguntas sobre esta actualización:
- Revisar este documento
- Consultar el backup en caso de necesitar rollback
- Verificar logs de consola del navegador
- Revisar logs de Supabase para errores de query

---

**Fin del documento**
