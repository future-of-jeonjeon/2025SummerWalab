import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  indicatorClassName?: string;
}

const sanitize = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  className,
  indicatorClassName,
}) => {
  const sanitizedMax = sanitize(max);
  const hasPositiveRange = sanitizedMax > 0;
  const denominator = hasPositiveRange ? sanitizedMax : 1;
  const safeValue = Math.min(Math.max(0, sanitize(value)), hasPositiveRange ? sanitizedMax : denominator);
  const percentage = hasPositiveRange ? (safeValue / denominator) * 100 : 0;
  const ariaValueNow = hasPositiveRange ? safeValue : 0;
  const ariaValueMax = hasPositiveRange ? sanitizedMax : 1;
  const ariaValueText = `${Math.round(safeValue)} / ${hasPositiveRange ? sanitizedMax : 0}`;

  return (
    <div
      className={`overflow-hidden rounded-full bg-gray-200 ${className ?? ''}`.trim()}
      role="progressbar"
      aria-valuenow={ariaValueNow}
      aria-valuemin={0}
      aria-valuemax={ariaValueMax}
      aria-valuetext={ariaValueText}
    >
      <div
        className={`h-3 w-full bg-emerald-500 transition-[width] duration-300 ease-out ${indicatorClassName ?? ''}`.trim()}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;
