import React from 'react';
import { Keyboard, TextInput, TextInputProps, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface EnhancedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  showDoneButton?: boolean;
  doneButtonText?: string;
  onDonePress?: () => void;
}

export const EnhancedInput: React.FC<EnhancedInputProps> = ({
  label,
  error,
  helperText,
  showDoneButton = true,
  doneButtonText = 'تم',
  onDonePress,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const handleDonePress = () => {
    Keyboard.dismiss();
    onDonePress?.();
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      )}
      
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.softPalette.destructive?.main || '#d32f2f' : theme.border,
            color: theme.textPrimary,
          },
          style,
        ]}
        placeholderTextColor={theme.textMuted}
        returnKeyType={showDoneButton ? 'done' : props.returnKeyType}
        onSubmitEditing={showDoneButton ? handleDonePress : props.onSubmitEditing}
        {...props}
      />
      
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={14} color={theme.softPalette.destructive?.main || '#d32f2f'} />
          <Text style={[styles.errorText, { color: theme.softPalette.destructive?.main || '#d32f2f' }]}>
            {error}
          </Text>
        </View>
      )}
      
      {helperText && !error && (
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          {helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'right',
    minHeight: 44,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
});
