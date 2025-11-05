import React from 'react';
import { Card } from '../atoms/Card';

interface RankingSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const RankingSection: React.FC<RankingSectionProps> = ({
  title,
  description,
  action,
  children,
  className = '',
}) => (
  <Card padding="lg" className={`space-y-6 ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    <div>{children}</div>
  </Card>
);

export default RankingSection;
