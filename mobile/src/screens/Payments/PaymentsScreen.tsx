import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer, SectionHeader, SoftBadge, Input, ListItem } from '@/components';
import { useCompany } from '@/context';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';
import { mergeDateTime } from '@/utils/format';

interface PaymentItem {
  id: number;
  customer_name: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

const statusMap: Record<PaymentItem['status'], { label: string; variant: 'info' | 'success' | 'destructive' }> = {
  pending: { label: 'قيد المعالجة', variant: 'info' },
  completed: { label: 'مكتمل', variant: 'success' },
  failed: { label: 'فشل', variant: 'destructive' },
};

export const PaymentsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatAmount } = useCompany();
  const [search, setSearch] = useState('');

  const { data: payments, isLoading, refetch, isRefetching } = useQuery<PaymentItem[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.payments, { params: { page: 1 } });
      const normalized = normalizeListResponse<PaymentItem>(res.data);
      return normalized.results;
    },
  });

  const filteredPayments = useMemo(() => {
    if (!search.trim()) return payments || [];
    const keyword = search.trim().toLowerCase();
    return (payments || []).filter((payment) =>
      payment.customer_name.toLowerCase().includes(keyword) || payment.method.toLowerCase().includes(keyword),
    );
  }, [payments, search]);

  const totalPayments = useMemo(() => {
    return (payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }, [payments]);

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />}
    >
      <View style={styles.headerBlock}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>المدفوعات</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>تتبع التدفقات المالية ومعالجة المدفوعات</Text>
      </View>

      <View style={styles.summaryRow}>
        <SoftBadge label={`عدد العمليات: ${payments?.length || 0}`} variant="info" />
        <SoftBadge label={`إجمالي المدفوعات: ${formatAmount(totalPayments)}`} variant="success" />
      </View>

      <Input placeholder="ابحث باسم العميل أو طريقة الدفع" value={search} onChangeText={setSearch} autoCorrect={false} />

      <View style={styles.listWrapper}>
        <SectionHeader title="سجل المدفوعات" subtitle="أحدث العمليات المالية" />
        {(filteredPayments || []).map((payment) => {
          const status = statusMap[payment.status] || { label: 'غير معروف', variant: 'info' };
          return (
            <ListItem
              key={payment.id}
              title={`${payment.customer_name}`}
              subtitle={`${payment.method} • ${mergeDateTime(payment.created_at)}`}
              meta={formatAmount(payment.amount)}
              right={<SoftBadge label={status.label} variant={status.variant} />}
            />
          );
        })}
        {!filteredPayments?.length && (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد مدفوعات مطابقة</Text>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerBlock: {
    gap: 6,
    alignItems: 'flex-end',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'right',
  },
  pageSubtitle: {
    fontSize: 15,
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listWrapper: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
});
