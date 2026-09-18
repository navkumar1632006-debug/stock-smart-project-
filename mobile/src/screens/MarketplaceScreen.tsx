import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { marketplaceApi, MarketplaceItem } from '../lib/api/marketplaceApi';

export const MarketplaceScreen = () => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketplaceApi.getMarketplaceItems().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366F1" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Hyperlocal Marketplace</Text>
      <Text style={styles.subHeader}>Nearby fresh & near-expiry discounted items</Text>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.nameText}>{item.name}</Text>
              <Text style={styles.storeText}>{item.storeName} | {item.category}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.discPrice}>₹{item.discountedPrice.toFixed(2)}</Text>
              <Text style={styles.origPrice}>₹{item.price.toFixed(2)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  subHeader: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  card: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, marginBottom: 8, elevation: 1 },
  nameText: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  storeText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  discPrice: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
  origPrice: { fontSize: 12, color: '#94A3B8', textDecorationLine: 'line-through' },
});
