import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email es requerido' }),
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

    console.log(`🔍 Debugging subscription for: ${normalizedEmail}`);

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({
          error: 'Error al obtener perfil',
          details: profileError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!userProfile) {
      return new Response(
        JSON.stringify({
          found: false,
          message: 'No se encontró perfil de usuario',
          email: normalizedEmail,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.listUsers();
    const foundAuthUser = authUser.users.find(u => u.email?.toLowerCase() === normalizedEmail);

    const { data: recentLogs } = await supabaseAdmin
      .from('auth_logs')
      .select('*')
      .eq('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: webhookLogs } = await supabaseAdmin
      .from('auth_logs')
      .select('*')
      .eq('email', normalizedEmail)
      .like('action', 'stripe_webhook%')
      .order('created_at', { ascending: false })
      .limit(5);

    const diagnostics = {
      found: true,
      timestamp: new Date().toISOString(),
      userProfile: {
        id: userProfile.id,
        email: userProfile.email,
        subscription_status: userProfile.subscription_status,
        subscription_tier: userProfile.subscription_tier,
        max_devices: userProfile.max_devices,
        subscription_start_date: userProfile.subscription_start_date,
        subscription_end_date: userProfile.subscription_end_date,
        stripe_customer_id: userProfile.stripe_customer_id,
        stripe_subscription_id: userProfile.stripe_subscription_id,
        payment_method: userProfile.payment_method,
        created_at: userProfile.created_at,
        updated_at: userProfile.updated_at,
      },
      authUser: foundAuthUser ? {
        id: foundAuthUser.id,
        email: foundAuthUser.email,
        created_at: foundAuthUser.created_at,
        last_sign_in_at: foundAuthUser.last_sign_in_at,
      } : null,
      recentActivity: recentLogs || [],
      webhookEvents: webhookLogs || [],
      issues: [] as string[],
    };

    if (userProfile.subscription_status !== 'active') {
      diagnostics.issues.push(`Estado de suscripción no activo: ${userProfile.subscription_status}`);
    }

    if (!userProfile.stripe_customer_id) {
      diagnostics.issues.push('No tiene stripe_customer_id');
    }

    if (!userProfile.stripe_subscription_id) {
      diagnostics.issues.push('No tiene stripe_subscription_id');
    }

    if (userProfile.subscription_end_date) {
      const endDate = new Date(userProfile.subscription_end_date);
      if (endDate < new Date()) {
        diagnostics.issues.push('Suscripción expirada');
      }
    }

    console.log('Diagnostics:', diagnostics);

    return new Response(
      JSON.stringify(diagnostics),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in debug-subscription-status:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});