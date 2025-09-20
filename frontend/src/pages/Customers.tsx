import React, { useState } from 'react';
import { Button } from '../components/ui/custom-button';
import { Input } from '../components/ui/custom-input';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  balance: number;
  status: 'active' | 'archived';
}

// Mock data
const mockCustomers: Customer[] = [
  { id: 1, name: 'أحمد محمد علي', phone: '+966501234567', email: 'ahmed@example.com', address: 'الرياض، حي الملك فهد', balance: 1250.50, status: 'active' },
  { id: 2, name: 'فاطمة الزهراني', phone: '+966502234567', email: 'fatima@example.com', address: 'جدة، حي الروضة', balance: -320.00, status: 'active' },
  { id: 3, name: 'محمد العتيبي', phone: '+966503234567', balance: 0, status: 'active' },
  { id: 4, name: 'سارة القحطاني', phone: '+966504234567', email: 'sara@example.com', address: 'الدمام، حي الشاطئ', balance: 890.25, status: 'active' },
  { id: 5, name: 'عبدالله النجار', phone: '+966505234567', balance: 2150.75, status: 'active' },
];

export const Customers: React.FC = () => {
  const [customers] = useState<Customer[]>(mockCustomers);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-success';
    if (balance < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">العملاء</h1>
          <p className="text-muted-foreground mt-1">إدارة قاعدة بيانات العملاء</p>
        </div>
        <Button variant="hero" className="gap-2">
          <PlusIcon className="h-4 w-4" />
          إضافة عميل جديد
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="البحث في العملاء..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline">ترشيح حسب الرصيد</Button>
            <Button variant="outline">ترتيب</Button>
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
            {/* Customer Info */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">{customer.name}</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  customer.status === 'active' 
                    ? 'text-success bg-success-light' 
                    : 'text-muted-foreground bg-muted'
                }`}>
                  {customer.status === 'active' ? 'نشط' : 'مؤرشف'}
                </span>
              </div>
              <Button variant="ghost" size="sm">
                <PencilIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PhoneIcon className="h-4 w-4" />
                <span className="ltr">{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <EnvelopeIcon className="h-4 w-4" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div className="text-sm text-muted-foreground">
                  <span>{customer.address}</span>
                </div>
              )}
            </div>

            {/* Balance */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">الرصيد:</span>
                <span className={`text-lg font-bold ${getBalanceColor(customer.balance)}`}>
                  {customer.balance.toLocaleString()} ر.س
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <MagnifyingGlassIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">لم يتم العثور على عملاء</h3>
          <p className="text-muted-foreground">جرب تغيير كلمات البحث أو المرشحات</p>
        </div>
      )}
    </div>
  );
};