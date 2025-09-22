import React, { useMemo, useState } from 'react';
import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import { PlusIcon, TagIcon, ArrowsUpDownIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
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

interface ApiCategory {
  id: number;
  name: string;
  parent?: number | null;
}

export const Categories: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [effectiveSearch, setEffectiveSearch] = useState('');
  const [page, setPage] = useState(1);
  // لا حاجة للترتيب في الفئات

  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    parent: '',
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['categories', effectiveSearch, page],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.categories, {
        params: { search: effectiveSearch || undefined, page },
      });
      return normalizeListResponse<ApiCategory>(res.data);
    },
    keepPreviousData: true,
  });

  const { data: categoryOptionsData } = useQuery({
    queryKey: ['category-options'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.categories);
      return normalizeListResponse<ApiCategory>(res.data);
    },
    staleTime: 5 * 60 * 1000,
  });

  const list = data?.results || [];
  const total = data?.count ?? list.length;
  const hasNext = Boolean(data?.next);
  const hasPrev = Boolean(data?.previous);

  const optionSource = categoryOptionsData?.results || [];
  const parentLookup = useMemo(() => {
    const map = new Map<number, string>();
    [...optionSource, ...list].forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [optionSource, list]);

  const sortedList = list;

  const createCategoryMutation = useMutation({
    mutationFn: async (payload: { name: string; parent?: number | null }) => {
      const res = await apiClient.post(endpoints.categories, payload);
      return res.data as ApiCategory;
    },
    onSuccess: () => {
      toast({ title: 'تمت الإضافة', description: 'تم إنشاء الفئة بنجاح' });
      setCategoryFormOpen(false);
      setCategoryForm({ name: '', parent: '' });
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-options'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر إنشاء الفئة';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (payload: { id: number; data: { name: string; parent?: number | null } }) => {
      const res = await apiClient.patch(endpoints.categoryDetail(payload.id), payload.data);
      return res.data as ApiCategory;
    },
    onSuccess: () => {
      toast({ title: 'تم التحديث', description: 'تم تعديل الفئة بنجاح' });
      setCategoryFormOpen(false);
      setCategoryForm({ name: '', parent: '' });
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-options'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر تعديل الفئة';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await apiClient.delete(endpoints.categoryDetail(id));
    },
    onSuccess: () => {
      toast({ title: 'تم الحذف', description: 'تم حذف الفئة' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-options'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.response?.data?.error || 'تعذر حذف الفئة';
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
    },
  });

  const parentOptions = useMemo(() => {
    const optionsMap = new Map<number, string>();
    optionSource.forEach((category) => optionsMap.set(category.id, category.name));
    list.forEach((category) => optionsMap.set(category.id, category.name));
    return Array.from(optionsMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ id, name }));
  }, [optionSource, list]);

  const parentName = (parentId?: number | null) => {
    if (!parentId) return '-';
    return parentLookup.get(parentId) || `#${parentId}`;
  };

  const isDeleting = deleteCategoryMutation.isPending;
  const deletingId = deleteCategoryMutation.variables?.id as number | undefined;

  const handleDelete = async (category: ApiCategory) => {
    try {
      const res = await apiClient.get(endpoints.products, { params: { category: category.id } });
      const normalized = normalizeListResponse<any>(res.data);
      if ((normalized.count ?? normalized.results.length) > 0) {
        toast({ title: 'غير ممكن', description: 'لا يمكن حذف الفئة لوجود منتجات مرتبطة بها', variant: 'destructive' });
        return;
      }
      deleteCategoryMutation.mutate({ id: category.id });
    } catch (e: any) {
      toast({ title: 'خطأ', description: 'تعذر التحقق من المنتجات المرتبطة', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الفئات</h1>
          <p className="text-muted-foreground mt-1">إدارة فئات المنتجات</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            setCategoryForm({ name: '', parent: '' });
            setEditingCategoryId(null);
            setCategoryFormOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4" />
          إضافة فئة جديدة
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="البحث في الفئات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<TagIcon className="h-4 w-4" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setEffectiveSearch(searchTerm.trim());
                refetch();
              }}
            >
              بحث
            </Button>
            {/* تمت إزالة الترتيب بناءً على الطلب */}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">اسم الفئة</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الفئة الأب</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-foreground">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                <tr>
                  <td className="py-6 px-6 text-muted-foreground" colSpan={3}>
                    ...جاري التحميل
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td className="py-6 px-6 text-destructive" colSpan={3}>
                    تعذر جلب البيانات
                  </td>
                </tr>
              ) : sortedList.length === 0 ? (
                <tr>
                  <td className="py-6 px-6 text-muted-foreground" colSpan={3}>
                    لا توجد فئات مسجلة
                  </td>
                </tr>
              ) : (
                sortedList.map((category, index) => (
                  <tr
                    key={category.id}
                    className={`border-b border-border ${index % 2 === 0 ? 'bg-background' : 'bg-card'}`}
                  >
                    <td className="py-4 px-6 text-foreground font-medium">{category.name}</td>
                    <td className="py-4 px-6 text-muted-foreground">{parentName(category.parent)}</td>
                    <td className="py-4 px-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCategoryForm({ name: category.name, parent: category.parent ? String(category.parent) : '' });
                          setEditingCategoryId(category.id);
                          setCategoryFormOpen(true);
                          // For future: implement update via PATCH
                        }}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(category)}
                        disabled={isDeleting && deletingId === category.id}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">الإجمالي: {total.toLocaleString()} فئة</div>
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

      <Dialog
        open={categoryFormOpen}
        onOpenChange={(open) => {
          setCategoryFormOpen(open);
          if (!open) {
            setCategoryForm({ name: '', parent: '' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="اسم الفئة"
              placeholder="أدخل اسم الفئة"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">الفئة الأب (اختياري)</label>
              <Select
                value={categoryForm.parent || 'none'}
                onValueChange={(value) => setCategoryForm((prev) => ({ ...prev, parent: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة الأب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون فئة أب</SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button className='mx-2' variant="outline" onClick={() => { setCategoryFormOpen(false); setCategoryForm({ name: '', parent: '' }); }}>
              إلغاء
            </Button>
            <Button className='mx-2'
              onClick={() => {
                const name = categoryForm.name.trim();
                if (!name) return;
                const payload: { name: string; parent?: number | null } = { name };
                if (categoryForm.parent) payload.parent = Number(categoryForm.parent);
                if (editingCategoryId) {
                  updateCategoryMutation.mutate({ id: editingCategoryId, data: payload });
                } else {
                  createCategoryMutation.mutate(payload);
                }
              }}
              disabled={!categoryForm.name.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
