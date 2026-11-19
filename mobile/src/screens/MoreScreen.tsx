import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface MoreScreenProps {
  navigation: any;
}

export function MoreScreen({ navigation }: MoreScreenProps) {
  const menuItems = [
    {
      title: 'Digital Khata',
      subtitle: 'Udhaar ledger and customer credit balances',
      icon: 'book-outline',
      color: '#2563eb',
      bgColor: '#eff6ff',
      screen: 'DigitalKhata',
    },
    {
      title: 'Invoices & Receipts',
      subtitle: 'Audit order receipts and checkout history',
      icon: 'receipt-outline',
      color: '#0891b2',
      bgColor: '#ecfeff',
      screen: 'Invoices',
    },
    {
      title: 'Suppliers Directory',
      subtitle: 'Vendor contacts, lead times, and PO management',
      icon: 'business-outline',
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      screen: 'Suppliers',
    },
    {
      title: 'Hyperlocal Marketplace',
      subtitle: 'Discounted near-expiry goods listing for shoppers',
      icon: 'pricetags-outline',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      screen: 'Marketplace',
    },
    {
      title: 'Notifications & Alerts',
      subtitle: 'Critical stock, expiry, and demand signals',
      icon: 'notifications-outline',
      color: '#ea580c',
      bgColor: '#fff7ed',
      screen: 'Notifications',
    },
    {
      title: 'Staff & RBAC Control',
      subtitle: 'Roles, cashier assignments, and permissions',
      icon: 'shield-checkmark-outline',
      color: '#4f46e5',
      bgColor: '#eef2ff',
      screen: 'RBAC',
    },
  ];

  async function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to end your StockSmart session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to sign out');
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Business Modules</Text>
      
      <View style={styles.cardContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuRow}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionHeader}>Account & Settings</Text>

      <View style={styles.cardContainer}>
        <View style={styles.accountRow}>
          <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
            <Ionicons name="person-outline" size={22} color="#475569" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.menuTitle}>Store Account</Text>
            <Text style={styles.menuSubtitle}>Connected to Supabase PostgreSQL</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.signOutText}>Sign Out of Store</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerNote}>
        StockSmart AI v1.0.0 • Hyperlocal Inventory Management
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#fff1f2',
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 8,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },
});
