import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFValidator } from './pdf-validator.ts';
import { MapBasedExtractor } from './map-based-extractor.ts';
import { TARIFF_MAP_2025 } from './tariff-map.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface PageData {
  pageNum: number;
  items: TextItem[];
  width: number;
  height: number;
}

async function extractStructuredTextFromPDF(uint8Array: Uint8Array): Promise<PageData[]> {
  try {
    console.log('[PDF Parser] Cargando PDF.js...');
    const { getDocument, version } = await import("npm:pdfjs-dist@4.0.379/legacy/build/pdf.mjs");
    console.log(`[PDF Parser] PDF.js v${version} cargado`);

    const loadingTask = getDocument({
      data: uint8Array,
      verbosity: 0,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    console.log(`[PDF Parser] PDF cargado: ${numPages} páginas`);

    const pages: PageData[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const items = textContent.items.map((item: any) => ({
        str: item.str,
        transform: item.transform,
        width: item.width,
        height: item.height,
      }));

      pages.push({
        pageNum,
        items,
        width: viewport.width,
        height: viewport.height,
      });

      console.log(`[PDF Parser] Página ${pageNum}/${numPages}: ${items.length} elementos extraídos`);
    }

    return pages;

  } catch (error) {
    console.error('[PDF Parser] Error con PDF.js:', error);
    throw new Error(`Error al extraer texto del PDF: ${error.message}`);
  }
}

Deno.serve(async (req: Request) => {
  console.log(`[PDF Parser MAP] Nueva petición: ${req.method}`);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await req.formData();
    const pdfFile = formData.get("pdf") as File;

    if (!pdfFile) {
      return new Response(
        JSON.stringify({
          error: "No se proporcionó archivo PDF",
          details: "Selecciona un archivo PDF de tarifas GLS",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pdfFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: "Archivo demasiado grande",
          details: `El archivo debe ser menor a ${MAX_FILE_SIZE / 1024 / 1024} MB`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser MAP] Procesando: ${pdfFile.name} (${pdfFile.size} bytes)`);

    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const pages = await extractStructuredTextFromPDF(uint8Array);
    console.log(`[PDF Parser MAP] ${pages.length} páginas extraídas`);

    // PASO 1: Validar estructura del PDF
    console.log(`\n[PDF Parser MAP] ========== VALIDACIÓN DE ESTRUCTURA ==========`);
    const validation = PDFValidator.validate(pages);

    if (!validation.isValid) {
      console.error(`[PDF Parser MAP] ❌ PDF no válido:`);
      validation.errors.forEach(err => console.error(`[PDF Parser MAP]   - ${err}`));

      return new Response(
        JSON.stringify({
          error: "PDF no válido",
          details: validation.errors.join('; '),
          warnings: validation.warnings,
          metadata: validation.metadata
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (validation.warnings.length > 0) {
      console.log(`[PDF Parser MAP] ⚠ Advertencias:`);
      validation.warnings.forEach(warn => console.log(`[PDF Parser MAP]   - ${warn}`));
    }

    console.log(`[PDF Parser MAP] ✓ PDF válido`);
    console.log(`[PDF Parser MAP] Servicios detectados en validación: ${validation.metadata.servicesDetected.join(', ')}`);
    console.log(`[PDF Parser MAP] Versión: ${validation.metadata.structureVersion}`);

    // PASO 2: Extraer metadatos
    const metadata = PDFValidator.extractMetadata(pages);
    console.log(`[PDF Parser MAP] Metadatos: ${JSON.stringify(metadata)}`);

    // PASO 3: Diagnóstico de primeras páginas (solo primeras 3 para no saturar logs)
    if (pages.length > 0) {
      console.log(`\n[PDF Parser MAP] ========== DIAGNÓSTICO DE PÁGINAS ==========`);
      for (let i = 0; i < Math.min(3, pages.length); i++) {
        PDFValidator.diagnosticPage(pages[i]);
      }
    }

    // PASO 4: Comparar datos con el mapa para verificar concordancia
    console.log(`\n[PDF Parser MAP] ========== VERIFICACIÓN DE CONCORDANCIA ==========`);
    const comparison = MapBasedExtractor.compareWithMap(pages);

    const concordancePercentage = (
      (comparison.matches / (comparison.matches + comparison.mismatches + comparison.missing)) * 100
    ).toFixed(1);

    console.log(`[PDF Parser MAP] Concordancia con mapa: ${concordancePercentage}%`);

    // PASO 5: Extraer datos usando el mapa
    console.log(`\n[PDF Parser MAP] ========== EXTRACCIÓN DE DATOS ==========`);
    const allData = MapBasedExtractor.extractAllData(pages);

    console.log(`\n[PDF Parser MAP] ========== RESUMEN FINAL ==========`);
    console.log(`[PDF Parser MAP] Total registros extraídos: ${allData.length}`);
    console.log(`[PDF Parser MAP] Servicios en mapa: ${TARIFF_MAP_2025.length}`);
    console.log(`[PDF Parser MAP] Concordancia: ${concordancePercentage}%`);

    // Extraer servicios únicos
    const servicesDetected = Array.from(new Set(allData.map(d => d.service_name)));
    console.log(`[PDF Parser MAP] Servicios extraídos: ${servicesDetected.join(', ')}`);

    console.log(`[PDF Parser MAP] ✓ Datos extraídos, retornando para vista previa`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se extrajeron ${allData.length} tarifas del PDF con ${concordancePercentage}% de concordancia`,
        data: allData,
        servicesDetected,
        metadata: {
          ...metadata,
          ...validation.metadata,
          concordance: concordancePercentage,
          comparison: {
            matches: comparison.matches,
            mismatches: comparison.mismatches,
            missing: comparison.missing
          }
        },
        warnings: validation.warnings,
        preview: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[PDF Parser MAP] Error general:", error);
    return new Response(
      JSON.stringify({
        error: "Error procesando el PDF",
        details: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});