import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supplierApi, Supplier } from '../lib/api/supplierApi';

export const SuppliersScreen = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplierApi.getSuppliers().then(data => {
      setSuppliers(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366F1" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Supplier Directory</Text>
      <FlatList
        data={suppliers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.nameText}>{item.name}</Text>
              <Text style={styles.subText}>{item.contactInfo || 'No contact details'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.scoreText}>{item.reliabilityScore}% Score</Text>
              <Text style={styles.verifiedTag}>Verified Supplier</Text>
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
  nameText: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  subText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  scoreText: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
  verifiedTag: { fontSize: 10, color: '#6366F1', fontWeight: 'bold' },
});
