import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Keyboard } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { HeaderMenuButton } from '@/components/HeaderMenuButton';
import { ArchiveScreen } from '@/screens/Archive/ArchiveScreen';
import { CategoriesScreen } from '@/screens/Categories/CategoriesScreen';
import { CustomersScreen } from '@/screens/Customers/CustomersScreen';
import { DashboardScreen } from '@/screens/Dashboard/DashboardScreen';
import { InvoicesScreen } from '@/screens/Invoices/InvoicesScreen';
import { PaymentsScreen } from '@/screens/Payments/PaymentsScreen';
import { ProductsScreen } from '@/screens/Products/ProductsScreen';
import { ReturnsScreen } from '@/screens/Returns/ReturnsScreen';
import { SettingsScreen } from '@/screens/Settings/SettingsScreen';
import { UsersScreen } from '@/screens/Users/UsersScreen';
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
    <HomeStack.Screen name="Dashboard" component={DashboardScreen} options={{ headerLeft: () => <HeaderMenuButton /> }} />
  </HomeStack.Navigator>
);

const SalesStackNavigator = () => (
  <SalesStack.Navigator screenOptions={screenOptions}>
    <SalesStack.Screen name="Invoices" component={InvoicesScreen} options={{ headerLeft: () => <HeaderMenuButton /> }} />
    <SalesStack.Screen name="Returns" component={ReturnsScreen} />
    <SalesStack.Screen name="Payments" component={PaymentsScreen} />
  </SalesStack.Navigator>
);

const InventoryStackNavigator = () => (
  <InventoryStack.Navigator screenOptions={screenOptions}>
    <InventoryStack.Screen name="Products" component={ProductsScreen} options={{ headerLeft: () => <HeaderMenuButton /> }} />
    <InventoryStack.Screen name="Categories" component={CategoriesScreen} />
    <InventoryStack.Screen name="Archive" component={ArchiveScreen} />
  </InventoryStack.Navigator>
);

const MoreStackNavigator = () => (
  <MoreStack.Navigator screenOptions={screenOptions}>
    <MoreStack.Screen name="Customers" component={CustomersScreen} options={{ headerLeft: () => <HeaderMenuButton /> }} />
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

  React.useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const Tabs = (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.softPalette.primary.main,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
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
        options={{ title: 'المبيعات', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryStackNavigator}
        options={{ title: 'المخزون', tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{ title: 'المزيد', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );

  return Tabs;
};
