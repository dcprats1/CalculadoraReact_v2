# Solución Temporal - Validación de Tarifa Deshabilitada

## Fecha: 2025-11-12

## Problema

La aplicación estaba mostrando la pantalla de **upload de PDF** en lugar del **login** porque:

1. ✅ Tenías una sesión previa guardada en `localStorage`
2. ✅ El sistema te reconocía como autenticado
3. ❌ El hook `useRequireActivation` llamaba a la Edge Function `check-tariff-activation`
4. ❌ Esta Edge Function **NO está desplegada aún**
5. ❌ La llamada fallaba → retornaba `isActivated: false`
6. ❌ Mostraba la pantalla de upload en lugar de la app

## Solución Temporal Implementada

He añadido un flag `ENABLE_TARIFF_VALIDATION` en `App.tsx`:

```typescript
const ENABLE_TARIFF_VALIDATION = false; // Deshabilitado temporalmente
```

### Cambios en el código:

**ANTES:**
```typescript
if (isLoading || isLoadingActivation) {
  return <Loader />;
}

if (!isActivated) {
  return <PDFUploadGate />;
}
```

**AHORA:**
```typescript
// Solo espera isLoadingActivation si la validación está habilitada
if (isLoading || (ENABLE_TARIFF_VALIDATION && isLoadingActivation)) {
  return <Loader />;
}

// Solo muestra upload si la validación está habilitada y el usuario NO está activado
if (ENABLE_TARIFF_VALIDATION && !isActivated) {
  return <PDFUploadGate />;
}
```

## Comportamiento Actual

Con `ENABLE_TARIFF_VALIDATION = false`:

1. ✅ Usuario accede a la app
2. ✅ Si NO está autenticado → ve LOGIN
3. ✅ Usuario ingresa OTP y se autentica
4. ✅ **Salta la validación de tarifa PDF**
5. ✅ Accede directamente a `TariffCalculator`

## Para Habilitar la Validación de Tarifa

Cuando las Edge Functions estén desplegadas:

### Paso 1: Desplegar Edge Functions

```bash
npx supabase functions deploy check-tariff-activation
npx supabase functions deploy upload-and-validate-tariff
npx supabase functions deploy parse-pdf-tariff
```

### Paso 2: Verificar que funcionen

```bash
# Test check-tariff-activation
curl -X POST https://tu-proyecto.supabase.co/functions/v1/check-tariff-activation \
  -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'

# Test upload-and-validate-tariff
curl -X POST https://tu-proyecto.supabase.co/functions/v1/upload-and-validate-tariff \
  -H "Authorization: Bearer ANON_KEY" \
  -F "pdf=@tarifa.pdf" \
  -F "userId=test-user-id"
```

### Paso 3: Habilitar en el código

En `src/App.tsx`, línea 16:

```typescript
const ENABLE_TARIFF_VALIDATION = true; // Cambiar a true
```

### Paso 4: Recompilar y desplegar

```bash
npm run build
```

## Flujo Completo con Validación Habilitada

```
1. Usuario accede (no autenticado)
   ↓
2. Ve LoginContainer
   ↓
3. Ingresa email + OTP
   ↓
4. Se autentica (sesión en localStorage)
   ↓
5. Sistema llama a check-tariff-activation
   ↓
6. Si NO está activado → Muestra PDFUploadGate
   ↓
7. Usuario sube PDF
   ↓
8. Sistema llama a upload-and-validate-tariff
   ↓
9. Valida PDF (parse-pdf-tariff)
   ↓
10. Si válido → is_activated = true
    ↓
11. Recarga y muestra TariffCalculator
```

## Estado Actual del Proyecto

- ✅ Proyecto compila sin errores
- ✅ Login funciona correctamente
- ✅ App accesible sin validación de tarifa
- ⚠️ Validación de tarifa PDF deshabilitada temporalmente
- ⏳ Pendiente: Desplegar 3 Edge Functions

## Archivos Creados para Validación

1. ✅ `supabase/functions/check-tariff-activation/index.ts`
2. ✅ `supabase/functions/upload-and-validate-tariff/index.ts`
3. ✅ `supabase/functions/parse-pdf-tariff/index.ts` (actualizado con sistema de títulos)
4. ✅ `supabase/functions/parse-pdf-tariff/secure-title-map.ts`

## Tabla de Base de Datos

La tabla `user_tariff_activation` ya existe con estructura:

```sql
CREATE TABLE user_tariff_activation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id),
  pdf_uploaded_at timestamptz,
  pdf_filename text,
  pdf_validation_score integer CHECK (0 <= pdf_validation_score <= 100),
  is_activated boolean DEFAULT false,
  activation_date timestamptz,
  pdf_storage_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Migración RLS Aplicada

Las políticas RLS permisivas para `anon` ya están aplicadas:
- ✅ `user_tariff_activation`: INSERT, SELECT, UPDATE
- ✅ `storage.objects` (bucket: user-tariff-pdfs): INSERT, SELECT, UPDATE, DELETE

## Próximos Pasos

1. **Desplegar las 3 Edge Functions** usando las credenciales de Supabase
2. **Probar el flujo completo** con un PDF de tarifas GLS
3. **Cambiar `ENABLE_TARIFF_VALIDATION = true`** en `App.tsx`
4. **Recompilar y desplegar**

## Notas Importantes

### ¿Por qué tenías sesión previa?

El `AuthContext` guarda la sesión en `localStorage` con clave `user_session`. Si accediste anteriormente y te autenticaste, la sesión persiste hasta que:
- Expira (24 horas)
- Haces logout
- Borras `localStorage`

### Para forzar logout y ver el login:

```javascript
// En consola del navegador
localStorage.removeItem('user_session');
window.location.reload();
```

O añadir un botón de "Cerrar sesión" que llame a `signOut()` del `AuthContext`.

## Conclusión

La app ahora funciona correctamente:
- ✅ Muestra login cuando NO estás autenticado
- ✅ Muestra la app cuando SÍ estás autenticado
- ⚠️ Salta la validación de tarifa PDF (temporalmente)

Una vez desplegadas las Edge Functions, el sistema de validación de PDF estará completamente funcional con detección de 38 títulos específicos sin depender del año 2025.
