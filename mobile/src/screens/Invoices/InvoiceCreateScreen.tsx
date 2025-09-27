import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer, SoftButton, SoftListItem, SoftInput, SectionHeader } from '@/components';
import { useTheme } from '@/theme';
import { SalesStackParamList } from '@/navigation/types';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/context';

type Props = NativeStackScreenProps<SalesStackParamList, 'InvoiceCreate'>;

export const InvoiceCreateScreen: React.FC<Props> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { customerId, customerName } = route.params;
  const { formatAmount } = useCompany();
  const qc = useQueryClient();

  // Step 1: create draft invoice immediately
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.post(endpoints.invoices, { customer: customerId });
        if (mounted) setInvoiceId(Number(res.data?.id));
      } catch {}
    })();
    return () => { mounted = false; };
  }, [customerId]);

  // Product search and pick
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [qtyByProduct, setQtyByProduct] = useState<Record<number, string>>({});
  // debounce search
  useEffect(() => {
    const handle = setTimeout(() => setKeyword(search.trim()), 250);
    return () => clearTimeout(handle);
  }, [search]);

  const { data: products, isFetching, refetch } = useQuery({
    queryKey: ['invoice-create-products', keyword],
    enabled: Boolean(keyword),
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products, { params: { search: keyword } });
      const n = normalizeListResponse<{ id: number; name: string; price?: number; stock_qty?: number }>(res.data);
      return n.results;
    },
  });

  const addItem = useMutation({
    mutationFn: async (vars: { productId: number; qty: number }) => {
      if (!invoiceId) throw new Error('no_invoice');
      const res = await apiClient.post(endpoints.invoiceAddItem(invoiceId), { product: vars.productId, qty: vars.qty });
      return res.data;
    },
    onSuccess: () => {
      if (selectedProductId) setQtyByProduct((prev) => ({ ...prev, [selectedProductId]: '1' }));
      qc.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] });
    },
  });

  const confirm = useMutation({
    mutationFn: async () => {
      if (!invoiceId) throw new Error('no_invoice');
      await apiClient.post(endpoints.invoiceConfirm(invoiceId), {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] });
      navigation.goBack();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر تأكيد الفاتورة';
      Alert.alert('خطأ', msg);
    },
  });

  // Fetch invoice detail for totals/items
  const { data: invoiceDetail } = useQuery({
    queryKey: ['invoice-detail', invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const res = await apiClient.get(endpoints.invoiceDetail(invoiceId as number));
      return res.data as any;
    },
  });

  const totalAmount = useMemo(() => Number(invoiceDetail?.total_amount || 0), [invoiceDetail]);

  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.textPrimary} />}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>فاتورة جديدة</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{customerName}</Text>
      </View>
      {/* Added items at the top */}
      <SectionHeader title="العناصر المضافة" />
      <View style={{ gap: 8 }}>
        {(invoiceDetail?.items || []).map((it: any) => (
          <SoftListItem key={it.id} title={it.product_name} subtitle={`الكمية: ${it.qty}`} meta={formatAmount(Number(it.price_at_add || 0) * Number(it.qty || 0))} />
        ))}
        {!(invoiceDetail?.items || []).length ? <Text style={{ textAlign: 'center', color: theme.textMuted }}>لا توجد عناصر</Text> : null}
      </View>

      {/* Search input only */}
      <SectionHeader title="بحث عن منتج" />
      <View style={{ gap: 8 }}>
        <SoftInput placeholder="اكتب اسم المنتج" value={search} onChangeText={setSearch} />
      </View>

      <View style={{ gap: 8 }}>
        {(products || []).map((p) => (
          <SoftListItem
            key={p.id}
            title={p.name}
            subtitle={`متاح: ${p.stock_qty ?? 0}`}
            onPress={() => setSelectedProductId(p.id)}
            style={selectedProductId === p.id ? { borderColor: theme.softPalette.primary.main } : undefined}
            right={
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Pressable
                  onPress={() => setQtyByProduct((prev) => ({ ...prev, [p.id]: String(Math.max(1, (Number(prev[p.id]) || 1) + 1)) }))}
                  style={[styles.stepBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
                >
                  <Text style={{ color: theme.textPrimary, fontSize: 16 }}>+</Text>
                </Pressable>
                <TextInput
                  value={qtyByProduct[p.id] ?? '1'}
                  onChangeText={(v) => setQtyByProduct((prev) => ({ ...prev, [p.id]: v }))}
                  keyboardType="number-pad"
                  style={[styles.qtyInput, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }]}
                  placeholder="1"
                  placeholderTextColor={theme.textMuted}
                />
                <Pressable
                  onPress={() => setQtyByProduct((prev) => ({ ...prev, [p.id]: String(Math.max(1, (Number(prev[p.id]) || 1) - 1)) }))}
                  style={[styles.stepBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
                >
                  <Text style={{ color: theme.textPrimary, fontSize: 16 }}>-</Text>
                </Pressable>
              </View>
            }
          />
        ))}
      </View>

      {/* Footer add and confirm */}
      <View style={{ gap: 8, marginTop: 8 }}>
        <SoftButton
          title="إضافة العنصر المحدد"
          variant="secondary"
          disabled={!selectedProductId}
          onPress={() => {
            if (!selectedProductId) return;
            const raw = qtyByProduct[selectedProductId] || '1';
            const q = Math.max(1, Number(raw));
            addItem.mutate({ productId: selectedProductId, qty: q });
          }}
        />
        <Text style={{ textAlign: 'right', fontWeight: '700', color: theme.textPrimary }}>الإجمالي: {formatAmount(totalAmount)}</Text>
        <SoftButton title="تأكيد الفاتورة" onPress={() => confirm.mutate()} loading={confirm.isPending} disabled={!invoiceId} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: { gap: 6, alignItems: 'flex-end' },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'right' },
  subtitle: { fontSize: 14, textAlign: 'right' },
  qtyInput: { width: 56, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, textAlign: 'center' },
  stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
});


