import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { salesApi } from '../lib/api/salesApi';

export const InvoicesScreen = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    salesApi.getInvoices().then(data => {
      setInvoices(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366F1" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>GST Invoices & Records</Text>
      <FlatList
        data={invoices}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.invNumber}>INV #{item.invoice_number || item.id.substring(0, 8)}</Text>
              <Text style={styles.subText}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amountText}>₹{item.total_amount?.toFixed(2) || '0.00'}</Text>
              <Text style={styles.statusText}>{item.status || 'Paid'}</Text>
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
  card: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, marginBottom: 8, elevation: 1 },
  invNumber: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  subText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  amountText: { fontSize: 16, fontWeight: 'bold', color: '#4F46E5' },
  statusText: { fontSize: 10, color: '#059669', fontWeight: 'bold' },
});
