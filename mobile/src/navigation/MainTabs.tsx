import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Keyboard, Pressable, StyleSheet, Text, View, Animated, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme';
import { useCompany } from '@/context';
import { HeaderMenuButton } from '@/components/HeaderMenuButton';
import { navigationRef } from './navigationRef';
import {
  DashboardScreen,
  InvoicesScreen,
  InvoiceCreateScreen,
  PaymentsScreen,
  PaymentCreateScreen,
  ReturnsScreen,
  ProductsScreen,
  CategoriesScreen,
  ArchiveScreen,
  CustomersScreen,
  CustomerDetailsScreen,
  UsersScreen,
  SettingsScreen,
} from '@/screens';
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
  animation: 'slide_from_right' as const,
  animationDuration: 300,
};

const BackButton = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={{ paddingHorizontal: 16, paddingVertical: 8 }}
    >
      <Ionicons name="arrow-forward" size={24} color={theme.softPalette.primary.main} />
    </TouchableOpacity>
  );
};

const HomeStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <HomeStack.Navigator 
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right' as const,
        animationDuration: 300,
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.softPalette.primary.main,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <HomeStack.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ 
          headerRight: () => <HeaderMenuButton />, 
          title: 'لوحة التحكم',
          headerBackVisible: false,
        }} 
      />
    </HomeStack.Navigator>
  );
};

const SalesStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <SalesStack.Navigator 
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right' as const,
        animationDuration: 300,
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.softPalette.primary.main,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <SalesStack.Screen 
        name="Invoices" 
        component={InvoicesScreen} 
        options={{ 
          headerRight: () => <HeaderMenuButton />, 
          title: 'الفواتير',
          headerBackVisible: false,
        }} 
      />
      <SalesStack.Screen 
        name="Returns" 
        component={ReturnsScreen} 
        options={{ 
          headerRight: () => <HeaderMenuButton />, 
          title: 'المرتجعات',
          headerBackVisible: false,
        }} 
      />
      <SalesStack.Screen 
        name="Payments" 
        component={PaymentsScreen} 
        options={{ 
          headerRight: () => <HeaderMenuButton />, 
          title: 'المدفوعات',
          headerBackVisible: false,
        }} 
      />
      <SalesStack.Screen 
        name="PaymentCreate" 
        component={PaymentCreateScreen} 
        options={({ route }) => {
          const mode = (route.params as any)?.mode;
          return {
            title: mode === 'withdraw' ? 'سحب دفعة' : 'إضافة دفعة',
            headerBackVisible: true,
            headerBackTitle: 'رجوع',
            headerShown: true,
            gestureEnabled: true,
          };
        }} 
      />
    <SalesStack.Screen 
      name="InvoiceCreate" 
      component={InvoiceCreateScreen} 
      options={{ 
        title: 'فاتورة',
        headerBackVisible: true,
        headerBackTitle: 'الفواتير',
      }} 
    />
    </SalesStack.Navigator>
  );
};

const InventoryStackNavigator = () => {
  const { getProductsLabel } = useCompany();
  
  return (
    <InventoryStack.Navigator screenOptions={screenOptions}>
      <InventoryStack.Screen
        name="Products"
        component={ProductsScreen}
        options={{ 
          headerRight: () => <HeaderMenuButton />, 
          title: getProductsLabel(),
          headerBackVisible: false,
        }}
      />
      <InventoryStack.Screen 
        name="Categories" 
        component={CategoriesScreen} 
        options={{ 
          headerRight: () => <HeaderMenuButton />, 
          title: 'الفئات',
          headerBackVisible: false,
        }} 
      />
      <InventoryStack.Screen 
        name="Archive" 
        component={ArchiveScreen} 
        options={{ 
          headerRight: () => <HeaderMenuButton />, 
          title: 'الأرشيف',
          headerBackVisible: false,
        }} 
      />
    </InventoryStack.Navigator>
  );
};

const MoreStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <MoreStack.Navigator 
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right' as const,
        animationDuration: 300,
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.softPalette.primary.main,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <MoreStack.Screen 
        name="Customers" 
        component={CustomersScreen} 
        options={{ 
          headerRight: () => <HeaderMenuButton />, 
          title: 'العملاء',
          headerBackVisible: false,
        }} 
      />
      <MoreStack.Screen 
        name="CustomerDetails" 
        component={CustomerDetailsScreen} 
        options={{ 
          title: 'تفاصيل العميل',
          headerBackVisible: true,
          headerBackTitle: 'العملاء',
        }} 
      />
      <MoreStack.Screen 
        name="PaymentCreate" 
        component={PaymentCreateScreen} 
        options={({ route }) => {
          const mode = (route.params as any)?.mode;
          return {
            title: mode === 'withdraw' ? 'سحب دفعة' : 'إضافة دفعة',
            headerBackVisible: true,
            headerBackTitle: 'العملاء',
            headerShown: true,
            gestureEnabled: true,
          };
        }} 
      />
      <MoreStack.Screen 
        name="Users" 
        component={UsersScreen} 
        options={{ 
          headerRight: () => <HeaderMenuButton />, 
          title: 'المستخدمون',
          headerBackVisible: false,
        }} 
      />
      <MoreStack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          headerRight: () => <HeaderMenuButton />, 
          title: 'الإعدادات',
          headerBackVisible: false,
        }} 
      />
    </MoreStack.Navigator>
  );
};

const DrawerContentless = () => (
  // Empty drawer content for now; we'll use default list of routes
  <></>
);

export const MainTabs = () => {
  const { theme } = useTheme();
  const { getProductsLabel } = useCompany();
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const scaleAnims = React.useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

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
      // Animate overlay
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
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
      // Hide overlay
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
      
      // Reset animations
      Animated.parallel(
        scaleAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          })
        )
      ).start();
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
        options={{ 
          title: 'الرئيسية', 
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              navigation.navigate('Home', { screen: 'Dashboard' });
            }
          },
        })}
      />
      <Tab.Screen
        name="Sales"
        component={SalesStackNavigator}
        options={{ 
          title: 'الفواتير', 
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // منع السلوك الافتراضي
            e.preventDefault();
            // الذهاب دائماً لقائمة الفواتير
            navigation.navigate('Sales', { screen: 'Invoices' });
          },
        })}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryStackNavigator}
        options={{ 
          title: getProductsLabel(), 
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              navigation.navigate('Inventory', { screen: 'Products' });
            }
          },
        })}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{ 
          title: 'العملاء', 
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (navigation.isFocused()) {
              navigation.navigate('More', { screen: 'Customers' });
            }
          },
        })}
      />
    </Tab.Navigator>
  );

  return (
    <>
      {Tabs}
      {/* Overlay when FAB is expanded */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 1,
          opacity: overlayOpacity,
        }}
        pointerEvents={expanded ? 'auto' : 'none'}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setExpanded(false)}
        />
      </Animated.View>
      {!keyboardVisible && (
        <View pointerEvents="box-none" style={{ position: 'absolute', bottom: 90, left: 20, right: 20, alignItems: 'flex-end', zIndex: 2 }}>
          {/* Action Buttons - Render before main button so they appear below it */}
          {expanded && (
            <View style={{ marginBottom: 20, gap: 8, alignItems: 'flex-end' }}>
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
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('Main', {
                        screen: 'Inventory',
                        params: { screen: 'Products', params: { openAdd: true } },
                      } as any);
                    }
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
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('Main', {
                        screen: 'Inventory',
                        params: { screen: 'Categories', params: { openAdd: true } },
                      } as any);
                    }
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
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('Main', {
                        screen: 'More',
                        params: { screen: 'Customers', params: { openAdd: true } },
                      } as any);
                    }
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
                    <Text style={[styles.actionText, { color: theme.textPrimary }]}>إضافة عميل</Text>
                    <View style={[styles.iconWrapper, { backgroundColor: theme.softPalette.success.main + '20' }]}>
                      <Ionicons name="person-add" size={20} color={theme.softPalette.success.main} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>

            </View>
          )}

          {/* Main FAB */}
          <View>
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
              <Ionicons 
                name={expanded ? "close" : "add"} 
                size={28} 
                color={theme.name === 'light' ? '#0F172A' : '#F8FAFC'} 
              />
            </Pressable>
          </View>
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
