import React from 'react';
import { DrawerContentComponentProps, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useCompany } from '@/context';
import { useTheme } from '@/theme';

export const Sidebar: React.FC<DrawerContentComponentProps> = (props) => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { profile } = useCompany();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}> 
      <DrawerContentScrollView {...props} contentContainerStyle={[styles.scroll, { backgroundColor: theme.background }]}> 
        <View style={styles.header}> 
          {profile?.logo_url ? (
            <Image source={{ uri: profile.logo_url }} style={styles.logo} />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: theme.surface, borderColor: theme.border }]} />
          )}
          <View style={styles.headerText}> 
            <Text style={[styles.companyName, { color: theme.textPrimary }]} numberOfLines={1}>
              {profile?.company_name || 'Stockly'}
            </Text>
            <Text style={[styles.username, { color: theme.textMuted }]} numberOfLines={1}>
              {user?.username || '—'}
            </Text>
          </View>
        </View>

        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}> 
        <Pressable
          style={[styles.logoutBtn, { backgroundColor: theme.softPalette.destructive.main }]}
          onPress={() => {
            Alert.alert('تأكيد تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج من الحساب؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'تسجيل الخروج', style: 'destructive', onPress: () => void logout() },
            ]);
          }}
        >
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  logo: { width: 44, height: 44, borderRadius: 12 },
  logoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1 },
  companyName: { fontSize: 16, fontWeight: '700' },
  username: { fontSize: 13 },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logoutBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});


