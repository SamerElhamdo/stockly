import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { ScreenContainer, SectionHeader, SoftBadge, SoftCard, Button } from '@/components';
import { useCompany, useToast } from '@/context';
import { apiClient, endpoints } from '@/services/api-client';
import { useTheme } from '@/theme';
import { mergeDateTime } from '@/utils/format';
import { RootStackParamList } from '@/navigation/types';

interface InvoiceDetail {
  id: number;
  invoice_number?: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: Array<{
    id: number;
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

type Props = NativeStackScreenProps<RootStackParamList, 'PrintInvoice'>;

export const PrintInvoiceScreen: React.FC<Props> = ({ route }) => {
  const { id } = route.params;
  const { theme } = useTheme();
  const { formatAmount, profile } = useCompany();
  const { showSuccess, showError } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ['invoice-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.invoiceDetail(id));
      return res.data as InvoiceDetail;
    },
  });

  const generatePDF = async () => {
    if (!data) return;
    
    setIsGenerating(true);
    try {
      const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Helvetica', 'Arial', sans-serif; 
              padding: 24px; 
              background: #fff;
              color: #000;
              direction: rtl;
            }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              margin-bottom: 32px;
              gap: 24px;
            }
            .company-section {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            .logo-box {
              width: 64px;
              height: 64px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background: #f9fafb;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .logo-placeholder {
              font-size: 10px;
              color: #9ca3af;
            }
            .company-info { text-align: right; }
            .company-name { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 4px;
              color: #111827;
            }
            .company-details { 
              font-size: 12px; 
              color: #6b7280; 
              line-height: 1.6; 
            }
            .invoice-info { text-align: left; }
            .invoice-title { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 4px;
              color: #111827;
            }
            .invoice-number { 
              font-size: 14px; 
              color: #6b7280; 
            }
            .invoice-date {
              font-size: 14px;
              color: #111827;
              margin-top: 2px;
            }
            .customer-name {
              font-size: 14px;
              color: #111827;
              font-weight: 500;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              border-top: 1px solid #e5e7eb;
              border-bottom: 1px solid #e5e7eb;
            }
            thead { background: #f9fafb; }
            th { 
              padding: 8px 12px; 
              text-align: right;
              font-weight: 600;
              font-size: 12px;
              color: #111827;
            }
            td { 
              padding: 8px 12px; 
              text-align: right;
              border-bottom: 1px solid #e5e7eb;
              font-size: 12px;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }
            .item-name { 
              font-weight: 500;
              color: #111827;
            }
            .item-qty, .item-price {
              color: #6b7280;
            }
            .item-total {
              font-weight: 500;
              color: #111827;
            }
            tfoot td {
              border-top: 1px solid #e5e7eb;
              border-bottom: none;
            }
            .total-label { 
              font-weight: 600;
              font-size: 14px;
              color: #111827;
            }
            .total-amount { 
              font-weight: bold;
              font-size: 14px;
              color: #111827;
            }
            .policies-section { 
              margin-top: 32px;
              padding-top: 16px;
            }
            .policies-title {
              font-size: 14px;
              font-weight: 600;
              color: #111827;
              margin-bottom: 8px;
            }
            .policy-block {
              margin-bottom: 8px;
            }
            .policy-label {
              font-size: 12px;
              font-weight: 500;
              color: #111827;
              margin-bottom: 2px;
            }
            .policy-text {
              font-size: 12px;
              color: #6b7280;
              white-space: pre-wrap;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-section">
                <div class="logo-box">
                  ${profile?.logo_url ? `<img src="${profile.logo_url}" alt="Logo" />` : '<div class="logo-placeholder">لا شعار</div>'}
                </div>
                <div class="company-info">
                  <div class="company-name">${profile?.company_name || 'فاتورة'}</div>
                  <div class="company-details">
                    ${profile?.company_address ? `<div>${profile.company_address}</div>` : ''}
                    ${profile?.company_phone ? `<div>${profile.company_phone}</div>` : ''}
                  </div>
                </div>
              </div>
              <div class="invoice-info">
                <div class="invoice-title">فاتورة #${data.invoice_number || data.id}</div>
                <div class="invoice-number">${mergeDateTime(data.created_at)}</div>
                <div class="customer-name">${data.customer_name}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>السعر</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map(item => `
                  <tr>
                    <td class="item-name">${item.product_name}</td>
                    <td class="item-qty">${item.quantity}</td>
                    <td class="item-price">${formatAmount(item.price)}</td>
                    <td class="item-total">${formatAmount(item.quantity * item.price)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="total-label">المبلغ الإجمالي</td>
                  <td class="total-amount">${formatAmount(data.total_amount)}</td>
                </tr>
              </tfoot>
            </table>

            ${profile?.return_policy || profile?.payment_policy ? `
            <div class="policies-section">
              <div class="policies-title">الملاحظات والسياسات</div>
              ${profile?.return_policy ? `
              <div class="policy-block">
                <div class="policy-label">سياسة الإرجاع</div>
                <div class="policy-text">${profile.return_policy.trim() || 'لا توجد سياسة إرجاع محددة.'}</div>
              </div>
              ` : ''}
              ${profile?.payment_policy ? `
              <div class="policy-block">
                <div class="policy-label">سياسة الدفع</div>
                <div class="policy-text">${profile.payment_policy.trim() || 'لا توجد سياسة دفع محددة.'}</div>
              </div>
              ` : ''}
            </div>
            ` : ''}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      showSuccess('✓ تم إنشاء PDF');
      return uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      showError('فشل إنشاء PDF');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    const uri = await generatePDF();
    if (uri) {
      await Print.printAsync({ uri });
    }
  };

  const handleShare = async () => {
    const uri = await generatePDF();
    if (uri) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `فاتورة #${data?.id}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        showError('المشاركة غير متاحة على هذا الجهاز');
      }
    }
  };

  const handleSave = async () => {
    const uri = await generatePDF();
    if (uri && data) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `حفظ فاتورة #${data.id}`,
          UTI: 'com.adobe.pdf',
        });
        showSuccess('يمكنك الآن حفظ الفاتورة من خيارات المشاركة');
      } else {
        showError('المشاركة غير متاحة على هذا الجهاز');
      }
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.softPalette.primary.main} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>تعذر تحميل بيانات الفاتورة</Text>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.contentWrapper}>
        <SectionHeader title={`معاينة فاتورة #${data.invoice_number || data.id}`} subtitle={mergeDateTime(data.created_at)} />

        <SoftCard style={styles.metaCard}>
        <Text style={[styles.customerName, { color: theme.textPrimary }]}>{data.customer_name}</Text>
        <SoftBadge label={data.status === 'confirmed' ? 'مؤكدة' : 'مسودة'} variant={data.status === 'confirmed' ? 'success' : 'info'} />
        <Text style={[styles.amount, { color: theme.textPrimary }]}>{formatAmount(data.total_amount)}</Text>
      </SoftCard>

      <SoftCard style={styles.itemsCard}>
        <SectionHeader title="بنود الفاتورة" />
        {data.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View>
              <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.product_name}</Text>
              <Text style={{ color: theme.textMuted }}>الكمية: {item.quantity}</Text>
            </View>
            <Text style={[styles.itemPrice, { color: theme.textPrimary }]}>{formatAmount(item.price)}</Text>
          </View>
        ))}
      </SoftCard>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Button
          title="طباعة PDF"
          onPress={handlePrint}
          loading={isGenerating}
          disabled={isGenerating}
        />
        <View style={styles.secondaryActions}>
          <Button
            title="مشاركة"
            variant="secondary"
            onPress={handleShare}
            loading={isGenerating}
            disabled={isGenerating}
          />
          <Button
            title="حفظ"
            variant="secondary"
            onPress={handleSave}
            loading={isGenerating}
            disabled={isGenerating}
          />
        </View>
      </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    gap: 20,
    paddingTop: 12,
  },
  metaCard: {
    gap: 12,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
  },
  itemsCard: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 12,
    marginTop: 16,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
