import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase tracking-wider';
    
    const variants = {
      default: 'border-transparent bg-indigo-100 text-indigo-700',
      secondary: 'border-transparent bg-slate-100 text-slate-700',
      destructive: 'border-transparent bg-rose-100 text-rose-700',
      success: 'border-transparent bg-emerald-100 text-emerald-700',
      warning: 'border-transparent bg-amber-100 text-amber-700',
      outline: 'text-slate-900 border border-slate-200',
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
