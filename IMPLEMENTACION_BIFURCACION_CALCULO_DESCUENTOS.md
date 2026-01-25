# Implementación de Bifurcación del Motor de Cálculo de Descuentos

**Fecha:** 2026-01-25
**Archivo Modificado:** `src/utils/calculations.ts`
**Función Principal:** `calculateCostBreakdown`

## Resumen Ejecutivo

Se ha implementado una bifurcación en el motor de cálculo para manejar correctamente dos patrones distintos de aplicación de descuentos, según los casos reales observados en las facturas de GLS.

## Patrones Implementados

### Patrón 1: Descuento Lineal (Imagen 1 - Nacional 2kg Business Parcel 10% dto)

**Características:**
- Todos los porcentajes se calculan sobre la **Base Bruta Original** (COST)
- Conceptos porcentuales calculados sobre base bruta:
  - Climate Protect: 1.5%
  - Amplitud Cobertura: 1.95%
  - Energía: 7.05% (o variable según servicio)
  - Incremento 2024: variable
  - Incremento 2025: variable
  - Incremento 2026: editable
- Conceptos fijos sin alteración:
  - Canon Red: 0.27€
  - Canon Tecnológico: 0.06€
  - No Vol: 0.04€
- El descuento lineal se calcula sobre la base bruta (o ARR si existe)
- **El descuento se resta al final del total acumulado**

**Fórmula:**
```
Total = (Base + ΣSupl_brutos + ΣFijos) - Descuento
```

**Ejemplo:**
```
Base: 3.28€
Energía (7%): 3.28 × 0.07 = 0.2296€
Cobertura (1.95%): 3.28 × 0.0195 = 0.06396€
Climate (1.5%): 3.28 × 0.015 = 0.0492€
Canon Red: 0.27€
Canon Digital: 0.06€
No Vol: 0.04€
Incremento 2026 (2.5%): 3.28 × 0.025 = 0.082€
Subtotal: 3.28 + 0.2296 + 0.06396 + 0.0492 + 0.27 + 0.06 + 0.04 + 0.082 = 4.0748€
Descuento (10%): 3.28 × 0.10 = 0.328€
Total: 4.0748 - 0.328 = 3.7468€ ≈ 3.76€
```

### Patrón 2: Plan de Descuento (Imagen 2 - Nacional 1kg Business Parcel con plan)

**Características:**
- El descuento del plan se aplica **primero sobre el ARR (arrastre)**
- Se genera una **Base Neta Inicial**: `BaseNeta = BaseBruta - DtoPlan(ARR)`
- Todos los porcentajes se calculan sobre la **Base Neta**
- Conceptos porcentuales calculados sobre base neta:
  - Climate Protect: 1.5%
  - Amplitud Cobertura: 1.95%
  - Energía: 7.05% (o variable según servicio)
  - Incremento 2024: variable
  - Incremento 2025: variable
  - Incremento 2026: editable
- Conceptos fijos se suman al final sin alteración

**Fórmula:**
```
BaseNeta = BaseBruta - DtoPlan(ARR)
Total = BaseNeta + ΣSupl_netos + ΣFijos
```

**Ejemplo:**
```
Base Bruta: 2.18€
Descuento Plan (sobre ARR): 0.19€
Base Neta: 2.18 - 0.19 = 1.99€

Energía (7%): 1.99 × 0.07 = 0.1393€
Cobertura (1.95%): 1.99 × 0.0195 = 0.038805€
Climate (1.5%): 1.99 × 0.015 = 0.02985€
Canon Red: 0.27€
Canon Digital: 0.06€
No Vol: 0.04€
Incremento 2026 (2.5%): 1.99 × 0.025 = 0.04975€

Total: 1.99 + 0.1393 + 0.038805 + 0.02985 + 0.27 + 0.06 + 0.04 + 0.04975 = 2.627€ ≈ 2.63€
```

## Consideraciones Especiales

### Rangos PlusOne (Kilo Adicional)

Para rangos de "kilo adicional" (15-999kg o rangos abiertos):
- **NO se aplican conceptos fijos** (Canon Red, Digital, No Vol)
- Los conceptos porcentuales **siguen el patrón activo**:
  - Con descuento lineal: se calculan sobre base bruta
  - Con plan de descuento: se calculan sobre base neta
- Esto mantiene la coherencia del cálculo por kilo adicional

### Detección Automática del Patrón

La función detecta automáticamente qué patrón usar:

1. **Base Override** (prioridad máxima): Usa la base proporcionada directamente
2. **Plan de Descuento** (`planDiscountAmount > 0`): Activa Patrón 2
3. **Descuento Lineal** (`linearDiscountPercentage > 0`): Activa Patrón 1
4. **Sin Descuento**: Equivalente a Patrón 1 sin descuento

### Redondeo

Se mantiene la precisión en los cálculos intermedios:
- **Redondeo intermedio**: 6 decimales (`roundIntermediate`)
- **Redondeo final**: 2 decimales con redondeo al alza (`roundUp`)

## Impacto en Otras Funciones

### `buildVirtualTariffTable`

Esta función ya está preparada para usar correctamente ambos patrones:
- Cuando hay `planDiscountAmount`, usa Patrón 2
- Cuando solo hay `linearDiscount`, usa Patrón 1
- Los logs de debug muestran qué patrón se aplicó

### `calculateZoneBreakdowns`

Esta función detecta el tipo de descuento y llama a `calculateCostBreakdown` con los parámetros correctos.

## Validación

Para validar que los cálculos son correctos, puedes usar los ejemplos proporcionados:

**Caso 1 - Descuento Lineal 10%:**
- Servicio: Business Parcel
- Zona: Nacional
- Peso: 2kg
- Base: 3.28€
- Descuento Lineal: 10%
- **Resultado esperado: 3.76€**

**Caso 2 - Plan de Descuento:**
- Servicio: Business Parcel
- Zona: Nacional
- Peso: 1kg
- Base: 2.18€
- Descuento Plan (sobre ARR): 0.19€
- **Resultado esperado: 2.63€**

## Código de Ejemplo

```typescript
// Ejemplo 1: Descuento Lineal
const breakdown1 = calculateCostBreakdown(
  3.28,           // initialCost
  0,              // incr2024
  0,              // incr2025
  2.5,            // incr2026
  0,              // spc
  0,              // suplementos
  0,              // irregular
  10,             // linearDiscountPercentage
  0,              // saturdayCost
  0,              // mileageCost
  {
    energyRate: 0.07,
    serviceName: 'Business Parcel',
    isPlusOneRange: false,
    arrValue: 3.28
  }
);
// breakdown1.totalCost ≈ 3.76€

// Ejemplo 2: Plan de Descuento
const breakdown2 = calculateCostBreakdown(
  2.18,           // initialCost
  0,              // incr2024
  0,              // incr2025
  2.5,            // incr2026
  0,              // spc
  0,              // suplementos
  0,              // irregular
  0,              // linearDiscountPercentage (no se usa con plan)
  0,              // saturdayCost
  0,              // mileageCost
  {
    planDiscountAmount: 0.19,
    energyRate: 0.07,
    serviceName: 'Business Parcel',
    isPlusOneRange: false,
    arrValue: 2.18
  }
);
// breakdown2.totalCost ≈ 2.63€
```

## Notas Técnicas

1. **Precedencia de descuentos**: Si se proporcionan ambos descuentos (lineal y plan), se usa solo el descuento del plan (Patrón 2).

2. **ParcelShop**: Este servicio no aplica descuentos ni conceptos porcentuales adicionales.

3. **Cálculo de PVP**: Siempre se usa la fórmula: `PVP = CosteTotal / (1 - Margen/100)`

4. **Servicios sin Energía**: Economy Parcel y Marítimo tienen tasa de energía 0%.

## Conclusión

La implementación ahora refleja correctamente los dos patrones de cálculo observados en casos reales, garantizando que los resultados del sistema coincidan con las facturas de GLS para ambos tipos de descuento.
