import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer, SectionHeader, SoftBadge, Button, SoftCard, Input, Picker, type PickerOption } from '@/components';
import { useAuth, useCompany, useToast, useConfirmation } from '@/context';
import { useTheme } from '@/theme';
import { apiClient, endpoints } from '@/services/api-client';

export const SettingsScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { profile, refetchProfile } = useCompany();
  const { logout, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { confirm } = useConfirmation();
  const queryClient = useQueryClient();

  const [returnPolicy, setReturnPolicy] = useState('');
  const [paymentPolicy, setPaymentPolicy] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [secondaryCurrency, setSecondaryCurrency] = useState('');
  const [secondaryPerUsd, setSecondaryPerUsd] = useState('');
  const [priceDisplayMode, setPriceDisplayMode] = useState<'both' | 'primary' | 'secondary'>('both');
  const [dashboardCards, setDashboardCards] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setReturnPolicy(profile.return_policy || '');
      setPaymentPolicy(profile.payment_policy || '');
      setLogoUri(profile.logo_url || null);
      setLanguage(profile.language || 'ar');
      setSecondaryCurrency(profile.secondary_currency || '');
      setSecondaryPerUsd(profile.secondary_per_usd ? String(profile.secondary_per_usd) : '');
      setPriceDisplayMode(profile.price_display_mode || 'both');
      setDashboardCards(profile.dashboard_cards || []);
    }
  }, [profile]);

  const languageOptions: PickerOption[] = [
    { label: 'العربية', value: 'ar' },
    { label: 'English', value: 'en' },
  ];

  const currencyOptions: PickerOption[] = [
    { label: 'بدون', value: 'none' },
    { label: 'الريال السعودي (SAR)', value: 'SAR' },
    { label: 'الليرة السورية (SYP)', value: 'SYP' },
    { label: 'الليرة التركية (TRY)', value: 'TRY' },
    { label: 'الدرهم الإماراتي (AED)', value: 'AED' },
    { label: 'اليورو (EUR)', value: 'EUR' },
    { label: 'الليرة اللبنانية (LBP)', value: 'LBP' },
  ];

  const displayModeOptions: PickerOption[] = [
    { label: 'كلا العملتين', value: 'both' },
    { label: 'الدولار فقط', value: 'primary' },
    { label: 'الثانوية فقط', value: 'secondary' },
  ];

  const dashboardOptions = [
    { key: 'total_sales', label: 'إجمالي المبيعات' },
    { key: 'today_invoices', label: 'فواتير اليوم' },
    { key: 'products', label: 'المنتجات النشطة' },
    { key: 'customers', label: 'العملاء' },
    { key: 'sales_today', label: 'مبيعات اليوم' },
    { key: 'sales_month', label: 'مبيعات هذا الشهر' },
    { key: 'draft_invoices', label: 'فواتير مسودة' },
    { key: 'cancelled_invoices', label: 'فواتير ملغاة' },
    { key: 'payments_today', label: 'دفعات اليوم' },
    { key: 'payments_month', label: 'دفعات هذا الشهر' },
    { key: 'returns_today_count', label: 'عدد المرتجعات اليوم' },
    { key: 'returns_today_amount', label: 'قيمة المرتجعات اليوم' },
    { key: 'low_stock_count', label: 'منتجات منخفضة المخزون' },
    { key: 'out_of_stock_count', label: 'منتجات منتهية المخزون' },
    { key: 'inventory_value_cost', label: 'قيمة المخزون (تكلفة)' },
    { key: 'inventory_value_retail', label: 'قيمة المخزون (بيع)' },
    { key: 'outstanding_receivables', label: 'الرصيد المستحق' },
  ];

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!profile) throw new Error('لا يوجد ملف شركة');
      
      const formData = new FormData();
      formData.append('return_policy', payload.return_policy);
      formData.append('payment_policy', payload.payment_policy);
      formData.append('language', payload.language);
      formData.append('dashboard_cards', JSON.stringify(payload.dashboard_cards || []));
      if (payload.secondary_currency && payload.secondary_currency !== 'none') {
        formData.append('secondary_currency', payload.secondary_currency);
      }
      if (payload.secondary_per_usd) {
        formData.append('secondary_per_usd', payload.secondary_per_usd);
      }
      formData.append('price_display_mode', payload.price_display_mode);
      
      if (payload.logo) {
        const filename = payload.logo.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('logo', {
          uri: payload.logo,
          name: filename,
          type,
        } as any);
      }

      const res = await apiClient.patch(`${endpoints.companyProfile}${profile.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      showSuccess('✓ تم حفظ الإعدادات');
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      refetchProfile?.();
    },
    onError: (error: any) => {
      showError(error?.response?.data?.detail || 'تعذر تحديث الإعدادات');
    },
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError('يرجى السماح بالوصول إلى المعرض');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      return_policy: returnPolicy,
      payment_policy: paymentPolicy,
      language,
      dashboard_cards: dashboardCards,
      secondary_currency: secondaryCurrency,
      secondary_per_usd: secondaryPerUsd,
      price_display_mode: priceDisplayMode,
      logo: logoUri,
    });
  };

  const handleReset = () => {
    if (profile) {
      setReturnPolicy(profile.return_policy || '');
      setPaymentPolicy(profile.payment_policy || '');
      setLogoUri(profile.logo_url || null);
      setLanguage(profile.language || 'ar');
      setSecondaryCurrency(profile.secondary_currency || '');
      setSecondaryPerUsd(profile.secondary_per_usd ? String(profile.secondary_per_usd) : '');
      setPriceDisplayMode(profile.price_display_mode || 'both');
      setDashboardCards(profile.dashboard_cards || []);
      showSuccess('✓ تم استرجاع القيم الأصلية');
    }
  };

  const toggleDashboardCard = (key: string) => {
    setDashboardCards((prev) => {
      const set = new Set(prev);
      if (set.has(key)) {
        set.delete(key);
      } else {
        set.add(key);
      }
      return Array.from(set);
    });
  };

  const handleLogout = () => {
    confirm({
      title: 'تأكيد تسجيل الخروج',
      message: 'هل أنت متأكد من تسجيل الخروج من الحساب؟',
      confirmText: 'تسجيل الخروج',
      cancelText: 'إلغاء',
      confirmVariant: 'destructive',
      onConfirm: () => {
        void logout();
      },
    });
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>الإعدادات</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>تحديث سياسات الشركة والعلامة التجارية</Text>
        </View>

        {/* المظهر */}
        <SoftCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="moon-outline" size={20} color={theme.softPalette.primary.main} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>المظهر</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>بدّل بين الوضع الفاتح والداكن</Text>
            </View>
          </View>
          <Button
            title={theme.name === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'}
            onPress={toggleTheme}
            variant="secondary"
          />
        </SoftCard>

        {/* شعار الشركة */}
        <SoftCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="image-outline" size={20} color={theme.softPalette.primary.main} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>شعار الشركة</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>رفع شعار جديد أو تحديث الشعار الحالي</Text>
            </View>
          </View>
          <View style={styles.logoContainer}>
            <View style={[styles.logoBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoImage} resizeMode="contain" />
              ) : (
                <Ionicons name="image-outline" size={32} color={theme.textMuted} />
              )}
            </View>
            <View style={styles.logoActions}>
              <Button
                title="اختيار شعار"
                onPress={pickImage}
                variant="secondary"
              />
              {logoUri && (
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: theme.softPalette.destructive?.light || '#fee' }]}
                  onPress={() => setLogoUri(null)}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.softPalette.destructive?.main || '#f00'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={[styles.hintText, { color: theme.textMuted }]}>
            يُفضل استخدام صورة مربعة بدقة عالية (الحد الأقصى 2MB)
          </Text>
        </SoftCard>

        {/* اللغة والعملات */}
        <SoftCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="globe-outline" size={20} color={theme.softPalette.primary.main} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>اللغة والعملات</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>تخصيص اللغة وإعدادات العملات</Text>
            </View>
          </View>
          
          <Picker
            label="اللغة"
            placeholder="اختر اللغة"
            options={languageOptions}
            value={language}
            onChange={(value) => setLanguage(value as 'ar' | 'en')}
          />

          <View style={styles.currencyRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>العملة الأساسية</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>USD (دولار)</Text>
          </View>

          <Picker
            label="العملة الثانوية"
            placeholder="اختر العملة الثانوية"
            options={currencyOptions}
            value={secondaryCurrency || 'none'}
            onChange={(value) => setSecondaryCurrency(value === 'none' ? '' : value)}
          />

          {secondaryCurrency && secondaryCurrency !== 'none' && (
            <Input
              label="سعر 1 دولار بالعملة الثانوية"
              placeholder="مثال: 15000"
              value={secondaryPerUsd}
              onChangeText={setSecondaryPerUsd}
              keyboardType="numeric"
            />
          )}

          <Picker
            label="طريقة عرض الأسعار"
            placeholder="اختر طريقة العرض"
            options={displayModeOptions}
            value={priceDisplayMode}
            onChange={(value) => setPriceDisplayMode(value as 'both' | 'primary' | 'secondary')}
          />
        </SoftCard>

        {/* كروت لوحة التحكم */}
        <SoftCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid-outline" size={20} color={theme.softPalette.primary.main} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>كروت لوحة التحكم</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>اختر الكروت التي ستظهر في الصفحة الرئيسية</Text>
            </View>
          </View>
          <View style={styles.checkboxGrid}>
            {dashboardOptions.map((opt) => {
              const isChecked = dashboardCards.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.checkboxItem,
                    {
                      backgroundColor: isChecked ? theme.softPalette.primary.light : theme.surface,
                      borderColor: isChecked ? theme.softPalette.primary.main : theme.border,
                    },
                  ]}
                  onPress={() => toggleDashboardCard(opt.key)}
                >
                  <Text style={[styles.checkboxLabel, { color: isChecked ? theme.softPalette.primary.main : theme.textPrimary }]}>
                    {opt.label}
                  </Text>
                  <View style={[styles.checkbox, { borderColor: isChecked ? theme.softPalette.primary.main : theme.border }]}>
                    {isChecked && (
                      <Ionicons name="checkmark" size={16} color={theme.softPalette.primary.main} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </SoftCard>

        {/* سياسة الإرجاع */}
        <SoftCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={theme.softPalette.primary.main} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>سياسة الإرجاع</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>سيتم عرض هذه السياسة في الفواتير المطبوعة</Text>
            </View>
          </View>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.textPrimary,
              },
            ]}
            placeholder="أدخل سياسة الإرجاع الخاصة بالشركة"
            placeholderTextColor={theme.textMuted}
            value={returnPolicy}
            onChangeText={setReturnPolicy}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </SoftCard>

        {/* سياسة الدفع */}
        <SoftCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.softPalette.primary.main} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>سياسة الدفع</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>تظهر سياسة الدفع أيضاً في الفواتير</Text>
            </View>
          </View>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.textPrimary,
              },
            ]}
            placeholder="أدخل سياسة الدفع الخاصة بالشركة"
            placeholderTextColor={theme.textMuted}
            value={paymentPolicy}
            onChangeText={setPaymentPolicy}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </SoftCard>

        {/* معلومات الشركة */}
        <SoftCard style={styles.sectionCard}>
          <SectionHeader title="معلومات الشركة" />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>اسم الشركة</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{profile?.company_name || 'غير متوفر'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>كود الشركة</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{profile?.company_code || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>البريد</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{profile?.company_email || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>الهاتف</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{profile?.company_phone || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>العنوان</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{profile?.company_address || '—'}</Text>
          </View>
        </SoftCard>

        {/* الحساب الشخصي */}
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
        </SoftCard>

        {/* الإجراءات */}
        <SoftCard style={styles.sectionCard}>
          <SectionHeader title="الإجراءات" />
          <View style={styles.buttonGroup}>
            <Button
              title="حفظ التغييرات"
              onPress={handleSave}
              loading={updateMutation.isPending}
              disabled={updateMutation.isPending}
            />
            <Button
              title="استرجاع القيم الحالية"
              variant="secondary"
              onPress={handleReset}
            />
            <Button
              title="تسجيل الخروج"
              variant="destructive"
              onPress={handleLogout}
            />
          </View>
        </SoftCard>

      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    gap: 20,
    paddingBottom: 40,
  },
  headerBlock: {
    gap: 6,
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  pageSubtitle: {
    fontSize: 15,
  },
  sectionCard: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoActions: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    textAlign: 'right',
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'left',
  },
  buttonGroup: {
    gap: 12,
  },
  checkboxGrid: {
    gap: 10,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
