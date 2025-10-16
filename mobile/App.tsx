import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, CompanyProvider, ToastProvider, ConfirmationProvider } from '@/context';
import { AppNavigator } from '@/navigation/AppNavigator';
import { SidebarProvider } from '@/context/SidebarContext';
import { SidebarPanel } from '@/navigation/SidebarPanel';
import { queryClient } from '@/services/query-client';
import { ThemeProvider, useTheme } from '@/theme';

// Force RTL layout for the entire app
// This must be called before the app renders
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const AppContent = () => {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar 
        style={theme.name === 'light' ? 'dark' : 'light'} 
        translucent={false}
        backgroundColor={theme.background}
      />
      <AppNavigator />
      <SidebarPanel />
    </>
  );
};

const App = () => {
  useEffect(() => {
    // Double-check RTL is enabled on mount
    if (!I18nManager.isRTL) {
      console.log('RTL is not enabled. Current isRTL:', I18nManager.isRTL);
      console.log('Please restart the app for RTL to take effect.');
    } else {
      console.log('RTL is enabled successfully. isRTL:', I18nManager.isRTL);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <CompanyProvider>
                <ToastProvider>
                  <ConfirmationProvider>
                    <SidebarProvider>
                      <AppContent />
                    </SidebarProvider>
                  </ConfirmationProvider>
                </ToastProvider>
              </CompanyProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
