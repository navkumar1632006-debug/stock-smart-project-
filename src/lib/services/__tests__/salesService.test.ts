import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salesService } from '../salesService';
import { supabase } from '../../supabase/client';
import { storeService } from '../storeService';

vi.mock('../../supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../storeService', () => ({
  storeService: {
    getCurrentStoreId: vi.fn(),
  },
}));

describe('salesService RPC Logic', () => {
  const mockStoreId = 'test-store-id';
  const mockProductId = 'test-product-id';

  beforeEach(() => {
    vi.clearAllMocks();
    (storeService.getCurrentStoreId as any).mockResolvedValue(mockStoreId);
  });

  it('should correctly format and call process_pos_sale RPC', async () => {
    // Mock product fetch for price
    const mockProductQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { price: 100, stock_level: 10 }, error: null }),
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'products') return mockProductQuery;
    });

    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });

    // PERFORM A SALE OF 3
    await salesService.recordSale(mockProductId, 3);

    // Verify it called RPC
    expect(supabase.rpc).toHaveBeenCalledWith('process_sale', expect.objectContaining({
      p_store_id: mockStoreId,
      p_product_id: 'test-product-id',
      p_quantity: 3,
      p_total_price: 300,
      p_channel: 'In-Store',
      p_idempotency_key: expect.any(String)
    }));
  });
});
