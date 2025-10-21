import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UpdatePreferencesBody {
  fixedSPC?: number | null;
  fixedLinearDiscount?: number | null;
  agencyName?: string | null;
  agencyAddress?: string | null;
  agencyPostalCode?: string | null;
  agencyCity?: string | null;
  agencyProvince?: string | null;
  agencyEmail?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const updates: UpdatePreferencesBody = await req.json();

    if (updates.fixedLinearDiscount !== undefined && updates.fixedLinearDiscount !== null) {
      if (updates.fixedLinearDiscount < 0 || updates.fixedLinearDiscount > 100) {
        return new Response(
          JSON.stringify({ error: 'Descuento debe estar entre 0 y 100' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // SPC puede ser positivo o negativo, no validamos rango

    const dbUpdates = {
      fixed_spc_value: updates.fixedSPC,
      fixed_discount_percentage: updates.fixedLinearDiscount,
      agency_name: updates.agencyName,
      agency_address: updates.agencyAddress,
      agency_postal_code: updates.agencyPostalCode,
      agency_city: updates.agencyCity,
      agency_province: updates.agencyProvince,
      agency_email: updates.agencyEmail,
    };

    const { data: existingPrefs } = await supabaseClient
      .from('user_preferences')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let result;
    if (existingPrefs) {
      const { data, error } = await supabaseClient
        .from('user_preferences')
        .update(dbUpdates)
        .eq('user_id', user.id)
        .select()
        .single();

      result = { data, error };
    } else {
      const { data, error } = await supabaseClient
        .from('user_preferences')
        .insert({ user_id: user.id, ...dbUpdates })
        .select()
        .single();

      result = { data, error };
    }

    if (result.error) {
      console.error('Error updating preferences:', result.error);
      return new Response(
        JSON.stringify({ error: 'Error al actualizar preferencias' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Preferencias actualizadas correctamente',
        preferences: result.data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
