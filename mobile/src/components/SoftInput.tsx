import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { useTheme } from '@/theme';

type SoftInputProps = TextInputProps & {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
};

export const SoftInput: React.FC<SoftInputProps> = ({ leading, trailing, style, ...rest }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.cardShadow,
        },
      ]}
    >
      {leading}
      <TextInput
        style={[styles.input, { color: theme.textPrimary }, style]}
        placeholderTextColor={theme.textMuted}
        {...rest}
      />
      {trailing}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
});
