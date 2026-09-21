import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { discountEngine, ExpiryStatus } from '../../lib/services/discountEngine';
import { inventoryService } from '../../lib/services/inventoryService';
import { AlertOctagon, TrendingDown, Clock, ShieldAlert, Tag, Calendar, Search, ArrowUpDown, Info, PackageX } from 'lucide-react';
import { DiscountRecommendationModal } from './DiscountRecommendationModal';
import { InventoryBatch } from '../../types/retail';

type SortField = 'expiryDate' | 'currentQuantity' | 'productName';
type SortOrder = 'asc' | 'desc';

export const ExpiryDashboard: React.FC = () => {
  const { batches, refreshData, isLoading } = useInventory();
  const [filterStatus, setFilterStatus] = useState<ExpiryStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('expiryDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  const [selectedBatch, setSelectedBatch] = useState<(InventoryBatch & { evaluation: any }) | null>(null);

  // Evaluate batches dynamically for the dashboard UI grouping
  const evaluatedBatches = useMemo(() => {
    return batches.map(batch => {
      const evaluation = discountEngine.evaluateBatch(batch);
      return { ...batch, evaluation };
    });
  }, [batches]);

  const stats = useMemo(() => ({
    total: evaluatedBatches.length,
    expired: evaluatedBatches.filter(b => b.evaluation.status === 'Expired' && b.currentQuantity > 0).length,
    critical: evaluatedBatches.filter(b => b.evaluation.status === 'Critical' && b.currentQuantity > 0).length,
    urgent: evaluatedBatches.filter(b => b.evaluation.status === 'Urgent' && b.currentQuantity > 0).length,
    warning: evaluatedBatches.filter(b => b.evaluation.status === 'Warning' && b.currentQuantity > 0).length,
    healthy: evaluatedBatches.filter(b => b.evaluation.status === 'Healthy' && b.currentQuantity > 0).length,
    atRiskValue: evaluatedBatches
      .filter(b => ['Expired', 'Critical', 'Urgent'].includes(b.evaluation.status) && b.currentQuantity > 0)
      .reduce((sum, b) => sum + (b.originalPrice * b.currentQuantity), 0),
  }), [evaluatedBatches]);

  const filteredAndSortedBatches = useMemo(() => {
    let result = evaluatedBatches;

    if (filterStatus !== 'All') {
      result = result.filter(b => b.evaluation.status === filterStatus);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.productName.toLowerCase().includes(q) || 
        b.batchNumber.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'productName') {
        comparison = a.productName.localeCompare(b.productName);
      } else if (sortField === 'currentQuantity') {
        comparison = a.currentQuantity - b.currentQuantity;
      } else if (sortField === 'expiryDate') {
        const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
        const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [evaluatedBatches, filterStatus, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleMarkExpired = async (batchId: string, productId: string, currentQty: number) => {
    try {
      await inventoryService.markBatchExpired(batchId, productId, currentQty);
      await refreshData();
      alert('Batch marked as expired and stock deducted successfully.');
    } catch (err: any) {
      alert('Failed to mark batch expired: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            Expiry Management & Smart Discounts
          </h2>
          <p className="text-sm text-slate-500 mt-1">FEFO Tracking, Clearance Recommendations, and Automated Shelf Audits</p>
        </div>
      </div>

      {/* KPI Cards (Model 3 Premium SaaS Style) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div 
          onClick={() => setFilterStatus('All')}
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition ${filterStatus === 'All' ? 'ring-2 ring-slate-500 border-slate-300 bg-white shadow-md' : 'border-slate-200/50 hover:border-slate-300'}`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Total Batches</div>
          <div className="text-2xl font-black text-slate-800">{stats.total}</div>
        </div>
        
        <div 
          onClick={() => setFilterStatus('Expired')}
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition ${filterStatus === 'Expired' ? 'ring-2 ring-rose-500 border-rose-200 bg-rose-50 shadow-md shadow-rose-500/10' : 'border-slate-200/50 hover:border-rose-300'}`}
        >
          <div className="flex items-center gap-1.5 text-rose-600 mb-2">
            <AlertOctagon className="w-3.5 h-3.5" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Expired</h3>
          </div>
          <div className="text-2xl font-black text-rose-700">{stats.expired}</div>
        </div>
        
        <div 
          onClick={() => setFilterStatus('Critical')}
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition ${filterStatus === 'Critical' ? 'ring-2 ring-amber-500 border-amber-200 bg-amber-50 shadow-md shadow-amber-500/10' : 'border-slate-200/50 hover:border-amber-300'}`}
        >
          <div className="flex items-center gap-1.5 text-amber-600 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Critical (≤3d)</h3>
          </div>
          <div className="text-2xl font-black text-amber-700">{stats.critical}</div>
        </div>

        <div 
          onClick={() => setFilterStatus('Urgent')}
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition ${filterStatus === 'Urgent' ? 'ring-2 ring-orange-500 border-orange-200 bg-orange-50 shadow-md shadow-orange-500/10' : 'border-slate-200/50 hover:border-orange-300'}`}
        >
          <div className="flex items-center gap-1.5 text-orange-600 mb-2">
            <TrendingDown className="w-3.5 h-3.5" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Urgent (≤7d)</h3>
          </div>
          <div className="text-2xl font-black text-orange-700">{stats.urgent}</div>
        </div>

        <div 
          onClick={() => setFilterStatus('Warning')}
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition ${filterStatus === 'Warning' ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50 shadow-md shadow-blue-500/10' : 'border-slate-200/50 hover:border-blue-300'}`}
        >
          <div className="flex items-center gap-1.5 text-blue-600 mb-2">
            <Clock className="w-3.5 h-3.5" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Warn (≤30d)</h3>
          </div>
          <div className="text-2xl font-black text-blue-700">{stats.warning}</div>
        </div>

        <div 
          className="bg-white p-4 rounded-xl shadow-sm border border-indigo-200 bg-indigo-50/50"
        >
          <div className="flex items-center gap-1.5 text-indigo-700 mb-2">
            <Tag className="w-3.5 h-3.5" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">At-Risk Value</h3>
          </div>
          <div className="text-2xl font-black text-indigo-700">₹{stats.atRiskValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/50 overflow-hidden bg-white shadow-sm">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products or batch..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>
          <div className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
            {filterStatus === 'All' ? 'All Tracked Batches' : `${filterStatus} Batches`}
            <span className="ml-2 bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full text-xs">{filteredAndSortedBatches.length}</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <span className="text-sm font-medium">Scanning expiration data...</span>
            </div>
          ) : filteredAndSortedBatches.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <PackageX className="w-12 h-12 text-slate-200 mb-3" />
              <span className="text-sm font-medium">No batches found matching your criteria.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition" onClick={() => toggleSort('productName')}>
                    <div className="flex items-center gap-1">Product <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Batch No.</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition" onClick={() => toggleSort('expiryDate')}>
                    <div className="flex items-center gap-1">Expiry Date <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition" onClick={() => toggleSort('currentQuantity')}>
                    <div className="flex items-center gap-1">Stock <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedBatches.map(b => {
                  const { status, daysUntilExpiry } = b.evaluation;
                  
                  let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                  if (status === 'Expired') badgeColor = 'bg-rose-100 text-rose-700 border-rose-200';
                  if (status === 'Critical') badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                  if (status === 'Urgent') badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';
                  if (status === 'Warning') badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
                  if (status === 'Healthy') badgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';

                  const isZeroStock = b.currentQuantity === 0;

                  return (
                    <tr key={b.id} className={`hover:bg-slate-50/80 transition ${isZeroStock ? 'opacity-50' : ''}`}>
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900 text-sm">{b.productName}</div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block">
                          {b.batchNumber}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">
                            {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'N/A'}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${daysUntilExpiry <= 3 ? 'text-rose-500' : 'text-slate-400'}`}>
                            {daysUntilExpiry === 999 ? '' : (daysUntilExpiry < 0 ? 'Expired' : `${daysUntilExpiry} days left`)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="text-sm font-semibold text-slate-900">
                          {b.currentQuantity} <span className="text-xs text-slate-400 font-normal">/ {b.initialQuantity}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-md ${badgeColor}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button 
                          onClick={() => setSelectedBatch(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition shadow-sm"
                        >
                          <Info className="w-3.5 h-3.5" />
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedBatch && (
        <DiscountRecommendationModal 
          batch={selectedBatch}
          isOpen={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
          onMarkExpired={handleMarkExpired}
        />
      )}
    </div>
  );
};
