import { Product, InventoryBatch, SaleRecord, StoreInfo, DemandForecast, MarketplaceItem, KhataRecord, LoyaltyCustomer, FamilyAccountUser, BusinessHealth } from '../types/retail';

// Official Kirana store configuration
export const STORE_INFO: StoreInfo = {
  name: "Krishna Kirana & Supermarket",
  owner: "Rajesh Kumar",
  type: "Hyperlocal Grocery & Staples",
  address: "Shop No. 4, Sector 15 Main Market, Gurugram, Haryana - 122001",
  phone: "+91 98765 43210",
  gstin: "06AAAAA1111A1Z1"
};

// Realistic product inventory list (Indian retail)
export const INITIAL_PRODUCTS: Product[] = [
  { id: "P001", name: "Amul Taaza Toned Milk 1L", category: "Dairy", sku: "AMUL-MILK-1L", price: 66, cost: 58, stockLevel: 45, reorderPoint: 15, hsnCode: "0401", taxRate: 0 },
  { id: "P002", name: "Britannia Sliced Sandwich Bread 400g", category: "Bakery", sku: "BRIT-BREAD-400", price: 45, cost: 36, stockLevel: 28, reorderPoint: 10, hsnCode: "1905", taxRate: 0 },
  { id: "P003", name: "Aashirvaad Shudh Chakki Atta 10kg", category: "Staples", sku: "AASH-ATTA-10K", price: 460, cost: 410, stockLevel: 4, reorderPoint: 8, hsnCode: "1101", taxRate: 5 },
  { id: "P004", name: "Dolo 650mg Tablets (15 Tabs)", category: "Pharmacy", sku: "DOLO-650-15", price: 34, cost: 24, stockLevel: 80, reorderPoint: 20, hsnCode: "3004", taxRate: 12 },
  { id: "P005", name: "Mother Dairy Fresh Paneer 200g", category: "Dairy", sku: "MD-PANEER-200", price: 90, cost: 78, stockLevel: 18, reorderPoint: 6, hsnCode: "0406", taxRate: 5 },
  { id: "P006", name: "Haldiram's Bhujia Sev 350g", category: "Grocery", sku: "HALD-BHUJ-350", price: 110, cost: 92, stockLevel: 35, reorderPoint: 12, hsnCode: "2106", taxRate: 12 },
  { id: "P007", name: "Cavendish Yellow Bananas (1 Dozen)", category: "Fruits & Vegetables", sku: "FRUIT-BANANA", price: 60, cost: 42, stockLevel: 15, reorderPoint: 5, hsnCode: "0803", taxRate: 0 },
  { id: "P008", name: "Fortune Mustard Oil 1L Bottle", category: "Staples", sku: "FORT-MUST-1L", price: 175, cost: 155, stockLevel: 50, reorderPoint: 15, hsnCode: "1514", taxRate: 5 },
  { id: "P009", name: "Tata Salt Iodized 1kg", category: "Staples", sku: "TATA-SALT-1K", price: 28, cost: 23, stockLevel: 60, reorderPoint: 15, hsnCode: "2501", taxRate: 0 },
  { id: "P010", name: "Dettol Liquid Handwash Refill 175ml", category: "Grocery", sku: "DETT-HW-175", price: 99, cost: 82, stockLevel: 32, reorderPoint: 10, hsnCode: "3401", taxRate: 18 }
];

// Helper to get remaining days until expiry date
export function getDaysToExpiry(expiryDateStr: string): number {
  const expiry = new Date(expiryDateStr);
  const today = new Date();
  today.setHours(0,0,0,0);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Compute smart dynamic discount based on perishable rules
export function calculateDynamicDiscount(category: string, daysRemaining: number): number {
  if (daysRemaining <= 0) return 1.0; // 100% off (expired)
  
  if (category === "Dairy" || category === "Fruits & Vegetables") {
    if (daysRemaining === 1) return 0.50; // 50% discount on final day
    if (daysRemaining === 2) return 0.25; // 25% discount 2 days before
    if (daysRemaining <= 4) return 0.15;  // 15% discount
  } else if (category === "Bakery") {
    if (daysRemaining === 1) return 0.40; // 40% discount on final day
    if (daysRemaining <= 3) return 0.20;  // 20% discount
  } else {
    // Packaged grocery, Staples, Pharmacy
    if (daysRemaining <= 7) return 0.35;  // 35% discount
    if (daysRemaining <= 30) return 0.15; // 15% discount
  }
  return 0.0; // Full price
}

// Generates inventory batches mapped with remaining shelf life and dynamic price triggers
export function generateInitialBatches(): InventoryBatch[] {
  const today = new Date();
  
  const addDays = (d: number) => {
    const copy = new Date(today);
    copy.setDate(today.getDate() + d);
    return copy.toISOString().split('T')[0];
  };

  const batchesRaw = [
    { productId: "P001", batchNumber: "B-AMUL-99A", expiryOffset: 1, qty: 15 }, // Milk expiring tomorrow!
    { productId: "P001", batchNumber: "B-AMUL-99B", expiryOffset: 4, qty: 30 },
    { productId: "P002", batchNumber: "B-BRIT-23", expiryOffset: 2, qty: 12 },  // Bread expiring in 2 days!
    { productId: "P002", batchNumber: "B-BRIT-24", expiryOffset: 6, qty: 16 },
    { productId: "P003", batchNumber: "B-ATTA-01", expiryOffset: 180, qty: 4 }, // Long shelf-life
    { productId: "P004", batchNumber: "B-DOLO-88", expiryOffset: 28, qty: 40 },  // Medicine expiring in 28 days!
    { productId: "P004", batchNumber: "B-DOLO-89", expiryOffset: 365, qty: 40 },
    { productId: "P005", batchNumber: "B-PANEER-0", expiryOffset: 2, qty: 18 },  // Paneer expiring in 2 days!
    { productId: "P006", batchNumber: "B-BHUJ-15", expiryOffset: 15, qty: 35 },  // Bhujia expiring in 15 days
    { productId: "P007", batchNumber: "B-BANA-02", expiryOffset: 1, qty: 15 },  // Bananas expiring tomorrow!
    { productId: "P008", batchNumber: "B-FORT-08", expiryOffset: 90, qty: 50 },
    { productId: "P009", batchNumber: "B-SALT-10", expiryOffset: 250, qty: 60 },
    { productId: "P010", batchNumber: "B-DETT-04", expiryOffset: 30, qty: 32 }   // Refill expiring in 30 days
  ];

  return batchesRaw.map((b, i) => {
    const p = INITIAL_PRODUCTS.find(item => item.id === b.productId)!;
    const expDate = addDays(b.expiryOffset);
    const daysLeft = b.expiryOffset;
    const disc = calculateDynamicDiscount(p.category, daysLeft);
    const discPrice = parseFloat((p.price * (1 - disc)).toFixed(2));
    
    return {
      id: `BATCH-00${i + 1}`,
      productId: b.productId,
      productName: p.name,
      batchNumber: b.batchNumber,
      expiryDate: expDate,
      initialQuantity: b.qty,
      currentQuantity: b.qty,
      originalPrice: p.price,
      discountRate: disc,
      discountedPrice: discPrice
    };
  });
}

// Generates simulated sales history for daily timeline charting
export function generateSalesHistory(): SaleRecord[] {
  const history: SaleRecord[] = [];
  const channels: Array<'In-Store' | 'Hyperlocal Marketplace'> = ['In-Store', 'Hyperlocal Marketplace'];
  const today = new Date();

  // Populate last 30 days of daily transactions
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Pick 3-5 random sales per day
    const numSales = Math.floor(Math.random() * 3) + 3;
    for (let s = 0; s < numSales; s++) {
      const p = INITIAL_PRODUCTS[Math.floor(Math.random() * INITIAL_PRODUCTS.length)];
      const qty = Math.floor(Math.random() * 4) + 1;
      const channel = Math.random() > 0.3 ? channels[0] : channels[1];
      
      history.push({
        id: `SALE-${i}-${s}`,
        productId: p.id,
        productName: p.name,
        quantity: qty,
        unitPrice: p.price,
        totalPrice: p.price * qty,
        saleDate: dateStr,
        channel
      });
    }
  }
  return history;
}

// Generate the 5-Model Weighted AI Demand Forecasts & Optimize Reorder Suggestion matrix
export function generateAIDemandForecasts(): DemandForecast[] {
  return [
    {
      productId: "P001",
      productName: "Amul Taaza Toned Milk 1L",
      confidenceScore: 94,
      predictedDemandNext7d: 120,
      currentStock: 45,
      reorderQuantity: 80,
      reorderUrgency: "Optimized",
      insight: "High demand cycle expected on weekends. Current stock will deplete in 3 days. Standard restock recommendation applied."
    },
    {
      productId: "P002",
      productName: "Britannia Sliced Sandwich Bread 400g",
      confidenceScore: 89,
      predictedDemandNext7d: 85,
      currentStock: 28,
      reorderQuantity: 60,
      reorderUrgency: "Optimized",
      insight: "Stable demand. Dynamic expiry controls minimized fresh bakery spoilage last week by 35%."
    },
    {
      productId: "P003",
      productName: "Aashirvaad Shudh Chakki Atta 10kg",
      confidenceScore: 98,
      predictedDemandNext7d: 35,
      currentStock: 4,
      reorderQuantity: 40,
      reorderUrgency: "Critical",
      insight: "CRITICAL ALERT: Current stock (4 bags) is below reorder point (8). Next batch lead time is 2 days. Buy immediately to avoid out-of-stock loss."
    },
    {
      productId: "P004",
      productName: "Dolo 650mg Tablets (15 Tabs)",
      confidenceScore: 91,
      predictedDemandNext7d: 40,
      currentStock: 80,
      reorderQuantity: 0,
      reorderUrgency: "Low",
      insight: "Optimal safety buffer active. Current stock of 80 cards is sufficient to cover forecasted demand for the next 14 days."
    },
    {
      productId: "P005",
      productName: "Mother Dairy Fresh Paneer 200g",
      confidenceScore: 86,
      predictedDemandNext7d: 30,
      currentStock: 18,
      reorderQuantity: 15,
      reorderUrgency: "Medium",
      insight: "Strong mid-week restaurant/domestic bulk purchases predicted. Reordering 15 packs is recommended to sustain freshness."
    },
    {
      productId: "P006",
      productName: "Haldiram's Bhujia Sev 350g",
      confidenceScore: 83,
      predictedDemandNext7d: 25,
      currentStock: 35,
      reorderQuantity: 0,
      reorderUrgency: "Low",
      insight: "Demand slowing down slightly. Keep existing stock. Expiry is 15 days out, dynamic pricing will auto-trigger on remaining batches if unsold."
    }
  ];
}

// Hyperlocal Marketplace - Mocking nearby stores within customer radius
export function generateMarketplaceItems(): MarketplaceItem[] {
  const productsList = [
    { pId: "P001", name: "Amul Taaza Toned Milk 1L", category: "Dairy", base: 66, exp: 1 },
    { pId: "P002", name: "Britannia Sliced Sandwich Bread 400g", category: "Bakery", base: 45, exp: 2 },
    { pId: "P005", name: "Mother Dairy Fresh Paneer 200g", category: "Dairy", base: 90, exp: 2 },
    { pId: "P007", name: "Cavendish Yellow Bananas (1 Dozen)", category: "Fruits & Vegetables", base: 60, exp: 1 }
  ];

  const stores = [
    { name: "Krishna Kirana & Supermarket", distance: 0.2 },
    { name: "Shree Balaji Retail Hub", distance: 1.4 },
    { name: "Verma Fresh Dairy", distance: 0.8 },
    { name: "Modern Grocery Mart", distance: 2.1 }
  ];

  const items: MarketplaceItem[] = [];
  let idCounter = 1;

  stores.forEach((store) => {
    productsList.forEach((prod) => {
      const disc = calculateDynamicDiscount(prod.category, prod.exp);
      const discPrice = parseFloat((prod.base * (1 - disc)).toFixed(2));
      
      items.push({
        id: `MKT-${idCounter++}`,
        productId: prod.pId,
        productName: prod.name,
        storeName: store.name,
        distanceKm: store.distance,
        originalPrice: prod.base,
        discountedPrice: discPrice,
        discountRate: disc,
        expiryDays: prod.exp,
        stockAvailable: Math.floor(Math.random() * 12) + 4
      });
    });
  });

  return items;
}

// 13. Digital Khata Credit Ledger
export const INITIAL_KHATA: KhataRecord[] = [
  { id: "K001", customerName: "Aarav Sharma", customerPhone: "+91 91234 56789", amountOwed: 1450, lastTransactionDate: "2026-06-28", paymentStatus: "Pending" },
  { id: "K002", customerName: "Pooja Verma", customerPhone: "+91 98123 45670", amountOwed: 420, lastTransactionDate: "2026-06-30", paymentStatus: "Pending" },
  { id: "K003", customerName: "Amit Patel", customerPhone: "+91 95555 12345", amountOwed: 3100, lastTransactionDate: "2026-06-15", paymentStatus: "Overdue" },
  { id: "K004", customerName: "Sneha Reddy", customerPhone: "+91 96666 98765", amountOwed: 0, lastTransactionDate: "2026-06-29", paymentStatus: "Cleared" }
];

// 14. Customer Loyalty Points & Cashback
export const INITIAL_LOYALTY: LoyaltyCustomer[] = [
  { id: "L001", name: "Aarav Sharma", phone: "+91 91234 56789", points: 450, tier: "Gold", cashbackEarned: 120 },
  { id: "L002", name: "Pooja Verma", phone: "+91 98123 45670", points: 180, tier: "Silver", cashbackEarned: 35 },
  { id: "L003", name: "Rohan Gupta", phone: "+91 93333 44444", points: 80, tier: "Bronze", cashbackEarned: 10 },
  { id: "L004", name: "Vikram Malhotra", phone: "+91 99999 88888", points: 650, tier: "Gold", cashbackEarned: 240 }
];

// 16. Family Accounts (Roles & Permissions)
export const INITIAL_FAMILY_USERS: FamilyAccountUser[] = [
  { id: "F001", name: "Rajesh Kumar", phone: "+91 98765 43210", role: "Owner", isActive: true },
  { id: "F002", name: "Suman Kumar (Spouse)", phone: "+91 98765 00001", role: "Manager", isActive: true },
  { id: "F003", name: "Ravi Kumar (Son)", phone: "+91 98765 00002", role: "Cashier", isActive: true },
  { id: "F004", name: "Anil Dev (Helper)", phone: "+91 98765 00003", role: "Staff", isActive: true }
];

// 8. Business Health Score Indicators
export const INITIAL_HEALTH: BusinessHealth = {
  overallScore: 84,
  inventoryScore: 88,
  salesScore: 79,
  profitScore: 82,
  wasteScore: 91,
  customerScore: 80
};

// Extending Demand Forecasts with Festival Surge Factors
export const EXTENDED_DEMAND_FORECASTS: DemandForecast[] = [
  {
    productId: "P001",
    productName: "Amul Taaza Toned Milk 1L",
    confidenceScore: 94,
    predictedDemandNext7d: 120,
    currentStock: 45,
    reorderQuantity: 80,
    reorderUrgency: "Optimized",
    insight: "High demand cycle expected on weekends. Current stock will deplete in 3 days. Standard restock recommendation applied.",
    festivalFactor: "Sawan Vrat Season: High milk demand (+25%) due to sweet offerings."
  },
  {
    productId: "P002",
    productName: "Britannia Sliced Sandwich Bread 400g",
    confidenceScore: 89,
    predictedDemandNext7d: 85,
    currentStock: 28,
    reorderQuantity: 60,
    reorderUrgency: "Optimized",
    insight: "Stable demand. Dynamic expiry controls minimized fresh bakery spoilage last week by 35%.",
    festivalFactor: "Monsoon Morning Snacks: High tea-time companion demand (+10%)."
  },
  {
    productId: "P003",
    productName: "Aashirvaad Shudh Chakki Atta 10kg",
    confidenceScore: 98,
    predictedDemandNext7d: 45,
    currentStock: 4,
    reorderQuantity: 40,
    reorderUrgency: "Critical",
    insight: "CRITICAL ALERT: Current stock (4 bags) is below reorder point (8). Next batch lead time is 2 days. Buy immediately to avoid out-of-stock loss.",
    festivalFactor: "Diwali in 18 days: Sweets preparation will surge Atta/Maida requirements by +30%."
  },
  {
    productId: "P004",
    productName: "Dolo 650mg Tablets (15 Tabs)",
    confidenceScore: 91,
    predictedDemandNext7d: 40,
    currentStock: 80,
    reorderQuantity: 0,
    reorderUrgency: "Low",
    insight: "Optimal safety buffer active. Current stock of 80 cards is sufficient to cover forecasted demand for the next 14 days.",
    festivalFactor: "No seasonal health change predicted."
  },
  {
    productId: "P005",
    productName: "Mother Dairy Fresh Paneer 200g",
    confidenceScore: 86,
    predictedDemandNext7d: 30,
    currentStock: 18,
    reorderQuantity: 15,
    reorderUrgency: "Medium",
    insight: "Strong mid-week restaurant/domestic bulk purchases predicted. Reordering 15 packs is recommended to sustain freshness.",
    festivalFactor: "Diwali Feast Preparation: Paneer demand surge (+45%) in residential blocks."
  },
  {
    productId: "P006",
    productName: "Haldiram's Bhujia Sev 350g",
    confidenceScore: 83,
    predictedDemandNext7d: 25,
    currentStock: 35,
    reorderQuantity: 0,
    reorderUrgency: "Low",
    insight: "Demand slowing down slightly. Keep existing stock. Expiry is 15 days out, dynamic pricing will auto-trigger on remaining batches if unsold.",
    festivalFactor: "Diwali Snack Boxes (+52% gift packing purchases starting next week)."
  }
];

