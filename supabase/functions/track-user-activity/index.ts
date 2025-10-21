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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { user_id, activity_type } = await req.json();

    if (!user_id || !activity_type) {
      return new Response(
        JSON.stringify({ error: 'user_id y activity_type son requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const validActivityTypes = ['calculation', 'sop_download', 'minisop_download'];
    if (!validActivityTypes.includes(activity_type)) {
      return new Response(
        JSON.stringify({ error: 'activity_type no válido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: existingStats, error: statsCheckError } = await supabaseClient
      .from('user_activity_stats')
      .select('user_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (statsCheckError && statsCheckError.code !== 'PGRST116') {
      console.error('Error checking stats:', statsCheckError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar estadísticas' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!existingStats) {
      const { error: insertError } = await supabaseClient
        .from('user_activity_stats')
        .insert({
          user_id,
          sop_downloads_count: activity_type === 'sop_download' ? 1 : 0,
          minisop_downloads_count: activity_type === 'minisop_download' ? 1 : 0,
          package_calculations_count: activity_type === 'calculation' ? 1 : 0,
          first_activity_date: new Date().toISOString(),
          last_activity_date: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error inserting stats:', insertError);
        return new Response(
          JSON.stringify({ error: 'Error al crear estadísticas' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      let updateData: any = {
        last_activity_date: new Date().toISOString(),
      };

      if (activity_type === 'sop_download') {
        const { data } = await supabaseClient
          .from('user_activity_stats')
          .select('sop_downloads_count')
          .eq('user_id', user_id)
          .single();
        updateData.sop_downloads_count = (data?.sop_downloads_count || 0) + 1;
      } else if (activity_type === 'minisop_download') {
        const { data } = await supabaseClient
          .from('user_activity_stats')
          .select('minisop_downloads_count')
          .eq('user_id', user_id)
          .single();
        updateData.minisop_downloads_count = (data?.minisop_downloads_count || 0) + 1;
      } else if (activity_type === 'calculation') {
        const { data } = await supabaseClient
          .from('user_activity_stats')
          .select('package_calculations_count')
          .eq('user_id', user_id)
          .single();
        updateData.package_calculations_count = (data?.package_calculations_count || 0) + 1;
      }

      const { error: updateError } = await supabaseClient
        .from('user_activity_stats')
        .update(updateData)
        .eq('user_id', user_id);

      if (updateError) {
        console.error('Error updating stats:', updateError);
        return new Response(
          JSON.stringify({ error: 'Error al actualizar estadísticas' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const { data: dailyActivity, error: dailyCheckError } = await supabaseClient
      .from('user_daily_activity')
      .select('*')
      .eq('user_id', user_id)
      .eq('activity_date', today)
      .maybeSingle();

    if (dailyCheckError && dailyCheckError.code !== 'PGRST116') {
      console.error('Error checking daily activity:', dailyCheckError);
    }

    if (!dailyActivity) {
      const insertData: any = {
        user_id,
        activity_date: today,
        login_count: 0,
        calculation_count: activity_type === 'calculation' ? 1 : 0,
        sop_count: activity_type === 'sop_download' ? 1 : 0,
        minisop_count: activity_type === 'minisop_download' ? 1 : 0,
      };

      const { error: dailyInsertError } = await supabaseClient
        .from('user_daily_activity')
        .insert(insertData);

      if (dailyInsertError) {
        console.error('Error inserting daily activity:', dailyInsertError);
      }
    } else {
      const updateData: any = {};

      if (activity_type === 'calculation') {
        updateData.calculation_count = (dailyActivity.calculation_count || 0) + 1;
      } else if (activity_type === 'sop_download') {
        updateData.sop_count = (dailyActivity.sop_count || 0) + 1;
      } else if (activity_type === 'minisop_download') {
        updateData.minisop_count = (dailyActivity.minisop_count || 0) + 1;
      }

      const { error: dailyUpdateError } = await supabaseClient
        .from('user_daily_activity')
        .update(updateData)
        .eq('user_id', user_id)
        .eq('activity_date', today);

      if (dailyUpdateError) {
        console.error('Error updating daily activity:', dailyUpdateError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Actividad registrada' }),
      {
        status: 200,
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
