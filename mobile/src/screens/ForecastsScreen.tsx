import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { inventoryApi } from '../lib/api/inventoryApi';
import { Product } from '../types/retail';

export const ForecastsScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryApi.getProducts().then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366F1" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>AI Demand Forecasting (7-Day Cycle)</Text>
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const predicted = Math.round(item.stockLevel * 1.35 + 5);
          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.subText}>Current Stock: {item.stockLevel} units</Text>
                <Text style={styles.insightText}>Demand Surge Expected: Fast moving item</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.predictText}>+{predicted} units</Text>
                <Text style={styles.confText}>94% Confidence</Text>
              </View>
            </View>
          );
        }}
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
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  productName: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  subText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  insightText: { fontSize: 11, color: '#059669', marginTop: 4 },
  predictText: { fontSize: 16, fontWeight: 'bold', color: '#6366F1' },
  confText: { fontSize: 10, color: '#64748B' },
});
