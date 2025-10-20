import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  email: string;
}

const ALLOWED_DOMAIN = '@gls-spain.es';
const ADMIN_EMAIL = 'dcprats@gmail.com';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email }: RequestBody = await req.json();

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validar dominio @gls-spain.es (excepto admin)
    if (normalizedEmail !== ADMIN_EMAIL && !normalizedEmail.endsWith(ALLOWED_DOMAIN)) {
      return new Response(
        JSON.stringify({ error: 'Solo usuarios @gls-spain.es pueden acceder' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar/crear usuario en auth.users y user_profiles
    let userId: string;
    let userProfile;

    // Primero intentar encontrar el usuario en user_profiles
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, subscription_status, subscription_end_date')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking user:', profileError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar usuario' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (existingProfile) {
      userId = existingProfile.id;
      userProfile = existingProfile;
    } else {
      // Si no existe, crear usuario en auth.users (sin password, solo email)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        console.error('Error creating auth user:', authError);
        return new Response(
          JSON.stringify({ error: 'Error al crear usuario' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      userId = authData.user.id;

      // Crear perfil en user_profiles con trial de 7 días
      const { data: newProfile, error: insertProfileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          email: normalizedEmail,
          subscription_status: 'trial',
          subscription_tier: 1,
          max_devices: 1,
          payment_method: 'trial',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (insertProfileError || !newProfile) {
        console.error('Error creating user profile:', insertProfileError);
        return new Response(
          JSON.stringify({ error: 'Error al crear perfil de usuario' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      userProfile = newProfile;
    }

    // Log event: code_sent
    await supabaseAdmin.from('auth_logs').insert({
      user_id: userId,
      email: normalizedEmail,
      event_type: 'code_sent',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      success: true,
    });

    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Guardar código en la base de datos (expira en 5 minutos)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Error inserting code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error al generar código' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Enviar email con Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      // En desarrollo, devolvemos el código en la respuesta
      if (Deno.env.get('ENVIRONMENT') === 'development') {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Código enviado (DEV MODE)',
            code,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

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
        to: [normalizedEmail],
        subject: 'Tu código de acceso - Calculadora de Tarifas',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .code { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; letter-spacing: 8px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Calculadora de Tarifas</h1>
              </div>
              <div class="content">
                <p>Hola,</p>
                <p>Tu código de acceso es:</p>
                <div class="code">${code}</div>
                <p><strong>Este código expira en 5 minutos.</strong></p>
                <p>Si no has solicitado este código, puedes ignorar este email.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Lógica Logística. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `,
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Código enviado correctamente',
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