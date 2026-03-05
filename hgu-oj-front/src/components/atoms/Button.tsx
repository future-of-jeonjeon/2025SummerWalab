import React from 'react';
import { BaseComponentProps } from '../../types';

type NativeButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

interface ButtonProps extends BaseComponentProps, NativeButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading = false,
  type = 'button',
  className = '',
  ...rest
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-300 dark:bg-blue-700 dark:hover:bg-blue-600 dark:text-slate-100 dark:focus-visible:ring-blue-500',
    secondary: 'bg-sky-100 text-blue-700 hover:bg-sky-200 focus-visible:ring-sky-200 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700 dark:focus-visible:ring-blue-500',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50 focus-visible:ring-blue-300 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200',
    ghost: 'text-blue-600 hover:bg-blue-50 focus-visible:ring-blue-200 dark:text-blue-300 dark:hover:bg-blue-900/20',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      {...rest}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};
