# Fix: PDF Parser Row Skipping Issue
**Fecha:** 26 de octubre de 2025
**Backup:** `/BACKUPS/20251026_FIX_ROW_SKIPPING/`

## Problema Identificado

El parser de PDF estaba saltando las primeras 6 filas de datos inmediatamente después de los encabezados únicos de cada bloque ("Recogida, Arrastre, Entrega, Salidas, Recogidas, Interciudad"). Esto se debía a que el límite de filas saltadas (`maxSkipRows`) estaba configurado en solo 2 filas, lo cual era insuficiente para manejar la estructura del documento donde:

1. Aparece el encabezado de zona (Provincial, Regional, Nacional) como encabezado lateral
2. Aparecen los encabezados de columna de costes (Recogida, Arrastre, Entrega, Salidas, Recogidas, Interciudad)
3. Finalmente aparecen las 6 filas de datos correspondientes a los rangos de peso (0-1kg, 1-3kg, 3-5kg, 5-10kg, 10-15kg, +15kg)

## Cambios Implementados

### 1. Aumento del Límite de Filas Saltadas
**Archivo:** `supabase/functions/parse-pdf-tariff/index.ts`
**Línea:** 729

```typescript
// ANTES:
const maxSkipRows = 2;

// DESPUÉS:
const maxSkipRows = 8;
```

Este cambio permite que el parser examine hasta 8 filas después del encabezado de zona para encontrar la primera fila de datos válida.

### 2. Mejora de la Detección de Encabezados de Columna
**Archivo:** `supabase/functions/parse-pdf-tariff/index.ts`
**Líneas:** 767-768, 779-791

```typescript
// Se añadió detección específica para encabezados de columna:
const looksLikeHeader = /kg|peso|weight|tarifa|rate|provincial|regional|nacional|zone|recogida|recog|arrastre|arr|entrega|entr|salidas|salid|interciudad|inter/i.test(nextRowText);
const isColumnHeader = /recogida|recog|arrastre|arr|entrega|entr|salidas|salid|interciudad|inter/i.test(nextRowText);

// Se añadió lógica específica para saltar encabezados de columna:
if (isColumnHeader) {
  console.log(`[Clasificador Zonas]       → Saltando encabezado de columna (${skippedRows + 1}/${maxSkipRows})`);
  nextDataRowIndex++;
  skippedRows++;
  continue;
}
```

### 3. Validación Mejorada del Primer Rango de Peso
**Archivo:** `supabase/functions/parse-pdf-tariff/index.ts`
**Líneas:** 759, 773-796

```typescript
// Se añadió verificación específica para el primer rango de peso (0-1kg):
const hasFirstWeightPattern = WEIGHT_RANGES[0].patterns.some(pattern => pattern.test(nextRowText));

// Se añadió lógica prioritaria para confirmar el primer rango:
if (hasFirstWeightPattern && hasNumericData) {
  console.log(`[Clasificador Zonas]     ✓✓ Primera fila de datos CONFIRMADA en índice ${nextDataRowIndex} (0-1kg con datos numéricos)`);
  break;
}
```

### 4. Logging Mejorado y Detallado
**Archivo:** `supabase/functions/parse-pdf-tariff/index.ts`
**Líneas:** 731, 737, 740, 770-784

Se añadieron logs detallados que muestran:
- Qué fila se está evaluando y su contenido
- Si se detecta un patrón de peso y cuál
- Si es el primer rango de peso (0-1kg)
- Si se detectan encabezados de columna
- Cuántos valores numéricos se encuentran
- Por qué se salta o acepta cada fila

### 5. Validación Post-Procesamiento Mejorada
**Archivo:** `supabase/functions/parse-pdf-tariff/index.ts`
**Líneas:** 843-849

```typescript
if (rowCount < WEIGHT_RANGES.length) {
  console.log(`[Clasificador Zonas]      ⚠⚠ ADVERTENCIA CRÍTICA: Se esperaban ${WEIGHT_RANGES.length} filas de peso, pero solo hay ${rowCount}`);
  console.log(`[Clasificador Zonas]      ⚠⚠ Esto indica que se están saltando filas de datos. Verifica el inicio en índice ${zone.startRowIndex}`);
} else if (rowCount === WEIGHT_RANGES.length) {
  console.log(`[Clasificador Zonas]      ✓✓ PERFECTO: Número correcto de filas (${WEIGHT_RANGES.length})`);
} else {
  console.log(`[Clasificador Zonas]      ℹ Se encontraron ${rowCount} filas (${rowCount - WEIGHT_RANGES.length} más de lo esperado)`);
}
```

### 6. Tratamiento Especial de Filas Vacías
**Archivo:** `supabase/functions/parse-pdf-tariff/index.ts`
**Líneas:** 739-743

```typescript
// Las filas vacías ahora se saltan sin contar para el límite:
if (nextRowText.length === 0) {
  console.log(`[Clasificador Zonas]       ✗ Fila vacía - saltando (no cuenta para límite)`);
  nextDataRowIndex++;
  continue;  // No incrementa skippedRows
}
```

## Impacto Esperado

Este fix debería resolver completamente el problema de las filas saltadas. Ahora el parser:

1. ✅ Puede examinar hasta 8 filas después del encabezado de zona
2. ✅ Detecta y salta correctamente los encabezados de columna (Recogida, Arrastre, etc.)
3. ✅ Identifica específicamente el primer rango de peso (0-1kg) para confirmar el inicio correcto
4. ✅ Valida que tenga datos numéricos antes de aceptar una fila como inicio
5. ✅ Proporciona logs detallados para diagnosticar cualquier problema
6. ✅ Verifica que cada zona tenga exactamente 6 filas de datos

## Cómo Probar

1. Sube un PDF de tarifas GLS (como "TARIFA RED_2025_ARRASTRE_PLANO(2).pdf")
2. Revisa los logs en la consola del navegador
3. Verifica que:
   - Se detecten correctamente los encabezados de columna y se salten
   - La primera fila de datos detectada corresponda al rango 0-1kg
   - Cada zona tenga exactamente 6 filas de datos
   - Los valores extraídos correspondan a los valores correctos del PDF
   - Los logs muestren "✓✓ PERFECTO: Número correcto de filas (6)" para cada zona

## Archivos Modificados

- `supabase/functions/parse-pdf-tariff/index.ts` - Función `classifyRowsByZone` y validación post-procesamiento

## Archivos de Backup

- `BACKUPS/20251026_FIX_ROW_SKIPPING/index_BACKUP.ts` - Backup del parser antes del fix
- `BACKUPS/20251026_FIX_ROW_SKIPPING/backup_timestamp.txt` - Timestamp del backup
- `BACKUPS/20251026_FIX_ROW_SKIPPING/RESUMEN_CAMBIOS.md` - Este archivo

## Próximos Pasos

Si este fix no resuelve completamente el problema, considera:

1. Revisar los logs detallados para ver en qué índice se está iniciando cada zona
2. Verificar que los patrones de peso en `WEIGHT_RANGES` detecten correctamente "1 Kg", "3 Kg", etc.
3. Ajustar el límite `maxSkipRows` si la estructura del documento requiere saltar más filas
4. Refinar los patrones de detección de encabezados de columna si hay variaciones en el texto
