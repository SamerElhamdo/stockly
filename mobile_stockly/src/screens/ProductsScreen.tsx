import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  ActivityIndicator,
  Appbar,
  Searchbar,
  FAB,
  Chip,
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../config/api';

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock_qty: number;
  category_name?: string;
  unit_display?: string;
  measurement?: string;
}

interface Category {
  id: number;
  name: string;
}

export default function ProductsScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    price: '',
    stock_qty: '',
    category: '',
    unit: 'piece',
    measurement: '',
  });
  const { token } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, products]);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        apiRequest('/api/products/', {}, token!),
        apiRequest('/api/categories/', {}, token!),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.price) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المنتج والسعر');
      return;
    }

    try {
      const productData = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        stock_qty: parseInt(newProduct.stock_qty) || 0,
        category: parseInt(newProduct.category) || null,
      };

      await apiRequest('/api/products/add/', {
        method: 'POST',
        body: JSON.stringify(productData),
      }, token!);

      setAddDialogVisible(false);
      setNewProduct({
        name: '',
        sku: '',
        price: '',
        stock_qty: '',
        category: '',
        unit: 'piece',
        measurement: '',
      });
      loadData();
      Alert.alert('نجح', 'تم إضافة المنتج بنجاح');
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('خطأ', 'حدث خطأ في إضافة المنتج');
    }
  };

  const getStockColor = (stock: number) => {
    if (stock <= 5) return '#ef4444';
    if (stock <= 20) return '#f59e0b';
    return '#10b981';
  };

  const getStockText = (stock: number) => {
    if (stock <= 5) return 'منخفض';
    if (stock <= 20) return 'متوسط';
    return 'جيد';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>جاري تحميل المنتجات...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="إدارة المنتجات" />
        <Appbar.Action
          icon="tag"
          onPress={() => navigation.navigate('Categories')}
        />
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="البحث بالاسم أو SKU..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <Card key={product.id} style={styles.productCard}>
                <Card.Content>
                  <View style={styles.productHeader}>
                    <View style={styles.productInfo}>
                      <Title style={styles.productName}>{product.name}</Title>
                      <Paragraph style={styles.productSku}>SKU: {product.sku}</Paragraph>
                      {product.category_name && (
                        <Paragraph style={styles.productCategory}>
                          📂 {product.category_name}
                        </Paragraph>
                      )}
                    </View>
                    <View style={styles.productPrice}>
                      <Title style={styles.priceText}>{product.price.toLocaleString()} $</Title>
                    </View>
                  </View>

                  <View style={styles.productDetails}>
                    <View style={styles.stockInfo}>
                      <Chip
                        style={[
                          styles.stockChip,
                          { backgroundColor: getStockColor(product.stock_qty) },
                        ]}
                        textStyle={{ color: 'white' }}
                      >
                        {product.stock_qty} {product.unit_display || 'قطعة'}
                      </Chip>
                      <Paragraph style={styles.stockStatus}>
                        {getStockText(product.stock_qty)}
                      </Paragraph>
                    </View>

                    {product.measurement && (
                      <Paragraph style={styles.measurement}>
                        📏 {product.measurement}
                      </Paragraph>
                    )}
                  </View>

                  <View style={styles.productActions}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        Alert.alert('قريباً', 'تعديل المنتج قيد التطوير');
                      }}
                      style={styles.actionButton}
                      icon="pencil"
                    >
                      تعديل
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => {
                        Alert.alert('قريباً', 'إنشاء QR Code قيد التطوير');
                      }}
                      style={styles.actionButton}
                      icon="qrcode"
                    >
                      QR Code
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <View style={styles.emptyContainer}>
                  <Ionicons name="cube-outline" size={64} color="#ccc" />
                  <Title style={styles.emptyTitle}>لا توجد منتجات</Title>
                  <Paragraph style={styles.emptyText}>
                    {searchQuery ? 'لا توجد نتائج للبحث' : 'لم يتم إضافة أي منتجات بعد'}
                  </Paragraph>
                </View>
              </Card.Content>
            </Card>
          )}
        </ScrollView>
      </View>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setAddDialogVisible(true)}
      />

      <Portal>
        <Dialog visible={addDialogVisible} onDismiss={() => setAddDialogVisible(false)}>
          <Dialog.Title>إضافة منتج جديد</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={styles.dialogContent}>
              <TextInput
                label="اسم المنتج *"
                value={newProduct.name}
                onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                mode="outlined"
                style={styles.dialogInput}
              />
              <TextInput
                label="SKU (اختياري)"
                value={newProduct.sku}
                onChangeText={(text) => setNewProduct({ ...newProduct, sku: text })}
                mode="outlined"
                style={styles.dialogInput}
              />
              <TextInput
                label="السعر *"
                value={newProduct.price}
                onChangeText={(text) => setNewProduct({ ...newProduct, price: text })}
                mode="outlined"
                style={styles.dialogInput}
                keyboardType="numeric"
              />
              <TextInput
                label="الكمية في المخزون"
                value={newProduct.stock_qty}
                onChangeText={(text) => setNewProduct({ ...newProduct, stock_qty: text })}
                mode="outlined"
                style={styles.dialogInput}
                keyboardType="numeric"
              />
              <TextInput
                label="القياس (اختياري)"
                value={newProduct.measurement}
                onChangeText={(text) => setNewProduct({ ...newProduct, measurement: text })}
                mode="outlined"
                style={styles.dialogInput}
              />
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)}>إلغاء</Button>
            <Button onPress={handleAddProduct}>إضافة</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchbar: {
    marginBottom: 16,
  },
  productCard: {
    marginBottom: 12,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#2563eb',
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 20,
    color: '#10b981',
    fontWeight: 'bold',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockChip: {
    marginRight: 8,
  },
  stockStatus: {
    fontSize: 12,
    color: '#666',
  },
  measurement: {
    fontSize: 12,
    color: '#666',
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  emptyCard: {
    marginTop: 50,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    marginTop: 16,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  dialogContent: {
    maxHeight: 400,
  },
  dialogInput: {
    marginBottom: 12,
  },
});