import React from 'react';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  CubeIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<React.ComponentProps<'svg'>>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  color = 'primary' 
}) => {
  const colorClasses = {
    primary: 'bg-primary-light text-primary border-primary/20',
    success: 'bg-success-light text-success border-success/20',
    warning: 'bg-warning-light text-warning border-warning/20',
    destructive: 'bg-destructive-light text-destructive border-destructive/20',
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isPositive ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-success" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-destructive" />
              )}
              <span className={`text-sm font-medium ${
                trend.isPositive ? 'text-success' : 'text-destructive'
              }`}>
                {trend.value}%
              </span>
              <span className="text-sm text-muted-foreground">من الشهر الماضي</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  // Mock data - replace with real API calls
  const stats = [
    {
      title: 'إجمالي المبيعات',
      value: '125,430 ر.س',
      icon: CurrencyDollarIcon,
      trend: { value: 12.5, isPositive: true },
      color: 'success' as const,
    },
    {
      title: 'فواتير اليوم',
      value: 24,
      icon: DocumentTextIcon,
      trend: { value: 8.2, isPositive: true },
      color: 'primary' as const,
    },
    {
      title: 'المنتجات النشطة',
      value: 1847,
      icon: CubeIcon,
      color: 'warning' as const,
    },
    {
      title: 'العملاء',
      value: 342,
      icon: UsersIcon,
      trend: { value: 3.1, isPositive: false },
      color: 'destructive' as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-2">نظرة عامة على أداء متجرك</p>
        </div>
        <div className="text-sm text-muted-foreground">
          آخر تحديث: {new Date().toLocaleDateString('ar')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">آخر الفواتير</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center">
                    <DocumentTextIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">فاتورة #{1000 + item}</p>
                    <p className="text-sm text-muted-foreground">عميل {item}</p>
                  </div>
                </div>
                <span className="font-semibold text-success">
                  {(Math.random() * 5000 + 1000).toFixed(0)} ر.س
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">تنبيهات المخزون</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-warning-light rounded-full flex items-center justify-center">
                    <CubeIcon className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">منتج {item}</p>
                    <p className="text-sm text-muted-foreground">الكمية المتبقية قليلة</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-warning">
                  {Math.floor(Math.random() * 10 + 1)} قطع
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};