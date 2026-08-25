import React, { useState, useEffect } from 'react';
import { BrainCircuit, TrendingUp, AlertTriangle, ArrowRight, Loader2, Zap } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface Insight {
  pattern: string;
  insight: string;
  seasonalAdjustment: string;
  impactLevel: 'High' | 'Medium' | 'Low';
}

export function SupplyChainIntelligence() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchInsights() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/supply-intelligence');
        if (!response.ok) {
          throw new Error('Failed to fetch supply chain intelligence');
        }
        const data = await response.json();
        if (isMounted) {
          setInsights(data.insights || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'An error occurred');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    fetchInsights();
    return () => { isMounted = false; };
  }, []);

  // Generate some synthetic chart data based on the impact levels for visual flair
  const chartData = [
    { name: 'Week 1', demand: 65, avg: 50 },
    { name: 'Week 2', demand: 59, avg: 50 },
    { name: 'Week 3', demand: 80, avg: 50 },
    { name: 'Week 4', demand: 81, avg: 50 },
    { name: 'Week 5', demand: 96, avg: 50 },
    { name: 'Week 6', demand: 110, avg: 50 },
  ];

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
                Gemini AI
              </span>
            </h2>
            <p className="text-[11px] text-slate-500/90 font-mono mt-1">
              Pattern recognition & seasonal adjustments
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsLoading(true);
            fetch('/api/supply-intelligence').then(r => r.json()).then(d => {
              setInsights(d.insights);
              setIsLoading(false);
            }).catch(() => setIsLoading(false));
          }}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 text-slate-700 rounded-2xl text-xs font-medium transition whitespace-nowrap disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-6 relative z-10">
          <div className="relative">
             <div className="w-12 h-12 border-4 border-indigo-200 rounded-full"></div>
             <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-800">Analyzing consumption patterns...</p>
            <p className="text-xs text-slate-400 font-mono mt-1">Processing recent sales velocity and seasonal trends</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-600 relative z-10">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p className="font-medium text-sm">Failed to generate insights</p>
          <p className="text-xs font-mono mt-1 opacity-70">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          {/* Insights List */}
          <div className="lg:col-span-7 space-y-4">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-slate-50/80 border border-slate-200/50 rounded-2xl p-6 hover:border-indigo-200 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-white rounded-xl border border-slate-200/50">
                       <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {insight.pattern}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    insight.impactLevel === 'High' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                    insight.impactLevel === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                  }`}>
                    {insight.impactLevel} Impact
                  </span>
                </div>
                <div className="space-y-3 pl-2 border-l-2 border-slate-200/50">
                  <p className="text-xs text-slate-500/90 leading-relaxed">
                    {insight.insight}
                  </p>
                  <div className="bg-indigo-500/5 rounded-2xl p-3 border border-indigo-200 flex items-start space-x-3">
                    <ArrowRight className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                       <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-1">Seasonal Adjustment</p>
                       <p className="text-xs text-indigo-100/80 leading-relaxed">{insight.seasonalAdjustment}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {insights.length === 0 && (
               <div className="text-center text-slate-400 py-8">
                  No actionable insights generated at this time.
               </div>
            )}
          </div>

          {/* Visualization Side Panel */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            <div className="bg-slate-50/80 border border-slate-200/50 rounded-2xl p-6 flex-1 flex flex-col">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500/90 mb-4 border-b border-slate-200/50 pb-3">
                Projected Seasonal Demand Surge
              </h4>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#0f172a' }}
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="demand" radius={[4, 4, 4, 4]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.demand > 80 ? '#6366f1' : '#334155'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-400 font-mono text-center mt-4">
                *Visual extrapolation based on selected AI insights
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
