import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth, useCompany } from '@/context';
import { useTheme } from '@/theme';
import { navigationRef } from './navigationRef';
import { Ionicons } from '@expo/vector-icons';

export const SidebarPanel: React.FC = () => {
  const { isOpen, close } = useSidebar();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { profile } = useCompany();
  
  // Debug: log user data
  useEffect(() => {
    console.log('👤 Sidebar - User data:', user);
    console.log('🏢 Sidebar - Company profile:', profile);
  }, [user, profile]);
  
  // Get screen dimensions and calculate panel width dynamically
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  // Calculate panel width as 85% of screen width
  const PANEL_WIDTH = Math.round(dimensions.width * 0.85);
  
  // Calculate offset: when hidden, panel should be completely off-screen
  // When visible, panel's right edge should be at screen's right edge
  // Using left positioning: left = screenWidth - panelWidth, then translateX moves it
  const HIDDEN_OFFSET = PANEL_WIDTH + (PANEL_WIDTH * 0.2);  // Panel completely hidden to the right + 20% extra margin
  const VISIBLE_OFFSET = +(PANEL_WIDTH * 0.2);             // Panel visible with 15% extra margin for smooth expansion
  
  // Debug: Log panel dimensions
  useEffect(() => {
    console.log('🎯 Sidebar Dimensions:', {
      screenWidth: dimensions.width,
      panelWidth: PANEL_WIDTH,
      percentage: ((PANEL_WIDTH / dimensions.width) * 100).toFixed(1) + '%',
      leftPosition: dimensions.width - PANEL_WIDTH,
      hiddenOffset: HIDDEN_OFFSET,
      visibleOffset: VISIBLE_OFFSET,
      hiddenExtraMargin: (PANEL_WIDTH * 0.2).toFixed(1) + 'px',
      visibleExtraMargin: (PANEL_WIDTH * 0.15).toFixed(1) + 'px',
      translateXInitial: HIDDEN_OFFSET
    });
  }, [PANEL_WIDTH, dimensions.width, HIDDEN_OFFSET, VISIBLE_OFFSET]);
  
  // Start hidden off-screen to the right
  const translateX = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  // Listen to dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      // Reset animation value when dimensions change
      if (!isOpen) {
        const newPanelWidth = Math.round(window.width * 0.85);
        const newHiddenOffset = newPanelWidth + (newPanelWidth * 0.2);
        translateX.setValue(newHiddenOffset);
      }
    });
    return () => subscription?.remove();
  }, [isOpen, translateX]);

  useEffect(() => {
    if (isOpen) {
      console.log('🚀 Opening sidebar - Moving from', HIDDEN_OFFSET, 'to', VISIBLE_OFFSET);
      // Slide in from right to visible position with smooth expansion
      Animated.parallel([
        Animated.timing(translateX, { 
          toValue: VISIBLE_OFFSET, 
          duration: 250, 
          useNativeDriver: true 
        }),
        Animated.timing(backdrop, { 
          toValue: 1, 
          duration: 250, 
          useNativeDriver: true 
        }),
      ]).start();
    } else {
      console.log('🚪 Closing sidebar - Moving from', VISIBLE_OFFSET, 'to', HIDDEN_OFFSET);
      console.log('🔍 Current translateX value before animation:', (translateX as any)._value);
      // Slide out to the right (hide completely)
      Animated.parallel([
        Animated.timing(translateX, { 
          toValue: HIDDEN_OFFSET, 
          duration: 220, 
          useNativeDriver: true 
        }),
        Animated.timing(backdrop, { 
          toValue: 0, 
          duration: 220, 
          useNativeDriver: true 
        }),
      ]).start(() => {
        console.log('✅ Animation completed - translateX should now be:', HIDDEN_OFFSET);
        console.log('🔍 Actual translateX value after animation:', (translateX as any)._value);
      });
    }
  }, [isOpen, translateX, backdrop, HIDDEN_OFFSET, VISIBLE_OFFSET]);

  return (
    <>
      <Pressable onPress={close} style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }) }]}
        />
      </Pressable>

      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.panel, 
          { 
            width: PANEL_WIDTH, 
            backgroundColor: theme.background, 
            borderColor: theme.border, 
            // Position panel so its right edge is at screen's right edge when translateX = 0
            left: dimensions.width - PANEL_WIDTH,  // This positions the panel so its right edge touches screen's right edge
            transform: [{ translateX }],
          }
        ]}
      >
        <SafeAreaView style={styles.safe}> 
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            {profile?.logo_url ? (
              <Image source={{ uri: profile.logo_url }} style={[styles.logo, { borderColor: theme.softPalette.primary.main }]} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.background, borderColor: theme.softPalette.primary.main }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.company, { color: theme.textPrimary }]} numberOfLines={1}>{profile?.company_name || 'Stockly'}</Text>
              <Text style={[styles.username, { color: theme.textMuted }]} numberOfLines={1}>{user?.username || '—'}</Text>
            </View>
          </View>

          <View style={styles.links}>
            <LinkItem label="الرئيسية" icon="home" iconColor="#6366F1" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Home', params: { screen: 'Dashboard' } } as any)} />
            <LinkItem label="الفواتير" icon="receipt" iconColor="#8B5CF6" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Sales', params: { screen: 'Invoices' } } as any)} />
            <LinkItem label="الإرجاعات" icon="arrow-undo" iconColor="#EC4899" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Sales', params: { screen: 'Returns' } } as any)} />
            <LinkItem label="المدفوعات" icon="cash" iconColor="#10B981" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Sales', params: { screen: 'Payments' } } as any)} />
            <LinkItem label="المنتجات" icon="cube" iconColor="#F59E0B" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Inventory', params: { screen: 'Products' } } as any)} />
            <LinkItem label="الفئات" icon="pricetags" iconColor="#06B6D4" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Inventory', params: { screen: 'Categories' } } as any)} />
            <LinkItem label="الأرشيف" icon="archive" iconColor="#6B7280" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Inventory', params: { screen: 'Archive' } } as any)} />
            <LinkItem label="العملاء" icon="people" iconColor="#3B82F6" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'More', params: { screen: 'Customers' } } as any)} />
            <LinkItem label="المستخدمون" icon="person" iconColor="#8B5CF6" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'More', params: { screen: 'Users' } } as any)} />
            <LinkItem label="الإعدادات" icon="settings" iconColor="#64748B" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'More', params: { screen: 'Settings' } } as any)} />
          </View>

          <Pressable style={[styles.logout, { backgroundColor: theme.softPalette.destructive.main }]} onPress={() => void logout()}>
            <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

const LinkItem: React.FC<{ label: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string; onPress: () => void }> = ({ label, icon, iconColor, onPress }) => {
  const { theme } = useTheme();
  const { close } = useSidebar();
  return (
    <Pressable
      onPress={() => {
        onPress();
        close();
      }}
      style={({ pressed }) => [
        styles.item,
        pressed
          ? {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.border,
              shadowColor: theme.cardShadow,
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }
          : {
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.border,
              shadowColor: theme.cardShadow,
              shadowOpacity: 0.06,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 1,
            },
      ]}
    >
      <Text style={[styles.itemLabel, { color: theme.textPrimary }]}>{label}</Text>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // right will be set dynamically in component
    borderLeftWidth: StyleSheet.hairlineWidth,
    padding: 16,  // This padding is internal and doesn't affect panel width
  },
  safe: { 
    flex: 1,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14, 
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logo: { 
    width: 48, 
    height: 48, 
    borderRadius: 14,
    borderWidth: 2,
  },
  avatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    borderWidth: 2,
  },
  company: { 
    fontSize: 17, 
    fontWeight: '700', 
    textAlign: 'right',
    marginBottom: 2,
  },
  username: { 
    fontSize: 13, 
    textAlign: 'right',
    opacity: 0.7,
  },
  links: { 
    gap: 8, 
    flex: 1, 
    paddingTop: 8,
    paddingBottom: 16,
  },
  link: { fontSize: 15, textAlign: 'right' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { 
    fontSize: 14, 
    textAlign: 'right',
    fontWeight: '500',
  },
  logout: { 
    borderRadius: 10, 
    paddingVertical: 12, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  logoutText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '600',
  },
});


