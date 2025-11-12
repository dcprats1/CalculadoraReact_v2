import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "userId requerido",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[check-tariff-activation] Checking for user: ${userId}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabaseAdmin
      .from("user_tariff_activation")
      .select("is_activated, pdf_filename, activation_date")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[check-tariff-activation] Database error:", error);
      return new Response(
        JSON.stringify({
          error: "Error al consultar estado de activación",
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!data) {
      console.log(`[check-tariff-activation] No activation record found for user ${userId}`);

      const { error: insertError } = await supabaseAdmin
        .from("user_tariff_activation")
        .insert({
          user_id: userId,
          is_activated: false,
        });

      if (insertError && !insertError.message.includes("duplicate")) {
        console.error("[check-tariff-activation] Error creating activation record:", insertError);
      }

      return new Response(
        JSON.stringify({
          is_activated: false,
          message: "Usuario necesita subir PDF de tarifas oficial",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[check-tariff-activation] User ${userId} activation status: ${data.is_activated}`);

    return new Response(
      JSON.stringify({
        is_activated: data.is_activated,
        pdf_filename: data.pdf_filename,
        activation_date: data.activation_date,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[check-tariff-activation] Unexpected error:", error);
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