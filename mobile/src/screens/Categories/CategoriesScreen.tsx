import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer, SectionHeader, SoftBadge, SoftCard, SoftListItem } from '@/components';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';

interface CategoryItem {
  id: number;
  name: string;
  description?: string | null;
  products_count?: number;
}

export const CategoriesScreen: React.FC = () => {
  const { theme } = useTheme();

  const { data: categories, isLoading, refetch, isRefetching } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.categories);
      const normalized = normalizeListResponse<CategoryItem>(res.data);
      return normalized.results;
    },
  });

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />}
    >
      <View style={styles.headerBlock}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>الفئات</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>نظّم المنتجات ضمن فئات منسقة</Text>
      </View>

      <SoftCard style={styles.summaryCard}>
        <SectionHeader title="نظرة عامة" />
        <SoftBadge label={`إجمالي الفئات: ${categories?.length || 0}`} variant="primary" />
      </SoftCard>

      <View style={styles.listWrapper}>
        <SectionHeader title="قائمة الفئات" subtitle="تفاصيل الفئات المضافة" />
        {(categories || []).map((category) => (
          <SoftListItem
            key={category.id}
            title={category.name}
            subtitle={category.description || 'بدون وصف'}
            meta={`${category.products_count || 0} منتج`}
          />
        ))}
        {!categories?.length && (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد فئات مضافة بعد</Text>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerBlock: {
    gap: 6,
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
  summaryCard: {
    gap: 12,
  },
  listWrapper: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
});
