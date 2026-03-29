import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { loginApi, registerApi, googleLoginApi, getMeApi, completeOnboardingApi } from '@/services/auth';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  region: string;
  onboardingDone?: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (name: string, email: string, password: string, region: string) => Promise<void>;
  completeOnboarding: (region?: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Notify extension about auth changes via postMessage
function notifyExtension(token: string, refreshToken: string, user: { email: string; name: string }) {
  try {
    window.postMessage({
      type: 'MARKETPRICE_AUTH_TOKEN',
      token,
      refreshToken,
      email: user.email,
      name: user.name,
    }, '*');
  } catch {
    // Extension may not be installed
  }
}

function notifyExtensionLogout() {
  try {
    window.postMessage({ type: 'MARKETPRICE_LOGOUT' }, '*');
  } catch {
    // Extension may not be installed
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mp_token');
    if (token) {
      getMeApi()
        .then((u) => {
          setUser(u);
          // Notify extension on page load if already logged in
          const refreshToken = localStorage.getItem('mp_refresh_token') || '';
          notifyExtension(token, refreshToken, { email: u.email, name: u.name });
        })
        .catch(() => {
          localStorage.removeItem('mp_token');
          localStorage.removeItem('mp_refresh_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginApi(email, password);
    localStorage.setItem('mp_token', result.token);
    localStorage.setItem('mp_refresh_token', result.refreshToken);
    setUser(result.user);
    notifyExtension(result.token, result.refreshToken, result.user);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const result = await googleLoginApi(credential);
    localStorage.setItem('mp_token', result.token);
    localStorage.setItem('mp_refresh_token', result.refreshToken);
    setUser(result.user);
    notifyExtension(result.token, result.refreshToken, result.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, region: string) => {
    const result = await registerApi(name, email, password, region);
    localStorage.setItem('mp_token', result.token);
    localStorage.setItem('mp_refresh_token', result.refreshToken);
    setUser(result.user);
    notifyExtension(result.token, result.refreshToken, result.user);
  }, []);

  const completeOnboarding = useCallback(async (region?: string) => {
    const updatedUser = await completeOnboardingApi(region);
    setUser((prev) => prev ? { ...prev, ...updatedUser, onboardingDone: true } : prev);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mp_token');
    localStorage.removeItem('mp_refresh_token');
    setUser(null);
    notifyExtensionLogout();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, loginWithGoogle, register, completeOnboarding, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
