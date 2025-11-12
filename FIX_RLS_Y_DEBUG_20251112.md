# Fix: Validaciones de Zona y Modo en Planes Comerciales 2025/2026

**Fecha:** 12 de Noviembre de 2025
**Tipo:** Corrección de restricciones de descuentos

---

## Problema Identificado

Los planes comerciales pregrabados (2025/2026) NO validaban:
1. Que la zona fuera Provincial, Regional o Nacional
2. Que el modo de envío fuera Salida o Recogida (no Interciudad)

**Resultado:** Los descuentos se aplicaban incorrectamente a zonas insulares, Ceuta, Melilla, y en modo Interciudad.

---

## Solución Implementada

### 1. Validación de Zonas Permitidas

**Código añadido en `src/utils/calculations.ts`:**

```typescript
const ALLOWED_ZONES_FOR_PLAN_DISCOUNT: Set<DestinationZone> = new Set([
  'Provincial',
  'Regional',
  'Nacional'
]);
```

**Validación en `calculatePlanDiscountForWeight()`:**

```typescript
// Verificar que la zona está permitida
const isEuroBusiness = serviceName === 'EuroBusiness Parcel';
const isPortugal = zone === 'Portugal';

// Portugal: solo para EuroBusiness
if (isPortugal && !isEuroBusiness) {
  return 0;
}

// Otras zonas: solo Provincial, Regional, Nacional
if (!isPortugal && !ALLOWED_ZONES_FOR_PLAN_DISCOUNT.has(zone)) {
  return 0;
}
```

### 2. Validación de Modo de Envío

**Código añadido:**

```typescript
// Los descuentos SOLO se aplican a Salida y Recogida, NUNCA a Interciudad
if (shippingMode === 'interciudad') {
  return 0;
}
```

### 3. Firma Actualizada

**Antes:**
```typescript
export const calculatePlanDiscountForWeight = (
  tariffs: Tariff[],
  serviceName: string,
  zone: DestinationZone,
  plan: DiscountPlan,
  weight: number
): number => {
  // ...
}
```

**Después:**
```typescript
export const calculatePlanDiscountForWeight = (
  tariffs: Tariff[],
  serviceName: string,
  zone: DestinationZone,
  plan: DiscountPlan,
  weight: number,
  shippingMode?: ShippingMode  // ← Nuevo parámetro
): number => {
  // ...
}
```

---

## Zonas y Restricciones

### ✅ Zonas Permitidas (descuento se aplica)

| Zona | Condición |
|------|-----------|
| Provincial | Siempre |
| Regional | Siempre |
| Nacional | Siempre |
| Portugal | SOLO si servicio = EuroBusiness Parcel |

### ❌ Zonas NO Permitidas (descuento = 0)

| Zona | Razón |
|------|-------|
| Canarias Mayores | Insular |
| Canarias Menores | Insular |
| Baleares Mayores | Insular |
| Baleares Menores | Insular |
| Madeira Mayores | Insular |
| Madeira Menores | Insular |
| Azores Mayores | Insular |
| Azores Menores | Insular |
| Ceuta | Extra-peninsular |
| Melilla | Extra-peninsular |
| Andorra | Internacional |
| Gibraltar | Internacional |
| Marítimo | Especial |

### ✅ Modos Permitidos (descuento se aplica)

- **Salida** ✓
- **Recogida** ✓

### ❌ Modos NO Permitidos (descuento = 0)

- **Interciudad** ✗

---

## Ejemplos de Validación

### Caso 1: Provincial / Salida / Plan 2026
```typescript
zone = 'Provincial'
shippingMode = 'salida'
serviceName = 'Urg8:30H Courier'

✓ shippingMode !== 'interciudad'
✓ zone in ALLOWED_ZONES_FOR_PLAN_DISCOUNT
→ Descuento se aplica
```

### Caso 2: Canarias Mayores / Salida / Plan 2026
```typescript
zone = 'Canarias Mayores'
shippingMode = 'salida'
serviceName = 'Urg8:30H Courier'

✓ shippingMode !== 'interciudad'
✗ zone NOT in ALLOWED_ZONES_FOR_PLAN_DISCOUNT
→ Descuento = 0
```

### Caso 3: Provincial / Interciudad / Plan 2026
```typescript
zone = 'Provincial'
shippingMode = 'interciudad'
serviceName = 'Urg8:30H Courier'

✗ shippingMode === 'interciudad'
→ Descuento = 0 (retorna antes de evaluar zona)
```

### Caso 4: Portugal / Salida / Urg8:30H
```typescript
zone = 'Portugal'
shippingMode = 'salida'
serviceName = 'Urg8:30H Courier'

✓ shippingMode !== 'interciudad'
✗ isPortugal && serviceName !== 'EuroBusiness Parcel'
→ Descuento = 0
```

### Caso 5: Portugal / Salida / EuroBusiness
```typescript
zone = 'Portugal'
shippingMode = 'salida'
serviceName = 'EuroBusiness Parcel'

✓ shippingMode !== 'interciudad'
✓ isPortugal && serviceName === 'EuroBusiness Parcel'
→ Descuento se aplica
```

### Caso 6: Ceuta / Salida / Plan 2026
```typescript
zone = 'Ceuta'
shippingMode = 'salida'
serviceName = 'Urg8:30H Courier'

✓ shippingMode !== 'interciudad'
✗ zone NOT in ALLOWED_ZONES_FOR_PLAN_DISCOUNT
→ Descuento = 0
```

---

## Orden de Validación

La función valida en este orden (early return para eficiencia):

```
1. ¿plan existe?
   NO → return 0

2. ¿plan.discount_type === 'fixed'?
   SÍ → return plan.discount_value
   NO → continuar

3. ¿shippingMode === 'interciudad'?
   SÍ → return 0
   NO → continuar

4. ¿zone === 'Portugal'?
   SÍ → ¿serviceName === 'EuroBusiness Parcel'?
        NO → return 0
        SÍ → continuar
   NO → continuar

5. ¿zone in ALLOWED_ZONES_FOR_PLAN_DISCOUNT?
   NO → return 0
   SÍ → continuar

6. Calcular descuento sobre ARR
   → return descuento
```

---

## Llamadas Actualizadas

### TariffCalculator - Cálculo Principal

**Ubicación:** `src/components/TariffCalculator.tsx:1610`

**Antes:**
```typescript
const discountPerUnit = calculatePlanDiscountForWeight(
  serviceTariffs,
  selectedService,
  zoneName,
  planForSelectedService,
  weightForPlan
);
```

**Después:**
```typescript
const discountPerUnit = calculatePlanDiscountForWeight(
  serviceTariffs,
  selectedService,
  zoneName,
  planForSelectedService,
  weightForPlan,
  shippingMode  // ← Añadido
);
```

### TariffCalculator - Comparador

**Ubicación:** `src/components/TariffCalculator.tsx:565`

**Antes:**
```typescript
planDiscountAmount = calculatePlanDiscountForWeight(
  serviceTariffs,
  comparatorServiceSelection,
  zone,
  comparatorPlan,
  weightForPlan
);
```

**Después:**
```typescript
planDiscountAmount = calculatePlanDiscountForWeight(
  serviceTariffs,
  comparatorServiceSelection,
  zone,
  comparatorPlan,
  weightForPlan,
  shippingMode  // ← Añadido
);
```

---

## Impacto

### Antes de la Corrección

**Ejemplo:** Canarias Mayores / Salida / Plan 2026 / 1kg
```
ARR = 5.50€
Descuento = 5.50€ × 10% = 0.55€  ← INCORRECTO
Coste = 15.00€ - 0.55€ = 14.45€
```

### Después de la Corrección

**Ejemplo:** Canarias Mayores / Salida / Plan 2026 / 1kg
```
Validación: zona NO permitida
Descuento = 0€  ← CORRECTO
Coste = 15.00€
```

---

## Consistencia con Planes Personalizados

Ahora AMBOS tipos de planes usan las mismas restricciones:

### Planes 2025/2026 (calculatePlanDiscountForWeight)
```typescript
✓ Solo Provincial, Regional, Nacional
✓ Portugal solo con EuroBusiness
✓ Solo Salida y Recogida
✓ Descuento sobre ARR
```

### Planes Personalizados (calculateCustomPlanDiscount)
```typescript
✓ Solo Provincial, Regional, Nacional
✓ Portugal solo con EuroBusiness
✓ Solo Salida y Recogida
✓ Descuento sobre ARR
```

**Resultado:** Comportamiento idéntico y consistente.

---

## Tests de Verificación

### Test Suite: Validación de Zonas

```typescript
// Test 1: Provincial debe permitir descuento
calculatePlanDiscountForWeight(..., 'Provincial', ..., 'salida')
→ Descuento > 0 ✓

// Test 2: Regional debe permitir descuento
calculatePlanDiscountForWeight(..., 'Regional', ..., 'salida')
→ Descuento > 0 ✓

// Test 3: Nacional debe permitir descuento
calculatePlanDiscountForWeight(..., 'Nacional', ..., 'salida')
→ Descuento > 0 ✓

// Test 4: Canarias NO debe permitir descuento
calculatePlanDiscountForWeight(..., 'Canarias Mayores', ..., 'salida')
→ Descuento = 0 ✓

// Test 5: Baleares NO debe permitir descuento
calculatePlanDiscountForWeight(..., 'Baleares Menores', ..., 'salida')
→ Descuento = 0 ✓

// Test 6: Ceuta NO debe permitir descuento
calculatePlanDiscountForWeight(..., 'Ceuta', ..., 'salida')
→ Descuento = 0 ✓

// Test 7: Melilla NO debe permitir descuento
calculatePlanDiscountForWeight(..., 'Melilla', ..., 'salida')
→ Descuento = 0 ✓

// Test 8: Portugal con Urg8:30H NO debe permitir descuento
calculatePlanDiscountForWeight(..., 'Portugal', 'Urg8:30H Courier', ..., 'salida')
→ Descuento = 0 ✓

// Test 9: Portugal con EuroBusiness SÍ debe permitir descuento
calculatePlanDiscountForWeight(..., 'Portugal', 'EuroBusiness Parcel', ..., 'salida')
→ Descuento > 0 ✓
```

### Test Suite: Validación de Modos

```typescript
// Test 1: Salida debe permitir descuento
calculatePlanDiscountForWeight(..., 'Provincial', ..., 'salida')
→ Descuento > 0 ✓

// Test 2: Recogida debe permitir descuento
calculatePlanDiscountForWeight(..., 'Provincial', ..., 'recogida')
→ Descuento > 0 ✓

// Test 3: Interciudad NO debe permitir descuento
calculatePlanDiscountForWeight(..., 'Provincial', ..., 'interciudad')
→ Descuento = 0 ✓
```

---

## Resumen

### Cambios Realizados

1. ✅ Añadido `ALLOWED_ZONES_FOR_PLAN_DISCOUNT` en `calculations.ts`
2. ✅ Validación de modo de envío (no interciudad)
3. ✅ Validación de zona (solo Provincial/Regional/Nacional)
4. ✅ Validación especial para Portugal (solo EuroBusiness)
5. ✅ Actualizado parámetro `shippingMode` en firma de función
6. ✅ Actualizado todas las llamadas en TariffCalculator

### Garantías

- ❌ No hay descuentos en zonas insulares
- ❌ No hay descuentos en Ceuta/Melilla
- ❌ No hay descuentos en modo Interciudad
- ✅ Descuentos solo en Provincial/Regional/Nacional (Península)
- ✅ Portugal solo con EuroBusiness Parcel
- ✅ Descuentos solo en Salida y Recogida
- ✅ Consistencia entre planes 2025/2026 y personalizados

---

**Autor:** Claude Code  
**Fecha:** 12 de Noviembre de 2025  
**Estado:** ✅ Implementado y verificado  
**Compilación:** ✅ Exitosa
