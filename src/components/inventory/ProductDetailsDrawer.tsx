import React, { useState } from 'react';
import { Product } from '../../types/retail';
import { useInventory } from '../../context/InventoryContext';
import { inventoryService } from '../../lib/services/inventoryService';
import { X, Package, TrendingUp, TrendingDown, ArrowRightLeft, Clock, Save, Loader2, AlertTriangle } from 'lucide-react';

interface ProductDetailsDrawerProps {
  product: Product;
  onClose: () => void;
}

export const ProductDetailsDrawer: React.FC<ProductDetailsDrawerProps> = ({ product, onClose }) => {
  const { auditLogs } = useInventory();
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const productLogs = auditLogs.filter(log => log.product_id === product.id).slice(0, 10); // Show last 10

  const handleQuickAdjust = async () => {
    if (!adjustAmount || adjustAmount <= 0) return;
    if (adjustType === 'deduct' && adjustAmount > product.stockLevel) {
      alert("Cannot deduct more than currently in stock.");
      return;
    }

    setIsAdjusting(true);
    try {
      await inventoryService.adjustStock(product.id, adjustType, Number(adjustAmount));
      setAdjustAmount('');
      // In a real app, the inventory context should refresh here or use real-time listeners.
      // Since it's a simulated flow, the user might have to refresh or the real-time context catches it.
      alert(`Successfully ${adjustType === 'add' ? 'added' : 'deducted'} ${adjustAmount} units!`);
    } catch (e) {
      console.error(e);
      alert('Failed to adjust stock.');
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-50 shadow-2xl z-50 flex flex-col border-l border-slate-200/50 animate-slide-in-right">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200/50 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
              <Package className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Product Details</h2>
              <p className="text-[10px] font-mono text-slate-500">SKU: {product.sku}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Main Info Card */}
          <div className="bg-white rounded-3xl border border-slate-200/50 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">{product.name}</h3>
              <span className="text-[10px] uppercase font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mt-1 inline-block">
                {product.category}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Selling Price</span>
                <span className="text-lg font-bold text-slate-900">₹{product.price}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Unit Cost</span>
                <span className="text-lg font-bold text-slate-700">₹{product.cost}</span>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 text-white flex items-center justify-between shadow-inner">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Current Stock</span>
                <div className="flex items-end space-x-2">
                  <span className={`text-3xl font-black leading-none ${product.stockLevel === 0 ? 'text-rose-400' : product.stockLevel <= product.reorderPoint ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {product.stockLevel}
                  </span>
                  <span className="text-xs text-slate-400 mb-1">units</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-mono text-slate-400 block mb-1">Min Threshold</span>
                <span className="text-sm font-bold text-slate-200">{product.reorderPoint}</span>
              </div>
            </div>
          </div>

          {/* Quick Adjustment (Secure RPC) */}
          <div className="bg-white rounded-3xl border border-slate-200/50 p-5 shadow-sm">
            <div className="flex items-center space-x-2 mb-4">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Quick Adjustment</h4>
            </div>
            <p className="text-[10px] text-slate-500 mb-4 font-mono leading-relaxed">
              Mutate stock levels directly via atomic database transaction. Ideal for rapid manual audits.
            </p>

            <div className="flex items-center space-x-3 mb-4">
              <button 
                onClick={() => setAdjustType('add')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors border ${adjustType === 'add' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
              >
                + Receive (Add)
              </button>
              <button 
                onClick={() => setAdjustType('deduct')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors border ${adjustType === 'deduct' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
              >
                - Shrink (Deduct)
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <input 
                type="number"
                min="1"
                placeholder="Qty..."
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-1/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleQuickAdjust}
                disabled={isAdjusting || !adjustAmount}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-xs transition-colors flex items-center justify-center space-x-2"
              >
                {isAdjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Execute RPC</span>
              </button>
            </div>
          </div>

          {/* Audit Ledger for this specific item */}
          <div className="bg-white rounded-3xl border border-slate-200/50 p-5 shadow-sm">
            <div className="flex items-center space-x-2 mb-4 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Item Ledger History</h4>
            </div>
            
            <div className="space-y-3">
              {productLogs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center">
                  <AlertTriangle className="w-6 h-6 mb-2 opacity-50" />
                  No stock movements recorded.
                </div>
              ) : (
                productLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-lg ${log.quantity_changed > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {log.quantity_changed > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-700 capitalize">{log.movement_type.replace('_', ' ')}</p>
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${log.quantity_changed > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {log.quantity_changed > 0 ? '+' : ''}{log.quantity_changed}
                      </p>
                      <p className="text-[9px] font-mono text-slate-400 mt-0.5">Bal: {log.resulting_quantity}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
