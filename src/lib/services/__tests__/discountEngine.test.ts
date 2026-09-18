import { describe, it, expect } from 'vitest';
import { discountEngine } from '../discountEngine';
import { InventoryBatch } from '../../../types/retail';

describe('DiscountEngine', () => {
  const getMockBatch = (expiryDate: string | undefined, currentQuantity: number = 10): InventoryBatch => ({
    id: 'mock-batch',
    productId: 'prod-1',
    productName: 'Milk',
    batchNumber: 'B001',
    expiryDate,
    initialQuantity: 10,
    currentQuantity,
    originalPrice: 100,
    discountRate: 0,
    discountedPrice: 100
  });

  const getOffsetDateString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  it('should return Healthy with no discount if no expiry date provided', () => {
    const batch = getMockBatch(undefined);
    const result = discountEngine.evaluateBatch(batch);
    
    expect(result.status).toBe('Healthy');
    expect(result.recommendedDiscountRate).toBe(0);
    expect(result.daysUntilExpiry).toBe(999);
  });

  it('should return Expired with 100% discount if days < 0', () => {
    const batch = getMockBatch(getOffsetDateString(-5));
    const result = discountEngine.evaluateBatch(batch);

    expect(result.status).toBe('Expired');
    expect(result.recommendedDiscountRate).toBe(1.0);
    expect(result.urgencyLevel).toBe('High');
  });

  it('should return Critical with 40%+ discount if days <= 3', () => {
    const batch = getMockBatch(getOffsetDateString(2), 50);
    // high stock triggers higher discount
    const result = discountEngine.evaluateBatch(batch, 1.0); // sales velocity 1.0

    expect(result.status).toBe('Critical');
    expect(result.recommendedDiscountRate).toBeGreaterThanOrEqual(0.40);
    expect(result.urgencyLevel).toBe('High');
  });

  it('should return Urgent with moderate discount if days <= 7', () => {
    const batch = getMockBatch(getOffsetDateString(6), 10);
    const result = discountEngine.evaluateBatch(batch, 20.0); // very high velocity clears easily

    expect(result.status).toBe('Urgent');
    expect(result.recommendedDiscountRate).toBe(0.25); // standard base rate
    expect(result.urgencyLevel).toBe('Medium');
  });

  it('should return Warning with minor discount if days <= 30', () => {
    const batch = getMockBatch(getOffsetDateString(20), 10);
    const result = discountEngine.evaluateBatch(batch, 1.0);

    expect(result.status).toBe('Warning');
    expect(result.recommendedDiscountRate).toBe(0.10); 
    expect(result.urgencyLevel).toBe('Low');
  });

  it('should return Healthy if days > 30', () => {
    const batch = getMockBatch(getOffsetDateString(40));
    const result = discountEngine.evaluateBatch(batch);

    expect(result.status).toBe('Healthy');
    expect(result.recommendedDiscountRate).toBe(0);
    expect(result.urgencyLevel).toBe('None');
  });
});
