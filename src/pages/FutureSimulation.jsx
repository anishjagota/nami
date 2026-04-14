/**
 * Nami Future Simulation Page
 * 
 * Monte Carlo simulation of future portfolio outcomes.
 * Shows fan charts, terminal wealth distribution, and probabilities.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  ArrowLeft, 
  Lock, 
  Zap, 
  Play,
  RotateCcw,
  Info,
  ChevronDown,
  DollarSign,
  Calendar,
  PiggyBank,
  Target,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PageWrapper, PageHeader, Section } from '../components/Layout';
import { usePortfolio } from '../context/PortfolioContext';
import { useMonteCarlo } from '../calc/useMonteCarlo';
import { 
  MonteCarloFanChart, 
  WealthHistogram,
  PercentileOutcome,
  OutcomeProbability,
} from '../components/MonteCarloCharts';
import { formatSimCurrency } from '../calc/monteCarlo';

export default function FutureSimulation() {
  const navigate = useNavigate();
  const { isValid, selectedAssets } = usePortfolio();
  
  const {
    results,
    isRunning,
    error,
    isReady,
    isLoadingData,
    horizonYears,
    initialWealth,
    monthlyContribution,
    numSimulations,
    runSimulation,
    resetSimulation,
    updateHorizon,
    updateInitialWealth,
    updateMonthlyContribution,
  } = useMonteCarlo();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPaths, setShowPaths] = useState(false);
  
  const hasPortfolio = isValid && selectedAssets.length > 0;
  
  return (
    <PageWrapper>
      <PageHeader
        title="Future Simulation"
        subtitle="See a range of possible future outcomes based on historical patterns"
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
            Create a portfolio to simulate its future outcomes
          </p>
          <button 
            onClick={() => navigate('/build')}
            className="btn-primary"
          >
            <ArrowLeft size={16} />
            Go to Build
          </button>
        </div>
      ) : isLoadingData ? (
        // Loading data state
        <div className="card p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-nami-100 
                          flex items-center justify-center">
            <Loader2 size={28} className="text-nami-400 animate-spin" />
          </div>
          <h3 className="font-semibold text-nami-800 mb-2">Loading historical data</h3>
          <p className="text-sm text-nami-500">
            Fetching data for your selected assets...
          </p>
        </div>
      ) : error && !results ? (
        // Error state (only show if no results yet)
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
      ) : (
        <div className="space-y-6">
          {/* Simulation controls */}
          <div className="card p-5">
            <h3 className="font-semibold text-nami-700 mb-4 flex items-center gap-2">
              <Zap size={18} className="text-coral-500" />
              Simulation Parameters
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              {/* Horizon */}
              <div>
                <label className="flex items-center gap-1.5 text-sm text-nami-600 mb-2">
                  <Calendar size={14} />
                  Time Horizon
                </label>
                <div className="flex gap-1">
                  {[5, 10, 15, 20, 30].map(years => (
                    <button
                      key={years}
                      onClick={() => updateHorizon(years)}
                      className={`
                        flex-1 py-2 text-sm font-medium rounded-lg transition-all
                        ${horizonYears === years 
                          ? 'bg-nami-800 text-white' 
                          : 'bg-nami-100 text-nami-600 hover:bg-nami-200'
                        }
                      `}
                    >
                      {years}y
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Initial capital */}
              <div>
                <label className="flex items-center gap-1.5 text-sm text-nami-600 mb-2">
                  <DollarSign size={14} />
                  Initial Capital
                </label>
                <select
                  value={initialWealth}
                  onChange={(e) => updateInitialWealth(Number(e.target.value))}
                  className="input"
                >
                  <option value={10000}>$10,000</option>
                  <option value={50000}>$50,000</option>
                  <option value={100000}>$100,000</option>
                  <option value={250000}>$250,000</option>
                  <option value={500000}>$500,000</option>
                  <option value={1000000}>$1,000,000</option>
                </select>
              </div>
              
              {/* Monthly contribution */}
              <div>
                <label className="flex items-center gap-1.5 text-sm text-nami-600 mb-2">
                  <PiggyBank size={14} />
                  Monthly Contribution
                </label>
                <select
                  value={monthlyContribution}
                  onChange={(e) => updateMonthlyContribution(Number(e.target.value))}
                  className="input"
                >
                  <option value={0}>$0 (none)</option>
                  <option value={500}>$500/month</option>
                  <option value={1000}>$1,000/month</option>
                  <option value={2000}>$2,000/month</option>
                  <option value={5000}>$5,000/month</option>
                </select>
              </div>
            </div>
            
            {/* Run button */}
            <button 
              onClick={runSimulation}
              disabled={isRunning || !isReady}
              className={`
                w-full py-3.5 rounded-xl font-semibold text-lg
                flex items-center justify-center gap-2
                transition-all duration-200
                ${isRunning 
                  ? 'bg-nami-200 text-nami-500 cursor-wait'
                  : 'btn-coral shadow-lg shadow-coral-200 hover:shadow-xl'
                }
              `}
            >
              {isRunning ? (
                <>
                  <div className="w-5 h-5 border-2 border-nami-400 border-t-transparent rounded-full animate-spin" />
                  Running {numSimulations.toLocaleString()} simulations...
                </>
              ) : results ? (
                <>
                  <RotateCcw size={20} />
                  Re-run Simulation
                </>
              ) : (
                <>
                  <Play size={20} />
                  Run Simulation
                </>
              )}
            </button>
            
            {error && (
              <p className="mt-2 text-sm text-coral-600 text-center">{error}</p>
            )}
          </div>
          
          {/* Results */}
          {results && (
            <>
              {/* Fan chart */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-nami-800">
                      Projected Wealth Over Time
                    </h3>
                    <p className="text-xs text-nami-500 mt-0.5">
                      Shaded areas show range of outcomes from {numSimulations.toLocaleString()} simulations
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setShowPaths(!showPaths)}
                    className={`
                      text-xs px-3 py-1.5 rounded-lg transition-all
                      ${showPaths 
                        ? 'bg-coral-100 text-coral-700' 
                        : 'bg-nami-100 text-nami-600 hover:bg-nami-200'
                      }
                    `}
                  >
                    {showPaths ? 'Hide' : 'Show'} sample paths
                  </button>
                </div>
                
                <MonteCarloFanChart 
                  fanData={results.fanChart}
                  height={350}
                  showSamplePaths={showPaths}
                  samplePaths={results.paths}
                  initialWealth={initialWealth}
                />
                
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 bg-coral-500" />
                    <span className="text-nami-600">Median (50th percentile)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-3 bg-coral-200 rounded-sm opacity-60" />
                    <span className="text-nami-600">25th – 75th percentile</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-3 bg-coral-100 rounded-sm" />
                    <span className="text-nami-600">5th – 95th percentile</span>
                  </div>
                </div>
              </div>
              
              {/* Outcome percentiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <PercentileOutcome
                  value={results.percentiles[50]}
                  percentile={50}
                  initialWealth={results.summary.totalContributions}
                />
                <PercentileOutcome
                  value={results.percentiles[75]}
                  percentile={75}
                  initialWealth={results.summary.totalContributions}
                />
                <PercentileOutcome
                  value={results.percentiles[25]}
                  percentile={25}
                  initialWealth={results.summary.totalContributions}
                />
                <PercentileOutcome
                  value={results.percentiles[5]}
                  percentile={5}
                  initialWealth={results.summary.totalContributions}
                />
              </div>
              
              {/* Probability insights */}
              <div className="card p-5">
                <h3 className="font-semibold text-nami-800 mb-4 flex items-center gap-2">
                  <Target size={18} className="text-teal-500" />
                  Probability Insights
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <OutcomeProbability
                    probability={1 - results.probabilities.loss}
                    label="Chance of profit"
                    sublabel="Ending with more than you put in"
                    variant="success"
                  />
                  <OutcomeProbability
                    probability={results.probabilities.doubling}
                    label="Chance of doubling"
                    sublabel={`Ending with at least ${formatSimCurrency(initialWealth * 2)}`}
                    variant="neutral"
                  />
                  <OutcomeProbability
                    probability={results.probabilities.loss}
                    label="Chance of loss"
                    sublabel="Ending with less than you put in"
                    variant="warning"
                  />
                </div>
              </div>
              
              {/* Terminal wealth histogram */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-nami-800">
                      Terminal Wealth Distribution
                    </h3>
                    <p className="text-xs text-nami-500 mt-0.5">
                      Distribution of final portfolio values after {horizonYears} years
                    </p>
                  </div>
                </div>
                
                <WealthHistogram 
                  histogram={results.histogram}
                  height={200}
                  initialWealth={results.summary.totalContributions}
                  median={results.percentiles[50]}
                />
                
                <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="text-nami-500 text-xs">Minimum</div>
                    <div className="font-semibold text-nami-700">
                      {formatSimCurrency(results.summary.min)}
                    </div>
                  </div>
                  <div>
                    <div className="text-nami-500 text-xs">Median</div>
                    <div className="font-bold text-coral-600">
                      {formatSimCurrency(results.summary.median)}
                    </div>
                  </div>
                  <div>
                    <div className="text-nami-500 text-xs">Maximum</div>
                    <div className="font-semibold text-nami-700">
                      {formatSimCurrency(results.summary.max)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Summary stats */}
              <div className="card p-5">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Info size={18} className="text-nami-400" />
                    <span className="font-medium text-nami-700">Simulation Details</span>
                  </div>
                  <ChevronDown 
                    size={18} 
                    className={`text-nami-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  />
                </button>
                
                {showAdvanced && (
                  <div className="mt-4 pt-4 border-t border-nami-100 animate-slide-up">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-nami-500">Simulations run</span>
                          <span className="font-medium text-nami-700">
                            {results.summary.numSimulations.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-nami-500">Time horizon</span>
                          <span className="font-medium text-nami-700">
                            {results.summary.horizonYears} years ({results.summary.horizonMonths} months)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-nami-500">Initial capital</span>
                          <span className="font-medium text-nami-700">
                            {formatSimCurrency(initialWealth)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-nami-500">Monthly contribution</span>
                          <span className="font-medium text-nami-700">
                            {formatSimCurrency(monthlyContribution)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-nami-500">Total contributions</span>
                          <span className="font-medium text-nami-700">
                            {formatSimCurrency(results.summary.totalContributions)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-nami-500">Mean outcome</span>
                          <span className="font-medium text-nami-700">
                            {formatSimCurrency(results.summary.mean)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-nami-500">Median outcome</span>
                          <span className="font-medium text-coral-600">
                            {formatSimCurrency(results.summary.median)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-nami-500">Range</span>
                          <span className="font-medium text-nami-700">
                            {formatSimCurrency(results.summary.min)} – {formatSimCurrency(results.summary.max)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-nami-50 rounded-lg">
                      <p className="text-xs text-nami-500 leading-relaxed">
                        <strong>Methodology:</strong> Each simulation generates a possible future by
                        randomly sampling monthly returns based on historical patterns from 2007-2024.
                        Runs {numSimulations.toLocaleString()} independent scenarios, each assuming monthly
                        rebalancing to target weights.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-4 bg-coral-50/50 rounded-xl border border-coral-100">
            <Info size={16} className="text-coral-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-coral-700 leading-relaxed">
              <strong>Important:</strong> These simulations are for illustrative purposes only and 
              are not predictive of actual future results. They assume returns follow historical 
              patterns, which may not hold true. Market conditions, fees, taxes, and other factors 
              can significantly affect actual outcomes. This is not investment advice.
            </p>
          </div>
          
          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/history')}
              className="btn-secondary flex-1"
            >
              <ArrowLeft size={16} />
              Back to History
            </button>
            <button
              onClick={() => navigate('/build')}
              className="btn-ghost flex-1"
            >
              Edit Portfolio
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
