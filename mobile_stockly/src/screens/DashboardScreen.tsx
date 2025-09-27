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
  Menu,
  Divider,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../config/api';

interface DashboardStats {
  today_invoices: number;
  total_sales: number;
  low_stock_items: number;
  total_customers: number;
}

interface RecentInvoice {
  id: number;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function DashboardScreen({ navigation }: any) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const { user, logout, token } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, invoicesData] = await Promise.all([
        apiRequest('/api/dashboard/stats', {}, token!),
        apiRequest('/api/invoices/recent', {}, token!),
      ]);

      setStats(statsData);
      setRecentInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الخروج', onPress: logout },
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>جاري تحميل البيانات...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="لوحة التحكم" />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item onPress={handleLogout} title="تسجيل الخروج" />
        </Menu>
      </Appbar.Header>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Card */}
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <Title>مرحباً، {user?.first_name || user?.username}</Title>
            <Paragraph>نظرة عامة على إدارة المخزون والفواتير</Paragraph>
          </Card.Content>
        </Card>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
            <Card.Content style={styles.statContent}>
              <View style={styles.statIcon}>
                <Ionicons name="receipt-outline" size={24} color="#2563eb" />
              </View>
              <View>
                <Paragraph style={styles.statLabel}>فواتير اليوم</Paragraph>
                <Title style={[styles.statValue, { color: '#2563eb' }]}>
                  {stats?.today_invoices || 0}
                </Title>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
            <Card.Content style={styles.statContent}>
              <View style={styles.statIcon}>
                <Ionicons name="cash-outline" size={24} color="#16a34a" />
              </View>
              <View>
                <Paragraph style={styles.statLabel}>إجمالي المبيعات</Paragraph>
                <Title style={[styles.statValue, { color: '#16a34a' }]}>
                  {stats?.total_sales?.toLocaleString() || 0}
                </Title>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Card.Content style={styles.statContent}>
              <View style={styles.statIcon}>
                <Ionicons name="warning-outline" size={24} color="#d97706" />
              </View>
              <View>
                <Paragraph style={styles.statLabel}>مخزون منخفض</Paragraph>
                <Title style={[styles.statValue, { color: '#d97706' }]}>
                  {stats?.low_stock_items || 0}
                </Title>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#f3e8ff' }]}>
            <Card.Content style={styles.statContent}>
              <View style={styles.statIcon}>
                <Ionicons name="people-outline" size={24} color="#7c3aed" />
              </View>
              <View>
                <Paragraph style={styles.statLabel}>إجمالي العملاء</Paragraph>
                <Title style={[styles.statValue, { color: '#7c3aed' }]}>
                  {stats?.total_customers || 0}
                </Title>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Recent Invoices */}
        <Card style={styles.recentCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>الفواتير الأخيرة</Title>
            {recentInvoices.length > 0 ? (
              recentInvoices.map((invoice) => (
                <View key={invoice.id} style={styles.invoiceItem}>
                  <View style={styles.invoiceInfo}>
                    <Paragraph style={styles.invoiceNumber}>
                      فاتورة #{invoice.id}
                    </Paragraph>
                    <Paragraph style={styles.customerName}>
                      {invoice.customer_name}
                    </Paragraph>
                  </View>
                  <View style={styles.invoiceDetails}>
                    <Paragraph style={styles.invoiceAmount}>
                      {invoice.total_amount.toLocaleString()} $
                    </Paragraph>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(invoice.status) },
                      ]}
                    >
                      <Paragraph style={styles.statusText}>
                        {getStatusText(invoice.status)}
                      </Paragraph>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Paragraph style={styles.emptyText}>لا توجد فواتير حالياً</Paragraph>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>إجراءات سريعة</Title>
            <View style={styles.actionsContainer}>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Invoices')}
                style={styles.actionButton}
                icon="receipt"
              >
                إنشاء فاتورة
              </Button>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Products')}
                style={styles.actionButton}
                icon="cube"
              >
                إضافة منتج
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
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
  welcomeCard: {
    marginBottom: 16,
    elevation: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    marginBottom: 12,
    elevation: 2,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  recentCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontWeight: 'bold',
  },
  customerName: {
    color: '#666',
    fontSize: 12,
  },
  invoiceDetails: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  actionsCard: {
    elevation: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});