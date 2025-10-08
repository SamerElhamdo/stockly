import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export interface ToastProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onHide: () => void;
}

const { width } = Dimensions.get('window');

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type,
  duration = 3000,
  onHide,
}) => {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: -100,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          backgroundColor: theme.softPalette.success.main,
          iconColor: '#fff',
          textColor: '#fff',
        };
      case 'error':
        return {
          icon: 'close-circle' as const,
          backgroundColor: theme.softPalette.destructive.main,
          iconColor: '#fff',
          textColor: '#fff',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          backgroundColor: theme.softPalette.warning.main,
          iconColor: '#fff',
          textColor: '#fff',
        };
      case 'info':
        return {
          icon: 'information-circle' as const,
          backgroundColor: theme.softPalette.info.main,
          iconColor: '#fff',
          textColor: '#fff',
        };
      default:
        return {
          icon: 'information-circle' as const,
          backgroundColor: theme.softPalette.primary.main,
          iconColor: '#fff',
          textColor: '#fff',
        };
    }
  };

  const config = getToastConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Pressable
        style={[
          styles.toast,
          {
            backgroundColor: config.backgroundColor,
            shadowColor: config.backgroundColor,
          },
        ]}
        onPress={hideToast}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name={config.icon} size={24} color={config.iconColor} />
          </View>
          <Text style={[styles.message, { color: config.textColor }]} numberOfLines={2}>
            {message}
          </Text>
          <Pressable onPress={hideToast} style={styles.closeButton}>
            <Ionicons name="close" size={18} color={config.textColor} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
