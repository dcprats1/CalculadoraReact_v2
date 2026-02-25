const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getSession(): { userId: string; sessionToken: string } | null {
  try {
    const raw = localStorage.getItem('user_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.id || !parsed.sessionToken) return null;
    return { userId: parsed.id, sessionToken: parsed.sessionToken };
  } catch {
    return null;
  }
}

async function callEdgeFunction(fnName: string, body: Record<string, any>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Error ${res.status}`);
  }
  return json;
}

export async function fetchUserProfile(userId: string): Promise<any> {
  const session = getSession();
  if (!session) throw new Error('No hay sesion activa');

  const result = await callEdgeFunction('get-user-profile', {
    userId,
    sessionToken: session.sessionToken,
  });
  return result.data;
}

export async function fetchUserPreferences(userId: string): Promise<any> {
  const session = getSession();
  if (!session) throw new Error('No hay sesion activa');

  const result = await callEdgeFunction('get-user-preferences', {
    userId,
    sessionToken: session.sessionToken,
  });
  return result.data;
}

export async function updateUserPreferences(userId: string, updates: Record<string, any>): Promise<any> {
  const session = getSession();
  if (!session) throw new Error('No hay sesion activa');

  const result = await callEdgeFunction('get-user-preferences', {
    userId,
    sessionToken: session.sessionToken,
    action: 'update',
    updates,
  });
  return result.data;
}

export interface QueryFilter {
  column: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is';
  value: any;
}

export interface OrderBy {
  column: string;
  ascending?: boolean;
}

interface AuthQueryParams {
  table: string;
  action: 'select' | 'insert' | 'update' | 'delete';
  columns?: string;
  filters?: QueryFilter[];
  data?: any;
  orderBy?: OrderBy | OrderBy[];
  limit?: number;
}

interface AuthRpcParams {
  rpcName: string;
  rpcParams?: Record<string, any>;
}

export async function authenticatedQuery(params: AuthQueryParams): Promise<any[]> {
  const session = getSession();
  if (!session) throw new Error('No hay sesion activa');

  const result = await callEdgeFunction('authenticated-query', {
    userId: session.userId,
    sessionToken: session.sessionToken,
    ...params,
  });
  return result.data;
}

export async function authenticatedRpc(params: AuthRpcParams): Promise<any> {
  const session = getSession();
  if (!session) throw new Error('No hay sesion activa');

  const result = await callEdgeFunction('authenticated-query', {
    userId: session.userId,
    sessionToken: session.sessionToken,
    action: 'rpc',
    ...params,
  });
  return result.data;
}
