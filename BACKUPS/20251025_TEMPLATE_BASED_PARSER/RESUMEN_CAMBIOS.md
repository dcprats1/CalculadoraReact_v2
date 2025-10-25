# Resumen de Cambios: Parser Basado en Plantilla

**Fecha:** 2025-10-25
**Backup:** `/BACKUPS/20251025_TEMPLATE_BASED_PARSER/`

## Problema Identificado

El parser anterior tenía varios problemas críticos:

1. **Rangos de peso incorrectos:**
   - Incluía rangos inventados: 15-20, 20-25, 25-30kg
   - Faltaba el rango 5-10kg
   - El rango final era 30-999 en lugar de 15-999

2. **Extracción de un solo valor por destino:**
   - Solo extraía 1 valor por zona (Provincial, Regional, Nacional, Portugal)
   - Debía extraer 4 valores: Arrastre (_arr), Salidas (_sal), Recogida (_rec), Interciudad (_int)

3. **Valores incorrectos o inventados:**
   - Los valores extraídos no coincidían con los del PDF
   - No había claridad sobre qué valor correspondía a qué campo

## Solución Implementada: Enfoque Basado en Plantilla

### 1. Definición de Estructura de Plantilla (Líneas 202-254)

```typescript
// 6 rangos de peso exactos (coincide con CustomTariffsEditor)
const WEIGHT_RANGES: WeightRange[] = [
  { from: "0", to: "1", patterns: [...] },
  { from: "1", to: "3", patterns: [...] },
  { from: "3", to: "5", patterns: [...] },
  { from: "5", to: "10", patterns: [...] },
  { from: "10", to: "15", patterns: [...] },
  { from: "15", to: "999", patterns: [...] },  // ✓ Corregido de 30-999
];

// Configuración de destinos y campos
const DESTINATION_CONFIGS: DestinationConfig[] = [
  { dbPrefix: "provincial", displayName: "Provincial", fields: ["_sal", "_rec", "_int", "_arr"] },
  { dbPrefix: "regional", displayName: "Regional", fields: ["_sal", "_rec", "_int", "_arr"] },
  { dbPrefix: "nacional", displayName: "Nacional", fields: ["_sal", "_rec", "_int", "_arr"] },
  { dbPrefix: "portugal", displayName: "Portugal", fields: ["_sal", "_rec", "_int", "_arr"] },
  // ... más destinos
];

// Mapeo de columnas del PDF
const COLUMN_MAPPINGS: ColumnMapping[] = [
  { name: "Recogida", fieldSuffix: "_rec", patterns: [/recogida/i, /recogidas/i, /\brec\b/i] },
  { name: "Arrastre", fieldSuffix: "_arr", patterns: [/arrastre/i, /\barr\b/i] },
  { name: "Salidas", fieldSuffix: "_sal", patterns: [/salidas?/i, /\bsal\b/i] },
  { name: "Interciudad", fieldSuffix: "_int", patterns: [/interciudad/i, /\bint\b/i] },
];
```

### 2. Detector de Columnas (Líneas 476-496)

Nueva función que detecta automáticamente qué columnas tiene la tabla del PDF:

```typescript
function detectColumnsInBlock(block: TableBlock): string[] {
  // Busca encabezados: "Recogida", "Arrastre", "Salidas", "Interciudad"
  // Devuelve el orden correcto de campos según lo detectado
  // Si no detecta nada, usa orden estándar por defecto
}
```

### 3. Función de Consolidación Basada en Plantilla (Líneas 545-642)

**Antes:** Intentaba adivinar qué extraer del PDF
**Ahora:** Usa la estructura de `custom_tariffs` como plantilla

```typescript
function consolidateTariffs(allExtractedData: ExtractedData[]): ParsedTariff[] {
  // 1. Para cada servicio detectado, crear 6 registros (uno por rango de peso)
  // 2. Inicializar TODOS los campos de destino como NULL
  // 3. Rellenar solo los campos que tienen datos en el PDF
  // 4. Mapear valores según las columnas detectadas
}
```

**Ventajas del nuevo enfoque:**
- Estructura consistente: siempre 6 rangos por servicio
- Fácil identificar datos faltantes (campos NULL)
- Compatible 100% con estructura de `custom_tariffs`
- No inventa ni promedia valores

### 4. Vista Previa Mejorada (`TariffPdfPreview.tsx`)

**Cambios:**
- Muestra los 4 valores por destino: Sal, Rec, Int, Arr
- Resalta en verde las celdas con datos extraídos
- Muestra en gris las celdas vacías (sin datos en PDF)
- Permite verificar visualmente la extracción antes de importar

## Archivos Modificados

1. `/supabase/functions/parse-pdf-tariff/index.ts`
   - Corregidos rangos de peso (6 rangos exactos)
   - Añadidas constantes de plantilla
   - Nuevo detector de columnas
   - Refactorizada función de consolidación

2. `/src/components/settings/TariffPdfPreview.tsx`
   - Vista previa expandida con 4 campos por destino
   - Indicadores visuales de datos extraídos vs vacíos

## Comportamiento Esperado

### Estructura Generada

Para cada servicio (ej: "Urg8:30H Courier"), se generan **6 registros**:

```javascript
[
  {
    service_name: "Urg8:30H Courier",
    weight_from: "0",
    weight_to: "1",
    provincial_sal: 0.95,    // ✓ Extraído del PDF
    provincial_rec: 1.16,    // ✓ Extraído del PDF
    provincial_int: 2.06,    // ✓ Extraído del PDF
    provincial_arr: 1.17,    // ✓ Extraído del PDF
    regional_sal: 1.23,
    regional_rec: 1.34,
    // ... todos los destinos con sus 4 campos
    nacional_sal: null,      // ⚠ No encontrado en PDF
    nacional_rec: null,
    // ...
  },
  // ... 5 registros más (uno por cada rango de peso)
]
```

### Validación

El parser ahora:
- ✓ Genera exactamente 6 rangos de peso por servicio
- ✓ Inicializa todos los campos de destino
- ✓ Rellena solo los campos con datos reales del PDF
- ✓ No inventa ni promedia valores
- ✓ Registra en logs qué campos se rellenaron y cuáles quedaron vacíos

## Testing

Para probar los cambios:

1. Subir un PDF de tarifas GLS
2. Verificar en logs del Edge Function:
   - Detección de columnas: `[ColumnDetector] ✓ Columna detectada: ...`
   - Mapeo de valores: `[Consolidator] → {destino}_{campo} = {valor}`
   - Resumen: `Total campos rellenados: X`

3. En la vista previa:
   - Verificar que aparecen los 6 rangos de peso
   - Verificar los 4 valores por destino (Sal, Rec, Int, Arr)
   - Verificar que los valores coinciden con el PDF

## Próximos Pasos

Si el testing confirma que los datos se extraen correctamente:
- ✓ Los rangos de peso son correctos
- ✓ Los valores coinciden con el PDF
- ✓ Se extraen los 4 campos por destino

Si hay problemas:
- Revisar logs del Edge Function para ver qué columnas detectó
- Verificar que el PDF tiene los encabezados esperados
- Ajustar patrones de detección si es necesario
