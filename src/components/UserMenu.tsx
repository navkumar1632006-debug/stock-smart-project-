import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../lib/api/authApi';
import { User, LogOut, Settings } from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        title={user.email}
      >
        <User className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Signed in as</p>
            <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{user.email}</p>
          </div>
          
          <div className="p-2 space-y-1">
            <button 
              className="w-full text-left px-3 py-2 text-sm text-slate-700 flex items-center space-x-2 hover:bg-slate-50 rounded-xl transition-colors cursor-not-allowed opacity-50"
              disabled
            >
              <Settings className="w-4 h-4" />
              <span>Account Settings</span>
            </button>
            
            <button 
              onClick={async () => {
                await authApi.signOut();
                window.location.reload();
              }}
              className="w-full text-left px-3 py-2 text-sm font-medium text-rose-600 flex items-center space-x-2 hover:bg-rose-50 rounded-xl transition-colors"
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
