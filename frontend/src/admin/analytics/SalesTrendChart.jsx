import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart2,
  LineChart,
  Table as TableIcon,
  Calendar,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';

export const SalesTrendChart = ({
  trends,
  groupBy = 'day',
  onGroupByChange,
  currencySymbol = '₹',
  isLoading = false,
}) => {
  const safeTrends = trends || [];

  // Display mode: 'bar' (default columns), 'curve' (smooth spline), 'table' (ledger)
  const [viewMode, setViewMode] = useState('bar');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const formatMoney = (val, maxDecimals = 0) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', {
      maximumFractionDigits: maxDecimals,
    })}`;
  };

  // Aggregations & Metrics
  const {
    maxSales,
    points,
    totalPeriodSales,
    totalCollected,
    totalPending,
    totalPeriodUnits,
    totalOrders,
    peakPeriod,
    activePeriodsCount,
  } = useMemo(() => {
    if (!safeTrends || safeTrends.length === 0) {
      return {
        maxSales: 0,
        points: [],
        totalPeriodSales: 0,
        totalCollected: 0,
        totalPending: 0,
        totalPeriodUnits: 0,
        totalOrders: 0,
        peakPeriod: null,
        activePeriodsCount: 0,
      };
    }

    let max = 0;
    let sumSales = 0;
    let sumCollected = 0;
    let sumPending = 0;
    let sumUnits = 0;
    let sumOrders = 0;
    let peak = null;
    let activeCount = 0;

    safeTrends.forEach((t) => {
      const sales = Number(t.salesAmount) || 0;
      const collected = Number(t.collectedAmount) || 0;
      const pending = Number(t.pendingAmount) || 0;
      const units = Number(t.unitsSold) || 0;
      const orders = Number(t.ordersCount) || 0;

      if (sales > max) {
        max = sales;
        peak = t;
      }
      if (sales > 0 || orders > 0) {
        activeCount++;
      }

      sumSales += sales;
      sumCollected += collected;
      sumPending += pending;
      sumUnits += units;
      sumOrders += orders;
    });

    const ceiling = max > 0 ? Math.ceil(max * 1.2) : 1000;

    return {
      maxSales: ceiling,
      points: safeTrends,
      totalPeriodSales: sumSales,
      totalCollected: sumCollected,
      totalPending: sumPending,
      totalPeriodUnits: sumUnits,
      totalOrders: sumOrders,
      peakPeriod: peak,
      activePeriodsCount: activeCount,
    };
  }, [safeTrends]);

  // Chart Geometry
  const width = 860;
  const height = 260;
  const paddingX = 50;
  const paddingY = 32;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Bar Layout Computations
  const barElements = useMemo(() => {
    if (!points || points.length === 0) return [];
    const count = points.length;
    const slotWidth = chartW / count;
    const barWidth = Math.max(5, Math.min(22, slotWidth * 0.62));

    return points.map((p, i) => {
      const slotX = paddingX + i * slotWidth;
      const centerX = slotX + slotWidth / 2;
      const barX = centerX - barWidth / 2;
      const sales = Number(p.salesAmount) || 0;
      const ratio = maxSales > 0 ? sales / maxSales : 0;
      const barHeight = sales > 0 ? Math.max(4, ratio * chartH) : 3;
      const barY = height - paddingY - barHeight;

      return {
        slotX,
        slotWidth,
        barX,
        barY,
        barWidth,
        barHeight,
        hasSales: sales > 0,
        data: p,
      };
    });
  }, [points, maxSales, chartW, chartH, height, paddingX, paddingY]);

  // Spline Curve Computations
  const splineCoordinates = useMemo(() => {
    if (!points || points.length === 0) return [];
    const count = points.length;
    const step = count > 1 ? chartW / (count - 1) : chartW / 2;

    return points.map((p, i) => {
      const x = paddingX + i * step;
      const sales = Number(p.salesAmount) || 0;
      const ratio = maxSales > 0 ? sales / maxSales : 0;
      const y = height - paddingY - ratio * chartH;
      return { x, y, data: p };
    });
  }, [points, maxSales, chartW, chartH, height, paddingX, paddingY]);

  // Build Smooth Cubic Bézier Curve String
  const splinePath = useMemo(() => {
    if (splineCoordinates.length === 0) return '';
    if (splineCoordinates.length === 1) {
      return `M ${splineCoordinates[0].x} ${splineCoordinates[0].y}`;
    }

    let d = `M ${splineCoordinates[0].x} ${splineCoordinates[0].y}`;
    for (let i = 0; i < splineCoordinates.length - 1; i++) {
      const current = splineCoordinates[i];
      const next = splineCoordinates[i + 1];
      const controlX = (current.x + next.x) / 2;
      d += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  }, [splineCoordinates]);

  const splineAreaPath = useMemo(() => {
    if (!splinePath || splineCoordinates.length === 0) return '';
    const first = splineCoordinates[0];
    const last = splineCoordinates[splineCoordinates.length - 1];
    const bottom = height - paddingY;
    return `${splinePath} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
  }, [splinePath, splineCoordinates, height, paddingY]);

  // Active hover data resolution
  const activeData =
    hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  const averagePerInterval =
    points.length > 0 ? Math.round(totalPeriodSales / points.length) : 0;

  return (
    <div className="bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-xs p-6 shadow-xs select-none">
      {/* 1. Header & Multi-View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-[#D7C5AF]/30 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#A85F49]" />
            <h3 className="text-base font-serif text-[#2D2A26] tracking-wide">
              Sales Trends & Revenue Flow
            </h3>
          </div>
          <p className="text-xs text-[#8E8172] mt-0.5">
            Temporal distribution of gross orders, confirmed collections and pending settlement
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Display Mode Toggle (Bars vs Curve vs Table) */}
          <div className="inline-flex rounded-xs border border-[#D7C5AF]/60 p-0.5 bg-[#FAF7F2] text-xs">
            <button
              type="button"
              onClick={() => setViewMode('bar')}
              className={`px-2.5 py-1 font-medium transition-colors rounded-xs flex items-center gap-1.5 ${
                viewMode === 'bar'
                  ? 'bg-[#A85F49] text-[#FFFFFF] shadow-2xs'
                  : 'text-[#8E8172] hover:text-[#2D2A26]'
              }`}
              title="Column Bar Chart"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Columns</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('curve')}
              className={`px-2.5 py-1 font-medium transition-colors rounded-xs flex items-center gap-1.5 ${
                viewMode === 'curve'
                  ? 'bg-[#A85F49] text-[#FFFFFF] shadow-2xs'
                  : 'text-[#8E8172] hover:text-[#2D2A26]'
              }`}
              title="Smooth Spline Curve"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Curve</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 font-medium transition-colors rounded-xs flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-[#A85F49] text-[#FFFFFF] shadow-2xs'
                  : 'text-[#8E8172] hover:text-[#2D2A26]'
              }`}
              title="Ledger Table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Ledger</span>
            </button>
          </div>

          {/* Time Interval Selector (Daily, Weekly, Monthly) */}
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
                    ? 'bg-[#2D2A26] text-[#FFFFFF] shadow-2xs'
                    : 'text-[#8E8172] hover:text-[#2D2A26]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Executive Metric Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="bg-[#FAF7F2] border border-[#D7C5AF]/40 rounded-xs p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#8E8172] font-medium block">
            Net Revenue
          </span>
          <span className="text-lg font-light text-[#2D2A26] mt-0.5 block font-mono">
            {formatMoney(totalPeriodSales)}
          </span>
          <span className="text-[11px] text-[#8E8172]">
            {totalOrders} {totalOrders === 1 ? 'order' : 'orders'} placed
          </span>
        </div>

        <div className="bg-[#FAF7F2] border border-[#D7C5AF]/40 rounded-xs p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#8E8172] font-medium block">
            Confirmed Collected
          </span>
          <span className="text-lg font-light text-[#27AE60] mt-0.5 block font-mono">
            {formatMoney(totalCollected)}
          </span>
          <span className="text-[11px] text-[#8E8172]">
            Pending: {formatMoney(totalPending)}
          </span>
        </div>

        <div className="bg-[#FAF7F2] border border-[#D7C5AF]/40 rounded-xs p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#8E8172] font-medium block">
            Period Run Rate
          </span>
          <span className="text-lg font-light text-[#2D2A26] mt-0.5 block font-mono">
            {formatMoney(averagePerInterval)}
          </span>
          <span className="text-[11px] text-[#8E8172]">
            Average / {groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month'}
          </span>
        </div>

        <div className="bg-[#FAF7F2] border border-[#D7C5AF]/40 rounded-xs p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#8E8172] font-medium block">
            Selling Activity
          </span>
          <span className="text-lg font-light text-[#A85F49] mt-0.5 block font-mono">
            {activePeriodsCount} of {points.length}
          </span>
          <span className="text-[11px] text-[#8E8172]">
            {peakPeriod && peakPeriod.salesAmount > 0
              ? `Peak: ${peakPeriod.label || peakPeriod.date} (${formatMoney(peakPeriod.salesAmount)})`
              : 'Zero peak sales in range'}
          </span>
        </div>
      </div>

      {/* 3. Color Legend Badges */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-[#D7C5AF]/20">
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#A85F49]" />
            <span className="text-[#2D2A26]">Net Sales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#27AE60]" />
            <span className="text-[#8E8172]">Collected Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#B8860B]" />
            <span className="text-[#8E8172]">Pending Collection</span>
          </div>
        </div>

        {activeData && (
          <span className="text-[11px] text-[#A85F49] font-medium hidden sm:inline">
            Inspecting: {activeData.label || activeData.date}
          </span>
        )}
      </div>

      {/* 4. Main Chart / Table Presentation */}
      <div className="relative mt-4 select-none min-h-[260px]">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-xs text-[#8E8172]">
            <div className="w-5 h-5 border-2 border-[#A85F49] border-t-transparent rounded-full animate-spin mr-2" />
            Loading trend data...
          </div>
        ) : points.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-[#8E8172] bg-[#FAF7F2]/40 border border-dashed border-[#D7C5AF]/60 rounded-xs">
            <Calendar className="w-8 h-8 text-[#D7C5AF] mb-2" />
            <p className="font-medium text-[#2D2A26]">No timeline intervals found</p>
            <p className="text-[11px] text-[#8E8172] mt-0.5">
              Select another date range to inspect sales trends.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* LEDGER TABLE VIEW */
          <div className="overflow-x-auto max-h-72 border border-[#D7C5AF]/40 rounded-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] sticky top-0 z-10 border-b border-[#D7C5AF]/40 text-[#8E8172] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Period / Date</th>
                  <th className="py-2.5 px-3 font-medium text-right">Orders</th>
                  <th className="py-2.5 px-3 font-medium text-right">Units</th>
                  <th className="py-2.5 px-3 font-medium text-right">Net Sales</th>
                  <th className="py-2.5 px-3 font-medium text-right">Collected</th>
                  <th className="py-2.5 px-3 font-medium text-right">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7C5AF]/20">
                {points.map((row, idx) => (
                  <tr
                    key={row.date || idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`transition-colors ${
                      hoveredIndex === idx
                        ? 'bg-[#FAF7F2]'
                        : row.salesAmount > 0
                        ? 'bg-[#FFFFFF] font-medium'
                        : 'bg-[#FFFFFF] text-[#8E8172]'
                    }`}
                  >
                    <td className="py-2 px-3 font-mono text-[11px]">
                      {row.label || row.date}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{row.ordersCount}</td>
                    <td className="py-2 px-3 text-right font-mono">{row.unitsSold}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#A85F49] font-medium">
                      {formatMoney(row.salesAmount, 2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[#27AE60]">
                      {formatMoney(row.collectedAmount, 2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[#B8860B]">
                      {formatMoney(row.pendingAmount, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* SVG CHART VIEW (Columns or Curve) */
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-60 sm:h-64 overflow-visible"
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id="terracottaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A85F49" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#A85F49" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A85F49" />
                  <stop offset="100%" stopColor="#8D4B37" />
                </linearGradient>
                <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C2735C" />
                  <stop offset="100%" stopColor="#A85F49" />
                </linearGradient>
              </defs>

              {/* Horizontal Reference Gridlines */}
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
                      stroke="#EFE7DE"
                      strokeDasharray={ratio === 0 ? 'none' : '3 3'}
                      strokeWidth={ratio === 0 ? '1.5' : '1'}
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#8E8172"
                      className="font-mono font-medium"
                    >
                      {formatMoney(value)}
                    </text>
                  </g>
                );
              })}

              {/* ----------------- MODE A: COLUMN BARS ----------------- */}
              {viewMode === 'bar' && (
                <g>
                  {barElements.map((bar, idx) => {
                    const isHovered = hoveredIndex === idx;
                    return (
                      <g key={idx} className="cursor-pointer">
                        {/* Interactive Vertical Column Backdrop */}
                        <rect
                          x={bar.slotX}
                          y={paddingY}
                          width={bar.slotWidth}
                          height={chartH}
                          fill={isHovered ? '#A85F49' : 'transparent'}
                          opacity={isHovered ? 0.08 : 0}
                          className="transition-opacity duration-150"
                          onMouseEnter={() => setHoveredIndex(idx)}
                        />

                        {/* The Actual Bar or Zero-Tick */}
                        {bar.hasSales ? (
                          <rect
                            x={bar.barX}
                            y={bar.barY}
                            width={bar.barWidth}
                            height={bar.barHeight}
                            rx="3"
                            ry="3"
                            fill={
                              isHovered
                                ? 'url(#barGradientHover)'
                                : 'url(#barGradientActive)'
                            }
                            className="transition-all duration-200"
                            onMouseEnter={() => setHoveredIndex(idx)}
                          />
                        ) : (
                          /* Subtle baseline indicator for 0-sales days */
                          <rect
                            x={bar.barX}
                            y={height - paddingY - 3}
                            width={bar.barWidth}
                            height={3}
                            rx="1.5"
                            ry="1.5"
                            fill={isHovered ? '#A85F49' : '#E5D8CC'}
                            className="transition-colors duration-150"
                            onMouseEnter={() => setHoveredIndex(idx)}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* ----------------- MODE B: SMOOTH SPLINE CURVE ----------------- */}
              {viewMode === 'curve' && (
                <g>
                  {splineAreaPath && (
                    <path d={splineAreaPath} fill="url(#terracottaGradient)" />
                  )}
                  {splinePath && (
                    <path
                      d={splinePath}
                      fill="none"
                      stroke="#A85F49"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Active Point on Hover ONLY (eliminates string of 30 dots) */}
                  {hoveredIndex !== null && splineCoordinates[hoveredIndex] && (
                    <g>
                      {/* Vertical Guide Line */}
                      <line
                        x1={splineCoordinates[hoveredIndex].x}
                        y1={paddingY}
                        x2={splineCoordinates[hoveredIndex].x}
                        y2={height - paddingY}
                        stroke="#A85F49"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                        opacity="0.6"
                      />
                      {/* Concentric Illuminated Dot */}
                      <circle
                        cx={splineCoordinates[hoveredIndex].x}
                        cy={splineCoordinates[hoveredIndex].y}
                        r="6"
                        fill="#A85F49"
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                      />
                    </g>
                  )}

                  {/* Transparent hover slice detectors */}
                  {splineCoordinates.map((coord, idx) => {
                    const step = chartW / splineCoordinates.length;
                    return (
                      <rect
                        key={idx}
                        x={coord.x - step / 2}
                        y={paddingY}
                        width={step}
                        height={chartH}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(idx)}
                      />
                    );
                  })}
                </g>
              )}
            </svg>

            {/* X-axis Clean Timeline Labels */}
            <div className="flex justify-between px-12 text-[10px] text-[#8E8172] mt-2 font-mono">
              <span>{points[0]?.label || points[0]?.date || ''}</span>
              {points.length > 2 && (
                <span>
                  {points[Math.floor(points.length / 2)]?.label ||
                    points[Math.floor(points.length / 2)]?.date ||
                    ''}
                </span>
              )}
              <span>
                {points[points.length - 1]?.label ||
                  points[points.length - 1]?.date ||
                  ''}
              </span>
            </div>

            {/* Modern Refined Floating Tooltip */}
            {activeData && hoveredIndex !== null && (
              <div
                className="absolute z-20 pointer-events-none bg-[#2D2A26] border border-[#D7C5AF]/30 text-[#FFFFFF] rounded-xs px-3.5 py-2.5 text-xs shadow-xl transition-all transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${
                    viewMode === 'bar' && barElements[hoveredIndex]
                      ? (barElements[hoveredIndex].barX / width) * 100
                      : splineCoordinates[hoveredIndex]
                      ? (splineCoordinates[hoveredIndex].x / width) * 100
                      : 50
                  }%`,
                  top: `${
                    viewMode === 'bar' && barElements[hoveredIndex]
                      ? Math.max(15, (barElements[hoveredIndex].barY / height) * 100)
                      : splineCoordinates[hoveredIndex]
                      ? Math.max(15, (splineCoordinates[hoveredIndex].y / height) * 100)
                      : 50
                  }%`,
                  marginTop: '-14px',
                }}
              >
                <div className="flex items-center justify-between gap-4 border-b border-[#FFFFFF]/15 pb-1.5 mb-1.5">
                  <span className="font-semibold text-[#D7C5AF] text-[11px] font-mono">
                    {activeData.label || activeData.date}
                  </span>
                  <span className="text-[10px] text-[#8E8172]">
                    {activeData.ordersCount} {activeData.ordersCount === 1 ? 'order' : 'orders'}
                  </span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between gap-5">
                    <span className="text-[#8E8172]">Net Sales:</span>
                    <span className="font-semibold text-[#FFFFFF] font-mono">
                      {formatMoney(activeData.salesAmount, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-5">
                    <span className="text-[#8E8172]">Collected:</span>
                    <span className="text-[#4ADE80] font-mono font-medium">
                      {formatMoney(activeData.collectedAmount, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-5">
                    <span className="text-[#8E8172]">Pending:</span>
                    <span className="text-[#FBBF24] font-mono font-medium">
                      {formatMoney(activeData.pendingAmount, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-5 pt-1 border-t border-[#FFFFFF]/10 text-[10px]">
                    <span className="text-[#8E8172]">Units Sold:</span>
                    <span className="text-[#D7C5AF] font-mono">{activeData.unitsSold}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
