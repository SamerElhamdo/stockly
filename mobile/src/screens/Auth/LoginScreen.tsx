import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ScreenContainer, SoftButton, SoftCard, SoftInput } from '@/components';
import { useAuth } from '@/context';
import { useTheme } from '@/theme';

export const LoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const { login, isAuthenticating } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
            <Image source={require('../../../assets/logo.png')} resizeMode="contain" style={styles.logo} />
          </SoftCard>
          <Text style={[styles.title, { color: theme.textPrimary }]}>مرحباً بك في ستوكلي</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>منصة متكاملة لإدارة المخزون والفواتير</Text>
        </View>
        <SoftCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { color: theme.textPrimary }]}>تسجيل الدخول</Text>
            <Text style={[styles.formSubtitle, { color: theme.textMuted }]}>أدخل بيانات الحساب للوصول للنظام</Text>
          </View>
          <View style={styles.fieldGroup}>
            <SoftInput
              value={username}
              onChangeText={setUsername}
              placeholder="اسم المستخدم"
              autoCapitalize="none"
              textContentType="username"
              autoCorrect={false}
            />
            <SoftInput
              value={password}
              onChangeText={setPassword}
              placeholder="كلمة المرور"
              secureTextEntry
              textContentType="password"
            />
          </View>
          <SoftButton title="تسجيل الدخول" onPress={handleSubmit} loading={isAuthenticating} />
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
});
