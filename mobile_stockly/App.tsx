import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import ReturnsScreen from './src/screens/ReturnsScreen';
import InvoiceDetailScreen from './src/screens/InvoiceDetailScreen';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Customers') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Products') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Invoices') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ title: 'لوحة التحكم' }}
      />
      <Tab.Screen 
        name="Customers" 
        component={CustomersScreen} 
        options={{ title: 'العملاء' }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductsScreen} 
        options={{ title: 'المنتجات' }}
      />
      <Tab.Screen 
        name="Invoices" 
        component={InvoicesScreen} 
        options={{ title: 'الفواتير' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Categories" component={CategoriesScreen} />
            <Stack.Screen name="Payments" component={PaymentsScreen} />
            <Stack.Screen name="Returns" component={ReturnsScreen} />
            <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </PaperProvider>
  );
}