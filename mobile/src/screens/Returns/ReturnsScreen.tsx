import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenContainer, SectionHeader, SoftBadge, Button, ListItem, Input, FloatingActionButton } from '@/components';
import { useCompany } from '@/context';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';
import { mergeDateTime } from '@/utils/format';

interface ReturnItem {
  id: number;
  invoice_id: number;
  customer_name: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const statusMap: Record<ReturnItem['status'], { label: string; variant: 'info' | 'success' | 'destructive' }> = {
  pending: { label: 'قيد المراجعة', variant: 'info' },
  approved: { label: 'مقبول', variant: 'success' },
  rejected: { label: 'مرفوض', variant: 'destructive' },
};

export const ReturnsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatAmount } = useCompany();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [invoiceId, setInvoiceId] = React.useState('');

  const { data: returns, isLoading, refetch, isRefetching } = useQuery<ReturnItem[]>({
    queryKey: ['returns'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.returns, { params: { page: 1 } });
      const normalized = normalizeListResponse<ReturnItem>(res.data);
      return normalized.results;
    },
  });

  const approveReturn = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.returnApprove(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
  });

  const rejectReturn = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.returnReject(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
  });

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />}
    >
      <View style={styles.headerBlock}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>المرتجعات</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>إدارة طلبات المرتجعات والحالة الحالية</Text>
      </View>

      <View style={styles.listWrapper}>
        <SectionHeader title="طلبات مرتجعات" subtitle="طلبات تحتاج للمراجعة" />
        {(returns || []).map((item) => {
          const status = statusMap[item.status] || { label: 'غير معروف', variant: 'info' as const };
          return (
            <ListItem
              key={item.id}
              title={`مرتجع #${item.id}`}
              subtitle={`فاتورة #${item.invoice_id} • ${mergeDateTime(item.created_at)}`}
              meta={formatAmount(item.total_amount)}
              right={<SoftBadge label={status.label} variant={status.variant} />}
            />
          );
        })}
        {!returns?.length && (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد مرتجعات حالياً</Text>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Button
          title="اعتماد أول مرتجع"
          variant="success"
          loading={approveReturn.isPending}
          onPress={() => {
            const pending = (returns || []).find((item) => item.status === 'pending');
            if (pending) approveReturn.mutate(pending.id);
          }}
          style={styles.actionButton}
        />
        <Button
          title="رفض أول مرتجع"
          variant="destructive"
          loading={rejectReturn.isPending}
          onPress={() => {
            const pending = (returns || []).find((item) => item.status === 'pending');
            if (pending) rejectReturn.mutate(pending.id);
          }}
          style={styles.actionButton}
        />
      </View>

      {/* Quick create return */}
      {createOpen ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 90, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, backgroundColor: theme.surface, padding: 12, gap: 8 }}>
          <Text style={{ color: theme.textPrimary, fontWeight: '700', textAlign: 'right' }}>إنشاء مرتجع</Text>
          <Input placeholder="رقم الفاتورة" value={invoiceId} onChangeText={setInvoiceId} keyboardType="number-pad" />
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <Button title="إنشاء" onPress={async ()=>{ 
              try {
                await apiClient.post(endpoints.returns, { original_invoice: Number(invoiceId) });
                setCreateOpen(false); setInvoiceId('');
                refetch();
              } catch {}
            }} />
            <Button title="إلغاء" variant="secondary" onPress={()=> setCreateOpen(false)} />
          </View>
        </View>
      ) : null}

      <FloatingActionButton icon="arrow-undo-outline" onPress={()=> setCreateOpen(true)} />
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
});
