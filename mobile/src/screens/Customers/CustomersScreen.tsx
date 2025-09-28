import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer, SectionHeader, SoftBadge, Input, ListItem, Button } from '@/components';
import { Modal, Pressable } from 'react-native';
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
  const [search, setSearch] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<CustomerItem | null>(null);

  const { data: customers, isLoading, refetch, isRefetching } = useQuery<CustomerItem[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers, { params: { page: 1 } });
      const normalized = normalizeListResponse<CustomerItem>(res.data);
      return normalized.results;
    },
  });

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers || [];
    const keyword = search.trim().toLowerCase();
    return (customers || []).filter((customer) =>
      customer.name.toLowerCase().includes(keyword) ||
      (customer.phone || '').toLowerCase().includes(keyword) ||
      (customer.email || '').toLowerCase().includes(keyword),
    );
  }, [customers, search]);

  const totalBalances = useMemo(() => {
    return (customers || []).reduce((sum, customer) => sum + Number(customer.balance || 0), 0);
  }, [customers]);

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />}
    >
      <View style={styles.headerBlock}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>العملاء</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>أدر شبكة العملاء وتابع أرصدتهم</Text>
      </View>

      <View style={styles.summaryRow}>
        <SoftBadge label={`عدد العملاء: ${customers?.length || 0}`} variant="info" />
        <SoftBadge label={`إجمالي الأرصدة: ${formatAmount(totalBalances)}`} variant="warning" />
      </View>

      <Input placeholder="ابحث باسم العميل أو رقم الهاتف" value={search} onChangeText={setSearch} autoCorrect={false} />

      <View style={styles.listWrapper}>
        <SectionHeader title="قائمة العملاء" subtitle="أحدث العملاء في النظام" />
        {(filteredCustomers || []).map((customer) => (
          <Pressable key={customer.id} onPress={() => setActiveCustomer(customer)}>
            <ListItem
              title={customer.name}
              subtitle={`${customer.phone || 'بدون رقم'} • ${customer.email || 'بدون بريد'}`}
              meta={formatAmount(Number(customer.balance || 0))}
              right={Number(customer.balance) > 0 ? <SoftBadge label="رصيد مستحق" variant="destructive" /> : undefined}
            />
          </Pressable>
        ))}

        <Modal visible={!!activeCustomer} transparent animationType="fade" onRequestClose={() => setActiveCustomer(null)}>
          <Pressable style={styles.backdrop} onPress={() => setActiveCustomer(null)} />
          <View style={[styles.popover, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.popoverTitle, { color: theme.textPrimary }]}>إجراءات للعميل</Text>
            <Text style={[styles.popoverSubtitle, { color: theme.textMuted }]}>{activeCustomer?.name}</Text>
            <View style={styles.actionsCol}>
              <Button title="فاتورة جديدة" variant="secondary" onPress={() => { setActiveCustomer(null);
                if (navigationRef.isReady() && activeCustomer) {
                  navigationRef.navigate('Main', { screen: 'Sales', params: { screen: 'InvoiceCreate', params: { customerId: activeCustomer.id, customerName: activeCustomer.name } } } as any);
                }
              }} />
              <Button title="إضافة دفعة" variant="secondary" onPress={() => { setActiveCustomer(null);
                if (navigationRef.isReady() && activeCustomer) {
                  navigationRef.navigate('Main', { screen: 'Sales', params: { screen: 'PaymentCreate', params: { customerId: activeCustomer.id, customerName: activeCustomer.name, mode: 'add' } } } as any);
                }
              }} />
              <Button title="سحب دفعة" variant="secondary" onPress={() => { setActiveCustomer(null);
                if (navigationRef.isReady() && activeCustomer) {
                  navigationRef.navigate('Main', { screen: 'Sales', params: { screen: 'PaymentCreate', params: { customerId: activeCustomer.id, customerName: activeCustomer.name, mode: 'withdraw' } } } as any);
                }
              }} />
            </View>
          </View>
        </Modal>
        {!filteredCustomers?.length && (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا يوجد عملاء مطابقون</Text>
        )}
      </View>
    </ScreenContainer>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listWrapper: {
    gap: 12,


  },
  emptyText: {
    textAlign: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  popover: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  popoverTitle: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  popoverSubtitle: { fontSize: 13, textAlign: 'right' },
  actionsCol: { gap: 8 },
});
