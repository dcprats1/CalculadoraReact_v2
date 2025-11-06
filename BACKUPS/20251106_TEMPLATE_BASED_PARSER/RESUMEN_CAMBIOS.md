# Implementación del Parser Basado en Plantillas

## Fecha: 2025-11-06

## Problema Identificado

El sistema anterior tenía **desfase acumulativo** porque:
1. Intentaba detectar TODO dinámicamente sin referencia
2. Asumía espaciado uniforme entre filas
3. No usaba el "MAPA DE LECTURA" como guía
4. Las columnas se detectaban incorrectamente
5. Los datos de diferentes páginas/servicios se mezclaban

**Resultado**: Los datos del peso 0-1kg se asociaban con precios de 15-999kg.

## Solución Implementada

### Nuevo Enfoque: Template-Based Extraction

En lugar de adivinar la estructura, ahora **usamos el MAPA DE LECTURA como plantilla exacta**.

### Archivos Nuevos

1. **`gls-2025-template.ts`**
   - Define la estructura exacta del PDF según el MAPA
   - Especifica para cada servicio:
     - Nombre y mapeo a DB
     - Páginas donde aparece
     - Patrones de detección
     - Columnas esperadas (en orden)
     - Zonas esperadas
     - Rangos de peso esperados
     - Si tiene columna "Recogida" inicial

2. **`template-based-extractor.ts`**
   - Extractor completamente nuevo
   - Proceso en 5 pasos:
     1. **Detecta servicio** usando plantilla
     2. **Detecta columna de pesos** (primera columna)
     3. **Detecta bloques de zonas** usando plantilla + búsqueda
     4. **Detecta columnas de datos** usando headers conocidos
     5. **Extrae datos** asociando correctamente peso → zona → columna

### Cambios en Archivos Existentes

- **`index.ts`**:
  - Línea 4: Cambia `GridExtractor` por `TemplateBasedExtractor`
  - Línea 142: Usa `TemplateBasedExtractor.extractFromTable()`

### Estructura de la Plantilla

```typescript
{
  name: "Express 08:30",
  dbName: "Urg8:30H Courier",
  pageNumbers: [4],
  detectionPatterns: [/express\s*0?8\s*:\s*30/i],
  columns: [
    { name: "Recogida", dbSuffix: "_rec_col1", order: 1 },
    { name: "Arrastre", dbSuffix: "_arr", order: 2 },
    { name: "Entrega", dbSuffix: "_ent", order: 3 },
    { name: "Salidas", dbSuffix: "_sal", order: 4 },
    { name: "Recogidas", dbSuffix: "_rec", order: 5 },
    { name: "Interciudad", dbSuffix: "_int", order: 6 }
  ],
  zones: [
    { name: "Provincial", dbPrefix: "provincial" },
    { name: "Regional", dbPrefix: "regional" },
    { name: "Nacional", dbPrefix: "nacional" }
  ],
  weightRanges: [
    { from: "0", to: "1", textPatterns: [/^1\s*[Kk]g\.?$/i] },
    { from: "1", to: "3", textPatterns: [/^3\s*[Kk]g\.?$/i] },
    ...
  ]
}
```

## Ventajas del Nuevo Sistema

✅ **Sin desfase**: Cada peso se asocia con su fila real detectada
✅ **Orden correcto de columnas**: Usa el orden del MAPA
✅ **No mezcla páginas**: Cada servicio sabe en qué páginas buscar
✅ **Validación automática**: Compara detectado vs esperado
✅ **Logs detallados**: Muestra qué encuentra y qué falta
✅ **Mantenible**: Para añadir servicios, solo editar la plantilla

## Orden Correcto de Columnas (según MAPA)

```
Peso | Recogida | Arrastre | Entrega | Salidas | Recogidas | Interciudad | Km
  0       1          2          3         4          5           6         7
```

**Nota**: La columna "Recogida" (col 1) es diferente de "Recogidas" (col 5)

## Ejemplo de Uso de la Plantilla

Cuando el parser encuentra "Express 08:30" en la página 4:

1. **Sabe qué esperar**: 3 zonas (Provincial, Regional, Nacional)
2. **Sabe qué columnas buscar**: Las 6 columnas en orden
3. **Detecta filas de peso dinámicamente**: Busca "1 Kg", "3 Kg", etc.
4. **Asocia correctamente**: Fila con "1 Kg" → datos de 0-1kg

## Próximos Pasos

1. Subir PDF y verificar logs de extracción
2. Confirmar que los datos coinciden con el MAPA
3. Si hay errores, ajustar patrones en la plantilla
4. Añadir servicios de islas (páginas 12-15) a la plantilla

## Archivos de Backup

- `BACKUPS/20251106_TEMPLATE_BASED_PARSER/index_BACKUP.ts`
- `BACKUPS/20251106_TEMPLATE_BASED_PARSER/grid-extractor_BACKUP.ts`
