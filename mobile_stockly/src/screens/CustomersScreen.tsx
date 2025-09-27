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
  List,
  Chip,
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../config/api';

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  balance?: number;
  invoices_count?: number;
  returns_count?: number;
  last_purchase?: string;
}

export default function CustomersScreen({ navigation }: any) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const { token } = useAuth();

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      const data = await apiRequest('/api/customers/', {}, token!);
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل العملاء');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone && customer.phone.includes(searchQuery)) ||
      (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredCustomers(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCustomers();
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم العميل');
      return;
    }

    try {
      await apiRequest('/api/customers/add/', {
        method: 'POST',
        body: JSON.stringify(newCustomer),
      }, token!);

      setAddDialogVisible(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      loadCustomers();
      Alert.alert('نجح', 'تم إضافة العميل بنجاح');
    } catch (error) {
      console.error('Error adding customer:', error);
      Alert.alert('خطأ', 'حدث خطأ في إضافة العميل');
    }
  };

  const getBalanceColor = (balance?: number) => {
    if (!balance) return '#6b7280';
    return balance > 0 ? '#ef4444' : '#10b981';
  };

  const getBalanceText = (balance?: number) => {
    if (!balance) return '0.00 $';
    return `${balance.toFixed(2)} $`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>جاري تحميل العملاء...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="إدارة العملاء" />
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="البحث بالاسم أو الهاتف أو البريد الإلكتروني..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <Card key={customer.id} style={styles.customerCard}>
                <Card.Content>
                  <View style={styles.customerHeader}>
                    <Title style={styles.customerName}>{customer.name}</Title>
                    <Chip
                      style={[
                        styles.balanceChip,
                        { backgroundColor: getBalanceColor(customer.balance) },
                      ]}
                      textStyle={{ color: 'white' }}
                    >
                      {getBalanceText(customer.balance)}
                    </Chip>
                  </View>

                  <View style={styles.customerDetails}>
                    {customer.phone && (
                      <Paragraph style={styles.detailText}>
                        📞 {customer.phone}
                      </Paragraph>
                    )}
                    {customer.email && (
                      <Paragraph style={styles.detailText}>
                        ✉️ {customer.email}
                      </Paragraph>
                    )}
                  </View>

                  <View style={styles.customerStats}>
                    <View style={styles.statItem}>
                      <Paragraph style={styles.statLabel}>الفواتير</Paragraph>
                      <Paragraph style={styles.statValue}>
                        {customer.invoices_count || 0}
                      </Paragraph>
                    </View>
                    <View style={styles.statItem}>
                      <Paragraph style={styles.statLabel}>المرتجعات</Paragraph>
                      <Paragraph style={styles.statValue}>
                        {customer.returns_count || 0}
                      </Paragraph>
                    </View>
                    {customer.last_purchase && (
                      <View style={styles.statItem}>
                        <Paragraph style={styles.statLabel}>آخر شراء</Paragraph>
                        <Paragraph style={styles.statValue}>
                          {customer.last_purchase}
                        </Paragraph>
                      </View>
                    )}
                  </View>

                  <View style={styles.customerActions}>
                    <Button
                      mode="contained"
                      onPress={() => {
                        // Navigate to create invoice for this customer
                        navigation.navigate('Invoices', { customerId: customer.id });
                      }}
                      style={styles.actionButton}
                      icon="receipt"
                    >
                      فاتورة
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        // Navigate to customer details/payments
                        Alert.alert('قريباً', 'صفحة تفاصيل العميل قيد التطوير');
                      }}
                      style={styles.actionButton}
                      icon="eye"
                    >
                      عرض
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={64} color="#ccc" />
                  <Title style={styles.emptyTitle}>لا توجد عملاء</Title>
                  <Paragraph style={styles.emptyText}>
                    {searchQuery ? 'لا توجد نتائج للبحث' : 'لم يتم إضافة أي عملاء بعد'}
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
          <Dialog.Title>إضافة عميل جديد</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="اسم العميل *"
              value={newCustomer.name}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, name: text })}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="رقم الهاتف"
              value={newCustomer.phone}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, phone: text })}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="phone-pad"
            />
            <TextInput
              label="البريد الإلكتروني"
              value={newCustomer.email}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, email: text })}
              mode="outlined"
              style={styles.dialogInput}
              keyboardType="email-address"
            />
            <TextInput
              label="العنوان"
              value={newCustomer.address}
              onChangeText={(text) => setNewCustomer({ ...newCustomer, address: text })}
              mode="outlined"
              style={styles.dialogInput}
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)}>إلغاء</Button>
            <Button onPress={handleAddCustomer}>إضافة</Button>
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
  customerCard: {
    marginBottom: 12,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    flex: 1,
  },
  balanceChip: {
    marginLeft: 8,
  },
  customerDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  customerActions: {
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
});