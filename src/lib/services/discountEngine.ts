import { InventoryBatch } from '../../types/retail';

export type ExpiryStatus = 'Expired' | 'Critical' | 'Urgent' | 'Warning' | 'Healthy';
export type ExpiryRisk = 'High' | 'Medium' | 'Low' | 'None';

export interface DiscountRecommendation {
  status: ExpiryStatus;
  daysUntilExpiry: number;
  recommendedDiscountRate: number; // 0 to 1
  urgencyLevel: ExpiryRisk;
  recommendedAction: string;
}

export interface DiscountEngineConfig {
  criticalDaysThreshold: number; // e.g., 3 days
  urgentDaysThreshold: number; // e.g., 7 days
  warningDaysThreshold: number; // e.g., 30 days
  maxDiscountRate: number; // e.g., 0.60 (60%)
  freshnessMultiplier: number;
}

export const DEFAULT_CONFIG: DiscountEngineConfig = {
  criticalDaysThreshold: 3,
  urgentDaysThreshold: 7,
  warningDaysThreshold: 30,
  maxDiscountRate: 0.60,
  freshnessMultiplier: 1.5,
};

export const discountEngine = {
  /**
   * Evaluates a batch based on its expiry date and current stock,
   * returning a deterministic discount recommendation.
   * Does NOT mutate the database.
   */
  evaluateBatch(
    batch: InventoryBatch, 
    historicalSalesVelocity: number = 1.0, 
    config: DiscountEngineConfig = DEFAULT_CONFIG
  ): DiscountRecommendation {
    if (!batch.expiryDate) {
      return {
        status: 'Healthy',
        daysUntilExpiry: 999,
        recommendedDiscountRate: 0,
        urgencyLevel: 'None',
        recommendedAction: 'No action required (No expiry date)',
      };
    }

    const expiryDate = new Date(batch.expiryDate);
    const today = new Date();
    
    // Calculate difference in days (ignoring time)
    const diffTime = expiryDate.getTime() - today.getTime();
    const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 1. Expired
    if (daysUntilExpiry < 0) {
      return {
        status: 'Expired',
        daysUntilExpiry,
        recommendedDiscountRate: 1.0, // 100% loss technically
        urgencyLevel: 'High',
        recommendedAction: 'Do NOT recommend selling. Mark inventory as expired and require removal/disposal workflow.',
      };
    }

    // 2. Critical (0-3 days)
    if (daysUntilExpiry <= config.criticalDaysThreshold) {
      const weeksToClear = batch.currentQuantity / Math.max(0.1, historicalSalesVelocity);
      let calculatedDiscount = 0.40;
      
      if (weeksToClear > 0.5) {
        calculatedDiscount = Math.min(config.maxDiscountRate, 0.40 + (weeksToClear * 0.05));
      }

      return {
        status: 'Critical',
        daysUntilExpiry,
        recommendedDiscountRate: calculatedDiscount,
        urgencyLevel: 'High',
        recommendedAction: `Aggressive clearance recommendation. Apply ${Math.round(calculatedDiscount * 100)}% discount to clear stock before expiry.`,
      };
    }

    // 3. Urgent (4-7 days)
    if (daysUntilExpiry <= config.urgentDaysThreshold) {
      const weeksToClear = batch.currentQuantity / Math.max(0.1, historicalSalesVelocity);
      let calculatedDiscount = 0.25; 

      if (weeksToClear > 1) {
        calculatedDiscount = Math.min(config.maxDiscountRate, 0.35);
      }

      return {
        status: 'Urgent',
        daysUntilExpiry,
        recommendedDiscountRate: calculatedDiscount,
        urgencyLevel: 'Medium',
        recommendedAction: `Strong discount recommendation. Apply ${Math.round(calculatedDiscount * 100)}% discount.`,
      };
    }

    // 4. Warning (8-30 days)
    if (daysUntilExpiry <= config.warningDaysThreshold) {
      return {
        status: 'Warning',
        daysUntilExpiry,
        recommendedDiscountRate: 0.10, // 10% optional promo
        urgencyLevel: 'Low',
        recommendedAction: 'Optional promotional discount suggested.',
      };
    }

    // 5. Healthy (> 30 days)
    return {
      status: 'Healthy',
      daysUntilExpiry,
      recommendedDiscountRate: 0,
      urgencyLevel: 'None',
      recommendedAction: 'No discount recommended. Standard pricing.',
    };
  }
};
