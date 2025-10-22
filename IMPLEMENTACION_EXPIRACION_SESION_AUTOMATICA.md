# Implementacion de Expiracion Automatica de Sesion (24 horas)

**Fecha:** 22 de octubre de 2025
**Objetivo:** Implementar verificacion activa de expiracion de sesion cada 60 segundos

---

## Resumen

Se ha implementado un sistema de verificacion automatica que cierra la sesion del usuario exactamente 24 horas despues de iniciar sesion, sin necesidad de recargar la pagina o realizar ninguna accion.

---

## Comportamiento Implementado

### Antes de esta implementacion:
- Usuario iniciaba sesion a las 8:00 AM del 20/10
- La sesion expiraba en la base de datos a las 8:00 AM del 21/10
- **PERO** el usuario seguia "aparentemente logueado" en el frontend
- Solo se detectaba al recargar la pagina (F5)

### Despues de esta implementacion:
- Usuario inicia sesion a las 8:00 AM del 20/10
- La sesion expira en la base de datos a las 8:00 AM del 21/10
- **El frontend verifica cada 60 segundos** si la sesion expiro
- **A las 8:01 AM del 21/10** (maximo 1 minuto despues), el usuario es desconectado automaticamente
- Se muestra mensaje claro: "Tu sesion ha expirado despues de 24 horas. Por favor, inicia sesion nuevamente."

---

## Cambios Tecnicos Implementados

### 1. Backend: `supabase/functions/verify-login-code/index.ts`

**Cambio:** Ahora devuelve `expiresAt` de la sesion (24h) en lugar de `subscription_end_date`

```typescript
user: {
  id: userProfile.id,
  email: userProfile.email,
  tier: userProfile.subscription_tier,
  maxDevices: userProfile.max_devices,
  expiresAt: newExpiresAt,  // <-- NUEVO: expiracion de sesion
  subscriptionEndDate: userProfile.subscription_end_date,  // <-- Separado
}
```

**Razon:** El frontend necesita saber cuando expira LA SESION (24h), no cuando expira la suscripcion.

---

### 2. Frontend: `src/contexts/AuthContext.tsx`

#### 2.1 Nuevo estado
```typescript
const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
```

#### 2.2 Guardar `expiresAt` en localStorage
```typescript
const sessionData = {
  id: data.user.id,
  email: data.user.email,
  sessionToken: data.sessionToken,
  expiresAt: data.user.expiresAt,  // <-- NUEVO
};
```

#### 2.3 Verificacion inicial al cargar la pagina
```typescript
if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
  localStorage.removeItem('user_session');
  setSessionExpiredMessage('Tu sesion ha expirado...');
  return;
}
```

#### 2.4 Timer de verificacion cada 60 segundos (CRITICO)
```typescript
useEffect(() => {
  let intervalId: number | null = null;

  if (user) {
    intervalId = window.setInterval(() => {
      const sessionData = localStorage.getItem('user_session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
          // LOGOUT AUTOMATICO
          localStorage.removeItem('user_session');
          setUser(null);
          setUserData(null);
          setSessionExpiredMessage('Tu sesion ha expirado despues de 24 horas...');
        }
      }
    }, 60000); // 60 segundos
  }

  return () => {
    if (intervalId !== null) clearInterval(intervalId);
  };
}, [user]);
```

---

### 3. Frontend: `src/components/auth/LoginContainer.tsx`

**Cambio:** Mostrar mensaje de sesion expirada

```typescript
{sessionExpiredMessage && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
    <p className="text-sm text-amber-800 text-center">
      {sessionExpiredMessage}
    </p>
  </div>
)}
```

---

## Impacto en Rendimiento

### Operacion cada 60 segundos:
1. Leer localStorage (~0.001ms)
2. Parsear JSON (~0.0005ms)
3. Comparar fechas (~0.0001ms)

**Total:** ~0.002ms por verificacion
**Por hora:** ~0.12ms
**Impacto:** Completamente imperceptible

---

## Seguridad

### Nivel de seguridad implementado:
- **Verificacion local:** Si, un usuario tecnico podria manipular localStorage
- **Importancia real:** Muy baja, porque:
  1. Es una app corporativa interna
  2. El backend YA controla limite de dispositivos (no podra conectarse desde otro lugar)
  3. Todos los eventos estan logueados en `auth_logs`
  4. Solo empleados de GLS con email @gls-spain.es pueden acceder

### Seguridad real esta en el backend:
- Control de dispositivos activos
- Validacion de codigos OTP de un solo uso
- Limite de intentos
- Logs de auditoria completos

---

## Punto de Retorno (Backup)

**Backup creado:** `BACKUP_AuthContext_pre_session_expiry_YYYYMMDD_HHMMSS.tsx`

Para revertir:
```bash
cp BACKUP_AuthContext_pre_session_expiry_*.tsx src/contexts/AuthContext.tsx
```

---

## Testing Manual Recomendado

### 1. Verificar mensaje al iniciar sesion con sesion expirada
1. Modificar manualmente `expiresAt` en localStorage a una fecha pasada
2. Recargar la pagina
3. Deberia mostrar mensaje: "Tu sesion ha expirado..."

### 2. Verificar cierre automatico
1. Iniciar sesion normalmente
2. Modificar `expiresAt` en localStorage (Developer Tools > Application > Local Storage)
3. Cambiar la fecha a 1 minuto en el futuro
4. Esperar 61 segundos
5. Deberia cerrar sesion automaticamente y mostrar mensaje

### 3. Verificar que el timer se limpia al hacer logout manual
1. Iniciar sesion
2. Hacer logout manual
3. Verificar en consola que no hay errores
4. Iniciar sesion nuevamente
5. Todo deberia funcionar normalmente

---

## Conclusion

La sesion ahora expira automaticamente exactamente 24 horas despues del login, con una precision de 1 minuto. El usuario es notificado claramente y redirigido al login.
