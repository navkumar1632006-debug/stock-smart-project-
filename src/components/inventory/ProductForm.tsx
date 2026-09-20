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
  const { addProduct, updateProduct, addBatch } = useInventory();
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
          stockLevel: Number(stockLevel)
        });
        
        if (batchNo && stockLevel && expiryDate) {
          await addBatch(editProduct.id, batchNo, Number(stockLevel), expiryDate);
        }
        
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
      <Card>
        <CardContent className="p-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 text-sm text-indigo-700 text-center">
            <strong>Access Locked:</strong> Role {userRole} is not authorized to register catalog products. Swap to Owner/Manager roles to unlock.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <Plus className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-base font-bold text-slate-900">
            {editProduct ? 'Edit Product' : 'Add New Product'}
          </CardTitle>
        </div>
        {editProduct && (
          <Button type="button" onClick={onCancelEdit} variant="ghost" size="sm">
            Cancel Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Product Name *</label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Mother Dairy Milk"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                >
                  <option value="Dairy">Dairy</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Staples">Staples</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Fruits & Vegetables">Fruits & Veg</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">SKU Code *</label>
                <Input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g., MD-MILK-500ML"
                />
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pricing</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">MRP (₹) *</label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Cost Price (₹) *</label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Inventory Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory & Tracking</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Safety Min (Reorder Point)</label>
                <Input
                  type="number"
                  min="0"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  {editProduct ? 'Adjust Stock Level (Absolute)' : 'Initial Quantity'}
                </label>
                <Input
                  type="number"
                  min="0"
                  value={stockLevel}
                  onChange={(e) => setStockLevel(e.target.value)}
                  placeholder={editProduct ? '' : '0'}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  {editProduct ? 'Batch Number (New Batch, Optional)' : 'Batch Number (Optional)'}
                </label>
                <Input
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="e.g., BATCH-001"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Expiry Date (Optional)</label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {editProduct ? 'Save Changes' : 'Add to Catalog'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
