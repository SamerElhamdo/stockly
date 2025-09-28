import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { apiClient, endpoints, normalizeListResponse } from '../lib/api';
import { Button } from '../components/ui/custom-button';
import { Skeleton } from '../components/ui/skeleton';
import { Amount } from '../components/Amount';
import { useCompany } from '../contexts/CompanyContext';
import { PrinterIcon, DocumentTextIcon, BanknotesIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

interface ApiCustomer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

interface ApiInvoice {
  id: number;
  customer?: number;
  customer_name: string;
  total_amount: number | string;
  status: string;
  created_at: string;
  items?: any[];
}

interface ApiPayment {
  id: number;
  customer: number;
  customer_name: string;
  invoice?: number | null;
  amount: number | string;
  payment_method: string;
  payment_method_display?: string;
  payment_date: string;
}

interface ApiReturn {
  id: number;
  return_number: string;
  invoice_id: number;
  customer_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  total_amount: number | string;
  return_date: string;
}

interface ApiBalance {
  id: number;
  customer: number;
  customer_name: string;
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

export const CustomerDetails: React.FC = () => {
  const params = useParams();
  const idParam = params.id ? Number(params.id) : NaN;
  const customerId = Number.isFinite(idParam) ? idParam : undefined;
  const { formatAmount } = useCompany();

  const { data: customerData, isLoading: customerLoading, isError: customerError } = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: async () => {
      if (!customerId) return null as unknown as ApiCustomer;
      const res = await apiClient.get(endpoints.customerDetail(customerId));
      return res.data as ApiCustomer;
    },
    enabled: Boolean(customerId),
  });

  const { data: invoicesData, isLoading: invoicesLoading, isError: invoicesError } = useQuery({
    queryKey: ['invoices', 'by-customer', customerId],
    queryFn: async () => {
      if (!customerId) return normalizeListResponse<ApiInvoice>([]);
      const res = await apiClient.get(endpoints.invoices, { params: { customer: customerId } });
      return normalizeListResponse<ApiInvoice>(res.data);
    },
    enabled: Boolean(customerId),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (prev) => prev,
  });

  const { data: paymentsData, isLoading: paymentsLoading, isError: paymentsError } = useQuery({
    queryKey: ['payments', 'by-customer', customerId],
    queryFn: async () => {
      if (!customerId) return normalizeListResponse<ApiPayment>([]);
      const res = await apiClient.get(endpoints.payments, { params: { customer: customerId } });
      return normalizeListResponse<ApiPayment>(res.data);
    },
    enabled: Boolean(customerId),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (prev) => prev,
  });

  const { data: returnsData, isLoading: returnsLoading, isError: returnsError } = useQuery({
    queryKey: ['returns', 'by-customer', customerId],
    queryFn: async () => {
      if (!customerId) return normalizeListResponse<ApiReturn>([]);
      const res = await apiClient.get(endpoints.returns, { params: { customer: customerId } });
      return normalizeListResponse<ApiReturn>(res.data);
    },
    enabled: Boolean(customerId),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (prev) => prev,
  });

  const { data: balancesData } = useQuery({
    queryKey: ['balances'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.balances);
      return normalizeListResponse<ApiBalance>(res.data);
    },
    staleTime: 60 * 1000,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const balanceForCustomer = useMemo(() => {
    const results = balancesData?.results || [];
    const found = results.find((b) => Number((b as any).customer) === customerId);
    return parseNumber(found?.balance);
  }, [balancesData, customerId]);

  const invoices = invoicesData?.results || [];
  const payments = paymentsData?.results || [];
  const positivePayments = useMemo(() => payments.filter((p) => parseNumber(p.amount) > 0), [payments]);
  const negativePayments = useMemo(() => payments.filter((p) => parseNumber(p.amount) < 0), [payments]);
  const returnsList = returnsData?.results || [];

  const totals = useMemo(() => {
    const paymentsPos = positivePayments.reduce((acc, p) => acc + parseNumber(p.amount), 0);
    const withdrawalsNeg = negativePayments.reduce((acc, p) => acc + parseNumber(p.amount), 0);
    const netPayments = payments.reduce((acc, p) => acc + parseNumber(p.amount), 0);
    const invoicesSum = invoices.reduce((acc, inv) => acc + parseNumber(inv.total_amount), 0);
    const returnsSum = returnsList.reduce((acc, r) => acc + parseNumber(r.total_amount), 0);
    const computedBalance = invoicesSum - netPayments - returnsSum;
    return { paymentsPos, withdrawalsNeg, netPayments, invoicesSum, returnsSum, computedBalance };
  }, [positivePayments, negativePayments, payments, invoices, returnsList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">تفاصيل العميل</h1>
          {customerLoading ? (
            <p className="text-muted-foreground mt-1"><Skeleton className="h-4 w-40" /></p>
          ) : customerError || !customerData ? (
            <p className="text-destructive mt-1">تعذر تحميل بيانات العميل</p>
          ) : (
            <p className="text-muted-foreground mt-1">{customerData.name}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">الرصيد</p>
          <div className="flex items-center justify-end gap-2">
            <p className="text-xl font-bold">
              <Amount value={totals.computedBalance} digits={2} tone={totals.computedBalance > 0 ? 'destructive' : totals.computedBalance < 0 ? 'success' : undefined} />
            </p>
            {totals.computedBalance !== 0 && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${totals.computedBalance > 0 ? 'bg-destructive-light text-destructive' : 'bg-success-light text-success'}`}>
                {totals.computedBalance > 0 ? 'عليه' : 'له'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Badges */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-light text-success text-sm">
          <BanknotesIcon className="h-4 w-4" />
          الدفعات: <Amount value={totals.paymentsPos} digits={2} />
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive-light text-destructive text-sm">
          <BanknotesIcon className="h-4 w-4" />
          السحوبات: <Amount value={totals.withdrawalsNeg} digits={2} />
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-light text-primary text-sm">
          <DocumentTextIcon className="h-4 w-4" />
          الفواتير: <Amount value={totals.invoicesSum} digits={2} />
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning-light text-warning text-sm">
          <ArrowUturnLeftIcon className="h-4 w-4" />
          المرتجعات: <Amount value={totals.returnsSum} digits={2} />
        </span>
      </div>

      {/* Invoices Section */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-light rounded-full"><DocumentTextIcon className="h-5 w-5 text-primary" /></div>
            <h2 className="text-lg font-semibold text-foreground">فواتير العميل</h2>
          </div>
          <div className="text-sm text-muted-foreground">عدد الفواتير: {invoicesData?.count ?? invoices.length}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">رقم الفاتورة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المبلغ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">التاريخ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الحالة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">طباعة</th>
              </tr>
            </thead>
            <tbody>
              {invoicesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-5 w-20" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-10" /></td>
                  </tr>
                ))
              ) : invoicesError ? (
                <tr><td className="py-6 px-6 text-destructive" colSpan={5}>تعذر جلب بيانات الفواتير</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td className="py-6 px-6 text-muted-foreground" colSpan={5}>لا توجد فواتير</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border hover:bg-card-hover transition-colors">
                    <td className="py-4 px-6"><span className="font-mono font-medium text-foreground">#{inv.id}</span></td>
                    <td className="py-4 px-6"><Amount value={parseNumber(inv.total_amount)} digits={2} /></td>
                    <td className="py-4 px-6 text-muted-foreground">{new Date(inv.created_at).toLocaleString('ar')}</td>
                    <td className="py-4 px-6"><span className="text-sm text-foreground">{inv.status}</span></td>
                    <td className="py-4 px-6">
                      <Button variant="ghost" size="sm" onClick={() => window.open(`/print/invoice/${inv.id}`, '_blank')}>
                        <PrinterIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments Section */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-success-light rounded-full"><BanknotesIcon className="h-5 w-5 text-success" /></div>
            <h2 className="text-lg font-semibold text-foreground">الدفعات</h2>
          </div>
          <div className="text-sm text-muted-foreground">الإجمالي: <Amount value={positivePayments.reduce((acc, p) => acc + parseNumber(p.amount), 0)} digits={2} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الفاتورة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المبلغ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الطريقة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {paymentsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                  </tr>
                ))
              ) : paymentsError ? (
                <tr><td className="py-6 px-6 text-destructive" colSpan={4}>تعذر جلب بيانات الدفعات</td></tr>
              ) : positivePayments.length === 0 ? (
                <tr><td className="py-6 px-6 text-muted-foreground" colSpan={4}>لا توجد دفعات</td></tr>
              ) : (
                positivePayments.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-card-hover transition-colors">
                    <td className="py-4 px-6 text-muted-foreground">{p.invoice ? `فاتورة #${p.invoice}` : '—'}</td>
                    <td className="py-4 px-6 font-semibold text-foreground">
                      <Amount value={parseNumber(p.amount)} digits={2} />
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">{p.payment_method_display || p.payment_method}</td>
                    <td className="py-4 px-6 text-muted-foreground">{new Date(p.payment_date).toLocaleString('ar')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdrawals Section */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-destructive-light rounded-full"><BanknotesIcon className="h-5 w-5 text-destructive" /></div>
            <h2 className="text-lg font-semibold text-foreground">السحوبات</h2>
          </div>
          <div className="text-sm text-muted-foreground">الإجمالي: <Amount value={negativePayments.reduce((acc, p) => acc + parseNumber(p.amount), 0)} digits={2} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الفاتورة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المبلغ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الطريقة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {paymentsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                  </tr>
                ))
              ) : paymentsError ? (
                <tr><td className="py-6 px-6 text-destructive" colSpan={4}>تعذر جلب بيانات السحوبات</td></tr>
              ) : negativePayments.length === 0 ? (
                <tr><td className="py-6 px-6 text-muted-foreground" colSpan={4}>لا توجد سحوبات</td></tr>
              ) : (
                negativePayments.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-card-hover transition-colors">
                    <td className="py-4 px-6 text-muted-foreground">{p.invoice ? `فاتورة #${p.invoice}` : '—'}</td>
                    <td className="py-4 px-6 font-semibold text-foreground">
                      <Amount value={parseNumber(p.amount)} digits={2} />
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">{p.payment_method_display || p.payment_method}</td>
                    <td className="py-4 px-6 text-muted-foreground">{new Date(p.payment_date).toLocaleString('ar')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Returns Section */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-warning-light rounded-full"><ArrowUturnLeftIcon className="h-5 w-5 text-warning" /></div>
            <h2 className="text-lg font-semibold text-foreground">مرتجعات</h2>
          </div>
          <div className="text-sm text-muted-foreground">عدد المرتجعات: {returnsData?.count ?? returnsList.length}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">رقم المرتجع</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الفاتورة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المبلغ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">التاريخ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {returnsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-5 w-16" /></td>
                  </tr>
                ))
              ) : returnsError ? (
                <tr><td className="py-6 px-6 text-destructive" colSpan={5}>تعذر جلب بيانات المرتجعات</td></tr>
              ) : returnsList.length === 0 ? (
                <tr><td className="py-6 px-6 text-muted-foreground" colSpan={5}>لا توجد مرتجعات</td></tr>
              ) : (
                returnsList.map((r) => (
                  <tr key={r.id} className="border-b border-border hover:bg-card-hover transition-colors">
                    <td className="py-4 px-6"><span className="font-mono font-medium text-foreground">{r.return_number}</span></td>
                    <td className="py-4 px-6 text-muted-foreground">فاتورة #{r.invoice_id}</td>
                    <td className="py-4 px-6 font-semibold text-foreground"><Amount value={parseNumber(r.total_amount)} digits={2} /></td>
                    <td className="py-4 px-6 text-muted-foreground">{new Date(r.return_date).toLocaleString('ar')}</td>
                    <td className="py-4 px-6 text-muted-foreground">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;


