import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  currentTier: number;
  requestedTier: number;
  userName: string;
  phone: string;
  email: string;
  comments?: string;
}

const TIER_INFO: Record<number, { name: string; price: number; devices: number }> = {
  1: { name: '1 Licencia', price: 90, devices: 1 },
  2: { name: '2 Licencias', price: 135, devices: 3 },
  3: { name: '3 Licencias', price: 180, devices: 5 },
  4: { name: '4 Licencias', price: 225, devices: 8 },
  5: { name: '5 Licencias', price: 270, devices: 12 },
};

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

    const { currentTier, requestedTier, userName, phone, email, comments }: RequestBody = await req.json();

    if (!currentTier || !requestedTier || !userName || !phone || !email) {
      return new Response(
        JSON.stringify({ error: 'Datos incompletos' }),
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

    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, stripe_customer_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!userProfile) {
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const currentPlan = TIER_INFO[currentTier];
    const requestedPlan = TIER_INFO[requestedTier];

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #4b5563; }
    .plan-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Solicitud de Cambio de Plan</h1>
    </div>
    <div class="content">
      <h2>Información del Usuario</h2>
      <div class="info-row"><span class="label">Nombre:</span> ${userName}</div>
      <div class="info-row"><span class="label">Email:</span> ${email}</div>
      <div class="info-row"><span class="label">Teléfono:</span> ${phone}</div>

      <h2>Cambio Solicitado</h2>
      <div class="plan-box">
        <strong>Plan Actual:</strong> ${currentPlan.name}<br>
        Precio: ${currentPlan.price}€/mes<br>
        Dispositivos: ${currentPlan.devices}
      </div>
      <div class="plan-box">
        <strong>Plan Solicitado:</strong> ${requestedPlan.name}<br>
        Precio: ${requestedPlan.price}€/mes<br>
        Dispositivos: ${requestedPlan.devices}
      </div>

      ${comments ? `
      <h2>Comentarios</h2>
      <p>${comments}</p>
      ` : ''}

      <div class="footer">
        <strong>Datos Técnicos:</strong><br>
        User ID: ${userProfile.id}<br>
        Stripe Customer ID: ${userProfile.stripe_customer_id || 'N/A'}<br>
        Fecha solicitud: ${new Date().toISOString()}
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
        subject: `Solicitud de cambio de plan - ${userName}`,
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
      user_id: userProfile.id,
      email: email.toLowerCase(),
      event_type: 'plan_change_requested',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      success: true,
      metadata: { currentTier, requestedTier, phone, comments },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Solicitud enviada correctamente',
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
