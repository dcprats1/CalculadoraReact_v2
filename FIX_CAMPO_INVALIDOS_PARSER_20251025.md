# Fix: Control de Errores para Campos Inválidos en Parser

**Fecha:** 2025-10-25
**Problema:** Error al insertar tarifas: "Could not find the 'azores_mayores_arr' column"

## Problema Identificado

El parser intentaba insertar campos que no existen en la estructura de la tabla `tariffspdf`:
- **Campos problemáticos:** `azores_mayores_arr`, `azores_menores_arr`, `madeira_mayores_arr`, `madeira_menores_arr`
- **Motivo:** Azores y Madeira solo tienen 3 campos (`_sal`, `_rec`, `_int`) pero el parser intentaba generar 4 campos (`_sal`, `_rec`, `_int`, `_arr`)

## Estructura Real de la Tabla

### Destinos con 4 campos (_sal, _rec, _int, _arr):
- Provincial, Regional, Nacional, Portugal
- Canarias Mayores/Menores
- Baleares Mayores/Menores
- Ceuta, Melilla
- Andorra, Gibraltar

### Destinos con 3 campos (_sal, _rec, _int) - SIN _arr:
- **Azores Mayores**
- **Azores Menores**
- **Madeira Mayores**
- **Madeira Menores**

## Solución Implementada

### 1. Actualización de DESTINATION_CONFIGS (Líneas 220-237)

Corregidos los campos para Azores y Madeira:

```typescript
{ dbPrefix: "azores_mayores", displayName: "Azores Mayores", fields: ["_sal", "_rec", "_int"] },  // ✓ Sin _arr
{ dbPrefix: "azores_menores", displayName: "Azores Menores", fields: ["_sal", "_rec", "_int"] },  // ✓ Sin _arr
{ dbPrefix: "madeira_mayores", displayName: "Madeira Mayores", fields: ["_sal", "_rec", "_int"] }, // ✓ Sin _arr
{ dbPrefix: "madeira_menores", displayName: "Madeira Menores", fields: ["_sal", "_rec", "_int"] }, // ✓ Sin _arr
```

### 2. Lista de Campos Válidos (Líneas 239-253)

Nueva constante `VALID_DB_FIELDS` con todos los campos permitidos en la tabla:

```typescript
const VALID_DB_FIELDS = new Set([
  'service_name', 'weight_from', 'weight_to',
  'provincial_sal', 'provincial_rec', 'provincial_int', 'provincial_arr',
  // ... todos los campos válidos
  'azores_mayores_sal', 'azores_mayores_rec', 'azores_mayores_int',  // ✓ Sin _arr
  'azores_menores_sal', 'azores_menores_rec', 'azores_menores_int',  // ✓ Sin _arr
  'madeira_mayores_sal', 'madeira_mayores_rec', 'madeira_mayores_int',  // ✓ Sin _arr
  'madeira_menores_sal', 'madeira_menores_rec', 'madeira_menores_int',  // ✓ Sin _arr
]);
```

### 3. Función de Sanitización Antes de Insertar (Líneas 848-867)

Filtrado automático de campos inválidos antes de insertar en la base de datos:

```typescript
const sanitizedTariffs = allTariffs.map(tariff => {
  const cleaned: Record<string, any> = {};
  let removedFields = 0;

  for (const [key, value] of Object.entries(tariff)) {
    if (VALID_DB_FIELDS.has(key)) {
      cleaned[key] = value;  // ✓ Campo válido, incluir
    } else {
      console.log(`[PDF Parser] ⚠ Campo no válido ignorado: ${key} = ${value}`);
      removedFields++;  // ⚠ Campo inválido, omitir
    }
  }

  if (removedFields > 0) {
    console.log(`[PDF Parser] Tarifa ${tariff.service_name} ${tariff.weight_from}-${tariff.weight_to}: ${removedFields} campos no válidos eliminados`);
  }

  return cleaned;
});

// Insertar solo los registros sanitizados
const { data: insertedData, error: insertError } = await supabase
  .from("tariffspdf")
  .insert(sanitizedTariffs)
  .select();
```

## Comportamiento Esperado

### Antes del Fix
```javascript
// ❌ Error al intentar insertar
{
  service_name: "Urg8:30H Courier",
  weight_from: "0",
  weight_to: "1",
  azores_mayores_arr: 1.23  // ❌ Campo no existe en tabla
}
// Error: "Could not find the 'azores_mayores_arr' column"
```

### Después del Fix
```javascript
// ✓ Campo inválido filtrado automáticamente
{
  service_name: "Urg8:30H Courier",
  weight_from: "0",
  weight_to: "1",
  azores_mayores_sal: 1.23,
  azores_mayores_rec: 1.34,
  azores_mayores_int: 2.06,
  // azores_mayores_arr NO incluido (filtrado)
}
// Log: "[PDF Parser] ⚠ Campo no válido ignorado: azores_mayores_arr = 1.23"
// ✓ Inserción exitosa
```

## Ventajas del Fix

1. **Resiliente a cambios de esquema:** Si el esquema de la tabla cambia, el parser no falla, solo omite campos inválidos
2. **Logs informativos:** Se registra claramente qué campos fueron omitidos y por qué
3. **No rechaza importación:** Importa todos los datos válidos aunque algunos campos no existan
4. **Fácil debugging:** Los logs muestran exactamente qué campos causaron problemas
5. **Mantenible:** La lista `VALID_DB_FIELDS` centraliza la validación

## Testing

Para verificar el fix:

1. Subir un PDF de tarifas GLS
2. Revisar los logs del Edge Function:
   - Buscar: `[PDF Parser] ⚠ Campo no válido ignorado: ...`
   - Verificar que los campos de Azores/Madeira `_arr` son omitidos
3. Confirmar que la importación se completa exitosamente
4. En la vista previa, verificar que:
   - Azores/Madeira solo muestran 3 valores (Sal, Rec, Int)
   - Otros destinos muestran 4 valores (Sal, Rec, Int, Arr)

## Archivos Modificados

- `/supabase/functions/parse-pdf-tariff/index.ts`
  - Líneas 220-237: Corregidos campos de DESTINATION_CONFIGS
  - Líneas 239-253: Nueva constante VALID_DB_FIELDS
  - Líneas 848-867: Nueva función de sanitización

## Próximos Pasos

✅ Fix implementado y testeado (compilación exitosa)
🔄 Probar con PDF real para confirmar funcionamiento
📊 Verificar que la vista previa muestra correctamente los destinos
