import { Product, SaleRecord, InventoryBatch } from '../../types/retail';
import { discountEngine } from './discountEngine';

export type DemandTrend = 'RAPIDLY_INCREASING' | 'INCREASING' | 'STABLE' | 'DECREASING' | 'RAPIDLY_DECREASING' | 'INSUFFICIENT_DATA';
export type InventoryCoverageStatus = 'NO_DEMAND_DATA' | 'CRITICAL' | 'LOW' | 'HEALTHY' | 'OVERSTOCK';
export type ReorderStatus = 'HEALTHY' | 'WATCH' | 'REORDER' | 'URGENT' | 'OVERSTOCK' | 'INSUFFICIENT_DATA';
export type MovementStatus = 'FAST_MOVING' | 'NORMAL' | 'SLOW_MOVING' | 'NO_MOVEMENT';
export type InventoryRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ForecastResult {
  productId: string;
  productName: string;
  category: string;
  totalUnitsSold: number;
  totalRevenue: number;
  dailySalesVelocity: number;
  velocity7d: number;
  velocity14d: number;
  velocity30d: number;
  currentStock: number;
  estimatedDaysRemaining: number | null;
  demandTrend: DemandTrend;
  coverageStatus: InventoryCoverageStatus;
  reorderStatus: ReorderStatus;
  recommendedReorderQuantity: number;
  isOverstock: boolean;
  isSlowMoving: boolean;
  isFastMoving: boolean;
  movementStatus: MovementStatus;
  inventoryRisk: InventoryRisk;
  riskReason: string;
  smartRecommendation: string;
  expiryAlert: string | null;
}

const getPastDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.getTime();
};

export const forecastService = {
  generateForecast(
    product: Product, 
    allSales: SaleRecord[], 
    batches: InventoryBatch[] = []
  ): ForecastResult {
    const productSales = allSales.filter(s => s.productId === product.id);
    
    let totalUnitsSold = 0;
    let totalRevenue = 0;
    let units7d = 0;
    let units14d = 0;
    let units30d = 0;
    
    const now = new Date().getTime();
    const time7d = getPastDate(7);
    const time14d = getPastDate(14);
    const time30d = getPastDate(30);

    productSales.forEach(s => {
      totalUnitsSold += s.quantity;
      totalRevenue += s.totalPrice;
      const saleTime = new Date(s.saleDate).getTime();
      if (saleTime >= time7d) units7d += s.quantity;
      if (saleTime >= time14d) units14d += s.quantity;
      if (saleTime >= time30d) units30d += s.quantity;
    });

    const velocity7d = units7d / 7;
    const velocity14d = units14d / 14;
    const velocity30d = units30d / 30;

    // Use longest available period for base daily velocity, defaulting to 30d
    let observationDays = 30;
    if (productSales.length > 0) {
      const dates = productSales.map((s) => new Date(s.saleDate).getTime());
      const minDate = Math.min(...dates);
      let diffDays = Math.ceil((now - minDate) / (1000 * 60 * 60 * 24));
      observationDays = Math.max(1, Math.min(diffDays, 30));
    }
    const dailySalesVelocity = units30d / observationDays;

    // Demand Trend
    let demandTrend: DemandTrend = 'INSUFFICIENT_DATA';
    if (units30d < 5 || observationDays < 10) {
      demandTrend = 'INSUFFICIENT_DATA';
    } else {
      if (velocity7d > velocity30d * 1.5) demandTrend = 'RAPIDLY_INCREASING';
      else if (velocity7d > velocity30d * 1.1) demandTrend = 'INCREASING';
      else if (velocity7d < velocity30d * 0.5) demandTrend = 'RAPIDLY_DECREASING';
      else if (velocity7d < velocity30d * 0.9) demandTrend = 'DECREASING';
      else demandTrend = 'STABLE';
    }

    // Movement Status
    let movementStatus: MovementStatus = 'NO_MOVEMENT';
    if (units30d === 0) movementStatus = 'NO_MOVEMENT';
    else if (velocity30d < 0.5) movementStatus = 'SLOW_MOVING';
    else if (velocity7d > 5) movementStatus = 'FAST_MOVING';
    else movementStatus = 'NORMAL';

    // Inventory Coverage
    const effectiveVelocity = velocity7d > 0 ? velocity7d : velocity30d;
    const estimatedDaysRemaining = effectiveVelocity > 0 ? product.stockLevel / effectiveVelocity : null;

    let coverageStatus: InventoryCoverageStatus = 'NO_DEMAND_DATA';
    if (estimatedDaysRemaining === null) {
      coverageStatus = product.stockLevel > 0 ? 'NO_DEMAND_DATA' : 'CRITICAL';
    } else if (estimatedDaysRemaining <= 3) {
      coverageStatus = 'CRITICAL';
    } else if (estimatedDaysRemaining <= 7) {
      coverageStatus = 'LOW';
    } else if (estimatedDaysRemaining >= 30) {
      coverageStatus = 'OVERSTOCK';
    } else {
      coverageStatus = 'HEALTHY';
    }

    // Reorder Status
    let reorderStatus: ReorderStatus = 'HEALTHY';
    if (coverageStatus === 'OVERSTOCK') {
      reorderStatus = 'OVERSTOCK';
    } else if (demandTrend === 'INSUFFICIENT_DATA' && product.stockLevel > product.reorderPoint) {
      reorderStatus = 'INSUFFICIENT_DATA';
    } else if (product.stockLevel <= product.reorderPoint * 0.5 || coverageStatus === 'CRITICAL') {
      reorderStatus = 'URGENT';
    } else if (product.stockLevel <= product.reorderPoint || coverageStatus === 'LOW') {
      reorderStatus = 'REORDER';
    } else if (product.stockLevel <= product.reorderPoint * 1.5) {
      reorderStatus = 'WATCH';
    }

    // Reorder Quantity
    let recommendedReorderQuantity = 0;
    if (['URGENT', 'REORDER', 'WATCH'].includes(reorderStatus)) {
      const targetStock = Math.max(product.reorderPoint * 2, Math.ceil(velocity14d * 14));
      recommendedReorderQuantity = Math.max(0, targetStock - product.stockLevel);
      // Round to nearest 5 if large, otherwise exact
      if (recommendedReorderQuantity > 10) {
        recommendedReorderQuantity = Math.ceil(recommendedReorderQuantity / 5) * 5;
      } else {
        recommendedReorderQuantity = Math.ceil(recommendedReorderQuantity);
      }
    }

    // Evaluate Expiry
    let expiryAlert = null;
    let worstExpiryRisk = 0;
    const productBatches = batches.filter(b => b.productId === product.id && b.currentQuantity > 0);
    
    productBatches.forEach(b => {
      const evalResult = discountEngine.evaluateBatch(b, effectiveVelocity);
      if (evalResult.status === 'Expired') {
        worstExpiryRisk = Math.max(worstExpiryRisk, 4);
        expiryAlert = 'Expired inventory requires disposal handling.';
      } else if (evalResult.status === 'Critical') {
        worstExpiryRisk = Math.max(worstExpiryRisk, 3);
        if (!expiryAlert || worstExpiryRisk === 3) expiryAlert = 'High expiry risk — prioritize clearance.';
      } else if (evalResult.status === 'Urgent') {
        worstExpiryRisk = Math.max(worstExpiryRisk, 2);
        if (!expiryAlert || worstExpiryRisk === 2) expiryAlert = 'Batches expiring within 7 days.';
      }
    });

    // Inventory Risk Score
    let inventoryRisk: InventoryRisk = 'LOW';
    let riskReason = 'Stock levels and demand are stable.';
    
    if (worstExpiryRisk === 4) {
      inventoryRisk = 'CRITICAL';
      riskReason = 'CRITICAL — expired stock present in inventory.';
    } else if (coverageStatus === 'CRITICAL' || reorderStatus === 'URGENT') {
      inventoryRisk = 'CRITICAL';
      riskReason = `CRITICAL — current stock covers approximately ${Math.ceil(estimatedDaysRemaining || 0)} days of recent demand.`;
    } else if (coverageStatus === 'LOW' || reorderStatus === 'REORDER' || worstExpiryRisk >= 3) {
      inventoryRisk = 'HIGH';
      if (worstExpiryRisk >= 3) {
        riskReason = 'HIGH — imminent expiry risk on active batches.';
      } else {
        riskReason = 'HIGH — stock will run out soon based on current demand.';
      }
    } else if (coverageStatus === 'OVERSTOCK' && (movementStatus === 'SLOW_MOVING' || movementStatus === 'NO_MOVEMENT')) {
      inventoryRisk = 'MEDIUM';
      riskReason = 'MEDIUM — high capital tied up in slow-moving overstock.';
    } else if (reorderStatus === 'WATCH' || demandTrend === 'RAPIDLY_DECREASING') {
      inventoryRisk = 'MEDIUM';
      riskReason = 'MEDIUM — declining demand or approaching reorder threshold.';
    }

    // Smart Recommendation
    let smartRecommendation = '';
    if (worstExpiryRisk >= 3 && coverageStatus === 'OVERSTOCK' && movementStatus === 'SLOW_MOVING') {
      smartRecommendation = 'High expiry risk — prioritize clearance.';
    } else if (['CRITICAL', 'LOW'].includes(coverageStatus) && ['RAPIDLY_INCREASING', 'INCREASING'].includes(demandTrend)) {
      smartRecommendation = 'High demand with low inventory coverage — reorder urgently.';
    } else if (['HEALTHY', 'OVERSTOCK'].includes(coverageStatus) && ['RAPIDLY_INCREASING', 'INCREASING'].includes(demandTrend)) {
      smartRecommendation = 'Strong demand — inventory is currently sufficient.';
    } else if (['CRITICAL', 'LOW'].includes(coverageStatus) && ['DECREASING', 'RAPIDLY_DECREASING', 'SLOW_MOVING'].includes(demandTrend)) {
      smartRecommendation = 'Low stock but low demand — monitor before reordering.';
    } else if (worstExpiryRisk >= 3) {
      smartRecommendation = expiryAlert || 'Prioritize FEFO and clearance discounts.';
    } else if (coverageStatus === 'OVERSTOCK') {
      smartRecommendation = 'Overstocked — halt reordering and focus on merchandising.';
    } else if (reorderStatus === 'REORDER' || reorderStatus === 'URGENT') {
      smartRecommendation = `Replenish stock. Suggested quantity: ${recommendedReorderQuantity}.`;
    } else {
      smartRecommendation = 'Inventory is optimized for current demand.';
    }

    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      totalUnitsSold,
      totalRevenue,
      dailySalesVelocity,
      velocity7d,
      velocity14d,
      velocity30d,
      currentStock: product.stockLevel,
      estimatedDaysRemaining,
      demandTrend,
      coverageStatus,
      reorderStatus,
      recommendedReorderQuantity,
      isOverstock: coverageStatus === 'OVERSTOCK',
      isSlowMoving: movementStatus === 'SLOW_MOVING',
      isFastMoving: movementStatus === 'FAST_MOVING',
      movementStatus,
      inventoryRisk,
      riskReason,
      smartRecommendation,
      expiryAlert
    };
  }
};
