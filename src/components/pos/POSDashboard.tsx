import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Product, SaleRecord } from '../../types/retail';
import { salesService } from '../../lib/services/salesService';
import { invoiceService } from '../../lib/services/invoiceService';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertTriangle, Clock, MapPin, Monitor, Filter, FileText, IndianRupee, Package, ArrowLeft, Calendar, Download, Printer } from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';

interface CartItem {
  product: Product;
  quantity: number;
}

export const POSDashboard: React.FC = () => {
  const { products, refreshData } = useInventory();
  
  const [activeTab, setActiveTab] = useState<'Register' | 'History'>('Register');
  
  // Register State
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [channel, setChannel] = useState<'In-Store' | 'Hyperlocal App' | 'Online'>('In-Store');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'success' | 'error' | 'invoice-error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  
  // History State
  const [salesLogs, setSalesLogs] = useState<SaleRecord[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  
  // History Filters
  const [histSearch, setHistSearch] = useState('');
  const [histChannel, setHistChannel] = useState('All');
  const [histDateRange, setHistDateRange] = useState<'All' | 'Today' | '7Days' | '30Days'>('All');
  
  // Sale Detail Modal
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  const fetchSales = async () => {
    setIsLoadingSales(true);
    try {
      const logs = await salesService.getSales();
      setSalesLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSales(false);
    }
  };

  useEffect(() => {
    fetchSales();
    const handleStoreChange = () => fetchSales();
    window.addEventListener('store-changed', handleStoreChange);
    return () => window.removeEventListener('store-changed', handleStoreChange);
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockLevel) {
          alert(`Cannot add more. Only ${product.stockLevel} in stock.`);
          return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      if (product.stockLevel <= 0) {
        alert('Product is out of stock.');
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty > item.product.stockLevel) {
          alert(`Only ${item.product.stockLevel} in stock.`);
          return item;
        }
        if (newQty <= 0) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const gstAmount = cart.reduce((sum, item) => sum + ((item.product.price * item.quantity) * getGstRate(item.product.category)), 0);
  const total = subtotal + gstAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setCheckoutStatus('idle');
    setErrorMessage('');
    setGeneratedInvoice(null);

    try {
      const items = cart.map(item => {
        const itemSubtotal = item.product.price * item.quantity;
        const itemGst = itemSubtotal * getGstRate(item.product.category);
        return {
          product_id: item.product.id,
          quantity: item.quantity,
          total_price: itemSubtotal + itemGst
        };
      });

      // 1. Process atomic sale
      const saleIds = await salesService.processCheckout(items, channel);
      
      setCart([]);
      refreshData();
      fetchSales();

      // 2. Generate Invoice
      try {
        const invoiceId = await invoiceService.createInvoiceFromSales(
          saleIds,
          { name: 'Walk-in Customer', contact: '', gstin: '' },
          'Cash',
          channel
        );
        const invoice = await invoiceService.getInvoice(invoiceId);
        setGeneratedInvoice(invoice);
        setCheckoutStatus('success');
      } catch (invError: any) {
        // Sale succeeded, but invoice failed (e.g. migration not run)
        setErrorMessage(invError.message || 'Invoice generation failed.');
        setCheckoutStatus('invoice-error');
      }

    } catch (e: any) {
      setCheckoutStatus('error');
      setErrorMessage(e.message || 'Checkout failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- History Filtering & Summaries ---
  const filteredSales = useMemo(() => {
    return salesLogs.filter(log => {
      let match = true;
      if (histSearch && !log.productName.toLowerCase().includes(histSearch.toLowerCase())) match = false;
      if (histChannel !== 'All' && log.channel !== histChannel) match = false;
      
      if (histDateRange !== 'All') {
        const saleDate = new Date(log.saleDate).getTime();
        const now = new Date().getTime();
        const diffDays = (now - saleDate) / (1000 * 3600 * 24);
        if (histDateRange === 'Today' && diffDays > 1) match = false;
        if (histDateRange === '7Days' && diffDays > 7) match = false;
        if (histDateRange === '30Days' && diffDays > 30) match = false;
      }
      return match;
    });
  }, [salesLogs, histSearch, histChannel, histDateRange]);

  const historySummary = useMemo(() => {
    return filteredSales.reduce((acc, log) => {
      acc.revenue += log.totalPrice;
      acc.units += log.quantity;
      return acc;
    }, { revenue: 0, units: 0 });
  }, [filteredSales]);

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('Register')}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'Register' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Terminal / POS
        </button>
        <button
          onClick={() => setActiveTab('History')}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'History' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Transaction History
        </button>
      </div>

      {activeTab === 'Register' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left Column: Product Search & Grid */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[500px]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Point of Sale</h3>
                  <p className="text-[10px] font-mono text-slate-500/90">Scan or search items to add to cart</p>
                </div>
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Search SKU or Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200/50 shadow-sm rounded-2xl text-[11px] font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 content-start">
                {filteredProducts.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => addToCart(p)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${p.stockLevel > 0 ? 'bg-white border-slate-200/50 hover:border-indigo-300 hover:shadow-md' : 'bg-slate-50 border-slate-200/30 opacity-50'}`}
                  >
                    <div className="font-semibold text-xs text-slate-800 line-clamp-2 min-h-[32px] leading-tight">{p.name}</div>
                    <div className="text-[9px] font-mono text-slate-500 mt-1">{p.sku}</div>
                    <div className="flex items-end justify-between mt-3">
                      <span className="font-bold text-slate-900">₹{p.price}</span>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${p.stockLevel <= p.reorderPoint ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {p.stockLevel} left
                      </span>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-500 font-mono text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    No products found. Try a different SKU.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Cart Panel */}
          <div className="lg:col-span-4 h-full">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full relative overflow-hidden bg-white/50">
              
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-4 mb-4">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Current Sale</h3>
                </div>
                <span className="bg-indigo-100 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded-xl">
                  {cart.reduce((s, i) => s + i.quantity, 0)} Items
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <ShoppingCart className="w-12 h-12 mb-3" />
                    <p className="text-xs font-mono">Cart is empty</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="p-3 bg-white border border-slate-200/50 rounded-2xl flex flex-col space-y-3 shadow-sm hover:border-indigo-200 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-3">
                          <div className="text-xs font-semibold text-slate-900 leading-tight">{item.product.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">₹{item.product.price} / unit</div>
                        </div>
                        <div className="text-right font-bold text-slate-900 text-xs">
                          ₹{(item.product.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                        <button onClick={() => removeFromCart(item.product.id)} className="text-[9px] text-rose-500 hover:bg-rose-50 px-2 py-1 rounded transition-colors font-medium">
                          Remove
                        </button>
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                          <button onClick={() => item.quantity > 1 ? updateQuantity(item.product.id, -1) : removeFromCart(item.product.id)} className="p-1 hover:bg-white rounded-md transition text-slate-600">
                            {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-500" /> : <Minus className="w-3.5 h-3.5" />}
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-white rounded-md transition text-slate-600">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-200/50 pt-4 space-y-4 bg-white/80 p-4 -mx-6 -mb-6 rounded-b-3xl">
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-500 font-semibold block mb-2">Sales Channel</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {['In-Store', 'Hyperlocal App', 'Online'].map(ch => (
                      <button
                        key={ch}
                        onClick={() => setChannel(ch as any)}
                        className={`flex-1 flex items-center justify-center space-x-1 py-2 px-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${channel === ch ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {ch === 'In-Store' && <MapPin className="w-3 h-3" />}
                        {ch === 'Online' && <Monitor className="w-3 h-3" />}
                        <span className="truncate">{ch.replace('Hyperlocal App', 'Hyperlocal')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-slate-500 font-mono">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-mono">
                    <span>Estimated GST</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-lg text-slate-900 pt-2 border-t border-slate-200/50 mt-2">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isProcessing}
                  className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex justify-center items-center space-x-2 transition-all ${cart.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30'}`}
                >
                  {isProcessing ? (
                    <span className="animate-pulse flex items-center space-x-2">
                      <ShoppingCart className="w-4 h-4 animate-bounce" />
                      <span>Processing...</span>
                    </span>
                  ) : (
                    <>
                      <span>Checkout</span>
                      <span>₹{total.toFixed(2)}</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Status Overlay */}
              {checkoutStatus !== 'idle' && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in rounded-3xl">
                  {checkoutStatus === 'success' ? (
                    <>
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">Sale Complete</h3>
                      <p className="text-xs text-slate-500 font-mono mb-4">Inventory natively synchronized.</p>
                      
                      {generatedInvoice && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 w-full mb-6">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Invoice Generated</p>
                          <p className="font-mono text-lg font-bold text-slate-900">{generatedInvoice.invoiceNumber}</p>
                          
                          <div className="flex space-x-2 mt-4">
                            <button 
                              onClick={() => setIsInvoiceModalOpen(true)} 
                              className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-sm flex justify-center items-center space-x-1"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Preview</span>
                            </button>
                            <button 
                              onClick={() => window.print()}
                              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm flex justify-center items-center space-x-1"
                            >
                              <Printer className="w-4 h-4" />
                              <span>Print</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={() => { setCheckoutStatus('idle'); setGeneratedInvoice(null); }}
                        className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors w-full"
                      >
                        New Sale
                      </button>
                    </>
                  ) : checkoutStatus === 'invoice-error' ? (
                    <>
                      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="w-10 h-10 text-amber-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Sale Complete, Invoice Failed</h3>
                      <p className="text-xs text-amber-700 bg-amber-50 px-4 py-2 rounded-lg font-mono mb-6 border border-amber-200">{errorMessage}</p>
                      <button 
                        onClick={() => { setCheckoutStatus('idle'); setGeneratedInvoice(null); }}
                        className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        Continue to New Sale
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-10 h-10 text-rose-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Transaction Failed</h3>
                      <p className="text-xs text-rose-600 bg-rose-50 px-4 py-2 rounded-lg font-mono mb-6 border border-rose-100">{errorMessage}</p>
                      <button 
                        onClick={() => setCheckoutStatus('idle')}
                        className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        Return to Cart
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[600px]">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-slate-200/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Transaction Master Ledger</span>
              </h3>
              <p className="text-[10px] font-mono text-slate-500 mt-1">Immutable record of all processed RPC sales</p>
            </div>

            {/* Summaries */}
            <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
              <div className="text-center px-3 border-r border-slate-200">
                <p className="text-[9px] uppercase font-bold text-slate-500">Transactions</p>
                <p className="text-lg font-black text-slate-900">{filteredSales.length}</p>
              </div>
              <div className="text-center px-3 border-r border-slate-200">
                <p className="text-[9px] uppercase font-bold text-slate-500">Units</p>
                <p className="text-lg font-black text-slate-900">{historySummary.units}</p>
              </div>
              <div className="text-center px-3">
                <p className="text-[9px] uppercase font-bold text-slate-500">Revenue</p>
                <p className="text-lg font-black text-emerald-600">₹{historySummary.revenue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/30">
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by product..."
                value={histSearch}
                onChange={(e) => setHistSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200/50 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-4 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={histDateRange}
                onChange={(e) => setHistDateRange(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200/50 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="7Days">Last 7 Days</option>
                <option value="30Days">Last 30 Days</option>
              </select>
            </div>
            <div className="md:col-span-4 flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={histChannel}
                onChange={(e) => setHistChannel(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200/50 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="All">All Channels</option>
                <option value="In-Store">In-Store</option>
                <option value="Hyperlocal App">Hyperlocal App</option>
                <option value="Online">Online</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-auto border border-slate-200/50 rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200/50">
                <tr className="text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">Channel</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Total Price</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingSales ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading ledger...</td></tr>
                ) : filteredSales.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">No transactions match filters.</td></tr>
                ) : (
                  filteredSales.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-3 px-4 text-slate-600">{new Date(log.saleDate).toLocaleString()}</td>
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">{log.productName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[9px] font-bold">{log.channel}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">{log.quantity}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">₹{log.totalPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => setSelectedSale(log)}
                          className="px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-[10px] font-bold transition-colors opacity-0 group-hover:opacity-100"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-fade-in">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Transaction Details</span>
              </h3>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-700">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 font-mono text-sm">
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Product</p>
                <p className="font-sans font-bold text-slate-900 text-lg leading-tight">{selectedSale.productName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Date</p>
                  <p className="text-slate-800 text-xs">{new Date(selectedSale.saleDate).toLocaleDateString()}</p>
                  <p className="text-slate-500 text-[10px]">{new Date(selectedSale.saleDate).toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Channel</p>
                  <p className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold w-fit">{selectedSale.channel}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Quantity</span>
                  <span className="font-bold">{selectedSale.quantity}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Unit Trace</span>
                  <span>{selectedSale.productId.split('-')[0]}...</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center mt-2">
                  <span className="font-bold text-slate-900">Total Collected</span>
                  <span className="font-black text-emerald-600 text-lg">₹{selectedSale.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setSelectedSale(null)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Invoice Detail Modal */}
      {isInvoiceModalOpen && generatedInvoice && (
        <InvoiceModal invoice={generatedInvoice} onClose={() => setIsInvoiceModalOpen(false)} />
      )}
    </div>
  );
};
