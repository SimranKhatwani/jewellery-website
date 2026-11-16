import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';

export const SalesTrendChart = ({
  trends = [],
  groupBy = 'day',
  onGroupByChange,
  currencySymbol = '₹',
  isLoading = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;
  };

  // Dimensions & bounds
  const { maxSales, points, totalPeriodSales, totalPeriodUnits } = useMemo(() => {
    if (!trends || trends.length === 0) {
      return { maxSales: 0, points: [], totalPeriodSales: 0, totalPeriodUnits: 0 };
    }

    let max = 0;
    let sumSales = 0;
    let sumUnits = 0;

    trends.forEach((t) => {
      const val = Number(t.salesAmount) || 0;
      if (val > max) max = val;
      sumSales += val;
      sumUnits += Number(t.unitsSold) || 0;
    });

    // Ensure ceiling has headroom
    const ceiling = max > 0 ? Math.ceil(max * 1.15) : 1000;

    return {
      maxSales: ceiling,
      points: trends,
      totalPeriodSales: sumSales,
      totalPeriodUnits: sumUnits,
    };
  }, [trends]);

  // Chart SVG sizing
  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Compute SVG line path coordinates
  const coordinates = useMemo(() => {
    if (!points || points.length === 0) return [];
    const step = points.length > 1 ? chartW / (points.length - 1) : chartW / 2;

    return points.map((p, i) => {
      const x = paddingX + i * step;
      const salesRatio = maxSales > 0 ? (Number(p.salesAmount) || 0) / maxSales : 0;
      const y = height - paddingY - salesRatio * chartH;
      return { x, y, data: p };
    });
  }, [points, maxSales, chartW, chartH, height, paddingX, paddingY]);

  const linePath = useMemo(() => {
    if (coordinates.length === 0) return '';
    return coordinates.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');
  }, [coordinates]);

  const areaPath = useMemo(() => {
    if (coordinates.length === 0) return '';
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    const bottom = height - paddingY;
    return `${linePath} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
  }, [linePath, coordinates, height, paddingY]);

  const activePoint = hoveredIndex !== null && coordinates[hoveredIndex] ? coordinates[hoveredIndex] : null;

  return (
    <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-6 shadow-xs">
      {/* Top Header & Group By Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D7C5AF]/30 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#A85F49]" />
            <h3 className="text-base font-serif text-[#2D2A26] tracking-wide">
              Sales Trends & Revenue Flow
            </h3>
          </div>
          <p className="text-xs text-[#8E8172] mt-0.5">
            Total for period: <span className="font-medium text-[#2D2A26]">{formatMoney(totalPeriodSales)}</span> • {totalPeriodUnits} units sold
          </p>
        </div>

        {/* Interval Selector */}
        <div className="inline-flex rounded-xs border border-[#D7C5AF]/60 p-0.5 bg-[#FAF7F2] text-xs">
          {[
            { id: 'day', label: 'Daily' },
            { id: 'week', label: 'Weekly' },
            { id: 'month', label: 'Monthly' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onGroupByChange && onGroupByChange(mode.id)}
              className={`px-3 py-1 font-medium transition-colors rounded-xs ${
                groupBy === mode.id
                  ? 'bg-[#A85F49] text-[#FFFFFF] shadow-2xs'
                  : 'text-[#8E8172] hover:text-[#2D2A26]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative mt-6 select-none">
        {isLoading ? (
          <div className="h-60 flex items-center justify-center text-xs text-[#8E8172]">
            <div className="w-5 h-5 border-2 border-[#A85F49] border-t-transparent rounded-full animate-spin mr-2" />
            Loading trend data...
          </div>
        ) : points.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-xs text-[#8E8172] bg-[#FAF7F2]/50 border border-dashed border-[#D7C5AF]/60 rounded-xs">
            <Calendar className="w-8 h-8 text-[#D7C5AF] mb-2" />
            <p className="font-medium text-[#2D2A26]">No sales data recorded</p>
            <p className="text-[11px] text-[#8E8172] mt-0.5">No placed orders found in the selected range.</p>
          </div>
        ) : (
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-56 sm:h-64 overflow-visible"
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id="terracottaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A85F49" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#A85F49" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = height - paddingY - ratio * chartH;
                const value = Math.round(maxSales * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={width - paddingX}
                      y2={y}
                      stroke="#E5D8CC"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 6}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#8E8172"
                      className="font-mono"
                    >
                      {formatMoney(value)}
                    </text>
                  </g>
                );
              })}

              {/* Area & Line */}
              {areaPath && <path d={areaPath} fill="url(#terracottaGradient)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#A85F49"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Points */}
              {coordinates.map((coord, idx) => {
                const isHovered = hoveredIndex === idx;
                return (
                  <g key={idx} className="cursor-pointer">
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={isHovered ? 5.5 : 3}
                      fill={isHovered ? '#A85F49' : '#FFFFFF'}
                      stroke="#A85F49"
                      strokeWidth={isHovered ? '2.5' : '1.8'}
                      className="transition-all duration-150"
                    />
                    {/* Invisible hover zone */}
                    <rect
                      x={coord.x - (chartW / (points.length * 2) || 15)}
                      y={0}
                      width={chartW / points.length || 30}
                      height={height}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIndex(idx)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between px-10 text-[10px] text-[#8E8172] mt-2 font-mono">
              <span>{points[0]?.label || ''}</span>
              {points.length > 2 && (
                <span>{points[Math.floor(points.length / 2)]?.label || ''}</span>
              )}
              <span>{points[points.length - 1]?.label || ''}</span>
            </div>

            {/* Floating Tooltip */}
            {activePoint && (
              <div
                className="absolute z-10 pointer-events-none bg-[#2D2A26] text-[#FFFFFF] rounded-xs px-3 py-2 text-xs shadow-lg transition-all transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${(activePoint.x / width) * 100}%`,
                  top: `${(activePoint.y / height) * 100}%`,
                  marginTop: '-12px',
                }}
              >
                <p className="font-semibold text-[#D7C5AF] text-[11px] border-b border-[#FFFFFF]/10 pb-1">
                  {activePoint.data.label || activePoint.data.date}
                </p>
                <div className="mt-1 space-y-0.5 text-[11px]">
                  <p className="flex justify-between gap-4">
                    <span className="text-[#8E8172]">Sales:</span>
                    <span className="font-medium text-[#FFFFFF]">
                      {formatMoney(activePoint.data.salesAmount)}
                    </span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-[#8E8172]">Collected:</span>
                    <span className="text-[#A3E635]">
                      {formatMoney(activePoint.data.collectedAmount)}
                    </span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-[#8E8172]">Pending:</span>
                    <span className="text-[#FBBF24]">
                      {formatMoney(activePoint.data.pendingAmount)}
                    </span>
                  </p>
                  <p className="flex justify-between gap-4 pt-1 border-t border-[#FFFFFF]/10 text-[10px]">
                    <span className="text-[#8E8172]">Orders:</span>
                    <span>
                      {activePoint.data.ordersCount} ({activePoint.data.unitsSold} units)
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
