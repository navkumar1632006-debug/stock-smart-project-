import React from 'react';

interface DashboardPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const DashboardPageHeader: React.FC<DashboardPageHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};
