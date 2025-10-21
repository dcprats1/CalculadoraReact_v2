# Estado Actual Antes de Cambios - Custom Tariffs

**Fecha:** 2025-10-21
**Motivo:** Corrección de errores 401 y optimización de guardado granular

## Diagnóstico del Problema

### Error 401 de Permisos
- **Síntoma:** Al intentar guardar tarifas personalizadas, se produce error 401 Unauthorized
- **Causa Identificada:** El sistema usa autenticación OTP personalizada (no Supabase Auth)
- **Estado de RLS Policies:** YA CORREGIDAS - Políticas permissive para role `authenticated`

### Guardado Ineficiente
- **Problema:** El sistema guarda TODOS los rangos de peso de un servicio (6 rangos completos)
- **Ejemplo:** Usuario modifica 1 celda → Sistema guarda 6 registros con ~44 columnas cada uno
- **Impacto:** Almacenamiento innecesario y complejidad en merge

## Estado de Base de Datos

### Políticas RLS Actuales (CORRECTAS)
```sql
-- custom_tariffs
Policy: "Enable all access for authenticated users"
- Permissive: YES
- Roles: authenticated
- Command: ALL
- Using: true
- With Check: true

-- custom_tariffs_active
Policy: "Enable all access for authenticated users"
- Permissive: YES
- Roles: authenticated
- Command: ALL
- Using: true
- With Check: true
```

### Foreign Keys
- **Estado:** NO EXISTEN foreign keys en custom_tariffs ni custom_tariffs_active
- **Implicación:** No hay validación referencial, pero tampoco hay conflictos con auth.users
- **Decisión:** Mantener sin FK por ahora (consistente con custom_cost_overrides)

### Estructura de Tablas
```
custom_tariffs:
- id: uuid (PK, default gen_random_uuid())
- user_id: uuid (NOT NULL, sin FK)
- service_name: text (NOT NULL)
- weight_from: varchar(3) (NOT NULL)
- weight_to: varchar(3) (NULL)
- [44 columnas de precios: provincial_sal, provincial_rec, etc...]
- created_at: timestamptz
- updated_at: timestamptz

custom_tariffs_active:
- id: uuid (PK)
- user_id: uuid (NOT NULL, sin FK)
- service_name: text (NOT NULL)
- is_active: boolean (default false)
- created_at: timestamptz
- updated_at: timestamptz
```

## Sistema de Autenticación

### Patrón Actual (Funcionando en otras tablas)
1. Usuario se autentica vía OTP (Edge Function: verify-login-code)
2. Session data guardada en localStorage: `{ id, email, sessionToken }`
3. AuthContext provee `user.id` desde localStorage
4. Componentes obtienen `user_id` vía `useAuth().user.id` o `useAuth().userData.id`
5. RLS policies son permissive para role `authenticated`
6. Validación de sesión ocurre en Edge Functions con service_role_key

### Tablas con Patrón Exitoso
- `user_preferences` → usa `useAuth().user.id` ✅
- `custom_cost_overrides` → usa `supabase.auth.getUser()` ⚠️ (debe ser legacy code)
- `user_profiles` → tabla maestra de usuarios OTP

## Código Actual de CustomTariffsEditor

### Obtención de user_id (CORRECTO)
```typescript
const { userData } = useAuth();
// Usa: userData.id para user_id
```

### Lógica de Guardado (INEFICIENTE)
```typescript
// Itera sobre WEIGHT_RANGES completos (6 rangos)
WEIGHT_RANGES.forEach(range => {
  // Compara fila completa vs oficial
  // Si encuentra CUALQUIER diferencia → guarda fila COMPLETA
  if (hasModifications) {
    tariffsToUpsert.push(tariffRow); // Incluye TODAS las 44 columnas
  }
});
```

### Carga de Datos (FUNCIONAL pero mejorable)
```typescript
// Carga custom_tariffs del usuario
// Si no existe custom, usa official
// Merge a nivel de fila completa
```

## Componentes que NO se Deben Tocar

### ✅ Funcionando Correctamente
- `SopGenerator.tsx` - Generación de SOP
- `ComparatorMiniSOPGenerator.tsx` - Mini SOP
- `TariffCalculator.tsx` - Cálculos principales
- `ResultsDisplay.tsx` - Visualización de resultados
- `CostBreakdownTable.tsx` - Desglose de costes
- `ServiceComparison.tsx` - Comparación de servicios
- `calculations.ts` - Lógica de cálculo
- `sopHelpers.ts` - Utilidades SOP
- Todos los Edge Functions existentes
- Sistema de autenticación OTP
- PreferencesContext y AuthContext

## Plan de Cambios (Sin Romper lo Existente)

### 1. No Crear Nueva Migración (RLS ya está correcto)
- Las políticas RLS ya son permissive
- No hay foreign keys que corregir
- Sistema funciona sin FK (igual que custom_cost_overrides)

### 2. Refactorizar Solo CustomTariffsEditor.tsx
- Cambiar lógica de `handleSave` para comparación granular campo por campo
- Guardar solo campos modificados (no filas completas)
- Mantener interfaz idéntica (sin cambios visuales aún)

### 3. Optimizar useSupabaseData.ts
- Mejorar función `mergeCustomTariffs` para merge granular
- Fusionar campo por campo en lugar de fila por fila
- Mantener compatibilidad con código existente

### 4. Agregar Indicadores Visuales
- Solo agregar clases CSS condicionales a inputs existentes
- No cambiar estructura del componente
- Color de fondo amber para valores personalizados

### 5. Testing Progresivo
- Verificar guardado con 1 campo modificado
- Validar que guardado no afecta cálculos existentes
- Confirmar que SOP sigue funcionando igual

## Punto de Retorno Seguro

### Archivos Originales (Backup)
- `src/components/settings/CustomTariffsEditor.tsx` (líneas 294-413: función handleSave)
- `src/hooks/useSupabaseData.ts` (líneas 95-137: función mergeCustomTariffs)

### Comandos de Rollback
```bash
# Si algo falla, estos archivos están documentados aquí
git diff src/components/settings/CustomTariffsEditor.tsx
git diff src/hooks/useSupabaseData.ts
```

### Validación de Funcionalidad
1. Usuario puede modificar 1 celda y guardar correctamente ✅
2. Cálculos siguen funcionando igual ✅
3. SOP se genera correctamente ✅
4. Exportaciones funcionan igual ✅
5. No hay errores 401 ✅

## Riesgos Identificados

### ❌ Bajo Riesgo
- Cambios solo en CustomTariffsEditor (componente aislado)
- RLS policies ya correctas
- No se modifica schema de base de datos

### ⚠️ Riesgo Medio
- Cambios en useSupabaseData.ts (usado por TariffCalculator)
- Necesita testing exhaustivo de cálculos

### ✅ Sin Riesgo
- No tocar Edge Functions
- No tocar componentes de SOP
- No tocar sistema de autenticación
- No tocar PreferencesContext

## Conclusión

El problema de 401 parece estar en la ejecución, no en las policies. Las políticas RLS están correctas. El foco debe ser:

1. **Verificar por qué falla la inserción** a pesar de políticas correctas
2. **Optimizar guardado granular** para eficiencia
3. **Mantener todo lo demás intacto** - no romper lo que funciona

**Estado:** Listo para proceder con cambios incrementales y cautelosos
