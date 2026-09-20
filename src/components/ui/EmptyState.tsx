import React from 'react';
import { cn } from '../../lib/utils';
import { Box } from 'lucide-react'; // Fallback icon if no illustration

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, title = 'No Records Found', description, icon, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-center justify-center p-8 text-center min-h-[300px]', className)}
        {...props}
      >
        <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-slate-50/50">
          {icon || <Box className="h-16 w-16 text-slate-300" strokeWidth={1.5} />}
        </div>
        <h3 className="mb-2 text-lg font-medium text-slate-900">{title}</h3>
        {description && (
          <p className="mb-6 max-w-sm text-sm text-slate-500">{description}</p>
        )}
        {action && <div>{action}</div>}
      </div>
    );
  }
);
EmptyState.displayName = 'EmptyState';
