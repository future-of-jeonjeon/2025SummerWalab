import React, { useMemo, useState } from 'react';
import TagChip from '../atoms/TagChip';
import type { TagColorScheme } from '../../utils/tagColor';

interface TagFilterBarProps {
  tags: Array<{
    name: string;
    count: number;
    colorScheme: TagColorScheme;
  }>;
  selectedTags: string[];
  onToggle: (tag: string) => void;
  onClear?: () => void;
  showReset?: boolean;
  className?: string;
  collapsible?: boolean;
}

const isSelected = (tag: string, selected: string[]) => selected.includes(tag);

const MAX_COLLAPSED_COUNT = 8;

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  tags,
  selectedTags,
  onToggle,
  onClear,
  showReset = false,
  className = '',
  collapsible = true,
}) => {
  if (!tags.length) {
    return null;
  }

  const [expanded, setExpanded] = useState(false);

  const isCollapsible = collapsible && tags.length > MAX_COLLAPSED_COUNT;

  const { visibleTags, hiddenCount } = useMemo(() => {
    if (!isCollapsible) {
      return { visibleTags: tags, hiddenCount: 0 };
    }
    if (expanded) {
      return { visibleTags: tags, hiddenCount: 0 };
    }
    return {
      visibleTags: tags.slice(0, MAX_COLLAPSED_COUNT),
      hiddenCount: tags.length - MAX_COLLAPSED_COUNT,
    };
  }, [tags, expanded, isCollapsible]);

  const toggleExpanded = () => {
    if (!isCollapsible) return;
    setExpanded((prev) => !prev);
  };

  return (
    <section aria-label="문제 태그 필터" className={className}>
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
        {onClear && showReset && (
          <button
            type="button"
            onClick={() => {
              if (!onClear) {
                return;
              }
              onClear();
            }}
            title="선택된 태그 모두 해제"
            aria-label="선택된 태그 모두 해제"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500"
          >
            ↺
          </button>
        )}
        {visibleTags.map(({ name, count, colorScheme }) => (
          <TagChip
            key={name}
            label={`${name} (${count})`}
            active={isSelected(name, selectedTags)}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(name);
            }}
            colorScheme={colorScheme}
          />
        ))}
        {isCollapsible && hiddenCount > 0 && !expanded && (
          <button
            type="button"
            onClick={toggleExpanded}
            className="inline-flex items-center justify-center rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 focus:outline-none"
            aria-label={`태그 ${hiddenCount}개 더 보기`}
          >
            … {hiddenCount}
          </button>
        )}
        {isCollapsible && expanded && (
          <button
            type="button"
            onClick={toggleExpanded}
            className="inline-flex items-center justify-center rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 focus:outline-none"
            aria-label="태그 접기"
          >
            접기
          </button>
        )}
      </div>
    </section>
  );
};

export default TagFilterBar;
