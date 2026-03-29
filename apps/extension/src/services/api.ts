import { API_BASE_URL } from '../utils/constants';
import { saveToken, getToken, saveRefreshToken, getRefreshToken, saveUser, clearAll } from './storage';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AuthResponse {
  user: Record<string, unknown>;
  token: string;
  refreshToken: string;
}

interface ListingsResult {
  total: number;
  saved: number;
  duplicates: number;
  outliers: number;
}

interface ListingPayload {
  title: string;
  price: number;
  region: string;
  publishedAt?: string;
  fbUrl: string;
  condition?: string;
  imageUrl?: string;
  description?: string;
  sellerName?: string;
  photoCount?: number;
  publishedText?: string;
  daysOnMarket?: number;
  hasShipping?: boolean;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (response.status === 401 && token) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${await getToken()}`;
      const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
      return (await retryResponse.json()) as ApiResponse<T>;
    }
    await clearAll();
  }

  return data;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = (await response.json()) as ApiResponse<{ token: string; refreshToken: string }>;
    if (data.success && data.data) {
      await saveToken(data.data.token);
      await saveRefreshToken(data.data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json()) as ApiResponse<AuthResponse>;

    if (data.success && data.data) {
      await saveToken(data.data.token);
      await saveRefreshToken(data.data.refreshToken);
      await saveUser(data.data.user);
      return { success: true };
    }

    return { success: false, error: data.error ?? 'Erro no login' };
  } catch (err) {
    console.error('[MarketPrice] Login error:', err);
    return { success: false, error: 'Erro de conexao com o servidor' };
  }
}

export async function sendListings(listings: ListingPayload[]): Promise<ListingsResult | null> {
  try {
    const result = await request<ListingsResult>('/listings', {
      method: 'POST',
      body: JSON.stringify({ listings }),
    });

    if (result.success && result.data) {
      return result.data;
    }
    console.error('[MarketPrice] Send listings error:', result.error);
    return null;
  } catch (err) {
    console.error('[MarketPrice] Send listings error:', err);
    return null;
  }
}

export async function sendDeepUpdate(data: unknown): Promise<boolean> {
  try {
    const result = await request<{ updated: boolean }>('/listings/deep-update', {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (result.success) {
      return true;
    }
    console.error('[MarketPrice] Deep update error:', result.error);
    return false;
  } catch (err) {
    console.error('[MarketPrice] Deep update error:', err);
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}
