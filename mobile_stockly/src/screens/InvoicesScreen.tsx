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
  List,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../config/api';

interface Invoice {
  id: number;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
}

export default function InvoicesScreen({ navigation, route }: any) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const { token } = useAuth();

  // Check if we came from customers screen with a specific customer
  const { customerId } = route?.params || {};

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [searchQuery, invoices]);

  useEffect(() => {
    if (customerId && customers.length > 0) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomer(customer);
        setCreateDialogVisible(true);
      }
    }
  }, [customerId, customers]);

  const loadData = async () => {
    try {
      const [invoicesData, customersData] = await Promise.all([
        apiRequest('/api/invoices/', {}, token!),
        apiRequest('/api/customers/', {}, token!),
      ]);

      setInvoices(invoicesData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterInvoices = () => {
    if (!searchQuery.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const filtered = invoices.filter(invoice =>
      invoice.id.toString().includes(searchQuery) ||
      invoice.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredInvoices(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomer) {
      Alert.alert('خطأ', 'يرجى اختيار العميل');
      return;
    }

    try {
      const response = await apiRequest('/api/invoices/session', {
        method: 'POST',
        body: JSON.stringify({ customer_name: selectedCustomer.name }),
      }, token!);

      setCreateDialogVisible(false);
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
      
      // Navigate to invoice detail screen
      navigation.navigate('InvoiceDetail', { sessionId: response.session_id });
    } catch (error) {
      console.error('Error creating invoice:', error);
      Alert.alert('خطأ', 'حدث خطأ في إنشاء الفاتورة');
    }
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

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (customer.phone && customer.phone.includes(customerSearchQuery))
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>جاري تحميل الفواتير...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="إدارة الفواتير" />
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="البحث برقم الفاتورة أو اسم العميل..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map((invoice) => (
              <Card key={invoice.id} style={styles.invoiceCard}>
                <Card.Content>
                  <View style={styles.invoiceHeader}>
                    <View style={styles.invoiceInfo}>
                      <Title style={styles.invoiceNumber}>فاتورة #{invoice.id}</Title>
                      <Paragraph style={styles.customerName}>{invoice.customer_name}</Paragraph>
                      <Paragraph style={styles.invoiceDate}>
                        {new Date(invoice.created_at).toLocaleDateString('ar-SA')}
                      </Paragraph>
                    </View>
                    <View style={styles.invoiceAmount}>
                      <Title style={styles.amountText}>
                        {invoice.total_amount.toLocaleString()} $
                      </Title>
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
                  </View>

                  <View style={styles.invoiceActions}>
                    <Button
                      mode="contained"
                      onPress={() => navigation.navigate('InvoiceDetail', { sessionId: invoice.id })}
                      style={styles.actionButton}
                      icon="eye"
                    >
                      عرض
                    </Button>
                    {invoice.status === 'confirmed' && (
                      <Button
                        mode="outlined"
                        onPress={() => {
                          Alert.alert('قريباً', 'طباعة PDF قيد التطوير');
                        }}
                        style={styles.actionButton}
                        icon="printer"
                      >
                        طباعة
                      </Button>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <View style={styles.emptyContainer}>
                  <Ionicons name="receipt-outline" size={64} color="#ccc" />
                  <Title style={styles.emptyTitle}>لا توجد فواتير</Title>
                  <Paragraph style={styles.emptyText}>
                    {searchQuery ? 'لا توجد نتائج للبحث' : 'لم يتم إنشاء أي فواتير بعد'}
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
        onPress={() => setCreateDialogVisible(true)}
      />

      <Portal>
        <Dialog visible={createDialogVisible} onDismiss={() => setCreateDialogVisible(false)}>
          <Dialog.Title>إنشاء فاتورة جديدة</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="البحث عن العميل"
              value={customerSearchQuery}
              onChangeText={setCustomerSearchQuery}
              mode="outlined"
              style={styles.dialogInput}
              right={<TextInput.Icon icon="magnify" />}
            />
            
            {selectedCustomer ? (
              <Card style={styles.selectedCustomerCard}>
                <Card.Content>
                  <Title style={styles.selectedCustomerName}>{selectedCustomer.name}</Title>
                  {selectedCustomer.phone && (
                    <Paragraph>📞 {selectedCustomer.phone}</Paragraph>
                  )}
                  <Button
                    onPress={() => setSelectedCustomer(null)}
                    style={styles.clearButton}
                  >
                    إلغاء الاختيار
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              <ScrollView style={styles.customersList}>
                {filteredCustomers.slice(0, 5).map((customer) => (
                  <List.Item
                    key={customer.id}
                    title={customer.name}
                    description={customer.phone}
                    left={(props) => <List.Icon {...props} icon="account" />}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setCustomerSearchQuery('');
                    }}
                  />
                ))}
                {filteredCustomers.length === 0 && customerSearchQuery && (
                  <Paragraph style={styles.noResultsText}>لا توجد نتائج</Paragraph>
                )}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateDialogVisible(false)}>إلغاء</Button>
            <Button onPress={handleCreateInvoice} disabled={!selectedCustomer}>
              إنشاء الفاتورة
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
  content: {
    flex: 1,
    padding: 16,
  },
  searchbar: {
    marginBottom: 16,
  },
  invoiceCard: {
    marginBottom: 12,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 18,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: '#999',
  },
  invoiceAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 20,
    color: '#10b981',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusChip: {
    marginTop: 4,
  },
  invoiceActions: {
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
  dialogInput: {
    marginBottom: 12,
  },
  selectedCustomerCard: {
    marginTop: 12,
    backgroundColor: '#e3f2fd',
  },
  selectedCustomerName: {
    fontSize: 16,
    color: '#1976d2',
  },
  clearButton: {
    marginTop: 8,
  },
  customersList: {
    maxHeight: 200,
    marginTop: 12,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
  },
});