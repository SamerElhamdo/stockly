import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenContainer, SectionHeader, SoftBadge, SoftButton, SoftInput, SoftListItem } from '@/components';
import { useCompany } from '@/context';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';
import { mergeDateTime } from '@/utils/format';

interface InvoiceItem {
  id: number;
  customer_name: string;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'cancelled';
  created_at: string;
}

export const InvoicesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatAmount } = useCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: invoices, isLoading, refetch, isRefetching } = useQuery<InvoiceItem[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.invoices, { params: { page: 1 } });
      const normalized = normalizeListResponse<InvoiceItem>(res.data);
      return normalized.results;
    },
  });

  const confirmInvoice = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.invoiceConfirm(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const filteredInvoices = useMemo(() => {
    if (!search.trim()) return invoices || [];
    const keyword = search.trim().toLowerCase();
    return (invoices || []).filter((invoice) =>
      invoice.customer_name.toLowerCase().includes(keyword) || String(invoice.id).includes(keyword),
    );
  }, [invoices, search]);

  const statusMap: Record<InvoiceItem['status'], { label: string; variant: 'info' | 'success' | 'destructive' }> = {
    draft: { label: 'مسودة', variant: 'info' },
    confirmed: { label: 'مؤكدة', variant: 'success' },
    cancelled: { label: 'ملغاة', variant: 'destructive' },
  };

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />}
    >
      <View style={styles.headerBlock}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>الفواتير</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>أدر فواتير المبيعات وتابع حالتها</Text>
      </View>

      <SoftInput placeholder="ابحث برقم الفاتورة أو اسم العميل" value={search} onChangeText={setSearch} autoCorrect={false} />

      <View style={styles.listWrapper}>
        <SectionHeader title="قائمة الفواتير" subtitle="أحدث الفواتير" />
        {(filteredInvoices || []).map((invoice) => {
          const status = statusMap[invoice.status];
          return (
            <SoftListItem
              key={invoice.id}
              title={`فاتورة رقم #${invoice.id}`}
              subtitle={`${invoice.customer_name} • ${mergeDateTime(invoice.created_at)}`}
              meta={formatAmount(invoice.total_amount)}
              right={<SoftBadge label={status.label} variant={status.variant} />}
            />
          );
        })}
        {!filteredInvoices?.length && (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد فواتير مطابقة</Text>
        )}
      </View>

      <SoftButton
        title="تأكيد كل الفواتير المعلقة"
        variant="success"
        loading={confirmInvoice.isPending}
        onPress={() => {
          const draft = (invoices || []).find((invoice) => invoice.status === 'draft');
          if (draft) {
            confirmInvoice.mutate(draft.id);
          }
        }}
        style={styles.footerButton}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerBlock: {
    gap: 6,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  pageSubtitle: {
    fontSize: 15,
  },
  listWrapper: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
  footerButton: {
    marginTop: 12,
  },
});
