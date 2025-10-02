import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: theme.name === 'light' 
      ? ['#E5E7EB', '#F3F4F6'] 
      : ['#374151', '#4B5563'],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

export const SkeletonList: React.FC<{ count?: number; itemHeight?: number }> = ({
  count = 5,
  itemHeight = 80,
}) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.listItem, { height: itemHeight, backgroundColor: theme.surface }]}>
          <View style={styles.listItemContent}>
            <Skeleton width={60} height={60} borderRadius={12} />
            <View style={styles.listItemText}>
              <Skeleton width="70%" height={16} />
              <Skeleton width="50%" height={14} style={{ marginTop: 8 }} />
              <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export const SkeletonCard: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <Skeleton width="100%" height={120} borderRadius={12} />
      <View style={styles.cardContent}>
        <Skeleton width="80%" height={18} />
        <Skeleton width="60%" height={14} style={{ marginTop: 8 }} />
        <View style={styles.cardFooter}>
          <Skeleton width={80} height={32} borderRadius={16} />
          <Skeleton width={60} height={14} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  listItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  listItemText: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    marginTop: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
});
