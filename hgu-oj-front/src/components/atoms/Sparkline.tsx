import React, { useMemo, useState, useRef } from 'react';

interface SparklineProps {
    data: number[];
    color?: string;
    height?: number;
    width?: number;
    strokeWidth?: number;
    fill?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
    data,
    color = '#3b82f6', // blue-500
    height = 40,
    width = 100,
    strokeWidth = 1.5,
    fill = false,
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const { points, coordinates } = useMemo(() => {
        if (data.length === 0) return { points: '', coordinates: [] };

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1; // Avoid division by zero

        const stepX = width / (data.length - 1 || 1);

        const coords = data.map((value, index) => {
            const x = index * stepX;
            // Invert Y axis because SVG origin is top-left
            const normalizedY = (value - min) / range;
            const y = height - normalizedY * height; // Leave some padding
            return { x, y, value };
        });

        const pointsStr = coords.map(p => `${p.x},${p.y}`).join(' ');

        return { points: pointsStr, coordinates: coords };
    }, [data, height, width]);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current || data.length === 0) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Calculate index based on rendered width
        const index = Math.min(Math.max(Math.round((x / rect.width) * (data.length - 1)), 0), data.length - 1);

        setHoveredIndex(index);
    };

    const handleMouseLeave = () => {
        setHoveredIndex(null);
    };

    const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`, []);

    if (data.length === 0) return null;

    return (
        <div className="relative w-full" style={{ height }}>
            <svg
                ref={svgRef}
                width="100%"
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                className="overflow-visible cursor-crosshair block"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                {fill && (
                    <path
                        d={`M 0,${height} L ${points} L ${width},${height} Z`}
                        fill={`url(#${gradientId})`}
                        stroke="none"
                    />
                )}
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />

                {/* Hover Effects */}
                {hoveredIndex !== null && coordinates[hoveredIndex] && (
                    <g>
                        {/* Vertical Line */}
                        <line
                            x1={coordinates[hoveredIndex].x}
                            y1={0}
                            x2={coordinates[hoveredIndex].x}
                            y2={height}
                            stroke="#9ca3af"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            vectorEffect="non-scaling-stroke"
                        />
                        {/* Point */}
                        <circle
                            cx={coordinates[hoveredIndex].x}
                            cy={coordinates[hoveredIndex].y}
                            r="3"
                            fill={color}
                            stroke="white"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                        />
                    </g>
                )}
            </svg>

            {/* Tooltip */}
            {hoveredIndex !== null && coordinates[hoveredIndex] && (
                <div
                    className="absolute pointer-events-none z-10 bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg transform -translate-x-1/2 -translate-y-full"
                    style={{
                        left: `${(coordinates[hoveredIndex].x / width) * 100}%`,
                        top: `${(coordinates[hoveredIndex].y / height) * 100}%`,
                        marginTop: '-8px',
                    }}
                >
                    {coordinates[hoveredIndex].value}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-900"></div>
                </div>
            )}
        </div>
    );
};
