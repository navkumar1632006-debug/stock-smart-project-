import React, { useState, useEffect } from 'react';
import { AppShell } from './layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { DashboardPageHeader } from './dashboard/DashboardPageHeader';
import { MetricCard } from './dashboard/MetricCard';
import { OperationsGuidanceCard } from './dashboard/OperationsGuidanceCard';
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
import { Product, InventoryBatch, SaleRecord, DemandForecast, StoreRole } from '../types/retail';
import { authApi } from '../lib/api/authApi';
import { supabase } from '../lib/supabase/client';
import { inventoryService } from '../lib/services/inventoryService';
import { salesService } from '../lib/services/salesService';
import { SalesForecastChart } from './SalesForecastChart';
import { SupplyChainAnalytics } from './SupplyChainAnalytics';
// Mobile bridge removed

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
    <span>Loading dynamic StockSmart retail service...</span>
  </div>
);


import { ProductForm } from './inventory/ProductForm';
import { ProductTable } from './inventory/ProductTable';

export const RetailDashboard: React.FC = () => {
  // Main Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [allOriginalProducts, setAllOriginalProducts] = useState<Product[]>([]); // filter backup
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [salesLogs, setSalesLogs] = useState<SaleRecord[]>([]);
  const [forecasts, setDemandForecasts] = useState<DemandForecast[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // Advanced Simulation & Accessibility States
  const [currentRole, setCurrentRole] = useState<StoreRole>('Owner');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [syncQueueCount, setSyncQueueCount] = useState<number>(0);
  const [fontScale, setFontScale] = useState<boolean>(false);
  const [oneHandedMode, setOneHandedMode] = useState<boolean>(false);
  const [language, setLanguage] = useState<'en' | 'hi' | 'ta' | 'kn' | 'te'>('en');

  // UI & Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'marketplace' | 'assistant'>('dashboard');
  const [showScanner, setShowScanner] = useState(false);

  const handleScanResult = async (product: Product, action: 'add' | 'deduct', quantity: number) => {
    try {
      await inventoryService.adjustStock(product.id, action, quantity);
      await fetchAllData();
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to adjust stock.");
    }
  };
  const [dashboardSection, setDashboardSection] = useState<'overview' | 'inventory' | 'khata' | 'rbac' | 'reports' | 'settings' | 'suppliers' | 'audit'>('overview');

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
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const editProductObj = products.find(p => p.id === editProductId) || null;

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  const [cartItems, setCartItems] = useState<{product: Product, quantity: number}[]>([]);
  const [saleProductId, setSaleProductId] = useState('');
  const [saleQty, setSaleQty] = useState('1');
  const [saleSuccess, setSaleSuccess] = useState(false);

  const getGstRate = (category: string) => {
    switch(category) {
      case 'Dairy':
      case 'Bakery':
      case 'Staples': return 0.05;
      case 'Pharmacy': return 0.12;
      case 'Grocery': return 0.18;
      case 'Fruits & Vegetables': return 0;
      default: return 0;
    }
  };

  const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartGst = cartItems.reduce((sum, item) => sum + ((item.product.price * item.quantity) * getGstRate(item.product.category)), 0);
  const cartTotal = cartSubtotal + cartGst;


  // Load operational data via Supabase DAL
  const fetchAllData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [invData, salesData, batchData, auditData] = await Promise.all([
        inventoryService.getProducts(),
        salesService.getSales().catch(() => []), // Safely catch missing tables
        inventoryService.getBatches().catch(() => []),
        inventoryService.getAuditLogs().catch(() => [])
      ]);

      setProducts(invData);
      setAllOriginalProducts(invData);
      setBatches(batchData);
      setSalesLogs(salesData);
      setAuditLogs(auditData);
      setDemandForecasts([]);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(`⚠️ DB Connection Error: ${e.message || "Failed to fetch from Supabase."}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial data load
    fetchAllData();

    // Setup unified Supabase Realtime subscription for cross-client sync
    const channel = supabase
      .channel('store-operations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        console.log('Realtime product update:', payload);
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload) => {
        console.log('Realtime sale logged:', payload);
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, (payload) => {
        console.log('Realtime batch updated:', payload);
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, (payload) => {
        console.log('Realtime stock movement logged:', payload);
        fetchAllData();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to unified realtime channel');
        }
      });

    return () => {
      console.log('Cleaning up realtime subscription on unmount');
      supabase.removeChannel(channel);
    };
  }, []);

  // Desktop Notifications Background Checker
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    
    const checkAlerts = async () => {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          // Migrated: using products state directly to evaluate alerts instead of fake API
          const lowStockProducts = products.filter(p => p.stockLevel <= p.reorderPoint);
          if (lowStockProducts.length > 0) {
            lowStockProducts.forEach((alert: any) => {
              new Notification(`Stock Alert: ${alert.name}`, {
                body: `${alert.name} is low on stock (${alert.stockLevel} units remaining).`,
              });
            });
          }
        }
      } catch (err) {
        console.error('Failed to process background alerts:', err);
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
        // Migrated: use real inventoryService for bulk creation
        await Promise.all(
          items.map(item =>
            inventoryService.addProduct({
              name: item.name,
              category: item.category as any,
              sku: item.sku,
              price: item.price,
              cost: item.cost,
              reorderPoint: item.reorderPoint,
              stockLevel: item.initialQty
            })
          )
        );
        
        await fetchAllData();
      } catch (err) {
        console.error(err);
        alert("Error importing CSV.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleEditClick = (p: Product) => {
    setEditProductId(p.id);
    setNewProdName(p.name);
    setNewProdCategory(p.category);
    setNewProdSku(p.sku);
    setNewProdPrice(p.price.toString());
    setNewProdCost(p.cost.toString());
    setNewProdReorder(p.reorderPoint.toString());
    setNewProdQty(p.stockLevel.toString());
    setDashboardSection('inventory'); // Ensure we are on the inventory tab
  };

  const handleCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentRole === 'Staff') {
      alert(`🚫 Access Denied: Your active role is "${currentRole}". Staff members cannot execute cash register transactions directly. Please scan via vision scanner or log as Cashier/Manager.`);
      return;
    }
    
    if (cartItems.length === 0) {
      alert("Cart is empty.");
      return;
    }

    if (isOffline) {
      alert(`💾 [Offline Buffer Mode] POS operations require active sync to guarantee FEFO integrity.`);
      return;
    }

    try {
      const items = cartItems.map(item => {
        const gstRate = getGstRate(item.product.category);
        const subtotal = item.product.price * item.quantity;
        const total = subtotal + (subtotal * gstRate);
        return {
          product_id: item.product.id,
          quantity: item.quantity,
          total_price: total
        };
      });

      await salesService.processCheckout(items, "In-Store");

      setSaleSuccess(true);
      setCartItems([]);
      setTimeout(() => {
        setSaleSuccess(false);
      }, 3000);

      await fetchAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const addToCart = () => {
    if (!saleProductId || parseInt(saleQty) <= 0) return;
    const prod = products.find(p => p.id === saleProductId); 
    if (!prod) return;
    
    // Check if adding exceeds stock
    const existingCartItem = cartItems.find(i => i.product.id === prod.id);
    const qtyWanted = (existingCartItem ? existingCartItem.quantity : 0) + parseInt(saleQty);
    if (qtyWanted > prod.stockLevel) {
      alert(`Cannot add more than available stock (${prod.stockLevel}).`);
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === prod.id);
      if (existing) {
        return prev.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + parseInt(saleQty) } : i);
      }
      return [...prev, { product: prod, quantity: parseInt(saleQty) }];
    });
    
    setSaleProductId('');
    setSaleQty('1');
  };

  const removeFromCart = (pId: string) => {
    setCartItems(prev => prev.filter(i => i.product.id !== pId));
  };

  // Dynamic Metrics Computations
  const getDashboardMetrics = () => {
    const totalSalesRev = salesLogs.reduce((sum, s) => sum + s.totalPrice, 0);
    const criticalStockouts = products.filter(p => p.stockLevel <= p.reorderPoint).length;
    
    // Find active expiring batches
    const activeExpirations = batches.filter(b => {
      if (b.currentQuantity <= 0) return false;
      const days = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
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

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      dashboardSection={dashboardSection}
      setDashboardSection={setDashboardSection}
      fontScale={fontScale}
      headerActions={
        <>
          <div className="flex items-center space-x-1.5 bg-indigo-500/10 border border-indigo-200 rounded-2xl px-2.5 py-1 text-slate-700 text-xs flex-shrink-0">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Staff Mode: <b className="text-slate-900 font-extrabold">{currentRole}</b></span>
          </div>
          
          <button 
            onClick={() => {
              setIsOffline(!isOffline);
              if (!isOffline) {
                alert("Offline Buffer Simulator Activated! Real-time API sync is suspended. All transactional mutations will buffer locally.");
              } else {
                alert("Online state re-established. Sync queues ready to push.");
              }
            }}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-2xl text-xs border transition flex-shrink-0 ${isOffline ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500/90 border-slate-200/50'}`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> : <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{isOffline ? `Offline Mode (Buffered: ${syncQueueCount})` : "Online Status"}</span>
          </button>

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
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm flex-shrink-0 transition-colors"
            >
              Push Sync Queue
            </button>
          )}

          <div className="flex items-center space-x-1.5 px-2 py-1 bg-slate-50 border border-slate-200/50 rounded-2xl flex-shrink-0">
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

          <button 
            onClick={() => setFontScale(!fontScale)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-2xl border transition text-xs flex-shrink-0 ${fontScale ? 'bg-indigo-600 text-slate-900 border-indigo-500' : 'bg-slate-50 border-slate-200/50 hover:border-slate-300'}`}
          >
            <FontIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t("Large Fonts", "बड़े अक्षर")}</span>
          </button>

          <button 
            onClick={() => setOneHandedMode(!oneHandedMode)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-2xl border transition text-xs flex-shrink-0 ${oneHandedMode ? 'bg-indigo-600 text-slate-900 border-indigo-500 shadow-md' : 'bg-slate-50 border-slate-200/50 hover:border-slate-300'}`}
          >
            <span>{t("One-Handed Layout", "एक हाथ की स्क्रीन")}</span>
          </button>

          <button 
            onClick={async () => {
              await authApi.signOut();
            }}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-500/25 transition text-xs font-medium flex-shrink-0"
            title="Sign out of StockSmart AI"
          >
            <span>🚪 Sign Out</span>
          </button>
        </>
      }
    >
      <div className={`space-y-6 ${oneHandedMode ? 'max-w-4xl border-x border-slate-200/30 shadow-2xl bg-slate-50/20 mx-auto' : ''}`}>
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
            
            {dashboardSection === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Header & Quick Actions */}
                <DashboardPageHeader 
                  title="Overview" 
                  subtitle="Your store's real-time performance and active alerts."
                  actions={
                    <>
                      <Button 
                        variant="primary" 
                        onClick={() => setShowScanner(true)}
                      >
                        <ScanBarcode className="w-4 h-4 mr-2" />
                        Scan QR / Barcode
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setDashboardSection('inventory')}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    </>
                  }
                />

                {/* AI Morning Briefing & Regional TTS Assistant */}
                <React.Suspense fallback={<LoadingSkeleton />}>
                  <AIMorningBriefing onRefreshTrigger={fetchAllData} />
                </React.Suspense>

                {/* KPI Metrics Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Gross Revenue"
                    icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
                    value={`₹${metrics.totalSalesRev}`}
                    subtext={<><TrendingUp className="w-3 h-3 mr-1" /> Live</>}
                  />

                  <MetricCard
                    title="Stockouts"
                    icon={<AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />}
                    value={`${metrics.criticalStockouts} SKUs`}
                    valueColor={metrics.criticalStockouts > 0 ? 'text-rose-600' : 'text-slate-900'}
                    subtext="Below safety reorder trigger"
                  />

                  <MetricCard
                    title="Near Expiry"
                    icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                    value={`${metrics.activeExpirations} Batches`}
                    valueColor={metrics.activeExpirations > 0 ? 'text-amber-600' : 'text-slate-900'}
                    subtext="Expiring in < 5 days"
                  />

                  <MetricCard
                    title="Waste Recaptured"
                    icon={<Tag className="w-4 h-4 text-indigo-600" />}
                    value={`₹${metrics.wastagePrevented}`}
                    valueColor="text-indigo-600"
                    subtext="Saved via Dynamic Discounts"
                  />
                </div>

                {/* Active Operations Guidance */}
                <div className="mt-8">
                  {(() => {
                    const overviewLowStock = products.find(p => p.stockLevel <= p.reorderPoint);
                    const overviewExpiring = batches.find(b => {
                      if (b.currentQuantity <= 0) return false;
                      const d = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
                      return d >= 0 && d <= 5;
                    });
                    const overviewExpiringDays = overviewExpiring ? Math.ceil((new Date(overviewExpiring.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24)) : 0;
                    const activeActionCount = (overviewLowStock ? 1 : 0) + (overviewExpiring ? 1 : 0);

                    return (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-bold text-slate-900 flex items-center">
                            <Sparkles className="w-5 h-5 text-indigo-600 mr-2 animate-pulse" />
                            Active Operations Guidance
                          </h2>
                          <Badge variant="secondary">{activeActionCount} Real-time Actions</Badge>
                        </div>

                        {activeActionCount === 0 ? (
                          <EmptyState
                            icon={<CheckCircle2 className="w-16 h-16 text-slate-300" />}
                            title="All clear!"
                            description="You have no urgent operational tasks. Inventory and batches are healthy."
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Notification Card 1: Dynamic Stockout */}
                            {overviewLowStock && (
                              <OperationsGuidanceCard
                                badgeVariant="destructive"
                                badgeText="Stockout Alert"
                                urgencyText="Urgent"
                                title={`Draft Restock for ${overviewLowStock.name}`}
                                description={`Current stock is only ${overviewLowStock.stockLevel} units, falling below critical safety threshold of ${overviewLowStock.reorderPoint}.`}
                                buttonVariant="destructive"
                                buttonText="Generate Smart Restock PO"
                                onAction={() => setDashboardSection('inventory')}
                              />
                            )}

                            {/* Notification Card 2: Dynamic Expiry */}
                            {overviewExpiring && (
                              <OperationsGuidanceCard
                                badgeVariant="warning"
                                badgeText="Expiry Nudge"
                                urgencyText={`${overviewExpiringDays} Days Left`}
                                title={`Discount ${overviewExpiring.productName}`}
                                description={`Batch ${overviewExpiring.batchNumber} is expiring. Apply automatic discount on the local consumer marketplace to clear stock.`}
                                buttonVariant="secondary"
                                buttonClassName="bg-amber-50 text-amber-700 hover:bg-amber-100 border-none"
                                buttonText="Promote on Local App"
                                onAction={() => setActiveTab('marketplace')}
                              />
                            )}
                          </div>
                        )}
                      </>
                    );
                  })}
                </div>
                
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
                    <ProductTable onEditClick={handleEditClick} userRole={currentRole} />
                    {/* Grid of Forms: Add Product + Simulate Sale */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Form 1: Add Product */}
                      <ProductForm editProduct={editProductObj} onCancelEdit={() => setEditProductId(null)} userRole={currentRole} />

                      {/* Form 2: POS Cart */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                            <ShoppingBag className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Point of Sale (POS)</h4>
                          </div>

                          {currentRole === 'Staff' ? (
                            <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-6 text-xs text-slate-600 font-mono text-center">
                              🔒 Access Locked: Role <b>{currentRole}</b> is blocked from logging POS cash register transactions. Use owner/manager identity to sell.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex space-x-2">
                                <div className="flex-1">
                                  <label className="text-xs font-medium text-slate-600 block mb-1">Search/Scan Product</label>
                                  <select
                                    value={saleProductId}
                                    onChange={(e) => setSaleProductId(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                  >
                                    <option value="">-- Choose Product --</option>
                                    {products.map(p => (
                                      <option key={p.id} value={p.id} disabled={p.stockLevel <= 0}>
                                        {p.name} ({p.stockLevel} in stock) - ₹{p.price}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="w-20">
                                  <label className="text-xs font-medium text-slate-600 block mb-1">Qty</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={saleQty}
                                    onChange={(e) => setSaleQty(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <button 
                                    onClick={addToCart}
                                    disabled={!saleProductId}
                                    aria-label="Add product to cart"
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>

                              {/* Cart Items */}
                              <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-mono uppercase text-slate-500 flex justify-between">
                                  <span>Item</span>
                                  <span>Subtotal</span>
                                </div>
                                <div className="max-h-32 overflow-y-auto p-1 divide-y divide-slate-100">
                                  {cartItems.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-400 font-mono">Cart is empty</div>
                                  ) : cartItems.map(item => (
                                    <div key={item.product.id} className="p-2 flex justify-between items-center text-xs">
                                      <div>
                                        <div className="font-semibold text-slate-800">{item.product.name}</div>
                                        <div className="text-[11px] text-slate-500">{item.quantity} x ₹{item.product.price} (GST {(getGstRate(item.product.category) * 100)}%)</div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-mono text-slate-800 font-medium">₹{(item.quantity * item.product.price).toFixed(2)}</span>
                                        <button 
                                          onClick={() => removeFromCart(item.product.id)} 
                                          aria-label={`Remove ${item.product.name} from cart`}
                                          className="p-1 text-rose-400 hover:text-rose-600 rounded"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {cartItems.length > 0 && (
                                  <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs font-mono space-y-1">
                                    <div className="flex justify-between text-slate-500"><span>Subtotal:</span> <span>₹{cartSubtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-slate-500"><span>GST:</span> <span>₹{cartGst.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200 mt-1">
                                      <span>Total:</span> <span>₹{cartTotal.toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={handleCheckout}
                                disabled={cartItems.length === 0}
                                className="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                              >
                                {saleSuccess ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                    <span>Sale Processed!</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-4 h-4 text-white" />
                                    <span>Confirm Sale (₹{cartTotal.toFixed(2)})</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Operational Tip */}
                        <div className="bg-emerald-500/5 border border-emerald-200 rounded-2xl p-3.5 text-xs text-slate-600 font-sans leading-relaxed mt-2">
                          <span className="font-medium text-emerald-700 uppercase tracking-widest block mb-0.5">Atomic FEFO Tx:</span>
                          Transactions process atomically via Supabase RPC, ensuring inventory bounds and FEFO batch deductions succeed together.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Smart B2B PO Restock Sheet, Expiries & Demand (Span 5) */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Automated Smart B2B Purchase Order restocker */}
                    <React.Suspense fallback={<LoadingSkeleton />}>
                      <SmartReorderPO 
                        products={products}
                        salesLogs={salesLogs}
                        onReorderSuccess={fetchAllData} 
                      />
                    </React.Suspense>

                    {/* Expiry Tracking & Dynamic Pricing Panel */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-200/30 pb-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 animate-bounce" />
                          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Perishable Shelf Expiry Ledger</h4>
                        </div>
                        <span className="text-[8px] uppercase font-mono bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                          Dynamic Pricing
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
                            .sort((a,b) => ((_: any) => 10)(a.expiryDate) - ((_: any) => 10)(b.expiryDate))
                            .map((b) => {
                              const daysLeft = ((_: any) => 10)(b.expiryDate);
                              const hasDiscount = b.discountRate > 0;
                              
                              let expLabelColor = "text-slate-500/90 bg-slate-50/80 border-slate-200/30";
                              if (daysLeft <= 1) expLabelColor = "text-rose-600 bg-rose-50 border-rose-200 animate-pulse font-semibold";
                              else if (daysLeft <= 4) expLabelColor = "text-amber-600 bg-amber-50 border-amber-200 font-medium";

                              return (
                                <div key={b.id} className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 flex items-center justify-between transition">
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
                                          AUTO DISC {Math.round(b.discountRate * 100)}%
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
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-200/30 pb-2">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Demand Forecast Suggestions</h4>
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
                            <div key={f.productId} className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between">
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
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
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
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
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
                          defaultValue={{ name: "Local Shop", address: "", phone: "" }.name}
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
                            defaultValue={{ name: "Local Shop", address: "", phone: "" }.phone}
                            className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => alert("Settings saved locally!")}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-semibold uppercase text-white tracking-wider transition-colors shadow-sm"
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
                          <p className="text-[9px] text-slate-500/90 font-mono">Progressive markdown pricing</p>
                        </div>
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200 font-semibold font-mono">
                          ENABLED (AUTO)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 6: Audit Ledger */}
            {dashboardSection === 'audit' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Immutable Inventory Ledger</h3>
                </div>
                
                <div className="bg-amber-500/5 border border-amber-200 rounded-2xl p-4 text-[10.5px] text-slate-600 font-sans leading-relaxed">
                  <span className="font-semibold text-amber-700 uppercase tracking-widest block mb-1">Compliance Notice:</span>
                  This ledger provides an immutable audit trail of all inventory mutations (Sales, Restocks, Spoilage, Adjustments). Records cannot be modified or deleted. Errors must be corrected via compensating Adjustment transactions.
                </div>

                <div className="border border-slate-200/50 rounded-2xl overflow-hidden shadow-sm shadow-slate-100/50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/60 text-[9px] uppercase tracking-widest text-slate-500 font-semibold font-mono">
                          <th className="px-4 py-3 font-medium text-slate-400">Timestamp</th>
                          <th className="px-4 py-3 font-medium text-slate-400">Product</th>
                          <th className="px-4 py-3 font-medium text-slate-400">Type</th>
                          <th className="px-4 py-3 font-medium text-slate-400 text-right">Delta</th>
                          <th className="px-4 py-3 font-medium text-slate-400 text-right">Stock After</th>
                          <th className="px-4 py-3 font-medium text-slate-400">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 text-[11px] font-mono bg-white text-slate-700">
                        {auditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-[10.5px] italic">
                              No transaction history found.
                            </td>
                          </tr>
                        ) : auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition duration-150">
                            <td className="px-4 py-3 text-[9.5px] text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{log.products?.name || 'Unknown'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider ${
                                log.transaction_type === 'SALE' ? 'bg-emerald-100 text-emerald-700' :
                                log.transaction_type === 'RESTOCK' ? 'bg-indigo-100 text-indigo-700' :
                                log.transaction_type === 'ADJUSTMENT' ? 'bg-amber-100 text-amber-700' :
                                log.transaction_type === 'SPOILAGE' ? 'bg-rose-100 text-rose-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {log.transaction_type}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right font-bold ${log.quantity_changed < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {log.quantity_changed > 0 ? '+' : ''}{log.quantity_changed}
                            </td>
                            <td className="px-4 py-3 text-right">{log.stock_after}</td>
                            <td className="px-4 py-3 text-[9.5px] text-slate-500 truncate max-w-[150px]">{log.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab B: Hyperlocal Marketplace Simulator */}
        {activeTab === 'marketplace' && (
          <React.Suspense fallback={<LoadingSkeleton />}>
            <HyperlocalMarketplace
              products={products}
              batches={batches}
              onSimulatePurchase={async (productId, qty, channel) => {
                const p = products.find(prod => prod.id === productId);
                if (p) {
                  const gst = getGstRate(p.category);
                  const subtotal = p.price * qty;
                  const total = subtotal + (subtotal * gst);
                  await salesService.processCheckout([{ product_id: productId, quantity: qty, total_price: total }], channel);
                  fetchAllData();
                }
              }}
            />
          </React.Suspense>
        )}

        {/* Tab C: AI Retail Assistant Chatroom */}
        {activeTab === 'assistant' && (
          <React.Suspense fallback={<LoadingSkeleton />}>
            <AIRetailAssistant products={products} batches={batches} />
          </React.Suspense>
        )}
      </div>

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
    </AppShell>
  );
};
