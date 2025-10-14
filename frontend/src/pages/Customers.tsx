import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiResponse } from '../lib/api';
import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ArrowUturnLeftIcon,
  ArrowsUpDownIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, endpoints, normalizeListResponse } from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast';
import { Amount } from '../components/Amount';
import { Skeleton } from '../components/ui/skeleton';
import { useCompany } from '../contexts/CompanyContext';

interface ApiCustomer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  archived?: boolean;
  created_at?: string;
}

type SortKey = 'name' | 'phone' | 'email' | 'created_at' | 'dues';

interface ApiCustomerWithDues extends ApiCustomer {
  dues?: number | string | null;
}

export const Customers: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatAmount } = useCompany();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [effectiveSearch, setEffectiveSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  // Quick action modal state
  const [openPayment, setOpenPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string>('');
  const [activeCustomer, setActiveCustomer] = useState<ApiCustomer | null>(null);
  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [createInvoiceLoading, setCreateInvoiceLoading] = useState(false);

  // Create / edit customer dialog state
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [editingCustomer, setEditingCustomer] = useState<ApiCustomer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<ApiCustomer | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<ApiResponse<ApiCustomerWithDues>>({
    queryKey: ['customers', effectiveSearch, page],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers, {
        params: { search: effectiveSearch || undefined, page },
      });
      return normalizeListResponse<ApiCustomerWithDues>(res.data);
    },
    placeholderData: (prev) => prev,
  });

  const { data: balancesData } = useQuery({
    queryKey: ['balances'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.balances);
      return normalizeListResponse<{ customer: number; balance: number | string }>(res.data);
    },
    staleTime: 60 * 1000,
  });

  const listRaw: ApiCustomerWithDues[] = data?.results || [];
  const balances = balancesData?.results || [];
  const customerIdToBalance = useMemo(() => {
    const map = new Map<number, number>();
    balances.forEach((b) => map.set((b as any).customer, Number((b as any).balance || 0)));
    return map;
  }, [balances]);

  const list: ApiCustomerWithDues[] = useMemo(() => {
    return listRaw.map((c) => ({ ...c, dues: customerIdToBalance.get(c.id) ?? c.dues ?? 0 }));
  }, [listRaw, customerIdToBalance]);
  const total = data?.count ?? list.length;
  const hasNext = Boolean(data?.next);
  const hasPrev = Boolean(data?.previous);

  const sortedList = useMemo(() => {
    const clone = [...list];
    clone.sort((a, b) => {
      if (sortKey === 'created_at') {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortDir === 'asc' ? at - bt : bt - at;
      }
      if (sortKey === 'dues') {
        const av = Number((a.dues as any) ?? 0);
        const bv = Number((b.dues as any) ?? 0);
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const av = (a[sortKey] || '').toString().toLowerCase();
      const bv = (b[sortKey] || '').toString().toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return clone;
  }, [list, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    const allowed: SortKey[] = ['created_at', 'dues'];
    if (!allowed.includes(key)) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const resetCustomerForm = () => {
    setCustomerForm({ name: '', phone: '', email: '', address: '' });
  };

  const openCreateDialog = () => {
    setEditingCustomer(null);
    resetCustomerForm();
    setCustomerFormOpen(true);
  };

  const openEditDialog = (customer: ApiCustomer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
    setCustomerFormOpen(true);
  };

  const handleCustomerFieldChange = (field: keyof typeof customerForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  // Mutations
  const paymentMutation = useMutation({
    mutationFn: async (vars: { customerId: number; amount: number; invoiceId?: number }) => {
      const payload: any = {
        customer: vars.customerId,
        amount: vars.amount,
        payment_method: 'cash',
        notes: '',
      };
      if (vars.invoiceId) payload.invoice = vars.invoiceId;
      const res = await apiClient.post(endpoints.payments, payload);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'تمت العملية', description: 'تم تسجيل الدفعة بنجاح' });
      setOpenPayment(false);
      setPaymentAmount('');
      setPaymentInvoiceId('');
      // تحديث كل من قائمة العملاء والأرصدة
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
    onError: (err: any) => {
      toast({ title: 'خطأ', description: err?.response?.data?.detail || 'فشل تسجيل الدفعة', variant: 'destructive' });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (payload: { name: string; phone?: string; email?: string; address?: string }) => {
      const res = await apiClient.post(endpoints.customers, payload);
      return res.data as ApiCustomer;
    },
    onSuccess: () => {
      toast({ title: 'تمت الإضافة', description: 'تم إنشاء العميل بنجاح' });
      setCustomerFormOpen(false);
      resetCustomerForm();
      setEditingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر إنشاء العميل';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (payload: { id: number; data: { name: string; phone?: string; email?: string; address?: string } }) => {
      const res = await apiClient.patch(endpoints.customerDetail(payload.id), payload.data);
      return res.data as ApiCustomer;
    },
    onSuccess: () => {
      toast({ title: 'تم التحديث', description: 'تم تحديث بيانات العميل' });
      setCustomerFormOpen(false);
      resetCustomerForm();
      setEditingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر تحديث بيانات العميل';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(endpoints.customerDetail(id));
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'تم الحذف', description: 'تم حذف العميل بنجاح' });
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر حذف العميل';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const isSavingCustomer = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  const createInvoice = (customer: ApiCustomer) => {
    // انتقل إلى صفحة الفواتير مع تمرير العميل لبدء إنشاء فاتورة ومسار إضافة العناصر
    navigate('/invoices', { state: { action: 'create_invoice', customerId: customer.id, customerName: customer.name } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">العملاء</h1>
          <p className="text-muted-foreground mt-1">إدارة قاعدة بيانات العملاء</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={openCreateDialog}>
          <PlusIcon className="h-4 w-4" />
          إضافة عميل جديد
        </Button>
      </div>

      {/* Search & Sort */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="البحث في العملاء..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  setEffectiveSearch(searchTerm.trim());
                  refetch();
                }
              }}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setEffectiveSearch(searchTerm.trim());
                refetch();
              }}
            >
              بحث
            </Button>
            {/* Removed name/phone sorting per request */}
            <Button variant="outline" onClick={() => toggleSort('created_at')} className="gap-1">
              التاريخ <ArrowsUpDownIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => toggleSort('dues')} className="gap-1">
              المستحقات <ArrowsUpDownIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الاسم</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الهاتف</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المستحقات</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">التاريخ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-28" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-5 w-28" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-40" /></td>
                  </tr>
                ))
              ) : isError ? (
                <tr><td className="py-6 px-6 text-destructive" colSpan={5}>تعذر جلب البيانات</td></tr>
              ) : sortedList.length === 0 ? (
                <tr><td className="py-6 px-6 text-muted-foreground" colSpan={5}>لا توجد بيانات</td></tr>
              ) : (
                sortedList.map((c, idx) => (
                  <tr key={c.id} className={`border-b border-border ${idx % 2 === 0 ? 'bg-background' : 'bg-card'}`}>
                    <td className="py-4 px-6">
                      <div className="font-medium text-foreground">{c.name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <PhoneIcon className="h-4 w-4" />
                        <span className="ltr">{c.phone || '-'}</span>
                      </div>
                    </td>
                  <td className="py-4 px-6">
                    {typeof c.dues !== 'undefined' && c.dues !== null ? (
                      <Amount value={Number(c.dues)} digits={2} tone={Number(c.dues) > 0 ? 'destructive' : Number(c.dues) < 0 ? 'success' : undefined} />
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-muted-foreground">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('ar') : '—'}
                  </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => createInvoice(c)} disabled={createInvoiceLoading}>
                          <DocumentTextIcon className="h-4 w-4 ml-1" /> فاتورة جديدة
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setActiveCustomer(c); setOpenPayment(true); setPaymentAmount(''); setPaymentInvoiceId(''); setIsWithdrawal(false); }}>
                          <BanknotesIcon className="h-4 w-4 ml-1" /> إضافة دفعة
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setActiveCustomer(c); setOpenPayment(true); setPaymentAmount(''); setPaymentInvoiceId(''); setIsWithdrawal(true); }}>
                          <ArrowUturnLeftIcon className="h-4 w-4 ml-1" /> سحب دفعة
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/${c.id}`)}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => { setCustomerToDelete(c); setDeleteDialogOpen(true); }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(c)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">الإجمالي: {total.toLocaleString()} عميل</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev || page === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">صفحة {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => setPage((current) => current + 1)}
          >
            التالي
          </Button>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={openPayment} onOpenChange={setOpenPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isWithdrawal ? 'سحب دفعة' : 'إضافة دفعة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">العميل: <span className="text-foreground font-medium">{activeCustomer?.name}</span></div>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="المبلغ (مثال: 100)"
              value={paymentAmount}
              onChange={(e) => {
                const value = e.target.value;
                // تأكد من أن القيمة موجبة
                if (value && Number(value) < 0) return;
                setPaymentAmount(value);
              }}
            />
            <Input
              placeholder="رقم الفاتورة (اختياري)"
              value={paymentInvoiceId}
              onChange={(e) => setPaymentInvoiceId(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPayment(false)}>إلغاء</Button>
            <Button
              onClick={() => {
                let amount = Number(paymentAmount);
                if (!activeCustomer || !amount) return;
                // إذا كانت عملية سحب، نقوم بتحويل المبلغ إلى سالب
                if (isWithdrawal) {
                  amount = -amount;
                }
                paymentMutation.mutate({ customerId: activeCustomer.id, amount, invoiceId: paymentInvoiceId ? Number(paymentInvoiceId) : undefined });
              }}
              disabled={paymentMutation.isPending}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف العميل</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف العميل <span className="text-foreground font-medium">{customerToDelete?.name}</span>؟</p>
            <p className="text-xs text-muted-foreground">سيتم حذف فواتيره ومدفوعاته ومرتجعاته المرتبطة به.</p>
          </div>
          <DialogFooter>
            <Button className='mx-2' variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button
              className='mx-2'
              variant="destructive"
              onClick={() => customerToDelete && deleteCustomerMutation.mutate(customerToDelete.id)}
              disabled={deleteCustomerMutation.isPending}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Customer Dialog */}
      <Dialog
        open={customerFormOpen}
        onOpenChange={(open) => {
          setCustomerFormOpen(open);
          if (!open) {
            resetCustomerForm();
            setEditingCustomer(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'تعديل العميل' : 'إضافة عميل جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="الاسم"
              placeholder="اسم العميل"
              value={customerForm.name}
              onChange={handleCustomerFieldChange('name')}
              required
            />
            <Input
              label="الهاتف"
              placeholder="رقم الهاتف"
              value={customerForm.phone}
              onChange={handleCustomerFieldChange('phone')}
            />
            <Input
              label="البريد الإلكتروني"
              type="email"
              placeholder="example@mail.com"
              value={customerForm.email}
              onChange={handleCustomerFieldChange('email')}
            />
            <Input
              label="العنوان"
              placeholder="عنوان العميل"
              value={customerForm.address}
              onChange={handleCustomerFieldChange('address')}
            />
          </div>
          <DialogFooter>
            <Button className='mx-2' variant="outline" onClick={() => { setCustomerFormOpen(false); resetCustomerForm(); setEditingCustomer(null); }}>
              إلغاء
            </Button>
            <Button className='mx-2'
              onClick={() => {
                const payload = {
                  name: customerForm.name.trim(),
                  phone: customerForm.phone.trim(),
                  email: customerForm.email.trim(),
                  address: customerForm.address.trim(),
                };
                if (!payload.name) return;
                if (editingCustomer) {
                  updateCustomerMutation.mutate({ id: editingCustomer.id, data: payload });
                } else {
                  createCustomerMutation.mutate(payload);
                }
              }}
              disabled={!customerForm.name.trim() || isSavingCustomer}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};