import { supabase } from '../supabase/client';
import { storeService } from './storeService';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../../types/retail';

export const procurementService = {
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const storeId = await storeService.getCurrentStoreId();

    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching purchase orders:', error);
      throw new Error('Failed to load purchase orders.');
    }

    return (data || []).map(row => ({
      id: row.id,
      storeId: row.store_id,
      supplierId: row.supplier_id,
      supplierName: row.suppliers?.name,
      poNumber: row.po_number,
      status: row.status as PurchaseOrderStatus,
      totalAmount: row.total_amount,
      orderedAt: row.ordered_at,
      expectedAt: row.expected_at,
      receivedAt: row.received_at,
      notes: row.notes
    }));
  },

  async getPurchaseOrderDetails(poId: string): Promise<{ po: PurchaseOrder; items: PurchaseOrderItem[] }> {
    const storeId = await storeService.getCurrentStoreId();

    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name)')
      .eq('id', poId)
      .eq('store_id', storeId)
      .single();

    if (poError) throw new Error('Failed to load purchase order.');

    const { data: itemsData, error: itemsError } = await supabase
      .from('purchase_order_items')
      .select('*, products(name)')
      .eq('purchase_order_id', poId);

    if (itemsError) throw new Error('Failed to load PO items.');

    const po: PurchaseOrder = {
      id: poData.id,
      storeId: poData.store_id,
      supplierId: poData.supplier_id,
      supplierName: poData.suppliers?.name,
      poNumber: poData.po_number,
      status: poData.status as PurchaseOrderStatus,
      totalAmount: poData.total_amount,
      orderedAt: poData.ordered_at,
      expectedAt: poData.expected_at,
      receivedAt: poData.received_at,
      notes: poData.notes
    };

    const items: PurchaseOrderItem[] = (itemsData || []).map(row => ({
      id: row.id,
      purchaseOrderId: row.purchase_order_id,
      productId: row.product_id,
      productName: row.products?.name,
      quantityOrdered: row.quantity_ordered,
      quantityReceived: row.quantity_received,
      unitCost: row.unit_cost
    }));

    return { po, items };
  },

  async createPurchaseOrder(
    supplierId: string, 
    notes: string, 
    items: Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId' | 'quantityReceived' | 'productName'>[]
  ): Promise<string> {
    const storeId = await storeService.getCurrentStoreId();
    
    // Generate simple PO number for local shop
    const poNumber = 'PO-' + Date.now().toString().slice(-6);
    
    const totalAmount = items.reduce((sum, item) => sum + (item.quantityOrdered * item.unitCost), 0);

    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert([{
        store_id: storeId,
        supplier_id: supplierId,
        po_number: poNumber,
        status: 'draft',
        total_amount: totalAmount,
        notes
      }])
      .select('id')
      .single();

    if (poError) throw new Error(`Failed to create PO: ${poError.message}`);

    const poItems = items.map(item => ({
      purchase_order_id: po.id,
      product_id: item.productId,
      quantity_ordered: item.quantityOrdered,
      unit_cost: item.unitCost
    }));

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(poItems);

    if (itemsError) throw new Error(`Failed to add PO items: ${itemsError.message}`);

    return po.id;
  },

  async updateOrderStatus(poId: string, newStatus: PurchaseOrderStatus): Promise<void> {
    const storeId = await storeService.getCurrentStoreId();
    
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'submitted') {
      updates.ordered_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', poId)
      .eq('store_id', storeId);

    if (error) throw new Error('Failed to update PO status.');
  },

  async receiveStock(poId: string, itemId: string, quantityToReceive: number): Promise<any> {
    const storeId = await storeService.getCurrentStoreId();

    const { data, error } = await supabase.rpc('receive_purchase_order', {
      p_store_id: storeId,
      p_po_id: poId,
      p_item_id: itemId,
      p_receive_quantity: quantityToReceive
    });

    if (error) throw new Error(`Failed to receive stock: ${error.message}`);
    return data;
  }
};
