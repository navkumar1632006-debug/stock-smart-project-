import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { inventoryApi } from '../lib/api/inventoryApi';
import { InventoryBatch } from '../types/retail';

export const InventoryScreen = () => {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    try {
      setLoading(true);
      const data = await inventoryApi.getBatches();
      setBatches(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366F1" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Inventory & FEFO Batch Tracking</Text>
      <FlatList
        data={batches}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.productName}>{item.productName}</Text>
              <Text style={styles.batchSub}>Batch #{item.batchNumber} | Expiry: {new Date(item.expiryDate).toLocaleDateString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.qtyText}>{item.currentQuantity} units</Text>
              {item.discountRate > 0 && (
                <Text style={styles.discountBadge}>{(item.discountRate * 100).toFixed(0)}% Markdown</Text>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  productName: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  batchSub: { fontSize: 12, color: '#64748B' },
  qtyText: { fontSize: 16, fontWeight: 'bold', color: '#4F46E5' },
  discountBadge: { fontSize: 10, color: '#EF4444', fontWeight: 'bold', marginTop: 2 },
});
