import { loyaltyService } from '../lib/services/loyaltyService';
import React, { useState, useEffect } from 'react';
import { Award, Star, Flame, Ticket, Loader, Sparkles } from 'lucide-react';

export const LoyaltyManager: React.FC = () => {
  const [loyaltyList, setLoyaltyList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLoyalty = async () => {
    setIsLoading(true);
    try {
      const customers = await loyaltyService.getCustomers();
      const mapped = customers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        points: c.points_balance,
        tier: c.points_balance >= 500 ? 'Gold' : (c.points_balance >= 200 ? 'Silver' : 'Bronze'),
        cashbackEarned: (c.points_balance * 0.5).toFixed(2)
      }));
      setLoyaltyList(mapped);
    } catch (e) {
      console.error(e);
      setLoyaltyList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyalty();
  }, []);

  return (
    <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 space-y-4">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-200/30 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-indigo-600/10 rounded-2xl border border-indigo-200">
            <Award className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-900 tracking-wider">Customer Loyalty Program</h3>
            <p className="text-[10px] text-slate-500/90 font-mono">Points ledger, tier structures, and cashback claims</p>
          </div>
        </div>
        <span className="text-[9px] font-mono text-emerald-600 bg-emerald-500/10 border border-emerald-200 px-2 py-0.5 rounded-full font-medium uppercase">
          Loyalty Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Active loyalty ledger */}
        <div className="bg-slate-50/30 border border-slate-200/30 p-6 rounded-2xl space-y-3">
          <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
            <Star className="w-3.5 h-3.5 text-indigo-600" />
            <span>Top Store Customers & Ranks</span>
          </h4>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {isLoading ? (
              <Loader className="w-5 h-5 text-indigo-600 animate-spin mx-auto my-4" />
            ) : loyaltyList.length > 0 ? (
              loyaltyList.map((customer) => (
                <div key={customer.id} className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 p-2.5 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-medium text-slate-800">{customer.name}</span>
                      <span className={`text-[8px] px-1.5 py-0.2 rounded font-semibold ${
                        customer.tier === 'Gold' 
                          ? 'bg-amber-100 text-amber-600 border border-amber-200'
                          : customer.tier === 'Silver'
                          ? 'bg-slate-400/20 text-slate-700 border border-slate-400/30'
                          : 'bg-orange-800/20 text-orange-400 border border-orange-800/30'
                      }`}>
                        {customer.tier}
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-400 font-mono">{customer.phone}</p>
                  </div>

                  <div className="text-right font-mono text-xs text-slate-700">
                    <p className="font-semibold text-indigo-600">{customer.points} PTS</p>
                    <p className="text-[9px] text-emerald-600 font-medium">₹{customer.cashbackEarned} Cashback</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-400 text-center py-4">No customers in program yet.</p>
            )}
          </div>
        </div>

        {/* Right: Loyalty promotion criteria */}
        <div className="bg-slate-50/30 border border-slate-200/30 p-6 rounded-2xl flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
              <Ticket className="w-3.5 h-3.5 text-emerald-600" />
              <span>Configure Reward Milestones</span>
            </h4>

            <div className="space-y-2 text-xs font-mono text-slate-500/90">
              <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-2.5 rounded-2xl border border-slate-200/30 flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-700">Gold Tier (500+ Pts)</p>
                  <p className="text-[9px] text-slate-400">Free home delivery & 5% instant cashback</p>
                </div>
                <span className="p-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl text-[9px] font-medium">ACTIVE</span>
              </div>

              <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-2.5 rounded-2xl border border-slate-200/30 flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-700">Silver Tier (200+ Pts)</p>
                  <p className="text-[9px] text-slate-400">2% instant cashback on staples/dairy</p>
                </div>
                <span className="p-1 bg-slate-500/10 text-slate-700 border border-slate-500/20 rounded-xl text-[9px] font-medium">ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-200 p-2.5 rounded-2xl text-[9px] font-mono text-emerald-600 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>System recommends launching a 100 extra points weekend coupon on slow categories.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

