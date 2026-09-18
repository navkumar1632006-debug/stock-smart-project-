import { supabase } from '../supabase/client';
import { storeService } from './storeService';
import { Supplier } from '../../types/retail';

export const supplierService = {
  async getSuppliers(): Promise<Supplier[]> {
    const storeId = await storeService.getCurrentStoreId();

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', storeId)
      .order('name');

    if (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error('Failed to load suppliers.');
    }

    return (data || []).map(row => ({
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      contactInfo: row.contact_info || '',
      reliabilityScore: row.reliability_score
    }));
  },

  async addSupplier(name: string, contactInfo: string): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();

    const { error } = await supabase
      .from('suppliers')
      .insert([{
        store_id: storeId,
        name,
        contact_info: contactInfo,
        reliability_score: 100 // default max score for new
      }]);

    if (error) {
      console.error('Failed to add supplier:', error);
      throw new Error(`Failed to add supplier. Error: ${error.message}`);
    }
  },

  async updateSupplier(id: string, name: string, contactInfo: string): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();

    const { error } = await supabase
      .from('suppliers')
      .update({ name, contact_info: contactInfo })
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) {
      console.error('Failed to update supplier:', error);
      throw new Error(`Failed to update supplier. Error: ${error.message}`);
    }
  },

  async deleteSupplier(id: string): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) {
      console.error('Failed to delete supplier:', error);
      throw new Error(`Failed to delete supplier. Error: ${error.message}`);
    }
  }
};
