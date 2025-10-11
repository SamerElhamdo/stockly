import React, { useMemo, useState, useEffect } from 'react';
import { RefreshControl, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList } from '@/navigation/types';
import { Ionicons } from '@expo/vector-icons';

import {
  ScreenContainer,
  SectionHeader,
  SoftBadge,
  Input,
  ListItem,
  Button,
  AmountDisplay,
  SimpleModal,
  SkeletonList,
} from '@/components';
import { useCompany, useToast, useConfirmation } from '@/context';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';
import { navigationRef } from '@/navigation/navigationRef';

interface CustomerItem {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  balance?: number | string;
}

export const CustomersScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatAmount } = useCompany();
  const { showSuccess, showError } = useToast();
  const { showDeleteConfirmation } = useConfirmation();
  const queryClient = useQueryClient();
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  
  const [search, setSearch] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<CustomerItem | null>(null);
  
  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const { data: customers, isLoading, refetch, isRefetching } = useQuery<CustomerItem[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers, { params: { page: 1 } });
      const normalized = normalizeListResponse<CustomerItem>(res.data);
      return normalized.results;
    },
  });

  const { data: balances } = useQuery({
    queryKey: ['balances'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.balances);
      return normalizeListResponse<{ customer: number; balance: number | string }>(res.data);
    },
  });

  const customersWithBalances = useMemo(() => {
    const balanceMap = new Map<number, number>();
    (balances?.results || []).forEach((b: any) => {
      balanceMap.set(b.customer, Number(b.balance || 0));
    });
    return (customers || []).map((c) => ({
      ...c,
      balance: balanceMap.get(c.id) ?? c.balance ?? 0,
    }));
  }, [customers, balances]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customersWithBalances;
    const keyword = search.trim().toLowerCase();
    return customersWithBalances.filter(
      (customer) =>
        customer.name.toLowerCase().includes(keyword) ||
        (customer.phone || '').toLowerCase().includes(keyword) ||
        (customer.email || '').toLowerCase().includes(keyword)
    );
  }, [customersWithBalances, search]);

  const totalBalances = useMemo(() => {
    return customersWithBalances.reduce((sum, customer) => sum + Number(customer.balance || 0), 0);
  }, [customersWithBalances]);

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '' });
    setEditingCustomer(null);
  };

  // Handle openAdd parameter from navigation
  useEffect(() => {
    const params = route?.params as { openAdd?: boolean } | undefined;
    if (params?.openAdd) {
      resetForm();
      setFormOpen(true);
      navigation.setParams({ openAdd: undefined } as any);
    }
  }, [route?.params, navigation]);

  const openEditForm = (customer: CustomerItem) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
    setFormOpen(true);
    setActiveCustomer(null);
  };

  const createCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post(endpoints.customers, payload);
      return res.data;
    },
    onSuccess: () => {
      showSuccess('تم إضافة العميل بنجاح');
      setFormOpen(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || 'فشل إضافة العميل');
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiClient.patch(endpoints.customerDetail(id), data);
      return res.data;
    },
    onSuccess: () => {
      showSuccess('تم تحديث العميل بنجاح');
      setFormOpen(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || 'فشل تحديث العميل');
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(endpoints.customerDetail(id));
      return res.data;
    },
    onSuccess: () => {
      showSuccess('تم حذف العميل بنجاح');
      setActiveCustomer(null);
      refetch();
    },
    onError: (err: any) => {
      showError(err?.response?.data?.detail || 'فشل حذف العميل');
    },
  });

  const handleSave = () => {
    const name = formData.name.trim();
    if (!name) {
      showError('يرجى إدخال اسم العميل');
      return;
    }

    const payload = {
      name,
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
    };

    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data: payload });
    } else {
      createCustomerMutation.mutate(payload);
    }
  };

  const handleDelete = (customer: CustomerItem) => {
    console.log('handleDelete called for customer:', customer.name);
    
    // إغلاق مودل الإجراءات أولاً
    setActiveCustomer(null);
    
    // انتظار قصير ثم عرض التأكيد
    setTimeout(() => {
      showDeleteConfirmation(`العميل "${customer.name}"`).then((confirmed) => {
        console.log('Confirmation result:', confirmed);
        if (confirmed) {
          console.log('Deleting customer with ID:', customer.id);
          deleteCustomerMutation.mutate(customer.id);
        } else {
          console.log('User cancelled deletion');
        }
      }).catch((error) => {
        console.error('Error in handleDelete:', error);
      });
    }, 200);
  };

  return (
    <>
      <ScreenContainer
        refreshControl={
          <RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />
        }
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>العملاء</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>إدارة شبكة العملاء والأرصدة</Text>
        </View>

        <View style={styles.summaryRow}>
          <SoftBadge label={`عدد العملاء: ${customers?.length || 0}`} variant="info" />
          <SoftBadge label={`إجمالي الأرصدة: ${formatAmount(totalBalances)}`} variant={totalBalances > 0 ? 'destructive' : 'success'} />
        </View>

        <Input placeholder="ابحث باسم العميل أو رقم الهاتف" value={search} onChangeText={setSearch} autoCorrect={false} />

        <View style={styles.listWrapper}>
          <SectionHeader title="قائمة العملاء" subtitle={isLoading ? 'جاري التحميل...' : `${filteredCustomers.length} عميل`} />
          
          {isLoading ? (
            <SkeletonList count={5} itemHeight={80} />
          ) : (
            <>
              {(filteredCustomers || []).map((customer) => (
                <TouchableOpacity key={customer.id} onPress={() => setActiveCustomer(customer)}>
                  <ListItem
                    title={customer.name}
                    subtitle={`${customer.phone || 'بدون رقم'} • ${customer.email || 'بدون بريد'}`}
                    meta={<AmountDisplay amount={Math.abs(Number(customer.balance || 0))} /> as any}
                    right={
                      Number(customer.balance) < 0 ? (
                        <SoftBadge label="له علينا" variant="destructive" />
                      ) : Number(customer.balance) > 0 ? (
                        <SoftBadge label="لنا عليه" variant="success" />
                      ) : undefined
                    }
                  />
                </TouchableOpacity>
              ))}
            </>
          )}
          {!filteredCustomers?.length && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا يوجد عملاء</Text>
          )}
        </View>

      </ScreenContainer>

      {/* Customer Actions Modal */}
      <SimpleModal
        visible={!!activeCustomer}
        onClose={() => setActiveCustomer(null)}
        title="إجراءات العميل"
        size="medium"
      >
        {activeCustomer && (
          <>
            <View style={[styles.customerInfoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.customerIconCircle, { backgroundColor: theme.softPalette.primary.light }]}>
                <Ionicons name="person" size={28} color={theme.softPalette.primary.main} />
              </View>
              <Text style={[styles.customerNameLarge, { color: theme.textPrimary }]}>
                {activeCustomer.name}
              </Text>
              {activeCustomer.phone && (
                <Text style={[styles.customerPhone, { color: theme.textMuted }]}>
                  {activeCustomer.phone}
                </Text>
              )}
            </View>
            
            <View style={styles.actionsSection}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted, marginBottom: 12 }]}>الإجراءات</Text>
              <View style={styles.actionsGrid}>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: theme.softPalette.primary.light, borderColor: theme.softPalette.primary.main }]}
                    onPress={() => {
                      if (navigationRef.isReady()) {
                        navigationRef.navigate('Main', {
                          screen: 'More',
                          params: {
                            screen: 'CustomerDetails',
                            params: { customerId: activeCustomer.id },
                          },
                        } as any);
                        setActiveCustomer(null);
                      }
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={24} color={theme.softPalette.primary.main} />
                    <Text style={[styles.actionText, { color: theme.softPalette.primary.main }]}>التفاصيل</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: theme.softPalette.info.light, borderColor: theme.softPalette.info.main }]}
                    onPress={() => {
                      setActiveCustomer(null);
                      if (navigationRef.isReady()) {
                        navigationRef.navigate('Main', {
                          screen: 'Sales',
                          params: {
                            screen: 'InvoiceCreate',
                            params: { customerId: activeCustomer.id, customerName: activeCustomer.name },
                          },
                        } as any);
                      }
                    }}
                  >
                    <Ionicons name="document-text-outline" size={24} color={theme.softPalette.info.main} />
                    <Text style={[styles.actionText, { color: theme.softPalette.info.main }]}>فاتورة جديدة</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: theme.softPalette.success?.light, borderColor: theme.softPalette.success?.main }]}
                    onPress={() => {
                      navigation.navigate('PaymentCreate', {
                        customerId: activeCustomer.id,
                        customerName: activeCustomer.name,
                        mode: 'add',
                      });
                      setActiveCustomer(null);
                    }}
                  >
                    <Ionicons name="wallet-outline" size={24} color={theme.softPalette.success?.main} />
                    <Text style={[styles.actionText, { color: theme.softPalette.success?.main }]}>إضافة دفعة</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: theme.softPalette.warning?.light, borderColor: theme.softPalette.warning?.main }]}
                    onPress={() => {
                      navigation.navigate('PaymentCreate', {
                        customerId: activeCustomer.id,
                        customerName: activeCustomer.name,
                        mode: 'withdraw',
                      });
                      setActiveCustomer(null);
                    }}
                  >
                    <Ionicons name="cash-outline" size={24} color={theme.softPalette.warning?.main} />
                    <Text style={[styles.actionText, { color: theme.softPalette.warning?.main }]}>سحب دفعة</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => openEditForm(activeCustomer)}
                  >
                    <Ionicons name="create-outline" size={24} color={theme.textPrimary} />
                    <Text style={[styles.actionText, { color: theme.textPrimary }]}>تعديل</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: theme.softPalette.destructive?.light, borderColor: theme.softPalette.destructive?.main }]}
                    onPress={() => {
                      console.log('Delete button pressed, activeCustomer:', activeCustomer);
                      if (activeCustomer) {
                        handleDelete(activeCustomer);
                      } else {
                        console.log('No active customer!');
                      }
                    }}
                  >
                    <Ionicons name="trash-outline" size={24} color={theme.softPalette.destructive?.main} />
                    <Text style={[styles.actionText, { color: theme.softPalette.destructive?.main }]}>حذف</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}
      </SimpleModal>

      {/* Customer Form Modal */}
      <SimpleModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingCustomer ? 'تعديل عميل' : 'إضافة عميل'}
        size="medium"
      >
        <Input
          label="اسم العميل *"
          placeholder="اسم العميل"
          value={formData.name}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
        />
        
        <Input
          label="رقم الهاتف"
          placeholder="رقم الهاتف"
          value={formData.phone}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: text }))}
          keyboardType="phone-pad"
        />
        
        <Input
          label="البريد الإلكتروني"
          placeholder="example@mail.com"
          value={formData.email}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
          keyboardType="email-address"
        />
        
        <Input
          label="العنوان"
          placeholder="عنوان العميل"
          value={formData.address}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, address: text }))}
          multiline
        />
        
        <View style={styles.buttonRow}>
          <Button title="إلغاء" variant="secondary" onPress={() => setFormOpen(false)} />
          <Button
            title={editingCustomer ? 'تحديث' : 'حفظ'}
            onPress={handleSave}
            loading={createCustomerMutation.isPending || updateCustomerMutation.isPending}
          />
        </View>
      </SimpleModal>
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
  listWrapper: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 8,
  },
  customerInfoCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  customerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerNameLarge: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  customerPhone: {
    fontSize: 14,
    textAlign: 'center',
  },
  actionsSection: {
    gap: 0,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  actionsGrid: {
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
