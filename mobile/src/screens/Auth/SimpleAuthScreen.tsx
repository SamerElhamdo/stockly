import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/theme';
import { useAuth } from '@/context';

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
            <Text style={[styles.label, { color: theme.textMuted }]}>اسم المستخدم</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="أدخل اسم المستخدم"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.surface, borderColor: theme.border }]}
            />

            <Text style={[styles.label, { color: theme.textMuted }]}>كلمة المرور</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="أدخل كلمة المرور"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.surface, borderColor: theme.border }]}
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
    direction: 'rtl',
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
    direction: 'rtl',
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'right',
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


