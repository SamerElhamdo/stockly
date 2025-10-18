import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import logo from '../../../assets/logo.png';

import { ScreenContainer, SoftCard, SoftBadge, Button, Input } from '@/components';
import { useTheme } from '@/theme';
import { useToast } from '@/context';
import { apiClient, endpoints } from '@/services/api-client';
import { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export const ResetPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { showError, showSuccess } = useToast();
  
  // Form states
  const [resetUsername, setResetUsername] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // OTP states
  const [resetOtp, setResetOtp] = useState('');
  const [resetOtpSession, setResetOtpSession] = useState<string | null>(null);
  const [resetOtpVerified, setResetOtpVerified] = useState(false);
  
  // Loading states
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [isVerifyingResetOtp, setIsVerifyingResetOtp] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  
  const resetPasswordMismatch = useMemo(
    () => newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword,
    [newPassword, confirmPassword],
  );

  const handleSendOtp = async () => {
    if (!resetUsername.trim() || !resetPhone.trim()) return;
    setIsSendingResetOtp(true);
    try {
      const res = await apiClient.post(endpoints.sendOtp, { 
        username: resetUsername.trim(), 
        phone: resetPhone, 
        verification_type: 'forgot_password' 
      });
      const sessionId = (res.data as any)?.session_id ?? null;
      setResetOtpSession(sessionId);
      setResetOtp('');
      setResetOtpVerified(false);
      showSuccess('تم إرسال رمز التحقق عبر واتساب');
    } catch (err: any) {
      const errorCode = err?.response?.status || 'UNKNOWN';
      const errorMsg = err?.response?.data?.detail || 'فشل إرسال الرمز';
      showError(`[${errorCode}] ${errorMsg}`);
    } finally {
      setIsSendingResetOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!resetOtpSession || resetOtp.length !== 6) return;
    setIsVerifyingResetOtp(true);
    try {
      await apiClient.post(endpoints.verifyOtp, { 
        session_id: resetOtpSession, 
        otp_code: resetOtp 
      });
      setResetOtpVerified(true);
      showSuccess('تم التحقق من الرقم بنجاح');
    } catch (err: any) {
      const errorCode = err?.response?.status || 'UNKNOWN';
      const errorMsg = err?.response?.data?.detail || 'رمز التحقق غير صحيح';
      showError(`[${errorCode}] ${errorMsg}`);
    } finally {
      setIsVerifyingResetOtp(false);
    }
  };

  const handleResetPassword = async () => {
    if (resetPasswordMismatch || !resetOtpSession || !resetOtpVerified) return;
    setIsResetSubmitting(true);
    try {
      await apiClient.post(endpoints.resetPassword, {
        username: resetUsername.trim(),
        phone: resetPhone.trim(),
        new_password: newPassword,
        otp_session_id: resetOtpSession,
      });
      showSuccess('تم تحديث كلمة المرور بنجاح');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (err: any) {
      const errorCode = err?.response?.status || 'UNKNOWN';
      const errorMsg = err?.response?.data?.detail || 'فشل تحديث كلمة المرور';
      showError(`[${errorCode}] ${errorMsg}`);
    } finally {
      setIsResetSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <StatusBar style={theme.name === 'light' ? 'dark' : 'light'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <View style={styles.logoWrapper}>
          <View style={[styles.logoCard, { backgroundColor: theme.softPalette.warning?.light || '#fff3cd' }]}>
            <Image source={logo} resizeMode="cover" style={styles.logo} />
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>استعادة كلمة المرور</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>أدخل بياناتك لإعادة تعيين كلمة المرور</Text>
        </View>

        {/* Form Card */}
        <SoftCard style={styles.formCard}>
          <View style={styles.form}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>معلومات الحساب</Text>
              <Input 
                label="اسم المستخدم" 
                value={resetUsername} 
                onChangeText={setResetUsername} 
                placeholder="اسم المستخدم" 
                autoCapitalize="none" 
              />
              <Input 
                label="رقم واتساب الحساب" 
                value={resetPhone} 
                onChangeText={(t) => {
                  setResetPhone(t);
                  setResetOtpSession(null);
                  setResetOtp('');
                  setResetOtpVerified(false);
                }} 
                placeholder="9665XXXXXXXX" 
                keyboardType="phone-pad" 
              />
            </View>

            {/* OTP Verification */}
            <View style={styles.section}>
              <Button
                title={isSendingResetOtp ? 'جاري الإرسال...' : 'إرسال رمز التحقق عبر واتساب'}
                variant="secondary"
                onPress={handleSendOtp}
                disabled={!resetUsername.trim() || !resetPhone.trim()}
              />
              
              {resetOtpSession && (
                <View style={styles.otpSection}>
                  <Input 
                    label="رمز التحقق" 
                    value={resetOtp} 
                    onChangeText={setResetOtp} 
                    placeholder="6 أرقام" 
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Button
                    title={isVerifyingResetOtp ? 'جاري التحقق...' : 'تأكيد الرمز'}
                    variant="secondary"
                    onPress={handleVerifyOtp}
                    disabled={resetOtp.length !== 6}
                  />
                  {resetOtpVerified && (
                    <SoftBadge label="✓ الرقم موثق" variant="success" />
                  )}
                </View>
              )}
            </View>

            {/* New Password */}
            {resetOtpVerified && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>كلمة المرور الجديدة</Text>
                <Input 
                  label="كلمة المرور الجديدة" 
                  value={newPassword} 
                  onChangeText={setNewPassword} 
                  placeholder="كلمة مرور قوية" 
                  secureTextEntry 
                  secureToggle 
                />
                <Input 
                  label="تأكيد كلمة المرور" 
                  value={confirmPassword} 
                  onChangeText={setConfirmPassword} 
                  placeholder="أعد إدخال كلمة المرور" 
                  secureTextEntry 
                  secureToggle 
                  error={resetPasswordMismatch ? 'كلمات المرور غير متطابقة' : undefined} 
                />
              </View>
            )}

            <Button
              title="تحديث كلمة المرور"
              disabled={resetPasswordMismatch || !resetOtpSession || !resetOtpVerified}
              loading={isResetSubmitting}
              onPress={handleResetPassword}
            />
          </View>
        </SoftCard>

        {/* Login Link */}
        <View style={styles.loginSection}>
          <Text style={[styles.loginQuestion, { color: theme.textMuted }]}>
            تذكرت كلمة المرور؟
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginLink, { color: theme.softPalette.primary.main }]}>
              سجل الدخول
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logoWrapper: {
    alignItems: 'center',
    gap: 12,
  },
  logoCard: {
    width: 100,
    height: 100,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#ff9800',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.15)',
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  form: {
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  otpSection: {
    gap: 12,
  },
  loginSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  loginQuestion: {
    fontSize: 15,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});

