import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, endpoints } from '../lib/api';
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check for existing auth on app load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // You could validate the token here with the server
      // For now, we'll assume it's valid if it exists
      setUser({ id: 1, username: 'user' }); // Placeholder user data
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
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        
        // Set user data (you might want to fetch this from a separate endpoint)
        setUser({ id: 1, username });
        
        toast({
          title: 'تم تسجيل الدخول بنجاح',
          description: 'مرحباً بك في منظومة Stockly',
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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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