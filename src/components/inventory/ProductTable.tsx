import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Product } from '../../types/retail';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Type as FontIcon, Trash2, Download, Filter, Eye, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ProductDetailsDrawer } from './ProductDetailsDrawer';

interface ProductTableProps {
  onEditClick: (product: Product) => void;
  userRole: string;
}

export const ProductTable: React.FC<ProductTableProps> = ({ onEditClick, userRole }) => {
  const { products, isLoading, deleteProduct } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    
    let matchesStock = true;
    if (stockFilter === 'In Stock') matchesStock = p.stockLevel > p.reorderPoint;
    if (stockFilter === 'Low Stock') matchesStock = p.stockLevel <= p.reorderPoint && p.stockLevel > 0;
    if (stockFilter === 'Out of Stock') matchesStock = p.stockLevel === 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const downloadCSV = () => {
    const headers = ['SKU', 'Name', 'Category', 'MRP', 'Cost', 'Stock Level', 'Reorder Point'];
    const rows = filteredProducts.map(p => [
      p.sku, p.name, p.category, p.price, p.cost, p.stockLevel, p.reorderPoint
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'stocksmart_inventory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStockStatus = (p: Product) => {
    if (p.stockLevel === 0) return { label: 'OUT OF STOCK', variant: 'destructive' as const, icon: AlertCircle };
    if (p.stockLevel <= p.reorderPoint) return { label: 'LOW STOCK', variant: 'warning' as const, icon: AlertTriangle };
    return { label: 'IN STOCK', variant: 'success' as const, icon: CheckCircle2 };
  };

  return (
    <>
      <Card className="p-6 space-y-6 border-slate-200/30">
        {/* Header & Main Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Inventory Catalogue</h3>
            <p className="text-[10px] font-mono text-slate-500/90 mt-1">Dual-channel stock reconciliation & ledger</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={downloadCSV} variant="outline" size="sm">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV
            </Button>
            <Badge variant="default" className="bg-indigo-50 text-indigo-700 border border-indigo-100">{userRole} Access</Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/30">
          <div className="md:col-span-4 relative">
            <Input type="text" placeholder="Search by name or SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full font-mono text-xs pl-4" />
          </div>
          
          <div className="md:col-span-4 flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200/50 shadow-sm rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="md:col-span-4 flex items-center space-x-2">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200/50 shadow-sm rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Stock Levels</option>
              <option value="In Stock">In Stock (Healthy)</option>
              <option value="Low Stock">Low Stock (Warning)</option>
              <option value="Out of Stock">Out of Stock (Critical)</option>
            </select>
          </div>
        </div>

        {/* Results Info */}
        <div className="text-[10px] font-mono text-slate-500/90 flex items-center justify-between">
          <span>Showing {filteredProducts.length} items</span>
          {stockFilter !== 'All' && <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">Filtered: {stockFilter}</span>}
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/30 bg-white shadow-sm hidden md:block">
          <table className="w-full text-left border-collapse font-mono text-[11px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-500/90 text-[9px] uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Product Info</th>
                <th className="py-3 px-4 text-right">M.R.P</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">In Stock</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500/90 animate-pulse">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500/90 flex flex-col items-center">
                    <Filter className="w-8 h-8 mb-3 opacity-20" />
                    No products found matching active filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const status = getStockStatus(p);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-sans font-bold text-slate-900 text-xs">{p.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">{p.sku} • {p.category}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums">₹{p.price}</td>
                      <td className="py-3 px-4 text-right text-slate-500/90 tabular-nums">₹{p.cost}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={status.variant} className="space-x-1">
                          <StatusIcon className="w-3 h-3" />
                          <span>{status.label}</span>
                        </Badge>
                      </td>
                      <td className={`py-3 px-4 text-right font-extrabold text-sm tabular-nums ${p.stockLevel === 0 ? 'text-rose-600' : p.stockLevel <= p.reorderPoint ? 'text-amber-600' : 'text-slate-800'}`}>
                        {p.stockLevel}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button onClick={() => setSelectedProduct(p)} variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900" title="View Details"><Eye className="w-4 h-4" /></Button>
                          <Button onClick={() => onEditClick(p)} variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-900" title="Edit Product"><FontIcon className="w-4 h-4" /></Button>
                          <Button onClick={() => deleteProduct(p.id, p.name)} variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-900" title="Delete Product"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-10 text-slate-500/90 text-xs font-mono">Loading inventory...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-10 text-slate-500/90 text-xs font-mono">No products found.</div>
          ) : (
            filteredProducts.map((p) => {
              const status = getStockStatus(p);
              return (
                <div key={p.id} className="p-4 bg-white shadow-sm border border-slate-200/70 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                      <div className="text-[10px] text-slate-500/90 font-mono mt-0.5">{p.sku} • {p.category}</div>
                    </div>
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-end bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-500/90 font-mono">Cost: ₹{p.cost}</div>
                      <div className="text-[11px] text-slate-900 font-bold font-mono">MRP: ₹{p.price}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-slate-500/90 font-mono">Min: {p.reorderPoint}</div>
                      <div className={`font-black text-lg ${p.stockLevel === 0 ? 'text-rose-600' : p.stockLevel <= p.reorderPoint ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {p.stockLevel}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-1">
                    <Button onClick={() => setSelectedProduct(p)} variant="secondary" size="sm" className="flex-1 text-xs">View</Button>
                    <Button onClick={() => onEditClick(p)} variant="secondary" size="sm" className="flex-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-transparent">Edit</Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {selectedProduct && (
        <ProductDetailsDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </>
  );
};
