import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

type Props = {
  active: 'products' | 'categories';
  onChange: (v: 'products' | 'categories') => void;
};

export const InventoryHeaderSwitch: React.FC<Props> = ({ active, onChange }) => {
  const { theme } = useTheme();
  const Button = ({ value, label }: { value: 'products' | 'categories'; label: string }) => (
    <Pressable
      onPress={() => onChange(value)}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: active === value ? theme.softPalette.primary.main : 'transparent',
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.btnLabel, { color: active === value ? '#fff' : theme.textPrimary }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
      <Button value="products" label="المنتجات" />
      <Button value="categories" label="الفئات" />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnLabel: { fontSize: 14, fontWeight: '600' },
});


