import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import { UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export const Auth: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) return;

    setIsSubmitting(true);
    const success = await login(formData.username, formData.password);
    setIsSubmitting(false);

    if (success) {
      // Navigation will happen automatically due to auth state change
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light to-background px-4">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Stockly</h1>
            <p className="text-muted-foreground">منظومة إدارة المخزون والفواتير</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              name="username"
              type="text"
              label="اسم المستخدم"
              placeholder="أدخل اسم المستخدم"
              value={formData.username}
              onChange={handleChange}
              leftIcon={<UserIcon className="h-4 w-4" />}
              required
            />

            <Input
              name="password"
              type="password"
              label="كلمة المرور"
              placeholder="أدخل كلمة المرور"
              value={formData.password}
              onChange={handleChange}
              leftIcon={<LockClosedIcon className="h-4 w-4" />}
              required
            />

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isSubmitting || !formData.username || !formData.password}
            >
              {isSubmitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © 2024 Stockly. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};