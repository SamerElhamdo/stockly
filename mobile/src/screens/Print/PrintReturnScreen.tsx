import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer, SectionHeader, SoftBadge, SoftCard } from '@/components';
import { useCompany } from '@/context';
import { apiClient, endpoints } from '@/services/api-client';
import { useTheme } from '@/theme';
import { mergeDateTime } from '@/utils/format';
import { RootStackParamList } from '@/navigation/types';

interface ReturnDetail {
  id: number;
  invoice_id: number;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: Array<{
    id: number;
    product_name: string;
    quantity: number;
    reason?: string | null;
  }>;
}

type Props = NativeStackScreenProps<RootStackParamList, 'PrintReturn'>;

export const PrintReturnScreen: React.FC<Props> = ({ route }) => {
  const { id } = route.params;
  const { theme } = useTheme();
  const { formatAmount } = useCompany();

  const { data, isLoading } = useQuery<ReturnDetail>({
    queryKey: ['return-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.returnDetail(id));
      return res.data as ReturnDetail;
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.softPalette.primary.main} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>تعذر تحميل بيانات المرتجع</Text>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader title={`معاينة مرتجع #${data.id}`} subtitle={mergeDateTime(data.created_at)} />
      <SoftCard style={styles.metaCard}>
        <Text style={[styles.customerName, { color: theme.textPrimary }]}>{data.customer_name}</Text>
        <Text style={{ color: theme.textMuted }}>فاتورة مرجعية #{data.invoice_id}</Text>
        <SoftBadge label={data.status === 'approved' ? 'مقبول' : data.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'} variant={
          data.status === 'approved' ? 'success' : data.status === 'rejected' ? 'destructive' : 'info'
        } />
        <Text style={[styles.amount, { color: theme.textPrimary }]}>{formatAmount(data.total_amount)}</Text>
      </SoftCard>

      <SoftCard style={styles.itemsCard}>
        <SectionHeader title="تفاصيل المرتجع" />
        {data.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View>
              <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.product_name}</Text>
              <Text style={{ color: theme.textMuted }}>الكمية: {item.quantity}</Text>
              {item.reason ? <Text style={{ color: theme.textMuted }}>سبب: {item.reason}</Text> : null}
            </View>
          </View>
        ))}
      </SoftCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCard: {
    gap: 12,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
  },
  itemsCard: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
});
