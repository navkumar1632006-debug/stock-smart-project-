import React, { useEffect, useState, useRef } from 'react';
import { storeService, Store } from '../lib/services/storeService';
import { Store as StoreIcon, ChevronDown, Plus, Loader2, LogOut } from 'lucide-react';
import { authApi } from '../lib/api/authApi';

export const StoreSelector: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadStores = async () => {
    try {
      setIsLoading(true);
      const allStores = await storeService.getStores();
      const currentId = await storeService.getCurrentStoreId();
      setStores(allStores);
      setActiveStoreId(currentId);
    } catch (e) {
      console.error("Store load failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
    
    const handleStoreChange = () => loadStores();
    window.addEventListener('store-changed', handleStoreChange);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('store-changed', handleStoreChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = async (id: string) => {
    await storeService.setActiveStore(id);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 border border-slate-200/50 rounded-xl bg-slate-50 animate-pulse">
        <StoreIcon className="w-4 h-4 text-slate-400" />
        <div className="h-4 w-20 bg-slate-200 rounded"></div>
      </div>
    );
  }

  const activeStore = stores.find(s => s.id === activeStoreId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors focus:outline-none"
      >
        <StoreIcon className="w-4 h-4 text-indigo-600" />
        <span className="text-xs font-bold text-indigo-900 tracking-tight">
          {activeStore?.name || 'Select Store'}
        </span>
        <ChevronDown className={`w-3 h-3 text-indigo-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="py-2 max-h-60 overflow-y-auto">
            {stores.map(store => (
              <button
                key={store.id}
                onClick={() => handleSelect(store.id)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-3 transition-colors ${activeStoreId === store.id ? 'bg-indigo-50/70 text-indigo-700 font-semibold border-l-2 border-indigo-500' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent'}`}
              >
                <StoreIcon className={`w-4 h-4 ${activeStoreId === store.id ? 'opacity-100' : 'opacity-50'}`} />
                <span className="truncate">{store.name}</span>
              </button>
            ))}
          </div>
          
          <div className="border-t border-slate-100 p-2 space-y-1 bg-slate-50/50">
            <button 
              onClick={() => {
                const name = prompt("Enter new store name:");
                if (name && name.trim()) {
                  storeService.createStore(name.trim(), 'Headquarters').then(() => {
                    loadStores();
                  }).catch(e => alert(e.message));
                }
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-indigo-600 flex items-center space-x-2 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Store</span>
            </button>
            
            <button 
              onClick={async () => {
                await authApi.signOut();
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 flex items-center space-x-2 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
