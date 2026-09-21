import React, { useState, useEffect } from 'react';
import { invoiceService, Invoice } from '../../lib/services/invoiceService';
import { FileText, Download, Printer, Search, ArrowRight } from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';

export const InvoiceHistory: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await invoiceService.listInvoices();
      setInvoices(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'PGRST205') {
        setError('Database migration required: The invoices table has not been created yet.');
      } else {
        setError(err.message || 'Failed to load invoices.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const fullInvoice = await invoiceService.getInvoice(invoiceId);
      setSelectedInvoice(fullInvoice);
    } catch (err) {
      alert('Failed to load invoice details.');
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Invoice & Tax Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-1">Official GST compliant invoice records.</p>
        </div>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search Invoice No or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {error ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl flex flex-col items-center justify-center h-48">
          <FileText className="w-8 h-8 text-rose-400 mb-3" />
          <p className="text-rose-700 font-semibold mb-1">Unable to load invoices</p>
          <p className="text-xs text-rose-500 font-mono text-center max-w-md">{error}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto border border-slate-200/50 rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200/50">
              <tr className="text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">GST</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading invoices...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No invoices found.</td></tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3 px-4 text-slate-600">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-700">{inv.customerName}</td>
                    <td className="py-3 px-4 text-right text-slate-500">₹{inv.totalTaxable.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-500">₹{inv.totalGst.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">₹{inv.grandTotal.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => handleViewInvoice(inv.id)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-bold transition-colors inline-flex items-center space-x-1 opacity-0 group-hover:opacity-100"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedInvoice && (
        <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
};
