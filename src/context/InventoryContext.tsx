import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, InventoryBatch, SaleRecord } from '../types/retail';
import { inventoryService } from '../lib/services/inventoryService';
import { salesService } from '../lib/services/salesService';

interface InventoryContextType {
  products: Product[];
  batches: InventoryBatch[];
  auditLogs: any[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string, name: string) => Promise<void>;
  adjustStock: (id: string, action: 'add' | 'deduct', quantity: number) => Promise<void>;
  addBatch: (productId: string, batchNo: string, quantity: number, expiryDate: string) => Promise<void>;
  markBatchExpired: (batchId: string, productId: string, currentQty: number) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [prodData, batchData, logData] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getBatches(),
        inventoryService.getAuditLogs()
      ]);
      
      setProducts(prodData);
      setBatches(batchData);
      setAuditLogs(logData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    const handleStoreChange = () => refreshData();
    window.addEventListener('store-changed', handleStoreChange);
    return () => window.removeEventListener('store-changed', handleStoreChange);
  }, []);

  const addProduct = async (product: Partial<Product>) => {
    await inventoryService.addProduct(product);
    await refreshData();
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    await inventoryService.updateProduct(id, updates);
    await refreshData();
  };

  const deleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete ${name}?`)) {
      await inventoryService.deleteProduct(id);
      await refreshData();
    }
  };

  const adjustStock = async (id: string, action: 'add' | 'deduct', quantity: number) => {
    await inventoryService.adjustStock(id, action, quantity);
    await refreshData();
  };

  const addBatch = async (productId: string, batchNo: string, quantity: number, expiryDate: string) => {
    await inventoryService.addBatch(productId, batchNo, quantity, expiryDate);
    await refreshData();
  };

  const markBatchExpired = async (batchId: string, productId: string, currentQty: number) => {
    await inventoryService.markBatchExpired(batchId, productId, currentQty);
    await refreshData();
  };

  return (
    <InventoryContext.Provider value={{
      products,
      batches,
      auditLogs,
      isLoading,
      error,
      refreshData,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      addBatch,
      markBatchExpired
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
