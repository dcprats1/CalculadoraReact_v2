# Implementación: Sistema de Importación de Tarifas desde PDF

**Fecha:** 24 de Octubre de 2025
**Estado:** IMPLEMENTADO - LISTO PARA PRUEBAS
**Riesgo:** BAJO (tabla de prueba aislada)

## 📋 Resumen Ejecutivo

Se ha implementado un sistema completo para importar tarifas de GLS España desde archivos PDF directamente a la base de datos. El sistema está diseñado con máxima seguridad, usando una **tabla de prueba aislada** (`tariffsPDF`) que NO afecta los datos de producción.

## 🎯 Objetivo

Permitir la carga automática de tarifas GLS desde el PDF oficial "TARIFA RED_2025_ARRASTRE_PLANO" sin necesidad de entrada manual, validando primero en un entorno seguro antes de decidir su uso en producción.

---

## 🏗️ Arquitectura Implementada

### 1. Base de Datos: Tabla de Prueba `tariffsPDF`

**Ubicación:** `supabase/migrations/20251024190000_create_tariffs_pdf_table.sql`

**Características:**
- ✅ Estructura IDÉNTICA a `custom_tariffs` (sin `user_id`)
- ✅ Tabla global para pruebas
- ✅ RLS habilitado con políticas permisivas para usuarios autenticados
- ✅ NO afecta datos de producción
- ✅ Índices optimizados para búsquedas rápidas

**Campos principales:**
```sql
- id (uuid, primary key)
- service_name (text)
- weight_from (varchar(3))
- weight_to (varchar(3))
- provincial_sal, provincial_rec, provincial_int, provincial_arr
- regional_sal, regional_rec, regional_int, regional_arr
- nacional_sal, nacional_rec, nacional_int, nacional_arr
- portugal_sal, portugal_rec, portugal_int, portugal_arr
- canarias_mayores_sal/rec/int/arr
- canarias_menores_sal/rec/int/arr
- baleares_mayores_sal/rec/int/arr
- baleares_menores_sal/rec/int/arr
- ceuta_sal/rec/int/arr
- melilla_sal/rec/int/arr
- andorra_sal/rec/int/arr
- gibraltar_sal/rec/int/arr
- azores_mayores_sal/rec/int, azores_menores_sal/rec/int
- madeira_mayores_sal/rec/int, madeira_menores_sal/rec/int
- created_at, updated_at (timestamptz)
```

**Punto de Retorno Seguro #1:**
```sql
-- Para eliminar la tabla y empezar de cero:
DROP TABLE IF EXISTS public.tariffsPDF CASCADE;
```

---

### 2. Backend: Función Edge `parse-pdf-tariff`

**Ubicación:** `supabase/functions/parse-pdf-tariff/index.ts`

**Funcionalidad:**
- ✅ Recibe archivos PDF via `multipart/form-data`
- ✅ Extrae texto del PDF
- ✅ Identifica servicios según mapeo configurado
- ✅ Detecta rangos de peso automáticamente
- ✅ Extrae valores numéricos de columnas (Salidas, Recogida, Interciudad, Arrastre)
- ✅ Valida datos antes de inserción
- ✅ Inserta en tabla `tariffsPDF`
- ✅ Retorna preview de los datos importados

**Mapeo de Servicios PDF → Base de Datos:**
```typescript
Express08:30 / Express8:30 / Express 8:30  → Urg8:30H Courier
Express10:30 / Express 10:30               → Urg10H Courier
Express14:00 / Express 14:00               → Urg14H Courier
Express19:00 / Express 19:00               → Urg19H Courier
BusinessParcel / Business Parcel           → Business Parcel
EuroBusinessParcel / Euro Business Parcel  → EuroBusiness Parcel
EconomyParcel / Economy Parcel             → Economy Parcel
Maritimo / Marítimo                        → Marítimo
ParcelShop / Parcel Shop                   → Parcel Shop
```

**Rangos de Peso Detectados:**
```typescript
1kg, 1 kg, hasta 1, 0-1        → 0 a 1
3kg, 3 kg, 1-3                 → 1 a 3
5kg, 5 kg, 3-5                 → 3 a 5
10kg, 10 kg, 5-10              → 5 a 10
15kg, 15 kg, 10-15             → 10 a 15
+kg, + kg, 15+, >15, Mayor 1 pallet → 15 a 999
```

**Manejo de Errores:**
- ❌ Sin archivo PDF: código 400
- ❌ PDF sin datos válidos: código 400 con detalles
- ❌ Error de inserción en BD: código 500 con detalles
- ✅ Importación exitosa: código 200 con resumen

**Endpoint:**
```
POST {SUPABASE_URL}/functions/v1/parse-pdf-tariff
Headers:
  Authorization: Bearer {SUPABASE_ANON_KEY}
Body: multipart/form-data con campo 'pdf'
```

**Punto de Retorno Seguro #2:**
```bash
# Para redeployar la función si hay problemas:
# (usar herramientas de Supabase o redeployar manualmente)
```

---

### 3. Frontend: Componente `TariffPdfUploader`

**Ubicación:** `src/components/settings/TariffPdfUploader.tsx`

**Características:**
- ✅ Drag & Drop de archivos PDF
- ✅ Validación de tipo de archivo (solo PDF)
- ✅ Indicador de progreso durante carga
- ✅ Mensajes de estado en tiempo real
- ✅ Preview de datos importados (primeras 5 filas)
- ✅ Manejo completo de errores con detalles
- ✅ Información clara sobre tabla de destino (tariffsPDF)

**Estados del Componente:**
1. Esperando archivo (drag & drop o selector)
2. Archivo seleccionado (botón "Importar Tarifas" visible)
3. Procesando (spinner + mensaje "Procesando PDF...")
4. Resultado exitoso (verde, con preview y conteo)
5. Resultado con error (rojo, con detalles específicos)

**Punto de Retorno Seguro #3:**
- El componente NO está activo por defecto
- Se accede mediante botón "Importar desde PDF" en el editor de tarifas
- NO modifica datos existentes automáticamente

---

### 4. Integración: Editor de Tarifas Personalizadas

**Ubicación:** `src/components/settings/CustomTariffsEditor.tsx`

**Cambios realizados:**
- ✅ Nuevo botón "Importar desde PDF" (morado) en la barra superior
- ✅ Toggle para mostrar/ocultar el uploader
- ✅ Integración visual limpia sin afectar funcionalidad existente

**Acceso:**
1. Configuración → Tabla de Costes Personalizada
2. Clic en botón "Importar desde PDF"
3. Aparece panel de importación
4. Arrastrar PDF o seleccionar archivo
5. Clic en "Importar Tarifas"
6. Ver resultado y preview

---

## 🔒 Seguridad y RLS

### Políticas Implementadas

**Tabla `tariffsPDF`:**
- ✅ SELECT: Usuarios autenticados pueden ver todas las filas
- ✅ INSERT: Usuarios autenticados pueden insertar
- ✅ UPDATE: Usuarios autenticados pueden actualizar
- ✅ DELETE: Usuarios autenticados pueden eliminar

**Razón:** Tabla de prueba compartida, diseñada para validación antes de producción.

**Función Edge:**
- ✅ Requiere autenticación JWT (`verify_jwt: true`)
- ✅ Solo usuarios autenticados pueden llamar la función
- ✅ Usa `SUPABASE_SERVICE_ROLE_KEY` para inserción (necesario para bypass de RLS durante insert batch)

---

## 📊 Casos de Uso Cubiertos

### ✅ Servicios Península (Páginas 4-7 del PDF)
- Express 8:30, 10:30, 14:00, 19:00
- Business Parcel
- Euro Business Parcel
- Economy Parcel
- 7 columnas: Peso | Provincial | Regional | Nacional | Portugal | Baleares | Canarias

### ✅ Parcel Shop (Página 8 del PDF)
- Estructura diferente con menos columnas
- Manejo especial de columnas faltantes (NULL en BD)

### ✅ Servicios Insulares y Especiales (Páginas 12-17)
- Canarias Mayores/Menores
- Baleares Mayores/Menores
- Ceuta y Melilla (datos duplicados, entradas separadas)

### ✅ Madeira y Azores (Página 19)
- Sin columnas Interciudad y Arrastre (NULL en BD)
- Solo Salidas y Recogida

---

## 🧪 Estrategia de Pruebas

### Fase 1: Validación de Importación ✅ COMPLETADA
1. ✅ Tabla `tariffsPDF` creada
2. ✅ Función Edge desplegada
3. ✅ Componente frontend integrado
4. ✅ Flujo completo implementado

### Fase 2: Pruebas con PDF Real ⏳ PENDIENTE
1. Subir PDF oficial de tarifas GLS 2025
2. Verificar extracción de todos los servicios
3. Validar mapeo de nombres de servicios
4. Comprobar precisión de rangos de peso
5. Verificar valores numéricos en todas las columnas
6. Revisar manejo de casos especiales (Parcel Shop, Madeira, Azores, Ceuta/Melilla)

### Fase 3: Validación de Datos ⏳ PENDIENTE
```sql
-- Consultar datos importados
SELECT service_name, COUNT(*) as total_rows
FROM public.tariffsPDF
GROUP BY service_name
ORDER BY service_name;

-- Ver detalles de un servicio específico
SELECT *
FROM public.tariffsPDF
WHERE service_name = 'Urg8:30H Courier'
ORDER BY weight_from::int;

-- Verificar integridad de datos
SELECT
  service_name,
  weight_from,
  weight_to,
  provincial_sal IS NOT NULL as tiene_prov_sal,
  regional_sal IS NOT NULL as tiene_reg_sal,
  nacional_sal IS NOT NULL as tiene_nac_sal
FROM public.tariffsPDF
WHERE provincial_sal IS NULL AND regional_sal IS NULL AND nacional_sal IS NULL;
```

---

## 🚀 Próximos Pasos

### Después de Validar con PDF Real:

**Opción A: Usar tabla `tariffsPDF` en producción**
1. Actualizar referencias en `useSupabaseData.ts` para usar `tariffsPDF`
2. Mantener `custom_tariffs` como backup
3. Renombrar tablas si es necesario

**Opción B: Migrar datos de `tariffsPDF` a `custom_tariffs`**
```sql
-- Script de migración (ejemplo)
INSERT INTO public.custom_tariffs (
  user_id, service_name, weight_from, weight_to,
  provincial_sal, provincial_rec, provincial_int, provincial_arr,
  -- ... resto de columnas
)
SELECT
  '{USER_ID}'::uuid, -- ID del usuario objetivo
  service_name, weight_from, weight_to,
  provincial_sal, provincial_rec, provincial_int, provincial_arr,
  -- ... resto de columnas
FROM public.tariffsPDF
WHERE service_name = 'Urg8:30H Courier'; -- Migrar servicio por servicio
```

**Opción C: Mantener ambas tablas**
- `tariffsPDF`: Tarifas oficiales GLS importadas vía PDF
- `custom_tariffs`: Tarifas personalizadas por usuario
- Permitir al usuario elegir cuál usar en cada cálculo

---

## 📝 Puntos de Retorno Seguros

### Punto 1: Eliminar Tabla de Prueba
```sql
DROP TABLE IF EXISTS public.tariffsPDF CASCADE;
```

### Punto 2: Ocultar Botón de Importación
En `CustomTariffsEditor.tsx`, comentar líneas 648-661:
```typescript
// <button onClick={() => setShowPdfUploader(!showPdfUploader)} ...>
// {showPdfUploader && <TariffPdfUploader />}
```

### Punto 3: Desactivar Función Edge
- No es necesario, la función solo se ejecuta cuando se llama explícitamente
- No consume recursos si no se usa

### Punto 4: Restaurar Estado Anterior
```bash
# Todos los cambios están en archivos nuevos o adiciones no-destructivas
# No se modificaron funcionalidades existentes
# Los datos de producción (custom_tariffs) NO se tocan
```

---

## 🔍 Debugging y Logs

### Frontend (Consola del Navegador)
```javascript
// Revisar respuesta de la función Edge
console.log('Upload result:', uploadResult);
```

### Backend (Supabase Edge Function Logs)
- Acceder a Supabase Dashboard > Edge Functions > parse-pdf-tariff
- Ver logs en tiempo real durante importación
- Buscar errores de parsing o inserción

### Base de Datos
```sql
-- Ver últimas tarifas importadas
SELECT *
FROM public.tariffsPDF
ORDER BY created_at DESC
LIMIT 20;

-- Contar registros por servicio
SELECT service_name, COUNT(*)
FROM public.tariffsPDF
GROUP BY service_name;
```

---

## ✅ Checklist de Implementación

- [x] Crear migración de tabla `tariffsPDF`
- [x] Aplicar migración a base de datos
- [x] Crear función Supabase Edge `parse-pdf-tariff`
- [x] Desplegar función Edge
- [x] Crear componente `TariffPdfUploader.tsx`
- [x] Integrar uploader en `CustomTariffsEditor.tsx`
- [x] Configurar CORS en función Edge
- [x] Implementar manejo de errores completo
- [x] Añadir validación de tipos de archivo
- [x] Crear preview de datos importados
- [x] Documentar implementación
- [ ] Probar con PDF real de tarifas GLS 2025
- [ ] Validar extracción de todos los servicios
- [ ] Verificar precisión de datos importados
- [ ] Decidir estrategia de uso (tariffsPDF vs custom_tariffs)
- [ ] Crear guía de usuario final

---

## 📚 Referencias

**Archivos Creados:**
- `/supabase/migrations/20251024190000_create_tariffs_pdf_table.sql`
- `/supabase/functions/parse-pdf-tariff/index.ts`
- `/src/components/settings/TariffPdfUploader.tsx`

**Archivos Modificados:**
- `/src/components/settings/CustomTariffsEditor.tsx` (añadido botón y import)

**Tablas de Base de Datos:**
- `public.tariffsPDF` (nueva, prueba)
- `public.custom_tariffs` (existente, sin cambios)
- `public.custom_tariffs_active` (existente, sin cambios)

**Funciones Edge:**
- `parse-pdf-tariff` (nueva)

---

## 🎓 Notas Técnicas

### Limitaciones Actuales del Parser

1. **Parsing Básico de Texto:**
   - El PDF se procesa como texto plano
   - La detección de tablas depende de patrones de espacios y saltos de línea
   - PDFs con formato complejo pueden requerir ajustes

2. **Dependencia de Formato:**
   - Diseñado específicamente para "TARIFA RED_2025_ARRASTRE_PLANO"
   - Cambios en el formato del PDF pueden requerir actualización del parser

3. **Sin OCR:**
   - No procesa PDFs escaneados o con imágenes
   - Requiere PDF con texto seleccionable

### Posibles Mejoras Futuras

1. **Parser más Robusto:**
   - Integrar librería especializada en extracción de tablas PDF
   - Usar `pdf.js` o `pdfplumber` para mejor detección de estructuras

2. **Validación Avanzada:**
   - Comparar con tarifas existentes para detectar cambios anormales
   - Alertas de validación antes de confirmar importación

3. **Preview Interactivo:**
   - Permitir edición de datos antes de inserción
   - Confirmar servicio por servicio

4. **Historial de Importaciones:**
   - Guardar log de cada importación
   - Permitir rollback a versión anterior

5. **Importación Incremental:**
   - Detectar solo diferencias con datos existentes
   - Actualizar solo lo que cambió

---

## 📞 Soporte

**Documentación relacionada:**
- `CAMBIOS_CUSTOM_TARIFFS_FIX.md`: Historial de cambios en sistema de tarifas
- `RESUMEN_IMPLEMENTACION.md`: Resumen general de la aplicación

**Para problemas:**
1. Revisar logs de función Edge en Supabase Dashboard
2. Verificar consola del navegador para errores frontend
3. Consultar tabla `tariffsPDF` para ver datos importados
4. Usar puntos de retorno seguros si es necesario

---

**Última actualización:** 24 de Octubre de 2025, 19:30
**Estado:** ✅ IMPLEMENTADO - PENDIENTE DE PRUEBAS CON PDF REAL
**Riesgo:** 🟢 BAJO - Tabla aislada, sin impacto en producción
