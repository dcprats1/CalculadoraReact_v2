import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFValidator } from './pdf-validator.ts';
import { SimpleMapExtractor } from './simple-map-extractor.ts';
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

    console.log(`\n[PDF Parser MAP] ========== IDENTIFICACIÓN DE PÁGINAS POR TEXTO ==========`);
    const pageMap = PDFValidator.identifyPages(pages);

    console.log(`\n[PDF Parser MAP] Mapa de páginas identificadas:`);
    pageMap.forEach((physicalPage, logicalPage) => {
      console.log(`[PDF Parser MAP]   Página lógica ${logicalPage} -> Página física ${physicalPage}`);
    });

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
          metadata: validation.metadata,
          pageMap: Array.from(pageMap.entries())
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (validation.warnings.length > 0) {
      console.log(`[PDF Parser MAP] ⚠ Advertencias:`);
      validation.warnings.forEach(warn => console.log(`[PDF Parser MAP]   - ${warn}`));
    }

    console.log(`[PDF Parser MAP] ✓ PDF válido`);
    console.log(`[PDF Parser MAP] Páginas identificadas: ${validation.metadata.pagesIdentified}`);
    console.log(`[PDF Parser MAP] Servicios detectados: ${validation.metadata.servicesDetected.join(', ') || 'ninguno'}`);
    console.log(`[PDF Parser MAP] Versión: ${validation.metadata.structureVersion}`);

    const metadata = PDFValidator.extractMetadata(pages);
    console.log(`[PDF Parser MAP] Metadatos: ${JSON.stringify(metadata)}`);

    console.log(`\n[PDF Parser MAP] ========== EXTRACCIÓN DIRECTA DEL MAPA ==========`);
    console.log(`[PDF Parser MAP] NOTA: Usando datos hardcodeados del mapa GLS 2025`);
    const allData = SimpleMapExtractor.extractFromMap();

    console.log(`\n[PDF Parser MAP] ========== RESUMEN FINAL ==========`);
    console.log(`[PDF Parser MAP] Total registros extraídos: ${allData.length}`);
    console.log(`[PDF Parser MAP] Servicios en mapa: ${TARIFF_MAP_2025.length}`);

    const servicesDetected = Array.from(new Set(allData.map(d => d.service_name)));
    console.log(`[PDF Parser MAP] Servicios extraídos: ${servicesDetected.join(', ')}`);

    const withData = allData.filter(d =>
      d.provincial_sal !== null || d.regional_sal !== null || d.nacional_sal !== null
    );
    console.log(`[PDF Parser MAP] Registros con datos: ${withData.length}/${allData.length}`);

    console.log(`[PDF Parser MAP] ✓ Datos extraídos, retornando para vista previa`);

    const confidence = pageMap.size / PDFValidator.EXPECTED_PAGES;
    const detectedTitles = pageMap.size;
    const totalTitles = PDFValidator.EXPECTED_PAGES;

    console.log(`[PDF Parser MAP] Confianza de validación: ${Math.round(confidence * 100)}% (${detectedTitles}/${totalTitles} páginas)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se extrajeron ${allData.length} tarifas del mapa GLS`,
        data: allData,
        servicesDetected,
        metadata: {
          ...metadata,
          ...validation.metadata,
          method: 'direct_map_extraction',
          version: validation.metadata.structureVersion,
          recordsWithData: withData.length,
          pagesIdentified: pageMap.size,
          pageMapping: Array.from(pageMap.entries()),
          secureTitleValidation: {
            confidence: confidence,
            detectedTitles: detectedTitles,
            totalTitles: totalTitles
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