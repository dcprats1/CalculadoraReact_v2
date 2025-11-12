import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await req.formData();
    const pdfFile = formData.get("pdf") as File;
    const userId = formData.get("userId") as string;

    if (!pdfFile || !userId) {
      return new Response(
        JSON.stringify({
          error: "PDF y userId requeridos",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (pdfFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `El archivo es demasiado grande (máximo ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[upload-and-validate-tariff] Processing PDF for user: ${userId}, size: ${pdfFile.size} bytes`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const fileName = `${userId}/tarifa_${new Date().getTime()}.pdf`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("user-tariff-pdfs")
      .upload(fileName, pdfFile, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[upload-and-validate-tariff] Upload error:", uploadError);
      return new Response(
        JSON.stringify({
          error: "Error al subir el archivo",
          details: uploadError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[upload-and-validate-tariff] PDF uploaded: ${fileName}`);

    const parsePdfFormData = new FormData();
    parsePdfFormData.append("pdf", pdfFile);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const parsePdfUrl = `${supabaseUrl}/functions/v1/parse-pdf-tariff`;

    const parseResponse = await fetch(parsePdfUrl, {
      method: "POST",
      body: parsePdfFormData,
    });

    if (!parseResponse.ok) {
      console.error("[upload-and-validate-tariff] Parse PDF failed:", parseResponse.status);
      const errorText = await parseResponse.text();
      console.error("[upload-and-validate-tariff] Parse error details:", errorText);

      return new Response(
        JSON.stringify({
          error: "El PDF no es una tarifa válida de GLS",
          message: "Por favor, asegúrate de subir el PDF oficial de tarifas GLS",
          is_activated: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parseResult = await parseResponse.json();

    console.log("[upload-and-validate-tariff] Parse result:", JSON.stringify(parseResult.metadata || {}));

    const confidence = parseResult.metadata?.secureTitleValidation?.confidence || 0;
    const detectedTitles = parseResult.metadata?.secureTitleValidation?.detectedTitles || 0;
    const totalTitles = parseResult.metadata?.secureTitleValidation?.totalTitles || 38;

    const isValid = confidence >= 0.5 && detectedTitles >= (totalTitles * 0.5);

    console.log(`[upload-and-validate-tariff] Validation: confidence=${confidence}, titles=${detectedTitles}/${totalTitles}, valid=${isValid}`);

    const { error: updateError } = await supabaseAdmin
      .from("user_tariff_activation")
      .upsert({
        user_id: userId,
        pdf_uploaded_at: new Date().toISOString(),
        pdf_filename: fileName,
        pdf_validation_score: Math.round(confidence * 100),
        is_activated: isValid,
        activation_date: isValid ? new Date().toISOString() : null,
        pdf_storage_path: fileName,
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error("[upload-and-validate-tariff] Update error:", updateError);
      return new Response(
        JSON.stringify({
          error: "Error al actualizar estado de activación",
          details: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (isValid) {
      console.log(`[upload-and-validate-tariff] ✅ User ${userId} activated successfully`);
      return new Response(
        JSON.stringify({
          is_activated: true,
          confidence: confidence,
          detectedTitles: detectedTitles,
          totalTitles: totalTitles,
          message: "PDF validado correctamente. Acceso concedido.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      console.log(`[upload-and-validate-tariff] ❌ User ${userId} validation failed`);
      return new Response(
        JSON.stringify({
          is_activated: false,
          confidence: confidence,
          detectedTitles: detectedTitles,
          totalTitles: totalTitles,
          message: `El PDF no contiene suficientes marcadores de tarifa GLS (detectados ${detectedTitles}/${totalTitles}, confianza ${Math.round(confidence * 100)}%)`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("[upload-and-validate-tariff] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});