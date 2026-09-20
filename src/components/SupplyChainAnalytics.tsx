import React, { useMemo, useState, useEffect } from 'react';
import { Product, InventoryBatch, SaleRecord } from '../types/retail';
import { inventoryIntelligenceService, RiskAssessment } from '../lib/services/inventoryIntelligenceService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Box, AlertTriangle, TrendingUp, Sparkles, Loader2, ServerCrash } from 'lucide-react';

interface SupplyChainAnalyticsProps {
  products: Product[];
  batches: InventoryBatch[];
  salesLogs: SaleRecord[];
}

export function SupplyChainAnalytics({ products = [], batches = [], salesLogs = [] }: SupplyChainAnalyticsProps) {
  const [riskData, setRiskData] = useState<RiskAssessment[]>([]);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);

  useEffect(() => {
    setIsLoadingRisk(true);
    try {
      const risks = inventoryIntelligenceService.getRiskAssessments(products, salesLogs, batches);
      setRiskData(risks);
    } catch (err: any) {
      console.error('Failed to generate risk assessments', err);
      setRiskData([]);
    } finally {
      setIsLoadingRisk(false);
    }
  }, [products, salesLogs, batches]);

  // 1. Inventory vs Reorder Point
  const inventoryData = useMemo(() => {
    return products.slice(0, 8).map(p => ({
      name: p.name.substring(0, 15) + (p.name.length > 15 ? '...' : ''),
      Stock: p.stockLevel,
      'Reorder Point': p.reorderPoint,
    }));
  }, [products]);

  // 2. Stock-out Risk Distribution
  const stockOutRiskData = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    let out = 0;

    products.forEach(p => {
      if (p.stockLevel === 0) out++;
      else if (p.stockLevel <= p.reorderPoint) high++;
      else if (p.stockLevel <= p.reorderPoint * 1.5) medium++;
      else low++;
    });

    return [
      { name: 'Out of Stock', value: out, color: '#ef4444' }, // red
      { name: 'High Risk (<= RP)', value: high, color: '#f97316' }, // orange
      { name: 'Medium Risk', value: medium, color: '#eab308' }, // yellow
      { name: 'Healthy (Low Risk)', value: low, color: '#22c55e' }, // green
    ].filter(d => d.value > 0);
  }, [products]);

  // 3. Turnover Rates / Sales Velocity (Sales last 7 days vs avg inventory)
  const turnoverData = useMemo(() => {
    // Group sales by product
    const salesByProduct: Record<string, number> = {};
    salesLogs.forEach(sale => {
      salesByProduct[sale.productId] = (salesByProduct[sale.productId] || 0) + sale.quantity;
    });

    return products.slice(0, 6).map(p => {
      const sold = salesByProduct[p.id] || 0;
      // turnover proxy: sold / (current stock + sold)
      const turnoverRatio = sold / ((p.stockLevel + sold) || 1);
      return {
        name: p.name.substring(0, 12),
        'Turnover %': parseFloat((turnoverRatio * 100).toFixed(1)),
        'Sold Qty': sold,
      };
    }).sort((a, b) => b['Turnover %'] - a['Turnover %']);
  }, [products, salesLogs]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'High': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-slate-500/90 bg-slate-100 border-slate-300';
    }
  };

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Inventory Levels */}
        <div className="bg-white border border-slate-200/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Box className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-medium text-slate-800">Real-Time Inventory</h3>
          </div>
          <div className="h-64 min-h-[16rem]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1}>
              <BarChart data={inventoryData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} angle={-45} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Stock" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Reorder Point" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock-out Risks */}
        <div className="bg-white border border-slate-200/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-medium text-slate-800">Stock-out Risks</h3>
          </div>
          <div className="h-64 min-h-[16rem]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1}>
              <PieChart>
                <Pie
                  data={stockOutRiskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stockOutRiskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#1e293b' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Turnover Rates */}
        <div className="bg-white border border-slate-200/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-medium text-slate-800">Velocity & Turnover</h3>
          </div>
          <div className="h-64 min-h-[16rem]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1}>
              <LineChart data={turnoverData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} angle={-45} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="Turnover %" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Supply Risk Assessment Panel */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200/50 pb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-medium text-slate-800">Supply Risk Assessment</h3>
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-medium ml-2">Algorithmic</span>
          </div>
        </div>

        {isLoadingRisk ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500/90 font-mono">Analyzing inventory trends & stock-out probabilities...</p>
          </div>
        ) : riskData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {riskData.map((risk, idx) => {
              const product = products.find(p => p.sku === risk.sku);
              return (
                <div key={idx} className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 flex flex-col space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-medium text-slate-800">{product ? product.name : risk.sku}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {risk.sku}</p>
                    </div>
                    <span className={`text-[9px] font-medium px-2 py-0.5 rounded border ${getRiskColor(risk.riskLevel)}`}>
                      {risk.riskLevel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500/90 leading-relaxed border-l-2 border-slate-200/50 pl-3">
                    {risk.analysis}
                  </div>
                  <div className="bg-indigo-500/5 border border-indigo-200 rounded-xl p-3 mt-auto">
                    <p className="text-[10px] font-mono text-indigo-600 font-medium uppercase tracking-wide mb-1">Algorithmic Recommendation</p>
                    <p className="text-[11px] text-slate-700">{risk.recommendation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
             <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2">
               <AlertTriangle className="w-6 h-6 text-emerald-600" />
             </div>
             <p className="text-sm font-medium text-slate-800">No Imminent Risks Detected</p>
             <p className="text-xs text-slate-400 max-w-sm">Inventory levels are stable and stock-out probabilities are currently low across all SKUs.</p>
          </div>
        )}
      </div>
    </div>
  );
}
