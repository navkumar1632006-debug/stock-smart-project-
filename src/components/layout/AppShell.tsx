import React, { useState } from 'react';
import { Sidebar, ActiveTab, DashboardSection } from './Sidebar';
import { Menu } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AppShellProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  dashboardSection: DashboardSection;
  setDashboardSection: (section: DashboardSection) => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  fontScale?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  setActiveTab,
  dashboardSection,
  setDashboardSection,
  headerActions,
  children,
  fontScale
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={cn(
      "flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans transition-all duration-300",
      fontScale ? "text-lg" : "text-sm"
    )}>
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dashboardSection={dashboardSection}
        setDashboardSection={setDashboardSection}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center">
            <button 
              className="lg:hidden p-2 -ml-2 mr-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="lg:hidden text-lg font-bold text-slate-900 tracking-tight">StockSmart</span>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap py-2 ml-auto">
            {headerActions}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
