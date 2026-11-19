import { describe, it, expect, vi, beforeEach } from 'vitest';
import { procurementService } from '../procurementService';
import { supabase } from '../../supabase/client';
import { storeService } from '../storeService';

// Mock Supabase client
vi.mock('../../supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

vi.mock('../storeService', () => ({
  storeService: {
    getCurrentStoreId: vi.fn()
  }
}));

describe('procurementService', () => {
  const mockStoreId = 'test-store-id';

  beforeEach(() => {
    vi.clearAllMocks();
    (storeService.getCurrentStoreId as any).mockResolvedValue(mockStoreId);
  });

  describe('createPurchaseOrder', () => {
    it('creates a PO and items properly', async () => {
      const mockPoId = 'po-123';
      
      const mockInsertPO = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: mockPoId }, error: null })
        })
      });

      const mockInsertItems = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'purchase_orders') return { insert: mockInsertPO };
        if (table === 'purchase_order_items') return { insert: mockInsertItems };
        return {};
      });

      const result = await procurementService.createPurchaseOrder('sup-1', 'Notes', [
        { productId: 'p1', quantityOrdered: 10, unitCost: 100 }
      ]);

      expect(result).toBe(mockPoId);
      expect(mockInsertPO).toHaveBeenCalled();
      expect(mockInsertItems).toHaveBeenCalledWith([{
        purchase_order_id: mockPoId,
        product_id: 'p1',
        quantity_ordered: 10,
        unit_cost: 100
      }]);
    });
  });

  describe('receiveStock', () => {
    it('calls the receive_purchase_order RPC', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: { success: true, new_status: 'received' }, error: null });

      const result = await procurementService.receiveStock('po-1', 'item-1', 10);
      
      expect(supabase.rpc).toHaveBeenCalledWith('receive_purchase_order', expect.objectContaining({
        p_store_id: mockStoreId,
        p_po_id: 'po-1',
        p_item_id: 'item-1',
        p_receive_quantity: 10
      }));
      expect(result.success).toBe(true);
    });
  });
});
