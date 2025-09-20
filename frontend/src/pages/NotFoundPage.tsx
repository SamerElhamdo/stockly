import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/custom-button';
import { HomeIcon } from '@heroicons/react/24/outline';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary opacity-20">404</h1>
          <h2 className="text-3xl font-bold text-foreground mt-4 mb-2">الصفحة غير موجودة</h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            عذراً، لا يمكننا العثور على الصفحة التي تبحث عنها. قد تكون الصفحة محذوفة أو تم نقلها.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link to="/dashboard">
            <Button variant="hero" size="lg" className="gap-2">
              <HomeIcon className="h-5 w-5" />
              العودة إلى الصفحة الرئيسية
            </Button>
          </Link>
          
          <div className="text-sm text-muted-foreground">
            <p>أو يمكنك الانتقال إلى:</p>
            <div className="flex justify-center gap-4 mt-2">
              <Link to="/products" className="text-primary hover:underline">المنتجات</Link>
              <Link to="/customers" className="text-primary hover:underline">العملاء</Link>
              <Link to="/invoices" className="text-primary hover:underline">الفواتير</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};