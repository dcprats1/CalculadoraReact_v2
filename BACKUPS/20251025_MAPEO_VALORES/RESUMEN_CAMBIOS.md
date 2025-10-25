# Implementación del Mapeo de Valores Numéricos
**Fecha:** 25 de octubre de 2025
**Backup:** `/BACKUPS/20251025_MAPEO_VALORES/`

---

## 📋 Resumen Ejecutivo

Se ha implementado la **lógica correcta de mapeo de valores numéricos** extraídos de tablas PDF GLS España según las especificaciones proporcionadas por el usuario.

---

## 🎯 Objetivo

Mapear correctamente los 6 valores numéricos extraídos por fila de las tablas GLS a los campos correspondientes en la base de datos Supabase:

### **Mapeo Implementado (6 valores por fila)**

```
Valores extraídos de la tabla GLS:
[0]  [1]      [2]        [3]      [4]      [5]      [6]
peso arrastre (ignorar) salidas recogidas intercid. km(opcional)

Mapeo a base de datos:
values[0] → IGNORAR (peso o texto descriptivo)
values[1] → campo_arr (Arrastre)
values[2] → IGNORAR (columna intermedia no usada)
values[3] → campo_sal (Salidas)
values[4] → campo_rec (Recogidas)
values[5] → campo_int (Interciudad)
values[6+] → IGNORAR (columna "Km" en Express10:30)
```

---

## 🔧 Cambios Implementados

### **1. Función `extractNumericValues()`**
- **Documentación agregada:** Explicación en castellano del propósito
- **Ejemplos:** Líneas válidas con formato GLS
- **Sin cambios funcionales:** La función ya extraía correctamente todos los valores numéricos

### **2. Función `consolidateTariffs()`**
- **Documentación extensa:**
  - Especificación completa del mapeo de valores
  - Casos especiales (Parcel Shop, Azores/Madeira)
  - Columnas a ignorar (Km)

- **Lógica de mapeo implementada:**
  ```typescript
  // Caso estándar: 6 valores numéricos
  if (data.values.length >= 6) {
    tariff[`${data.zone}_arr`] = data.values[1];
    tariff[`${data.zone}_sal`] = data.values[3];
    tariff[`${data.zone}_rec`] = data.values[4];
    tariff[`${data.zone}_int`] = data.values[5];
    // Ignorar values[0], values[2], y values[6+]
  }
  ```

- **Logging detallado:**
  - Log de todos los valores extraídos antes de mapear
  - Log del mapeo aplicado mostrando qué valores se ignoran
  - Advertencias para casos con valores insuficientes

- **Compatibilidad hacia atrás:**
  - Se mantiene el caso "legacy" para 4 valores
  - Casos especiales (Parcel Shop, Azores/Madeira) sin cambios

---

## 📊 Casos Contemplados

### **Caso 1: Tabla Estándar (6 valores)**
**Ejemplo:** Express10:30, Provincial, 1kg
**Línea:** `1 Kg. 1,17 1,01 2,00 3,01 2,18 4,18 0,34`

**Valores extraídos:** `[1.17, 1.01, 2.00, 3.01, 2.18, 4.18, 0.34]`

**Mapeo aplicado:**
```
values[0] = 1.17  → IGNORADO (peso)
values[1] = 1.01  → provincial_arr
values[2] = 2.00  → IGNORADO (columna intermedia)
values[3] = 3.01  → provincial_sal
values[4] = 2.18  → provincial_rec
values[5] = 4.18  → provincial_int
values[6] = 0.34  → IGNORADO (columna Km)
```

### **Caso 2: Express14:00 Portugal (6 valores)**
**Ejemplo:** Express14:00, Portugal (Peninsular), 1kg
**Línea:** `1 Kg. 1,17 2,06 1,25 3,31 3,23 4,48`

**Valores extraídos:** `[1.17, 2.06, 1.25, 3.31, 3.23, 4.48]`

**Mapeo aplicado:**
```
values[0] = 1.17  → IGNORADO (peso)
values[1] = 2.06  → portugal_arr
values[2] = 1.25  → IGNORADO
values[3] = 3.31  → portugal_sal
values[4] = 3.23  → portugal_rec
values[5] = 4.48  → portugal_int
```

### **Caso 3: Parcel Shop (1 valor)**
**Ejemplo:** Parcel Shop, Provincial, 1kg
**Línea:** `1 Kg. 2,50`

**Valores extraídos:** `[2.50]`

**Mapeo aplicado:**
```
values[0] = 2.50  → provincial_sal
```

### **Caso 4: Azores/Madeira (2 valores)**
**Ejemplo:** Marítimo, Azores Mayores, 1kg
**Línea:** `1 Kg. 5,25 6,50`

**Valores extraídos:** `[5.25, 6.50]`

**Mapeo aplicado:**
```
values[0] = 5.25  → azores_mayores_sal
values[1] = 6.50  → azores_mayores_rec
```

---

## 🔍 Verificación de Comportamiento

### **Logs Implementados**

El sistema ahora genera logs detallados durante la consolidación:

```
[Consolidator] Procesando: Express10:30 | 0-1kg | Zona: provincial | Valores: [1.17, 1.01, 2.00, 3.01, 2.18, 4.18, 0.34]
[Consolidator]   → Mapeo estándar: arr=1.01, sal=3.01, rec=2.18, int=4.18 | Ignorados: [1.17, 2.00]
```

### **Advertencias para Valores Insuficientes**

Si una fila tiene menos valores de lo esperado:

```
[Consolidator]   ⚠ Valores insuficientes para Express10:30 provincial 0-1kg: solo 3 valores
```

---

## 📁 Archivos Modificados

1. **`supabase/functions/parse-pdf-tariff/index.ts`**
   - Función `extractNumericValues()`: Documentación agregada
   - Función `consolidateTariffs()`: Lógica de mapeo implementada + logs detallados

---

## ✅ Próximos Pasos

1. **Realizar pruebas con PDF real:**
   - Subir PDF de tarifas GLS España
   - Verificar logs en consola del navegador
   - Confirmar que los valores se mapean correctamente

2. **Validar casos especiales:**
   - Express19:00 con destinos Ceuta, Melilla, Gibraltar, Andorra (solo 2 rangos de peso)
   - Express14:00 con Portugal (Peninsular)
   - Tablas con sufijo "(Glass)" deben ser ignoradas

3. **Si el mapeo es correcto:**
   - Implementar detección de destinos especiales (Ceuta & Melilla como destino único)
   - Implementar rangos de peso reducidos (1kg y +kg para destinos especiales)
   - Implementar filtrado de tablas "(Glass)"

---

## 🚨 Notas Importantes

- **Compatibilidad:** Se mantiene el mapeo "legacy" para 4 valores por si hay tablas con formato antiguo
- **Columna Km:** Se ignora automáticamente por estar en posición 6+ (valores adicionales tras los 6 primeros)
- **Casos especiales:** Parcel Shop y Azores/Madeira mantienen su lógica específica sin cambios
- **Logging:** Todos los valores extraídos y el mapeo aplicado son visibles en logs para debugging

---

## 📝 Instrucciones de Prueba

### **1. Desplegar la función:**
```bash
# La función ya está desplegada, solo necesitas probarla
```

### **2. Subir un PDF de prueba:**
- Ir a la aplicación web
- Navegar a Settings → Tarifas Personalizadas
- Subir un PDF de tarifas GLS España

### **3. Verificar logs en consola del navegador:**
- Abrir DevTools (F12)
- Pestaña "Console"
- Buscar logs que contengan `[Consolidator]`
- Verificar que el mapeo sea: `arr=values[1], sal=values[3], rec=values[4], int=values[5]`

### **4. Verificar datos en Supabase:**
```sql
SELECT
  service_name,
  weight_from,
  weight_to,
  provincial_arr,
  provincial_sal,
  provincial_rec,
  provincial_int
FROM tariffspdf
WHERE service_name = 'Urg10H Courier'
ORDER BY weight_from::int;
```

### **5. Reportar resultados:**
- ✅ Si los valores son correctos según las imágenes proporcionadas
- ❌ Si hay discrepancias, proporcionar detalles específicos

---

**¿El mapeo implementado es correcto? ¿Procedemos con las pruebas?**
