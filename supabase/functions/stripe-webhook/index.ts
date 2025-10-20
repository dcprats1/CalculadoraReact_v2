import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@14.10.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
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
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error('Stripe keys not configured');
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

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
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

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const email = session.customer_email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const tier = session.metadata?.tier ? parseInt(session.metadata.tier) : 1;
        const maxDevices = TIER_TO_DEVICES[tier] || 1;

        if (!email) {
          console.error('No email in checkout session');
          break;
        }

        const normalizedEmail = email.toLowerCase().trim();

        const { data: existingProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (existingProfile) {
          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_status: 'active',
              subscription_tier: tier,
              max_devices: maxDevices,
              subscription_start_date: new Date().toISOString(),
              subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              payment_method: 'stripe',
            })
            .eq('id', existingProfile.id);
        } else {
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            email_confirm: true,
          });

          if (authError || !authUser.user) {
            console.error('Error creating auth user:', authError);
            break;
          }

          await supabaseAdmin.from('user_profiles').insert({
            id: authUser.user.id,
            email: normalizedEmail,
            subscription_status: 'active',
            subscription_tier: tier,
            max_devices: maxDevices,
            subscription_start_date: new Date().toISOString(),
            subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            payment_method: 'stripe',
          });
        }

        console.log(`Subscription activated for ${normalizedEmail} - Tier ${tier}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (userProfile) {
          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', userProfile.id);

          console.log(`Payment succeeded for ${userProfile.email} - Extended 30 days`);
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (userProfile) {
          await supabaseAdmin
            .from('user_profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', userProfile.id);

          console.log(`Payment failed for ${userProfile.email}`);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        await supabaseAdmin
          .from('user_profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('stripe_subscription_id', subscriptionId);

        console.log(`Subscription cancelled: ${subscriptionId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const tier = subscription.metadata?.tier ? parseInt(subscription.metadata.tier) : null;

        if (tier && TIER_TO_DEVICES[tier]) {
          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_tier: tier,
              max_devices: TIER_TO_DEVICES[tier],
            })
            .eq('stripe_subscription_id', subscriptionId);

          console.log(`Subscription updated: ${subscriptionId} - Tier ${tier}`);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
