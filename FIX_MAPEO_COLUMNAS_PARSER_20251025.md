# Corrección del Mapeo de Columnas en Parser PDF - 25 Oct 2025

## Resumen

Se corrigió el problema de mapeo incorrecto de valores en el parser de PDF de tarifas GLS. El problema principal era que los valores extraídos del PDF se estaban asignando a los campos incorrectos de la base de datos, particularmente para Business Parcel 1kg Provincial.

## Problema Identificado

**Síntoma:**
- Business Parcel 1kg Provincial mostraba valores incorrectos:
  - `provincial_arr` = 2.18 (debería ser 1.01)
  - `provincial_sal` = 2.18 (correcto)
  - `provincial_rec` = 3.35 (debería ser 2.18)
  - `provincial_int` = null (debería ser 3.35)

**Causa Raíz:**
1. Orden por defecto incorrecto de columnas en línea 671: `["_sal", "_rec", "_int", "_arr"]`
2. Detección de columnas limitada que no escaneaba todo el bloque del servicio
3. Falta de logs detallados para rastrear el mapeo valores → campos

**Estructura Real del PDF:**
```
[Peso] [Recogida_IGNORAR] [Arrastre] [Entrega_IGNORAR] [Salidas] [Recogidas] [Interciudad]
1 Kg.      1,17            1,01          1,17           2,18       2,18        3,35
```

**Índices Correctos:**
- Posición 1 (índice [1]) → Arrastre (_arr)
- Posición 3 (índice [3]) → Salidas (_sal)
- Posición 4 (índice [4]) → Recogidas (_rec)
- Posición 5 (índice [5]) → Interciudad (_int)

**SIEMPRE SE IGNORAN:**
- Posición 0 (índice [0]) → Recogida singular (columna no usada)
- Posición 2 (índice [2]) → Entrega (columna no usada)

## Cambios Implementados

### 1. Corrección del Orden por Defecto de Columnas

**Archivo:** `supabase/functions/parse-pdf-tariff/index.ts`

**Línea 564 y 671:**
```typescript
// ANTES (incorrecto)
return ["_sal", "_rec", "_int", "_arr"];

// AHORA (correcto)
return ["_arr", "_sal", "_rec", "_int"];
```

**Impacto:** Cuando no se detectan cabeceras en el PDF, ahora se usa el orden correcto que coincide con la estructura real del PDF.

### 2. Mejora de la Detección de Columnas

**Función:** `detectColumnsInBlock()`

**Cambios:**
- Ahora escanea TODAS las líneas del bloque del servicio completo
- Eliminado el límite `if (detectedColumns.length >= 4) break;`
- Logs detallados mostrando en qué línea se detectó cada columna
- Mensaje explicativo del orden esperado del PDF

**Antes:**
```typescript
for (const line of block.lines) {
  // ... detección ...
  if (detectedColumns.length >= 4) break; // ← Paraba prematuramente
}
```

**Ahora:**
```typescript
console.log(`[ColumnDetector] Escaneando bloque completo: ${block.lines.length} líneas en total`);
for (let i = 0; i < block.lines.length; i++) {
  const line = block.lines[i];
  // ... detección con log de línea específica ...
}
console.log(`[ColumnDetector] IMPORTANTE: Orden esperado del PDF: [Recogida_IGNORAR, Arrastre, Entrega_IGNORAR, Salidas, Recogidas, Interciudad]`);
```

### 3. Logs Detallados en Extracción de Valores Numéricos

**Función:** `extractNumericValues()`

**Cambios:**
- Log mostrando TODOS los números detectados en la línea
- Log mostrando valores seleccionados (posiciones 1,3,4,5)
- Log explicando el mapeo a campos (_arr, _sal, _rec, _int)
- Warning cuando hay menos de 6 valores

**Logs Añadidos:**
```typescript
console.log(`[NumericExtractor] Todos los números detectados en línea: [${allNumbers.join(', ')}]`);
console.log(`[NumericExtractor] Valores seleccionados (posiciones 1,3,4,5 → _arr,_sal,_rec,_int): [${selected.join(', ')}]`);
console.log(`[NumericExtractor] ⚠ Menos de 6 valores encontrados, retornando todos: [${allNumbers.join(', ')}]`);
```

### 4. Refuerzo de Separación entre Zonas

**Función:** `extractTariffsFromBlock()`

**Cambios:**
- Log explícito cuando cambia de zona: `[ZoneSwitch] Cambiando de zona: Provincial → Regional`
- Warning cuando se detecta peso sin zona asignada
- Contador de warnings por bloque
- Validación que impide asignar valores sin zona definida

**Logs Añadidos:**
```typescript
if (currentZone) {
  console.log(`[ZoneSwitch] Cambiando de zona: ${currentZone} → ${zone}`);
}
console.log(`[Warning] Peso detectado sin zona asignada en línea: "${line.substring(0, 80)}"`);
console.log(`[Extractor] ⚠ Total warnings en este bloque: ${warningCount}`);
```

### 5. Logs Detallados de Mapeo Final

**Función:** `consolidateTariffs()`

**Cambios:**
- Prefijo `[Mapping]` en lugar de `[Consolidator]` para claridad
- Log completo mostrando: servicio, peso, zona, valores extraídos, columnas detectadas
- Log del resultado final del mapeo campo por campo
- Validación de valores sospechosos (ej: _arr > _sal)
- Preview de Business Parcel 1kg Provincial al final

**Logs Añadidos:**
```typescript
console.log(`[Mapping] ${serviceName} | ${peso}kg | Zona: ${zone} | Valores: [${values}] | Columnas: [${columns}]`);
console.log(`[Mapping] Resultado: provincial_arr=1.01, provincial_sal=2.18, provincial_rec=2.18, provincial_int=3.35`);
console.log(`[ValidationWarning] Valor sospechoso: _arr (${arrValue}) > _sal (${salValue}). Continuando...`);
console.log(`[Preview] Business Parcel 1kg Provincial: arr=1.01, sal=2.18, rec=2.18, int=3.35`);
```

### 6. Resumen Final Mejorado

**Función:** `consolidateTariffs()`

**Cambios:**
- Contador de campos rellenados vs NULL
- Preview específico de Business Parcel 1kg Provincial
- Desglose detallado por servicio

**Logs Añadidos:**
```typescript
console.log(`[Consolidator] Total campos rellenados: ${filledFieldsCount}`);
console.log(`[Consolidator] Total campos NULL: ${nullFieldsCount}`);
console.log(`[Preview] Business Parcel 1kg Provincial: arr=${arr}, sal=${sal}, rec=${rec}, int=${int}`);
```

## Modo de Manejo de Errores

**Enfoque Adoptado:** Opción B - Resiliente con Warnings

- Todos los errores/inconsistencias se registran como `[Warning]` o `[ValidationWarning]`
- El parser NUNCA lanza excepciones por datos inconsistentes
- Solo falla por errores técnicos graves (PDF corrupto, problemas de conexión)
- Continua importando lo que pueda incluso con datos imperfectos
- Contador global de warnings al final del proceso

## Resultado Esperado

Después de estos cambios, Business Parcel 1kg Provincial debería mostrar:

```
provincial_arr: 1.01  ✓ (antes: 2.18 ✗)
provincial_sal: 2.18  ✓ (correcto)
provincial_rec: 2.18  ✓ (antes: 3.35 ✗)
provincial_int: 3.35  ✓ (antes: null ✗)
```

## Logs de Diagnóstico

Para verificar que el mapeo es correcto, buscar en los logs:

1. **Detección de columnas:**
   ```
   [ColumnDetector] Escaneando bloque completo: X líneas en total
   [ColumnDetector] Columnas detectadas en orden: [_arr, _sal, _rec, _int]
   ```

2. **Extracción de valores:**
   ```
   [NumericExtractor] Todos los números detectados: [1, 1.17, 1.01, 1.17, 2.18, 2.18, 3.35]
   [NumericExtractor] Valores seleccionados (posiciones 1,3,4,5): [1.01, 2.18, 2.18, 3.35]
   ```

3. **Mapeo final:**
   ```
   [Mapping] Business Parcel | 0-1kg | Zona: provincial | Valores: [1.01, 2.18, 2.18, 3.35] | Columnas: [_arr, _sal, _rec, _int]
   [Mapping] Resultado: provincial_arr=1.01, provincial_sal=2.18, provincial_rec=2.18, provincial_int=3.35
   ```

4. **Preview del resultado:**
   ```
   [Preview] Business Parcel 1kg Provincial: arr=1.01, sal=2.18, rec=2.18, int=3.35
   ```

## Casos de Uso Cubiertos

### Caso 1: PDF con cabeceras claras
- El parser detecta las cabeceras "Arrastre", "Salidas", "Recogidas", "Interciudad"
- Usa ese orden para mapear valores

### Caso 2: PDF sin cabeceras
- El parser usa el orden por defecto corregido: `["_arr", "_sal", "_rec", "_int"]`
- Los valores se extraen en posiciones [1, 3, 4, 5] (ignorando posiciones 0 y 2)

### Caso 3: Menos de 6 valores en una línea
- El parser retorna todos los valores disponibles
- El consolidador mapea lo que puede según el orden de columnas
- Se registra warning si faltan valores esperados

### Caso 4: Valores sospechosos
- Si _arr > _sal o _arr > _rec, se registra `[ValidationWarning]`
- La importación continúa normalmente
- El usuario puede revisar los warnings en los logs

## Próximos Pasos (Futuro)

### Excepciones de Servicios Específicos

Algunos servicios pueden tener estructuras diferentes. Cuando sea necesario, agregar casos especiales:

```typescript
const SERVICE_SPECIFIC_COLUMN_ORDER = {
  "Business Parcel": ["_arr", "_sal", "_rec", "_int"],
  "Express 08:30": ["_arr", "_sal", "_rec", "_int"], // Verificar si es igual
  "Economy Parcel": ["_arr", "_sal", "_rec", "_int"], // Verificar si es igual
  // Agregar excepciones según sea necesario
};
```

## Testing

Para probar la corrección:

1. Subir un PDF de tarifas GLS a través de la UI
2. Revisar los logs en la consola del navegador (buscar prefijos `[ColumnDetector]`, `[NumericExtractor]`, `[Mapping]`, `[Preview]`)
3. Verificar que Business Parcel 1kg Provincial tenga los valores correctos en la base de datos
4. Comprobar el preview final en los logs

## Archivos Modificados

- `supabase/functions/parse-pdf-tariff/index.ts`
  - Función `extractNumericValues()` - Logs añadidos
  - Función `detectColumnsInBlock()` - Mejora de detección y logs
  - Función `extractTariffsFromBlock()` - Separación de zonas y warnings
  - Función `consolidateTariffs()` - Mapeo detallado y validación
  - Líneas 564 y 671 - Orden por defecto corregido

## Verificación del Deployment

Para verificar que la función se desplegó correctamente:

```bash
# El Edge Function debe estar actualizado en Supabase
# Verificar logs en tiempo real durante una importación de PDF
```

## Notas Importantes

1. **SIEMPRE se ignoran las columnas "Recogida" (singular) y "Entrega"**
   - Estas columnas no se usan en el sistema
   - Posiciones 0 y 2 del array de valores

2. **El orden por defecto es crítico**
   - Debe ser: `["_arr", "_sal", "_rec", "_int"]`
   - Coincide con posiciones [1, 3, 4, 5] del PDF

3. **La mayoría de servicios comparten la misma estructura**
   - Business Parcel, Express 08:30, Express 10:30, Economy Parcel, etc.
   - Las excepciones se agregarán cuando sea necesario

4. **Modo resiliente**
   - El parser continúa aunque encuentre inconsistencias
   - Todos los warnings se registran en logs
   - El usuario decide si los datos son aceptables

## Build Status

✓ Build completado exitosamente
✓ Sin errores de TypeScript
✓ Función lista para deployment
