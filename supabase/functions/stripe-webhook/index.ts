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
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
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
        const paymentType = session.metadata?.payment_type || 'monthly';
        const maxDevices = TIER_TO_DEVICES[tier] || 1;

        console.log('Checkout session data:', {
          email,
          customerId,
          subscriptionId,
          tier,
          paymentType,
          maxDevices
        });

        if (!email) {
          console.error('No email in checkout session');
          break;
        }

        const normalizedEmail = email.toLowerCase().trim();

        const daysToAdd = paymentType === 'annual' ? 365 : 30;
        const subscriptionEndDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

        const { data: existingProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        console.log(`Profile lookup for ${normalizedEmail}:`, existingProfile ? 'Found' : 'Not found');

        if (existingProfile) {
          const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_status: 'active',
              subscription_tier: tier,
              max_devices: maxDevices,
              subscription_start_date: new Date().toISOString(),
              subscription_end_date: subscriptionEndDate,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              payment_method: 'stripe',
            })
            .eq('id', existingProfile.id);

          if (updateError) {
            console.error('Error updating profile:', updateError);
            throw new Error(`Failed to update profile: ${updateError.message}`);
          }

          console.log(`Profile updated successfully for ${normalizedEmail}`);
        } else {
          // Check if user exists in auth.users
          const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
          const authUser = existingAuthUser.users.find(u => u.email?.toLowerCase() === normalizedEmail);

          let userId: string;

          if (authUser) {
            // Usuario existe en auth pero no en user_profiles
            userId = authUser.id;
            console.log(`Using existing auth user: ${userId} for ${normalizedEmail}`);
          } else {
            // Crear nuevo usuario
            const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
              email: normalizedEmail,
              email_confirm: true,
            });

            if (authError || !newAuthUser.user) {
              console.error('Error creating auth user:', authError);
              throw new Error(`Failed to create auth user: ${authError?.message}`);
            }

            userId = newAuthUser.user.id;
            console.log(`Created new auth user: ${userId} for ${normalizedEmail}`);
          }

          // Insertar perfil
          const { error: insertError } = await supabaseAdmin.from('user_profiles').insert({
            id: userId,
            email: normalizedEmail,
            subscription_status: 'active',
            subscription_tier: tier,
            max_devices: maxDevices,
            subscription_start_date: new Date().toISOString(),
            subscription_end_date: subscriptionEndDate,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            payment_method: 'stripe',
          });

          if (insertError) {
            console.error('Error inserting profile:', insertError);
            throw new Error(`Failed to insert profile: ${insertError.message}`);
          }

          console.log(`Profile created successfully for ${normalizedEmail}`);
        }

        console.log(`Subscription activated for ${normalizedEmail} - Tier ${tier} (${paymentType})`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionObj = invoice.subscription;

        if (subscriptionObj) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionObj as string);
          const interval = subscription.items.data[0]?.plan.interval;
          const daysToAdd = interval === 'year' ? 365 : 30;

          const { data: userProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('id, email')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (userProfile) {
            await supabaseAdmin
              .from('user_profiles')
              .update({
                subscription_status: 'active',
                subscription_end_date: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString(),
              })
              .eq('id', userProfile.id);

            console.log(`Payment succeeded for ${userProfile.email} - Extended ${daysToAdd} days`);
          }
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
