import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { VirtualTableBuilder } from './grid-parser.ts';
import { GridExtractor } from './grid-extractor.ts';

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
  console.log(`[PDF Parser GRID] Nueva petición: ${req.method}`);

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

    if (!pdfFile.type || pdfFile.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({
          error: "El archivo debe ser un PDF",
          details: `Tipo recibido: ${pdfFile.type || 'desconocido'}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pdfFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: "Archivo demasiado grande",
          details: `Máximo: 10MB. Recibido: ${(pdfFile.size / 1024 / 1024).toFixed(2)}MB`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser GRID] Procesando: ${pdfFile.name} (${pdfFile.size} bytes)`);

    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const pages = await extractStructuredTextFromPDF(uint8Array);
    console.log(`[PDF Parser GRID] ${pages.length} páginas extraídas`);

    const allExtractedData: any[] = [];
    const servicesDetected: string[] = [];

    for (const pageData of pages) {
      console.log(`\n[PDF Parser GRID] ========== PÁGINA ${pageData.pageNum} ==========`);

      const virtualTable = VirtualTableBuilder.buildVirtualTable(pageData);

      const extractedRows = GridExtractor.extractFromTable(virtualTable);

      if (extractedRows.length > 0) {
        const serviceName = extractedRows[0]?.service_name || 'Desconocido';
        servicesDetected.push(serviceName);
        allExtractedData.push(...extractedRows);
        console.log(`[PDF Parser GRID] ✓ Página ${pageData.pageNum}: ${extractedRows.length} registros extraídos`);
      } else {
        console.log(`[PDF Parser GRID] ⚠ Página ${pageData.pageNum}: No se extrajeron datos`);
      }
    }

    if (allExtractedData.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No se detectaron tarifas en el PDF",
          details: `Se procesaron ${pages.length} páginas pero no se encontraron servicios reconocidos`,
          debugInfo: {
            totalPages: pages.length
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`\n[PDF Parser GRID] ===== RESUMEN =====`);
    console.log(`[PDF Parser GRID] Total extraído: ${allExtractedData.length} registros`);
    console.log(`[PDF Parser GRID] Servicios: ${[...new Set(servicesDetected)].join(', ')}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Configuración de Supabase no disponible" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[PDF Parser GRID] Limpiando tabla tariffspdf...');
    const { error: deleteError } = await supabase
      .from("tariffspdf")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.warn(`[PDF Parser GRID] Advertencia al limpiar: ${deleteError.message}`);
    }

    console.log(`[PDF Parser GRID] Insertando ${allExtractedData.length} tarifas...`);
    const { data: insertedData, error: insertError } = await supabase
      .from("tariffspdf")
      .insert(allExtractedData)
      .select();

    if (insertError) {
      console.error(`[PDF Parser GRID] Error al insertar: ${insertError.message}`);
      return new Response(
        JSON.stringify({
          error: "Error al insertar tarifas en la base de datos",
          details: insertError.message,
          parsedCount: allExtractedData.length
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser GRID] ✓ Inserción completada: ${insertedData?.length || 0} registros`);

    const { count: verificationCount } = await supabase
      .from("tariffspdf")
      .select('*', { count: 'exact', head: true });

    console.log(`[PDF Parser GRID] ✓ Verificación: ${verificationCount || 0} registros en tabla`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se importaron ${insertedData?.length || 0} tarifas correctamente usando tabla virtual`,
        imported: insertedData?.length || 0,
        verified: verificationCount || 0,
        pages: pages.length,
        servicesDetected: [...new Set(servicesDetected)],
        method: "Tabla Virtual (Grid-Based)",
        preview: allExtractedData.slice(0, 5)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[PDF Parser GRID] Error fatal: ${error.message}`);
    console.error(`[PDF Parser GRID] Stack:`, error.stack);
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error.message,
        type: error.name
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
