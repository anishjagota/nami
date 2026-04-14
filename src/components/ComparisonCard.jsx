/**
 * Nami Comparison Card Component
 * 
 * Displays a portfolio option with metrics and allocation.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, TrendingUp, Shield, Zap } from 'lucide-react';
import { getAssetById } from '../data/assetUniverse';
import { formatReturn, formatVolatility, formatSharpe } from '../calc/metrics';

/**
 * Main comparison card component
 */
export default function ComparisonCard({ 
  portfolio, 
  isUser = false, 
  rank = null,
  isTopSharpe = false,
}) {
  const [expanded, setExpanded] = useState(false);
  
  const {
    name,
    shortName,
    description,
    methodology,
    color,
    metrics,
    holdings,
  } = portfolio;
  
  // Color mapping
  const colorClasses = {
    coral: {
      bg: 'bg-coral-50',
      border: 'border-coral-200',
      accent: 'bg-coral-500',
      text: 'text-coral-700',
      badge: 'bg-coral-100 text-coral-700',
    },
    nami: {
      bg: 'bg-nami-50',
      border: 'border-nami-200',
      accent: 'bg-nami-500',
      text: 'text-nami-700',
      badge: 'bg-nami-100 text-nami-700',
    },
    teal: {
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      accent: 'bg-teal-500',
      text: 'text-teal-700',
      badge: 'bg-teal-100 text-teal-700',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      accent: 'bg-blue-500',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      accent: 'bg-purple-500',
      text: 'text-purple-700',
      badge: 'bg-purple-100 text-purple-700',
    },
  };
  
  const colors = colorClasses[color] || colorClasses.nami;
  
  return (
    <div 
      className={`
        card overflow-hidden transition-all duration-300
        ${isUser ? `ring-2 ring-coral-400 ${colors.bg}` : ''}
        ${isTopSharpe && !isUser ? 'ring-2 ring-teal-400' : ''}
      `}
    >
      {/* Header */}
      <div className={`p-4 ${isUser ? colors.bg : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${colors.accent} flex items-center justify-center`}>
              {isUser ? (
                <span className="text-white text-sm font-bold">You</span>
              ) : portfolio.key === 'minVariance' ? (
                <Shield size={20} className="text-white" />
              ) : portfolio.key === 'maxSharpe' ? (
                <Zap size={20} className="text-white" />
              ) : (
                <TrendingUp size={20} className="text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-nami-800">{name}</h3>
              <p className="text-xs text-nami-500">{description}</p>
            </div>
          </div>
          
          {/* Badges */}
          <div className="flex flex-col items-end gap-1">
            {isUser && (
              <span className={`badge ${colors.badge}`}>Your Choice</span>
            )}
            {isTopSharpe && (
              <span className="badge bg-teal-100 text-teal-700">Most Efficient</span>
            )}
            {rank && !isTopSharpe && (
              <span className="badge bg-nami-100 text-nami-600">#{rank}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Metrics */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <MetricBox
            label="Expected Return"
            value={formatReturn(metrics.annualReturn)}
            subtext="annual"
            positive={metrics.annualReturn > 0}
          />
          <MetricBox
            label="Risk"
            value={formatVolatility(metrics.annualVol)}
            subtext="annual"
            neutral
          />
          <MetricBox
            label="Return / Risk"
            value={formatSharpe(metrics.sharpeRatio)}
            subtext="efficiency"
            positive={metrics.sharpeRatio > 0.5}
          />
        </div>
      </div>
      
      {/* Allocation Bar */}
      <div className="px-4 pb-3">
        <div className="h-3 rounded-full overflow-hidden flex bg-nami-100">
          {holdings.map((h, i) => {
            const asset = getAssetById(h.id);
            return (
              <div
                key={h.id}
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${h.weight}%`,
                  backgroundColor: asset?.color || '#94a3b8',
                }}
                title={`${h.id}: ${h.weight.toFixed(1)}%`}
              />
            );
          })}
        </div>
      </div>
      
      {/* Expandable Details */}
      <div className="border-t border-nami-100">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between 
                     text-sm text-nami-500 hover:bg-nami-50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Info size={14} />
            {expanded ? 'Hide details' : 'View allocation & methodology'}
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expanded && (
          <div className="px-4 pb-4 animate-slide-up">
            {/* Holdings list */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-nami-600 uppercase tracking-wide mb-2">
                Allocation
              </h4>
              <div className="space-y-1.5">
                {holdings.map(h => {
                  const asset = getAssetById(h.id);
                  return (
                    <div key={h.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: asset?.color }}
                        />
                        <span className="text-nami-700">{h.id}</span>
                        <span className="text-nami-400 text-xs">{asset?.shortName}</span>
                      </div>
                      <span className="font-medium text-nami-800">
                        {h.weight.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Methodology */}
            <div className="p-3 bg-nami-50 rounded-lg">
              <h4 className="text-xs font-medium text-nami-600 uppercase tracking-wide mb-1">
                Methodology
              </h4>
              <p className="text-xs text-nami-600 leading-relaxed">
                {methodology}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Metric display box
 */
function MetricBox({ label, value, subtext, positive, neutral }) {
  return (
    <div className="text-center p-2 rounded-lg bg-nami-50/50">
      <div className="text-xs text-nami-500 mb-0.5">{label}</div>
      <div className={`
        text-lg font-bold
        ${neutral ? 'text-nami-700' : positive ? 'text-teal-600' : 'text-nami-700'}
      `}>
        {value}
      </div>
      <div className="text-xs text-nami-400">{subtext}</div>
    </div>
  );
}

/**
 * Compact comparison row for smaller displays
 */
export function ComparisonRow({ portfolio, isUser, isTopSharpe }) {
  const { name, metrics, color } = portfolio;
  
  const colorClasses = {
    coral: 'bg-coral-500',
    nami: 'bg-nami-500',
    teal: 'bg-teal-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  };
  
  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-xl
      ${isUser ? 'bg-coral-50 ring-1 ring-coral-200' : 'bg-white'}
    `}>
      <div className={`w-2 h-8 rounded-full ${colorClasses[color] || 'bg-nami-500'}`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-nami-800 truncate">{name}</span>
          {isTopSharpe && (
            <span className="badge-teal text-xs">Best</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-sm">
        <div className="text-right">
          <div className="text-nami-400 text-xs">Return</div>
          <div className={metrics.annualReturn >= 0 ? 'text-teal-600 font-medium' : 'text-coral-600 font-medium'}>
            {formatReturn(metrics.annualReturn)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-nami-400 text-xs">Risk</div>
          <div className="text-nami-700 font-medium">
            {formatVolatility(metrics.annualVol)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-nami-400 text-xs">Return / Risk</div>
          <div className="text-nami-700 font-medium">
            {formatSharpe(metrics.sharpeRatio)}
          </div>
        </div>
      </div>
    </div>
  );
}
