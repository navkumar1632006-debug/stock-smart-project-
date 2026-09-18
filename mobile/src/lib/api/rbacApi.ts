import { supabase } from '../supabase';
import { storeApi } from './storeApi';

export const rbacApi = {
  async getCurrentUserRole(): Promise<'owner' | 'manager' | 'cashier' | 'inventory_clerk'> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return 'cashier';

    const storeId = await storeApi.getCurrentStoreId();
    
    // Check if store owner
    const { data: store } = await supabase
      .from('stores')
      .select('owner_id')
      .eq('id', storeId)
      .single();

    if (store?.owner_id === session.user.id) {
      return 'owner';
    }

    // Query store_staff
    const { data: staff } = await supabase
      .from('store_staff')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    return (staff?.role as any) || 'cashier';
  },

  async inviteStaff(email: string, role: string): Promise<any> {
    const storeId = await storeApi.getCurrentStoreId();
    const { data, error } = await supabase.rpc('invite_staff_by_email', {
      p_email: email,
      p_role: role,
      p_store_id: storeId
    });

    if (error) throw error;
    return data;
  }
};
