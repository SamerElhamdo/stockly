import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth, useCompany } from '@/context';
import { useTheme } from '@/theme';
import { navigationRef } from './navigationRef';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.min(320, Math.round(SCREEN_WIDTH * 0.82));

export const SidebarPanel: React.FC = () => {
  const { isOpen, close } = useSidebar();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { profile } = useCompany();
  const translateX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: PANEL_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen, translateX, backdrop]);

  return (
    <>
      <Pressable onPress={close} style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }) }]}
        />
      </Pressable>

      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[styles.panel, { width: PANEL_WIDTH, backgroundColor: theme.surface, borderColor: theme.border, transform: [{ translateX }], direction: 'rtl' }]}
      >
        <SafeAreaView style={styles.safe}> 
          <View style={styles.header}>
            {profile?.logo_url ? (
              <Image source={{ uri: profile.logo_url }} style={styles.logo} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.background, borderColor: theme.border }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.company, { color: theme.textPrimary }]} numberOfLines={1}>{profile?.company_name || 'Stockly'}</Text>
              <Text style={[styles.username, { color: theme.textMuted }]} numberOfLines={1}>{user?.username || '—'}</Text>
            </View>
          </View>

          <View style={styles.links}>
            <LinkItem label="الرئيسية" icon="home-outline" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Home', params: { screen: 'Dashboard' } } as any)} />
            <LinkItem label="الفواتير" icon="receipt-outline" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Sales', params: { screen: 'Invoices' } } as any)} />
            <LinkItem label="الإرجاعات" icon="arrow-undo-outline" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Sales', params: { screen: 'Returns' } } as any)} />
            <LinkItem label="المدفوعات" icon="cash-outline" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Sales', params: { screen: 'Payments' } } as any)} />
            <LinkItem label="المنتجات" icon="cube-outline" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Inventory', params: { screen: 'Products' } } as any)} />
            <LinkItem label="التصنيفات" icon="pricetags-outline" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Inventory', params: { screen: 'Categories' } } as any)} />
            <LinkItem label="الأرشيف" icon="archive-outline" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Inventory', params: { screen: 'Archive' } } as any)} />
            <LinkItem label="العملاء" icon="people-outline" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'More', params: { screen: 'Customers' } } as any)} />
            <LinkItem label="المستخدمون" icon="person-outline" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'More', params: { screen: 'Users' } } as any)} />
            <LinkItem label="الإعدادات" icon="settings-outline" onPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'More', params: { screen: 'Settings' } } as any)} />
          </View>

          <Pressable style={[styles.logout, { backgroundColor: theme.softPalette.destructive.main }]} onPress={() => void logout()}>
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

const LinkItem: React.FC<{ label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }> = ({ label, icon, onPress }) => {
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
        { backgroundColor: pressed ? (theme.name === 'light' ? '#F1F5F9' : '#0B1220') : 'transparent', borderColor: theme.border },
      ]}
    >
      <Ionicons name={icon} size={18} color={theme.textPrimary} style={{ marginRight: 8 }} />
      <Text style={[styles.itemLabel, { color: theme.textPrimary }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  safe: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
  logo: { width: 44, height: 44, borderRadius: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  company: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  username: { fontSize: 13, textAlign: 'right' },
  links: { gap: 10, flex: 1, paddingTop: 12 },
  link: { fontSize: 15, textAlign: 'right' },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemLabel: { fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  logout: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});


