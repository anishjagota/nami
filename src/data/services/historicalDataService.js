/**
 * Historical Data Service
 *
 * Orchestrates fetching, caching, and transforming historical return data.
 * This is the main interface for the quant engine (backtest, Monte Carlo, optimization).
 *
 * Optimized flow (Stage 2):
 * 1. Session cache (in-memory Map) — instant
 * 2. IndexedDB cache (30-day TTL) — fast, persistent
 * 3. Pre-computed returns from /api/returns — server computes monthly returns,
 *    caches in Redis for 30 days, sends ~4KB instead of ~450KB
 * 4. Daily prices fallback (legacy) — fetch raw prices, transform client-side
 * 5. Static embedded data — 7 core ETFs always available offline
 */

import {
  getCachedReturns,
  getCachedReturnsMultiple,
  setCachedReturns,
  setCachedReturnsMultiple,
} from '../cache/historicalCache';

import {
  fetchHistoricalPrices as fetchHistoricalPricesFromProvider,
  fetchHistoricalPricesMultiple,
} from '../providers';

import { fetchPrecomputedReturns } from '../providers/namiAPI';

import {
  dailyPricesToMonthlyReturns,
  alignReturnSeries,
  buildReturnsMatrix,
  validateReturnsData,
  getDateRangeInfo,
} from '../transforms/priceToReturns';

import { DATA_REQUIREMENTS } from '../../config/apiConfig';
import { getCoreETFs } from '../universe/etfUniverse';

// In-memory cache for current session (avoids repeated IndexedDB reads)
const sessionCache = new Map();

// Track in-flight requests to avoid duplicate fetches
const pendingRequests = new Map();

/**
 * Get monthly returns for a single ticker
 * 
 * @param {string} ticker - Ticker symbol
 * @param {Object} options - Options
 * @param {boolean} options.forceRefresh - Skip cache and fetch fresh data
 * @param {boolean} options.validate - Validate data meets requirements (default true)
 * 
 * @returns {Promise<{returns: number[], dates: string[], fromCache: boolean}>}
 */
export async function getReturns(ticker, options = {}) {
  const { forceRefresh = false, validate = true } = options;
  
  // Check session cache first (fastest)
  if (!forceRefresh && sessionCache.has(ticker)) {
    const cached = sessionCache.get(ticker);
    return { ...cached, fromCache: true };
  }
  
  // Check if there's already a pending request for this ticker
  if (pendingRequests.has(ticker)) {
    return pendingRequests.get(ticker);
  }
  
  // Create the fetch promise
  const fetchPromise = (async () => {
    try {
      // Check IndexedDB cache
      if (!forceRefresh) {
        const cached = await getCachedReturns(ticker);
        
        if (cached && !cached.isStale) {
          // Fresh cache hit
          sessionCache.set(ticker, { returns: cached.returns, dates: cached.dates });
          return { returns: cached.returns, dates: cached.dates, fromCache: true };
        }
        
        if (cached && cached.isStale) {
          // Stale cache - return immediately but refresh in background
          sessionCache.set(ticker, { returns: cached.returns, dates: cached.dates });
          
          // Background refresh (don't await)
          refreshTickerInBackground(ticker);
          
          return { returns: cached.returns, dates: cached.dates, fromCache: true };
        }
      }
      
      // Cache miss — try pre-computed returns first (smaller + server-cached)
      try {
        const precomputed = await fetchPrecomputedReturns([ticker]);
        if (precomputed[ticker]?.returns?.length > 0) {
          const { returns, dates } = precomputed[ticker];

          if (validate) {
            const validation = validateReturnsData(returns, DATA_REQUIREMENTS.minMonthsHistory);
            if (!validation.valid) {
              throw new Error(`${ticker}: ${validation.reason}`);
            }
          }

          await setCachedReturns(ticker, returns, dates);
          sessionCache.set(ticker, { returns, dates });
          return { returns, dates, fromCache: false };
        }
      } catch (err) {
        // Re-throw validation errors (daily prices won't help either)
        if (err.message?.includes('Insufficient')) throw err;
        console.warn(`Pre-computed returns unavailable for ${ticker}, trying daily prices`);
      }

      // Fallback: fetch raw daily prices and transform client-side
      const prices = await fetchHistoricalPricesFromProvider(ticker);

      if (!prices || prices.length === 0) {
        throw new Error(`No price data available for ${ticker}`);
      }

      const { returns, dates } = dailyPricesToMonthlyReturns(prices);

      if (validate) {
        const validation = validateReturnsData(returns, DATA_REQUIREMENTS.minMonthsHistory);
        if (!validation.valid) {
          throw new Error(`${ticker}: ${validation.reason}`);
        }
      }

      await setCachedReturns(ticker, returns, dates);
      sessionCache.set(ticker, { returns, dates });

      return { returns, dates, fromCache: false };
      
    } finally {
      // Clean up pending request
      pendingRequests.delete(ticker);
    }
  })();
  
  // Store the pending request
  pendingRequests.set(ticker, fetchPromise);
  
  return fetchPromise;
}

/**
 * Background refresh for stale data
 * Prefers pre-computed returns (smaller, faster, server-cached)
 */
async function refreshTickerInBackground(ticker) {
  // Try pre-computed returns first
  try {
    const precomputed = await fetchPrecomputedReturns([ticker]);
    if (precomputed[ticker]?.returns?.length > 0) {
      const { returns, dates } = precomputed[ticker];
      await setCachedReturns(ticker, returns, dates);
      sessionCache.set(ticker, { returns, dates });
      return;
    }
  } catch {
    // Fall through to daily prices
  }

  // Fallback: raw daily prices
  try {
    const prices = await fetchHistoricalPricesFromProvider(ticker);
    if (prices && prices.length > 0) {
      const { returns, dates } = dailyPricesToMonthlyReturns(prices);
      await setCachedReturns(ticker, returns, dates);
      sessionCache.set(ticker, { returns, dates });
    }
  } catch (error) {
    console.warn(`Background refresh failed for ${ticker}:`, error);
  }
}

/**
 * Get monthly returns for multiple tickers
 * 
 * @param {string[]} tickers - Array of ticker symbols
 * @param {Object} options - Options
 * @param {boolean} options.forceRefresh - Skip cache and fetch fresh data
 * 
 * @returns {Promise<Map<string, {returns: number[], dates: string[]}>>}
 */
export async function getReturnsMultiple(tickers, options = {}) {
  const { forceRefresh = false } = options;
  
  const results = new Map();
  const tickersToFetch = [];
  
  // Check caches first
  for (const ticker of tickers) {
    if (!forceRefresh && sessionCache.has(ticker)) {
      results.set(ticker, sessionCache.get(ticker));
    } else {
      tickersToFetch.push(ticker);
    }
  }
  
  // Check IndexedDB for remaining tickers
  if (tickersToFetch.length > 0 && !forceRefresh) {
    const cached = await getCachedReturnsMultiple(tickersToFetch);
    
    for (const [ticker, data] of cached) {
      if (!data.isStale) {
        results.set(ticker, { returns: data.returns, dates: data.dates });
        sessionCache.set(ticker, { returns: data.returns, dates: data.dates });
        
        // Remove from fetch list
        const idx = tickersToFetch.indexOf(ticker);
        if (idx > -1) tickersToFetch.splice(idx, 1);
      } else {
        // Use stale data but mark for refresh
        results.set(ticker, { returns: data.returns, dates: data.dates });
        sessionCache.set(ticker, { returns: data.returns, dates: data.dates });
        
        // Background refresh
        refreshTickerInBackground(ticker);
        
        const idx = tickersToFetch.indexOf(ticker);
        if (idx > -1) tickersToFetch.splice(idx, 1);
      }
    }
  }
  
  // Fetch remaining tickers
  if (tickersToFetch.length > 0) {
    const newCacheEntries = [];

    // Try batch pre-computed returns first (single request, ~4KB per ticker)
    try {
      const precomputed = await fetchPrecomputedReturns(tickersToFetch);

      for (const [ticker, data] of Object.entries(precomputed)) {
        if (data?.returns?.length > 0) {
          results.set(ticker, { returns: data.returns, dates: data.dates });
          sessionCache.set(ticker, { returns: data.returns, dates: data.dates });
          newCacheEntries.push({ ticker, returns: data.returns, dates: data.dates });
        }
      }

      // Remove successfully fetched tickers
      const fetched = new Set(
        Object.keys(precomputed).filter(t => precomputed[t]?.returns?.length > 0)
      );
      for (const t of fetched) {
        const idx = tickersToFetch.indexOf(t);
        if (idx > -1) tickersToFetch.splice(idx, 1);
      }
    } catch (err) {
      console.warn('Batch pre-computed returns failed, falling back to daily prices:', err.message);
    }

    // Fallback: fetch remaining via individual daily price requests
    if (tickersToFetch.length > 0) {
      const prices = await fetchHistoricalPricesMultiple(tickersToFetch);

      for (const [ticker, dailyPrices] of prices) {
        if (dailyPrices && dailyPrices.length > 0) {
          const { returns, dates } = dailyPricesToMonthlyReturns(dailyPrices);

          results.set(ticker, { returns, dates });
          sessionCache.set(ticker, { returns, dates });
          newCacheEntries.push({ ticker, returns, dates });
        }
      }
    }

    // Batch cache update
    if (newCacheEntries.length > 0) {
      await setCachedReturnsMultiple(newCacheEntries);
    }
  }
  
  return results;
}

/**
 * Get aligned returns matrix for a set of tickers
 * 
 * This is the main function used by the portfolio engine.
 * Returns a matrix where rows are time periods and columns are assets.
 * 
 * @param {string[]} tickers - Array of ticker symbols in desired order
 * @param {Object} options - Options
 * 
 * @returns {Promise<{
 *   matrix: number[][],           // Returns matrix [time][asset]
 *   dates: string[],              // Common date range
 *   tickers: string[],            // Tickers in order (may exclude some if data unavailable)
 *   excluded: string[],           // Tickers excluded due to insufficient data
 *   dateRange: {startDate, endDate, numMonths}
 * }>}
 */
export async function getAlignedReturnsMatrix(tickers, options = {}) {
  // Fetch returns for all tickers
  const returnsMap = await getReturnsMultiple(tickers, options);
  
  // Align to common date range
  const { alignedReturns, commonDates, tickersExcluded } = alignReturnSeries(returnsMap);
  
  // Determine which tickers have data
  const includedTickers = tickers.filter(t => alignedReturns.has(t));
  const excludedTickers = [...tickersExcluded, ...tickers.filter(t => !alignedReturns.has(t))];
  
  // Build the matrix
  const matrix = buildReturnsMatrix(alignedReturns, includedTickers);
  
  // Get date range info
  const dateRange = getDateRangeInfo(commonDates);
  
  return {
    matrix,
    dates: commonDates,
    tickers: includedTickers,
    excluded: excludedTickers,
    dateRange,
  };
}

/**
 * Prefetch core ETFs in background
 * Called on app initialization to ensure basic data is available quickly.
 */
export async function prefetchCoreETFs() {
  const coreETFs = getCoreETFs();
  
  // Don't await - let it run in background
  getReturnsMultiple(coreETFs).catch(error => {
    console.warn('Core ETF prefetch failed:', error);
  });
}

/**
 * Check if a ticker has sufficient historical data
 * 
 * @param {string} ticker - Ticker symbol
 * @returns {Promise<{valid: boolean, reason?: string, months?: number}>}
 */
export async function checkTickerDataAvailability(ticker) {
  try {
    const { returns, dates } = await getReturns(ticker, { validate: false });
    
    const validation = validateReturnsData(returns, DATA_REQUIREMENTS.minMonthsHistory);
    
    if (!validation.valid) {
      return { valid: false, reason: validation.reason, months: returns.length };
    }
    
    return { valid: true, months: returns.length };
    
  } catch (error) {
    return { valid: false, reason: error.message };
  }
}

/**
 * Get summary statistics for data availability
 */
export async function getDataSummary(tickers) {
  const summary = {
    total: tickers.length,
    cached: 0,
    available: 0,
    unavailable: [],
  };
  
  for (const ticker of tickers) {
    if (sessionCache.has(ticker)) {
      summary.cached++;
      summary.available++;
    } else {
      const cached = await getCachedReturns(ticker);
      if (cached) {
        summary.available++;
      } else {
        summary.unavailable.push(ticker);
      }
    }
  }
  
  return summary;
}

/**
 * Seed the session cache with pre-generated static data.
 * Called at app initialization so all 45 curated ETFs are available
 * instantly — zero network calls needed for the curated universe.
 *
 * @param {Object} staticData - { ticker: { returns: number[], dates: string[] } }
 */
export function seedSessionCacheFromStatic(staticData) {
  for (const [ticker, data] of Object.entries(staticData)) {
    if (data?.returns?.length > 0 && !sessionCache.has(ticker)) {
      sessionCache.set(ticker, { returns: data.returns, dates: data.dates });
    }
  }
}

/**
 * Clear all caches (for debugging/testing)
 */
export function clearSessionCache() {
  sessionCache.clear();
}
