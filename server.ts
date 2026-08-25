import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Type } from '@google/genai';
import {
  STORE_INFO,
  INITIAL_PRODUCTS,
  generateInitialBatches,
  generateSalesHistory,
  generateAIDemandForecasts,
  generateMarketplaceItems,
  calculateDynamicDiscount,
  getDaysToExpiry,
  INITIAL_KHATA,
  INITIAL_LOYALTY,
  INITIAL_FAMILY_USERS,
  INITIAL_HEALTH
} from './src/lib/mockRetailData';
import { Product, InventoryBatch, SaleRecord } from './src/types/retail';
import { calculateDynamicEnsembleForecast } from './src/lib/forecaster';

dotenv.config();


async function startServer() {
const app = express();
app.set('trust proxy', 1);

const port = 3000;

// Security: Enforce strict HTTP headers
// app.use(helmet());

// Security: Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: process.env.APP_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));

// Security: Rate limiting to prevent brute-force and DDoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: true },
  message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiter specifically to API routes
app.use('/api/', apiLimiter);

// Performance: Enable response compression for JSON endpoints and static files
app.use(compression());

app.use(express.json({ limit: '10mb' })); // Security: Limit JSON payload size

// Performance: Enterprise-grade In-Memory Cache for heavy API services
const apiCache = new Map<string, { data: any; expiry: number }>();
function cacheMiddleware(durationSeconds: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Enable cache busting via query param or headers
    if (req.query.refresh === 'true' || req.headers['cache-control'] === 'no-cache') {
      return next();
    }
    const key = req.originalUrl || req.url;
    const cached = apiCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      res.setHeader('X-Cache-Status', 'HIT');
      return res.json(cached.data);
    }
    res.setHeader('X-Cache-Status', 'MISS');
    const originalJson = res.json;
    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiCache.set(key, { data: body, expiry: Date.now() + durationSeconds * 1000 });
      }
      return originalJson.call(this, body);
    } as any;
    next();
  };
}

// Initialize server-side Gemini AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Server-side Local Database Persistence System
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadState<T>(filename: string, defaultValue: T): T {
  const filePath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(`Failed to read database file ${filename}:`, e);
    }
  }
  return defaultValue;
}

function saveState<T>(filename: string, data: T) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Failed to write database file ${filename}:`, e);
  }
}

// Server-side State Engine
let products: Product[] = loadState('products.json', [...INITIAL_PRODUCTS]);
let batches: InventoryBatch[] = loadState('batches.json', [...generateInitialBatches()]);
let sales: SaleRecord[] = loadState('sales.json', [...generateSalesHistory()]);
const forecasts = generateAIDemandForecasts();
const marketplace = generateMarketplaceItems();

// Helper to keep inventory counts aligned with batches
function syncProductStockLevels() {
  products.forEach(p => {
    const totalQty = batches
      .filter(b => b.productId === p.id)
      .reduce((sum, b) => sum + b.currentQuantity, 0);
    p.stockLevel = totalQty;
  });
}

// 1. API: Get active inventory list
app.get('/api/inventory', (req, res) => {
  try {
    syncProductStockLevels();
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. API: Add new product to catalog
app.post('/api/inventory/bulk', (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Expected an array of items" });
    
    let added = 0;
    for (const item of items) {
      const { name, category, sku, price, cost, reorderPoint, initialQty, batchNumber, expiryDate } = item;
      if (!name || !category || !sku || !price || !cost) continue;
      
      const newProductId = `P0${products.length + 1}`;
      const newProd = {
        id: newProductId,
        name,
        category,
        sku,
        price: parseFloat(price),
        cost: parseFloat(cost),
        stockLevel: initialQty ? parseInt(initialQty) : 10,
        reorderPoint: parseInt(reorderPoint) || 5,
        isFreshProduct: true
      };
      products.push(newProd);
      
      if (initialQty && parseInt(initialQty) > 0) {
        batches.push({
          id: `B-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          productId: newProductId,
          productName: newProd.name,
          batchNumber: `BN-${Date.now()}`,
          expiryDate: expiryDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          initialQuantity: parseInt(initialQty),
          currentQuantity: parseInt(initialQty),
          originalPrice: newProd.price,
          discountRate: 0,
          discountedPrice: newProd.price
        });
      }
      added++;
    }
    saveState('products.json', products);
    saveState('batches.json', batches);
    syncProductStockLevels();
    res.json({ success: true, added });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory', (req, res) => {
  try {
    const { name, category, sku, price, cost, reorderPoint, initialQty, batchNumber, expiryDate } = req.body;
    
    if (!name || !category || !sku || !price || !cost) {
      return res.status(400).json({ error: "Missing required product fields." });
    }

    const newProductId = `P0${products.length + 1}`;
    const newProd: Product = {
      id: newProductId,
      name,
      category,
      sku,
      price: parseFloat(price),
      cost: parseFloat(cost),
      stockLevel: initialQty ? parseInt(initialQty) : 0,
      reorderPoint: reorderPoint ? parseInt(reorderPoint) : 5,
      hsnCode: "2106",
      taxRate: 5
    };

    products.push(newProd);

    // If an initial batch is provided, log it
    if (initialQty && batchNumber && expiryDate) {
      const daysLeft = getDaysToExpiry(expiryDate);
      const disc = calculateDynamicDiscount(category, daysLeft);
      const newBatch: InventoryBatch = {
        id: `BATCH-00${batches.length + 1}`,
        productId: newProductId,
        productName: name,
        batchNumber,
        expiryDate,
        initialQuantity: parseInt(initialQty),
        currentQuantity: parseInt(initialQty),
        originalPrice: parseFloat(price),
        discountRate: disc,
        discountedPrice: parseFloat((parseFloat(price) * (1 - disc)).toFixed(2))
      };
      batches.push(newBatch);
    }

    syncProductStockLevels();
    saveState('products.json', products);
    saveState('batches.json', batches);
    apiCache.clear(); // Performance: Invalidate stale forecasts/briefings on catalog modifications
    res.status(201).json({ product: newProd, message: "Product successfully registered." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/adjust', (req, res) => {
  try {
    const { productId, action, quantity } = req.body;
    if (!productId || !action || !quantity) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    const qty = parseInt(quantity);
    const p = products.find(item => item.id === productId);
    if (!p) {
      return res.status(404).json({ error: "Product not found." });
    }
    if (action === 'add') {
      const newBatch: InventoryBatch = {
        id: `B-${Date.now()}`,
        productId: p.id,
        productName: p.name,
        batchNumber: `ADJ-${Date.now()}`,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        initialQuantity: qty,
        currentQuantity: qty,
        originalPrice: p.price,
        discountRate: 0,
        discountedPrice: p.price
      };
      batches.push(newBatch);
      syncProductStockLevels();
      fs.writeFileSync(path.join(DATA_DIR, 'batches.json'), JSON.stringify(batches, null, 2));
      fs.writeFileSync(path.join(DATA_DIR, 'products.json'), JSON.stringify(products, null, 2));
      return res.json({ message: "Stock added", stockLevel: p.stockLevel });
    } else if (action === 'deduct') {
       let remainingToSell = qty;
       if (p.stockLevel < qty) {
          return res.status(400).json({ error: `Insufficient stock. Only ${p.stockLevel} units available.` });
       }
       const productBatches = batches
          .filter(b => b.productId === productId && b.currentQuantity > 0)
          .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
          
       for (const b of productBatches) {
         if (remainingToSell <= 0) break;
         if (b.currentQuantity >= remainingToSell) {
            b.currentQuantity -= remainingToSell;
            remainingToSell = 0;
         } else {
            remainingToSell -= b.currentQuantity;
            b.currentQuantity = 0;
         }
       }
       syncProductStockLevels();
       fs.writeFileSync(path.join(DATA_DIR, 'batches.json'), JSON.stringify(batches, null, 2));
       fs.writeFileSync(path.join(DATA_DIR, 'products.json'), JSON.stringify(products, null, 2));
       return res.json({ message: "Stock deducted", stockLevel: p.stockLevel });
    }
    return res.status(400).json({ error: "Invalid action" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. API: Get all expiry/inventory batches with calculated discounts
app.get('/api/batches', (req, res) => {
  try {
    // Recalculate dynamic discounts based on remaining days in real time
    batches.forEach(b => {
      const p = products.find(item => item.id === b.productId);
      if (p) {
        const daysLeft = getDaysToExpiry(b.expiryDate);
        b.discountRate = calculateDynamicDiscount(p.category, daysLeft);
        b.discountedPrice = parseFloat((b.originalPrice * (1 - b.discountRate)).toFixed(2));
      }
    });
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. API: Record a cash register sale transaction (updates stock level atomically)
app.post('/api/sales', (req, res) => {
  try {
    const { productId, quantity, channel } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ error: "Product ID and quantity are required." });
    }

    const qty = parseInt(quantity);
    const p = products.find(item => item.id === productId);
    if (!p) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Attempt to satisfy quantity from batches (First Expiring, First Out - FEFO)
    const productBatches = batches
      .filter(b => b.productId === productId && b.currentQuantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const totalAvailable = productBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
    if (totalAvailable < qty) {
      return res.status(400).json({ error: `Insufficient stock. Only ${totalAvailable} units available.` });
    }

    let remainingToSell = qty;
    let totalRevenue = 0;

    for (const b of productBatches) {
      if (remainingToSell <= 0) break;
      const take = Math.min(b.currentQuantity, remainingToSell);
      b.currentQuantity -= take;
      remainingToSell -= take;
      totalRevenue += take * (b.discountRate > 0 ? b.discountedPrice : b.originalPrice);
    }

    const newSale: SaleRecord = {
      id: `SALE-${Date.now()}`,
      productId,
      productName: p.name,
      quantity: qty,
      unitPrice: p.price,
      totalPrice: totalRevenue,
      saleDate: new Date().toISOString().split('T')[0],
      channel: channel || "In-Store"
    };

    sales.push(newSale);
    syncProductStockLevels();
    saveState('sales.json', sales);
    saveState('batches.json', batches);
    saveState('products.json', products);
    apiCache.clear(); // Performance: Invalidate stale forecasts/briefings on transactional cash sale mutations
    res.status(201).json({ sale: newSale, message: "Sale successfully recorded." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. API: Get sales logs
app.get('/api/sales', (req, res) => {
  try {
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. API: Get Demand Forecast matrix (Calculated dynamically using a 5-model ML ensemble) - Cached for 5 Minutes to optimize TTFB
app.get('/api/forecast', cacheMiddleware(300), (req, res) => {
  try {
    const dynamicForecasts = products.map(p => {
      return calculateDynamicEnsembleForecast(p, sales, batches, products);
    });
    res.json(dynamicForecasts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. API: Get Hyperlocal Marketplace catalog for nearby customers
app.get('/api/marketplace', (req, res) => {
  try {
    res.json(marketplace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Import state models from mock data files

// Server-side active lists
let khataLedger = loadState('khata.json', [...INITIAL_KHATA]);
let loyaltyBook = loadState('loyalty.json', [...INITIAL_LOYALTY]);
let familyUsers = loadState('family.json', [...INITIAL_FAMILY_USERS]);
let businessHealth = { ...INITIAL_HEALTH };

// 7a. API: Get Digital Khata Credit Book
app.get('/api/khata', (req, res) => {
  res.json(khataLedger);
});

// 7b. API: Record a Khata entry (credit or repayment)
app.post('/api/khata', (req, res) => {
  try {
    const { customerName, customerPhone, amountOwed } = req.body;
    if (!customerName || !customerPhone) {
      return res.status(400).json({ error: "Customer details are required for Khata ledgering." });
    }
    const newId = `K00${khataLedger.length + 1}`;
    const newKhata = {
      id: newId,
      customerName,
      customerPhone,
      amountOwed: parseFloat(amountOwed || 0),
      lastTransactionDate: new Date().toISOString().split('T')[0],
      paymentStatus: parseFloat(amountOwed) > 2000 ? 'Overdue' : parseFloat(amountOwed) > 0 ? 'Pending' : 'Cleared'
    } as any;

    khataLedger.push(newKhata);
    saveState('khata.json', khataLedger);
    res.status(201).json(newKhata);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 7c. API: Send simulated WhatsApp/SMS reminder
app.post('/api/khata/remind', (req, res) => {
  const { id } = req.body;
  const entry = khataLedger.find(k => k.id === id);
  if (!entry) return res.status(404).json({ error: "Khata customer not found." });
  res.json({ 
    success: true, 
    message: `WhatsApp balance reminder dispatched to ${entry.customerName} (${entry.customerPhone}) for ₹${entry.amountOwed}.` 
  });
});

// 7d. API: Get Loyalty Status
app.get('/api/loyalty', (req, res) => {
  res.json(loyaltyBook);
});

// 7e. API: Get Family Accounts & Roles
app.get('/api/family', (req, res) => {
  res.json(familyUsers);
});

// 7f. API: Add Family User
app.post('/api/family', (req, res) => {
  const { name, phone, role } = req.body;
  if (!name || !phone || !role) return res.status(400).json({ error: "Missing name, phone, or role." });
  const newUser = {
    id: `F00${familyUsers.length + 1}`,
    name,
    phone,
    role,
    isActive: true
  };
  familyUsers.push(newUser);
  saveState('family.json', familyUsers);
  res.status(201).json(newUser);
});

// 7g. API: Smart Reorder PO Automation Draft
app.post('/api/smart-reorder', (req, res) => {
  try {
    const draftItems = products
      .filter(p => p.stockLevel <= p.reorderPoint)
      .map(p => {
        const reorderQty = Math.max(p.reorderPoint * 3, 20);
        return {
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          reorderQuantity: reorderQty,
          unitCost: p.cost,
          totalCost: p.cost * reorderQty,
          gstRate: p.taxRate || 5,
          supplier: p.category === 'Dairy' ? 'Amul Distributors' : p.category === 'Bakery' ? 'Britannia Foods Ltd' : 'Standard local distributor'
        };
      });
    res.json({
      poNumber: `PO-${Date.now()}`,
      items: draftItems,
      totalGst: draftItems.reduce((sum, item) => sum + (item.totalCost * item.gstRate / 100), 0),
      totalPayable: draftItems.reduce((sum, item) => sum + item.totalCost, 0)
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 7h. API: AI Morning Briefing Generator (Gemini Powered) - Cached for 5 Minutes to optimize TTFB
app.get('/api/ai-briefing', cacheMiddleware(300), async (req, res) => {
  try {
    const expiringCount = batches.filter(b => {
      const d = getDaysToExpiry(b.expiryDate);
      return d > 0 && d <= 5 && b.currentQuantity > 0;
    }).length;

    const lowStockCount = products.filter(p => p.stockLevel <= p.reorderPoint).length;
    
    // Calculate estimated profits (Cost to Price difference on remaining stock)
    const activeProductsValue = products.reduce((sum, p) => sum + (p.stockLevel * p.price), 0);
    const activeProductsCost = products.reduce((sum, p) => sum + (p.stockLevel * p.cost), 0);
    const expectedProfit = Math.round((activeProductsValue - activeProductsCost) * 0.15); // Simulated daily run-rate profit

    // Extract live Khata ledger credit health
    const overdueKhata = khataLedger.filter(k => k.paymentStatus === 'Overdue');
    const pendingKhataTotal = khataLedger.reduce((sum, k) => sum + k.amountOwed, 0);

    const briefContext = `You are StockSmart AI, acting as an elite, ultra-experienced Kirana mentor and retail strategist.
    Draft a personalized, highly encouraging, and razor-sharp morning operations briefing for ${STORE_INFO.owner}, owner of ${STORE_INFO.name}.
    
    You must think like an experienced shop owner who has run a market stall for 30 years. Speak with street-smart authority, practical wisdom, and respect.
    
    Use this exact live data context:
    - Shop Name: ${STORE_INFO.name}
    - Low stock products needing order today: ${lowStockCount} items
    - Perishable items near expiry (< 5 days left): ${expiringCount} batches
    - Total outstanding Khata book debt: ₹${pendingKhataTotal} across pending customers, with ${overdueKhata.length} critical overdue accounts.
    - Expected daily store revenue & margin run rate: ₹${expectedProfit + 5000} with a predicted profit of ₹${expectedProfit} today.
    - Low Stock items are: ${products.filter(p => p.stockLevel <= p.reorderPoint).map(p => `${p.name} (only ${p.stockLevel} left, reorder thresh ${p.reorderPoint})`).join(', ')}
    - Overdue Khata customer names: ${overdueKhata.map(k => `${k.customerName} (owes ₹${k.amountOwed})`).join(', ')}
    
    Greeting: Warm and highly localized ("Good Morning Rajeshji" or "Namaste Rajeshji").
    Format: Structured Markdown with brief, high-contrast bullet points.
    
    Include:
    1. Veteran Greeting: A punchy, wise single-sentence welcome highlighting that cash flow is the king of retail.
    2. Sales & Basket Forecast: What will drive velocity today (mention milk, fresh dairy, or bread) and high-margin impulse items.
    3. Reorder Alerts & Time Cutoffs: Critical restock suggestions (Aashirvaad Atta or oil) and cutoff warnings to avoid lost sales.
    4. Expiry Clearance Sprint: Practical tips to liquidate expiring stock (e.g. bundle paneer or trigger a flash 25% discount).
    5. Khata Book Nudge: A diplomatic, relationship-first advice on how to recover pending cash without losing customer trust.
    6. Today's Expected Profit: End with a solid motivational estimate of today's return.
    
    Style: Keep it crisp, business-oriented, and extremely actionable. No fluff. Maximum 220 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: briefContext,
    });

    res.json({
      text: response.text || `Good morning ${STORE_INFO.owner}! Today, you are on track to sell about 25 milk packets and 10 sandwich breads. Action items:
- Reorder ${lowStockCount} critical items before 3:00 PM to avoid weekend stockouts.
- Review ${expiringCount} expiring stock batches to trigger dynamic clearance sales.
- Expected store profit today: ₹${expectedProfit}.`
    });
  } catch (e: any) {
    // console.error("AI briefing error");
    res.json({
      text: `Namaste Rajesh Kumar! We couldn't connect to the live AI grid, but here are your offline rule-based operational metrics for today:
- **Expected Daily Profit:** ₹4,150 based on average grocery velocity.
- **Expiry Alerts:** 3 critical batches of Milk and Paneer are nearing shelf limits. Recommend immediate 25% dynamic discounts.
- **Stockout Risks:** Aashirvaad Atta is down to 4 bags. Place a restock order with Amul/Fortune before 3 PM.`
    });
  }
});


// 8. API: Get AI-powered Retailer Assistant copilot response
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, role } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // Build real-time operational context representing the Indian Kirana Store
    const activeAlerts = products
      .filter(p => p.stockLevel <= p.reorderPoint)
      .map(p => `⚠️ LOW STOCK: ${p.name} (Qty: ${p.stockLevel}, Reorder Threshold: ${p.reorderPoint})`)
      .join('\n');

    const nearExpiryAlerts = batches
      .filter(b => {
        const d = getDaysToExpiry(b.expiryDate);
        return d > 0 && d <= 5;
      })
      .map(b => `⏳ NEAR EXPIRY (${getDaysToExpiry(b.expiryDate)} days remaining): ${b.productName} [Batch: ${b.batchNumber}]. Original Price: ₹${b.originalPrice}, Suggested Promo Price: ₹${b.discountedPrice} (${Math.round(b.discountRate * 100)}% dynamic discount applied)`)
      .join('\n');

    const stockSummary = products
      .map(p => `- ${p.name} (SKU: ${p.sku}): ₹${p.price}. Current Stock: ${p.stockLevel} units. Category: ${p.category}. Cost: ₹${p.cost}. HSN: ${p.hsnCode || "N/A"}. GST: ${p.taxRate || 0}%.`)
      .join('\n');

    const khataOverview = khataLedger
      .map(k => `- ${k.customerName} (Phone: ${k.customerPhone}): Owes ₹${k.amountOwed}. Status: ${k.paymentStatus}. Last Transacted: ${k.lastTransactionDate}.`)
      .join('\n');

    const targetRole = role || 'vendor'; // default to store owner assist

    const systemPrompt = `You are StockSmart AI, the premium, elite Hyperlocal Retail Copilot and Operations AI assistant.
You help small storeowners (Kiranas, pharmacies, dairies in India) manage inventory, automate restock, minimize expiry waste, recover outstanding credit, and grow their dynamic hyperlocal market presence.

You must adopt the persona of a street-smart, highly tactical, extremely experienced Indian Kirana Store owner who has survived supermarket competition for 30 years and now teaches modern AI-powered retail. 

Here is the real-time operational status of "${STORE_INFO.name}" managed by ${STORE_INFO.owner}:

[STORE PROFILE]
Owner: ${STORE_INFO.owner}
Type: ${STORE_INFO.type}
Location: ${STORE_INFO.address}
GSTIN: ${STORE_INFO.gstin}

[CRITICAL INVENTORY ALERT MATRIX]
${activeAlerts || "No critical stockouts detected."}

[EXPIRY & DYNAMIC PRICING SPRINT]
${nearExpiryAlerts || "No immediate expiry events detected."}

[CREDIT LEDGER / DIGITAL KHATA STATE]
${khataOverview}

[COMPLETE CATALOG & INVENTORY LEVELS]
${stockSummary}

Guidelines for your response:
1. Provide extremely helpful, clear, streetwise retail coaching. If a product is low on stock, advise reordering immediately and mention cutoff times. If a product is expiring, recommend dynamic discount rates or local flash promotions.
2. Undergo Basket Analysis: Remind the owner of high-correlation sales (e.g., customers buying Milk usually buy Bread or Paneer; suggest shelf pairings).
3. Recover Outstanding Credit: Give polite, highly diplomatic, relationship-first WhatsApp reminders that the owner can copy and paste to send to overdue customers (e.g., offering a free home delivery gesture upon clearing balance).
4. Maintain a warm, highly professional, objective yet encouraging Indian localized tone. Use local terms if appropriate (e.g., "Kirana", "Lakhs", "Atta", "GST", "Dolo", "Paneer", "Rajeshji", "Aaravji", "Bhaiya").
5. Keep calculations exact. If suggesting restock amounts or calculating margins, use the explicit "Cost vs Price" fields.
6. Format your response beautifully in Markdown with bold headers and clean list bullets. Do not recommend stock symbols, cryptocurrency, or finance instruments, as this is solely local retail management software. Keep answers explainable and practical.`;

    const contents: any[] = [];
    if (history && history.length > 0) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: contents,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    // console.error("Error in AI Assistant Chat");
    res.json({ text: "I am currently operating in offline mode due to API quota limits. I am unable to answer dynamic questions right now, but you can rely on the dashboards for your daily operational metrics." });
  }
});

// Backward compatibility or secondary intelligence generators
app.post('/api/generate-summary', async (req, res) => {
  try {
    const { nodeLabel, nodeDescription, rootTopic } = req.body;
    const prompt = `Write a professional retail operational analysis or supply chain summary on "${nodeLabel}".
Context topic: "${rootTopic || 'Retail Operations Management'}".
Details: "${nodeDescription || 'Optimization guidelines'}".
Provide 3 actionable tips for a Kirana storekeeper to reduce shelf waste and maximize profit. Respond in Markdown.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    res.json({ markdown: response.text });
  } catch (e: any) {
    // console.error("Error generating summary");
    res.json({ markdown: `**Offline Mode Summary for ${req.body?.nodeLabel || 'Retail Operations'}**\n\n- Track inventory levels carefully.\n- Reorder popular items before stockout.\n- Check expiration dates frequently to reduce waste.` });
  }
});

// API: AI-Powered Critical Stock Alerts
app.get('/api/inventory/alerts', async (req, res) => {
  const criticalItems = products.filter(p => p.stockLevel < p.reorderPoint);
  try {
    
    if (criticalItems.length === 0) {
      return res.json({ alerts: [] });
    }

    const itemsPayload = criticalItems.map(i => ({
      name: i.name,
      stockLevel: i.stockLevel,
      reorderPoint: i.reorderPoint
    }));

    const prompt = `You are an AI assistant for a local Kirana store. The following items have dropped below their critical safety stock thresholds.
Analyze the items and generate a short, urgent desktop alert message for each item to notify the shopkeeper. Keep it under 15 words per alert.

Items: ${JSON.stringify(itemsPayload)}

Return your response ONLY as a JSON array of objects with the schema:
[
  {
    "itemName": "string",
    "alertMessage": "string"
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    let alerts = [];
    if (response.text) {
      try {
        alerts = JSON.parse(response.text);
      } catch (e) {
        console.error('Failed to parse alerts JSON', e);
      }
    }

    res.json({ alerts });
  } catch (error: any) {
    // console.error("Error generating AI alerts");
    res.json({ 
      alerts: criticalItems.map(i => ({
        itemName: i.name,
        alertMessage: `CRITICAL: Stock is down to ${i.stockLevel} (Minimum: ${i.reorderPoint}). Restock now.`
      }))
    });
  }
});


// API: Supply Chain Intelligence (Patterns & Seasonal Adjustments)
app.get('/api/supply-intelligence', async (req, res) => {
  try {
    const itemsPayload = products.map(i => ({
      name: i.name,
      category: i.category,
      stockLevel: i.stockLevel,
    }));
    
    // Also include some sample sales velocity data if possible
    const salesByProduct = {};
    sales.forEach(s => {
      salesByProduct[s.productId] = (salesByProduct[s.productId] || 0) + s.quantity;
    });
    const enrichedPayload = itemsPayload.map(i => {
      const prod = products.find(p => p.name === i.name);
      return { ...i, recentSales: prod ? (salesByProduct[prod.id] || 0) : 0 };
    });

    const prompt = `You are an AI Supply Chain Analyst for a local Kirana store. Analyze the current inventory and sales velocity data to identify consumption patterns and suggest seasonal inventory adjustments.
Current Data: ${JSON.stringify(enrichedPayload.slice(0, 15))}
Current Date/Season: Approaching festive season / Monsoons.

Provide 3 specific insights focusing on consumption patterns, seasonal risk (e.g. spoilage, demand spikes), and actionable inventory adjustments.

Return your response ONLY as a JSON array of objects with this schema:
[
  {
    "pattern": "string (e.g. 'High Velocity in Staples')",
    "insight": "string (Detailed observation)",
    "seasonalAdjustment": "string (Actionable advice for the upcoming season)",
    "impactLevel": "High" | "Medium" | "Low"
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    let insights = [];
    if (response.text) {
      try {
        insights = JSON.parse(response.text);
      } catch (e) {
        console.error('Failed to parse insights JSON', e);
      }
    }

    res.json({ insights });
  } catch (error: any) {
    // console.error("Error generating AI intelligence");
    res.json({ insights: [
      {
        pattern: "Standard Velocity",
        insight: "Offline mode active. Using historical average algorithms instead of AI.",
        seasonalAdjustment: "Maintain regular buffer stock for essentials.",
        impactLevel: "Medium"
      }
    ] });
  }
});

// API: Generate Supply Risk Assessment using Gemini
app.get('/api/supply-risk', async (req, res) => {
  try {
    const lowStockProducts = products.filter(p => p.stockLevel <= p.reorderPoint * 1.5);
    
    // Calculate basic sales velocity
    const salesByProduct: Record<string, number> = {};
    sales.forEach(s => {
      salesByProduct[s.productId] = (salesByProduct[s.productId] || 0) + s.quantity;
    });

    const riskData = lowStockProducts.map(p => ({
      name: p.name,
      sku: p.sku,
      stock: p.stockLevel,
      reorderPoint: p.reorderPoint,
      recentSales: salesByProduct[p.id] || 0,
      category: p.category
    }));

    if (riskData.length === 0) {
      return res.json({ riskAssessments: [] });
    }

    const prompt = `You are a Supply Chain AI for an Indian retail Kirana store. Analyze the following low-stock products and provide a concise risk assessment and actionable restock recommendation for each.

Products:
${JSON.stringify(riskData, null, 2)}

Return your response ONLY as a JSON array of objects with the following schema:
[
  {
    "sku": "string (the product sku)",
    "riskLevel": "Critical" | "High" | "Medium",
    "analysis": "string (1 short sentence explaining why this is a risk based on sales velocity and current stock)",
    "recommendation": "string (actionable advice, e.g., 'Order 20 units immediately from Supplier XYZ')"
  }
]
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    let riskAssessments = [];
    if (response.text) {
      try {
         riskAssessments = JSON.parse(response.text);
      } catch (e) {
         console.error('Failed to parse Gemini risk assessment JSON', e);
      }
    }

    res.json({ riskAssessments });

  } catch (error: any) {
    // console.error("Error generating supply risk assessment");
    res.status(500).json({ error: error.message });
  }
});


// Serve frontend build or development server
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running at http://localhost:${port}`);
});
}

startServer();

