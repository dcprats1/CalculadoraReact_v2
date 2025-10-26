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
}

const SERVICE_MAPPINGS: ServiceMapping[] = [
  { pdfName: "Express08:30", dbName: "Urg8:30H Courier" },
  { pdfName: "Express8:30", dbName: "Urg8:30H Courier" },
  { pdfName: "Express 8:30", dbName: "Urg8:30H Courier" },
  { pdfName: "Express10:30", dbName: "Urg10H Courier" },
  { pdfName: "Express 10:30", dbName: "Urg10H Courier" },
  { pdfName: "Express14:00", dbName: "Urg14H Courier" },
  { pdfName: "Express 14:00", dbName: "Urg14H Courier" },
  { pdfName: "Express19:00", dbName: "Urg19H Courier" },
  { pdfName: "Express 19:00", dbName: "Urg19H Courier" },
  { pdfName: "BusinessParcel", dbName: "Business Parcel" },
  { pdfName: "Business Parcel", dbName: "Business Parcel" },
  { pdfName: "EuroBusinessParcel", dbName: "EuroBusiness Parcel" },
  { pdfName: "Euro Business Parcel", dbName: "EuroBusiness Parcel" },
  { pdfName: "EconomyParcel", dbName: "Economy Parcel" },
  { pdfName: "Economy Parcel", dbName: "Economy Parcel" },
  { pdfName: "Maritimo", dbName: "Marítimo" },
  { pdfName: "Marítimo", dbName: "Marítimo" },
  { pdfName: "ParcelShop", dbName: "Parcel Shop" },
  { pdfName: "Parcel Shop", dbName: "Parcel Shop" },
];

interface WeightRange {
  from: string;
  to: string;
  patterns: string[];
}

const WEIGHT_RANGES: WeightRange[] = [
  { from: "0", to: "1", patterns: ["1Kg.", "1 Kg.", "hasta 1", "0-1", "Hasta 1"] },
  { from: "1", to: "3", patterns: ["3Kg.", "3 Kg.", "1-3", "De 1 a 3"] },
  { from: "3", to: "5", patterns: ["5Kg.", "5 Kg.", "3-5", "De 3 a 5"] },
  { from: "5", to: "10", patterns: ["10Kg.", "10 Kg.", "5-10", "De 5 a 10"] },
  { from: "10", to: "15", patterns: ["15Kg.", "15 Kg.", "10-15", "De 10 a 15"] },
  { from: "15", to: "999", patterns: ["+Kg.", "+ Kg.", "15+", ">15", "Mayor 1 pallet", "Más de 15"] },
];

interface ParsedTariff {
  service_name: string;
  weight_from: string;
  weight_to: string;
  [key: string]: string | number | null;
}

function mapServiceName(pdfServiceName: string): string | null {
  const normalized = pdfServiceName.trim();
  for (const mapping of SERVICE_MAPPINGS) {
    if (normalized.includes(mapping.pdfName)) {
      return mapping.dbName;
    }
  }
  return null;
}

function parseWeightRange(weightText: string): { from: string; to: string } | null {
  const normalized = weightText.toLowerCase().trim();
  for (const range of WEIGHT_RANGES) {
    for (const pattern of range.patterns) {
      if (normalized.includes(pattern.toLowerCase())) {
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
  const cleaned = value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function extractTextFromPDF(uint8Array: Uint8Array): { text: string; confidence: 'high' | 'low' } {
  const pdfSignature = uint8Array.slice(0, 5);
  const signatureStr = new TextDecoder('utf-8').decode(pdfSignature);

  if (!signatureStr.startsWith('%PDF-')) {
    throw new Error('El archivo no es un PDF válido');
  }

  try {
    const textDecoder = new TextDecoder("utf-8", { fatal: false });
    let pdfText = textDecoder.decode(uint8Array);

    pdfText = pdfText.replace(/\0/g, ' ');
    pdfText = pdfText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');

    const streamPattern = /stream\s+(.*?)\s+endstream/gs;
    const textObjects = /\((.*?)\)/g;
    const tjOperators = /\[(.*?)\]\s*TJ/g;

    let extractedText = '';

    let match;
    while ((match = streamPattern.exec(pdfText)) !== null) {
      const streamContent = match[1];

      let textMatch;
      while ((textMatch = textObjects.exec(streamContent)) !== null) {
        extractedText += textMatch[1] + '\n';
      }

      while ((textMatch = tjOperators.exec(streamContent)) !== null) {
        const arrayContent = textMatch[1];
        const strings = arrayContent.match(/\((.*?)\)/g);
        if (strings) {
          strings.forEach(s => {
            extractedText += s.replace(/[()]/g, '') + ' ';
          });
          extractedText += '\n';
        }
      }
    }

    if (extractedText.length < 100) {
      pdfText = pdfText.replace(/[^\x20-\x7E\n]/g, '');
      return { text: pdfText, confidence: 'low' };
    }

    return { text: extractedText, confidence: 'high' };
  } catch (error) {
    throw new Error(`Error al extraer texto del PDF: ${error.message}`);
  }
}

Deno.serve(async (req: Request) => {
  console.log(`[PDF Parser] Nueva petición: ${req.method}`);
  console.log(`[PDF Parser] Headers:`, Object.fromEntries(req.headers.entries()));

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log(`[PDF Parser] Content-Type: ${req.headers.get('content-type')}`);
    const formData = await req.formData();
    console.log(`[PDF Parser] FormData keys:`, Array.from(formData.keys()));
    const pdfFile = formData.get("pdf") as File;
    console.log(`[PDF Parser] Archivo recibido:`, {
      name: pdfFile?.name,
      size: pdfFile?.size,
      type: pdfFile?.type
    });

    if (!pdfFile) {
      console.error('[PDF Parser] No se recibió archivo PDF en el FormData');
      return new Response(
        JSON.stringify({
          error: "No se proporcionó archivo PDF",
          details: "Por favor, selecciona un archivo PDF de tarifas GLS",
          debug: {
            formDataKeys: Array.from(formData.keys()),
            contentType: req.headers.get('content-type')
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pdfFile.type || pdfFile.type !== 'application/pdf') {
      console.error(`[PDF Parser] Tipo de archivo inválido: ${pdfFile.type}`);
      return new Response(
        JSON.stringify({
          error: "El archivo debe ser un PDF",
          details: `Tipo de archivo recibido: ${pdfFile.type || 'desconocido'}`,
          hint: "Asegúrate de que el archivo tenga extensión .pdf"
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

    const { text: pdfText, confidence } = extractTextFromPDF(uint8Array);

    console.log(`[PDF Parser] Texto extraído con confianza: ${confidence}`);

    const lines = pdfText.split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const parsedTariffs: ParsedTariff[] = [];
    const warnings: string[] = [];

    let currentService: string | null = null;
    let processedLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      processedLines++;

      const serviceName = mapServiceName(line);
      if (serviceName) {
        currentService = serviceName;
        console.log(`[PDF Parser] Servicio detectado: ${serviceName}`);
        continue;
      }

      if (!currentService) continue;

      const weightRange = parseWeightRange(line);
      if (!weightRange) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 5) {
        warnings.push(`Línea ${i+1}: Datos insuficientes en rango de peso ${weightRange.from}-${weightRange.to}kg`);
        continue;
      }

      const tariff: ParsedTariff = {
        service_name: currentService,
        weight_from: weightRange.from,
        weight_to: weightRange.to,
      };

      let columnIndex = 0;
      for (let j = 0; j < parts.length; j++) {
        const value = parseNumericValue(parts[j]);
        if (value !== null) {
          const destinations = [
            "provincial", "regional", "nacional", "portugal",
            "baleares_mayores", "baleares_menores",
            "canarias_mayores", "canarias_menores",
            "ceuta", "melilla",
            "andorra", "gibraltar",
            "azores_mayores", "azores_menores",
            "madeira_mayores", "madeira_menores"
          ];
          const columns = ["_sal", "_rec", "_int", "_arr"];

          const destIndex = Math.floor(columnIndex / 4);
          const colIndex = columnIndex % 4;

          if (destIndex < destinations.length && colIndex < columns.length) {
            const fieldName = destinations[destIndex] + columns[colIndex];
            tariff[fieldName] = value;
          }
          columnIndex++;
        }
      }

      if (Object.keys(tariff).length > 3) {
        parsedTariffs.push(tariff);
      }
    }

    console.log(`[PDF Parser] Procesadas ${processedLines} líneas, encontradas ${parsedTariffs.length} tarifas`);

    if (parsedTariffs.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No se pudieron extraer tarifas del PDF",
          details: "Verifique que el PDF tenga el formato correcto de tarifas GLS",
          suggestions: [
            "Asegúrese de que el PDF contiene tablas de tarifas GLS España 2025",
            "El PDF debe incluir nombres de servicios (Business Parcel, Express, etc.)",
            "Las tablas deben tener rangos de peso y precios claramente definidos",
            "Si el PDF está escaneado, puede que necesite OCR"
          ],
          debugInfo: {
            processedLines,
            confidence,
            sampleLines: lines.slice(0, 10)
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
        warnings: warnings.length > 0 ? warnings.slice(0, 5) : undefined,
        confidence,
        preview: parsedTariffs.slice(0, 5)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[PDF Parser] Error fatal: ${error.message}`);
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error.message,
        type: error.name,
        hint: "Por favor, verifica que el archivo sea un PDF válido y no esté corrupto"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});