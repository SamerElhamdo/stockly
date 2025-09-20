import React from 'react';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';

export const Archive: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">الأرشيف</h1>
        <p className="text-muted-foreground mt-1">العناصر المؤرشفة</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <ArchiveBoxIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">قريباً</h3>
        <p className="text-muted-foreground">صفحة الأرشيف قيد التطوير</p>
      </div>
    </div>
  );
};