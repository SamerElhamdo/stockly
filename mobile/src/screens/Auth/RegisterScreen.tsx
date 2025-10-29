import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import logo from '../../../assets/logo.png';

import { ScreenContainer, SoftCard, SoftBadge, Button, Input } from '@/components';
import { useTheme } from '@/theme';
import { useToast } from '@/context';
import { apiClient, endpoints } from '@/services/api-client';
import { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

type Step = 'company' | 'verification' | 'admin';

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { showError, showSuccess } = useToast();
  
  // Current step
  const [currentStep, setCurrentStep] = useState<Step>('company');
  
  // Form states
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
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
  
  // Terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const registerPasswordMismatch = useMemo(
    () => adminPassword.length > 0 && adminPasswordConfirm.length > 0 && adminPassword !== adminPasswordConfirm,
    [adminPassword, adminPasswordConfirm],
  );

  // Get terms URL from environment
  const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || 'https://www.example.com/terms';

  const canProceedFromCompany = useMemo(() => {
    return companyName.trim() && companyCode.trim() && companyPhone.trim();
  }, [companyName, companyCode, companyPhone]);

  const steps: Array<{ key: Step; title: string; icon: string }> = [
    { key: 'company', title: 'معلومات الشركة', icon: 'business-outline' },
    { key: 'verification', title: 'التحقق', icon: 'checkmark-circle-outline' },
    { key: 'admin', title: 'حساب المدير', icon: 'person-outline' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  const handleNextStep = () => {
    if (currentStep === 'company') {
      setCurrentStep('verification');
    } else if (currentStep === 'verification') {
      setCurrentStep('admin');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'verification') {
      setCurrentStep('company');
    } else if (currentStep === 'admin') {
      setCurrentStep('verification');
    }
  };

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
    if (!termsAccepted) {
      showError('يجب الموافقة على الشروط والأحكام أولاً');
      return;
    }
    if (registerPasswordMismatch || !registerOtpSession || !registerOtpVerified) return;
    setIsRegisterSubmitting(true);
    try {
      const payload = {
        company: {
          name: companyName.trim(),
          code: companyCode.trim(),
          email: '',
          phone: companyPhone.trim(),
          address: '',
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

  const renderCompanyInfo = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepDescription, { color: theme.textMuted }]}>
        أدخل المعلومات الأساسية لشركتك
      </Text>
      
      <Input 
        label="اسم الشركة *" 
        value={companyName} 
        onChangeText={setCompanyName} 
        placeholder="مثال: شركة النجاح" 
      />
      <Input 
        label="رمز الشركة *" 
        value={companyCode} 
        onChangeText={setCompanyCode} 
        placeholder="رمز مميز للشركة" 
      />
      <Input 
        label="رقم واتساب الشركة *" 
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
    </View>
  );

  const renderVerification = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepDescription, { color: theme.textMuted }]}>
        سنرسل رمز التحقق عبر واتساب
      </Text>
      
      <Button
        title={isSendingRegisterOtp ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
        variant="secondary"
        onPress={handleSendOtp}
        disabled={!companyPhone.trim() || isSendingRegisterOtp}
      />
      
      {registerOtpSession && (
        <View style={styles.otpSection}>
          <Input 
            label="رمز التحقق (6 أرقام)" 
            value={registerOtp} 
            onChangeText={setRegisterOtp} 
            placeholder="أدخل الرمز المرسل" 
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button
            title={isVerifyingRegisterOtp ? 'جاري التحقق...' : 'تأكيد الرمز'}
            variant="secondary"
            onPress={handleVerifyOtp}
            disabled={registerOtp.length !== 6 || isVerifyingRegisterOtp}
          />
          {registerOtpVerified && (
            <SoftBadge label="✓ تم التحقق من الرقم" variant="success" />
          )}
        </View>
      )}
    </View>
  );

  const renderAdminAccount = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepDescription, { color: theme.textMuted }]}>
        أنشئ حساب المدير للدخول إلى النظام
      </Text>
      
      <Input 
        label="اسم المستخدم *" 
        value={adminUsername} 
        onChangeText={setAdminUsername} 
        placeholder="اختر اسم مستخدم" 
        autoCapitalize="none" 
      />
      <Input 
        label="كلمة المرور *" 
        value={adminPassword} 
        onChangeText={setAdminPassword} 
        placeholder="كلمة مرور قوية" 
        secureTextEntry 
        secureToggle 
      />
      <Input 
        label="تأكيد كلمة المرور *" 
        value={adminPasswordConfirm} 
        onChangeText={setAdminPasswordConfirm} 
        placeholder="أعد إدخال كلمة المرور" 
        secureTextEntry 
        secureToggle 
        error={registerPasswordMismatch ? 'كلمات المرور غير متطابقة' : undefined} 
      />

      {/* Terms and Conditions */}
      <View style={styles.termsContainer}>
        <TouchableOpacity 
          style={styles.checkboxRow}
          onPress={() => setTermsAccepted(!termsAccepted)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.checkbox,
            {
              backgroundColor: termsAccepted ? theme.softPalette.success.main : 'transparent',
              borderColor: termsAccepted ? theme.softPalette.success.main : theme.border,
            }
          ]}>
            {termsAccepted && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </View>
          <View style={styles.termsTextWrapper}>
            <Text style={[styles.termsText, { color: theme.textPrimary }]}>
              أوافق على{' '}
            </Text>
            <TouchableOpacity 
              onPress={() => Linking.openURL(TERMS_URL)}
              activeOpacity={0.7}
            >
              <Text style={[styles.termsLink, { color: theme.softPalette.primary.main }]}>
                الشروط والأحكام
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'company':
        return renderCompanyInfo();
      case 'verification':
        return renderVerification();
      case 'admin':
        return renderAdminAccount();
      default:
        return null;
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
        </View>

        {/* Steps Indicator */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => {
            const isActive = currentStepIndex === index;
            const isCompleted = currentStepIndex > index;
            const isAccessible = isActive || isCompleted || index <= currentStepIndex;
            
            return (
              <React.Fragment key={step.key}>
                <TouchableOpacity
                  style={styles.stepItem}
                  onPress={() => isAccessible && setCurrentStep(step.key)}
                  disabled={!isAccessible}
                >
                  <View style={[
                    styles.stepIcon,
                    { 
                      backgroundColor: isActive || isCompleted 
                        ? theme.softPalette.success.main 
                        : theme.surface,
                      borderColor: isActive || isCompleted 
                        ? theme.softPalette.success.main 
                        : theme.border,
                    }
                  ]}>
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={20} color="white" />
                    ) : (
                      <Ionicons name={step.icon as any} size={20} color={isActive ? 'white' : theme.textMuted} />
                    )}
                  </View>
                  <Text style={[
                    styles.stepTitle,
                    { 
                      color: isActive || isCompleted 
                        ? theme.softPalette.success.main 
                        : theme.textMuted 
                    }
                  ]}>
                    {step.title}
                  </Text>
                </TouchableOpacity>
                {index < steps.length - 1 && (
                  <View style={[
                    styles.stepConnector,
                    { 
                      backgroundColor: currentStepIndex > index 
                        ? theme.softPalette.success.main 
                        : theme.border 
                    }
                  ]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Form Card */}
        <SoftCard style={styles.formCard}>
          <Text style={[styles.stepHeader, { color: theme.textPrimary }]}>
            {steps[currentStepIndex].title}
          </Text>
          {renderCurrentStep()}
        </SoftCard>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {currentStep !== 'company' && (
            <Button
              title="السابق"
              variant="secondary"
              onPress={handlePreviousStep}
              style={styles.button}
            />
          )}
          <View style={{ flex: 1 }} />
          {currentStep === 'admin' ? (
            <Button
              title="إتمام التسجيل"
              disabled={registerPasswordMismatch || !registerOtpSession || !registerOtpVerified || !adminUsername.trim() || !adminPassword || !termsAccepted}
              loading={isRegisterSubmitting}
              onPress={handleRegister}
              style={styles.button}
            />
          ) : (
            <Button
              title="التالي"
              disabled={
                (currentStep === 'company' && !canProceedFromCompany) ||
                (currentStep === 'verification' && !registerOtpVerified)
              }
              onPress={handleNextStep}
              style={styles.button}
            />
          )}
        </View>

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
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logoWrapper: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  logoCard: {
    width: 80,
    height: 80,
    borderRadius: 24,
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
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  stepConnector: {
    height: 2,
    flex: 1,
    marginHorizontal: -8,
    marginBottom: 20,
  },
  formCard: {
    width: '100%',
    marginBottom: 24,
  },
  stepHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepContent: {
    gap: 16,
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  otpSection: {
    gap: 12,
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    minWidth: 120,
  },
  loginSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loginQuestion: {
    fontSize: 15,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  termsTextWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
