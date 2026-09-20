export interface Product {
  id: string;
  name: string;
  category: 'Dairy' | 'Bakery' | 'Pharmacy' | 'Grocery' | 'Staples' | 'Fruits & Vegetables';
  sku: string;
  price: number; // Selling price in INR (₹)
  cost: number;  // Cost price in INR (₹)
  stockLevel: number;
  reorderPoint: number;
  hsnCode?: string;
  taxRate?: number; // GST rate (e.g., 5, 12, 18)
  originalPrice?: number; // for optimized reference
  isTopSeller?: boolean;
  isFreshProduct?: boolean;
}

export interface Supplier {
  id: string;
  storeId: string;
  name: string;
  contactInfo: string;
  reliabilityScore: number;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  productName: string; // denormalized for convenience
  batchNumber: string;
  expiryDate: string; // ISO date
  initialQuantity: number;
  currentQuantity: number;
  originalPrice: number;
  discountRate: number; // Dynamic discount applied based on remaining shelf life (0 to 1)
  discountedPrice: number;
}

export interface SaleRecord {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  saleDate: string;
  channel: 'In-Store' | 'Hyperlocal Marketplace';
}

export interface StoreInfo {
  name: string;
  owner: string;
  type: string;
  address: string;
  phone: string;
  gstin?: string;
  badge?: 'Verified Store' | 'Top Seller' | 'Premium Local';
}

export interface DemandForecast {
  productId: string;
  productName: string;
  confidenceScore: number; // 0-100
  predictedDemandNext7d: number; // predicted units needed
  currentStock: number;
  reorderQuantity: number;
  reorderUrgency: 'Critical' | 'Medium' | 'Low' | 'Optimized';
  insight: string;
  festivalFactor?: string; // Diwali, Holi surge explanation
  prophetForecast?: number;
  xgboostForecast?: number;
  catboostForecast?: number;
  lightgbmForecast?: number;
  lstmForecast?: number;
}

export interface MarketplaceItem {
  id: string;
  productId: string;
  productName: string;
  storeName: string;
  distanceKm: number;
  originalPrice: number;
  discountedPrice: number;
  discountRate: number;
  expiryDays: number;
  stockAvailable: number;
}

// 13. Digital Khata Credit Ledger
export interface KhataRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  amountOwed: number; // Positive if customer owes money, negative if credit
  lastTransactionDate: string;
  paymentStatus: 'Cleared' | 'Pending' | 'Overdue';
}

// 14. Customer Loyalty System
export interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  points: number;
  tier: 'Gold' | 'Silver' | 'Bronze';
  cashbackEarned: number;
}

// 16. Family Account Roles
export type StoreRole = 'Owner' | 'Manager' | 'Cashier' | 'Staff';

export interface FamilyAccountUser {
  id: string;
  name: string;
  phone: string;
  role: StoreRole;
  isActive: boolean;
}

// 8. Business Health Score Indicators
export interface BusinessHealth {
  overallScore: number; // 0-100
  inventoryScore: number; // 0-100
  salesScore: number; // 0-100
  profitScore: number; // 0-100
  wasteScore: number; // 0-100
  customerScore: number; // 0-100
}

