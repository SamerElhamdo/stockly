import 'react-native-gesture-handler';

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, CompanyProvider } from '@/context';
import { AppNavigator } from '@/navigation/AppNavigator';
import { queryClient } from '@/services/query-client';
import { ThemeProvider, useTheme } from '@/theme';

const AppContent = () => {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.name === 'light' ? 'dark' : 'light'} />
      <AppNavigator />
    </>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <CompanyProvider>
                <AppContent />
              </CompanyProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
