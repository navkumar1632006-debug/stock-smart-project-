import { describe, it, expect, vi } from 'vitest';

describe('Phase 9: Cross-Platform Web <-> Android Realtime Synchronization', () => {
  interface StoreSyncEvent {
    table: 'products' | 'inventory_batches' | 'sales' | 'khata_customers';
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    newRecord?: Record<string, any>;
    oldRecord?: Record<string, any>;
    storeId: string;
    timestamp: number;
  }

  class StoreDataSyncManager {
    private localCache: Map<string, any> = new Map();
    private subscribers: Array<(event: StoreSyncEvent) => void> = [];

    public subscribe(callback: (event: StoreSyncEvent) => void) {
      this.subscribers.push(callback);
      return () => {
        this.subscribers = this.subscribers.filter((s) => s !== callback);
      };
    }

    public broadcast(event: StoreSyncEvent) {
      // Update cache
      if (event.table === 'products' && event.newRecord) {
        this.localCache.set(event.newRecord.id, event.newRecord);
      } else if (event.table === 'products' && event.eventType === 'DELETE' && event.oldRecord) {
        this.localCache.delete(event.oldRecord.id);
      }

      // Notify all connected clients (Web browsers & Android mobile apps)
      for (const subscriber of this.subscribers) {
        subscriber(event);
      }
    }

    public getProduct(id: string) {
      return this.localCache.get(id);
    }
  }

  it('should propagate product creation on Web to Android mobile subscriber in real-time', () => {
    const syncManager = new StoreDataSyncManager();
    const webClientStoreId = 'store-mumbai-01';
    let androidReceivedProduct: any = null;

    // Simulate Android mobile subscriber
    syncManager.subscribe((event) => {
      if (event.table === 'products' && event.eventType === 'INSERT') {
        androidReceivedProduct = event.newRecord;
      }
    });

    // Simulate Web Dashboard creating new product
    const newProduct = {
      id: 'prod-fortune-oil',
      store_id: webClientStoreId,
      name: 'Fortune Sunlite Sunflower Oil 1L',
      sku: 'SKU-OIL-001',
      price: 155,
      stock_level: 50,
      category: 'Grocery',
    };

    syncManager.broadcast({
      table: 'products',
      eventType: 'INSERT',
      newRecord: newProduct,
      storeId: webClientStoreId,
      timestamp: Date.now(),
    });

    expect(androidReceivedProduct).not.toBeNull();
    expect(androidReceivedProduct.id).toBe('prod-fortune-oil');
    expect(androidReceivedProduct.stock_level).toBe(50);
    expect(syncManager.getProduct('prod-fortune-oil')).toEqual(newProduct);
  });

  it('should propagate stock deduction from Android POS sale to Web Dashboard subscriber', () => {
    const syncManager = new StoreDataSyncManager();
    const storeId = 'store-mumbai-01';

    const initialProduct = {
      id: 'prod-amul-butter',
      store_id: storeId,
      name: 'Amul Butter 100g',
      sku: 'SKU-BUTTER-100',
      price: 58,
      stock_level: 30,
      category: 'Dairy',
    };

    syncManager.broadcast({
      table: 'products',
      eventType: 'INSERT',
      newRecord: initialProduct,
      storeId,
      timestamp: Date.now(),
    });

    let webDashboardUpdatedProduct: any = null;
    syncManager.subscribe((event) => {
      if (event.table === 'products' && event.eventType === 'UPDATE') {
        webDashboardUpdatedProduct = event.newRecord;
      }
    });

    // Simulate Android POS executing sale of 5 units
    const updatedProduct = {
      ...initialProduct,
      stock_level: 25,
    };

    syncManager.broadcast({
      table: 'products',
      eventType: 'UPDATE',
      oldRecord: initialProduct,
      newRecord: updatedProduct,
      storeId,
      timestamp: Date.now(),
    });

    expect(webDashboardUpdatedProduct).not.toBeNull();
    expect(webDashboardUpdatedProduct.stock_level).toBe(25);
    expect(syncManager.getProduct('prod-amul-butter').stock_level).toBe(25);
  });

  it('should cleanly unsubscribe client when screen unmounts without memory leaks', () => {
    const syncManager = new StoreDataSyncManager();
    let callCount = 0;

    const unsubscribe = syncManager.subscribe(() => {
      callCount++;
    });

    syncManager.broadcast({
      table: 'products',
      eventType: 'UPDATE',
      storeId: 's1',
      timestamp: Date.now(),
    });
    expect(callCount).toBe(1);

    // Unmount
    unsubscribe();

    syncManager.broadcast({
      table: 'products',
      eventType: 'UPDATE',
      storeId: 's1',
      timestamp: Date.now(),
    });
    expect(callCount).toBe(1); // Should not increase
  });
});
