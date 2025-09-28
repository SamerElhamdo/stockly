import React, { useMemo, useState } from 'react';
import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
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
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../components/ui/use-toast';
import { useCompany } from '../contexts/CompanyContext';
import { Amount } from '../components/Amount';
import { Skeleton } from '../components/ui/skeleton';

interface ApiProduct {
  id: number;
  name: string;
  sku: string;
  category?: number;
  category_name?: string | null;
  price: number | string;
  stock_qty: number;
  archived?: boolean;
}

interface CategoryOption {
  id: number;
  name: string;
}

export const Products: React.FC = () => {
  const { formatAmount } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [effectiveSearch, setEffectiveSearch] = useState('');
  const [page, setPage] = useState(1);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    stock_qty: '',
    unit: 'piece',
    measurement: '',
    description: '',
    cost_price: '',
    wholesale_price: '',
    retail_price: '',
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery<{ count: number; next: string | null; previous: string | null; results: ApiProduct[]}>({
    queryKey: ['products', effectiveSearch, page],
    queryFn: async () => {
      const params: Record<string, any> = { page };
      if (effectiveSearch) params.search = effectiveSearch;
      params.archived = false;
      const res = await apiClient.get(endpoints.products, { params });
      return res.data as { count: number; next: string | null; previous: string | null; results: ApiProduct[] };
    },
    placeholderData: (prev) => prev,
  });

  const total = data?.count || 0;
  const results = data?.results || [];
  const hasNext = Boolean(data?.next);
  const hasPrev = Boolean(data?.previous);

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['product-form-categories'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.categories);
      return normalizeListResponse<CategoryOption>(res.data);
    },
    enabled: productFormOpen,
    staleTime: 5 * 60 * 1000,
  });

  const categoryOptions = categoriesData?.results ?? [];

  const unitOptions = useMemo(
    () => [
      { value: 'piece', label: 'عدد' },
      { value: 'meter', label: 'متر' },
      { value: 'kg', label: 'كيلو' },
      { value: 'liter', label: 'لتر' },
      { value: 'box', label: 'صندوق' },
      { value: 'pack', label: 'عبوة' },
      { value: 'roll', label: 'لفة' },
      { value: 'sheet', label: 'ورقة' },
      { value: 'other', label: 'أخرى' },
    ],
    []
  );

  const resetProductForm = () => {
    setProductForm({
      name: '',
      sku: '',
      category: '',
      price: '',
      stock_qty: '',
      unit: 'piece',
      measurement: '',
      description: '',
      cost_price: '',
      wholesale_price: '',
      retail_price: '',
    });
    setEditingProduct(null);
    setShowAdvanced(false);
  };

  const handleProductFieldChange = (field: keyof typeof productForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setProductForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const createProductMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiClient.post(endpoints.products, payload);
      return res.data as ApiProduct;
    },
    onSuccess: () => {
      toast({ title: 'تمت الإضافة', description: 'تم إنشاء المنتج بنجاح' });
      setProductFormOpen(false);
      resetProductForm();
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر إنشاء المنتج';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (payload: { id: number; data: Record<string, unknown> }) => {
      const res = await apiClient.patch(endpoints.productDetail(payload.id), payload.data);
      return res.data as ApiProduct;
    },
    onSuccess: () => {
      toast({ title: 'تم التحديث', description: 'تم تعديل المنتج بنجاح' });
      setProductFormOpen(false);
      resetProductForm();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر تعديل المنتج';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const res = await apiClient.post(endpoints.productArchive(id), {});
      return res.data as { archived: boolean };
    },
    onSuccess: () => {
      toast({ title: 'تم الأرشفة', description: 'تم تحديث حالة المنتج' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر أرشفة المنتج';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const res = await apiClient.post(endpoints.productRestore(id), {});
      return res.data as { archived: boolean };
    },
    onSuccess: () => {
      toast({ title: 'تم الاستعادة', description: 'تم إعادة تنشيط المنتج' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر استعادة المنتج';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const isCreating = createProductMutation.isPending;

  const activeArchiveId = archiveMutation.variables?.id;
  const activeRestoreId = restoreMutation.variables?.id;

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
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            resetProductForm();
            setEditingProduct(null);
            setProductFormOpen(true);
          }}
        >
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  setEffectiveSearch(searchTerm.trim());
                  refetch();
                }
              }}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
          </div>
          <div className="flex gap-2 items-center">
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
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-40" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-28" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-16" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-5 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-28" /></td>
                  </tr>
                ))
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
                        <Amount value={Number(priceNumber || 0)} />
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingProduct(product);
                              setProductFormOpen(true);
                              setShowAdvanced(false);
                              setProductForm({
                                name: product.name || '',
                                sku: product.sku || '',
                                category: product.category ? String(product.category) : '',
                                price: String(typeof product.price === 'number' ? product.price : (product.price || '')),
                                stock_qty: String(product.stock_qty ?? ''),
                                unit: 'piece',
                                measurement: '',
                                description: '',
                                cost_price: '',
                                wholesale_price: '',
                                retail_price: '',
                              });
                            }}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          {!isArchived ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => archiveMutation.mutate({ id: product.id })}
                              disabled={archiveMutation.isPending && activeArchiveId === product.id}
                            >
                              <ArchiveBoxIcon className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => restoreMutation.mutate({ id: product.id })}
                              disabled={restoreMutation.isPending && activeRestoreId === product.id}
                            >
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

      {/* Create Product Dialog */}
      <Dialog
        open={productFormOpen}
        onOpenChange={(open) => {
          setProductFormOpen(open);
          if (!open) {
            resetProductForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="اسم المنتج"
              placeholder="أدخل اسم المنتج"
              value={productForm.name}
              onChange={handleProductFieldChange('name')}
              required
            />
            {/* SKU سيتم عرضه ضمن الخيارات المتقدمة */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">الفئة</label>
              <Select
                value={productForm.category}
                onValueChange={(value) => setProductForm((prev) => ({ ...prev, category: value }))}
                disabled={categoriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={categoriesLoading ? '...جاري التحميل' : 'اختر الفئة'} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">الوحدة</label>
              <Select
                value={productForm.unit}
                onValueChange={(value) => setProductForm((prev) => ({ ...prev, unit: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الوحدة" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="السعر"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={productForm.price}
              onChange={handleProductFieldChange('price')}
              required
            />
            <Input
              label="الكمية في المخزون"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={productForm.stock_qty}
              onChange={handleProductFieldChange('stock_qty')}
              required
            />
            <div className="md:col-span-2">
              <Button variant="outline" onClick={() => setShowAdvanced((s) => !s)}>
                {showAdvanced ? 'إخفاء الخيارات المتقدمة' : 'خيارات متقدمة'}
              </Button>
            </div>
            {showAdvanced && (
              <>
                <Input
                  label="الرمز (SKU)"
                  placeholder="اختياري"
                  value={productForm.sku}
                  onChange={handleProductFieldChange('sku')}
                />
                <Input
                  label="القياس"
                  placeholder="مثال: 1 لتر"
                  value={productForm.measurement}
                  onChange={handleProductFieldChange('measurement')}
                />
                <Input
                  label="سعر التكلفة"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="اختياري"
                  value={productForm.cost_price}
                  onChange={handleProductFieldChange('cost_price')}
                />
                <Input
                  label="سعر الجملة"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="اختياري"
                  value={productForm.wholesale_price}
                  onChange={handleProductFieldChange('wholesale_price')}
                />
                <Input
                  label="سعر التجزئة"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="اختياري"
                  value={productForm.retail_price}
                  onChange={handleProductFieldChange('retail_price')}
                />
                <div className="md:col-span-2">
                  <Textarea
                    placeholder="وصف المنتج"
                    value={productForm.description}
                    onChange={handleProductFieldChange('description')}
                    className="min-h-[120px]"
                  />
                </div>
              </>
            )}
            </div>
          </div>
          <DialogFooter>
            <Button className='mx-2' variant="outline" onClick={() => { setProductFormOpen(false); resetProductForm(); }}>
              إلغاء
            </Button>
            <Button
              className='mx-2'
              onClick={() => {
                const name = productForm.name.trim();
                const categoryId = Number(productForm.category);
                const price = Number(productForm.price);
                const stockQty = Number(productForm.stock_qty);

                if (!name || !productForm.category || Number.isNaN(categoryId) || Number.isNaN(price) || Number.isNaN(stockQty)) {
                  return;
                }

                const payload: Record<string, unknown> = {
                  name,
                  category: categoryId,
                  price,
                  stock_qty: stockQty,
                  unit: productForm.unit,
                };

                const sku = productForm.sku.trim();
                if (sku) payload.sku = sku;

                const measurement = productForm.measurement.trim();
                if (measurement) payload.measurement = measurement;

                const description = productForm.description.trim();
                if (description) payload.description = description;

                const costPrice = Number(productForm.cost_price);
                if (!Number.isNaN(costPrice) && productForm.cost_price) payload.cost_price = costPrice;

                const wholesalePrice = Number(productForm.wholesale_price);
                if (!Number.isNaN(wholesalePrice) && productForm.wholesale_price) payload.wholesale_price = wholesalePrice;

                const retailPrice = Number(productForm.retail_price);
                if (!Number.isNaN(retailPrice) && productForm.retail_price) payload.retail_price = retailPrice;

                if (editingProduct) {
                  updateProductMutation.mutate({ id: editingProduct.id, data: payload });
                } else {
                  createProductMutation.mutate(payload);
                }
              }}
              disabled={
                !productForm.name.trim() ||
                !productForm.category ||
                productForm.price.trim() === '' ||
                productForm.stock_qty.trim() === '' ||
                isCreating || updateProductMutation.isPending
              }
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};