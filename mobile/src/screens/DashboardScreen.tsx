import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { inventoryApi } from '../lib/api/inventoryApi';
import { salesApi } from '../lib/api/salesApi';
import { storeApi } from '../lib/api/storeApi';
import { realtimeApi } from '../lib/api/realtime';
import { Product, InventoryBatch, SaleRecord } from '../types/retail';

interface DashboardProps {
  navigation: any;
}

export function DashboardScreen({ navigation }: DashboardProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);

  useEffect(() => {
    loadDashboardData();

    let unsubscribe: (() => void) | undefined;
    storeApi
      .getCurrentStoreId()
      .then((storeId) => {
        unsubscribe = realtimeApi.subscribeToStoreData(storeId, (_table, _payload) => {
          loadDashboardData();
        });
      })
      .catch((err) => console.warn('Realtime subscription warning:', err));

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  async function loadDashboardData() {
    try {
      const [prodsData, batchesData, salesData] = await Promise.all([
        inventoryApi.getProducts().catch(() => []),
        inventoryApi.getBatches().catch(() => []),
        salesApi.getSales().catch(() => []),
      ]);
      setProducts(prodsData);
      setBatches(batchesData);
      setSales(salesData);
    } catch (err) {
      console.error('Error fetching dashboard metrics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Calculations
  const totalSalesRevenue = sales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
  const totalUnitsSold = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const activeSKUsCount = products.length;
  const lowStockProducts = products.filter((p) => p.stockLevel <= p.reorderPoint);

  // Expiry in <= 7 days
  const now = Date.now();
  const nearExpiryBatches = batches.filter((b) => {
    const diffDays = (new Date(b.expiryDate).getTime() - now) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 7 && b.currentQuantity > 0;
  });

  const wastePreventedEstimate = nearExpiryBatches.reduce(
    (sum, b) => sum + (b.discountedPrice * b.currentQuantity),
    0
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
    >
      {/* Overview Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.storeTitle}>StockSmart AI</Text>
          <Text style={styles.storeSubtitle}>Hyperlocal Retail & Inventory Hub</Text>
        </View>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('More', { screen: 'Notifications' })}
        >
          <Ionicons name="notifications-outline" size={20} color="#1e293b" />
          {nearExpiryBatches.length > 0 && <View style={styles.notificationDot} />}
        </TouchableOpacity>
      </View>

      {/* Primary KPI Cards Grid */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Syncing store intelligence...</Text>
        </View>
      ) : (
        <>
          <View style={styles.kpiGrid}>
            {/* Revenue */}
            <View style={[styles.kpiCard, { borderLeftColor: '#2563eb' }]}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>Total Revenue</Text>
                <Ionicons name="trending-up-outline" size={18} color="#2563eb" />
              </View>
              <Text style={styles.kpiValue}>₹{totalSalesRevenue.toLocaleString('en-IN')}</Text>
              <Text style={styles.kpiSubtext}>{totalUnitsSold} units sold to date</Text>
            </View>

            {/* Active SKUs */}
            <View style={[styles.kpiCard, { borderLeftColor: '#0ea5e9' }]}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>Active SKUs</Text>
                <Ionicons name="cube-outline" size={18} color="#0ea5e9" />
              </View>
              <Text style={styles.kpiValue}>{activeSKUsCount}</Text>
              <Text style={styles.kpiSubtext}>Catalog items registered</Text>
            </View>

            {/* Low Stock Alerts */}
            <TouchableOpacity
              style={[styles.kpiCard, { borderLeftColor: lowStockProducts.length > 0 ? '#f59e0b' : '#10b981' }]}
              onPress={() => navigation.navigate('Inventory')}
            >
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>Low Stock Alerts</Text>
                <Ionicons
                  name={lowStockProducts.length > 0 ? "warning-outline" : "checkmark-circle-outline"}
                  size={18}
                  color={lowStockProducts.length > 0 ? "#f59e0b" : "#10b981"}
                />
              </View>
              <Text style={[styles.kpiValue, lowStockProducts.length > 0 && { color: '#d97706' }]}>
                {lowStockProducts.length}
              </Text>
              <Text style={styles.kpiSubtext}>Below reorder threshold</Text>
            </TouchableOpacity>

            {/* Near Expiry Batches */}
            <View style={[styles.kpiCard, { borderLeftColor: nearExpiryBatches.length > 0 ? '#ef4444' : '#10b981' }]}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>Expiry Warnings</Text>
                <Ionicons
                  name="timer-outline"
                  size={18}
                  color={nearExpiryBatches.length > 0 ? "#ef4444" : "#10b981"}
                />
              </View>
              <Text style={[styles.kpiValue, nearExpiryBatches.length > 0 && { color: '#dc2626' }]}>
                {nearExpiryBatches.length}
              </Text>
              <Text style={styles.kpiSubtext}>Batches expiring in ≤ 7 days</Text>
            </View>
          </View>

          {/* Waste Prevention Card */}
          <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="shield-checkmark" size={22} color="#15803d" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionTitle}>Dynamic Waste Prevention</Text>
                <Text style={styles.actionDescription}>
                  {nearExpiryBatches.length > 0
                    ? `₹${wastePreventedEstimate.toLocaleString('en-IN')} salvageable value in near-expiry stock`
                    : 'Zero batches in critical expiry window'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('More', { screen: 'Marketplace' })}
              >
                <Text style={styles.actionButtonText}>List on Deals</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions Row */}
          <Text style={styles.sectionTitle}>Quick Operations</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('POS')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="cart-outline" size={22} color="#2563eb" />
              </View>
              <Text style={styles.quickActionText}>Open POS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Inventory')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="add-circle-outline" size={22} color="#16a34a" />
              </View>
              <Text style={styles.quickActionText}>Manage Stock</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Forecasts')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#f5f3ff' }]}>
                <Ionicons name="analytics-outline" size={22} color="#7c3aed" />
              </View>
              <Text style={styles.quickActionText}>Forecasts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('More', { screen: 'DigitalKhata' })}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#fffbeb' }]}>
                <Ionicons name="book-outline" size={22} color="#d97706" />
              </View>
              <Text style={styles.quickActionText}>Khata Book</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Sales Overview */}
          <View style={styles.recentSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Sales Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('More', { screen: 'Invoices' })}>
                <Text style={styles.viewAllText}>View Invoices</Text>
              </TouchableOpacity>
            </View>

            {sales.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={32} color="#cbd5e1" />
                <Text style={styles.emptyText}>No sales recorded yet</Text>
              </View>
            ) : (
              sales.slice(0, 5).map((sale) => (
                <View key={sale.id} style={styles.saleItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.saleItemName}>{sale.productName}</Text>
                    <Text style={styles.saleItemMeta}>
                      Qty: {sale.quantity} • {sale.channel} • {new Date(sale.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.saleItemAmount}>₹{sale.totalPrice}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  storeSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  kpiSubtext: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  actionCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 14,
    marginBottom: 20,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  actionDescription: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  quickActionButton: {
    width: '23%',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  recentSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  saleItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  saleItemMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  saleItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a',
  },
});
