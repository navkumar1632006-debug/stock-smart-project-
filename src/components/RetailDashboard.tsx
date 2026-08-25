import React, { useState, useEffect } from 'react';
import { Download, Upload,
  Package,
  AlertTriangle,
  ShoppingBag,
  TrendingUp,
  RotateCcw,
  Plus,
  Zap,
  BarChart2,
  Trash2,
  FileSpreadsheet,
  AlertOctagon,
  CheckCircle2,
  Tag,
  DollarSign,
  Activity,
  User,
  Sparkles,
  Shield,
  Wifi,
  WifiOff,
  Type as FontIcon,
  ChevronDown,
  Sparkle,
  Box,
  ScanBarcode
} from 'lucide-react';
import { STORE_INFO, getDaysToExpiry } from '../lib/mockRetailData';
import { Product, InventoryBatch, SaleRecord, DemandForecast, StoreRole } from '../types/retail';
import { SalesForecastChart } from './SalesForecastChart';
import { SupplyChainAnalytics } from './SupplyChainAnalytics';
import { MobileBridge } from '../lib/mobileBridge';

// Lazy-loaded advanced operational modules for optimal chunk splitting and First Contentful Paint (FCP)
const AIRetailAssistant = React.lazy(() => import('./AIRetailAssistant').then(m => ({ default: m.AIRetailAssistant })));
const HyperlocalMarketplace = React.lazy(() => import('./HyperlocalMarketplace').then(m => ({ default: m.HyperlocalMarketplace })));
const AIMorningBriefing = React.lazy(() => import('./AIMorningBriefing').then(m => ({ default: m.AIMorningBriefing })));
const SmartReorderPO = React.lazy(() => import('./SmartReorderPO').then(m => ({ default: m.SmartReorderPO })));
const SupplyChainIntelligence = React.lazy(() => import('./SupplyChainIntelligence').then(m => ({ default: m.SupplyChainIntelligence })));
const DigitalKhata = React.lazy(() => import('./DigitalKhata').then(m => ({ default: m.DigitalKhata })));
const LoyaltyManager = React.lazy(() => import('./LoyaltyManager').then(m => ({ default: m.LoyaltyManager })));
const AccessControlFamily = React.lazy(() => import('./AccessControlFamily').then(m => ({ default: m.AccessControlFamily })));
const SupplierManagement = React.lazy(() => import('./SupplierManagement').then(m => ({ default: m.SupplierManagement })));
const HardwareSimulators = React.lazy(() => import('./HardwareSimulators').then(m => ({ default: m.HardwareSimulators })));
const BarcodeScanner = React.lazy(() => import('./BarcodeScanner').then(m => ({ default: m.BarcodeScanner })));

// Dynamic service activation skeleton
const LoadingSkeleton = () => (
  <div className="py-12 text-center text-slate-500/90 font-mono text-[10.5px]">
    <div className="w-5 h-5 bg-indigo-600/10 border border-indigo-400 rounded-full border-t-transparent animate-spin mx-auto mb-2" />
    <span>Loading dynamic StockSmart AI retail service...</span>
  </div>
);


export const RetailDashboard: React.FC = () => {
  // Main Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [allOriginalProducts, setAllOriginalProducts] = useState<Product[]>([]); // filter backup
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [salesLogs, setSalesLogs] = useState<SaleRecord[]>([]);
  const [forecasts, setDemandForecasts] = useState<DemandForecast[]>([]);
  
  // Advanced Simulation & Accessibility States
  const [currentRole, setCurrentRole] = useState<StoreRole>('Owner');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [syncQueueCount, setSyncQueueCount] = useState<number>(0);
  const [fontScale, setFontScale] = useState<boolean>(false);
  const [oneHandedMode, setOneHandedMode] = useState<boolean>(false);
  const [language, setLanguage] = useState<'en' | 'hi' | 'ta' | 'kn' | 'te'>('en');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [pin, setPin] = useState<string>('');

  // UI & Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'marketplace' | 'assistant'>('dashboard');
  const [showScanner, setShowScanner] = useState(false);

  const handleScanResult = async (product: Product, action: 'add' | 'deduct', quantity: number) => {
    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, action, quantity })
      });
      if (!response.ok) throw new Error(await response.text());
      await fetchAllData();
      await MobileBridge.triggerHapticFeedback('heavy');
      MobileBridge.showToast(`Successfully ${action === 'add' ? 'added' : 'deducted'} ${quantity} units of ${product.name}`, 'short');
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to adjust stock.");
    }
  };
  const [dashboardSection, setDashboardSection] = useState<'inventory' | 'khata' | 'rbac' | 'reports' | 'settings' | 'suppliers'>('inventory');

  // Input Forms States
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<'Dairy' | 'Bakery' | 'Pharmacy' | 'Grocery' | 'Staples' | 'Fruits & Vegetables'>('Dairy');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCost, setNewProdCost] = useState('');
  const [newProdReorder, setNewProdReorder] = useState('5');
  const [newProdQty, setNewProdQty] = useState('');
  const [newProdBatch, setNewProdBatch] = useState('');
  const [newProdExpiry, setNewProdExpiry] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Sale simulation Form state
  const [saleProductId, setSaleProductId] = useState('');
  const [saleQty, setSaleQty] = useState('1');
  const [saleSuccess, setSaleSuccess] = useState(false);


  // Load operational data from the REST routes
  const fetchAllData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [resInv, resBatches, resSales, resForecast] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/batches'),
        fetch('/api/sales'),
        fetch('/api/forecast')
      ]);

      if (!resInv.ok || !resBatches.ok || !resSales.ok || !resForecast.ok) {
        throw new Error("Failed to communicate with StockSmart AI engine services.");
      }

      const invData = await resInv.json();
      const batchData = await resBatches.json();
      const salesData = await resSales.json();
      const forecastData = await resForecast.json();

      setProducts(invData);
      setAllOriginalProducts(invData);
      setBatches(batchData);
      setSalesLogs(salesData);
      setDemandForecasts(forecastData);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(`⚠️ Operational Outage: ${e.message || "Failed to reach retail microservices."}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Initialize native Android Capacitor capabilities on startup
    MobileBridge.registerPushNotifications();
    MobileBridge.registerAppListeners(() => {
      fetchAllData();
    });
  }, []);

  // Desktop Notifications Background Checker
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    
    const checkAlerts = async () => {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          const res = await fetch('/api/inventory/alerts');
          if (res.ok) {
            const data = await res.json();
            if (data.alerts && data.alerts.length > 0) {
              data.alerts.forEach((alert: any) => {
                new Notification(`Stock Alert: ${alert.itemName}`, {
                  body: alert.alertMessage,
                });
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch background alerts:', err);
      }
    };

    const setupNotifications = async () => {
      if ('Notification' in window) {
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await Notification.requestPermission();
        }
        if (perm === 'granted') {
          checkAlerts();
          intervalId = setInterval(checkAlerts, 120000); // Check every 2 minutes
        }
      }
    };

    setupNotifications();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);


  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (currentRole !== 'Owner' && currentRole !== 'Manager') {
      alert(`🚫 Access Denied: Your active role is "${currentRole}". Only Store Owners or Managers are authorized to import inventory.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        alert("Invalid CSV format or empty file.");
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const items = [];
      
      for (let i = 1; i < lines.length; i++) {
        // Simple CSV parse handling quotes roughly
        const rawLine = lines[i];
        let row = [];
        let inQuotes = false;
        let currentWord = '';
        for (let char of rawLine) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            row.push(currentWord);
            currentWord = '';
          } else {
            currentWord += char;
          }
        }
        row.push(currentWord);
        row = row.map(cell => cell.trim().replace(/^"|"$/g, ''));
        
        if (row.length < 5) continue;
        
        // Expected basic headers: sku, product name, category, m.r.p, cost, in stock, threshold
        items.push({
          sku: row[0],
          name: row[1],
          category: row[2],
          price: parseFloat(row[3]) || 0,
          cost: parseFloat(row[4]) || 0,
          initialQty: parseInt(row[5]) || 0,
          reorderPoint: parseInt(row[6]) || 5
        });
      }
      
      if (items.length === 0) {
        alert("No valid items found to import.");
        return;
      }
      
      try {
        const response = await fetch('/api/inventory/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        });
        if (!response.ok) throw new Error("Bulk import failed");
        
        MobileBridge.showToast(`${items.length} items imported successfully`, 'short');
        fetch('/api/inventory').then(res => res.json()).then(data => {
          setProducts(data);
          setAllOriginalProducts(data);
        });
      } catch (err) {
        console.error(err);
        alert("Error importing CSV.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const downloadCSV = () => {
    // CSV Header
    const headers = ['SKU', 'Product Name', 'Category', 'M.R.P', 'Cost', 'In Stock', 'Threshold', 'Stock Status'];
    
    // Map products to CSV rows
    const rows = products.map(p => {
      const isCritical = p.stockLevel <= 0;
      const isLowStock = p.stockLevel <= p.reorderPoint;
      const status = isCritical ? 'OUT OF STOCK' : (isLowStock ? 'LOW STOCK' : 'HEALTHY');
      
      return [
        p.sku,
        `"${p.name}"`, // Escape commas in names
        p.category,
        p.price,
        p.cost,
        p.stockLevel,
        p.reorderPoint,
        status
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    MobileBridge.showToast('Inventory Report Exported successfully', 'short');
  };

  // API Call: Register a new product & batch
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'Owner' && currentRole !== 'Manager') {
      alert(`🚫 Access Denied: Your active role is "${currentRole}". Only Store Owners or Managers are authorized to register SKU items to the product catalog.`);
      return;
    }

    if (!newProdName || !newProdSku || !newProdPrice || !newProdCost) {
      alert("Please fill in all mandatory inventory fields.");
      return;
    }

    if (isOffline) {
      setSyncQueueCount(prev => prev + 1);
      const tempId = `prod-${Date.now()}`;
      const tempProduct: Product = {
        id: tempId,
        name: newProdName,
        category: newProdCategory,
        sku: newProdSku,
        price: parseFloat(newProdPrice),
        cost: parseFloat(newProdCost),
        stockLevel: newProdQty ? parseInt(newProdQty) : 10,
        reorderPoint: parseInt(newProdReorder) || 5,
        isFreshProduct: true
      };
      setProducts(prev => [tempProduct, ...prev]);
      setAllOriginalProducts(prev => [tempProduct, ...prev]);
      alert(`💾 [Offline Buffer Mode] Product stored in local cache. It will be synced to Supabase when you push the queue.`);
      setFormSuccess(true);
      setNewProdName('');
      setNewProdSku('');
      setNewProdPrice('');
      setNewProdCost('');
      setNewProdQty('');
      setNewProdBatch('');
      setNewProdExpiry('');
      setTimeout(() => setFormSuccess(false), 3000);
      return;
    }

    try {
      const payload = {
        name: newProdName,
        category: newProdCategory,
        sku: newProdSku,
        price: newProdPrice,
        cost: newProdCost,
        reorderPoint: newProdReorder,
        initialQty: newProdQty,
        batchNumber: newProdBatch,
        expiryDate: newProdExpiry
      };

      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Could not log new product.");
      }

      setFormSuccess(true);
      // Clear forms
      setNewProdName('');
      setNewProdSku('');
      setNewProdPrice('');
      setNewProdCost('');
      setNewProdQty('');
      setNewProdBatch('');
      setNewProdExpiry('');

      setTimeout(() => {
        setFormSuccess(false);
      }, 3000);

      await fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // API Call: Simulate a transactional cash sale
  const handleSimulateSale = async (e?: React.FormEvent, customProductId?: string, customQty?: number, customChannel?: string) => {
    if (e) e.preventDefault();
    if (currentRole === 'Staff') {
      alert(`🚫 Access Denied: Your active role is "${currentRole}". Staff members cannot execute cash register transactions directly. Please scan via vision scanner or log as Cashier/Manager.`);
      return;
    }
    
    const pId = customProductId || saleProductId;
    const qty = customQty || parseInt(saleQty);

    if (!pId || !qty || qty <= 0) {
      alert("Please specify a valid product and sold quantity.");
      return;
    }

    if (isOffline) {
      setSyncQueueCount(prev => prev + 1);
      // Perform instant local stock reduction so POS looks hyper-reactive
      setProducts(prev => prev.map(p => p.id === pId ? { ...p, stockLevel: Math.max(0, p.stockLevel - qty) } : p));
      alert(`💾 [Offline Buffer Mode] Sale recorded in local cache. It will be pushed to the ledger tables once online synchronization is active.`);
      setSaleSuccess(true);
      setTimeout(() => setSaleSuccess(false), 3000);
      return;
    }

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: pId,
          quantity: qty,
          channel: customChannel || "In-Store"
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Inventory sale transaction rejected.");
      }

      setSaleSuccess(true);
      setTimeout(() => {
        setSaleSuccess(false);
      }, 3000);

      await fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Dynamic Metrics Computations
  const getDashboardMetrics = () => {
    const totalSalesRev = salesLogs.reduce((sum, s) => sum + s.totalPrice, 0);
    const criticalStockouts = products.filter(p => p.stockLevel <= p.reorderPoint).length;
    
    // Find active expiring batches
    const activeExpirations = batches.filter(b => {
      if (b.currentQuantity <= 0) return false;
      const days = getDaysToExpiry(b.expiryDate);
      return days >= 0 && days <= 5;
    }).length;

    // wastage saved is sum of sold discounted items
    const wastagePrevented = salesLogs
      .filter(s => s.channel === 'Hyperlocal App' || s.totalPrice < (products.find(p=>p.id === s.productId)?.price || 0) * s.quantity)
      .reduce((sum, s) => sum + s.totalPrice, 0);

    const activeSKUs = products.length;

    return {
      totalSalesRev: Math.round(totalSalesRev),
      criticalStockouts,
      activeExpirations,
      wastagePrevented: Math.round(wastagePrevented),
      activeSKUs
    };
  };

  const metrics = getDashboardMetrics();
  const t = (en: string, hi: string, other?: string) => language === 'en' ? en : (language === 'hi' ? hi : (other || hi));

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white shadow-sm border border-slate-200 rounded-2xl border border-indigo-200 rounded-3xl p-6 shadow-2xl space-y-6 text-center backdrop-blur-md">
          <div className="space-y-2">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-200 rounded-2xl flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-sm font-semibold uppercase text-slate-900 tracking-widest">
              {(language === 'hi' ? "सुरक्षित टर्मिनल लॉक" : "StockSmart Terminal Lock")}
            </h2>
            <p className="text-[10px] text-slate-500/90 font-mono">
              {(language === 'hi' ? "प्रवेश करने के लिए 4-अंकीय पिन दर्ज करें (डिफ़ॉल्ट पिन: 1234)" : "Owner Authentication PIN required to view gross metrics. (Default: 1234)")}
            </p>
          </div>

          <div className="flex justify-center space-x-3.5 py-2">
            {[1, 2, 3, 4].map((dot, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full border transition ${
                  pin.length > i
                    ? 'bg-indigo-500 border-indigo-400 shadow-md shadow-indigo-500/30'
                    : 'bg-slate-50 border-slate-200/50'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto font-mono">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => {
                  if (pin.length < 4) {
                    const newPin = pin + num;
                    setPin(newPin);
                    if (newPin === '1234') {
                      setIsAuthenticated(true);
                      setPin('');
                    }
                  }
                }}
                className="py-3 bg-slate-50 hover:bg-white border border-slate-200/30 hover:border-slate-200/50 rounded-2xl text-xs font-semibold text-slate-800 transition active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setPin('')}
              className="py-3 bg-rose-50 hover:bg-rose-50 border border-rose-900/30 rounded-2xl text-[10px] font-semibold text-rose-600 uppercase tracking-widest transition"
            >
              Clear
            </button>
            <button
              onClick={() => {
                if (pin.length < 4) {
                  const newPin = pin + '0';
                  setPin(newPin);
                  if (newPin === '1234') {
                    setIsAuthenticated(true);
                    setPin('');
                  }
                }
              }}
              className="py-3 bg-slate-50 hover:bg-white border border-slate-200/30 rounded-2xl text-xs font-semibold text-slate-800 transition"
            >
              0
            </button>
            <button
              onClick={() => {
                setIsAuthenticated(true);
                setPin('');
              }}
              className="py-3 bg-emerald-50 hover:bg-emerald-50 border border-emerald-900/30 rounded-2xl text-[10px] font-semibold text-emerald-600 uppercase tracking-widest transition"
            >
              Bypass
            </button>
          </div>

          <div className="text-[9.5px] font-mono text-slate-500/90 border-t border-slate-200/30 pt-4 flex justify-between items-center">
            <span>Role Check: {currentRole}</span>
            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent text-[10px] font-extrabold text-indigo-600 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans transition-all duration-300 ${fontScale ? 'text-lg' : 'text-sm'}`}>
      
      {/* Dynamic Master Header */}
      <header className="border-b border-slate-200/30 bg-slate-50/60 backdrop-blur-md sticky top-0 z-50 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand Pairings */}
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-200 rounded-2xl">
              <Package className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[9px] uppercase tracking-widest font-mono text-slate-500/90 font-medium">Bharat Retail OS</span>
                <span className="h-1 w-1 bg-indigo-500 rounded-full"></span>
                <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-600 px-1.5 py-0.2 rounded font-semibold uppercase">v2.1</span>
              </div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center">
                StockSmart AI
                <span className="ml-2 px-2 py-0.5 text-[9px] font-mono text-emerald-600 bg-emerald-500/10 border border-emerald-200 rounded-xl">
                  {STORE_INFO.name}
                </span>
              </h1>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center bg-white shadow-sm border border-slate-200 rounded-2xl p-1 border border-slate-200/30 rounded-2xl">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-2xl transition ${activeTab === 'dashboard' ? 'bg-indigo-600 text-slate-900 shadow-lg shadow-indigo-500/15' : 'text-slate-500/90 hover:text-slate-900'}`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{t("SaaS Desk", "🏪 दुकान डैशबोर्ड")}</span>
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-2xl transition ${activeTab === 'marketplace' ? 'bg-indigo-600 text-slate-900 shadow-lg shadow-indigo-500/15' : 'text-slate-500/90 hover:text-slate-900'}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{t("Hyperlocal App", "🛍️ ग्राहक मार्केट")}</span>
            </button>
            <button
              onClick={() => setActiveTab('assistant')}
              className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-2xl transition ${activeTab === 'assistant' ? 'bg-indigo-600 text-slate-900 shadow-lg shadow-indigo-500/15' : 'text-slate-500/90 hover:text-slate-900'}`}
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-400" />
              <span>{t("Retail Assistant", "🤖 AI मददगार")}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Accessibility & Offline Simulation Strip */}
      <div className="bg-slate-50 border-b border-slate-200/30 py-3.5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Role Badge */}
            <div className="flex items-center space-x-1.5 bg-indigo-500/10 border border-indigo-200 rounded-2xl px-2.5 py-1 text-slate-700 text-xs">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Staff Mode: <b className="text-slate-900 font-extrabold">{currentRole}</b></span>
            </div>

            {/* Simulated Offline Mode indicator */}
            <button 
              onClick={() => {
                setIsOffline(!isOffline);
                if (!isOffline) {
                  alert("Offline Buffer Simulator Activated! Real-time API sync is suspended. All transactional mutations will buffer locally.");
                } else {
                  alert("Online state re-established. Sync queues ready to push.");
                }
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-2xl text-xs border transition ${isOffline ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500/90 border-slate-200/50'}`}
            >
              {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> : <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{isOffline ? `Offline Mode (Buffered: ${syncQueueCount})` : "Online Status (Synced)"}</span>
            </button>

            {/* Sync Queue trigger */}
            {isOffline && (
              <button 
                onClick={() => {
                  setIsLoading(true);
                  setTimeout(() => {
                    setIsLoading(false);
                    setSyncQueueCount(0);
                    alert("Synced offline transaction state buffers to active database collections successfully!");
                  }, 1200);
                }}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-slate-900 font-extrabold text-[9.5px] rounded-xl shadow-md hover:shadow-indigo-500/20"
              >
                Push Sync Queue
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3.5">
            {/* Bilingual Mode Toggle */}
            <div className="flex items-center space-x-1.5 px-2 py-1 bg-slate-50 border border-slate-200/50 rounded-2xl">
              <span className="text-[10px] text-slate-500/90 font-mono">🌐</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-indigo-600 focus:outline-none appearance-none pr-1"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>

            {/* Lock Terminal Button */}
            <button 
              onClick={() => {
                setIsAuthenticated(false);
                MobileBridge.showToast("Terminal Locked", "short");
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-500/25 transition text-xs font-medium"
              title="Lock cash register terminal"
            >
              <span>🔒 Lock</span>
            </button>

            {/* Accessibility: Font Scale toggles */}
            <button 
              onClick={() => setFontScale(!fontScale)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-2xl border transition text-xs ${fontScale ? 'bg-indigo-600 text-slate-900 border-indigo-500' : 'bg-slate-50 border-slate-200/50 hover:border-slate-300'}`}
            >
              <FontIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t("Large Fonts", "बड़े अक्षर")}</span>
            </button>

            {/* Accessibility: One-handed mode toggle */}
            <button 
              onClick={() => setOneHandedMode(!oneHandedMode)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-2xl border transition text-xs ${oneHandedMode ? 'bg-indigo-600 text-slate-900 border-indigo-500 shadow-md' : 'bg-slate-50 border-slate-200/50 hover:border-slate-300'}`}
            >
              <span>{t("One-Handed Layout", "एक हाथ की स्क्रीन")}</span>
            </button>

            {/* Trust Badge Display */}
            <div className="hidden sm:flex items-center space-x-1">
              <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200 text-[9.5px] font-medium">Fresh Product Badge</span>
              <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-200 text-[9.5px] font-medium">Fast Delivery Badge</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto p-6 space-y-6 ${oneHandedMode ? 'max-w-4xl border-x border-slate-200/30 shadow-2xl bg-slate-50/20' : ''}`}>
        {isOffline && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center justify-between shadow-lg shadow-amber-500/5 animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-2xl">
                <WifiOff className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-amber-600">You are operating in Offline Mode</h3>
                <p className="text-xs text-amber-600/80 font-mono mt-0.5">{syncQueueCount} transaction(s) pending sync to cloud ledger.</p>
              </div>
            </div>
            {syncQueueCount > 0 && (
              <button 
                onClick={() => {
                  setIsOffline(false);
                  setIsLoading(true);
                  setTimeout(() => {
                    setIsLoading(false);
                    setSyncQueueCount(0);
                    alert("All offline buffered logs have been pushed to PostgreSQL master ledger.");
                  }, 1500);
                }}
                className="px-4 py-2 bg-amber-100 hover:bg-amber-500/30 text-amber-600 border border-amber-200 rounded-2xl text-xs font-medium transition-all flex items-center space-x-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sync Now</span>
              </button>
            )}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 flex items-center space-x-3 text-red-300 text-xs">
            <AlertOctagon className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span className="font-mono">{errorMessage}</span>
          </div>
        )}

        {/* Tab A: Store Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center gap-3 animate-fade-in">
              <button 
                onClick={() => setShowScanner(true)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all font-semibold uppercase tracking-widest text-[10px]"
              >
                <ScanBarcode className="w-4 h-4" />
                <span>Scan QR / Barcode</span>
              </button>
            </div>

            {/* AI Morning Briefing & Regional TTS Assistant */}
            <React.Suspense fallback={<LoadingSkeleton />}>
              <AIMorningBriefing onRefreshTrigger={fetchAllData} />
            </React.Suspense>

            {/* Simplified POS Quick Action Checklist (Answering exact operational guidance) */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-200/30/80 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/30">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <h3 className="text-xs font-semibold uppercase text-slate-900 tracking-widest">Active Operations Guidance</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500/90 bg-slate-50 px-2.5 py-1 rounded-2xl border border-slate-200/30">
                  3 Real-time Actions
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Notification Card 1 */}
                <div className="p-6 bg-slate-50 border border-slate-200/30 rounded-2xl flex flex-col justify-between hover:border-slate-200/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] uppercase font-mono bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-200 font-semibold">
                        SKU stockout alert
                      </span>
                      <span className="text-[9.5px] font-mono text-slate-500/90">Urgent</span>
                    </div>
                    <p className="text-[12px] font-semibold text-slate-900 mt-1.5">Draft Restock for Aashirvaad Atta</p>
                    <p className="text-[10px] text-slate-500/90">Current stock is only {products.find(p => p.name.includes("Atta"))?.stockLevel || 4} units, falling below critical safety threshold.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setDashboardSection('inventory');
                      alert("Restock proposal opened! Scroll down to ONDC automated replenishment sheet.");
                    }}
                    className="mt-3 w-full py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-slate-900 border border-rose-200 text-[10.5px] font-semibold uppercase rounded-2xl transition"
                  >
                    Generate Smart Restock PO
                  </button>
                </div>

                {/* Notification Card 2 */}
                <div className="p-6 bg-slate-50 border border-slate-200/30 rounded-2xl flex flex-col justify-between hover:border-slate-200/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] uppercase font-mono bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                        BATCH EXPIRY NUDGE
                      </span>
                      <span className="text-[9.5px] font-mono text-slate-500/90">2 Days Left</span>
                    </div>
                    <p className="text-[12px] font-semibold text-slate-900 mt-1.5">Discount Mother Dairy Paneer</p>
                    <p className="text-[10px] text-slate-500/90">Batch is expiring. Apply 25% automatic discount on the local consumer marketplace to clear stock.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveTab('marketplace');
                    }}
                    className="mt-3 w-full py-2 bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-slate-900 border border-amber-200 text-[10.5px] font-semibold uppercase rounded-2xl transition"
                  >
                    Promote on Local App
                  </button>
                </div>

                {/* Notification Card 3 */}
                <div className="p-6 bg-slate-50 border border-slate-200/30 rounded-2xl flex flex-col justify-between hover:border-slate-200/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] uppercase font-mono bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                        digital ledger due
                      </span>
                      <span className="text-[9.5px] font-mono text-slate-500/90">Repayment</span>
                    </div>
                    <p className="text-[12px] font-semibold text-slate-900 mt-1.5">Outstanding Credit: Amit Patel</p>
                    <p className="text-[10px] text-slate-500/90">Ledger balance ₹3,100 overdue. Dispatch simulated WhatsApp payment nudge.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setDashboardSection('khata');
                    }}
                    className="mt-3 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-slate-900 border border-emerald-200 text-[10.5px] font-semibold uppercase rounded-2xl transition"
                  >
                    Open Credit ledger Book
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Metrics Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Sales Metric */}
              <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500/90">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Gross Revenue</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2.5">
                  <h3 className="text-xl font-semibold text-slate-900">₹{metrics.totalSalesRev}</h3>
                  <p className="text-[9px] font-mono text-emerald-600 flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    +14.5% vs last week
                  </p>
                </div>
              </div>

              {/* Critical Stockout Alerts */}
              <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500/90">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Critical Stockouts</span>
                  <AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />
                </div>
                <div className="mt-2.5">
                  <h3 className={`text-xl font-semibold ${metrics.criticalStockouts > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {metrics.criticalStockouts} SKUs
                  </h3>
                  <p className="text-[9px] font-mono text-slate-500/90 mt-1">
                    Below safety reorder trigger
                  </p>
                </div>
              </div>

              {/* Expiry Warning count */}
              <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500/90">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Near Expiry Warns</span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2.5">
                  <h3 className={`text-xl font-semibold ${metrics.activeExpirations > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {metrics.activeExpirations} Batches
                  </h3>
                  <p className="text-[9px] font-mono text-slate-500/90 mt-1">
                    Expiring in less than 5 days
                  </p>
                </div>
              </div>

              {/* Wastage Prevented */}
              <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500/90">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Waste Recaptured</span>
                  <Tag className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-2.5">
                  <h3 className="text-xl font-semibold text-indigo-600">₹{metrics.wastagePrevented}</h3>
                  <p className="text-[9px] font-mono text-emerald-600 mt-1">
                    Saved via Dynamic Discounts
                  </p>
                </div>
              </div>

              {/* Business Health Score */}
              <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 flex flex-col justify-between cursor-pointer hover:border-slate-200/50 transition" onClick={() => alert("Business Score: 84%\n\n• Stock Turnover Rate: 88% (Excellent)\n• Waste Avoidance: 91% (Optimal)\n• Customer Credit Book Health: 79% (Nudges needed)\n• Customer Loyalty Multiplier: 82%")}>
                <div className="flex items-center justify-between text-slate-500/90">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Business Health Score</span>
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <div className="mt-2.5">
                  <h3 className="text-xl font-semibold text-slate-900">84%</h3>
                  <p className="text-[9px] font-mono text-slate-500/90 mt-1">
                    Click to view metric audit
                  </p>
                </div>
              </div>
            </div>

            {/* Inner Dashboard Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/30 pb-3">
              <button
                onClick={() => setDashboardSection('inventory')}
                className={`px-4 py-2.5 text-xs font-semibold uppercase rounded-2xl border transition-all tracking-wider ${dashboardSection === 'inventory' ? 'bg-indigo-600 text-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/15' : 'bg-slate-50/80 text-slate-500/90 border-slate-200/30 hover:text-slate-900'}`}
              >
                {t("📦 SKU Catalog & Restocking", "📦 सामान सूची और स्टॉक")}
              </button>
              <button
                onClick={() => setDashboardSection('khata')}
                className={`px-4 py-2.5 text-xs font-semibold uppercase rounded-2xl border transition-all tracking-wider ${dashboardSection === 'khata' ? 'bg-indigo-600 text-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/15' : 'bg-slate-50/80 text-slate-500/90 border-slate-200/30 hover:text-slate-900'}`}
              >
                {t("📒 Digital Khata Ledger & Loyalty", "📒 उधार खाता बही")}
              </button>
              <button
                onClick={() => setDashboardSection('rbac')}
                className={`px-4 py-2.5 text-xs font-semibold uppercase rounded-2xl border transition-all tracking-wider ${dashboardSection === 'rbac' ? 'bg-indigo-600 text-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/15' : 'bg-slate-50/80 text-slate-500/90 border-slate-200/30 hover:text-slate-900'}`}
              >
                {t("👥 Family Account Roles & Staff", "👥 स्टाफ और परिवार")}
              </button>
              <button
                onClick={() => setDashboardSection('reports')}
                className={`px-4 py-2.5 text-xs font-semibold uppercase rounded-2xl border transition-all tracking-wider ${dashboardSection === 'reports' ? 'bg-indigo-600 text-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/15' : 'bg-slate-50/80 text-slate-500/90 border-slate-200/30 hover:text-slate-900'}`}
              >
                {t("📊 Business Reports & Tax", "📊 दुकान की रिपोर्ट")}
              </button>
              <button
                onClick={() => setDashboardSection('settings')}
                className={`px-4 py-2.5 text-xs font-semibold uppercase rounded-2xl border transition-all tracking-wider ${dashboardSection === 'settings' ? 'bg-indigo-600 text-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/15' : 'bg-slate-50/80 text-slate-500/90 border-slate-200/30 hover:text-slate-900'}`}
              >
                {t("⚙️ Store Settings & Admin", "⚙️ सेटिंग्स और टैक्स")}
              </button>
              <button
                onClick={() => setDashboardSection('suppliers')}
                className={`px-4 py-2.5 text-xs font-semibold uppercase rounded-2xl border transition-all tracking-wider ${dashboardSection === 'suppliers' ? 'bg-indigo-600 text-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/15' : 'bg-slate-50/80 text-slate-500/90 border-slate-200/30 hover:text-slate-900'}`}
              >
                {t("🚚 Suppliers & Vendors", "🚚 सप्लायर्स")}
              </button>
            </div>


            {/* Sub-tab: Suppliers */}
            {dashboardSection === 'suppliers' && (
              <SupplierManagement />
            )}

            {/* Sub-tab 1: SKUs, Scanners, & ONDC PO Builders */}
            {dashboardSection === 'inventory' && (
              <div className="space-y-6">
                {/* Advanced Hardware Simulators: shelf vision, receipt OCR & multilingual regional voice search */}
                <React.Suspense fallback={<LoadingSkeleton />}>
                  <HardwareSimulators 
                    allProducts={allOriginalProducts}
                    onProductsFiltered={(filtered) => setProducts(filtered)}
                    onScanSuccess={(item) => {
                      setProducts(prev => [item, ...prev]);
                      setAllOriginalProducts(prev => [item, ...prev]);
                    }}
                  />
                </React.Suspense>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Product Table & Inventory Add (Span 7) */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Inventory Table Card */}
                    <div className="glass-card p-6 rounded-3xl border border-slate-200/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Active Inventory Catalogue</h3>
                          <p className="text-[9px] font-mono text-slate-500/90">Dual-channel stock reconciliation & GST taxation ledger</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={downloadCSV} 
                            className="flex items-center space-x-1.5 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                          </button>
                          <span className="text-[9px] uppercase font-mono bg-slate-50 text-slate-500/90 px-2 py-0.5 rounded font-medium border border-slate-200/30">
                            {currentRole} Access
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        
                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3 mt-4">
                          {isLoading ? (
                            <div className="text-center py-6 text-slate-500/90 text-[10.5px] font-mono">Synthesizing catalog indexes...</div>
                          ) : products.length === 0 ? (
                            <div className="text-center py-6 text-slate-500/90 text-[10.5px] font-mono">No products found matching active filter. Try resetting search above.</div>
                          ) : (
                            products.map((p) => {
                              const isLow = p.stockLevel <= p.reorderPoint;
                              return (
                                <div key={p.id} className={`p-3 rounded-2xl border ${isLow ? 'bg-rose-50 border-rose-200' : 'bg-white shadow-sm border border-slate-200 rounded-2xl border-slate-200/50'}`}>
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <div className="font-medium text-slate-800 text-xs">{p.name}</div>
                                      <div className="text-[10px] text-slate-500/90 font-mono mt-0.5">{p.sku} &bull; {p.category}</div>
                                    </div>
                                    {isLow && <span className="text-[9px] uppercase font-mono bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-semibold">LOW</span>}
                                  </div>
                                  <div className="flex justify-between items-end mt-3 text-[11px] font-mono">
                                    <div>
                                      <div className="text-slate-500/90">Cost: ₹{p.cost}</div>
                                      <div className="text-slate-900 font-medium">MRP: ₹{p.price}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-slate-500/90">Min: {p.reorderPoint}</div>
                                      <div className={`font-semibold text-lg ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>{p.stockLevel}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <table className="hidden md:table w-full text-left border-collapse font-mono text-[10.5px]">
                          <thead>
                            <tr className="border-b border-slate-200/30 text-slate-500/90 text-[9px] uppercase font-medium">
                              <th className="py-2.5 pr-2">SKU</th>
                              <th className="py-2.5">Product Name</th>
                              <th className="py-2.5">Category</th>
                              <th className="py-2.5 text-right">M.R.P</th>
                              <th className="py-2.5 text-right">Cost</th>
                              <th className="py-2.5 text-right">In Stock</th>
                              <th className="py-2.5 text-right">Threshold</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/50 text-slate-700">
                            {isLoading ? (
                              <tr>
                                <td colSpan={7} className="text-center py-6 text-slate-500/90">
                                  Synthesizing catalog indexes...
                                </td>
                              </tr>
                            ) : products.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center py-6 text-slate-500/90">
                                  No products found matching active filter. Try resetting search above.
                                </td>
                              </tr>
                            ) : (
                              products.map((p) => {
                                const isLow = p.stockLevel <= p.reorderPoint;
                                return (
                                  <tr key={p.id} className={`hover:bg-white/20 transition-all ${isLow ? 'bg-rose-500/5' : ''}`}>
                                    <td className="py-2.5 pr-2 font-semibold text-slate-500/90 text-[10px]">{p.sku}</td>
                                    <td className="py-2.5 font-sans font-medium text-slate-800">
                                      {p.name}
                                      {isLow && <span className="ml-1.5 text-[8.5px] uppercase font-mono bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-semibold">LOW</span>}
                                    </td>
                                    <td className="py-2.5 text-slate-500/90">{p.category}</td>
                                    <td className="py-2.5 text-right font-medium text-slate-900">₹{p.price}</td>
                                    <td className="py-2.5 text-right text-slate-500/90">₹{p.cost}</td>
                                    <td className={`py-2.5 text-right font-extrabold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                                      {p.stockLevel}
                                    </td>
                                    <td className="py-2.5 text-right text-slate-500/90 font-medium">{p.reorderPoint}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Grid of Forms: Add Product + Simulate Sale */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Form 1: Add Product */}
                      <div className="glass-card p-6 rounded-3xl border border-slate-200/30 space-y-4">
                        <div className="flex items-center space-x-2 border-b border-slate-200/30 pb-2">
                          <Plus className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider">Register New SKU Item</h4>
                        </div>

                        {(currentRole !== 'Owner' && currentRole !== 'Manager') ? (
                          <div className="bg-indigo-500/5 border border-indigo-200 rounded-2xl p-6 text-[10.5px] text-slate-500/90 font-mono text-center">
                            🔒 Access Locked: Role <b>{currentRole}</b> is not authorized to register catalog products. Swap to Owner/Manager roles in the Staff tab to unlock.
                          </div>
                        ) : (
                          <form onSubmit={handleAddProduct} className="space-y-3">
                            <div>
                              <label className="text-[9px] uppercase font-mono text-slate-500/90">Product Name *</label>
                              <input
                                type="text"
                                required
                                value={newProdName}
                                onChange={(e) => setNewProdName(e.target.value)}
                                placeholder="e.g., Amul Fresh Butter 500g"
                                className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] uppercase font-mono text-slate-500/90">Category</label>
                                <select
                                  value={newProdCategory}
                                  onChange={(e) => setNewProdCategory(e.target.value as any)}
                                  className="w-full mt-1 px-2 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="Dairy">Dairy</option>
                                  <option value="Bakery">Bakery</option>
                                  <option value="Staples">Staples</option>
                                  <option value="Grocery">Grocery</option>
                                  <option value="Pharmacy">Pharmacy</option>
                                  <option value="Fruits & Vegetables">Fruits & Veg</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-mono text-slate-500/90">SKU Code *</label>
                                <input
                                  type="text"
                                  required
                                  value={newProdSku}
                                  onChange={(e) => setNewProdSku(e.target.value)}
                                  placeholder="e.g., BUTTER-500"
                                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[9px] uppercase font-mono text-slate-500/90">MRP (₹) *</label>
                                <input
                                  type="number"
                                  required
                                  value={newProdPrice}
                                  onChange={(e) => setNewProdPrice(e.target.value)}
                                  placeholder="M.R.P"
                                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-mono text-slate-500/90">Cost (₹) *</label>
                                <input
                                  type="number"
                                  required
                                  value={newProdCost}
                                  onChange={(e) => setNewProdCost(e.target.value)}
                                  placeholder="Cost"
                                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-mono text-slate-500/90">Safety Min</label>
                                <input
                                  type="number"
                                  value={newProdReorder}
                                  onChange={(e) => setNewProdReorder(e.target.value)}
                                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="border-t border-slate-200/30 pt-2.5 space-y-2">
                              <span className="text-[8.5px] font-mono text-slate-500/90 uppercase tracking-widest font-semibold block">
                                Perishable Expiry Tracking (Optional)
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[8px] uppercase font-mono text-slate-400">Batch No</label>
                                  <input
                                    type="text"
                                    value={newProdBatch}
                                    onChange={(e) => setNewProdBatch(e.target.value)}
                                    placeholder="B-01"
                                    className="w-full mt-1 px-2 py-1 bg-slate-50 border border-slate-200/30 rounded-xl text-[10px] font-mono text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase font-mono text-slate-400">Qty</label>
                                  <input
                                    type="number"
                                    value={newProdQty}
                                    onChange={(e) => setNewProdQty(e.target.value)}
                                    placeholder="10"
                                    className="w-full mt-1 px-2 py-1 bg-slate-50 border border-slate-200/30 rounded-xl text-[10px] font-mono text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase font-mono text-slate-400">Expiry Date</label>
                                  <input
                                    type="date"
                                    value={newProdExpiry}
                                    onChange={(e) => setNewProdExpiry(e.target.value)}
                                    className="w-full mt-1 px-1.5 py-1 bg-slate-50 border border-slate-200/30 rounded-xl text-[10px] font-mono text-slate-800"
                                  />
                                </div>
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[11px] font-semibold uppercase text-slate-900 tracking-wider flex items-center justify-center space-x-1.5 transition"
                            >
                              {formSuccess ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-slate-900" />
                                  <span>Item Registered Successfully!</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 text-slate-900" />
                                  <span>Save Item to Catalog</span>
                                </>
                              )}
                            </button>
                          </form>
                        )}
                      </div>

                      {/* Form 2: Log Cash Register Sale */}
                      <div className="glass-card p-6 rounded-3xl border border-slate-200/30 space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 border-b border-slate-200/30 pb-2">
                            <ShoppingBag className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider">Record Counter Sale</h4>
                          </div>

                          {currentRole === 'Staff' ? (
                            <div className="bg-indigo-500/5 border border-indigo-200 rounded-2xl p-6 text-[10.5px] text-slate-500/90 font-mono text-center">
                              🔒 Access Locked: Role <b>{currentRole}</b> is blocked from logging POS cash register transactions. Use owner/manager identity to sell.
                            </div>
                          ) : (
                            <form onSubmit={handleSimulateSale} className="space-y-3">
                              <div>
                                <label className="text-[9px] uppercase font-mono text-slate-500/90">Select Sold Product</label>
                                <select
                                  value={saleProductId}
                                  onChange={(e) => setSaleProductId(e.target.value)}
                                  className="w-full mt-1 px-2 py-2 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="">-- Choose Product --</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id} disabled={p.stockLevel <= 0}>
                                      {p.name} ({p.stockLevel} in stock) - ₹{p.price}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[9px] uppercase font-mono text-slate-500/90">Units Sold</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={saleQty}
                                  onChange={(e) => setSaleQty(e.target.value)}
                                  placeholder="1"
                                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[10.5px] font-mono text-slate-800 focus:outline-none"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={!saleProductId}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-900 rounded-2xl text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition"
                              >
                                {saleSuccess ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-slate-900" />
                                    <span>Sale Recorded & Stock Deducted!</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-slate-900" />
                                    <span>Register Cash Transaction</span>
                                  </>
                                )}
                              </button>
                            </form>
                          )}
                        </div>

                        {/* Operational Tip */}
                        <div className="bg-indigo-500/5 border border-indigo-200 rounded-2xl p-3.5 text-[10px] text-slate-500/90 font-sans leading-relaxed mt-2">
                          <span className="font-medium text-indigo-600 uppercase tracking-widest block mb-0.5">FEFO Order Management:</span>
                          Sales automatically consume units from batches expiring first, ensuring inventory shelf efficiency without manual intervention.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Smart B2B PO Restock Sheet, Expiries & Demand (Span 5) */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Automated Smart B2B Purchase Order restocker */}
                    <React.Suspense fallback={<LoadingSkeleton />}>
                      <SmartReorderPO onReorderSuccess={fetchAllData} />
                    </React.Suspense>

                    {/* Expiry Tracking & Dynamic Pricing Panel */}
                    <div className="glass-card p-6 rounded-3xl border border-slate-200/30 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-200/30 pb-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 animate-bounce" />
                          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Perishable Shelf Expiry Ledger</h4>
                        </div>
                        <span className="text-[8px] uppercase font-mono bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                          AI Dynamic Pricing
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500/90 leading-relaxed font-sans">
                        The platform auto-calculates dynamic discounts based on remaining shelf life. Expiring items can be listed on the hyperlocal marketplace to clear stock.
                      </p>

                      <div className="space-y-3 overflow-y-auto max-h-[280px]">
                        {isLoading ? (
                          <p className="text-center py-4 text-slate-500/90 font-mono text-[10px]">Loading batches...</p>
                        ) : batches.filter(b => b.currentQuantity > 0).length === 0 ? (
                          <p className="text-center py-4 text-slate-500/90 font-mono text-[10px]">No active inventory batches found.</p>
                        ) : (
                          batches
                            .filter(b => b.currentQuantity > 0)
                            .sort((a,b) => getDaysToExpiry(a.expiryDate) - getDaysToExpiry(b.expiryDate))
                            .map((b) => {
                              const daysLeft = getDaysToExpiry(b.expiryDate);
                              const hasDiscount = b.discountRate > 0;
                              
                              let expLabelColor = "text-slate-500/90 bg-slate-50/80 border-slate-200/30";
                              if (daysLeft <= 1) expLabelColor = "text-rose-600 bg-rose-50 border-rose-200 animate-pulse font-semibold";
                              else if (daysLeft <= 4) expLabelColor = "text-amber-600 bg-amber-50 border-amber-200 font-medium";

                              return (
                                <div key={b.id} className="p-3 bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 hover:border-slate-200/50 rounded-2xl flex items-center justify-between transition">
                                  <div className="space-y-1">
                                    <h5 className="text-[11.5px] font-sans font-semibold text-slate-900">{b.productName}</h5>
                                    <div className="flex items-center space-x-1.5 font-mono text-[9px] text-slate-500/90">
                                      <span>Batch: <b className="text-slate-500/90">{b.batchNumber}</b></span>
                                      <span>•</span>
                                      <span>Stock: <b className="text-slate-700">{b.currentQuantity} units</b></span>
                                    </div>
                                    <div className="flex items-center space-x-1.5 pt-1">
                                      <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border ${expLabelColor}`}>
                                        {daysLeft <= 0 ? "Expired" : daysLeft === 1 ? "Expires Tomorrow!" : `${daysLeft} days remaining`}
                                      </span>
                                      {hasDiscount && (
                                        <span className="text-[8.5px] font-mono text-emerald-600 bg-emerald-500/10 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                                          AI DISC {Math.round(b.discountRate * 100)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Price Indicator */}
                                  <div className="text-right">
                                    {hasDiscount ? (
                                      <>
                                        <p className="text-xs font-semibold text-rose-600">₹{b.discountedPrice}</p>
                                        <p className="text-[9px] text-slate-500/90 line-through">₹{b.originalPrice}</p>
                                      </>
                                    ) : (
                                      <p className="text-xs font-semibold text-slate-800">₹{b.originalPrice}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>

                    {/* Demand Forecasting & Restock Suggestions Panel */}
                    <div className="glass-card p-6 rounded-3xl border border-slate-200/30 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-200/30 pb-2">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">AI Demand Forecast Suggestions</h4>
                        </div>
                        <span className="text-[8px] uppercase font-mono bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded font-semibold border border-indigo-200">
                          5-Model Weighted
                        </span>
                      </div>

                      <div className="space-y-3">
                        {forecasts.map((f) => {
                          const isCritical = f.reorderUrgency === 'Critical';
                          let urgencyBadge = "text-slate-500/90 bg-white shadow-sm border border-slate-200 rounded-2xl";
                          if (isCritical) urgencyBadge = "bg-rose-50 text-rose-600 border border-rose-200 font-semibold animate-pulse";
                          else if (f.reorderUrgency === 'Medium') urgencyBadge = "bg-amber-50 text-amber-600 border border-amber-200";
                          else if (f.reorderUrgency === 'Optimized') urgencyBadge = "bg-emerald-500/10 text-emerald-600 border border-emerald-200";

                          return (
                            <div key={f.productId} className="p-3 bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-2xl flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-[11px] font-medium text-slate-800">{f.productName}</h5>
                                  <span className={`text-[8px] uppercase font-mono px-1.5 py-0.5 rounded ${urgencyBadge}`}>
                                    {f.reorderUrgency}
                                  </span>
                                </div>
                                <p className="text-[9.5px] text-slate-500/90 leading-relaxed font-sans">{f.insight}</p>
                                <div className="flex items-center space-x-3 pt-1.5 text-[8.5px] font-mono text-slate-500/90">
                                  <span>Forecasted Demand (7d): <b className="text-slate-700">{f.predictedDemandNext7d} units</b></span>
                                  <span>•</span>
                                  <span>Confidence: <b className="text-indigo-600 font-extrabold">{f.confidenceScore}%</b></span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Digital Khata Book & Loyalty Program */}
            {dashboardSection === 'khata' && (
              <React.Suspense fallback={<LoadingSkeleton />}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                  <DigitalKhata onStateChange={fetchAllData} />
                  <LoyaltyManager />
                </div>
              </React.Suspense>
            )}

            {/* Sub-tab 3: Staff & RBAC console */}
            {dashboardSection === 'rbac' && (
              <React.Suspense fallback={<LoadingSkeleton />}>
                <div className="space-y-6 animate-fade-in">
                  <AccessControlFamily currentRole={currentRole} onRoleChange={(role) => setCurrentRole(role)} />
                </div>
              </React.Suspense>
            )}

            {/* Sub-tab 4: Business Reports & Tax Ledger */}
            {dashboardSection === 'reports' && (
              <div className="glass-card p-6 rounded-3xl border border-slate-200/30 space-y-6 animate-fade-in bg-white shadow-sm border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/30 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                      {t("📊 Business Performance & GST Reports", "📊 दुकान वित्तीय रिपोर्ट और टैक्स")}
                    </h3>
                    <p className="text-[10px] text-slate-500/90 font-mono">
                      {t("Annual financial audits & state-wise GST reconciliations", "वार्षिक वित्तीय लेखा परीक्षा और राज्य-वार जीएसटी")}
                    </p>
                  </div>
                  <span className="text-[9.5px] uppercase font-mono bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-2xl font-semibold border border-emerald-200">
                    {t("Tax Compliant", "टैक्स रेडी")}
                  </span>
                </div>

                {/* Micro metrics cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-6 border border-slate-200/30 rounded-2xl">
                    <span className="text-[9px] uppercase font-mono text-slate-500/90 block mb-1">
                      {t("Average Transaction", "औसत बिल राशि")}
                    </span>
                    <span className="text-base font-semibold text-slate-900">₹385</span>
                    <span className="text-[8.5px] font-mono text-emerald-600 block mt-1">+6% vs last month</span>
                  </div>
                  <div className="bg-slate-50 p-6 border border-slate-200/30 rounded-2xl">
                    <span className="text-[9px] uppercase font-mono text-slate-500/90 block mb-1">
                      {t("Khata Recovery Rate", "उधार वसूली दर")}
                    </span>
                    <span className="text-base font-semibold text-slate-900">92.4%</span>
                    <span className="text-[8.5px] font-mono text-emerald-600 block mt-1">+3% after WhatsApp Nudges</span>
                  </div>
                  <div className="bg-slate-50 p-6 border border-slate-200/30 rounded-2xl">
                    <span className="text-[9px] uppercase font-mono text-slate-500/90 block mb-1">
                      {t("Estimated GST Liability", "कुल संचित कर (GST)")}
                    </span>
                    <span className="text-base font-semibold text-indigo-600">₹{Math.round(metrics.totalSalesRev * 0.05)}</span>
                    <span className="text-[8.5px] font-mono text-slate-500/90 block mt-1">Calculated at blended 5% rate</span>
                  </div>
                  <div className="bg-slate-50 p-6 border border-slate-200/30 rounded-2xl">
                    <span className="text-[9px] uppercase font-mono text-slate-500/90 block mb-1">
                      {t("Stock Turnover Speed", "बिक्री टर्नओवर दर")}
                    </span>
                    <span className="text-base font-semibold text-slate-900">18.2 Days</span>
                    <span className="text-[8.5px] font-mono text-emerald-600 block mt-1">Fastest in Dairy category</span>
                  </div>
                </div>

                {/* Category contributions */}
                <div className="p-6 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-3">
                  <h4 className="text-[11px] font-semibold uppercase text-indigo-600 tracking-wider">
                    {t("📈 Category Sales Breakdown", "📈 श्रेणी-वार बिक्री योगदान")}
                  </h4>
                  <div className="space-y-3">
                    {[
                      { name: t("Dairy (Milk, Butter, Paneer)", "Dairy (दूध-दही-पनीर)"), sales: "45%", color: "bg-indigo-500" },
                      { name: t("Staples (Atta, Rice, Pulses)", "Staples (दाल-चावल-आटा)"), sales: "30%", color: "bg-emerald-500" },
                      { name: t("Bakery (Toast, Bread, Buns)", "Bakery (ब्रेड-टोस्ट)"), sales: "15%", color: "bg-amber-500" },
                      { name: t("Grocery & Misc Items", "Grocery & अन्य सामान"), sales: "10%", color: "bg-rose-500" }
                    ].map((cat, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-slate-700 font-mono">
                          <span>{cat.name}</span>
                          <span className="font-medium">{cat.sales}</span>
                        </div>
                        <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden border border-slate-200/30/50">
                          <div className={`h-full ${cat.color}`} style={{ width: cat.sales }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 5: Store Settings & Admin Console */}
            {dashboardSection === 'settings' && (
              <div className="glass-card p-6 rounded-3xl border border-slate-200/30 space-y-6 animate-fade-in bg-white shadow-sm border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/30 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                      {t("⚙️ Store Settings & Admin Console", "⚙️ दुकान व्यवस्थापक सेटिंग्स")}
                    </h3>
                    <p className="text-[10px] text-slate-500/90 font-mono">
                      {t("Customize store parameters, taxes & peripherals", "दुकान की सेटिंग्स, टैक्स रेट और प्रिंटर चुनें")}
                    </p>
                  </div>
                  <span className="text-[9.5px] uppercase font-mono bg-indigo-500/10 text-indigo-600 px-2.5 py-1 rounded-2xl font-semibold border border-indigo-200">
                    {currentRole} Mode
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* General parameters */}
                  <div className="p-6 bg-slate-50/60 border border-slate-200/30 rounded-2xl space-y-4">
                    <h4 className="text-[11px] font-semibold uppercase text-indigo-600 tracking-wider">
                      {t("Store Parameters", "दुकान की जानकारी")}
                    </h4>
                    <div className="space-y-3 font-mono text-xs">
                      <div>
                        <label className="text-[9px] uppercase text-slate-500/90">Store Name</label>
                        <input
                          type="text"
                          defaultValue={STORE_INFO.name}
                          className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] uppercase text-slate-500/90">GSTIN Number</label>
                          <input
                            type="text"
                            defaultValue="06ABCKP1234F1Z9"
                            className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-slate-500/90">Store Contact</label>
                          <input
                            type="text"
                            defaultValue={STORE_INFO.phone}
                            className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => alert("Settings saved locally!")}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[10px] font-semibold uppercase text-slate-900 tracking-wider transition"
                        >
                          {t("Save Store Configuration", "सेटिंग्स सुरक्षित करें")}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Peripheral parameters */}
                  <div className="p-6 bg-slate-50/60 border border-slate-200/30 rounded-2xl space-y-4">
                    <h4 className="text-[11px] font-semibold uppercase text-indigo-600 tracking-wider">
                      {t("Peripherals & Tax Settings", "टैक्स और प्रिंटर")}
                    </h4>
                    <div className="space-y-6 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200/30/50 pb-2">
                        <div>
                          <p className="font-medium text-slate-900 text-[11px]">{t("Bluetooth Thermal Printer", "ब्लूटूथ थर्मल प्रिंटर")}</p>
                          <p className="text-[9px] text-slate-500/90 font-mono">Auto-print customer receipts</p>
                        </div>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200 font-semibold font-mono">
                          CONNECTED
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/30/50 pb-2">
                        <div>
                          <p className="font-medium text-slate-900 text-[11px]">{t("Low-Stock Buffer", "कम स्टॉक अलर्ट सीमा")}</p>
                          <p className="text-[9px] text-slate-500/90 font-mono">Alert threshold value</p>
                        </div>
                        <select className="bg-slate-50 border border-slate-200/30 rounded px-2 py-0.5 text-[10px] text-slate-700 font-mono">
                          <option>5 Units</option>
                          <option>10 Units</option>
                          <option>15 Units</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900 text-[11px]">{t("Auto Expiry Discounts", "ऑटोमैटिक डिस्काउंट")}</p>
                          <p className="text-[9px] text-slate-500/90 font-mono">Progressive AI markdown pricing</p>
                        </div>
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200 font-semibold font-mono">
                          ENABLED (AI)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sales Flow & Predictions Line Chart (Full Span) */}
            <SalesForecastChart
              salesData={salesLogs}
              forecastData={forecasts}
              products={products}
            />

            {/* Supply Chain Analytics */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
                <Box className="w-6 h-6 text-indigo-500" />
                Supply Chain Health
              </h2>
              <SupplyChainAnalytics
                products={products}
                batches={batches}
                salesLogs={salesLogs}
              />
            </div>

            {/* AI Supply Chain Intelligence */}
            <div className="mt-8 animate-fade-in">
              <React.Suspense fallback={<LoadingSkeleton />}>
                 <SupplyChainIntelligence />
              </React.Suspense>
            </div>
          </div>
        )}

        {/* Tab B: Hyperlocal Marketplace Simulator */}
        {activeTab === 'marketplace' && (
          <React.Suspense fallback={<LoadingSkeleton />}>
            <HyperlocalMarketplace
              products={products}
              batches={batches}
              onSimulatePurchase={(productId, qty, channel) => handleSimulateSale(undefined, productId, qty, channel)}
            />
          </React.Suspense>
        )}

        {/* Tab C: AI Retail Assistant Chatroom */}
        {activeTab === 'assistant' && (
          <React.Suspense fallback={<LoadingSkeleton />}>
            <AIRetailAssistant products={products} batches={batches} />
          </React.Suspense>
        )}
      </main>

      {/* Local Retail footer */}
      <footer className="bg-slate-50 py-8 px-6 border-t border-slate-200/30 mt-12 text-center text-slate-500/90 font-mono text-[10px]">
        <div className="max-w-7xl mx-auto space-y-1.5">
          <p>© 2026 StockSmart AI Retail Operating System. Fully Compliant with GST & Central Board of Direct Taxes Rules.</p>
          <p className="text-indigo-500 font-medium">Bridging neighborhood Kirana convenience with predictive enterprise logistics.</p>
        </div>
      </footer>

      {/* QR/Barcode Scanner Modal */}
      {showScanner && (
        <React.Suspense fallback={null}>
          <BarcodeScanner 
            products={products}
            onScanResult={handleScanResult}
            onClose={() => setShowScanner(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
};
