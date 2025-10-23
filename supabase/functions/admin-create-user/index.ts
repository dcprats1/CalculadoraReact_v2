import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserBody {
  email: string;
  tier: number;
  durationDays: number;
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callingUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .eq('id', callingUser.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.email !== 'dcprats@gmail.com') {
      console.error('Not admin:', callerProfile?.email);
      return new Response(
        JSON.stringify({ error: 'Acceso denegado. Solo administradores.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: CreateUserBody = await req.json();
    const { email, tier, durationDays } = body;

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!tier || tier < 1 || tier > 5) {
      return new Response(
        JSON.stringify({ error: 'Tier debe estar entre 1 y 5' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!durationDays || durationDays < 1) {
      return new Response(
        JSON.stringify({ error: 'Duración debe ser al menos 1 día' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: 'El usuario ya existe' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Creating auth user for: ${normalizedEmail}`);
    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
    });

    if (createAuthError || !authUser.user) {
      console.error('Error creating auth user:', createAuthError);
      return new Response(
        JSON.stringify({ error: 'Error al crear usuario en autenticación', details: createAuthError?.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const maxDevices = [1, 3, 5, 8, 12][tier - 1];

    console.log(`Creating profile for: ${normalizedEmail}`);
    const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({
      id: authUser.user.id,
      email: normalizedEmail,
      subscription_status: 'active',
      subscription_tier: tier,
      max_devices: maxDevices,
      subscription_start_date: new Date().toISOString(),
      subscription_end_date: endDate.toISOString(),
      payment_method: 'manual',
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Error al crear perfil de usuario', details: profileError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`✅ User created successfully: ${normalizedEmail}`);

    await supabaseAdmin.from('auth_logs').insert({
      user_id: authUser.user.id,
      email: normalizedEmail,
      event_type: 'user_created_by_admin',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      success: true,
      metadata: {
        created_by: callerProfile.email,
        tier,
        durationDays,
        maxDevices,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Usuario ${normalizedEmail} creado correctamente`,
        user: {
          id: authUser.user.id,
          email: normalizedEmail,
          tier,
          maxDevices,
          subscriptionEndDate: endDate.toISOString(),
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
