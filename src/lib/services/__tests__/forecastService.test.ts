import { describe, it, expect } from 'vitest';
import { forecastService } from '../forecastService';
import { Product, SaleRecord, InventoryBatch } from '../../../types/retail';

describe('forecastService', () => {
  const mockProduct: Product = {
    id: 'p1',
    name: 'Test Product',
    sku: 'TEST-001',
    category: 'Staples',
    price: 100,
    cost: 80,
    stockLevel: 50,
    reorderPoint: 20
  };

  const createSale = (daysAgo: number, quantity: number): SaleRecord => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return {
      id: `s-${daysAgo}`,
      productId: 'p1',
      productName: 'Test Product',
      quantity,
      unitPrice: 100,
      totalPrice: quantity * 100,
      saleDate: d.toISOString(),
      channel: 'In-Store'
    };
  };

  it('handles zero sales gracefully', () => {
    const result = forecastService.generateForecast(mockProduct, [], []);
    expect(result.dailySalesVelocity).toBe(0);
    expect(result.demandTrend).toBe('INSUFFICIENT_DATA');
    expect(result.movementStatus).toBe('NO_MOVEMENT');
    expect(result.estimatedDaysRemaining).toBeNull();
    expect(result.coverageStatus).toBe('NO_DEMAND_DATA');
  });

  it('calculates 7-day, 14-day, 30-day velocity correctly', () => {
    const sales = [
      createSale(1, 14), // Last 7 days
      createSale(5, 7),  // Last 7 days -> 21 total in 7 days = 3/day
      createSale(10, 14),// 8-14 days -> +14 = 35 total in 14 days = 2.5/day
      createSale(20, 25) // 15-30 days -> +25 = 60 total in 30 days = 2/day
    ];

    const result = forecastService.generateForecast(mockProduct, sales, []);
    expect(result.velocity7d).toBeCloseTo(3);
    expect(result.velocity14d).toBeCloseTo(2.5);
    expect(result.velocity30d).toBeCloseTo(2);
    expect(result.totalUnitsSold).toBe(60);
  });

  it('identifies RAPIDLY_INCREASING demand trend', () => {
    const sales = [
      createSale(1, 70), // Last 7 days = 10/day
      createSale(15, 30) // Previous days, total 100 in 30 days = 3.33/day
    ];
    // velocity7d (10) > velocity30d (3.33) * 1.5
    const result = forecastService.generateForecast(mockProduct, sales, []);
    expect(result.demandTrend).toBe('RAPIDLY_INCREASING');
  });

  it('identifies RAPIDLY_DECREASING demand trend', () => {
    const sales = [
      createSale(1, 7), // Last 7 days = 1/day
      createSale(15, 113) // Previous days, total 120 in 30 days = 4/day
    ];
    // velocity7d (1) < velocity30d (4) * 0.5
    const result = forecastService.generateForecast(mockProduct, sales, []);
    expect(result.demandTrend).toBe('RAPIDLY_DECREASING');
  });

  it('calculates inventory coverage correctly', () => {
    const p: Product = { ...mockProduct, stockLevel: 10 };
    const sales = [createSale(1, 35)]; // 7d velocity = 5/day
    
    // stock 10, velocity 5 => 2 days remaining
    const result = forecastService.generateForecast(p, sales, []);
    expect(result.estimatedDaysRemaining).toBeCloseTo(2);
    expect(result.coverageStatus).toBe('CRITICAL');
    expect(result.inventoryRisk).toBe('CRITICAL');
  });

  it('recommends correct reorder quantity', () => {
    const p: Product = { ...mockProduct, stockLevel: 5, reorderPoint: 20 };
    // Needs to trigger reorder. target = max(reorderPoint*2 (40), velocity14d*14)
    // Let's make velocity14d = 1. target = 40. stock = 5. reorder = 35.
    const sales = [createSale(5, 14)]; // velocity14d = 1
    const result = forecastService.generateForecast(p, sales, []);
    expect(result.reorderStatus).toBe('URGENT');
    expect(result.recommendedReorderQuantity).toBe(35);
  });

  it('handles zero-stock handling', () => {
    const p: Product = { ...mockProduct, stockLevel: 0 };
    const sales = [createSale(1, 7)]; // 7d velocity = 1/day
    const result = forecastService.generateForecast(p, sales, []);
    expect(result.estimatedDaysRemaining).toBe(0);
    expect(result.coverageStatus).toBe('CRITICAL');
    expect(result.reorderStatus).toBe('URGENT');
  });

  it('identifies OVERSTOCK', () => {
    const p: Product = { ...mockProduct, stockLevel: 200 };
    const sales = [createSale(1, 7)]; // 7d velocity = 1/day
    const result = forecastService.generateForecast(p, sales, []);
    expect(result.coverageStatus).toBe('OVERSTOCK');
    expect(result.reorderStatus).toBe('OVERSTOCK');
    expect(result.isOverstock).toBe(true);
  });
  
  it('identifies fast and slow moving', () => {
    const fastSales = [createSale(1, 77)]; // velocity7d = 11
    const fastRes = forecastService.generateForecast(mockProduct, fastSales, []);
    expect(fastRes.movementStatus).toBe('FAST_MOVING');
    
    const slowSales = [createSale(1, 1), createSale(20, 2)]; // 3 total in 30 days = 0.1/day
    const slowRes = forecastService.generateForecast(mockProduct, slowSales, []);
    expect(slowRes.movementStatus).toBe('SLOW_MOVING');
  });

  it('integrates expiry + demand recommendation', () => {
    const p: Product = { ...mockProduct, stockLevel: 100 };
    const sales = [createSale(1, 7)]; // velocity7d = 1, coverage = 100 days (OVERSTOCK)
    
    const d = new Date();
    d.setDate(d.getDate() + 2); // expires in 2 days (Critical)
    const batches: InventoryBatch[] = [{
      id: 'b1',
      productId: 'p1',
      productName: 'Test Product',
      batchNumber: 'b1',
      initialQuantity: 100,
      currentQuantity: 100,
      expiryDate: d.toISOString(),
      originalPrice: 100,
      discountRate: 0,
      discountedPrice: 100
    }];

    const result = forecastService.generateForecast(p, sales, batches);
    expect(result.inventoryRisk).toBe('HIGH'); // or CRITICAL depending on logic
    expect(result.smartRecommendation).toBe('High expiry risk — prioritize clearance.');
  });
});
