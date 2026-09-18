import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, AlertTriangle, PackageSearch, Clock, Sparkles } from 'lucide-react';
import { notificationService, AppNotification } from '../lib/services/notificationService';
import { storeService } from '../lib/services/storeService';
import { useAuth } from '../hooks/useAuth';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let sub: { unsubscribe: () => void } | null = null;

    const loadInitial = async () => {
      try {
        if (!user) return;
        const storeId = await storeService.getCurrentStoreId();
        
        // Load history
        const history = await notificationService.getNotifications();
        setNotifications(history);

        // Sub realtime
        sub = notificationService.subscribeToNotifications(storeId, user.id, (newNotif) => {
          setNotifications(prev => [newNotif, ...prev]);
        });
      } catch (e) {
        console.error('Failed to init notifications:', e);
      }
    };

    loadInitial();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (sub) sub.unsubscribe();
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    try {
      await notificationService.markAsRead(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    try {
      await notificationService.markAllAsRead();
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('stock')) return <PackageSearch className="w-4 h-4 text-amber-500" />;
    if (type.includes('expiry')) return <Clock className="w-4 h-4 text-orange-500" />;
    if (type.includes('forecast')) return <Sparkles className="w-4 h-4 text-indigo-500" />;
    if (type.includes('success')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    return <AlertTriangle className="w-4 h-4 text-slate-500" />;
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Notifications</h3>
              <p className="text-[10px] font-mono text-slate-500">Real-time alerts</p>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Bell className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-500">No notifications yet</p>
                <p className="text-[10px] font-mono text-slate-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    className={`p-4 hover:bg-slate-50 transition-colors flex gap-3 ${!n.readAt ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => !n.readAt && handleMarkAsRead(n.id)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className={`text-xs font-semibold truncate ${!n.readAt ? 'text-slate-900' : 'text-slate-700'}`}>
                          {n.title}
                        </p>
                        <span className="text-[9px] font-mono text-slate-400 flex-shrink-0 ml-2">
                          {formatTime(n.createdAt)}
                        </span>
                      </div>
                      <p className={`text-[11px] leading-relaxed line-clamp-2 ${!n.readAt ? 'text-slate-700' : 'text-slate-500'}`}>
                        {n.message}
                      </p>
                    </div>
                    {!n.readAt && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shadow-sm shadow-indigo-500/50" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
