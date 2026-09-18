export interface TaxComponents {
  taxableValue: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstRate: number;
  grandTotal: number;
}

export const taxService = {
  /**
   * Returns the applicable GST rate for a given product category.
   * Centralized here to ensure consistency across POS, Inventory, and Invoices.
   */
  getGstRate(category: string): number {
    // Currently hardcoded business logic based on Indian GST slabs
    if (!category) return 18; // Default standard rate
    
    const cat = category.toLowerCase();
    
    if (cat.includes('staples') || cat.includes('grocery') || cat.includes('produce')) {
      return 5;
    }
    if (cat.includes('dairy') || cat.includes('bakery')) {
      return 12;
    }
    if (cat.includes('electronics') || cat.includes('home')) {
      return 18;
    }
    
    return 18;
  },

  /**
   * Calculates precise tax components given a final line total (inclusive of tax) and the category.
   * Uses safe rounding to prevent floating point drift.
   */
  calculateTaxInclusive(inclusiveTotal: number, category: string, isInterstate: boolean = false): TaxComponents {
    const gstRate = this.getGstRate(category);
    
    // Formula: Taxable Value = Inclusive Total / (1 + (GST Rate / 100))
    const taxableValue = Number((inclusiveTotal / (1 + (gstRate / 100))).toFixed(2));
    const gstAmount = Number((inclusiveTotal - taxableValue).toFixed(2));
    
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    
    if (isInterstate) {
      igst = gstAmount;
    } else {
      // Split evenly for intra-state
      cgst = Number((gstAmount / 2).toFixed(2));
      sgst = Number((gstAmount - cgst).toFixed(2)); // Ensures no penny drop
    }
    
    return {
      taxableValue,
      gstAmount,
      cgst,
      sgst,
      igst,
      gstRate,
      grandTotal: inclusiveTotal
    };
  }
};
