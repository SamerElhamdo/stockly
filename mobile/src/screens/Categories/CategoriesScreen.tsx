import React, { useMemo, useState, useEffect } from 'react';
import { RefreshControl, StyleSheet, Text, View, TouchableOpacity, Modal as RNModal } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';

import {
  ScreenContainer,
  SectionHeader,
  SoftBadge,
  Input,
  ListItem,
  Button,
  FloatingActionButton,
  Modal,
  SimpleModal,
  Picker,
  Skeleton,
  SkeletonList,
  LoadingSpinner,
  type PickerOption,
} from '@/components';
import { apiClient, endpoints, normalizeListResponse } from '@/services/api-client';
import { useTheme } from '@/theme';
import { useToast, useConfirmation } from '@/context';

interface CategoryItem {
  id: number;
  name: string;
  parent?: number | null;
  parent_name?: string | null;
}

export const CategoriesScreen: React.FC = () => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const route = useRoute();
  const navigation = useNavigation();
  
  const [search, setSearch] = useState('');
  
  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    parent: '',
  });

  const { data: categories, isLoading, refetch, isRefetching } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.categories, { params: { page: 1 } });
      const normalized = normalizeListResponse<CategoryItem>(res.data);
      return normalized.results;
    },
  });

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories || [];
    const keyword = search.trim().toLowerCase();
    return (categories || []).filter((category) => category.name.toLowerCase().includes(keyword));
  }, [categories, search]);

  const parentOptions: PickerOption[] = useMemo(() => {
    return (categories || []).map((cat) => ({ label: cat.name, value: cat.id }));
  }, [categories]);

  const resetForm = () => {
    setFormData({ name: '', parent: '' });
    setEditingCategory(null);
  };

  // Handle openAdd parameter from navigation
  useEffect(() => {
    if (route?.params?.openAdd) {
      resetForm();
      setFormOpen(true);
      navigation.setParams({ openAdd: undefined });
    }
  }, [route?.params?.openAdd, navigation]);

  const openEditForm = (category: CategoryItem) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      parent: category.parent ? String(category.parent) : '',
    });
    setFormOpen(true);
  };

  const createCategoryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post(endpoints.categories, payload);
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم إضافة الفئة بنجاح');
      setFormOpen(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل إضافة الفئة');
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiClient.patch(endpoints.categoryDetail(id), data);
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم تحديث الفئة بنجاح');
      setFormOpen(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل تحديث الفئة');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(endpoints.categoryDetail(id));
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('نجح', 'تم حذف الفئة بنجاح');
      refetch();
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err?.response?.data?.detail || 'فشل حذف الفئة');
    },
  });

  const handleSave = () => {
    const name = formData.name.trim();
    if (!name) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الفئة');
      return;
    }

    const payload: any = { name };
    if (formData.parent) {
      payload.parent = Number(formData.parent);
    }

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: payload });
    } else {
      createCategoryMutation.mutate(payload);
    }
  };

  const handleDelete = (category: CategoryItem) => {
    Alert.alert('تأكيد الحذف', `هل تريد حذف الفئة "${category.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => deleteCategoryMutation.mutate(category.id),
      },
    ]);
  };

  return (
    <>
      <ScreenContainer
        refreshControl={
          <RefreshControl refreshing={isLoading || isRefetching} onRefresh={refetch} tintColor={theme.textPrimary} />
        }
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>الفئات</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textMuted }]}>إدارة فئات المنتجات</Text>
        </View>

        <View style={styles.summaryRow}>
          <SoftBadge label={`إجمالي الفئات: ${categories?.length || 0}`} variant="info" />
        </View>

        <Input placeholder="ابحث في الفئات..." value={search} onChangeText={setSearch} autoCorrect={false} />

        <View style={styles.listWrapper}>
          <SectionHeader title="قائمة الفئات" subtitle={isLoading ? 'جاري التحميل...' : `${filteredCategories.length} فئة`} />
          
          {isLoading ? (
            <SkeletonList count={4} itemHeight={70} />
          ) : (
            <>
              {(filteredCategories || []).map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onLongPress={() => handleDelete(category)}
                  onPress={() => openEditForm(category)}
                >
                  <ListItem
                    title={category.name}
                    subtitle={category.parent_name ? `الفئة الأب: ${category.parent_name}` : 'فئة رئيسية'}
                    right={!category.parent ? <SoftBadge label="رئيسية" variant="success" /> : undefined}
                  />
                </TouchableOpacity>
              ))}
            </>
          )}
          {!filteredCategories?.length && (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد فئات</Text>
          )}
        </View>

      </ScreenContainer>

      {/* Category Form Modal */}
      <SimpleModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingCategory ? 'تعديل فئة' : 'إضافة فئة'}
        size="small"
      >
        <Input
          label="اسم الفئة *"
          placeholder="اسم الفئة"
          value={formData.name}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
        />
        
        <Input
          label="الفئة الأب (اختياري)"
          placeholder="اكتب اسم الفئة الأب أو اتركه فارغاً"
          value={formData.parent}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, parent: text }))}
        />
        
        <View style={styles.buttonRow}>
          <Button title="إلغاء" variant="secondary" onPress={() => setFormOpen(false)} />
          <Button
            title={editingCategory ? 'تحديث' : 'حفظ'}
            onPress={handleSave}
            loading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
          />
        </View>
      </SimpleModal>
    </>
  );
};

const styles = StyleSheet.create({
  headerBlock: {
    gap: 6,
    alignItems: 'flex-end',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'right',
  },
  pageSubtitle: {
    fontSize: 15,
    textAlign: 'right',
  },
  summaryRow: {
    gap: 6,
  },
  listWrapper: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
