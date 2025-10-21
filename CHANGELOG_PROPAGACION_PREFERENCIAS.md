# Changelog: Propagación y Persistencia de Preferencias de Usuario

**Fecha:** 21 de Octubre de 2025
**Versión:** 1.0.0
**Responsable:** Sistema de desarrollo

---

## Resumen Ejecutivo

Se han implementado correcciones críticas para resolver problemas de propagación y persistencia de valores de configuración del usuario (SPC, Descuento Lineal y Tabla de Costes Personalizada).

---

## Problemas Resueltos

### 1. Propagación de Valores Fijos (SPC y Descuento Lineal)

**Problema:**
- Los valores de SPC y descuento lineal configurados en preferencias no se propagaban al panel principal
- Los valores no permanecían fijos en el perfil del usuario
- Solo se cargaban si los valores actuales eran 0

**Solución:**
- Modificado el `useEffect` en `TariffCalculator.tsx` (líneas 1586-1599)
- Los valores ahora se cargan SIEMPRE desde las preferencias al montar el componente
- Se actualizan automáticamente cuando las preferencias cambian
- El usuario puede modificar los valores "in situ" pero los cambios no se guardan automáticamente
- Para guardar permanentemente, debe usar el botón "Guardar cambios" en Usuario → Configuración → Preferencias

### 2. Validación del Botón de Tabla Personalizada

**Problema:**
- El botón "Tabla Oficial Activa" / "Tabla Personalizada Activa" no validaba la existencia de datos
- No había feedback al usuario si intentaba activar una tabla sin datos

**Solución:**
- Modificada la función `handleToggleCustomTariff` en `TariffCalculator.tsx` (líneas 1320-1368)
- Ahora verifica la existencia de tarifas personalizadas antes de activar
- Muestra mensaje informativo si no hay datos: "No tienes una tabla de costes personalizada creada para este servicio..."
- Guía al usuario hacia la ruta correcta: Usuario → Configuración → Tarifas Personalizadas

### 3. Unificación de Nombres de Campos

**Problema:**
- Desincronización entre los nombres de campos en la base de datos y el código
- La BD usa `fixed_spc_value` y `fixed_discount_percentage`
- El código usaba `fixed_spc` y `fixed_linear_discount`

**Solución:**
- Actualizado `PreferencesContext.tsx` (líneas 5-12, 53-64)
- Actualizado `PreferencesTab.tsx` (líneas 7-10, 15-23, 29-33, 78-114)
- Todos los componentes ahora usan los nombres correctos de la base de datos
- Mantenida compatibilidad con las migraciones existentes

---

## Archivos Modificados

### 1. `/src/contexts/PreferencesContext.tsx`
- **Cambios:**
  - Actualizada interface `UserPreferences` para usar `fixed_spc_value` y `fixed_discount_percentage`
  - Corregido el insert de nuevas preferencias con los nombres correctos

### 2. `/src/components/settings/PreferencesTab.tsx`
- **Cambios:**
  - Actualizado estado `formData` con los nombres correctos de campos
  - Corregido `useEffect` de carga de preferencias
  - Actualizado objeto `updates` en función `handleSave`
  - Modificados los inputs del formulario con los IDs y nombres correctos
  - Añadida aclaración sobre valores positivos/negativos en SPC

### 3. `/src/components/TariffCalculator.tsx`
- **Cambios:**
  - Reescrito `useEffect` de carga de preferencias (líneas 1586-1599)
  - Eliminada condición que bloqueaba la carga si los valores eran diferentes de 0
  - Añadida lógica de validación en `handleToggleCustomTariff` (líneas 1320-1368)
  - Implementada verificación de existencia de tarifas personalizadas
  - Añadidos mensajes de error informativos

---

## Comportamiento Actual del Sistema

### Carga Inicial (Al iniciar sesión)

1. El sistema carga las preferencias del usuario desde `user_preferences`
2. Si existe `fixed_spc_value`, se aplica automáticamente al campo SPC
3. Si existe `fixed_discount_percentage` (y es > 0), se aplica al descuento lineal
4. Estos valores aparecen en el panel "Ajustes de Costes"

### Modificación "In Situ"

1. El usuario puede modificar SPC y Descuento Lineal directamente en el panel principal
2. Estos cambios son temporales (solo para la sesión actual)
3. Los valores modificados se utilizan inmediatamente en los cálculos
4. NO se guardan automáticamente en el perfil

### Guardado Permanente

1. Para guardar valores permanentemente: Usuario → Configuración → Preferencias
2. Modificar los valores deseados
3. Hacer clic en "Guardar cambios"
4. Los valores quedarán guardados y se cargarán en futuras sesiones

### Tabla de Costes Personalizada

1. **Estado por defecto:** Tabla Oficial Activa (usa tarifas estándar)
2. **Crear tabla personalizada:** Usuario → Configuración → Tarifas Personalizadas
3. **Activar tabla personalizada:** Clic en el botón en el panel principal
4. **Validación:** El sistema verifica que existan datos antes de activar
5. **Mensaje de error:** Si no hay datos, informa al usuario dónde crearlos

---

## Validaciones Implementadas

### SPC (Suplemento Por Cliente)
- Tipo: `number` con 2 decimales
- Puede ser positivo o negativo
- Se aplica en los cálculos según las lógicas establecidas
- Valor NULL = no se aplica SPC fijo

### Descuento Lineal
- Tipo: `number` (porcentaje)
- Debe ser positivo (0-100)
- Se aplica en negativo en las lógicas de cálculo (ya establecidas en la app)
- Valor NULL = no se aplica descuento fijo

### Tabla Personalizada
- Verifica existencia de registros en `custom_tariffs` para el servicio seleccionado
- Verifica que el `user_id` coincida con el usuario actual
- Mensaje claro y guía al usuario si no hay datos

---

## Esquema de Base de Datos (Verificado)

```sql
-- Tabla: user_preferences
CREATE TABLE user_preferences (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  uses_custom_cost_table boolean NOT NULL DEFAULT false,
  fixed_spc_value numeric(10,2), -- Puede ser NULL, positivo o negativo
  fixed_discount_percentage numeric(5,2), -- Puede ser NULL, debe ser 0-100
  default_service_packages jsonb NOT NULL DEFAULT '[]',
  ui_theme text NOT NULL DEFAULT 'light',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## Testing Recomendado

### Escenario 1: Valores Configurados
1. Ir a Usuario → Configuración → Preferencias
2. Establecer SPC = 2.50 y Descuento = 5.0
3. Guardar cambios
4. Recargar la aplicación
5. **Verificar:** Los valores aparecen automáticamente en "Ajustes de Costes"

### Escenario 2: Modificación Temporal
1. Con valores configurados (SPC = 2.50, Descuento = 5.0)
2. En el panel principal, cambiar SPC a 3.00
3. Realizar cálculos (los cálculos usan 3.00)
4. Recargar la aplicación
5. **Verificar:** SPC vuelve a 2.50 (valor guardado en preferencias)

### Escenario 3: Tabla Personalizada Sin Datos
1. Asegurarse de no tener tarifas personalizadas para un servicio
2. Intentar activar "Tabla Personalizada"
3. **Verificar:** Aparece mensaje indicando dónde crear la tabla

### Escenario 4: Tabla Personalizada Con Datos
1. Ir a Usuario → Configuración → Tarifas Personalizadas
2. Editar y guardar tarifas para "Urg8:30H Courier"
3. En el panel principal, seleccionar "Urg8:30H Courier"
4. Clic en "Tabla Oficial Activa" → cambia a "Tabla Personalizada Activa"
5. **Verificar:** Los cálculos usan los valores personalizados

---

## Puntos de Retorno

### Commit Anterior
Si necesitas revertir estos cambios, los archivos modificados son:
- `src/contexts/PreferencesContext.tsx`
- `src/components/settings/PreferencesTab.tsx`
- `src/components/TariffCalculator.tsx`

### Base de Datos
No se han realizado cambios en la base de datos. La estructura ya existía correctamente.

---

## Notas Técnicas

1. **Dependencias del useEffect:** El useEffect de propagación solo depende de `preferences`, lo que significa que se ejecuta cuando:
   - El componente se monta (primera carga)
   - Las preferencias del usuario cambian (después de guardar en configuración)

2. **Prioridad de valores:**
   - Si hay valor en preferencias → se usa ese valor
   - Si el usuario modifica "in situ" → se usa el valor modificado temporalmente
   - Al recargar → vuelve al valor de preferencias

3. **Tabla personalizada vs Custom Cost Overrides:**
   - `custom_tariffs`: Tabla personalizada del usuario (por servicio)
   - `custom_cost_overrides`: Sistema antiguo (deprecado, pero aún funcional)
   - `custom_tariffs_active`: Controla qué servicios usan tabla personalizada

---

## Conclusión

Se han resuelto los tres problemas principales:
1. ✅ Propagación correcta de SPC y Descuento Lineal desde preferencias
2. ✅ Validación y feedback en el botón de tabla personalizada
3. ✅ Unificación de nombres de campos entre código y base de datos

El sistema ahora permite:
- Configurar valores por defecto que se cargan automáticamente
- Modificar valores temporalmente para ajustes puntuales
- Activar tablas personalizadas con validaciones apropiadas
- Recibir feedback claro sobre el estado del sistema

---

**Documentado por:** Sistema de desarrollo
**Revisado:** Pendiente
**Estado:** Implementado - Pendiente de testing
