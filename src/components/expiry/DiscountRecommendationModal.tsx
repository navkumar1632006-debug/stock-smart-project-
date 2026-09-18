import React from 'react';
import { InventoryBatch } from '../../types/retail';
import { DiscountRecommendation } from '../../lib/services/discountEngine';
import { X, Tag, AlertTriangle, CheckCircle, AlertOctagon, TrendingDown, DollarSign } from 'lucide-react';

interface Props {
  batch: InventoryBatch & { evaluation: DiscountRecommendation };
  isOpen: boolean;
  onClose: () => void;
  onMarkExpired: (batchId: string, productId: string, currentQty: number) => void;
}

export const DiscountRecommendationModal: React.FC<Props> = ({ batch, isOpen, onClose, onMarkExpired }) => {
  if (!isOpen) return null;

  const { status, daysUntilExpiry, recommendedDiscountRate, urgencyLevel, recommendedAction } = batch.evaluation;
  
  const discountPercent = Math.round(recommendedDiscountRate * 100);
  const suggestedPrice = batch.originalPrice * (1 - recommendedDiscountRate);
  const potentialRevenue = suggestedPrice * batch.currentQuantity;
  
  const isExpired = status === 'Expired';
  
  let headerColor = 'bg-slate-100 text-slate-800';
  let icon = <CheckCircle className="w-5 h-5" />;
  
  if (isExpired) {
    headerColor = 'bg-rose-100 text-rose-800 border-rose-200';
    icon = <AlertOctagon className="w-5 h-5" />;
  } else if (status === 'Critical') {
    headerColor = 'bg-amber-100 text-amber-800 border-amber-200';
    icon = <AlertTriangle className="w-5 h-5" />;
  } else if (status === 'Urgent') {
    headerColor = 'bg-orange-100 text-orange-800 border-orange-200';
    icon = <TrendingDown className="w-5 h-5" />;
  } else if (status === 'Warning') {
    headerColor = 'bg-blue-100 text-blue-800 border-blue-200';
    icon = <TrendingDown className="w-5 h-5" />;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-4 border-b flex justify-between items-center ${headerColor}`}>
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="font-bold text-lg tracking-tight">Smart Discount Recommendation</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{batch.productName}</h3>
              <p className="text-sm font-mono text-slate-500 mt-1">Batch: {batch.batchNumber}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${headerColor}`}>
              {status}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
              <span className="text-[10px] uppercase font-mono text-slate-500">Stock Qty</span>
              <div className="font-bold text-slate-900 text-lg mt-1">{batch.currentQuantity} units</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
              <span className="text-[10px] uppercase font-mono text-slate-500">Days Left</span>
              <div className={`font-bold text-lg mt-1 ${daysUntilExpiry <= 3 ? 'text-rose-600' : 'text-slate-900'}`}>
                {daysUntilExpiry === 999 ? 'N/A' : daysUntilExpiry}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
              <span className="text-[10px] uppercase font-mono text-slate-500">Current MRP</span>
              <div className="font-bold text-slate-900 text-lg mt-1">₹{batch.originalPrice}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
              <span className="text-[10px] uppercase font-mono text-slate-500">Risk Level</span>
              <div className={`font-bold text-lg mt-1 ${urgencyLevel === 'High' ? 'text-rose-600' : 'text-slate-900'}`}>
                {urgencyLevel}
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold uppercase tracking-wider text-xs">
              <Tag className="w-4 h-4" />
              AI Recommendation
            </div>
            <p className="text-sm text-slate-700 font-medium leading-relaxed">
              {recommendedAction}
            </p>
            
            {!isExpired && recommendedDiscountRate > 0 && (
              <div className="pt-4 border-t border-indigo-200/50 flex flex-wrap gap-6 items-end">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Suggested Discount</div>
                  <div className="text-2xl font-black text-rose-600">-{discountPercent}%</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase">New Selling Price</div>
                  <div className="text-2xl font-black text-emerald-600">₹{suggestedPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Recovered Revenue</div>
                  <div className="flex items-center gap-1 text-lg font-bold text-indigo-600">
                    <DollarSign className="w-4 h-4" />
                    ₹{potentialRevenue.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Close
          </button>
          
          {isExpired ? (
            <button 
              onClick={() => {
                onMarkExpired(batch.id, batch.productId, batch.currentQuantity);
                onClose();
              }}
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 transition flex items-center gap-2"
            >
              <AlertOctagon className="w-4 h-4" />
              Mark as Expired (Zero Stock)
            </button>
          ) : (
            <button 
              onClick={onClose} // In this implementation, this is informational. We don't overwrite MRP automatically per requirements.
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Acknowledge
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
