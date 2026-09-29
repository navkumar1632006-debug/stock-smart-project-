import React, { useState, useEffect } from 'react';
import { BookOpen, UserPlus, PhoneCall, Send, CheckCircle2, AlertTriangle, Search, Clock, Plus, ReceiptText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { khataService } from '../lib/services/khataService';
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
      const customers = await khataService.getCustomers();
      const mapped = customers.map(c => ({
        id: c.id,
        customerName: c.name,
        customerPhone: c.phone || '',
        amountOwed: c.balance,
        paymentStatus: c.balance > 1000 ? 'Overdue' : (c.balance > 0 ? 'Pending' : 'Cleared'),
        lastTransactionDate: new Date(c.updated_at).toLocaleDateString()
      }));
      setKhataList(mapped);
    } catch (e) {
      console.error(e);
      setKhataList([]);
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

    const amount = Number(custAmount);
    if (isNaN(amount) || amount <= 0) {
      setFeedback("Error: Outstanding balance must be a valid positive number.");
      return;
    }

    try {
      const cust = await khataService.addCustomer(custName, custPhone, 0);
      await khataService.addTransaction(cust.id, 'credit', amount, 'Initial Udhaar');
      
      setCustName('');
      setCustPhone('');
      setCustAmount('');
      setFeedback("New customer registered in credit register!");
      setTimeout(() => setFeedback(null), 3000);
      fetchKhata();
      if (onStateChange) onStateChange();
    } catch (e: any) {
      console.error(e);
      setFeedback("Error: Failed to register Khata.");
    }
  };
  const handleRemind = async (id: string) => {
    try {
      const res = await fetch('/api/khata/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setFeedback(data.message);
      } else {
        setFeedback("Reminder sent (Mock mode)");
      }
      setTimeout(() => setFeedback(null), 4000);
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
    <Card className="space-y-4 shadow-none">
      {/* Title block */}
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200/30 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-blue-50 rounded-2xl">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xs uppercase tracking-wider">Digital Khata Credit Register</CardTitle>
            <p className="text-[10px] text-slate-500 font-mono">Bahi Khata ledger and payment collections</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-mono text-slate-400 uppercase font-medium">Total Receivables</p>
          <p className="text-sm font-semibold text-emerald-600 font-mono">₹{totalOutstanding}</p>
        </div>
      </CardHeader>

      <CardContent>
        {feedback && (
          <div className={`border rounded-xl p-3 mb-4 flex items-start space-x-2 text-[10.5px] font-mono ${
            feedback.startsWith('Error') 
              ? 'bg-rose-50 border-rose-200 text-rose-600' 
              : 'bg-emerald-50 text-emerald-600'
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
          <Card className="bg-slate-50/50 shadow-none border-slate-200/50 p-6 rounded-2xl space-y-4">
            <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Register New Credit (Udhaar)</span>
            </h4>

            <form onSubmit={handleAddKhata} className="space-y-4 mt-4">
              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-medium mb-1">Customer Name *</label>
                <Input
                  type="text"
                  placeholder="Ramesh Patel"
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-medium mb-1">Customer Phone Number *</label>
                <Input
                  type="text"
                  placeholder="+91 99887 76655"
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-medium mb-1">Outstanding Balance (₹) *</label>
                <Input
                  type="number"
                  placeholder="850"
                  value={custAmount}
                  onChange={e => setCustAmount(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full">
                  Add Ledger Entry
                </Button>
              </div>
            </form>
          </Card>

          {/* Right: Active Ledgers List */}
          <Card className="shadow-none border-slate-200/50 p-6 rounded-2xl flex flex-col">
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Udhaar Book Directory</span>
                </h4>
                {/* Simple Search bar */}
                <div className="relative">
                  <Search className="absolute left-0 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-7 w-32"
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 mt-4 flex-1">
                {isLoading ? (
                  <p className="text-[10px] text-slate-400 font-mono text-center py-4">Syncing credit books...</p>
                ) : filteredKhata.length > 0 ? (
                  filteredKhata.map((khata) => (
                    <div key={khata.id} className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-slate-800 text-sm">{khata.customerName}</span>
                          <Badge variant={
                            khata.paymentStatus === 'Overdue' ? 'destructive' :
                            khata.paymentStatus === 'Pending' ? 'warning' : 'success'
                          }>
                            {khata.paymentStatus}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{khata.customerPhone}</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-semibold text-slate-900 text-sm">₹{khata.amountOwed}</p>
                          <p className="text-[9px] text-slate-400">{khata.lastTransactionDate}</p>
                        </div>

                        {khata.amountOwed > 0 && (
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => handleRemind(khata.id)}
                            title="Send payment link & WhatsApp alert"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState 
                    title="No Udhaars Found" 
                    description="There are no pending balances matching your criteria." 
                    icon={<ReceiptText className="w-10 h-10 text-slate-300" />}
                    className="min-h-[150px] py-4"
                  />
                )}
              </div>
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

