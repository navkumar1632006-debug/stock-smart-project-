import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rbacService } from '../rbacService';
import { supabase } from '../../supabase/client';

vi.mock('../../supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('rbacService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStoreStaff', () => {
    it('fetches store staff ordered by created_at descending', async () => {
      const mockStaffData = [
        { id: 'staff-1', store_id: 'store-100', user_id: 'user-1', role: 'cashier', status: 'active', created_at: '2026-08-31T00:00:00Z' }
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockStaffData, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const res = await rbacService.getStoreStaff('store-100');

      expect(supabase.from).toHaveBeenCalledWith('store_staff');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('store_id', 'store-100');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(res).toEqual(mockStaffData);
    });

    it('throws error if database query fails', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await expect(rbacService.getStoreStaff('store-100')).rejects.toThrow('DB Error');
    });
  });

  describe('inviteStaff', () => {
    it('invokes invite_staff_by_email RPC with normalized payload', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: { success: true, message: 'Staff successfully invited and activated.' },
        error: null
      });

      const res = await rbacService.inviteStaff('store-100', 'staff@example.com', 'cashier');

      expect(supabase.rpc).toHaveBeenCalledWith('invite_staff_by_email', {
        staff_email: 'staff@example.com',
        assigned_role: 'cashier',
        target_store_id: 'store-100'
      });
      expect(res.success).toBe(true);
    });

    it('handles RPC errors gracefully', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'User not found. The staff member must create an account first.' }
      });

      await expect(rbacService.inviteStaff('store-100', 'missing@example.com', 'cashier'))
        .rejects.toThrow('User not found. The staff member must create an account first.');
    });
  });

  describe('revokeStaffAccess', () => {
    it('deletes staff record by id', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      await rbacService.revokeStaffAccess('staff-1');

      expect(supabase.from).toHaveBeenCalledWith('store_staff');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'staff-1');
    });
  });

  describe('getCurrentUserRole', () => {
    it('returns null if no authenticated user', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });

      const role = await rbacService.getCurrentUserRole('store-100');
      expect(role).toBeNull();
    });

    it('returns owner if user matches stores.owner_id', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'owner-uuid' } } });

      const mockSingle = vi.fn().mockResolvedValue({
        data: { owner_id: 'owner-uuid' },
        error: null
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'stores') {
          return { select: mockSelect };
        }
      });

      const role = await rbacService.getCurrentUserRole('store-100');
      expect(role).toBe('owner');
    });

    it('returns assigned staff role if user is active staff', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'staff-uuid' } } });

      // Store check returns non-owner
      const mockStoreSingle = vi.fn().mockResolvedValue({
        data: { owner_id: 'other-owner-uuid' },
        error: null
      });
      const mockStoreEq = vi.fn().mockReturnValue({ single: mockStoreSingle });
      const mockStoreSelect = vi.fn().mockReturnValue({ eq: mockStoreEq });

      // Staff check returns active cashier
      const mockStaffSingle = vi.fn().mockResolvedValue({
        data: { role: 'cashier' },
        error: null
      });
      const mockStaffEqStatus = vi.fn().mockReturnValue({ single: mockStaffSingle });
      const mockStaffEqUser = vi.fn().mockReturnValue({ eq: mockStaffEqStatus });
      const mockStaffEqStore = vi.fn().mockReturnValue({ eq: mockStaffEqUser });
      const mockStaffSelect = vi.fn().mockReturnValue({ eq: mockStaffEqStore });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'stores') return { select: mockStoreSelect };
        if (table === 'store_staff') return { select: mockStaffSelect };
      });

      const role = await rbacService.getCurrentUserRole('store-100');
      expect(role).toBe('cashier');
    });
  });
});
