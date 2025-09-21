import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, endpoints, normalizeListResponse } from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../components/ui/use-toast';
import { useCompany } from '../contexts/CompanyContext';
import { Amount } from '../components/Amount';

const statusConfigMap = {
  draft: { text: 'مسودة', color: 'text-warning bg-warning-light', icon: ClockIcon },
  confirmed: { text: 'مؤكدة', color: 'text-primary bg-primary-light', icon: CheckCircleIcon },
  cancelled: { text: 'ملغاة', color: 'text-destructive bg-destructive-light', icon: XCircleIcon },
} as const;

type InvoiceStatus = keyof typeof statusConfigMap;

interface ApiInvoice {
  id: number;
  customer?: number;
  customer_name: string;
  total_amount: number | string;
  status: InvoiceStatus;
  created_at: string;
  items?: any[];
}

interface OptionItem { id: number; name: string }
interface ProductOption extends OptionItem { stock_qty?: number; price?: number; sku?: string | null; unit_display?: string | null }

export const Invoices: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatAmount, profile } = useCompany();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [page, setPage] = useState(1);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ApiInvoice | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchKeyword, setCustomerSearchKeyword] = useState('');

  // Add item dialog
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemInvoiceId, setAddItemInvoiceId] = useState<number | null>(null);
  // Preview & Confirm dialogs
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<ApiInvoice | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmInvoice, setConfirmInvoice] = useState<ApiInvoice | null>(null);
  // Return dialog
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState<ApiInvoice | null>(null);
  const [returnInputs, setReturnInputs] = useState<Record<number, string>>({});
  const [productSearch, setProductSearch] = useState('');
  const [productSearchKeyword, setProductSearchKeyword] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<string>('1');

  // Invoices list
  const { data, isLoading, isError, isFetching } = useQuery<{ count: number; next: string | null; previous: string | null; results: ApiInvoice[] }>({
    queryKey: ['invoices', searchKeyword, statusFilter, page],
    queryFn: async () => {
      const params: any = { page };
      if (searchKeyword) params.search = searchKeyword;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await apiClient.get(endpoints.invoices, { params });
      return normalizeListResponse<ApiInvoice>(res.data);
    },
    placeholderData: (prev) => prev,
  });

  const list = data?.results || [];
  const count = data?.count || list.length;
  const hasNext = Boolean(data?.next);
  const hasPrev = Boolean(data?.previous);

  const stats = useMemo(() => {
    const statusCount = { draft: 0, confirmed: 0, cancelled: 0 } as Record<InvoiceStatus, number>;
    let totalAmount = 0;
    list.forEach((inv) => {
      totalAmount += Number(inv.total_amount || 0);
      if (inv.status in statusCount) statusCount[inv.status as InvoiceStatus]++;
    });
    return { count: list.length, statusCount, totalAmount };
  }, [list]);

  // Customer options for create dialog
  const { data: customerOptionsData, isFetching: customerOptionsLoading } = useQuery({
    queryKey: ['invoice-customer-options', customerSearchKeyword],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers, {
        params: customerSearchKeyword ? { search: customerSearchKeyword } : undefined,
      });
      const normalized = normalizeListResponse<OptionItem & { phone?: string }>(res.data);
      return normalized.results.map((c) => ({ id: c.id, name: c.name } as OptionItem));
    },
    enabled: createDialogOpen,
  });
  const customerOptions = customerOptionsData || [];

  // Product options for add item
  const { data: productOptionsData, isFetching: productOptionsLoading } = useQuery({
    queryKey: ['invoice-product-options', productSearchKeyword],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products, {
        params: productSearchKeyword ? { search: productSearchKeyword } : undefined,
      });
      const normalized = normalizeListResponse<{ id: number; name: string; stock_qty?: number; price?: number; sku?: string; unit_display?: string }>(res.data);
      return normalized.results.map((p) => ({ id: p.id, name: p.name, stock_qty: (p as any).stock_qty, price: (p as any).price, sku: (p as any).sku, unit_display: (p as any).unit_display } as ProductOption));
    },
    enabled: addItemOpen,
  });
  const productOptions = (productOptionsData || []) as ProductOption[];

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (vars: { customerId: number }) => {
      const res = await apiClient.post(endpoints.invoices, { customer: vars.customerId });
      return res.data as ApiInvoice;
    },
    onSuccess: (inv) => {
      toast({ title: 'فاتورة جديدة', description: `تم إنشاء فاتورة مسودة #${inv.id}` });
      setCreateDialogOpen(false);
      setSelectedCustomer('');
      setCustomerSearch(''); setCustomerSearchKeyword('');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Open add item dialog directly
      setAddItemInvoiceId(inv.id);
      setAddItemOpen(true);
    },
    onError: (err: any) => {
      toast({ title: 'خطأ', description: err?.response?.data?.detail || 'تعذر إنشاء الفاتورة', variant: 'destructive' });
    },
  });

  // Handle deep-link from Customers page to auto-create invoice for a customer
  useEffect(() => {
    const state = (location.state || {}) as any;
    if (state && state.action === 'create_invoice' && state.customerId) {
      const customerId = Number(state.customerId);
      if (customerId && !createInvoiceMutation.isPending) {
        createInvoiceMutation.mutate({ customerId });
        // Clear state to avoid re-trigger on back/refresh
        navigate('/invoices', { replace: true, state: null });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addItemMutation = useMutation({
    mutationFn: async (vars: { invoiceId: number; productId: number; qty: number }) => {
      const res = await apiClient.post(endpoints.invoiceAddItem(vars.invoiceId), {
        product: vars.productId,
        qty: vars.qty,
      });
      return res.data as ApiInvoice;
    },
    onSuccess: () => {
      toast({ title: 'تمت الإضافة', description: 'تمت إضافة العنصر للفاتورة' });
      setItemQty('1'); setSelectedProductId('');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر إضافة العنصر';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiClient.post(endpoints.invoiceConfirm(invoiceId));
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'تم التأكيد', description: 'تم تأكيد الفاتورة' });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setConfirmDialogOpen(false);
      setConfirmInvoice(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر تأكيد الفاتورة';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    },
  });

  // Returns summary for selected invoice
  const { data: returnsListData, isFetching: returnsFetching } = useQuery({
    queryKey: ['returns-by-invoice', returnInvoice?.id, returnInvoice?.customer],
    queryFn: async () => {
      const params: any = {};
      if (returnInvoice?.customer) params.customer = returnInvoice.customer;
      const res = await apiClient.get(endpoints.returns, { params });
      return normalizeListResponse<any>(res.data);
    },
    enabled: Boolean(returnDialogOpen && returnInvoice?.id),
  });

  const returnedByItemId = useMemo(() => {
    const map = new Map<number, number>();
    const results = returnsListData?.results || [];
    results.forEach((ret: any) => {
      if (ret.invoice_id !== (returnInvoice?.id || ret.original_invoice)) return;
      if (ret.status === 'rejected') return;
      (ret.items || []).forEach((rit: any) => {
        const key = Number(rit.original_item);
        const qty = Number(rit.qty_returned || 0);
        map.set(key, (map.get(key) || 0) + qty);
      });
    });
    return map;
  }, [returnsListData, returnInvoice]);

  const openReturnDialog = (inv: ApiInvoice) => {
    setReturnInvoice(inv);
    // init inputs to empty
    const initial: Record<number, string> = {};
    (inv.items || []).forEach((it: any) => { initial[it.id] = ''; });
    setReturnInputs(initial);
    setReturnDialogOpen(true);
    // Force-refresh returns data for accurate counts
    queryClient.invalidateQueries({ queryKey: ['returns-by-invoice', inv.id, inv.customer] });
    queryClient.refetchQueries({ queryKey: ['returns-by-invoice', inv.id, inv.customer] });
  };

  const submitReturn = useMutation({
    mutationFn: async () => {
      if (!returnInvoice) return;
      const items: Array<{ original_item_id: number; qty_returned: number }> = [];
      (returnInvoice.items || []).forEach((it: any) => {
        const v = Number(returnInputs[it.id]);
        if (v && v > 0) items.push({ original_item_id: it.id, qty_returned: v });
      });
      if (items.length === 0) throw new Error('no_items');
      const body = { original_invoice: returnInvoice.id, items } as any;
      const res = await apiClient.post(endpoints.returns, body);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'تم إنشاء المرتجع', description: 'تم حفظ المرتجع بنجاح' });
      // Keep dialog open and refresh counts
      setReturnInputs((prev) => {
        const cleared: Record<number, string> = {};
        Object.keys(prev).forEach((k) => { cleared[Number(k)] = ''; });
        return cleared;
      });
      queryClient.invalidateQueries({ queryKey: ['returns-by-invoice', returnInvoice?.id, returnInvoice?.customer] });
      queryClient.refetchQueries({ queryKey: ['returns-by-invoice', returnInvoice?.id, returnInvoice?.customer] });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر إنشاء المرتجع';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    },
  });

  const openPreview = (invoice: ApiInvoice) => {
    setPreviewInvoice(invoice);
    setPreviewOpen(true);
  };

  const printPreview = () => {
    window.print();
  };

  const filteredInvoices = list; // server-side filtered already by params

  // Debounce product search input for typeahead
  useEffect(() => {
    if (!addItemOpen) return;
    const handle = setTimeout(() => {
      setProductSearchKeyword(productSearch.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [productSearch, addItemOpen]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الفواتير</h1>
          <p className="text-muted-foreground mt-1">إدارة فواتير المبيعات</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          إنشاء فاتورة جديدة
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-full">
              <DocumentTextIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الفواتير</p>
              <p className="text-xl font-bold text-foreground">{stats.count}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-light rounded-full">
              <CheckCircleIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">مؤكدة</p>
              <p className="text-xl font-bold text-foreground">{list.filter((i) => i.status === 'confirmed').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-light rounded-full">
              <ClockIcon className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">مسودات</p>
              <p className="text-xl font-bold text-foreground">{list.filter((i) => i.status === 'draft').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-full">
              <span className="text-primary font-bold">ر.س</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
              <p className="text-xl font-bold text-foreground">{stats.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="البحث في الفواتير..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setSearchKeyword(searchTerm.trim());
              }}
            >
              بحث
            </Button>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setPage(1);
                setStatusFilter(value as typeof statusFilter);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="confirmed">مؤكدة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setSearchTerm('');
                setSearchKeyword('');
              }}
            >
              إعادة تعيين
            </Button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">رقم الفاتورة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">العميل</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المبلغ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">العناصر</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">التاريخ</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الحالة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                <tr>
                  <td className="py-6 px-6 text-muted-foreground" colSpan={7}>
                    ...جاري التحميل
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td className="py-6 px-6 text-destructive" colSpan={7}>
                    تعذر جلب البيانات
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td className="py-6 px-6 text-muted-foreground" colSpan={7}>
                    لم يتم العثور على فواتير
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice, index) => {
                  const statusConfig = statusConfigMap[invoice.status];
                  const StatusIcon = statusConfig.icon;

                  const itemsCount = invoice.items?.length ?? 0;
                  const amount = Number(invoice.total_amount || 0);

                  const isDraft = invoice.status === 'draft';

                  return (
                    <tr
                      key={invoice.id}
                      className={`border-b border-border hover:bg-card-hover transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-card'
                      }`}
                    >
                      <td className="py-4 px-6">
                        <span className="font-mono font-medium text-foreground">فاتورة #{invoice.id}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-foreground">{invoice.customer_name}</span>
                      </td>
                      <td className="py-4 px-6">
                        <Amount value={amount} digits={2} tone={amount < 0 ? 'success' : amount > 0 ? 'destructive' : undefined} />
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-muted-foreground">{itemsCount} عنصر</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-muted-foreground">
                          {new Date(invoice.created_at).toLocaleDateString('ar')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.text}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => window.open(`/print/invoice/${invoice.id}`, '_blank') }>
                            <PrinterIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReturnDialog(invoice)}
                          >
                            مرتجع
                          </Button>
                          {isDraft && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setAddItemInvoiceId(invoice.id); setAddItemOpen(true); }}
                              >
                                إضافة عنصر
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setConfirmInvoice(invoice); setConfirmDialogOpen(true); }}
                              >
                                تأكيد
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">الإجمالي: {count.toLocaleString()} فاتورة</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={!hasPrev || page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>السابق</Button>
          <span className="text-sm text-muted-foreground">صفحة {page}</span>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>التالي</Button>
        </div>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setSelectedCustomer('');
            setCustomerSearch('');
            setCustomerSearchKeyword('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="البحث عن عميل"
              placeholder="اكتب اسم العميل"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
            <Button
              variant="outline"
              onClick={() => setCustomerSearchKeyword(customerSearch.trim())}
              disabled={customerOptionsLoading}
            >
              بحث عن عميل
            </Button>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">اختر العميل</label>
              <Select value={selectedCustomer} onValueChange={(value) => setSelectedCustomer(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={customerOptionsLoading ? '...جاري التحميل' : 'اختر العميل'} />
                </SelectTrigger>
                <SelectContent>
                  {customerOptions.map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setSelectedCustomer('');
                setCustomerSearch('');
                setCustomerSearchKeyword('');
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!selectedCustomer) return;
                createInvoiceMutation.mutate({ customerId: Number(selectedCustomer) });
              }}
              disabled={!selectedCustomer || createInvoiceMutation.isPending}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog (frontend print) */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => { setPreviewOpen(open); if (!open) setPreviewInvoice(null); }}
      >
        <DialogContent className="max-w-3xl print:max-w-none print:!p-0 print-invoice">
          <DialogHeader>
            <DialogTitle>معاينة الفاتورة</DialogTitle>
          </DialogHeader>
          {previewInvoice ? (
            <div className="invoice-print-area space-y-5 print:space-y-2">
              {/* Header with logo and company info */}
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
                    <h3 className="text-xl font-bold text-foreground">{profile?.company_name || 'فاتورة'}</h3>
                    <p className="text-xs text-muted-foreground">{profile?.company_address || ''}</p>
                    <p className="text-xs text-muted-foreground">{profile?.company_phone || ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-bold text-foreground">فاتورة #{previewInvoice.id}</h3>
                  <p className="text-sm text-muted-foreground">{new Date(previewInvoice.created_at).toLocaleString('ar')}</p>
                  <p className="text-sm text-foreground">{previewInvoice.customer_name}</p>
                </div>
              </div>

              <div className="border-y border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-right py-2 px-3">المنتج</th>
                      <th className="text-right py-2 px-3">الكمية</th>
                      <th className="text-right py-2 px-3">السعر</th>
                      <th className="text-right py-2 px-3">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewInvoice.items || []).map((it) => {
                      const qty = Number(it.qty || 0);
                      const price = Number(it.price_at_add || 0);
                      const total = qty * price;
                      return (
                        <tr key={it.id} className="border-b border-border last:border-b-0">
                          <td className="py-2 px-3">{it.product_name}</td>
                          <td className="py-2 px-3 text-muted-foreground">{qty}</td>
                          <td className="py-2 px-3 text-muted-foreground"><Amount value={price} digits={2} /></td>
                          <td className="py-2 px-3 font-medium text-foreground"><Amount value={total} digits={2} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="py-2 px-3" colSpan={3}>
                        <span className="text-sm font-semibold text-foreground">المبلغ الإجمالي</span>
                      </td>
                      <td className="py-2 px-3 font-bold text-foreground">
                        <Amount value={Number(previewInvoice.total_amount || 0)} digits={2} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Totals and actions */}
              <div className="flex items-center justify-between print:px-6">
                <div className="text-sm text-muted-foreground">
                  <div>طريقة الدفع: —</div>
                </div>
                <div className="flex items-center gap-6 print:pb-6">
                  <div className="text-lg font-bold text-foreground">
                    <span className="text-sm font-medium mr-2">المبلغ الإجمالي:</span>
                    <Amount value={Number(previewInvoice.total_amount || 0)} digits={2} />
                  </div>
                  <Button onClick={printPreview} className="print:hidden">طباعة</Button>
                </div>
              </div>

              {/* Policies (always printed, plain, no cards/shadows) */}
              <div className="print:px-6 print:pb-6 space-y-2">
                <h4 className="text-sm font-semibold text-foreground">الملاحظات والسياسات</h4>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">سياسة الإرجاع</p>
                  <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                    {profile?.return_policy?.trim() || 'لا توجد سياسة إرجاع محددة.'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">سياسة الدفع</p>
                  <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                    {profile?.payment_policy?.trim() || 'لا توجد سياسة دفع محددة.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-10">لا توجد بيانات للعرض</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onOpenChange={(open) => { setConfirmDialogOpen(open); if (!open) setConfirmInvoice(null); }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تأكيد الفاتورة</DialogTitle>
          </DialogHeader>
          {confirmInvoice ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">فاتورة #{confirmInvoice.id} — {confirmInvoice.customer_name}</div>
              <div className="text-foreground font-semibold">الإجمالي: {formatAmount(Number(confirmInvoice.total_amount || 0))}</div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>إلغاء</Button>
            <Button onClick={() => confirmInvoice && confirmMutation.mutate(confirmInvoice.id)} disabled={!confirmInvoice || confirmMutation.isPending}>تأكيد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog
        open={returnDialogOpen}
        onOpenChange={(open) => { setReturnDialogOpen(open); if (!open) { setReturnInvoice(null); setReturnInputs({}); } }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>إنشاء مرتجع {returnInvoice ? `لفاتورة #${returnInvoice.id}` : ''}</DialogTitle>
          </DialogHeader>
          {returnInvoice ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">العميل: <span className="text-foreground font-medium">{returnInvoice.customer_name}</span></div>
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-right py-2 px-3">المنتج</th>
                      <th className="text-right py-2 px-3">المباع</th>
                      <th className="text-right py-2 px-3">تم إرجاعه</th>
                      <th className="text-right py-2 px-3">المتاح إرجاعه</th>
                      <th className="text-right py-2 px-3">إرجاع الآن</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(returnInvoice.items || []).map((it: any) => {
                      const sold = Number(it.qty || 0);
                      const alreadyReturned = Number(returnedByItemId.get(it.id) || 0);
                      const remaining = Math.max(0, sold - alreadyReturned);
                      return (
                        <tr key={it.id} className="border-b border-border last:border-b-0">
                          <td className="py-2 px-3">{it.product_name}</td>
                          <td className="py-2 px-3 text-muted-foreground">{sold}</td>
                          <td className="py-2 px-3 text-muted-foreground">{alreadyReturned}</td>
                          <td className="py-2 px-3 font-medium text-foreground">{remaining}</td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              min={0}
                              max={remaining}
                              value={returnInputs[it.id] ?? ''}
                              onChange={(e) => setReturnInputs((prev) => ({ ...prev, [it.id]: e.target.value }))}
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-10">لا توجد بيانات</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>إلغاء</Button>
            <Button onClick={() => submitReturn.mutate()} disabled={!returnInvoice || submitReturn.isPending}>حفظ المرتجع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog
        open={addItemOpen}
        onOpenChange={(open) => {
          setAddItemOpen(open);
          if (!open) {
            setAddItemInvoiceId(null); setSelectedProductId(''); setItemQty('1'); setProductSearch(''); setProductSearchKeyword('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة عنصر للفاتورة #{addItemInvoiceId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="بحث عن منتج"
              placeholder="اكتب اسم المنتج أو SKU"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">النتائج</label>
              <div className="max-h-56 overflow-auto border border-border rounded-md divide-y divide-border">
                {productOptionsLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">...جاري التحميل</div>
                ) : productOptions.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">لا توجد نتائج</div>
                ) : (
                  productOptions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`w-full text-right p-3 hover:bg-card-hover transition-colors ${selectedProductId === String(p.id) ? 'bg-muted/50' : ''}`}
                      onClick={() => setSelectedProductId(String(p.id))}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.sku ? `SKU: ${p.sku} • ` : ''}الوحدة: {p.unit_display || '-'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          المتاح: <span className="text-foreground font-semibold">{(p.stock_qty ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <Input
              label="الكمية"
              type="number"
              min={1}
              value={itemQty}
              onChange={(e) => setItemQty(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => {
                const pid = Number(selectedProductId);
                const qty = Number(itemQty);
                if (!addItemInvoiceId || !pid || !qty) return;
                addItemMutation.mutate({ invoiceId: addItemInvoiceId, productId: pid, qty });
              }}
              disabled={!addItemInvoiceId || !selectedProductId || Number(itemQty) <= 0 || addItemMutation.isPending}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

