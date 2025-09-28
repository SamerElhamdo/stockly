import React, { useMemo, useState } from 'react';
import { Modal, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenContainer, SectionHeader, SoftBadge, Button, Input, ListItem } from '@/components';
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
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState<InvoiceItem | null>(null);
  const [returnInputs, setReturnInputs] = useState<Record<number, string>>({});

  const { data: invoices, isLoading, refetch, isRefetching } = useQuery<InvoiceItem[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.invoices, { params: { page: 1 } });
      const normalized = normalizeListResponse<InvoiceItem>(res.data);
      return normalized.results;
    },
  });

  // Load invoice detail when opening returns dialog
  const { data: invoiceDetailForReturn } = useQuery<any>({
    queryKey: ['invoice-detail', returnInvoice?.id],
    enabled: Boolean(returnOpen && returnInvoice?.id),
    queryFn: async () => {
      const res = await apiClient.get(endpoints.invoiceDetail(returnInvoice!.id));
      return res.data;
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

      <Input placeholder="ابحث برقم الفاتورة أو اسم العميل" value={search} onChangeText={setSearch} autoCorrect={false} />

      <View style={styles.listWrapper}>
        <SectionHeader title="قائمة الفواتير" subtitle="أحدث الفواتير" />
        {(filteredInvoices || []).map((invoice) => {
          const status = statusMap[invoice.status] || { label: 'غير معروف', variant: 'info' as const };
          return (
            <View key={invoice.id} style={{ gap: 8 }}>
              <ListItem
                title={`فاتورة رقم #${invoice.id}`}
                subtitle={`${invoice.customer_name} • ${mergeDateTime(invoice.created_at)}`}
                meta={formatAmount(invoice.total_amount)}
                right={<SoftBadge label={status.label} variant={status.variant} />}
              />
              {invoice.status !== 'draft' ? (
                <View style={{ flexDirection: 'row-reverse' }}>
                  <Button
                    title="إنشاء مرتجع"
                    variant="secondary"
                    onPress={() => {
                      setReturnInvoice(invoice);
                      setReturnInputs({});
                      setReturnOpen(true);
                    }}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
        {!filteredInvoices?.length && (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد فواتير مطابقة</Text>
        )}
      </View>

      <Button
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

      <Modal visible={returnOpen} transparent animationType="fade" onRequestClose={() => setReturnOpen(false)}>
        <View style={styles.modalBackdrop} />
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{returnInvoice ? `مرتجع لِفاتورة #${returnInvoice.id}` : 'مرتجع'}</Text>
          <View style={{ gap: 8 }}>
            {(invoiceDetailForReturn?.items || []).map((it: any) => (
              <ListItem
                key={it.id}
                title={it.product_name}
                subtitle={`المباع: ${it.qty}`}
                right={
                  <TextInput
                    value={returnInputs[it.id] ?? ''}
                    onChangeText={(v) => setReturnInputs((prev) => ({ ...prev, [it.id]: v }))}
                    keyboardType="number-pad"
                    style={[styles.returnQty, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                  />
                }
              />
            ))}
            {!(invoiceDetailForReturn?.items || []).length ? (
              <Text style={{ textAlign: 'center', color: theme.textMuted }}>لا توجد عناصر في هذه الفاتورة</Text>
            ) : null}
          </View>
          <View style={{ gap: 8 }}>
            <Button
              title="حفظ المرتجع"
              onPress={async () => {
                if (!returnInvoice) return;
                const entries = Object.entries(returnInputs)
                  .map(([k, v]) => ({ id: Number(k), qty: Number(v) }))
                  .filter((x) => x.qty > 0);
                if (entries.length === 0) { setReturnOpen(false); return; }
                await apiClient.post(endpoints.returns, {
                  original_invoice: returnInvoice.id,
                  items: entries.map((e) => ({ original_item_id: e.id, qty_returned: e.qty })),
                });
                setReturnOpen(false);
                setReturnInvoice(null);
                setReturnInputs({});
                refetch();
              }}
            />
            <Button title="إغلاق" variant="secondary" onPress={() => setReturnOpen(false)} />
          </View>
        </View>
      </Modal>
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
  listWrapper: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modalCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 80,
    bottom: 80,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  modalTitle: { textAlign: 'right', fontSize: 16, fontWeight: '700' },
  returnQty: { width: 64, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, textAlign: 'center' },
  footerButton: {
    marginTop: 12,
  },
});
