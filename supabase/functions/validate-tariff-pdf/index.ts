import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import * as pdfjsLib from "npm:pdfjs-dist@3.11.174";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ValidationRequest {
  pdfPath: string;
  userId: string;
}

interface ValidationResponse {
  isValid: boolean;
  confidence: number;
  reason: string;
}

const VALIDATION_KEYWORDS = {
  primary: [
    { text: "TARIFA ARRASTRE PLANO 2025", points: 30 },
    { text: "TARIFA RED 2025", points: 30 },
    { text: "TARIFA RED_2025", points: 30 },
    { text: "Agencias GLS Spain", points: 20 },
    { text: "GLS Spain", points: 15 },
    { text: "Enero 2025", points: 15 },
    { text: "2025", points: 10 },
  ],
  secondary: [
    { text: "BusinessParcel", points: 10 },
    { text: "EconomyParcel", points: 10 },
    { text: "Tarifas de Coste", points: 5 },
    { text: "GlobalExpressParcel", points: 5 },
    { text: "ShopReturnService", points: 5 },
  ],
};

// Patrones regex para detectar servicios con variaciones (con y sin cero a la izquierda)
const SERVICE_PATTERNS = [
  { pattern: /Express\s*0?8:30/i, name: "Express08:30", points: 15 },
  { pattern: /Express\s*0?10:30/i, name: "Express10:30", points: 15 },
  { pattern: /Express\s*0?14:00/i, name: "Express14:00", points: 15 },
  { pattern: /Express\s*0?19:00/i, name: "Express19:00", points: 15 },
];

async function extractTextFromPDF(pdfData: Uint8Array, maxPages: number = 3): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdfDocument = await loadingTask.promise;

    const numPages = Math.min(pdfDocument.numPages, maxPages);
    let fullText = "";

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

function validatePDFContent(text: string): ValidationResponse {
  let score = 0;
  const foundKeywords: string[] = [];

  // Validar palabras clave primarias (solo la primera coincidencia de cada grupo)
  let hasPrimaryTarifa = false;
  for (const keyword of VALIDATION_KEYWORDS.primary) {
    if (text.includes(keyword.text)) {
      if (!hasPrimaryTarifa && (keyword.text.includes("TARIFA") || keyword.text === "2025")) {
        score += keyword.points;
        foundKeywords.push(keyword.text);
        if (keyword.text.includes("TARIFA")) {
          hasPrimaryTarifa = true;
        }
      } else if (!keyword.text.includes("TARIFA") && keyword.text !== "2025") {
        score += keyword.points;
        foundKeywords.push(keyword.text);
      }
    }
  }

  // Validar palabras clave secundarias
  for (const keyword of VALIDATION_KEYWORDS.secondary) {
    if (text.includes(keyword.text)) {
      score += keyword.points;
      foundKeywords.push(keyword.text);
    }
  }

  // Validar servicios usando patrones regex
  for (const servicePattern of SERVICE_PATTERNS) {
    if (servicePattern.pattern.test(text)) {
      score += servicePattern.points;
      const match = text.match(servicePattern.pattern);
      foundKeywords.push(`${servicePattern.name} (encontrado: ${match ? match[0] : ''})`);
    }
  }

  // Reducir el umbral a 50 para acomodar variaciones de formato
  const isValid = score >= 50;

  console.log(`[PDF Validation] Score: ${score}, Keywords found: ${foundKeywords.length}`);
  console.log(`[PDF Validation] Keywords: ${foundKeywords.join(', ')}`);

  return {
    isValid,
    confidence: score,
    reason: isValid
      ? `PDF oficial validado correctamente (${foundKeywords.length} indicadores encontrados: ${foundKeywords.slice(0, 5).join(', ')})`
      : `El documento no parece ser la tarifa oficial de GLS 2025. Score: ${score}/50. Por favor, verifica que has subido el archivo correcto.`
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { pdfPath, userId }: ValidationRequest = await req.json();

    if (!pdfPath || !userId) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: pdfPath and userId",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: pdfBlob, error: downloadError } = await supabase
      .storage
      .from("user-tariff-pdfs")
      .download(pdfPath);

    if (downloadError || !pdfBlob) {
      console.error("Error downloading PDF:", downloadError);
      return new Response(
        JSON.stringify({
          error: "Failed to download PDF file",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);

    const pdfText = await extractTextFromPDF(pdfData, 3);

    const validationResult = validatePDFContent(pdfText);

    if (validationResult.isValid) {
      const { error: updateError } = await supabase
        .from("user_tariff_activation")
        .upsert({
          user_id: userId,
          is_activated: true,
          pdf_validation_score: validationResult.confidence,
          pdf_storage_path: pdfPath,
          activation_date: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (updateError) {
        console.error("Error updating activation status:", updateError);
      }
    }

    return new Response(
      JSON.stringify(validationResult),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({
        isValid: false,
        confidence: 0,
        reason: "Error al procesar el archivo. Por favor, intenta de nuevo.",
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});