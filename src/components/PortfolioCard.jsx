/**
 * Portfolio Card
 *
 * Displays a saved portfolio on the Dashboard.
 * Shows allocation bar, key metrics, and actions.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Pencil, ArrowRight, MoreVertical, X } from 'lucide-react';
import { getAssetById } from '../data/assetUniverse';
import { usePortfolio } from '../context/PortfolioContext';

export default function PortfolioCard({ portfolio, onDelete, onRename }) {
  const navigate = useNavigate();
  const { loadPreset } = usePortfolio();
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(portfolio.name);

  const holdings = portfolio.holdings;
  const tickers = Object.keys(holdings)
    .filter(t => holdings[t] > 0)
    .sort((a, b) => holdings[b] - holdings[a]);

  const metrics = portfolio.snapshot?.metrics;

  const handleLoad = () => {
    loadPreset(holdings);
    navigate('/compare');
  };

  const handleRename = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== portfolio.name) {
      onRename(portfolio.id, trimmed);
    }
    setIsRenaming(false);
  };

  const timeAgo = getTimeAgo(portfolio.updatedAt);

  return (
    <div className="card overflow-hidden hover:shadow-soft-lg transition-shadow">
      {/* Header */}
      <div className="p-4 pb-3">
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
                />
              </form>
            ) : (
              <h3 className="font-semibold text-nami-800 truncate">{portfolio.name}</h3>
            )}
            <p className="text-xs text-nami-400 mt-0.5">{timeAgo}</p>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-nami-100 transition-colors text-nami-400"
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-50 w-36 bg-white rounded-xl shadow-lg border border-nami-100 py-1">
                  <button
                    onClick={() => { setShowMenu(false); setIsRenaming(true); setNameInput(portfolio.name); }}
                    className="w-full px-3 py-2 text-left text-sm text-nami-700 hover:bg-nami-50
                               flex items-center gap-2"
                  >
                    <Pencil size={14} />
                    Rename
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onDelete(portfolio.id); }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50
                               flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Allocation bar */}
      <div className="px-4 pb-3">
        <div className="h-2.5 rounded-full overflow-hidden flex bg-nami-100">
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

        {/* Ticker labels */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
          {tickers.slice(0, 6).map(ticker => {
            const asset = getAssetById(ticker);
            return (
              <div key={ticker} className="flex items-center gap-1 text-xs text-nami-500">
                <div
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: asset?.color || '#94a3b8' }}
                />
                <span>{ticker}</span>
                <span className="text-nami-400">{holdings[ticker].toFixed(0)}%</span>
              </div>
            );
          })}
          {tickers.length > 6 && (
            <span className="text-xs text-nami-400">+{tickers.length - 6} more</span>
          )}
        </div>
      </div>

      {/* Metrics row */}
      {metrics && (
        <div className="px-4 pb-3">
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
              <span className="text-nami-400">Return / Risk </span>
              <span className="font-medium text-nami-700">
                {metrics.sharpe.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action */}
      <div className="border-t border-nami-100 p-3">
        <button
          onClick={handleLoad}
          className="w-full flex items-center justify-center gap-2
                     text-sm font-medium text-coral-600 hover:text-coral-700
                     py-1.5 rounded-lg hover:bg-coral-50 transition-colors"
        >
          Load & Compare
          <ArrowRight size={14} />
        </button>
      </div>
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

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
