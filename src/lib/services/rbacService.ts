import { supabase } from '../supabase/client';

export interface StoreStaff {
  id: string;
  store_id: string;
  user_id: string;
  role: 'manager' | 'cashier' | 'inventory_clerk';
  status: 'pending' | 'active';
  created_at: string;
  // Join properties
  auth_email?: string; 
}

export const rbacService = {
  /**
   * Fetches all staff assigned to a specific store
   */
  async getStoreStaff(storeId: string): Promise<StoreStaff[]> {
    const { data, error } = await supabase
      .from('store_staff')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Invites a new staff member by email using the secure RPC
   */
  async inviteStaff(storeId: string, email: string, role: string): Promise<{success: boolean, message: string}> {
    const { data, error } = await supabase.rpc('invite_staff_by_email', {
      staff_email: email,
      assigned_role: role,
      target_store_id: storeId
    });

    if (error) {
      console.error("Invite error:", error);
      throw new Error(error.message || 'Failed to invite staff member.');
    }

    return data;
  },

  /**
   * Revokes access (deletes the staff record)
   */
  async revokeStaffAccess(staffId: string): Promise<void> {
    const { error } = await supabase
      .from('store_staff')
      .delete()
      .eq('id', staffId);

    if (error) throw error;
  },

  /**
   * Fetches the current authenticated user's highest role for a specific store.
   * Returns 'owner' if they own the store, otherwise their assigned role, or null if no access.
   */
  async getCurrentUserRole(storeId: string): Promise<'owner' | 'manager' | 'cashier' | 'inventory_clerk' | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1. Check if owner
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('owner_id')
      .eq('id', storeId)
      .single();

    if (!storeError && store && store.owner_id === user.id) {
      return 'owner';
    }

    // 2. Check store_staff role
    const { data: staff, error: staffError } = await supabase
      .from('store_staff')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!staffError && staff) {
      return staff.role as any;
    }

    return null;
  }
};
