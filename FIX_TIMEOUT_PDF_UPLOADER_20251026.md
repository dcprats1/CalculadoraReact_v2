# Fix Timeout PDF Uploader - 2025-10-26

## Problema Reportado

El usuario experimentaba un error de timeout al subir PDFs de tarifas:
```
AbortError: signal is aborted without reason
Error: Timeout: El servidor tardó más de 2 minutos en responder
```

La función edge `parse-pdf-tariff` tardaba más de 2 minutos en procesar el PDF completo, causando que la petición se cortara antes de completarse.

## Solución Implementada

### 1. Aumento del Timeout (2 → 5 minutos)

**Antes:**
```typescript
const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos
```

**Después:**
```typescript
const timeoutId = setTimeout(() => {
  console.warn('[TariffPdfUploader] Timeout alcanzado después de 5 minutos');
  controller.abort();
}, 300000); // 5 minutos
```

**Beneficio:** Da más tiempo al servidor para procesar PDFs grandes o complejos.

### 2. Indicador de Progreso en Tiempo Real

**Nuevo Estado:**
```typescript
const [uploadProgress, setUploadProgress] = useState<string>('');
const [elapsedTime, setElapsedTime] = useState<number>(0);
```

**Mensajes de Progreso:**
1. "Preparando archivo..."
2. "Enviando PDF al servidor..."
3. "Procesando PDF (esto puede tardar varios minutos)..."
4. "Procesando respuesta..."

**Contador de Tiempo:**
```typescript
const progressInterval = setInterval(() => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  setElapsedTime(elapsed);
}, 1000);
```

### 3. Interfaz Visual de Progreso

**Nuevo Componente:**
```tsx
{isUploading && uploadProgress && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="flex items-center gap-3 mb-2">
      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      <div className="flex-1">
        <p className="text-sm font-medium text-blue-900">{uploadProgress}</p>
        <p className="text-xs text-blue-700 mt-1">
          Tiempo transcurrido: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
          {elapsedTime > 120 && (
            <span className="ml-2 text-yellow-700">
              (El procesamiento puede tardar hasta 5 minutos)
            </span>
          )}
        </p>
      </div>
    </div>
    <div className="w-full bg-blue-200 rounded-full h-2">
      <div className="bg-blue-600 h-full rounded-full animate-pulse"></div>
    </div>
  </div>
)}
```

**Características:**
- Spinner animado
- Mensaje de estado actual
- Contador de tiempo en formato MM:SS
- Advertencia visual después de 2 minutos
- Barra de progreso animada

### 4. Manejo Robusto de Errores

**Mensaje de Error Mejorado:**
```typescript
if (fetchError instanceof Error && fetchError.name === 'AbortError') {
  throw new Error(
    `Timeout: El servidor no respondió en 5 minutos. ` +
    `El archivo puede ser demasiado grande o complejo. ` +
    `Tiempo transcurrido: ${Math.floor((Date.now() - startTime) / 1000)}s`
  );
}
```

### 5. Limpieza Automática de Recursos

**Prevención de Memory Leaks:**
```typescript
try {
  // ... procesamiento ...
} catch (fetchError) {
  clearTimeout(timeoutId);
  if (progressInterval) clearInterval(progressInterval);
  // ... manejo de error ...
} finally {
  setIsUploading(false);
  setUploadProgress('');
  if (progressInterval) clearInterval(progressInterval);
}
```

**Garantiza:**
- Limpieza del timeout en todos los casos
- Limpieza del intervalo de progreso
- Reset del estado de la UI
- No quedan timers activos en background

## Beneficios de la Solución

### Para el Usuario:

1. **Visibilidad Total:**
   - Ve exactamente qué está pasando en cada momento
   - Contador de tiempo transcurrido
   - Advertencia si el proceso es largo

2. **Sin Congelaciones:**
   - El timeout aumentado permite completar el proceso
   - Interfaz responsiva durante todo el proceso
   - Limpieza automática evita cuelgues

3. **Mejor Feedback:**
   - Mensajes claros en cada etapa
   - Errores informativos con detalles
   - Tiempo transcurrido en caso de error

### Para el Sistema:

1. **Recursos Controlados:**
   - Limpieza automática de intervalos
   - Timeout máximo de 5 minutos
   - No hay memory leaks

2. **Debugging Mejorado:**
   - Logs detallados en consola
   - Información de tiempo transcurrido
   - Estado del proceso visible

## Ejemplo de Uso

### Proceso Normal (< 5 minutos):

```
1. Usuario selecciona PDF
2. Click en "Importar Tarifas"
3. Ve: "Preparando archivo..." (0:00)
4. Ve: "Enviando PDF al servidor..." (0:01)
5. Ve: "Procesando PDF (esto puede tardar varios minutos)..." (0:02)
6. Ve: "Procesando respuesta..." (2:45)
7. Éxito: "30 tarifas importadas correctamente"
```

### Proceso Largo (> 2 minutos):

```
1. Usuario selecciona PDF grande
2. Click en "Importar Tarifas"
3. Ve contador: 0:00, 0:30, 1:00, 1:30, 2:00
4. Después de 2:00 aparece advertencia:
   "Tiempo transcurrido: 2:15 (El procesamiento puede tardar hasta 5 minutos)"
5. Continúa viendo el progreso sin interrupciones
6. Éxito al minuto 3:42
```

### Caso de Error (timeout real):

```
1. Usuario selecciona PDF muy complejo
2. Proceso tarda más de 5 minutos
3. Ve el tiempo transcurrir: 3:00, 4:00, 5:00
4. Error claro: "Timeout: El servidor no respondió en 5 minutos.
   El archivo puede ser demasiado grande o complejo.
   Tiempo transcurrido: 300s"
```

## Archivos Modificados

- `src/components/settings/TariffPdfUploader.tsx`
  - Líneas 39-45: Nuevos estados `uploadProgress` y `elapsedTime`
  - Líneas 124-139: Inicialización del contador de progreso
  - Líneas 159-185: Actualización de mensajes y limpieza
  - Líneas 239-246: Manejo mejorado de timeout
  - Líneas 381-423: Nueva UI de progreso visual

## Testing Recomendado

1. **Archivo pequeño (< 1MB):** Debería completarse en menos de 1 minuto
2. **Archivo mediano (1-5MB):** Debería completarse en 1-3 minutos
3. **Verificar contador:** El tiempo debe actualizarse cada segundo
4. **Verificar limpieza:** Después del proceso (éxito o error), no deben quedar timers activos
5. **Verificar advertencia:** Después de 2 minutos debe aparecer el mensaje de advertencia

## Compatibilidad

- ✅ React 18.3.1
- ✅ TypeScript 5.5.3
- ✅ Supabase Edge Functions
- ✅ Todos los navegadores modernos

## Build Status

```
✓ 1587 modules transformed
✓ built in 11.72s
✓ Sin errores de TypeScript
```
