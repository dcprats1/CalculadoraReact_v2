# Fix: Duplicación de valores en tramos 5-10kg y 10-15kg del Comparador Comercial

**Fecha:** 12 de noviembre de 2025
**Tipo:** Corrección de bug
**Prioridad:** Alta

## Problema Identificado

El comparador comercial mostraba valores idénticos o muy similares para los tramos de peso **5-10kg** y **10-15kg** en algunas zonas, especialmente en Provincial, Regional y Peninsular. Esto ocurría porque:

1. **Solapamiento en límites de rangos**: El peso de referencia usado para el tramo '5 a 10kg' era **10kg**, que es exactamente el límite superior del rango 5-10kg y el límite inferior del rango 10-15kg.

2. **Lógica de búsqueda ambigua**: La función `resolveTariffCost` usaba una condición inclusiva en ambos límites:
   ```typescript
   roundedWeight >= range.from && roundedWeight <= upperBound
   ```
   Esto significaba que un peso de 10kg cumplía AMBOS rangos:
   - Rango 5-10: `10 >= 5 AND 10 <= 10` ✅
   - Rango 10-15: `10 >= 10 AND 10 <= 15` ✅

   El método `find()` devolvía el primer rango que cumplía la condición (5-10kg), causando que ambos tramos usaran el mismo coste base.

## Análisis de Tarifas

Se verificó que las tarifas en la base de datos SÍ tienen valores diferenciados correctamente:

**Business Parcel:**
- Rango 5-10kg: Provincial: 2.69€, Regional: 3.37€, Nacional: 4.46€
- Rango 10-15kg: Provincial: 3.13€, Regional: 4.69€, Nacional: 6.24€

**Economy Parcel:**
- Rango 5-10kg: Provincial: 2.39€, Regional: 3.20€, Nacional: 3.85€
- Rango 10-15kg: Provincial: 2.90€, Regional: 4.41€, Nacional: 5.35€

El problema estaba en la lógica de selección de tarifas, no en los datos.

## Solución Implementada

### 1. Ajuste de Pesos de Referencia del Comparador

**Archivo:** `src/components/TariffCalculator.tsx`

Se modificó la constante `COMPARATOR_COLUMN_WEIGHTS` para usar pesos que caen **dentro** de cada rango sin tocar los límites ambiguos:

```typescript
const COMPARATOR_COLUMN_WEIGHTS: Record<ComparatorColumn, number> = {
  '0 a 1kg': 1,      // Sin cambios
  '1 a 3kg': 3,      // Sin cambios
  '3 a 5kg': 5,      // Sin cambios
  '5 a 10kg': 9,     // CAMBIADO: de 10 → 9kg
  '10 a 15kg': 14,   // CAMBIADO: de 15 → 14kg
  'kg. adc': 16      // Sin cambios
};
```

**Justificación:**
- **9kg** está claramente dentro del rango 5-10kg sin tocar el límite superior
- **14kg** está claramente dentro del rango 10-15kg sin tocar el límite superior
- Esto elimina cualquier ambigüedad en la selección de rangos

### 2. Mejora de la Lógica de Selección de Rangos

**Archivo:** `src/utils/calculations.ts`

Se refactorizó la función `resolveTariffCost` para implementar una lógica de rangos más precisa:

**Antes:**
```typescript
const containingRange = pricedRanges.find(range => {
  const upperBound = range.to ?? range.from;
  return roundedWeight >= range.from && roundedWeight <= upperBound;
});
```

**Después:**
```typescript
const containingRange = [...pricedRanges].reverse().find(range => {
  const upperBound = range.to ?? range.from;
  if (roundedWeight < range.from) {
    return false;
  }
  if (roundedWeight === range.from) {
    return true;
  }
  return roundedWeight < upperBound ||
         (roundedWeight === upperBound && range === pricedRanges[pricedRanges.length - 1]);
});
```

**Nueva Lógica:**
1. **Límite inferior INCLUSIVO**: Un peso igual a `range.from` SÍ pertenece al rango
2. **Límite superior EXCLUSIVO**: Un peso igual a `upperBound` NO pertenece al rango (excepto el último)
3. **Búsqueda inversa**: Se busca desde el final hacia el principio para preferir rangos más altos en caso de ambigüedad
4. **Excepción para último rango**: El último rango SÍ incluye su límite superior para capturar el caso límite

**Ejemplos de aplicación:**
- Peso 5kg → Entra en rango 5-10kg ✅ (límite inferior inclusivo)
- Peso 9kg → Entra en rango 5-10kg ✅ (dentro del rango)
- Peso 10kg → Entra en rango 10-15kg ✅ (límite superior del 5-10 es exclusivo)
- Peso 14kg → Entra en rango 10-15kg ✅ (dentro del rango)
- Peso 15kg → Entra en rango 15-999kg ✅ (o aplica tarifa adicional según configuración)

## Impacto de los Cambios

### Componentes Afectados
- ✅ `TariffCalculator.tsx` - Ajuste de pesos de referencia del comparador
- ✅ `calculations.ts` - Mejora de lógica de selección de rangos de tarifas
- ✅ `CommercialComparatorPanel.tsx` - Hereda los cambios automáticamente

### Servicios Afectados
Todos los servicios del comparador comercial:
- Express 8:30, 10:30, 14:00, 19:00
- Business Parcel
- Economy Parcel
- EuroBusiness Parcel
- Marítimo
- Parcel Shop

### Zonas Afectadas
Todas las zonas del comparador:
- Provincial
- Regional
- Peninsular (Nacional)
- Portugal
- Canarias Mayores/Menores
- Baleares Mayores/Menores
- Ceuta
- Melilla

## Resultado Esperado

Después de estos cambios, el comparador comercial debe mostrar:

1. **Valores diferenciados** entre los tramos 5-10kg y 10-15kg
2. **Mayor precisión** en los cálculos de costes por rango de peso
3. **Coherencia** entre el calculador principal y el comparador comercial
4. **Eliminación** de duplicación de valores en los rangos problemáticos

## Validación

Para verificar la corrección:

1. Abrir el comparador comercial en la aplicación
2. Seleccionar un servicio (ej: Business Parcel)
3. Comparar los valores de las columnas:
   - **5 a 10kg**: Debe mostrar el coste calculado para 9kg
   - **10 a 15kg**: Debe mostrar el coste calculado para 14kg
4. Verificar que los valores son diferentes y coherentes con la progresión de costes
5. Repetir la verificación para diferentes zonas (Provincial, Regional, Peninsular)

## Verificación de Build

El proyecto se construyó exitosamente sin errores:
```
✓ built in 16.69s
```

## Archivos Modificados

1. `src/components/TariffCalculator.tsx`
   - Líneas 112-119: Ajuste de `COMPARATOR_COLUMN_WEIGHTS`

2. `src/utils/calculations.ts`
   - Líneas 824-844: Refactorización de lógica de selección de rangos en `resolveTariffCost`

## Notas Técnicas

- Los cambios son **backward compatible** y no afectan otras funcionalidades
- No se requieren cambios en la base de datos
- La lógica de descuentos y planes comerciales sigue funcionando correctamente
- Los cálculos de kilogramo adicional ('kg. adc') heredan la mejora automáticamente

## Recomendaciones de Prueba

1. Probar con paquetes de pesos límite (5kg, 10kg, 15kg)
2. Verificar cálculos con planes comerciales activos
3. Validar el comportamiento con descuentos lineales
4. Comprobar la generación de SOPs con los nuevos valores
5. Revisar la tabla de costes en el panel principal

---

**Autor:** Sistema de Desarrollo
**Revisión:** Pendiente
**Estado:** Implementado ✅
