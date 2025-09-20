import React, { useState } from 'react';
import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { apiClient, endpoints } from '../lib/api';

interface ApiProduct {
  id: number;
  name: string;
  sku: string;
  category_name?: string | null;
  price: number | string;
  stock_qty: number;
  archived?: boolean;
}

export const Products: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [effectiveSearch, setEffectiveSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['products', effectiveSearch, page],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.products, {
        params: { search: effectiveSearch || undefined, page },
      });
      return res.data as { count: number; next: string | null; previous: string | null; results: ApiProduct[] };
    },
    keepPreviousData: true,
  });

  const total = data?.count || 0;
  const results = data?.results || [];
  const hasNext = Boolean(data?.next);
  const hasPrev = Boolean(data?.previous);

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: 'نفذ المخزون', color: 'text-destructive bg-destructive-light' };
    if (stock <= 5) return { text: 'مخزون قليل', color: 'text-warning bg-warning-light' };
    return { text: 'متوفر', color: 'text-success bg-success-light' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المنتجات</h1>
          <p className="text-muted-foreground mt-1">إدارة منتجات المتجر</p>
        </div>
        <Button variant="hero" className="gap-2">
          <PlusIcon className="h-4 w-4" />
          إضافة منتج جديد
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="البحث في المنتجات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setPage(1); setEffectiveSearch(searchTerm.trim()); refetch(); }}>بحث</Button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">اسم المنتج</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">SKU</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الفئة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">السعر</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">المخزون</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الحالة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                <tr><td className="py-6 px-6 text-muted-foreground" colSpan={7}>...جاري التحميل</td></tr>
              ) : isError ? (
                <tr><td className="py-6 px-6 text-destructive" colSpan={7}>تعذر جلب البيانات</td></tr>
              ) : results.length === 0 ? (
                <tr><td className="py-6 px-6 text-muted-foreground" colSpan={7}>لا توجد بيانات</td></tr>
              ) : (
                results.map((product, index) => {
                  const stockStatus = getStockStatus(product.stock_qty);
                  const priceNumber = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
                  const isArchived = Boolean(product.archived);
                  return (
                    <tr 
                      key={product.id} 
                      className={`border-b border-border hover:bg-card-hover transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-card'
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="font-medium text-foreground">{product.name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm text-muted-foreground">{product.sku}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-muted-foreground">{product.category_name || '-'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-foreground">{Number(priceNumber || 0).toLocaleString()} ر.س</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.stock_qty}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                            {stockStatus.text}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          !isArchived ? 'text-success bg-success-light' : 'text-muted-foreground bg-muted'
                        }`}>
                          {!isArchived ? 'نشط' : 'مؤرشف'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          {!isArchived ? (
                            <Button variant="ghost" size="sm">
                              <ArchiveBoxIcon className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm">
                              <ArrowPathIcon className="h-4 w-4" />
                            </Button>
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
        <div className="text-sm text-muted-foreground">الإجمالي: {total.toLocaleString()} منتج</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={!hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>السابق</Button>
          <span className="text-sm text-muted-foreground">صفحة {page}</span>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>التالي</Button>
        </div>
      </div>
    </div>
  );
};