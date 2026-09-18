import { supabase } from '../supabase/client';
import { storeService } from './storeService';
import { authApi } from '../api/authApi';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    const storeId = await storeService.getCurrentStoreId();
    const session = await authApi.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('store_id', storeId)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to load notifications:', error);
      throw error;
    }

    return (data || []).map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      readAt: row.read_at,
      createdAt: row.created_at
    }));
  },

  async markAsRead(notificationId: string): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();
    const session = await authApi.getSession();
    if (!session) return;

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('store_id', storeId)
      .eq('user_id', session.user.id);
  },

  async markAllAsRead(): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();
    const session = await authApi.getSession();
    if (!session) return;

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .eq('store_id', storeId)
      .eq('user_id', session.user.id);
  },

  async createSystemNotification(type: string, title: string, message: string): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();
    const session = await authApi.getSession();
    if (!session) return;

    await supabase
      .from('notifications')
      .insert([{
        store_id: storeId,
        user_id: session.user.id,
        type,
        title,
        message
      }]);
  },

  subscribeToNotifications(
    storeId: string, 
    userId: string, 
    onInsert: (notification: AppNotification) => void
  ) {
    const channel = supabase.channel(`notifications:store_${storeId}_user_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `store_id=eq.${storeId}`, // Supabase allows one filter per string usually. RLS covers user_id safely anyway, but we will rely on client filtering too if necessary.
        },
        (payload: any) => {
          // Double check user_id matching to prevent cross-contamination if RLS isn't strict enough for realtime
          if (payload.new && payload.new.user_id === userId) {
            onInsert({
              id: payload.new.id,
              type: payload.new.type,
              title: payload.new.title,
              message: payload.new.message,
              readAt: payload.new.read_at,
              createdAt: payload.new.created_at
            });
          }
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      }
    };
  }
};
