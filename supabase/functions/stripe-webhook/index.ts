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

async function logToAuthLogs(
  supabaseAdmin: any,
  action: string,
  email: string,
  details: any,
  success: boolean
) {
  try {
    await supabaseAdmin.from('auth_logs').insert({
      action,
      email,
      ip_address: 'webhook',
      user_agent: 'stripe-webhook',
      success,
      error_message: details.error || null,
      metadata: details,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log to auth_logs:', err);
  }
}

async function updateUserProfileWithRetry(
  supabaseAdmin: any,
  profileId: string,
  updateData: any,
  email: string,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Attempt ${attempt}/${maxRetries}] Updating profile for ${email}`);

    const { data: beforeUpdate } = await supabaseAdmin
      .from('user_profiles')
      .select('subscription_status, stripe_customer_id, stripe_subscription_id')
      .eq('id', profileId)
      .maybeSingle();

    console.log('Before update:', beforeUpdate);

    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', profileId)
      .select();

    if (updateError) {
      console.error(`[Attempt ${attempt}] Update error:`, updateError);

      await logToAuthLogs(supabaseAdmin, 'stripe_webhook_update_failed', email, {
        attempt,
        error: updateError.message,
        profileId,
        updateData,
      }, false);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      return false;
    }

    const { data: afterUpdate } = await supabaseAdmin
      .from('user_profiles')
      .select('subscription_status, stripe_customer_id, stripe_subscription_id, subscription_tier, max_devices')
      .eq('id', profileId)
      .maybeSingle();

    console.log('After update:', afterUpdate);

    if (afterUpdate?.subscription_status === 'active' &&
        afterUpdate?.stripe_customer_id &&
        afterUpdate?.stripe_subscription_id) {
      console.log(`✅ Profile successfully updated for ${email}`);

      await logToAuthLogs(supabaseAdmin, 'stripe_webhook_update_success', email, {
        attempt,
        before: beforeUpdate,
        after: afterUpdate,
        updateData,
      }, true);

      return true;
    } else {
      console.error(`❌ Verification failed after update for ${email}`, {
        expected: 'active',
        actual: afterUpdate?.subscription_status,
        hasCustomerId: !!afterUpdate?.stripe_customer_id,
        hasSubscriptionId: !!afterUpdate?.stripe_subscription_id,
      });

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
    }
  }

  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const requestStartTime = new Date().toISOString();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔔 WEBHOOK RECEIVED at ${requestStartTime}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error('❌ Stripe keys not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe no configurado' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Stripe keys configured');

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ No signature in request');
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
      console.log('✅ Webhook signature verified');
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
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

    console.log(`\n📦 Processing Stripe event: ${event.type}`);
    console.log(`📦 Event ID: ${event.id}`);
    console.log(`📦 Created: ${new Date(event.created * 1000).toISOString()}\n`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        let email = session.customer_email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const tier = session.metadata?.tier ? parseInt(session.metadata.tier) : 1;
        const paymentType = session.metadata?.payment_type || 'monthly';
        const maxDevices = TIER_TO_DEVICES[tier] || 1;

        console.log('📋 Checkout session data:', {
          sessionId: session.id,
          email,
          customerId,
          subscriptionId,
          tier,
          paymentType,
          maxDevices,
          paymentStatus: session.payment_status,
          mode: session.mode,
        });

        if (!email && customerId) {
          console.log('⚠️  No email in session, fetching from Stripe customer...');
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if ('email' in customer && customer.email) {
              email = customer.email;
              console.log(`✅ Retrieved email from customer: ${email}`);
            }
          } catch (err) {
            console.error('Failed to retrieve customer email:', err);
          }
        }

        if (!email) {
          console.error('❌ No email available in checkout session or customer');
          await logToAuthLogs(supabaseAdmin, 'stripe_webhook_no_email', 'unknown', {
            sessionId: session.id,
            customerId,
            error: 'No email available',
          }, false);
          break;
        }

        const normalizedEmail = email.toLowerCase().trim();
        console.log(`🔍 Looking up user profile for: ${normalizedEmail}`);

        const daysToAdd = paymentType === 'annual' ? 365 : 30;
        const subscriptionEndDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

        const { data: existingProfile, error: selectError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, email, subscription_status, stripe_customer_id, stripe_subscription_id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (selectError) {
          console.error('❌ Error looking up profile:', selectError);
          await logToAuthLogs(supabaseAdmin, 'stripe_webhook_lookup_error', normalizedEmail, {
            error: selectError.message,
            sessionId: session.id,
          }, false);
          throw new Error(`Failed to lookup profile: ${selectError.message}`);
        }

        console.log(`Profile lookup result:`, existingProfile ? {
          found: true,
          id: existingProfile.id,
          currentStatus: existingProfile.subscription_status,
          hasStripeCustomerId: !!existingProfile.stripe_customer_id,
          hasStripeSubscriptionId: !!existingProfile.stripe_subscription_id,
        } : { found: false });

        if (existingProfile) {
          const updateData = {
            subscription_status: 'active',
            subscription_tier: tier,
            max_devices: maxDevices,
            subscription_start_date: new Date().toISOString(),
            subscription_end_date: subscriptionEndDate,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            payment_method: 'stripe',
          };

          console.log('📝 Updating existing profile with data:', updateData);

          const success = await updateUserProfileWithRetry(
            supabaseAdmin,
            existingProfile.id,
            updateData,
            normalizedEmail
          );

          if (!success) {
            console.error('❌ Failed to update profile after all retries');
            throw new Error(`Failed to update profile for ${normalizedEmail} after retries`);
          }

          console.log(`✅ Profile updated successfully for ${normalizedEmail}`);
        } else {
          console.log('👤 No existing profile, checking auth.users...');

          const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
          const authUser = existingAuthUser.users.find(u => u.email?.toLowerCase() === normalizedEmail);

          let userId: string;

          if (authUser) {
            userId = authUser.id;
            console.log(`✅ Found existing auth user: ${userId}`);
          } else {
            console.log('👤 Creating new auth user...');
            const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
              email: normalizedEmail,
              email_confirm: true,
            });

            if (authError || !newAuthUser.user) {
              console.error('❌ Error creating auth user:', authError);
              await logToAuthLogs(supabaseAdmin, 'stripe_webhook_auth_create_failed', normalizedEmail, {
                error: authError?.message,
                sessionId: session.id,
              }, false);
              throw new Error(`Failed to create auth user: ${authError?.message}`);
            }

            userId = newAuthUser.user.id;
            console.log(`✅ Created new auth user: ${userId}`);
          }

          console.log('📝 Inserting new profile...');
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
            console.error('❌ Error inserting profile:', insertError);
            await logToAuthLogs(supabaseAdmin, 'stripe_webhook_insert_failed', normalizedEmail, {
              error: insertError.message,
              userId,
              sessionId: session.id,
            }, false);
            throw new Error(`Failed to insert profile: ${insertError.message}`);
          }

          console.log(`✅ Profile created successfully for ${normalizedEmail}`);

          await logToAuthLogs(supabaseAdmin, 'stripe_webhook_profile_created', normalizedEmail, {
            userId,
            tier,
            paymentType,
            sessionId: session.id,
          }, true);
        }

        console.log(`\n${'🎉'.repeat(40)}`);
        console.log(`✅ Subscription activated for ${normalizedEmail} - Tier ${tier} (${paymentType})`);
        console.log(`${'🎉'.repeat(40)}\n`);

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionObj = invoice.subscription;

        console.log('💳 Invoice payment succeeded:', {
          invoiceId: invoice.id,
          customerId,
          subscriptionId: subscriptionObj,
          amountPaid: invoice.amount_paid,
        });

        if (subscriptionObj) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionObj as string);
          const interval = subscription.items.data[0]?.plan.interval;
          const daysToAdd = interval === 'year' ? 365 : 30;

          console.log(`🔍 Looking up user by stripe_customer_id: ${customerId}`);

          const { data: userProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('id, email, subscription_status')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (userProfile) {
            console.log(`Found profile for customer ${customerId}: ${userProfile.email}`);

            const updateData = {
              subscription_status: 'active',
              subscription_end_date: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString(),
            };

            const success = await updateUserProfileWithRetry(
              supabaseAdmin,
              userProfile.id,
              updateData,
              userProfile.email
            );

            if (success) {
              console.log(`✅ Payment succeeded for ${userProfile.email} - Extended ${daysToAdd} days`);
            } else {
              console.error(`❌ Failed to update profile for ${userProfile.email}`);
            }
          } else {
            console.error(`❌ No user profile found for customer ${customerId}`);
            await logToAuthLogs(supabaseAdmin, 'stripe_webhook_customer_not_found', 'unknown', {
              customerId,
              invoiceId: invoice.id,
            }, false);
          }
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        console.log('❌ Invoice payment failed:', {
          invoiceId: invoice.id,
          customerId,
        });

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

          console.log(`⚠️  Payment failed for ${userProfile.email} - Status set to past_due`);

          await logToAuthLogs(supabaseAdmin, 'stripe_payment_failed', userProfile.email, {
            invoiceId: invoice.id,
          }, true);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        console.log('🗑️  Subscription deleted:', subscriptionId);

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

        console.log('🔄 Subscription updated:', {
          subscriptionId,
          tier,
          status: subscription.status,
        });

        if (tier && TIER_TO_DEVICES[tier]) {
          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_tier: tier,
              max_devices: TIER_TO_DEVICES[tier],
            })
            .eq('stripe_subscription_id', subscriptionId);

          console.log(`✅ Subscription updated: ${subscriptionId} - Tier ${tier}`);
        }

        break;
      }

      default:
        console.log(`⚠️  Unhandled event type: ${event.type}`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ WEBHOOK PROCESSING COMPLETED`);
    console.log(`${'='.repeat(80)}\n`);

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('\n❌ WEBHOOK ERROR:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.log(`\n${'='.repeat(80)}\n`);

    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});