import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { Search, MapPin, ShoppingCart, Store, ChevronRight, PackageSearch, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { salesService } from '../lib/services/salesService';

export const CustomerMarketplace: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{product: any, quantity: number}[]>([]);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    const fetchMarketplaceData = async () => {
      try {
        setLoading(true);
        // Attempt to fetch public stores and products.
        // Requires RLS to allow anonymous/public reads for these tables, or acts as a simulator if authenticated.
        const [storesRes, productsRes] = await Promise.all([
          supabase.from('stores').select('*'),
          supabase.from('products').select('*').gt('stock_level', 0)
        ]);
        
        if (storesRes.data) setStores(storesRes.data);
        if (productsRes.data) setProducts(productsRes.data);
      } catch (err) {
        console.error('Marketplace fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMarketplaceData();
  }, []);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutStatus('processing');
    try {
      // Create a sale for each item in the cart. 
      // In a real production system with cart models, an order ID would link them.
      for (const item of cart) {
        await salesService.processCheckout([{
          product_id: item.product.id,
          quantity: item.quantity,
          total_price: item.product.price * item.quantity
        }], 'Hyperlocal App');
      }
      setCheckoutStatus('success');
      setCart([]);
    } catch (e) {
      console.error('Checkout failed', e);
      setCheckoutStatus('idle');
      alert('Checkout failed due to insufficient stock or network error.');
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (checkoutStatus === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Confirmed!</h2>
        <p className="text-slate-600 mb-6 text-center max-w-sm">Your hyperlocal order has been sent to the store for fulfillment. You can pick it up shortly.</p>
        <button onClick={() => { setCheckoutStatus('idle'); setSearch(''); }} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700">
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-indigo-600 text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <ArrowLeft className="w-5 h-5 opacity-75 hover:opacity-100 transition-opacity" />
            <h1 className="text-lg font-bold tracking-tight">Hyperlocal Market</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-indigo-500/50 px-3 py-1.5 rounded-full text-xs">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              <span>Detecting Location...</span>
            </div>
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        
        {/* Left Column (Products & Search) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search groceries, milk, fresh vegetables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 shadow-sm rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Nearby Products</h2>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">{filteredProducts.length} Found</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-indigo-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-sm font-medium">Scanning nearby stores...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
              <PackageSearch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No products found in your area.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map(p => {
                const store = stores.find(s => s.id === p.store_id);
                return (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-900 leading-tight">{p.name}</h3>
                        <span className="text-indigo-600 font-bold">₹{p.price}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1 line-clamp-1">{p.category} • SKU: {p.sku}</p>
                      {store && (
                        <div className="flex items-center text-[10px] text-slate-400 font-mono mt-2">
                          <Store className="w-3 h-3 mr-1" /> {store.name}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        {p.stock_level} Available
                      </span>
                      <button 
                        onClick={() => addToCart(p)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column (Cart & Checkout) */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sticky top-24 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-indigo-600" />
              Your Cart
            </h2>
            
            {cart.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Your cart is empty.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-slate-500">₹{item.product.price} x {item.quantity}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-bold text-slate-900">₹{item.product.price * item.quantity}</p>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-[9px] text-rose-500 font-medium hover:underline">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-slate-600">Total</span>
                    <span className="text-xl font-bold text-slate-900">₹{cartTotal}</span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    disabled={checkoutStatus === 'processing'}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-2xl transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {checkoutStatus === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Order & Pickup'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};
