import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          error ? 'border-rose-500 focus:border-rose-500' : '',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
