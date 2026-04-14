/**
 * usePortfolioValue Hook
 *
 * Calculates a saved portfolio's current value and price data.
 * Uses the price service to get current/cached prices.
 */

import { useState, useEffect } from 'react';
import { getPrices, getCachedPrices } from '../data/services/priceService';

/**
 * @param {Object} portfolio - Saved portfolio object
 * @returns {{ prices, totalValue, isLoading, hasAllPrices }}
 */
export function usePortfolioValue(portfolio) {
  const [prices, setPrices] = useState(() => {
    if (!portfolio) return new Map();
    const tickers = Object.keys(portfolio.holdings).filter(t => portfolio.holdings[t] > 0);
    return getCachedPrices(tickers);
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!portfolio) return;

    const tickers = Object.keys(portfolio.holdings).filter(t => portfolio.holdings[t] > 0);
    if (tickers.length === 0) return;

    let cancelled = false;

    async function fetchPrices() {
      setIsLoading(true);
      try {
        const result = await getPrices(tickers);
        if (!cancelled) {
          setPrices(result);
        }
      } catch (err) {
        console.warn('usePortfolioValue: price fetch failed', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchPrices();
    return () => { cancelled = true; };
  }, [portfolio?.id]);

  const tickers = portfolio
    ? Object.keys(portfolio.holdings).filter(t => portfolio.holdings[t] > 0)
    : [];

  const hasAllPrices = tickers.every(t => prices.has(t));

  return {
    prices,
    totalValue: portfolio?.snapshot?.totalValue || portfolio?.initialInvestment || 0,
    isLoading,
    hasAllPrices,
  };
}
