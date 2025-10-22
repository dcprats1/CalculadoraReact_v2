import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@14.10.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  tier: number;
  paymentType: 'monthly' | 'annual';
  userId?: string;
  email?: string;
}

const TIER_TO_DEVICES: Record<number, number> = {
  1: 1,
  2: 3,
  3: 5,
  4: 8,
};

const PLAN_NAMES: Record<number, string> = {
  1: 'Plan Básico',
  2: 'Plan Profesional',
  3: 'Plan Empresa',
  4: 'Plan Corporativo',
};

const MONTHLY_PRICES: Record<number, number> = {
  1: 90,
  2: 180,
  3: 270,
  4: 315,
};

const ANNUAL_PRICES: Record<number, number> = {
  1: 990,
  2: 1890,
  3: 2700,
  4: 3150,
};

const ALLOWED_DOMAIN = '@gls-spain.es';
const ADMIN_EMAIL = 'dcprats@gmail.com';
const TEST_USER_EMAIL = 'damaso.prats@logicalogistica.com';
const ALLOWED_EXCEPTIONS = [ADMIN_EMAIL, TEST_USER_EMAIL];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { tier, paymentType, userId, email }: RequestBody = await req.json();

    if (!tier || !paymentType) {
      return new Response(
        JSON.stringify({ error: 'Tier y tipo de pago requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!TIER_TO_DEVICES[tier]) {
      return new Response(
        JSON.stringify({ error: 'Tier inválido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!email) {
      console.error('No email provided in request');
      return new Response(
        JSON.stringify({
          error: 'Email requerido. Por favor, introduce tu email corporativo.'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    console.log(`Processing checkout for email: ${normalizedEmail}`);

    const isAllowed = ALLOWED_EXCEPTIONS.includes(normalizedEmail) || normalizedEmail.endsWith(ALLOWED_DOMAIN);

    if (!isAllowed) {
      console.error(`Email ${normalizedEmail} not authorized (must be @gls-spain.es)`);
      return new Response(
        JSON.stringify({
          error: `Solo usuarios @gls-spain.es pueden suscribirse. Email recibido: ${normalizedEmail}`
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured');
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

    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, stripe_customer_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    let customerId = userProfile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: normalizedEmail,
        metadata: {
          user_id: userId || '',
          tier: tier.toString(),
        },
      });
      customerId = customer.id;
      console.log(`Created new Stripe customer: ${customerId} for ${normalizedEmail}`);
    } else {
      console.log(`Using existing Stripe customer: ${customerId} for ${normalizedEmail}`);
    }

    const maxDevices = TIER_TO_DEVICES[tier];
    const planName = PLAN_NAMES[tier];
    const price = paymentType === 'annual' ? ANNUAL_PRICES[tier] : MONTHLY_PRICES[tier];

    const priceInCents = Math.round(price * 100);

    const mode: 'subscription' | 'payment' = 'subscription';
    const interval = paymentType === 'annual' ? 'year' : 'month';

    const origin = req.headers.get('origin') || 'https://yourapp.com';
    const basePath = '/area-privada2/calculadora';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planName,
              description: `${maxDevices} ${maxDevices === 1 ? 'dispositivo' : 'dispositivos'} simultáneos`,
              metadata: {
                tier: tier.toString(),
                max_devices: maxDevices.toString(),
                payment_type: paymentType,
              },
            },
            unit_amount: priceInCents,
            recurring: {
              interval: interval,
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tier: tier.toString(),
        max_devices: maxDevices.toString(),
        user_id: userId || '',
        email: normalizedEmail,
        payment_type: paymentType,
      },
      success_url: `${origin}${basePath}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${basePath}/pricing?cancelled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    console.log(`Created checkout session: ${session.id} for ${normalizedEmail}`);

    await supabaseAdmin.from('auth_logs').insert({
      user_id: userProfile?.id,
      email: normalizedEmail,
      event_type: 'checkout_session_created',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      success: true,
      metadata: {
        tier,
        payment_type: paymentType,
        session_id: session.id,
        customer_id: customerId,
      },
    });

    return new Response(
      JSON.stringify({
        checkoutUrl: session.url,
        sessionId: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al crear sesión de pago',
        details: error instanceof Error ? error.message : 'Error desconocido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});