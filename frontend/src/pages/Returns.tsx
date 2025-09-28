import React, { useMemo, useState } from 'react';
import {
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  EyeIcon,
  PlusIcon,
  XCircleIcon,
  XMarkIcon,
  ClockIcon,
  PrinterIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../components/ui/use-toast';
import { apiClient, endpoints, normalizeListResponse } from '../lib/api';
import { useCompany } from '../contexts/CompanyContext';
import { Amount } from '../components/Amount';
import { useQuery as useQueryRaw } from '@tanstack/react-query';

interface ApiReturnItem {
  id: number;
  product_name: string;
  product_sku?: string | null;
  unit_display?: string | null;
  qty_returned: number | string;
  unit_price: number | string;
  line_total: number | string;
}

interface ApiReturn {
  id: number;
  return_number: string;
  invoice_id: number;
  customer_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  total_amount: number | string;
  return_date: string;
  notes?: string | null;
  created_by_name?: string;
  approved_by_name?: string | null;
  items?: ApiReturnItem[];
}

interface ApiInvoiceItem {
  id: number;
  product_name: string;
  product_sku?: string | null;
  qty: number | string;
  price_at_add: number | string;
  unit_display?: string | null;
  measurement?: string | null;
}

interface ApiInvoice {
  id: number;
  customer_name: string;
  created_at: string;
  items: ApiInvoiceItem[];
}

interface ReturnFormItem {
  originalItemId: number;
  productName: string;
  productSku?: string | null;
  unitDisplay?: string | null;
  measurement?: string | null;
  qtySold: number;
  qtyToReturn: string;
  unitPrice: number;
}

type StatusFilter = 'all' | ApiReturn['status'];

const statusConfigMap: Record<ApiReturn['status'], { label: string; color: string; icon: React.ComponentType<React.ComponentProps<'svg'>> }> = {
  pending: { label: 'قيد المراجعة', color: 'bg-warning-light text-warning', icon: ClockIcon },
  approved: { label: 'تمت الموافقة', color: 'bg-success-light text-success', icon: CheckCircleIcon },
  rejected: { label: 'مرفوض', color: 'bg-destructive-light text-destructive', icon: XMarkIcon },
  completed: { label: 'مكتمل', color: 'bg-primary-light text-primary', icon: CheckCircleIcon },
};

const parseNumber = (value: number | string | undefined | null): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatCurrency = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export const Returns: React.FC = () => {
  const { formatAmount, profile } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [effectiveSearch, setEffectiveSearch] = useState('');
  const [page, setPage] = useState(1);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ApiReturn | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewReturnId, setPreviewReturnId] = useState<number | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [invoiceIdInput, setInvoiceIdInput] = useState('');
  const [returnInvoice, setReturnInvoice] = useState<ApiInvoice | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnFormItem[]>([]);
  const [returnNotes, setReturnNotes] = useState('');

  const { data, isLoading, isFetching, isError } = useQuery<{ count: number; next: string | null; previous: string | null; results: ApiReturn[] }>({
    queryKey: ['returns', statusFilter, page, effectiveSearch],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.returns, {
        params: {
          page,
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: effectiveSearch || undefined,
        },
      });
      return normalizeListResponse<ApiReturn>(res.data);
    },
    placeholderData: (prev) => prev,
  });

  const list = data?.results ?? [];
  const total = data?.count ?? list.length;
  const hasNext = Boolean(data?.next);
  const hasPrev = Boolean(data?.previous);

  const filteredReturns = list; // server-side search

  const stats = useMemo(() => {
    return filteredReturns.reduce(
      (acc, item) => {
        const amount = parseNumber(item.total_amount);
        acc.total += amount;
        acc.count += 1;
        acc.byStatus[item.status] = (acc.byStatus[item.status] || 0) + 1;
        return acc;
      },
      { total: 0, count: 0, byStatus: { pending: 0, approved: 0, rejected: 0, completed: 0 } as Record<ApiReturn['status'], number> }
    );
  }, [filteredReturns]);

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.returnApprove(id));
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'تمت الموافقة', description: 'تمت الموافقة على المرتجع بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'تعذر الموافقة على المرتجع';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.returnReject(id));
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'تم الرفض', description: 'تم رفض المرتجع' });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'تعذر رفض المرتجع';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const loadInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiClient.get(endpoints.invoiceDetails(invoiceId));
      return res.data as ApiInvoice;
    },
    onSuccess: (invoice) => {
      setReturnInvoice(invoice);
      setReturnItems(
        (invoice.items || []).map((item) => ({
          originalItemId: item.id,
          productName: item.product_name,
          productSku: item.product_sku,
          unitDisplay: item.unit_display,
          measurement: item.measurement,
          qtySold: parseNumber(item.qty),
          qtyToReturn: String(parseNumber(item.qty)),
          unitPrice: parseNumber(item.price_at_add),
        }))
      );
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'تعذر تحميل الفاتورة';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const createReturnMutation = useMutation({
    mutationFn: async (payload: { invoiceId: number; items: { original_item: number; qty_returned: number }[]; notes?: string }) => {
      const res = await apiClient.post(endpoints.returns, {
        original_invoice: payload.invoiceId,
        items: payload.items,
        notes: payload.notes,
      });
      return res.data as ApiReturn;
    },
    onSuccess: (createdReturn) => {
      toast({ title: 'تم إنشاء المرتجع', description: `تم إنشاء المرتجع برقم ${createdReturn.return_number}` });
      setCreateDialogOpen(false);
      setInvoiceIdInput('');
      setReturnInvoice(null);
      setReturnItems([]);
      setReturnNotes('');
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'تعذر إنشاء المرتجع';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const handleQtyChange = (id: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (/^\d*(\.\d{0,4})?$/.test(value) || value === '') {
      setReturnItems((prev) => prev.map((item) => (item.originalItemId === id ? { ...item, qtyToReturn: value } : item)));
    }
  };

  const resetReturnForm = () => {
    setInvoiceIdInput('');
    setReturnInvoice(null);
    setReturnItems([]);
    setReturnNotes('');
    loadInvoiceMutation.reset();
    createReturnMutation.reset();
  };

  const submitReturn = () => {
    if (!returnInvoice) {
      toast({ title: 'يرجى اختيار فاتورة', description: 'قم بتحميل الفاتورة التي ترغب بإنشاء مرتجع لها', variant: 'destructive' });
      return;
    }

    const preparedItems = returnItems
      .map((item) => ({
        original_item: item.originalItemId,
        qty_returned: parseNumber(item.qtyToReturn),
        max: item.qtySold,
      }))
      .filter((item) => item.qty_returned > 0);

    if (preparedItems.length === 0) {
      toast({ title: 'لا توجد عناصر', description: 'حدد كمية مرتجعة واحدة على الأقل', variant: 'destructive' });
      return;
    }

    const invalidItem = preparedItems.find((item) => item.qty_returned > item.max);
    if (invalidItem) {
      toast({
        title: 'كمية غير صالحة',
        description: 'لا يمكن أن تتجاوز الكمية المرتجعة الكمية المباعة',
        variant: 'destructive',
      });
      return;
    }

    createReturnMutation.mutate({
      invoiceId: returnInvoice.id,
      items: preparedItems.map(({ max: _max, ...rest }) => rest),
      notes: returnNotes.trim() || undefined,
    });
  };

  const returnDraftTotal = useMemo(() => {
    return returnItems.reduce((acc, item) => acc + parseNumber(item.qtyToReturn) * item.unitPrice, 0);
  }, [returnItems]);

  const closeDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedReturn(null);
  };

  const openDetailDialog = (record: ApiReturn) => {
    setSelectedReturn(record);
    setDetailDialogOpen(true);
  };

  const openPreviewDialog = (record: ApiReturn) => {
    setPreviewReturnId(record.id);
    setPreviewDialogOpen(true);
  };

  const toggleCreateDialog = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      resetReturnForm();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المرتجعات</h1>
          <p className="text-muted-foreground mt-1">إدارة مرتجعات المبيعات ومتابعة حالاتها</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => toggleCreateDialog(true)}>
          <PlusIcon className="h-4 w-4" />
          إنشاء مرتجع جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-full">
              <ArrowUturnLeftIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المرتجعات</p>
              <p className="text-xl font-bold text-foreground">{stats.count}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-light rounded-full">
              <CheckCircleIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الموافق عليها</p>
              <p className="text-xl font-bold text-foreground">{stats.byStatus.approved}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-light rounded-full">
              <ClockIcon className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">قيد المراجعة</p>
              <p className="text-xl font-bold text-foreground">{stats.byStatus.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-full">
             <BanknotesIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المبالغ</p>
              <p className="text-xl font-bold text-foreground"><Amount value={stats.total} digits={2} /></p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="البحث برقم المرتجع أو العميل أو الفاتورة"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEffectiveSearch(searchTerm);
                  setPage(1);
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEffectiveSearch(searchTerm);
                setPage(1);
              }}
            >
              بحث
            </Button>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="approved">موافق عليها</SelectItem>
                <SelectItem value="rejected">مرفوضة</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setEffectiveSearch('');
                setStatusFilter('all');
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
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">رقم المرتجع</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">العميل</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الفاتورة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المبلغ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">التاريخ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الحالة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-28" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-16" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-20" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-28" /></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td className="py-6 px-6 text-destructive" colSpan={7}>
                    تعذر جلب بيانات المرتجعات
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td className="py-6 px-6 text-muted-foreground" colSpan={7}>
                    لا توجد مرتجعات مطابقة
                  </td>
                </tr>
              ) : (
                filteredReturns.map((record) => {
                  const amount = parseNumber(record.total_amount);
                  const statusConfig = statusConfigMap[record.status];
                  const StatusIcon = statusConfig.icon;
                  const isPending = record.status === 'pending';

                  return (
                    <tr key={record.id} className="border-b border-border hover:bg-card-hover transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono font-medium text-foreground">{record.return_number}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-foreground">{record.customer_name}</span>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">فاتورة #{record.invoice_id}</td>
                      <td className="py-4 px-6 font-semibold text-foreground"><Amount value={amount} /></td>
                      <td className="py-4 px-6 text-muted-foreground">
                        {new Date(record.return_date).toLocaleString('ar')}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig.label}
                        </span>
                      </td>
                  <td className="py-4 px-6 flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openDetailDialog(record)}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => window.open(`/print/return/${record.id}`, '_blank')}>
                          <PrinterIcon className="h-4 w-4" />
                        </Button>
                        {isPending && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => approveMutation.mutate(record.id)}
                              disabled={approveMutation.isPending}
                            >
                              موافقة
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive"
                              onClick={() => rejectMutation.mutate(record.id)}
                              disabled={rejectMutation.isPending}
                            >
                              رفض
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">الإجمالي: {total.toLocaleString()} مرتجع</div>
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

      <Dialog open={detailDialogOpen} onOpenChange={(open) => (open ? undefined : closeDetailDialog())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>تفاصيل المرتجع</DialogTitle>
          </DialogHeader>
          {selectedReturn ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">رقم المرتجع</p>
                  <p className="text-foreground font-medium">{selectedReturn.return_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">العميل</p>
                  <p className="text-foreground font-medium">{selectedReturn.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">رقم الفاتورة</p>
                  <p className="text-foreground font-medium">فاتورة #{selectedReturn.invoice_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">الحالة</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-full ${statusConfigMap[selectedReturn.status].color}`}>
                    {statusConfigMap[selectedReturn.status].label}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">المبلغ</p>
                  <p className="text-foreground font-medium">{formatCurrency(parseNumber(selectedReturn.total_amount))} ر.س</p>
                </div>
                <div>
                  <p className="text-muted-foreground">تاريخ الإنشاء</p>
                  <p className="text-foreground font-medium">{new Date(selectedReturn.return_date).toLocaleString('ar')}</p>
                </div>
                {selectedReturn.notes && (
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">ملاحظات</p>
                    <p className="text-foreground">{selectedReturn.notes}</p>
                  </div>
                )}
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-right py-3 px-4">المنتج</th>
                      <th className="text-right py-3 px-4">الكمية</th>
                      <th className="text-right py-3 px-4">سعر الوحدة</th>
                      <th className="text-right py-3 px-4">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReturn.items || []).map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-b-0">
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{item.product_name}</span>
                            {item.product_sku && (
                              <span className="text-xs text-muted-foreground">SKU: {item.product_sku}</span>
                            )}
                            {item.unit_display && (
                              <span className="text-xs text-muted-foreground">الوحدة: {item.unit_display}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{parseNumber(item.qty_returned)}</td>
                        <td className="py-3 px-4 text-muted-foreground"><Amount value={parseNumber(item.unit_price)} /></td>
                        <td className="py-3 px-4 text-foreground font-medium"><Amount value={parseNumber(item.line_total)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6">لا توجد بيانات لعرضها</div>
          )}
        </DialogContent>
      </Dialog>

      {/* تم نقل المعاينة إلى تبويب جديد */}

      <Dialog open={createDialogOpen} onOpenChange={toggleCreateDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>إنشاء مرتجع جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <Input
                  label="رقم الفاتورة"
                  placeholder="أدخل رقم الفاتورة"
                  value={invoiceIdInput}
                  onChange={(event) => setInvoiceIdInput(event.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  const parsed = parseInt(invoiceIdInput, 10);
                  if (!parsed) {
                    toast({ title: 'رقم غير صالح', description: 'يرجى إدخال رقم فاتورة صحيح', variant: 'destructive' });
                    return;
                  }
                  loadInvoiceMutation.mutate(parsed);
                }}
                disabled={loadInvoiceMutation.isPending}
              >
                تحميل الفاتورة
              </Button>
            </div>

            {returnInvoice && (
              <div className="space-y-4">
                <div className="bg-muted/40 border border-border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">العميل</p>
                      <p className="text-foreground font-medium">{returnInvoice.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">تاريخ الفاتورة</p>
                      <p className="text-foreground font-medium">{new Date(returnInvoice.created_at).toLocaleString('ar')}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-right py-3 px-4">المنتج</th>
                        <th className="text-right py-3 px-4">الوحدة</th>
                        <th className="text-right py-3 px-4">الكمية المباعة</th>
                        <th className="text-right py-3 px-4">الكمية المرتجعة</th>
                        <th className="text-right py-3 px-4">سعر الوحدة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((item) => (
                        <tr key={item.originalItemId} className="border-b border-border last:border-b-0">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{item.productName}</span>
                              {item.productSku && (
                                <span className="text-xs text-muted-foreground">SKU: {item.productSku}</span>
                              )}
                              {item.measurement && (
                                <span className="text-xs text-muted-foreground">{item.measurement}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{item.unitDisplay || '-'}</td>
                          <td className="py-3 px-4 text-muted-foreground">{item.qtySold}</td>
                          <td className="py-3 px-4">
                            <Input
                              value={item.qtyToReturn}
                              onChange={handleQtyChange(item.originalItemId)}
                              aria-label="الكمية المرتجعة"
                            />
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{formatCurrency(item.unitPrice)} ر.س</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">ملاحظات</label>
                    <Textarea
                      placeholder="أضف أي ملاحظات حول هذا المرتجع"
                      value={returnNotes}
                      onChange={(event) => setReturnNotes(event.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">الإجمالي التقديري</p>
                    <p className="text-2xl font-bold text-foreground"><Amount value={returnDraftTotal} /></p>
                    <p className="text-xs text-muted-foreground">
                      سيتم تحديث الإجمالي الفعلي عند إنشاء المرتجع بناءً على الكميات المدخلة
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button className='mx-2' variant="outline" onClick={() => toggleCreateDialog(false)}>
              إلغاء
            </Button>
            <Button className='mx-2' onClick={submitReturn} disabled={!returnInvoice || createReturnMutation.isPending}>
              حفظ المرتجع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ReturnPreviewContent: React.FC<{ id: number }> = ({ id }) => {
  const { profile } = useCompany();
  const { data, isLoading, isError } = useQueryRaw({
    queryKey: ['return-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`${endpoints.returns}${id}/`);
      return res.data as ApiReturn;
    },
  });

  if (isLoading) return <div className="text-muted-foreground">...جاري التحميل</div>;
  if (isError || !data) return <div className="text-destructive">تعذر تحميل المرتجع</div>;

  const ret = data;
  const handlePrint = () => window.print();

  return (
    <div className="invoice-print-area space-y-5 print:space-y-2">
      <div className="flex items-center justify-between gap-6 print:px-6 print:pt-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden print:h-16 print:w-16">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="شعار الشركة" className="h-full w-full object-contain" />
            ) : (
              <div className="text-xs text-muted-foreground">لا شعار</div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{profile?.company_name || 'مرتجع'}</h3>
            <p className="text-xs text-muted-foreground">{profile?.company_address || ''}</p>
            <p className="text-xs text-muted-foreground">{profile?.company_phone || ''}</p>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-xl font-bold text-foreground">مرتجع #{ret.return_number}</h3>
          <p className="text-sm text-muted-foreground">{new Date(ret.return_date).toLocaleString('ar')}</p>
          <p className="text-sm text-foreground">{ret.customer_name}</p>
          <p className="text-xs text-muted-foreground">مرجع الفاتورة: #{ret.invoice_id}</p>
        </div>
      </div>

      <div className="border-y border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-right py-2 px-3">المنتج</th>
              <th className="text-right py-2 px-3">الكمية</th>
              <th className="text-right py-2 px-3">سعر الوحدة</th>
              <th className="text-right py-2 px-3">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {(ret.items || []).map((it) => (
              <tr key={it.id} className="border-b border-border last:border-b-0">
                <td className="py-2 px-3">{it.product_name}</td>
                <td className="py-2 px-3 text-muted-foreground">{Number(it.qty_returned || 0)}</td>
                <td className="py-2 px-3 text-muted-foreground"><Amount value={Number(it.unit_price || 0)} digits={2} /></td>
                <td className="py-2 px-3 font-medium text-foreground"><Amount value={Number(it.line_total || 0)} digits={2} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-2 px-3" colSpan={3}><span className="text-sm font-semibold text-foreground">المبلغ الإجمالي</span></td>
              <td className="py-2 px-3 font-bold text-foreground"><Amount value={Number(ret.total_amount || 0)} digits={2} /></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-end print:px-6">
        <Button onClick={handlePrint} className="print:hidden">طباعة</Button>
      </div>

      <div className="print:px-6 print:pb-6 space-y-2">
        <h4 className="text-sm font-semibold text-foreground">الملاحظات والسياسات</h4>
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">سياسة الإرجاع</p>
          <p className="text-xs whitespace-pre-wrap text-muted-foreground">{profile?.return_policy?.trim() || 'لا توجد سياسة إرجاع محددة.'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">سياسة الدفع</p>
          <p className="text-xs whitespace-pre-wrap text-muted-foreground">{profile?.payment_policy?.trim() || 'لا توجد سياسة دفع محددة.'}</p>
        </div>
      </div>
    </div>
  );
};

