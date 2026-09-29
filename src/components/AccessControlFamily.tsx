import React, { useState, useEffect } from 'react';
import { Shield, UserCheck, Key, ShieldCheck, Check, UserPlus, Info, Loader2 } from 'lucide-react';
import { FamilyAccountUser, StoreRole } from '../types/retail';
import { storeService } from '../lib/services/storeService';
import { rbacService, StoreStaff } from '../lib/services/rbacService';

interface AccessControlFamilyProps {
  currentRole: StoreRole;
  onRoleChange: (role: StoreRole) => void;
}

export const AccessControlFamily: React.FC<AccessControlFamilyProps> = ({ currentRole, onRoleChange }) => {
  const [users, setUsers] = useState<StoreStaff[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<StoreRole>('Staff');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const storeId = await storeService.getCurrentStoreId();
      if (storeId) {
        const staff = await rbacService.getStoreStaff(storeId);
        setUsers(staff);
      }
    } catch (e) {
      console.error('Error fetching staff:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail) return;

    setIsLoading(true);
    setError(null);
    try {
      const storeId = await storeService.getCurrentStoreId();
      if (!storeId) throw new Error("No active store found");
      
      const mappedRole = newUserRole === 'Staff' ? 'inventory_clerk' : newUserRole.toLowerCase();
      await rbacService.inviteStaff(storeId, newUserEmail, mappedRole);

      setNewUserEmail('');
      fetchUsers();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to invite user");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Owner': return 'bg-rose-50 border-rose-200 text-rose-600';
      case 'Manager': return 'bg-amber-50 border-amber-200 text-amber-600';
      case 'Cashier': return 'bg-indigo-500/10 border-indigo-200 text-indigo-600';
      case 'Staff': return 'bg-slate-500/10 border-slate-500/20 text-slate-500/90';
    }
  };

  return (
    <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 space-y-4">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-200/30 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-indigo-600/10 rounded-2xl border border-indigo-200">
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-900 tracking-wider">Family accounts & RBAC</h3>
            <p className="text-[10px] text-slate-500/90 font-mono">Permission-based access levels for store employees</p>
          </div>
        </div>
        
        {/* Active Role Indicator */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/30 px-3 py-1.5 rounded-2xl">
          <Key className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span className="text-[10px] font-mono text-slate-400 font-medium uppercase">Active Identity:</span>
          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase ${getRoleBadgeColor(currentRole)}`}>
            {currentRole}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Switch Identity simulation */}
        <div className="bg-slate-50/30 border border-slate-200/30 p-6 rounded-2xl space-y-3.5">
          <div>
            <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Identity Simulator</span>
            </h4>
            <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">Toggle active user role to view authorization constraints</p>
          </div>

          <div className="space-y-2">
            {(['Owner', 'Manager', 'Cashier', 'Staff'] as StoreRole[]).map((role) => (
              <button
                key={role}
                onClick={() => onRoleChange(role)}
                className={`w-full p-2.5 rounded-2xl border text-xs font-semibold uppercase tracking-wider flex items-center justify-between transition-all ${
                  currentRole === role
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg'
                    : 'bg-white shadow-sm border border-slate-200 rounded-2xl border-slate-200/30 text-slate-500/90 hover:border-slate-200/50 hover:text-slate-900'
                }`}
              >
                <span>{role} Console</span>
                {currentRole === role && <Check className="w-3.5 h-3.5 text-slate-900" />}
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Active Users roster */}
        <div className="bg-slate-50/30 border border-slate-200/30 p-6 rounded-2xl space-y-3">
          <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Active Store Staff Members</span>
          </h4>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {users.map((user) => (
              <div key={user.id} className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 p-2 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-slate-800">{user.auth_email || 'Pending User'}</span>
                  <p className="text-[9px] text-slate-400 font-mono">{user.status}</p>
                </div>
                <span className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded border uppercase font-semibold ${getRoleBadgeColor(user.role === 'inventory_clerk' ? 'Staff' : user.role)}`}>
                  {user.role === 'inventory_clerk' ? 'Staff' : user.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Add new user */}
        <div className="bg-slate-50/30 border border-slate-200/30 p-6 rounded-2xl space-y-3">
          <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
            <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Add Family / Staff Member</span>
          </h4>

          <form onSubmit={handleAddUser} className="space-y-2 font-mono text-[10.5px]">
            {error && <div className="text-red-500 text-[10px] mb-1">{error}</div>}
            <input
              type="email"
              placeholder="staff@example.com"
              value={newUserEmail}
              onChange={e => setNewUserEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/30 focus:border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
              required
            />
            
            <div className="flex gap-2">
              <select
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value as StoreRole)}
                className="flex-1 bg-slate-50 border border-slate-200/30 rounded-xl px-2 py-1 text-xs text-slate-700 focus:outline-none"
              >
                <option value="Manager">Manager</option>
                <option value="Cashier">Cashier</option>
                <option value="Staff">Staff</option>
              </select>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1 rounded-xl text-xs uppercase transition disabled:opacity-50 flex items-center justify-center min-w-[70px]"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Enroll'}
              </button>
            </div>
          </form>

          {/* RBAC Info matrix */}
          <div className="p-2 bg-indigo-500/5 rounded-2xl text-[9px] font-mono text-indigo-600 leading-relaxed flex items-start space-x-1">
            <Info className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <span>Managers can edit stock. Cashiers execute in-store register sales. Staff can scan shelves. Only Owners approve B2B POs.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
