import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View, TouchableOpacity, Modal as RNModal, ScrollView } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  ScreenContainer,
  SectionHeader,
  SoftBadge,
  Input,
  ListItem,
  AmountDisplay,
  Button,
  FloatingActionButton,
  BarcodeScanner,
  Modal,
  SimpleModal,
  Picker,
  Skeleton,
  SkeletonList,
  LoadingSpinner,
  type PickerOption,
} from '@/components';
import { useCompany, useToast, useConfirmation } from '@/context';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';

interface ProductItem {
  id: number;
  name: string;
  sku?: string;
  category?: number;
  category_name?: string;
  stock_qty: number;
  price: number | string;
  unit?: string;
  unit_display?: string;
  cost_price?: number | string;
  wholesale_price?: number | string;
  retail_price?: number | string;
  description?: string;
  archived?: boolean;
}

interface Category {
  id: number;
  name: string;
}

const parseNumber = (value: number | string | undefined | null): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const ProductsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatAmount, getProductsLabel } = useCompany();
  const { showSuccess, showError } = useToast();
  const { showConfirmation } = useConfirmation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: undefined as number | undefined,
    price: '',
    stock_qty: '',
    unit: 'piece',
    cost_price: '',
    wholesale_price: '',
    retail_price: '',
    description: '',
  });

  // Barcode scanning
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanMode, setScanMode] = useState<'search' | 'add'>('search');

  // Product detail view
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  useEffect(() => {
    if (route?.params?.openAdd) {
      resetForm();
      setFormOpen(true);
      navigation.setParams({ openAdd: undefined });
    }
  }, [route?.params?.openAdd, navigation]);

  const { data: products, isLoading, refetch, isRefetching } = useQuery<ProductItem[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products, { params: { page: 1, archived: false } });
      const normalized = normalizeListResponse<ProductItem>(res.data);
      return normalized.results;
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.categories);
      const normalized = normalizeListResponse<Category>(res.data);
      return normalized.results;
    },
  });

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products || [];
    const keyword = search.trim().toLowerCase();
    return (products || []).filter(
      (product) =>
        product.name.toLowerCase().includes(keyword) ||
        (product.sku || '').toLowerCase().includes(keyword) ||
        (product.category_name || '').toLowerCase().includes(keyword)
    );
  }, [products, search]);

  const totalInventoryValue = useMemo(() => {
    return (products || []).reduce((sum, product) => sum + parseNumber(product.price) * Number(product.stock_qty || 0), 0);
  }, [products]);

  const categoryOptions: PickerOption[] = useMemo(() => {
    return (categories || []).map((cat) => ({ label: cat.name, value: cat.id }));
  }, [categories]);

  const unitOptions: PickerOption[] = [
    { label: 'عدد', value: 'piece' },
    { label: 'متر', value: 'meter' },
    { label: 'كيلو', value: 'kg' },
    { label: 'لتر', value: 'liter' },
    { label: 'صندوق', value: 'box' },
    { label: 'عبوة', value: 'pack' },
    { label: 'لفة', value: 'roll' },
    { label: 'ورقة', value: 'sheet' },
    { label: 'أخرى', value: 'other' },
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: undefined,
      price: '',
      stock_qty: '',
      unit: 'piece',
      cost_price: '',
      wholesale_price: '',
      retail_price: '',
      description: '',
    });
    setEditingProduct(null);
    setShowAdvanced(false);
  };

  const openEditForm = (product: ProductItem) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || undefined,
      price: String(product.price || ''),
      stock_qty: String(product.stock_qty || ''),
      unit: product.unit || 'piece',
      cost_price: String(product.cost_price || ''),
      wholesale_price: String(product.wholesale_price || ''),
      retail_price: String(product.retail_price || ''),
      description: product.description || '',
    });
    setFormOpen(true);
  };

  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post(endpoints.products, payload);
      return res.data;
    },
    onSuccess: () => {
      showSuccess(`تم إضافة ${getProductsLabel()} بنجاح`);
      setFormOpen(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || `فشل إضافة ${getProductsLabel()}`);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiClient.patch(endpoints.productDetail(id), data);
      return res.data;
    },
    onSuccess: () => {
      showSuccess(`تم تحديث ${getProductsLabel()} بنجاح`);
      setFormOpen(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || `فشل تحديث ${getProductsLabel()}`);
    },
  });

  const archiveProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.productArchive(id), {});
      return res.data;
    },
    onSuccess: () => {
      showSuccess(`تم أرشفة ${getProductsLabel()} بنجاح`);
      refetch();
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || `فشل أرشفة ${getProductsLabel()}`);
    },
  });

  const handleSave = () => {
    const name = formData.name.trim();
    if (!name || !formData.category || !formData.price || !formData.stock_qty) {
      showError(`يرجى ملء جميع الحقول المطلوبة ${getProductsLabel()}`);
      return;
    }

    const payload: any = {
      name,
      category: Number(formData.category),
      price: Number(formData.price),
      stock_qty: Number(formData.stock_qty),
      unit: formData.unit,
    };

    if (formData.sku.trim()) payload.sku = formData.sku.trim();
    if (formData.cost_price.trim()) payload.cost_price = Number(formData.cost_price);
    if (formData.wholesale_price.trim()) payload.wholesale_price = Number(formData.wholesale_price);
    if (formData.retail_price.trim()) payload.retail_price = Number(formData.retail_price);
    if (formData.description.trim()) payload.description = formData.description.trim();

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createProductMutation.mutate(payload);
    }
  };

  const handleBarcodeScan = (data: string, type: string) => {
    if (scanMode === 'search') {
      // Search for product by SKU
      setSearch(data);
      const found = (products || []).find((p) => p.sku === data);
      if (found) {
        setSelectedProduct(found);
        setDetailOpen(true);
      } else {
        showError(`لا يوجد ${getProductsLabel()} بالرمز: ${data}`);
      }
    } else {
      // Add product with scanned SKU
      resetForm();
      setFormData((prev) => ({ ...prev, sku: data }));
      setFormOpen(true);
    }
  };

  const handleArchive = async (product: ProductItem) => {
    const confirmed = await showConfirmation({
      title: 'تأكيد الأرشفة',
      message: `هل تريد أرشفة ${getProductsLabel()} "${product.name}"؟`,
      confirmText: 'أرشفة',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    
    if (confirmed) {
      archiveProductMutation.mutate(product.id);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'نفذ', variant: 'destructive' as const };
    if (stock <= 5) return { label: 'منخفض', variant: 'warning' as const };
    return { label: 'متوفر', variant: 'success' as const };
  };

  return (
    <>
      <ScreenContainer
        refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />}
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>إدارة {getProductsLabel()}</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>تتبع {getProductsLabel()} ومستويات المخزون</Text>
        </View>

        <View style={styles.summaryRow}>
          <SoftBadge label={`الإجمالي: ${products?.length || 0} ${getProductsLabel(products?.length || 0)}`} variant="info" />
          <SoftBadge label={`قيمة المخزون: ${formatAmount(totalInventoryValue)}`} variant="success" />
        </View>

        {/* Search Bar with Barcode Button */}
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: theme.softPalette.primary.main }]}
            onPress={() => {
              setScanMode('search');
              setScannerVisible(true);
            }}
          >
            <Ionicons name="barcode-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Input placeholder={`ابحث باسم ${getProductsLabel()} أو الرمز`} value={search} onChangeText={setSearch} autoCorrect={false} />
          </View>
        </View>

        <View style={styles.listWrapper}>
          <SectionHeader title={getProductsLabel()} subtitle={isLoading ? 'جاري التحميل...' : `${filteredProducts.length} ${getProductsLabel(filteredProducts.length)}`} />
          
          {isLoading ? (
            <SkeletonList count={6} itemHeight={80} />
          ) : (
            <>
              {(filteredProducts || []).map((product) => {
                const stockStatus = getStockStatus(product.stock_qty);
                return (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => {
                      setSelectedProduct(product);
                      setDetailOpen(true);
                    }}
                  >
                    <ListItem
                      title={product.name}
                      subtitle={`${product.sku ? `رمز: ${product.sku} • ` : ''}متوفر: ${product.stock_qty}`}
                      meta={<AmountDisplay amount={parseNumber(product.price)} /> as any}
                      right={<SoftBadge label={stockStatus.label} variant={stockStatus.variant} />}
                    />
                  </TouchableOpacity>
                );
              })}
              {!filteredProducts?.length && <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد {getProductsLabel()}</Text>}
            </>
          )}
        </View>

      </ScreenContainer>

      {/* Barcode Scanner */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleBarcodeScan}
        title={scanMode === 'search' ? 'مسح للبحث' : 'مسح لإضافة منتج'}
      />

      {/* Product Form Modal */}
      <SimpleModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingProduct ? `تعديل ${getProductsLabel()}` : `إضافة ${getProductsLabel()}`}
        size="large"
      >
        <Input
          label={`اسم ${getProductsLabel()} *`}
          placeholder={`اسم ${getProductsLabel()}`}
          value={formData.name}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
        />

        <Input
          label="الرمز (SKU)"
          placeholder="اختياري"
          value={formData.sku}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, sku: text }))}
          leading={
            <TouchableOpacity
              onPress={() => {
                console.log('Barcode button pressed');
                setFormOpen(false);
                setTimeout(() => {
                  setScanMode('add');
                  setScannerVisible(true);
                }, 100);
              }}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Scan barcode"
            >
              <Ionicons name="barcode-outline" size={18} color={theme.softPalette.primary.main} />
            </TouchableOpacity>
          }
        />

        <Picker
          label="الفئة *"
          placeholder={`اختر فئة  ${getProductsLabel()}`}
          value={formData.category?.toString() || ''}
          onChange={(value) => setFormData((prev) => ({ ...prev, category: value ? parseInt(value as string) : undefined }))}
          options={
            categories?.map((cat) => ({
              label: cat.name,
              value: cat.id.toString(),
            })) || []
          }
        />

        <Picker
          label="الوحدة"
          placeholder="اختر الوحدة"
          value={formData.unit || ''}
          onChange={(value) => setFormData((prev) => ({ ...prev, unit: value as string }))}
          options={[
            { label: 'عدد', value: 'piece' },
            { label: 'متر', value: 'meter' },
            { label: 'كيلو', value: 'kg' },
            { label: 'لتر', value: 'liter' },
            { label: 'صندوق', value: 'box' },
            { label: 'عبوة', value: 'pack' },
            { label: 'لفة', value: 'roll' },
            { label: 'ورقة', value: 'sheet' },
            { label: 'أخرى', value: 'other' },
          ]}
        />

        <Input
          label="السعر *"
          placeholder="0.00"
          value={formData.price}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, price: text }))}
          keyboardType="decimal-pad"
        />

        <Input
          label="الكمية في المخزون *"
          placeholder="0"
          value={formData.stock_qty}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, stock_qty: text }))}
          keyboardType="number-pad"
        />

        {/* Advanced Options */}
        <Button
          title={showAdvanced ? 'إخفاء الخيارات المتقدمة' : 'خيارات متقدمة'}
          variant="secondary"
          onPress={() => setShowAdvanced(!showAdvanced)}
        />

        {showAdvanced && (
          <>
            <Input
              label="سعر التكلفة"
              placeholder="اختياري"
              value={formData.cost_price}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, cost_price: text }))}
              keyboardType="decimal-pad"
            />
            <Input
              label="سعر الجملة"
              placeholder="اختياري"
              value={formData.wholesale_price}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, wholesale_price: text }))}
              keyboardType="decimal-pad"
            />
            <Input
              label="سعر التجزئة"
              placeholder="اختياري"
              value={formData.retail_price}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, retail_price: text }))}
              keyboardType="decimal-pad"
            />
            <Input
              label="الوصف"
              placeholder="اختياري"
              value={formData.description}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
              multiline
            />
          </>
        )}

        <View style={styles.buttonRow}>
          <Button title="إلغاء" variant="secondary" onPress={() => setFormOpen(false)} />
          <Button
            title={editingProduct ? 'تحديث' : 'حفظ'}
            onPress={handleSave}
            loading={createProductMutation.isPending || updateProductMutation.isPending}
          />
        </View>
      </SimpleModal>

      {/* Product Detail Modal */}
      <SimpleModal
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`تفاصيل ${getProductsLabel()}`}
        size="medium"
      >
        {selectedProduct && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedProduct.name}</Text>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>{`الاسم ${getProductsLabel()}`}</Text>
              </View>
              
              {selectedProduct.sku && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedProduct.sku}</Text>
                    <Text style={[styles.detailLabel, { color: theme.textMuted }]}>الرمز</Text>
                  </View>
                </>
              )}
              
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.detailRow}>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedProduct.category_name || '-'}</Text>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>الفئة</Text>
              </View>
              
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.detailRow}>
                <AmountDisplay amount={parseNumber(selectedProduct.price)} />
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>السعر</Text>
              </View>
              
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.detailRow}>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedProduct.stock_qty}</Text>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>المخزون</Text>
              </View>
              
              {selectedProduct.unit_display && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedProduct.unit_display}</Text>
                    <Text style={[styles.detailLabel, { color: theme.textMuted }]}>الوحدة</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.actionsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted, marginBottom: 12 }]}>الإجراءات</Text>
              <View style={styles.actionsGrid}>
                <View style={styles.actionRow}>
                  <Button 
                    title="تعديل" 
                    variant="primary" 
                    onPress={() => {
                      setDetailOpen(false);
                      openEditForm(selectedProduct);
                    }}
                    style={styles.actionButton}
                  />
                  <Button 
                    title="أرشفة" 
                    variant="destructive" 
                    onPress={() => {
                      setDetailOpen(false);
                      handleArchive(selectedProduct);
                    }}
                    style={styles.actionButton}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </SimpleModal>
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
  summaryRow: {
    gap: 6,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  scanButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    paddingRight: 8,
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
    marginTop: 8,
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
