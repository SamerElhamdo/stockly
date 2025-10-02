import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';

export type ButtonProps = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle | ((state: { pressed: boolean }) => ViewStyle | ViewStyle[]);
};

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  fullWidth = false,
  style,
  ...rest
}) => {
  const { theme } = useTheme();

  const getColors = (): { background: string; text: string; border: string } => {
    const onDark = theme.name === 'dark';
    switch (variant) {
      case 'secondary':
        return { background: theme.surfaceElevated, text: theme.textPrimary, border: theme.border };
      case 'success':
        return { background: theme.softPalette.success.main, text: onDark ? '#0F172A' : '#FFFFFF', border: 'transparent' };
      case 'warning':
        return { background: theme.softPalette.warning.main, text: onDark ? '#0F172A' : '#FFFFFF', border: 'transparent' };
      case 'destructive':
        return { background: theme.softPalette.destructive.main, text: '#FFFFFF', border: 'transparent' };
      case 'primary':
      default:
        return { background: theme.softPalette.primary.main, text: theme.name === 'light' ? '#FFFFFF' : '#FFFFFF', border: 'transparent' };
    }
  };

  const colors = getColors();

  const baseStyle = ({ pressed }: { pressed: boolean }) => [
    styles.container,
    fullWidth && styles.fullWidth,
    {
      backgroundColor: colors.background,
      borderColor: colors.border,
      opacity: disabled || loading ? 0.7 : pressed ? 0.9 : 1,
    },
    typeof style === 'function' ? style({ pressed }) : style,
  ];

  return (
    <Pressable disabled={disabled || loading} style={baseStyle} accessibilityRole="button" {...rest}>
      {({ pressed }) => (
        <>
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[styles.label, { color: colors.text }]}>{title}</Text>
          )}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    minHeight: 48,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default Button;


