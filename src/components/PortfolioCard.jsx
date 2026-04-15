/**
 * Portfolio Card
 *
 * Dashboard card for a saved portfolio.
 * Shows: value, daily P&L, top holdings, allocation bar, actions.
 * Clicking the card navigates to the detail page.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2,
  Pencil,
  Copy,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { getAssetById } from '../data/assetUniverse';
import { computeDailyPnL } from '../data/models/Portfolio';

export default function PortfolioCard({
  portfolio,
  priceData,
  onDelete,
  onRename,
  onDuplicate,
  onEdit,
}) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(portfolio.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const holdings = portfolio.holdings;
  const tickers = Object.keys(holdings)
    .filter(t => holdings[t] > 0)
    .sort((a, b) => holdings[b] - holdings[a]);

  const metrics = portfolio.snapshot?.metrics;
  const totalValue = portfolio.snapshot?.totalValue ?? portfolio.initialInvestment;

  // Compute daily P&L from price data
  const pnl = useMemo(() => {
    return computeDailyPnL(holdings, priceData, totalValue);
  }, [holdings, priceData, totalValue]);

  const hasPnl = priceData && Object.keys(priceData).length > 0;

  const handleRename = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== portfolio.name) {
      onRename(portfolio.id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(portfolio.id);
      setConfirmDelete(false);
      setShowMenu(false);
    } else {
      setConfirmDelete(true);
    }
  };

  const handleCardClick = (e) => {
    // Don't navigate if clicking interactive elements
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('[data-menu]')) {
      return;
    }
    navigate(`/portfolio/${portfolio.id}`);
  };

  const timeAgo = getTimeAgo(portfolio.updatedAt);

  return (
    <div
      className="card overflow-hidden hover:shadow-soft-lg transition-all duration-200 cursor-pointer
                 hover:border-nami-200"
      onClick={handleCardClick}
    >
      {/* Header: Name + Value + Menu */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <form
                onSubmit={(e) => { e.preventDefault(); handleRename(); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="input text-sm py-1 px-2 flex-1"
                  autoFocus
                  maxLength={40}
                  onBlur={handleRename}
                  onClick={(e) => e.stopPropagation()}
                />
              </form>
            ) : (
              <h3 className="font-semibold text-nami-800 truncate">{portfolio.name}</h3>
            )}
            <p className="text-xs text-nami-400 mt-0.5">Updated {timeAgo}</p>
          </div>

          {/* Menu */}
          <div className="relative" data-menu>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); setConfirmDelete(false); }}
              className="p-1.5 rounded-lg hover:bg-nami-100 transition-colors text-nami-400"
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setShowMenu(false); setConfirmDelete(false); }} />
                <div className="absolute right-0 top-8 z-50 w-40 bg-white rounded-xl shadow-lg border border-nami-100 py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      setIsRenaming(true);
                      setNameInput(portfolio.name);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-nami-700 hover:bg-nami-50
                               flex items-center gap-2"
                  >
                    <Pencil size={14} />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit(portfolio.id);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-nami-700 hover:bg-nami-50
                               flex items-center gap-2"
                  >
                    <Pencil size={14} />
                    Edit Holdings
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDuplicate(portfolio.id);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-nami-700 hover:bg-nami-50
                               flex items-center gap-2"
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <div className="border-t border-nami-100 my-1" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
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

      {/* Value + Daily P&L */}
      <div className="px-4 pb-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-bold text-nami-900 tabular-nums">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          {hasPnl && pnl.dailyPercent !== 0 && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              pnl.dailyPercent > 0 ? 'text-teal-600' : pnl.dailyPercent < 0 ? 'text-red-500' : 'text-nami-400'
            }`}>
              {pnl.dailyPercent > 0 ? (
                <TrendingUp size={12} />
              ) : pnl.dailyPercent < 0 ? (
                <TrendingDown size={12} />
              ) : (
                <Minus size={12} />
              )}
              {pnl.dailyPercent > 0 ? '+' : ''}{pnl.dailyPercent.toFixed(2)}%
              <span className="text-nami-400 ml-0.5">today</span>
            </span>
          )}
        </div>
      </div>

      {/* Allocation bar */}
      <div className="px-4 pb-3">
        <div className="h-2 rounded-full overflow-hidden flex bg-nami-100">
          {tickers.map(ticker => {
            const asset = getAssetById(ticker);
            return (
              <div
                key={ticker}
                className="h-full"
                style={{
                  width: `${holdings[ticker]}%`,
                  backgroundColor: asset?.color || '#94a3b8',
                }}
                title={`${ticker}: ${holdings[ticker].toFixed(1)}%`}
              />
            );
          })}
        </div>

        {/* Top holdings */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
          {tickers.slice(0, 5).map(ticker => {
            const asset = getAssetById(ticker);
            return (
              <div key={ticker} className="flex items-center gap-1 text-xs text-nami-500">
                <div
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: asset?.color || '#94a3b8' }}
                />
                <span className="font-medium">{ticker}</span>
                <span className="text-nami-400">{holdings[ticker].toFixed(0)}%</span>
              </div>
            );
          })}
          {tickers.length > 5 && (
            <span className="text-xs text-nami-400">+{tickers.length - 5} more</span>
          )}
        </div>
      </div>

      {/* Metrics row */}
      {metrics && (
        <div className="px-4 pb-3 border-t border-nami-50 pt-2">
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-nami-400">Return </span>
              <span className={`font-medium ${metrics.annualReturn >= 0 ? 'text-teal-600' : 'text-coral-600'}`}>
                {(metrics.annualReturn * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-nami-400">Risk </span>
              <span className="font-medium text-nami-700">
                {(metrics.annualRisk * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-nami-400">Return/Risk </span>
              <span className="font-medium text-nami-700">
                {metrics.sharpe.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
