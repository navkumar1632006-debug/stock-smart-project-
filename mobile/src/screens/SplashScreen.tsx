import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>StockSmart AI</Text>
      <Text style={styles.tagline}>Hyperlocal Retail Intelligence</Text>
      <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 24 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
});
