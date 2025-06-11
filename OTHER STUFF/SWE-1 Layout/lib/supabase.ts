const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase URL or Anon Key is missing. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  );
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface FetchOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
}

export const supabaseFetch = async <T = any>(
  endpoint: string,
  { method = 'GET', headers = {}, body }: FetchOptions = {}
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Request failed with status ${response.status}`
      );
    }

    // For DELETE requests that don't return data
    if (response.status === 204) {
      return { data: null as unknown as T, error: null };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('Supabase fetch error:', error);
    return { data: null, error: error as Error };
  }
};

// Auth functions
export const signInWithEmail = async (email: string) => {
  return supabaseFetch('/auth/v1/signin', {
    method: 'POST',
    body: { email },
  });
};

// User profile functions
export const getUserProfile = async (userId: string) => {
  return supabaseFetch<{ id: string; first_name: string; last_name: string; username: string }>(
    `/profiles?id=eq.${userId}`
  );
};

export const createUserProfile = async (profile: {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
}) => {
  return supabaseFetch('/profiles', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: profile,
  });
};

// Coop functions
export const getUserCoops = async (userId: string) => {
  return supabaseFetch<Array<{ id: string; name: string }>>(
    `/coops?user_id=eq.${userId}`
  );
};

// Snapshot functions
export const getCoopSnapshots = async (coopId: string) => {
  return supabaseFetch<Array<{ id: string; created_at: string; image_url: string }>>(
    `/snapshots?coop_id=eq.${coopId}&order=created_at.desc`
  );
};
