# Instrucciones para Probar el Nuevo Parser PDF

**Fecha:** 25 de Octubre de 2025

## 🎯 Objetivo de la Prueba

Verificar que el nuevo parser con **lógica deductiva tabla por tabla** funciona correctamente con el PDF real de tarifas GLS España 2025.

## 📋 Preparación

### 1. Asegúrate de tener:
- ✅ PDF de tarifas GLS España 2025
- ✅ Acceso a la aplicación en tu navegador
- ✅ Consola del navegador abierta (F12 → Console)
- ✅ Acceso a Supabase Dashboard (para verificar datos)

### 2. Accede a la aplicación:
```
https://tu-dominio.app/
```

### 3. Inicia sesión:
- Email: tu_email@dominio.com
- Código de verificación (se enviará por email)

## 🧪 Procedimiento de Prueba

### **PASO 1: Acceder a Configuración**

1. Haz clic en el botón de **Configuración** (icono de engranaje)
2. Ve a la pestaña **"Tarifas Personalizadas"**
3. Busca la sección **"Importar Tarifas desde PDF"**

### **PASO 2: Subir el PDF**

1. Arrastra el PDF al área de carga **O**
2. Haz clic en **"Seleccionar PDF"** y elige el archivo

**Validaciones automáticas:**
- ✅ Tamaño máximo: 10MB
- ✅ Tipo de archivo: PDF válido
- ✅ Se mostrará el nombre y tamaño del archivo

### **PASO 3: Importar las Tarifas**

1. Haz clic en el botón **"Importar Tarifas"**
2. Observa el indicador de carga: **"Procesando PDF..."**

### **PASO 4: Revisar la Consola del Navegador**

Abre la consola (F12) y busca estos logs:

```
[PDF Parser] Nueva petición: POST
[PDF Parser] Procesando: TARIFA_GLS_2025.pdf (XXXXX bytes)
[PDF Parser] PDF cargado: 41 páginas
[PDF Parser] Página 1/41: XXXX caracteres
...
[PDF Parser] Extracción completada: XXXXX caracteres
[PDF Parser] Total líneas a procesar: XXXX
[TableBlocks] ===== IDENTIFICANDO BLOQUES DE TABLAS =====
[Detector] ✓ Servicio detectado: Urg8:30H Courier con patrón /express\s*0?8:?30/i
[TableBlocks] ✓ Nuevo bloque iniciado en línea XX: Urg8:30H Courier
[TableBlocks] Bloque guardado: Urg8:30H Courier (XX líneas)
[Detector] ✓ Servicio detectado: Urg10H Courier con patrón /express\s*10:?30/i
...
[TableBlocks] Total bloques identificados: X
[Extractor] ===== EXTRAYENDO TARIFAS DE Urg8:30H Courier =====
[Extractor]   ✓ Zona detectada: provincial en línea: ...
[Extractor]     ✓ Tarifa extraída: 0-1kg, zona: provincial, valores: 6
[Extractor]   ✓ Zona detectada: regional en línea: ...
...
[Extractor] Total tarifas extraídas de Urg8:30H Courier: XX
[PDF Parser] Limpiando tabla tariffspdf...
[PDF Parser] Insertando XXX tarifas...
[PDF Parser] ✓ Importación exitosa: XXX registros
```

### **PASO 5: Verificar Resultado en la Interfaz**

**CASO A: Importación Exitosa (Status 200)**

Deberías ver:
- ✅ Mensaje: **"Se importaron XXX tarifas correctamente"**
- ✅ Número de servicios procesados
- ✅ Botón para **"Ver Vista Previa"**

**CASO B: Error en Detección (Status 400)**

Si no detecta servicios:
```
❌ Error: "No se detectaron tablas de tarifas en el PDF"
📝 Detalles: "Se procesaron XXXX líneas pero no se encontraron servicios reconocidos"
💡 Sugerencias:
  - Verifica que el PDF contiene servicios GLS España 2025
  - Los servicios esperados son: Express08:30, Express10:30...
```

**CASO C: Error en Extracción (Status 400)**

Si detecta servicios pero no extrae datos:
```
❌ Error: "No se pudieron extraer tarifas de las tablas detectadas"
📝 Detalles: "Se detectaron X servicios pero no se encontraron datos válidos"
📊 Debug Info:
  - Bloques detectados: [...]
  - Muestra de líneas del primer bloque
```

### **PASO 6: Revisar Vista Previa**

Si la importación fue exitosa:

1. Se mostrará la **Vista Previa de Importación**
2. Verás las tarifas agrupadas por servicio:
   - Urg8:30H Courier
   - Urg10H Courier
   - Urg14H Courier
   - Urg19H Courier
   - Business Parcel
   - Eurobusiness Parcel
   - Economy Parcel
   - Parcel Shop
   - Marítimo

3. Para cada servicio, verás rangos de peso:
   - 0-1kg, 1-3kg, 3-5kg, 5-10kg, 10-15kg, etc.

4. Para cada rango, verás zonas:
   - Provincial Sal, Rec, Arr, Int
   - Regional Sal, Rec, Arr, Int
   - Nacional Sal, Rec, Arr, Int
   - Portugal Sal, Rec, Arr, Int

### **PASO 7: Verificar Datos en Supabase**

1. Accede al **Supabase Dashboard**
2. Ve a **Table Editor**
3. Selecciona la tabla **`tariffspdf`**
4. Verifica que hay registros insertados
5. Revisa algunos registros para confirmar estructura:

```
id: uuid
service_name: "Urg8:30H Courier"
weight_from: "0"
weight_to: "1"
provincial_sal: 1.17
provincial_rec: 2.11
provincial_arr: 5.03
provincial_int: 7.14
regional_sal: 1.23
...
```

### **PASO 8: Confirmar Importación**

1. En la vista previa, revisa las tarifas
2. Selecciona/deselecciona las que deseas importar
3. Haz clic en **"Confirmar e Importar"**
4. Las tarifas se copiarán a la tabla **`custom_tariffs`**
5. Aparecerá mensaje: **"¡Importación Completada!"**

## 🔍 Diagnóstico de Problemas

### Problema 1: No detecta ningún servicio

**Síntomas:**
```
Error: "No se detectaron tablas de tarifas en el PDF"
Total bloques identificados: 0
```

**Posibles causas:**
1. El PDF no contiene los textos esperados
2. Los patrones de detección no coinciden con el formato del PDF
3. El texto se extrajo incorrectamente

**Solución:**
1. Revisa el `debugInfo.sampleLines` en la respuesta del error
2. Verifica si aparecen los nombres de servicios como "Express", "Business", etc.
3. Ajusta los patrones en `SERVICE_MAPPINGS` si es necesario

### Problema 2: Detecta servicios pero no extrae tarifas

**Síntomas:**
```
Se detectaron 5 servicios pero no se encontraron datos válidos
Bloques detectados: [{"service": "Urg8:30H Courier", "lines": 45}, ...]
```

**Posibles causas:**
1. Las zonas no se detectan correctamente
2. Los rangos de peso no coinciden con los patrones
3. Los valores numéricos no se extraen bien

**Solución:**
1. Revisa el `debugInfo.sampleBlock` para ver las líneas capturadas
2. Verifica si aparecen "Provincial", "Regional", "Nacional"
3. Verifica si aparecen "1 kg", "3 kg", "5 kg", etc.
4. Ajusta los patrones en `ZONE_MAPPINGS` o `WEIGHT_RANGES`

### Problema 3: Extrae pocas tarifas

**Síntomas:**
```
✓ Importación exitosa: 45 registros
(Esperado: ~324 registros para 9 servicios × 4 zonas × 9 rangos)
```

**Posibles causas:**
1. Solo detecta algunas zonas
2. No detecta todos los rangos de peso
3. Los valores no cumplen la validación (mínimo 3 valores)

**Solución:**
1. Revisa los logs de `[Extractor]` en la consola
2. Cuenta cuántas zonas detecta por servicio
3. Cuenta cuántos rangos detecta por zona
4. Verifica que cada línea tenga al menos 3 valores numéricos

## 📊 Resultados Esperados

Para un PDF completo de GLS España 2025:

- **Servicios detectados:** 9
- **Tarifas totales:** ~324 (puede variar según el PDF)
- **Desglose por servicio:** ~36 tarifas cada uno
  - 4 zonas (Provincial, Regional, Nacional, Portugal)
  - 9 rangos de peso por zona

**Distribución típica:**
```
Urg8:30H Courier:      36 tarifas
Urg10H Courier:        36 tarifas
Urg14H Courier:        36 tarifas
Urg19H Courier:        36 tarifas
Business Parcel:       36 tarifas
Eurobusiness Parcel:   36 tarifas
Economy Parcel:        36 tarifas
Parcel Shop:           36 tarifas
Marítimo:              36 tarifas
─────────────────────────────────
TOTAL:                324 tarifas
```

## ✅ Checklist de Validación

Marca cada ítem después de verificarlo:

- [ ] El PDF se sube correctamente
- [ ] Aparece indicador "Procesando PDF..."
- [ ] En la consola aparecen logs de `[PDF Parser]`
- [ ] Se detectan al menos 1 servicio
- [ ] Se identifican bloques de tabla
- [ ] Se extraen tarifas de los bloques
- [ ] Aparece mensaje de éxito o error descriptivo
- [ ] Los datos se guardan en `tariffspdf`
- [ ] La vista previa muestra tarifas agrupadas
- [ ] Se pueden seleccionar tarifas individualmente
- [ ] El botón "Confirmar e Importar" funciona
- [ ] Las tarifas se copian a `custom_tariffs`
- [ ] Aparece mensaje "¡Importación Completada!"

## 📞 Reporte de Resultados

Después de probar, reporta:

1. **¿Funcionó la importación?** SÍ / NO
2. **¿Cuántos servicios detectó?** _____
3. **¿Cuántas tarifas extrajo?** _____
4. **¿Apareció algún error?** Describe: _____
5. **Logs relevantes de la consola:** (Copia y pega)

---

**¡Suerte con las pruebas!** 🚀
