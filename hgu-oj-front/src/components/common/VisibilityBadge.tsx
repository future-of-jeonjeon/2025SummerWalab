import React from 'react';

type VisibilityBadgeProps = {
  visible: boolean;
};

export const VisibilityBadge: React.FC<VisibilityBadgeProps> = ({ visible }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        visible
          ? 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-500/30'
          : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300 dark:ring-1 dark:ring-slate-500/50'
      }`}
    >
      {visible ? '공개' : '비공개'}
    </span>
  );
};

export default VisibilityBadge;
