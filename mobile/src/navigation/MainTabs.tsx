import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Keyboard, Pressable, StyleSheet, Text, View, Animated } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { HeaderMenuButton } from '@/components/HeaderMenuButton';
import { ArchiveScreen } from '@/screens/Archive/ArchiveScreen';
import { CategoriesScreen } from '@/screens/Categories/CategoriesScreen';
import { CustomersScreen } from '@/screens/Customers/CustomersScreen';
import { DashboardScreen } from '@/screens/Dashboard/DashboardScreen';
import { InvoicesScreen } from '@/screens/Invoices/InvoicesScreen';
import { InvoiceCreateScreen } from '@/screens/Invoices/InvoiceCreateScreen';
import { PaymentsScreen } from '@/screens/Payments/PaymentsScreen';
import { PaymentCreateScreen } from '@/screens/Payments/PaymentCreateScreen';
import { ProductsScreen } from '@/screens/Products/ProductsScreen';
import { ReturnsScreen } from '@/screens/Returns/ReturnsScreen';
import { SettingsScreen } from '@/screens/Settings/SettingsScreen';
import { UsersScreen } from '@/screens/Users/UsersScreen';
// Removed inventory header switch per new UX
import {
  HomeStackParamList,
  InventoryStackParamList,
  MainTabParamList,
  MoreStackParamList,
  SalesStackParamList,
} from './types';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SalesStack = createNativeStackNavigator<SalesStackParamList>();
const InventoryStack = createNativeStackNavigator<InventoryStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const screenOptions = {
  headerShown: true,
};

const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={screenOptions}>
    <HomeStack.Screen name="Dashboard" component={DashboardScreen} options={{ headerRight: () => <HeaderMenuButton /> }} />
  </HomeStack.Navigator>
);

const SalesStackNavigator = () => (
  <SalesStack.Navigator screenOptions={screenOptions}>
    <SalesStack.Screen name="Invoices" component={InvoicesScreen} options={{ headerRight: () => <HeaderMenuButton /> }} />
    <SalesStack.Screen name="Returns" component={ReturnsScreen} />
    <SalesStack.Screen name="Payments" component={PaymentsScreen} />
    <SalesStack.Screen name="PaymentCreate" component={PaymentCreateScreen} options={{ title: 'دفعة' }} />
    <SalesStack.Screen name="InvoiceCreate" component={InvoiceCreateScreen} options={{ title: 'فاتورة' }} />
  </SalesStack.Navigator>
);

const InventoryStackNavigator = () => (
  <InventoryStack.Navigator screenOptions={screenOptions}>
    <InventoryStack.Screen
      name="Products"
      component={ProductsScreen}
      options={{ headerRight: () => <HeaderMenuButton />, title: 'المنتجات' }}
    />
    <InventoryStack.Screen name="Categories" component={CategoriesScreen} />
    <InventoryStack.Screen name="Archive" component={ArchiveScreen} />
  </InventoryStack.Navigator>
);

const MoreStackNavigator = () => (
  <MoreStack.Navigator screenOptions={screenOptions}>
    <MoreStack.Screen name="Customers" component={CustomersScreen} options={{ headerRight: () => <HeaderMenuButton /> }} />
    <MoreStack.Screen name="Users" component={UsersScreen} />
    <MoreStack.Screen name="Settings" component={SettingsScreen} />
  </MoreStack.Navigator>
);

const DrawerContentless = () => (
  // Empty drawer content for now; we'll use default list of routes
  <></>
);

export const MainTabs = () => {
  const { theme } = useTheme();
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnims = React.useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  React.useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  React.useEffect(() => {
    if (expanded) {
      // Rotate main button
      Animated.spring(rotateAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Animate action buttons with stagger
      Animated.stagger(
        50,
        scaleAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          })
        )
      ).start();
    } else {
      // Reset animations
      Animated.parallel([
        Animated.spring(rotateAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        ...scaleAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          })
        ),
      ]).start();
    }
  }, [expanded]);

  const Tabs = (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.softPalette.primary.main,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingTop: 10,
            display: keyboardVisible ? 'none' : 'flex',
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Sales') iconName = 'receipt-outline';
          if (route.name === 'Inventory') iconName = 'cube-outline';
          if (route.name === 'More') iconName = 'people-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ title: 'الرئيسية', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Sales"
        component={SalesStackNavigator}
        options={{ title: 'الفواتير', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryStackNavigator}
        options={{ title: 'المنتجات', tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{ title: 'العملاء', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );

  return (
    <>
      {Tabs}
      {!keyboardVisible && (
        <View pointerEvents="box-none" style={{ position: 'absolute', bottom: 90, left: 20, right: 20, alignItems: 'flex-start' }}>
          {/* Action Buttons - Render before main button so they appear below it */}
          {expanded && (
            <View style={{ marginBottom: 70, gap: 12, alignItems: 'flex-start' }}>
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: scaleAnims[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                    {
                      translateY: scaleAnims[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                  opacity: scaleAnims[0],
                }}
              >
                <Pressable
                  onPress={() => {
                    setExpanded(false);
                    (global as any).navigationRef?.navigate('Main', {
                      screen: 'Inventory',
                      params: { screen: 'Products', params: { openAdd: true } },
                    } as any);
                  }}
                  style={({ pressed }) => [
                    styles.action,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionText, { color: theme.textPrimary }]}>إضافة منتج</Text>
                    <View style={[styles.iconWrapper, { backgroundColor: theme.softPalette.success.main + '20' }]}>
                      <Ionicons name="cube" size={20} color={theme.softPalette.success.main} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>

              <Animated.View
                style={{
                  transform: [
                    {
                      scale: scaleAnims[1].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                    {
                      translateY: scaleAnims[1].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                  opacity: scaleAnims[1],
                }}
              >
                <Pressable
                  onPress={() => {
                    setExpanded(false);
                    (global as any).navigationRef?.navigate('Main', {
                      screen: 'Inventory',
                      params: { screen: 'Categories', params: { openAdd: true } },
                    } as any);
                  }}
                  style={({ pressed }) => [
                    styles.action,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionText, { color: theme.textPrimary }]}>إضافة فئة</Text>
                    <View style={[styles.iconWrapper, { backgroundColor: theme.softPalette.info.main + '20' }]}>
                      <Ionicons name="pricetag" size={20} color={theme.softPalette.info.main} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>

              <Animated.View
                style={{
                  transform: [
                    {
                      scale: scaleAnims[2].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                    {
                      translateY: scaleAnims[2].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                  opacity: scaleAnims[2],
                }}
              >
                <Pressable
                  onPress={() => {
                    setExpanded(false);
                    (global as any).navigationRef?.navigate('Main', {
                      screen: 'Sales',
                      params: { screen: 'Invoices', params: { openCreate: true } },
                    } as any);
                  }}
                  style={({ pressed }) => [
                    styles.action,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionText, { color: theme.textPrimary }]}>فاتورة جديدة</Text>
                    <View style={[styles.iconWrapper, { backgroundColor: theme.softPalette.primary.main + '20' }]}>
                      <Ionicons name="receipt" size={20} color={theme.softPalette.primary.main} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>

              <Animated.View
                style={{
                  transform: [
                    {
                      scale: scaleAnims[3].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                    {
                      translateY: scaleAnims[3].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                  opacity: scaleAnims[3],
                }}
              >
                <Pressable
                  onPress={() => {
                    setExpanded(false);
                    (global as any).navigationRef?.navigate('Main', {
                      screen: 'Sales',
                      params: { screen: 'Returns', params: { openCreate: true } },
                    } as any);
                  }}
                  style={({ pressed }) => [
                    styles.action,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionText, { color: theme.textPrimary }]}>إنشاء مرتجع</Text>
                    <View style={[styles.iconWrapper, { backgroundColor: theme.softPalette.warning.main + '20' }]}>
                      <Ionicons name="arrow-undo" size={20} color={theme.softPalette.warning.main} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            </View>
          )}

          {/* Main FAB */}
          <Animated.View
            style={{
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                  }),
                },
              ],
            }}
          >
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              style={({ pressed }) => [
                styles.fab,
                {
                  backgroundColor: theme.softPalette.primary.main,
                  shadowColor: theme.softPalette.primary.shadow,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Ionicons name="add" size={28} color={theme.name === 'light' ? '#0F172A' : '#F8FAFC'} />
            </Pressable>
          </Animated.View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  action: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
