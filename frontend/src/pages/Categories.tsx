import React from 'react';
import { Button } from '../components/ui/custom-button';
import { PlusIcon, TagIcon } from '@heroicons/react/24/outline';

export const Categories: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الفئات</h1>
          <p className="text-muted-foreground mt-1">إدارة فئات المنتجات</p>
        </div>
        <Button variant="hero" className="gap-2">
          <PlusIcon className="h-4 w-4" />
          إضافة فئة جديدة
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <TagIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">قريباً</h3>
        <p className="text-muted-foreground">صفحة إدارة الفئات قيد التطوير</p>
      </div>
    </div>
  );
};