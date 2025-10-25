import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface ServiceMapping {
  dbName: string;
  pdfPatterns: RegExp[];
  keywords: string[];
  priority: number;
}

const SERVICE_MAPPINGS: ServiceMapping[] = [
  {
    dbName: "Urg8:30H Courier",
    pdfPatterns: [
      /express\s*0?8:?30(?!.*glass|.*plus|.*premium)/i,
      /urg\s*0?8:?30(?!.*glass|.*plus|.*premium)/i,
      /express\s*8(?:\s|$)(?!.*glass|.*plus|.*premium)/i,
    ],
    keywords: ["express", "08", "8:30", "830"],
    priority: 1
  },
  {
    dbName: "Urg10H Courier",
    pdfPatterns: [
      /express\s*10:?30(?!.*glass|.*plus|.*premium)/i,
      /urg\s*10(?!.*glass|.*plus|.*premium)/i,
      /express\s*10(?:\s|$)(?!.*glass|.*plus|.*premium)/i,
    ],
    keywords: ["express", "10", "1030"],
    priority: 2
  },
  {
    dbName: "Urg14H Courier",
    pdfPatterns: [
      /express\s*14:?00(?!.*glass|.*plus|.*premium)/i,
      /urg\s*14(?!.*glass|.*plus|.*premium)/i,
      /express\s*14(?:\s|$)(?!.*glass|.*plus|.*premium)/i,
    ],
    keywords: ["express", "14", "1400"],
    priority: 3
  },
  {
    dbName: "Urg19H Courier",
    pdfPatterns: [
      /express\s*19:?00(?!.*glass|.*plus|.*premium)/i,
      /urg\s*19(?!.*glass|.*plus|.*premium)/i,
      /express\s*19(?:\s|$)(?!.*glass|.*plus|.*premium)/i,
    ],
    keywords: ["express", "19", "1900"],
    priority: 4
  },
  {
    dbName: "Business Parcel",
    pdfPatterns: [
      /business\s*parcel(?!.*glass|.*plus|.*premium)/i,
      /businessparcel(?!.*glass|.*plus|.*premium)/i,
    ],
    keywords: ["business", "parcel"],
    priority: 5
  },
  {
    dbName: "Eurobusiness Parcel",
    pdfPatterns: [
      /euro\s*business\s*parcel(?!.*glass|.*plus|.*premium)/i,
      /eurobusiness(?!.*glass|.*plus|.*premium)/i,
    ],
    keywords: ["euro", "business"],
    priority: 6
  },
  {
    dbName: "Economy Parcel",
    pdfPatterns: [
      /economy\s*parcel(?!.*glass|.*plus|.*premium)/i,
      /economyparcel(?!.*glass|.*plus|.*premium)/i,
    ],
    keywords: ["economy", "parcel"],
    priority: 7
  },
  {
    dbName: "Parcel Shop",
    pdfPatterns: [
      /parcel\s*shop(?!.*glass|.*plus|.*premium)/i,
      /shop\s*(?:return|delivery)(?!.*glass|.*plus|.*premium)/i,
    ],
    keywords: ["parcel", "shop"],
    priority: 8
  },
  {
    dbName: "Marítimo",
    pdfPatterns: [
      /mar[ií]timo(?!.*glass|.*plus|.*premium)/i,
      /maritimo(?!.*glass|.*plus|.*premium)/i,
    ],
    keywords: ["maritimo", "marítimo"],
    priority: 9
  },
];

interface ZoneMapping {
  dbPrefix: string;
  displayName: string;
  patterns: RegExp[];
}

const ZONE_MAPPINGS: ZoneMapping[] = [
  {
    dbPrefix: "provincial",
    displayName: "Provincial",
    patterns: [/\bprovincial\b/i, /\bprov\.?\b/i]
  },
  {
    dbPrefix: "regional",
    displayName: "Regional",
    patterns: [/\bregional\b/i, /\breg\.?\b/i]
  },
  {
    dbPrefix: "nacional",
    displayName: "Nacional",
    patterns: [/\bnacional\b/i, /\bnac\.?\b/i, /\binterciudad\b/i]
  },
  {
    dbPrefix: "portugal",
    displayName: "Portugal",
    patterns: [/\bportugal\b/i, /\bport\.?\b/i, /\b-?pt-?\b/i]
  },
  {
    dbPrefix: "baleares_mayores",
    displayName: "Baleares Mayores",
    patterns: [/\bbaleares\s+mayores\b/i, /\bbal\.?\s*may\.?\b/i, /\bmallorca\b/i, /\bmenorca\b/i, /\bibiza\b/i]
  },
  {
    dbPrefix: "baleares_menores",
    displayName: "Baleares Menores",
    patterns: [/\bbaleares\s+menores\b/i, /\bbal\.?\s*men\.?\b/i, /\bformentera\b/i]
  },
  {
    dbPrefix: "canarias_mayores",
    displayName: "Canarias Mayores",
    patterns: [/\bcanarias\s+mayores\b/i, /\bcan\.?\s*may\.?\b/i, /\btenerife\b/i, /\bgran\s+canaria\b/i]
  },
  {
    dbPrefix: "canarias_menores",
    displayName: "Canarias Menores",
    patterns: [/\bcanarias\s+menores\b/i, /\bcan\.?\s*men\.?\b/i, /\blanzarote\b/i, /\bfuerteventura\b/i, /\bla\s+palma\b/i, /\bla\s+gomera\b/i, /\bel\s+hierro\b/i]
  },
  {
    dbPrefix: "azores_mayores",
    displayName: "Azores Mayores",
    patterns: [/\bazores\s+mayores\b/i, /\baz\.?\s*may\.?\b/i]
  },
  {
    dbPrefix: "azores_menores",
    displayName: "Azores Menores",
    patterns: [/\bazores\s+menores\b/i, /\baz\.?\s*men\.?\b/i]
  },
  {
    dbPrefix: "madeira_mayores",
    displayName: "Madeira Mayores",
    patterns: [/\bmadeira\s+mayores\b/i, /\bmad\.?\s*may\.?\b/i]
  },
  {
    dbPrefix: "madeira_menores",
    displayName: "Madeira Menores",
    patterns: [/\bmadeira\s+menores\b/i, /\bmad\.?\s*men\.?\b/i]
  },
  {
    dbPrefix: "ceuta",
    displayName: "Ceuta",
    patterns: [/\bceuta\b/i]
  },
  {
    dbPrefix: "melilla",
    displayName: "Melilla",
    patterns: [/\bmelilla\b/i]
  },
  {
    dbPrefix: "andorra",
    displayName: "Andorra",
    patterns: [/\bandorra\b/i, /\band\.?\b/i]
  },
  {
    dbPrefix: "gibraltar",
    displayName: "Gibraltar",
    patterns: [/\bgibraltar\b/i, /\bgib\.?\b/i]
  },
];

interface WeightRange {
  from: string;
  to: string;
  patterns: RegExp[];
}

const WEIGHT_RANGES: WeightRange[] = [
  { from: "0", to: "1", patterns: [/(?:^|\s)1\s*kg/i, /^1$/] },
  { from: "1", to: "3", patterns: [/(?:^|\s)3\s*kg/i, /^3$/] },
  { from: "3", to: "5", patterns: [/(?:^|\s)5\s*kg/i, /^5$/] },
  { from: "5", to: "10", patterns: [/(?:^|\s)10\s*kg/i, /^10$/] },
  { from: "10", to: "15", patterns: [/(?:^|\s)15\s*kg/i, /^15$/] },
  { from: "15", to: "20", patterns: [/(?:^|\s)20\s*kg/i, /^20$/] },
  { from: "20", to: "25", patterns: [/(?:^|\s)25\s*kg/i, /^25$/] },
  { from: "25", to: "30", patterns: [/(?:^|\s)30\s*kg/i, /^30$/] },
  { from: "30", to: "999", patterns: [/\+?\s*kg/i, /adicional/i] },
];

interface ParsedTariff {
  service_name: string;
  weight_from: string;
  weight_to: string;
  [key: string]: string | number | null;
}

interface TableBlock {
  serviceName: string;
  startLine: number;
  endLine: number;
  lines: string[];
}

async function extractTextFromPDF(uint8Array: Uint8Array): Promise<{ text: string; pages: number }> {
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

    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      interface TextItem {
        str: string;
        transform: number[];
      }

      const items = textContent.items as TextItem[];

      const lineGroups = new Map<number, string[]>();
      const LINE_THRESHOLD = 5;

      for (const item of items) {
        if (!item.str || item.str.trim().length === 0) continue;

        const yCoord = Math.round(item.transform[5]);

        let targetY = yCoord;
        for (const existingY of lineGroups.keys()) {
          if (Math.abs(existingY - yCoord) <= LINE_THRESHOLD) {
            targetY = existingY;
            break;
          }
        }

        if (!lineGroups.has(targetY)) {
          lineGroups.set(targetY, []);
        }
        lineGroups.get(targetY)!.push(item.str);
      }

      const sortedYCoords = Array.from(lineGroups.keys()).sort((a, b) => b - a);

      const pageLines: string[] = [];
      for (const yCoord of sortedYCoords) {
        const lineText = lineGroups.get(yCoord)!.join(' ').trim();
        if (lineText.length > 0) {
          pageLines.push(lineText);
        }
      }

      const pageText = pageLines.join('\n');
      fullText += pageText + '\n';

      console.log(`[PDF Parser] Página ${pageNum}/${numPages}: ${pageLines.length} líneas extraídas, ${pageText.length} caracteres`);
    }

    console.log(`[PDF Parser] Extracción completada: ${fullText.length} caracteres`);

    const debugLines = fullText.split('\n').slice(0, 30);
    console.log(`[PDF Parser] DEBUG - Primeras 30 líneas extraídas:`);
    debugLines.forEach((line, idx) => {
      console.log(`  ${idx + 1}: "${line.substring(0, 100)}"`);
    });

    return { text: fullText, pages: numPages };

  } catch (error) {
    console.error('[PDF Parser] Error con PDF.js:', error);
    throw new Error(`Error al extraer texto del PDF: ${error.message}`);
  }
}

function detectServiceInText(text: string): string | null {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ');

  const hasRejectedSuffix = /glass|plus|premium/i.test(text);
  if (hasRejectedSuffix) {
    console.log(`[Detector] ✗ Servicio rechazado por sufijo no permitido: ${text.substring(0, 60)}`);
    return null;
  }

  for (const mapping of SERVICE_MAPPINGS) {
    for (const pattern of mapping.pdfPatterns) {
      if (pattern.test(normalized)) {
        console.log(`[Detector] ✓ Servicio detectado: ${mapping.dbName} con patrón ${pattern}`);
        return mapping.dbName;
      }
    }

    let keywordMatches = 0;
    for (const keyword of mapping.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    }

    if (keywordMatches >= 2) {
      console.log(`[Detector] ✓ Servicio detectado: ${mapping.dbName} por keywords`);
      return mapping.dbName;
    }
  }

  return null;
}

function identifyTableBlocks(lines: string[]): TableBlock[] {
  console.log('[TableBlocks] ===== IDENTIFICANDO BLOQUES DE TABLAS =====');
  const blocks: TableBlock[] = [];
  let currentBlock: TableBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const windowText = lines.slice(i, Math.min(i + 3, lines.length)).join(' ');

    const detectedService = detectServiceInText(windowText);

    if (detectedService) {
      if (currentBlock) {
        currentBlock.endLine = i - 1;
        if (currentBlock.lines.length > 0) {
          blocks.push(currentBlock);
          console.log(`[TableBlocks] Bloque guardado: ${currentBlock.serviceName} (${currentBlock.lines.length} líneas)`);
        }
      }

      currentBlock = {
        serviceName: detectedService,
        startLine: i,
        endLine: i,
        lines: []
      };

      console.log(`[TableBlocks] ✓ Nuevo bloque iniciado en línea ${i}: ${detectedService}`);
      continue;
    }

    if (currentBlock) {
      const isTableRow = /\d+(\.\d+)?/.test(line) ||
                        /kg/i.test(line) ||
                        /provincial|regional|nacional|portugal/i.test(line);

      if (isTableRow) {
        currentBlock.lines.push(line);
        currentBlock.endLine = i;
      } else if (line.trim().length < 5) {
        continue;
      } else {
        const nextService = detectServiceInText(lines.slice(i, Math.min(i + 2, lines.length)).join(' '));
        if (nextService) {
          currentBlock.endLine = i - 1;
          if (currentBlock.lines.length > 0) {
            blocks.push(currentBlock);
            console.log(`[TableBlocks] Bloque guardado: ${currentBlock.serviceName} (${currentBlock.lines.length} líneas)`);
          }
          currentBlock = null;
        }
      }
    }
  }

  if (currentBlock && currentBlock.lines.length > 0) {
    blocks.push(currentBlock);
    console.log(`[TableBlocks] Bloque final guardado: ${currentBlock.serviceName} (${currentBlock.lines.length} líneas)`);
  }

  console.log(`[TableBlocks] Total bloques identificados: ${blocks.length}`);
  return blocks;
}

function detectZoneInLine(line: string): string | null {
  const normalized = line.toLowerCase();

  for (const zone of ZONE_MAPPINGS) {
    for (const pattern of zone.patterns) {
      if (pattern.test(normalized)) {
        return zone.dbPrefix;
      }
    }
  }

  return null;
}

function detectWeightInLine(line: string): { from: string; to: string } | null {
  const parts = line.split(/\s+/);

  for (const part of parts) {
    const normalized = part.toLowerCase().trim();
    for (const range of WEIGHT_RANGES) {
      for (const pattern of range.patterns) {
        if (pattern.test(normalized)) {
          return { from: range.from, to: range.to };
        }
      }
    }
  }

  return null;
}

function extractNumericValues(line: string): number[] {
  const parts = line.split(/\s+/);
  const values: number[] = [];

  for (const part of parts) {
    const cleaned = part.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);

    if (!isNaN(num) && num > 0 && num < 10000) {
      values.push(num);
    }
  }

  return values;
}

function extractTariffsFromBlock(block: TableBlock): ParsedTariff[] {
  console.log(`[Extractor] ===== EXTRAYENDO TARIFAS DE ${block.serviceName} =====`);

  const tariffsByWeight = new Map<string, ParsedTariff>();
  let currentZone: string | null = null;

  for (let i = 0; i < block.lines.length; i++) {
    const line = block.lines[i];

    const zone = detectZoneInLine(line);
    if (zone) {
      currentZone = zone;
      console.log(`[Extractor]   ✓ Zona detectada: ${zone} en línea: ${line.substring(0, 60)}`);
      continue;
    }

    const weight = detectWeightInLine(line);
    if (weight && currentZone) {
      const values = extractNumericValues(line);
      const weightKey = `${weight.from}-${weight.to}`;

      if (!tariffsByWeight.has(weightKey)) {
        tariffsByWeight.set(weightKey, {
          service_name: block.serviceName,
          weight_from: weight.from,
          weight_to: weight.to,
        });
      }

      const tariff = tariffsByWeight.get(weightKey)!;
      const isParcelShop = block.serviceName === "Parcel Shop";
      const isAzoresOrMadeira = currentZone.startsWith("azores_") || currentZone.startsWith("madeira_");

      if (values.length >= 4 && !isParcelShop && !isAzoresOrMadeira) {
        tariff[`${currentZone}_sal`] = values[0];
        tariff[`${currentZone}_rec`] = values[1];
        tariff[`${currentZone}_arr`] = values[2];
        tariff[`${currentZone}_int`] = values[3];
        console.log(`[Extractor]     ✓ Tarifa completa: ${weightKey}kg, zona: ${currentZone}, 4 valores`);
      } else if (values.length >= 2 && isAzoresOrMadeira) {
        tariff[`${currentZone}_sal`] = values[0];
        tariff[`${currentZone}_rec`] = values[1];
        console.log(`[Extractor]     ✓ Tarifa Azores/Madeira: ${weightKey}kg, zona: ${currentZone}, 2 valores (sin arr/int)`);
      } else if (values.length >= 1 && isParcelShop) {
        tariff[`${currentZone}_sal`] = values[0];
        console.log(`[Extractor]     ✓ Tarifa ParcelShop: ${weightKey}kg, zona: ${currentZone}, 1 valor (solo sal)`);
      } else if (values.length >= 3) {
        tariff[`${currentZone}_sal`] = values[0];
        tariff[`${currentZone}_rec`] = values[1];
        tariff[`${currentZone}_arr`] = values[2];
        console.log(`[Extractor]     ✓ Tarifa básica: ${weightKey}kg, zona: ${currentZone}, 3 valores`);
      } else {
        console.log(`[Extractor]     ⚠ Valores insuficientes: ${weightKey}kg, zona: ${currentZone}, valores: ${values.length}`);
      }
    }
  }

  const tariffs = Array.from(tariffsByWeight.values());
  console.log(`[Extractor] Total tarifas consolidadas de ${block.serviceName}: ${tariffs.length}`);
  return tariffs;
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

    console.log(`[PDF Parser] Procesando: ${pdfFile.name} (${pdfFile.size} bytes)`);

    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { text: pdfText, pages } = await extractTextFromPDF(uint8Array);
    console.log(`[PDF Parser] Texto extraído: ${pdfText.length} caracteres, ${pages} páginas`);

    const lines = pdfText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log(`[PDF Parser] Total líneas a procesar: ${lines.length}`);

    const tableBlocks = identifyTableBlocks(lines);

    if (tableBlocks.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No se detectaron tablas de tarifas en el PDF",
          details: `Se procesaron ${lines.length} líneas pero no se encontraron servicios reconocidos`,
          suggestions: [
            "Verifica que el PDF contiene servicios GLS España 2025",
            "Los servicios esperados son: Express08:30, Express10:30, Express14:00, Express19:00, BusinessParcel, EuroBusinessParcel, EconomyParcel, ParcelShop, Marítimo"
          ],
          debugInfo: {
            totalLines: lines.length,
            totalPages: pages,
            sampleLines: lines.slice(0, 20)
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allTariffs: ParsedTariff[] = [];

    console.log(`[PDF Parser] ===== PROCESANDO ${tableBlocks.length} BLOQUES DE SERVICIOS =====`);
    for (const block of tableBlocks) {
      console.log(`[PDF Parser] Procesando servicio: ${block.serviceName}`);
      const blockTariffs = extractTariffsFromBlock(block);
      allTariffs.push(...blockTariffs);
      console.log(`[PDF Parser] Subtotal acumulado: ${allTariffs.length} tarifas`);
    }

    if (allTariffs.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No se pudieron extraer tarifas de las tablas detectadas",
          details: `Se detectaron ${tableBlocks.length} servicios pero no se encontraron datos válidos`,
          debugInfo: {
            blocksDetected: tableBlocks.map(b => ({
              service: b.serviceName,
              lines: b.lines.length
            })),
            sampleBlock: tableBlocks[0]?.lines.slice(0, 10)
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser] ===== RESUMEN DE EXTRACCIÓN =====`);
    console.log(`[PDF Parser] Total tarifas consolidadas: ${allTariffs.length}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Configuración de Supabase no disponible" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[PDF Parser] Limpiando tabla tariffspdf...');
    const { error: deleteError } = await supabase
      .from("tariffspdf")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.warn(`[PDF Parser] Advertencia al limpiar: ${deleteError.message}`);
    }

    console.log(`[PDF Parser] Insertando ${allTariffs.length} tarifas...`);
    const { data: insertedData, error: insertError } = await supabase
      .from("tariffspdf")
      .insert(allTariffs)
      .select();

    if (insertError) {
      console.error(`[PDF Parser] Error al insertar: ${insertError.message}`);
      return new Response(
        JSON.stringify({
          error: "Error al insertar tarifas en la base de datos",
          details: insertError.message,
          parsedCount: allTariffs.length
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser] ✓ Importación exitosa: ${insertedData?.length || 0} registros`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se importaron ${allTariffs.length} tarifas correctamente`,
        imported: insertedData?.length || 0,
        pages,
        servicesProcessed: tableBlocks.length,
        serviceBreakdown: tableBlocks.map(b => ({
          service: b.serviceName,
          tariffsExtracted: allTariffs.filter(t => t.service_name === b.serviceName).length
        })),
        preview: allTariffs.slice(0, 10)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[PDF Parser] Error fatal: ${error.message}`);
    console.error(`[PDF Parser] Stack:`, error.stack);
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