import { supabase } from '../supabase/client';

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  location: string | null;
  created_at: string;
}

let _activeStoreId: string | null = null;

export const storeService = {
  async getStores(): Promise<Store[]> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) throw new Error("Authentication required.");
    
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', session.user.id);
      
    if (error) throw error;
    return data || [];
  },

  async setActiveStore(storeId: string) {
    const stores = await this.getStores();
    const store = stores.find(s => s.id === storeId);
    if (!store) {
      throw new Error("Unauthorized: Store ID is not associated with this account.");
    }
    _activeStoreId = storeId;
    // Dispatch an event so the rest of the app can refresh
    window.dispatchEvent(new CustomEvent('store-changed', { detail: storeId }));
  },

  async createStore(name: string, location: string): Promise<Store> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) throw new Error("Authentication required.");

    const { data, error } = await supabase
      .from('stores')
      .insert([{ owner_id: session.user.id, name, location }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  /**
   * Resolves the current authenticated user's store_id from the database.
   * Throws controlled errors if unauthenticated or no store exists.
   */
  async getCurrentStoreId(): Promise<string> {
    if (_activeStoreId) return _activeStoreId;

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      throw new Error("Authentication required.");
    }
    
    // Resolve store by owner_id
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', session.user.id)
      .limit(1)
      .single();
      
    if (storeError || !store) {
      throw new Error("No store is associated with this account.");
    }
    
    _activeStoreId = store.id;
    return store.id;
  }
};
