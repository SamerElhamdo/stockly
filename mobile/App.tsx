import 'react-native-gesture-handler';

import React from 'react';
import { I18nManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, CompanyProvider } from '@/context';
import { AppNavigator } from '@/navigation/AppNavigator';
import { SidebarProvider } from '@/context/SidebarContext';
import { SidebarPanel } from '@/navigation/SidebarPanel';
import { queryClient } from '@/services/query-client';
import { ThemeProvider, useTheme } from '@/theme';

const AppContent = () => {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.name === 'light' ? 'dark' : 'light'} />
      <AppNavigator />
      <SidebarPanel />
    </>
  );
};

const App = () => {
  // Ensure RTL globally
  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    try { I18nManager.forceRTL(true); } catch (e) { /* noop */ }
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <CompanyProvider>
                <SidebarProvider>
                  <AppContent />
                </SidebarProvider>
              </CompanyProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
