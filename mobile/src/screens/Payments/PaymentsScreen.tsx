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
  customer: number;
  customer_name: string;
  amount: number | string;
  payment_method: string;
  payment_method_display?: string;
  payment_date: string;
  invoice?: number | null;
  notes?: string;
}

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
      payment.customer_name.toLowerCase().includes(keyword) || 
      payment.payment_method.toLowerCase().includes(keyword) ||
      (payment.payment_method_display?.toLowerCase() || '').includes(keyword),
    );
  }, [payments, search]);

  const totalPayments = useMemo(() => {
    return (payments || []).reduce((sum, payment) => {
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
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
          const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
          const isWithdraw = amount < 0;
          const displayAmount = Math.abs(amount);
          const paymentMethod = payment.payment_method_display || payment.payment_method || 'نقداً';
          
          return (
            <ListItem
              key={payment.id}
              title={payment.customer_name}
              subtitle={`${paymentMethod} • ${mergeDateTime(payment.payment_date)}`}
              meta={formatAmount(displayAmount)}
              right={<SoftBadge label={isWithdraw ? 'سحب' : 'دفعة'} variant={isWithdraw ? 'warning' : 'success'} />}
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
    alignItems: 'flex-start',
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
    gap: 6,
  },
  listWrapper: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
});
