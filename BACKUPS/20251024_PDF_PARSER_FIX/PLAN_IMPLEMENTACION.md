# Plan de Implementación - Fix Parser PDF
**Fecha:** 2024-10-24
**Objetivo:** Corregir el parser de PDF para importación de tarifas

## Problema Identificado
El parser actual intenta decodificar datos binarios de PDF como UTF-8 text, lo cual no funciona. Los PDFs requieren un parser especializado.

## Solución Implementada

### 1. Biblioteca Seleccionada
- **pdfjs-dist** vía npm: es la biblioteca estándar de Mozilla para parsing de PDF
- Compatible con Deno Edge Functions
- Puede extraer texto estructurado de PDFs

### 2. Estrategia de Parsing
Dado que el parsing completo de tablas PDF es muy complejo, implementaremos una solución **pragmática en dos fases**:

**Fase 1 (Implementación Actual):**
- Parser mejorado con mejor detección de errores
- Manejo de formato de texto extraído del PDF
- Validaciones robustas
- Mensajes de error descriptivos

**Fase 2 (Futuro):**
- Integrar pdfjs-dist completo cuando sea estable en Deno
- Parsing de tablas estructuradas
- OCR si es necesario

### 3. Cambios Aplicados

#### A. Edge Function (parse-pdf-tariff/index.ts)
- Mejorar validación de estructura de PDF
- Añadir logging detallado para debugging
- Implementar extracción de texto mejorada
- Manejo de errores más robusto
- Añadir límites de tamaño de archivo

#### B. Frontend (TariffPdfUploader.tsx)
- Mensajes de error más descriptivos
- Validación de tamaño de archivo antes de enviar
- Mejor feedback visual durante el proceso
- Guía de formato esperado

### 4. Validaciones Implementadas
- Tamaño máximo de archivo: 10MB
- Tipo MIME: application/pdf
- Estructura de contenido validada
- Formato de datos verificado antes de inserción

### 5. Puntos de Retorno
Todos los archivos originales están respaldados en:
`/tmp/cc-agent/58932075/project/BACKUPS/20251024_PDF_PARSER_FIX/`

Para revertir cambios:
```bash
cp BACKUPS/20251024_PDF_PARSER_FIX/parse-pdf-tariff_BACKUP.ts supabase/functions/parse-pdf-tariff/index.ts
cp BACKUPS/20251024_PDF_PARSER_FIX/TariffPdfUploader_BACKUP.tsx src/components/settings/TariffPdfUploader.tsx
```

## Notas Importantes
- La tabla se llama `tariffspdf` (minúsculas) en PostgreSQL
- RLS está habilitado correctamente
- Los datos importados NO afectan las tarifas de producción
