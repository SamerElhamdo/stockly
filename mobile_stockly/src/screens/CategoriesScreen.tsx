import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  ActivityIndicator,
  Appbar,
  FAB,
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../config/api';

interface Category {
  id: number;
  name: string;
  parent_name?: string;
  products_count?: number;
  created_at: string;
}

export default function CategoriesScreen({ navigation }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await apiRequest('/api/categories/', {}, token!);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل الفئات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الفئة');
      return;
    }

    try {
      await apiRequest('/api/categories/add/', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName.trim() }),
      }, token!);

      setAddDialogVisible(false);
      setNewCategoryName('');
      loadCategories();
      Alert.alert('نجح', 'تم إضافة الفئة بنجاح');
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('خطأ', 'حدث خطأ في إضافة الفئة');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    Alert.alert(
      'حذف الفئة',
      'هل أنت متأكد من حذف هذه الفئة؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/api/categories/${categoryId}/`, {
                method: 'DELETE',
              }, token!);

              loadCategories();
              Alert.alert('نجح', 'تم حذف الفئة بنجاح');
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('خطأ', 'حدث خطأ في حذف الفئة');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>جاري تحميل الفئات...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="إدارة الفئات" />
      </Appbar.Header>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {categories.length > 0 ? (
          categories.map((category) => (
            <Card key={category.id} style={styles.categoryCard}>
              <Card.Content>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryInfo}>
                    <View style={styles.categoryIcon}>
                      <Ionicons name="pricetag" size={24} color="#2563eb" />
                    </View>
                    <View style={styles.categoryDetails}>
                      <Title style={styles.categoryName}>{category.name}</Title>
                      <Paragraph style={styles.categoryParent}>
                        {category.parent_name || 'فئة رئيسية'}
                      </Paragraph>
                    </View>
                  </View>
                  <View style={styles.categoryActions}>
                    <Button
                      onPress={() => {
                        Alert.alert('قريباً', 'تعديل الفئة قيد التطوير');
                      }}
                      style={styles.actionButton}
                    >
                      <Ionicons name="pencil" size={16} color="#f59e0b" />
                    </Button>
                    <Button
                      onPress={() => handleDeleteCategory(category.id)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash" size={16} color="#ef4444" />
                    </Button>
                  </View>
                </View>

                <View style={styles.categoryStats}>
                  <View style={styles.statItem}>
                    <Paragraph style={styles.statLabel}>المنتجات</Paragraph>
                    <Paragraph style={styles.statValue}>
                      {category.products_count || 0}
                    </Paragraph>
                  </View>
                  <View style={styles.statItem}>
                    <Paragraph style={styles.statLabel}>تم الإنشاء</Paragraph>
                    <Paragraph style={styles.statValue}>
                      {new Date(category.created_at).toLocaleDateString('ar-SA')}
                    </Paragraph>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <View style={styles.emptyContainer}>
                <Ionicons name="pricetags-outline" size={64} color="#ccc" />
                <Title style={styles.emptyTitle}>لا توجد فئات</Title>
                <Paragraph style={styles.emptyText}>
                  لم يتم إضافة أي فئات بعد
                </Paragraph>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setAddDialogVisible(true)}
      />

      <Portal>
        <Dialog visible={addDialogVisible} onDismiss={() => setAddDialogVisible(false)}>
          <Dialog.Title>إضافة فئة جديدة</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="اسم الفئة *"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              mode="outlined"
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)}>إلغاء</Button>
            <Button onPress={handleAddCategory}>إضافة</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  categoryCard: {
    marginBottom: 12,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    marginRight: 12,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    marginBottom: 4,
  },
  categoryParent: {
    fontSize: 14,
    color: '#666',
  },
  categoryActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 8,
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  emptyCard: {
    marginTop: 50,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    marginTop: 16,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  dialogInput: {
    marginBottom: 12,
  },
});