import React from 'react';

import { GoalSidebar } from './GoalSidebar';

interface SidebarGoalColumnProps {
  children: React.ReactNode;
  className?: string;
  goalClassName?: string;
  menuStickyClassName?: string;
  topOffsetPx?: number;
  gapPx?: number;
}

export const SidebarGoalColumn: React.FC<SidebarGoalColumnProps> = ({
  children,
  className = '',
  goalClassName = 'hidden lg:block',
}) => {
  return (
    <div className={className}>
      <div>
        {children}
      </div>
      <GoalSidebar className={goalClassName} />
    </div>
  );
};
