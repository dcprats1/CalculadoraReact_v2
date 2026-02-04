import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TARIFFS_DATA = [
  { country: 'Alemania', ranges: [[0,1,6.522],[1,2,6.75],[2,3,7.062],[3,4,7.518],[4,5,7.98],[5,7,9.648],[7,10,11.382],[10,15,13.758],[15,20,15.198],[20,25,17.052],[25,30,20.022],[30,35,22.998],[35,40,25.062],[40,null,0.63]] },
  { country: 'Austria', ranges: [[0,1,7.05],[1,2,7.278],[2,3,7.608],[3,4,8.892],[4,5,10.158],[5,7,11.178],[7,10,13.23],[10,15,14.91],[15,20,16.14],[20,25,19.32],[25,30,22.758],[30,35,26.202],[35,40,28.26],[40,null,0.708]] },
  { country: 'Belgica', ranges: [[0,1,7.05],[1,2,7.278],[2,3,7.608],[3,4,8.358],[4,5,9.12],[5,7,9.87],[7,10,11.988],[10,15,13.878],[15,20,15.072],[20,25,18.39],[25,30,19.632],[30,35,20.868],[35,40,22.932],[40,null,0.582]] },
  { country: 'Bulgaria', ranges: [[0,1,14.58],[1,2,15.072],[2,3,15.708],[3,4,17.61],[4,5,19.518],[5,7,20.61],[7,10,25.122],[10,15,28.452],[15,20,31.89],[20,25,40.422],[25,30,44.718],[30,35,49.032],[35,40,51.09],[40,null,1.278]] },
  { country: 'Chipre', ranges: [[0,1,16.998],[1,2,21.12],[2,3,26.268],[3,4,31.932],[4,5,37.602],[5,7,49.44],[7,10,67.98],[10,15,97.848],[15,20,128.748],[20,25,159.648],[25,30,190.548],[30,35,221.448],[35,40,252.348],[40,null,6.312]] },
  { country: 'Croacia', ranges: [[0,1,8.988],[1,2,9.288],[2,3,9.678],[3,4,12.252],[4,5,14.802],[5,7,15.348],[7,10,18.3],[10,15,20.148],[15,20,21.492],[20,25,24.672],[25,30,29.172],[30,35,33.678],[35,40,51.09],[40,null,1.278]] },
  { country: 'Dinamarca', ranges: [[0,1,7.452],[1,2,7.692],[2,3,8.022],[3,4,9.378],[4,5,10.74],[5,7,11.178],[7,10,13.23],[10,15,14.91],[15,20,16.14],[20,25,19.32],[25,30,22.758],[30,35,26.202],[35,40,28.26],[40,null,0.708]] },
  { country: 'Eslovaquia', ranges: [[0,1,8.988],[1,2,9.288],[2,3,9.678],[3,4,12.252],[4,5,14.802],[5,7,15.348],[7,10,18.3],[10,15,20.148],[15,20,21.492],[20,25,24.672],[25,30,29.172],[30,35,33.678],[35,40,35.742],[40,null,0.9]] },
  { country: 'Eslovenia', ranges: [[0,1,8.988],[1,2,9.288],[2,3,9.678],[3,4,12.252],[4,5,14.802],[5,7,15.348],[7,10,18.3],[10,15,20.148],[15,20,21.492],[20,25,24.672],[25,30,29.172],[30,35,33.678],[35,40,35.742],[40,null,0.9]] },
  { country: 'Estonia', ranges: [[0,1,14.58],[1,2,15.072],[2,3,15.708],[3,4,17.61],[4,5,19.518],[5,7,20.61],[7,10,25.122],[10,15,28.452],[15,20,31.89],[20,25,40.422],[25,30,44.718],[30,35,49.032],[35,40,51.09],[40,null,1.278]] },
  { country: 'Finlandia', ranges: [[0,1,14.58],[1,2,15.072],[2,3,15.708],[3,4,17.61],[4,5,19.518],[5,7,20.61],[7,10,25.122],[10,15,28.452],[15,20,31.89],[20,25,40.422],[25,30,44.718],[30,35,49.032],[35,40,51.09],[40,null,1.278]] },
  { country: 'Francia', ranges: [[0,1,6.798],[1,2,7.158],[2,3,7.572],[3,4,8.262],[4,5,9.09],[5,7,9.87],[7,10,11.928],[10,15,14.28],[15,20,16.14],[20,25,18.918],[25,30,21.9],[30,35,24.87],[35,40,26.928],[40,null,0.672]] },
  { country: 'Monaco', ranges: [[0,1,6.798],[1,2,7.158],[2,3,7.572],[3,4,8.262],[4,5,9.09],[5,7,9.87],[7,10,11.928],[10,15,14.28],[15,20,16.14],[20,25,18.918],[25,30,21.9],[30,35,24.87],[35,40,26.928],[40,null,0.672]] },
  { country: 'Grecia', ranges: [[0,1,15.36],[1,2,15.858],[2,3,16.542],[3,4,21.81],[4,5,27.072],[5,7,31.038],[7,10,41.34],[10,15,51.372],[15,20,63.642],[20,25,79.86],[25,30,89.928],[30,35,100.008],[35,40,102.072],[40,null,2.55]] },
  { country: 'Paises Bajos', ranges: [[0,1,7.05],[1,2,7.278],[2,3,7.608],[3,4,8.892],[4,5,10.158],[5,7,11.178],[7,10,13.23],[10,15,14.91],[15,20,16.14],[20,25,19.32],[25,30,22.758],[30,35,26.202],[35,40,28.26],[40,null,0.708]] },
  { country: 'Hungria', ranges: [[0,1,8.988],[1,2,9.288],[2,3,9.678],[3,4,12.252],[4,5,14.802],[5,7,15.348],[7,10,18.3],[10,15,20.148],[15,20,21.492],[20,25,24.672],[25,30,29.172],[30,35,33.678],[35,40,53.49],[40,null,1.338]] },
  { country: 'Irlanda', ranges: [[0,1,10.818],[1,2,12.102],[2,3,13.392],[3,4,14.682],[4,5,15.972],[5,7,18.54],[7,10,22.662],[10,15,29.358],[15,20,35.538],[20,25,41.718],[25,30,47.898],[30,35,58.2],[35,40,65.412],[40,null,1.638]] },
  { country: 'Italia', ranges: [[0,1,6.798],[1,2,7.26],[2,3,7.65],[3,4,8.358],[4,5,9.12],[5,7,11.178],[7,10,13.728],[10,15,15.42],[15,20,17.07],[20,25,20.13],[25,30,23.238],[30,35,26.352],[35,40,28.41],[40,null,0.708]] },
  { country: 'Letonia', ranges: [[0,1,14.58],[1,2,15.072],[2,3,15.708],[3,4,17.61],[4,5,19.518],[5,7,20.61],[7,10,25.122],[10,15,28.452],[15,20,31.89],[20,25,40.422],[25,30,44.718],[30,35,49.032],[35,40,51.09],[40,null,1.278]] },
  { country: 'Lituania', ranges: [[0,1,14.58],[1,2,15.072],[2,3,15.708],[3,4,17.61],[4,5,19.518],[5,7,20.61],[7,10,25.122],[10,15,28.452],[15,20,31.89],[20,25,40.422],[25,30,44.718],[30,35,49.032],[35,40,51.09],[40,null,1.278]] },
  { country: 'Luxemburgo', ranges: [[0,1,7.05],[1,2,7.278],[2,3,7.608],[3,4,8.892],[4,5,10.158],[5,7,11.178],[7,10,13.23],[10,15,14.91],[15,20,16.14],[20,25,19.32],[25,30,22.758],[30,35,26.202],[35,40,28.26],[40,null,0.708]] },
  { country: 'Malta', ranges: [[0,1,15.69],[1,2,16.2],[2,3,16.89],[3,4,22.428],[4,5,27.96],[5,7,34.332],[7,10,48.648],[10,15,70.578],[15,20,90.618],[20,25,125.85],[25,30,143.502],[30,35,161.148],[35,40,163.212],[40,null,4.08]] },
  { country: 'Noruega', ranges: [[0,1,20.058],[1,2,20.73],[2,3,21.618],[3,4,23.31],[4,5,25.008],[5,7,26.088],[7,10,31.308],[10,15,34.83],[15,20,38.562],[20,25,47.082],[25,30,51.402],[30,35,55.698],[35,40,57.762],[40,null,1.44]] },
  { country: 'Polonia', ranges: [[0,1,7.998],[1,2,8.262],[2,3,8.61],[3,4,10.23],[4,5,11.832],[5,7,12.942],[7,10,15.21],[10,15,16.452],[15,20,17.208],[20,25,19.062],[25,30,24.03],[30,35,29.022],[35,40,31.08],[40,null,0.768]] },
  { country: 'Reino Unido', ranges: [[0,1,8.262],[1,2,8.502],[2,3,8.862],[3,4,10.2],[4,5,11.562],[5,7,12.408],[7,10,13.638],[10,15,16.14],[15,20,20.502],[20,25,24.468],[25,30,27.912],[30,35,31.35],[35,40,33.408],[40,null,0.828]] },
  { country: 'Republica Checa', ranges: [[0,1,7.452],[1,2,7.692],[2,3,8.022],[3,4,9.378],[4,5,10.74],[5,7,11.178],[7,10,13.23],[10,15,14.91],[15,20,16.14],[20,25,19.32],[25,30,22.758],[30,35,26.202],[35,40,28.26],[40,null,0.708]] },
  { country: 'Rumania', ranges: [[0,1,14.58],[1,2,15.072],[2,3,15.708],[3,4,17.61],[4,5,19.518],[5,7,20.61],[7,10,25.122],[10,15,28.452],[15,20,31.89],[20,25,40.422],[25,30,44.718],[30,35,49.032],[35,40,51.09],[40,null,1.278]] },
  { country: 'Serbia', ranges: [[0,1,22.26],[1,2,22.998],[2,3,23.982],[3,4,25.59],[4,5,27.192],[5,7,28.29],[7,10,33.792],[10,15,37.38],[15,20,41.238],[20,25,49.752],[25,30,54.06],[30,35,58.368],[35,40,60.432],[40,null,1.512]] },
  { country: 'Suecia', ranges: [[0,1,14.58],[1,2,15.072],[2,3,15.708],[3,4,17.61],[4,5,19.518],[5,7,20.61],[7,10,25.122],[10,15,28.452],[15,20,31.89],[20,25,40.422],[25,30,44.718],[30,35,49.032],[35,40,51.09],[40,null,1.278]] },
  { country: 'Suiza', ranges: [[0,1,9.318],[1,2,9.63],[2,3,10.032],[3,4,12.42],[4,5,14.802],[5,7,15.24],[7,10,17.928],[10,15,20.4],[15,20,22.152],[20,25,25.998],[25,30,30.03],[30,35,34.08],[35,40,36.138],[40,null,0.912]] },
  { country: 'Liechtenstein', ranges: [[0,1,9.318],[1,2,9.63],[2,3,10.032],[3,4,12.42],[4,5,14.802],[5,7,15.24],[7,10,17.928],[10,15,20.4],[15,20,22.152],[20,25,25.998],[25,30,30.03],[30,35,34.08],[35,40,36.138],[40,null,0.912]] },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS tariffs_international_europe (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_name text NOT NULL,
        country text NOT NULL,
        weight_from numeric NOT NULL DEFAULT 0,
        weight_to numeric,
        cost numeric NOT NULL,
        created_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_intl_tariffs_lookup
        ON tariffs_international_europe(service_name, country, weight_from);

      ALTER TABLE tariffs_international_europe ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "auth_read" ON tariffs_international_europe;
      DROP POLICY IF EXISTS "anon_read" ON tariffs_international_europe;

      CREATE POLICY "auth_read" ON tariffs_international_europe FOR SELECT TO authenticated USING (true);
      CREATE POLICY "anon_read" ON tariffs_international_europe FOR SELECT TO anon USING (true);
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL }).maybeSingle();

    if (createError && !createError.message.includes('already exists')) {
      const { error: directError } = await supabase.from('tariffs_international_europe').select('id').limit(1);
      if (directError && directError.code === 'PGRST205') {
        return new Response(
          JSON.stringify({ error: 'Table does not exist and could not be created. Please create it manually.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { error: deleteError } = await supabase
      .from('tariffs_international_europe')
      .delete()
      .eq('service_name', 'EUROBUSINESS PARCEL');

    if (deleteError && deleteError.code !== 'PGRST205') {
      console.log('Delete warning:', deleteError.message);
    }

    const allRows: { service_name: string; country: string; weight_from: number; weight_to: number | null; cost: number }[] = [];

    for (const countryData of TARIFFS_DATA) {
      for (const [weightFrom, weightTo, cost] of countryData.ranges) {
        allRows.push({
          service_name: 'EUROBUSINESS PARCEL',
          country: countryData.country,
          weight_from: weightFrom as number,
          weight_to: weightTo as number | null,
          cost: cost as number,
        });
      }
    }

    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < allRows.length; i += batchSize) {
      const batch = allRows.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('tariffs_international_europe')
        .insert(batch);

      if (insertError) {
        return new Response(
          JSON.stringify({ error: `Insert error at batch ${i}: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully inserted ${inserted} tariff records for ${TARIFFS_DATA.length} countries`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
