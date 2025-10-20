import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Key',
};

interface CreateClientBody {
  company_name: string;
  contact_email: string;
  user_full_name: string;
  user_email: string;
  plan_name: 'monthly' | 'quarterly' | 'annual';
  price_eur: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Verificar admin key
    const adminKey = req.headers.get('X-Admin-Key');
    const ADMIN_KEY = Deno.env.get('ADMIN_KEY');

    if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: CreateClientBody = await req.json();

    const { company_name, contact_email, user_full_name, user_email, plan_name, price_eur } = body;

    // Validaciones
    if (!company_name || !contact_email || !user_full_name || !user_email || !plan_name || !price_eur) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!['monthly', 'quarterly', 'annual'].includes(plan_name)) {
      return new Response(
        JSON.stringify({ error: 'Plan inválido' }),
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

    // 1. Crear cliente
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({
        company_name,
        contact_email: contact_email.toLowerCase(),
        is_active: true,
      })
      .select()
      .single();

    if (clientError) {
      console.error('Error creating client:', clientError);
      return new Response(
        JSON.stringify({ error: 'Error al crear cliente', details: clientError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Crear usuario en auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: user_email.toLowerCase(),
      email_confirm: true,
      user_metadata: {
        full_name: user_full_name,
        client_id: client.id,
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      // Rollback: eliminar cliente
      await supabaseAdmin.from('clients').delete().eq('id', client.id);
      return new Response(
        JSON.stringify({ error: 'Error al crear usuario', details: authError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Crear registro en users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        client_id: client.id,
        email: user_email.toLowerCase(),
        full_name: user_full_name,
        role: 'owner',
        is_active: true,
      });

    if (userError) {
      console.error('Error creating user record:', userError);
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from('clients').delete().eq('id', client.id);
      return new Response(
        JSON.stringify({ error: 'Error al crear registro de usuario', details: userError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Crear suscripción
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        client_id: client.id,
        plan_name,
        price_eur,
        status: 'trialing',
        cancel_at_period_end: false,
      });

    if (subError) {
      console.error('Error creating subscription:', subError);
      // Continuar sin rollback (suscripción se puede crear después)
    }

    // 5. Crear contrato inicial
    const { error: contractError } = await supabaseAdmin
      .from('contracts')
      .insert({
        client_id: client.id,
        contract_type: 'initial',
        version: 'v1.0',
        is_active: true,
        // pdf_url se puede agregar después
      });

    if (contractError) {
      console.error('Error creating contract:', contractError);
      // Continuar sin rollback
    }

    // 6. Registrar en audit_log
    await supabaseAdmin
      .from('audit_log')
      .insert({
        client_id: client.id,
        action_type: 'client_created',
        details: {
          company_name,
          contact_email,
          user_email,
          plan_name,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cliente creado correctamente',
        client: {
          id: client.id,
          company_name: client.company_name,
          contact_email: client.contact_email,
        },
        user: {
          id: authUser.user.id,
          email: user_email,
          full_name: user_full_name,
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
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});