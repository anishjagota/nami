/**
 * Nami Monte Carlo Chart Components
 * 
 * Visualizations for Monte Carlo simulation results:
 * - Fan chart showing percentile bands over time
 * - Terminal wealth histogram
 * - Sample paths overlay
 */

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from 'recharts';
import { formatSimCurrency } from '../calc/monteCarlo';

/**
 * Fan chart showing percentile bands over time
 */
export function MonteCarloFanChart({ 
  fanData, 
  height = 350,
  showSamplePaths = false,
  samplePaths = [],
  initialWealth = 100000,
}) {
  if (!fanData || fanData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-nami-50 rounded-xl">
        <p className="text-nami-400">Run simulation to see results</p>
      </div>
    );
  }
  
  // Sample a few paths to show
  const pathsToShow = useMemo(() => {
    if (!showSamplePaths || samplePaths.length === 0) return [];
    // Pick 20 random paths for illustration
    const indices = [];
    const step = Math.floor(samplePaths.length / 20);
    for (let i = 0; i < 20; i++) {
      indices.push(i * step);
    }
    return indices.map(i => samplePaths[i]);
  }, [showSamplePaths, samplePaths]);
  
  // Add sample paths to data if showing
  const chartData = useMemo(() => {
    if (!showSamplePaths) return fanData;
    
    return fanData.map((point, t) => {
      const newPoint = { ...point };
      pathsToShow.forEach((path, i) => {
        newPoint[`path${i}`] = path[t];
      });
      return newPoint;
    });
  }, [fanData, showSamplePaths, pathsToShow]);
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="fanGradientOuter" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97352" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#f97352" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fanGradientInner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97352" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#f97352" stopOpacity={0.25} />
          </linearGradient>
        </defs>
        
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        
        <XAxis 
          dataKey="year"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={{ stroke: '#cbd5e1' }}
          axisLine={{ stroke: '#cbd5e1' }}
          tickFormatter={(val) => `Y${val}`}
        />
        
        <YAxis 
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={{ stroke: '#cbd5e1' }}
          axisLine={{ stroke: '#cbd5e1' }}
          tickFormatter={(val) => formatSimCurrency(val, true)}
          width={60}
        />
        
        <Tooltip content={<FanChartTooltip initialWealth={initialWealth} />} />
        
        {/* 5th-95th percentile band (outer) */}
        <Area
          type="monotone"
          dataKey="p95"
          stroke="none"
          fill="url(#fanGradientOuter)"
          fillOpacity={1}
        />
        <Area
          type="monotone"
          dataKey="p5"
          stroke="none"
          fill="white"
          fillOpacity={1}
        />
        
        {/* 25th-75th percentile band (inner) */}
        <Area
          type="monotone"
          dataKey="p75"
          stroke="none"
          fill="url(#fanGradientInner)"
          fillOpacity={1}
        />
        <Area
          type="monotone"
          dataKey="p25"
          stroke="none"
          fill="white"
          fillOpacity={1}
        />
        
        {/* Sample paths if showing */}
        {showSamplePaths && pathsToShow.map((_, i) => (
          <Line
            key={`path${i}`}
            type="monotone"
            dataKey={`path${i}`}
            stroke="#f97352"
            strokeWidth={0.5}
            strokeOpacity={0.3}
            dot={false}
          />
        ))}
        
        {/* Median line */}
        <Line
          type="monotone"
          dataKey="p50"
          stroke="#f97352"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: '#f97352', strokeWidth: 2, stroke: 'white' }}
        />
        
        {/* 25th and 75th percentile lines */}
        <Line
          type="monotone"
          dataKey="p25"
          stroke="#f97352"
          strokeWidth={1}
          strokeDasharray="4 4"
          dot={false}
          strokeOpacity={0.6}
        />
        <Line
          type="monotone"
          dataKey="p75"
          stroke="#f97352"
          strokeWidth={1}
          strokeDasharray="4 4"
          dot={false}
          strokeOpacity={0.6}
        />
        
        {/* Initial wealth reference line */}
        <ReferenceLine 
          y={initialWealth} 
          stroke="#64748b" 
          strokeDasharray="4 4"
          strokeWidth={1}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/**
 * Custom tooltip for fan chart
 */
function FanChartTooltip({ active, payload, label, initialWealth }) {
  if (!active || !payload || payload.length === 0) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;
  
  const medianReturn = ((data.p50 / initialWealth) - 1) * 100;
  
  return (
    <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-nami-200 text-sm">
      <div className="font-medium text-nami-800 mb-2">
        Year {data.year.toFixed(1)}
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-nami-500">95th percentile</span>
          <span className="font-medium text-nami-700">{formatSimCurrency(data.p95)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-nami-500">75th percentile</span>
          <span className="font-medium text-nami-700">{formatSimCurrency(data.p75)}</span>
        </div>
        <div className="flex justify-between gap-4 py-1 border-y border-nami-100">
          <span className="text-coral-600 font-medium">Median (50th)</span>
          <span className="font-bold text-coral-600">{formatSimCurrency(data.p50)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-nami-500">25th percentile</span>
          <span className="font-medium text-nami-700">{formatSimCurrency(data.p25)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-nami-500">5th percentile</span>
          <span className="font-medium text-nami-700">{formatSimCurrency(data.p5)}</span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-nami-100 text-xs text-nami-500">
        Median return: <span className={medianReturn >= 0 ? 'text-teal-600' : 'text-coral-600'}>
          {medianReturn >= 0 ? '+' : ''}{medianReturn.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/**
 * Terminal wealth histogram
 */
export function WealthHistogram({ 
  histogram, 
  height = 200,
  initialWealth = 100000,
  median = null,
}) {
  if (!histogram || histogram.length === 0) {
    return null;
  }
  
  // Find max count for scaling
  const maxCount = Math.max(...histogram.map(b => b.count));
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={histogram}
        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        barCategoryGap={1}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        
        <XAxis 
          dataKey="binMid"
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          tickFormatter={(val) => formatSimCurrency(val, true)}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        
        <YAxis 
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          tickFormatter={(val) => `${((val / maxCount) * 100).toFixed(0)}%`}
          width={35}
        />
        
        <Tooltip content={<HistogramTooltip />} />
        
        {/* Initial wealth reference */}
        <ReferenceLine 
          x={initialWealth} 
          stroke="#64748b" 
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{ 
            value: 'Start', 
            position: 'top',
            fontSize: 10,
            fill: '#64748b',
          }}
        />
        
        {/* Median reference */}
        {median && (
          <ReferenceLine 
            x={median} 
            stroke="#f97352" 
            strokeWidth={2}
            label={{ 
              value: 'Median', 
              position: 'top',
              fontSize: 10,
              fill: '#f97352',
            }}
          />
        )}
        
        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
          {histogram.map((entry, index) => (
            <Cell 
              key={`cell-${index}`}
              fill={entry.binMid >= initialWealth ? '#14b8a6' : '#f97352'}
              fillOpacity={0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Custom tooltip for histogram
 */
function HistogramTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;
  
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-nami-200 text-xs">
      <div className="font-medium text-nami-700 mb-1">
        {formatSimCurrency(data.binStart)} – {formatSimCurrency(data.binEnd)}
      </div>
      <div className="text-nami-500">
        {data.count} simulations ({data.percentage.toFixed(1)}%)
      </div>
    </div>
  );
}

/**
 * Outcome probability card
 */
export function OutcomeProbability({ 
  probability, 
  label, 
  sublabel,
  variant = 'neutral', // 'success', 'warning', 'neutral'
}) {
  const colors = {
    success: 'bg-teal-50 border-teal-200 text-teal-700',
    warning: 'bg-coral-50 border-coral-200 text-coral-700',
    neutral: 'bg-nami-50 border-nami-200 text-nami-700',
  };
  
  const probPercent = (probability * 100).toFixed(0);
  
  return (
    <div className={`p-4 rounded-xl border ${colors[variant]}`}>
      <div className="text-3xl font-bold mb-1">
        {probPercent}%
      </div>
      <div className="text-sm font-medium">{label}</div>
      {sublabel && (
        <div className="text-xs opacity-70 mt-0.5">{sublabel}</div>
      )}
    </div>
  );
}

/**
 * Percentile outcome card
 */
export function PercentileOutcome({
  value,
  percentile,
  label,
  initialWealth,
}) {
  const returnPct = ((value / initialWealth) - 1) * 100;
  const isPositive = returnPct >= 0;
  
  const percentileLabels = {
    5: { name: 'Worst Case', color: 'coral' },
    25: { name: 'Conservative', color: 'nami' },
    50: { name: 'Median', color: 'coral' },
    75: { name: 'Optimistic', color: 'teal' },
    95: { name: 'Best Case', color: 'teal' },
  };
  
  const config = percentileLabels[percentile] || { name: label, color: 'nami' };
  
  const colorClasses = {
    coral: 'border-coral-200 bg-coral-50',
    teal: 'border-teal-200 bg-teal-50',
    nami: 'border-nami-200 bg-nami-50',
  };
  
  return (
    <div className={`p-4 rounded-xl border ${colorClasses[config.color]}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs font-medium text-nami-500 uppercase tracking-wide">
          {config.name}
        </span>
        <span className="text-xs text-nami-400">({percentile}th)</span>
      </div>
      <div className="text-xl font-bold text-nami-800">
        {formatSimCurrency(value)}
      </div>
      <div className={`text-sm font-medium mt-1 ${isPositive ? 'text-teal-600' : 'text-coral-600'}`}>
        {isPositive ? '+' : ''}{returnPct.toFixed(0)}% return
      </div>
    </div>
  );
}
