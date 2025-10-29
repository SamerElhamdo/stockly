import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, endpoints, setAuthTokens, clearAuthTokens, getAccessToken } from '../lib/api';
import { toast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const USER_STORAGE_KEY = 'stockly_user_info';

const isBrowser = typeof window !== 'undefined';

const readStoredUser = (): User | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch (error) {
    console.warn('Unable to read stored user', error);
    return null;
  }
};

const persistUser = (value: User | null) => {
  if (!isBrowser) return;
  try {
    if (value) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Unable to persist user info', error);
  }
};

const decodeToken = (token: string): Record<string, any> | null => {
  if (!isBrowser || !token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(payload);
  } catch (error) {
    console.warn('Unable to decode token payload', error);
    return null;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const accessToken = getAccessToken();
    if (accessToken) {
      const stored = readStoredUser();
      if (stored) {
        setUser(stored);
      } else {
        const decoded = decodeToken(accessToken);
        if (decoded) {
          const fallbackUser: User = {
            id: Number(decoded.user_id) || 0,
            username: decoded.username || 'المستخدم',
            email: decoded.email,
            first_name: decoded.first_name,
            last_name: decoded.last_name,
          };
          setUser(fallbackUser);
          persistUser(fallbackUser);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiClient.post(endpoints.login, {
        username,
        password,
      });

      const { access, refresh } = response.data;

      if (access && refresh) {
        setAuthTokens(access, refresh);

        const decoded = decodeToken(access);
        const resolvedUser: User = {
          id: Number(decoded?.user_id) || 0,
          username: decoded?.username || username,
          email: decoded?.email,
          first_name: decoded?.first_name,
          last_name: decoded?.last_name,
        };

        setUser(resolvedUser);
        persistUser(resolvedUser);

        toast({
          title: 'تم تسجيل الدخول بنجاح',
          description: 'مرحباً بك في منظومة المحاسب الذكي',
        });
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Login error:', error);

      const errorMessage = error.response?.data?.detail || 'خطأ في تسجيل الدخول';
      toast({
        title: 'خطأ في تسجيل الدخول',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthTokens();
    persistUser(null);
    setUser(null);
    toast({
      title: 'تم تسجيل الخروج',
      description: 'نراك قريباً',
    });
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};