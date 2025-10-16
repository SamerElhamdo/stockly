import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer, SectionHeader, SoftBadge, Button, SoftCard, Input, Picker, type PickerOption, EnhancedInput } from '@/components';
import { useAuth, useCompany, useToast, useConfirmation } from '@/context';
import { useTheme } from '@/theme';
import { apiClient, endpoints } from '@/services/api-client';

export const SettingsScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { profile, refetchProfile } = useCompany();
  const { logout, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { showConfirmation } = useConfirmation();
  const queryClient = useQueryClient();

  const [returnPolicy, setReturnPolicy] = useState('');
  const [paymentPolicy, setPaymentPolicy] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [secondaryCurrency, setSecondaryCurrency] = useState('');
  const [secondaryPerUsd, setSecondaryPerUsd] = useState('');
  const [priceDisplayMode, setPriceDisplayMode] = useState<'both' | 'primary' | 'secondary'>('both');
  const [productsLabel, setProductsLabel] = useState<'منتجات' | 'أصناف' | 'مواد'>('منتجات');
  const [dashboardCards, setDashboardCards] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      console.log('📥 تم تحميل بيانات الملف الشخصي:', profile);
      console.log('🏷️ products_label من الباك إند:', profile.products_label);
      
      setReturnPolicy(profile.return_policy || '');
      setPaymentPolicy(profile.payment_policy || '');
      setLogoUri(profile.logo_url || null);
      setLanguage(profile.language || 'ar');
      setSecondaryCurrency(profile.secondary_currency || '');
      setSecondaryPerUsd(profile.secondary_per_usd ? String(profile.secondary_per_usd) : '');
      setPriceDisplayMode(profile.price_display_mode || 'both');
      setProductsLabel(profile.products_label || 'منتجات');
      setDashboardCards(profile.dashboard_cards || []);
      
      console.log('✅ تم تحديث جميع الحقول');
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

  const productsLabelOptions: PickerOption[] = [
    { label: 'منتجات', value: 'منتجات' },
    { label: 'أصناف', value: 'أصناف' },
    { label: 'مواد', value: 'مواد' },
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
      
      console.log('🔄 بدء عملية الحفظ...');
      console.log('📋 بيانات الملف الشخصي:', profile.id);
      
      const formData = new FormData();
      
      // إرسال البيانات الأساسية فقط
      formData.append('return_policy', payload.return_policy || '');
      formData.append('payment_policy', payload.payment_policy || '');
      formData.append('language', payload.language || 'ar');
      formData.append('dashboard_cards', JSON.stringify(payload.dashboard_cards || []));
      formData.append('price_display_mode', payload.price_display_mode || 'both');
      formData.append('products_label', payload.products_label || 'منتجات');
      
      // إرسال العملة الثانوية فقط إذا كانت محددة
      if (payload.secondary_currency && payload.secondary_currency !== 'none' && payload.secondary_currency !== '') {
        formData.append('secondary_currency', payload.secondary_currency);
      }
      
      // إرسال سعر العملة الثانوية فقط إذا كان محدداً
      if (payload.secondary_per_usd && payload.secondary_per_usd !== '') {
        formData.append('secondary_per_usd', payload.secondary_per_usd);
      }
      
      console.log('📝 FormData المحضر:');
      console.log('- return_policy:', payload.return_policy);
      console.log('- payment_policy:', payload.payment_policy);
      console.log('- language:', payload.language);
      console.log('- dashboard_cards:', JSON.stringify(payload.dashboard_cards));
      console.log('- secondary_currency:', payload.secondary_currency);
      console.log('- secondary_per_usd:', payload.secondary_per_usd);
      console.log('- price_display_mode:', payload.price_display_mode);
      console.log('- products_label:', payload.products_label);
      console.log('- logo:', payload.logo ? 'موجود' : 'غير موجود');
      
      // إرسال الصورة فقط إذا تم تغييرها
      if (payload.logo && payload.logo !== profile.logo_url) {
        console.log('📸 إرسال صورة جديدة...');
        const filename = payload.logo.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('logo', {
          uri: payload.logo,
          name: filename,
          type,
        } as any);
      } else {
        console.log('📸 لا توجد صورة جديدة للإرسال');
      }

      console.log('🌐 إرسال الطلب للباك إند...');
      console.log('🔗 الرابط:', `${endpoints.companyProfile}${profile.id}/`);
      
      const res = await apiClient.patch(`${endpoints.companyProfile}${profile.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 10000, // 10 ثواني timeout
      });
      
      console.log('✅ تم الحفظ بنجاح!');
      console.log('📥 الاستجابة:', res.data);
      return res.data;
    },
    onSuccess: () => {
      showSuccess('✓ تم حفظ الإعدادات');
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      refetchProfile?.();
    },
    onError: (error: any) => {
      console.error('❌ خطأ في الحفظ:', error);
      console.error('📋 تفاصيل الخطأ:', error?.response?.data);
      console.error('🔗 الرابط المطلوب:', error?.config?.url);
      console.error('📝 البيانات المرسلة:', error?.config?.data);
      
      // معالجة أخطاء مختلفة
      let errorMessage = 'تعذر تحديث الإعدادات';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'انتهت مهلة الطلب - تحقق من اتصال الإنترنت';
      } else if (error.response?.status === 400) {
        errorMessage = 'بيانات غير صحيحة - تحقق من القيم المدخلة';
      } else if (error.response?.status === 413) {
        errorMessage = 'حجم الصورة كبير جداً - اختر صورة أصغر';
      } else if (error.response?.status >= 500) {
        errorMessage = 'خطأ في الخادم - حاول مرة أخرى لاحقاً';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      showError(errorMessage);
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
    // فحص التغييرات لتجنب إرسال بيانات غير متغيرة
    const hasChanges = 
      returnPolicy !== (profile?.return_policy || '') ||
      paymentPolicy !== (profile?.payment_policy || '') ||
      language !== (profile?.language || 'ar') ||
      JSON.stringify(dashboardCards) !== JSON.stringify(profile?.dashboard_cards || []) ||
      secondaryCurrency !== (profile?.secondary_currency || '') ||
      secondaryPerUsd !== (profile?.secondary_per_usd ? String(profile.secondary_per_usd) : '') ||
      priceDisplayMode !== (profile?.price_display_mode || 'both') ||
      productsLabel !== (profile?.products_label || 'منتجات') ||
      logoUri !== (profile?.logo_url || null);
    
    if (!hasChanges) {
      showSuccess('لا توجد تغييرات للحفظ');
      return;
    }
    
    const payload = {
      return_policy: returnPolicy,
      payment_policy: paymentPolicy,
      language,
      dashboard_cards: dashboardCards,
      secondary_currency: secondaryCurrency,
      secondary_per_usd: secondaryPerUsd,
      price_display_mode: priceDisplayMode,
      products_label: productsLabel || 'منتجات',
      logo: logoUri,
    };
    
    console.log('📤 البيانات المرسلة للباك إند:', JSON.stringify(payload, null, 2));
    console.log('🔍 فحص البيانات:');
    console.log('- products_label:', productsLabel, '(نوع:', typeof productsLabel, ')');
    console.log('- products_label في payload:', payload.products_label);
    console.log('🔄 تم اكتشاف تغييرات، بدء الحفظ...');
    
    updateMutation.mutate(payload);
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
      setProductsLabel(profile.products_label || 'منتجات');
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

  const handleLogout = async () => {
    const confirmed = await showConfirmation({
      title: 'تأكيد تسجيل الخروج',
      message: 'هل أنت متأكد من تسجيل الخروج من الحساب؟',
      confirmText: 'تسجيل الخروج',
      cancelText: 'إلغاء',
      type: 'danger',
    });
    
    if (confirmed) {
      void logout();
    }
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
            onChange={(value) => setSecondaryCurrency(value === 'none' ? '' : String(value))}
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

          <Picker
            label="تسمية المنتجات"
            placeholder="اختر التسمية"
            options={productsLabelOptions}
            value={productsLabel}
            onChange={(value) => setProductsLabel(value as 'منتجات' | 'أصناف' | 'مواد')}
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
          <EnhancedInput
            value={returnPolicy}
            onChangeText={setReturnPolicy}
            placeholder="أدخل سياسة الإرجاع الخاصة بالشركة"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            style={styles.textArea}
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
          <EnhancedInput
            value={paymentPolicy}
            onChangeText={setPaymentPolicy}
            placeholder="أدخل سياسة الدفع الخاصة بالشركة"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            style={styles.textArea}
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
              title={updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
              onPress={handleSave}
              loading={updateMutation.isPending}
              disabled={updateMutation.isPending}
              style={updateMutation.isPending ? { opacity: 0.7 } : {}}
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
