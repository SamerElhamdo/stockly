import React, { useMemo, useState, useEffect } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View, TouchableOpacity, Modal as RNModal } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';

import {
  ScreenContainer,
  SectionHeader,
  SoftBadge,
  Input,
  ListItem,
  Button,
  AmountDisplay,
  FloatingActionButton,
  Modal,
  SimpleModal,
  Skeleton,
  SkeletonList,
  LoadingSpinner,
} from '@/components';
import { useCompany } from '@/context';
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
  const queryClient = useQueryClient();
  const route = useRoute();
  const navigation = useNavigation();
  
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
    if (route?.params?.openAdd) {
      resetForm();
      setFormOpen(true);
      navigation.setParams({ openAdd: undefined });
    }
  }, [route?.params?.openAdd, navigation]);

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
      Alert.alert('نجح', 'تم إضافة العميل بنجاح');
      setFormOpen(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل إضافة العميل');
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiClient.patch(endpoints.customerDetail(id), data);
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم تحديث العميل بنجاح');
      setFormOpen(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل تحديث العميل');
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(endpoints.customerDetail(id));
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم حذف العميل بنجاح');
      setActiveCustomer(null);
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل حذف العميل');
    },
  });

  const handleSave = () => {
    const name = formData.name.trim();
    if (!name) {
      Alert.alert('خطأ', 'يرجى إدخال اسم العميل');
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
    Alert.alert('تأكيد الحذف', `هل تريد حذف العميل "${customer.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => deleteCustomerMutation.mutate(customer.id),
      },
    ]);
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
                    meta={<AmountDisplay amount={Number(customer.balance || 0)} /> as any}
                    right={
                      Number(customer.balance) > 0 ? (
                        <SoftBadge label="رصيد مستحق" variant="destructive" />
                      ) : Number(customer.balance) < 0 ? (
                        <SoftBadge label="رصيد دائن" variant="success" />
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
        size="small"
      >
        <Text style={[styles.customerName, { color: theme.textPrimary, textAlign: 'center', marginBottom: 20 }]}>
          {activeCustomer?.name}
        </Text>
        
        <View style={styles.actionsCol}>
          <Button
            title="فاتورة جديدة"
            variant="secondary"
            onPress={() => {
              setActiveCustomer(null);
              if (navigationRef.isReady() && activeCustomer) {
                navigationRef.navigate('Main', {
                  screen: 'Sales',
                  params: {
                    screen: 'InvoiceCreate',
                    params: { customerId: activeCustomer.id, customerName: activeCustomer.name },
                  },
                } as any);
              }
            }}
          />
          <Button
            title="إضافة دفعة"
            variant="secondary"
            onPress={() => {
              setActiveCustomer(null);
              if (navigationRef.isReady() && activeCustomer) {
                navigationRef.navigate('Main', {
                  screen: 'Sales',
                  params: {
                    screen: 'PaymentCreate',
                    params: { customerId: activeCustomer.id, customerName: activeCustomer.name, mode: 'add' },
                  },
                } as any);
              }
            }}
          />
          <Button
            title="سحب دفعة"
            variant="secondary"
            onPress={() => {
              setActiveCustomer(null);
              if (navigationRef.isReady() && activeCustomer) {
                navigationRef.navigate('Main', {
                  screen: 'Sales',
                  params: {
                    screen: 'PaymentCreate',
                    params: { customerId: activeCustomer.id, customerName: activeCustomer.name, mode: 'withdraw' },
                  },
                } as any);
              }
            }}
          />
          <Button title="تعديل" variant="secondary" onPress={() => activeCustomer && openEditForm(activeCustomer)} />
          <Button
            title="حذف"
            variant="destructive"
            onPress={() => activeCustomer && handleDelete(activeCustomer)}
          />
        </View>
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
  actionsCol: {
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
