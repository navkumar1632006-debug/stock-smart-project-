import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { inventoryApi } from '../lib/api/inventoryApi';
import { salesApi } from '../lib/api/salesApi';
import { Product } from '../types/retail';

export const POSScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await inventoryApi.getProducts();
      setProducts(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  function addToCart(product: Product) {
    if (product.stockLevel <= 0) {
      Alert.alert('Out of Stock', 'This product has 0 available inventory.');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockLevel) {
          Alert.alert('Stock Limit Reached', `Only ${product.stockLevel} units available.`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    try {
      setProcessing(true);
      for (const item of cart) {
        await salesApi.processSale(item.product.id, item.quantity, 'In-Store POS');
      }
      Alert.alert('Success', 'POS sale transaction processed successfully!');
      setCart([]);
      loadProducts();
    } catch (e: any) {
      Alert.alert('Checkout Failed', e.message || 'Transaction aborted.');
    } finally {
      setProcessing(false);
    }
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366F1" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Point of Sale (POS Checkout)</Text>
      
      <Text style={styles.sectionTitle}>Select Products</Text>
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        style={styles.productList}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
            <View>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.skuText}>SKU: {item.sku} | Stock: {item.stockLevel}</Text>
            </View>
            <Text style={styles.priceText}>₹{item.price.toFixed(2)}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.cartContainer}>
        <Text style={styles.cartHeader}>Cart Summary ({cart.length} items)</Text>
        <Text style={styles.totalText}>Total: ₹{totalAmount.toFixed(2)}</Text>
        <TouchableOpacity
          style={[styles.checkoutBtn, (cart.length === 0 || processing) && styles.disabledBtn]}
          disabled={cart.length === 0 || processing}
          onPress={handleCheckout}
        >
          <Text style={styles.btnText}>{processing ? 'Processing RPC...' : 'Complete Sale'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  productList: { flex: 1 },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  productName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  skuText: { fontSize: 12, color: '#64748B' },
  priceText: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
  cartContainer: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, marginTop: 8, elevation: 3 },
  cartHeader: { fontSize: 14, color: '#64748B' },
  totalText: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginVertical: 6 },
  checkoutBtn: { backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#9CA3AF' },
  btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
