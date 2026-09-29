import React from 'react';
import { BrainCircuit, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';

export function SupplyChainIntelligence() {
  return (
    <Card className="mt-6 shadow-sm overflow-hidden relative">
      <CardHeader className="border-b border-slate-200/50 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                Supply Chain Intelligence
              </h2>
              <Badge variant="secondary" className="font-mono uppercase tracking-widest text-[9px]">
                LightGBM
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500/90 font-mono mt-0.5">
              Machine Learning Forecasting
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 bg-slate-50/30">
        <EmptyState
          icon={<AlertTriangle className="w-16 h-16 text-slate-300" />}
          title="ML Pipeline Paused: Insufficient Historical Data"
          description="The forecasting model requires a significant volume of historical transactions (at least 10 days of continuous data per product) to generate statistically reliable demand predictions. The database currently lacks sufficient historical sales volume to train the model."
        />
        <div className="mt-4 flex justify-center space-x-4 text-[10px] font-mono text-slate-400">
          <span>Model: LightGBM V1</span>
          <span>&bull;</span>
          <span>Validation: Walk-Forward CV</span>
        </div>
      </CardContent>
    </Card>
  );
}
