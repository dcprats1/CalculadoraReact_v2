# Plan de Implementación - Corrección Parser PDF

**Fecha:** 25 de Octubre de 2025
**Ejecutado por:** Claude Code Agent
**Estado:** COMPLETADO

---

## Problema Identificado

El sistema de importación de tarifas desde PDF retornaba error:
```
"No se pudieron extraer tarifas del PDF"
debugInfo.sampleLines: [caracteres corruptos/basura]
processedLines: 1718
tariffsFound: 0
```

**Causa:** Parser de PDF demasiado básico que no manejaba correctamente:
- Streams comprimidos
- Operadores de texto PDF
- Secuencias de escape
- Diferentes formatos de nombres de servicios

---

## Estrategia de Implementación

### 1. Seguridad
- ✅ Crear backup completo de función actual
- ✅ Mantener tabla de prueba `tariffspdf` aislada
- ✅ No modificar código frontend
- ✅ No afectar tabla de producción `custom_tariffs`

### 2. Mejoras Implementadas

#### A. Parser de PDF Robusto
- Detección y salto de streams comprimidos (FlateDecode)
- Extracción de operadores Tj (texto simple)
- Extracción de operadores TJ (arrays de texto)
- Decodificación de escape sequences (\n, \r, \t, etc.)
- Sistema de 3 niveles de fallback

#### B. Detección de Servicios Mejorada
- Mapeo con arrays de keywords (3-6 por servicio)
- Búsqueda case-insensitive
- Matching flexible por substring

#### C. Detección de Pesos con RegEx
- Patrones RegEx en lugar de strings exactos
- Soporte para diferentes formatos numéricos
- Manejo de guiones cortos y largos
- 4-5 patrones por rango de peso

#### D. Sistema de Debugging Avanzado
- Logs detallados en cada etapa
- Samples de texto extraído en errores
- Estadísticas de procesamiento
- Información de confianza mejorada

### 3. Despliegue
- ✅ Función desplegada en Supabase Edge Runtime
- ✅ Verificación automática de secretos
- ✅ Sin cambios en configuración necesarios

---

## Resultados Esperados

### Antes
- 0% de extracción exitosa
- Errores genéricos
- Sin información de debug útil

### Después
- 80-95% de extracción exitosa esperada
- Errores específicos con sugerencias
- Debug completo con samples de texto

---

## Puntos de Restauración

### Restaurar función anterior
```bash
# Copiar backup
cp BACKUPS/20251025_PDF_PARSER_IMPROVEMENT/parse-pdf-tariff_BACKUP.ts \
   supabase/functions/parse-pdf-tariff/index.ts

# Redesplegar
# (usar herramientas de Supabase)
```

### Limpiar tabla de prueba
```sql
DELETE FROM public.tariffspdf;
```

---

## Siguiente Paso

**CRÍTICO:** Probar con PDF real de tarifas GLS 2025 para validar mejoras.
