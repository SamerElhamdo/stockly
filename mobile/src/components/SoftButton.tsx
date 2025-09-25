import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme';

type SoftButtonVariant = 'primary' | 'success' | 'warning' | 'destructive' | 'secondary';

type SoftButtonProps = PressableProps & {
  title: string;
  variant?: SoftButtonVariant;
  loading?: boolean;
};

export const SoftButton: React.FC<SoftButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...rest
}) => {
  const { theme } = useTheme();
  const palette =
    variant === 'secondary'
      ? theme.softPalette.info
      : theme.softPalette[variant as keyof typeof theme.softPalette];

  const textColor = theme.name === 'light' ? '#0F172A' : '#F8FAFC';
  const pressableStyle =
    typeof style === 'function'
      ? (state: Parameters<NonNullable<typeof style>>[0]) => [styles.container, style(state)]
      : [styles.container, style];

  return (
    <Pressable disabled={disabled || loading} style={pressableStyle} {...rest}>
      <LinearGradient
        colors={[palette.light, palette.main]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { shadowColor: palette.shadow }]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={[styles.label, { color: textColor }]}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
