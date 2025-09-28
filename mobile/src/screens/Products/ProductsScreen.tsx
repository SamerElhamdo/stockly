import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer, SectionHeader, SoftBadge, Input, ListItem } from '@/components';
import { useCompany } from '@/context';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';

interface ProductItem {
  id: number;
  name: string;
  sku?: string;
  category_name?: string;
  stock_qty: number;
  price: number | string;
  archived?: boolean;
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
  const [search, setSearch] = useState('');

  const { data: products, isLoading, refetch, isRefetching } = useQuery<ProductItem[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products, { params: { page: 1 } });
      const normalized = normalizeListResponse<ProductItem>(res.data);
      return normalized.results;
    },
  });

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products || [];
    const keyword = search.trim().toLowerCase();
    return (products || []).filter((product) =>
      product.name.toLowerCase().includes(keyword) ||
      (product.sku || '').toLowerCase().includes(keyword) ||
      (product.category_name || '').toLowerCase().includes(keyword),
    );
  }, [products, search]);

  const totalInventoryValue = useMemo(() => {
    return (products || []).reduce((sum, product) => sum + parseNumber(product.price) * Number(product.stock_qty || 0), 0);
  }, [products]);

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />}
    >
      <View style={styles.headerBlock}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>إدارة المنتجات</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>تتبع المنتجات ومستويات المخزون بسهولة</Text>
      </View>

      <View style={styles.summaryRow}>
        <SoftBadge label={`الإجمالي: ${products?.length || 0} منتج`} variant="info" />
        <SoftBadge label={`قيمة المخزون: ${formatAmount(totalInventoryValue)}`} variant="success" />
      </View>

      <Input placeholder="ابحث باسم المنتج أو الكود" value={search} onChangeText={setSearch} autoCorrect={false} />

      <View style={styles.listWrapper}>
        <SectionHeader title="المنتجات" subtitle="أحدث المنتجات النشطة" />
        {(filteredProducts || []).map((product) => (
          <ListItem
            key={product.id}
            title={product.name}
            subtitle={`${product.category_name || 'غير مصنف'} • متوفر: ${product.stock_qty}`}
            meta={formatAmount(parseNumber(product.price))}
            right={Number(product.stock_qty) <= 5 ? <SoftBadge label="منخفض" variant="warning" /> : undefined}
          />
        ))}
        {!filteredProducts?.length && (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد منتجات مطابقة للبحث</Text>
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
    gap: 6,
  },
  listWrapper: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
});
