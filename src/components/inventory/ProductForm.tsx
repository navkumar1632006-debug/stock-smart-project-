import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Product } from '../../types/retail';
import { Plus, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

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
      <Card className="border-slate-200/30">
        <CardContent className="p-6">
          <div className="bg-indigo-500/5 border border-indigo-200 rounded-lg p-6 text-sm text-slate-500/90 font-mono text-center">
            🔒 Access Locked: Role <b>{userRole}</b> is not authorized to register catalog products. Swap to Owner/Manager roles to unlock.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-200/30">
        <div className="flex items-center space-x-2">
          <Plus className="w-4 h-4 text-indigo-600" />
          <CardTitle className="text-sm uppercase tracking-wider text-slate-800">
            {editProduct ? 'Edit SKU Item' : 'Register New SKU Item'}
          </CardTitle>
        </div>
        {editProduct && (
          <Button type="button" onClick={onCancelEdit} variant="ghost" size="sm" className="h-8 text-xs underline">
            Cancel Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500/90 mb-1.5 block">Product Name *</label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500/90 mb-1.5 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
              <label className="text-xs font-semibold uppercase text-slate-500/90 mb-1.5 block">SKU Code *</label>
              <Input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500/90 mb-1.5 block">MRP (₹) *</label>
              <Input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500/90 mb-1.5 block">Cost (₹) *</label>
              <Input
                type="number"
                required
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500/90 mb-1.5 block">Safety Min</label>
              <Input
                type="number"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
              />
            </div>
          </div>

          {!editProduct && (
            <div className="border-t border-slate-200/30 pt-4 space-y-3">
              <span className="text-xs font-semibold text-slate-500/90 uppercase tracking-widest block">
                Initial Stock / Expiry Tracking (Optional)
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 block">Initial Qty</label>
                  <Input
                    type="number"
                    value={stockLevel}
                    onChange={(e) => setStockLevel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 block">Batch No</label>
                  <Input
                    type="text"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 block">Expiry Date</label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {editProduct && (
            <div className="grid grid-cols-1 gap-3">
               <div>
                  <label className="text-xs font-semibold uppercase text-slate-500/90 mb-1.5 block">Adjust Stock Level (Absolute)</label>
                  <Input
                    type="number"
                    value={stockLevel}
                    onChange={(e) => setStockLevel(e.target.value)}
                  />
                </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 uppercase tracking-wider"
            size="lg"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {editProduct ? 'Save Changes' : 'Add to Catalog'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
