import React from 'react';
import type { TagColorScheme } from '../../utils/tagColor';

interface TagChipProps {
  label: string;
  active?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  colorScheme?: TagColorScheme;
}

const DEFAULT_SCHEME: TagColorScheme = {
  background: '#E5E7EB',
  hoverBackground: '#D1D5DB',
  activeBackground: '#1D4ED8',
  text: '#1F2937',
  activeText: '#FFFFFF',
  border: '#D1D5DB',
  activeBorder: '#153E75',
};

export const TagChip: React.FC<TagChipProps> = ({
  label,
  active = false,
  onClick,
  className = '',
  colorScheme,
}) => {
  const scheme = colorScheme ?? DEFAULT_SCHEME;

  const baseClass = [
    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
    'transition-colors whitespace-nowrap select-none focus:outline-none',
  ].join(' ');

  const style = (
    active
      ? {
          backgroundColor: scheme.activeBackground,
          color: scheme.activeText ?? '#FFFFFF',
          borderColor: scheme.activeBorder ?? scheme.activeBackground,
          borderWidth: '2px',
          borderStyle: 'solid',
        }
      : {
          backgroundColor: scheme.background,
          color: scheme.text,
          borderColor: scheme.border,
          borderWidth: '1.5px',
          borderStyle: 'solid',
        }
  ) as React.CSSProperties;

  const hoverClass = active ? 'hover:brightness-[0.93]' : 'hover:brightness-95';

  if (typeof onClick === 'function') {
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        style={style}
        className={`${baseClass} ${hoverClass} active:brightness-90 ${className}`.trim()}
      >
        {label}
      </button>
    );
  }

  return (
    <span style={style} className={`${baseClass} ${className}`.trim()}>
      {label}
    </span>
  );
};

export default TagChip;
