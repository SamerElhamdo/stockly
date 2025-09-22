import React, { useMemo, useState } from 'react';
import {
  KeyIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import { apiClient, endpoints } from '../lib/api';
import { useToast } from '../components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';

interface CompanyUser {
  id: number;
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  account_type?: string | null;
  role?: string | null;
  role_display?: string | null;
  is_active: boolean;
  created_at: string;
  last_login?: string | null;
}

type NewUserForm = {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  notes: string;
};

const initialForm: NewUserForm = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone: '',
  notes: '',
};

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString('ar') : '—');

export const Users: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [effectiveSearch, setEffectiveSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState<NewUserForm>(initialForm);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['company-users'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.users);
      // DRF list response
      const payload = res.data as { results?: CompanyUser[] } | CompanyUser[];
      return Array.isArray(payload) ? payload : (payload.results || []);
    },
  });

  const users = data ?? [];

  const filteredUsers = useMemo(() => {
    if (!effectiveSearch.trim()) return users;
    const keyword = effectiveSearch.trim().toLowerCase();
    return users.filter((user) =>
      user.username.toLowerCase().includes(keyword) ||
      (user.email || '').toLowerCase().includes(keyword) ||
      (user.first_name || '').toLowerCase().includes(keyword) ||
      (user.last_name || '').toLowerCase().includes(keyword)
    );
  }, [users, effectiveSearch]);

  const registerMutation = useMutation({
    mutationFn: async (payload: NewUserForm) => {
      const res = await apiClient.post(endpoints.users, {
        username: payload.username,
        email: payload.email,
        password: payload.password,
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone,
        notes: payload.notes || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'تم إنشاء المستخدم', description: 'تمت إضافة المستخدم بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      setCreateDialogOpen(false);
      setForm(initialForm);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'تعذر إنشاء المستخدم';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(endpoints.deleteUser(id));
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'تم الحذف', description: 'تم حذف المستخدم بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'تعذر حذف المستخدم';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const handleChange = (field: keyof NewUserForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitForm = () => {
    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال اسم المستخدم والبريد وكلمة المرور', variant: 'destructive' });
      return;
    }
    registerMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المستخدمون</h1>
          <p className="text-muted-foreground mt-1">إدارة مستخدمي الشركة وصلاحياتهم</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          إضافة مستخدم جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-full">
              <UserGroupIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
              <p className="text-xl font-bold text-foreground">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-light rounded-full">
              <ShieldCheckIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المستخدمون النشطون</p>
              <p className="text-xl font-bold text-foreground">{users.filter((user) => user.is_active).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-full">
              <KeyIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المستخدمون بدون تسجيل دخول</p>
              <p className="text-xl font-bold text-foreground">{users.filter((user) => !user.last_login).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-[260px]">
            <Input
              className="w-full"
              placeholder="البحث باسم المستخدم أو البريد"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEffectiveSearch(searchTerm);
              }}
            >
              بحث
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setEffectiveSearch('');
              }}
            >
              إعادة تعيين
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المستخدم</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">البريد</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الهاتف</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الدور</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">آخر دخول</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="py-6 px-6 text-muted-foreground" colSpan={6}>
                    ...جاري التحميل
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td className="py-6 px-6 text-destructive" colSpan={6}>
                    تعذر جلب بيانات المستخدمين
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="py-6 px-6 text-muted-foreground" colSpan={6}>
                    لا توجد نتائج مطابقة
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-card-hover transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <UserCircleIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">{user.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {(user.first_name || '') + (user.last_name ? ` ${user.last_name}` : '') || '—'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">{user.email || '—'}</td>
                    <td className="py-4 px-6 text-muted-foreground">{user.phone || '—'}</td>
                    <td className="py-4 px-6">
                      {(user.account_type === 'company_owner') || user.role === 'company_owner' || (user.role_display && user.role_display.includes('مالك')) ? (
                        <span className="text-success font-medium">مالك الشركة</span>
                      ) : (
                        <span className="text-muted-foreground">مستخدم عادي</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">{formatDate(user.last_login)}</td>
                    <td className="py-4 px-6">
                      {(user.account_type === 'company_owner') || user.role === 'company_owner' || (user.role_display && user.role_display.includes('مالك')) ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-destructive border-destructive"
                          onClick={() => deleteMutation.mutate(user.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <TrashIcon className="h-4 w-4" />
                          حذف
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setForm(initialForm);
          registerMutation.reset();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="اسم المستخدم"
                placeholder="username"
                value={form.username}
                onChange={handleChange('username')}
              />
              <Input
                label="البريد الإلكتروني"
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={handleChange('email')}
              />
              <Input
                label="كلمة المرور"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange('password')}
              />
              <Input
                label="رقم الهاتف"
                placeholder="05XXXXXXXX"
                value={form.phone}
                onChange={handleChange('phone')}
              />
              <Input
                label="الاسم الأول"
                value={form.first_name}
                onChange={handleChange('first_name')}
              />
              <Input
                label="اسم العائلة"
                value={form.last_name}
                onChange={handleChange('last_name')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">ملاحظات داخلية</label>
              <Textarea
                placeholder="معلومات إضافية عن المستخدم"
                value={form.notes}
                onChange={handleChange('notes')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className='mx-2' variant="outline" onClick={() => setCreateDialogOpen(false)}>
              إلغاء
            </Button>
            <Button className='mx-2' onClick={submitForm} disabled={registerMutation.isPending}>
              حفظ المستخدم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

