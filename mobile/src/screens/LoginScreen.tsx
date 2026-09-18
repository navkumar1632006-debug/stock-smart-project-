import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { authApi } from '../lib/api/authApi';

export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await authApi.signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Login Error', error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>StockSmart AI</Text>
      <TextInput
        style={styles.input}
        onChangeText={setEmail}
        value={email}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        onChangeText={setPassword}
        value={password}
        secureTextEntry={true}
        placeholder="Password"
        autoCapitalize="none"
      />
      <Button title="Sign in" disabled={loading || !email || !password} onPress={signInWithEmail} />
      <View style={styles.linkContainer}>
        <Text style={styles.linkText} onPress={() => navigation.navigate('Signup')}>
          Create Account
        </Text>
        <Text style={styles.linkText} onPress={() => navigation.navigate('ResetPassword')}>
          Forgot Password?
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#0f172a',
  },
  input: {
    height: 50,
    borderColor: '#cbd5e1',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  linkContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 14,
  },
});

