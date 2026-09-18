import React, { useState, useEffect } from 'react';
import { Search, MapPin, Tag, ShoppingCart, Percent, Compass, Filter, Sparkles, CheckCircle2 } from 'lucide-react';

interface HyperlocalMarketplaceProps {
  products: any[];
  batches: any[];
  onSimulatePurchase: (productId: string, quantity: number, channel: 'In-Store' | 'Hyperlocal Marketplace') => void;
}

export const HyperlocalMarketplace: React.FC<HyperlocalMarketplaceProps> = ({
  products,
  batches,
  onSimulatePurchase
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [maxDistance, setMaxDistance] = useState<number>(3); // Max 3 km
  const [cartSuccess, setCartSuccess] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Auto-initialize coordinates
  useEffect(() => {
    handleGpsSync(true);
  }, []);

  const handleGpsSync = async (silent = false) => {
    if (!silent) {
      setIsLocating(true);
    }
    // Simulate coords
    const coords = { latitude: 28.6139, longitude: 77.2090, accuracy: 10 };
    setGpsCoords(coords);
    if (!silent) {
      setIsLocating(false);
    }
  };

  // Generate local merchant discount inventory items dynamically based on expiring batches
  const getMarketplaceItems = () => {
    const items: any[] = [];
    const stores = [
      { name: "Krishna Kirana & Supermarket", distance: 0.2 },
      { name: "Verma Fresh Dairy", distance: 0.7 },
      { name: "Shree Balaji Retail Hub", distance: 1.4 },
      { name: "Dwarka Pharmacy Express", distance: 1.9 }
    ];

    batches.forEach((b) => {
      // Find base product
      const p = products.find(prod => prod.id === b.productId);
      if (!p || b.currentQuantity <= 0) return;

      // Filter logic
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return;
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return;

      // Only showcase items with active dynamic expiry discounts
      if (b.discountRate > 0) {
        // Distribute batches randomly across 4 nearby merchants
        stores.forEach((store, idx) => {
          // Keep কৃষ্ণ Kirana as the main owner of original batches, others simulate local competitors
          // Store randomization removed in Phase 3C
          if (idx > 0) return; 

          const randomQty = b.currentQuantity;
          
          items.push({
            id: `${b.id}-MKT-${idx}`,
            productId: b.productId,
            productName: p.name,
            sku: p.sku,
            category: p.category,
            storeName: idx === 0 ? "Krishna Kirana (Your Store)" : store.name,
            isSelfStore: idx === 0,
            distanceKm: store.distance,
            originalPrice: b.originalPrice,
            discountRate: b.discountRate,
            discountedPrice: b.discountedPrice,
            expiryDate: b.expiryDate,
            stockAvailable: randomQty
          });
        });
      }
    });

    return items.filter(item => item.distanceKm <= maxDistance);
  };

  const availableItems = getMarketplaceItems();

  const handleBuyNow = (item: any) => {
    // If it's your own store, simulate a hyperlocal checkout and update vendor state
    if (item.isSelfStore) {
      onSimulatePurchase(item.productId, 1, 'Hyperlocal Marketplace');
    }
    setCartSuccess(item.id);
    setTimeout(() => {
      setCartSuccess(null);
    }, 3000);
  };

  const getDaysRemainingText = (dateStr: string) => {
    const exp = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = exp.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days <= 0) return { text: "Expired", color: "text-red-400 bg-red-500/10 border-red-500/20" };
    if (days === 1) return { text: "Expiring Tomorrow!", color: "text-rose-600 bg-rose-50 border-rose-200 animate-pulse font-semibold" };
    if (days <= 3) return { text: `${days} Days Left`, color: "text-amber-600 bg-amber-50 border-amber-200 font-medium" };
    return { text: `${days} Days Remaining`, color: "text-emerald-600 bg-emerald-500/10 border-emerald-200" };
  };

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-200/30 flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-200/30 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-200">
            <Compass className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-tight">Hyperlocal Marketplace Console</h3>
            <div className="flex flex-wrap gap-2 items-center mt-1">
              <p className="text-[10px] text-slate-500/90 font-mono">Simulating nearby grocery discoverability</p>
              {gpsCoords && (
                <span className="text-[9px] bg-indigo-500/10 border border-indigo-200 px-2 py-0.5 rounded font-mono text-indigo-600">
                  📍 GPS: {gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)} (±{gpsCoords.accuracy}m)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Geofence / GPS Recalibrate Button */}
          <button
            onClick={() => handleGpsSync(false)}
            disabled={isLocating}
            className="flex items-center space-x-1.5 bg-slate-50 hover:bg-white border border-slate-200/30 hover:border-slate-200/50 px-3.5 py-2 rounded-2xl text-[10px] font-mono text-indigo-600 transition-all font-semibold"
          >
            <MapPin className={`w-3.5 h-3.5 ${isLocating ? 'animate-bounce text-rose-600' : 'text-indigo-600'}`} />
            <span>{isLocating ? "Acquiring GPS..." : "GPS Geofence Recalibrate"}</span>
          </button>

          {/* Dynamic Distance Slider */}
          <div className="flex items-center space-x-3 bg-slate-50 px-4 py-2 border border-slate-200/30 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-500/90 uppercase">Radius:</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={maxDistance}
              onChange={(e) => setMaxDistance(parseFloat(e.target.value))}
              className="w-20 accent-indigo-500 cursor-pointer h-1 rounded bg-slate-100"
            />
            <span className="text-[10px] font-semibold font-mono text-indigo-600">{maxDistance} km</span>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search milk, bread, paneer, veggies..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200/30 rounded-2xl text-[11px] font-mono text-slate-800 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {['ALL', 'Dairy', 'Bakery', 'Fruits & Vegetables', 'Staples', 'Pharmacy'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-2xl text-[10px] font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-slate-900'
                  : 'bg-slate-50 text-slate-500/90 border border-slate-200/30 hover:text-slate-900'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat}
            </button>
          ))}
        </div>

        <div className="bg-gradient-to-r from-rose-500/10 to-indigo-500/10 border border-rose-200 rounded-2xl p-3 flex items-center justify-between text-[11px] text-slate-700">
          <span className="font-medium flex items-center space-x-1">
            <Percent className="w-3.5 h-3.5 text-rose-600 mr-1" />
            Active Micro-Savings
          </span>
          <span className="font-mono text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200/30 text-rose-600 font-semibold">
            {availableItems.length} Deals Live
          </span>
        </div>
      </div>

      {/* Grid of Products */}
      {availableItems.length === 0 ? (
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-dashed border-slate-200/30 rounded-3xl p-12 text-center space-y-2">
          <Filter className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-xs font-semibold text-slate-500/90 uppercase tracking-wider">No Hyperlocal Flash Deals Found</h4>
          <p className="text-[10px] text-slate-400 max-w-sm mx-auto font-mono">
            Ensure that some items are expiring in less than 7 days to trigger the AI Smart Expiry discount rates on the merchant dashboard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableItems.map((item) => {
            const expStyle = getDaysRemainingText(item.expiryDate);
            const isSelected = cartSuccess === item.id;
            
            return (
              <div
                key={item.id}
                className="bg-slate-50/60 border border-slate-200/30 hover:border-slate-200/50 rounded-3xl p-6 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Store Name and distance */}
                <div className="flex items-center justify-between border-b border-slate-200/30 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[10px] font-semibold text-slate-700 truncate max-w-[120px]">
                      {item.storeName}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded font-medium border border-indigo-200">
                    {item.distanceKm} km away
                  </span>
                </div>

                {/* Product Core Details */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-medium text-slate-900 tracking-tight">{item.productName}</h4>
                    <span className="text-[8px] font-mono bg-white text-slate-500/90 px-1.5 py-0.5 rounded border border-slate-200/50">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-mono">SKU: {item.sku}</p>
                </div>

                {/* Expiry dynamic label */}
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded border ${expStyle.color}`}>
                    {expStyle.text}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500/90">
                    Qty: <b className="text-slate-800 font-semibold">{item.stockAvailable} left</b>
                  </span>
                </div>

                {/* Price Display and Buy action */}
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200/30 mt-2">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-semibold text-rose-600">₹{item.discountedPrice}</span>
                      <span className="text-[9px] text-slate-400 line-through">₹{item.originalPrice}</span>
                    </div>
                    <span className="text-[8px] font-mono text-emerald-600 bg-emerald-500/10 px-1 py-0.2 rounded font-semibold border border-emerald-200">
                      SAVE {Math.round(item.discountRate * 100)}%
                    </span>
                  </div>

                  <button
                    onClick={() => handleBuyNow(item)}
                    disabled={item.stockAvailable <= 0 || isSelected}
                    className={`px-3 py-1.5 rounded-2xl text-[10px] font-semibold transition-all flex items-center space-x-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-slate-900'
                        : 'bg-rose-600 hover:bg-rose-500 text-slate-900'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                        <span>Checkout Complete!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-3.5 h-3.5 text-slate-900" />
                        <span>Buy Discounted</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
