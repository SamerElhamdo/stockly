import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '@/screens/Auth/LoginScreen';
import { SimpleAuthScreen } from '@/screens/Auth/SimpleAuthScreen';
import { MainTabs } from './MainTabs';
import { PrintInvoiceScreen } from '@/screens/Print/PrintInvoiceScreen';
import { PrintReturnScreen } from '@/screens/Print/PrintReturnScreen';
import { useAuth } from '@/context';
import { useTheme } from '@/theme';
import { RootStackParamList } from './types';
import { navigationRef } from './navigationRef';

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
