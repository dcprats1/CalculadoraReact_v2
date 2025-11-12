# Diagnóstico: Recálculo Automático + Descuento Lineal + Logs

**Fecha:** 12 de Noviembre de 2025

## Cambios Implementados

### 1. Restauración Automática de Descuento Lineal ✅

Añadido useEffect que restaura el descuento lineal desde las preferencias del usuario cuando se deselecciona un plan.

**Archivo:** `src/components/TariffCalculator.tsx` (líneas ~1727-1743)

### 2. Logs Exhaustivos de Depuración ✅

Añadidos logs en:
- `planForSelectedService` useMemo (~línea 397)
- `handleDiscountPlanSelection` (~línea 1336)
- useEffect de sincronización (~línea 1441)
- useEffect de plan personalizado (~línea 1488)
- **NUEVO:** useEffect de restauración de descuento lineal (~línea 1732)

### 3. RLS Deshabilitado ✅

La tabla `custom_commercial_plans` ahora es accesible sin restricciones RLS.

## Instrucciones de Uso

### Para Diagnosticar Planes 2026/2025:

1. Abre DevTools (F12) → Pestaña Console
2. Selecciona "Plan Integral 2026" en el desplegable
3. Observa los logs y compártelos

**Logs esperados si funciona:**
```
[handleDiscountPlanSelection] Called with planId: custom-plan-integral-2026-urg8:30h-courier
[handleDiscountPlanSelection] Matching plan found: {id: "...", plan_name: "Plan Integral 2026"}
[planForSelectedService] useMemo recalculated: {result: {...}}
```

**Logs si falla:**
```
[handleDiscountPlanSelection] Matching plan found: undefined
[planForSelectedService] useMemo recalculated: {result: null}
```

### Para Verificar Descuento Lineal:

1. Configura descuento lineal en preferencias (ej: 5%)
2. Dashboard sin plan → Debe mostrar 5%
3. Selecciona plan → Debe cambiar a 0
4. Deselecciona plan → Debe volver a 5%

Los logs mostrarán:
```
[useEffect-restoreLinearDiscount] Restoring linear discount from preferences
```

## Estado

✅ Compilación exitosa
✅ RLS deshabilitado
✅ Logs agregados
⏳ Pendiente verificación con logs de consola
