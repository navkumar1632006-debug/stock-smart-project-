import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';

// Auth Screens
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { EmailVerificationScreen } from './src/screens/EmailVerificationScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { SetNewPasswordScreen } from './src/screens/SetNewPasswordScreen';

// Core Tab Screens
import { DashboardScreen } from './src/screens/DashboardScreen';
import { POSScreen } from './src/screens/POSScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { ForecastsScreen } from './src/screens/ForecastsScreen';
import { MoreScreen } from './src/screens/MoreScreen';

// "More" Sub Screens
import { DigitalKhataScreen } from './src/screens/DigitalKhataScreen';
import { InvoicesScreen } from './src/screens/InvoicesScreen';
import { SuppliersScreen } from './src/screens/SuppliersScreen';
import { MarketplaceScreen } from './src/screens/MarketplaceScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { RBACScreen } from './src/screens/RBACScreen';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { color: '#0f172a', fontWeight: '700' },
        headerTintColor: '#2563eb',
        headerShadowVisible: false,
      }}
    >
      <MoreStack.Screen
        name="MoreHome"
        component={MoreScreen}
        options={{ title: 'More Modules' }}
      />
      <MoreStack.Screen
        name="DigitalKhata"
        component={DigitalKhataScreen}
        options={{ title: 'Digital Khata' }}
      />
      <MoreStack.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{ title: 'Invoices & Receipts' }}
      />
      <MoreStack.Screen
        name="Suppliers"
        component={SuppliersScreen}
        options={{ title: 'Supplier Directory' }}
      />
      <MoreStack.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{ title: 'Hyperlocal Marketplace' }}
      />
      <MoreStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications & Alerts' }}
      />
      <MoreStack.Screen
        name="RBAC"
        component={RBACScreen}
        options={{ title: 'Staff & Roles (RBAC)' }}
      />
    </MoreStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { color: '#0f172a', fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'POS') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Forecasts') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="POS"
        component={POSScreen}
        options={{ title: 'Point of Sale' }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: 'Inventory' }}
      />
      <Tab.Screen
        name="Forecasts"
        component={ForecastsScreen}
        options={{ title: 'AI Demand' }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{ title: 'More', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, user, isLoading, isEmailVerified, isPasswordRecoveryMode } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingLogoBadge}>
          <Ionicons name="cube" size={36} color="#2563eb" />
        </View>
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 16 }} />
        <Text style={styles.loadingText}>Initializing StockSmart...</Text>
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isPasswordRecoveryMode ? (
        <RootStack.Screen
          name="SetNewPassword"
          component={SetNewPasswordScreen}
          options={{ title: 'Set New Password' }}
        />
      ) : session && user ? (
        !isEmailVerified ? (
          <RootStack.Screen
            name="EmailVerification"
            component={EmailVerificationScreen}
            initialParams={{ email: user.email }}
          />
        ) : (
          <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
        )
      ) : (
        <RootStack.Group>
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Sign In' }}
          />
          <RootStack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ title: 'Create Account' }}
          />
          <RootStack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: 'Reset Password' }}
          />
          <RootStack.Screen
            name="EmailVerification"
            component={EmailVerificationScreen}
            options={{ title: 'Verify Email' }}
          />
          <RootStack.Screen
            name="SetNewPassword"
            component={SetNewPasswordScreen}
            options={{ title: 'Set New Password' }}
          />
        </RootStack.Group>
      )}
    </RootStack.Navigator>
  );
}

const linking: any = {
  prefixes: ['stocksmart://'],
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      ResetPassword: 'forgot-password',
      SetNewPassword: 'reset-password',
      EmailVerification: 'verify-email',
      MainTabs: {
        path: 'auth/callback',
        screens: {
          Dashboard: 'dashboard',
          POS: 'pos',
          Inventory: 'inventory',
          Forecasts: 'forecasts',
          More: {
            screens: {
              MoreHome: 'more',
              DigitalKhata: 'khata',
              Invoices: 'invoices',
              Suppliers: 'suppliers',
              Marketplace: 'marketplace',
              Notifications: 'notifications',
              RBAC: 'rbac',
            },
          },
        },
      },
    },
  },
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  loadingLogoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '600',
  },
});
