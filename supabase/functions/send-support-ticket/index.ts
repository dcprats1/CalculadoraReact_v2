import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  subject: string;
  description: string;
  phone?: string;
  attachmentUrl?: string;
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

    const { subject, description, phone, attachmentUrl }: RequestBody = await req.json();

    if (!subject || !description) {
      return new Response(
        JSON.stringify({ error: 'Asunto y descripción requeridos' }),
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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    if (!userProfile) {
      return new Response(
        JSON.stringify({ error: 'Perfil no encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: activeSession } = await supabaseAdmin
      .from('user_sessions')
      .select('device_name, ip_address')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('last_authenticated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || activeSession?.ip_address || 'unknown';
    const deviceName = activeSession?.device_name || 'Unknown Device';

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #4b5563; }
    .description-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc2626; white-space: pre-wrap; }
    .technical-data { margin-top: 20px; padding: 15px; background: #e5e7eb; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🆘 Incidencia Reportada</h1>
    </div>
    <div class="content">
      <h2>Usuario</h2>
      <div class="info-row"><span class="label">Email:</span> ${userProfile.email}</div>
      <div class="info-row"><span class="label">Plan:</span> Tier ${userProfile.subscription_tier}</div>
      ${phone ? `<div class="info-row"><span class="label">Teléfono:</span> ${phone}</div>` : ''}

      <h2>Tipo de Incidencia</h2>
      <div class="info-row">${subject}</div>

      <h2>Descripción</h2>
      <div class="description-box">${description}</div>

      ${attachmentUrl ? `
      <h2>Archivo Adjunto</h2>
      <div class="info-row"><a href="${attachmentUrl}">Ver archivo adjunto</a></div>
      ` : ''}

      <div class="technical-data">
        <strong>Datos Técnicos:</strong><br>
        User ID: ${user.id}<br>
        Dispositivo: ${deviceName}<br>
        Browser: ${userAgent}<br>
        IP: ${ipAddress}<br>
        Timestamp: ${new Date().toISOString()}
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Servicio de email no configurado' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Calculadora Tarifas <noreply@logicalogistica.com>',
        to: ['dcprats@gmail.com'],
        reply_to: userProfile.email,
        subject: `[INCIDENCIA] ${subject} - ${userProfile.email}`,
        html: emailBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Error al enviar email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await supabaseAdmin.from('auth_logs').insert({
      user_id: user.id,
      email: userProfile.email,
      event_type: 'support_ticket_sent',
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
      metadata: { subject, phone, has_attachment: !!attachmentUrl },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Incidencia enviada correctamente',
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
