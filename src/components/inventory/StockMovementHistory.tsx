import React from 'react';
import { useInventory } from '../../context/InventoryContext';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export const StockMovementHistory: React.FC = () => {
  const { auditLogs, isLoading } = useInventory();

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-200/30 space-y-4 h-full">
      <div className="flex items-center space-x-2 border-b border-slate-200/30 pb-2">
        <RotateCcw className="w-4 h-4 text-emerald-600" />
        <h4 className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider">
          Recent Stock Movements
        </h4>
      </div>
      <div className="space-y-3 h-[300px] overflow-y-auto pr-2">
        {isLoading ? (
          <div className="text-center py-6 text-slate-500/90 text-[10.5px] font-mono">Loading ledger...</div>
        ) : auditLogs.length === 0 ? (
          <div className="text-[10px] text-slate-500/90 font-mono text-center pt-8">
            <AlertOctagon className="w-5 h-5 mx-auto mb-2 opacity-50" />
            No audit trails recorded yet.
          </div>
        ) : auditLogs.map((log) => (
          <div key={log.id} className="flex justify-between items-center p-3 bg-white border border-slate-200/30 rounded-2xl">
            <div>
              <div className="text-xs font-semibold text-slate-900">{log.products?.name || 'Unknown SKU'}</div>
              <div className="text-[9px] font-mono text-slate-500/90 mt-0.5">
                {new Date(log.created_at).toLocaleString()}
              </div>
              <div className="text-[9px] text-slate-500/90 mt-1">Ref: {log.reference_id || 'System'}</div>
            </div>
            <div className="text-right">
              <div className={`text-[11px] font-extrabold ${log.quantity_changed > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {log.quantity_changed > 0 ? '+' : ''}{log.quantity_changed} {log.movement_type}
              </div>
              <div className="text-[9.5px] font-mono text-slate-500/90 mt-1">Balance: {log.resulting_quantity}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
