import React, { useMemo, useState } from 'react';
import { ArchiveBoxIcon, ArrowPathIcon, CubeIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import { Amount } from '../components/Amount';
import { apiClient, endpoints, normalizeListResponse } from '../lib/api';
import { useToast } from '../components/ui/use-toast';
import { Skeleton } from '../components/ui/skeleton';
import { useCompany } from '../contexts/CompanyContext';

interface ArchivedProduct {
  id: number;
  name: string;
  sku?: string | null;
  category_name?: string | null;
  stock_qty: number;
  price: number | string;
}

interface ArchivedCustomer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

type ArchiveTab = 'products' | 'customers';

const parseNumber = (value: number | string | undefined | null): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const Archive: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getProductsLabel } = useCompany();

  const [activeTab, setActiveTab] = useState<ArchiveTab>('products');
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const { data: archivedProductsData, isLoading: productsLoading, isError: productsError } = useQuery({
    queryKey: ['archived-products'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products, {
        params: {
          archived: true,
        },
      });
      return normalizeListResponse<ArchivedProduct>(res.data);
    },
  });

  const { data: archivedCustomersData, isLoading: customersLoading, isError: customersError } = useQuery({
    queryKey: ['archived-customers'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.customers, {
        params: {
          archived: true,
        },
      });
      return normalizeListResponse<ArchivedCustomer>(res.data);
    },
  });

  const archivedProducts = archivedProductsData?.results ?? [];
  const archivedCustomers = archivedCustomersData?.results ?? [];

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return archivedProducts;
    const keyword = productSearch.trim().toLowerCase();
    return archivedProducts.filter((product) =>
      product.name.toLowerCase().includes(keyword) ||
      (product.sku || '').toLowerCase().includes(keyword) ||
      (product.category_name || '').toLowerCase().includes(keyword)
    );
  }, [archivedProducts, productSearch]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return archivedCustomers;
    const keyword = customerSearch.trim().toLowerCase();
    return archivedCustomers.filter((customer) =>
      customer.name.toLowerCase().includes(keyword) ||
      (customer.phone || '').toLowerCase().includes(keyword) ||
      (customer.email || '').toLowerCase().includes(keyword)
    );
  }, [archivedCustomers, customerSearch]);

  const restoreProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.productRestore(id));
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'تمت الاستعادة', description: `تمت استعادة ${getProductsLabel(1)} بنجاح` });
      queryClient.invalidateQueries({ queryKey: ['archived-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || `تعذر استعادة ${getProductsLabel(1)}`;
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const restoreCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(endpoints.customerRestore(id));
      return res.data;
    },
    onSuccess: () => {
      toast({ title: 'تمت الاستعادة', description: 'تمت استعادة العميل بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['archived-customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || 'تعذر استعادة العميل';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const totalArchivedValue = useMemo(() => {
    return archivedProducts.reduce((acc, product) => acc + parseNumber(product.price) * product.stock_qty, 0);
  }, [archivedProducts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">الأرشيف</h1>
        <p className="text-muted-foreground mt-1">إدارة العناصر المؤرشفة وإعادتها للنشاط</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-full">
              <ArchiveBoxIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي {getProductsLabel()} المؤرشفة</p>
              <p className="text-xl font-bold text-foreground">{archivedProducts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light rounded-full">
              <UsersIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي العملاء المؤرشفين</p>
              <p className="text-xl font-bold text-foreground">{archivedCustomers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-light rounded-full">
              <CubeIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">قيمة {getProductsLabel()} المؤرشفة</p>
              <p className="text-xl font-bold text-foreground"><Amount value={totalArchivedValue} digits={2} /></p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-2 inline-flex gap-2">
        <button
          className={`px-5 py-2 rounded-xl transition-all duration-200 focus-visible:shadow-neo-inset ${
            activeTab === 'products'
              ? 'bg-background text-foreground shadow-neo'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('products')}
        >
          {getProductsLabel()}
        </button>
        <button
          className={`px-5 py-2 rounded-xl transition-all duration-200 focus-visible:shadow-neo-inset ${
            activeTab === 'customers'
              ? 'bg-background text-foreground shadow-neo'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('customers')}
        >
          العملاء
        </button>
      </div>

      {activeTab === 'products' ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 min-w-[260px]">
              <Input
                className="w-full"
                placeholder={`البحث باسم ${getProductsLabel(1)} أو SKU أو الفئة`}
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </div>
            <span className="text-sm text-muted-foreground">{filteredProducts.length.toLocaleString()} {getProductsLabel(filteredProducts.length)}</span>
          </div>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">{getProductsLabel(1)}</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">SKU</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الفئة</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المخزون</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">السعر</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {productsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-40" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-28" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-6 w-24" /></td>
                      </tr>
                    ))
                  ) : productsError ? (
                    <tr>
                      <td className="py-6 px-6 text-destructive" colSpan={6}>
                        تعذر جلب بيانات {getProductsLabel()} المؤرشفة
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td className="py-6 px-6 text-muted-foreground" colSpan={6}>
                        لا توجد {getProductsLabel()} مؤرشفة مطابقة
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-border hover:bg-card-hover transition-colors">
                        <td className="py-4 px-6 text-foreground font-medium">{product.name}</td>
                        <td className="py-4 px-6 text-muted-foreground">{product.sku || '—'}</td>
                        <td className="py-4 px-6 text-muted-foreground">{product.category_name || '—'}</td>
                        <td className="py-4 px-6 text-muted-foreground">{product.stock_qty}</td>
                        <td className="py-4 px-6 text-muted-foreground">{parseNumber(product.price).toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</td>
                        <td className="py-4 px-6">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => restoreProductMutation.mutate(product.id)}
                            disabled={restoreProductMutation.isPending}
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                            استعادة
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 min-w-[260px]">
              <Input
                className="w-full"
                placeholder="البحث باسم العميل أو رقم الهاتف أو البريد"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
              />
            </div>
            <span className="text-sm text-muted-foreground">{filteredCustomers.length.toLocaleString()} عميل</span>
          </div>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">العميل</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الهاتف</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">البريد</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">العنوان</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {customersLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-40" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-28" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-36" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-4 w-48" /></td>
                        <td className="py-4 px-6"><Skeleton className="h-6 w-24" /></td>
                      </tr>
                    ))
                  ) : customersError ? (
                    <tr>
                      <td className="py-6 px-6 text-destructive" colSpan={5}>
                        تعذر جلب بيانات العملاء المؤرشفين
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td className="py-6 px-6 text-muted-foreground" colSpan={5}>
                        لا يوجد عملاء مؤرشفين مطابقين
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b border-border hover:bg-card-hover transition-colors">
                        <td className="py-4 px-6 text-foreground font-medium">{customer.name}</td>
                        <td className="py-4 px-6 text-muted-foreground">{customer.phone || '—'}</td>
                        <td className="py-4 px-6 text-muted-foreground">{customer.email || '—'}</td>
                        <td className="py-4 px-6 text-muted-foreground">{customer.address || '—'}</td>
                        <td className="py-4 px-6">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => restoreCustomerMutation.mutate(customer.id)}
                            disabled={restoreCustomerMutation.isPending}
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                            استعادة
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

