import React from 'react';
import { Pressable, PressableProps, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';

type FloatingActionButtonProps = PressableProps & {
  icon?: keyof typeof Ionicons.glyphMap;
  bottom?: number;
  right?: number;
};

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ icon = 'add', bottom = 120, right = 20, style, ...rest }) => {
  const { theme } = useTheme();
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'flex-end' }]}> 
      <Pressable
        style={({ pressed }) => [
          styles.btn,
          {
            bottom,
            right: right, // RTL: place on right side
            backgroundColor: theme.softPalette.primary.main,
            shadowColor: theme.softPalette.primary.shadow,
            opacity: pressed ? 0.9 : 1,
          },
          typeof style === 'function' ? (style as any)({ pressed }) : style,
        ]}
        {...rest}
      >
        <Ionicons name={icon} size={22} color={theme.name === 'light' ? '#0F172A' : '#F8FAFC'} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
});

export default FloatingActionButton;


