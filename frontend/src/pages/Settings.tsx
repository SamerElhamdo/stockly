import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpTrayIcon, DocumentTextIcon, PhotoIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../components/ui/custom-button';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../components/ui/use-toast';
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

  useEffect(() => {
    if (profile) {
      setReturnPolicy(profile.return_policy || '');
      setPaymentPolicy(profile.payment_policy || '');
      setLogoPreview(profile.logo_url || null);
      setLogoFile(null);
      setRemoveLogo(false);
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
    mutationFn: async (payload: { return_policy: string; payment_policy: string; logo?: File | null; remove_logo?: boolean }) => {
      if (!profile) throw new Error('لا يوجد ملف شركة');
      const formData = new FormData();
      formData.append('return_policy', payload.return_policy);
      formData.append('payment_policy', payload.payment_policy);
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
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'تعذر تحديث الإعدادات';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
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
                    <label className="relative inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium cursor-pointer shadow-neo transition hover:shadow-neo-hover">
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
                <Button onClick={submitForm} disabled={updateMutation.isPending}>
                  حفظ التغييرات
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (profile) {
                      setReturnPolicy(profile.return_policy || '');
                      setPaymentPolicy(profile.payment_policy || '');
                      setLogoPreview(profile.logo_url || null);
                      setLogoFile(null);
                      setRemoveLogo(false);
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

