import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer, SectionHeader, SoftBadge, SoftButton, SoftCard } from '@/components';
import { useAuth, useCompany } from '@/context';
import { useTheme } from '@/theme';

export const SettingsScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { profile } = useCompany();
  const { logout, user } = useAuth();

  return (
    <ScreenContainer>
      <View style={styles.headerBlock}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>الإعدادات</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>تخصيص تجربة الاستخدام وإدارة الحساب</Text>
      </View>

      <SoftCard style={styles.sectionCard}>
        <SectionHeader title="المظهر" subtitle="بدّل بين الوضع الفاتح والداكن" />
        <SoftButton
          title={theme.name === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'}
          onPress={toggleTheme}
          variant="secondary"
        />
      </SoftCard>

      <SoftCard style={styles.sectionCard}>
        <SectionHeader title="بيانات الشركة" />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>اسم الشركة</Text>
          <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{profile?.company_name || 'غير متوفر'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>البريد</Text>
          <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{profile?.company_email || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>الهاتف</Text>
          <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{profile?.company_phone || '—'}</Text>
        </View>
        <SoftBadge label={`العملة الأساسية: ${profile?.primary_currency || 'USD'}`} variant="info" />
      </SoftCard>

      <SoftCard style={styles.sectionCard}>
        <SectionHeader title="الحساب الشخصي" />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>اسم المستخدم</Text>
          <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{user?.username || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>البريد</Text>
          <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{user?.email || '—'}</Text>
        </View>
        <SoftButton
          title="تسجيل الخروج"
          variant="destructive"
          onPress={() => {
            Alert.alert('تأكيد تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج من الحساب؟', [
              { text: 'إلغاء', style: 'cancel' },
              {
                text: 'تسجيل الخروج',
                style: 'destructive',
                onPress: () => {
                  void logout();
                },
              },
            ]);
          }}
        />
      </SoftCard>
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
  sectionCard: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});
