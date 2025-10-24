import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  email: string;
  deviceFingerprint: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, deviceFingerprint }: RequestBody = await req.json();

    if (!email || !deviceFingerprint) {
      return new Response(
        JSON.stringify({ error: 'Email y deviceFingerprint requeridos' }),
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

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, subscription_status, subscription_tier, max_devices, subscription_end_date')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar usuario' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!userProfile) {
      await supabaseAdmin.from('auth_logs').insert({
        email: normalizedEmail,
        event_type: 'session_check_user_not_found',
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        metadata: { deviceFingerprint }
      });

      return new Response(
        JSON.stringify({
          hasActiveSession: false,
          requiresOTP: false,
          userNotFound: true,
          email: normalizedEmail
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: activeSession, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('id, session_token, expires_at, last_authenticated_at, user_id')
      .eq('user_id', userProfile.id)
      .eq('device_fingerprint', deviceFingerprint)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (sessionError) {
      console.error('Error checking session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar sesión' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!activeSession) {
      await supabaseAdmin.from('auth_logs').insert({
        email: normalizedEmail,
        event_type: 'session_check_no_active',
        ip_address: ipAddress,
        user_agent: userAgent,
        success: true,
        metadata: {
          userId: userProfile.id,
          deviceFingerprint,
          requiresOTP: true
        }
      });

      return new Response(
        JSON.stringify({
          hasActiveSession: false,
          requiresOTP: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let finalToken = activeSession.session_token;

    if (!finalToken) {
      finalToken = btoa(JSON.stringify({
        userId: userProfile.id,
        email: userProfile.email,
        sessionId: activeSession.id,
        expiresAt: activeSession.expires_at,
      }));

      await supabaseAdmin
        .from('user_sessions')
        .update({ session_token: finalToken })
        .eq('id', activeSession.id);
    }

    await supabaseAdmin.from('auth_logs').insert({
      email: normalizedEmail,
      event_type: 'session_check_active_found',
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
      metadata: {
        userId: userProfile.id,
        deviceFingerprint,
        sessionId: activeSession.id,
        expiresAt: activeSession.expires_at,
        tokenRegenerated: !activeSession.session_token
      }
    });

    return new Response(
      JSON.stringify({
        hasActiveSession: true,
        sessionToken: finalToken,
        user: {
          id: userProfile.id,
          email: userProfile.email,
          tier: userProfile.subscription_tier,
          maxDevices: userProfile.max_devices,
          expiresAt: activeSession.expires_at
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in check-active-session:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
