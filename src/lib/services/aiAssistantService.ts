import { Product, InventoryBatch, SaleRecord } from '../../types/retail';
import { inventoryIntelligenceService } from './inventoryIntelligenceService';

export const aiAssistantService = {
  generateResponse(
    query: string,
    products: Product[],
    batches: InventoryBatch[],
    salesLogs: SaleRecord[]
  ): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('low') && lowerQuery.includes('stock')) {
      const lowStock = products.filter(p => p.stockLevel > 0 && p.stockLevel <= p.reorderPoint);
      if (lowStock.length === 0) return "✅ Good news! None of your products are currently low in stock. Your inventory is healthy.";
      
      let response = `⚠️ You have **${lowStock.length} products** running low on stock:\n\n`;
      lowStock.slice(0, 5).forEach(p => {
        response += `- **${p.name}**: ${p.stockLevel} units remaining (Reorder point: ${p.reorderPoint})\n`;
      });
      if (lowStock.length > 5) response += `\n*...and ${lowStock.length - 5} more.*`;
      return response;
    }

    if (lowerQuery.includes('out of stock')) {
      const outOfStock = products.filter(p => p.stockLevel === 0);
      if (outOfStock.length === 0) return "✅ You currently have no out-of-stock items!";
      
      let response = `🚨 You have **${outOfStock.length} products** completely out of stock:\n\n`;
      outOfStock.slice(0, 5).forEach(p => {
        response += `- **${p.name}** (SKU: ${p.sku})\n`;
      });
      return response;
    }

    if (lowerQuery.includes('reorder') || lowerQuery.includes('recommendation')) {
      const forecasts = products.map(p => inventoryIntelligenceService.generateForecast(p, salesLogs));
      const critical = forecasts.filter(f => f.reorderUrgency === 'Critical' && f.reorderQuantity > 0);
      
      if (critical.length === 0) return "✅ Based on your current sales velocity and stock levels, there are no urgent reorder requirements right now.";

      let response = `📦 Here are the **Critical Reorder Recommendations** based on AI forecasting:\n\n`;
      critical.slice(0, 5).forEach(f => {
        response += `- **${f.productName}**: Order **${f.reorderQuantity} units** immediately. ${f.insight}\n`;
      });
      return response;
    }

    if (lowerQuery.includes('fast') || lowerQuery.includes('top') || lowerQuery.includes('best')) {
      const productSales = products.map(p => {
        const sales = salesLogs.filter(s => s.productId === p.id);
        const volume = sales.reduce((sum, s) => sum + s.quantity, 0);
        return { ...p, volume };
      }).sort((a, b) => b.volume - a.volume);

      const topSellers = productSales.filter(p => p.volume > 0).slice(0, 5);
      
      if (topSellers.length === 0) return "📊 Not enough sales data to determine your fastest moving products yet.";

      let response = `🚀 Your **Fastest Moving Products** by unit volume are:\n\n`;
      topSellers.forEach((p, i) => {
        response += `${i + 1}. **${p.name}**: ${p.volume} units sold\n`;
      });
      return response;
    }

    if (lowerQuery.includes('slow')) {
      const productSales = products.map(p => {
        const sales = salesLogs.filter(s => s.productId === p.id);
        const volume = sales.reduce((sum, s) => sum + s.quantity, 0);
        return { ...p, volume };
      });

      const slowMovers = productSales
        .filter(p => p.stockLevel > 0)
        .sort((a, b) => a.volume - b.volume)
        .slice(0, 5);

      if (slowMovers.length === 0 || slowMovers[0].volume > 10) return "📊 Your active inventory seems to be moving at a healthy pace!";

      let response = `🐢 Your **Slowest Moving Active Inventory** includes:\n\n`;
      slowMovers.forEach(p => {
        response += `- **${p.name}**: Only ${p.volume} units sold (Current Stock: ${p.stockLevel})\n`;
      });
      response += `\n💡 *Consider applying a discount or moving these to a high-visibility shelf.*`;
      return response;
    }

    if (lowerQuery.includes('expir')) {
      const today = new Date().getTime();
      const nearExpiry = batches.filter(b => {
        if (b.currentQuantity <= 0) return false;
        const days = (new Date(b.expiryDate).getTime() - today) / (1000 * 3600 * 24);
        return days > 0 && days <= 7;
      });
      
      const expired = batches.filter(b => {
        if (b.currentQuantity <= 0) return false;
        return new Date(b.expiryDate).getTime() < today;
      });

      let response = '';
      if (expired.length > 0) {
        response += `❌ **URGENT**: You have **${expired.length} batches** that are already EXPIRED on the shelf. Please remove them immediately.\n\n`;
      }

      if (nearExpiry.length > 0) {
        response += `⚠️ You have **${nearExpiry.length} batches** expiring within the next 7 days:\n\n`;
        nearExpiry.slice(0, 5).forEach(b => {
          const pName = products.find(p => p.id === b.productId)?.name || 'Unknown Product';
          response += `- **${pName}**: ${b.currentQuantity} units expire on ${new Date(b.expiryDate).toLocaleDateString()}\n`;
        });
        response += `\n💡 *Action: Trigger the Smart Discount Engine for these items.*`;
      }

      if (expired.length === 0 && nearExpiry.length === 0) {
        return "✅ Excellent! You have no expired products and nothing is expiring in the next 7 days.";
      }

      return response;
    }

    if (lowerQuery.includes('sales') && lowerQuery.includes('week')) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentSales = salesLogs.filter(s => new Date(s.saleDate) >= oneWeekAgo);
      const revenue = recentSales.reduce((sum, s) => sum + s.totalPrice, 0);
      const units = recentSales.reduce((sum, s) => sum + s.quantity, 0);

      return `📈 **This Week's Sales Summary:**\n\n- **Total Revenue**: ₹${revenue.toLocaleString()}\n- **Units Sold**: ${units}\n- **Transactions**: ${recentSales.length}\n\nKeep up the great work!`;
    }

    if (lowerQuery.includes('risk')) {
      const forecasts = products.map(p => inventoryIntelligenceService.generateForecast(p, salesLogs));
      const critical = forecasts.filter(f => f.reorderUrgency === 'Critical');
      
      let response = `🔍 **Inventory Risk Profile:**\n\n`;
      response += `- **Stock-Out Risks**: ${critical.length} critical items.\n`;
      
      const today = new Date().getTime();
      const expired = batches.filter(b => b.currentQuantity > 0 && new Date(b.expiryDate).getTime() < today).length;
      response += `- **Expiry Risks (Spoilage)**: ${expired} expired batches currently active.\n\n`;
      
      response += `To resolve these risks, please review the **Demand Forecasting** and **Expiry Dashboard** tabs.`;
      return response;
    }

    // Default fallback
    return "I am your StockSmart AI Assistant. You can ask me questions like:\n\n- *Which products are low in stock?*\n- *What should I reorder?*\n- *Which products are selling fastest?*\n- *Which products are expiring?*\n- *What were my sales this week?*";
  }
};
