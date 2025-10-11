import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import { ScreenContainer, SoftButton } from '@/components';
import { useToast } from '@/context';
import { useTheme } from '@/theme';
import { SalesStackParamList } from '@/navigation/types';
import { apiClient, endpoints } from '@/services/api-client';

type Props = NativeStackScreenProps<SalesStackParamList, 'PaymentCreate'>;

export const PaymentCreateScreen: React.FC<Props> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const { customerId, customerName, mode } = route.params;
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // منع إدخال الإشارة السالبة - النظام يحددها تلقائياً
  const handleAmountChange = (text: string) => {
    // إزالة أي إشارات سالبة أو موجبة
    const cleanText = text.replace(/[-+]/g, '');
    setAmount(cleanText);
  };

  const submit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      showError('يرجى إدخال مبلغ صحيح');
      return;
    }

    setLoading(true);
    try {
      // المنطق الصحيح (balance = invoiced - paid - returns):
      // - إضافة دفعة: موجب (+) = العميل دفع لنا = يزيد paid = يقلل "له علينا"
      // - سحب دفعة: سالب (-) = سحبنا منه = يقلل paid = يزيد "له علينا"
      const finalAmount = mode === 'withdraw' ? -Math.abs(value) : Math.abs(value);
      
      console.log('Submitting payment:', {
        customer: customerId,
        amount: finalAmount,
        mode,
        originalValue: value,
        explanation: mode === 'withdraw' 
          ? 'سحب (-) = يقلل paid = يزيد balance (له علينا)'
          : 'دفعة (+) = يزيد paid = يقلل balance (له علينا)'
      });

      await apiClient.post(endpoints.payments, {
        customer: customerId,
        amount: finalAmount,
        payment_method: 'cash',
      });
      
      showSuccess(mode === 'withdraw' ? 'تم سحب الدفعة بنجاح' : 'تم إضافة الدفعة بنجاح');
      
      // تحديث قائمة المدفوعات والأرصدة
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['customer-detail'] });
      
      navigation.goBack();
    } catch (error: any) {
      console.log('Payment creation error:', error?.response?.data);
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.message || 
                          'فشل في حفظ الدفعة';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={[
          styles.header, 
          { 
            backgroundColor: mode === 'withdraw' 
              ? theme.softPalette.warning?.light + '30' 
              : theme.softPalette.success?.light + '30',
            borderColor: mode === 'withdraw' 
              ? theme.softPalette.warning?.main 
              : theme.softPalette.success?.main,
          }
        ]}> 
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {mode === 'withdraw' ? 'سحب دفعة' : 'إضافة دفعة'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{customerName}</Text>
          <Text style={[
            styles.hint,
            { 
              color: mode === 'withdraw' 
                ? theme.softPalette.warning?.main 
                : theme.softPalette.success?.main 
            }
          ]}>
            {mode === 'withdraw' 
              ? '⚠️ سيتم خصم المبلغ من رصيد العميل' 
              : '✓ سيتم إضافة المبلغ إلى رصيد العميل'}
          </Text>
        </View>
        
        <View style={styles.form}> 
          <Text style={[styles.label, { color: theme.textMuted }]}>المبلغ</Text>
          <TextInput
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            style={[
              styles.input, 
              { 
                backgroundColor: theme.surface, 
                borderColor: theme.border, 
                color: theme.textPrimary 
              }
            ]}
            placeholder="0.00"
            placeholderTextColor={theme.textMuted}
            autoFocus
          />
          
          <View style={styles.buttonContainer}>
            <SoftButton 
              title={mode === 'withdraw' ? 'تأكيد السحب' : 'تأكيد الإضافة'}
              onPress={submit} 
              loading={loading} 
              disabled={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  header: {
    gap: 8,
    alignItems: 'flex-end',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  hint: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  input: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    textAlign: 'right',
    fontSize: 20,
    fontWeight: '600',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonContainer: {
    marginTop: 8,
  },
});


