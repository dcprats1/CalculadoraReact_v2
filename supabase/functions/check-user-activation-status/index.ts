import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestQuery {
  email: string;
  session_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    const sessionId = url.searchParams.get('session_id');

    if (!email) {
      return new Response(
        JSON.stringify({
          error: 'Email requerido',
          status: 'error'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    console.log(`[check-user-activation-status] Checking activation for: ${normalizedEmail}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userProfile, error: selectError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, subscription_status, subscription_tier, max_devices, stripe_customer_id, stripe_subscription_id, subscription_end_date, created_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (selectError) {
      console.error('[check-user-activation-status] Database error:', selectError);

      await supabaseAdmin.from('auth_logs').insert({
        email: normalizedEmail,
        event_type: 'activation_check_error',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        success: false,
        error_message: selectError.message,
        metadata: { session_id: sessionId },
      });

      return new Response(
        JSON.stringify({
          error: 'Error al verificar usuario',
          status: 'error',
          details: selectError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!userProfile) {
      console.log(`[check-user-activation-status] User not found yet: ${normalizedEmail}`);

      await supabaseAdmin.from('auth_logs').insert({
        email: normalizedEmail,
        event_type: 'activation_check_pending',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        success: true,
        metadata: {
          status: 'pending',
          session_id: sessionId
        },
      });

      return new Response(
        JSON.stringify({
          status: 'pending',
          message: 'Usuario aún no activado. El webhook de Stripe está procesando tu pago.',
          email: normalizedEmail
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const isActive = userProfile.subscription_status === 'active' || userProfile.subscription_status === 'trial';
    const hasStripeData = !!userProfile.stripe_customer_id && !!userProfile.stripe_subscription_id;

    if (isActive && hasStripeData) {
      console.log(`[check-user-activation-status] ✅ User fully activated: ${normalizedEmail}`);

      await supabaseAdmin.from('auth_logs').insert({
        user_id: userProfile.id,
        email: normalizedEmail,
        event_type: 'activation_check_success',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        success: true,
        metadata: {
          status: 'active',
          tier: userProfile.subscription_tier,
          max_devices: userProfile.max_devices,
          session_id: sessionId,
          activation_time_seconds: Math.floor((new Date().getTime() - new Date(userProfile.created_at).getTime()) / 1000)
        },
      });

      return new Response(
        JSON.stringify({
          status: 'active',
          message: 'Usuario activado correctamente',
          user: {
            id: userProfile.id,
            email: userProfile.email,
            subscription_status: userProfile.subscription_status,
            subscription_tier: userProfile.subscription_tier,
            max_devices: userProfile.max_devices,
            subscription_end_date: userProfile.subscription_end_date,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[check-user-activation-status] ⚠️ User exists but not fully activated: ${normalizedEmail}`, {
      subscription_status: userProfile.subscription_status,
      has_stripe_customer: !!userProfile.stripe_customer_id,
      has_stripe_subscription: !!userProfile.stripe_subscription_id,
    });

    await supabaseAdmin.from('auth_logs').insert({
      user_id: userProfile.id,
      email: normalizedEmail,
      event_type: 'activation_check_incomplete',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      success: true,
      metadata: {
        status: 'incomplete',
        subscription_status: userProfile.subscription_status,
        has_stripe_data: hasStripeData,
        session_id: sessionId
      },
    });

    return new Response(
      JSON.stringify({
        status: 'pending',
        message: 'Usuario encontrado pero aún procesando datos de suscripción',
        email: normalizedEmail,
        details: {
          subscription_status: userProfile.subscription_status,
          has_stripe_data: hasStripeData,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[check-user-activation-status] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        status: 'error',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});