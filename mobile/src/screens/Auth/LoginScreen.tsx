import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import logo from '../../../assets/logo.png';

import { ScreenContainer, SoftCard, Button, Input } from '@/components';
import { useAuth, useToast } from '@/context';
import { useTheme } from '@/theme';
import { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { login, isAuthenticating } = useAuth();
  const { showError, showSuccess } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!username || !password) {
      showError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    const success = await login(username.trim(), password);
    if (success) {
      showSuccess('تم تسجيل الدخول بنجاح');
    }
  };

  return (
    <ScreenContainer>
      <StatusBar style={theme.name === 'light' ? 'dark' : 'light'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <View style={styles.logoWrapper}>
          <View style={[styles.logoCard, { backgroundColor: theme.softPalette.primary.light }]}>
            <Image source={logo} resizeMode="cover" style={styles.logo} />
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>مرحباً بك مجدداً</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>سجل دخولك للوصول إلى حسابك</Text>
        </View>

        {/* Form Card */}
        <SoftCard style={styles.formCard}>
          <View style={styles.form}>
            <Input 
              label="اسم المستخدم" 
              value={username} 
              onChangeText={setUsername} 
              placeholder="أدخل اسم المستخدم" 
              autoCapitalize="none" 
              textContentType="username" 
              autoCorrect={false} 
            />
            
            <View style={styles.passwordWrapper}>
              <Input 
                label="كلمة المرور" 
                value={password} 
                onChangeText={setPassword} 
                placeholder="أدخل كلمة المرور" 
                secureTextEntry 
                secureToggle 
                textContentType="password" 
              />
              <TouchableOpacity 
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotButton}
              >
                <Text style={[styles.forgotText, { color: theme.softPalette.primary.main }]}>
                  نسيت كلمة المرور؟
                </Text>
              </TouchableOpacity>
            </View>

            <Button 
              title="تسجيل الدخول" 
              onPress={handleSubmit} 
              loading={isAuthenticating} 
            />
          </View>
        </SoftCard>

        {/* Register Link */}
        <View style={styles.registerSection}>
          <Text style={[styles.registerQuestion, { color: theme.textMuted }]}>
            ليس لديك حساب؟
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.registerLink, { color: theme.softPalette.primary.main }]}>
              سجل شركتك الآن
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
    gap: 32,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logoWrapper: {
    alignItems: 'center',
    gap: 12,
  },
  logoCard: {
    width: 120,
    height: 120,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  form: {
    gap: 16,
  },
  passwordWrapper: {
    gap: 8,
  },
  forgotButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  registerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  registerQuestion: {
    fontSize: 15,
  },
  registerLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});

