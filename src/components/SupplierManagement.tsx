import React, { useState } from 'react';
import { Truck, Plus, Store, Phone, CheckCircle2 } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contact: string;
  category: string;
  status: 'active' | 'inactive';
}

export const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: 'SUP-001', name: 'Metro Wholesale', contact: '9876543210', category: 'Grocery', status: 'active' },
    { id: 'SUP-002', name: 'Amul Distributors', contact: '9988776655', category: 'Dairy', status: 'active' }
  ]);
  const [showAdd, setShowAdd] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newCat, setNewCat] = useState('Grocery');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newContact) return;
    const newSup: Supplier = {
      id: `SUP-00${suppliers.length + 1}`,
      name: newName,
      contact: newContact,
      category: newCat,
      status: 'active'
    };
    setSuppliers([...suppliers, newSup]);
    setNewName('');
    setNewContact('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            Supplier Network
          </h2>
          <p className="text-xs text-slate-500/90 font-mono mt-1">Manage wholesale distributors and D2C brands</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-2xl text-xs font-medium transition flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200/50 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-medium text-slate-800">New Supplier Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500/90">Company Name</label>
              <input 
                required 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-200/50 rounded-2xl px-3 py-2 text-xs text-slate-900" 
                placeholder="e.g. Reliance B2B" 
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500/90">Phone</label>
              <input 
                required 
                value={newContact} 
                onChange={e => setNewContact(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-200/50 rounded-2xl px-3 py-2 text-xs text-slate-900" 
                placeholder="10 digit number" 
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500/90">Category</label>
              <select 
                value={newCat} 
                onChange={e => setNewCat(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-200/50 rounded-2xl px-3 py-2 text-xs text-slate-900"
              >
                <option>Grocery</option>
                <option>Dairy</option>
                <option>Pharmacy</option>
                <option>Bakery</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-2xl text-xs font-medium transition">
              Save Supplier
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(sup => (
          <div key={sup.id} className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/50 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-300 transition">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-200">
                  <Store className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-800">{sup.name}</h4>
                  <span className="text-[10px] text-slate-500/90 font-mono">{sup.id}</span>
                </div>
              </div>
              <span className="bg-emerald-500/10 text-emerald-600 text-[9px] font-semibold uppercase px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {sup.status}
              </span>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200/50/50 pb-2">
                <span className="text-slate-500/90 font-mono">Category</span>
                <span className="text-slate-800 font-medium">{sup.category}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500/90 font-mono">Contact</span>
                <span className="text-slate-800 font-medium flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {sup.contact}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
