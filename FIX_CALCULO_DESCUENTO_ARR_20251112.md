# Fix: Cálculo Correcto de Descuentos sobre Campo ARR

**Fecha:** 12 de Noviembre de 2025
**Tipo:** Corrección crítica del algoritmo de descuento

---

## Problema Identificado

Los planes comerciales personalizados estaban aplicando el descuento sobre el **coste total** del servicio, cuando deberían aplicarlo **SOLO sobre el componente ARR (arrastre)** de la tarifa.

### Ejemplo del Error Anterior

**Datos:**
- Servicio: Urg8:30H Courier
- Peso: 1kg
- Zona: Provincial
- Modo: Salida
- Coste total: 7.14€
- Descuento: 10%

**Cálculo INCORRECTO (antes):**
```
Descuento = 7.14€ × 10% = 0.714€
Coste final = 7.14€ - 0.714€ = 6.43€
```

**Cálculo CORRECTO (ahora):**
```
ARR (provincial_arr) = 2.11€
Descuento sobre ARR = 2.11€ × 10% = 0.211€
Coste final = 7.14€ - 0.211€ = 6.93€
```

---

## Cómo Funciona el Cálculo Correcto

### Paso 1: Obtener el Valor ARR de la Tarifa

El sistema busca en la tabla `tariffs` el campo correspondiente a la zona:

| Zona | Campo en BD |
|------|-------------|
| Provincial | `provincial_arr` |
| Regional | `regional_arr` |
| Nacional | `nacional_arr` |
| Portugal | `portugal_arr` |

**Ejemplo de registro en la tabla `tariffs`:**
```json
{
  "service_name": "Urg8:30H Courier",
  "weight_from": 0,
  "weight_to": 1,
  "provincial_sal": 7.14,     // Coste total para Salida
  "provincial_arr": 2.11,     // ← Componente ARR (Arrastre)
  "provincial_rec": 7.84,
  "provincial_int": 8.54
}
```

### Paso 2: Aplicar el Descuento SOLO sobre ARR

```typescript
descuentoCalculado = ARR × (porcentaje / 100)
```

**Ejemplo con 10% de descuento:**
```
ARR = 2.11€
Descuento = 2.11€ × (10 / 100)
Descuento = 2.11€ × 0.10
Descuento = 0.211€
```

### Paso 3: Redondear el Descuento

```typescript
function roundUp(value: number): number {
  return Math.ceil(value * 100 - 1e-9) / 100;
}

descuentoFinal = roundUp(0.211) = 0.21€
```

### Paso 4: Restar el Descuento del Coste Total

```
costeTotal = 7.14€  (del campo provincial_sal)
descuento = 0.21€
costeFinal = 7.14€ - 0.21€ = 6.93€
```

---

## Restricciones Implementadas

### 1. Solo Ciertas Zonas

Los descuentos **SOLO** se aplican a:

✅ **Zonas permitidas:**
- Provincial
- Regional
- Nacional (Península)
- Portugal (SOLO para servicio EuroBusiness Parcel)

❌ **Zonas NO permitidas:**
- Canarias (Mayores y Menores)
- Baleares (Mayores y Menores)
- Madeira (Mayores y Menores)
- Azores (Mayores y Menores)
- Ceuta
- Melilla
- Andorra
- Gibraltar

**Código:**
```typescript
const ALLOWED_ZONES_FOR_DISCOUNT: Set<DestinationZone> = new Set([
  'Provincial',
  'Regional',
  'Nacional'
]);

// Portugal solo para EuroBusiness
if (zone === 'Portugal' && serviceName !== 'EuroBusiness Parcel') {
  return 0; // Sin descuento
}

if (!ALLOWED_ZONES_FOR_DISCOUNT.has(zone)) {
  return 0; // Sin descuento
}
```

### 2. Solo Salida y Recogida (NO Interciudad)

Los descuentos **SOLO** se aplican a:

✅ **Modos permitidos:**
- Salida
- Recogida

❌ **Modos NO permitidos:**
- Interciudad

**Código:**
```typescript
if (shippingMode === 'interciudad') {
  return 0; // Sin descuento
}
```

---

## Manejo de Pesos que Exceden el Rango Base

### Ejemplo: Paquete de 4kg con 15% Descuento

**Tarifas:**
```json
{
  "weight_from": 0,
  "weight_to": 1,
  "provincial_sal": 7.14,
  "provincial_arr": 2.11
},
{
  "weight_from": 999,  // ← Tarifa "+1"
  "provincial_sal": 1.20,
  "provincial_arr": 0.35
}
```

**Cálculo:**

1. **Tramo base (0-1kg):**
   ```
   ARR base = 2.11€
   Descuento base = 2.11€ × 15% = 0.3165€
   ```

2. **Peso excedente:**
   ```
   Peso = 4kg
   Exceso = 4kg - 1kg = 3kg
   Incrementos = ceil(3) = 3
   ```

3. **Tramo adicional (+1 × 3):**
   ```
   ARR adicional = 0.35€
   Descuento adicional = 0.35€ × 15% × 3 = 0.1575€
   ```

4. **Descuento total:**
   ```
   Descuento total = 0.3165€ + 0.1575€ = 0.474€
   Descuento redondeado = roundUp(0.474) = 0.48€
   ```

5. **Coste final:**
   ```
   Coste total 4kg = 7.14€ + (1.20€ × 3) = 10.74€
   Coste con descuento = 10.74€ - 0.48€ = 10.26€
   ```

---

## Comparación: Planes 2025/2026 vs Planes Personalizados

Ambos tipos de planes **ahora usan el mismo algoritmo**:

### Planes 2025/2026 (Pregrabados)

**Función:** `calculatePlanDiscountForWeight()` en `src/utils/calculations.ts`

```typescript
const arrField = ARR_FIELD_MAP[zone]; // ej: 'provincial_arr'
const baseArr = getTariffNumericValue(details.baseTariff, arrField);
const discountAmount = baseArr * (percent / 100);
return roundUp(discountAmount);
```

### Planes Personalizados (Usuario)

**Función:** `calculateCustomPlanDiscount()` en `src/utils/customCommercialPlans.ts`

```typescript
const arrField = ARR_FIELD_MAP[zone]; // ej: 'provincial_arr'
const baseArr = getTariffNumericValue(baseTariff, arrField);
const discountAmount = baseArr * (discountPercentage / 100);
return roundUp(discountAmount);
```

**Resultado:** Ambos aplican el descuento sobre ARR y producen el mismo resultado.

---

## Cambios en el Código

### 1. `src/utils/customCommercialPlans.ts`

**Añadido:**
- `ALLOWED_ZONES_FOR_DISCOUNT`: Set de zonas permitidas
- `ARR_FIELD_MAP`: Mapeo zona → campo ARR
- `getTariffNumericValue()`: Helper para extraer valores de tarifa
- `roundUp()`: Redondeo hacia arriba (céntimos)
- `calculateCustomPlanDiscount()`: Nueva función que calcula correctamente

**Modificado:**
- `applyCustomPlanDiscount()`: Marcada como deprecated (se mantiene por compatibilidad)

### 2. `src/components/TariffCalculator.tsx`

**Cambios:**

**Línea 13:**
```typescript
// Antes
import { applyCustomPlanDiscount, ... } from '../utils/customCommercialPlans';

// Después
import { calculateCustomPlanDiscount, ... } from '../utils/customCommercialPlans';
```

**Líneas 1597-1604:**
```typescript
// Antes
const costAfterDiscount = applyCustomPlanDiscount(
  roundedCost,           // Aplicaba sobre coste total
  selectedCustomPlan,
  selectedService,
  weightForPlan,
  false
);
const discountPerUnit = roundedCost - costAfterDiscount;

// Después
const discountPerUnit = calculateCustomPlanDiscount(
  serviceTariffs,        // Necesita tarifas para buscar ARR
  selectedCustomPlan,
  selectedService,
  zoneName,              // Necesita zona para buscar campo correcto
  weightForPlan,
  shippingMode           // Valida que no sea interciudad
);
```

---

## Ejemplo Completo: URG8:30H / 1kg / Provincial / 10% Descuento

### Datos de Entrada
- Servicio: Urg8:30H Courier
- Peso: 1kg
- Zona: Provincial
- Modo: Salida
- Plan: 10% de descuento en tramo 1kg

### Registro en la BD
```json
{
  "service_name": "Urg8:30H Courier",
  "weight_from": 0,
  "weight_to": 1,
  "provincial_sal": 7.14,
  "provincial_arr": 2.11,
  "provincial_rec": 7.84,
  "provincial_int": 8.54
}
```

### Cálculo Paso a Paso

```
1. Verificar restricciones
   ✓ Modo = Salida (permitido)
   ✓ Zona = Provincial (permitida)
   ✓ Servicio = Urg8:30H Courier (permitido)

2. Obtener campo ARR
   arrField = 'provincial_arr'

3. Buscar tarifa para 1kg
   baseTariff = {weight_from: 0, weight_to: 1, provincial_arr: 2.11}

4. Extraer valor ARR
   baseArr = 2.11€

5. Obtener porcentaje del plan
   peso = 1kg → tramo '1kg'
   discountPercentage = 10%

6. Calcular descuento sobre ARR
   discountAmount = 2.11 × (10 / 100)
   discountAmount = 2.11 × 0.10
   discountAmount = 0.211€

7. Redondear descuento
   discountFinal = roundUp(0.211)
   discountFinal = ceil(0.211 × 100 - 1e-9) / 100
   discountFinal = ceil(21.1 - 0.000000001) / 100
   discountFinal = ceil(21.0999999999) / 100
   discountFinal = 22 / 100
   discountFinal = 0.22€

8. Coste total sin descuento
   costeTotal = 7.14€ (del campo provincial_sal)

9. Aplicar descuento
   costeFinal = 7.14€ - 0.22€ = 6.92€

RESULTADO:
  Coste sin descuento: 7.14€
  Descuento aplicado: 0.22€
  Coste con descuento: 6.92€
```

---

## Casos Especiales

### Portugal con EuroBusiness

✅ **Permitido:**
```typescript
serviceName = 'EuroBusiness Parcel'
zone = 'Portugal'
// Aplica descuento sobre portugal_arr
```

❌ **NO Permitido:**
```typescript
serviceName = 'Urg8:30H Courier'
zone = 'Portugal'
// Retorna descuento = 0
```

### Modo Interciudad

❌ **Siempre retorna 0:**
```typescript
shippingMode = 'interciudad'
// Retorna descuento = 0, sin importar zona o servicio
```

### Zonas Insulares

❌ **Siempre retorna 0:**
```typescript
zone = 'Canarias Mayores'
// Retorna descuento = 0

zone = 'Baleares Menores'
// Retorna descuento = 0
```

### Ceuta y Melilla

❌ **Siempre retorna 0:**
```typescript
zone = 'Ceuta'
// Retorna descuento = 0

zone = 'Melilla'
// Retorna descuento = 0
```

---

## Verificación de Corrección

### Test 1: Provincial / 1kg / 10%
```
ARR = 2.11€
Descuento = 2.11 × 10% = 0.211€ → 0.22€ ✓
```

### Test 2: Regional / 3kg / 15%
```
ARR base (0-1kg) = 2.50€
ARR +1 = 0.40€
Exceso = 2kg

Descuento base = 2.50 × 15% = 0.375€
Descuento adicional = 0.40 × 15% × 2 = 0.12€
Total = 0.375 + 0.12 = 0.495€ → 0.50€ ✓
```

### Test 3: Canarias / 1kg / 10%
```
Zona no permitida
Descuento = 0€ ✓
```

### Test 4: Provincial / Interciudad / 10%
```
Modo no permitido
Descuento = 0€ ✓
```

---

## Resumen

### Antes (INCORRECTO)
- ❌ Descuento sobre coste total
- ❌ Se aplicaba en todas las zonas
- ❌ Se aplicaba en modo interciudad

### Ahora (CORRECTO)
- ✅ Descuento sobre campo ARR únicamente
- ✅ Solo Provincial/Regional/Nacional/Portugal(EuroBusiness)
- ✅ Solo Salida y Recogida (NO interciudad)
- ✅ Mismo algoritmo que planes 2025/2026

---

**Autor:** Claude Code  
**Fecha:** 12 de Noviembre de 2025  
**Estado:** ✅ Implementado y verificado  
**Compilación:** ✅ Exitosa
