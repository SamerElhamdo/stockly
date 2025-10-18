import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';

import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import { useCompany } from '../contexts/CompanyContext';
import { apiClient, endpoints, normalizeListResponse } from '../lib/api';
import { Amount } from '../components/Amount';

interface InvoiceDetail {
  id: number;
  customer_name: string;
  customer?: number;
  total_amount: number | string;
  status: string;
  created_at: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: number;
  product: number;
  product_name: string;
  qty: number | string;
  price_at_add: number | string;
  unit_display?: string;
}

interface Product {
  id: number;
  name: string;
  sku?: string;
  price: number | string;
  stock_qty: number;
  unit_display?: string;
}

export const InvoiceCreateEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatAmount, getProductsLabel } = useCompany();

  const customerId = searchParams.get('customerId');
  const customerName = searchParams.get('customerName');
  const invoiceIdFromQuery = searchParams.get('invoiceId');
  const isEditMode = Boolean(id);

  const [invoiceId, setInvoiceId] = useState<number | null>(
    id ? Number(id) : invoiceIdFromQuery ? Number(invoiceIdFromQuery) : null
  );
  const [search, setSearch] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [qtyByProduct, setQtyByProduct] = useState<Record<number, string>>({});

  // Create invoice on mount if in create mode (only if no invoiceId exists)
  useEffect(() => {
    if (!isEditMode && customerId && !invoiceId && !invoiceIdFromQuery) {
      let mounted = true;
      (async () => {
        try {
          const res = await apiClient.post(endpoints.invoices, { customer: Number(customerId) });
          if (mounted && res.data?.id) {
            setInvoiceId(Number(res.data.id));
          }
        } catch (err) {
          console.error('Failed to create invoice:', err);
          toast({ 
            title: 'خطأ', 
            description: 'فشل في إنشاء الفاتورة', 
            variant: 'destructive' 
          });
          navigate('/invoices');
        }
      })();
      return () => { mounted = false; };
    } else if (isEditMode && id) {
      setInvoiceId(Number(id));
    } else if (invoiceIdFromQuery && !invoiceId) {
      setInvoiceId(Number(invoiceIdFromQuery));
    }
  }, [customerId, invoiceId, isEditMode, id, invoiceIdFromQuery, navigate, toast]);

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => setSearchKeyword(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Fetch invoice details
  const { data: invoiceDetail, isLoading: isLoadingInvoice } = useQuery<InvoiceDetail>({
    queryKey: ['invoice-detail', invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const res = await apiClient.get(endpoints.invoiceDetail(invoiceId!));
      return res.data;
    },
  });

  // Fetch products
  const { data: products, isFetching: isFetchingProducts } = useQuery<Product[]>({
    queryKey: ['products-search', searchKeyword],
    enabled: Boolean(searchKeyword),
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products, { 
        params: { search: searchKeyword, archived: false } 
      });
      const normalized = normalizeListResponse<Product>(res.data);
      return normalized.results;
    },
  });

  // Add item mutation
  const addItem = useMutation({
    mutationFn: async ({ productId, qty }: { productId: number; qty: number }) => {
      if (!invoiceId) throw new Error('No invoice');
      const res = await apiClient.post(endpoints.invoiceAddItem(invoiceId), {
        product: productId,
        qty,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast({ title: 'نجح', description: 'تم إضافة المنتج للفاتورة' });
      // Update the cache directly without refetching
      queryClient.setQueryData(['invoice-detail', invoiceId], data);
      setQtyByProduct({});
      setSearch(''); // Clear search
      setSearchKeyword(''); // Clear search keyword to hide products list
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'فشل في إضافة المنتج';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    },
  });

  // Remove item mutation
  const removeItem = useMutation({
    mutationFn: async (itemId: number) => {
      if (!invoiceId) throw new Error('No invoice');
      const res = await apiClient.post(endpoints.invoiceRemoveItem(invoiceId), {
        item_id: itemId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast({ title: 'نجح', description: 'تم حذف العنصر من الفاتورة' });
      // Update the cache directly without refetching
      queryClient.setQueryData(['invoice-detail', invoiceId], data);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'فشل في حذف العنصر';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    },
  });

  // Confirm invoice mutation
  const confirmInvoice = useMutation({
    mutationFn: async () => {
      if (!invoiceId) throw new Error('No invoice');
      await apiClient.post(endpoints.invoiceConfirm(invoiceId));
    },
    onSuccess: () => {
      toast({ title: 'نجح', description: 'تم تأكيد الفاتورة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-detail', invoiceId] });
      navigate(`/print/invoice/${invoiceId}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'فشل في تأكيد الفاتورة';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    },
  });

  const handleAddItem = (productId: number) => {
    const qty = Number(qtyByProduct[productId] || 1);
    if (qty < 1) {
      toast({ 
        title: 'خطأ', 
        description: 'يجب أن تكون الكمية أكبر من صفر', 
        variant: 'destructive' 
      });
      return;
    }
    
    const product = products?.find(p => p.id === productId);
    if (product && qty > product.stock_qty) {
      toast({ 
        title: 'خطأ', 
        description: `الكمية المطلوبة (${qty}) تتجاوز المتاح في المخزن (${product.stock_qty})`, 
        variant: 'destructive' 
      });
      return;
    }
    
    addItem.mutate({ productId, qty });
  };

  const handleConfirm = () => {
    if (!invoiceDetail?.items || invoiceDetail.items.length === 0) {
      toast({ 
        title: 'خطأ', 
        description: 'يرجى إضافة عناصر للفاتورة', 
        variant: 'destructive' 
      });
      return;
    }
    confirmInvoice.mutate();
  };

  const displayCustomerName = useMemo(() => {
    if (isEditMode && invoiceDetail) {
      return invoiceDetail.customer_name;
    }
    return customerName || 'عميل';
  }, [isEditMode, invoiceDetail, customerName]);

  const totalAmount = useMemo(() => {
    return Number(invoiceDetail?.total_amount || 0);
  }, [invoiceDetail]);

  if (isLoadingInvoice && !invoiceDetail) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-32 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <ReceiptPercentIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isEditMode ? `تعديل فاتورة #${invoiceId}` : 'فاتورة جديدة'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{displayCustomerName}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-base px-4 py-2">
              <CheckCircleIcon className="w-4 h-4 ml-2" />
              مسودة
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Added Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-primary" />
                  العناصر المضافة
                </CardTitle>
                <Badge variant="outline">
                  {invoiceDetail?.items?.length || 0} عنصر
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {invoiceDetail?.items && invoiceDetail.items.length > 0 ? (
                <div className="space-y-2">
                  {invoiceDetail.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{item.product_name}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="secondary" className="font-mono">
                            الكمية: {Math.floor(Number(item.qty) || 0)}
                          </Badge>
                          <Amount value={Number(item.price_at_add) * Math.floor(Number(item.qty) || 0)} digits={2} />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem.mutate(item.id)}
                        disabled={removeItem.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ReceiptPercentIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد عناصر مضافة بعد</p>
                  <p className="text-sm mt-1">ابحث عن منتج وأضفه للفاتورة</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MagnifyingGlassIcon className="w-5 h-5 text-primary" />
                بحث عن منتج
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="اكتب اسم المنتج للبحث..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>

              {searchKeyword && (
                <div className="mt-4 space-y-3">
                  {isFetchingProducts ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32" />
                      ))}
                    </div>
                  ) : products && products.length > 0 ? (
                    products.map((product) => {
                      const qty = Number(qtyByProduct[product.id] || 1);
                      const maxQty = product.stock_qty || 0;
                      const hasError = qty > maxQty;

                      return (
                        <Card key={product.id} className={hasError ? 'border-destructive' : ''}>
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                                  <div className="flex items-center gap-3 mt-2">
                                    <Badge variant="secondary">
                                      متاح: {maxQty}
                                    </Badge>
                                    {product.price && (
                                      <Amount value={Number(product.price)} digits={2} />
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const currentQty = Number(qtyByProduct[product.id] || 1);
                                      if (currentQty > 1) {
                                        setQtyByProduct((prev) => ({
                                          ...prev,
                                          [product.id]: String(currentQty - 1),
                                        }));
                                      }
                                    }}
                                    disabled={qty <= 1}
                                    className="h-8 w-8 p-0"
                                  >
                                    <MinusIcon className="w-4 h-4" />
                                  </Button>
                                  
                                  <Input
                                    type="number"
                                    value={qtyByProduct[product.id] ?? '1'}
                                    onChange={(e) => {
                                      setQtyByProduct((prev) => ({
                                        ...prev,
                                        [product.id]: e.target.value,
                                      }));
                                    }}
                                    className={`w-20 text-center ${hasError ? 'border-destructive' : ''}`}
                                    min="1"
                                  />
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const currentQty = Number(qtyByProduct[product.id] || 1);
                                      setQtyByProduct((prev) => ({
                                        ...prev,
                                        [product.id]: String(currentQty + 1),
                                      }));
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <PlusIcon className="w-4 h-4" />
                                  </Button>
                                </div>

                                {/* Add Button */}
                                <Button
                                  onClick={() => handleAddItem(product.id)}
                                  disabled={addItem.isPending || hasError}
                                  className="flex-1"
                                >
                                  <PlusIcon className="w-4 h-4 ml-2" />
                                  إضافة
                                </Button>
                              </div>

                              {hasError && (
                                <p className="text-sm text-destructive">
                                  يتجاوز المتاح ({maxQty})
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>لا توجد {getProductsLabel()} مطابقة للبحث</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="space-y-6">
          {/* Total Card */}
          <Card className="bg-success/5 border-success/20 sticky top-6">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-success">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">الإجمالي</span>
                </div>
                <div className="text-3xl font-bold text-success">
                  <Amount value={totalAmount} digits={2} />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleConfirm}
                  disabled={
                    !invoiceDetail?.items ||
                    invoiceDetail.items.length === 0 ||
                    confirmInvoice.isPending
                  }
                  className="w-full"
                  size="lg"
                >
                  <CheckCircleIcon className="w-5 h-5 ml-2" />
                  {confirmInvoice.isPending ? 'جاري التأكيد...' : 'تأكيد الفاتورة'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    // Invalidate invoices cache before navigating back
                    queryClient.invalidateQueries({ queryKey: ['invoices'] });
                    queryClient.invalidateQueries({ queryKey: ['customers'] });
                    queryClient.invalidateQueries({ queryKey: ['balances'] });
                    navigate('/invoices');
                  }}
                  className="w-full"
                >
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

