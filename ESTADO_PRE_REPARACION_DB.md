# Estado de Base de Datos PRE-Reparación

**Fecha**: 2025-10-21
**Autor**: Claude Code
**Propósito**: Documentar estado actual antes de aplicar migraciones de reparación

---

## Errores Detectados en Consola

```
1. Error 404: /rest/v1/rpc/get_user_activity_summary
   - Función RPC no existe en la base de datos

2. Error 400: /rest/v1/user_preferences?user_id=eq.639efa1a-5582-4c37-8225-7804bba6045c
   - Campos faltantes en tabla user_preferences
   - Error en PreferencesContext al intentar actualizar preferencias
```

---

## Estado Actual de Tablas

### Tablas Existentes en public schema:
- ✅ user_profiles (existe)
- ✅ user_preferences (existe, pero incompleta)
- ✅ users (existe - tabla antigua del modelo anterior)
- ❌ user_activity_stats (NO EXISTE - causa error 404)
- ❌ user_daily_activity (NO EXISTE - causa error 404)

### Estructura de user_preferences (ACTUAL):

| Columna | Tipo | Nullable |
|---------|------|----------|
| id | uuid | NO |
| user_id | uuid | NO |
| uses_custom_cost_table | boolean | NO |
| fixed_spc_value | numeric | YES |
| fixed_discount_percentage | numeric | YES |
| default_service_packages | jsonb | NO |
| ui_theme | text | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

**CAMPOS FALTANTES** (requeridos por frontend):
- ❌ agency_name
- ❌ agency_address
- ❌ agency_postal_code
- ❌ agency_city
- ❌ agency_province
- ❌ agency_email
- ❌ agency_name_number
- ❌ agency_postal_town
- ❌ fixed_spc (alias de fixed_spc_value)
- ❌ fixed_linear_discount (alias de fixed_discount_percentage)

### Foreign Keys de user_preferences:
- ✅ user_id → user_profiles(id) [constraint: user_preferences_user_id_fkey_to_profiles]
- Estado: CORRECTO (apunta a user_profiles, no a users)

---

## Funciones RPC

### get_user_activity_summary:
- ❌ NO EXISTE (causa error 404 en frontend)
- Esperado por: src/hooks/useUserStats.ts:54

---

## Análisis de Riesgo

### BAJO RIESGO:
1. Añadir columnas nullable a user_preferences (no rompe datos existentes)
2. Crear tablas user_activity_stats y user_daily_activity (nuevas, no afectan existentes)
3. Crear función RPC get_user_activity_summary (nueva)

### RIESGO MEDIO:
1. Renombrar columnas (fixed_spc_value → fixed_spc) - requiere migración de datos
2. Modificar estructura de PK (id → user_id como PK) - requiere recrear tabla

### EVITAR (ALTO RIESGO):
1. ❌ DROP TABLE de cualquier tabla existente
2. ❌ DROP COLUMN de columnas con datos
3. ❌ Modificar foreign keys sin verificar dependencias

---

## Plan de Acción Seguro

### Fase 1: Añadir Campos Faltantes (BAJO RIESGO)
- Añadir columnas de agencia a user_preferences
- Todas las columnas serán nullable para no romper datos existentes
- No tocar columnas existentes

### Fase 2: Crear Tablas de Actividad (BAJO RIESGO)
- Crear user_activity_stats
- Crear user_daily_activity
- Crear función RPC get_user_activity_summary
- Todas son tablas/funciones nuevas, no afectan existentes

### Fase 3: Verificación (SIN RIESGO)
- Consultar tablas creadas
- Probar función RPC
- Verificar que frontend puede leer datos

---

## Notas de Compatibilidad

El código frontend espera estos nombres de campo en PreferencesContext:
```typescript
interface UserPreferences {
  id: string;
  user_id: string;
  uses_custom_cost_table: boolean;
  fixed_spc_value: number | null;           // ✅ existe
  fixed_discount_percentage: number | null; // ✅ existe
  default_service_packages: any[];          // ✅ existe
  ui_theme: 'light' | 'dark';              // ✅ existe
  agency_name_number: string | null;        // ❌ falta
  agency_address: string | null;            // ❌ falta
  agency_postal_town: string | null;        // ❌ falta
  agency_province: string | null;           // ❌ falta
  agency_email: string | null;              // ❌ falta
}
```

---

## Punto de Retorno

Si algo sale mal, las migraciones pueden revertirse eliminando:
1. Las columnas añadidas (ALTER TABLE DROP COLUMN)
2. Las tablas creadas (DROP TABLE)
3. La función RPC (DROP FUNCTION)

**IMPORTANTE**: No se eliminarán datos existentes en ningún momento.

---

## Siguiente Paso

Crear migración: `20251021_fix_missing_user_preferences_and_activity_tables.sql`
