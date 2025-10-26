# Resumen de Cambios: Fix Row Displacement en PDF Parser

## Fecha
2025-10-26

## Problema Detectado

El parser PDF de tarifas GLS presentaba un desplazamiento vertical de 4 filas que aumentaba incrementalmente a través del documento. Los datos de la fila 1 (rango 0-1kg) se cargaban con valores de la fila 5 (rango 10-15kg), indicando un error acumulativo en la detección de filas de datos.

### Causa Raíz Identificada

La función `classifyRowsByZone` (líneas 668-787) acumulaba errores en el cálculo de `startRowIndex` al procesar cada zona secuencialmente. El problema ocurría en la lógica que busca la primera fila de datos después de detectar un encabezado de zona:

1. El bucle `while` incrementaba `nextDataRowIndex` cuando los patrones de peso no coincidían exactamente
2. No había límite en cuántas filas se podían saltar
3. Los patrones de peso eran demasiado estrictos, causando que filas válidas se saltaran
4. El error se acumulaba progresivamente entre zonas

## Cambios Implementados

### 1. Mejora de Patrones de Peso (líneas 314-389)

**Antes:**
```typescript
{
  from: "0",
  to: "1",
  patterns: [
    /^1\s*Kg\.?/i,
    /^1\s*kg\.?/i,
    /^\s*1\s+Kg/i,
    /^1$/
  ]
}
```

**Después:**
```typescript
{
  from: "0",
  to: "1",
  patterns: [
    /^1\s*Kg\.?/i,
    /^1\s*kg\.?/i,
    /^\s*1\s+Kg/i,
    /^1$/,
    /\b1\s*kg\b/i,      // Nuevo: busca en cualquier posición
    /^0\s*-\s*1/i       // Nuevo: detecta formato "0-1"
  ]
}
```

**Beneficios:**
- Detecta más variaciones de formato de peso
- Reduce falsos negativos en la detección de filas de datos
- Patrones más flexibles para manejar diferentes estilos de documento

### 2. Límite de Filas Saltadas (líneas 715-771)

**Antes:**
```typescript
let nextDataRowIndex = i + 1;
while (nextDataRowIndex < sortedRows.length) {
  // ... lógica de detección ...

  if (hasWeightPattern || hasNumericData) {
    break;
  }

  nextDataRowIndex++; // Sin límite
}
```

**Después:**
```typescript
let nextDataRowIndex = i + 1;
let skippedRows = 0;
const maxSkipRows = 2;

while (nextDataRowIndex < sortedRows.length && skippedRows < maxSkipRows) {
  // ... lógica de detección ...

  if (nextRowText.length === 0) {
    console.log(`[Clasificador Zonas]       ✗ Fila vacía, saltando`);
    nextDataRowIndex++;
    skippedRows++;
    continue;
  }

  // ... más lógica ...

  if ((hasWeightPattern || hasNumericData) && !looksLikeHeader) {
    break;
  }

  nextDataRowIndex++;
  skippedRows++;
}

if (skippedRows >= maxSkipRows) {
  console.log(`[Clasificador Zonas]     ⚠ ADVERTENCIA: Se alcanzó límite de filas saltadas`);
}
```

**Beneficios:**
- Previene saltos excesivos que causan desplazamiento
- Máximo de 2 filas saltadas por zona
- Logging detallado para debugging

### 3. Detección Mejorada de Datos Numéricos (línea 734)

**Antes:**
```typescript
const hasNumericData = nextItems.some(item => {
  const parsed = parseNumber(item.str);
  return parsed !== null && parsed > 0;
});
```

**Después:**
```typescript
const numericItems = nextItems.filter(item => {
  const parsed = parseNumber(item.str);
  return parsed !== null && parsed > 0;
});
const hasNumericData = numericItems.length >= 2;
```

**Beneficios:**
- Requiere al menos 2 valores numéricos para confirmar fila de datos
- Reduce falsos positivos de filas de encabezado con un solo número
- Más robusto contra variaciones de formato

### 4. Filtro de Encabezados (línea 741)

**Nuevo:**
```typescript
const looksLikeHeader = /kg|peso|weight|tarifa|rate|provincial|regional|nacional|zone/i.test(nextRowText);

if ((hasWeightPattern || hasNumericData) && !looksLikeHeader) {
  console.log(`[Clasificador Zonas]     → Primera fila de datos confirmada en índice ${nextDataRowIndex}`);
  break;
}
```

**Beneficios:**
- Excluye filas que claramente son encabezados de tabla
- Previene que encabezados sean tratados como datos
- Mejora precisión en la detección

### 5. Validación de Conteo de Filas (líneas 802-809)

**Nuevo:**
```typescript
detectedZones.forEach((zone, idx) => {
  const rowCount = zone.endRowIndex - zone.startRowIndex + 1;
  console.log(`[Clasificador Zonas]   ${idx + 1}. ${zone.zoneName}: índices ${zone.startRowIndex}-${zone.endRowIndex} (${rowCount} filas)`);
  if (rowCount < WEIGHT_RANGES.length) {
    console.log(`[Clasificador Zonas]      ⚠ ADVERTENCIA: Se esperaban ${WEIGHT_RANGES.length} filas, pero solo hay ${rowCount}`);
  }
});
```

**Beneficios:**
- Detecta automáticamente cuando falta información
- Facilita debugging de problemas de extracción
- Valida que cada zona tenga las 6 filas esperadas

## Resultados Esperados

1. **Eliminación del desplazamiento**: Los datos de cada rango de peso se mapean correctamente
2. **Extracción precisa**: Cada zona (Provincial, Regional, Nacional) tiene exactamente 6 filas
3. **Mejor diagnóstico**: Logging mejorado facilita identificar problemas
4. **Mayor robustez**: Patrones más flexibles manejan variaciones de formato

## Testing

Para verificar la corrección:

1. Importar PDF de tarifas GLS 2025
2. Verificar que Business Parcel fila 0-1kg tenga valores correctos de 0-1kg
3. Verificar que no haya warnings de filas faltantes en console
4. Confirmar que cada servicio importe 18 filas (3 zonas × 6 rangos de peso)

## Archivos Modificados

- `/supabase/functions/parse-pdf-tariff/index.ts`
  - Líneas 314-389: Patrones de peso mejorados
  - Líneas 715-771: Lógica de búsqueda de primera fila con límite
  - Líneas 802-809: Validación de conteo de filas

## Backup

Los archivos originales están respaldados en:
- `/BACKUPS/20251026_FIX_ROW_DISPLACEMENT/index_BACKUP.ts`
- `/BACKUPS/20251026_FIX_ROW_DISPLACEMENT/backup_timestamp.txt`
