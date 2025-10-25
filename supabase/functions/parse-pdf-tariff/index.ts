import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
  patterns: RegExp[];
}

const SERVICE_MAPPINGS: ServiceMapping[] = [
  {
    pdfName: "Express08:30",
    dbName: "Urg8:30H Courier",
    keywords: ["express", "08:30", "8:30", "830"],
    patterns: [
      /express\s*0?8:?30/i,
      /urg\s*0?8:?30/i,
      /express\s*8/i,
    ]
  },
  {
    pdfName: "Express10:30",
    dbName: "Urg10H Courier",
    keywords: ["express", "10:30", "10", "1030"],
    patterns: [
      /express\s*10:?30/i,
      /urg\s*10/i,
      /express\s*10(?!:)/i,
    ]
  },
  {
    pdfName: "Express14:00",
    dbName: "Urg14H Courier",
    keywords: ["express", "14:00", "14", "1400"],
    patterns: [
      /express\s*14:?00/i,
      /urg\s*14/i,
      /express\s*14(?!:)/i,
    ]
  },
  {
    pdfName: "Express19:00",
    dbName: "Urg19H Courier",
    keywords: ["express", "19:00", "19", "1900"],
    patterns: [
      /express\s*19:?00/i,
      /urg\s*19/i,
      /express\s*19(?!:)/i,
    ]
  },
  {
    pdfName: "BusinessParcel",
    dbName: "Business Parcel",
    keywords: ["business", "parcel"],
    patterns: [
      /business\s*parcel/i,
      /businessparcel/i,
    ]
  },
  {
    pdfName: "EuroBusinessParcel",
    dbName: "Eurobusiness Parcel",
    keywords: ["euro", "business", "parcel"],
    patterns: [
      /euro\s*business/i,
      /eurobusiness/i,
    ]
  },
  {
    pdfName: "EconomyParcel",
    dbName: "Economy Parcel",
    keywords: ["economy", "parcel"],
    patterns: [
      /economy\s*parcel/i,
      /economyparcel/i,
    ]
  },
  {
    pdfName: "ParcelShop",
    dbName: "Parcel Shop",
    keywords: ["parcel", "shop", "delivery", "return"],
    patterns: [
      /parcel\s*shop/i,
      /shop\s*return/i,
      /shop\s*delivery/i,
    ]
  },
  {
    pdfName: "Maritimo",
    dbName: "Marítimo",
    keywords: ["maritimo", "marítimo"],
    patterns: [
      /mar[ií]timo/i,
    ]
  },
];

interface DestinationZone {
  dbPrefix: string;
  displayName: string;
  patterns: RegExp[];
  keywords: string[];
}

const DESTINATION_ZONES: DestinationZone[] = [
  {
    dbPrefix: "provincial",
    displayName: "Provincial",
    patterns: [/\bprovincial\b/i],
    keywords: ["provincial"]
  },
  {
    dbPrefix: "regional",
    displayName: "Regional",
    patterns: [/\bregional\b/i],
    keywords: ["regional"]
  },
  {
    dbPrefix: "nacional",
    displayName: "Nacional",
    patterns: [/\bnacional\b/i, /\binterciudad\b/i],
    keywords: ["nacional", "interciudad"]
  },
];

interface WeightRange {
  from: string;
  to: string;
  patterns: RegExp[];
  displayText: string;
}

const WEIGHT_RANGES: WeightRange[] = [
  {
    from: "0",
    to: "1",
    patterns: [/\b1\s*kg/i, /hasta\s*1/i, /^1$/],
    displayText: "1kg"
  },
  {
    from: "1",
    to: "3",
    patterns: [/\b3\s*kg/i, /1\s*[-–]\s*3/i, /^3$/],
    displayText: "3kg"
  },
  {
    from: "3",
    to: "5",
    patterns: [/\b5\s*kg/i, /3\s*[-–]\s*5/i, /^5$/],
    displayText: "5kg"
  },
  {
    from: "5",
    to: "10",
    patterns: [/\b10\s*kg/i, /5\s*[-–]\s*10/i, /^10$/],
    displayText: "10kg"
  },
  {
    from: "10",
    to: "15",
    patterns: [/\b15\s*kg/i, /10\s*[-–]\s*15/i, /^15$/],
    displayText: "15kg"
  },
  {
    from: "15",
    to: "999",
    patterns: [/\+\s*kg/i, /15\s*\+/i, /por\s*kg/i, /adicional/i],
    displayText: "+kg"
  },
];

interface ParsedTariff {
  service_name: string;
  weight_from: string;
  weight_to: string;
  [key: string]: string | number | null;
}

interface ServiceLocation {
  serviceName: string;
  startLine: number;
  endLine: number;
  zones: ZoneLocation[];
}

interface ZoneLocation {
  zoneName: string;
  dbPrefix: string;
  startLine: number;
  endLine: number;
  dataRows: DataRow[];
}

interface DataRow {
  weightFrom: string;
  weightTo: string;
  lineIndex: number;
  rawLine: string;
  values: number[];
}

async function extractTextFromPDF(uint8Array: Uint8Array): Promise<{ text: string; confidence: 'high' | 'medium' | 'low'; pages: number }> {
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

      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .filter((str: string) => str.trim().length > 0)
        .join(' ');

      fullText += pageText + '\n\n';

      console.log(`[PDF Parser] Página ${pageNum}/${numPages}: ${pageText.length} caracteres`);
    }

    const confidence = fullText.length > 1000 ? 'high' : fullText.length > 300 ? 'medium' : 'low';

    console.log(`[PDF Parser] Extracción completada: ${fullText.length} caracteres, confianza: ${confidence}`);

    return {
      text: fullText,
      confidence,
      pages: numPages
    };

  } catch (error) {
    console.error('[PDF Parser] Error con PDF.js:', error);
    throw new Error(`Error al extraer texto del PDF: ${error.message}`);
  }
}

function normalizeSpaces(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

function detectServiceInLine(line: string): string | null {
  const normalized = line.toLowerCase().trim();

  for (const mapping of SERVICE_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(normalized)) {
        console.log(`[Service Detection] Matched ${mapping.dbName} with pattern ${pattern} in line: ${line.substring(0, 80)}`);
        return mapping.dbName;
      }
    }

    let keywordMatches = 0;
    const matchedKeywords: string[] = [];
    for (const keyword of mapping.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        keywordMatches++;
        matchedKeywords.push(keyword);
      }
    }

    if (keywordMatches >= 2) {
      console.log(`[Service Detection] Matched ${mapping.dbName} with keywords: ${matchedKeywords.join(', ')} in line: ${line.substring(0, 80)}`);
      return mapping.dbName;
    }
  }

  return null;
}

function detectServiceMultiLine(lines: string[], startIdx: number, windowSize: number = 5): { serviceName: string | null; confidence: number } {
  const window = lines.slice(startIdx, Math.min(startIdx + windowSize, lines.length));
  const combinedText = window.join(' ').toLowerCase();

  for (const mapping of SERVICE_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(combinedText)) {
        return { serviceName: mapping.dbName, confidence: 0.9 };
      }
    }

    let keywordMatches = 0;
    for (const keyword of mapping.keywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    }

    if (keywordMatches >= 2) {
      return { serviceName: mapping.dbName, confidence: 0.7 };
    }
  }

  return { serviceName: null, confidence: 0 };
}

function detectZone(line: string): { dbPrefix: string; displayName: string } | null {
  const normalized = line.toLowerCase().trim();

  for (const zone of DESTINATION_ZONES) {
    for (const pattern of zone.patterns) {
      if (pattern.test(normalized)) {
        return { dbPrefix: zone.dbPrefix, displayName: zone.displayName };
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

function detectWeightRange(line: string): { from: string; to: string } | null {
  const normalized = line.toLowerCase().trim();

  for (const range of WEIGHT_RANGES) {
    for (const pattern of range.patterns) {
      if (pattern.test(normalized)) {
        return { from: range.from, to: range.to };
      }
    }
  }

  return null;
}

function extractDataRow(line: string): DataRow | null {
  const weightRange = detectWeightRange(line);
  if (!weightRange) {
    return null;
  }

  const parts = line.split(/\s+/).filter(p => p.trim().length > 0);
  const values: number[] = [];

  for (const part of parts) {
    const val = parseNumericValue(part);
    if (val !== null) {
      values.push(val);
    }
  }

  if (values.length >= 4) {
    return {
      weightFrom: weightRange.from,
      weightTo: weightRange.to,
      lineIndex: 0,
      rawLine: line,
      values
    };
  }

  return null;
}

function phaseOneMapping(lines: string[]): ServiceLocation[] {
  console.log('[Phase 1] ===== INICIANDO MAPEO DE SERVICIOS =====');

  const serviceLocations: ServiceLocation[] = [];
  let currentService: ServiceLocation | null = null;
  let currentZone: ZoneLocation | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const serviceName = detectServiceInLine(line);
    if (serviceName) {
      if (currentService && currentZone) {
        currentService.zones.push(currentZone);
        currentZone = null;
      }
      if (currentService) {
        currentService.endLine = i - 1;
        serviceLocations.push(currentService);
      }

      currentService = {
        serviceName,
        startLine: i,
        endLine: i,
        zones: []
      };

      console.log(`[Phase 1] ✓ Servicio detectado en línea ${i}: ${serviceName}`);
      continue;
    }

    if (currentService) {
      const zone = detectZone(line);
      if (zone) {
        if (currentZone) {
          currentZone.endLine = i - 1;
          currentService.zones.push(currentZone);
        }

        currentZone = {
          zoneName: zone.displayName,
          dbPrefix: zone.dbPrefix,
          startLine: i,
          endLine: i,
          dataRows: []
        };

        console.log(`[Phase 1]   ✓ Zona detectada en línea ${i}: ${zone.displayName} (servicio: ${currentService.serviceName})`);
        continue;
      }

      if (currentZone) {
        const dataRow = extractDataRow(line);
        if (dataRow) {
          dataRow.lineIndex = i;
          currentZone.dataRows.push(dataRow);
          console.log(`[Phase 1]     ✓ Datos detectados en línea ${i}: ${dataRow.weightFrom}-${dataRow.weightTo}kg, ${dataRow.values.length} valores`);
        }
      }
    }
  }

  if (currentService && currentZone) {
    currentZone.endLine = lines.length - 1;
    currentService.zones.push(currentZone);
  }
  if (currentService) {
    currentService.endLine = lines.length - 1;
    serviceLocations.push(currentService);
  }

  console.log('[Phase 1] ===== MAPEO COMPLETADO =====');
  console.log(`[Phase 1] Total servicios detectados: ${serviceLocations.length}`);

  for (const service of serviceLocations) {
    console.log(`[Phase 1] - ${service.serviceName}: ${service.zones.length} zonas, líneas ${service.startLine}-${service.endLine}`);
    for (const zone of service.zones) {
      console.log(`[Phase 1]   - ${zone.zoneName}: ${zone.dataRows.length} filas de datos`);
    }
  }

  return serviceLocations;
}

function phaseTwoExtraction(serviceLocations: ServiceLocation[]): ParsedTariff[] {
  console.log('[Phase 2] ===== INICIANDO EXTRACCIÓN DE DATOS =====');

  const parsedTariffs: ParsedTariff[] = [];
  let totalRows = 0;

  for (const service of serviceLocations) {
    console.log(`[Phase 2] Procesando servicio: ${service.serviceName}`);

    for (const zone of service.zones) {
      console.log(`[Phase 2]   Procesando zona: ${zone.zoneName} (${zone.dataRows.length} filas)`);

      for (const row of zone.dataRows) {
        const tariff: ParsedTariff = {
          service_name: service.serviceName,
          weight_from: row.weightFrom,
          weight_to: row.weightTo,
        };

        if (row.values.length >= 6) {
          tariff[`${zone.dbPrefix}_rec`] = row.values[1];
          tariff[`${zone.dbPrefix}_arr`] = row.values[2];
          tariff[`${zone.dbPrefix}_sal`] = row.values[4];
          tariff[`${zone.dbPrefix}_int`] = row.values[5];
        } else if (row.values.length >= 4) {
          tariff[`${zone.dbPrefix}_sal`] = row.values[0];
          tariff[`${zone.dbPrefix}_rec`] = row.values[1];
          tariff[`${zone.dbPrefix}_int`] = row.values[2];
          tariff[`${zone.dbPrefix}_arr`] = row.values[3];
        }

        if (Object.keys(tariff).length > 3) {
          parsedTariffs.push(tariff);
          totalRows++;
          console.log(`[Phase 2]     ✓ Tarifa creada: ${service.serviceName} ${zone.zoneName} ${row.weightFrom}-${row.weightTo}kg`);
        }
      }
    }
  }

  console.log('[Phase 2] ===== EXTRACCIÓN COMPLETADA =====');
  console.log(`[Phase 2] Total tarifas creadas: ${totalRows}`);

  return parsedTariffs;
}

function validateExtraction(serviceLocations: ServiceLocation[], parsedTariffs: ParsedTariff[]): { valid: boolean; warnings: string[]; stats: any } {
  const warnings: string[] = [];
  const stats = {
    servicesExpected: SERVICE_MAPPINGS.length,
    servicesFound: serviceLocations.length,
    totalZones: 0,
    totalRows: parsedTariffs.length,
    serviceBreakdown: {} as any
  };

  for (const service of serviceLocations) {
    stats.totalZones += service.zones.length;
    stats.serviceBreakdown[service.serviceName] = {
      zones: service.zones.length,
      rows: service.zones.reduce((sum, z) => sum + z.dataRows.length, 0)
    };
  }

  if (serviceLocations.length === 0) {
    warnings.push('No se detectaron servicios en el PDF');
  }

  if (parsedTariffs.length === 0) {
    warnings.push('No se extrajeron tarifas del PDF');
  }

  if (parsedTariffs.length < 100) {
    warnings.push(`Se extrajeron solo ${parsedTariffs.length} tarifas (esperado: 120-150+)`);
  }

  const missingServices = SERVICE_MAPPINGS
    .filter(m => !serviceLocations.some(s => s.serviceName === m.dbName))
    .map(m => m.dbName);

  if (missingServices.length > 0) {
    warnings.push(`Servicios no encontrados: ${missingServices.join(', ')}`);
  }

  return {
    valid: warnings.length === 0,
    warnings,
    stats
  };
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

    const { text: pdfText, confidence, pages } = await extractTextFromPDF(uint8Array);

    console.log(`[PDF Parser] Texto extraído: ${pdfText.length} caracteres, ${pages} páginas, confianza: ${confidence}`);
    console.log(`[PDF Parser] Primeros 1000 caracteres:`, pdfText.substring(0, 1000));

    const normalizedText = normalizeSpaces(pdfText);
    const lines = normalizedText.split('\n').filter(line => line.trim().length > 0);

    console.log(`[PDF Parser] ${lines.length} líneas para procesar`);

    const serviceLocations = phaseOneMapping(lines);

    const parsedTariffs = phaseTwoExtraction(serviceLocations);

    const validation = validateExtraction(serviceLocations, parsedTariffs);

    console.log('[PDF Parser] Validación:', validation);

    if (parsedTariffs.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No se pudieron extraer tarifas del PDF",
          details: "El PDF no tiene el formato esperado de tarifas GLS",
          suggestions: [
            "Verifica que el PDF contiene tablas de tarifas GLS España 2025",
            "El PDF debe incluir nombres de servicios (Business Parcel, Express, etc.)",
            "Las tablas deben tener rangos de peso y precios claramente definidos"
          ],
          debugInfo: {
            textLength: pdfText.length,
            pages,
            confidence,
            linesProcessed: lines.length,
            servicesDetected: serviceLocations.length,
            validation: validation.stats,
            warnings: validation.warnings,
            sampleText: pdfText.substring(0, 1500)
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
      console.log(`[PDF Parser] Tabla tariffspdf limpiada`);
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
          parsedCount: parsedTariffs.length
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF Parser] ✓ Importación exitosa: ${insertedData?.length || 0} registros`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se importaron ${parsedTariffs.length} tarifas correctamente`,
        imported: insertedData?.length || 0,
        warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
        confidence,
        pages,
        stats: validation.stats,
        preview: parsedTariffs.slice(0, 5)
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
