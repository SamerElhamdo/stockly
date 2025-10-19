import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCompany } from '@/context';
import { useTheme } from '@/theme';

type AmountDisplayProps = {
  amount: number;
};

export const AmountDisplay: React.FC<AmountDisplayProps> = ({ amount }) => {
  const { theme } = useTheme();
  const { formatAmountParts, profile, currencySymbols } = useCompany();

  const { primary, secondary } = formatAmountParts(amount);

  const split = (str: string | undefined) => {
    if (!str) return { symbol: '', number: '' };
    const parts = str.split(' ');
    if (parts.length <= 1) return { symbol: '', number: str };
    const symbol = parts[0];
    const number = parts.slice(1).join(' ');
    return { symbol, number };
  };

  const p = split(primary);
  const s = split(secondary);

  // Use only green (success) and yellow (warning) palettes per design
  const mainBadge = theme.softPalette.success;
  const secondaryBadge = theme.softPalette.warning;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}> 
        <Text style={[styles.value, { color: theme.textPrimary }]}>{p.number}</Text>
        {p.symbol ? (
          <View style={[styles.badge, { backgroundColor: mainBadge.light, borderColor: mainBadge.main + '44' }]}> 
            <Text style={[styles.badgeText, { color: mainBadge.dark }]}>{p.symbol}</Text>
          </View>
        ) : null}
      </View>
      {s.number ? (
        <View style={styles.row}> 
          <Text style={[styles.valueSecondary, { color: theme.textSecondary }]}>{s.number}</Text>
          <View style={[styles.badge, { backgroundColor: secondaryBadge.light, borderColor: secondaryBadge.main + '44' }]}> 
            <Text style={[styles.badgeText, { color: secondaryBadge.dark }]}>
              {s.symbol || (profile?.secondary_currency ? (currencySymbols[profile.secondary_currency] || profile.secondary_currency) : '')}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  value: { fontSize: 14, fontWeight: '700' },
  valueSecondary: { fontSize: 12, fontWeight: '600' },
});

export default AmountDisplay;


