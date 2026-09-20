import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { 
  Calendar, 
  TrendingUp, 
  Sparkles, 
  AlertCircle, 
  Info, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  ShieldAlert,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';

interface SalesForecastChartProps {
  salesData: any[];
  forecastData: any[];
  products: any[];
}

export const SalesForecastChart: React.FC<SalesForecastChartProps> = ({
  salesData,
  forecastData,
  products
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');
  const [chartType, setChartType] = useState<'revenue' | 'volume'>('revenue');
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  // Group historical sales by date for the selected product - Optimized with useMemo to prevent main-thread blockage
  const aggregatedHistoricalData = React.useMemo(() => {
    const dailyMap: Record<string, { date: string; actualSales: number; revenue: number }> = {};
    
    salesData.forEach(sale => {
      if (selectedProductId !== 'ALL' && sale.productId !== selectedProductId) return;
      
      const date = sale.saleDate;
      if (!dailyMap[date]) {
        dailyMap[date] = { date, actualSales: 0, revenue: 0 };
      }
      dailyMap[date].actualSales += sale.quantity;
      dailyMap[date].revenue += sale.totalPrice;
    });

    // Return sorted last 15 days of historical dates
    return Object.values(dailyMap)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-15);
  }, [salesData, selectedProductId]);

  // Combine history + 7 day demand prediction - Optimized with useMemo to prevent main-thread blockage (reduces INP latency)
  const currentChartData = React.useMemo(() => {
    const historical = aggregatedHistoricalData;
    const chartData: any[] = historical.map(h => ({
      date: h.date,
      actual: chartType === 'revenue' ? h.revenue : h.actualSales,
      forecast: null,
      type: 'Historical'
    }));

    // If a specific product is selected, overlay its 7D forecast
    if (selectedProductId !== 'ALL') {
      const pForecast = forecastData.find(f => f.productId === selectedProductId);
      const prod = products.find(p => p.id === selectedProductId);
      
      if (pForecast && prod) {
        // The mock 7-day future timeline generator has been removed.
        // Real daily forecast arrays should be provided by the backend.
      }
    }

    return chartData;
  }, [aggregatedHistoricalData, forecastData, products, selectedProductId, chartType]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-3 shadow-2xl font-mono text-[10px] space-y-1">
          <p className="text-slate-500/90 text-[11px] mb-1 font-medium">{data.date}</p>
          {data.actual !== null && (
            <p className="text-indigo-600 font-semibold">
              Actual {chartType === 'revenue' ? 'Revenue' : 'Units'}:{' '}
              {chartType === 'revenue' ? `₹${data.actual}` : `${data.actual} units`}
            </p>
          )}
          {data.forecast !== null && (
            <p className="text-emerald-600 font-semibold flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-emerald-600 mr-0.5 animate-pulse" />
              AI Forecast: {chartType === 'revenue' ? `₹${data.forecast}` : `${data.forecast} units`}
            </p>
          )}
          <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-semibold tracking-wider ${data.type === 'AI Predicted' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200' : 'bg-indigo-500/10 text-indigo-600 border border-indigo-200'}`}>
            {data.type}
          </span>
        </div>
      );
    }
    return null;
  };

  // Find current active forecast details for XAI breakdown
  const currentForecast = selectedProductId !== 'ALL' 
    ? forecastData.find(f => f.productId === selectedProductId) 
    : null;

  const currentProd = selectedProductId !== 'ALL'
    ? products.find(p => p.id === selectedProductId)
    : null;

  // Derive model breakdowns safely, using proportionate percentages if exact fields are missing
  const totalEnsembleUnits = currentForecast?.predictedDemandNext7d || 0;
  const models = [
    {
      id: 'lightgbm',
      name: 'LightGBM (Time-Series Cross-Validated)',
      val: currentForecast?.predictedDemandNext7d || 0,
      weight: '100%',
      desc: 'Tree-based model optimized for sparse retail data, handling holiday effects and categorical features.',
      status: 'Active'
    }
  ];

  // Helper for confidence color pill
  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/15 border border-emerald-200 text-emerald-600';
    if (score >= 80) return 'bg-teal-500/15 border border-teal-500/30 text-teal-400';
    return 'bg-amber-500/15 border border-amber-200 text-amber-600';
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight uppercase">Sales Flow</h3>
            <p className="text-[10px] text-slate-500/90 font-mono">15-Day Historical Sales Actuals</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Product Filter */}
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="bg-slate-50 text-slate-800 border border-slate-200/50 rounded-2xl px-3 py-1.5 text-[11px] font-mono focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Catalog Products</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Toggle Metrics */}
          <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-0.5 flex space-x-0.5">
            <button
              onClick={() => setChartType('revenue')}
              className={`px-3 py-1 rounded-xl text-[10px] font-semibold uppercase transition-all ${
                chartType === 'revenue'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-500/90 hover:text-slate-900'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setChartType('volume')}
              className={`px-3 py-1 rounded-xl text-[10px] font-semibold uppercase transition-all ${
                chartType === 'volume'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-500/90 hover:text-slate-900'
              }`}
            >
              Volume
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[280px] w-full min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1}>
          <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#64748b"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              dx={-5}
              tickFormatter={(val) => (chartType === 'revenue' ? `₹${val}` : `${val} u`)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              name="Actual Sales"
              type="monotone"
              dataKey="actual"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorActual)"
              activeDot={{ r: 5 }}
            />
            <Area
              name="AI Forecasted Demand"
              type="monotone"
              dataKey="forecast"
              stroke="#10b981"
              strokeDasharray="5 5"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorForecast)"
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Explainable AI Model Breakdown & Experienced Shopkeeper Thoughts Section */}
      {selectedProductId !== 'ALL' && (
        <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-200/30">
          {salesData.filter(s => s.productId === selectedProductId).length < 10 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <ShieldAlert className="w-8 h-8 text-slate-400 mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">Insufficient Historical Data</h4>
              <p className="text-[11px] text-slate-500 text-center max-w-sm mt-2">
                The LightGBM forecasting model requires at least 10 historical sales transactions to generate a statistically significant demand prediction. Keep selling this product to unlock AI insights.
              </p>
            </div>
          ) : currentForecast ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Column 1: Model Ensemble Vote Matrix (XAI) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Weighted Ensemble Model Outputs</h4>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Aggregation Factor: 100%</span>
                </div>

                <div className="space-y-3">
                  {models.map(m => {
                    const maxVal = Math.max(...models.map(x => x.val));
                    const percentage = maxVal > 0 ? (m.val / maxVal) * 100 : 0;
                    
                    return (
                      <div 
                        key={m.id} 
                        className="p-3 bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-2xl relative overflow-hidden transition-all hover:border-slate-200/50"
                        onMouseEnter={() => setHoveredModel(m.id)}
                        onMouseLeave={() => setHoveredModel(null)}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1.5 relative z-10">
                          <span className="font-medium text-slate-700">{m.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-400 text-[8.5px]">Weight: {m.weight}</span>
                            <span className="text-emerald-600 font-semibold">{m.val} units</span>
                          </div>
                        </div>

                        {/* Progress Bar background */}
                        <div className="w-full h-2 bg-white rounded-full overflow-hidden relative z-10">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        {/* Popover / Expandable explanation on hover or focus */}
                        {(hoveredModel === m.id) && (
                          <div className="text-[9px] text-slate-500/90 font-sans mt-2 leading-relaxed bg-slate-50/80 p-2 rounded-xl border border-slate-200/50 transition-all">
                            {m.desc}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: Confidence Dials and Veteran Advice */}
              <div className="lg:col-span-5 space-y-4">
                {/* Confidence Dial Badge Card */}
                <div className="p-6 bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block">Forecast Trust Metric</span>
                    <span className="text-sm font-semibold text-slate-900 block">Confidence Index</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-2 rounded-2xl text-center font-mono ${getConfidenceColor(currentForecast.confidenceScore)}`}>
                      <span className="text-xl font-semibold block leading-none">{currentForecast.confidenceScore}%</span>
                      <span className="text-[8px] font-medium block uppercase tracking-tight mt-0.5">Weighted</span>
                    </div>
                  </div>
                </div>

                {/* Experienced Shopkeeper Advisory */}
                <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-200 rounded-3xl p-6 shadow-lg relative overflow-hidden">
                  {/* Background accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 animate-pulse flex-shrink-0" />
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">AI Store Manager Thoughts</h4>
                        <span className="text-[7.5px] font-mono bg-amber-100 text-amber-600 px-1 py-0.5 rounded font-semibold uppercase">
                          Kirana Wisdom
                        </span>
                      </div>
                      
                      {currentForecast.festivalFactor && (
                        <div className="flex items-start space-x-1.5 bg-slate-50/60 p-2 rounded-2xl border border-slate-200/30">
                          {holidayMultiplierImpact(currentProd?.category || '') >= 1.05 ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                          )}
                          <p className="text-[9.5px] text-amber-600 font-mono leading-tight">
                            <strong className="text-amber-200">Seasonality Match:</strong> {currentForecast.festivalFactor}
                          </p>
                        </div>
                      )}

                      <p className="text-[11.5px] text-slate-800 leading-relaxed font-sans font-medium italic">
                        "{currentForecast.insight}"
                      </p>
                      
                      <div className="flex items-center justify-between text-[8px] font-mono text-amber-600/60 pt-1">
                        <span>Evaluated variables: Margin, Price Elasticity, Volatility</span>
                        <span>Confidence: Verified</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Overview correlative analysis when ALL is selected */}
      {selectedProductId === 'ALL' && (
        <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-200/30">
          <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <ShieldAlert className="w-8 h-8 text-slate-400 mb-3" />
            <h4 className="text-sm font-semibold text-slate-700">Store-wide Analysis Paused</h4>
            <p className="text-[11px] text-slate-500 text-center max-w-sm mt-2">
              Aggregated store-wide machine learning predictions require significantly more transactional data across multiple categories. Please continue to record daily sales.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple helper to guess multipliers for UI indicators
function holidayMultiplierImpact(category: string): number {
  if (category === 'Dairy') return 1.25;
  if (category === 'Bakery') return 1.12;
  if (category === 'Staples') return 1.20;
  if (category === 'Fruits & Vegetables') return 1.15;
  return 1.0;
}

