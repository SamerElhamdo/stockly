import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';

import {
  ScreenContainer,
  SectionHeader,
  SoftBadge,
  Button,
  ListItem,
  SimpleModal,
  AmountDisplay,
} from '@/components';
import { useCompany, useToast, useConfirmation } from '@/context';
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
  const { formatAmount, getProductsLabel } = useCompany();
  const { showSuccess, showError } = useToast();
  const { showConfirmation } = useConfirmation();
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
      showSuccess('تم اعتماد المرتجع بنجاح');
      setDetailOpen(false);
      setSelectedReturn(null);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || 'فشل اعتماد المرتجع');
    },
  });

  const rejectReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.returnReject(id));
      return res.data;
    },
    onSuccess: () => {
      showSuccess('تم رفض المرتجع');
      setDetailOpen(false);
      setSelectedReturn(null);
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || 'فشل رفض المرتجع');
    },
  });

  const handleApprove = async (returnItem: ReturnItem) => {
    const confirmed = await showConfirmation({
      title: 'تأكيد الاعتماد',
      message: `هل تريد اعتماد المرتجع #${returnItem.id}؟`,
      confirmText: 'اعتماد',
      cancelText: 'إلغاء',
      type: 'info',
    });
    
    if (confirmed) {
      approveReturnMutation.mutate(returnItem.id);
    }
  };

  const handleReject = async (returnItem: ReturnItem) => {
    const confirmed = await showConfirmation({
      title: 'تأكيد الرفض',
      message: `هل تريد رفض المرتجع #${returnItem.id}؟`,
      confirmText: 'رفض',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    
    if (confirmed) {
      rejectReturnMutation.mutate(returnItem.id);
    }
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
                    meta={<AmountDisplay amount={Number(item.total_amount)} /> as any}
                    right={<SoftBadge label={status.label} variant={status.variant} />}
                  />
                </TouchableOpacity>
                {isPending && (
                  <View style={styles.returnActions}>
                    <Button
                      title="تأكيد"
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

      {/* Enhanced Return Detail Modal */}
      <SimpleModal
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`تفاصيل المرتجع #${selectedReturn?.id}`}
        size="large"
      >
        {selectedReturn && (
          <View style={styles.enhancedDetailContent}>
            {/* Header Card */}
            <View style={[
              styles.headerCard,
              { 
                backgroundColor: theme.softPalette.primary?.light || '#e3f2fd',
                borderColor: theme.softPalette.primary?.main || '#1976d2',
              }
            ]}>
              <View style={styles.headerInfo}>
                <Text style={[styles.headerTitle, { color: theme.softPalette.primary?.main || '#1976d2' }]}>
                  مرتجع #{selectedReturn.id}
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
                  فاتورة #{selectedReturn.invoice_id} • {selectedReturn.customer_name}
                </Text>
              </View>
              <SoftBadge
                label={statusMap[selectedReturn.status].label}
                variant={statusMap[selectedReturn.status].variant}
              />
            </View>

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.detailCardLabel, { color: theme.textMuted }]}>المبلغ الإجمالي</Text>
                <AmountDisplay amount={Number(selectedReturn.total_amount)} />
              </View>
              
              <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.detailCardLabel, { color: theme.textMuted }]}>تاريخ الطلب</Text>
                <Text style={[styles.detailCardValue, { color: theme.textPrimary }]}>
                  {mergeDateTime(selectedReturn.created_at)}
                </Text>
              </View>
            </View>

            {/* Items Section */}
            {selectedReturn.items && selectedReturn.items.length > 0 && (
              <View style={styles.enhancedItemsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{getProductsLabel()} المرتجعة</Text>
                  <Text style={[styles.itemsCount, { color: theme.textMuted }]}>
                    {selectedReturn.items.length} {getProductsLabel(selectedReturn.items.length)}
                  </Text>
                </View>
                
                {selectedReturn.items.map((item, index) => (
                  <View key={item.id} style={[
                    styles.enhancedItemRow, 
                    { 
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      borderTopWidth: index === 0 ? 0 : 1,
                    }
                  ]}>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.enhancedItemName, { color: theme.textPrimary }]}>
                        {item.product_name}
                      </Text>
                      <Text style={[styles.enhancedItemQty, { color: theme.textMuted }]}>
                        الكمية المرتجعة
                      </Text>
                    </View>
                    <View style={[styles.qtyBadge, { backgroundColor: theme.softPalette.info?.light || '#e1f5fe' }]}>
                      <Text style={[styles.qtyBadgeText, { color: theme.softPalette.info?.main || '#0277bd' }]}>
                        {Math.floor(Number(item.qty_returned))}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            {selectedReturn.status === 'pending' && (
              <View style={styles.enhancedActionButtons}>
                <Button
                  title="تأكيد المرتجع"
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
      </SimpleModal>
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
  // Enhanced Modal Styles
  enhancedDetailContent: {
    gap: 20,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  detailCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  detailCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  detailCardValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  enhancedItemsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemsCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  enhancedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  enhancedItemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  enhancedItemQty: {
    fontSize: 12,
    fontWeight: '500',
  },
  qtyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  qtyBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  enhancedActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
