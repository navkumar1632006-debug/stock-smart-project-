import React from 'react';
import { cn } from '../../lib/utils';
import { 
  Activity, 
  Package, 
  ShoppingBag, 
  Sparkles, 
  BookOpen, 
  Shield, 
  ScrollText, 
  BarChart3, 
  Settings, 
  Truck,
  X
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'marketplace' | 'assistant';
export type DashboardSection = 'overview' | 'inventory' | 'khata' | 'rbac' | 'reports' | 'settings' | 'suppliers' | 'audit';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  dashboardSection: DashboardSection;
  setDashboardSection: (section: DashboardSection) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  dashboardSection,
  setDashboardSection,
  isOpen,
  setIsOpen,
  className
}) => {
  const isDashboardActive = activeTab === 'dashboard';

  const navigateTo = (tab: ActiveTab, section?: DashboardSection) => {
    setActiveTab(tab);
    if (section) setDashboardSection(section);
    // Close sidebar on mobile after navigating
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const NavItem = ({ 
    icon: Icon, 
    label, 
    isActive, 
    onClick 
  }: { 
    icon: any; 
    label: string; 
    isActive: boolean; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-colors mb-1',
        isActive 
          ? 'bg-blue-50 text-blue-700 font-medium' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <Icon className={cn('w-5 h-5', isActive ? 'text-blue-600' : 'text-slate-400')} />
      <span>{label}</span>
    </button>
  );

  const NavGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">StockSmart</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3">
          <NavGroup title="Operations">
            <NavItem 
              icon={Activity} 
              label="Overview" 
              isActive={isDashboardActive && dashboardSection === 'overview'} 
              onClick={() => navigateTo('dashboard', 'overview')} 
            />
            <NavItem 
              icon={Package} 
              label="Inventory" 
              isActive={isDashboardActive && dashboardSection === 'inventory'} 
              onClick={() => navigateTo('dashboard', 'inventory')} 
            />
            <NavItem 
              icon={Truck} 
              label="Suppliers" 
              isActive={isDashboardActive && dashboardSection === 'suppliers'} 
              onClick={() => navigateTo('dashboard', 'suppliers')} 
            />
          </NavGroup>

          <NavGroup title="Intelligence">
            <NavItem 
              icon={Sparkles} 
              label="AI Assistant" 
              isActive={activeTab === 'assistant'} 
              onClick={() => navigateTo('assistant')} 
            />
          </NavGroup>

          <NavGroup title="Business">
            <NavItem 
              icon={BookOpen} 
              label="Customers / Khata" 
              isActive={isDashboardActive && dashboardSection === 'khata'} 
              onClick={() => navigateTo('dashboard', 'khata')} 
            />
            <NavItem 
              icon={ShoppingBag} 
              label="Hyperlocal App" 
              isActive={activeTab === 'marketplace'} 
              onClick={() => navigateTo('marketplace')} 
            />
          </NavGroup>

          <NavGroup title="System">
            <NavItem 
              icon={Shield} 
              label="Staff & Family" 
              isActive={isDashboardActive && dashboardSection === 'rbac'} 
              onClick={() => navigateTo('dashboard', 'rbac')} 
            />
            <NavItem 
              icon={ScrollText} 
              label="Ledger Audit" 
              isActive={isDashboardActive && dashboardSection === 'audit'} 
              onClick={() => navigateTo('dashboard', 'audit')} 
            />
            <NavItem 
              icon={BarChart3} 
              label="Business Reports" 
              isActive={isDashboardActive && dashboardSection === 'reports'} 
              onClick={() => navigateTo('dashboard', 'reports')} 
            />
            <NavItem 
              icon={Settings} 
              label="Settings" 
              isActive={isDashboardActive && dashboardSection === 'settings'} 
              onClick={() => navigateTo('dashboard', 'settings')} 
            />
          </NavGroup>
        </div>
      </aside>
    </>
  );
};
