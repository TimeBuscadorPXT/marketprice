import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { loginApi, registerApi, getMeApi } from '@/services/auth';

interface User {
  id: string;
  name: string;
  email: string;
  region: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, region: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mp_token');
    if (token) {
      getMeApi()
        .then(setUser)
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
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, region: string) => {
    const result = await registerApi(name, email, password, region);
    localStorage.setItem('mp_token', result.token);
    localStorage.setItem('mp_refresh_token', result.refreshToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mp_token');
    localStorage.removeItem('mp_refresh_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
