import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/services';
import type { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ needsVerification?: boolean; user?: User }>;
  register: (data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    referralCode?: string;
  }) => Promise<{ verificationCode?: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => void;
  setAuth: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(key);
  if (!stored || stored === 'undefined' || stored === 'null') {
    return null;
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredJson<User>('bt_user'));
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bt_token'));
  const [isLoading, setIsLoading] = useState(true);

  const setAuth = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('bt_token', newToken);
    localStorage.setItem('bt_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('bt_token');
    localStorage.removeItem('bt_user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await authApi.me();
        setUser(data.user);
        localStorage.setItem('bt_user', JSON.stringify(data.user));
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    void validate();
  }, [token, logout]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await authApi.login(email, password);
      setAuth(data.token, data.user);
      return { user: data.user };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { needsVerification?: boolean } } };
      if (error.response?.data?.needsVerification) {
        return { needsVerification: true };
      }
      throw err;
    }
  }, [setAuth]);

  const register = useCallback(async (data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    referralCode?: string;
  }) => {
    const res = await authApi.register(data);
    return { verificationCode: res.data.verificationCode };
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const { data } = await authApi.verifyEmail(email, code);
    setAuth(data.token, data.user);
  }, [setAuth]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      login,
      register,
      verifyEmail,
      logout,
      setAuth,
    }),
    [user, token, isLoading, login, register, verifyEmail, logout, setAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
