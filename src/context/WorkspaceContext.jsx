/**
 * Workspace Context
 *
 * Manages saved portfolios and provides workspace-level state.
 * Wraps the portfolio store with React state so the UI stays in sync.
 *
 * Provides: save, delete, rename, duplicate, update holdings,
 *           price refresh, per-ticker price data for dashboard monitoring.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  getAllPortfolios,
  savePortfolio as storeSave,
  deletePortfolio as storeDelete,
  updatePortfolioInStore,
  getPortfolioById,
} from '../data/services/portfolioStore';
import { createPortfolio, updateSnapshot } from '../data/models/Portfolio';
import { getPrices } from '../data/services/priceService';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [portfolios, setPortfolios] = useState(() => getAllPortfolios());
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  // Store full price data (with change/changePercent) for dashboard monitoring
  // Shape: { ticker: { price, change, changePercent, name, date } }
  const [latestPriceData, setLatestPriceData] = useState({});

  // Track the ID of a portfolio being edited (for BuildPortfolio page)
  const [editingPortfolioId, setEditingPortfolioId] = useState(null);

  // Re-read from store (in case of external changes)
  const refresh = useCallback(() => {
    setPortfolios(getAllPortfolios());
  }, []);

  /**
   * Save a new portfolio
   */
  const saveNewPortfolio = useCallback(({ name, holdings, initialInvestment, metrics, prices, notes }) => {
    const portfolio = createPortfolio({ name, holdings, initialInvestment, metrics, prices, notes });
    storeSave(portfolio);
    refresh();
    return portfolio;
  }, [refresh]);

  /**
   * Delete a portfolio
   */
  const removePortfolio = useCallback((id) => {
    storeDelete(id);
    refresh();
  }, [refresh]);

  /**
   * Rename a portfolio
   */
  const renamePortfolio = useCallback((id, newName) => {
    updatePortfolioInStore(id, { name: newName.trim() });
    refresh();
  }, [refresh]);

  /**
   * Update a portfolio's holdings (used when editing)
   */
  const updateHoldings = useCallback((id, holdings) => {
    updatePortfolioInStore(id, { holdings });
    refresh();
  }, [refresh]);

  /**
   * Duplicate a portfolio
   * Creates a copy with " (Copy)" appended to the name.
   * The duplicate gets a new ID, new timestamps, and a fresh originSnapshot.
   */
  const duplicatePortfolio = useCallback((id) => {
    const original = getPortfolioById(id);
    if (!original) return null;

    const duplicate = createPortfolio({
      name: `${original.name} (Copy)`,
      holdings: { ...original.holdings },
      initialInvestment: original.initialInvestment,
      metrics: original.snapshot?.metrics,
      prices: original.snapshot?.prices,
      notes: original.notes,
    });

    storeSave(duplicate);
    refresh();
    return duplicate;
  }, [refresh]);

  /**
   * Update a saved portfolio's holdings and optionally its name
   * Used by the "edit portfolio" flow.
   */
  const updateSavedPortfolio = useCallback((id, { name, holdings, metrics }) => {
    const updates = {};
    if (name != null) updates.name = name.trim();
    if (holdings != null) updates.holdings = { ...holdings };
    if (metrics != null) {
      const existing = getPortfolioById(id);
      updates.snapshot = {
        ...(existing?.snapshot || {}),
        metrics: { ...metrics },
      };
    }
    updatePortfolioInStore(id, updates);
    setEditingPortfolioId(null);
    refresh();
  }, [refresh]);

  /**
   * Refresh prices for all saved portfolios
   * Fetches current prices and updates snapshots.
   * Also stores full price data (with change/changePercent) for dashboard P&L.
   */
  const refreshPrices = useCallback(async () => {
    if (portfolios.length === 0) return;

    setIsRefreshingPrices(true);
    try {
      // Collect all unique tickers
      const allTickers = new Set();
      for (const p of portfolios) {
        Object.keys(p.holdings).forEach(t => {
          if (p.holdings[t] > 0) allTickers.add(t);
        });
      }

      // Fetch prices
      const prices = await getPrices([...allTickers]);

      // Build full price data map and price-only map
      const fullPriceData = {};
      const priceObj = {};
      for (const [ticker, data] of prices) {
        fullPriceData[ticker] = data;
        priceObj[ticker] = data.price;
      }

      setLatestPriceData(fullPriceData);

      // Update each portfolio's snapshot
      const updated = portfolios.map(p => {
        const portfolioPrices = {};
        for (const ticker of Object.keys(p.holdings)) {
          if (priceObj[ticker]) {
            portfolioPrices[ticker] = priceObj[ticker];
          }
        }
        return updateSnapshot(p, { prices: portfolioPrices });
      });

      // Persist
      for (const p of updated) {
        updatePortfolioInStore(p.id, {
          snapshot: p.snapshot,
          originSnapshot: p.originSnapshot,
          updatedAt: p.updatedAt,
        });
      }
      refresh();
    } catch (err) {
      console.warn('Price refresh failed:', err);
    } finally {
      setIsRefreshingPrices(false);
    }
  }, [portfolios, refresh]);

  // Refresh prices on mount (once)
  const didRefresh = useRef(false);
  useEffect(() => {
    if (portfolios.length > 0 && !didRefresh.current) {
      didRefresh.current = true;
      refreshPrices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    portfolios,
    portfolioCount: portfolios.length,
    isRefreshingPrices,
    latestPriceData,
    editingPortfolioId,

    saveNewPortfolio,
    removePortfolio,
    renamePortfolio,
    updateHoldings,
    duplicatePortfolio,
    updateSavedPortfolio,
    setEditingPortfolioId,
    refreshPrices,
    getPortfolio: getPortfolioById,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export default WorkspaceContext;
