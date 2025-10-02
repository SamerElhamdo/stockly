import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  secureToggle?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
};

export const Input: React.FC<InputProps> = ({ label, error, style, secureToggle = false, secureTextEntry, leading, trailing, ...rest }) => {
  const { theme } = useTheme();
  const [isSecure, setIsSecure] = React.useState<boolean>(Boolean(secureTextEntry));

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text> : null}
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.softPalette.destructive.main : theme.border,
            shadowColor: theme.cardShadow,
          },
        ]}
      >
        {leading}
        <TextInput
          style={[styles.input, { color: theme.textPrimary }, style as any]}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={isSecure}
          textAlign="right"
          {...rest}
        />
        {secureToggle ? (
          <Pressable onPress={() => setIsSecure((s) => !s)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Toggle password visibility">
            <Ionicons name={isSecure ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}
        {trailing}
      </View>
      {error ? <Text style={[styles.error, { color: theme.softPalette.destructive.main }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 6,
    textAlign: 'right',
    marginBottom: 2,
  },
  error: {
    fontSize: 12,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  iconBtn: {
    paddingRight: 8,
  },
});

export default Input;


