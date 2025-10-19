import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard, Pressable, RefreshControl, StyleSheet, Text, TextInput, View, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer, SectionHeader, Button, ListItem, Input, SoftBadge, AmountDisplay } from '@/components';
import { useTheme } from '@/theme';
import { SalesStackParamList } from '@/navigation/types';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany, useToast } from '@/context';

type Props = NativeStackScreenProps<SalesStackParamList, 'InvoiceCreate'>;

export const InvoiceCreateScreen: React.FC<Props> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { customerId, customerName, invoiceId: existingInvoiceId } = route.params;
  const { formatAmount } = useCompany();
  const { showSuccess, showError } = useToast();
  const qc = useQueryClient();

  // Step 1: create draft invoice immediately if not editing
  const [invoiceId, setInvoiceId] = useState<number | null>(existingInvoiceId || null);
  // Check if we're editing based on whether existingInvoiceId was provided
  const isEditMode = Boolean(existingInvoiceId);
  
  useEffect(() => {
    if (existingInvoiceId) {
      setInvoiceId(existingInvoiceId);
      return;
    }
    
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.post(endpoints.invoices, { customer: customerId });
        if (mounted) setInvoiceId(Number(res.data?.id));
      } catch {}
    })();
    return () => { mounted = false; };
  }, [customerId, existingInvoiceId]);

  // Product search and pick
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [qtyByProduct, setQtyByProduct] = useState<Record<number, string>>({});
  const [addingProducts, setAddingProducts] = useState<Set<number>>(new Set());
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
    onSuccess: (_, variables) => {
      showSuccess('تم إضافة المنتج للفاتورة');
      setAddingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.productId);
        return newSet;
      });
      if (selectedProductId) setQtyByProduct((prev) => ({ ...prev, [selectedProductId]: '1' }));
      qc.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] });
    },
    onError: (err: any, variables) => {
      showError(err?.response?.data?.detail || 'فشل في إضافة المنتج');
      setAddingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.productId);
        return newSet;
      });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: number) => {
      if (!invoiceId) throw new Error('no_invoice');
      const res = await apiClient.post(endpoints.invoiceRemoveItem(invoiceId), { item_id: itemId });
      return res.data;
    },
    onSuccess: () => {
      showSuccess('تم حذف العنصر من الفاتورة');
      qc.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] });
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || 'فشل في حذف العنصر');
    },
  });

  const confirm = useMutation({
    mutationFn: async () => {
      if (!invoiceId) throw new Error('no_invoice');
      await apiClient.post(endpoints.invoiceConfirm(invoiceId), {});
    },
    onSuccess: () => {
      showSuccess('تم تأكيد الفاتورة بنجاح');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] });
      navigation.goBack();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر تأكيد الفاتورة';
      showError(msg);
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
  
  // Get customer name from invoice detail if in edit mode
  const displayCustomerName = useMemo(() => {
    if (isEditMode && invoiceDetail) {
      return invoiceDetail.customer_name || customerName;
    }
    return customerName;
  }, [isEditMode, invoiceDetail, customerName]);

  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.textPrimary} />}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Enhanced Header */}
        <View style={[styles.enhancedHeader, { backgroundColor: theme.softPalette.primary?.light || '#e3f2fd', borderColor: theme.softPalette.primary?.main || '#1976d2' }]}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="receipt-outline" size={24} color={theme.softPalette.primary?.main || '#1976d2'} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.enhancedTitle, { color: theme.softPalette.primary?.main || '#1976d2' }]}>
              {isEditMode && invoiceId ? `تعديل فاتورة #${invoiceId}` : 'فاتورة جديدة'}
            </Text>
            <Text style={[styles.enhancedSubtitle, { color: theme.textMuted }]}>{displayCustomerName}</Text>
          </View>
          <SoftBadge label="مسودة" variant="info" />
        </View>

        {/* Added Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={20} color={theme.softPalette.success?.main || '#388e3c'} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>العناصر المضافة</Text>
            <SoftBadge label={`${(invoiceDetail?.items || []).length}`} variant="success" />
          </View>
          
          <View style={styles.addedItemsContainer}>
            {(invoiceDetail?.items || []).map((it: any) => (
              <View key={it.id} style={[styles.addedItemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.textPrimary }]}>{it.product_name}</Text>
                  <View style={styles.itemDetails}>
                      <SoftBadge label={`الكمية: ${Math.floor(Number(it.qty || 0))}`} variant="info" />
                    <AmountDisplay amount={Number(it.price_at_add || 0) * Number(it.qty || 0)} />
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: theme.softPalette.destructive?.light || '#fee' }]}
                  onPress={() => removeItem.mutate(it.id)}
                  disabled={removeItem.isPending}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.softPalette.destructive?.main || '#f00'} />
                </TouchableOpacity>
              </View>
            ))}
            {!(invoiceDetail?.items || []).length && (
              <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="basket-outline" size={32} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد عناصر مضافة بعد</Text>
              </View>
            )}
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="search-outline" size={20} color={theme.softPalette.info?.main || '#0277bd'} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>بحث عن منتج</Text>
          </View>
          
          <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textMuted} />
            <TextInput
              placeholder="اكتب اسم المنتج للبحث..."
              value={search}
              onChangeText={setSearch}
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholderTextColor={theme.textMuted}
            />
            {search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Products List */}
        {keyword && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube-outline" size={20} color={theme.softPalette.warning?.main || '#f9a825'} />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>المنتجات المتاحة</Text>
              <SoftBadge label={`${(products || []).length}`} variant="warning" />
            </View>
            
            <View style={styles.productsContainer}>
              {(products || []).map((p) => (
                <View key={p.id} style={[
                  styles.productCard, 
                  { 
                    backgroundColor: theme.surface,
                    borderColor: selectedProductId === p.id ? theme.softPalette.primary?.main || '#1976d2' : theme.border,
                    borderWidth: selectedProductId === p.id ? 2 : 1,
                  }
                ]}>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: theme.textPrimary }]}>{p.name}</Text>
                    <View style={styles.productDetails}>
                      <SoftBadge label={`متاح: ${p.stock_qty ?? 0}`} variant="info" />
                      {p.price && <AmountDisplay amount={Number(p.price)} />}
                    </View>
                  </View>
                  
                  <View style={styles.productActions}>
                    {/* Quantity Controls */}
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        onPress={() => {
                          const currentQty = Math.floor(Number(qtyByProduct[p.id] || 1));
                          if (currentQty > 1) {
                            setQtyByProduct((prev) => ({ ...prev, [p.id]: String(currentQty - 1) }));
                          }
                        }}
                        style={[
                          styles.qtyButton, 
                          { 
                            backgroundColor: theme.softPalette.destructive?.light || '#ffebee', 
                            borderColor: theme.softPalette.destructive?.main || '#d32f2f',
                            opacity: Math.floor(Number(qtyByProduct[p.id] || 1)) <= 1 ? 0.5 : 1,
                          }
                        ]}
                        disabled={Math.floor(Number(qtyByProduct[p.id] || 1)) <= 1}
                      >
                        <Ionicons name="remove" size={16} color={theme.softPalette.destructive?.main || '#d32f2f'} />
                      </TouchableOpacity>
                      
                      <TextInput
                        value={qtyByProduct[p.id] ?? '1'}
                        onChangeText={(v) => {
                          // السماح فقط بالأرقام الصحيحة (بدون فواصل عشرية)
                          const cleanValue = v.replace(/[^0-9]/g, '');
                          if (cleanValue === '' || cleanValue === '0') {
                            setQtyByProduct((prev) => ({ ...prev, [p.id]: '1' }));
                          } else {
                            setQtyByProduct((prev) => ({ ...prev, [p.id]: cleanValue }));
                          }
                        }}
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          // إخفاء الكيبورد عند الضغط على "تم"
                          Keyboard.dismiss();
                        }}
                        style={[
                          styles.qtyInput, 
                          { 
                            backgroundColor: theme.surface, 
                            borderColor: (() => {
                              const numValue = Math.floor(Number(qtyByProduct[p.id] || 0));
                              const maxQty = p.stock_qty || 0;
                              if (numValue > maxQty && numValue > 0) {
                                return theme.softPalette.destructive?.main || '#d32f2f';
                              }
                              return theme.border;
                            })(),
                            color: (() => {
                              const numValue = Math.floor(Number(qtyByProduct[p.id] || 0));
                              const maxQty = p.stock_qty || 0;
                              if (numValue > maxQty && numValue > 0) {
                                return theme.softPalette.destructive?.main || '#d32f2f';
                              }
                              return theme.textPrimary;
                            })(),
                          }
                        ]}
                        placeholder="1"
                        placeholderTextColor={theme.textMuted}
                      />
                      
                      <TouchableOpacity
                        onPress={() => {
                          const currentQty = Math.floor(Number(qtyByProduct[p.id] || 1));
                          setQtyByProduct((prev) => ({ ...prev, [p.id]: String(currentQty + 1) }));
                        }}
                        style={[
                          styles.qtyButton, 
                          { 
                            backgroundColor: theme.softPalette.success?.light || '#e8f5e8', 
                            borderColor: theme.softPalette.success?.main || '#388e3c',
                          }
                        ]}
                      >
                        <Ionicons name="add" size={16} color={theme.softPalette.success?.main || '#388e3c'} />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Add Button */}
                    <TouchableOpacity
                      onPress={() => {
                        const raw = qtyByProduct[p.id] || '1';
                        const q = Math.max(1, Math.floor(Number(raw)));
                        const maxQty = p.stock_qty || 0;
                        
                        if (q > maxQty) {
                          showError(`الكمية المطلوبة (${q}) تتجاوز المتاح في المخزن (${maxQty})`);
                          return;
                        }
                        
                        setAddingProducts(prev => new Set(prev).add(p.id));
                        addItem.mutate({ productId: p.id, qty: q });
                      }}
                      style={[
                        styles.addButton,
                        { 
                          backgroundColor: addingProducts.has(p.id) ? theme.softPalette.destructive?.light || '#ffebee' : theme.softPalette.primary?.main || '#1976d2',
                          opacity: addingProducts.has(p.id) ? 0.7 : 1,
                        }
                      ]}
                      disabled={addingProducts.has(p.id)}
                    >
                      {addingProducts.has(p.id) ? (
                        <Ionicons name="hourglass-outline" size={16} color="#fff" />
                      ) : (
                        <Ionicons name="add-circle-outline" size={16} color="#fff" />
                      )}
                      <Text style={styles.addButtonText}>إضافة</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Warning Message - في سطر منفصل */}
                  {(() => {
                    const numValue = Math.floor(Number(qtyByProduct[p.id] || 0));
                    const maxQty = p.stock_qty || 0;
                    if (numValue > maxQty && numValue > 0) {
                      return (
                        <View style={styles.warningContainer}>
                          <Ionicons name="warning-outline" size={14} color={theme.softPalette.destructive?.main || '#d32f2f'} />
                          <Text style={[styles.warningText, { color: theme.softPalette.destructive?.main || '#d32f2f' }]}>
                            يتجاوز المتاح ({maxQty})
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                </View>
              ))}
              
              {!products?.length && (
                <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Ionicons name="search-outline" size={32} color={theme.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد منتجات مطابقة للبحث</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.totalCard, { backgroundColor: theme.softPalette.success?.light || '#e8f5e8', borderColor: theme.softPalette.success?.main || '#388e3c' }]}>
            <View style={styles.totalInfo}>
              <Ionicons name="calculator-outline" size={20} color={theme.softPalette.success?.main || '#388e3c'} />
              <Text style={[styles.totalLabel, { color: theme.softPalette.success?.main || '#388e3c' }]}>الإجمالي</Text>
            </View>
            <AmountDisplay amount={totalAmount} />
          </View>
          
          <Button 
            title="تأكيد الفاتورة" 
            onPress={() => confirm.mutate()} 
            loading={confirm.isPending} 
            disabled={!invoiceId || !(invoiceDetail?.items || []).length}
            style={styles.confirmButton}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Enhanced Header
  enhancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  enhancedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  enhancedSubtitle: {
    fontSize: 14,
  },
  
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  
  // Added Items
  addedItemsContainer: {
    gap: 8,
  },
  addedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  
  // Products
  productsContainer: {
    gap: 12,
  },
  productCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  productInfo: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // Quantity Controls
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: 60,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Warning Message
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    gap: 4,
    justifyContent: 'center',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Footer
  footer: {
    marginTop: 20,
    gap: 12,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  totalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    marginTop: 8,
  },
  
  // Legacy styles (keeping for compatibility)
  header: { gap: 6, alignItems: 'flex-start' },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'right' },
  subtitle: { fontSize: 14, textAlign: 'right' },
  stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
});


