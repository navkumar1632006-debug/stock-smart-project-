import React, { useState, useEffect } from 'react';
import { BookOpen, UserPlus, PhoneCall, Send, CheckCircle2, AlertTriangle, Search, Clock, Plus } from 'lucide-react';

interface DigitalKhataProps {
  onStateChange?: () => void;
}

export const DigitalKhata: React.FC<DigitalKhataProps> = ({ onStateChange }) => {
  const [khataList, setKhataList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // New entry form state
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAmount, setCustAmount] = useState('');
  
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchKhata = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/khata');
      if (res.ok) {
        const data = await res.json();
        setKhataList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKhata();
  }, []);

  const handleAddKhata = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!custName.trim()) {
      setFeedback("Error: Customer Name is required.");
      return;
    }

    const cleanPhone = custPhone.replace(/[\s\-\+]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
      setFeedback("Error: Please enter a valid phone number (min 10 digits).");
      return;
    }

    const amount = Number(custAmount);
    if (isNaN(amount) || amount <= 0) {
      setFeedback("Error: Outstanding balance must be a valid positive number.");
      return;
    }

    try {
      const res = await fetch('/api/khata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: custName,
          customerPhone: custPhone,
          amountOwed: custAmount
        })
      });

      if (res.ok) {
        setCustName('');
        setCustPhone('');
        setCustAmount('');
        setFeedback("New customer registered in credit register!");
        setTimeout(() => setFeedback(null), 3000);
        fetchKhata();
        if (onStateChange) onStateChange();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemind = async (id: string) => {
    try {
      const res = await fetch('/api/khata/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback(data.message);
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredKhata = khataList.filter(k => 
    k.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.customerPhone.includes(searchQuery)
  );

  const totalOutstanding = khataList.reduce((sum, k) => sum + k.amountOwed, 0);

  return (
    <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 space-y-4">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-200/30 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-indigo-600/10 rounded-2xl border border-indigo-200">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-900 tracking-wider">Digital Khata Credit Register</h3>
            <p className="text-[10px] text-slate-500/90 font-mono">Bahi Khata ledger and payment collections</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-mono text-slate-400 uppercase font-medium">Total Receivables</p>
          <p className="text-sm font-semibold text-emerald-600 font-mono">₹{totalOutstanding}</p>
        </div>
      </div>

      {feedback && (
        <div className={`border rounded-2xl p-3 flex items-start space-x-2 text-[10.5px] font-mono ${
          feedback.startsWith('Error') 
            ? 'bg-rose-50 border-rose-200 text-rose-600' 
            : 'bg-emerald-500/10 border-emerald-200 text-emerald-600'
        }`}>
          {feedback.startsWith('Error') ? (
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid of entry form + list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Log new credit */}
        <div className="bg-slate-50/30 border border-slate-200/30 p-6 rounded-2xl space-y-3">
          <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
            <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Register New Credit (Udhaar)</span>
          </h4>

          <form onSubmit={handleAddKhata} className="space-y-2.5">
            <div>
              <label className="block text-[9px] font-mono uppercase text-slate-400 font-medium mb-1">Customer Name</label>
              <input
                type="text"
                placeholder="Ramesh Patel"
                value={custName}
                onChange={e => setCustName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/30 focus:border-indigo-200 rounded-2xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[9px] font-mono uppercase text-slate-400 font-medium mb-1">Customer Phone Number</label>
              <input
                type="text"
                placeholder="+91 99887 76655"
                value={custPhone}
                onChange={e => setCustPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/30 focus:border-indigo-200 rounded-2xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[9px] font-mono uppercase text-slate-400 font-medium mb-1">Outstanding Balance (₹)</label>
              <input
                type="number"
                placeholder="850"
                value={custAmount}
                onChange={e => setCustAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/30 focus:border-indigo-200 rounded-2xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-white hover:bg-slate-100 border border-slate-200/50 text-slate-900 py-2 rounded-2xl text-xs font-medium uppercase transition"
            >
              Add Ledger Entry
            </button>
          </form>
        </div>

        {/* Right: Active Ledgers List */}
        <div className="bg-slate-50/30 border border-slate-200/30 p-6 rounded-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Udhaar Book Directory</span>
              </h4>
              {/* Simple Search bar */}
              <div className="relative">
                <Search className="absolute left-2 top-1.5 w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-200/30 text-[10px] text-slate-900 pl-6 pr-2 py-1 rounded-xl w-28 focus:outline-none focus:border-indigo-200"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
              {isLoading ? (
                <p className="text-[10px] text-slate-400 font-mono text-center py-4">Syncing credit books with Cloud SQL...</p>
              ) : filteredKhata.length > 0 ? (
                filteredKhata.map((khata) => (
                  <div key={khata.id} className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 p-2.5 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-medium text-slate-800">{khata.customerName}</span>
                        <span className={`text-[8px] font-mono px-1 rounded font-semibold ${
                          khata.paymentStatus === 'Overdue' 
                            ? 'bg-rose-50 border border-rose-200 text-rose-600'
                            : khata.paymentStatus === 'Pending'
                            ? 'bg-amber-50 border border-amber-200 text-amber-600'
                            : 'bg-emerald-500/10 border border-emerald-200 text-emerald-600'
                        }`}>
                          {khata.paymentStatus}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-slate-400 font-mono">{khata.customerPhone}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right font-mono">
                        <p className="font-semibold text-slate-700">₹{khata.amountOwed}</p>
                        <p className="text-[8px] text-slate-400">{khata.lastTransactionDate}</p>
                      </div>

                      {khata.amountOwed > 0 && (
                        <button
                          onClick={() => handleRemind(khata.id)}
                          title="Send payment link & WhatsApp alert"
                          className="p-1.5 bg-emerald-500/10 border border-emerald-200 hover:bg-emerald-500/20 text-emerald-600 rounded-xl transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 text-center py-4">No pending udhaars found matching criteria.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
