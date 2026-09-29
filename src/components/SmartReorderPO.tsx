import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle2, IndianRupee, Truck, Loader, PackagePlus } from 'lucide-react';
import { Product, SaleRecord, Supplier, PurchaseOrder } from '../types/retail';
import { inventoryIntelligenceService, ReorderPO } from '../lib/services/inventoryIntelligenceService';
import { supplierService } from '../lib/services/supplierService';
import { procurementService } from '../lib/services/procurementService';

interface SmartReorderProps {
  products: Product[];
  salesLogs: SaleRecord[];
  onReorderSuccess?: () => void;
}

export const SmartReorderPO: React.FC<SmartReorderProps> = ({ products, salesLogs, onReorderSuccess }) => {
  const [draft, setDraft] = useState<ReorderPO | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [receivingPO, setReceivingPO] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const sups = await supplierService.getSuppliers();
      setSuppliers(sups);
      const generatedDraft = inventoryIntelligenceService.generateReorderPO(products, salesLogs, sups);
      setDraft(generatedDraft);
      
      const pos = await procurementService.getPurchaseOrders();
      setPendingPOs(pos.filter(p => ['draft', 'submitted', 'approved', 'partially_received'].includes(p.status)));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [products, salesLogs]);

  const handleCreatePOs = async () => {
    if (!draft || draft.items.length === 0) return;
    setIsProcessing(true);
    setSuccessMsg(null);

    try {
      const itemsBySupplier = new Map<string, typeof draft.items>();
      const unassigned = [];

      for (const item of draft.items) {
        if (!item.supplierId) {
          unassigned.push(item);
        } else {
          const list = itemsBySupplier.get(item.supplierId) || [];
          list.push(item);
          itemsBySupplier.set(item.supplierId, list);
        }
      }

      if (unassigned.length > 0) {
        throw new Error('Some items need supplier assignment first. Add a supplier to your system.');
      }

      for (const [supplierId, items] of itemsBySupplier.entries()) {
        const poItems = items.map(i => ({
          productId: i.productId,
          quantityOrdered: i.reorderQuantity,
          unitCost: i.unitCost
        }));
        const poId = await procurementService.createPurchaseOrder(supplierId, 'Auto-generated PO', poItems);
        await procurementService.updateOrderStatus(poId, 'submitted');
      }

      setSuccessMsg(`Purchase Orders Created successfully!`);
      
      if (onReorderSuccess) onReorderSuccess();

      setTimeout(() => {
        setSuccessMsg(null);
        fetchData();
      }, 3000);

    } catch (e: any) {
      alert("PO error: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiveStock = async (poId: string) => {
    setReceivingPO(poId);
    try {
      const details = await procurementService.getPurchaseOrderDetails(poId);
      
      // Auto receive all pending
      for (const item of details.items) {
        const pending = item.quantityOrdered - item.quantityReceived;
        if (pending > 0) {
          await procurementService.receiveStock(poId, item.id, pending);
        }
      }

      setSuccessMsg(`Stock Received successfully for PO!`);
      if (onReorderSuccess) onReorderSuccess();
      
      setTimeout(() => {
        setSuccessMsg(null);
        fetchData();
      }, 3000);
    } catch (e: any) {
      alert("Receive error: " + e.message);
    } finally {
      setReceivingPO(null);
    }
  };

  return (
    <div className="bg-white shadow-sm border border-slate-200/50 rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200/30 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-blue-600/10 rounded-2xl border border-blue-200">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-900 tracking-wider">Automated Procurement</h3>
            <p className="text-[10px] text-slate-500/90 font-mono">Real B2B Purchase Orders</p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-200 rounded-2xl p-6 flex items-start space-x-2 text-emerald-600 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center space-y-1.5">
          <Loader className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
          <p className="text-[10px] font-mono text-slate-400">Loading procurement data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active POs */}
          {pendingPOs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Active Purchase Orders</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {pendingPOs.map((po) => (
                  <div key={po.id} className="bg-slate-50/50 border border-slate-200/50 p-3 rounded-2xl flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-slate-800 text-xs">{po.poNumber}</h5>
                      <p className="text-[10px] text-slate-500 font-mono">Supplier: {po.supplierName} • {po.status}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right font-mono text-slate-700">
                        <p className="font-medium text-xs">₹{po.totalAmount}</p>
                      </div>
                      <button
                        onClick={() => handleReceiveStock(po.id)}
                        disabled={receivingPO === po.id}
                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors flex items-center space-x-1"
                      >
                        {receivingPO === po.id ? <Loader className="w-3 h-3 animate-spin" /> : <PackagePlus className="w-3 h-3" />}
                        <span>Receive</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft PO */}
          {draft && draft.items.length > 0 ? (
            <div className="space-y-3 pt-3 border-t border-slate-200/50">
              <h4 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Reorder Suggestions</h4>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {draft.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50/30 border border-slate-200/30 p-2.5 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-medium text-slate-700">{item.productName}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Supplier: {item.supplierName} • Qty: {item.reorderQuantity}</p>
                    </div>
                    <div className="text-right font-mono text-slate-700">
                      <p className="font-medium">₹{item.totalCost}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200/30 pt-3.5 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-900 font-medium text-[11.5px]">
                  <span>Total Draft PO Value</span>
                  <span className="text-blue-600 flex items-center">
                    <IndianRupee className="w-3 h-3 mr-0.5" />
                    {Math.round(draft.totalPayable + draft.totalGst)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCreatePOs}
                disabled={isProcessing || draft.items.some(i => !i.supplierId)}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-500 text-white font-semibold text-xs uppercase tracking-wider py-2.5 rounded-2xl transition duration-200 flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>Create Purchase Orders</span>
                  </>
                )}
              </button>
              {draft.items.some(i => !i.supplierId) && (
                <p className="text-[10px] text-red-500 text-center mt-2">Cannot create POs: Missing supplier assignments. Add suppliers first.</p>
              )}
            </div>
          ) : (
            <div className="p-6 text-center bg-slate-50/20 rounded-2xl border border-dashed border-slate-200/30 text-xs font-mono text-slate-400 space-y-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-500/80 mx-auto" />
              <p className="text-slate-500/90 font-medium">Stock levels optimal!</p>
              <p className="text-[10px]">No purchase order draft matches current reorder thresholds.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
