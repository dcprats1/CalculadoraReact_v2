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

function decompressFlateDecode(data: Uint8Array): Uint8Array {
  try {
    const decompressed = new DecompressionStream('deflate');
    const writer = decompressed.writable.getWriter();
    writer.write(data);
    writer.close();

    const reader = decompressed.readable.getReader();
    const chunks: Uint8Array[] = [];

    return new Promise((resolve, reject) => {
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }

          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      pump();
    });
  } catch (error) {
    console.error('[PDF Parser] Decompression error:', error);
    return data;
  }
}

function extractEncodedText(text: string): string {
  let decoded = text;

  decoded = decoded
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f');

  decoded = decoded.replace(/\\(\d{3})/g, (match, octal) => {
    const code = parseInt(octal, 8);
    return String.fromCharCode(code);
  });

  decoded = decoded.replace(/<([0-9A-Fa-f]+)>/g, (match, hex) => {
    let result = '';
    for (let i = 0; i < hex.length; i += 2) {
      const byte = hex.substr(i, 2);
      result += String.fromCharCode(parseInt(byte, 16));
    }
    return result;
  });

  return decoded;
}

async function extractTextFromPDF(uint8Array: Uint8Array): Promise<{ text: string; confidence: 'high' | 'medium' | 'low' }> {
  const pdfSignature = uint8Array.slice(0, 5);
  const signatureStr = new TextDecoder('utf-8').decode(pdfSignature);

  if (!signatureStr.startsWith('%PDF-')) {
    throw new Error('El archivo no es un PDF válido');
  }

  try {
    const textDecoder = new TextDecoder("latin1", { fatal: false });
    let pdfText = textDecoder.decode(uint8Array);

    const extractedChunks: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'low';

    const objectPattern = /(\d+)\s+(\d+)\s+obj\s*([\s\S]*?)\s*endobj/g;
    let objectMatch;
    let totalObjectsProcessed = 0;
    let totalTextExtracted = 0;

    while ((objectMatch = objectPattern.exec(pdfText)) !== null) {
      totalObjectsProcessed++;
      const objectContent = objectMatch[3];

      const streamMatch = /stream\s*([\s\S]*?)\s*endstream/g.exec(objectContent);
      if (!streamMatch) {
        const simpleTextPattern = /\(((?:[^()\\]|\\[()\\nrtfb]|\\[0-9]{3})*)\)\s*Tj/g;
        let textMatch;

        while ((textMatch = simpleTextPattern.exec(objectContent)) !== null) {
          const extracted = extractEncodedText(textMatch[1]);
          if (extracted.length > 0 && /[a-zA-Z0-9]/.test(extracted)) {
            extractedChunks.push(extracted);
            totalTextExtracted++;
          }
        }
        continue;
      }

      const streamContent = streamMatch[1];

      const filterMatch = /\/Filter\s*\/FlateDecode/i.exec(objectContent);
      if (filterMatch) {
        try {
          const streamStartIndex = pdfText.indexOf('stream', objectMatch.index) + 6;
          while (pdfText.charCodeAt(streamStartIndex) === 13 || pdfText.charCodeAt(streamStartIndex) === 10) {
            streamStartIndex++;
          }
          const streamEndIndex = pdfText.indexOf('endstream', streamStartIndex);

          const compressedData = uint8Array.slice(streamStartIndex, streamEndIndex);
          const decompressed = await decompressFlateDecode(compressedData);
          const decompressedText = new TextDecoder('latin1').decode(decompressed);

          const tjPattern = /\(((?:[^()\\]|\\[()\\nrtfb]|\\[0-9]{3})*)\)\s*Tj/g;
          let tjMatch;
          while ((tjMatch = tjPattern.exec(decompressedText)) !== null) {
            const extracted = extractEncodedText(tjMatch[1]);
            if (extracted.length > 0) {
              extractedChunks.push(extracted);
              totalTextExtracted++;
            }
          }

          const tjArrayPattern = /\[((?:[^\[\]]|\\\[|\\\])*)\]\s*TJ/g;
          let tjArrayMatch;
          while ((tjArrayMatch = tjArrayPattern.exec(decompressedText)) !== null) {
            const arrayContent = tjArrayMatch[1];
            const stringMatches = arrayContent.match(/\(((?:[^()\\]|\\[()\\nrtfb]|\\[0-9]{3})*)\)/g);

            if (stringMatches) {
              for (const str of stringMatches) {
                const cleaned = str.replace(/^\(|\)$/g, '');
                const extracted = extractEncodedText(cleaned);
                if (extracted.length > 0) {
                  extractedChunks.push(extracted);
                  totalTextExtracted++;
                }
              }
            }
          }
        } catch (decompError) {
          console.error('[PDF Parser] Decompression failed for object:', decompError);
        }
        continue;
      }

      const textObjectPattern = /\(((?:[^()\\]|\\[()\\nrtfb]|\\[0-9]{3})*)\)\s*Tj/g;
      let textMatch;

      while ((textMatch = textObjectPattern.exec(streamContent)) !== null) {
        const extracted = extractEncodedText(textMatch[1]);
        if (extracted.length > 0 && /[a-zA-Z0-9]/.test(extracted)) {
          extractedChunks.push(extracted);
          totalTextExtracted++;
        }
      }

      const tjArrayPattern = /\[((?:[^\[\]]|\\\[|\\\])*)\]\s*TJ/g;
      let tjMatch;

      while ((tjMatch = tjArrayPattern.exec(streamContent)) !== null) {
        const arrayContent = tjMatch[1];
        const stringMatches = arrayContent.match(/\(((?:[^()\\]|\\[()\\nrtfb]|\\[0-9]{3})*)\)/g);

        if (stringMatches) {
          for (const str of stringMatches) {
            const cleaned = str.replace(/^\(|\)$/g, '');
            const extracted = extractEncodedText(cleaned);
            if (extracted.length > 0) {
              extractedChunks.push(extracted);
              totalTextExtracted++;
            }
          }
        }
      }
    }

    const extractedText = extractedChunks.join(' ');

    if (extractedText.length > 1000 && totalTextExtracted > 50) {
      confidence = 'high';
    } else if (extractedText.length > 300 && totalTextExtracted > 20) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    console.log(`[PDF Parser] Extraction stats:`, {
      totalBytes: uint8Array.length,
      objectsProcessed: totalObjectsProcessed,
      textChunksExtracted: totalTextExtracted,
      totalTextLength: extractedText.length,
      confidence
    });

    if (extractedText.length < 100) {
      const fallbackPattern = /BT\s+([\s\S]*?)\s+ET/g;
      let fallbackMatch;
      const fallbackChunks: string[] = [];

      while ((fallbackMatch = fallbackPattern.exec(pdfText)) !== null) {
        const btContent = fallbackMatch[1];
        const simpleText = btContent.match(/\(([^)]+)\)/g);
        if (simpleText) {
          fallbackChunks.push(...simpleText.map(t => extractEncodedText(t.replace(/[()]/g, ''))));
        }
      }

      if (fallbackChunks.length > 0) {
        return { text: fallbackChunks.join(' '), confidence: 'medium' };
      }

      const rawText = pdfText.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ' ');
      return { text: rawText, confidence: 'low' };
    }

    return { text: extractedText, confidence };
  } catch (error) {
    throw new Error(`Error al extraer texto del PDF: ${error.message}`);
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

function extractTableStructure(lines: string[]): { rows: string[][], headers: string[] } {
  const rows: string[][] = [];
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;

    const parts = line.split(/\s{2,}|\t+/).map(p => p.trim()).filter(p => p.length > 0);

    if (parts.length > 5) {
      if (parts.some(p => /provincial|regional|nacional|portugal/i.test(p))) {
        headers = parts;
        console.log(`[PDF Parser] Table headers detected at line ${i}:`, headers);
        continue;
      }

      if (parts.some(p => /^\d+([.,]\d+)?\s*kg/i.test(p) || /^\d+$/.test(p))) {
        rows.push(parts);
      }
    }
  }

  return { rows, headers };
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

    const { text: pdfText, confidence } = await extractTextFromPDF(uint8Array);

    console.log(`[PDF Parser] Texto extraído (${pdfText.length} caracteres) con confianza: ${confidence}`);
    console.log(`[PDF Parser] Primeros 800 caracteres:`, pdfText.substring(0, 800));

    const normalizedText = normalizeSpaces(pdfText);
    const lines = normalizedText.split('\n').filter(line => line.trim().length > 0);

    const { rows: tableRows, headers: tableHeaders } = extractTableStructure(lines);

    console.log(`[PDF Parser] Procesamiento:`, {
      totalLines: lines.length,
      tableRowsDetected: tableRows.length,
      tableHeaders: tableHeaders.length,
      confidence
    });

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
        console.log(`[PDF Parser] Servicio detectado en línea ${i}: ${serviceName}`);
        continue;
      }

      if (!currentService) continue;

      const parts = line.split(/\s+/).filter(p => p.trim().length > 0);

      const weightRange = parseWeightRange(line);
      if (!weightRange) {
        if (parts.length > 3 && parts.some(p => /^\d+[.,]?\d*$/.test(p))) {
          const firstPart = parts[0];
          const potentialWeight = parseWeightRange(firstPart);
          if (potentialWeight) {
            console.log(`[PDF Parser] Peso detectado indirectamente en línea ${i}: ${firstPart}`);
          }
        }
        continue;
      }

      console.log(`[PDF Parser] Procesando rango de peso ${weightRange.from}-${weightRange.to}kg en línea ${i}`);

      if (parts.length < 2) {
        warnings.push(`Línea ${i+1}: Datos insuficientes para ${weightRange.from}-${weightRange.to}kg`);
        continue;
      }

      const tariff: ParsedTariff = {
        service_name: currentService,
        weight_from: weightRange.from,
        weight_to: weightRange.to,
      };

      const numericValues: number[] = [];
      for (const part of parts) {
        const value = parseNumericValue(part);
        if (value !== null) {
          numericValues.push(value);
        }
      }

      console.log(`[PDF Parser] Valores numéricos encontrados:`, numericValues);

      if (numericValues.length > 0) {
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

        for (let colIndex = 0; colIndex < numericValues.length; colIndex++) {
          const destIndex = Math.floor(colIndex / 4);
          const typeIndex = colIndex % 4;

          if (destIndex < destinations.length && typeIndex < columns.length) {
            const fieldName = destinations[destIndex] + columns[typeIndex];
            tariff[fieldName] = numericValues[colIndex];
          }
        }

        if (Object.keys(tariff).length > 3) {
          parsedTariffs.push(tariff);
          console.log(`[PDF Parser] Tarifa añadida:`, tariff);
        } else {
          warnings.push(`Línea ${i+1}: Tarifa con pocos datos (${Object.keys(tariff).length} campos)`);
        }
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
            tableRowsDetected: tableRows.length,
            sampleLines: lines.slice(0, 30),
            extractedTextSample: pdfText.substring(0, 1500)
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
        warnings: warnings.length > 0 ? warnings.slice(0, 10) : undefined,
        confidence,
        stats: {
          textLength: pdfText.length,
          linesProcessed: processedLines,
          tableRowsDetected: tableRows.length
        },
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