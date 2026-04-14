/**
 * Nami Compare Options Page
 * 
 * Shows user portfolio compared against benchmark and optimized alternatives.
 * Displays metrics, allocations, and methodology explanations.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Info,
  BarChart3,
  ChevronDown,
  Sparkles,
  Loader2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { PageWrapper, PageHeader, Section } from '../components/Layout';
import { usePortfolio } from '../context/PortfolioContext';
import { useWorkspace } from '../context/WorkspaceContext';
import ComparisonCard, { ComparisonRow } from '../components/ComparisonCard';
import SavePortfolioModal from '../components/SavePortfolioModal';
import { usePortfolioAnalysis, formatPortfolioForDisplay } from '../calc/usePortfolioAnalysis';
import { RISK_FREE_RATE } from '../config/constants';

export default function CompareOptions() {
  const navigate = useNavigate();
  const { isValid, selectedAssets, weights } = usePortfolio();
  const { saveNewPortfolio } = useWorkspace();
  const { analysis, isReady, isLoading, error } = usePortfolioAnalysis();
  const [showMethodology, setShowMethodology] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  const hasPortfolio = isValid && selectedAssets.length > 0;
  
  // Portfolio order for display
  const portfolioOrder = ['user', 'benchmark', 'minVariance', 'riskParity', 'maxSharpe'];
  
  // Format all portfolios for display
  const portfolios = isReady 
    ? portfolioOrder.map(key => formatPortfolioForDisplay(analysis, key))
    : [];
  
  // Find which has best Sharpe
  const topSharpeKey = isReady ? analysis.sortedBySharpe[0] : null;
  
  return (
    <PageWrapper>
      <PageHeader
        title="Compare Portfolio Options"
        subtitle="See how your portfolio compares to other strategies"
        action={
          hasPortfolio && (
            <button
              onClick={() => navigate('/history')}
              className="btn-primary text-sm"
            >
              View History
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
            You need to create a portfolio before comparing it to alternatives
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
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-6 bg-nami-200 rounded w-1/3 mb-4" />
              <div className="h-4 bg-nami-100 rounded w-2/3 mb-3" />
              <div className="h-3 bg-nami-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        // Full comparison
        <div className="space-y-6">
          {/* Quick summary banner */}
          <div className="card p-4 bg-gradient-to-r from-teal-50 to-nami-50">
            <div className="flex items-start gap-3">
              <Sparkles size={20} className="text-teal-500 mt-0.5" />
              <div>
                <p className="text-sm text-nami-700">
                  <span className="font-semibold">
                    {topSharpeKey === 'user'
                      ? "Your portfolio has the best return for the level of risk!"
                      : `The ${analysis.descriptions[topSharpeKey].name} has the best return for the level of risk.`
                    }
                  </span>
                </p>
                <p className="text-xs text-nami-500 mt-0.5">
                  Based on historical data from 2007-2024. Past performance doesn't guarantee future results.
                </p>
              </div>
            </div>
          </div>
          
          {/* Comparison cards */}
          <div className="grid gap-4 lg:grid-cols-2">
            {portfolios.map((portfolio, idx) => (
              <ComparisonCard
                key={portfolio.key}
                portfolio={portfolio}
                isUser={portfolio.key === 'user'}
                isTopSharpe={portfolio.key === topSharpeKey}
                rank={analysis.sortedBySharpe.indexOf(portfolio.key) + 1}
              />
            ))}
          </div>
          
          {/* Methodology explanation */}
          <Section>
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="w-full card p-4 flex items-center justify-between text-left
                         hover:shadow-soft-lg transition-shadow"
            >
              <div className="flex items-center gap-3">
                <Info size={20} className="text-nami-400" />
                <div>
                  <h3 className="font-medium text-nami-800">How are these calculated?</h3>
                  <p className="text-xs text-nami-500">
                    Learn about the optimization methods and assumptions
                  </p>
                </div>
              </div>
              <ChevronDown 
                size={20} 
                className={`text-nami-400 transition-transform ${showMethodology ? 'rotate-180' : ''}`}
              />
            </button>
            
            {showMethodology && (
              <div className="mt-4 card p-5 animate-slide-up">
                <div className="space-y-4 text-sm text-nami-600">
                  <div>
                    <h4 className="font-semibold text-nami-800 mb-1">Expected Return</h4>
                    <p>
                      The average annual growth rate of the portfolio over the historical period, accounting for compounding.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-nami-800 mb-1">Risk</h4>
                    <p>
                      How much the portfolio's returns tend to swing up and down. Higher means less predictable.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-nami-800 mb-1">Return / Risk</h4>
                    <p>
                      How much return you get for each unit of risk taken. Higher means more efficient.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-nami-800 mb-1">Optimization Methods</h4>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><span className="font-medium">Minimum Risk:</span> Finds the mix with the least ups and downs</li>
                      <li><span className="font-medium">Risk Parity:</span> Spreads risk evenly across all assets</li>
                      <li><span className="font-medium">Max Efficiency:</span> Finds the mix with the best return per unit of risk</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 bg-nami-50 rounded-lg">
                    <p className="text-xs text-nami-500">
                      <strong>Important:</strong> These calculations use historical data and assume monthly rebalancing. 
                      Actual results may vary. This is for educational purposes only and not investment advice.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Section>
          
          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/build')}
              className="btn-secondary flex-1"
            >
              <ArrowLeft size={16} />
              Edit Portfolio
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="btn-ghost flex-1"
            >
              <Save size={16} />
              Save Portfolio
            </button>
            <button
              onClick={() => navigate('/history')}
              className="btn-coral flex-1"
            >
              View Historical Performance
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Save Modal */}
          <SavePortfolioModal
            isOpen={showSaveModal}
            onClose={() => setShowSaveModal(false)}
            onSave={(name) => {
              const metrics = isReady ? {
                annualReturn: analysis.metrics.user.annualReturn,
                annualRisk: analysis.metrics.user.annualVolatility,
                sharpe: analysis.metrics.user.sharpeRatio,
              } : null;
              saveNewPortfolio({ name, holdings: weights, metrics });
            }}
          />
        </div>
      )}
    </PageWrapper>
  );
}
