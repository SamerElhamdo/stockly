import React, { useMemo, useState } from 'react';

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

const statusConfigMap = {
  draft: { text: 'مسودة', color: 'text-warning bg-warning-light', icon: ClockIcon },
  confirmed: { text: 'مؤكدة', color: 'text-primary bg-primary-light', icon: CheckCircleIcon },
  cancelled: { text: 'ملغاة', color: 'text-destructive bg-destructive-light', icon: XCircleIcon },
} as const;

type InvoiceStatus = keyof typeof statusConfigMap;

interface ApiInvoice {
  id: number;
  customer_name: string;
  total_amount: number | string;
  status: InvoiceStatus;
  created_at: string;
  items?: any[];
}

interface OptionItem { id: number; name: string }

export const Invoices: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
  const [productSearch, setProductSearch] = useState('');
  const [productSearchKeyword, setProductSearchKeyword] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<string>('1');

  // Invoices list
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['invoices', searchKeyword, statusFilter, page],
    queryFn: async () => {
      const params: any = { page };
      if (searchKeyword) params.search = searchKeyword;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await apiClient.get(endpoints.invoices, { params });
      return normalizeListResponse<ApiInvoice>(res.data);
    },
    keepPreviousData: true,
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
      const normalized = normalizeListResponse<{ id: number; name: string }>(res.data);
      return normalized.results.map((p) => ({ id: p.id, name: p.name } as OptionItem));
    },
    enabled: addItemOpen,
  });
  const productOptions = productOptionsData || [];

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
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر تأكيد الفاتورة';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    },
  });

  const downloadPdf = async (invoiceId: number) => {
    try {
      const res = await apiClient.get(endpoints.invoicePdf(invoiceId), { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const win = window.open(url, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = url; a.download = `invoice_${invoiceId}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err: any) {
      toast({ title: 'خطأ', description: 'تعذر تنزيل PDF', variant: 'destructive' });
    }
  };

  const filteredInvoices = list; // server-side filtered already by params

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الفواتير</h1>
          <p className="text-muted-foreground mt-1">إدارة فواتير المبيعات</p>
        </div>
        <Button variant="hero" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
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
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as typeof statusFilter);
              }}
              className="px-3 py-2 rounded-md border border-input-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">جميع الحالات</option>
              <option value="draft">مسودة</option>
              <option value="confirmed">مؤكدة</option>
              <option value="cancelled">ملغاة</option>
            </select>
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
                        <span className="font-semibold text-foreground">
                          {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س
                        </span>
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
                          <Button variant="ghost" size="sm" onClick={() => downloadPdf(invoice.id)}>
                            <PrinterIcon className="h-4 w-4" />
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
                                onClick={() => confirmMutation.mutate(invoice.id)}
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
            <Button variant="outline" onClick={() => setProductSearchKeyword(productSearch.trim())} disabled={productOptionsLoading}>بحث</Button>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">اختر المنتج</label>
              <Select value={selectedProductId} onValueChange={(value) => setSelectedProductId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={productOptionsLoading ? '...جاري التحميل' : 'اختر المنتج'} />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input label="الكمية" type="number" min={1} value={itemQty} onChange={(e) => setItemQty(e.target.value)} />
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

