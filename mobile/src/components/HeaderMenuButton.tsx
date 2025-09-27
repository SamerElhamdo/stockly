import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { useSidebar } from '@/context/SidebarContext';

export const HeaderMenuButton: React.FC = () => {
  const { theme } = useTheme();
  const { toggle } = useSidebar();
  return (
    <Pressable onPress={toggle} style={styles.btn} accessibilityRole="button" accessibilityLabel="Open menu">
      <View style={[styles.bar, { backgroundColor: theme.textPrimary }]} />
      <View style={[styles.bar, { backgroundColor: theme.textPrimary }]} />
      <View style={[styles.bar, { backgroundColor: theme.textPrimary }]} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 12, paddingVertical: 8 },
  bar: { width: 20, height: 2, marginVertical: 2, borderRadius: 2 },
});


