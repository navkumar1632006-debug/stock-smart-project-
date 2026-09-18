import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { inventoryApi } from '../lib/api/inventoryApi';

export const NotificationsScreen = () => {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    inventoryApi.getProducts().then(products => {
      const lowStockAlerts = products
        .filter(p => p.stockLevel <= p.reorderPoint)
        .map(p => ({
          id: p.id,
          title: 'Low Stock Warning',
          message: `${p.name} (SKU: ${p.sku}) is at ${p.stockLevel} units (reorder point: ${p.reorderPoint}).`,
          type: 'warning'
        }));
      setAlerts(lowStockAlerts);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications & System Alerts</Text>
      <FlatList
        data={alerts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.alertTitle}>{item.title}</Text>
            <Text style={styles.alertMessage}>{item.message}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
  card: { padding: 12, backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  alertTitle: { fontSize: 14, fontWeight: 'bold', color: '#991B1B' },
  alertMessage: { fontSize: 12, color: '#7F1D1D', marginTop: 2 },
});
