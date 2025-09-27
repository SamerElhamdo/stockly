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
  Chip,
  Dialog,
  Portal,
  TextInput,
  List,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../config/api';

interface InvoiceItem {
  id: number;
  name: string;
  sku: string;
  qty: number;
  price: number;
  line_total: number;
  unit_display?: string;
  measurement?: string;
}

interface Invoice {
  id: number;
  customer: {
    id: number;
    name: string;
    phone?: string;
  };
  status: string;
  items: InvoiceItem[];
  total_amount: number;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock_qty: number;
}

export default function InvoiceDetailScreen({ navigation, route }: any) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addItemDialogVisible, setAddItemDialogVisible] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const { token } = useAuth();
  const { sessionId } = route.params;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoiceData, productsData] = await Promise.all([
        apiRequest(`/api/invoices/${sessionId}`, {}, token!),
        apiRequest('/api/products/', {}, token!),
      ]);

      setInvoice(invoiceData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddItem = async () => {
    if (!selectedProduct || !quantity) {
      Alert.alert('خطأ', 'يرجى اختيار المنتج والكمية');
      return;
    }

    try {
      await apiRequest(`/api/invoices/${sessionId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedProduct.id,
          qty: parseFloat(quantity),
        }),
      }, token!);

      setAddItemDialogVisible(false);
      setSelectedProduct(null);
      setQuantity('1');
      setProductSearchQuery('');
      loadData();
      Alert.alert('نجح', 'تم إضافة المنتج للفاتورة');
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('خطأ', 'حدث خطأ في إضافة المنتج');
    }
  };

  const handleConfirmInvoice = async () => {
    if (!invoice || invoice.items.length === 0) {
      Alert.alert('خطأ', 'لا يمكن تأكيد فاتورة فارغة');
      return;
    }

    Alert.alert(
      'تأكيد الفاتورة',
      'هل أنت متأكد من تأكيد هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          onPress: async () => {
            try {
              await apiRequest(`/api/invoices/${sessionId}/confirm`, {
                method: 'POST',
              }, token!);

              loadData();
              Alert.alert('نجح', 'تم تأكيد الفاتورة بنجاح');
            } catch (error) {
              console.error('Error confirming invoice:', error);
              Alert.alert('خطأ', 'حدث خطأ في تأكيد الفاتورة');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'draft': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'مؤكدة';
      case 'draft': return 'مسودة';
      case 'cancelled': return 'ملغاة';
      default: return status;
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>جاري تحميل الفاتورة...</Paragraph>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Title style={styles.errorTitle}>خطأ في تحميل الفاتورة</Title>
        <Button onPress={() => navigation.goBack()}>العودة</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={`فاتورة #${invoice.id}`} />
      </Appbar.Header>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Invoice Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.invoiceHeader}>
              <View>
                <Title>فاتورة #{invoice.id}</Title>
                <Paragraph>العميل: {invoice.customer.name}</Paragraph>
                {invoice.customer.phone && (
                  <Paragraph>📞 {invoice.customer.phone}</Paragraph>
                )}
                <Paragraph>التاريخ: {new Date(invoice.created_at).toLocaleDateString('ar-SA')}</Paragraph>
              </View>
              <Chip
                style={[
                  styles.statusChip,
                  { backgroundColor: getStatusColor(invoice.status) },
                ]}
                textStyle={{ color: 'white' }}
              >
                {getStatusText(invoice.status)}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Invoice Items */}
        <Card style={styles.itemsCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>عناصر الفاتورة</Title>
            {invoice.items.length > 0 ? (
              invoice.items.map((item) => (
                <View key={item.id} style={styles.invoiceItem}>
                  <View style={styles.itemInfo}>
                    <Paragraph style={styles.itemName}>{item.name}</Paragraph>
                    <Paragraph style={styles.itemSku}>SKU: {item.sku}</Paragraph>
                    {item.unit_display && (
                      <Paragraph style={styles.itemUnit}>الوحدة: {item.unit_display}</Paragraph>
                    )}
                    {item.measurement && (
                      <Paragraph style={styles.itemMeasurement}>القياس: {item.measurement}</Paragraph>
                    )}
                  </View>
                  <View style={styles.itemDetails}>
                    <Paragraph style={styles.itemQty}>{item.qty} × {item.price.toLocaleString()} $</Paragraph>
                    <Paragraph style={styles.itemTotal}>{item.line_total.toLocaleString()} $</Paragraph>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyItems}>
                <Ionicons name="cube-outline" size={48} color="#ccc" />
                <Paragraph style={styles.emptyText}>لا توجد منتجات في الفاتورة</Paragraph>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Total */}
        <Card style={styles.totalCard}>
          <Card.Content>
            <View style={styles.totalRow}>
              <Title style={styles.totalLabel}>المجموع الكلي</Title>
              <Title style={styles.totalAmount}>{invoice.total_amount.toLocaleString()} $</Title>
            </View>
          </Card.Content>
        </Card>

        {/* Actions */}
        {invoice.status === 'draft' && (
          <View style={styles.actionsContainer}>
            <Button
              mode="outlined"
              onPress={() => setAddItemDialogVisible(true)}
              style={styles.actionButton}
              icon="plus"
            >
              إضافة منتج
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmInvoice}
              style={styles.actionButton}
              icon="check"
              disabled={invoice.items.length === 0}
            >
              تأكيد الفاتورة
            </Button>
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={addItemDialogVisible} onDismiss={() => setAddItemDialogVisible(false)}>
          <Dialog.Title>إضافة منتج للفاتورة</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="البحث عن المنتج"
              value={productSearchQuery}
              onChangeText={setProductSearchQuery}
              mode="outlined"
              style={styles.dialogInput}
              right={<TextInput.Icon icon="magnify" />}
            />
            
            {selectedProduct ? (
              <Card style={styles.selectedProductCard}>
                <Card.Content>
                  <Title style={styles.selectedProductName}>{selectedProduct.name}</Title>
                  <Paragraph>SKU: {selectedProduct.sku}</Paragraph>
                  <Paragraph>السعر: {selectedProduct.price.toLocaleString()} $</Paragraph>
                  <Paragraph>المخزون: {selectedProduct.stock_qty}</Paragraph>
                  <Button
                    onPress={() => setSelectedProduct(null)}
                    style={styles.clearButton}
                  >
                    إلغاء الاختيار
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              <ScrollView style={styles.productsList}>
                {filteredProducts.slice(0, 5).map((product) => (
                  <List.Item
                    key={product.id}
                    title={product.name}
                    description={`SKU: ${product.sku} | السعر: ${product.price.toLocaleString()} $ | المخزون: ${product.stock_qty}`}
                    left={(props) => <List.Icon {...props} icon="cube" />}
                    onPress={() => {
                      setSelectedProduct(product);
                      setProductSearchQuery('');
                    }}
                  />
                ))}
                {filteredProducts.length === 0 && productSearchQuery && (
                  <Paragraph style={styles.noResultsText}>لا توجد نتائج</Paragraph>
                )}
              </ScrollView>
            )}

            {selectedProduct && (
              <TextInput
                label="الكمية"
                value={quantity}
                onChangeText={setQuantity}
                mode="outlined"
                style={styles.dialogInput}
                keyboardType="numeric"
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddItemDialogVisible(false)}>إلغاء</Button>
            <Button onPress={handleAddItem} disabled={!selectedProduct}>
              إضافة المنتج
            </Button>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 16,
    color: '#ef4444',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusChip: {
    marginTop: 8,
  },
  itemsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemSku: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  itemUnit: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  itemMeasurement: {
    fontSize: 12,
    color: '#666',
  },
  itemDetails: {
    alignItems: 'flex-end',
  },
  itemQty: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
  },
  totalCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#f8f9fa',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 20,
  },
  totalAmount: {
    fontSize: 24,
    color: '#10b981',
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  dialogInput: {
    marginBottom: 12,
  },
  selectedProductCard: {
    marginTop: 12,
    backgroundColor: '#e3f2fd',
  },
  selectedProductName: {
    fontSize: 16,
    color: '#1976d2',
  },
  clearButton: {
    marginTop: 8,
  },
  productsList: {
    maxHeight: 200,
    marginTop: 12,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
  },
});