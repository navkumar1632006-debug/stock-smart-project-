import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Store {
  id: string;
  name: string;
  location: string | null;
}

export const storeApi = {
  async getStores(): Promise<Store[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Authentication required.");

    const { data, error } = await supabase
      .from('stores')
      .select('id, name, location')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      const { data: newStore, error: createError } = await supabase
        .from('stores')
        .insert([{
          owner_id: session.user.id,
          name: 'My Retail Store',
          location: 'Main Location'
        }])
        .select('id, name, location')
        .single();

      if (createError || !newStore) {
        throw new Error("Failed to provision default store.");
      }
      return [newStore];
    }

    return data;
  },

  async getCurrentStoreId(): Promise<string> {
    const stores = await this.getStores();
    const storedId = await AsyncStorage.getItem('stocksmart_active_store_id');
    if (storedId && stores.some(s => s.id === storedId)) {
      return storedId;
    }
    const defaultStoreId = stores[0].id;
    await AsyncStorage.setItem('stocksmart_active_store_id', defaultStoreId);
    return defaultStoreId;
  },

  async setActiveStore(storeId: string): Promise<void> {
    const stores = await this.getStores();
    if (stores.some(s => s.id === storeId)) {
      await AsyncStorage.setItem('stocksmart_active_store_id', storeId);
    } else {
      throw new Error("Unauthorized store selection.");
    }
  }
};
