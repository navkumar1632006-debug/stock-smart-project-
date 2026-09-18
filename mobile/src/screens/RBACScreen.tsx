import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { rbacApi } from '../lib/api/rbacApi';

export const RBACScreen = () => {
  const [role, setRole] = useState<string>('cashier');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('cashier');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    rbacApi.getCurrentUserRole().then(r => setRole(r));
  }, []);

  async function handleInvite() {
    if (!email) return;
    try {
      setLoading(true);
      await rbacApi.inviteStaff(email, selectedRole);
      Alert.alert('Invitation Sent', `Staff invitation sent to ${email} as ${selectedRole}.`);
      setEmail('');
    } catch (e: any) {
      Alert.alert('Invite Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  if (role !== 'owner') {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>RBAC & Staff Management</Text>
        <View style={styles.lockBox}>
          <Text style={styles.lockText}>Access Restricted</Text>
          <Text style={styles.subText}>Only store Owners are permitted to manage staff access.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>RBAC & Staff Management</Text>
      <Text style={styles.subText}>Invite staff member by email and assign database-enforced store role.</Text>

      <TextInput
        style={styles.input}
        placeholder="Staff Email Address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <View style={styles.rolePicker}>
        {['manager', 'cashier', 'inventory_clerk'].map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.roleBtn, selectedRole === r && styles.activeRoleBtn]}
            onPress={() => setSelectedRole(r)}
          >
            <Text style={[styles.roleBtnText, selectedRole === r && styles.activeRoleBtnText]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.inviteBtn, (!email || loading) && styles.disabledBtn]}
        disabled={!email || loading}
        onPress={handleInvite}
      >
        <Text style={styles.btnText}>{loading ? 'Inviting...' : 'Send Staff Invitation'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  subText: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  lockBox: { padding: 20, backgroundColor: '#FEF2F2', borderRadius: 8, marginTop: 20 },
  lockText: { fontSize: 16, fontWeight: 'bold', color: '#991B1B' },
  input: { height: 48, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#FFFFFF', marginBottom: 12 },
  rolePicker: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, backgroundColor: '#E2E8F0', alignItems: 'center' },
  activeRoleBtn: { backgroundColor: '#6366F1' },
  roleBtnText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  activeRoleBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
  inviteBtn: { backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#9CA3AF' },
  btnText: { color: '#FFFFFF', fontWeight: 'bold' },
});
