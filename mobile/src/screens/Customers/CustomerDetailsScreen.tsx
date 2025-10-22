import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl, Dimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import {
  ScreenContainer,
  SectionHeader,
  SoftBadge,
  ListItem,
} from '@/components';
import { useCompany } from '@/context';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';
import { mergeDateTime } from '@/utils/format';
import { MoreStackParamList } from '@/navigation/types';

interface CustomerData {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Invoice {
  id: number;
  customer_name: string;
  total_amount: number | string;
  status: string;
  created_at: string;
}

interface Payment {
  id: number;
  customer: number;
  amount: number | string;
  payment_method: string;
  payment_method_display?: string;
  payment_date: string;
}

interface Return {
  id: number;
  return_number?: string;
  invoice_id: number;
  status: string;
  total_amount: number | string;
  return_date: string;
}

interface Balance {
  id: number;
  customer: number;
  balance: number | string;
}

const parseNumber = (value: number | string | undefined | null): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

type Props = NativeStackScreenProps<MoreStackParamList, 'CustomerDetails'>;

export const CustomerDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { customerId } = route.params;
  const { theme } = useTheme();
  const { formatAmount } = useCompany();

  // حساب عرض الكروت ديناميكياً مثل لوحة التحكم
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = useMemo(() => {
    // حساب العرض مع مراعاة الـ gap
    const availableWidth = screenWidth - 48; // padding من الجانبين
    const gapWidth = 8; // columnGap
    const cardWidth = (availableWidth - gapWidth) / 2;
    return Math.floor(cardWidth);
  }, [screenWidth]);

  const { data: customer, isLoading: customerLoading, refetch: refetchCustomer } = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customerDetail(customerId));
      return res.data as CustomerData;
    },
  });

  const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices', 'by-customer', customerId],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.invoices, { params: { customer: customerId } });
      return normalizeListResponse<Invoice>(res.data);
    },
  });

  const { data: paymentsData, isLoading: paymentsLoading, refetch: refetchPayments } = useQuery({
    queryKey: ['payments', 'by-customer', customerId],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.payments, { params: { customer: customerId } });
      return normalizeListResponse<Payment>(res.data);
    },
  });

  const { data: returnsData, isLoading: returnsLoading, refetch: refetchReturns } = useQuery({
    queryKey: ['returns', 'by-customer', customerId],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.returns, { params: { customer: customerId } });
      return normalizeListResponse<Return>(res.data);
    },
  });

  const { data: balancesData } = useQuery({
    queryKey: ['balances'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.balances);
      return normalizeListResponse<Balance>(res.data);
    },
  });

  const balance = useMemo(() => {
    const results = balancesData?.results || [];
    const found = results.find((b) => b.customer === customerId);
    return parseNumber(found?.balance);
  }, [balancesData, customerId]);

  const invoices = invoicesData?.results || [];
  const payments = paymentsData?.results || [];
  const returns = returnsData?.results || [];

  const positivePayments = useMemo(() => payments.filter((p) => parseNumber(p.amount) > 0), [payments]);
  const negativePayments = useMemo(() => payments.filter((p) => parseNumber(p.amount) < 0), [payments]);

  const totals = useMemo(() => {
    const paymentsPos = positivePayments.reduce((acc, p) => acc + parseNumber(p.amount), 0);
    const paymentsNeg = Math.abs(negativePayments.reduce((acc, p) => acc + parseNumber(p.amount), 0));
    const invoicesTotal = invoices.reduce((acc, inv) => acc + parseNumber(inv.total_amount), 0);
    const returnsTotal = returns.reduce((acc, ret) => acc + parseNumber(ret.total_amount), 0);

    return {
      invoices: invoicesTotal,
      paymentsPositive: paymentsPos,
      paymentsNegative: paymentsNeg,
      returns: returnsTotal,
    };
  }, [invoices, positivePayments, negativePayments, returns]);

  const handleRefresh = () => {
    refetchCustomer();
    refetchInvoices();
    refetchPayments();
    refetchReturns();
  };

  const isRefreshing = customerLoading || invoicesLoading || paymentsLoading || returnsLoading;

  if (!customer && customerLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loader}>
          <Text style={{ color: theme.textMuted }}>جاري التحميل...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!customer) {
    return (
      <ScreenContainer>
        <View style={styles.loader}>
          <Text style={{ color: theme.textPrimary }}>تعذر تحميل بيانات العميل</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.textPrimary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* معلومات العميل */}
        <View style={[styles.customerHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.softPalette.primary.light }]}>
            <Ionicons name="person" size={36} color={theme.softPalette.primary.main} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customerName, { color: theme.textPrimary }]}>{customer.name}</Text>
            {customer.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={theme.textMuted} />
                <Text style={[styles.customerInfo, { color: theme.textMuted }]}>{customer.phone}</Text>
              </View>
            )}
            {customer.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={16} color={theme.textMuted} />
                <Text style={[styles.customerInfo, { color: theme.textMuted }]}>{customer.email}</Text>
              </View>
            )}
          </View>
        </View>

        {/* الرصيد */}
        <View style={[styles.balanceCard, { 
          backgroundColor: balance < 0 
            ? theme.softPalette.destructive?.light + '30' 
            : balance > 0 
            ? theme.softPalette.success?.light + '30' 
            : theme.softPalette.info.light + '30',
          borderColor: balance < 0 
            ? theme.softPalette.destructive?.main 
            : balance > 0 
            ? theme.softPalette.success?.main 
            : theme.softPalette.info.main,
        }]}>
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>الرصيد الحالي</Text>
            {balance !== 0 && (
              <View style={[
                styles.balanceStatusBadge,
                { 
                  backgroundColor: balance < 0 
                    ? theme.softPalette.destructive?.main 
                    : theme.softPalette.success?.main 
                }
              ]}>
                <Text style={styles.balanceStatusText}>
                  {balance < 0 ? 'له علينا' : 'لنا عليه'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.balanceAmountWrapper}>
            {balance !== 0 && (
              <View style={[
                styles.balanceIcon,
                { 
                  backgroundColor: balance < 0 
                    ? theme.softPalette.destructive?.light 
                    : theme.softPalette.success?.light 
                }
              ]}>
                <Ionicons 
                  name={balance < 0 ? "arrow-up-circle" : "arrow-down-circle"} 
                  size={32} 
                  color={balance < 0 ? theme.softPalette.destructive?.main : theme.softPalette.success?.main} 
                />
              </View>
            )}
            <View style={styles.amountTextContainer}>
              {formatAmount(Math.abs(balance)).split('|').map((part, index) => (
                <Text 
                  key={index}
                  style={[
                    styles.balanceAmount,
                    { color: balance < 0 ? theme.softPalette.destructive?.main : balance > 0 ? theme.softPalette.success?.main : theme.textPrimary }
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {part.trim()}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* الإحصائيات */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCardWrapper, { width: cardWidth }]}>
            <View style={[
              styles.statCard, 
              { 
                backgroundColor: theme.surface, 
                borderColor: theme.softPalette.primary.main + '20',
                borderLeftWidth: 4,
                borderLeftColor: theme.softPalette.primary.main,
              }
            ]}>
              <View style={styles.cardHeader}>
                <View style={[
                  styles.statIcon, 
                  { 
                    backgroundColor: theme.softPalette.primary.light,
                    shadowColor: theme.softPalette.primary.main,
                  }
                ]}>
                  <Ionicons name="document-text-outline" size={24} color={theme.softPalette.primary.main} />
                </View>
                <View style={styles.cardTitleContainer}>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>الفواتير</Text>
                  <Text style={[styles.statValue, { color: theme.softPalette.primary.main }]}>{invoices.length}</Text>
                </View>
              </View>
              <View style={[styles.cardDivider, { backgroundColor: theme.softPalette.primary.main + '15' }]} />
              <View style={styles.cardAmountContainer}>
                {formatAmount(totals.invoices).split('|').map((part, index) => (
                  <View 
                    key={index}
                    style={[
                      styles.amountBadge,
                      { 
                        backgroundColor: index === 0 
                          ? theme.softPalette.primary.light + '40'
                          : theme.softPalette.primary.light + '20',
                        borderColor: theme.softPalette.primary.main + '30',
                      }
                    ]}
                  >
                    <Text 
                      style={[
                        index === 0 ? styles.statAmount : styles.statAmountSecondary, 
                        { color: theme.softPalette.primary.main }
                      ]}
                      numberOfLines={1}
                    >
                      {part.trim()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.statCardWrapper, { width: cardWidth }]}>
            <View style={[
              styles.statCard, 
              { 
                backgroundColor: theme.surface, 
                borderColor: theme.softPalette.success?.main + '20',
                borderLeftWidth: 4,
                borderLeftColor: theme.softPalette.success?.main,
              }
            ]}>
              <View style={styles.cardHeader}>
                <View style={[
                  styles.statIcon, 
                  { 
                    backgroundColor: theme.softPalette.success?.light,
                    shadowColor: theme.softPalette.success?.main,
                  }
                ]}>
                  <Ionicons name="wallet-outline" size={24} color={theme.softPalette.success?.main} />
                </View>
                <View style={styles.cardTitleContainer}>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>الدفعات</Text>
                  <Text style={[styles.statValue, { color: theme.softPalette.success?.main }]}>{positivePayments.length}</Text>
                </View>
              </View>
              <View style={[styles.cardDivider, { backgroundColor: theme.softPalette.success?.main + '15' }]} />
              <View style={styles.cardAmountContainer}>
                {formatAmount(totals.paymentsPositive).split('|').map((part, index) => (
                  <View 
                    key={index}
                    style={[
                      styles.amountBadge,
                      { 
                        backgroundColor: index === 0 
                          ? theme.softPalette.success?.light + '40'
                          : theme.softPalette.success?.light + '20',
                        borderColor: theme.softPalette.success?.main + '30',
                      }
                    ]}
                  >
                    <Text 
                      style={[
                        index === 0 ? styles.statAmount : styles.statAmountSecondary, 
                        { color: theme.softPalette.success?.main }
                      ]}
                      numberOfLines={1}
                    >
                      {part.trim()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.statCardWrapper, { width: cardWidth }]}>
            <View style={[
              styles.statCard, 
              { 
                backgroundColor: theme.surface, 
                borderColor: theme.softPalette.warning?.main + '20',
                borderLeftWidth: 4,
                borderLeftColor: theme.softPalette.warning?.main,
              }
            ]}>
              <View style={styles.cardHeader}>
                <View style={[
                  styles.statIcon, 
                  { 
                    backgroundColor: theme.softPalette.warning?.light,
                    shadowColor: theme.softPalette.warning?.main,
                  }
                ]}>
                  <Ionicons name="return-down-back-outline" size={24} color={theme.softPalette.warning?.main} />
                </View>
                <View style={styles.cardTitleContainer}>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>المرتجعات</Text>
                  <Text style={[styles.statValue, { color: theme.softPalette.warning?.main }]}>{returns.length}</Text>
                </View>
              </View>
              <View style={[styles.cardDivider, { backgroundColor: theme.softPalette.warning?.main + '15' }]} />
              <View style={styles.cardAmountContainer}>
                {formatAmount(totals.returns).split('|').map((part, index) => (
                  <View 
                    key={index}
                    style={[
                      styles.amountBadge,
                      { 
                        backgroundColor: index === 0 
                          ? theme.softPalette.warning?.light + '40'
                          : theme.softPalette.warning?.light + '20',
                        borderColor: theme.softPalette.warning?.main + '30',
                      }
                    ]}
                  >
                    <Text 
                      style={[
                        index === 0 ? styles.statAmount : styles.statAmountSecondary, 
                        { color: theme.softPalette.warning?.main }
                      ]}
                      numberOfLines={1}
                    >
                      {part.trim()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.statCardWrapper, { width: cardWidth }]}>
            <View style={[
              styles.statCard, 
              { 
                backgroundColor: theme.surface, 
                borderColor: theme.softPalette.destructive?.main + '20',
                borderLeftWidth: 4,
                borderLeftColor: theme.softPalette.destructive?.main,
              }
            ]}>
              <View style={styles.cardHeader}>
                <View style={[
                  styles.statIcon, 
                  { 
                    backgroundColor: theme.softPalette.destructive?.light,
                    shadowColor: theme.softPalette.destructive?.main,
                  }
                ]}>
                  <Ionicons name="trending-down-outline" size={24} color={theme.softPalette.destructive?.main} />
                </View>
                <View style={styles.cardTitleContainer}>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>السحوبات</Text>
                  <Text style={[styles.statValue, { color: theme.softPalette.destructive?.main }]}>{negativePayments.length}</Text>
                </View>
              </View>
              <View style={[styles.cardDivider, { backgroundColor: theme.softPalette.destructive?.main + '15' }]} />
              <View style={styles.cardAmountContainer}>
                {formatAmount(totals.paymentsNegative).split('|').map((part, index) => (
                  <View 
                    key={index}
                    style={[
                      styles.amountBadge,
                      { 
                        backgroundColor: index === 0 
                          ? theme.softPalette.destructive?.light + '40'
                          : theme.softPalette.destructive?.light + '20',
                        borderColor: theme.softPalette.destructive?.main + '30',
                      }
                    ]}
                  >
                    <Text 
                      style={[
                        index === 0 ? styles.statAmount : styles.statAmountSecondary, 
                        { color: theme.softPalette.destructive?.main }
                      ]}
                      numberOfLines={1}
                    >
                      {part.trim()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* الفواتير الأخيرة */}
        <View style={styles.section}>
          <SectionHeader title="الفواتير الأخيرة" subtitle={`${invoices.length} فاتورة`} />
          <View style={[styles.listContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {invoices.slice(0, 5).map((invoice, index) => (
              <View key={invoice.id}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <ListItem
                  title={`فاتورة #${invoice.id}`}
                  subtitle={mergeDateTime(invoice.created_at)}
                  meta={formatAmount(parseNumber(invoice.total_amount))}
                  right={
                    <SoftBadge 
                      label={invoice.status === 'confirmed' ? 'مؤكدة' : 'مسودة'} 
                      variant={invoice.status === 'confirmed' ? 'success' : 'info'} 
                    />
                  }
                />
              </View>
            ))}
            {invoices.length === 0 && (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد فواتير</Text>
            )}
          </View>
        </View>

        {/* الدفعات الأخيرة */}
        <View style={styles.section}>
          <SectionHeader title="الدفعات الأخيرة" subtitle={`${payments.length} دفعة`} />
          <View style={[styles.listContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {payments.slice(0, 5).map((payment, index) => {
              const amount = parseNumber(payment.amount);
              const isWithdraw = amount < 0;
              return (
                <View key={payment.id}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                  <ListItem
                    title={payment.payment_method_display || payment.payment_method || 'نقداً'}
                    subtitle={mergeDateTime(payment.payment_date)}
                    meta={formatAmount(Math.abs(amount))}
                    right={
                      <SoftBadge 
                        label={isWithdraw ? 'سحب' : 'دفعة'} 
                        variant={isWithdraw ? 'warning' : 'success'} 
                      />
                    }
                  />
                </View>
              );
            })}
            {payments.length === 0 && (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد دفعات</Text>
            )}
          </View>
        </View>

        {/* المرتجعات الأخيرة */}
        <View style={styles.section}>
          <SectionHeader title="المرتجعات الأخيرة" subtitle={`${returns.length} مرتجع`} />
          <View style={[styles.listContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {returns.slice(0, 5).map((ret, index) => (
              <View key={ret.id}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <ListItem
                  title={`مرتجع #${ret.return_number || ret.id}`}
                  subtitle={mergeDateTime(ret.return_date)}
                  meta={formatAmount(parseNumber(ret.total_amount))}
                  right={
                    <SoftBadge 
                      label={ret.status === 'approved' ? 'مقبول' : ret.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'} 
                      variant={ret.status === 'approved' ? 'success' : ret.status === 'rejected' ? 'destructive' : 'warning'} 
                    />
                  }
                />
              </View>
            ))}
            {returns.length === 0 && (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد مرتجعات</Text>
            )}
          </View>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    gap: 16,
    paddingBottom: 60,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  section: {
    gap: 12,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  customerName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  customerInfo: {
    fontSize: 14,
  },
  balanceCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 2,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  balanceStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  balanceStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceAmountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  amountTextContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  balanceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    columnGap: 8,  // قلل من 12 إلى 8 مثل لوحة التحكم
  },
  statCardWrapper: {
    // العرض سيتم تعيينه ديناميكياً في الكود
    marginBottom: 0,
  },
  statCard: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    height: 180, // زيادة الارتفاع
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 0.5,
    marginVertical: 4,
    width: '80%',
    alignSelf: 'center',
  },
  cardAmountContainer: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: 'flex-start',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 6,
    opacity: 0.8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'right',
    lineHeight: 32,
  },
  statAmount: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  statAmountSecondary: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 12,
  },
  amountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  listContainer: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 30,
    fontSize: 14,
  },
});

