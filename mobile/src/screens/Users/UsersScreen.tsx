import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer, SectionHeader, SoftBadge, SoftCard, SoftListItem } from '@/components';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';

interface UserItem {
  id: number;
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  is_active?: boolean;
}

export const UsersScreen: React.FC = () => {
  const { theme } = useTheme();

  const { data: users, isLoading, refetch, isRefetching } = useQuery<UserItem[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.users);
      const normalized = normalizeListResponse<UserItem>(res.data);
      return normalized.results;
    },
  });

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />}
    >
      <View style={styles.headerBlock}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>المستخدمون</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>إدارة أعضاء الفريق والصلاحيات</Text>
      </View>

      <SoftCard style={styles.summaryCard}>
        <SectionHeader title="إحصاءات الفريق" />
        <View style={styles.summaryRow}>
          <SoftBadge label={`إجمالي: ${users?.length || 0}`} variant="info" />
          <SoftBadge label={`نشطون: ${(users || []).filter((user) => user.is_active).length}`} variant="success" />
        </View>
      </SoftCard>

      <View style={styles.listWrapper}>
        <SectionHeader title="قائمة المستخدمين" subtitle="أعضاء الفريق الحاليون" />
        {(users || []).map((user) => (
          <SoftListItem
            key={user.id}
            title={user.username}
            subtitle={`${user.first_name || ''} ${user.last_name || ''}`.trim() || '—'}
            meta={user.role || 'عضو'}
            right={user.is_active ? <SoftBadge label="نشط" variant="success" /> : <SoftBadge label="موقوف" variant="destructive" />}
          />
        ))}
        {!users?.length && <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا يوجد مستخدمون مضافون</Text>}
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
  },
  pageSubtitle: {
    fontSize: 15,
  },
  summaryCard: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  listWrapper: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
});
