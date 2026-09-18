import React, { useState } from 'react';
import { ProductTable } from './ProductTable';
import { ProductForm } from './ProductForm';
import { StockMovementHistory } from './StockMovementHistory';
import { Product } from '../../types/retail';
import { useInventory } from '../../context/InventoryContext';
import { Package, AlertTriangle, IndianRupee, TrendingDown } from 'lucide-react';

interface InventoryDashboardProps {
  userRole: string;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ userRole }) => {
  const { products } = useInventory();
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const handleEditClick = (product: Product) => {
    setEditProduct(product);
  };

  const totalProducts = products.length;
  const inventoryValue = products.reduce((sum, p) => sum + (p.cost * p.stockLevel), 0);
  const lowStockCount = products.filter(p => p.stockLevel > 0 && p.stockLevel <= p.reorderPoint).length;
  const outOfStockCount = products.filter(p => p.stockLevel === 0).length;

  return (
    <div className="space-y-6">
      {/* Inventory Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Total SKUs</p>
            <p className="text-xl font-black text-slate-900">{totalProducts}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Total Value (Cost)</p>
            <p className="text-xl font-black text-slate-900">₹{inventoryValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Low Stock</p>
            <p className="text-xl font-black text-amber-600">{lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Out of Stock</p>
            <p className="text-xl font-black text-rose-600">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Table & Inventory Add (Span 7) */}
        <div className="lg:col-span-8 space-y-6">
          <ProductTable onEditClick={handleEditClick} userRole={userRole} />
        </div>

        {/* Right Column: Add/Edit Product & Batches (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          <ProductForm 
            editProduct={editProduct} 
            onCancelEdit={() => setEditProduct(null)} 
            userRole={userRole} 
          />
          <div className="grid grid-cols-1 gap-6">
            <StockMovementHistory />
          </div>
        </div>
      </div>
    </div>
  );
};
