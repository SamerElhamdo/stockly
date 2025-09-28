import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';

import { useTheme } from '@/theme';

type SectionHeaderProps = ViewProps & {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action, style, ...rest }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, style]} {...rest}>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  texts: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
  },
});
