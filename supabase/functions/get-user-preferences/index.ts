import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function validateSession(supabaseAdmin: any, userId: string, sessionToken: string) {
  const { data, error } = await supabaseAdmin
    .from('user_sessions')
    .select('id, user_id, expires_at')
    .eq('user_id', userId)
    .eq('session_token', sessionToken)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userId, sessionToken, action, updates } = await req.json();

    if (!userId || !sessionToken) {
      return new Response(
        JSON.stringify({ error: 'userId y sessionToken requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const session = await validateSession(supabaseAdmin, userId, sessionToken);
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Sesion no valida o expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update' && updates) {
      const { data, error } = await supabaseAdmin
        .from('user_preferences')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar preferencias' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching preferences:', error);
      return new Response(
        JSON.stringify({ error: 'Error al obtener preferencias' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data) {
      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: newPrefs, error: insertError } = await supabaseAdmin
      .from('user_preferences')
      .insert({
        user_id: userId,
        fixed_spc_value: null,
        fixed_discount_percentage: null,
        default_service_packages: [],
        ui_theme: 'light',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating preferences:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error al crear preferencias' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: newPrefs }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-user-preferences:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
