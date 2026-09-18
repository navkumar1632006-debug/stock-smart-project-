import { supabase } from '../supabase/client';

export const storeService = {
  /**
   * Resolves the current authenticated user's store_id from the database.
   * Throws controlled errors if unauthenticated or no store exists.
   */
  async getCurrentStoreId(): Promise<string> {
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
    
    return store.id;
  }
};
