import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { VirtualTableBuilder } from './grid-parser.ts';
import { TemplateBasedExtractor } from './template-based-extractor.ts';

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

    if (pdfFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: "Archivo demasiado grande",
          details: `El archivo debe ser menor a ${MAX_FILE_SIZE / 1024 / 1024} MB`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser GRID] Procesando: ${pdfFile.name} (${pdfFile.size} bytes)`);

    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const pages = await extractStructuredTextFromPDF(uint8Array);
    console.log(`[PDF Parser GRID] ${pages.length} páginas extraídas`);

    const dataByServiceAndWeight = new Map<string, any>();
    const servicesDetected: string[] = [];

    for (const pageData of pages) {
      console.log(`\n[PDF Parser GRID] ========== PÁGINA ${pageData.pageNum} ==========`);

      const virtualTables = VirtualTableBuilder.buildMultipleTables(pageData);
      console.log(`[PDF Parser GRID] Detectadas ${virtualTables.length} tablas en página ${pageData.pageNum}`);

      for (let tableIdx = 0; tableIdx < virtualTables.length; tableIdx++) {
        const virtualTable = virtualTables[tableIdx];
        console.log(`\n[PDF Parser GRID] --- Procesando tabla ${tableIdx + 1}/${virtualTables.length} de página ${pageData.pageNum} ---`);

        const extractedRows = TemplateBasedExtractor.extractFromTable(virtualTable);

        if (extractedRows.length > 0) {
          const serviceName = extractedRows[0]?.service_name || 'Desconocido';
          servicesDetected.push(serviceName);

          for (const row of extractedRows) {
            const key = `${row.service_name}_${row.weight_from}_${row.weight_to}`;

            if (dataByServiceAndWeight.has(key)) {
              const existing = dataByServiceAndWeight.get(key);
              for (const field in row) {
                if (field !== 'service_name' && field !== 'weight_from' && field !== 'weight_to') {
                  if (row[field] !== null && row[field] !== undefined) {
                    existing[field] = row[field];
                  }
                }
              }
              console.log(`[PDF Parser GRID] ⚠ Consolidando datos duplicados: ${key}`);
            } else {
              dataByServiceAndWeight.set(key, { ...row });
            }
          }

          console.log(`[PDF Parser GRID] ✓ Tabla ${tableIdx + 1}: ${extractedRows.length} registros procesados (${serviceName})`);
        } else {
          console.log(`[PDF Parser GRID] ⚠ Tabla ${tableIdx + 1}: No se extrajeron datos`);
        }
      }
    }

    const allData = Array.from(dataByServiceAndWeight.values());
    console.log(`\n[PDF Parser GRID] ========== RESUMEN FINAL ==========`);
    console.log(`[PDF Parser GRID] Servicios detectados: ${new Set(servicesDetected).size}`);
    console.log(`[PDF Parser GRID] Registros únicos: ${allData.length}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { error: insertError } = await supabase.from("tariffspdf").insert(allData);

    if (insertError) {
      console.error("[PDF Parser GRID] Error al insertar en DB:", insertError);
      return new Response(
        JSON.stringify({
          error: "Error al insertar tarifas en la base de datos",
          details: insertError.message,
          parsedCount: allData.length,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser GRID] ✓ ${allData.length} registros insertados correctamente`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se importaron ${allData.length} tarifas correctamente`,
        data: allData,
        servicesDetected: Array.from(new Set(servicesDetected)),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[PDF Parser GRID] Error general:", error);
    return new Response(
      JSON.stringify({
        error: "Error procesando el PDF",
        details: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});