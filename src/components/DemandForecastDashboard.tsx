import React, { useState, useMemo } from 'react';
import { Product, SaleRecord, InventoryBatch } from '../types/retail';
import { forecastService, ForecastResult, DemandTrend, InventoryRisk, ReorderStatus, MovementStatus } from '../lib/services/forecastService';
import { 
  BrainCircuit, TrendingUp, AlertTriangle, PackageSearch, 
  Clock, ArrowUpDown, Info, PackageX, TrendingDown,
  BarChart2, ShieldAlert, Tag, ShoppingCart, Zap, Box, PieChart as PieChartIcon
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

interface Props {
  products: Product[];
  salesLogs: SaleRecord[];
  batches?: InventoryBatch[];
}

type SortField = 'productName' | 'currentStock' | 'velocity7d' | 'velocity30d' | 'estimatedDaysRemaining';
type SortOrder = 'asc' | 'desc';

export function DemandForecastDashboard({ products, salesLogs, batches = [] }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterTrend, setFilterTrend] = useState<DemandTrend | 'ALL'>('ALL');
  const [filterRisk, setFilterRisk] = useState<InventoryRisk | 'ALL'>('ALL');
  const [filterReorder, setFilterReorder] = useState<ReorderStatus | 'ALL'>('ALL');
  const [filterMovement, setFilterMovement] = useState<MovementStatus | 'ALL'>('ALL');
  
  const [sortField, setSortField] = useState<SortField>('velocity7d');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const [selectedProduct, setSelectedProduct] = useState<ForecastResult | null>(null);

  // 1. Generate Forecasts for all products reactively
  const forecasts = useMemo(() => {
    return products.map(p => forecastService.generateForecast(p, salesLogs, batches));
  }, [products, salesLogs, batches]);

  // 2. Compute KPIs
  const kpis = useMemo(() => {
    let sumDays = 0;
    let countDays = 0;
    forecasts.forEach(f => {
      if (f.estimatedDaysRemaining !== null && f.estimatedDaysRemaining < 999) {
        sumDays += f.estimatedDaysRemaining;
        countDays++;
      }
    });

    return {
      total: forecasts.length,
      highDemand: forecasts.filter(f => f.demandTrend === 'RAPIDLY_INCREASING' || f.demandTrend === 'INCREASING').length,
      lowStock: forecasts.filter(f => f.coverageStatus === 'CRITICAL' || f.coverageStatus === 'LOW').length,
      needsReorder: forecasts.filter(f => ['URGENT', 'REORDER'].includes(f.reorderStatus)).length,
      overstocked: forecasts.filter(f => f.isOverstock).length,
      slowMoving: forecasts.filter(f => f.isSlowMoving).length,
      expiring: forecasts.filter(f => f.expiryAlert !== null).length,
      avgCoverage: countDays > 0 ? Math.round(sumDays / countDays) : 0
    };
  }, [forecasts]);

  // 3. Filter & Sort Table Data
  const filteredData = useMemo(() => {
    let result = forecasts;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.productName.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
    }
    if (filterCategory !== 'ALL') result = result.filter(f => f.category === filterCategory);
    if (filterTrend !== 'ALL') result = result.filter(f => f.demandTrend === filterTrend);
    if (filterRisk !== 'ALL') result = result.filter(f => f.inventoryRisk === filterRisk);
    if (filterReorder !== 'ALL') result = result.filter(f => f.reorderStatus === filterReorder);
    if (filterMovement !== 'ALL') result = result.filter(f => f.movementStatus === filterMovement);

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === null) valA = sortOrder === 'asc' ? Infinity : -Infinity;
      if (valB === null) valB = sortOrder === 'asc' ? Infinity : -Infinity;
      
      let comp = 0;
      if (valA < valB) comp = -1;
      if (valA > valB) comp = 1;
      return sortOrder === 'asc' ? comp : -comp;
    });

    return result;
  }, [forecasts, searchQuery, filterCategory, filterTrend, filterRisk, filterReorder, filterMovement, sortField, sortOrder]);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  // 4. Chart Data Preparation
  const topSellingData = useMemo(() => {
    return [...forecasts].sort((a, b) => b.totalUnitsSold - a.totalUnitsSold).slice(0, 5).map(f => ({
      name: f.productName.length > 15 ? f.productName.substring(0, 15) + '...' : f.productName,
      units: f.totalUnitsSold
    }));
  }, [forecasts]);

  const riskPieData = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    forecasts.forEach(f => { counts[f.inventoryRisk]++; });
    return [
      { name: 'Critical', value: counts.CRITICAL, color: '#e11d48' },
      { name: 'High', value: counts.HIGH, color: '#f59e0b' },
      { name: 'Medium', value: counts.MEDIUM, color: '#3b82f6' },
      { name: 'Low', value: counts.LOW, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [forecasts]);

  const renderBadge = (text: string, type: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEUTRAL') => {
    const colors = {
      CRITICAL: 'bg-rose-100 text-rose-700 border-rose-200',
      HIGH: 'bg-amber-100 text-amber-700 border-amber-200',
      MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
      LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      NEUTRAL: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-md ${colors[type]}`}>{text}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-7 h-7 text-indigo-600" />
            Demand Forecasting & Inventory Intelligence
          </h2>
          <p className="text-sm text-slate-500 mt-1">Data-driven reorder recommendations, velocity tracking, and stock-out prevention</p>
        </div>
      </div>

      {/* KPI Row (Model 3) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Products', value: kpis.total, icon: <PackageSearch className="w-4 h-4" />, color: 'text-slate-700' },
          { label: 'High Demand', value: kpis.highDemand, icon: <TrendingUp className="w-4 h-4" />, color: 'text-emerald-600' },
          { label: 'Low Stock', value: kpis.lowStock, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-rose-600' },
          { label: 'Reorder Needed', value: kpis.needsReorder, icon: <ShoppingCart className="w-4 h-4" />, color: 'text-amber-600' },
          { label: 'Overstocked', value: kpis.overstocked, icon: <Box className="w-4 h-4" />, color: 'text-indigo-600' },
          { label: 'Slow Moving', value: kpis.slowMoving, icon: <TrendingDown className="w-4 h-4" />, color: 'text-slate-400' },
          { label: 'Expiring Soon', value: kpis.expiring, icon: <Clock className="w-4 h-4" />, color: 'text-orange-500' },
          { label: 'Avg Coverage', value: `${kpis.avgCoverage}d`, icon: <ShieldAlert className="w-4 h-4" />, color: 'text-blue-600' },
        ].map((kpi, i) => (
          <div key={i} className="glass-card p-4 rounded-2xl border border-slate-200/50 bg-white hover:shadow-md transition">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
              {kpi.icon} {kpi.label}
            </div>
            <div className={`text-xl font-black ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Analytics Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 rounded-3xl border border-slate-200/50 bg-white">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-indigo-500" /> Top Selling Products (30 Days)</h3>
          <div className="h-64">
            {topSellingData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSellingData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="units" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">No historical sales data available.</div>
            )}
          </div>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-slate-200/50 bg-white">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-rose-500" /> Inventory Risk Distribution</h3>
          <div className="h-64">
            {riskPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {riskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">No risk data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="glass-card rounded-3xl border border-slate-200/50 overflow-hidden bg-white shadow-sm flex flex-col lg:flex-row">
        
        {/* Table Content */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-slate-100">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center bg-slate-50/50">
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm w-48 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold">
              <option value="ALL">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterTrend} onChange={(e) => setFilterTrend(e.target.value as any)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold">
              <option value="ALL">All Trends</option>
              <option value="RAPIDLY_INCREASING">Rapidly Increasing</option>
              <option value="INCREASING">Increasing</option>
              <option value="STABLE">Stable</option>
              <option value="DECREASING">Decreasing</option>
              <option value="INSUFFICIENT_DATA">Insufficient Data</option>
            </select>
            <select value={filterReorder} onChange={(e) => setFilterReorder(e.target.value as any)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold">
              <option value="ALL">All Reorder Status</option>
              <option value="URGENT">Urgent</option>
              <option value="REORDER">Reorder</option>
              <option value="WATCH">Watch</option>
              <option value="HEALTHY">Healthy</option>
              <option value="OVERSTOCK">Overstock</option>
            </select>
            <div className="ml-auto text-xs font-bold text-slate-500 uppercase tracking-widest">{filteredData.length} SKUs</div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1 h-[500px] overflow-y-auto">
            {filteredData.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <PackageX className="w-12 h-12 text-slate-200 mb-3" />
                <span className="text-sm font-medium">No products match your filters.</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('productName')}>Product <ArrowUpDown className="w-3 h-3 inline" /></th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('currentStock')}>Stock <ArrowUpDown className="w-3 h-3 inline" /></th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('velocity7d')}>7D Vel <ArrowUpDown className="w-3 h-3 inline" /></th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('velocity30d')}>30D Vel <ArrowUpDown className="w-3 h-3 inline" /></th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Demand Trend</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('estimatedDaysRemaining')}>Days Left <ArrowUpDown className="w-3 h-3 inline" /></th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Risk</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map(f => (
                    <tr 
                      key={f.productId} 
                      onClick={() => setSelectedProduct(f)}
                      className={`cursor-pointer transition ${selectedProduct?.productId === f.productId ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">{f.productName}</div>
                        <div className="text-[10px] text-slate-500">{f.category}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{f.currentStock}</td>
                      <td className="py-3 px-4 text-sm font-mono">{f.velocity7d.toFixed(1)}/d</td>
                      <td className="py-3 px-4 text-sm font-mono text-slate-500">{f.velocity30d.toFixed(1)}/d</td>
                      <td className="py-3 px-4">
                        {f.demandTrend === 'RAPIDLY_INCREASING' && renderBadge('Surging', 'HIGH')}
                        {f.demandTrend === 'INCREASING' && renderBadge('Rising', 'MEDIUM')}
                        {f.demandTrend === 'STABLE' && renderBadge('Stable', 'LOW')}
                        {f.demandTrend === 'DECREASING' && renderBadge('Falling', 'HIGH')}
                        {f.demandTrend === 'RAPIDLY_DECREASING' && renderBadge('Dropping', 'CRITICAL')}
                        {f.demandTrend === 'INSUFFICIENT_DATA' && renderBadge('No Data', 'NEUTRAL')}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        {f.estimatedDaysRemaining !== null ? (
                          <span className={f.estimatedDaysRemaining <= 7 ? 'text-rose-600' : 'text-slate-700'}>{Math.ceil(f.estimatedDaysRemaining)}d</span>
                        ) : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {f.inventoryRisk === 'CRITICAL' && renderBadge('CRITICAL', 'CRITICAL')}
                        {f.inventoryRisk === 'HIGH' && renderBadge('HIGH', 'HIGH')}
                        {f.inventoryRisk === 'MEDIUM' && renderBadge('MEDIUM', 'MEDIUM')}
                        {f.inventoryRisk === 'LOW' && renderBadge('LOW', 'LOW')}
                      </td>
                      <td className="py-3 px-4">
                        {f.reorderStatus === 'URGENT' || f.reorderStatus === 'REORDER' ? (
                          <span className="text-xs font-bold text-indigo-600 flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Buy {f.recommendedReorderQuantity}</span>
                        ) : f.expiryAlert ? (
                          <span className="text-xs font-bold text-orange-600 flex items-center gap-1"><Tag className="w-3 h-3" /> Promo</span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">Monitor</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Product Detail Panel (Right Side) */}
        <div className="w-full lg:w-[400px] bg-slate-50/50 p-6 flex-shrink-0 border-t lg:border-t-0 border-slate-100 overflow-y-auto">
          {selectedProduct ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedProduct.productName}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">{selectedProduct.category}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Current Stock</div>
                  <div className="text-2xl font-black text-slate-800">{selectedProduct.currentStock}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Estimated Runout</div>
                  <div className={`text-2xl font-black ${selectedProduct.estimatedDaysRemaining && selectedProduct.estimatedDaysRemaining <= 7 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {selectedProduct.estimatedDaysRemaining ? `${Math.ceil(selectedProduct.estimatedDaysRemaining)} days` : 'Unknown'}
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b pb-2"><Zap className="w-4 h-4 text-amber-500" /> Velocity Insights</h4>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">7-Day Velocity:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedProduct.velocity7d.toFixed(1)} / day</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">30-Day Velocity:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedProduct.velocity30d.toFixed(1)} / day</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Demand Trend:</span>
                  <span className="font-bold text-indigo-600">{selectedProduct.demandTrend.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Movement:</span>
                  <span className="font-bold text-slate-700">{selectedProduct.movementStatus.replace('_', ' ')}</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border ${selectedProduct.inventoryRisk === 'CRITICAL' ? 'bg-rose-50 border-rose-200 text-rose-800' : selectedProduct.inventoryRisk === 'HIGH' ? 'bg-amber-50 border-amber-200 text-amber-800' : selectedProduct.inventoryRisk === 'MEDIUM' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Risk Analysis: {selectedProduct.inventoryRisk}
                </h4>
                <p className="text-sm font-medium leading-relaxed">{selectedProduct.riskReason}</p>
                {selectedProduct.expiryAlert && (
                  <p className="text-sm font-bold mt-2 text-rose-600 border-t border-rose-200/50 pt-2">{selectedProduct.expiryAlert}</p>
                )}
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg">
                <h4 className="text-[10px] text-slate-400 font-mono uppercase mb-2">Smart Action Engine</h4>
                <p className="text-sm font-semibold leading-relaxed text-indigo-50 mb-4">{selectedProduct.smartRecommendation}</p>
                
                {selectedProduct.recommendedReorderQuantity > 0 && (
                  <div className="flex items-center justify-between border-t border-slate-700 pt-4">
                    <span className="text-sm font-mono text-slate-300">Suggested PO</span>
                    <span className="text-xl font-black text-indigo-400">{selectedProduct.recommendedReorderQuantity} Units</span>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <BrainCircuit className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-sm font-semibold text-slate-800">Select a Product</h3>
              <p className="text-xs text-slate-500 font-mono mt-2">Click on any row in the table to view detailed deterministic analytics, velocity trends, and exact reorder recommendations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
