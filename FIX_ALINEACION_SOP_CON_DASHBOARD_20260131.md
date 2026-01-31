# Fix: Alineación de SOP con Dashboard y Comparador

**Fecha:** 31 de enero de 2026
**Archivo modificado:** `src/utils/calculations.ts`
**Función:** `buildVirtualTariffTable`
**Backup:** `BACKUP_calculations_pre_sop_fix_YYYYMMDD_HHMMSS.ts`

---

## Problema Identificado

El Dashboard y Comparador mostraban precios correctos (ej: 5.04€ con margen 40%), pero al generar el SOP desde estos componentes, los valores eran incorrectos (5.70€ o 5.22€).

**Causa raíz:** La función `buildVirtualTariffTable` (utilizada por SOPGenerator) implementaba una lógica de cálculo diferente a la usada por el Dashboard y Comparador, a pesar de que ambas debían generar los mismos resultados.

---

## Diferencias Encontradas

### 1. Cálculo del Coste Base

**Dashboard/Comparador:**
```typescript
const zoneCost = computeZoneCostForPackage(...);  // Usa resolveTariffCost internamente
const roundedCost = roundUp(zoneCost.cost);       // Redondea el coste base
```

**SOP (antes del fix):**
```typescript
const baseCost = getZoneCostFromTariff(tariff, zone, mode);  // Valor directo, sin interpolación
const referenceValue = baseCost;                              // Sin redondear
```

### 2. Parámetro useIntermediateRounding

**Dashboard/Comparador:**
- NO pasa este parámetro a `calculateCostBreakdown` (valor por defecto: `false`)

**SOP (antes del fix):**
```typescript
calculateCostBreakdown(..., { useIntermediateRounding: true })  // ❌ Aplicaba redondeos extra
```

---

## Solución Implementada

Se modificó `buildVirtualTariffTable` para replicar EXACTAMENTE la misma lógica del Dashboard/Comparador:

### 1. Usar `resolveTariffCost` con interpolación

```typescript
const costField = COST_FIELD_MAP[zone]?.[mode];
const serviceTariffsForZone = tariffsByService.get(tariff.service_name) ?? [tariff];
const weightForCostCalculation = tariff.weight_from;

const baseCostRaw = resolveTariffCost(
  serviceTariffsForZone,
  costField,
  weightForCostCalculation,
  tariff.service_name,
  zone
);
```

**Beneficio:** Calcula correctamente el coste para rangos +1kg con interpolación.

### 2. Aplicar `roundUp` al coste base

```typescript
const roundedBaseCost = roundUp(baseCostRaw);
```

**Beneficio:** Redondea el coste base ANTES de calcular suplementos y descuentos, igual que el Dashboard.

### 3. Eliminar `useIntermediateRounding: true`

```typescript
const breakdown = calculateCostBreakdown(
  roundedBaseCost,
  ...,
  {
    planDiscountAmount,
    energyRate: getEnergyRateForService(tariff.service_name),
    baseOverride,
    isPlusOneRange: isPlusOne,
    arrValue: arrValue,
    serviceName: tariff.service_name
    // ❌ useIntermediateRounding: true  <- ELIMINADO
  }
);
```

**Beneficio:** Elimina redondeos intermedios adicionales que causaban discrepancias.

---

## Verificación de Seguridad

### ✅ Ambas vías de cálculo de descuentos permanecen intactas:

#### 1. Descuento Lineal (Patrón 1)
```typescript
const effectiveLinearDiscount = isPlanActive || hasProvincialOverride ? 0 : linearDiscount;
```
- Se desactiva si hay plan activo o provincial override
- Se pasa correctamente a `calculateCostBreakdown`
- **LÓGICA NO MODIFICADA**

#### 2. Plan de Descuentos (Patrón 2)
```typescript
if (planForService) {
  const resolvedPlanWeight = resolvePlanWeightForTariffRow(...);
  planDiscountAmount = calculatePlanDiscountForWeight(...);
}
```
- Se calcula usando la misma función `calculatePlanDiscountForWeight`
- Se pasa correctamente como `planDiscountAmount` a `calculateCostBreakdown`
- **LÓGICA NO MODIFICADA**

---

## Comportamiento de los Dos Patrones de Descuento

### Patrón 1 - Descuento Lineal
```
Base Bruta (redondeada) → Aplicar suplementos % sobre base bruta → Aplicar descuento lineal → Total
```

### Patrón 2 - Plan de Descuento
```
Base Bruta (redondeada) → Aplicar descuento plan (sobre ARR o COST) → Base Neta → Aplicar suplementos % sobre base neta → Total
```

**Ambos patrones usan ahora el mismo coste base redondeado y el mismo flujo de cálculo.**

---

## Logs Mejorados

Se actualizaron los logs de `sopLog('virtual-row')` para incluir información de depuración:

```typescript
{
  weightUsedForCalculation: weightForCostCalculation,  // Peso usado para calcular coste
  baseCostRaw: baseCostRaw,                            // Coste sin redondear
  baseCostRounded: roundedBaseCost,                    // Coste redondeado
  // ... resto de campos
}
```

---

## Pruebas Sugeridas

### Caso de prueba específico mencionado:
- **Servicio:** Provincial Express 19
- **Peso:** 1 kg
- **Margen:** 40%
- **Resultado esperado:** 5.04€ en Dashboard, Comparador y SOP

### Casos adicionales a probar:
1. Diferentes servicios (Express, Courier, Marítimo)
2. Diferentes zonas (Provincial, Regional, Nacional, Insular)
3. Diferentes pesos (incluyendo rangos +1kg)
4. Con descuento lineal activado
5. Con planes de descuento activados
6. Con Provincial Override activo
7. Múltiples paquetes en Dashboard

---

## Impacto

- **Archivos modificados:** 1 (`src/utils/calculations.ts`)
- **Funciones modificadas:** 1 (`buildVirtualTariffTable`)
- **Funciones eliminadas:** 0
- **Funciones añadidas:** 0
- **Lógica de negocio modificada:** NO (solo alineada)
- **Compilación:** ✅ Exitosa
- **Backups creados:** ✅ Sí

---

## Conclusión

La implementación corrige la discrepancia entre los valores mostrados en Dashboard/Comparador y los generados en el SOP, sin romper ninguna de las dos vías de cálculo de descuentos (lineal y plan). Los tres componentes ahora usan la misma lógica de cálculo de coste base y el mismo flujo de suplementos y descuentos.
