import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';

import { useTheme } from '@/theme';

type SoftBadgeVariant = 'primary' | 'success' | 'warning' | 'destructive' | 'info';

type SoftBadgeProps = ViewProps & {
  label: string;
  variant?: SoftBadgeVariant;
};

export const SoftBadge: React.FC<SoftBadgeProps> = ({ label, variant = 'primary', style, ...rest }) => {
  const { theme } = useTheme();
  const palette = theme.softPalette[variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.light,
          borderColor: palette.main + '33',
        },
        style,
      ]}
      {...rest}
    >
      <Text style={[styles.label, { color: palette.dark }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
