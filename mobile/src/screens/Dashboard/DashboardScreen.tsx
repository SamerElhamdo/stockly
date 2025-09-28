import React, { useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer, SectionHeader, SoftBadge, SoftCard, ListItem } from '@/components';
import { useCompany } from '@/context';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';
import { mergeDateTime } from '@/utils/format';

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

interface ProductPreview {
  id: number;
  name: string;
  stock_qty: number;
}

export const DashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatAmount } = useCompany();

  const { data: stats, isLoading, refetch, isRefetching } = useQuery<DashboardStatsResponse>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.dashboardStats);
      return res.data as DashboardStatsResponse;
    },
  });

  const { data: lowStockProducts } = useQuery<ProductPreview[]>({
    queryKey: ['dashboard-low-stock'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products, { params: { ordering: 'stock_qty', page: 1 } });
      const normalized = normalizeListResponse<{ id: number; name: string; stock_qty: number }>(res.data);
      return normalized.results.filter((product) => Number(product.stock_qty) <= 5).slice(0, 5);
    },
  });

  const statsCards = useMemo(
    () => [
      {
        title: 'إجمالي المبيعات',
        value: formatAmount(Number(stats?.total_sales || 0)),
        variant: 'success' as const,
      },
      {
        title: 'مبيعات اليوم',
        value: formatAmount(Number(stats?.sales_today || 0)),
        variant: 'success' as const,
      },
      {
        title: 'مبيعات الشهر',
        value: formatAmount(Number(stats?.sales_month || 0)),
        variant: 'primary' as const,
      },
      {
        title: 'فواتير اليوم',
        value: String(stats?.today_invoices ?? '—'),
        variant: 'info' as const,
      },
      {
        title: 'المرتجعات اليوم',
        value: `${stats?.returns_today_count || 0} / ${formatAmount(Number(stats?.returns_today_amount || 0))}`,
        variant: 'warning' as const,
      },
      {
        title: 'ذمم مستحقة',
        value: formatAmount(Number(stats?.outstanding_receivables || 0)),
        variant: 'destructive' as const,
      },
    ],
    [formatAmount, stats],
  );

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />}
    >
      <View style={styles.headerBlock}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>لوحة التحكم</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>نظرة شاملة على أداء الشركة اليوم</Text>
      </View>

      <View style={styles.statsGrid}>
        {statsCards.map((card) => (
          <SoftCard key={card.title} variant={card.variant === 'info' ? 'primary' : (card.variant as any)} style={styles.statCard}>
            <Text style={[styles.statTitle, { color: theme.textMuted }]}>{card.title}</Text>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{card.value}</Text>
          </SoftCard>
        ))}
      </View>

      <SoftCard style={styles.sectionCard}>
        <SectionHeader title="فواتير حديثة" subtitle="أحدث الفواتير التي تم إنشاؤها" />
        <View style={styles.listSpacing}>
          {(stats?.recent_invoices || []).map((invoice) => (
            <ListItem
              key={invoice.id}
              title={`فاتورة رقم #${invoice.id}`}
              subtitle={`${invoice.customer_name} • ${mergeDateTime(invoice.created_at)}`}
              meta={formatAmount(Number(invoice.total_amount || 0))}
              right={<SoftBadge label={invoice.status === 'confirmed' ? 'مؤكدة' : 'مسودة'} variant={invoice.status === 'confirmed' ? 'success' : 'info'} />}
            />
          ))}
          {!stats?.recent_invoices?.length && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد فواتير حديثة</Text>
          )}
        </View>
      </SoftCard>

      <SoftCard style={styles.sectionCard}>
        <SectionHeader title="منتجات منخفضة المخزون" subtitle="راقب الكميات لتجنب نفاد المنتجات" />
        <View style={styles.listSpacing}>
          {(lowStockProducts || []).map((product) => (
            <ListItem
              key={product.id}
              title={product.name}
              subtitle="كمية في المخزون"
              meta={`${product.stock_qty}`}
            />
          ))}
          {!lowStockProducts?.length && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>المخزون آمن حالياً</Text>
          )}
        </View>
      </SoftCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerBlock: {
    gap: 6,
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'right',
  },
  pageSubtitle: {
    fontSize: 15,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '48%',
    gap: 8,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionCard: {
    gap: 12,
  },
  listSpacing: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
