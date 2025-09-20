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

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'archived';
}

// Mock data
const mockProducts: Product[] = [
  { id: 1, name: 'لابتوب Dell XPS 13', sku: 'LT001', category: 'أجهزة كمبيوتر', price: 4500, stock: 15, status: 'active' },
  { id: 2, name: 'ماوس لاسلكي Logitech', sku: 'MS001', category: 'إكسسوارات', price: 120, stock: 45, status: 'active' },
  { id: 3, name: 'كيبورد ميكانيكي', sku: 'KB001', category: 'إكسسوارات', price: 350, stock: 8, status: 'active' },
  { id: 4, name: 'شاشة Samsung 27"', sku: 'MN001', category: 'شاشات', price: 1200, stock: 22, status: 'active' },
  { id: 5, name: 'سماعات Sony WH-1000XM4', sku: 'HP001', category: 'صوتيات', price: 800, stock: 3, status: 'active' },
];

export const Products: React.FC = () => {
  const [products] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

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
            <Button variant="outline">ترشيح حسب الفئة</Button>
            <Button variant="outline">ترتيب</Button>
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
              {paginatedProducts.map((product, index) => {
                const stockStatus = getStockStatus(product.stock);
                
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
                      <span className="text-sm text-muted-foreground">{product.category}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-foreground">{product.price.toLocaleString()} ر.س</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.stock}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.text}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.status === 'active' 
                          ? 'text-success bg-success-light' 
                          : 'text-muted-foreground bg-muted'
                      }`}>
                        {product.status === 'active' ? 'نشط' : 'مؤرشف'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        {product.status === 'active' ? (
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
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <MagnifyingGlassIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">لم يتم العثور على منتجات</h3>
            <p className="text-muted-foreground">جرب تغيير كلمات البحث أو المرشحات</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              السابق
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};