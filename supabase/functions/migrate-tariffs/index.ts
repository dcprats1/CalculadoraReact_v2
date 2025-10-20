import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    // External Supabase credentials from request
    const { externalUrl, externalKey } = await req.json();

    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({ error: 'Missing external Supabase credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client for external Supabase
    const externalClient = createClient(externalUrl, externalKey);

    // Create client for Bolt Database (local)
    const localClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all tariffs from external Supabase
    const { data: tariffs, error: fetchError } = await externalClient
      .from('tariffs')
      .select('*');

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tariffs', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tariffs || tariffs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tariffs found in external database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert all tariffs into Bolt Database
    const { data: inserted, error: insertError } = await localClient
      .from('tariffs')
      .insert(tariffs)
      .select();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to insert tariffs', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully migrated ${tariffs.length} tariffs`,
        count: inserted?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});