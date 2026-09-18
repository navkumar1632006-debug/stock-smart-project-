import React, { useState, useEffect } from 'react';
import { Users, Shield, UserPlus, Trash2, ShieldCheck, Mail, ShieldAlert } from 'lucide-react';
import { storeService } from '../lib/services/storeService';
import { rbacService, StoreStaff } from '../lib/services/rbacService';

export const RBACDashboard: React.FC = () => {
  const [staff, setStaff] = useState<StoreStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'cashier' | 'inventory_clerk'>('cashier');
  const [inviteStatus, setInviteStatus] = useState<{ loading: boolean; error?: string; success?: string }>({ loading: false });
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const activeStoreId = await storeService.getCurrentStoreId();
      if (activeStoreId) {
        setStoreId(activeStoreId);
        await loadStaff(activeStoreId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStaff = async (sid: string) => {
    const data = await rbacService.getStoreStaff(sid);
    setStaff(data);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !inviteEmail) return;
    
    setInviteStatus({ loading: true });
    try {
      await rbacService.inviteStaff(storeId, inviteEmail, inviteRole);
      setInviteStatus({ loading: false, success: 'Staff member invited successfully.' });
      setInviteEmail('');
      await loadStaff(storeId);
    } catch (err: any) {
      setInviteStatus({ loading: false, error: err.message });
    }
  };

  const handleRevoke = async (staffId: string) => {
    if (!confirm('Are you sure you want to revoke access for this staff member?')) return;
    try {
      await rbacService.revokeStaffAccess(staffId);
      if (storeId) await loadStaff(storeId);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke access.');
    }
  };

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-200/30 space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-indigo-100 rounded-2xl">
          <Shield className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Staff & Roles (RBAC)</h2>
          <p className="text-sm text-slate-500 font-medium">Manage family members and employees.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/50">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center">
              <UserPlus className="w-4 h-4 mr-2 text-indigo-600" />
              Invite Staff
            </h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="staff@example.com"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">User must have created an account first.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assign Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                >
                  <option value="cashier">Cashier (POS & Invoices)</option>
                  <option value="inventory_clerk">Inventory Clerk (Stock Mgmt)</option>
                  <option value="manager">Manager (Full Ops Access)</option>
                </select>
              </div>

              {inviteStatus.error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 flex items-start">
                  <ShieldAlert className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{inviteStatus.error}</span>
                </div>
              )}
              {inviteStatus.success && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-600 flex items-start">
                  <ShieldCheck className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{inviteStatus.success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={inviteStatus.loading}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {inviteStatus.loading ? 'Inviting...' : 'Send Invite'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center">
                <Users className="w-4 h-4 mr-2 text-indigo-600" />
                Active Staff Directory
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">User ID</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={4} className="text-center py-8 text-slate-400">Loading...</td></tr>
                  ) : staff.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-sm">No staff members found.</td></tr>
                  ) : (
                    staff.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-slate-600">{s.user_id.split('-')[0]}...</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                            s.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                            s.role === 'cashier' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {s.role.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700">
                            {s.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleRevoke(s.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Revoke Access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
