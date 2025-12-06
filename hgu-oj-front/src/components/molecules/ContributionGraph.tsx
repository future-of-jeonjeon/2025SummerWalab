import React, { useMemo } from 'react';

interface ContributionData {
    date: string; // YYYY-MM-DD
    count: number;
}

interface ContributionGraphProps {
    data: ContributionData[];
    endDate?: Date;
    totalDays?: number;
}

export const ContributionGraph: React.FC<ContributionGraphProps> = ({
    data,
    endDate = new Date(),
    totalDays = 365,
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [visibleWeeks, setVisibleWeeks] = React.useState<number>(52);

    // Helper to format date as YYYY-MM-DD
    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    // Generate the grid data
    const gridData = useMemo(() => {
        const days = [];
        const dataMap = new Map(data.map((item) => [item.date, item.count]));

        // Start from 365 days ago (or totalDays)
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - totalDays + 1);

        for (let i = 0; i < totalDays; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            const dateStr = formatDate(currentDate);
            days.push({
                date: dateStr,
                count: dataMap.get(dateStr) || 0,
                dayOfWeek: currentDate.getDay(), // 0 = Sunday
            });
        }
        return days;
    }, [data, endDate, totalDays]);

    // Group by weeks for column-based rendering
    const weeks = useMemo(() => {
        const weeksArray = [];
        let currentWeek: typeof gridData = [];

        // We need to pad the first week if it doesn't start on Sunday
        if (gridData.length > 0) {
            const firstDay = gridData[0];
            for (let i = 0; i < firstDay.dayOfWeek; i++) {
                currentWeek.push(null as any); // Placeholder
            }
        }

        gridData.forEach((day) => {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weeksArray.push(currentWeek);
                currentWeek = [];
            }
        });

        // Push remaining days
        if (currentWeek.length > 0) {
            weeksArray.push(currentWeek);
        }

        return weeksArray;
    }, [gridData]);

    React.useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                // 12px cell + 4px gap = 16px per column
                // Reserve some space for padding/margins if needed
                const maxWeeks = Math.floor(width / 16);
                setVisibleWeeks(Math.max(1, maxWeeks));
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const displayWeeks = useMemo(() => {
        // Take the last N weeks that fit
        return weeks.slice(-visibleWeeks);
    }, [weeks, visibleWeeks]);

    const getColor = (count: number) => {
        if (count === 0) return 'bg-gray-100';
        if (count <= 2) return 'bg-green-200';
        if (count <= 5) return 'bg-green-400';
        if (count <= 9) return 'bg-green-600';
        return 'bg-green-800';
    };

    const getTooltip = (date: string, count: number) => {
        return `${count} contributions on ${date}`;
    };

    return (
        <div ref={containerRef} className="w-full flex flex-col items-center">
            <div className="flex gap-1 justify-center">
                {displayWeeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                        {week.map((day, dayIndex) => {
                            if (!day) {
                                return <div key={`placeholder-${dayIndex}`} className="w-3 h-3" />;
                            }
                            return (
                                <div
                                    key={day.date}
                                    className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
                                    title={getTooltip(day.date, day.count)}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="w-full flex items-center justify-end gap-2 mt-2 text-xs text-gray-500 pr-1">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-gray-100" />
                    <div className="w-3 h-3 rounded-sm bg-green-200" />
                    <div className="w-3 h-3 rounded-sm bg-green-400" />
                    <div className="w-3 h-3 rounded-sm bg-green-600" />
                    <div className="w-3 h-3 rounded-sm bg-green-800" />
                </div>
                <span>More</span>
            </div>
        </div>
    );
};
