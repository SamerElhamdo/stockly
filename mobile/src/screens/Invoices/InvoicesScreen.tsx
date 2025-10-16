import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View, FlatList, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

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
  Skeleton,
  SkeletonList,
  LoadingSpinner,
  SimpleModal,
} from '@/components';
import { useCompany, useToast, useConfirmation } from '@/context';
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
  const { formatAmount, getProductsLabel } = useCompany();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { showConfirmation } = useConfirmation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
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

  const { data: invoiceDetailForReturn, isLoading: isLoadingReturnData } = useQuery<any>({
    queryKey: ['invoice-detail', returnInvoice?.id],
    enabled: Boolean(returnOpen && returnInvoice?.id),
    queryFn: async () => {
      const res = await apiClient.get(endpoints.invoiceDetail(returnInvoice!.id));
      return res.data;
    },
  });

  // Get existing returns for this invoice to calculate already returned quantities
  const { data: existingReturns } = useQuery<any>({
    queryKey: ['returns-by-invoice', returnInvoice?.id],
    enabled: Boolean(returnOpen && returnInvoice?.id),
    queryFn: async () => {
      const res = await apiClient.get(endpoints.returns, {
        params: { original_invoice: returnInvoice!.id }
      });
      return normalizeListResponse<any>(res.data);
    },
  });

  // Calculate already returned quantities by item
  const returnedByItemId = useMemo(() => {
    const map = new Map<number, number>();
    const results = existingReturns?.results || [];
    results.forEach((ret: any) => {
      if (ret.status === 'rejected') return;
      (ret.items || []).forEach((rit: any) => {
        const key = Number(rit.original_item);
        const qty = Number(rit.qty_returned || 0);
        map.set(key, (map.get(key) || 0) + qty);
      });
    });
    return map;
  }, [existingReturns]);

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
      showSuccess(`✓ تم إنشاء فاتورة #${invoice.id}`);
      // Reset form
      setCreateOpen(false);
      setSelectedCustomerId('');
      // Open add item dialog
      setCurrentInvoiceId(invoice.id);
      setAddItemOpen(true);
      // Refresh list
      refetch();
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || 'فشل إنشاء الفاتورة');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ invoiceId, productId, qty, keepOpen }: { invoiceId: number; productId: number; qty: number; keepOpen?: boolean }) => {
      const res = await apiClient.post(endpoints.invoiceAddItem(invoiceId), {
        product: productId,
        qty,
      });
      return { data: res.data, keepOpen };
    },
    onSuccess: ({ keepOpen }) => {
      showSuccess('✓ تم إضافة العنصر');
      setSelectedProductId('');
      setItemQty('1');
      setProductSearch('');
      refetch();
      if (!keepOpen) {
        setAddItemOpen(false);
        setCurrentInvoiceId(null);
      }
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || 'فشل إضافة المنتج');
    },
  });

  const confirmInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.invoiceConfirm(id));
      return { data: res.data, invoiceId: id };
    },
    onSuccess: ({ invoiceId }) => {
      showSuccess('✓ تم تأكيد الفاتورة');
      refetch();
      // Navigate to print invoice screen
      navigation.navigate('PrintInvoice', { id: invoiceId });
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || 'فشل تأكيد الفاتورة');
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(endpoints.invoiceDetail(id));
      return res.data;
    },
    onSuccess: () => {
      showSuccess('✓ تم حذف الفاتورة');
      refetch();
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || 'فشل حذف الفاتورة');
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async ({ invoiceId, itemId }: { invoiceId: number; itemId: number }) => {
      const res = await apiClient.post(endpoints.invoiceRemoveItem(invoiceId), {
        item_id: itemId,
      });
      return res.data;
    },
    onSuccess: () => {
      showSuccess('✓ تم حذف العنصر');
      refetch();
      if (selectedInvoice) {
        // Refresh selected invoice data
        queryClient.invalidateQueries({ queryKey: ['invoice-detail', selectedInvoice.id] });
      }
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || 'فشل حذف العنصر');
    },
  });

  const submitReturnMutation = useMutation({
    mutationFn: async () => {
      if (!returnInvoice) return;
      
      // Validate quantities before submission
      const items = Object.entries(returnInputs)
        .map(([k, v]) => {
          const itemId = Number(k);
          const qtyToReturn = Number(v);
          const sold = Number(invoiceDetailForReturn?.items?.find((it: any) => it.id === itemId)?.qty || 0);
          const alreadyReturned = Number(returnedByItemId.get(itemId) || 0);
          const remaining = Math.max(0, sold - alreadyReturned);
          
          return { 
            original_item_id: itemId, 
            qty_returned: qtyToReturn,
            max_available: remaining
          };
        })
        .filter((x) => x.qty_returned > 0);
        
      if (items.length === 0) throw new Error('no_items');
      
      // Check if any quantity exceeds available
      const invalidItem = items.find((item) => item.qty_returned > item.max_available);
      if (invalidItem) {
        throw new Error('invalid_quantity');
      }
      
      const res = await apiClient.post(endpoints.returns, {
        original_invoice: returnInvoice.id,
        items: items.map(({ max_available, ...rest }) => rest),
      });
      return res.data;
    },
    onSuccess: () => {
      showSuccess('✓ تم إنشاء المرتجع');
      setReturnOpen(false);
      setReturnInvoice(null);
      setReturnInputs({});
      refetch();
    },
    onError: (err: any) => {
      if (err.message === 'no_items') {
        showError('يرجى تحديد كمية مرتجعة واحدة على الأقل');
      } else if (err.message === 'invalid_quantity') {
        showError('لا يمكن أن تتجاوز الكمية المرتجعة الكمية المتاحة');
      } else {
        showError(err?.response?.data?.detail || 'فشل إنشاء المرتجع');
      }
    },
  });

  const handleBarcodeScan = async (data: string, type: string) => {
    // Find product by SKU
    const found = (products || []).find((p) => p.sku === data);
    if (found) {
      setSelectedProductId(String(found.id));
      const confirmed = await showConfirmation({
        title: 'تم العثور على المنتج',
        message: `المنتج: ${found.name}`,
        confirmText: 'إضافة',
        cancelText: 'إلغاء',
      });
      if (confirmed && currentInvoiceId) {
        addItemMutation.mutate({
          invoiceId: currentInvoiceId,
          productId: found.id,
          qty: Number(itemQty) || 1,
          keepOpen: false,
        });
      }
    } else {
      showError(`لا يوجد منتج بالرمز: ${data}`);
    }
  };

  const handleConfirm = async (invoice: InvoiceItem) => {
    const confirmed = await showConfirmation({
      title: 'تأكيد الفاتورة',
      message: `هل تريد تأكيد فاتورة #${invoice.id}؟`,
      confirmText: 'تأكيد',
      cancelText: 'إلغاء',
    });
    if (confirmed) {
      confirmInvoiceMutation.mutate(invoice.id);
    }
  };

  const handleDelete = async (invoice: InvoiceItem) => {
    const confirmed = await showConfirmation({
      title: 'تأكيد الحذف',
      message: `هل تريد حذف فاتورة #${invoice.id}؟`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    if (confirmed) {
      deleteInvoiceMutation.mutate(invoice.id);
    }
  };

  const statusMap: Record<InvoiceItem['status'], { label: string; variant: 'info' | 'success' | 'destructive' }> = {
    draft: { label: 'مسودة', variant: 'info' },
    confirmed: { label: 'مؤكدة', variant: 'success' },
    cancelled: { label: 'ملغاة', variant: 'destructive' },
  };

  const statusFilterOptions: PickerOption[] = [
    { label: 'الكل', value: 'all' },
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

      {/* Search and Filter Section */}
      <View style={[styles.searchFilterContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {/* Search Input */}
        <View style={styles.searchWrapper}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={20} color={theme.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="ابحث برقم الفاتورة أو اسم العميل..."
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filterChipsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsContent}
          >
            {statusFilterOptions.map((option) => {
              const isSelected = statusFilter === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setStatusFilter(option.value as any)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? theme.softPalette.primary.main : theme.surfaceElevated,
                      borderColor: isSelected ? theme.softPalette.primary.main : theme.border,
                    }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? '#fff' : theme.textPrimary,
                      fontWeight: isSelected ? '600' : '500',
                    }
                  ]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.listWrapper}>
          <SectionHeader title="قائمة الفواتير" subtitle={isLoading ? 'جاري التحميل...' : `${filteredInvoices.length} فاتورة`} />
          
          {isLoading ? (
            <SkeletonList count={5} itemHeight={90} />
          ) : (
            <>
        {(filteredInvoices || []).map((invoice) => {
            const status = statusMap[invoice.status];
            const isDraft = invoice.status === 'draft';
          return (
              <TouchableOpacity 
                key={invoice.id}
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
            );
          })}
              {!filteredInvoices?.length && <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد فواتير</Text>}
            </>
          )}
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
                showError('يرجى اختيار عميل');
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
            style={[styles.scanButton, { backgroundColor: theme.softPalette.primary.main }]}
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
                      backgroundColor: isSelected ? theme.softPalette.primary.light : theme.surface,
                      borderColor: isSelected ? theme.softPalette.primary.main : theme.border,
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
            ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد {getProductsLabel()}</Text>}
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
            title="إضافة وإغلاق"
        onPress={() => {
              if (!selectedProductId || !currentInvoiceId) {
                showError('يرجى اختيار منتج');
                return;
              }
              addItemMutation.mutate({
                invoiceId: currentInvoiceId,
                productId: Number(selectedProductId),
                qty: Number(itemQty) || 1,
                keepOpen: false,
              });
            }}
            loading={addItemMutation.isPending}
          />
          <Button
            title="إضافة وإضافة آخر"
            variant="secondary"
            onPress={() => {
              if (!selectedProductId || !currentInvoiceId) {
                showError('يرجى اختيار منتج');
                return;
              }
              addItemMutation.mutate({
                invoiceId: currentInvoiceId,
                productId: Number(selectedProductId),
                qty: Number(itemQty) || 1,
                keepOpen: true,
              });
            }}
            loading={addItemMutation.isPending}
          />
          </View>
      </Modal>

      {/* Invoice Detail Modal */}
      <SimpleModal
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`تفاصيل فاتورة #${selectedInvoice?.id}`}
        size="large"
      >
        {selectedInvoice && (
          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedInvoice.customer_name}</Text>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>العميل</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.detailRow}>
                <AmountDisplay amount={selectedInvoice.total_amount} />
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>المبلغ الإجمالي</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.detailRow}>
                <SoftBadge label={statusMap[selectedInvoice.status].label} variant={statusMap[selectedInvoice.status].variant} />
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>الحالة</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.detailRow}>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{mergeDateTime(selectedInvoice.created_at)}</Text>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>التاريخ</Text>
              </View>
            </View>
            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.sectionLabel, { color: theme.textMuted, marginBottom: 12 }]}>{getProductsLabel()}:</Text>
                {selectedInvoice.items.map((item) => (
                  <View key={item.id} style={[styles.itemRow, { borderColor: theme.border, marginBottom: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.product_name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={[styles.itemQty, { color: theme.textMuted }]}>الكمية: {item.qty || 0}</Text>
                        <AmountDisplay amount={Number(item.price_at_add || 0)} />
                      </View>
                    </View>
                    {selectedInvoice.status === 'draft' && (
                      <TouchableOpacity
                        style={[styles.deleteItemButton, { backgroundColor: theme.softPalette.destructive?.light || '#fee' }]}
              onPress={async () => {
                          const confirmed = await showConfirmation({
                            title: 'حذف العنصر',
                            message: `هل تريد حذف ${item.product_name}؟`,
                            confirmText: 'حذف',
                            cancelText: 'إلغاء',
                            type: 'danger',
                          });
                          if (confirmed) {
                            removeItemMutation.mutate({ invoiceId: selectedInvoice.id, itemId: item.id });
                          }
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color={theme.softPalette.destructive?.main || '#f00'} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
            <View style={styles.actionsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted, marginBottom: 12 }]}>الإجراءات</Text>
              <View style={styles.actionsGrid}>
                {selectedInvoice.status === 'draft' && (
                  <View style={styles.actionRow}>
                    <Button
                      title="تأكيد"
                      variant="success"
                      onPress={() => {
                        handleConfirm(selectedInvoice);
                        setDetailOpen(false);
                      }}
                      style={styles.actionButton}
                    />
                    <Button
                      title="إضافة عنصر"
                      variant="secondary"
                      onPress={() => {
                        setCurrentInvoiceId(selectedInvoice.id);
                        setAddItemOpen(true);
                        setDetailOpen(false);
                      }}
                      style={styles.actionButton}
                    />
                  </View>
                )}
                <View style={styles.actionRow}>
                  <Button
                    title="طباعة"
                    variant="primary"
                    onPress={() => {
                      navigation.navigate('PrintInvoice', { id: selectedInvoice.id });
                      setDetailOpen(false);
                    }}
                    style={styles.actionButton}
                  />
                  {selectedInvoice.status === 'confirmed' && (
                    <Button
                      title="مرتجع"
                      variant="warning"
                      onPress={() => {
                        setReturnInvoice(selectedInvoice);
                setReturnInputs({});
                        setReturnOpen(true);
                        setDetailOpen(false);
              }}
                      style={styles.actionButton}
            />
                  )}
          </View>
                <Button
                  title="حذف الفاتورة"
                  variant="destructive"
                  onPress={() => {
                    handleDelete(selectedInvoice);
                    setDetailOpen(false);
                  }}
                />
        </View>
            </View>
          </ScrollView>
        )}
      </SimpleModal>

      {/* Return Modal */}
      <SimpleModal
        visible={returnOpen}
        onClose={() => setReturnOpen(false)}
        title={`مرتجع - فاتورة #${returnInvoice?.id}`}
        size="large"
      >
        <ScrollView style={styles.returnContent} showsVerticalScrollIndicator={false}>
          {/* Header Card with Gradient */}
          <View style={[
            styles.returnHeaderCard,
            { 
              backgroundColor: theme.softPalette.primary?.light || '#e3f2fd',
              borderColor: theme.softPalette.primary?.main || '#1976d2',
            }
          ]}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="receipt-outline" size={24} color={theme.softPalette.primary?.main || '#1976d2'} />
          </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerCustomerName, { color: theme.softPalette.primary?.main || '#1976d2' }]}>
                {returnInvoice?.customer_name}
              </Text>
              <Text style={[styles.headerInvoiceId, { color: theme.textMuted }]}>
                فاتورة رقم #{returnInvoice?.id}
              </Text>
        </View>
            <View style={[styles.headerStatusBadge, { backgroundColor: theme.softPalette.warning?.main || '#f9a825' }]}>
              <Text style={[styles.headerStatusText, { color: '#fff' }]}>مرتجع</Text>
            </View>
          </View>
          
          {/* Enhanced Return Summary */}
          {(() => {
            const totalItems = (invoiceDetailForReturn?.items || []).length;
            const returnableItems = (invoiceDetailForReturn?.items || []).filter((item: any) => {
              const sold = Number(item.qty || 0);
              const alreadyReturned = Number(returnedByItemId.get(item.id) || 0);
              const remaining = Math.max(0, sold - alreadyReturned);
              return remaining > 0;
            }).length;
            const selectedItems = Object.values(returnInputs).filter(v => v && Number(v) > 0).length;
            const totalSelectedQty = Object.values(returnInputs).reduce((sum, v) => sum + (Number(v) || 0), 0);
            
            return (
              <View style={[
                styles.enhancedReturnSummary, 
                { 
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 6,
                }
              ]}>
                <View style={styles.summaryHeader}>
                  <View style={[styles.summaryIconContainer, { backgroundColor: theme.softPalette.info?.light || '#e1f5fe' }]}>
                    <Ionicons name="analytics-outline" size={24} color={theme.softPalette.info?.main || '#0277bd'} />
                  </View>
                  <Text style={[styles.enhancedSummaryTitle, { color: theme.textPrimary }]}>ملخص المرتجع</Text>
                </View>
                
                <View style={styles.summaryGrid}>
                  <View style={[styles.summaryCard, { backgroundColor: theme.softPalette.info?.light || '#e1f5fe' }]}>
                    <Ionicons name="cube-outline" size={20} color={theme.softPalette.info?.main || '#0277bd'} />
                    <Text style={[styles.summaryCardValue, { color: theme.softPalette.info?.main || '#0277bd' }]}>{totalItems}</Text>
                    <Text style={[styles.summaryCardLabel, { color: theme.softPalette.info?.main || '#0277bd' }]}>إجمالي العناصر</Text>
                  </View>
                  
                  <View style={[styles.summaryCard, { backgroundColor: theme.softPalette.success?.light || '#e8f5e8' }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={theme.softPalette.success?.main || '#388e3c'} />
                    <Text style={[styles.summaryCardValue, { color: theme.softPalette.success?.main || '#388e3c' }]}>{returnableItems}</Text>
                    <Text style={[styles.summaryCardLabel, { color: theme.softPalette.success?.main || '#388e3c' }]}>قابلة للإرجاع</Text>
                  </View>
                  
                  <View style={[styles.summaryCard, { backgroundColor: theme.softPalette.warning?.light || '#fff8e1' }]}>
                    <Ionicons name="arrow-back-outline" size={20} color={theme.softPalette.warning?.main || '#f9a825'} />
                    <Text style={[styles.summaryCardValue, { color: theme.softPalette.warning?.main || '#f9a825' }]}>{selectedItems}</Text>
                    <Text style={[styles.summaryCardLabel, { color: theme.softPalette.warning?.main || '#f9a825' }]}>محددة للإرجاع</Text>
                  </View>
                  
                  <View style={[styles.summaryCard, { backgroundColor: theme.softPalette.primary?.light || '#e3f2fd' }]}>
                    <Ionicons name="calculator-outline" size={20} color={theme.softPalette.primary?.main || '#1976d2'} />
                    <Text style={[styles.summaryCardValue, { color: theme.softPalette.primary?.main || '#1976d2' }]}>{totalSelectedQty}</Text>
                    <Text style={[styles.summaryCardLabel, { color: theme.softPalette.primary?.main || '#1976d2' }]}>إجمالي الكمية</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Enhanced Items Section */}
          <View style={styles.itemsSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: theme.softPalette.primary?.light || '#e3f2fd' }]}>
                <Ionicons name="list-outline" size={20} color={theme.softPalette.primary?.main || '#1976d2'} />
              </View>
              <Text style={[styles.enhancedSectionLabel, { color: theme.textPrimary }]}>عناصر الفاتورة</Text>
            </View>
            
            {isLoadingReturnData ? (
              <SkeletonList count={3} itemHeight={140} />
            ) : (
              <>
                {(invoiceDetailForReturn?.items || []).map((item: any, index: number) => {
                  const sold = Number(item.qty || 0);
                  const alreadyReturned = Number(returnedByItemId.get(item.id) || 0);
                  const remaining = Math.max(0, sold - alreadyReturned);
                  const canReturn = remaining > 0;
                  const selectedQty = Number(returnInputs[item.id] || 0);
                  
                  return (
                    <View key={item.id} style={[
                      styles.enhancedReturnItem, 
                      { 
                        borderColor: canReturn 
                          ? (selectedQty > 0 ? theme.softPalette.success?.main || '#388e3c' : theme.softPalette.primary?.light || '#e3f2fd')
                          : theme.softPalette.destructive?.light || '#ffebee',
                        backgroundColor: canReturn 
                          ? (selectedQty > 0 ? theme.softPalette.success?.light || '#e8f5e8' : theme.surface)
                          : theme.softPalette.destructive?.light || '#ffebee',
                        opacity: canReturn ? 1 : 0.6,
                        transform: [{ scale: selectedQty > 0 ? 1.02 : 1 }],
                      }
                    ]}>
                      {/* Item Header */}
                      <View style={styles.itemHeader}>
                        <View style={[
                          styles.itemStatusIndicator,
                          { backgroundColor: canReturn ? theme.softPalette.success?.main || '#388e3c' : theme.softPalette.destructive?.main || '#d32f2f' }
                        ]}>
                          <Ionicons 
                            name={canReturn ? "checkmark-circle" : "close-circle"} 
                            size={16} 
                            color="#fff" 
                          />
                        </View>
                        <Text style={[
                          styles.enhancedItemName, 
                          { 
                            color: canReturn ? theme.textPrimary : theme.softPalette.destructive?.main || '#d32f2f',
                            textDecorationLine: canReturn ? 'none' : 'line-through'
                          }
                        ]}>
                          {item.product_name}
                        </Text>
                        {selectedQty > 0 && (
                          <View style={[styles.selectedBadge, { backgroundColor: theme.softPalette.success?.main || '#388e3c' }]}>
                            <Text style={[styles.selectedBadgeText, { color: '#fff' }]}>
                              {selectedQty} محدد
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Item Stats */}
                      <View style={styles.enhancedItemStats}>
                        <View style={[styles.statCard, { backgroundColor: theme.softPalette.info?.light || '#e1f5fe' }]}>
                          <Ionicons name="cube-outline" size={16} color={theme.softPalette.info?.main || '#0277bd'} />
                          <Text style={[styles.statCardValue, { color: theme.softPalette.info?.main || '#0277bd' }]}>{sold}</Text>
                          <Text style={[styles.statCardLabel, { color: theme.softPalette.info?.main || '#0277bd' }]}>مباع</Text>
                        </View>
                        
                        {alreadyReturned > 0 && (
                          <View style={[styles.statCard, { backgroundColor: theme.softPalette.warning?.light || '#fff8e1' }]}>
                            <Ionicons name="arrow-back-outline" size={16} color={theme.softPalette.warning?.main || '#f9a825'} />
                            <Text style={[styles.statCardValue, { color: theme.softPalette.warning?.main || '#f9a825' }]}>{alreadyReturned}</Text>
                            <Text style={[styles.statCardLabel, { color: theme.softPalette.warning?.main || '#f9a825' }]}>مرتجع</Text>
                          </View>
                        )}
                        
                        <View style={[
                          styles.statCard, 
                          { 
                            backgroundColor: canReturn 
                              ? (theme.softPalette.success?.light || '#e8f5e8') 
                              : (theme.softPalette.destructive?.light || '#ffebee')
                          }
                        ]}>
                          <Ionicons 
                            name={canReturn ? "checkmark-circle-outline" : "close-circle-outline"} 
                            size={16} 
                            color={canReturn ? theme.softPalette.success?.main || '#388e3c' : theme.softPalette.destructive?.main || '#d32f2f'} 
                          />
                          <Text style={[
                            styles.statCardValue, 
                            { 
                              color: canReturn 
                                ? (theme.softPalette.success?.main || '#388e3c') 
                                : (theme.softPalette.destructive?.main || '#d32f2f')
                            }
                          ]}>{remaining}</Text>
                          <Text style={[
                            styles.statCardLabel, 
                            { 
                              color: canReturn 
                                ? (theme.softPalette.success?.main || '#388e3c') 
                                : (theme.softPalette.destructive?.main || '#d32f2f')
                            }
                          ]}>متاح</Text>
                        </View>
                      </View>
                      
                      {/* Enhanced Input Section */}
                      <View style={styles.enhancedInputSection} pointerEvents="box-none">
                        {canReturn && (
                          <View style={styles.inputLabelContainer}>
                            <Ionicons name="checkmark-circle-outline" size={16} color={theme.softPalette.success?.main || '#388e3c'} />
                            <Text style={[styles.inputLabel, { color: theme.softPalette.success?.main || '#388e3c' }]}>
                              متاح للإرجاع: {remaining}
                            </Text>
                          </View>
                        )}
                        
                        <TextInput
                          placeholder="0"
                          value={returnInputs[item.id] ?? ''}
                          onChangeText={(v) => {
                            // السماح بكتابة أي رقم، حتى لو كان أكبر من المتاح
                            setReturnInputs((prev) => ({ ...prev, [item.id]: v }));
                          }}
                          keyboardType="numeric"
                          returnKeyType="done"
                          style={[
                            styles.enhancedInputWrapper,
                            { 
                              backgroundColor: canReturn 
                                ? (selectedQty > 0 ? theme.softPalette.success?.light || '#e8f5e8' : theme.surface)
                                : theme.softPalette.destructive?.light || '#ffebee',
                              borderColor: canReturn 
                                ? (selectedQty > 0 ? theme.softPalette.success?.main || '#388e3c' : theme.border)
                                : theme.softPalette.destructive?.main || '#d32f2f',
                              borderWidth: selectedQty > 0 ? 2 : 1,
                              width: canReturn ? 120 : 100,
                              height: 50,
                              textAlign: 'center',
                              fontSize: 20,
                              fontWeight: '700',
                              color: (() => {
                                const numValue = Number(returnInputs[item.id] || 0);
                                if (!canReturn) {
                                  return theme.softPalette.destructive?.main || '#d32f2f';
                                }
                                if (numValue > remaining) {
                                  return theme.softPalette.destructive?.main || '#d32f2f';
                                }
                                if (numValue > 0) {
                                  return theme.softPalette.success?.main || '#388e3c';
                                }
                                return theme.textPrimary;
                              })(),
                              textDecorationLine: (() => {
                                const numValue = Number(returnInputs[item.id] || 0);
                                return (canReturn && numValue > remaining) ? 'line-through' : 'none';
                              })(),
                            }
                          ]}
                          editable={canReturn}
                          maxLength={remaining.toString().length + 2}
                          autoFocus={false}
                          blurOnSubmit={true}
                        />
                        
                        {/* تحذير عند تجاوز الحد المسموح */}
                        {canReturn && (() => {
                          const numValue = Number(returnInputs[item.id] || 0);
                          return numValue > remaining && numValue > 0;
                        })() && (
                          <View style={[styles.warningContainer, { backgroundColor: theme.softPalette.destructive?.light || '#ffebee' }]}>
                            <Ionicons name="warning-outline" size={14} color={theme.softPalette.destructive?.main || '#d32f2f'} />
                            <Text style={[styles.warningText, { color: theme.softPalette.destructive?.main || '#d32f2f' }]}>
                              يتجاوز المتاح ({remaining})
                            </Text>
                          </View>
                        )}
                        
                        {!canReturn && (
                          <View style={[styles.noReturnContainer, { backgroundColor: theme.softPalette.destructive?.light || '#ffebee' }]}>
                            <Ionicons name="warning-outline" size={16} color={theme.softPalette.destructive?.main || '#d32f2f'} />
                            <Text style={[styles.noReturnText, { color: theme.softPalette.destructive?.main || '#d32f2f' }]}>
                              غير قابل للإرجاع
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
                {!(invoiceDetailForReturn?.items || []).length && !isLoadingReturnData && (
                  <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Ionicons name="receipt-outline" size={48} color={theme.textMuted} />
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد عناصر في هذه الفاتورة</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
        
        {/* Enhanced Action Buttons */}
        <View style={styles.enhancedButtonContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.enhancedCancelButton,
                { 
                  backgroundColor: theme.softPalette.destructive?.light || '#ffebee',
                  borderColor: theme.softPalette.destructive?.main || '#d32f2f',
                }
              ]}
              onPress={() => setReturnOpen(false)}
            >
              <Ionicons name="close-circle-outline" size={20} color={theme.softPalette.destructive?.main || '#d32f2f'} />
              <Text style={[styles.enhancedButtonText, { color: theme.softPalette.destructive?.main || '#d32f2f' }]}>
                إلغاء
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.enhancedSaveButton,
                { 
                  backgroundColor: Object.values(returnInputs).every(v => !v || Number(v) === 0)
                    ? theme.softPalette.destructive?.light || '#ffebee'
                    : theme.softPalette.success?.main || '#388e3c',
                  borderColor: Object.values(returnInputs).every(v => !v || Number(v) === 0)
                    ? theme.softPalette.destructive?.main || '#d32f2f'
                    : theme.softPalette.success?.main || '#388e3c',
                }
              ]}
              onPress={() => submitReturnMutation.mutate()}
              disabled={Object.values(returnInputs).every(v => !v || Number(v) === 0) || submitReturnMutation.isPending}
            >
              {submitReturnMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              )}
              <Text style={[styles.enhancedButtonText, { color: '#fff' }]}>
                {submitReturnMutation.isPending ? 'جاري الحفظ...' : 'حفظ المرتجع'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Quick Actions */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.softPalette.info?.light || '#e1f5fe' }]}
              onPress={() => {
                const newInputs: any = {};
                (invoiceDetailForReturn?.items || []).forEach((item: any) => {
                  const sold = Number(item.qty || 0);
                  const alreadyReturned = Number(returnedByItemId.get(item.id) || 0);
                  const remaining = Math.max(0, sold - alreadyReturned);
                  if (remaining > 0) {
                    newInputs[item.id] = remaining.toString();
                  }
                });
                setReturnInputs(newInputs);
              }}
            >
              <Ionicons name="arrow-up-outline" size={16} color={theme.softPalette.info?.main || '#0277bd'} />
              <Text style={[styles.quickActionText, { color: theme.softPalette.info?.main || '#0277bd' }]}>
                إرجاع الكل
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.softPalette.warning?.light || '#fff8e1' }]}
              onPress={() => setReturnInputs({})}
            >
              <Ionicons name="refresh-outline" size={16} color={theme.softPalette.warning?.main || '#f9a825'} />
              <Text style={[styles.quickActionText, { color: theme.softPalette.warning?.main || '#f9a825' }]}>
                مسح الكل
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SimpleModal>

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
  searchFilterContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchWrapper: {
    gap: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchIcon: {
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    textAlign: 'right',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  filterChipsContainer: {
    gap: 8,
  },
  filterChipsContent: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterChipText: {
    fontSize: 14,
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
    alignItems: 'flex-start',
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
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  divider: {
    height: 1,
  },
  actionsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#eee',
  },
  actionsGrid: {
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
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
    gap: 20,
  },
  // Enhanced Header Styles
  returnHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCustomerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerInvoiceId: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 16,
  },
  headerStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Enhanced Summary Styles
  enhancedReturnSummary: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  enhancedSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  summaryCardValue: {
    fontSize: 20,
    fontWeight: '700',
    marginVertical: 4,
  },
  summaryCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Enhanced Items Section
  itemsSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  enhancedSectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  // Enhanced Item Styles
  enhancedReturnItem: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemStatusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  enhancedItemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  selectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  enhancedItemStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  statCardValue: {
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 2,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Enhanced Input Section
  enhancedInputSection: {
    alignItems: 'center',
    width: '100%',
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
  enhancedInputWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noReturnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  noReturnText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  // Enhanced Button Styles
  enhancedButtonContainer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  enhancedCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 8,
  },
  enhancedSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginLeft: 8,
  },
  enhancedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },
  maxHint: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  deleteItemButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
