import React, { useMemo, useState } from 'react';
import {
  BanknotesIcon,
  CheckIcon,
  CreditCardIcon,
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useToast } from '../components/ui/use-toast';
import { apiClient, endpoints, normalizeListResponse } from '../lib/api';
import { Amount } from '../components/Amount';
import { useCompany } from '../contexts/CompanyContext';

interface ApiPayment {
  id: number;
  customer: number;
  customer_name: string;
  invoice?: number | null;
  amount: number | string;
  payment_method: string;
  payment_method_display?: string;
  payment_date: string;
  notes?: string | null;
  created_by?: string | null;
}

interface ApiBalance {
  id: number;
  customer: number;
  customer_name: string;
  total_invoiced: number | string;
  total_paid: number | string;
  total_returns: number | string;
  balance: number | string;
  last_updated: string;
}

interface ApiCustomerOption {
  id: number;
  name: string;
}

interface ApiInvoiceOption {
  id: number;
  customer: number;
  customer_name: string;
  total_amount: number | string;
  status: string;
}

type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other';

type MethodFilter = 'all' | PaymentMethod;

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'نقداً',
  bank_transfer: 'تحويل بنكي',
  check: 'شيك',
  credit_card: 'بطاقة ائتمان',
  other: 'أخرى',
};

const parseNumber = (value: number | string | undefined | null): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatCurrency = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export const Payments: React.FC = () => {
  const { toast } = useToast();
  const { formatAmount } = useCompany();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [effectiveSearch, setEffectiveSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [page, setPage] = useState(1);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [methodInput, setMethodInput] = useState<PaymentMethod>('cash');
  const [notesInput, setNotesInput] = useState('');

  const { data, isLoading, isFetching, isError } = useQuery<{ count: number; next: string | null; previous: string | null; results: ApiPayment[] }>({
    queryKey: ['payments', methodFilter, page],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.payments, {
        params: {
          page,
          payment_method: methodFilter === 'all' ? undefined : methodFilter,
        },
      });
      return normalizeListResponse<ApiPayment>(res.data);
    },
    placeholderData: (prev) => prev,
  });

  const payments = data?.results ?? [];
  const totalPayments = data?.count ?? payments.length;
  const hasNext = Boolean(data?.next);
  const hasPrev = Boolean(data?.previous);

  const { data: balancesData } = useQuery({
    queryKey: ['balances'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.balances);
      return normalizeListResponse<ApiBalance>(res.data);
    },
  });

  const balances = balancesData?.results ?? [];

  const filteredPayments = useMemo(() => {
    if (!effectiveSearch.trim()) return payments;
    const keyword = effectiveSearch.trim().toLowerCase();
    return payments.filter((payment) =>
      payment.customer_name?.toLowerCase().includes(keyword) ||
      (payment.payment_method_display || paymentMethodLabels[payment.payment_method as PaymentMethod] || '')
        .toLowerCase()
        .includes(keyword) ||
      String(payment.invoice || '').includes(keyword)
    );
  }, [effectiveSearch, payments]);

  const stats = useMemo(() => {
    const totalPaid = filteredPayments.reduce((acc, payment) => acc + parseNumber(payment.amount), 0);
    const summary = balances.reduce(
      (acc, balance) => {
        acc.totalInvoiced += parseNumber(balance.total_invoiced);
        acc.totalPaid += parseNumber(balance.total_paid);
        acc.totalReturns += parseNumber(balance.total_returns);
        acc.totalOutstanding += parseNumber(balance.balance);
        return acc;
      },
      { totalInvoiced: 0, totalPaid: 0, totalReturns: 0, totalOutstanding: 0 }
    );
    return {
      filteredCount: filteredPayments.length,
      totalPaid,
      outstanding: summary.totalOutstanding,
      invoiced: summary.totalInvoiced,
    };
  }, [filteredPayments, balances]);

  const { data: customersOptionsData } = useQuery({
    queryKey: ['payment-customers'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers);
      return normalizeListResponse<ApiCustomerOption>(res.data);
    },
    staleTime: 10 * 60 * 1000,
  });

  const customersOptions = customersOptionsData?.results ?? [];

  const { data: invoicesOptionsData } = useQuery({
    queryKey: ['payment-invoices', selectedCustomer],
    queryFn: async () => {
      if (!selectedCustomer) return normalizeListResponse<ApiInvoiceOption>([]);
      const res = await apiClient.get(endpoints.invoices, {
        params: {
          customer: selectedCustomer,
          status: 'confirmed',
        },
      });
      return normalizeListResponse<ApiInvoiceOption>(res.data);
    },
    enabled: Boolean(selectedCustomer),
  });

  const invoiceOptions = invoicesOptionsData?.results ?? [];

  const createPaymentMutation = useMutation({
    mutationFn: async (payload: { customer: number; amount: number; invoice?: number; payment_method: PaymentMethod; notes?: string }) => {
      const body: Record<string, any> = {
        customer: payload.customer,
        amount: payload.amount,
        payment_method: payload.payment_method,
      };
      if (payload.invoice) body.invoice = payload.invoice;
      if (payload.notes) body.notes = payload.notes;
      const res = await apiClient.post(endpoints.payments, body);
      return res.data as ApiPayment;
    },
    onSuccess: () => {
      toast({ title: 'تم تسجيل الدفعة', description: 'تمت إضافة الدفعة بنجاح' });
      setCreateDialogOpen(false);
      setSelectedCustomer('');
      setSelectedInvoice('');
      setAmountInput('');
      setMethodInput('cash');
      setNotesInput('');
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.refetchQueries({ queryKey: ['payments'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'تعذر تسجيل الدفعة';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const openCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setSelectedCustomer('');
    setSelectedInvoice('');
    setAmountInput('');
    setMethodInput('cash');
    setNotesInput('');
    createPaymentMutation.reset();
  };

  const submitPayment = () => {
    const amountValue = parseFloat(amountInput);
    if (!selectedCustomer) {
      toast({ title: 'اختر العميل', description: 'يرجى اختيار العميل المستفيد من الدفعة', variant: 'destructive' });
      return;
    }
    if (!amountValue || Number.isNaN(amountValue) || amountValue <= 0) {
      toast({ title: 'قيمة غير صالحة', description: 'يرجى إدخال قيمة دفعة صحيحة', variant: 'destructive' });
      return;
    }

    createPaymentMutation.mutate({
      customer: Number(selectedCustomer),
      amount: amountValue,
      invoice: selectedInvoice ? Number(selectedInvoice) : undefined,
      payment_method: methodInput,
      notes: notesInput.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المدفوعات</h1>
          <p className="text-muted-foreground mt-1">سجل المدفوعات ومتابعة أرصدة العملاء</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={openCreateDialog}>
          <PlusIcon className="h-4 w-4" />
          إضافة دفعة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-full">
              <CreditCardIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">عدد الدفعات</p>
              <p className="text-xl font-bold text-foreground">{stats.filteredCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-light rounded-full">
              <CheckIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المدفوع</p>
              <p className="text-xl font-bold text-foreground"><Amount value={stats.totalPaid} digits={2} /></p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-light rounded-full">
              <BanknotesIcon className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الرصيد المستحق</p>
              <p className="text-xl font-bold text-foreground"><Amount value={stats.outstanding} digits={2} /></p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-full">
              <DocumentTextIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الفواتير</p>
              <p className="text-xl font-bold text-foreground"><Amount value={stats.invoiced} digits={2} /></p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="البحث باسم العميل أو طريقة الدفع أو رقم الفاتورة"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant="outline"
              onClick={() => {
                setEffectiveSearch(searchTerm);
                setPage(1);
              }}
              className="flex items-center gap-2"
            >
              <FunnelIcon className="h-4 w-4" />
              بحث
            </Button>
            <Select value={methodFilter} onValueChange={(value) => { setMethodFilter(value as MethodFilter); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطرق</SelectItem>
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setEffectiveSearch('');
                setMethodFilter('all');
                setPage(1);
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
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">العميل</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الفاتورة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المبلغ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">طريقة الدفع</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">التاريخ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المستخدم</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-28" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-28" /></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td className="py-6 px-6 text-destructive" colSpan={6}>
                    تعذر جلب بيانات المدفوعات
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td className="py-6 px-6 text-muted-foreground" colSpan={6}>
                    لا توجد دفعات مطابقة
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border hover:bg-card-hover transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-foreground font-medium">{payment.customer_name}</span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {payment.invoice ? `فاتورة #${payment.invoice}` : '—'}
                    </td>
                    <td className="py-4 px-6 font-semibold text-foreground"><Amount value={parseNumber(payment.amount)} digits={2} /></td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {payment.payment_method_display || paymentMethodLabels[payment.payment_method as PaymentMethod]}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleString('ar')}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">{payment.created_by || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">الإجمالي: {totalPayments.toLocaleString()} دفعة</div>
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

      <Dialog open={createDialogOpen} onOpenChange={(open) => (open ? undefined : closeCreateDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة دفعة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">العميل</label>
              <Select value={selectedCustomer} onValueChange={(value) => { setSelectedCustomer(value); setSelectedInvoice(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {customersOptions.map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">ربط بفاتورة (اختياري)</label>
              <Select value={selectedInvoice} onValueChange={setSelectedInvoice} disabled={!selectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedCustomer ? 'اختر الفاتورة' : 'اختر العميل أولاً'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون فاتورة</SelectItem>
                  {invoiceOptions.map((invoice) => (
                    <SelectItem key={invoice.id} value={String(invoice.id)}>
                      {`فاتورة #${invoice.id} - `}
                      <Amount value={parseNumber(invoice.total_amount)} digits={2} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="قيمة الدفعة"
                placeholder="0.00"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">طريقة الدفع</label>
                <Select value={methodInput} onValueChange={(value) => setMethodInput(value as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethodLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">ملاحظات (اختياري)</label>
              <Textarea
                placeholder="معلومات إضافية حول الدفعة"
                value={notesInput}
                onChange={(event) => setNotesInput(event.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className='mx-2' variant="outline" onClick={closeCreateDialog}>
              إلغاء
            </Button>
            <Button className='mx-2' onClick={submitPayment} disabled={createPaymentMutation.isPending}>
              حفظ الدفعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

