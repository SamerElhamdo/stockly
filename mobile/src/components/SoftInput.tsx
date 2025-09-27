import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';

type SoftInputProps = TextInputProps & {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  label?: string;
  error?: string;
  secureToggle?: boolean;
};

export const SoftInput: React.FC<SoftInputProps> = ({ leading, trailing, style, label, error, secureToggle = false, secureTextEntry, ...rest }) => {
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
          style={[styles.input, { color: theme.textPrimary }, style]}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={isSecure}
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
    gap: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  error: {
    fontSize: 12,
    paddingHorizontal: 4,
  },
  iconBtn: {
    paddingLeft: 8,
  },
});
