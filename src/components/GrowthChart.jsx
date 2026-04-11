/**
 * Nami Growth Chart Component
 * 
 * Interactive line chart showing growth of $1 over time.
 * Supports multiple portfolios with tooltips and legends.
 */

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { formatCurrency, formatPercent } from '../calc/backtest';

// Portfolio colors matching our design system
const PORTFOLIO_COLORS = {
  user: '#f97352',      // coral
  benchmark: '#64748b', // nami/slate
  minVariance: '#14b8a6', // teal
  riskParity: '#3b82f6',  // blue
  maxSharpe: '#8b5cf6',   // purple
};

const PORTFOLIO_NAMES = {
  user: 'Your Portfolio',
  benchmark: 'Benchmark',
  minVariance: 'Safer',
  riskParity: 'Balanced',
  maxSharpe: 'Efficient',
};

/**
 * Main growth chart component
 */
export default function GrowthChart({ 
  data, 
  portfolios = ['user', 'benchmark'],
  height = 400,
  showGrid = true,
  initialValue = 10000,
}) {
  const [activePortfolio, setActivePortfolio] = useState(null);
  
  // Transform data for Recharts
  const chartData = useMemo(() => {
    if (!data || !data.dates) return [];
    
    return data.dates.map((date, i) => {
      const point = { date, displayDate: formatDate(date) };
      portfolios.forEach(pKey => {
        if (data[pKey]?.wealth) {
          point[pKey] = data[pKey].wealth[i] * initialValue;
        }
      });
      return point;
    });
  }, [data, portfolios, initialValue]);
  
  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 20000];
    
    let min = Infinity;
    let max = -Infinity;
    
    chartData.forEach(point => {
      portfolios.forEach(pKey => {
        if (point[pKey] !== undefined) {
          min = Math.min(min, point[pKey]);
          max = Math.max(max, point[pKey]);
        }
      });
    });
    
    // Add padding
    const padding = (max - min) * 0.1;
    return [Math.max(0, min - padding), max + padding];
  }, [chartData, portfolios]);
  
  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-nami-50 rounded-xl">
        <p className="text-nami-400">No data available</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e2e8f0" 
              vertical={false}
            />
          )}
          
          <XAxis 
            dataKey="displayDate"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={{ stroke: '#cbd5e1' }}
            axisLine={{ stroke: '#cbd5e1' }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          
          <YAxis 
            domain={yDomain}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={{ stroke: '#cbd5e1' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            width={50}
          />
          
          <Tooltip content={<CustomTooltip initialValue={initialValue} />} />
          
          <ReferenceLine 
            y={initialValue} 
            stroke="#94a3b8" 
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          
          {portfolios.map(pKey => (
            <Line
              key={pKey}
              type="monotone"
              dataKey={pKey}
              name={PORTFOLIO_NAMES[pKey] || pKey}
              stroke={PORTFOLIO_COLORS[pKey] || '#64748b'}
              strokeWidth={activePortfolio === pKey ? 3 : 2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: 'white' }}
              opacity={activePortfolio && activePortfolio !== pKey ? 0.3 : 1}
              onMouseEnter={() => setActivePortfolio(pKey)}
              onMouseLeave={() => setActivePortfolio(null)}
            />
          ))}
          
          <Legend 
            content={<CustomLegend 
              portfolios={portfolios}
              activePortfolio={activePortfolio}
              setActivePortfolio={setActivePortfolio}
            />}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Custom tooltip component
 */
function CustomTooltip({ active, payload, label, initialValue }) {
  if (!active || !payload || payload.length === 0) return null;
  
  // Sort by value descending
  const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
  
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-nami-200 text-sm">
      <div className="text-nami-500 text-xs mb-1.5 font-medium">{label}</div>
      <div className="space-y-1">
        {sorted.map(entry => {
          const returnPct = ((entry.value / initialValue) - 1);
          return (
            <div key={entry.dataKey} className="flex items-center gap-3">
              <div 
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-nami-600 flex-1">{entry.name}</span>
              <span className="font-semibold text-nami-800">
                {formatCurrency(entry.value, 0)}
              </span>
              <span className={`text-xs ${returnPct >= 0 ? 'text-teal-600' : 'text-coral-600'}`}>
                {formatPercent(returnPct, 1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Custom legend component
 */
function CustomLegend({ portfolios, activePortfolio, setActivePortfolio }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
      {portfolios.map(pKey => (
        <button
          key={pKey}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
            transition-all duration-150
            ${activePortfolio === pKey 
              ? 'bg-nami-100' 
              : 'hover:bg-nami-50'
            }
            ${activePortfolio && activePortfolio !== pKey ? 'opacity-40' : ''}
          `}
          onMouseEnter={() => setActivePortfolio(pKey)}
          onMouseLeave={() => setActivePortfolio(null)}
        >
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: PORTFOLIO_COLORS[pKey] }}
          />
          <span className="text-nami-700">{PORTFOLIO_NAMES[pKey] || pKey}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Drawdown chart component
 */
export function DrawdownChart({ 
  data, 
  portfolios = ['user'],
  height = 150,
}) {
  const chartData = useMemo(() => {
    if (!data || !data.dates) return [];
    
    return data.dates.map((date, i) => {
      const point = { date, displayDate: formatDate(date) };
      portfolios.forEach(pKey => {
        if (data[pKey]?.drawdowns) {
          // Convert to negative percentage for display
          point[pKey] = -data[pKey].drawdowns[i] * 100;
        }
      });
      return point;
    });
  }, [data, portfolios]);
  
  if (chartData.length === 0) return null;
  
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0" 
            vertical={false}
          />
          
          <XAxis 
            dataKey="displayDate"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            interval="preserveStartEnd"
            minTickGap={80}
          />
          
          <YAxis 
            domain={['dataMin', 0]}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(val) => `${val.toFixed(0)}%`}
            width={40}
          />
          
          <Tooltip 
            formatter={(val) => [`${val.toFixed(1)}%`, 'Drawdown']}
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
          
          {portfolios.map(pKey => (
            <Area
              key={pKey}
              type="monotone"
              dataKey={pKey}
              stroke={PORTFOLIO_COLORS[pKey]}
              fill={PORTFOLIO_COLORS[pKey]}
              fillOpacity={0.2}
              strokeWidth={1.5}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Simple sparkline component for metric cards
 */
export function Sparkline({ data, color = '#64748b', height = 40 }) {
  if (!data || data.length === 0) return null;
  
  const chartData = data.map((value, i) => ({ i, value }));
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Helper to format dates for display
 */
function formatDate(dateStr) {
  if (!dateStr || dateStr === 'Start') return 'Start';
  
  const [year, month] = dateStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(month, 10) - 1;
  
  return `${monthNames[monthIdx] || month} ${year}`;
}

/**
 * Year-by-year returns bar chart
 */
export function YearlyReturnsChart({ data, portfolioKey = 'user', height = 200 }) {
  if (!data || !data[portfolioKey]?.returns) return null;
  
  // Group returns by year
  const yearlyData = useMemo(() => {
    const returns = data[portfolioKey].returns;
    const dates = data.dates.slice(1); // Skip 'Start'
    
    const byYear = {};
    dates.forEach((date, i) => {
      const year = date.substring(0, 4);
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(returns[i]);
    });
    
    return Object.entries(byYear).map(([year, rets]) => ({
      year,
      return: rets.reduce((acc, r) => acc * (1 + r), 1) - 1,
    }));
  }, [data, portfolioKey]);
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={yearlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis 
          dataKey="year" 
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis 
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
          width={40}
        />
        <Tooltip 
          formatter={(val) => [formatPercent(val, 1), 'Return']}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
        <Area
          type="monotone"
          dataKey="return"
          stroke={PORTFOLIO_COLORS[portfolioKey]}
          fill={PORTFOLIO_COLORS[portfolioKey]}
          fillOpacity={0.3}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
