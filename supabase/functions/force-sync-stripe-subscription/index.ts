import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@14.10.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const TIER_TO_DEVICES: Record<number, number> = {
  1: 1,
  2: 3,
  3: 5,
  4: 8,
  5: 12,
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, sessionId } = await req.json();

    if (!email && !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Se requiere email o sessionId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripe no configurado' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let normalizedEmail: string | null = null;
    let stripeCustomerId: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let tier = 1;
    let paymentType = 'monthly';

    if (sessionId) {
      console.log(`🔍 Fetching Stripe session: ${sessionId}`);

      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        normalizedEmail = session.customer_email?.toLowerCase().trim() || null;
        stripeCustomerId = session.customer as string;
        stripeSubscriptionId = session.subscription as string;
        tier = session.metadata?.tier ? parseInt(session.metadata.tier) : 1;
        paymentType = session.metadata?.payment_type || 'monthly';

        console.log('Session data:', {
          email: normalizedEmail,
          customerId: stripeCustomerId,
          subscriptionId: stripeSubscriptionId,
          tier,
          paymentType,
          paymentStatus: session.payment_status,
        });

        if (!normalizedEmail && stripeCustomerId) {
          const customer = await stripe.customers.retrieve(stripeCustomerId);
          if ('email' in customer && customer.email) {
            normalizedEmail = customer.email.toLowerCase().trim();
          }
        }
      } catch (err) {
        console.error('Error fetching Stripe session:', err);
        return new Response(
          JSON.stringify({
            error: 'No se pudo obtener información de Stripe',
            details: err instanceof Error ? err.message : String(err),
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else if (email) {
      normalizedEmail = email.toLowerCase().trim();
    }

    if (!normalizedEmail) {
      return new Response(
        JSON.stringify({ error: 'No se pudo determinar el email del usuario' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`🔍 Looking up user profile for: ${normalizedEmail}`);

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
          error: 'No se encontró perfil de usuario',
          email: normalizedEmail,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Current profile state:', {
      subscription_status: userProfile.subscription_status,
      stripe_customer_id: userProfile.stripe_customer_id,
      stripe_subscription_id: userProfile.stripe_subscription_id,
    });

    if (!stripeCustomerId && userProfile.stripe_customer_id) {
      stripeCustomerId = userProfile.stripe_customer_id;
    }

    if (!stripeSubscriptionId && userProfile.stripe_subscription_id) {
      stripeSubscriptionId = userProfile.stripe_subscription_id;
    }

    let stripeSubscriptionStatus = null;
    if (stripeSubscriptionId) {
      try {
        console.log(`🔍 Fetching Stripe subscription: ${stripeSubscriptionId}`);
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        stripeSubscriptionStatus = subscription.status;

        if (subscription.metadata?.tier) {
          tier = parseInt(subscription.metadata.tier);
        }

        const interval = subscription.items.data[0]?.plan.interval;
        paymentType = interval === 'year' ? 'annual' : 'monthly';

        console.log('Stripe subscription data:', {
          status: stripeSubscriptionStatus,
          tier,
          interval,
        });
      } catch (err) {
        console.error('Error fetching Stripe subscription:', err);
      }
    }

    const daysToAdd = paymentType === 'annual' ? 365 : 30;
    const subscriptionEndDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
    const maxDevices = TIER_TO_DEVICES[tier] || 1;

    const shouldBeActive = stripeSubscriptionStatus === 'active' || stripeSubscriptionStatus === 'trialing';

    const updateData: any = {
      subscription_tier: tier,
      max_devices: maxDevices,
      payment_method: 'stripe',
    };

    if (stripeCustomerId) {
      updateData.stripe_customer_id = stripeCustomerId;
    }

    if (stripeSubscriptionId) {
      updateData.stripe_subscription_id = stripeSubscriptionId;
    }

    if (shouldBeActive) {
      updateData.subscription_status = 'active';
      updateData.subscription_start_date = new Date().toISOString();
      updateData.subscription_end_date = subscriptionEndDate;
    }

    console.log('📝 Updating profile with:', updateData);

    const { data: beforeUpdate } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userProfile.id)
      .maybeSingle();

    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', userProfile.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({
          error: 'Error al actualizar perfil',
          details: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: afterUpdate } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userProfile.id)
      .maybeSingle();

    await supabaseAdmin.from('auth_logs').insert({
      event_type: 'force_sync_stripe_subscription',
      email: normalizedEmail,
      ip_address: 'manual-sync',
      user_agent: 'force-sync-function',
      success: true,
      metadata: {
        sessionId,
        stripeSubscriptionStatus,
        before: beforeUpdate,
        after: afterUpdate,
        updateData,
      },
      created_at: new Date().toISOString(),
    });

    console.log('✅ Profile synchronized successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Perfil sincronizado exitosamente',
        email: normalizedEmail,
        stripeData: {
          customerId: stripeCustomerId,
          subscriptionId: stripeSubscriptionId,
          subscriptionStatus: stripeSubscriptionStatus,
        },
        before: beforeUpdate,
        after: afterUpdate,
        changes: updateData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in force-sync-stripe-subscription:', error);
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