import React from 'react';
import { DrawerContentComponentProps, DrawerContentScrollView } from '@react-navigation/drawer';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, useCompany } from '@/context';
import { useTheme } from '@/theme';

export const Sidebar: React.FC<DrawerContentComponentProps> = (props) => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { profile } = useCompany();

  const menuItems = [
    {
      label: 'الرئيسية',
      icon: 'home-outline' as const,
      onPress: () => props.navigation.navigate('Home'),
    },
    {
      label: 'الفواتير',
      icon: 'receipt-outline' as const,
      onPress: () => props.navigation.navigate('Sales', { screen: 'Invoices' }),
    },
    {
      label: 'المرتجعات',
      icon: 'arrow-undo-outline' as const,
      onPress: () => props.navigation.navigate('Sales', { screen: 'Returns' }),
    },
    {
      label: 'الدفعات',
      icon: 'cash-outline' as const,
      onPress: () => props.navigation.navigate('Sales', { screen: 'Payments' }),
    },
    {
      label: 'المنتجات',
      icon: 'cube-outline' as const,
      onPress: () => props.navigation.navigate('Inventory', { screen: 'Products' }),
    },
    {
      label: 'الفئات',
      icon: 'pricetag-outline' as const,
      onPress: () => props.navigation.navigate('Inventory', { screen: 'Categories' }),
    },
    {
      label: 'الأرشيف',
      icon: 'archive-outline' as const,
      onPress: () => props.navigation.navigate('Inventory', { screen: 'Archive' }),
    },
    {
      label: 'العملاء',
      icon: 'people-outline' as const,
      onPress: () => props.navigation.navigate('More', { screen: 'Customers' }),
    },
    {
      label: 'المستخدمون',
      icon: 'person-outline' as const,
      onPress: () => props.navigation.navigate('More', { screen: 'Users' }),
    },
    {
      label: 'الإعدادات',
      icon: 'settings-outline' as const,
      onPress: () => props.navigation.navigate('More', { screen: 'Settings' }),
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={[styles.scroll, { backgroundColor: theme.background }]}
      >
        {/* Header with Logo and Company Info */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.logoContainer}>
            {profile?.logo_url ? (
              <Image source={{ uri: profile.logo_url }} style={styles.logo} />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="business" size={28} color={theme.primary} />
              </View>
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.companyName, { color: theme.textPrimary }]} numberOfLines={1}>
              {profile?.company_name || 'Stockly'}
            </Text>
            <Text style={[styles.username, { color: theme.textMuted }]} numberOfLines={1}>
              {user?.username || '—'}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.menuItem,
                {
                  backgroundColor: pressed ? theme.border : 'transparent',
                },
              ]}
              onPress={item.onPress}
            >
              <View style={[styles.iconWrapper, { backgroundColor: theme.surface }]}>
                <Ionicons name={item.icon} size={22} color={theme.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: theme.textPrimary }]}>{item.label}</Text>
              <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.textMuted }]}>الإصدار 1.0.0</Text>
        </View>
      </DrawerContentScrollView>

      {/* Footer with Logout */}
      <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: theme.softPalette.destructive.main, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => {
            Alert.alert('تأكيد تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج من الحساب؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'تسجيل الخروج', style: 'destructive', onPress: () => void logout() },
            ]);
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
  },
  menuContainer: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  versionContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  versionText: {
    fontSize: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
