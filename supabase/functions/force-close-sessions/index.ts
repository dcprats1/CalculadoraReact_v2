import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  email: string;
  code: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, code }: RequestBody = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email y código requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const normalizedEmail = email.toLowerCase().trim();
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const { data: verificationCode, error: codeError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError || !verificationCode) {
      return new Response(
        JSON.stringify({ error: 'Código inválido o expirado. Necesitas un código OTP válido para cerrar sesiones.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, max_devices')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: activeSessions } = await supabaseAdmin
      .from('user_sessions')
      .select('id, device_name, last_authenticated_at')
      .eq('user_id', userProfile.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    const closedCount = activeSessions?.length || 0;

    const { error: updateError } = await supabaseAdmin
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userProfile.id)
      .eq('is_active', true);

    if (updateError) {
      console.error('Error closing sessions:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error al cerrar sesiones' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await supabaseAdmin.from('auth_logs').insert({
      user_id: userProfile.id,
      email: normalizedEmail,
      event_type: 'force_close_all_sessions',
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
      metadata: {
        closed_sessions: closedCount,
        closed_devices: activeSessions?.map(s => s.device_name),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        closedSessions: closedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error in force-close-sessions:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
