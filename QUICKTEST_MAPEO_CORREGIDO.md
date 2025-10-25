# Test Rápido - Verificación de Mapeo Corregido

## Objetivo

Verificar que Business Parcel 1kg Provincial ahora muestra los valores correctos después del fix.

## Valores Esperados

### Business Parcel 1kg Provincial

```
provincial_arr: 1.01  ← Arrastre
provincial_sal: 2.18  ← Salidas
provincial_rec: 2.18  ← Recogidas
provincial_int: 3.35  ← Interciudad
```

## Procedimiento de Test

### 1. Subir PDF de Tarifas

1. Ir a la aplicación
2. Navegar a Settings → Custom Tariffs
3. Hacer clic en "Import from PDF" o botón similar
4. Seleccionar un PDF de tarifas GLS

### 2. Revisar Logs en la Consola

**Abrir la consola del navegador (F12) y buscar:**

#### A. Detección de Columnas
```
[ColumnDetector] Escaneando bloque completo: XX líneas en total
[ColumnDetector] Columnas detectadas en orden: [_arr, _sal, _rec, _int]
[ColumnDetector] IMPORTANTE: Orden esperado del PDF: [Recogida_IGNORAR, Arrastre, Entrega_IGNORAR, Salidas, Recogidas, Interciudad]
```

**✓ Verificar:** El orden debe ser `[_arr, _sal, _rec, _int]`

#### B. Extracción de Valores para 1kg
```
[NumericExtractor] Todos los números detectados en línea: [1, 1.17, 1.01, 1.17, 2.18, 2.18, 3.35]
[NumericExtractor] Valores seleccionados (posiciones 1,3,4,5 → _arr,_sal,_rec,_int): [1.01, 2.18, 2.18, 3.35]
```

**✓ Verificar:**
- Detecta 7 números en total (el primero es el peso "1")
- Selecciona posiciones [1, 3, 4, 5] → [1.01, 2.18, 2.18, 3.35]
- Ignora posiciones [0] (Recogida 1.17) y [2] (Entrega 1.17)

#### C. Mapeo Final
```
[Mapping] Business Parcel | 0-1kg | Zona: provincial | Valores: [1.01, 2.18, 2.18, 3.35] | Columnas: [_arr, _sal, _rec, _int]
[Consolidator]   → provincial_arr = 1.01
[Consolidator]   → provincial_sal = 2.18
[Consolidator]   → provincial_rec = 2.18
[Consolidator]   → provincial_int = 3.35
[Mapping] Resultado: provincial_arr=1.01, provincial_sal=2.18, provincial_rec=2.18, provincial_int=3.35
```

**✓ Verificar:** Cada valor se mapea al campo correcto

#### D. Preview Final
```
[Preview] Business Parcel 1kg Provincial: arr=1.01, sal=2.18, rec=2.18, int=3.35
```

**✓ Verificar:** El preview muestra los valores esperados

### 3. Verificar en la Base de Datos

**Opción A: Desde la UI**
1. Después de importar el PDF con éxito
2. Ir a Settings → Custom Tariffs
3. Buscar "Business Parcel"
4. Verificar el rango de peso "0-1 kg"
5. Comprobar que los valores coinciden:
   - Arrastre: 1.01
   - Salidas: 2.18
   - Recogidas: 2.18
   - Interciudad: 3.35

**Opción B: Consulta SQL Directa**
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
WHERE service_name = 'Business Parcel'
  AND weight_from = '0'
  AND weight_to = '1';
```

**Resultado Esperado:**
```
service_name      | weight_from | weight_to | provincial_arr | provincial_sal | provincial_rec | provincial_int
------------------|-------------|-----------|----------------|----------------|----------------|---------------
Business Parcel   | 0           | 1         | 1.01           | 2.18           | 2.18           | 3.35
```

## Checklist de Verificación

- [ ] Los logs muestran el orden correcto de columnas: `[_arr, _sal, _rec, _int]`
- [ ] Los logs muestran valores extraídos: `[1.01, 2.18, 2.18, 3.35]`
- [ ] El mapeo asigna cada valor al campo correcto
- [ ] El preview muestra los valores esperados
- [ ] La base de datos contiene los valores correctos
- [ ] No hay warnings de valores sospechosos para este caso
- [ ] provincial_arr = 1.01 (NO 2.18)
- [ ] provincial_rec = 2.18 (NO 3.35)
- [ ] provincial_int = 3.35 (NO null)

## Casos de Prueba Adicionales (Opcional)

### Business Parcel 3kg Provincial
```
Valores esperados en el PDF:
1 3 Kg. 1,51 1,32 1,51 2,54 2,54 3,82

Extracción esperada (posiciones 1,3,4,5):
[1.32, 2.54, 2.54, 3.82]

Mapeo esperado:
provincial_arr: 1.32
provincial_sal: 2.54
provincial_rec: 2.54
provincial_int: 3.82
```

### Business Parcel 1kg Regional
```
Valores esperados (si están en el PDF):
[X.XX, X.XX, X.XX, X.XX]

Mapeo esperado:
regional_arr: X.XX
regional_sal: X.XX
regional_rec: X.XX
regional_int: X.XX
```

## Qué Hacer si el Test Falla

### Problema: Orden de columnas incorrecto
**Síntoma:** Los logs muestran `[_sal, _rec, _int, _arr]` en lugar de `[_arr, _sal, _rec, _int]`

**Solución:**
- Verificar que el archivo `supabase/functions/parse-pdf-tariff/index.ts` tiene los cambios en líneas 564 y 671
- Re-desplegar la función Edge Function

### Problema: Valores extraídos incorrectos
**Síntoma:** Los logs muestran menos de 4 valores o valores en posiciones incorrectas

**Solución:**
- Verificar que la función `extractNumericValues()` está usando índices [1, 3, 4, 5]
- Revisar el PDF manualmente para confirmar la estructura
- Buscar en los logs si hay warnings de "Menos de 6 valores encontrados"

### Problema: Mapeo incorrecto
**Síntoma:** Los valores se asignan a campos diferentes de los esperados

**Solución:**
- Verificar el log `[Mapping]` que muestra la asignación campo por campo
- Confirmar que el orden de columnas detectado coincide con el orden de valores extraídos
- Buscar en los logs si hay `[ValidationWarning]` indicando valores sospechosos

### Problema: Preview no aparece
**Síntoma:** No se muestra el log `[Preview] Business Parcel 1kg Provincial`

**Solución:**
- Verificar que el servicio "Business Parcel" se detectó correctamente
- Confirmar que existe un registro con weight_from='0' y weight_to='1'
- Revisar si el mapeo se completó sin errores

## Logs de Depuración Completos

Si el test falla, capturar y compartir estos logs:

1. **Todos los logs con prefijo `[ColumnDetector]`**
2. **Todos los logs con prefijo `[NumericExtractor]`** para la línea de 1kg
3. **Todos los logs con prefijo `[Mapping]`** para Business Parcel 1kg
4. **El log `[Preview]`** si existe
5. **Cualquier log con prefijo `[Warning]`** o `[ValidationWarning]`**

## Notas

- Este test se centra específicamente en Business Parcel 1kg Provincial porque es el caso reportado como problemático
- Una vez confirmado este caso, el fix debería funcionar para todos los demás servicios con la misma estructura
- Los logs detallados permiten diagnosticar rápidamente cualquier problema
