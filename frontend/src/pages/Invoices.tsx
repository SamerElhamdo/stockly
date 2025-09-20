import React, { useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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

interface ApiInvoiceItem {
  id: number;
  product_name: string;
  product_sku?: string | null;
  qty: string | number;
  price_at_add: string | number;
  line_total: string | number;
  unit_display?: string | null;
  measurement?: string | null;
}

interface CompanyProfile {
  id: number;
  company_name: string;
  company_code: string;
  company_email?: string | null;
  company_phone?: string | null;
  company_address?: string | null;
  logo_url?: string | null;
  return_policy?: string | null;
  payment_policy?: string | null;
}

const parseAmount = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

interface ApiCustomerOption {
  id: number;
  name: string;
}

const statusConfigMap = {
  draft: { text: 'مسودة', color: 'text-warning bg-warning-light', icon: ClockIcon },
  confirmed: { text: 'مؤكدة', color: 'text-primary bg-primary-light', icon: CheckCircleIcon },
  cancelled: { text: 'ملغاة', color: 'text-destructive bg-destructive-light', icon: XCircleIcon },
} as const;

type InvoiceStatus = keyof typeof statusConfigMap;

interface ApiInvoice {
  id: number;
  customer: number;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  company_name?: string;
  company_code?: string;
  status: InvoiceStatus;
  created_at: string;
  total_amount: string | number;
  items?: ApiInvoiceItem[];
}

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

  const { data: companyProfile } = useQuery({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const res = await apiClient.get<CompanyProfile>(endpoints.companyProfile);
      return res.data;
    },
  });

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

  const { data: invoiceDetailData } = useQuery({
    queryKey: ['invoice-detail', selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice?.id) return null;
      const res = await apiClient.get(endpoints.invoiceDetail(selectedInvoice.id));
      return res.data as ApiInvoice;
    },
    enabled: Boolean(detailDialogOpen && selectedInvoice?.id),
  });

  const list = data?.results || [];
  const total = data?.count ?? list.length;
  const hasNext = Boolean(data?.next);
  const hasPrev = Boolean(data?.previous);

  const invoiceForView = invoiceDetailData ?? selectedInvoice;

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
        const totalAmount = parseAmount(invoice.total_amount);
        acc.totalAmount += totalAmount;
        acc.count += 1;
        acc.statusCount[invoice.status] = (acc.statusCount[invoice.status] || 0) + 1;
        return acc;
      },
      {
        count: 0,
        totalAmount: 0,
        statusCount: { draft: 0, confirmed: 0, cancelled: 0 } as Record<InvoiceStatus, number>,
      }
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

  const handlePrint = () => {
    if (!invoiceForView) {
      toast({ title: 'لا توجد فاتورة محددة', description: 'اختر فاتورة لطباعتها', variant: 'destructive' });
      return;
    }

    const html = buildInvoicePrintHtml(invoiceForView, companyProfile || undefined);
    const printWindow = window.open('', '_blank', 'width=1024,height=720');
    if (!printWindow) {
      toast({ title: 'تعذر فتح نافذة الطباعة', description: 'يرجى السماح بالنوافذ المنبثقة أو المحاولة لاحقاً', variant: 'destructive' });
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    const triggerPrint = () => {
      printWindow.print();
      printWindow.close();
    };

    if (printWindow.document.readyState === 'complete') {
      triggerPrint();
    } else {
      printWindow.onload = triggerPrint;
    }
  };

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
                  const amount = parseAmount(invoice.total_amount);
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
          {invoiceForView ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">رقم الفاتورة</p>
                  <p className="text-foreground font-medium">#{invoiceForView.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">العميل</p>
                  <p className="text-foreground font-medium">{invoiceForView.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">الحالة</p>
                  <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${statusConfigMap[invoiceForView.status].color}`}>
                    {statusConfigMap[invoiceForView.status].text}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">التاريخ</p>
                  <p className="text-foreground font-medium">
                    {new Date(invoiceForView.created_at).toLocaleString('ar')}
                  </p>
                </div>
                {invoiceForView.customer_phone && (
                  <div>
                    <p className="text-muted-foreground">رقم الهاتف</p>
                    <p className="text-foreground font-medium">{invoiceForView.customer_phone}</p>
                  </div>
                )}
                {invoiceForView.customer_email && (
                  <div>
                    <p className="text-muted-foreground">البريد الإلكتروني</p>
                    <p className="text-foreground font-medium">{invoiceForView.customer_email}</p>
                  </div>
                )}
                {invoiceForView.customer_address && (
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">العنوان</p>
                    <p className="text-foreground font-medium">{invoiceForView.customer_address}</p>
                  </div>
                )}
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
                    {(invoiceForView.items || []).map((item) => {
                      const qty = parseAmount(item.qty);
                      const price = parseAmount(item.price_at_add);
                      const total = parseAmount(item.line_total);

                      return (
                        <tr key={item.id} className="border-b border-border last:border-b-0">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{item.product_name}</span>
                              {item.product_sku && <span className="text-xs text-muted-foreground">SKU: {item.product_sku}</span>}
                              {item.unit_display && <span className="text-xs text-muted-foreground">الوحدة: {item.unit_display}</span>}
                              {item.measurement && <span className="text-xs text-muted-foreground">{item.measurement}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{qty.toLocaleString()}</td>
                          <td className="py-3 px-4 text-muted-foreground">{price.toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</td>
                          <td className="py-3 px-4 text-foreground font-medium">{total.toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</td>
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
          {invoiceForView && (
            <DialogFooter className="mt-4">
              <Button variant="outline" className="gap-2" onClick={handlePrint}>
                <PrinterIcon className="h-4 w-4" />
                طباعة الفاتورة
              </Button>
            </DialogFooter>
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

const buildInvoicePrintHtml = (invoice: ApiInvoice, profile?: CompanyProfile) => {
  const markup = renderToStaticMarkup(
    <InvoicePrintDocument invoice={invoice} profile={profile} />
  );
  return `<!DOCTYPE html>${markup}`;
};

const InvoicePrintDocument: React.FC<{ invoice: ApiInvoice; profile?: CompanyProfile }> = ({ invoice, profile }) => {
  const styles = `
    * { box-sizing: border-box; font-family: 'Tajawal', 'Segoe UI', sans-serif; }
    body { margin: 0; background: #f3f4f6; color: #111827; }
    .wrapper { width: 100%; padding: 24px; }
    .card { max-width: 880px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; box-shadow: 0 20px 50px rgba(15,23,42,0.08); }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
    .company-info { display: flex; flex-direction: column; gap: 4px; }
    .company-name { font-size: 20px; font-weight: 700; color: #111827; }
    .company-meta { font-size: 13px; color: #6b7280; }
    .logo { width: 90px; height: 90px; border-radius: 16px; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; background: #f9fafb; overflow: hidden; }
    .logo img { width: 100%; height: 100%; object-fit: contain; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 12px; color: #6b7280; }
    .info-value { font-size: 14px; color: #111827; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    thead { background: #f3f4f6; }
    th, td { text-align: right; padding: 12px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
    th { font-weight: 600; color: #374151; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .summary { margin-top: 20px; display: flex; justify-content: flex-end; }
    .summary-box { min-width: 220px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #f9fafb; }
    .summary-label { font-size: 12px; color: #6b7280; }
    .summary-value { font-size: 18px; font-weight: 700; color: #111827; }
    .policy { border: 1px dashed #d1d5db; border-radius: 12px; padding: 16px; background: #fdf2f8; margin-top: 16px; }
    .policy-title { font-size: 13px; font-weight: 600; color: #be123c; margin-bottom: 8px; }
    .policy-text { font-size: 12px; color: #6b7280; line-height: 1.6; white-space: pre-wrap; }
    .footer { margin-top: 32px; text-align: center; font-size: 12px; color: #9ca3af; }
    @media print {
      body { background: #ffffff; }
      .wrapper { padding: 0; }
      .card { box-shadow: none; border-radius: 0; margin: 0; }
    }
  `;

  const statusText: Record<InvoiceStatus, string> = {
    draft: 'مسودة',
    confirmed: 'مؤكدة',
    cancelled: 'ملغاة',
  };

  const items = invoice.items || [];
  const totalAmount = parseAmount(invoice.total_amount);

  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <title>فاتورة #{invoice.id}</title>
        <style>{styles}</style>
      </head>
      <body>
        <div className="wrapper">
          <div className="card">
            <div className="header">
              <div className="company-info">
                <span className="company-name">{profile?.company_name || invoice.company_name || 'اسم الشركة'}</span>
                <span className="company-meta">كود الشركة: {profile?.company_code || invoice.company_code || '—'}</span>
                {profile?.company_phone && <span className="company-meta">الهاتف: {profile.company_phone}</span>}
                {profile?.company_email && <span className="company-meta">البريد: {profile.company_email}</span>}
                {profile?.company_address && <span className="company-meta">العنوان: {profile.company_address}</span>}
              </div>
              <div className="logo">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="شعار الشركة" />
                ) : (
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>لا يوجد شعار</span>
                )}
              </div>
            </div>

            <div className="section">
              <div className="section-title">بيانات الفاتورة</div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">رقم الفاتورة</span>
                  <span className="info-value">#{invoice.id}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">الحالة</span>
                  <span className="info-value">{statusText[invoice.status]}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">التاريخ</span>
                  <span className="info-value">{new Date(invoice.created_at).toLocaleString('ar')}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">إجمالي الفاتورة</span>
                  <span className="info-value">{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</span>
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">بيانات العميل</div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">اسم العميل</span>
                  <span className="info-value">{invoice.customer_name}</span>
                </div>
                {invoice.customer_phone && (
                  <div className="info-item">
                    <span className="info-label">الهاتف</span>
                    <span className="info-value">{invoice.customer_phone}</span>
                  </div>
                )}
                {invoice.customer_email && (
                  <div className="info-item">
                    <span className="info-label">البريد الإلكتروني</span>
                    <span className="info-value">{invoice.customer_email}</span>
                  </div>
                )}
                {invoice.customer_address && (
                  <div className="info-item">
                    <span className="info-label">العنوان</span>
                    <span className="info-value">{invoice.customer_address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="section">
              <div className="section-title">العناصر</div>
              <table>
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الوصف</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const qty = parseAmount(item.qty);
                    const price = parseAmount(item.price_at_add);
                    const total = parseAmount(item.line_total);
                    return (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td>
                          {[item.product_sku && `SKU: ${item.product_sku}`, item.unit_display && `الوحدة: ${item.unit_display}`, item.measurement]
                            .filter(Boolean)
                            .join(' • ') || '—'}
                        </td>
                        <td>{qty.toLocaleString()}</td>
                        <td>{price.toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</td>
                        <td>{total.toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="summary">
                <div className="summary-box">
                  <div className="summary-label">الإجمالي المستحق</div>
                  <div className="summary-value">{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</div>
                </div>
              </div>
            </div>

            {(profile?.return_policy || profile?.payment_policy) && (
              <div className="section">
                {profile?.return_policy && (
                  <div className="policy">
                    <div className="policy-title">سياسة الإرجاع</div>
                    <div className="policy-text">{profile.return_policy}</div>
                  </div>
                )}
                {profile?.payment_policy && (
                  <div className="policy" style={{ background: '#eff6ff', borderColor: '#bfdbfe', marginTop: '12px' }}>
                    <div className="policy-title" style={{ color: '#1d4ed8' }}>سياسة الدفع</div>
                    <div className="policy-text">{profile.payment_policy}</div>
                  </div>
                )}
              </div>
            )}

            <div className="footer">شكرًا لاختياركم لنا. نتطلع لخدمتكم دائماً.</div>
          </div>
        </div>
      </body>
    </html>
  );
};
