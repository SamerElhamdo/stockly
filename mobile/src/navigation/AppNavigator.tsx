import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SimpleAuthScreen, PrintInvoiceScreen, PrintReturnScreen } from '@/screens';
import { MainTabs } from './MainTabs';
import { useAuth } from '@/context';
import { useTheme } from '@/theme';
import { RootStackParamList } from './types';
import { navigationRef } from './navigationRef';
// Read dev bypass flag from environment (no need for app.json or helper)
const DEV_NO_AUTH = String(process.env.EXPO_PUBLIC_DEV_NO_AUTH || '').toLowerCase() === 'true';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  

  const baseTheme = theme.name === 'light' ? DefaultTheme : DarkTheme;
  const navTheme: NavigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: theme.background,
      card: theme.surface,
      primary: theme.softPalette.primary.main,
      text: theme.textPrimary,
      border: theme.border,
    },
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.softPalette.primary.main} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={SimpleAuthScreen} />
        )}
        <RootStack.Screen name="PrintInvoice" component={PrintInvoiceScreen} />
        <RootStack.Screen name="PrintReturn" component={PrintReturnScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
