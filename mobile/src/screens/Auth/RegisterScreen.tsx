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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { showError, showSuccess, showInfo } = useToast();
  
  // Form states
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  
  // OTP states
  const [registerOtp, setRegisterOtp] = useState('');
  const [registerOtpSession, setRegisterOtpSession] = useState<string | null>(null);
  const [registerOtpVerified, setRegisterOtpVerified] = useState(false);
  
  // Loading states
  const [isSendingRegisterOtp, setIsSendingRegisterOtp] = useState(false);
  const [isVerifyingRegisterOtp, setIsVerifyingRegisterOtp] = useState(false);
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);
  
  const registerPasswordMismatch = useMemo(
    () => adminPassword.length > 0 && adminPasswordConfirm.length > 0 && adminPassword !== adminPasswordConfirm,
    [adminPassword, adminPasswordConfirm],
  );

  const handleSendOtp = async () => {
    if (!companyPhone.trim()) return;
    setIsSendingRegisterOtp(true);
    try {
      const res = await apiClient.post(endpoints.sendOtp, { 
        phone: companyPhone, 
        verification_type: 'company_registration' 
      });
      const sessionId = (res.data as any)?.session_id ?? null;
      setRegisterOtpSession(sessionId);
      setRegisterOtp('');
      setRegisterOtpVerified(false);
      showSuccess('تم إرسال رمز التحقق عبر واتساب');
    } catch (err: any) {
      const errorCode = err?.response?.status || 'UNKNOWN';
      const errorMsg = err?.response?.data?.detail || 'فشل إرسال الرمز';
      showError(`[${errorCode}] ${errorMsg}`);
    } finally {
      setIsSendingRegisterOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!registerOtpSession || registerOtp.length !== 6) return;
    setIsVerifyingRegisterOtp(true);
    try {
      await apiClient.post(endpoints.verifyOtp, { 
        session_id: registerOtpSession, 
        otp_code: registerOtp 
      });
      setRegisterOtpVerified(true);
      showSuccess('تم التحقق من الرقم بنجاح');
    } catch (err: any) {
      const errorCode = err?.response?.status || 'UNKNOWN';
      const errorMsg = err?.response?.data?.detail || 'رمز التحقق غير صحيح';
      showError(`[${errorCode}] ${errorMsg}`);
    } finally {
      setIsVerifyingRegisterOtp(false);
    }
  };

  const handleRegister = async () => {
    if (registerPasswordMismatch || !registerOtpSession || !registerOtpVerified) return;
    setIsRegisterSubmitting(true);
    try {
      const payload = {
        company: {
          name: companyName.trim(),
          code: companyCode.trim(),
          email: companyEmail.trim(),
          phone: companyPhone.trim(),
          address: companyAddress.trim(),
        },
        admin: { username: adminUsername.trim(), password: adminPassword },
        otp_session_id: registerOtpSession,
      };
      await apiClient.post(endpoints.registerCompany, payload);
      showSuccess('تم تسجيل الشركة بنجاح، يمكنك تسجيل الدخول الآن');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (err: any) {
      const errorCode = err?.response?.status || 'UNKNOWN';
      const errorMsg = err?.response?.data?.detail || 'فشل تسجيل الشركة';
      showError(`[${errorCode}] ${errorMsg}`);
    } finally {
      setIsRegisterSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <StatusBar style={theme.name === 'light' ? 'dark' : 'light'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <View style={styles.logoWrapper}>
          <View style={[styles.logoCard, { backgroundColor: theme.softPalette.success?.light || '#e8f5e8' }]}>
            <Image source={logo} resizeMode="cover" style={styles.logo} />
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>تسجيل شركة جديدة</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>أدخل بيانات شركتك لإنشاء حساب جديد</Text>
        </View>

        {/* Form Card */}
        <SoftCard style={styles.formCard}>
          <View style={styles.form}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>معلومات الشركة</Text>
              <Input 
                label="اسم الشركة" 
                value={companyName} 
                onChangeText={setCompanyName} 
                placeholder="مثال: شركة النجاح" 
              />
              <Input 
                label="رمز الشركة" 
                value={companyCode} 
                onChangeText={setCompanyCode} 
                placeholder="رمز مميز للشركة" 
              />
              <Input 
                label="البريد الإلكتروني" 
                value={companyEmail} 
                onChangeText={setCompanyEmail} 
                placeholder="example@company.com" 
                autoCapitalize="none" 
                keyboardType="email-address" 
              />
              <Input 
                label="رقم واتساب الشركة" 
                value={companyPhone} 
                onChangeText={(t) => {
                  setCompanyPhone(t);
                  setRegisterOtpSession(null);
                  setRegisterOtp('');
                  setRegisterOtpVerified(false);
                }} 
                placeholder="9665XXXXXXXX" 
                keyboardType="phone-pad" 
              />
              <Input 
                label="عنوان الشركة (اختياري)" 
                value={companyAddress} 
                onChangeText={setCompanyAddress} 
                placeholder="العنوان التفصيلي" 
              />
            </View>

            {/* OTP Verification */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>التحقق من الرقم</Text>
              <Button
                title={isSendingRegisterOtp ? 'جاري الإرسال...' : 'إرسال رمز التحقق عبر واتساب'}
                variant="secondary"
                onPress={handleSendOtp}
                disabled={!companyPhone.trim()}
              />
              
              {registerOtpSession && (
                <View style={styles.otpSection}>
                  <Input 
                    label="رمز التحقق" 
                    value={registerOtp} 
                    onChangeText={setRegisterOtp} 
                    placeholder="6 أرقام" 
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Button
                    title={isVerifyingRegisterOtp ? 'جاري التحقق...' : 'تأكيد الرمز'}
                    variant="secondary"
                    onPress={handleVerifyOtp}
                    disabled={registerOtp.length !== 6}
                  />
                  {registerOtpVerified && (
                    <SoftBadge label="✓ الرقم موثق" variant="success" />
                  )}
                </View>
              )}
            </View>

            {/* Admin Account */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>حساب المدير</Text>
              <Input 
                label="اسم المستخدم للمدير" 
                value={adminUsername} 
                onChangeText={setAdminUsername} 
                placeholder="اختر اسم مستخدم" 
                autoCapitalize="none" 
              />
              <Input 
                label="كلمة مرور المدير" 
                value={adminPassword} 
                onChangeText={setAdminPassword} 
                placeholder="كلمة مرور قوية" 
                secureTextEntry 
                secureToggle 
              />
              <Input 
                label="تأكيد كلمة المرور" 
                value={adminPasswordConfirm} 
                onChangeText={setAdminPasswordConfirm} 
                placeholder="أعد إدخال كلمة المرور" 
                secureTextEntry 
                secureToggle 
                error={registerPasswordMismatch ? 'كلمات المرور غير متطابقة' : undefined} 
              />
            </View>

            <Button
              title="إتمام التسجيل"
              disabled={registerPasswordMismatch || !registerOtpSession || !registerOtpVerified}
              loading={isRegisterSubmitting}
              onPress={handleRegister}
            />
          </View>
        </SoftCard>

        {/* Login Link */}
        <View style={styles.loginSection}>
          <Text style={[styles.loginQuestion, { color: theme.textMuted }]}>
            لديك حساب بالفعل؟
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
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.15)',
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

