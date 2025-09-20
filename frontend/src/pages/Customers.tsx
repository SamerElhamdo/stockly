import React, { useMemo, useState } from 'react';
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
} from '@heroicons/react/24/outline';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient, endpoints } from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast';

interface ApiCustomer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

type SortKey = 'name' | 'phone' | 'email';

export const Customers: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [effectiveSearch, setEffectiveSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Quick action modal state
  const [openPayment, setOpenPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string>('');
  const [activeCustomer, setActiveCustomer] = useState<ApiCustomer | null>(null);
  const [createInvoiceLoading, setCreateInvoiceLoading] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['customers', effectiveSearch],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers, {
        params: { search: effectiveSearch || undefined },
      });
      // endpoint may return array or paginated
      return (Array.isArray(res.data) ? { results: res.data } : res.data) as { results: ApiCustomer[] };
    },
    keepPreviousData: true,
  });

  const list: ApiCustomer[] = data?.results || [];

  const sortedList = useMemo(() => {
    const clone = [...list];
    clone.sort((a, b) => {
      const av = (a[sortKey] || '').toString().toLowerCase();
      const bv = (b[sortKey] || '').toString().toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return clone;
  }, [list, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
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
    },
    onError: (err: any) => {
      toast({ title: 'خطأ', description: err?.response?.data?.detail || 'فشل تسجيل الدفعة', variant: 'destructive' });
    },
  });

  const createInvoice = async (customer: ApiCustomer) => {
    try {
      setCreateInvoiceLoading(true);
      const res = await apiClient.post(endpoints.invoices, { customer: customer.id });
      toast({ title: 'فاتورة جديدة', description: `تم إنشاء مسودة فاتورة #${res.data?.id}` });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err?.response?.data?.detail || 'تعذر إنشاء الفاتورة', variant: 'destructive' });
    } finally {
      setCreateInvoiceLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">العملاء</h1>
          <p className="text-muted-foreground mt-1">إدارة قاعدة بيانات العملاء</p>
        </div>
        <Button variant="hero" className="gap-2">
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
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setEffectiveSearch(searchTerm.trim()); refetch(); }}>بحث</Button>
            <Button variant="outline" onClick={() => toggleSort('name')} className="gap-1">
              الاسم <ArrowsUpDownIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => toggleSort('phone')} className="gap-1">
              الهاتف <ArrowsUpDownIcon className="h-4 w-4" />
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
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">البريد</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">العنوان</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                <tr><td className="py-6 px-6 text-muted-foreground" colSpan={5}>...جاري التحميل</td></tr>
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
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <EnvelopeIcon className="h-4 w-4" />
                        <span>{c.email || '-'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-muted-foreground">{c.address || '-'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => createInvoice(c)} disabled={createInvoiceLoading}>
                          <DocumentTextIcon className="h-4 w-4 ml-1" /> فاتورة جديدة
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setActiveCustomer(c); setOpenPayment(true); setPaymentAmount(''); setPaymentInvoiceId(''); }}>
                          <BanknotesIcon className="h-4 w-4 ml-1" /> إضافة دفعة
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setActiveCustomer(c); setOpenPayment(true); setPaymentAmount('-'); setPaymentInvoiceId(''); }}>
                          <ArrowUturnLeftIcon className="h-4 w-4 ml-1" /> سحب دفعة
                        </Button>
                        <Button variant="ghost" size="sm">
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

      {/* Payment Dialog */}
      <Dialog open={openPayment} onOpenChange={setOpenPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{paymentAmount.startsWith('-') ? 'سحب دفعة' : 'إضافة دفعة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">العميل: <span className="text-foreground font-medium">{activeCustomer?.name}</span></div>
            <Input
              placeholder="المبلغ (مثال: 100 أو -100 للسحب)"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
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
                const amount = Number(paymentAmount);
                if (!activeCustomer || !amount) return;
                paymentMutation.mutate({ customerId: activeCustomer.id, amount, invoiceId: paymentInvoiceId ? Number(paymentInvoiceId) : undefined });
              }}
              disabled={paymentMutation.isPending}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};