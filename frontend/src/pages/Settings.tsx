import React from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إعدادات النظام والشركة</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <Cog6ToothIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">قريباً</h3>
        <p className="text-muted-foreground">صفحة الإعدادات قيد التطوير</p>
      </div>
    </div>
  );
};