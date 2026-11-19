import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { inventoryApi } from '../lib/api/inventoryApi';
import { storeApi } from '../lib/api/storeApi';
import { realtimeApi } from '../lib/api/realtime';
import { Product, InventoryBatch } from '../types/retail';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

export const InventoryScreen = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'batches'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    loadData();

    let unsubscribe: (() => void) | undefined;
    storeApi
      .getCurrentStoreId()
      .then((storeId) => {
        unsubscribe = realtimeApi.subscribeToStoreData(storeId, (_table, _payload) => {
          loadData();
        });
      })
      .catch((err) => console.warn('Inventory realtime warning:', err));

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [prods, bts] = await Promise.all([
        inventoryApi.getProducts().catch(() => []),
        inventoryApi.getBatches().catch(() => []),
      ]);
      setProducts(prods);
      setBatches(bts);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const filteredBatches = batches.filter((b) =>
    b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Switch Tab Buttons */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'products' && styles.activeTabButton]}
          onPress={() => setActiveTab('products')}
        >
          <Ionicons
            name="cube-outline"
            size={16}
            color={activeTab === 'products' ? '#2563eb' : '#64748b'}
          />
          <Text
            style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}
          >
            Products ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'batches' && styles.activeTabButton]}
          onPress={() => setActiveTab('batches')}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'batches' ? '#2563eb' : '#64748b'}
          />
          <Text
            style={[styles.tabText, activeTab === 'batches' && styles.activeTabText]}
          >
            FEFO Batches ({batches.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.inputField}
          placeholder={
            activeTab === 'products'
              ? 'Search by product name or SKU...'
              : 'Search batch number or item name...'
          }
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 6 }}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setScannerVisible(true)}
          style={{ padding: 4 }}
          accessibilityLabel="Scan barcode to filter inventory"
        >
          <Ionicons name="barcode-outline" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(code) => setSearchQuery(code)}
        title="Inventory Barcode Scanner"
      />

      {/* Category Pills (Product Mode) */}
      {activeTab === 'products' && (
        <View style={styles.categoriesRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  selectedCategory === item && styles.selectedCategoryPill,
                ]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === item && styles.selectedCategoryText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Main Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading inventory records...</Text>
        </View>
      ) : activeTab === 'products' ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
          renderItem={({ item }) => {
            const isLowStock = item.stockLevel <= item.reorderPoint;
            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.productName}>{item.name}</Text>
                    {item.isFreshProduct && (
                      <View style={styles.freshBadge}>
                        <Text style={styles.freshText}>Fresh</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.subtext}>
                    {item.category} • SKU: {item.sku}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={styles.reorderText}>
                      Reorder at: {item.reorderPoint} units
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.priceText}>₹{item.price.toFixed(2)}</Text>
                  <View
                    style={[
                      styles.stockBadge,
                      isLowStock ? styles.stockLow : styles.stockNormal,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockBadgeText,
                        isLowStock ? styles.stockTextLow : styles.stockTextNormal,
                      ]}
                    >
                      {item.stockLevel} in stock
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={38} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No matching products</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredBatches}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
          renderItem={({ item }) => {
            const daysLeft = Math.ceil(
              (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24)
            );
            const isCritical = daysLeft <= 3;
            const isNear = daysLeft <= 7;

            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.productName}</Text>
                  <Text style={styles.subtext}>Batch: {item.batchNumber}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color={isCritical ? '#dc2626' : isNear ? '#d97706' : '#64748b'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.expiryDateText,
                        isCritical && { color: '#dc2626', fontWeight: '700' },
                        isNear && !isCritical && { color: '#d97706' },
                      ]}
                    >
                      Exp: {new Date(item.expiryDate).toLocaleDateString()} ({daysLeft}d left)
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.qtyText}>{item.currentQuantity} units</Text>
                  {item.discountRate > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>
                        {(item.discountRate * 100).toFixed(0)}% Off (₹{item.discountedPrice.toFixed(0)})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={38} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No FEFO batches logged</Text>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#2563eb',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  categoriesRow: {
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
  },
  selectedCategoryPill: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  selectedCategoryText: {
    color: '#ffffff',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 13,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  freshBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  freshText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#16a34a',
    textTransform: 'uppercase',
  },
  subtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  reorderText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  stockNormal: {
    backgroundColor: '#f1f5f9',
  },
  stockLow: {
    backgroundColor: '#fef3c7',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stockTextNormal: {
    color: '#475569',
  },
  stockTextLow: {
    color: '#d97706',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  expiryDateText: {
    fontSize: 11,
    color: '#64748b',
  },
  discountBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
});
