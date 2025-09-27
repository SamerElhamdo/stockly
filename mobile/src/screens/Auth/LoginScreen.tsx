import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import logo from '../../../assets/logo.png';

import { ScreenContainer, SoftButton, SoftCard, SoftInput, SoftBadge } from '@/components';
import { useAuth } from '@/context';
import { useTheme } from '@/theme';
import { apiClient, endpoints } from '@/services/api-client';

export const LoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const { login, isAuthenticating } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Register
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [registerOtp, setRegisterOtp] = useState('');
  const [registerOtpSession, setRegisterOtpSession] = useState<string | null>(null);
  const [registerOtpVerified, setRegisterOtpVerified] = useState(false);
  const [isSendingRegisterOtp, setIsSendingRegisterOtp] = useState(false);
  const [isVerifyingRegisterOtp, setIsVerifyingRegisterOtp] = useState(false);
  const registerPasswordMismatch = useMemo(
    () => adminPassword.length > 0 && adminPasswordConfirm.length > 0 && adminPassword !== adminPasswordConfirm,
    [adminPassword, adminPasswordConfirm],
  );

  // Forgot
  const [resetUsername, setResetUsername] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetOtpSession, setResetOtpSession] = useState<string | null>(null);
  const [resetOtpVerified, setResetOtpVerified] = useState(false);
  const [isSendingResetOtp, setIsSendingResetOtp] = useState(false);
  const [isVerifyingResetOtp, setIsVerifyingResetOtp] = useState(false);
  const resetPasswordMismatch = useMemo(
    () => newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword,
    [newPassword, confirmPassword],
  );

  const handleSubmit = async () => {
    if (!username || !password) {
      return;
    }
    await login(username.trim(), password);
  };

  return (
    <ScreenContainer noScroll>
      <StatusBar style={theme.name === 'light' ? 'dark' : 'light'} />
      <View style={styles.content}>
        <View style={styles.logoWrapper}>
          <SoftCard variant="primary" style={styles.logoCard}>
            <Image source={logo} resizeMode="contain" style={styles.logo} />
          </SoftCard>
          <Text style={[styles.title, { color: theme.textPrimary }]}>مرحباً بك في ستوكلي</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>منصة متكاملة لإدارة المخزون والفواتير</Text>
        </View>
        <SoftCard style={styles.formCard}>
          <View style={styles.tabsHeader}>
            <View style={[styles.tabs, { backgroundColor: theme.surface }]}>
              {(['login', 'register', 'forgot'] as const).map((tab) => (
                <SoftButton
                  key={tab}
                  title={tab === 'login' ? 'تسجيل الدخول' : tab === 'register' ? 'تسجيل شركة' : 'استعادة كلمة المرور'}
                  variant={activeTab === tab ? 'primary' : 'secondary'}
                  onPress={() => setActiveTab(tab)}
                />
              ))}
            </View>
          </View>

          {activeTab === 'login' && (
            <>
              <View style={styles.formHeader}>
                <Text style={[styles.formTitle, { color: theme.textPrimary }]}>تسجيل الدخول</Text>
                <Text style={[styles.formSubtitle, { color: theme.textMuted }]}>أدخل بيانات الحساب للوصول للنظام</Text>
              </View>
              <View style={styles.fieldGroup}>
                <SoftInput label="اسم المستخدم" value={username} onChangeText={setUsername} placeholder="أدخل اسم المستخدم" autoCapitalize="none" textContentType="username" autoCorrect={false} />
                <SoftInput label="كلمة المرور" value={password} onChangeText={setPassword} placeholder="أدخل كلمة المرور" secureTextEntry secureToggle textContentType="password" />
              </View>
              <SoftButton title="تسجيل الدخول" onPress={handleSubmit} loading={isAuthenticating} />
            </>
          )}

          {activeTab === 'register' && (
            <>
              <View style={styles.formHeader}>
                <Text style={[styles.formTitle, { color: theme.textPrimary }]}>تسجيل شركة</Text>
                <Text style={[styles.formSubtitle, { color: theme.textMuted }]}>أدخل بيانات الشركة وفعّل رقم الواتساب</Text>
              </View>
              <View style={styles.fieldGroup}>
                <SoftInput label="اسم الشركة" value={companyName} onChangeText={setCompanyName} placeholder="مثال: شركة النجاح" />
                <SoftInput label="رمز الشركة" value={companyCode} onChangeText={setCompanyCode} placeholder="رمز مميز للشركة" />
                <SoftInput label="البريد الإلكتروني" value={companyEmail} onChangeText={setCompanyEmail} placeholder="example@company.com" autoCapitalize="none" keyboardType="email-address" />
                <SoftInput label="رقم واتساب الشركة" value={companyPhone} onChangeText={(t)=>{setCompanyPhone(t); setRegisterOtpSession(null); setRegisterOtp(''); setRegisterOtpVerified(false);}} placeholder="9665XXXXXXXX" keyboardType="phone-pad" />
                <SoftInput label="عنوان الشركة (اختياري)" value={companyAddress} onChangeText={setCompanyAddress} placeholder="العنوان التفصيلي" />
                <SoftInput label="اسم المستخدم للمدير" value={adminUsername} onChangeText={setAdminUsername} placeholder="اختر اسم مستخدم" autoCapitalize="none" />
                <SoftInput label="كلمة مرور المدير" value={adminPassword} onChangeText={setAdminPassword} placeholder="كلمة مرور قوية" secureTextEntry secureToggle />
                <SoftInput label="تأكيد كلمة المرور" value={adminPasswordConfirm} onChangeText={setAdminPasswordConfirm} placeholder="أعد إدخال كلمة المرور" secureTextEntry secureToggle error={registerPasswordMismatch ? 'كلمات المرور غير متطابقة' : undefined} />
              </View>
              <View style={styles.fieldGroup}>
                <SoftButton
                  title={isSendingRegisterOtp ? 'جاري الإرسال...' : 'إرسال الرمز عبر واتساب'}
                  variant="secondary"
                  onPress={async () => {
                    if (!companyPhone.trim()) return;
                    setIsSendingRegisterOtp(true);
                    try {
                      const res = await apiClient.post(endpoints.sendOtp, { phone: companyPhone, verification_type: 'company_registration' });
                      const sessionId = (res.data as any)?.session_id ?? null;
                      setRegisterOtpSession(sessionId);
                      setRegisterOtp('');
                      setRegisterOtpVerified(false);
                    } finally {
                      setIsSendingRegisterOtp(false);
                    }
                  }}
                />
                {registerOtpSession ? (
                  <>
                    <SoftInput label="رمز التحقق" value={registerOtp} onChangeText={setRegisterOtp} placeholder="6 أرقام" keyboardType="number-pad" />
                    <SoftButton
                      title={isVerifyingRegisterOtp ? 'جاري التحقق...' : 'تأكيد الرمز'}
                      variant="secondary"
                      onPress={async () => {
                        if (!registerOtpSession || registerOtp.length !== 6) return;
                        setIsVerifyingRegisterOtp(true);
                        try {
                          await apiClient.post(endpoints.verifyOtp, { session_id: registerOtpSession, otp_code: registerOtp });
                          setRegisterOtpVerified(true);
                        } finally {
                          setIsVerifyingRegisterOtp(false);
                        }
                      }}
                    />
                    {registerOtpVerified ? <SoftBadge label="الرقم موثق" variant="info" /> : null}
                  </>
                ) : null}
              </View>
              <SoftButton
                title="إتمام التسجيل"
                onPress={async () => {
                  if (registerPasswordMismatch || !registerOtpSession || !registerOtpVerified) return;
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
                  // auto-fill login
                  setUsername(adminUsername.trim());
                  setPassword(adminPassword);
                  setActiveTab('login');
                }}
              />
            </>
          )}

          {activeTab === 'forgot' && (
            <>
              <View style={styles.formHeader}>
                <Text style={[styles.formTitle, { color: theme.textPrimary }]}>استعادة كلمة المرور</Text>
                <Text style={[styles.formSubtitle, { color: theme.textMuted }]}>أدخل البيانات ثم فعّل الرمز عبر واتساب</Text>
              </View>
              <View style={styles.fieldGroup}>
                <SoftInput label="اسم المستخدم" value={resetUsername} onChangeText={setResetUsername} placeholder="اسم المستخدم" autoCapitalize="none" />
                <SoftInput label="رقم واتساب الحساب" value={resetPhone} onChangeText={(t)=>{setResetPhone(t); setResetOtpSession(null); setResetOtp(''); setResetOtpVerified(false);}} placeholder="9665XXXXXXXX" keyboardType="phone-pad" />
                <SoftButton
                  title={isSendingResetOtp ? 'جاري الإرسال...' : 'إرسال الرمز عبر واتساب'}
                  variant="secondary"
                  onPress={async () => {
                    if (!resetUsername.trim() || !resetPhone.trim()) return;
                    setIsSendingResetOtp(true);
                    try {
                      const res = await apiClient.post(endpoints.sendOtp, { username: resetUsername.trim(), phone: resetPhone, verification_type: 'forgot_password' });
                      const sessionId = (res.data as any)?.session_id ?? null;
                      setResetOtpSession(sessionId);
                      setResetOtp('');
                      setResetOtpVerified(false);
                    } finally {
                      setIsSendingResetOtp(false);
                    }
                  }}
                />
                {resetOtpSession ? (
                  <>
                    <SoftInput label="رمز التحقق" value={resetOtp} onChangeText={setResetOtp} placeholder="6 أرقام" keyboardType="number-pad" />
                    <SoftButton
                      title={isVerifyingResetOtp ? 'جاري التحقق...' : 'تأكيد الرمز'}
                      variant="secondary"
                      onPress={async () => {
                        if (!resetOtpSession || resetOtp.length !== 6) return;
                        setIsVerifyingResetOtp(true);
                        try {
                          await apiClient.post(endpoints.verifyOtp, { session_id: resetOtpSession, otp_code: resetOtp });
                          setResetOtpVerified(true);
                        } finally {
                          setIsVerifyingResetOtp(false);
                        }
                      }}
                    />
                  </>
                ) : null}
                <SoftInput label="كلمة المرور الجديدة" value={newPassword} onChangeText={setNewPassword} placeholder="كلمة مرور قوية" secureTextEntry secureToggle />
                <SoftInput label="تأكيد كلمة المرور" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="أعد إدخال كلمة المرور" secureTextEntry secureToggle error={resetPasswordMismatch ? 'كلمات المرور غير متطابقة' : undefined} />
              </View>
              <SoftButton
                title="تحديث كلمة المرور"
                onPress={async () => {
                  if (resetPasswordMismatch || !resetOtpSession || !resetOtpVerified) return;
                  await apiClient.post(endpoints.resetPassword, {
                    username: resetUsername.trim(),
                    phone: resetPhone.trim(),
                    new_password: newPassword,
                    otp_session_id: resetOtpSession,
                  });
                  setActiveTab('login');
                  setUsername(resetUsername.trim());
                  setPassword('');
                  setResetUsername('');
                  setResetPhone('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              />
            </>
          )}
        </SoftCard>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logoWrapper: {
    alignItems: 'center',
    gap: 12,
  },
  logoCard: {
    width: 96,
    height: 96,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 64,
    height: 64,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: 16,
  },
  formHeader: {
    gap: 6,
  },
  tabsHeader: {
    gap: 12,
  },
  tabs: {
    gap: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  formSubtitle: {
    fontSize: 14,
  },
  fieldGroup: {
    gap: 12,
  },
  errorText: {
    fontSize: 13,
  },
});
