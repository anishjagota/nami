/**
 * Nami Portfolio Summary Component
 * 
 * Displays current portfolio composition and key stats.
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePortfolio } from '../context/PortfolioContext';
import { getAssetById } from '../data/assetUniverse';
import { formatWeight } from '../utils/portfolio';

export default function PortfolioSummary() {
  const { 
    selectedAssets, 
    weights, 
    totalWeight, 
    isValid,
    positionCount,
  } = usePortfolio();
  
  if (selectedAssets.length === 0 || totalWeight === 0) {
    return null;
  }
  
  // Prepare chart data
  const chartData = selectedAssets
    .filter(id => weights[id] > 0)
    .map(id => {
      const asset = getAssetById(id);
      return {
        id,
        name: asset.shortName,
        ticker: asset.ticker,
        value: weights[id],
        color: asset.color,
      };
    })
    .sort((a, b) => b.value - a.value);
  
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-nami-700 mb-4">
        Portfolio Allocation
      </h3>
      
      <div className="flex gap-6">
        {/* Pie chart */}
        <div className="w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={55}
                paddingAngle={2}
                strokeWidth={0}
              >
                {chartData.map((entry) => (
                  <Cell 
                    key={entry.id} 
                    fill={entry.color}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex-1 min-w-0">
          <div className="space-y-2">
            {chartData.map(item => (
              <div 
                key={item.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-nami-700 truncate">
                    {item.ticker}
                  </span>
                </div>
                <span className="text-sm font-medium text-nami-800 flex-shrink-0">
                  {formatWeight(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-nami-100 flex justify-between text-sm">
        <div>
          <span className="text-nami-500">Positions</span>
          <span className="ml-2 font-semibold text-nami-800">{positionCount}</span>
        </div>
        <div className={isValid ? 'text-teal-600' : 'text-coral-600'}>
          <span>Total</span>
          <span className="ml-2 font-semibold">{formatWeight(totalWeight)}</span>
        </div>
      </div>
    </div>
  );
}

// Custom tooltip for pie chart
function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="bg-nami-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
      <div className="font-medium">{data.name}</div>
      <div className="text-nami-300">{formatWeight(data.value)}</div>
    </div>
  );
}

// Compact horizontal bar version
export function PortfolioBar() {
  const { selectedAssets, weights, totalWeight } = usePortfolio();
  
  if (totalWeight === 0) return null;
  
  const sortedAssets = selectedAssets
    .filter(id => weights[id] > 0)
    .map(id => ({ id, weight: weights[id], ...getAssetById(id) }))
    .sort((a, b) => b.weight - a.weight);
  
  return (
    <div className="space-y-2">
      <div className="h-4 rounded-full overflow-hidden flex bg-nami-100">
        {sortedAssets.map(asset => (
          <div
            key={asset.id}
            className="h-full transition-all duration-300"
            style={{ 
              width: `${(asset.weight / totalWeight) * 100}%`,
              backgroundColor: asset.color,
            }}
            title={`${asset.ticker}: ${formatWeight(asset.weight)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {sortedAssets.map(asset => (
          <div key={asset.id} className="flex items-center gap-1.5 text-xs">
            <div 
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: asset.color }}
            />
            <span className="text-nami-600">{asset.ticker}</span>
            <span className="font-medium text-nami-800">{formatWeight(asset.weight)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
