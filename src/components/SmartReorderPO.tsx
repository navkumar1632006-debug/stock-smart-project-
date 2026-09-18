import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle2, FileText, IndianRupee, Truck, ShieldAlert, Loader } from 'lucide-react';
import { Product, SaleRecord } from '../types/retail';
import { inventoryIntelligenceService, ReorderPO } from '../lib/services/inventoryIntelligenceService';
import { inventoryService } from '../lib/services/inventoryService';

interface SmartReorderProps {
  products: Product[];
  salesLogs: SaleRecord[];
  onReorderSuccess?: () => void;
}

export const SmartReorderPO: React.FC<SmartReorderProps> = ({ products, salesLogs, onReorderSuccess }) => {
  const [draft, setDraft] = useState<ReorderPO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDraft = () => {
    setIsLoading(true);
    try {
      const generatedDraft = inventoryIntelligenceService.generateReorderPO(products, salesLogs);
      setDraft(generatedDraft);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDraft();
  }, [products, salesLogs]);

  const handleApprovePO = async () => {
    if (!draft || draft.items.length === 0) return;
    setIsApproving(true);
    setSuccessMsg(null);

    try {
      // Simulate B2B payment & delivery queue seeding
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Inject the reordered products back into active inventory using proper service methods
      for (const item of draft.items) {
        // Find existing product to get its price
        const existingProduct = products.find(p => p.id === item.productId);
        
        await inventoryService.addBatch(
          item.productId,
          `AUTO-RE-${Date.now().toString().substring(8)}`,
          item.reorderQuantity,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30d expiry
        );
      }

      setSuccessMsg(`🚀 Purchase Order ${draft.poNumber} Approved! payment of ₹${Math.round(draft.totalPayable + draft.totalGst)} initiated. New batches dispatched and stock updated.`);
      
      if (onReorderSuccess) {
        onReorderSuccess();
      }

      // Re-fetch draft (it should clear out as stock has been restocked)
      setTimeout(() => {
        setSuccessMsg(null);
        fetchDraft();
      }, 5000);

    } catch (e: any) {
      alert("PO error: " + e.message);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200/30 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-indigo-600/10 rounded-2xl border border-indigo-200">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-900 tracking-wider">Automated Smart Reordering</h3>
            <p className="text-[10px] text-slate-500/90 font-mono">B2B procurement & supplier integration</p>
          </div>
        </div>
        <span className="text-[9px] font-mono text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full font-medium">
          ONDC Integrated
        </span>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-200 rounded-2xl p-6 flex items-start space-x-2 text-emerald-600 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center space-y-1.5">
          <Loader className="w-5 h-5 text-indigo-600 animate-spin mx-auto" />
          <p className="text-[10px] font-mono text-slate-400">Drafting Purchase Orders based on replenishment criteria...</p>
        </div>
      ) : draft && draft.items && draft.items.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500/90 bg-white shadow-sm border border-slate-200 rounded-2xl p-2.5 rounded-2xl border border-slate-200/30">
            <span>PO Code: <strong className="text-slate-900">{draft.poNumber}</strong></span>
            <span>Est. Lead Time: <strong className="text-slate-900">Same-day (4h)</strong></span>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {draft.items.map((item: any, idx: number) => (
              <div key={idx} className="bg-slate-50/30 border border-slate-200/30/50 p-2.5 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-medium text-slate-700">{item.productName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Supplier: {item.supplier} • Qty: {item.reorderQuantity}</p>
                </div>
                <div className="text-right font-mono text-slate-700">
                  <p className="font-medium">₹{item.totalCost}</p>
                  <p className="text-[9px] text-slate-400">GST: {item.gstRate}%</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200/30 pt-3.5 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-500/90 text-[10px]">
              <span>Subtotal Cost</span>
              <span>₹{draft.totalPayable}</span>
            </div>
            <div className="flex justify-between text-slate-500/90 text-[10px]">
              <span>Central & State GST</span>
              <span>₹{Math.round(draft.totalGst)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-medium text-[11.5px] border-t border-dashed border-slate-200/50 pt-1.5">
              <span>Total Draft PO Value</span>
              <span className="text-indigo-600 flex items-center">
                <IndianRupee className="w-3 h-3 mr-0.5" />
                {Math.round(draft.totalPayable + draft.totalGst)}
              </span>
            </div>
          </div>

          <button
            onClick={handleApprovePO}
            disabled={isApproving}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 text-slate-900 font-semibold text-xs uppercase tracking-wider py-2.5 rounded-2xl transition duration-200 flex items-center justify-center space-x-2"
          >
            {isApproving ? (
              <>
                <Loader className="w-4 h-4 animate-spin text-slate-900" />
                <span>Authorizing Instant B2B Transfer...</span>
              </>
            ) : (
              <>
                <Truck className="w-4 h-4" />
                <span>One-Tap Approve & Order PO</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-6 text-center bg-slate-50/20 rounded-2xl border border-dashed border-slate-200/30 text-xs font-mono text-slate-400 space-y-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-500/80 mx-auto" />
          <p className="text-slate-500/90 font-medium">Stock levels optimal!</p>
          <p className="text-[10px]">No purchase order draft matches current reorder thresholds.</p>
        </div>
      )}
    </div>
  );
};
