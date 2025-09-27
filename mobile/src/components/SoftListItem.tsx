import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface SoftListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
}

export const SoftListItem: React.FC<SoftListItemProps> = ({ title, subtitle, meta, onPress, right, style }) => {
  const { theme } = useTheme();

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.cardShadow,
        },
        style,
      ]}
    >
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.metaContainer}>
        {meta ? <Text style={[styles.meta, { color: theme.textSecondary }]}>{meta}</Text> : null}
        {right}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
  },
  metaContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  meta: {
    fontSize: 14,
    fontWeight: '600',
  },
});
