import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type ScreenContainerProps = ScrollViewProps & {
  children: React.ReactNode;
  noScroll?: boolean;
  footer?: React.ReactNode;
};

export const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, style, noScroll = false, footer, ...rest }) => {
  const { theme } = useTheme();

  const content = noScroll ? (
    <View style={[styles.inner, style]}>{children}</View>
  ) : (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.inner, style]}
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}> 
      {content}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
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
