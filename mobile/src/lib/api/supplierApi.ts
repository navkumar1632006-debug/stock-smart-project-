import { supabase } from '../supabase';
import { storeApi } from './storeApi';

export interface Supplier {
  id: string;
  name: string;
  contactInfo: string | null;
  reliabilityScore: number;
}

export const supplierApi = {
  async getSuppliers(): Promise<Supplier[]> {
    const storeId = await storeApi.getCurrentStoreId();
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', storeId)
      .order('name');

    if (error) throw error;
    return (data || []).map(s => ({
      id: s.id,
      name: s.name,
      contactInfo: s.contact_info,
      reliabilityScore: s.reliability_score || 95
    }));
  },

  async createSupplier(name: string, contactInfo: string): Promise<Supplier> {
    const storeId = await storeApi.getCurrentStoreId();
    const { data, error } = await supabase
      .from('suppliers')
      .insert([{
        store_id: storeId,
        name,
        contact_info: contactInfo,
        reliability_score: 95
      }])
      .select()
      .single();

    if (error || !data) throw error || new Error("Failed to add supplier");
    return {
      id: data.id,
      name: data.name,
      contactInfo: data.contact_info,
      reliabilityScore: data.reliability_score
    };
  }
};
