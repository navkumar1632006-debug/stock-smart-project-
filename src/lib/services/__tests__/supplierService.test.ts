import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supplierService } from '../supplierService';
import { supabase } from '../../supabase/client';
import { storeService } from '../storeService';

vi.mock('../../supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  }
}));

vi.mock('../storeService', () => ({
  storeService: {
    getCurrentStoreId: vi.fn(),
  }
}));

describe('supplierService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSuppliers should fetch and map suppliers correctly', async () => {
    (storeService.getCurrentStoreId as any).mockResolvedValue('test-store-id');

    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        { id: 'sup-1', store_id: 'test-store-id', name: 'Supplier A', contact_info: '1234', reliability_score: 95 }
      ],
      error: null
    });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const result = await supplierService.getSuppliers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Supplier A');
    expect(result[0].contactInfo).toBe('1234');
    expect(supabase.from).toHaveBeenCalledWith('suppliers');
  });

  it('addSupplier should insert supplier with 100 default reliability score', async () => {
    (storeService.getCurrentStoreId as any).mockResolvedValue('test-store-id');

    const mockInsert = vi.fn().mockResolvedValue({
      error: null
    });
    (supabase.from as any).mockReturnValue({ insert: mockInsert });

    await supplierService.addSupplier('New Supplier', '9999');

    expect(mockInsert).toHaveBeenCalledWith([{
      store_id: 'test-store-id',
      name: 'New Supplier',
      contact_info: '9999',
      reliability_score: 100
    }]);
  });
});
