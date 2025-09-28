import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type ListItemProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export const ListItem: React.FC<ListItemProps> = ({ title, subtitle, meta, onPress, right, style }) => {
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
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
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

export default ListItem;


