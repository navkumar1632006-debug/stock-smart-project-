import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { khataApi, KhataCustomer } from '../lib/api/khataApi';

export function DigitalKhataScreen() {
  const [customers, setCustomers] = useState<KhataCustomer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [initialAmount, setInitialAmount] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadKhata();
  }, []);

  async function loadKhata() {
    setLoading(true);
    try {
      const data = await khataApi.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch Khata entries');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEntry() {
    if (!name.trim()) {
      Alert.alert('Validation', 'Customer Name is required');
      return;
    }
    const balance = parseFloat(initialAmount) || 0;
    setSaving(true);
    try {
      const newCust = await khataApi.addCustomer(name.trim(), phone.trim(), 0);
      if (balance > 0) {
        await khataApi.addTransaction(newCust.id, 'credit', balance, 'Initial Udhaar');
      }
      setName('');
      setPhone('');
      setInitialAmount('');
      setShowAddModal(false);
      Alert.alert('Success', 'Khata entry created successfully.');
      loadKhata();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add customer entry');
    } finally {
      setSaving(false);
    }
  }

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  const totalReceivables = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Header Metric Card */}
      <View style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <View style={styles.iconCircle}>
            <Ionicons name="book-outline" size={22} color="#2563eb" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.metricLabel}>Total Receivables (Udhaar)</Text>
            <Text style={styles.metricValue}>₹{totalReceivables.toLocaleString('en-IN')}</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(!showAddModal)}
          >
            <Ionicons name={showAddModal ? "close" : "add"} size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Entry Form Dropdown/Card */}
      {showAddModal && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Customer Credit Entry</Text>
          <TextInput
            style={styles.input}
            placeholder="Customer Name *"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number (e.g. +91 98765 43210)"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Initial Udhaar Amount (₹)"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={initialAmount}
            onChangeText={setInitialAmount}
          />
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleAddEntry}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Ledger Entry</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer name or phone..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Ledger List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Syncing Digital Khata records...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Khata Records Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try matching another name or phone' : 'Tap + above to log credit balances'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isOverdue = item.balance > 1000;
            const isCleared = item.balance <= 0;
            return (
              <View style={styles.customerCard}>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerPhone}>
                    {item.phone || 'No phone recorded'}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        isCleared
                          ? styles.badgeCleared
                          : isOverdue
                          ? styles.badgeOverdue
                          : styles.badgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isCleared
                            ? styles.badgeTextCleared
                            : isOverdue
                            ? styles.badgeTextOverdue
                            : styles.badgeTextPending,
                        ]}
                      >
                        {isCleared ? 'Cleared' : isOverdue ? 'Overdue' : 'Pending'}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>
                      {new Date(item.updated_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.balanceContainer}>
                  <Text style={styles.balanceLabel}>Owed</Text>
                  <Text style={[styles.balanceAmount, isCleared ? { color: '#10b981' } : { color: '#e11d48' }]}>
                    ₹{item.balance.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  listContent: {
    paddingBottom: 24,
  },
  customerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  customerPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeOverdue: {
    backgroundColor: '#ffe4e6',
  },
  badgeCleared: {
    backgroundColor: '#dcfce7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgeTextPending: {
    color: '#d97706',
  },
  badgeTextOverdue: {
    color: '#e11d48',
  },
  badgeTextCleared: {
    color: '#15803d',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  balanceContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  balanceLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
});
