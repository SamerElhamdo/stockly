import React, { useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';

import {
  ScreenContainer,
  SectionHeader,
  SoftBadge,
  Button,
  ListItem,
  Modal,
  AmountDisplay,
} from '@/components';
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
  items?: Array<{
    id: number;
    product_name: string;
    qty_returned: number;
  }>;
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
  const route = useRoute<any>();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnItem['status']>('all');
  const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: returns, isLoading, refetch, isRefetching } = useQuery<ReturnItem[]>({
    queryKey: ['returns', statusFilter],
    queryFn: async () => {
      const params: any = { page: 1 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await apiClient.get(endpoints.returns, { params });
      const normalized = normalizeListResponse<ReturnItem>(res.data);
      return normalized.results;
    },
  });

  const filteredReturns = useMemo(() => {
    if (!search.trim()) return returns || [];
    const keyword = search.trim().toLowerCase();
    return (returns || []).filter(
      (ret) =>
        ret.customer_name.toLowerCase().includes(keyword) ||
        String(ret.invoice_id).includes(keyword) ||
        String(ret.id).includes(keyword)
    );
  }, [returns, search]);

  const pendingCount = useMemo(() => {
    return (returns || []).filter((r) => r.status === 'pending').length;
  }, [returns]);

  const approveReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.returnApprove(id));
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم اعتماد المرتجع بنجاح');
      setDetailOpen(false);
      setSelectedReturn(null);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل اعتماد المرتجع');
    },
  });

  const rejectReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.returnReject(id));
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم رفض المرتجع');
      setDetailOpen(false);
      setSelectedReturn(null);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل رفض المرتجع');
    },
  });

  const handleApprove = (returnItem: ReturnItem) => {
    Alert.alert('تأكيد الاعتماد', `هل تريد اعتماد المرتجع #${returnItem.id}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'اعتماد', onPress: () => approveReturnMutation.mutate(returnItem.id) },
    ]);
  };

  const handleReject = (returnItem: ReturnItem) => {
    Alert.alert('تأكيد الرفض', `هل تريد رفض المرتجع #${returnItem.id}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'رفض', style: 'destructive', onPress: () => rejectReturnMutation.mutate(returnItem.id) },
    ]);
  };

  return (
    <>
      <ScreenContainer
        refreshControl={
          <RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />
        }
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>المرتجعات</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>إدارة طلبات المرتجعات</Text>
        </View>

        <View style={styles.summaryRow}>
          <SoftBadge label={`الإجمالي: ${returns?.length || 0}`} variant="info" />
          {pendingCount > 0 && (
            <SoftBadge label={`قيد المراجعة: ${pendingCount}`} variant="warning" />
          )}
        </View>

        <View style={styles.listWrapper}>
          <SectionHeader title="قائمة المرتجعات" subtitle={`${filteredReturns.length} مرتجع`} />
          {(filteredReturns || []).map((item) => {
            const status = statusMap[item.status];
            const isPending = item.status === 'pending';
            return (
              <View key={item.id} style={styles.returnCard}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedReturn(item);
                    setDetailOpen(true);
                  }}
                >
                  <ListItem
                    title={`مرتجع #${item.id}`}
                    subtitle={`فاتورة #${item.invoice_id} • ${item.customer_name}`}
                    meta={<AmountDisplay amount={item.total_amount} /> as any}
                    right={<SoftBadge label={status.label} variant={status.variant} />}
                  />
                </TouchableOpacity>
                {isPending && (
                  <View style={styles.returnActions}>
                    <Button
                      title="اعتماد"
                      variant="success"
                      onPress={() => handleApprove(item)}
                      loading={approveReturnMutation.isPending}
                    />
                    <Button
                      title="رفض"
                      variant="destructive"
                      onPress={() => handleReject(item)}
                      loading={rejectReturnMutation.isPending}
                    />
                  </View>
                )}
              </View>
            );
          })}
          {!filteredReturns?.length && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد مرتجعات</Text>
          )}
        </View>
      </ScreenContainer>

      {/* Return Detail Modal */}
      <Modal
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`تفاصيل المرتجع #${selectedReturn?.id}`}
        size="medium"
      >
        {selectedReturn && (
          <View style={styles.detailContent}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>رقم الفاتورة:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>#{selectedReturn.invoice_id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>العميل:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                {selectedReturn.customer_name}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>المبلغ:</Text>
              <AmountDisplay amount={selectedReturn.total_amount} />
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>الحالة:</Text>
              <SoftBadge
                label={statusMap[selectedReturn.status].label}
                variant={statusMap[selectedReturn.status].variant}
              />
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>التاريخ:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                {mergeDateTime(selectedReturn.created_at)}
              </Text>
            </View>

            {selectedReturn.items && selectedReturn.items.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>المنتجات المرتجعة:</Text>
                {selectedReturn.items.map((item) => (
                  <View key={item.id} style={[styles.itemRow, { borderColor: theme.border }]}>
                    <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.product_name}</Text>
                    <Text style={[styles.itemQty, { color: theme.textMuted }]}>× {item.qty_returned}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedReturn.status === 'pending' && (
              <View style={styles.actionButtons}>
                <Button
                  title="اعتماد المرتجع"
                  variant="success"
                  onPress={() => handleApprove(selectedReturn)}
                  loading={approveReturnMutation.isPending}
                />
                <Button
                  title="رفض المرتجع"
                  variant="destructive"
                  onPress={() => handleReject(selectedReturn)}
                  loading={rejectReturnMutation.isPending}
                />
              </View>
            )}
          </View>
        )}
      </Modal>
    </>
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
    gap: 8,
  },
  listWrapper: {
    gap: 12,
  },
  returnCard: {
    gap: 8,
  },
  returnActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  detailContent: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemsSection: {
    gap: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemName: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  itemQty: {
    fontSize: 13,
    marginLeft: 12,
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
});
