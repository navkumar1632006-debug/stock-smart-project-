import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, FlatList } from 'react-native';
import { supabase } from '../lib/supabase';
import { Product } from '../types/retail';

export function DashboardScreen() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase.from('products').select('*').limit(10);
    if (!error && data) {
      const mapped = data.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        sku: row.sku,
        price: row.price,
        cost: row.cost,
        stockLevel: row.stock_level,
        reorderPoint: row.reorder_point,
      }));
      setProducts(mapped);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory Overview</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text>Stock: {item.stockLevel} | Price: ₹{item.price}</Text>
          </View>
        )}
      />
      <Button title="Sign Out" onPress={signOut} color="#ef4444" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#0f172a',
  },
  item: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
});
