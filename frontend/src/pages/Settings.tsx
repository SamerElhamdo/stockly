import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpTrayIcon, DocumentTextIcon, PhotoIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../components/ui/custom-button';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { apiClient, endpoints } from '../lib/api';

interface CompanyProfile {
  id: number;
  company: number;
  company_name: string;
  company_code: string;
  company_email?: string | null;
  company_phone?: string | null;
  company_address?: string | null;
  logo?: string | null;
  logo_url?: string | null;
  return_policy?: string | null;
  payment_policy?: string | null;
  language?: 'ar' | 'en';
  navbar_message?: string | null;
  dashboard_cards?: string[];
  primary_currency?: 'USD';
  secondary_currency?: string | null;
  secondary_per_usd?: number | null;
  price_display_mode?: 'both' | 'primary' | 'secondary';
  updated_at: string;
}

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString('ar') : '—');

export const Settings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const res = await apiClient.get<CompanyProfile>(endpoints.companyProfile);
      return res.data;
    },
  });

  const [returnPolicy, setReturnPolicy] = useState('');
  const [paymentPolicy, setPaymentPolicy] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [navbarMessage, setNavbarMessage] = useState('');
  const [dashboardCards, setDashboardCards] = useState<string[]>([]);
  const [secondaryCurrency, setSecondaryCurrency] = useState<string>('');
  const [secondaryPerUsd, setSecondaryPerUsd] = useState<string>('');
  const [priceDisplayMode, setPriceDisplayMode] = useState<'both' | 'primary' | 'secondary'>('both');
  const dashboardOptions = useMemo(
    () => [
      { key: 'total_sales', label: 'إجمالي المبيعات' },
      { key: 'today_invoices', label: 'فواتير اليوم' },
      { key: 'products', label: 'المنتجات النشطة' },
      { key: 'customers', label: 'العملاء' },
    ],
    []
  );

  useEffect(() => {
    if (profile) {
      setReturnPolicy(profile.return_policy || '');
      setPaymentPolicy(profile.payment_policy || '');
      setLogoPreview(profile.logo_url || null);
      setLogoFile(null);
      setRemoveLogo(false);
      setLanguage(profile.language || 'ar');
      setNavbarMessage(profile.navbar_message || '');
      setDashboardCards(profile.dashboard_cards || []);
      setSecondaryCurrency(profile.secondary_currency || '');
      setSecondaryPerUsd(profile.secondary_per_usd ? String(profile.secondary_per_usd) : '');
      setPriceDisplayMode(profile.price_display_mode || 'both');
    }
  }, [profile]);

  useEffect(() => {
    return () => {
      if (logoPreview && logoFile) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview, logoFile]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { return_policy: string; payment_policy: string; language: string; navbar_message: string; dashboard_cards: string[]; secondary_currency?: string | null; secondary_per_usd?: string | null; price_display_mode: string; logo?: File | null; remove_logo?: boolean }) => {
      if (!profile) throw new Error('لا يوجد ملف شركة');
      const formData = new FormData();
      formData.append('return_policy', payload.return_policy);
      formData.append('payment_policy', payload.payment_policy);
      formData.append('language', payload.language);
      formData.append('navbar_message', payload.navbar_message);
      formData.append('dashboard_cards', JSON.stringify(payload.dashboard_cards || []));
      if (payload.secondary_currency) formData.append('secondary_currency', payload.secondary_currency);
      if (payload.secondary_per_usd) formData.append('secondary_per_usd', payload.secondary_per_usd);
      formData.append('price_display_mode', payload.price_display_mode);
      if (payload.logo) {
        formData.append('logo', payload.logo);
      }
      if (payload.remove_logo) {
        formData.append('remove_logo', 'true');
      }
      const res = await apiClient.patch(endpoints.companyProfileDetail(profile.id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data as CompanyProfile;
    },
    onSuccess: () => {
      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات الشركة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'تعذر تحديث الإعدادات';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE_BYTES) {
      toast({
        title: 'حجم الصورة كبير',
        description: 'الحد الأقصى للحجم هو 2 ميجابايت. الرجاء اختيار صورة أصغر.',
        variant: 'destructive',
      });
      event.currentTarget.value = '';
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  };

  const handleRemoveLogo = () => {
    if (logoPreview && logoFile) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const submitForm = () => {
    updateMutation.mutate({
      return_policy: returnPolicy,
      payment_policy: paymentPolicy,
      language,
      navbar_message: navbarMessage,
      dashboard_cards: dashboardCards,
      secondary_currency: secondaryCurrency,
      secondary_per_usd: secondaryPerUsd,
      price_display_mode: priceDisplayMode,
      logo: logoFile || undefined,
      remove_logo: removeLogo || (!logoFile && !logoPreview),
    });
  };

  const companyDetails = useMemo(() => {
    if (!profile) return [] as Array<{ label: string; value: string }>;
    return [
      { label: 'اسم الشركة', value: profile.company_name },
      { label: 'كود الشركة', value: profile.company_code },
      { label: 'البريد الإلكتروني', value: profile.company_email || '—' },
      { label: 'رقم الهاتف', value: profile.company_phone || '—' },
      { label: 'العنوان', value: profile.company_address || '—' },
      { label: 'آخر تحديث', value: formatDate(profile.updated_at) },
    ];
  }, [profile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">تحديث سياسات الشركة والعلامة التجارية</p>
      </div>

      {isLoading ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">...جاري التحميل</div>
      ) : isError || !profile ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center text-destructive">
          تعذر تحميل بيانات الشركة
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">اللغة</label>
                    <Select
                      value={language}
                      onValueChange={(value) => setLanguage(value as 'ar' | 'en')}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="اختر اللغة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-foreground">رسالة الشريط العلوي</label>
                    <input
                      className="mt-1 w-full px-3 py-2 rounded-md border border-input-border bg-background text-sm focus:outline-none"
                      placeholder="نص قصير يظهر بجانب الترحيب"
                      value={navbarMessage}
                      onChange={(e) => setNavbarMessage(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">العملة الأساسية</label>
                    <input className="mt-1 w-full px-3 py-2 rounded-md border border-input-border bg-muted text-sm" value="USD" disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">العملة الثانوية</label>
                    <Select
                      value={secondaryCurrency || 'none'}
                      onValueChange={(value) => setSecondaryCurrency(value === 'none' ? '' : value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="اختر العملة الثانوية" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون</SelectItem>
                        <SelectItem value="SYP">الليرة السورية (SYP)</SelectItem>
                        <SelectItem value="SAR">الريال السعودي (SAR)</SelectItem>
                        <SelectItem value="TRY">الليرة التركية (TRY)</SelectItem>
                        <SelectItem value="AED">الدرهم الإماراتي (AED)</SelectItem>
                        <SelectItem value="EUR">اليورو (EUR)</SelectItem>
                        <SelectItem value="LBP">الليرة اللبنانية (LBP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">سعر 1 دولار بالثانوية</label>
                    <input
                      className="mt-1 w-full px-3 py-2 rounded-md border border-input-border bg-background text-sm focus:outline-none"
                      placeholder="مثال: 15000"
                      value={secondaryPerUsd}
                      onChange={(e) => setSecondaryPerUsd(e.target.value)}
                      disabled={!secondaryCurrency}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">عرض الأسعار</label>
                    <Select
                      value={priceDisplayMode}
                      onValueChange={(value) => setPriceDisplayMode(value as 'both' | 'primary' | 'secondary')}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="اختر طريقة العرض" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">كلا العملتين</SelectItem>
                        <SelectItem value="primary">الدولار فقط</SelectItem>
                        <SelectItem value="secondary">الثانوية فقط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-light rounded-full">
                    <ShieldCheckIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">كروت لوحة التحكم</h2>
                    <p className="text-sm text-muted-foreground">اختر الكروت التي ستظهر في صفحة لوحة التحكم</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dashboardOptions.map((opt) => {
                    const checked = (dashboardCards || []).includes(opt.key);
                    return (
                      <label key={opt.key} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-neo hover:shadow-neo-hover overflow-hidden cursor-pointer select-none">
                        <span className="text-sm text-foreground">{opt.label}</span>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            setDashboardCards((prev) => {
                              const set = new Set(prev || []);
                              if (value) set.add(opt.key);
                              else set.delete(opt.key);
                              return Array.from(set);
                            })
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
              </div>
              <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-light rounded-full">
                    <PhotoIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">شعار الشركة</h2>
                    <p className="text-sm text-muted-foreground">رفع شعار جديد أو إزالة الشعار الحالي</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <img src={logoPreview} alt="شعار الشركة" className="h-full w-full object-contain" />
                      ) : (
                        <PhotoIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>يُفضل استخدام صورة مربعة بدقة عالية.</p>
                      <p>الحد الأقصى للحجم 2 ميجابايت.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <label className="relative inline-flex items-center justify-center px-4 py-2 rounded-xl bg-card text-foreground font-medium cursor-pointer shadow-neo transition hover:shadow-neo-hover">
                      <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                      رفع شعار
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                    {(logoPreview || profile.logo_url) && (
                      <Button variant="outline" onClick={handleRemoveLogo}>
                        إزالة الشعار
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-light rounded-full">
                    <DocumentTextIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">سياسة الإرجاع</h2>
                    <p className="text-sm text-muted-foreground">سيتم عرض هذه السياسة في الفواتير المطبوعة</p>
                  </div>
                </div>
                <Textarea
                  placeholder="أدخل سياسة الإرجاع الخاصة بالشركة"
                  value={returnPolicy}
                  onChange={(event) => setReturnPolicy(event.target.value)}
                  rows={6}
                />
              </div>

              <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-light rounded-full">
                    <ShieldCheckIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">سياسة الدفع</h2>
                    <p className="text-sm text-muted-foreground">تظهر سياسة الدفع أيضاً في الفواتير</p>
                  </div>
                </div>
                <Textarea
                  placeholder="أدخل سياسة الدفع الخاصة بالشركة"
                  value={paymentPolicy}
                  onChange={(event) => setPaymentPolicy(event.target.value)}
                  rows={6}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                <h2 className="text-lg font-semibold text-foreground">معلومات الشركة</h2>
                <div className="space-y-3 text-sm">
                  {companyDetails.map((detail) => (
                    <div key={detail.label} className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">{detail.label}</span>
                      <span className="text-foreground font-medium text-left">{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-lg border border-border p-6 space-y-3">
                <h2 className="text-lg font-semibold text-foreground">الإجراءات</h2>
                <Button className="mx-3" onClick={submitForm} disabled={updateMutation.isPending}>
                  حفظ التغييرات
                </Button>
                <Button
                  className="mx-3"
                  variant="outline"
                  onClick={() => {
                    if (profile) {
                      setReturnPolicy(profile.return_policy || '');
                      setPaymentPolicy(profile.payment_policy || '');
                      setLogoPreview(profile.logo_url || null);
                      setLogoFile(null);
                      setRemoveLogo(false);
                      setLanguage(profile.language || 'ar');
                      setNavbarMessage(profile.navbar_message || '');
                      setDashboardCards(profile.dashboard_cards || []);
                      setSecondaryCurrency(profile.secondary_currency || '');
                      setSecondaryPerUsd(profile.secondary_per_usd ? String(profile.secondary_per_usd) : '');
                      setPriceDisplayMode(profile.price_display_mode || 'both');
                    }
                  }}
                >
                  استرجاع القيم الحالية
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

