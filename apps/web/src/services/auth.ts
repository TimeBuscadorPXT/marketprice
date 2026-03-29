import api from './api';

interface User {
  id: string;
  name: string;
  email: string;
  region: string;
  createdAt: string;
}

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post('/auth/login', { email, password });
  return data.data;
}

export async function registerApi(name: string, email: string, password: string, region: string): Promise<AuthResponse> {
  const { data } = await api.post('/auth/register', { name, email, password, region });
  return data.data;
}

export async function googleLoginApi(credential: string): Promise<AuthResponse> {
  const { data } = await api.post('/auth/google', { credential });
  return data.data;
}

export async function getMeApi(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data.data;
}

export async function completeOnboardingApi(region?: string): Promise<User> {
  const { data } = await api.post('/auth/onboarding/complete', { region });
  return data.data;
}
