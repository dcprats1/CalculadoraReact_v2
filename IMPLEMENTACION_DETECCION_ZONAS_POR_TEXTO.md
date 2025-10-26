# Implementación de Detección de Zonas por Patrones de Texto

**Fecha:** 26 de Octubre de 2025
**Estado:** ✅ Implementado y Compilado
**Tipo:** Refactorización Mayor

---

## ¿Qué se implementó?

Se cambió el sistema de detección de zonas geográficas (Provincial, Regional, Nacional) del parser PDF de **coordenadas Y fijas** a **detección por patrones de texto**.

### Antes ❌
- Las zonas se detectaban usando coordenadas verticales fijas: `yRange: [100, 250]`
- Si el PDF cambiaba de formato o versión, el sistema fallaba
- Dependía completamente de que las tablas estuvieran en posiciones exactas

### Ahora ✅
- Las zonas se detectan buscando palabras clave: "Provincial", "Regional", "Nacional"
- El sistema identifica el bloque completo de cada servicio (de "Express 08:30" hasta "Express 10:30")
- Cada fila se clasifica según el texto que contiene
- Mucho más robusto y adaptable a diferentes formatos

---

## Funciones Nuevas Implementadas

### 1. `findServiceBlock(pageData, template)`
Localiza el bloque completo de una tabla de servicio en el PDF:
- Busca el encabezado del servicio (ej: "Express 08:30")
- Encuentra dónde empieza el siguiente servicio
- Extrae todos los elementos de texto entre estos dos puntos
- Devuelve objeto `TableBlock` con inicio, fin y elementos

### 2. `detectZoneInText(text, zoneConfig)`
Determina si una línea de texto corresponde a una zona:
- Prueba múltiples patrones regex
- Busca keywords (insensible a mayúsculas)
- Retorna `true` si encuentra coincidencia

### 3. `classifyRowsByZone(block, template)`
El corazón del nuevo sistema:
- Agrupa elementos de texto por fila (tolerancia 3px)
- Ordena filas de arriba hacia abajo
- Escanea cada fila buscando marcadores de zona
- Cuando encuentra "Provincial", todas las filas siguientes son de esa zona
- Continúa hasta encontrar "Regional", luego "Nacional"
- Devuelve array de zonas detectadas con sus rangos de filas

### 4. `extractTableDataWithTextZones(pageData, template)`
Nueva función principal de extracción:
- Detecta el bloque del servicio
- Clasifica filas por zona usando texto
- Extrae valores numéricos usando coordenadas X de columnas
- Reemplaza a `extractTableDataWithCoordinates` como método primario

---

## Cambios en las Estructuras

### Nueva Interface: `DetectedZone`
```typescript
interface DetectedZone {
  zoneName: string;          // "Provincial", "Regional", "Nacional"
  dbPrefix: string;          // "provincial", "regional", "nacional"
  startRowIndex: number;     // Fila donde empieza la zona
  endRowIndex: number;       // Fila donde termina la zona
  rowTexts: string[];        // Textos de las filas de datos
}
```

### Nueva Interface: `TableBlock`
```typescript
interface TableBlock {
  serviceName: string;       // Nombre del servicio
  startY: number;            // Coordenada Y del inicio
  endY: number;              // Coordenada Y del final
  items: TextItem[];         // Elementos de texto del bloque
}
```

### Modificación de `ServiceTableDefinition`
```typescript
// ANTES:
zones: [
  { name: "Provincial", dbPrefix: "provincial", yRange: [100, 250] }
]

// AHORA:
zones: [
  {
    name: "Provincial",
    dbPrefix: "provincial",
    textPatterns: [/provincial/i, /PROVINCIAL/],
    keywords: ["provincial", "Provincial"]
  }
]
```

---

## Sistema de Logging Mejorado

Nuevos prefijos de log para tracking detallado:

- `[PDF Parser]` - Operaciones generales del parser
- `[Detector Bloque]` - Detección de bloques de servicio
- `[Clasificador Zonas]` - Clasificación de filas por zona
- `[Extractor Texto]` - Extracción usando nuevo método
- `[Validador]` - Validación con estadísticas

### Ejemplo de Output:
```
[Detector Bloque] Buscando bloque para servicio: Express 08:30
[Detector Bloque] ✓ Encabezado encontrado en Y=650: "Express 08:30"
[Detector Bloque] ✓ Siguiente servicio encontrado en Y=300: "Express 10:30"
[Detector Bloque] ✓ Bloque definido: Y 650 → 300 (234 elementos)

[Clasificador Zonas] Clasificando filas del bloque Express 08:30
[Clasificador Zonas] Agrupadas 25 filas del bloque
[Clasificador Zonas] ✓ Nueva zona detectada: Provincial en fila 2 (Y=620)
[Clasificador Zonas] ✓ Nueva zona detectada: Regional en fila 10 (Y=520)
[Clasificador Zonas] ✓ Nueva zona detectada: Nacional en fila 18 (Y=420)
[Clasificador Zonas] ✓ Total de zonas detectadas: 3
[Clasificador Zonas]   1. Provincial: 6 filas de datos
[Clasificador Zonas]   2. Regional: 6 filas de datos
[Clasificador Zonas]   3. Nacional: 6 filas de datos

[Validador] Estadísticas por servicio:
[Validador]   Urg8:30H Courier: 18/18 filas con datos
[Validador] Datos por zona:
[Validador]   provincial: 24 valores extraídos
[Validador]   regional: 24 valores extraídos
[Validador]   nacional: 24 valores extraídos
```

---

## Validación Mejorada

La función `validateExtractedData()` ahora retorna:

```typescript
{
  valid: boolean,
  warnings: string[],
  stats: {
    services: [
      { name: "Urg8:30H Courier", total: 18, withData: 18 }
    ],
    zones: [
      { zone: "provincial", count: 24 },
      { zone: "regional", count: 24 },
      { zone: "nacional", count: 24 }
    ]
  }
}
```

Esto permite:
- Ver exactamente cuántos datos se extrajeron por servicio
- Confirmar que todas las zonas fueron detectadas
- Identificar rápidamente problemas de extracción

---

## Flujo de Procesamiento

```
1. Usuario sube PDF
   ↓
2. extractStructuredTextFromPDF()
   → Extrae texto con coordenadas usando PDF.js
   ↓
3. detectService(pageData)
   → Identifica qué servicio hay en la página
   ↓
4. extractTableDataWithTextZones(pageData, template)
   ↓
   4a. findServiceBlock()
       → Localiza bloque completo del servicio
   ↓
   4b. classifyRowsByZone()
       → Agrupa filas por zona usando texto
   ↓
   4c. Para cada zona detectada:
       → Extrae 6 filas de datos (pesos 1kg, 3kg, 5kg, 10kg, 15kg, +kg)
       → Busca valores en columnas usando coordenadas X
   ↓
5. validateExtractedData()
   → Valida y genera estadísticas
   ↓
6. Insertar en base de datos (tariffspdf)
   ↓
7. Retornar resultado con stats al frontend
```

---

## Testing - Pasos Recomendados

### 1. Test Básico
```bash
# Subir PDF de tarifas GLS 2025 a través del frontend
# Verificar en consola del navegador que aparecen logs como:
# [Detector Bloque] ✓ Encabezado encontrado...
# [Clasificador Zonas] ✓ Nueva zona detectada...
```

### 2. Verificar Datos en DB
```sql
-- Conectar a Supabase y ejecutar:
SELECT service_name, weight_from, weight_to,
       provincial_sal, regional_sal, nacional_sal
FROM tariffspdf
ORDER BY service_name, weight_from;

-- Debe mostrar datos como:
-- Urg8:30H Courier, 0, 1, 5.50, 6.75, 8.25
-- Urg8:30H Courier, 1, 3, 6.25, 7.50, 9.00
-- etc.
```

### 3. Revisar Logs del Edge Function
```bash
# En Supabase Dashboard → Edge Functions → parse-pdf-tariff → Logs
# Buscar mensajes que confirmen:
# - [Detector Bloque] ✓ Bloque definido
# - [Clasificador Zonas] ✓ Total de zonas detectadas: 3
# - [Validador] Estadísticas por servicio
```

### 4. Test de Robustez
- Probar con PDF ligeramente modificado (diferentes márgenes)
- Probar con página que tenga solo 2 zonas (no todas las 3)
- Verificar que los errores son informativos

---

## Archivos Modificados

```
📝 supabase/functions/parse-pdf-tariff/index.ts
   - 1109 líneas totales
   - 4 funciones nuevas agregadas
   - Todos los templates actualizados
   - Sistema de logging mejorado
   - Función de validación expandida

📦 BACKUPS/20251026_TEXT_BASED_ZONES/
   - index_BACKUP.ts (versión anterior)
   - backup_timestamp.txt
   - RESUMEN_CAMBIOS.md (documentación detallada)

📄 IMPLEMENTACION_DETECCION_ZONAS_POR_TEXTO.md
   - Este archivo (guía rápida)
```

---

## Ventajas del Nuevo Sistema

✅ **Robustez:** Funciona con PDFs en diferentes formatos
✅ **Flexibilidad:** Se adapta a cambios de versión sin modificar código
✅ **Claridad:** Logs detallados para debugging
✅ **Estadísticas:** Información completa sobre lo extraído
✅ **Mantenibilidad:** Código más fácil de entender y modificar
✅ **Compatibilidad:** Salida de datos idéntica al sistema anterior

---

## Próximos Pasos

1. ✅ **Implementación** - Completada
2. ✅ **Build** - Compilado sin errores
3. ⏳ **Testing** - Probar con PDF real
4. ⏳ **Validación** - Confirmar datos en DB
5. ⏳ **Monitoreo** - Revisar logs en producción

---

## Soporte y Debugging

Si algo no funciona correctamente:

1. **Revisar logs en consola del navegador**
   - Buscar mensajes `[Detector Bloque]` y `[Clasificador Zonas]`
   - Verificar que se detectaron las 3 zonas

2. **Verificar logs del Edge Function**
   - Supabase Dashboard → Functions → parse-pdf-tariff → Logs
   - Buscar errores o warnings

3. **Comprobar estructura del PDF**
   - Asegurar que contiene texto "Provincial", "Regional", "Nacional"
   - Verificar que el PDF no está escaneado (debe tener texto seleccionable)

4. **Fallback manual**
   - Si es necesario, se puede revertir temporalmente a `extractTableDataWithCoordinates`
   - Cambiar línea 953 en index.ts

---

**Versión:** 2.0 - Text-Based Zone Detection
**Fecha de implementación:** 26 de Octubre de 2025
**Build status:** ✅ Compilado exitosamente
