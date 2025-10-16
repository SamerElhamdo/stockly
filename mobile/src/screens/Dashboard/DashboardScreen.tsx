import React, { useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, View, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer, SectionHeader, SoftBadge, SoftCard, ListItem, AmountDisplay } from '@/components';
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
  const { formatAmount, profile } = useCompany();

  const { data: stats, isLoading, refetch, isRefetching } = useQuery<DashboardStatsResponse>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.dashboardStats);
      return res.data as DashboardStatsResponse;
    },
  });

  const { data: productsCount } = useQuery<number>({
    queryKey: ['dashboard-products-count'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products);
      const normalized = normalizeListResponse<{ id: number }>(res.data);
      return normalized.count ?? normalized.results.length;
    },
  });

  const { data: customersCount } = useQuery<number>({
    queryKey: ['dashboard-customers-count'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers);
      const normalized = normalizeListResponse<{ id: number }>(res.data);
      return normalized.count ?? normalized.results.length;
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

  const allStatsCards = useMemo(
    () => [
      {
        title: 'إجمالي المبيعات',
        key: 'total_sales',
        value: formatAmount(Number(stats?.total_sales || 0)),
        type: 'amount' as const,
        icon: 'cash-outline' as const,
        color: 'success' as const,
      },
      {
        title: 'فواتير اليوم',
        key: 'today_invoices',
        value: String(stats?.today_invoices ?? 0),
        type: 'count' as const,
        icon: 'document-text-outline' as const,
        color: 'primary' as const,
      },
      {
        title: 'المنتجات النشطة',
        key: 'products',
        value: String(productsCount ?? 0),
        type: 'count' as const,
        icon: 'cube-outline' as const,
        color: 'warning' as const,
      },
      {
        title: 'العملاء',
        key: 'customers',
        value: String(customersCount ?? 0),
        type: 'count' as const,
        icon: 'people-outline' as const,
        color: 'primary' as const,
      },
      {
        title: 'مبيعات اليوم',
        key: 'sales_today',
        value: formatAmount(Number(stats?.sales_today || 0)),
        type: 'amount' as const,
        icon: 'trending-up-outline' as const,
        color: 'success' as const,
      },
      {
        title: 'مبيعات هذا الشهر',
        key: 'sales_month',
        value: formatAmount(Number(stats?.sales_month || 0)),
        type: 'amount' as const,
        icon: 'calendar-outline' as const,
        color: 'success' as const,
      },
      {
        title: 'فواتير مسودة',
        key: 'draft_invoices',
        value: String(stats?.draft_invoices || 0),
        type: 'count' as const,
        icon: 'create-outline' as const,
        color: 'warning' as const,
      },
      {
        title: 'فواتير ملغاة',
        key: 'cancelled_invoices',
        value: String(stats?.cancelled_invoices || 0),
        type: 'count' as const,
        icon: 'close-circle-outline' as const,
        color: 'destructive' as const,
      },
      {
        title: 'دفعات اليوم',
        key: 'payments_today',
        value: formatAmount(Number(stats?.payments_today || 0)),
        type: 'amount' as const,
        icon: 'wallet-outline' as const,
        color: 'primary' as const,
      },
      {
        title: 'دفعات هذا الشهر',
        key: 'payments_month',
        value: formatAmount(Number(stats?.payments_month || 0)),
        type: 'amount' as const,
        icon: 'card-outline' as const,
        color: 'primary' as const,
      },
      {
        title: 'عدد المرتجعات اليوم',
        key: 'returns_today_count',
        value: String(stats?.returns_today_count || 0),
        type: 'count' as const,
        icon: 'return-down-back-outline' as const,
        color: 'warning' as const,
      },
      {
        title: 'قيمة المرتجعات اليوم',
        key: 'returns_today_amount',
        value: formatAmount(Number(stats?.returns_today_amount || 0)),
        type: 'amount' as const,
        icon: 'trending-down-outline' as const,
        color: 'warning' as const,
      },
      {
        title: 'منتجات منخفضة المخزون',
        key: 'low_stock_count',
        value: String(stats?.low_stock_items || 0),
        type: 'count' as const,
        icon: 'alert-circle-outline' as const,
        color: 'warning' as const,
      },
      {
        title: 'منتجات منتهية المخزون',
        key: 'out_of_stock_count',
        value: '0',
        type: 'count' as const,
        icon: 'ban-outline' as const,
        color: 'destructive' as const,
      },
      {
        title: 'قيمة المخزون (تكلفة)',
        key: 'inventory_value_cost',
        value: formatAmount(Number(stats?.inventory_value_cost || 0)),
        type: 'amount' as const,
        icon: 'calculator-outline' as const,
        color: 'primary' as const,
      },
      {
        title: 'قيمة المخزون (بيع)',
        key: 'inventory_value_retail',
        value: formatAmount(Number(stats?.inventory_value_retail || 0)),
        type: 'amount' as const,
        icon: 'pricetag-outline' as const,
        color: 'success' as const,
      },
      {
        title: 'الرصيد المستحق',
        key: 'outstanding_receivables',
        value: formatAmount(Number(stats?.outstanding_receivables || 0)),
        type: 'amount' as const,
        icon: 'hourglass-outline' as const,
        color: 'destructive' as const,
      },
    ],
    [formatAmount, stats, productsCount, customersCount],
  );

  // Filter cards based on user preferences from company profile
  const statsCards = useMemo(() => {
    const hasDashboardPref = Array.isArray(profile?.dashboard_cards);
    const cardsPref = new Set(profile?.dashboard_cards || []);
    
    return hasDashboardPref
      ? allStatsCards.filter((card) => cardsPref.has(card.key))
      : allStatsCards;
  }, [allStatsCards, profile?.dashboard_cards]);

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>لوحة التحكم</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>نظرة شاملة على أداء الشركة اليوم</Text>
        </View>

        <View style={styles.statsGrid}>
          {statsCards.map((card, index) => {
            const colorMap = {
              primary: theme.softPalette.primary,
              success: theme.softPalette.success,
              warning: theme.softPalette.warning,
              destructive: theme.softPalette.destructive,
            };
            const colors = colorMap[card.color];
            
            return (
              <View key={card.title} style={styles.statCardWrapper}>
                <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: colors?.light || theme.softPalette.primary.light }]}>
                      <Ionicons name={card.icon as any} size={26} color={colors?.main || theme.softPalette.primary.main} />
                    </View>
                  </View>
                  <Text style={[styles.statTitle, { color: theme.textMuted }]} numberOfLines={2}>
                    {card.title}
                  </Text>
                  <View style={styles.valueContainer}>
                    {card.value.includes('|') ? (
                      card.value.split('|').map((part, i) => (
                        <Text 
                          key={i}
                          style={[
                            card.type === 'amount' ? styles.amountValue : styles.countValue,
                            { color: colors?.main || theme.softPalette.primary.main }
                          ]}
                          numberOfLines={1}
                        >
                          {part.trim()}
                        </Text>
                      ))
                    ) : (
                      <Text 
                        style={[
                          card.type === 'amount' ? styles.amountValue : styles.countValue,
                          { color: colors?.main || theme.softPalette.primary.main }
                        ]}
                        numberOfLines={1}
                      >
                        {card.value}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
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
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    gap: 20,
    paddingBottom: 60,
  },
  headerBlock: {
    gap: 6,
    alignItems: 'flex-start',
    marginBottom: 4,
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
    justifyContent: 'space-between',
    rowGap: 16,
    columnGap: 12,
  },
  statCardWrapper: {
    width: '48%',
    marginBottom: 0,
  },
  statCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    height: 150,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 15,
    marginBottom: 8,
  },
  // ============ أرقام المبالغ ============
  amountValue: {
    fontSize: 13,        // 📌 تحكم بحجم المبالغ من هنا
    fontWeight: '700',
    textAlign: 'right',
    lineHeight: 17,
  },
  // ============ أرقام الكميات/العدد ============
  countValue: {
    fontSize: 20,        // 📌 تحكم بحجم الأعداد من هنا
    fontWeight: '800',
    textAlign: 'right',
    lineHeight: 24,
  },
  valueContainer: {
    alignItems: 'flex-start',
    gap: 3,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
