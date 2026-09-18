import { supabase } from '../supabase';

export interface MarketplaceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  discountedPrice: number;
  discountRate: number;
  storeName: string;
}

export const marketplaceApi = {
  async getMarketplaceItems(): Promise<MarketplaceItem[]> {
    // Query public fresh/near-expiry products without leaking cost/margins
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, price, is_fresh_product, stores(name)')
      .eq('is_fresh_product', true)
      .limit(20);

    if (error) throw error;

    return (data || []).map((p: any) => {
      const discountRate = 0.2; // 20% discount on fresh/near-expiry marketplace stock
      return {
        id: p.id,
        name: p.name,
        category: p.category || 'Grocery',
        price: p.price,
        discountedPrice: p.price * (1 - discountRate),
        discountRate,
        storeName: p.stores?.name || 'Local Kirana Store'
      };
    });
  }
};
