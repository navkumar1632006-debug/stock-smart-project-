import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Product } from '../../types/retail';
import { Plus, Loader2 } from 'lucide-react';

interface ProductFormProps {
  editProduct: Product | null;
  onCancelEdit: () => void;
  userRole: string;
}

export const ProductForm: React.FC<ProductFormProps> = ({ editProduct, onCancelEdit, userRole }) => {
  const { addProduct, updateProduct } = useInventory();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('Dairy');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [reorderPoint, setReorderPoint] = useState('5');
  const [stockLevel, setStockLevel] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    if (editProduct) {
      setName(editProduct.name);
      setCategory(editProduct.category);
      setSku(editProduct.sku);
      setPrice(editProduct.price.toString());
      setCost(editProduct.cost.toString());
      setReorderPoint(editProduct.reorderPoint.toString());
      setStockLevel(editProduct.stockLevel.toString());
      setBatchNo('');
      setExpiryDate('');
    } else {
      setName('');
      setSku('');
      setPrice('');
      setCost('');
      setStockLevel('');
      setBatchNo('');
      setExpiryDate('');
    }
  }, [editProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editProduct) {
        await updateProduct(editProduct.id, {
          name,
          category,
          sku,
          price: Number(price),
          cost: Number(cost),
          reorderPoint: Number(reorderPoint),
          stockLevel: Number(stockLevel) // Service securely calls RPC for changes
        });
        onCancelEdit();
      } else {
        await addProduct({
          name,
          category,
          sku,
          price: Number(price),
          cost: Number(cost),
          reorderPoint: Number(reorderPoint),
          stockLevel: Number(stockLevel) || 0
        });
        
        setName('');
        setSku('');
        setPrice('');
        setCost('');
        setStockLevel('');
      }
    } catch (err) {
      alert("Failed to save product.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userRole !== 'Owner' && userRole !== 'Manager') {
    return (
      <div className="glass-card p-6 rounded-3xl border border-slate-200/30">
        <div className="bg-indigo-500/5 border border-indigo-200 rounded-2xl p-6 text-[10.5px] text-slate-500/90 font-mono text-center">
          🔒 Access Locked: Role <b>{userRole}</b> is not authorized to register catalog products. Swap to Owner/Manager roles to unlock.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-200/30 space-y-4">
      <div className="flex items-center space-x-2 border-b border-slate-200/30 pb-2">
        <Plus className="w-4 h-4 text-indigo-600" />
        <h4 className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider">
          {editProduct ? 'Edit SKU Item' : 'Register New SKU Item'}
        </h4>
        {editProduct && (
          <button onClick={onCancelEdit} className="ml-auto text-[10px] text-slate-500 hover:text-slate-800 font-medium underline">
            Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-[9px] uppercase font-mono text-slate-500/90">Product Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] uppercase font-mono text-slate-500/90">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full mt-1 px-2 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="Dairy">Dairy</option>
              <option value="Bakery">Bakery</option>
              <option value="Staples">Staples</option>
              <option value="Grocery">Grocery</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Fruits & Vegetables">Fruits & Veg</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] uppercase font-mono text-slate-500/90">SKU Code *</label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[9px] uppercase font-mono text-slate-500/90">MRP (₹) *</label>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase font-mono text-slate-500/90">Cost (₹) *</label>
            <input
              type="number"
              required
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase font-mono text-slate-500/90">Safety Min</label>
            <input
              type="number"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
              className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {!editProduct && (
          <div className="border-t border-slate-200/30 pt-2.5 space-y-2">
            <span className="text-[8.5px] font-mono text-slate-500/90 uppercase tracking-widest font-semibold block">
              Initial Stock / Expiry Tracking (Optional)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[8px] uppercase font-mono text-slate-400">Initial Qty</label>
                <input
                  type="number"
                  value={stockLevel}
                  onChange={(e) => setStockLevel(e.target.value)}
                  className="w-full mt-1 px-2 py-1 bg-slate-50 border border-slate-200/30 rounded-xl text-[10px] font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="text-[8px] uppercase font-mono text-slate-400">Batch No</label>
                <input
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  className="w-full mt-1 px-2 py-1 bg-slate-50 border border-slate-200/30 rounded-xl text-[10px] font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="text-[8px] uppercase font-mono text-slate-400">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full mt-1 px-1.5 py-1 bg-slate-50 border border-slate-200/30 rounded-xl text-[10px] font-mono text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {editProduct && (
          <div className="grid grid-cols-1 gap-2">
             <div>
                <label className="text-[9px] uppercase font-mono text-slate-500/90">Adjust Stock Level (Absolute)</label>
                <input
                  type="number"
                  value={stockLevel}
                  onChange={(e) => setStockLevel(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none"
                />
              </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[11px] font-semibold uppercase text-slate-900 tracking-wider flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{editProduct ? 'Save Changes' : 'Add to Catalog'}</span>
        </button>
      </form>
    </div>
  );
};
