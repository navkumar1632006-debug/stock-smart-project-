import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Product } from '../../types/retail';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Type as FontIcon, Trash2, Download, Filter, Eye, AlertTriangle, AlertCircle, CheckCircle2, Loader2, PackageX } from 'lucide-react';
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
      <Card className="border-slate-100">
        {/* Header & Main Actions */}
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Inventory Catalogue</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Dual-channel stock reconciliation & ledger</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={downloadCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Badge variant="secondary">{userRole} Access</Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="md:col-span-4 relative">
              <Input 
                type="text" 
                placeholder="Search by name or SKU..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full bg-white" 
              />
            </div>
            
            <div className="md:col-span-4 flex items-center space-x-2">
              <Filter className="w-5 h-5 text-slate-400 shrink-0" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow cursor-pointer"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="md:col-span-4 flex items-center space-x-2">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow cursor-pointer"
              >
                <option value="All">All Stock Levels</option>
                <option value="In Stock">In Stock (Healthy)</option>
                <option value="Low Stock">Low Stock (Warning)</option>
                <option value="Out of Stock">Out of Stock (Critical)</option>
              </select>
            </div>
          </div>

          {/* Results Info */}
          <div className="text-xs text-slate-500 flex items-center justify-between font-medium">
            <span>Showing {filteredProducts.length} items</span>
            {stockFilter !== 'All' && <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">Filtered: {stockFilter}</span>}
          </div>

          {/* Table / Loading / Empty States */}
          {isLoading ? (
            <EmptyState 
              icon={<Loader2 className="w-12 h-12 text-slate-300 animate-spin" />}
              title="Loading Inventory"
              description="Please wait while we fetch the latest catalog data."
            />
          ) : filteredProducts.length === 0 ? (
            <EmptyState 
              icon={<PackageX className="w-12 h-12 text-slate-300" />}
              title="No Products Found"
              description="Try adjusting your filters or search query to find what you're looking for."
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white hidden md:block">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold tracking-wider">
                      <th className="py-3 px-4 font-semibold">Product Info</th>
                      <th className="py-3 px-4 text-right font-semibold">M.R.P</th>
                      <th className="py-3 px-4 text-right font-semibold">Cost</th>
                      <th className="py-3 px-4 text-center font-semibold">Status</th>
                      <th className="py-3 px-4 text-right font-semibold">In Stock</th>
                      <th className="py-3 px-4 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredProducts.map((p) => {
                      const status = getStockStatus(p);
                      const StatusIcon = status.icon;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{p.name}</span>
                              <span className="text-xs text-slate-500 mt-0.5">{p.sku} • {p.category}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums">₹{p.price}</td>
                          <td className="py-3 px-4 text-right text-slate-500 tabular-nums">₹{p.cost}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={status.variant} className="inline-flex items-center space-x-1.5 px-2">
                              <StatusIcon className="w-3.5 h-3.5" />
                              <span>{status.label}</span>
                            </Badge>
                          </td>
                          <td className={`py-3 px-4 text-right font-bold text-sm tabular-nums ${p.stockLevel === 0 ? 'text-rose-600' : p.stockLevel <= p.reorderPoint ? 'text-amber-600' : 'text-slate-800'}`}>
                            {p.stockLevel}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button onClick={() => setSelectedProduct(p)} variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900" title="View Details">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button onClick={() => onEditClick(p)} variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-900" title="Edit Product">
                                <FontIcon className="w-4 h-4" />
                              </Button>
                              <Button onClick={() => deleteProduct(p.id, p.name)} variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-900" title="Delete Product">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {filteredProducts.map((p) => {
                  const status = getStockStatus(p);
                  const StatusIcon = status.icon;
                  return (
                    <div key={p.id} className="p-4 bg-white shadow-sm border border-slate-200 rounded-xl space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm leading-snug">{p.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{p.sku} • {p.category}</div>
                        </div>
                        <Badge variant={status.variant} className="shrink-0 flex items-center space-x-1">
                          <StatusIcon className="w-3 h-3" />
                          <span>{status.label}</span>
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div>
                          <div className="text-xs text-slate-500">Cost: ₹{p.cost}</div>
                          <div className="text-sm text-slate-900 font-bold mt-0.5">MRP: ₹{p.price}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Min: {p.reorderPoint}</div>
                          <div className={`font-black text-lg mt-0.5 ${p.stockLevel === 0 ? 'text-rose-600' : p.stockLevel <= p.reorderPoint ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {p.stockLevel}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-2">
                        <Button onClick={() => setSelectedProduct(p)} variant="outline" size="sm" className="flex-1">View</Button>
                        <Button onClick={() => onEditClick(p)} variant="secondary" size="sm" className="flex-1">Edit</Button>
                        <Button onClick={() => deleteProduct(p.id, p.name)} variant="destructive" size="sm" className="flex-none px-3">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedProduct && (
        <ProductDetailsDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </>
  );
};
