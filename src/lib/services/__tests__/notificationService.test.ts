import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from '../notificationService';
import { supabase } from '../../supabase/client';
import { storeService } from '../storeService';
import { authApi } from '../../api/authApi';

vi.mock('../../supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  }
}));

vi.mock('../storeService', () => ({
  storeService: {
    getCurrentStoreId: vi.fn(),
  }
}));

vi.mock('../../api/authApi', () => ({
  authApi: {
    getSession: vi.fn(),
  }
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getNotifications should return mapped data', async () => {
    (storeService.getCurrentStoreId as any).mockResolvedValue('test-store');
    (authApi.getSession as any).mockResolvedValue({ user: { id: 'test-user' } });

    const mockLimit = vi.fn().mockResolvedValue({
      data: [{
        id: 'n1', type: 'low_stock', title: 'Low Stock', message: 'Item low',
        read_at: null, created_at: '2023-01-01'
      }],
      error: null
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEqUser = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEqStore = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqStore });

    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const result = await notificationService.getNotifications();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Low Stock');
    expect(result[0].readAt).toBeNull();
  });

  it('createSystemNotification should insert notification', async () => {
    (storeService.getCurrentStoreId as any).mockResolvedValue('test-store');
    (authApi.getSession as any).mockResolvedValue({ user: { id: 'test-user' } });

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any).mockReturnValue({ insert: mockInsert });

    await notificationService.createSystemNotification('test_type', 'Test Title', 'Test Msg');

    expect(mockInsert).toHaveBeenCalledWith([{
      store_id: 'test-store',
      user_id: 'test-user',
      type: 'test_type',
      title: 'Test Title',
      message: 'Test Msg'
    }]);
  });
});
