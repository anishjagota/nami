/**
 * Portfolio Detail Page
 *
 * Dedicated view for a single saved portfolio.
 * Shows: holdings table with live prices, total value, daily P&L,
 *        performance since saved, expected metrics, and action buttons
 *        to open Compare / History / Future with this portfolio loaded.
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Copy,
  Trash2,
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  MoreVertical,
  ChevronRight,
} from 'lucide-react';
import { PageWrapper } from '../components/Layout';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePortfolio } from '../context/PortfolioContext';
import { getAssetById } from '../data/assetUniverse';
import { computeDailyPnL, computePerformanceSinceSaved } from '../data/models/Portfolio';

export default function PortfolioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getPortfolio,
    removePortfolio,
    renamePortfolio,
    duplicatePortfolio,
    setEditingPortfolioId,
    latestPriceData,
    isRefreshingPrices,
  } = useWorkspace();
  const { loadPreset } = usePortfolio();

  const portfolio = getPortfolio(id);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(portfolio?.name || '');
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // If portfolio not found, show not-found state
  if (!portfolio) {
    return (
      <PageWrapper>
        <div className="card p-10 text-center max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-nami-800 mb-2">Portfolio not found</h3>
          <p className="text-sm text-nami-500 mb-4">
            This portfolio may have been deleted.
          </p>
          <Link
            to="/"
            className="text-sm text-coral-600 hover:text-coral-700 inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const holdings = portfolio.holdings;
  const tickers = Object.keys(holdings)
    .filter(t => holdings[t] > 0)
    .sort((a, b) => holdings[b] - holdings[a]);

  const metrics = portfolio.snapshot?.metrics;
  const totalValue = portfolio.snapshot?.totalValue ?? portfolio.initialInvestment;

  // Compute daily P&L
  const pnl = computeDailyPnL(holdings, latestPriceData, totalValue);
  const hasPnl = latestPriceData && Object.keys(latestPriceData).length > 0;

  // Compute performance since saved
  const perfSinceSaved = computePerformanceSinceSaved(portfolio, latestPriceData);

  // Handlers
  const handleRename = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== portfolio.name) {
      renamePortfolio(portfolio.id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      removePortfolio(portfolio.id);
      navigate('/');
    } else {
      setConfirmDelete(true);
    }
  };

  const handleDuplicate = () => {
    const dup = duplicatePortfolio(portfolio.id);
    if (dup) navigate(`/portfolio/${dup.id}`);
    setShowMenu(false);
  };

  const handleEdit = () => {
    setEditingPortfolioId(portfolio.id);
    navigate(`/build?edit=${portfolio.id}`);
  };

  const handleLoadIntoTool = (path) => {
    loadPreset(holdings);
    navigate(path);
  };

  const savedDate = new Date(portfolio.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <PageWrapper>
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-nami-500 hover:text-nami-700
                   transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Dashboard
      </Link>

      {/* Header: Name + Actions */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <form
              onSubmit={(e) => { e.preventDefault(); handleRename(); }}
              className="flex items-center gap-2 max-w-sm"
            >
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="input text-xl font-bold py-1 px-2 flex-1"
                autoFocus
                maxLength={40}
                onBlur={handleRename}
              />
            </form>
          ) : (
            <h1
              className="text-display-sm text-nami-900 cursor-pointer hover:text-nami-700 transition-colors"
              onClick={() => { setIsRenaming(true); setNameInput(portfolio.name); }}
              title="Click to rename"
            >
              {portfolio.name}
            </h1>
          )}
          <p className="text-sm text-nami-500 mt-1">
            Saved {savedDate} &middot; {tickers.length} holding{tickers.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleEdit}
            className="text-sm px-3 py-2 rounded-xl border border-nami-200 text-nami-600
                       hover:bg-nami-50 transition-colors flex items-center gap-1.5"
          >
            <Pencil size={14} />
            Edit
          </button>

          <div className="relative">
            <button
              onClick={() => { setShowMenu(!showMenu); setConfirmDelete(false); }}
              className="p-2 rounded-xl border border-nami-200 text-nami-500
                         hover:bg-nami-50 transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setShowMenu(false); setConfirmDelete(false); }} />
                <div className="absolute right-0 top-10 z-50 w-44 bg-white rounded-xl shadow-lg border border-nami-100 py-1">
                  <button
                    onClick={handleDuplicate}
                    className="w-full px-3 py-2 text-left text-sm text-nami-700 hover:bg-nami-50
                               flex items-center gap-2"
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <div className="border-t border-nami-100 my-1" />
                  <button
                    onClick={handleDelete}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2
                      ${confirmDelete
                        ? 'text-white bg-red-500 hover:bg-red-600'
                        : 'text-red-600 hover:bg-red-50'
                      }`}
                  >
                    <Trash2 size={14} />
                    {confirmDelete ? 'Confirm Delete' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Total Value */}
        <div className="card p-4">
          <p className="text-xs text-nami-400 font-medium mb-1">Total Value</p>
          <p className="text-xl font-bold text-nami-900 tabular-nums">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Daily P&L */}
        <div className="card p-4">
          <p className="text-xs text-nami-400 font-medium mb-1">Today</p>
          {hasPnl && pnl.dailyPercent !== 0 ? (
            <div className="flex items-baseline gap-1.5">
              <p className={`text-xl font-bold tabular-nums ${
                pnl.dailyPercent > 0 ? 'text-teal-600' : 'text-red-500'
              }`}>
                {pnl.dailyPercent > 0 ? '+' : ''}{pnl.dailyPercent.toFixed(2)}%
              </p>
            </div>
          ) : (
            <p className="text-xl font-bold text-nami-400">--</p>
          )}
        </div>

        {/* Performance Since Saved */}
        <div className="card p-4">
          <p className="text-xs text-nami-400 font-medium mb-1">Since Saved</p>
          {perfSinceSaved ? (
            <div className="flex items-baseline gap-1.5">
              <p className={`text-xl font-bold tabular-nums ${
                perfSinceSaved.percentChange > 0 ? 'text-teal-600'
                  : perfSinceSaved.percentChange < 0 ? 'text-red-500'
                  : 'text-nami-600'
              }`}>
                {perfSinceSaved.percentChange > 0 ? '+' : ''}
                {perfSinceSaved.percentChange.toFixed(2)}%
              </p>
            </div>
          ) : (
            <p className="text-xl font-bold text-nami-400">--</p>
          )}
        </div>

        {/* Return/Risk */}
        <div className="card p-4">
          <p className="text-xs text-nami-400 font-medium mb-1">Return / Risk</p>
          {metrics ? (
            <p className="text-xl font-bold text-nami-900 tabular-nums">
              {metrics.sharpe.toFixed(2)}
            </p>
          ) : (
            <p className="text-xl font-bold text-nami-400">--</p>
          )}
        </div>
      </div>

      {/* Performance Since Saved detail */}
      {perfSinceSaved && (
        <div className="card p-4 mb-6">
          <h3 className="text-sm font-semibold text-nami-700 mb-3">Performance Since Saved</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-nami-400 mb-0.5">Value When Saved</p>
              <p className="font-medium text-nami-700 tabular-nums">
                ${perfSinceSaved.savedValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-nami-400 mb-0.5">Estimated Value Now</p>
              <p className="font-medium text-nami-700 tabular-nums">
                ${perfSinceSaved.currentValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-nami-400 mb-0.5">Dollar Change</p>
              <p className={`font-medium tabular-nums ${
                perfSinceSaved.dollarChange >= 0 ? 'text-teal-600' : 'text-red-500'
              }`}>
                {perfSinceSaved.dollarChange >= 0 ? '+' : ''}
                ${Math.abs(perfSinceSaved.dollarChange).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-nami-400 mb-0.5">Percent Change</p>
              <p className={`font-medium tabular-nums ${
                perfSinceSaved.percentChange >= 0 ? 'text-teal-600' : 'text-red-500'
              }`}>
                {perfSinceSaved.percentChange >= 0 ? '+' : ''}
                {perfSinceSaved.percentChange.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <div className="card overflow-hidden mb-6">
        <div className="p-4 border-b border-nami-100">
          <h3 className="text-sm font-semibold text-nami-700">Holdings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-nami-50 text-nami-500 text-xs">
                <th className="text-left py-2 px-4 font-medium">Asset</th>
                <th className="text-right py-2 px-4 font-medium">Weight</th>
                <th className="text-right py-2 px-4 font-medium">Price</th>
                <th className="text-right py-2 px-4 font-medium">Daily Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nami-50">
              {tickers.map(ticker => {
                const asset = getAssetById(ticker);
                const price = latestPriceData?.[ticker];
                return (
                  <tr key={ticker} className="hover:bg-nami-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: asset?.color || '#94a3b8' }}
                        />
                        <div>
                          <span className="font-medium text-nami-800">{ticker}</span>
                          <span className="text-nami-400 text-xs ml-1.5 hidden sm:inline">
                            {asset?.name || ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-nami-700 tabular-nums">
                      {holdings[ticker].toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-nami-700 tabular-nums">
                      {price ? `$${price.price.toFixed(2)}` : '--'}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {price && price.changePercent != null ? (
                        <span className={`inline-flex items-center gap-0.5 ${
                          price.changePercent > 0 ? 'text-teal-600'
                            : price.changePercent < 0 ? 'text-red-500'
                            : 'text-nami-400'
                        }`}>
                          {price.changePercent > 0 ? <TrendingUp size={12} /> :
                           price.changePercent < 0 ? <TrendingDown size={12} /> :
                           <Minus size={12} />}
                          {price.changePercent > 0 ? '+' : ''}
                          {price.changePercent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-nami-400">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expected Metrics */}
      {metrics && (
        <div className="card p-4 mb-6">
          <h3 className="text-sm font-semibold text-nami-700 mb-3">Expected Metrics</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-nami-400 mb-0.5">Annual Return</p>
              <p className={`text-lg font-bold tabular-nums ${
                metrics.annualReturn >= 0 ? 'text-teal-600' : 'text-coral-600'
              }`}>
                {(metrics.annualReturn * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-nami-400 mb-0.5">Annual Risk</p>
              <p className="text-lg font-bold text-nami-700 tabular-nums">
                {(metrics.annualRisk * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-nami-400 mb-0.5">Return / Risk</p>
              <p className="text-lg font-bold text-nami-700 tabular-nums">
                {metrics.sharpe.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-nami-700 mb-3">Analyze This Portfolio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleLoadIntoTool('/compare')}
            className="flex items-center gap-3 p-3 rounded-xl border border-nami-200
                       hover:border-coral-300 hover:bg-coral-50/30 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-coral-100 flex items-center justify-center flex-shrink-0">
              <BarChart3 size={18} className="text-coral-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-nami-800 group-hover:text-coral-700">Compare</p>
              <p className="text-xs text-nami-400">vs optimized alternatives</p>
            </div>
            <ChevronRight size={16} className="text-nami-300 group-hover:text-coral-400" />
          </button>

          <button
            onClick={() => handleLoadIntoTool('/history')}
            className="flex items-center gap-3 p-3 rounded-xl border border-nami-200
                       hover:border-teal-300 hover:bg-teal-50/30 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Clock size={18} className="text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-nami-800 group-hover:text-teal-700">History</p>
              <p className="text-xs text-nami-400">Backtest performance</p>
            </div>
            <ChevronRight size={16} className="text-nami-300 group-hover:text-teal-400" />
          </button>

          <button
            onClick={() => handleLoadIntoTool('/future')}
            className="flex items-center gap-3 p-3 rounded-xl border border-nami-200
                       hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Zap size={18} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-nami-800 group-hover:text-blue-700">Future</p>
              <p className="text-xs text-nami-400">Monte Carlo simulation</p>
            </div>
            <ChevronRight size={16} className="text-nami-300 group-hover:text-blue-400" />
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
