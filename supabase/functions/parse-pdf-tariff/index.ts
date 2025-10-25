import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFTableHeaderDetector } from "./header-detector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface ServiceMapping {
  pdfName: string;
  dbName: string;
  keywords: string[];
}

const SERVICE_MAPPINGS: ServiceMapping[] = [
  {
    pdfName: "Express08:30",
    dbName: "Urg8:30H Courier",
    keywords: ["express 08:30", "express08:30", "express 8:30", "express8:30", "08:30", "8:30", "express 8"]
  },
  {
    pdfName: "Express10:30",
    dbName: "Urg10H Courier",
    keywords: ["express 10:30", "express10:30", "express 10", "10:30", "express10"]
  },
  {
    pdfName: "Express14:00",
    dbName: "Urg14H Courier",
    keywords: ["express 14:00", "express14:00", "express 14", "14:00", "express14"]
  },
  {
    pdfName: "Express19:00",
    dbName: "Urg19H Courier",
    keywords: ["express 19:00", "express19:00", "express 19", "19:00", "express19"]
  },
  {
    pdfName: "BusinessParcel",
    dbName: "Business Parcel",
    keywords: ["business parcel", "businessparcel", "business", "parcel", "businesspa"]
  },
  {
    pdfName: "EuroBusinessParcel",
    dbName: "EuroBusiness Parcel",
    keywords: ["euro business parcel", "eurobusiness", "euro business", "eurobs"]
  },
  {
    pdfName: "EconomyParcel",
    dbName: "Economy Parcel",
    keywords: ["economy parcel", "economyparcel", "economy", "economypa"]
  },
  {
    pdfName: "Maritimo",
    dbName: "Marítimo",
    keywords: ["maritimo", "marítimo", "maritim", "mar timo", "mar"]
  },
  {
    pdfName: "ParcelShop",
    dbName: "Parcel Shop",
    keywords: ["parcel shop", "parcelshop", "shop", "parcelsh"]
  },
];

interface WeightRange {
  from: string;
  to: string;
  patterns: RegExp[];
}

const WEIGHT_RANGES: WeightRange[] = [
  {
    from: "0",
    to: "1",
    patterns: [
      /^[0-9.,\s]*1\s*kg/i,
      /hasta\s*1/i,
      /0\s*[-–]\s*1/i,
      /^1$/,
      /\b1\s*kg\b/i
    ]
  },
  {
    from: "1",
    to: "3",
    patterns: [
      /^[0-9.,\s]*3\s*kg/i,
      /1\s*[-–]\s*3/i,
      /de\s*1\s*a\s*3/i,
      /^3$/,
      /\b3\s*kg\b/i
    ]
  },
  {
    from: "3",
    to: "5",
    patterns: [
      /^[0-9.,\s]*5\s*kg/i,
      /3\s*[-–]\s*5/i,
      /de\s*3\s*a\s*5/i,
      /^5$/,
      /\b5\s*kg\b/i
    ]
  },
  {
    from: "5",
    to: "10",
    patterns: [
      /^[0-9.,\s]*10\s*kg/i,
      /5\s*[-–]\s*10/i,
      /de\s*5\s*a\s*10/i,
      /^10$/,
      /\b10\s*kg\b/i
    ]
  },
  {
    from: "10",
    to: "15",
    patterns: [
      /^[0-9.,\s]*15\s*kg/i,
      /10\s*[-–]\s*15/i,
      /de\s*10\s*a\s*15/i,
      /^15$/,
      /\b15\s*kg\b/i
    ]
  },
  {
    from: "15",
    to: "999",
    patterns: [
      /\+\s*kg/i,
      /15\s*\+/i,
      />\s*15/i,
      /mayor.*pallet/i,
      /m[aá]s\s*de\s*15/i,
      /^999$/,
      /\bpor\s*kg/i
    ]
  },
];

interface ParsedTariff {
  service_name: string;
  weight_from: string;
  weight_to: string;
  [key: string]: string | number | null;
}

async function extractTextFromPDF(uint8Array: Uint8Array): Promise<{ text: string; confidence: 'high' | 'medium' | 'low'; pages: number }> {
  try {
    console.log('[PDF Parser] Intentando cargar PDF.js...');

    const { getDocument, version } = await import("npm:pdfjs-dist@4.0.379/legacy/build/pdf.mjs");

    console.log(`[PDF Parser] PDF.js cargado correctamente (versión ${version})`);

    const loadingTask = getDocument({
      data: uint8Array,
      verbosity: 0,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;

    console.log(`[PDF Parser] PDF cargado: ${numPages} páginas`);

    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .filter((str: string) => str.trim().length > 0)
        .join(' ');

      fullText += pageText + '\n\n';

      console.log(`[PDF Parser] Página ${pageNum}/${numPages} procesada: ${pageText.length} caracteres`);
    }

    const confidence = fullText.length > 1000 ? 'high' : fullText.length > 300 ? 'medium' : 'low';

    console.log(`[PDF Parser] Extracción completada: ${fullText.length} caracteres totales, confianza: ${confidence}`);

    return {
      text: fullText,
      confidence,
      pages: numPages
    };

  } catch (error) {
    console.error('[PDF Parser] Error al usar PDF.js:', error);
    throw new Error(`Error al extraer texto del PDF con PDF.js: ${error.message}`);
  }
}

function normalizeSpaces(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

function mapServiceName(text: string): string | null {
  const normalized = text.toLowerCase().trim();

  for (const mapping of SERVICE_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return mapping.dbName;
      }
    }
  }
  return null;
}

function parseWeightRange(weightText: string): { from: string; to: string } | null {
  const normalized = weightText.toLowerCase().trim();

  for (const range of WEIGHT_RANGES) {
    for (const pattern of range.patterns) {
      if (pattern.test(normalized)) {
        return { from: range.from, to: range.to };
      }
    }
  }
  return null;
}

function parseNumericValue(value: string): number | null {
  if (!value || value.trim() === "" || value === "-") {
    return null;
  }

  const cleaned = value
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "")
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

interface TableRow {
  weightFrom: string;
  weightTo: string;
  values: number[];
  rawLine: string;
  lineIndex: number;
}

function extractTableStructure(lines: string[], serviceStart: number): {
  headers: string[];
  rows: TableRow[];
  destinationType: string | null;
} {
  const headers: string[] = [];
  const rows: TableRow[] = [];
  let destinationType: string | null = null;

  for (let i = serviceStart; i < Math.min(serviceStart + 50, lines.length); i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.length === 0) continue;

    if (/^(Interciudad|Provincial|Regional|Nacional)$/i.test(trimmed)) {
      destinationType = trimmed.toLowerCase();
      console.log(`[ExtractTable] Tipo de destino detectado: ${destinationType}`);
      continue;
    }

    if (/^(Peso|Coste Total|Recogida|Arrastre|Entrega|Salidas)/i.test(trimmed)) {
      const headerParts = line.split(/\s+/).filter(p => p.trim().length > 0);
      headers.push(...headerParts);
      console.log(`[ExtractTable] Encabezados detectados:`, headerParts);
      continue;
    }

    const weightMatch = line.match(/(\d+)\s*[Kk]g\.?/);
    if (weightMatch) {
      const weight = parseInt(weightMatch[1]);
      const parts = line.split(/\s+/).filter(p => p.trim().length > 0);

      const numericValues: number[] = [];
      for (const part of parts) {
        const val = parseNumericValue(part);
        if (val !== null) {
          numericValues.push(val);
        }
      }

      if (numericValues.length >= 4) {
        let weightTo: string;
        if (weight === 1) {
          weightTo = '1';
        } else if (weight === 3) {
          weightTo = '3';
        } else if (weight === 5) {
          weightTo = '5';
        } else if (weight === 10) {
          weightTo = '10';
        } else if (weight === 15) {
          weightTo = '15';
        } else {
          weightTo = weight.toString();
        }

        const weightFrom = weight === 1 ? '0' : weight === 3 ? '1' : weight === 5 ? '3' : weight === 10 ? '5' : weight === 15 ? '10' : (weight - 1).toString();

        rows.push({
          weightFrom,
          weightTo,
          values: numericValues,
          rawLine: line,
          lineIndex: i
        });

        console.log(`[ExtractTable] Fila detectada - ${weightFrom}-${weightTo}kg: ${numericValues.length} valores`);
      }
    }

    if (/\+\s*[Kk]g/i.test(line)) {
      const parts = line.split(/\s+/).filter(p => p.trim().length > 0);
      const numericValues: number[] = [];
      for (const part of parts) {
        const val = parseNumericValue(part);
        if (val !== null) {
          numericValues.push(val);
        }
      }

      if (numericValues.length >= 2) {
        rows.push({
          weightFrom: '15',
          weightTo: '999',
          values: numericValues,
          rawLine: line,
          lineIndex: i
        });

        console.log(`[ExtractTable] Fila +Kg detectada: ${numericValues.length} valores`);
      }
    }
  }

  return { headers, rows, destinationType };
}

Deno.serve(async (req: Request) => {
  console.log(`[PDF Parser] Nueva petición: ${req.method}`);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
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
          details: "Por favor, selecciona un archivo PDF de tarifas GLS",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pdfFile.type || pdfFile.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({
          error: "El archivo debe ser un PDF",
          details: `Tipo de archivo recibido: ${pdfFile.type || 'desconocido'}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pdfFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: "Archivo demasiado grande",
          details: `Tamaño máximo: 10MB. Tamaño recibido: ${(pdfFile.size / 1024 / 1024).toFixed(2)}MB`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser] Procesando archivo: ${pdfFile.name} (${pdfFile.size} bytes)`);

    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { text: pdfText, confidence, pages } = await extractTextFromPDF(uint8Array);

    console.log(`[PDF Parser] Texto extraído (${pdfText.length} caracteres, ${pages} páginas) con confianza: ${confidence}`);
    console.log(`[PDF Parser] Primeros 800 caracteres:`, pdfText.substring(0, 800));

    const normalizedText = normalizeSpaces(pdfText);
    const lines = normalizedText.split('\n').filter(line => line.trim().length > 0);

    console.log(`[PDF Parser] Procesamiento: ${lines.length} líneas detectadas`);

    const detectedHeaders = PDFTableHeaderDetector.analyzeTableHeaders(pdfText, 1);
    console.log(`[PDF Parser] Encabezados detectados:`, detectedHeaders);

    if (detectedHeaders.length > 0) {
      for (const header of detectedHeaders) {
        const validation = PDFTableHeaderDetector.validateTableStructure(header);
        console.log(`[PDF Parser] Validación de encabezado ${header.serviceName}:`, validation);
      }
    }

    const parsedTariffs: ParsedTariff[] = [];
    const warnings: string[] = [];
    let processedLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      processedLines++;

      const serviceDetection = PDFTableHeaderDetector.detectServiceName(line);
      if (serviceDetection && serviceDetection.confidence >= 0.6) {
        const currentService = serviceDetection.dbName;
        console.log(`[PDF Parser] ========================================`);
        console.log(`[PDF Parser] SERVICIO DETECTADO: ${currentService}`);
        console.log(`[PDF Parser] ========================================`);

        const tableData = extractTableStructure(lines, i + 1);
        console.log(`[PDF Parser] Tabla extraída:`, {
          headers: tableData.headers,
          rows: tableData.rows.length,
          destinationType: tableData.destinationType
        });

        const columnMapping: { [key: string]: string } = {
          'recogida': '_rec',
          'arrastre': '_arr',
          'entrega': '_ent',
          'salidas': '_sal',
          'interciudad': '_int',
          'rec': '_rec',
          'arr': '_arr',
          'ent': '_ent',
          'sal': '_sal',
          'int': '_int'
        };

        const destinationPrefixMap: { [key: string]: string } = {
          'interciudad': 'nacional',
          'provincial': 'provincial',
          'regional': 'regional',
          'nacional': 'nacional'
        };

        for (const row of tableData.rows) {
          const tariff: ParsedTariff = {
            service_name: currentService,
            weight_from: row.weightFrom,
            weight_to: row.weightTo,
          };

          const destPrefix = tableData.destinationType
            ? destinationPrefixMap[tableData.destinationType] || 'nacional'
            : 'nacional';

          if (row.values.length >= 6) {
            tariff[`${destPrefix}_rec`] = row.values[0];
            tariff[`${destPrefix}_arr`] = row.values[1];
            tariff[`${destPrefix}_ent`] = row.values[2];
            tariff[`${destPrefix}_sal`] = row.values[3];

            if (destPrefix === 'provincial' && row.values.length >= 5) {
              tariff[`provincial_rec`] = row.values[4] || row.values[0];
            }
            if (destPrefix === 'regional' && row.values.length >= 5) {
              tariff[`regional_rec`] = row.values[4] || row.values[0];
            }

            tariff[`${destPrefix}_int`] = row.values[row.values.length - 1];
          } else if (row.values.length >= 4) {
            tariff[`${destPrefix}_rec`] = row.values[0];
            tariff[`${destPrefix}_arr`] = row.values[1];
            tariff[`${destPrefix}_ent`] = row.values[2];
            tariff[`${destPrefix}_sal`] = row.values[3];
          } else if (row.values.length === 2) {
            tariff[`${destPrefix}_rec`] = row.values[0];
            tariff[`${destPrefix}_arr`] = row.values[1];
          }

          if (Object.keys(tariff).length > 3) {
            parsedTariffs.push(tariff);
            console.log(`[PDF Parser] Tarifa creada:`, tariff);
          } else {
            warnings.push(`Fila ${row.lineIndex}: Datos insuficientes (${Object.keys(tariff).length} campos)`);
          }
        }

        i += tableData.rows.length + 10;
      }
    }

    console.log(`[PDF Parser] Procesamiento completado:`, {
      processedLines,
      tariffsFound: parsedTariffs.length,
      warnings: warnings.length
    });

    if (parsedTariffs.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No se pudieron extraer tarifas del PDF",
          details: "Verifique que el PDF tenga el formato correcto de tarifas GLS",
          suggestions: [
            "Asegúrese de que el PDF contiene tablas de tarifas GLS España 2025",
            "El PDF debe incluir nombres de servicios (Business Parcel, Express, etc.)",
            "Las tablas deben tener rangos de peso y precios claramente definidos",
            "Si el PDF está encriptado o protegido, primero desbloquéelo"
          ],
          debugInfo: {
            processedLines,
            confidence,
            textLength: pdfText.length,
            pages,
            sampleLines: lines.slice(0, 30),
            extractedTextSample: pdfText.substring(0, 1500),
            detectedHeaders: detectedHeaders.map(h => ({
              service: h.serviceName,
              destination: h.destinationZone,
              columns: h.columns.map(c => c.name),
              tableType: h.tableType,
              confidence: h.confidence
            }))
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Configuración de Supabase no disponible" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: deleteError } = await supabase
      .from("tariffspdf")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.warn(`[PDF Parser] No se pudo limpiar tariffspdf: ${deleteError.message}`);
    } else {
      console.log(`[PDF Parser] Tabla tariffspdf limpiada antes de insertar`);
    }

    const { data: insertedData, error: insertError } = await supabase
      .from("tariffspdf")
      .insert(parsedTariffs)
      .select();

    if (insertError) {
      console.error(`[PDF Parser] Error al insertar: ${insertError.message}`);
      return new Response(
        JSON.stringify({
          error: "Error al insertar tarifas en la base de datos",
          details: insertError.message,
          parsedCount: parsedTariffs.length,
          hint: "Los datos se extrajeron correctamente pero hubo un problema al guardarlos"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser] Importación exitosa: ${insertedData?.length || 0} registros`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se importaron ${parsedTariffs.length} tarifas correctamente`,
        imported: insertedData?.length || 0,
        warnings: warnings.length > 0 ? warnings.slice(0, 10) : undefined,
        confidence,
        pages,
        stats: {
          textLength: pdfText.length,
          linesProcessed: processedLines,
          pagesProcessed: pages,
          headersDetected: detectedHeaders.length,
          servicesFound: [...new Set(detectedHeaders.map(h => h.serviceName))].filter(Boolean)
        },
        detectedHeaders: detectedHeaders.slice(0, 5).map(h => ({
          service: h.serviceName,
          destination: h.destinationZone,
          columns: h.columns.map(c => c.name),
          tableType: h.tableType,
          confidence: h.confidence
        })),
        preview: parsedTariffs.slice(0, 5)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[PDF Parser] Error fatal: ${error.message}`);
    console.error(`[PDF Parser] Stack trace:`, error.stack);
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error.message,
        type: error.name,
        hint: "Por favor, verifica que el archivo sea un PDF válido y no esté corrupto o protegido"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});