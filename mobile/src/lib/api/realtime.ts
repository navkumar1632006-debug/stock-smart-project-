import { supabase } from '../supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

class CentralizedRealtimeManager {
  private activeChannels: Map<string, RealtimeChannel> = new Map();

  subscribeToStoreData(storeId: string, onUpdate: (table: string, payload: any) => void) {
    const channelName = `store_realtime_${storeId}`;

    // Clean up existing channel if re-subscribing for same store
    if (this.activeChannels.has(channelName)) {
      const existingChannel = this.activeChannels.get(channelName);
      if (existingChannel) {
        supabase.removeChannel(existingChannel);
      }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `store_id=eq.${storeId}` },
        (payload) => onUpdate('products', payload)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales', filter: `store_id=eq.${storeId}` },
        (payload) => onUpdate('sales', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'batches', filter: `store_id=eq.${storeId}` },
        (payload) => onUpdate('batches', payload)
      )
      .subscribe();

    this.activeChannels.set(channelName, channel);

    return () => {
      const active = this.activeChannels.get(channelName);
      if (active) {
        supabase.removeChannel(active);
        this.activeChannels.delete(channelName);
      }
    };
  }

  unsubscribeAll() {
    this.activeChannels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.activeChannels.clear();
  }
}

export const realtimeApi = new CentralizedRealtimeManager();
