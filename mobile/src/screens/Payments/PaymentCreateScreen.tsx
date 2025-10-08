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

  const submit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      showError('يرجى إدخال مبلغ صحيح');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(endpoints.payments, {
        customer: customerId,
        amount: mode === 'withdraw' ? -Math.abs(value) : Math.abs(value),
        payment_method: 'cash',
      });
      showSuccess(mode === 'withdraw' ? 'تم سحب الدفعة بنجاح' : 'تم إضافة الدفعة بنجاح');
      // تحديث قائمة المدفوعات
      queryClient.invalidateQueries({ queryKey: ['payments'] });
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
      <View style={styles.header}> 
        <Text style={[styles.title, { color: theme.textPrimary }]}>{mode === 'withdraw' ? 'سحب دفعة' : 'إضافة دفعة'}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{customerName}</Text>
      </View>
      <View style={styles.form}> 
        <Text style={[styles.label, { color: theme.textMuted }]}>المبلغ</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="0.00"
          placeholderTextColor={theme.textMuted}
        />
        <SoftButton title="حفظ" onPress={submit} loading={loading} disabled={loading} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: { gap: 6, alignItems: 'flex-start' },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'right' },
  subtitle: { fontSize: 14, textAlign: 'right' },
  form: { gap: 12 },
  label: { textAlign: 'right' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, textAlign: 'right' },
});


