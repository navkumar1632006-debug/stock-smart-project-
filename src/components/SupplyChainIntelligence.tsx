import React from 'react';
import { BrainCircuit, AlertTriangle } from 'lucide-react';
export function SupplyChainIntelligence() {
  return (
    <div className="bg-white border border-slate-200/50 rounded-3xl p-6 mt-6 shadow-xl relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 relative z-10 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-200 rounded-2xl shadow-inner shadow-indigo-500/20">
            <BrainCircuit className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center">
              Supply Chain Intelligence
              <span className="ml-3 text-[9px] font-mono font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-slate-900 px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                LightGBM (Time-Series CV)
              </span>
            </h2>
            <p className="text-[11px] text-slate-500/90 font-mono mt-1">
              Project-Controlled Machine Learning Forecasting
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-12 space-y-6 relative z-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <AlertTriangle className="w-12 h-12 text-slate-400 mb-2 opacity-80" />
        <div className="text-center">
          <h3 className="text-base font-semibold text-slate-800">ML Pipeline Paused: Insufficient Historical Data</h3>
          <p className="text-xs text-slate-500 max-w-lg mt-2 leading-relaxed">
            The LightGBM forecasting model requires a significant volume of historical transactions (e.g. at least 10 days of continuous data per product) to generate statistically reliable demand predictions. 
            Currently, the database lacks sufficient historical sales volume to train the model accurately.
          </p>
          <div className="mt-6 flex justify-center space-x-4 text-[10px] font-mono text-slate-400">
            <span>Model: LightGBM V1</span>
            <span>•</span>
            <span>Validation: Walk-Forward CV</span>
          </div>
        </div>
      </div>
    </div>
  );
}
