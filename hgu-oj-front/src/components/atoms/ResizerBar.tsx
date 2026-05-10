import React from 'react';

type ResizerBarProps = {
  orientation: 'vertical' | 'horizontal';
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
};

export const ResizerBar: React.FC<ResizerBarProps> = ({
  orientation,
  className = '',
  style,
  title,
  onMouseDown,
  onDoubleClick,
  children,
}) => {
  const baseClass = orientation === 'vertical' ? 'oj-resizer-v' : 'oj-resizer-h';

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={`${baseClass} ${className}`.trim()}
      style={style}
      title={title}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </div>
  );
};

