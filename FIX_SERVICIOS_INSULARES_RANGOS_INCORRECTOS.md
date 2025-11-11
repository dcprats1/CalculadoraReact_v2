# Fix: Servicios Insulares Cargando Rangos Peninsulares

## 🔴 Problema Detectado

Los servicios de **Islas Canarias** y **Baleares** estaban cargando rangos peninsulares (Provincial, Regional, Nacional) que **NO les corresponden**.

### Causa Raíz

El extractor `simple-map-extractor.ts` extraía **TODOS** los rangos para **TODOS** los servicios, sin verificar el tipo de servicio (`peninsular`, `insular`, `maritimo`, etc.).

```typescript
// ❌ ANTES: Extraía Provincial/Regional/Nacional para TODOS los servicios
if (weightRange.Provincial) {
  tariff.provincial_sal = this.parsePrice(weightRange.Provincial.salidas);
  // ...
}
```

### Servicios Afectados

- `Express19:00 Baleares Mayores` (tipo: `insular`)
- `BusinessParcel Baleares Mayores` (tipo: `insular`)
- Cualquier otro servicio de tipo `insular`, `maritimo` o `aereo`

## ✅ Solución Implementada

### Archivo Modificado

`supabase/functions/parse-pdf-tariff/simple-map-extractor.ts`

### Cambios Realizados

1. **Detección del tipo de servicio**:
   ```typescript
   const serviceType = serviceMap.type || 'peninsular';
   console.log(`[Simple Extractor] Procesando ${serviceMap.service_name} (tipo: ${serviceType})`);
   ```

2. **Filtrado condicional de rangos peninsulares**:
   ```typescript
   // SOLO extraer rangos peninsulares si el servicio es peninsular o internacional
   const shouldExtractPeninsular = serviceType === 'peninsular' || serviceType === 'internacional';

   // Provincial (solo para servicios peninsulares)
   if (shouldExtractPeninsular && weightRange.Provincial) {
     tariff.provincial_sal = this.parsePrice(weightRange.Provincial.salidas);
     // ...
   }
   ```

3. **Logging mejorado**:
   ```typescript
   console.log(`[Simple Extractor] Muestra INSULAR: ${insularSample.service_name}`);
   console.log(`[Simple Extractor]   ⚠ Provincial: Sal=${insularSample.provincial_sal} (debe ser null)`);
   console.log(`[Simple Extractor]   ✓ Baleares Mayores: Sal=${insularSample.baleares_mayores_sal}`);
   ```

## 🔍 Verificación

### Cómo Comprobar que Funciona

1. **Subir un PDF de tarifas GLS** a través de la interfaz
2. **Revisar los logs** en la consola de Supabase Edge Functions
3. **Buscar el mensaje**:
   ```
   [Simple Extractor] Procesando Express19:00 Baleares Mayores (tipo: insular)
   ```
4. **Verificar que los valores peninsulares son `null`**:
   ```
   [Simple Extractor] Muestra INSULAR: Express19:00 Baleares Mayores
   [Simple Extractor]   ⚠ Provincial: Sal=null (debe ser null) ✓
   [Simple Extractor]   ⚠ Regional: Sal=null (debe ser null) ✓
   [Simple Extractor]   ⚠ Nacional: Sal=null (debe ser null) ✓
   [Simple Extractor]   ✓ Baleares Mayores: Sal=5.01 ✓
   ```

### Datos Esperados por Tipo

| Tipo Servicio | Rangos que DEBE tener | Rangos que NO debe tener |
|---------------|----------------------|--------------------------|
| `peninsular` | Provincial, Regional, Nacional | Baleares, Canarias (solo si está definido en el mapa) |
| `insular` | Baleares, Canarias | Provincial, Regional, Nacional |
| `maritimo` | Madeira, Azores | Provincial, Regional, Nacional |
| `internacional` | Portugal, otros países | Depende del servicio |

## 📋 Archivos Afectados

- ✅ `supabase/functions/parse-pdf-tariff/simple-map-extractor.ts` - **MODIFICADO**
- ℹ️ `supabase/functions/parse-pdf-tariff/tariff-map.ts` - Sin cambios (datos correctos)
- ℹ️ `supabase/functions/parse-pdf-tariff/index.ts` - Sin cambios

## 🚀 Despliegue

### Pasos para Desplegar

El archivo modificado está listo. Para desplegarlo:

```bash
# Desde el directorio del proyecto
supabase functions deploy parse-pdf-tariff
```

### Verificación Post-Despliegue

1. Subir un PDF de tarifas
2. Verificar que los logs muestren el tipo de servicio
3. Confirmar que servicios insulares NO tienen datos peninsulares
4. Verificar que la vista previa muestre correctamente los datos

## 📊 Impacto

### Antes del Fix

```json
{
  "service_name": "Express19:00 Baleares Mayores",
  "weight_from": 0,
  "weight_to": 1,
  "provincial_sal": null,     // ❌ Se intentaba extraer pero era undefined
  "regional_sal": null,        // ❌ Se intentaba extraer pero era undefined
  "nacional_sal": null,        // ❌ Se intentaba extraer pero era undefined
  "baleares_mayores_sal": 5.01 // ✅ Correcto
}
```

### Después del Fix

```json
{
  "service_name": "Express19:00 Baleares Mayores",
  "weight_from": 0,
  "weight_to": 1,
  "provincial_sal": null,     // ✅ Explícitamente null (no se extrae)
  "regional_sal": null,        // ✅ Explícitamente null (no se extrae)
  "nacional_sal": null,        // ✅ Explícitamente null (no se extrae)
  "baleares_mayores_sal": 5.01 // ✅ Correcto
}
```

### Beneficios

1. ✅ **Mayor claridad**: Los logs muestran explícitamente qué tipo de servicio se está procesando
2. ✅ **Prevención de errores**: No se intenta extraer rangos que no existen
3. ✅ **Mejor debugging**: Los logs muestran muestras de servicios peninsulares e insulares
4. ✅ **Código más mantenible**: Lógica de extracción basada en el tipo de servicio

## 🎯 Resumen

**Problema**: Servicios insulares (Baleares, Canarias) intentaban cargar rangos peninsulares (Provincial, Regional, Nacional).

**Solución**: Agregar validación por tipo de servicio antes de extraer cada rango.

**Resultado**: Cada servicio solo extrae los rangos que le corresponden según su tipo.

**Estado**: ✅ Código modificado y listo para despliegue
