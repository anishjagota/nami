/**
 * Workspace Context
 *
 * Manages saved portfolios and provides workspace-level state.
 * Wraps the portfolio store with React state so the UI stays in sync.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
   * Update a portfolio's holdings
   */
  const updateHoldings = useCallback((id, holdings) => {
    updatePortfolioInStore(id, { holdings });
    refresh();
  }, [refresh]);

  /**
   * Refresh prices for all saved portfolios
   * Fetches current prices and updates snapshots
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

      // Update each portfolio's snapshot
      const priceObj = Object.fromEntries(prices);
      const updated = portfolios.map(p => {
        const portfolioPrices = {};
        for (const ticker of Object.keys(p.holdings)) {
          if (priceObj[ticker]) {
            portfolioPrices[ticker] = priceObj[ticker].price;
          }
        }
        return updateSnapshot(p, { prices: portfolioPrices });
      });

      // Persist
      for (const p of updated) {
        updatePortfolioInStore(p.id, {
          snapshot: p.snapshot,
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
  useEffect(() => {
    if (portfolios.length > 0) {
      refreshPrices();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    portfolios,
    portfolioCount: portfolios.length,
    isRefreshingPrices,

    saveNewPortfolio,
    removePortfolio,
    renamePortfolio,
    updateHoldings,
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
