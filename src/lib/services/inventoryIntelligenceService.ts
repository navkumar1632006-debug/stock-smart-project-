import { Product, InventoryBatch, SaleRecord, Supplier } from '../../types/retail';

export interface RiskAssessment {
  sku: string;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  analysis: string;
  recommendation: string;
}

export interface ReorderItem {
  productId: string;
  productName: string;
  sku: string;
  supplierId: string | null;
  supplierName: string;
  unitCost: number;
  reorderQuantity: number;
  totalCost: number;
  gstRate: number;
}

export interface ReorderPO {
  items: ReorderItem[];
  totalPayable: number;
  totalGst: number;
}

export const inventoryIntelligenceService = {
  calculateAvgDailySales(productId: string, salesLogs: SaleRecord[]): number {
    const productSales = salesLogs.filter((s) => s.productId === productId);
    if (productSales.length === 0) return 0;

    let totalQty = 0;
    productSales.forEach((s) => {
      totalQty += s.quantity;
    });

    const dates = productSales.map((s) => new Date(s.saleDate).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    let diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    diffDays = diffDays === 0 ? 1 : diffDays;
    const observationPeriod = Math.min(Math.max(diffDays, 7), 30); 

    return totalQty / observationPeriod;
  },

  getRiskAssessments(products: Product[], salesLogs: SaleRecord[], batches: InventoryBatch[]): RiskAssessment[] {
    const risks: RiskAssessment[] = [];

    products.forEach((p) => {
      const avgDailySales = this.calculateAvgDailySales(p.id, salesLogs);
      const daysRemaining = avgDailySales > 0 ? p.stockLevel / avgDailySales : 999;
      
      let riskLevel: RiskAssessment['riskLevel'] = 'Low';
      let analysis = '';
      let recommendation = '';

      if (p.stockLevel === 0) {
        riskLevel = 'Critical';
        analysis = `Item is out of stock. Historical demand is ${avgDailySales.toFixed(1)} units/day.`;
        recommendation = 'Restock immediately to prevent revenue loss.';
      } else if (p.stockLevel <= p.reorderPoint || daysRemaining <= 3) {
        riskLevel = 'Critical';
        analysis = `Stock level (${p.stockLevel}) is critically low. Expected to run out in ${Math.ceil(daysRemaining)} days.`;
        recommendation = `Trigger urgent purchase order for ${Math.max(p.reorderPoint * 2 - p.stockLevel, Math.ceil(avgDailySales * 14))} units.`;
      } else if (daysRemaining <= 7) {
        riskLevel = 'High';
        analysis = `Sales velocity (${avgDailySales.toFixed(1)} units/day) indicates stock out within 7 days.`;
        recommendation = 'Prepare to replenish inventory by end of week.';
      } else if (daysRemaining <= 14) {
        riskLevel = 'Medium';
        analysis = `Healthy velocity but approaching reorder threshold.`;
        recommendation = 'Monitor closely; no immediate action required.';
      }

      const productBatches = batches.filter((b) => b.productId === p.id && b.currentQuantity > 0);
      let expiringSoon = false;
      productBatches.forEach(b => {
        const diffDays = Math.ceil((new Date(b.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && diffDays <= 7) expiringSoon = true;
      });

      if (expiringSoon) {
        if (riskLevel === 'Low' || riskLevel === 'Medium') {
          riskLevel = 'High';
          analysis = `Substantial stock (${p.stockLevel}) is nearing expiry (<= 7 days).`;
          recommendation = 'Implement FEFO dynamic discounting immediately to prevent spoilage.';
        }
      }

      if (riskLevel !== 'Low') {
        risks.push({
          sku: p.sku,
          riskLevel,
          analysis,
          recommendation
        });
      }
    });

    const severityMap = { 'Critical': 3, 'High': 2, 'Medium': 1, 'Low': 0 };
    return risks.sort((a, b) => severityMap[b.riskLevel] - severityMap[a.riskLevel]).slice(0, 6);
  },

  generateReorderPO(products: Product[], salesLogs: SaleRecord[], suppliers: Supplier[] = []): ReorderPO | null {
    const itemsToReorder: ReorderItem[] = [];
    let totalPayable = 0;
    let totalGst = 0;

    products.forEach((p) => {
      if (p.stockLevel <= p.reorderPoint) {
        const avgDailySales = this.calculateAvgDailySales(p.id, salesLogs);
        const safeQty = Math.ceil(avgDailySales * 14);
        let suggestedQty = Math.max(p.reorderPoint * 2 - p.stockLevel, safeQty);
        
        suggestedQty = Math.max(suggestedQty, 5);

        // Try to find an appropriate supplier by name containing the category, else just pick the first one, else null
        let matchedSupplier = suppliers.find(s => s.name.toLowerCase().includes(p.category.toLowerCase()));
        if (!matchedSupplier && suppliers.length > 0) {
          matchedSupplier = suppliers[0]; // fallback to first available
        }

        const gstRate = p.category === 'Staples' ? 5 : 12;
        const totalCost = p.cost * suggestedQty;
        const gstAmount = totalCost * (gstRate / 100);

        itemsToReorder.push({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          supplierId: matchedSupplier ? matchedSupplier.id : null,
          supplierName: matchedSupplier ? matchedSupplier.name : 'Needs Assignment',
          unitCost: p.cost,
          reorderQuantity: suggestedQty,
          totalCost: totalCost,
          gstRate: gstRate
        });

        totalPayable += totalCost;
        totalGst += gstAmount;
      }
    });

    if (itemsToReorder.length === 0) return null;

    return {
      items: itemsToReorder,
      totalPayable,
      totalGst
    };
  }
};
