import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { inventoryApi } from '../lib/api/inventoryApi';
import { salesApi } from '../lib/api/salesApi';
import { Product, SaleRecord, InventoryBatch } from '../types/retail';

interface DemandMetric {
  product: Product;
  unitsSold30d: number;
  dailyVelocity: number;
  daysCoverage: number | null;
  reorderStatus: 'HEALTHY' | 'REORDER_NOW' | 'CRITICAL' | 'OVERSTOCK';
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  recommendedReorder: number;
}

export const ForecastsScreen = () => {
  const [metrics, setMetrics] = useState<DemandMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ACTIONABLE'>('ALL');

  useEffect(() => {
    loadForecasts();
  }, []);

  async function loadForecasts() {
    try {
      setLoading(true);
      const [products, sales] = await Promise.all([
        inventoryApi.getProducts().catch(() => []),
        salesApi.getSales().catch(() => []),
      ]);

      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;
      const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

      const computed: DemandMetric[] = products.map((prod) => {
        const prodSales = sales.filter((s) => s.productId === prod.id);
        const recent30d = prodSales.filter(
          (s) => new Date(s.saleDate).getTime() >= thirtyDaysAgo
        );
        const recent7d = prodSales.filter(
          (s) => new Date(s.saleDate).getTime() >= sevenDaysAgo
        );

        const unitsSold30d = recent30d.reduce((sum, s) => sum + s.quantity, 0);
        const unitsSold7d = recent7d.reduce((sum, s) => sum + s.quantity, 0);

        const dailyVelocity = unitsSold30d > 0 ? unitsSold30d / 30 : unitsSold7d / 7;
        const daysCoverage =
          dailyVelocity > 0 ? Math.round(prod.stockLevel / dailyVelocity) : null;

        // Reorder logic matching web forecastService
        let reorderStatus: 'HEALTHY' | 'REORDER_NOW' | 'CRITICAL' | 'OVERSTOCK' = 'HEALTHY';
        if (prod.stockLevel <= prod.reorderPoint / 2) {
          reorderStatus = 'CRITICAL';
        } else if (prod.stockLevel <= prod.reorderPoint) {
          reorderStatus = 'REORDER_NOW';
        } else if (daysCoverage !== null && daysCoverage > 60) {
          reorderStatus = 'OVERSTOCK';
        }

        // Trend calculation
        const velocity7 = unitsSold7d / 7;
        const velocity30 = unitsSold30d / 30;
        let trend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
        if (velocity7 > velocity30 * 1.2) trend = 'INCREASING';
        else if (velocity7 < velocity30 * 0.8) trend = 'DECREASING';

        const recommendedReorder =
          reorderStatus === 'CRITICAL' || reorderStatus === 'REORDER_NOW'
            ? Math.max(prod.reorderPoint * 2 - prod.stockLevel, 10)
            : 0;

        return {
          product: prod,
          unitsSold30d,
          dailyVelocity: parseFloat(dailyVelocity.toFixed(1)),
          daysCoverage,
          reorderStatus,
          trend,
          recommendedReorder,
        };
      });

      setMetrics(computed);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadForecasts();
  };

  const displayedMetrics = filter === 'ALL'
    ? metrics
    : metrics.filter((m) => m.reorderStatus === 'CRITICAL' || m.reorderStatus === 'REORDER_NOW');

  const totalActions = metrics.filter(
    (m) => m.reorderStatus === 'CRITICAL' || m.reorderStatus === 'REORDER_NOW'
  ).length;

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.bannerCard}>
        <View style={styles.bannerHeader}>
          <View style={styles.bannerIcon}>
            <Ionicons name="analytics" size={20} color="#2563eb" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bannerTitle}>Statistical Demand Modeling</Text>
            <Text style={styles.bannerSubtitle}>
              Run-rate velocity and dynamic stock-out alerts
            </Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'ALL' && styles.activeFilterBtn]}
            onPress={() => setFilter('ALL')}
          >
            <Text
              style={[styles.filterBtnText, filter === 'ALL' && styles.activeFilterBtnText]}
            >
              All Items ({metrics.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filter === 'ACTIONABLE' && styles.activeFilterBtn]}
            onPress={() => setFilter('ACTIONABLE')}
          >
            <Text
              style={[
                styles.filterBtnText,
                filter === 'ACTIONABLE' && styles.activeFilterBtnText,
              ]}
            >
              Action Required ({totalActions})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Metric Cards */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Computing historical demand cycles...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedMetrics}
          keyExtractor={(item) => item.product.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
          renderItem={({ item }) => {
            const isCritical = item.reorderStatus === 'CRITICAL';
            const isReorder = item.reorderStatus === 'REORDER_NOW';

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{item.product.name}</Text>
                    <Text style={styles.categoryText}>
                      {item.product.category} • SKU: {item.product.sku}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isCritical
                        ? styles.badgeCritical
                        : isReorder
                        ? styles.badgeReorder
                        : styles.badgeHealthy,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isCritical
                          ? styles.textCritical
                          : isReorder
                          ? styles.textReorder
                          : styles.textHealthy,
                      ]}
                    >
                      {item.reorderStatus.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Data Points Grid */}
                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={styles.colLabel}>Current Stock</Text>
                    <Text style={styles.colValue}>{item.product.stockLevel} units</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.colLabel}>Daily Run-Rate</Text>
                    <Text style={styles.colValue}>{item.dailyVelocity}/day</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.colLabel}>Estimated Run-Out</Text>
                    <Text
                      style={[
                        styles.colValue,
                        item.daysCoverage !== null && item.daysCoverage <= 5 && { color: '#dc2626' },
                      ]}
                    >
                      {item.daysCoverage !== null ? `${item.daysCoverage} days` : 'No sales'}
                    </Text>
                  </View>
                </View>

                {/* Reorder Recommendation Box if Applicable */}
                {item.recommendedReorder > 0 && (
                  <View style={styles.recommendationBox}>
                    <Ionicons name="flash-outline" size={16} color="#d97706" style={{ marginRight: 6 }} />
                    <Text style={styles.recommendationText}>
                      Suggested Purchase Order: Reorder{' '}
                      <Text style={{ fontWeight: '700' }}>{item.recommendedReorder} units</Text> to maintain
                      safety threshold.
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={44} color="#16a34a" />
              <Text style={styles.emptyTitle}>All stock levels are optimal</Text>
              <Text style={styles.emptySub}>No replenishment actions required currently</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  bannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  activeFilterBtn: {
    backgroundColor: '#2563eb',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  activeFilterBtnText: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  categoryText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeCritical: {
    backgroundColor: '#ffe4e6',
  },
  badgeReorder: {
    backgroundColor: '#fef3c7',
  },
  badgeHealthy: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textCritical: {
    color: '#e11d48',
  },
  textReorder: {
    color: '#d97706',
  },
  textHealthy: {
    color: '#15803d',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  gridCol: {
    flex: 1,
  },
  colLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  colValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  recommendationText: {
    fontSize: 11,
    color: '#92400e',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
});
