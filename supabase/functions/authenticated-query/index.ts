import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const ALLOWED_TABLES = new Set([
  'custom_commercial_plans',
  'custom_cost_overrides',
  'custom_tariffs',
  'custom_tariffs_active',
  'user_daily_activity',
  'tariffspdf',
  'user_tariff_activation',
  'user_sessions',
  'user_profiles',
  'promotional_codes',
]);

const ALLOWED_RPC = new Set([
  'get_user_activity_summary',
]);

const ADMIN_ONLY_TABLES = new Set([
  'user_profiles',
  'promotional_codes',
]);

const OWNER_COLUMN: Record<string, string> = {
  custom_commercial_plans: 'user_id',
  custom_cost_overrides: 'user_id',
  custom_tariffs: 'user_id',
  custom_tariffs_active: 'user_id',
  user_daily_activity: 'user_id',
  tariffspdf: '__none__',
  user_tariff_activation: 'user_id',
  user_sessions: 'user_id',
  user_profiles: '__none__',
  promotional_codes: '__none__',
};

function errorResponse(msg: string, status: number) {
  return new Response(
    JSON.stringify({ error: msg }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function okResponse(data: any) {
  return new Response(
    JSON.stringify({ data }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userId, sessionToken, table, action, filters, data: payload, columns, orderBy, limit: rowLimit, rpcName, rpcParams } = body;

    if (!userId || !sessionToken) {
      return errorResponse('userId y sessionToken requeridos', 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('id, user_id, expires_at')
      .eq('user_id', userId)
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (sessionError || !session) {
      return errorResponse('Sesion no valida o expirada', 401);
    }

    if (action === 'rpc') {
      if (!rpcName || !ALLOWED_RPC.has(rpcName)) {
        return errorResponse('Funcion RPC no permitida', 403);
      }
      const { data, error } = await supabaseAdmin.rpc(rpcName, rpcParams || {});
      if (error) {
        console.error(`RPC error (${rpcName}):`, error);
        return errorResponse('Error en RPC', 500);
      }
      return okResponse(data);
    }

    if (!table || !ALLOWED_TABLES.has(table)) {
      return errorResponse('Tabla no permitida', 403);
    }

    if (!action || !['select', 'insert', 'update', 'delete'].includes(action)) {
      return errorResponse('Accion no valida', 400);
    }

    if (ADMIN_ONLY_TABLES.has(table)) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

      if (!profile || profile.email !== 'dcprats@gmail.com') {
        return errorResponse('Acceso denegado: solo administradores', 403);
      }
    }

    const ownerCol = OWNER_COLUMN[table];

    if (action === 'select') {
      let query = supabaseAdmin.from(table).select(columns || '*');

      if (ownerCol && ownerCol !== '__none__') {
        query = query.eq(ownerCol, userId);
      }

      if (filters) {
        for (const f of filters) {
          if (f.op === 'eq') query = query.eq(f.column, f.value);
          else if (f.op === 'neq') query = query.neq(f.column, f.value);
          else if (f.op === 'gt') query = query.gt(f.column, f.value);
          else if (f.op === 'gte') query = query.gte(f.column, f.value);
          else if (f.op === 'lt') query = query.lt(f.column, f.value);
          else if (f.op === 'lte') query = query.lte(f.column, f.value);
          else if (f.op === 'in') query = query.in(f.column, f.value);
          else if (f.op === 'is') query = query.is(f.column, f.value);
        }
      }

      if (orderBy) {
        for (const o of Array.isArray(orderBy) ? orderBy : [orderBy]) {
          query = query.order(o.column, { ascending: o.ascending ?? true });
        }
      }

      if (rowLimit) {
        query = query.limit(rowLimit);
      }

      const { data, error } = await query;
      if (error) {
        console.error(`Select error (${table}):`, error);
        return errorResponse('Error en consulta', 500);
      }
      return okResponse(data);
    }

    if (action === 'insert') {
      if (!payload) return errorResponse('Datos requeridos para insert', 400);

      const rows = Array.isArray(payload) ? payload : [payload];
      if (ownerCol && ownerCol !== '__none__') {
        for (const row of rows) {
          row[ownerCol] = userId;
        }
      }

      const { data, error } = await supabaseAdmin.from(table).insert(rows).select();
      if (error) {
        console.error(`Insert error (${table}):`, error);
        return errorResponse('Error en insert', 500);
      }
      return okResponse(data);
    }

    if (action === 'update') {
      if (!payload) return errorResponse('Datos requeridos para update', 400);

      let query = supabaseAdmin.from(table).update(payload);

      if (ownerCol && ownerCol !== '__none__') {
        query = query.eq(ownerCol, userId);
      }

      if (filters) {
        for (const f of filters) {
          if (f.op === 'eq') query = query.eq(f.column, f.value);
          else if (f.op === 'neq') query = query.neq(f.column, f.value);
        }
      }

      const { data, error } = await query.select();
      if (error) {
        console.error(`Update error (${table}):`, error);
        return errorResponse('Error en update', 500);
      }
      return okResponse(data);
    }

    if (action === 'delete') {
      let query = supabaseAdmin.from(table).delete();

      if (ownerCol && ownerCol !== '__none__') {
        query = query.eq(ownerCol, userId);
      }

      if (filters) {
        for (const f of filters) {
          if (f.op === 'eq') query = query.eq(f.column, f.value);
          else if (f.op === 'neq') query = query.neq(f.column, f.value);
        }
      }

      const { data, error } = await query.select();
      if (error) {
        console.error(`Delete error (${table}):`, error);
        return errorResponse('Error en delete', 500);
      }
      return okResponse(data);
    }

    return errorResponse('Accion no reconocida', 400);
  } catch (error) {
    console.error('Error in authenticated-query:', error);
    return errorResponse('Error interno del servidor', 500);
  }
});
