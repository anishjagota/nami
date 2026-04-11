/**
 * Nami Live Preview Component
 * 
 * Real-time portfolio visualization with metrics.
 * Shows composition, expected metrics, and progress as user builds.
 */

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, Shield, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { getAssetById, getAllAssetIds } from '../data/assetUniverse';
import { getReturnsMatrix } from '../data/historicalReturns';
import { covarianceMatrix, geometricMeanReturns, portfolioVariance, portfolioReturn } from '../calc/statistics';
import { formatWeight, weightsToArray } from '../utils/portfolio';
import { RISK_FREE_RATE, MONTHS_PER_YEAR } from '../config/constants';

/**
 * Calculate live portfolio metrics
 */
function useLiveMetrics() {
  const { weights, selectedAssets, totalWeight, isValid } = usePortfolio();
  const assetIds = getAllAssetIds();
  
  return useMemo(() => {
    if (selectedAssets.length === 0 || totalWeight === 0) {
      return null;
    }
    
    // Get historical data
    const { returns } = getReturnsMatrix(assetIds);
    const covMatrix = covarianceMatrix(returns);
    const expReturns = geometricMeanReturns(returns);
    
    // Normalize weights for calculation (sum to 1)
    const normalizedWeights = assetIds.map(id => {
      const w = weights[id] || 0;
      return totalWeight > 0 ? w / totalWeight : 0;
    });
    
    // Calculate metrics
    const monthlyReturn = portfolioReturn(normalizedWeights, expReturns);
    const monthlyVar = portfolioVariance(normalizedWeights, covMatrix);
    const monthlyVol = Math.sqrt(monthlyVar);
    
    // Annualize
    const annualReturn = Math.pow(1 + monthlyReturn, MONTHS_PER_YEAR) - 1;
    const annualVol = monthlyVol * Math.sqrt(MONTHS_PER_YEAR);
    const sharpe = annualVol > 0 ? (annualReturn - RISK_FREE_RATE) / annualVol : 0;
    
    return {
      expectedReturn: annualReturn * 100,
      volatility: annualVol * 100,
      sharpe,
    };
  }, [weights, selectedAssets, totalWeight, assetIds]);
}

export default function LivePreview({ compact = false }) {
  const { 
    selectedAssets, 
    weights, 
    totalWeight, 
    isValid,
    positionCount,
  } = usePortfolio();
  
  const metrics = useLiveMetrics();
  
  // Prepare chart data
  const chartData = useMemo(() => {
    return selectedAssets
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
  }, [selectedAssets, weights]);
  
  const remaining = Math.max(0, 100 - totalWeight);
  const isOver = totalWeight > 100;
  
  // Empty state
  if (selectedAssets.length === 0) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} text-center`}>
        <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-nami-100 to-coral-50 
                        flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-dashed border-nami-300" />
        </div>
        <p className="text-sm text-nami-500">Select assets to start composing</p>
      </div>
    );
  }
  
  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Composition ring */}
      <div className="relative">
        <div className={`mx-auto ${compact ? 'w-36 h-36' : 'w-44 h-44'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.length > 0 ? chartData : [{ value: 100, color: '#e2e8f0' }]}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={compact ? 38 : 48}
                outerRadius={compact ? 58 : 72}
                paddingAngle={chartData.length > 1 ? 3 : 0}
                strokeWidth={0}
                animationDuration={300}
              >
                {chartData.length > 0 ? (
                  chartData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))
                ) : (
                  <Cell fill="#e2e8f0" />
                )}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`font-bold ${compact ? 'text-xl' : 'text-2xl'} ${
                isValid ? 'text-teal-600' : isOver ? 'text-coral-600' : 'text-nami-800'
              }`}>
                {totalWeight.toFixed(0)}%
              </div>
              <div className="text-xs text-nami-400">
                {isValid ? 'Complete' : isOver ? 'Over' : 'Allocated'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Status badge */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
          {isValid ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
              <CheckCircle2 size={12} />
              Ready
            </div>
          ) : isOver ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-coral-100 text-coral-700 text-xs font-medium">
              <AlertCircle size={12} />
              -{(totalWeight - 100).toFixed(0)}% over
            </div>
          ) : totalWeight > 0 ? (
            <div className="px-2 py-0.5 rounded-full bg-nami-100 text-nami-600 text-xs font-medium">
              +{remaining.toFixed(0)}% to go
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Allocation legend */}
      {chartData.length > 0 && (
        <div className={`grid ${chartData.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
          {chartData.map(item => (
            <div 
              key={item.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-nami-50/50"
            >
              <div 
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-nami-600 truncate">{item.ticker}</span>
              <span className="text-xs font-semibold text-nami-800 ml-auto">
                {item.value.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Live metrics */}
      {metrics && totalWeight > 0 && (
        <div className="pt-3 border-t border-nami-100">
          <div className="text-[10px] uppercase tracking-wider text-nami-400 mb-2 font-medium">
            Expected Performance
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MetricPill
              icon={<TrendingUp size={12} />}
              label="Return"
              value={`${metrics.expectedReturn >= 0 ? '+' : ''}${metrics.expectedReturn.toFixed(1)}%`}
              color={metrics.expectedReturn >= 0 ? 'teal' : 'coral'}
            />
            <MetricPill
              icon={<Shield size={12} />}
              label="Risk"
              value={`${metrics.volatility.toFixed(1)}%`}
              color="nami"
            />
            <MetricPill
              icon={<Zap size={12} />}
              label="Sharpe"
              value={metrics.sharpe.toFixed(2)}
              color={metrics.sharpe >= 0.5 ? 'teal' : metrics.sharpe >= 0 ? 'nami' : 'coral'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricPill({ icon, label, value, color = 'nami' }) {
  const colors = {
    teal: 'bg-teal-50 text-teal-700',
    coral: 'bg-coral-50 text-coral-700',
    nami: 'bg-nami-50 text-nami-700',
  };
  
  return (
    <div className={`rounded-lg px-2 py-1.5 ${colors[color]}`}>
      <div className="flex items-center gap-1 text-[10px] opacity-70 mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

// Compact inline version for bottom bar
export function LivePreviewBar() {
  const { selectedAssets, weights, totalWeight, isValid } = usePortfolio();
  const metrics = useLiveMetrics();
  
  const sortedAssets = selectedAssets
    .filter(id => weights[id] > 0)
    .map(id => ({ id, weight: weights[id], ...getAssetById(id) }))
    .sort((a, b) => b.weight - a.weight);
  
  if (totalWeight === 0) return null;
  
  return (
    <div className="flex items-center gap-4">
      {/* Composition bar */}
      <div className="flex-1 min-w-0">
        <div className="h-3 rounded-full overflow-hidden flex bg-nami-100">
          {sortedAssets.map(asset => (
            <div
              key={asset.id}
              className="h-full transition-all duration-300"
              style={{ 
                width: `${(asset.weight / Math.max(totalWeight, 100)) * 100}%`,
                backgroundColor: asset.color,
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`text-xs font-medium ${isValid ? 'text-teal-600' : 'text-nami-600'}`}>
            {totalWeight.toFixed(0)}%
          </span>
          {metrics && (
            <>
              <span className="text-xs text-nami-400">•</span>
              <span className="text-xs text-nami-500">
                {metrics.expectedReturn >= 0 ? '+' : ''}{metrics.expectedReturn.toFixed(1)}% exp. return
              </span>
              <span className="text-xs text-nami-400">•</span>
              <span className="text-xs text-nami-500">
                {metrics.volatility.toFixed(1)}% vol
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
