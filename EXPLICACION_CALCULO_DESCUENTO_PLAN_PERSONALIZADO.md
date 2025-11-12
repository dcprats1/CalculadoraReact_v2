# Explicación: Cómo se Aplica el Descuento de un Plan Comercial Personalizado

**Fecha:** 12 de Noviembre de 2025

---

## Resumen Rápido

Cuando aplicas un **15% de descuento en el tramo 1kg** de un plan comercial personalizado, el cálculo es:

```
Coste con descuento = Coste base × (1 - 15/100)
Coste con descuento = Coste base × 0.85
```

**Ejemplo:**
- Coste base: 10.50€
- Descuento: 15%
- Coste con descuento: 10.50€ × 0.85 = **8.93€**

---

## Flujo Completo del Cálculo

### 1. Obtener el Coste Base (Sin Descuentos)

**Archivo:** `src/utils/calculations.ts` → función `computeZoneCostForPackage()`

**Pasos:**

#### A) Calcular el peso final del paquete
```typescript
// Si tiene dimensiones, calcula peso volumétrico
volumetricWeight = (altura × ancho × largo) / factor_conversión

// Usa el mayor entre peso real y peso volumétrico
finalWeight = Math.max(peso_real, volumetricWeight || 0)
```

#### B) Redondear el peso hacia arriba
```typescript
roundedWeight = Math.ceil(finalWeight)
```

#### C) Buscar la tarifa aplicable en la base de datos

El sistema busca en la tabla `tariffs` según:
- Servicio (ej: "Urg8:30H Courier")
- Zona (ej: "Nacional")
- Modo de envío (ej: "salida")
- Rango de peso

**Ejemplo de tarifa:**
```json
{
  "service_name": "Urg8:30H Courier",
  "weight_from": 0,
  "weight_to": 1,
  "nacional_sal": 8.50,  // ← Coste base para este rango
  "nacional_rec": 9.20,
  "nacional_int": 10.00
}
```

#### D) Calcular coste según rango

**Si peso está dentro del rango:**
```typescript
cost = tariff.nacional_sal  // Ejemplo: 8.50€
```

**Si peso excede el rango base:**
```typescript
// Busca la tarifa "+1" (peso_from = 999)
plusOneTariff = tariffs.find(t => t.weight_from === 999)

// Calcula incrementos
extraWeight = roundedWeight - baseThreshold
increments = Math.ceil(extraWeight / step)
cost = baseCost + (increments × plusOneTariff.nacional_sal)
```

**Ejemplo:**
- Peso: 3kg
- Rango base: 0-1kg = 8.50€
- Exceso: 3 - 1 = 2kg
- Incrementos: ceil(2 / 1) = 2
- +1 por kg: 1.20€
- **Coste total: 8.50€ + (2 × 1.20€) = 10.90€**

#### E) Redondear el coste hacia arriba (céntimos)

```typescript
export const roundUp = (value: number): number => {
  return Math.ceil(value * 100 - 0.000000001) / 100;
};
```

**Ejemplo:**
- Valor: 10.8949€
- Multiplicar por 100: 1089.49
- Ceil: 1090
- Dividir por 100: **10.90€**

**Resultado de esta fase:**
```
roundedCost = 10.90€  // Coste base SIN descuentos
```

---

### 2. Obtener el Porcentaje de Descuento del Plan

**Archivo:** `src/utils/customCommercialPlans.ts` → función `getCustomPlanDiscountForWeight()`

**Pasos:**

#### A) Mapear el nombre del servicio
```typescript
const SERVICE_NAME_MAP = {
  'Urg8:30H Courier': 'Express8:30',
  'Urg10H Courier': 'Express10:30',
  // ...
};

mappedService = 'Express8:30'
```

#### B) Determinar el tramo de peso

```typescript
if (weight <= 1) {
  discountKey = '1kg';
} else if (weight <= 3) {
  discountKey = '3kg';
} else if (weight <= 5) {
  discountKey = '5kg';
} else if (weight <= 10) {
  discountKey = '10kg';
} else if (weight <= 15) {
  discountKey = '15kg';
} else {
  discountKey = 'additional';
}
```

**Ejemplos:**
- Peso 0.8kg → `'1kg'`
- Peso 1kg → `'1kg'`
- Peso 2.5kg → `'3kg'`
- Peso 12kg → `'15kg'`
- Peso 20kg → `'additional'`

#### C) Obtener el descuento del plan

```typescript
const serviceDiscounts = plan.discounts.domestic[mappedService];
const discountPercentage = serviceDiscounts[discountKey] || 0;
```

**Ejemplo de estructura del plan:**
```json
{
  "plan_name": "Mi Plan Q1 2025",
  "discounts": {
    "domestic": {
      "Express8:30": {
        "1kg": 15,      // ← 15% de descuento hasta 1kg
        "3kg": 12,      // 12% de descuento hasta 3kg
        "5kg": 10,
        "10kg": 8,
        "15kg": 5,
        "additional": 3
      }
    }
  }
}
```

**Resultado de esta fase:**
```
discountPercentage = 15  // Para peso <= 1kg
```

---

### 3. Aplicar el Descuento al Coste Base

**Archivo:** `src/utils/customCommercialPlans.ts` → función `applyCustomPlanDiscount()`

```typescript
export function applyCustomPlanDiscount(
  baseCost: number,
  plan: CommercialPlan | null,
  serviceName: string,
  weight: number,
  isInternational: boolean = false
): number {
  if (!plan || baseCost === 0) return baseCost;

  // 1. Obtener porcentaje de descuento (paso 2)
  const discountPercentage = getCustomPlanDiscountForWeight(plan, serviceName, weight);
  
  if (discountPercentage === 0) return baseCost;

  // 2. Calcular cantidad de descuento
  const discountAmount = baseCost * (discountPercentage / 100);
  
  // 3. Restar del coste base
  return Math.max(0, baseCost - discountAmount);
}
```

**Cálculo detallado:**

```typescript
// Entrada
baseCost = 10.90€
discountPercentage = 15

// Paso 1: Calcular cantidad de descuento
discountAmount = 10.90 × (15 / 100)
discountAmount = 10.90 × 0.15
discountAmount = 1.635€

// Paso 2: Restar del coste base
costAfterDiscount = 10.90 - 1.635
costAfterDiscount = 9.265€

// Paso 3: Asegurar no negativo
costAfterDiscount = Math.max(0, 9.265)
costAfterDiscount = 9.265€
```

**Resultado de esta fase:**
```
costAfterDiscount = 9.265€
```

---

### 4. Calcular el Descuento Total para Múltiples Paquetes

**Archivo:** `src/components/TariffCalculator.tsx` → dentro de `calculatedValues`

```typescript
if (selectedCustomPlan) {
  const weightForPlan = zoneCost.finalWeight ?? pkg.weight ?? 0;
  
  // Aplicar descuento (paso 3)
  const costAfterDiscount = applyCustomPlanDiscount(
    roundedCost,           // 10.90€
    selectedCustomPlan,
    selectedService,
    weightForPlan,         // 0.8kg
    false
  );
  
  // Calcular descuento por unidad
  const discountPerUnit = roundedCost - costAfterDiscount;
  // discountPerUnit = 10.90 - 9.265 = 1.635€
  
  // Multiplicar por cantidad
  if (discountPerUnit > 0) {
    planDiscountTotal += discountPerUnit * quantity;
    // Si quantity = 5:
    // planDiscountTotal += 1.635 × 5 = 8.175€
  }
}
```

**Ejemplo con múltiples paquetes:**

| Paquete | Peso | Cantidad | Coste Base | Descuento % | Coste c/Desc | Descuento Total |
|---------|------|----------|------------|-------------|--------------|-----------------|
| 1       | 0.8kg| 5        | 10.90€     | 15%         | 9.27€        | 8.15€           |
| 2       | 2.5kg| 3        | 12.40€     | 12%         | 10.91€       | 4.47€           |
| 3       | 7kg  | 2        | 18.50€     | 8%          | 17.02€       | 2.96€           |

**Total de descuentos:** 8.15€ + 4.47€ + 2.96€ = **15.58€**

---

## Resumen del Flujo Completo

```
PASO 1: Calcular Coste Base
  ↓
  peso_real = 0.8kg
  peso_final = max(0.8, peso_volumétrico)
  peso_redondeado = ceil(0.8) = 1kg
  ↓
  Buscar en tariffs: weight_from=0, weight_to=1, nacional_sal=8.50€
  ↓
  roundedCost = roundUp(8.50) = 8.50€

PASO 2: Obtener Descuento del Plan
  ↓
  peso = 0.8kg → tramo '1kg'
  servicio = 'Urg8:30H Courier' → 'Express8:30'
  ↓
  discountPercentage = plan.discounts.domestic.Express8:30['1kg'] = 15%

PASO 3: Aplicar Descuento
  ↓
  discountAmount = 8.50 × (15 / 100) = 1.275€
  costAfterDiscount = 8.50 - 1.275 = 7.225€
  ↓
  discountPerUnit = 8.50 - 7.225 = 1.275€

PASO 4: Multiplicar por Cantidad
  ↓
  quantity = 5
  totalDiscount = 1.275 × 5 = 6.375€
  
RESULTADO FINAL:
  Coste sin descuento: 8.50€ × 5 = 42.50€
  Descuento aplicado: 6.375€
  Coste con descuento: 42.50€ - 6.375€ = 36.125€
```

---

## Características Importantes

### 1. El Descuento se Aplica DESPUÉS del Redondeo
```
✓ Correcto: roundUp(8.50) × 0.85 = 8.50€ × 0.85 = 7.23€
✗ Incorrecto: roundUp(8.50 × 0.85) = roundUp(7.225) = 7.23€
```

En este caso da igual, pero importa cuando hay decimales:
```
Coste base: 8.4949€
✓ roundUp(8.4949) × 0.85 = 8.50€ × 0.85 = 7.23€
✗ roundUp(8.4949 × 0.85) = roundUp(7.22) = 7.22€
```

### 2. El Descuento se Basa en el Peso Final (Volumétrico si Aplica)
```typescript
weightForPlan = zoneCost.finalWeight ?? pkg.weight
// Si peso volumétrico = 1.5kg y peso real = 0.8kg
// weightForPlan = 1.5kg → usa tramo '3kg' (12% descuento)
```

### 3. Los Tramos son Inclusivos por la Izquierda
```
weight <= 1   → '1kg'    (incluye 0.01 hasta 1.00)
weight <= 3   → '3kg'    (incluye 1.01 hasta 3.00)
weight <= 5   → '5kg'    (incluye 3.01 hasta 5.00)
```

### 4. El Descuento NO se Redondea Individualmente
```typescript
// El descuento se calcula con precisión decimal
discountAmount = 10.90 × 0.15 = 1.635€  // No se redondea

// Solo el coste FINAL se muestra redondeado en la UI
// Pero los cálculos internos mantienen la precisión
```

---

## Ejemplo Completo: Paquete de 0.8kg con 15% Descuento

### Datos de Entrada
- Servicio: Urg8:30H Courier
- Zona: Nacional
- Modo: Salida
- Peso real: 0.8kg
- Sin dimensiones (sin peso volumétrico)
- Cantidad: 1 paquete
- Plan: "Mi Plan Q1" con 15% descuento en tramo 1kg

### Cálculo Paso a Paso

```
1. Peso final
   peso_final = max(0.8, undefined) = 0.8kg
   peso_redondeado = ceil(0.8) = 1kg

2. Tarifa base (desde base de datos)
   nacional_sal para 0-1kg = 8.50€

3. Coste base redondeado
   roundedCost = roundUp(8.50) = 8.50€

4. Porcentaje de descuento
   peso = 0.8kg → tramo '1kg'
   descuento = 15%

5. Aplicar descuento
   discountAmount = 8.50 × 0.15 = 1.275€
   costAfterDiscount = 8.50 - 1.275 = 7.225€

6. Descuento por unidad
   discountPerUnit = 8.50 - 7.225 = 1.275€

7. Multiplicar por cantidad
   totalDiscount = 1.275 × 1 = 1.275€

RESULTADO:
  Coste original: 8.50€
  Descuento: 1.28€ (redondeado para UI)
  Coste final: 7.23€ (redondeado para UI)
```

---

## Código Relevante

### Función Principal de Aplicación de Descuento

**Ubicación:** `src/utils/customCommercialPlans.ts`

```typescript
export function applyCustomPlanDiscount(
  baseCost: number,              // Coste base SIN descuento
  plan: CommercialPlan | null,   // Plan personalizado del usuario
  serviceName: string,           // "Urg8:30H Courier", etc.
  weight: number,                // Peso final del paquete
  isInternational: boolean = false
): number {
  if (!plan || baseCost === 0) return baseCost;

  let discountPercentage: number;

  if (isInternational) {
    discountPercentage = getCustomPlanDiscountForInternational(plan, serviceName, weight);
  } else {
    discountPercentage = getCustomPlanDiscountForWeight(plan, serviceName, weight);
  }

  if (discountPercentage === 0) return baseCost;

  // Fórmula clave:
  const discountAmount = baseCost * (discountPercentage / 100);
  return Math.max(0, baseCost - discountAmount);
}
```

---

**Autor:** Claude Code  
**Fecha:** 12 de Noviembre de 2025  
**Nota:** Este documento explica el comportamiento ACTUAL del sistema. No se han realizado cambios en el código.
