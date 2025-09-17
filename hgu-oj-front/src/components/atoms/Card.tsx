import React from 'react';
import { BaseComponentProps } from '../../types';

interface CardProps extends BaseComponentProps {
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  appearance?: 'default' | 'inverted';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  shadow = 'md',
  hover = false,
  appearance = 'default',
  onClick,
  className = '',
}) => {
  const baseColorClasses = appearance === 'inverted'
    ? 'bg-slate-900 border border-slate-700 text-slate-100'
    : 'bg-white border border-gray-200 text-gray-900';
  const baseClasses = `rounded-lg ${baseColorClasses}`;
  
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  const hoverClasses = hover ? 'hover:shadow-lg transition-shadow duration-200' : '';

  const classes = `${baseClasses} ${paddingClasses[padding]} ${shadowClasses[shadow]} ${hoverClasses} ${className}`;

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
};
