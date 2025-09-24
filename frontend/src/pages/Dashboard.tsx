import React from 'react';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  CubeIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { apiClient, endpoints, normalizeListResponse } from '../lib/api';
import { useCompany } from '../contexts/CompanyContext';
import { Amount } from '../components/Amount';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
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
  color = 'primary',
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
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-success' : 'text-destructive'
                }`}
              >
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

interface DashboardStatsResponse {
  today_invoices: number;
  total_sales: number;
  low_stock_items: number;
  recent_invoices: Array<{
    id: number;
    customer_name: string;
    total_amount: number;
    status: string;
    created_at: string;
  }>;
  sales_today?: number;
  sales_month?: number;
  draft_invoices?: number;
  cancelled_invoices?: number;
  payments_today?: number;
  payments_month?: number;
  returns_today_count?: number;
  returns_today_amount?: number;
  inventory_value_cost?: number;
  inventory_value_retail?: number;
  outstanding_receivables?: number;
}

export const Dashboard: React.FC = () => {
  const { profile, formatAmount } = useCompany();
  const {
    data: statsData,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.dashboardStats);
      return res.data as DashboardStatsResponse;
    },
  });

  const { data: productsCountData, isLoading: productsLoading } = useQuery({
    queryKey: ['dashboard-products-count'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products);
      const normalized = normalizeListResponse<{ id: number }>(res.data);
      return normalized.count ?? normalized.results.length;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: customersCountData, isLoading: customersLoading } = useQuery({
    queryKey: ['dashboard-customers-count'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers);
      const normalized = normalizeListResponse<{ id: number }>(res.data);
      return normalized.count ?? normalized.results.length;
    },
    staleTime: 5 * 60 * 1000,
  });

  const lowStockEnabled = (statsData?.low_stock_items ?? 0) > 0;

  const { data: lowStockProductsData, isLoading: lowStockLoading } = useQuery({
    queryKey: ['dashboard-low-stock', lowStockEnabled],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products, {
        params: { ordering: 'stock_qty', page: 1 },
      });
      const normalized = normalizeListResponse<{ id: number; name: string; stock_qty: number }>(res.data);
      return normalized.results
        .filter((product) => Number(product.stock_qty) <= 5)
        .slice(0, 5);
    },
    enabled: lowStockEnabled,
    staleTime: 5 * 60 * 1000,
  });

  const totalSales = statsData?.total_sales ?? 0;
  const todayInvoices = statsData?.today_invoices ?? 0;
  const lowStockCount = statsData?.low_stock_items ?? 0;
  const productsCount = productsCountData ?? 0;
  const customersCount = customersCountData ?? 0;
  const recentInvoices = statsData?.recent_invoices ?? [];

  // Backend-provided metrics
  const salesToday = Number(statsData?.sales_today || 0);
  const salesMonth = Number(statsData?.sales_month || 0);
  const draftInvoicesCount = Number(statsData?.draft_invoices || 0);
  const cancelledInvoicesCount = Number(statsData?.cancelled_invoices || 0);
  const paymentsToday = Number(statsData?.payments_today || 0);
  const paymentsMonth = Number(statsData?.payments_month || 0);
  const returnsTodayCount = Number(statsData?.returns_today_count || 0);
  const returnsTodayAmount = Number(statsData?.returns_today_amount || 0);
  const inventoryValueCost = Number(statsData?.inventory_value_cost || 0);
  const inventoryValueRetail = Number(statsData?.inventory_value_retail || 0);
  const outstandingReceivables = Number(statsData?.outstanding_receivables || 0);

  const allStats = [
    {
      title: 'إجمالي المبيعات',
      value: statsLoading ? '...' : <Amount value={totalSales} digits={2} />,
      icon: CurrencyDollarIcon,
      color: 'success' as const,
    },
    {
      title: 'مبيعات اليوم',
      value: <Amount value={salesToday} digits={2} />,
      icon: CurrencyDollarIcon,
      color: 'success' as const,
    },
    {
      title: 'مبيعات هذا الشهر',
      value: <Amount value={salesMonth} digits={2} />,
      icon: CurrencyDollarIcon,
      color: 'success' as const,
    },
    {
      title: 'فواتير اليوم',
      value: statsLoading ? '...' : todayInvoices,
      icon: DocumentTextIcon,
      color: 'primary' as const,
    },
    {
      title: 'المنتجات النشطة',
      value: productsLoading ? '...' : productsCount,
      icon: CubeIcon,
      color: 'warning' as const,
    },
    {
      title: 'العملاء',
      value: customersLoading ? '...' : customersCount,
      icon: UsersIcon,
      color: 'destructive' as const,
    },
    {
      title: 'فواتير مسودة',
      value: draftInvoicesCount,
      icon: DocumentTextIcon,
      color: 'warning' as const,
    },
    {
      title: 'فواتير ملغاة',
      value: cancelledInvoicesCount,
      icon: DocumentTextIcon,
      color: 'destructive' as const,
    },
    {
      title: 'منتجات منخفضة المخزون',
      value: lowStockCount,
      icon: CubeIcon,
      color: 'warning' as const,
    },
    {
      title: 'الرصيد المستحق',
      value: <Amount value={outstandingReceivables} digits={2} />,
      icon: CurrencyDollarIcon,
      color: 'primary' as const,
    },
    {
      title: 'دفعات اليوم',
      value: <Amount value={paymentsToday} digits={2} />,
      icon: CurrencyDollarIcon,
      color: 'primary' as const,
    },
    {
      title: 'دفعات هذا الشهر',
      value: <Amount value={paymentsMonth} digits={2} />,
      icon: CurrencyDollarIcon,
      color: 'primary' as const,
    },
    {
      title: 'عدد المرتجعات اليوم',
      value: returnsTodayCount,
      icon: ArrowTrendingDownIcon,
      color: 'warning' as const,
    },
    {
      title: 'قيمة المرتجعات اليوم',
      value: <Amount value={returnsTodayAmount} digits={2} />,
      icon: ArrowTrendingDownIcon,
      color: 'warning' as const,
    },
    {
      title: 'قيمة المخزون (تكلفة)',
      value: <Amount value={inventoryValueCost} digits={2} />,
      icon: CubeIcon,
      color: 'warning' as const,
    },
    {
      title: 'قيمة المخزون (بيع)',
      value: <Amount value={inventoryValueRetail} digits={2} />,
      icon: CubeIcon,
      color: 'warning' as const,
    },
  ];

  const mapTitleToKey: Record<string, string> = {
    'إجمالي المبيعات': 'total_sales',
    'مبيعات اليوم': 'sales_today',
    'مبيعات هذا الشهر': 'sales_month',
    'فواتير اليوم': 'today_invoices',
    'المنتجات النشطة': 'products',
    'العملاء': 'customers',
    'فواتير مسودة': 'draft_invoices',
    'فواتير ملغاة': 'cancelled_invoices',
    'منتجات منخفضة المخزون': 'low_stock_count',
    'الرصيد المستحق': 'outstanding_receivables',
    'دفعات اليوم': 'payments_today',
    'دفعات هذا الشهر': 'payments_month',
    'عدد المرتجعات اليوم': 'returns_today_count',
    'قيمة المرتجعات اليوم': 'returns_today_amount',
    'قيمة المخزون (تكلفة)': 'inventory_value_cost',
    'قيمة المخزون (بيع)': 'inventory_value_retail',
  };
  const hasDashboardPref = Array.isArray(profile?.dashboard_cards);
  const cardsPref = new Set(profile?.dashboard_cards || []);
  const stats = hasDashboardPref
    ? allStats.filter((s) => cardsPref.has(mapTitleToKey[s.title] || ''))
    : allStats;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-2">
            نظرة عامة على أداء متجرك
            {statsError && <span className="text-destructive ml-2">تعذر تحميل بعض البيانات</span>}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          آخر تحديث: {new Date().toLocaleDateString('ar')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-4 text-sm text-muted-foreground">لا توجد كروت محددة للعرض. يمكنك تفعيلها من الإعدادات.</div>
        ) : stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">آخر الفواتير</h3>
          <div className="space-y-3">
            {statsLoading ? (
              <p className="text-muted-foreground">...جاري التحميل</p>
            ) : recentInvoices.length === 0 ? (
              <p className="text-muted-foreground">لا توجد فواتير حديثة</p>
            ) : (
              recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center">
                      <DocumentTextIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">فاتورة #{invoice.id}</p>
                      <p className="text-sm text-muted-foreground">{invoice.customer_name}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-success">
                    <Amount value={Number(invoice.total_amount || 0)} digits={2} />
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">تنبيهات المخزون</h3>
          <div className="space-y-3">
            {statsLoading ? (
              <p className="text-muted-foreground">...جاري التحميل</p>
            ) : lowStockCount === 0 ? (
              <p className="text-muted-foreground">لا توجد منتجات منخفضة المخزون حالياً</p>
            ) : lowStockLoading ? (
              <p className="text-muted-foreground">...جاري التحميل</p>
            ) : (lowStockProductsData || []).length === 0 ? (
              <p className="text-muted-foreground">يوجد {lowStockCount} منتج بحاجة لإعادة التوريد</p>
            ) : (
              (lowStockProductsData || []).map((product) => (
                <div key={product.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-warning-light rounded-full flex items-center justify-center">
                      <CubeIcon className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">المتبقي {product.stock_qty} قطع</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-warning">{product.stock_qty}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
