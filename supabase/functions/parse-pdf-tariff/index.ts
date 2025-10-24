import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
  { from: "0", to: "1", patterns: ["1kg", "1 kg", "hasta 1", "0-1"] },
  { from: "1", to: "3", patterns: ["3kg", "3 kg", "1-3"] },
  { from: "3", to: "5", patterns: ["5kg", "5 kg", "3-5"] },
  { from: "5", to: "10", patterns: ["10kg", "10 kg", "5-10"] },
  { from: "10", to: "15", patterns: ["15kg", "15 kg", "10-15"] },
  { from: "15", to: "999", patterns: ["+kg", "+ kg", "15+", ">15", "Mayor 1 pallet"] },
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

Deno.serve(async (req: Request) => {
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
        JSON.stringify({ error: "No se proporcionó archivo PDF" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const textDecoder = new TextDecoder("utf-8");
    const pdfText = textDecoder.decode(uint8Array);

    const lines = pdfText.split("\n").map(line => line.trim()).filter(line => line.length > 0);

    const parsedTariffs: ParsedTariff[] = [];
    const errors: string[] = [];
    
    let currentService: string | null = null;
    let currentPage = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const serviceName = mapServiceName(line);
      if (serviceName) {
        currentService = serviceName;
        continue;
      }

      if (!currentService) continue;

      const weightRange = parseWeightRange(line);
      if (!weightRange) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 5) continue;

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

    if (parsedTariffs.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No se pudieron extraer tarifas del PDF",
          details: "Verifique que el PDF tenga el formato correcto de tarifas GLS",
          parsedLines: lines.slice(0, 20)
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
      .from("tariffsPDF")
      .insert(parsedTariffs)
      .select();

    if (insertError) {
      return new Response(
        JSON.stringify({ 
          error: "Error al insertar tarifas en la base de datos",
          details: insertError.message,
          parsedCount: parsedTariffs.length
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se importaron ${parsedTariffs.length} tarifas correctamente`,
        imported: insertedData?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
        preview: parsedTariffs.slice(0, 5)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: "Error interno del servidor",
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});