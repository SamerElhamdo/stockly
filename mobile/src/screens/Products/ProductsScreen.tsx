import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
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
  Picker,
  type PickerOption,
} from '@/components';
import { useCompany } from '@/context';
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
  const { formatAmount } = useCompany();
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
    category: '',
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
      category: '',
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
      category: product.category ? String(product.category) : '',
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
      Alert.alert('نجح', 'تم إضافة المنتج بنجاح');
      setFormOpen(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل إضافة المنتج');
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiClient.patch(endpoints.productDetail(id), data);
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم تحديث المنتج بنجاح');
      setFormOpen(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل تحديث المنتج');
    },
  });

  const archiveProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.productArchive(id), {});
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم أرشفة المنتج');
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل أرشفة المنتج');
    },
  });

  const handleSave = () => {
    const name = formData.name.trim();
    if (!name || !formData.category || !formData.price || !formData.stock_qty) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
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
        Alert.alert('لم يتم العثور', `لا يوجد منتج بالرمز: ${data}`);
      }
    } else {
      // Add product with scanned SKU
      resetForm();
      setFormData((prev) => ({ ...prev, sku: data }));
      setFormOpen(true);
    }
  };

  const handleArchive = (product: ProductItem) => {
    Alert.alert('تأكيد', `هل تريد أرشفة المنتج "${product.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'أرشفة', style: 'destructive', onPress: () => archiveProductMutation.mutate(product.id) },
    ]);
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
          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>إدارة المنتجات</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>تتبع المنتجات ومستويات المخزون</Text>
        </View>

        <View style={styles.summaryRow}>
          <SoftBadge label={`الإجمالي: ${products?.length || 0} منتج`} variant="info" />
          <SoftBadge label={`قيمة المخزون: ${formatAmount(totalInventoryValue)}`} variant="success" />
        </View>

        {/* Search Bar with Barcode Button */}
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              setScanMode('search');
              setScannerVisible(true);
            }}
          >
            <Ionicons name="barcode-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Input placeholder="ابحث باسم المنتج أو الرمز" value={search} onChangeText={setSearch} autoCorrect={false} />
          </View>
        </View>

        <View style={styles.listWrapper}>
          <SectionHeader title="المنتجات" subtitle={`${filteredProducts.length} منتج`} />
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
          {!filteredProducts?.length && <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد منتجات</Text>}
        </View>

        <FloatingActionButton icon="add" onPress={() => {
          resetForm();
          setFormOpen(true);
        }} />
      </ScreenContainer>

      {/* Barcode Scanner */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleBarcodeScan}
        title={scanMode === 'search' ? 'مسح للبحث' : 'مسح لإضافة منتج'}
      />

      {/* Product Form Modal */}
      <Modal visible={formOpen} onClose={() => setFormOpen(false)} title={editingProduct ? 'تعديل منتج' : 'إضافة منتج'} size="large">
        <Input
          label="اسم المنتج *"
          placeholder="اسم المنتج"
          value={formData.name}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="الرمز (SKU)"
              placeholder="اختياري"
              value={formData.sku}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, sku: text }))}
            />
          </View>
          <TouchableOpacity
            style={[styles.scanIconButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              setScanMode('add');
              setScannerVisible(true);
            }}
          >
            <Ionicons name="barcode-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <Picker
          label="الفئة *"
          placeholder="اختر الفئة"
          options={categoryOptions}
          value={formData.category}
          onChange={(value) => setFormData((prev) => ({ ...prev, category: String(value) }))}
        />

        <Picker
          label="الوحدة"
          placeholder="اختر الوحدة"
          options={unitOptions}
          value={formData.unit}
          onChange={(value) => setFormData((prev) => ({ ...prev, unit: String(value) }))}
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
      </Modal>

      {/* Product Detail Modal */}
      <Modal visible={detailOpen} onClose={() => setDetailOpen(false)} title="تفاصيل المنتج" size="medium">
        {selectedProduct && (
          <View style={styles.detailContent}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>الاسم:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedProduct.name}</Text>
            </View>
            {selectedProduct.sku && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>الرمز:</Text>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedProduct.sku}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>الفئة:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedProduct.category_name || '-'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>السعر:</Text>
              <AmountDisplay amount={parseNumber(selectedProduct.price)} />
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textMuted }]}>المخزون:</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedProduct.stock_qty}</Text>
            </View>
            {selectedProduct.unit_display && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>الوحدة:</Text>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedProduct.unit_display}</Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <Button title="تعديل" variant="secondary" onPress={() => {
                setDetailOpen(false);
                openEditForm(selectedProduct);
              }} />
              <Button title="أرشفة" variant="destructive" onPress={() => {
                setDetailOpen(false);
                handleArchive(selectedProduct);
              }} />
            </View>
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
  scanIconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  listWrapper: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
});
