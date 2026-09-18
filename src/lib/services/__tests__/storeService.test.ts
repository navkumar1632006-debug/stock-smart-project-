import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storeService } from '../storeService';
import { supabase } from '../../supabase/client';

// Mock Supabase client
vi.mock('../../supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  }
}));

describe('storeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws "Authentication required." when there is no active session', async () => {
    // Mock getSession to return null user
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null
    });

    await expect(storeService.getCurrentStoreId()).rejects.toThrow('Authentication required.');
  });

  it('throws "Authentication required." when getSession returns an error', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: new Error('Network error')
    });

    await expect(storeService.getCurrentStoreId()).rejects.toThrow('Authentication required.');
  });

  it('throws "No store is associated with this account." when user has no store', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'test-user-uuid' } } },
      error: null
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null // or some error code for no rows found
    });
    const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    await expect(storeService.getCurrentStoreId()).rejects.toThrow('No store is associated with this account.');
    
    // Verify it queried with the right user ID
    expect(supabase.from).toHaveBeenCalledWith('stores');
    expect(mockEq).toHaveBeenCalledWith('owner_id', 'test-user-uuid');
  });

  it('returns store.id when a valid store exists', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'test-user-uuid' } } },
      error: null
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'test-store-uuid' },
      error: null
    });
    const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const storeId = await storeService.getCurrentStoreId();
    expect(storeId).toBe('test-store-uuid');
  });
});
