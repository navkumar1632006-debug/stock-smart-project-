import React from 'react';
import { Invoice } from '../../lib/services/invoiceService';
import { Printer, Download, X } from 'lucide-react';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto print:bg-white print:p-0 print:block">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col relative print:shadow-none print:rounded-none print:w-full print:max-w-none">
        
        {/* Controls - Hidden when printing */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 print:hidden bg-slate-50 rounded-t-3xl">
          <h2 className="font-bold text-slate-800">Invoice Preview</h2>
          <div className="flex space-x-2">
            <button onClick={handlePrint} className="flex items-center space-x-1 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-semibold transition-colors">
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Content */}
        <div className="p-8 sm:p-12 print:p-0 bg-white" id="invoice-printable-area">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-8 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">TAX INVOICE</h1>
              <p className="text-sm font-bold text-slate-500 mt-2">Original for Recipient</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-indigo-600">StockSmart AI Retail</h2>
              <p className="text-sm text-slate-600 mt-1">123 Tech Park, Innovation Hub</p>
              <p className="text-sm text-slate-600">Bengaluru, Karnataka 560001</p>
              <p className="text-sm font-mono text-slate-500 mt-1">GSTIN: 29ABCDE1234F1Z5</p>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-1">
              <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Billed To</p>
              <p className="text-base font-bold text-slate-900">{invoice.customerName}</p>
              <p className="text-sm text-slate-600">{invoice.customerContact}</p>
              {invoice.customerGstin && invoice.customerGstin !== 'Not provided' && (
                <p className="text-sm font-mono text-slate-500 mt-1">GSTIN: {invoice.customerGstin}</p>
              )}
            </div>
            <div className="text-right space-y-1">
              <div className="flex justify-end space-x-4">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Invoice No:</span>
                <span className="text-base font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-end space-x-4">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Date:</span>
                <span className="text-base font-mono font-bold text-slate-900">{new Date(invoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-end space-x-4 mt-2">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Payment:</span>
                <span className="text-sm font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{invoice.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 print:rounded-none print:border-t print:border-b print:border-l-0 print:border-r-0">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 print:bg-transparent border-b border-slate-200">
                <tr className="text-[10px] uppercase font-black tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Item & Description</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">GST %</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(invoice.items || []).map((item, idx) => (
                  <tr key={idx} className="text-sm text-slate-700">
                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">SKU: {item.sku}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono">{(item.unitPrice).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono">{item.taxableValue.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-xs">
                      {item.gstRate}%
                      <div className="text-[9px] text-slate-400 mt-0.5">C:{item.cgst} S:{item.sgst}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-12">
            <div className="w-full max-w-sm bg-slate-50 p-6 rounded-2xl print:bg-transparent print:p-0 print:w-1/2">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Total Taxable Value</span>
                  <span className="font-mono">₹{invoice.totalTaxable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total SGST</span>
                  <span className="font-mono">₹{(invoice.totalGst / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total CGST</span>
                  <span className="font-mono">₹{(invoice.totalGst / 2).toFixed(2)}</span>
                </div>
                {invoice.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount Applied</span>
                    <span className="font-mono">-₹{invoice.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-end border-t border-slate-200 pt-4 mt-4">
                  <span className="text-lg font-bold text-slate-900">Grand Total</span>
                  <span className="text-2xl font-black text-indigo-700 font-mono">₹{invoice.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-6 text-xs text-slate-500">
            <p className="font-bold text-slate-700 mb-1">Terms & Conditions:</p>
            <p>1. Goods once sold will not be taken back or exchanged unless defective.</p>
            <p>2. Subject to local jurisdiction only.</p>
            <p>3. This is a computer generated invoice and does not require a physical signature.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
