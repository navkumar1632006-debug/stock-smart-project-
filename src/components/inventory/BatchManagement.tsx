import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { AlertTriangle, Clock, Box } from 'lucide-react';

export const BatchManagement: React.FC = () => {
  const { batches, isLoading } = useInventory();
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);

  const displayBatches = showExpiredOnly 
    ? batches.filter(b => {
        const diffTime = Math.abs(new Date(b.expiryDate).getTime() - new Date().getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 0;
      })
    : batches;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-200/30 pb-2">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <h4 className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider">
            Batch Expiry Radar
          </h4>
        </div>
        <button 
          onClick={() => setShowExpiredOnly(!showExpiredOnly)}
          className={`text-[9px] px-2 py-1 uppercase rounded-xl font-semibold border ${showExpiredOnly ? 'bg-rose-500 text-white border-rose-600' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
        >
          {showExpiredOnly ? 'Show All Batches' : 'Filter Expired'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {isLoading ? (
          <div className="text-center py-6 text-slate-500/90 text-[10.5px] font-mono">Loading batches...</div>
        ) : displayBatches.length === 0 ? (
          <div className="text-[10px] text-slate-500/90 font-mono text-center pt-8">
            <Box className="w-5 h-5 mx-auto mb-2 opacity-50" />
            No active batches tracked.
          </div>
        ) : (
          displayBatches.map((batch) => {
            const expiryDate = new Date(batch.expiryDate);
            const today = new Date();
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let statusStyle = 'border-slate-200/50 bg-white';
            let label = `${diffDays} Days Left`;
            let isExpired = false;

            if (diffDays <= 0) {
              statusStyle = 'border-rose-300 bg-rose-50';
              label = 'EXPIRED';
              isExpired = true;
            } else if (diffDays <= 5) {
              statusStyle = 'border-amber-300 bg-amber-50';
            }

            return (
              <div key={batch.id} className={`p-3 rounded-2xl border ${statusStyle} transition-all`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-xs text-slate-900">{batch.productName}</div>
                    <div className="text-[9px] font-mono text-slate-500 mt-0.5">Batch: {batch.batchNumber}</div>
                  </div>
                  <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-semibold ${isExpired ? 'bg-rose-200 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                    {label}
                  </span>
                </div>
                
                <div className="flex justify-between items-end mt-3 border-t border-slate-200/50 pt-2">
                  <div className="text-[10px] font-mono text-slate-500">
                    <div>Initial: {batch.initialQuantity}</div>
                    <div>Current: {batch.currentQuantity}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-mono text-slate-500">MRP: ₹{batch.originalPrice}</div>
                    {batch.discountRate > 0 && !isExpired && (
                      <div className="text-[11px] font-semibold text-emerald-600">
                        Smart Price: ₹{batch.discountedPrice.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
