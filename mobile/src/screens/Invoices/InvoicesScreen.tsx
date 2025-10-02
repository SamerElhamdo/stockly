import React, { useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import {
  ScreenContainer,
  SectionHeader,
  SoftBadge,
  Button,
  Input,
  ListItem,
  AmountDisplay,
  FloatingActionButton,
  Modal,
  Picker,
  type PickerOption,
  BarcodeScanner,
} from '@/components';
import { useCompany } from '@/context';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';
import { mergeDateTime } from '@/utils/format';

interface InvoiceItem {
  id: number;
  customer?: number;
  customer_name: string;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'cancelled';
  created_at: string;
  items?: InvoiceLineItem[];
}

interface InvoiceLineItem {
  id: number;
  product: number;
  product_name: string;
  qty: number;
  price_at_add: number | string;
  unit_display?: string;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
}

interface Product {
  id: number;
  name: string;
  sku?: string;
  price: number | string;
  stock_qty: number;
  unit_display?: string;
}

export const InvoicesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatAmount } = useCompany();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceItem['status']>('all');

  // Create invoice
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Add item to invoice
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState('1');
  const [productSearch, setProductSearch] = useState('');

  // Scanner
  const [scannerVisible, setScannerVisible] = useState(false);
  
  // Returns
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState<InvoiceItem | null>(null);
  const [returnInputs, setReturnInputs] = useState<Record<number, string>>({});

  // Detail view
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const { data: invoices, isLoading, refetch, isRefetching } = useQuery<InvoiceItem[]>({
    queryKey: ['invoices', statusFilter],
    queryFn: async () => {
      const params: any = { page: 1 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await apiClient.get(endpoints.invoices, { params });
      const normalized = normalizeListResponse<InvoiceItem>(res.data);
      return normalized.results;
    },
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers);
      const normalized = normalizeListResponse<Customer>(res.data);
      return normalized.results;
    },
    enabled: createOpen,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products', productSearch],
    queryFn: async () => {
      const params: any = { page: 1, archived: false };
      if (productSearch) params.search = productSearch;
      const res = await apiClient.get(endpoints.products, { params });
      const normalized = normalizeListResponse<Product>(res.data);
      return normalized.results;
    },
    enabled: addItemOpen,
  });

  const { data: invoiceDetailForReturn } = useQuery<any>({
    queryKey: ['invoice-detail', returnInvoice?.id],
    enabled: Boolean(returnOpen && returnInvoice?.id),
    queryFn: async () => {
      const res = await apiClient.get(endpoints.invoiceDetail(returnInvoice!.id));
      return res.data;
    },
  });

  const filteredInvoices = useMemo(() => {
    if (!search.trim()) return invoices || [];
    const keyword = search.trim().toLowerCase();
    return (invoices || []).filter(
      (invoice) => invoice.customer_name.toLowerCase().includes(keyword) || String(invoice.id).includes(keyword)
    );
  }, [invoices, search]);

  const customerOptions: PickerOption[] = useMemo(() => {
    return (customers || []).map((c) => ({ label: `${c.name}${c.phone ? ` - ${c.phone}` : ''}`, value: c.id }));
  }, [customers]);

  const createInvoiceMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const res = await apiClient.post(endpoints.invoices, { customer: customerId });
      return res.data as InvoiceItem;
    },
    onSuccess: (invoice) => {
      Alert.alert('نجح', `تم إنشاء فاتورة #${invoice.id}`);
      setCreateOpen(false);
      setSelectedCustomerId('');
      refetch();
      // Open add item dialog
      setCurrentInvoiceId(invoice.id);
      setAddItemOpen(true);
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل إنشاء الفاتورة');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ invoiceId, productId, qty }: { invoiceId: number; productId: number; qty: number }) => {
      const res = await apiClient.post(endpoints.invoiceAddItem(invoiceId), {
        product: productId,
        qty,
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم إضافة المنتج للفاتورة');
      setSelectedProductId('');
      setItemQty('1');
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل إضافة المنتج');
    },
  });

  const confirmInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.invoiceConfirm(id));
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم تأكيد الفاتورة');
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل تأكيد الفاتورة');
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(endpoints.invoiceDetail(id));
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم حذف الفاتورة');
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل حذف الفاتورة');
    },
  });

  const submitReturnMutation = useMutation({
    mutationFn: async () => {
      if (!returnInvoice) return;
      const items = Object.entries(returnInputs)
        .map(([k, v]) => ({ original_item_id: Number(k), qty_returned: Number(v) }))
        .filter((x) => x.qty_returned > 0);
      if (items.length === 0) throw new Error('no_items');
      const res = await apiClient.post(endpoints.returns, {
        original_invoice: returnInvoice.id,
        items,
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم إنشاء المرتجع');
      setReturnOpen(false);
      setReturnInvoice(null);
      setReturnInputs({});
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل إنشاء المرتجع');
    },
  });

  const handleBarcodeScan = (data: string, type: string) => {
    // Find product by SKU
    const found = (products || []).find((p) => p.sku === data);
    if (found) {
      setSelectedProductId(String(found.id));
      Alert.alert('تم العثور', `المنتج: ${found.name}`, [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إضافة',
          onPress: () => {
            if (currentInvoiceId) {
              addItemMutation.mutate({
                invoiceId: currentInvoiceId,
                productId: found.id,
                qty: Number(itemQty) || 1,
              });
            }
          },
        },
      ]);
    } else {
      Alert.alert('لم يتم العثور', `لا يوجد منتج بالرمز: ${data}`);
    }
  };

  const handleConfirm = (invoice: InvoiceItem) => {
    Alert.alert('تأكيد', `هل تريد تأكيد فاتورة #${invoice.id}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تأكيد', onPress: () => confirmInvoiceMutation.mutate(invoice.id) },
    ]);
  };

  const handleDelete = (invoice: InvoiceItem) => {
    Alert.alert('تأكيد الحذف', `هل تريد حذف فاتورة #${invoice.id}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteInvoiceMutation.mutate(invoice.id) },
    ]);
  };

  const statusMap: Record<InvoiceItem['status'], { label: string; variant: 'info' | 'success' | 'destructive' }> = {
    draft: { label: 'مسودة', variant: 'info' },
    confirmed: { label: 'مؤكدة', variant: 'success' },
    cancelled: { label: 'ملغاة', variant: 'destructive' },
  };

  const statusFilterOptions: PickerOption[] = [
    { label: 'جميع الحالات', value: 'all' },
    { label: 'مسودة', value: 'draft' },
    { label: 'مؤكدة', value: 'confirmed' },
    { label: 'ملغاة', value: 'cancelled' },
  ];

  return (
    <>
      <ScreenContainer
        refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />}
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>الفواتير</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>إدارة فواتير المبيعات</Text>
        </View>

        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <Input placeholder="ابحث برقم الفاتورة أو العميل" value={search} onChangeText={setSearch} autoCorrect={false} />
          </View>
          <View style={{ width: 140 }}>
            <Picker
              placeholder="الحالة"
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as any)}
            />
          </View>
        </View>

        <View style={styles.listWrapper}>
          <SectionHeader title="قائمة الفواتير" subtitle={`${filteredInvoices.length} فاتورة`} />
          {(filteredInvoices || []).map((invoice) => {
            const status = statusMap[invoice.status];
            const isDraft = invoice.status === 'draft';
            return (
              <View key={invoice.id} style={styles.invoiceCard}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedInvoice(invoice);
                    setDetailOpen(true);
                  }}
                >
                  <ListItem
                    title={`فاتورة #${invoice.id}`}
                    subtitle={`${invoice.customer_name} • ${mergeDateTime(invoice.created_at)}`}
                    meta={<AmountDisplay amount={invoice.total_amount} /> as any}
                    right={<SoftBadge label={status.label} variant={status.variant} />}
                  />
                </TouchableOpacity>
                <View style={styles.invoiceActions}>
                  {isDraft && (
                    <>
                      <Button
                        title="إضافة منتج"
                        variant="secondary"
                        onPress={() => {
                          setCurrentInvoiceId(invoice.id);
                          setSelectedProductId('');
                          setItemQty('1');
                          setProductSearch('');
                          setAddItemOpen(true);
                        }}
                      />
                      <Button title="تأكيد" variant="success" onPress={() => handleConfirm(invoice)} />
                    </>
                  )}
                  {!isDraft && (
                    <Button
                      title="مرتجع"
                      variant="secondary"
                      onPress={() => {
                        setReturnInvoice(invoice);
                        setReturnInputs({});
                        setReturnOpen(true);
                      }}
                    />
                  )}
                  <Button title="حذف" variant="destructive" onPress={() => handleDelete(invoice)} />
                </View>
              </View>
            );
          })}
          {!filteredInvoices?.length && <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد فواتير</Text>}
        </View>

      </ScreenContainer>

      {/* Create Invoice Modal */}
      <Modal visible={createOpen} onClose={() => setCreateOpen(false)} title="إنشاء فاتورة جديدة" size="small">
        <Picker
          label="اختر العميل"
          placeholder="اختر العميل"
          options={customerOptions}
          value={selectedCustomerId}
          onChange={(value) => setSelectedCustomerId(String(value))}
        />
        <View style={styles.buttonRow}>
          <Button title="إلغاء" variant="secondary" onPress={() => setCreateOpen(false)} />
          <Button
            title="إنشاء"
            onPress={() => {
              if (!selectedCustomerId) {
                Alert.alert('خطأ', 'يرجى اختيار عميل');
                return;
              }
              createInvoiceMutation.mutate(Number(selectedCustomerId));
            }}
            loading={createInvoiceMutation.isPending}
          />
        </View>
      </Modal>

      {/* Add Item to Invoice Modal */}
      <Modal visible={addItemOpen} onClose={() => setAddItemOpen(false)} title={`إضافة منتج - فاتورة #${currentInvoiceId}`} size="medium">
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: theme.primary }]}
            onPress={() => setScannerVisible(true)}
          >
            <Ionicons name="barcode-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Input placeholder="ابحث عن منتج" value={productSearch} onChangeText={setProductSearch} />
          </View>
        </View>

        <View style={styles.productList}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>اختر منتج:</Text>
          <FlatList
            data={products || []}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const isSelected = selectedProductId === String(item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.productItem,
                    {
                      backgroundColor: isSelected ? theme.primary + '20' : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedProductId(String(item.id))}
                >
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: theme.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.productMeta, { color: theme.textMuted }]}>
                      {item.sku ? `رمز: ${item.sku} • ` : ''}متوفر: {item.stock_qty}
                    </Text>
                  </View>
                  <AmountDisplay amount={Number(item.price || 0)} />
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد منتجات</Text>}
          />
        </View>

        <Input
          label="الكمية"
          placeholder="1"
          value={itemQty}
          onChangeText={setItemQty}
          keyboardType="number-pad"
        />

        <View style={styles.buttonRow}>
          <Button title="إلغاء" variant="secondary" onPress={() => setAddItemOpen(false)} />
          <Button
            title="إضافة"
            onPress={() => {
              if (!selectedProductId || !currentInvoiceId) {
                Alert.alert('خطأ', 'يرجى اختيار منتج');
                return;
              }
              addItemMutation.mutate({
                invoiceId: currentInvoiceId,
                productId: Number(selectedProductId),
                qty: Number(itemQty) || 1,
              });
            }}
            loading={addItemMutation.isPending}
          />
        </View>
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal visible={detailOpen} onClose={() => setDetailOpen(false)} title={`تفاصيل فاتورة #${selectedInvoice?.id}`} size="medium">
        {selectedInvoice && (
          <View style={styles.detailContent}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>العميل:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedInvoice.customer_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>المبلغ الإجمالي:</Text>
              <AmountDisplay amount={selectedInvoice.total_amount} />
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>الحالة:</Text>
              <SoftBadge label={statusMap[selectedInvoice.status].label} variant={statusMap[selectedInvoice.status].variant} />
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>التاريخ:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{mergeDateTime(selectedInvoice.created_at)}</Text>
            </View>
            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <View>
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>المنتجات:</Text>
                {selectedInvoice.items.map((item) => (
                  <View key={item.id} style={[styles.itemRow, { borderColor: theme.border }]}>
                    <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.product_name}</Text>
                    <Text style={[styles.itemQty, { color: theme.textMuted }]}>× {item.qty}</Text>
                    <AmountDisplay amount={Number(item.price_at_add || 0)} />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </Modal>

      {/* Return Modal */}
      <Modal visible={returnOpen} onClose={() => setReturnOpen(false)} title={`مرتجع - فاتورة #${returnInvoice?.id}`} size="medium">
        <View style={styles.returnContent}>
          <Text style={[styles.returnLabel, { color: theme.textMuted }]}>العميل: {returnInvoice?.customer_name}</Text>
          {(invoiceDetailForReturn?.items || []).map((item: any) => (
            <View key={item.id} style={[styles.returnItem, { borderColor: theme.border }]}>
              <View style={styles.returnItemInfo}>
                <Text style={[styles.returnItemName, { color: theme.textPrimary }]}>{item.product_name}</Text>
                <Text style={[styles.returnItemQty, { color: theme.textMuted }]}>المباع: {item.qty}</Text>
              </View>
              <Input
                placeholder="0"
                value={returnInputs[item.id] ?? ''}
                onChangeText={(v) => setReturnInputs((prev) => ({ ...prev, [item.id]: v }))}
                keyboardType="number-pad"
                style={{ width: 80 }}
              />
            </View>
          ))}
          {!(invoiceDetailForReturn?.items || []).length && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد عناصر</Text>
          )}
        </View>
        <View style={styles.buttonRow}>
          <Button title="إلغاء" variant="secondary" onPress={() => setReturnOpen(false)} />
          <Button
            title="حفظ المرتجع"
            onPress={() => submitReturnMutation.mutate()}
            loading={submitReturnMutation.isPending}
          />
        </View>
      </Modal>

      {/* Barcode Scanner */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleBarcodeScan}
        title="مسح منتج للإضافة"
      />
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  scanButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listWrapper: {
    gap: 12,
  },
  invoiceCard: {
    gap: 8,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  productList: {
    gap: 8,
    maxHeight: 200,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  productInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
  },
  productMeta: {
    fontSize: 12,
    marginTop: 2,
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
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
  },
  itemQty: {
    fontSize: 13,
    marginHorizontal: 8,
  },
  returnContent: {
    gap: 12,
  },
  returnLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  returnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  returnItemInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  returnItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  returnItemQty: {
    fontSize: 12,
    marginTop: 2,
  },
});
