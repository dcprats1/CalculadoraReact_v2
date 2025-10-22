import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  email: string;
  code: string;
  deviceFingerprint: string;
  deviceName: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, code, deviceFingerprint, deviceName }: RequestBody = await req.json();

    if (!email || !code || !deviceFingerprint) {
      return new Response(
        JSON.stringify({ error: 'Email, código y fingerprint requeridos' }),
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

    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 1. Buscar código válido en verification_codes
    const { data: verificationCode, error: codeError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) {
      console.error('Error checking code:', codeError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar código' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!verificationCode) {
      // Log failed login
      await supabaseAdmin.from('auth_logs').insert({
        email: email.toLowerCase(),
        event_type: 'login_failed',
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        error_message: 'Código inválido o expirado',
      });

      return new Response(
        JSON.stringify({ error: 'Código inválido o expirado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Verificar límite de intentos (máximo 3)
    if (verificationCode.attempts >= 3) {
      await supabaseAdmin.from('auth_logs').insert({
        email: email.toLowerCase(),
        event_type: 'login_failed',
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        error_message: 'Demasiados intentos',
      });

      return new Response(
        JSON.stringify({ error: 'Demasiados intentos. Solicita un nuevo código' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Obtener datos del usuario desde user_profiles
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userError || !userProfile) {
      console.error('Error fetching user:', userError);

      await supabaseAdmin
        .from('verification_codes')
        .update({ attempts: verificationCode.attempts + 1 })
        .eq('id', verificationCode.id);

      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Validar suscripción activa
    if (userProfile.subscription_status !== 'active' && userProfile.subscription_status !== 'trial') {
      await supabaseAdmin.from('auth_logs').insert({
        user_id: userProfile.id,
        email: email.toLowerCase(),
        event_type: 'access_denied',
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        error_message: 'Suscripción inactiva',
      });

      return new Response(
        JSON.stringify({
          error: 'Tu suscripción ha expirado',
          subscription_status: userProfile.subscription_status
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (new Date(userProfile.subscription_end_date) < new Date()) {
      await supabaseAdmin.from('auth_logs').insert({
        user_id: userProfile.id,
        email: email.toLowerCase(),
        event_type: 'access_denied',
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        error_message: 'Suscripción expirada',
      });

      return new Response(
        JSON.stringify({ error: 'Tu suscripción ha expirado' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Contar sesiones activas del usuario
    const { data: activeSessions, error: sessionsError } = await supabaseAdmin
      .from('user_sessions')
      .select('id, device_fingerprint, device_name, last_authenticated_at')
      .eq('user_id', userProfile.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (sessionsError) {
      console.error('Error checking sessions:', sessionsError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar dispositivos' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Buscar sesión existente con este device_fingerprint
    const existingSession = activeSessions?.find(s => s.device_fingerprint === deviceFingerprint);

    if (existingSession) {
      // Actualizar sesión existente (renovar 24h)
      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from('user_sessions')
        .update({
          last_authenticated_at: new Date().toISOString(),
          expires_at: newExpiresAt,
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .eq('id', existingSession.id);

      // Marcar código como usado
      await supabaseAdmin
        .from('verification_codes')
        .update({ used: true })
        .eq('id', verificationCode.id);

      // Log successful login
      await supabaseAdmin.from('auth_logs').insert({
        user_id: userProfile.id,
        email: email.toLowerCase(),
        event_type: 'login_success',
        ip_address: ipAddress,
        user_agent: userAgent,
        success: true,
      });

      // Generar session token (JWT)
      const sessionToken = btoa(JSON.stringify({
        userId: userProfile.id,
        email: userProfile.email,
        sessionId: existingSession.id,
        expiresAt: newExpiresAt,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          sessionToken,
          user: {
            id: userProfile.id,
            email: userProfile.email,
            tier: userProfile.subscription_tier,
            maxDevices: userProfile.max_devices,
            expiresAt: newExpiresAt,
            subscriptionEndDate: userProfile.subscription_end_date,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 7. Si no existe sesión, verificar límite de dispositivos
    const currentDeviceCount = activeSessions?.length || 0;

    if (currentDeviceCount >= userProfile.max_devices) {
      await supabaseAdmin.from('auth_logs').insert({
        user_id: userProfile.id,
        email: email.toLowerCase(),
        event_type: 'device_limit_exceeded',
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        error_message: `Límite alcanzado: ${currentDeviceCount}/${userProfile.max_devices}`,
        metadata: { active_devices: activeSessions },
      });

      return new Response(
        JSON.stringify({
          error: `Máximo de dispositivos alcanzado (${currentDeviceCount}/${userProfile.max_devices})`,
          active_devices: activeSessions?.map(s => ({
            device_name: s.device_name,
            last_authenticated_at: s.last_authenticated_at,
          })),
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 8. Crear nueva sesión
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: newSession, error: newSessionError } = await supabaseAdmin
      .from('user_sessions')
      .insert({
        user_id: userProfile.id,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName || 'Unknown Device',
        last_authenticated_at: new Date().toISOString(),
        expires_at: newExpiresAt,
        is_active: true,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (newSessionError || !newSession) {
      console.error('Error creating session:', newSessionError);
      return new Response(
        JSON.stringify({ error: 'Error al crear sesión' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 9. Marcar código como usado
    await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationCode.id);

    // 10. Log successful login
    await supabaseAdmin.from('auth_logs').insert({
      user_id: userProfile.id,
      email: email.toLowerCase(),
      event_type: 'login_success',
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    });

    // 11. Generar session token (JWT simple)
    const sessionToken = btoa(JSON.stringify({
      userId: userProfile.id,
      email: userProfile.email,
      sessionId: newSession.id,
      expiresAt: newExpiresAt,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        sessionToken,
        user: {
          id: userProfile.id,
          email: userProfile.email,
          tier: userProfile.subscription_tier,
          maxDevices: userProfile.max_devices,
          expiresAt: newExpiresAt,
          subscriptionEndDate: userProfile.subscription_end_date,
        },
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
