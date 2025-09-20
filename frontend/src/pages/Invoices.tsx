import React, { useState } from 'react';
import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  DocumentTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Invoice {
  id: number;
  number: string;
  customer: string;
  amount: number;
  status: 'draft' | 'confirmed' | 'paid' | 'cancelled';
  date: string;
  items: number;
}

// Mock data
const mockInvoices: Invoice[] = [
  { id: 1, number: 'INV-2024-001', customer: 'أحمد محمد علي', amount: 2450.50, status: 'confirmed', date: '2024-01-15', items: 3 },
  { id: 2, number: 'INV-2024-002', customer: 'فاطمة الزهراني', amount: 890.25, status: 'paid', date: '2024-01-14', items: 2 },
  { id: 3, number: 'INV-2024-003', customer: 'محمد العتيبي', amount: 1200.00, status: 'draft', date: '2024-01-13', items: 1 },
  { id: 4, number: 'INV-2024-004', customer: 'سارة القحطاني', amount: 3200.75, status: 'confirmed', date: '2024-01-12', items: 5 },
  { id: 5, number: 'INV-2024-005', customer: 'عبدالله النجار', amount: 750.00, status: 'cancelled', date: '2024-01-11', items: 2 },
];

export const Invoices: React.FC = () => {
  const [invoices] = useState<Invoice[]>(mockInvoices);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: Invoice['status']) => {
    const configs = {
      draft: { text: 'مسودة', color: 'text-warning bg-warning-light', icon: ClockIcon },
      confirmed: { text: 'مؤكدة', color: 'text-primary bg-primary-light', icon: CheckCircleIcon },
      paid: { text: 'مدفوعة', color: 'text-success bg-success-light', icon: CheckCircleIcon },
      cancelled: { text: 'ملغاة', color: 'text-destructive bg-destructive-light', icon: XCircleIcon },
    };
    return configs[status];
  };

  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الفواتير</h1>
          <p className="text-muted-foreground mt-1">إدارة فواتير المبيعات</p>
        </div>
        <Button variant="hero" className="gap-2">
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
              <p className="text-xl font-bold text-foreground">{filteredInvoices.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-light rounded-full">
              <CheckCircleIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">مدفوعة</p>
              <p className="text-xl font-bold text-foreground">
                {filteredInvoices.filter(i => i.status === 'paid').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-light rounded-full">
              <ClockIcon className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">معلقة</p>
              <p className="text-xl font-bold text-foreground">
                {filteredInvoices.filter(i => i.status === 'confirmed').length}
              </p>
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
              <p className="text-xl font-bold text-foreground">
                {totalAmount.toLocaleString()}
              </p>
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-md border border-input-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">جميع الحالات</option>
              <option value="draft">مسودة</option>
              <option value="confirmed">مؤكدة</option>
              <option value="paid">مدفوعة</option>
              <option value="cancelled">ملغاة</option>
            </select>
            <Button variant="outline">
              <CalendarIcon className="h-4 w-4 ml-2" />
              التاريخ
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
              {filteredInvoices.map((invoice, index) => {
                const statusConfig = getStatusConfig(invoice.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <tr 
                    key={invoice.id} 
                    className={`border-b border-border hover:bg-card-hover transition-colors ${
                      index % 2 === 0 ? 'bg-background' : 'bg-card'
                    }`}
                  >
                    <td className="py-4 px-6">
                      <span className="font-mono font-medium text-foreground">{invoice.number}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-foreground">{invoice.customer}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-foreground">
                        {invoice.amount.toLocaleString()} ر.س
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-muted-foreground">{invoice.items} عنصر</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-muted-foreground">
                        {new Date(invoice.date).toLocaleDateString('ar')}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.text}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Button variant="ghost" size="sm">
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <DocumentTextIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">لم يتم العثور على فواتير</h3>
            <p className="text-muted-foreground">جرب تغيير كلمات البحث أو المرشحات</p>
          </div>
        )}
      </div>
    </div>
  );
};