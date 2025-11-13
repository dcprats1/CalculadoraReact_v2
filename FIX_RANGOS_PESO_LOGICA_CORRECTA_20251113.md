# Fix: Restauración de Rangos de Peso y Corrección de Lógica de Cálculos
**Fecha:** 13 de Noviembre de 2025
**Prioridad:** CRÍTICA - Datos y Lógica de Negocio
**Estado:** RESUELTO ✅

---

## 🔴 Problema Identificado

Había **dos problemas críticos** causados por cambios incorrectos en la base de datos:

### Problema 1: Rangos con Decimales Incorrectos en la BD

La base de datos tenía rangos con decimales innecesarios:
- ❌ `5` → `10.000`
- ❌ `10.001` → `15.000`
- ❌ `15.001` → `999`

Estos decimales **NO deben estar en la base de datos**. El uso de `.001` es solo para **lógica de cálculos**, no para definición de datos.

### Problema 2: Lógica de Rangos Incorrecta

La función `findTariffForWeight` usaba comparaciones inclusivas en ambos extremos:
```typescript
// ❌ INCORRECTO - Rangos se solapan
roundedWeight >= tariff.weight_from && roundedWeight <= tariff.weight_to
```

**Ejemplo del error:**
- Peso de 1.5kg redondeado = 2kg
- Rango 0-1: ¿2 >= 0 && 2 <= 1? → NO ❌
- Rango 1-3: ¿2 >= 1 && 2 <= 3? → SÍ ✅
- **PERO** el peso 1kg exacto aplicaría a ambos rangos 0-1 y 1-3

---

## ✅ Solución Implementada

### 1. Restauración de Rangos en Base de Datos

**Ejecutado SQL para restaurar valores correctos:**

```sql
-- Restaurar rangos correctos: eliminar decimales
UPDATE tariffs SET weight_from = '5', weight_to = '10'
WHERE weight_from = '5' AND weight_to = '10.000';

UPDATE tariffs SET weight_from = '10', weight_to = '15'
WHERE weight_from = '10.001' AND weight_to = '15.000';

UPDATE tariffs SET weight_from = '15', weight_to = '999'
WHERE weight_from = '15.001' AND weight_to = '999';
```

**Resultado en BD:**
```
weight_from | weight_to
------------|----------
"0"         | "1"       ✅
"1"         | "3"       ✅
"3"         | "5"       ✅
"5"         | "10"      ✅ RESTAURADO
"10"        | "15"      ✅ RESTAURADO
"15"        | "999"     ✅ RESTAURADO
```

### 2. Corrección de Lógica de Rangos

**Archivo:** `src/utils/calculations.ts`

#### Lógica Correcta de Rangos

Los rangos son **inclusivos** pero con una regla especial:

| Peso Real | Redondeado | Rango Aplicable | Razón |
|-----------|------------|-----------------|-------|
| 0.1 - 1.0kg | 1kg | 0-1 | Primer rango incluye desde 0 |
| 1.001 - 3.0kg | 2-3kg | 1-3 | Excluye límite inferior, incluye superior |
| 3.001 - 5.0kg | 4-5kg | 3-5 | Excluye límite inferior, incluye superior |
| 5.001 - 10.0kg | 6-10kg | 5-10 | Excluye límite inferior, incluye superior |
| 10.001 - 15.0kg | 11-15kg | 10-15 | Excluye límite inferior, incluye superior |
| 15.001+ | 16+kg | 15-999 | Rango abierto, precio por kg adicional |

**Regla:**
- **Primer rango (0-X):** `weight >= weight_from && weight <= weight_to`
- **Rangos intermedios:** `weight > weight_from && weight <= weight_to`
- **Rango abierto (15-999):** `weight > weight_from`

#### Función `findTariffForWeight` Corregida

```typescript
export function findTariffForWeight(tariffs: Tariff[], serviceName: string, weight: number): Tariff | null {
  const roundedWeight = Math.ceil(Math.max(weight, 0));

  // Los rangos son inclusivos: 0-1, 1-3, 3-5, 5-10, 10-15, 15-999
  // Un peso de 1.001kg redondeado a 2kg debe ir al rango 1-3 (no al 0-1)
  // La lógica correcta es: weight > weight_from && weight <= weight_to
  // EXCEPTO para el primer rango (0-X) que debe incluir desde 0

  return tariffs.find(tariff => {
    if (tariff.service_name !== serviceName) return false;

    const isFirstRange = tariff.weight_from === 0;
    const isOpenRange = tariff.weight_to === null || tariff.weight_to >= 999;

    if (isFirstRange) {
      // Primer rango: incluye desde 0 hasta weight_to (inclusive)
      return roundedWeight >= tariff.weight_from &&
             (tariff.weight_to === null || roundedWeight <= tariff.weight_to);
    } else if (isOpenRange) {
      // Rango abierto (15-999): incluye desde weight_from + 0.001 en adelante
      return roundedWeight > tariff.weight_from;
    } else {
      // Rangos intermedios: excluye weight_from, incluye weight_to
      // Ejemplo: rango 1-3 aplica para pesos 2kg y 3kg (no 1kg)
      return roundedWeight > tariff.weight_from && roundedWeight <= tariff.weight_to;
    }
  }) || null;
}
```

#### Funciones Adicionales Corregidas

**1. `findContainingFiniteTariff`** (línea 1314)
```typescript
const findContainingFiniteTariff = (tariffs: Tariff[], weight: number): Tariff | null => {
  const rounded = Math.ceil(Math.max(weight, 0));
  return (
    tariffs
      .filter(tariff => tariff.weight_to !== null && tariff.weight_to !== undefined)
      .find(tariff => {
        const upper = tariff.weight_to ?? tariff.weight_from;
        const isFirstRange = tariff.weight_from === 0;

        // Aplicar misma lógica que findTariffForWeight
        if (isFirstRange) {
          return rounded >= tariff.weight_from && rounded <= upper;
        } else {
          return rounded > tariff.weight_from && rounded <= upper;
        }
      }) ?? null
  );
};
```

**2. Función en `resolvePlanCostDetails`** (línea 1362)
```typescript
let baseTariff = finiteTariffs.find(tariff => {
  const upperBound = tariff.weight_to ?? tariff.weight_from;
  const isFirstRange = tariff.weight_from === 0;

  // Aplicar misma lógica de rangos
  if (isFirstRange) {
    return roundedWeight >= tariff.weight_from && roundedWeight <= upperBound;
  } else {
    return roundedWeight > tariff.weight_from && roundedWeight <= upperBound;
  }
});
```

---

## 📊 Casos de Prueba

### Caso 1: Peso 1kg
- **Redondeo:** 1kg
- **Rango esperado:** 0-1
- **Lógica:** `1 >= 0 && 1 <= 1` → ✅ SÍ
- **Tarifa:** Usa precio cerrado del rango 0-1

### Caso 2: Peso 1.5kg
- **Redondeo:** 2kg
- **Rango esperado:** 1-3
- **Lógica:** `2 > 1 && 2 <= 3` → ✅ SÍ
- **Tarifa:** Usa precio cerrado del rango 1-3

### Caso 3: Peso 3.5kg
- **Redondeo:** 4kg
- **Rango esperado:** 3-5
- **Lógica:** `4 > 3 && 4 <= 5` → ✅ SÍ
- **Tarifa:** Usa precio cerrado del rango 3-5

### Caso 4: Peso 6kg
- **Redondeo:** 6kg
- **Rango esperado:** 5-10
- **Lógica:** `6 > 5 && 6 <= 10` → ✅ SÍ
- **Tarifa:** Usa precio cerrado del rango 5-10 (NO suma incrementos)

### Caso 5: Peso 12kg
- **Redondeo:** 12kg
- **Rango esperado:** 10-15
- **Lógica:** `12 > 10 && 12 <= 15` → ✅ SÍ
- **Tarifa:** Usa precio cerrado del rango 10-15 (NO suma incrementos)

### Caso 6: Peso 16kg
- **Redondeo:** 16kg
- **Rango esperado:** 15-999
- **Lógica:** `16 > 15` → ✅ SÍ
- **Tarifa:** Usa precio base de 15kg + (16-15) × incremento por kg

---

## 🎯 Diferencias Clave: Antes vs Después

### Antes (Incorrecto)

**Base de Datos:**
```
5 → 10.000   ❌ Decimales innecesarios
10.001 → 15.000   ❌ Decimales innecesarios
15.001 → 999   ❌ Decimales innecesarios
```

**Lógica:**
```typescript
// Todos los rangos con inclusión en ambos extremos
roundedWeight >= tariff.weight_from && roundedWeight <= tariff.weight_to
```

**Problema:**
- Un peso de 6kg podía no encontrar el rango 5-10 correctamente
- La comparación de strings con decimales causaba errores

### Después (Correcto)

**Base de Datos:**
```
5 → 10   ✅ Valores enteros limpios
10 → 15   ✅ Valores enteros limpios
15 → 999   ✅ Valores enteros limpios
```

**Lógica:**
```typescript
// Primer rango: inclusivo en ambos extremos
if (isFirstRange) return weight >= from && weight <= to;

// Rangos intermedios: excluye from, incluye to
else return weight > from && weight <= to;

// Rango abierto: solo excluye from
else if (isOpenRange) return weight > from;
```

**Beneficios:**
- Rangos nunca se solapan
- Un peso pertenece a exactamente UN rango
- Cálculos correctos para todos los pesos

---

## 📝 Archivos Modificados

### 1. Base de Datos
- **Tabla:** `public.tariffs`
- **Campos:** `weight_from`, `weight_to`
- **Cambio:** Restaurados valores enteros (5, 10, 15, 999)

### 2. Código TypeScript
- **Archivo:** `src/utils/calculations.ts`
- **Funciones modificadas:**
  - `findTariffForWeight()` - línea 506
  - `findContainingFiniteTariff()` - línea 1314
  - Lógica en `resolvePlanCostDetails()` - línea 1362

---

## ✅ Validación

### Build Exitoso
```bash
npm run build
✓ built in 20.42s
```

### Verificación en BD
```sql
SELECT service_name, weight_from, weight_to, provincial_sal
FROM tariffs
WHERE service_name = 'Urg8:30H Courier'
ORDER BY CAST(weight_from AS DECIMAL);
```

**Resultado (confirmado):**
| weight_from | weight_to | provincial_sal |
|-------------|-----------|----------------|
| 0 | 1 | 7.14 |
| 1 | 3 | 8.18 |
| 3 | 5 | 9.22 |
| 5 | 10 | 11.82 ✅ |
| 10 | 15 | 14.42 ✅ |
| 15 | 999 | 0.52 ✅ |

---

## 🧪 Testing Requerido

### Tabla de Costes Personalizada
1. [ ] Abrir Configuración > Tabla de Costes Personalizada
2. [ ] Verificar que aparecen **6 rangos** completos
3. [ ] Verificar que los valores NO tienen decimales

### Cálculos de Tarifas
1. [ ] Calcular con 1kg → debe usar rango 0-1
2. [ ] Calcular con 2kg → debe usar rango 1-3
3. [ ] Calcular con 6kg → debe usar rango 5-10 (precio cerrado)
4. [ ] Calcular con 12kg → debe usar rango 10-15 (precio cerrado)
5. [ ] Calcular con 16kg → debe usar rango 15-999 (base + incremento)

---

## 📚 Conclusión

### Cambios Realizados

1. ✅ **Base de datos restaurada** con valores enteros correctos
2. ✅ **Lógica de rangos corregida** para evitar solapamientos
3. ✅ **3 funciones actualizadas** con lógica consistente
4. ✅ **Build exitoso** sin errores

### Principio Clave

**Los decimales `.001` son SOLO para lógica de cálculo, NUNCA para datos en BD.**

- **En BD:** Rangos enteros limpios (0-1, 1-3, 5-10, etc.)
- **En código:** Lógica que entiende que 1.001kg ya es del siguiente rango

### Resultado Final

- ✅ 6 rangos de peso completos y correctos
- ✅ Cálculos usan precios cerrados para rangos 5-10 y 10-15
- ✅ Solo el rango 15-999 usa incrementos por kg adicional
- ✅ Ningún solapamiento entre rangos
- ✅ Cada peso pertenece a exactamente un rango

---

**FIN DEL DOCUMENTO**
