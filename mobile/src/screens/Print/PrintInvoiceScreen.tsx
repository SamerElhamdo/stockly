import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

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
    qty: number;
    price_at_add: number | string;
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
      console.log('📄 بيانات الفاتورة من الباك إند:', res.data);
      console.log('📋 العناصر:', res.data.items);
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
                    <td class="item-qty">${Math.floor(item.qty || 0)}</td>
                    <td class="item-price">${formatAmount(Number(item.price_at_add || 0))}</td>
                    <td class="item-total">${formatAmount(Math.floor(item.qty || 0) * Number(item.price_at_add || 0))}</td>
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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Fixed Action Buttons */}
      <View style={[styles.fixedActions, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { 
              backgroundColor: theme.softPalette.primary.main,
              shadowColor: theme.softPalette.primary.main
            },
            isGenerating ? { opacity: 0.7 } : {}
          ]}
          onPress={handlePrint}
          disabled={isGenerating}
          activeOpacity={0.8}
        >
          {isGenerating ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="print-outline" size={18} color="white" />
          )}
          <Text style={[styles.primaryButtonText, { color: 'white' }]}>
            {isGenerating ? 'جاري الطباعة...' : 'طباعة'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.secondaryButtons}>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { 
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border
              }
            ]}
            onPress={handleShare}
            disabled={isGenerating}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={16} color={theme.textMuted} />
            <Text style={[styles.secondaryButtonText, { color: theme.textPrimary }]}>مشاركة</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { 
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border
              }
            ]}
            onPress={handleSave}
            disabled={isGenerating}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={16} color={theme.textMuted} />
            <Text style={[styles.secondaryButtonText, { color: theme.textPrimary }]}>حفظ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          {/* Simple Header */}
          <View style={[styles.simpleHeader, { backgroundColor: theme.surface }]}>
            <View style={styles.headerContent}>
              <Text style={[styles.invoiceTitle, { color: theme.textPrimary }]}>
                فاتورة #{data.invoice_number || data.id}
              </Text>
              <Text style={[styles.invoiceDate, { color: theme.textMuted }]}>
                {mergeDateTime(data.created_at)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { 
              backgroundColor: data.status === 'confirmed' 
                ? theme.softPalette.success?.light || '#e8f5e8'
                : theme.softPalette.warning?.light || '#fff3cd'
            }]}>
              <Text style={[styles.statusText, { 
                color: data.status === 'confirmed' 
                  ? theme.softPalette.success?.main || '#4caf50'
                  : theme.softPalette.warning?.main || '#ff9800'
              }]}>
                {data.status === 'confirmed' ? 'مؤكدة' : 'مسودة'}
              </Text>
            </View>
          </View>

          {/* Customer & Amount Card */}
          <SoftCard style={[styles.metaCard, { backgroundColor: theme.surface }]}>
            <View style={styles.customerSection}>
              <View style={styles.customerHeader}>
                <Ionicons name="person-outline" size={18} color={theme.softPalette.primary.main} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>العميل</Text>
              </View>
              <Text style={[styles.customerName, { color: theme.textPrimary }]}>{data.customer_name}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.amountSection}>
              <View style={styles.amountHeader}>
                <Ionicons name="cash-outline" size={18} color={theme.softPalette.success?.main || '#4caf50'} />
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>المبلغ الإجمالي</Text>
              </View>
              <View style={[styles.amountCard, { backgroundColor: theme.softPalette.success?.light || '#e8f5e8' }]}>
                <Text style={[styles.amountValue, { color: theme.softPalette.success?.main || '#4caf50' }]}>
                  {formatAmount(data.total_amount)}
                </Text>
                <Text style={[styles.amountCurrency, { color: theme.softPalette.success?.main || '#4caf50' }]}>
                  USD
                </Text>
              </View>
            </View>
          </SoftCard>

          {/* Items Card */}
          <SoftCard style={[styles.itemsCard, { backgroundColor: theme.surface }]}>
            <View style={styles.itemsHeader}>
              <View style={styles.itemsHeaderLeft}>
                <Ionicons name="list-outline" size={18} color={theme.softPalette.primary.main} />
                <Text style={[styles.itemsTitle, { color: theme.textPrimary }]}>بنود الفاتورة</Text>
              </View>
              <SoftBadge label={`${data.items.length} عنصر`} variant="info" />
            </View>
          
            <View style={styles.itemsList}>
              {data.items.map((item, index) => (
                <View key={item.id} style={[styles.itemCard, { 
                  backgroundColor: index % 2 === 0 ? theme.surfaceElevated : theme.surface,
                  borderColor: theme.border
                }]}>
                  <View style={styles.itemMain}>
                    <View style={styles.itemHeader}>
                      <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.product_name}</Text>
                      <Text style={[styles.itemIndex, { color: theme.textMuted }]}>#{index + 1}</Text>
                    </View>
                    
                    <View style={styles.itemDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="layers-outline" size={14} color={theme.textMuted} />
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>الكمية</Text>
                        <View style={[styles.qtyCard, { backgroundColor: theme.softPalette.info?.light || '#e1f5fe' }]}>
                          <Text style={[styles.qtyValue, { color: theme.softPalette.info?.main || '#0288d1' }]}>
                            {Math.floor(item.qty || 0)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Ionicons name="cash-outline" size={14} color={theme.textMuted} />
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>السعر</Text>
                        <View style={[styles.priceCard, { backgroundColor: theme.softPalette.warning?.light || '#fff3cd' }]}>
                          <Text style={[styles.priceValue, { color: theme.softPalette.warning?.main || '#ff9800' }]}>
                            {formatAmount(Number(item.price_at_add || 0))}
                          </Text>
                          <Text style={[styles.priceCurrency, { color: theme.softPalette.warning?.main || '#ff9800' }]}>
                            USD
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.itemTotal}>
                    <View style={[styles.totalCard, { backgroundColor: theme.softPalette.success?.light || '#e8f5e8' }]}>
                      <Text style={[styles.totalValue, { color: theme.softPalette.success?.main || '#4caf50' }]}>
                        {formatAmount(Math.floor(item.qty || 0) * Number(item.price_at_add || 0))}
                      </Text>
                      <Text style={[styles.totalCurrency, { color: theme.softPalette.success?.main || '#4caf50' }]}>
                        USD
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </SoftCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fixed Actions
  fixedActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50, // Safe area for status bar
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Scrollable Content
  scrollContent: {
    flex: 1,
    marginTop: 110, // Space for fixed actions + status bar
  },
  contentWrapper: {
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  // Simple Header
  simpleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerContent: {
    flex: 1,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Meta Card
  metaCard: {
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  customerSection: {
    gap: 8,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 26,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  amountSection: {
    gap: 8,
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    marginLeft: 26,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  amountCurrency: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  // Items Card
  itemsCard: {
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  itemMain: {
    flex: 1,
    gap: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  itemIndex: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.7,
  },
  itemDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 50,
  },
  qtyCard: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(2, 136, 209, 0.2)',
    minWidth: 50,
    alignItems: 'center',
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.2)',
    minWidth: 80,
  },
  priceValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceCurrency: {
    fontSize: 9,
    fontWeight: '500',
    opacity: 0.8,
  },
  itemTotal: {
    alignItems: 'flex-start',
    marginTop: 8,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    minWidth: 90,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalCurrency: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.8,
  },
});
