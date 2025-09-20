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

interface ApiInvoiceItem {
  id: number;
  product_name: string;
  product_sku?: string | null;
  qty: string | number;
  price_at_add: string | number;
  line_total: string | number;
}

interface ApiInvoice {
  id: number;
  customer: number;
  customer_name: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  created_at: string;
  total_amount: string | number;
  items?: ApiInvoiceItem[];
}

interface ApiCustomerOption {
  id: number;
  name: string;
}

const statusConfigMap: Record<ApiInvoice['status'], { text: string; color: string; icon: typeof CheckCircleIcon }> = {
  draft: { text: 'مسودة', color: 'text-warning bg-warning-light', icon: ClockIcon },
  confirmed: { text: 'مؤكدة', color: 'text-primary bg-primary-light', icon: CheckCircleIcon },
  cancelled: { text: 'ملغاة', color: 'text-destructive bg-destructive-light', icon: XCircleIcon },
};

export const Invoices: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApiInvoice['status']>('all');
  const [page, setPage] = useState(1);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ApiInvoice | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchKeyword, setCustomerSearchKeyword] = useState('');

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['invoices', statusFilter, page],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.invoices, {
        params: {
          page,
          status: statusFilter === 'all' ? undefined : statusFilter,
        },
      });
      return normalizeListResponse<ApiInvoice>(res.data);
    },
    keepPreviousData: true,
  });

  const { data: customerOptionsData, isLoading: customerOptionsLoading } = useQuery({
    queryKey: ['invoice-customers', customerSearchKeyword],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers, {
        params: { search: customerSearchKeyword || undefined },
      });
      return normalizeListResponse<ApiCustomerOption>(res.data);
    },
    enabled: createDialogOpen,
    keepPreviousData: true,
  });

  const list = data?.results || [];
  const total = data?.count ?? list.length;
  const hasNext = Boolean(data?.next);
  const hasPrev = Boolean(data?.previous);

  const filteredInvoices = useMemo(() => {
    if (!searchKeyword) return list;
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return list;
    return list.filter((invoice) => {
      const idMatch = String(invoice.id).includes(keyword);
      const customerMatch = invoice.customer_name?.toLowerCase().includes(keyword);
      return idMatch || customerMatch;
    });
  }, [list, searchKeyword]);

  const stats = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, invoice) => {
        const totalAmount = typeof invoice.total_amount === 'string'
          ? parseFloat(invoice.total_amount)
          : Number(invoice.total_amount || 0);
        acc.totalAmount += Number.isNaN(totalAmount) ? 0 : totalAmount;
        acc.count += 1;
        acc.statusCount[invoice.status] = (acc.statusCount[invoice.status] || 0) + 1;
        return acc;
      },
      { count: 0, totalAmount: 0, statusCount: { draft: 0, confirmed: 0, cancelled: 0 } as Record<ApiInvoice['status'], number> }
    );
  }, [filteredInvoices]);

  const createInvoiceMutation = useMutation({
    mutationFn: async ({ customerId }: { customerId: number }) => {
      const res = await apiClient.post(endpoints.invoices, { customer: customerId });
      return res.data as ApiInvoice;
    },
    onSuccess: (invoice) => {
      toast({ title: 'تم إنشاء الفاتورة', description: `تم إنشاء فاتورة برقم #${invoice.id}` });
      setCreateDialogOpen(false);
      setSelectedCustomer('');
      setCustomerSearch('');
      setCustomerSearchKeyword('');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر إنشاء الفاتورة';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const customerOptions = customerOptionsData?.results || [];

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
              <p className="text-xl font-bold text-foreground">{stats.statusCount.confirmed}</p>
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
              <p className="text-xl font-bold text-foreground">{stats.statusCount.draft}</p>
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
                  const amount = typeof invoice.total_amount === 'string'
                    ? parseFloat(invoice.total_amount)
                    : Number(invoice.total_amount || 0);
                  const itemsCount = invoice.items?.length ?? 0;

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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
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
        <div className="text-sm text-muted-foreground">الإجمالي: {total.toLocaleString()} فاتورة</div>
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

      {/* Invoice Details Dialog */}
      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) {
            setSelectedInvoice(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الفاتورة</DialogTitle>
          </DialogHeader>
          {selectedInvoice ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">رقم الفاتورة</p>
                  <p className="text-foreground font-medium">#{selectedInvoice.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">العميل</p>
                  <p className="text-foreground font-medium">{selectedInvoice.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">الحالة</p>
                  <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${statusConfigMap[selectedInvoice.status].color}`}>
                    {statusConfigMap[selectedInvoice.status].text}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">التاريخ</p>
                  <p className="text-foreground font-medium">
                    {new Date(selectedInvoice.created_at).toLocaleString('ar')}
                  </p>
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-right py-3 px-4">المنتج</th>
                      <th className="text-right py-3 px-4">الكمية</th>
                      <th className="text-right py-3 px-4">السعر</th>
                      <th className="text-right py-3 px-4">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || []).map((item) => {
                      const qty = typeof item.qty === 'string' ? parseFloat(item.qty) : Number(item.qty || 0);
                      const price = typeof item.price_at_add === 'string' ? parseFloat(item.price_at_add) : Number(item.price_at_add || 0);
                      const total = typeof item.line_total === 'string' ? parseFloat(item.line_total) : Number(item.line_total || 0);

                      return (
                        <tr key={item.id} className="border-b border-border last:border-b-0">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{item.product_name}</span>
                              {item.product_sku && <span className="text-xs text-muted-foreground">SKU: {item.product_sku}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{qty}</td>
                          <td className="py-3 px-4 text-muted-foreground">{price.toLocaleString()} ر.س</td>
                          <td className="py-3 px-4 text-foreground font-medium">{total.toLocaleString()} ر.س</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6">لا توجد بيانات</div>
          )}
        </DialogContent>
      </Dialog>

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
    </div>
  );
};
