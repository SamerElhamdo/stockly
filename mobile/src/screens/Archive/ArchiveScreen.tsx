import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenContainer, SectionHeader, SoftBadge, Button, Input, ListItem } from '@/components';
import { useCompany } from '@/context';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';

interface ArchivedProduct {
  id: number;
  name: string;
  sku?: string | null;
  category_name?: string | null;
  stock_qty: number;
  price: number | string;
}

interface ArchivedCustomer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
}

type ArchiveTab = 'products' | 'customers';

export const ArchiveScreen: React.FC = () => {
  const { theme } = useTheme();
  const { formatAmount } = useCompany();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ArchiveTab>('products');
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const productsQuery = useQuery<ArchivedProduct[]>({
    queryKey: ['archived-products'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products, { params: { archived: true } });
      const normalized = normalizeListResponse<ArchivedProduct>(res.data);
      return normalized.results;
    },
  });

  const customersQuery = useQuery<ArchivedCustomer[]>({
    queryKey: ['archived-customers'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers, { params: { archived: true } });
      const normalized = normalizeListResponse<ArchivedCustomer>(res.data);
      return normalized.results;
    },
  });

  const restoreProduct = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.productRestore(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const restoreCustomer = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.customerRestore(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const filteredProducts = useMemo(() => {
    const list = productsQuery.data || [];
    if (!productSearch.trim()) return list;
    const keyword = productSearch.trim().toLowerCase();
    return list.filter(
      (product) =>
        product.name.toLowerCase().includes(keyword) ||
        (product.sku || '').toLowerCase().includes(keyword) ||
        (product.category_name || '').toLowerCase().includes(keyword),
    );
  }, [productsQuery.data, productSearch]);

  const filteredCustomers = useMemo(() => {
    const list = customersQuery.data || [];
    if (!customerSearch.trim()) return list;
    const keyword = customerSearch.trim().toLowerCase();
    return list.filter(
      (customer) =>
        customer.name.toLowerCase().includes(keyword) ||
        (customer.phone || '').toLowerCase().includes(keyword) ||
        (customer.email || '').toLowerCase().includes(keyword),
    );
  }, [customersQuery.data, customerSearch]);

  const totalArchivedValue = useMemo(() => {
    return (productsQuery.data || []).reduce(
      (sum, product) => sum + Number(product.stock_qty || 0) * Number(product.price || 0),
      0,
    );
  }, [productsQuery.data]);

  const refreshControl = (
    <RefreshControl
      refreshing={productsQuery.isFetching || customersQuery.isFetching}
      onRefresh={() => {
        void productsQuery.refetch();
        void customersQuery.refetch();
      }}
      tintColor={theme.textPrimary}
    />
  );

  return (
    <ScreenContainer refreshControl={refreshControl}>
      <View style={styles.headerBlock}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>الأرشيف</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>استرجع المنتجات والعملاء المؤرشفين</Text>
      </View>

      <View style={styles.summaryRow}>
        <SoftBadge label={`منتجات: ${productsQuery.data?.length || 0}`} variant="info" />
        <SoftBadge label={`عملاء: ${customersQuery.data?.length || 0}`} variant="primary" />
        <SoftBadge label={`قيمة تقديرية: ${formatAmount(totalArchivedValue)}`} variant="warning" />
      </View>

      <View style={styles.tabRow}>
        <Button
          title="منتجات"
          variant={activeTab === 'products' ? 'primary' : 'secondary'}
          onPress={() => setActiveTab('products')}
          style={styles.tabButton}
        />
        <Button
          title="عملاء"
          variant={activeTab === 'customers' ? 'primary' : 'secondary'}
          onPress={() => setActiveTab('customers')}
          style={styles.tabButton}
        />
      </View>

      {activeTab === 'products' ? (
        <View style={styles.tabContent}>
          <Input placeholder="ابحث في المنتجات المؤرشفة" value={productSearch} onChangeText={setProductSearch} />
          <SectionHeader title="منتجات مؤرشفة" />
          {filteredProducts.map((product) => (
            <ListItem
              key={product.id}
              title={product.name}
              subtitle={`${product.category_name || 'بدون فئة'} • كود: ${product.sku || 'غير متوفر'}`}
              meta={`كمية: ${product.stock_qty}`}
              right={
                <Button
                  title="استعادة"
                  variant="success"
                  onPress={() => restoreProduct.mutate(product.id)}
                  loading={restoreProduct.isPending}
                />
              }
            />
          ))}
          {!filteredProducts.length && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد منتجات مؤرشفة</Text>
          )}
        </View>
      ) : (
        <View style={styles.tabContent}>
          <Input placeholder="ابحث في العملاء المؤرشفين" value={customerSearch} onChangeText={setCustomerSearch} />
          <SectionHeader title="عملاء مؤرشفون" />
          {filteredCustomers.map((customer) => (
            <ListItem
              key={customer.id}
              title={customer.name}
              subtitle={`${customer.phone || 'بدون رقم'} • ${customer.email || 'بدون بريد'}`}
              right={
                <Button
                  title="استعادة"
                  variant="success"
                  onPress={() => restoreCustomer.mutate(customer.id)}
                  loading={restoreCustomer.isPending}
                />
              }
            />
          ))}
          {!filteredCustomers.length && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا يوجد عملاء مؤرشفون</Text>
          )}
        </View>
      )}
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
    flexWrap: 'wrap',
    gap: 8,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tabButton: {
    flex: 1,
  },
  tabContent: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
});
