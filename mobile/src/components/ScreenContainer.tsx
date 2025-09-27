import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type ScreenContainerProps = ScrollViewProps & {
  children: React.ReactNode;
  noScroll?: boolean;
  footer?: React.ReactNode;
};

export const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, style, noScroll = false, footer, ...rest }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const content = noScroll ? (
    <View style={[styles.inner, style, { direction: 'rtl', writingDirection: 'rtl' }]}>{children}</View>
  ) : (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background, direction: 'rtl' }]}
      contentContainerStyle={[styles.inner, style, { direction: 'rtl', writingDirection: 'rtl' }]}
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["left", "right", "bottom"]}> 
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
      >
        {content}
        {footer ? <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  inner: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
    gap: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
