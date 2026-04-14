/**
 * Data Provider Index
 *
 * Provides a unified interface for fetching data with a three-tier fallback:
 *
 *   1. Nami API (our serverless backend → Upstash cache → EODHD)
 *   2. FMP API (legacy direct calls, if API key is configured)
 *   3. Mock/static data (7 core ETFs, always available offline)
 *
 * Callers don't need to know which provider is active.
 * The fallback chain ensures the app always works — even offline.
 */

import * as namiAPI from './namiAPI';
import * as fmpProvider from './fmpProvider';
import * as mockProvider from './mockProvider';
import { FMP_API_KEY } from '../../config/apiConfig';

// Track which providers are available
let namiAPIAvailable = null; // null = not checked, true/false = checked
let fmpAvailable = null;
let checkingNamiAPI = null;
let checkingFMP = null;

/**
 * Check if our Nami API backend is available
 */
async function checkNamiAPIAvailability() {
  if (checkingNamiAPI) return checkingNamiAPI;

  checkingNamiAPI = (async () => {
    try {
      const status = await namiAPI.checkAPIStatus();
      namiAPIAvailable = status.available;
      return status.available;
    } catch {
      namiAPIAvailable = false;
      return false;
    }
  })();

  return checkingNamiAPI;
}

/**
 * Check if FMP API is available (legacy fallback)
 */
async function checkFMPAvailability() {
  if (checkingFMP) return checkingFMP;

  const hasFMPKey = FMP_API_KEY && FMP_API_KEY !== 'demo';
  if (!hasFMPKey) {
    fmpAvailable = false;
    return false;
  }

  checkingFMP = (async () => {
    try {
      const status = await fmpProvider.checkAPIStatus();
      fmpAvailable = status.available;
      return status.available;
    } catch {
      fmpAvailable = false;
      return false;
    }
  })();

  return checkingFMP;
}

// ─── Historical Prices ─────────────────────────────────────────────────────

/**
 * Fetch historical prices with three-tier fallback
 *
 * @param {string} ticker - Ticker symbol
 * @returns {Promise<Array<{date: string, adjClose: number}>>}
 */
export async function fetchHistoricalPrices(ticker) {
  // Check provider availability on first call
  if (namiAPIAvailable === null) {
    await checkNamiAPIAvailability();
  }

  // Tier 1: Our API (EODHD via serverless + cache)
  if (namiAPIAvailable) {
    try {
      const prices = await namiAPI.fetchHistoricalPricesDefault(ticker);
      if (prices && prices.length > 0) {
        return prices;
      }
    } catch (error) {
      console.warn(`Nami API failed for ${ticker}:`, error.message);
    }
  }

  // Tier 2: FMP direct (legacy, if key is configured)
  if (fmpAvailable === null) {
    await checkFMPAvailability();
  }
  if (fmpAvailable) {
    try {
      const prices = await fmpProvider.fetchHistoricalPricesDefault(ticker);
      if (prices && prices.length > 0) {
        return prices;
      }
    } catch (error) {
      console.warn(`FMP failed for ${ticker}:`, error.message);
    }
  }

  // Tier 3: Static/mock data (7 core ETFs)
  if (mockProvider.hasMockData(ticker)) {
    return mockProvider.fetchHistoricalPricesMock(ticker);
  }

  throw new Error(`No data available for ${ticker}`);
}

/**
 * Fetch historical prices for multiple tickers
 *
 * @param {string[]} tickers - Array of ticker symbols
 * @returns {Promise<Map<string, Array>>}
 */
export async function fetchHistoricalPricesMultiple(tickers) {
  const results = new Map();

  for (const ticker of tickers) {
    try {
      const prices = await fetchHistoricalPrices(ticker);
      if (prices && prices.length > 0) {
        results.set(ticker, prices);
      }
    } catch (error) {
      console.warn(`No data for ${ticker}:`, error.message);
    }
  }

  return results;
}

// ─── Current Prices / Quotes ───────────────────────────────────────────────

/**
 * Fetch real-time quote for a ticker
 */
export async function fetchQuote(ticker) {
  if (namiAPIAvailable === null) {
    await checkNamiAPIAvailability();
  }

  // Tier 1: Our API
  if (namiAPIAvailable) {
    try {
      const quote = await namiAPI.fetchQuote(ticker);
      if (quote) return quote;
    } catch (error) {
      console.warn(`Nami API quote failed for ${ticker}:`, error.message);
    }
  }

  // Tier 2: FMP
  if (fmpAvailable === null) {
    await checkFMPAvailability();
  }
  if (fmpAvailable) {
    try {
      return await fmpProvider.fetchQuote(ticker);
    } catch {
      // Continue
    }
  }

  return null;
}

/**
 * Fetch current prices for multiple tickers (batch)
 */
export async function fetchCurrentPrices(tickers) {
  if (namiAPIAvailable === null) {
    await checkNamiAPIAvailability();
  }

  // Tier 1: Our API (supports batch)
  if (namiAPIAvailable) {
    try {
      const prices = await namiAPI.fetchCurrentPrices(tickers);
      if (prices && Object.keys(prices).length > 0) {
        return prices;
      }
    } catch (error) {
      console.warn('Nami API batch price fetch failed:', error.message);
    }
  }

  // Tier 2: FMP individual fetches
  if (fmpAvailable === null) {
    await checkFMPAvailability();
  }
  if (fmpAvailable) {
    const results = {};
    for (const ticker of tickers) {
      try {
        const quote = await fmpProvider.fetchQuote(ticker);
        if (quote) results[ticker] = quote;
      } catch {
        // Continue
      }
    }
    if (Object.keys(results).length > 0) return results;
  }

  return {};
}

// ─── Mock Data Helpers ─────────────────────────────────────────────────────

/**
 * Get returns directly from mock data (faster, no network)
 */
export function getMockReturnsIfAvailable(ticker) {
  return mockProvider.getMockReturns(ticker);
}

/**
 * Check if a ticker has mock data available
 */
export function hasMockData(ticker) {
  return mockProvider.hasMockData(ticker);
}

// ─── Search ────────────────────────────────────────────────────────────────

/**
 * Search for symbols
 */
export async function searchSymbols(query, limit = 10) {
  if (fmpAvailable === null) {
    await checkFMPAvailability();
  }

  if (fmpAvailable) {
    return fmpProvider.searchSymbols(query, limit);
  }

  // No search available in mock mode
  return [];
}

// ─── Status ────────────────────────────────────────────────────────────────

/**
 * Get provider status
 */
export async function getProviderStatus() {
  if (namiAPIAvailable === null) {
    await checkNamiAPIAvailability();
  }
  if (fmpAvailable === null) {
    await checkFMPAvailability();
  }

  return {
    namiAPI: namiAPIAvailable,
    fmpAvailable: fmpAvailable,
    usingMock: !namiAPIAvailable && !fmpAvailable,
    mockTickers: mockProvider.getMockTickers(),
  };
}

/**
 * Force re-check of all provider availability
 */
export async function recheckAPIAvailability() {
  namiAPIAvailable = null;
  fmpAvailable = null;
  checkingNamiAPI = null;
  checkingFMP = null;
  await checkNamiAPIAvailability();
  await checkFMPAvailability();
  return getProviderStatus();
}
