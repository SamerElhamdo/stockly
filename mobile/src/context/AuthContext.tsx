import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { decode as base64Decode } from 'base-64';

import { apiClient, apiEvents, endpoints } from '@/services/api-client';
import {
  StoredUser,
  clearAuthTokens,
  persistUser,
  readUser,
  setAuthTokens,
} from '@/storage/auth-storage';

export type User = StoredUser;

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const decodeTokenPayload = (token: string): User | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = base64Decode(payload);
    const parsed = JSON.parse(decoded);
    const resolved: User = {
      id: Number(parsed.user_id) || 0,
      username: parsed.username || 'المستخدم',
      email: parsed.email,
      first_name: parsed.first_name,
      last_name: parsed.last_name,
    };
    return resolved;
  } catch (error) {
    console.warn('Unable to decode access token payload', error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const hydrate = useCallback(async () => {
    try {
      const stored = await readUser();
      if (stored) {
        setUser(stored);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const logout = useCallback(async () => {
    setUser(null);
    await clearAuthTokens();
    await persistUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      void logout();
    };
    apiEvents.on('unauthorized', handleUnauthorized);
    return () => {
      apiEvents.off('unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const login = useCallback(async (username: string, password: string) => {
    setIsAuthenticating(true);
    try {
      const response = await apiClient.post(endpoints.login, {
        username,
        password,
      });
      const { access, refresh, user: payloadUser } = response.data || {};
      if (!access || !refresh) {
        Alert.alert('خطأ في تسجيل الدخول', 'تعذر الحصول على بيانات الاعتماد من الخادم');
        return false;
      }

      await setAuthTokens(access, refresh);

      let resolvedUser: User | null = null;
      if (payloadUser && typeof payloadUser === 'object') {
        resolvedUser = {
          id: Number(payloadUser.id) || 0,
          username: payloadUser.username || username,
          email: payloadUser.email,
          first_name: payloadUser.first_name,
          last_name: payloadUser.last_name,
        };
      }

      if (!resolvedUser) {
        resolvedUser = decodeTokenPayload(access) || {
          id: 0,
          username,
        };
      }

      setUser(resolvedUser);
      await persistUser(resolvedUser);
      return true;
    } catch (error: any) {
      console.error('Login error', error);
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        'تحقق من بيانات الدخول وحاول مرة أخرى';
      Alert.alert('فشل تسجيل الدخول', message);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticating,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, isLoading, isAuthenticating, login, logout],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
