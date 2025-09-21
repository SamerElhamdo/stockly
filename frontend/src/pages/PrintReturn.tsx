import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient, endpoints } from '../lib/api';
import { useCompany } from '../contexts/CompanyContext';
import { Amount } from '../components/Amount';
import { Button } from '../components/ui/custom-button';

interface ApiReturnItem {
  id: number;
  product_name: string;
  qty_returned: number | string;
  unit_price: number | string;
  line_total: number | string;
}

interface ApiReturn {
  id: number;
  return_number: string;
  invoice_id: number;
  customer_name: string;
  total_amount: number | string;
  return_date: string;
  items: ApiReturnItem[];
}

export const PrintReturn: React.FC = () => {
  const params = useParams();
  const id = Number(params.id);
  const { profile } = useCompany();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['print-return', id],
    queryFn: async () => {
      const res = await apiClient.get(`${endpoints.returns}${id}/`);
      return res.data as ApiReturn;
    },
    enabled: Number.isFinite(id),
  });

  const handlePrint = () => window.print();

  if (!Number.isFinite(id)) return <div className="p-6 text-destructive">رقم مرتجع غير صالح</div>;
  if (isLoading) return <div className="p-6 text-muted-foreground">...جاري التحميل</div>;
  if (isError || !data) return <div className="p-6 text-destructive">تعذر تحميل المرتجع</div>;

  const ret = data;

  return (
    <div className="p-4">
      <div className="invoice-print-area space-y-5 print:space-y-2">
        <div className="flex items-center justify-between gap-6 print:px-6 print:pt-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden print:h-16 print:w-16">
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt="شعار الشركة" className="h-full w-full object-contain" />
              ) : (
                <div className="text-xs text-muted-foreground">لا شعار</div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{profile?.company_name || 'مرتجع'}</h3>
              <p className="text-xs text-muted-foreground">{profile?.company_address || ''}</p>
              <p className="text-xs text-muted-foreground">{profile?.company_phone || ''}</p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-xl font-bold text-foreground">مرتجع #{ret.return_number}</h3>
            <p className="text-sm text-muted-foreground">{new Date(ret.return_date).toLocaleString('ar')}</p>
            <p className="text-sm text-foreground">{ret.customer_name}</p>
            <p className="text-xs text-muted-foreground">مرجع الفاتورة: #{ret.invoice_id}</p>
          </div>
        </div>

        <div className="border-y border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-right py-2 px-3">المنتج</th>
                <th className="text-right py-2 px-3">الكمية</th>
                <th className="text-right py-2 px-3">سعر الوحدة</th>
                <th className="text-right py-2 px-3">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {(ret.items || []).map((it) => (
                <tr key={it.id} className="border-b border-border last:border-b-0">
                  <td className="py-2 px-3">{it.product_name}</td>
                  <td className="py-2 px-3 text-muted-foreground">{Number(it.qty_returned || 0)}</td>
                  <td className="py-2 px-3 text-muted-foreground"><Amount value={Number(it.unit_price || 0)} digits={2} /></td>
                  <td className="py-2 px-3 font-medium text-foreground"><Amount value={Number(it.line_total || 0)} digits={2} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-2 px-3" colSpan={3}><span className="text-sm font-semibold text-foreground">المبلغ الإجمالي</span></td>
                <td className="py-2 px-3 font-bold text-foreground"><Amount value={Number(ret.total_amount || 0)} digits={2} /></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="print:px-6 print:pb-6 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">الملاحظات والسياسات</h4>
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">سياسة الإرجاع</p>
            <p className="text-xs whitespace-pre-wrap text-muted-foreground">{profile?.return_policy?.trim() || 'لا توجد سياسة إرجاع محددة.'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">سياسة الدفع</p>
            <p className="text-xs whitespace-pre-wrap text-muted-foreground">{profile?.payment_policy?.trim() || 'لا توجد سياسة دفع محددة.'}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end print:hidden">
        <Button onClick={handlePrint}>طباعة</Button>
      </div>
    </div>
  );
};

export default PrintReturn;


