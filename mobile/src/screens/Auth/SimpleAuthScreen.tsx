import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/theme';
import { useAuth } from '@/context';
import { EnhancedInput } from '@/components';

export const SimpleAuthScreen: React.FC = () => {
  const { theme } = useTheme();
  const { login, isAuthenticating } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username || !password) return;
    await login(username.trim(), password);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}> 
      <StatusBar style={theme.name === 'light' ? 'dark' : 'light'} />
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>مرحباً بك في ستوكلي</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>تسجيل الدخول</Text>
          </View>

          <View style={styles.form}>
            <EnhancedInput
              label="اسم المستخدم"
              value={username}
              onChangeText={setUsername}
              placeholder="أدخل اسم المستخدم"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <EnhancedInput
              label="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              placeholder="أدخل كلمة المرور"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <Pressable style={[styles.button, { backgroundColor: theme.softPalette.primary.main }]} onPress={handleLogin} disabled={isAuthenticating}>
              <Text style={styles.buttonText}>{isAuthenticating ? 'جاري الدخول...' : 'تسجيل الدخول'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    width: '100%',
    maxWidth: 420,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 420,
    gap: 16,
  },
  button: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
  },
  buttonText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
});


