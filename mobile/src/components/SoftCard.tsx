import React from 'react';
import { ColorValue, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemeColors, useTheme } from '@/theme';

type SoftVariant = 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';

type SoftCardProps = ViewProps & {
  variant?: SoftVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gradient?: boolean;
};

const buildShadow = (theme: ThemeColors, variant: SoftVariant) => {
  if (variant === 'default') {
    return {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      shadowColor: theme.cardShadow,
    };
  }

  const palette = theme.softPalette[variant] || theme.softPalette.primary;
  return {
    backgroundColor: theme.name === 'light' ? palette.light : theme.surfaceElevated,
    borderColor: theme.name === 'light' ? palette.light : palette.dark,
    shadowColor: palette.shadow,
  };
};

export const SoftCard: React.FC<SoftCardProps> = ({
  variant = 'default',
  children,
  style,
  gradient = true,
  ...rest
}) => {
  const { theme } = useTheme();
  const shadow = buildShadow(theme, variant);

  const gradientColors: [ColorValue, ColorValue] =
    variant === 'default'
      ? [theme.surface, theme.surface]
      : [theme.softPalette[variant].light, `${theme.softPalette[variant].main}10`];

  const fallbackColors: [ColorValue, ColorValue] = [shadow.backgroundColor, shadow.backgroundColor];

  return (
    <View
      style={[styles.wrapper, { shadowColor: shadow.shadowColor, backgroundColor: shadow.backgroundColor }, style]}
      {...rest}
    >
      <LinearGradient
        colors={gradient ? gradientColors : fallbackColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.inner, { borderColor: shadow.borderColor }]}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  inner: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
