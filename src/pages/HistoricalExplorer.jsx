/**
 * Nami Historical Explorer Page
 * 
 * Shows how portfolios would have performed historically.
 * Features growth chart, drawdown analysis, and period metrics.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, 
  ArrowLeft, 
  ArrowRight,
  Lock, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Info,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PageWrapper, PageHeader, Section } from '../components/Layout';
import { usePortfolio } from '../context/PortfolioContext';
import GrowthChart, { DrawdownChart, YearlyReturnsChart } from '../components/GrowthChart';
import { useBacktest, getBacktestComparison } from '../calc/useBacktest';
import { formatCurrency, formatPercent } from '../calc/backtest';

// Portfolio display config
const PORTFOLIO_CONFIG = {
  user: { name: 'Your Portfolio', color: 'coral', colorHex: '#f97352' },
  benchmark: { name: 'Benchmark', color: 'nami', colorHex: '#64748b' },
  minVariance: { name: 'Safer', color: 'teal', colorHex: '#14b8a6' },
  riskParity: { name: 'Balanced', color: 'blue', colorHex: '#3b82f6' },
  maxSharpe: { name: 'Efficient', color: 'purple', colorHex: '#8b5cf6' },
};

export default function HistoricalExplorer() {
  const navigate = useNavigate();
  const { isValid, selectedAssets } = usePortfolio();
  const {
    results,
    isReady,
    isLoading,
    error,
    dateRange,
    setDateRange,
    availableRanges,
    selectedPortfolios,
    togglePortfolio,
    startDate,
    endDate,
    totalMonths,
  } = useBacktest('MAX');
  
  const [showDrawdown, setShowDrawdown] = useState(false);
  const [initialInvestment, setInitialInvestment] = useState(10000);
  
  const hasPortfolio = isValid && selectedAssets.length > 0;
  
  // Get comparison data
  const comparison = isReady 
    ? getBacktestComparison(results, Object.keys(PORTFOLIO_CONFIG))
    : null;
  
  return (
    <PageWrapper>
      <PageHeader
        title="Historical Performance"
        subtitle="See how your portfolio would have performed historically"
        action={
          hasPortfolio && isReady && (
            <button
              onClick={() => navigate('/future')}
              className="btn-primary text-sm"
            >
              Simulate Future
              <ArrowRight size={16} />
            </button>
          )
        }
      />
      
      {!hasPortfolio ? (
        // No portfolio built yet
        <div className="card p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-nami-100 
                          flex items-center justify-center">
            <Lock size={28} className="text-nami-400" />
          </div>
          <h3 className="font-semibold text-nami-800 mb-2">Build a portfolio first</h3>
          <p className="text-sm text-nami-500 mb-4">
            Create a portfolio to see how it would have performed historically
          </p>
          <button 
            onClick={() => navigate('/build')}
            className="btn-primary"
          >
            <ArrowLeft size={16} />
            Go to Build
          </button>
        </div>
      ) : error ? (
        // Error state
        <div className="card p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 
                          flex items-center justify-center">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h3 className="font-semibold text-nami-800 mb-2">Unable to load data</h3>
          <p className="text-sm text-nami-500 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/build')}
            className="btn-secondary"
          >
            <ArrowLeft size={16} />
            Back to Build
          </button>
        </div>
      ) : isLoading || !isReady ? (
        // Loading state
        <div className="space-y-4">
          <div className="card p-6 flex items-center justify-center gap-3">
            <Loader2 size={20} className="animate-spin text-nami-400" />
            <span className="text-sm text-nami-500">Loading historical data...</span>
          </div>
          <div className="card p-6 animate-pulse">
            <div className="h-64 bg-nami-100 rounded-xl" />
          </div>
        </div>
      ) : (
        // Full historical explorer
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Date range selector */}
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-nami-400" />
                <span className="text-sm text-nami-600">Period:</span>
                <div className="flex gap-1">
                  {availableRanges.map(range => (
                    <button
                      key={range.key}
                      onClick={() => setDateRange(range.key)}
                      className={`
                        px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                        ${dateRange === range.key 
                          ? 'bg-nami-800 text-white' 
                          : 'bg-nami-100 text-nami-600 hover:bg-nami-200'
                        }
                      `}
                    >
                      {range.key}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Portfolio toggles */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-nami-600">Show:</span>
                <div className="flex gap-1">
                  {Object.entries(PORTFOLIO_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => togglePortfolio(key)}
                      className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium 
                        rounded-lg transition-all border
                        ${selectedPortfolios.includes(key)
                          ? 'border-transparent text-white'
                          : 'border-nami-200 text-nami-400 bg-white hover:border-nami-300'
                        }
                      `}
                      style={selectedPortfolios.includes(key) ? { 
                        backgroundColor: config.colorHex 
                      } : {}}
                    >
                      {selectedPortfolios.includes(key) ? (
                        <Eye size={12} />
                      ) : (
                        <EyeOff size={12} />
                      )}
                      {config.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Date range info */}
            <div className="mt-3 pt-3 border-t border-nami-100 flex items-center justify-between text-xs text-nami-500">
              <span>{startDate} to {endDate}</span>
              <span>{totalMonths} months ({(totalMonths / 12).toFixed(1)} years)</span>
            </div>
          </div>
          
          {/* Main growth chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-nami-800">
                  Growth of {formatCurrency(initialInvestment, 0)}
                </h3>
                <p className="text-xs text-nami-500 mt-0.5">
                  Assuming monthly rebalancing to target weights
                </p>
              </div>
              
              {/* Initial investment selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-nami-500">Start with:</span>
                <select
                  value={initialInvestment}
                  onChange={(e) => setInitialInvestment(Number(e.target.value))}
                  className="text-sm border border-nami-200 rounded-lg px-2 py-1
                             focus:outline-none focus:ring-2 focus:ring-coral-300"
                >
                  <option value={1000}>$1,000</option>
                  <option value={10000}>$10,000</option>
                  <option value={100000}>$100,000</option>
                </select>
              </div>
            </div>
            
            <GrowthChart 
              data={results}
              portfolios={selectedPortfolios}
              height={350}
              initialValue={initialInvestment}
            />
          </div>
          
          {/* Performance metrics cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {comparison?.filter(p => selectedPortfolios.includes(p.key)).map((portfolio, idx) => {
              const config = PORTFOLIO_CONFIG[portfolio.key];
              const isTop = idx === 0;
              
              return (
                <div 
                  key={portfolio.key}
                  className={`
                    card p-4 transition-all
                    ${isTop ? 'ring-2 ring-teal-400 bg-teal-50/30' : ''}
                  `}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.colorHex }}
                    />
                    <span className="text-sm font-medium text-nami-700">
                      {config.name}
                    </span>
                    {isTop && (
                      <span className="badge-teal text-xs ml-auto">#1</span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-nami-500">Final Value</div>
                      <div className="text-lg font-bold text-nami-800">
                        {formatCurrency(portfolio.finalValue * initialInvestment, 0)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-nami-400">Total</div>
                        <div className={`font-semibold ${portfolio.totalReturn >= 0 ? 'text-teal-600' : 'text-coral-600'}`}>
                          {formatPercent(portfolio.totalReturn)}
                        </div>
                      </div>
                      <div>
                        <div className="text-nami-400">Annual</div>
                        <div className={`font-semibold ${portfolio.annualizedReturn >= 0 ? 'text-teal-600' : 'text-coral-600'}`}>
                          {formatPercent(portfolio.annualizedReturn)}
                        </div>
                      </div>
                      <div>
                        <div className="text-nami-400">Risk</div>
                        <div className="font-semibold text-nami-700">
                          {formatPercent(portfolio.volatility, 1, false)}
                        </div>
                      </div>
                      <div>
                        <div className="text-nami-400">Max Drop</div>
                        <div className="font-semibold text-coral-600">
                          -{formatPercent(portfolio.maxDrawdown, 1, false)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Drawdown section */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowDrawdown(!showDrawdown)}
              className="w-full p-4 flex items-center justify-between text-left
                         hover:bg-nami-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <TrendingDown size={20} className="text-coral-500" />
                <div>
                  <h3 className="font-medium text-nami-800">Drawdown Analysis</h3>
                  <p className="text-xs text-nami-500">
                    The largest decline from a high point to a low point
                  </p>
                </div>
              </div>
              <ChevronDown 
                size={20} 
                className={`text-nami-400 transition-transform ${showDrawdown ? 'rotate-180' : ''}`}
              />
            </button>
            
            {showDrawdown && (
              <div className="p-4 pt-0 animate-slide-up">
                <DrawdownChart 
                  data={results}
                  portfolios={selectedPortfolios}
                  height={180}
                />
                
                {/* Drawdown details */}
                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  {selectedPortfolios.map(key => {
                    const dd = results[key]?.drawdownDetails;
                    const config = PORTFOLIO_CONFIG[key];
                    if (!dd) return null;
                    
                    return (
                      <div 
                        key={key}
                        className="p-3 bg-nami-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: config.colorHex }}
                          />
                          <span className="text-sm font-medium text-nami-700">
                            {config.name}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-nami-400">Max Drawdown</div>
                            <div className="font-semibold text-coral-600">
                              -{formatPercent(dd.maxDrawdown, 1, false)}
                            </div>
                          </div>
                          <div>
                            <div className="text-nami-400">Peak</div>
                            <div className="font-medium text-nami-600">{dd.peakDate}</div>
                          </div>
                          <div>
                            <div className="text-nami-400">Trough</div>
                            <div className="font-medium text-nami-600">{dd.troughDate}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-4 bg-nami-100/50 rounded-xl">
            <Info size={16} className="text-nami-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-nami-500 leading-relaxed">
              <strong>Important:</strong> Past performance does not guarantee future results. 
              This analysis uses historical data from {startDate} to {endDate} and assumes 
              monthly rebalancing to target weights. Actual results may vary due to trading costs, 
              taxes, and market conditions. This is for educational purposes only.
            </p>
          </div>
          
          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/compare')}
              className="btn-secondary flex-1"
            >
              <ArrowLeft size={16} />
              Back to Compare
            </button>
            <button
              onClick={() => navigate('/future')}
              className="btn-coral flex-1"
            >
              Simulate Future Outcomes
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
