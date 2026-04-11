/**
 * Data Provider Index
 * 
 * Provides a unified interface for fetching data, with automatic
 * fallback to mock data when the API is unavailable or for offline development.
 */

import * as fmpProvider from './fmpProvider';
import * as mockProvider from './mockProvider';
import { FMP_API_KEY } from '../../config/apiConfig';

// Determine if we should use mock data
// Use mock if:
// 1. API key is 'demo' or not set
// 2. Running in development without explicit API key
const USE_MOCK = FMP_API_KEY === 'demo' || !FMP_API_KEY;

let apiAvailable = null;
let apiCheckPromise = null;

/**
 * Check if the real API is available
 */
async function checkAPIAvailability() {
  if (apiCheckPromise) return apiCheckPromise;
  
  apiCheckPromise = (async () => {
    if (USE_MOCK) {
      apiAvailable = false;
      return false;
    }
    
    try {
      const status = await fmpProvider.checkAPIStatus();
      apiAvailable = status.available;
      return status.available;
    } catch {
      apiAvailable = false;
      return false;
    }
  })();
  
  return apiCheckPromise;
}

/**
 * Get the appropriate provider based on availability
 */
function getProvider() {
  return apiAvailable ? fmpProvider : null;
}

/**
 * Fetch historical prices with automatic fallback
 * 
 * @param {string} ticker - Ticker symbol
 * @returns {Promise<Array<{date: string, adjClose: number}>>}
 */
export async function fetchHistoricalPrices(ticker) {
  // Check API availability on first call
  if (apiAvailable === null) {
    await checkAPIAvailability();
  }
  
  // Try real API first if available
  if (apiAvailable) {
    try {
      const prices = await fmpProvider.fetchHistoricalPricesDefault(ticker);
      if (prices && prices.length > 0) {
        return prices;
      }
    } catch (error) {
      console.warn(`FMP fetch failed for ${ticker}, trying mock:`, error.message);
    }
  }
  
  // Fall back to mock data
  if (mockProvider.hasMockData(ticker)) {
    return mockProvider.fetchHistoricalPricesMock(ticker);
  }
  
  // No data available
  throw new Error(`No data available for ${ticker}`);
}

/**
 * Fetch historical prices for multiple tickers
 * 
 * @param {string[]} tickers - Array of ticker symbols
 * @returns {Promise<Map<string, Array>>}
 */
export async function fetchHistoricalPricesMultiple(tickers) {
  // Check API availability
  if (apiAvailable === null) {
    await checkAPIAvailability();
  }
  
  const results = new Map();
  const tickersToFetchFromAPI = [];
  
  // First, check which tickers have mock data
  for (const ticker of tickers) {
    if (!apiAvailable || !apiAvailable) {
      // Only mock available
      if (mockProvider.hasMockData(ticker)) {
        const prices = await mockProvider.fetchHistoricalPricesMock(ticker);
        results.set(ticker, prices);
      }
    } else {
      tickersToFetchFromAPI.push(ticker);
    }
  }
  
  // Fetch remaining from API
  if (tickersToFetchFromAPI.length > 0 && apiAvailable) {
    const apiResults = await fmpProvider.fetchHistoricalPricesMultiple(tickersToFetchFromAPI);
    
    for (const [ticker, prices] of apiResults) {
      if (prices && prices.length > 0) {
        results.set(ticker, prices);
      } else if (mockProvider.hasMockData(ticker)) {
        // Fall back to mock for this ticker
        const mockPrices = await mockProvider.fetchHistoricalPricesMock(ticker);
        results.set(ticker, mockPrices);
      }
    }
  }
  
  return results;
}

/**
 * Get returns directly (uses mock if available, faster)
 * 
 * @param {string} ticker - Ticker symbol
 * @returns {{returns: number[], dates: string[]} | null}
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

/**
 * Fetch real-time quote
 */
export async function fetchQuote(ticker) {
  if (apiAvailable === null) {
    await checkAPIAvailability();
  }
  
  if (apiAvailable) {
    return fmpProvider.fetchQuote(ticker);
  }
  
  // No mock quotes available
  return null;
}

/**
 * Fetch quotes for multiple tickers
 */
export async function fetchQuotesMultiple(tickers) {
  if (apiAvailable === null) {
    await checkAPIAvailability();
  }
  
  if (apiAvailable) {
    return fmpProvider.fetchQuotesMultiple(tickers);
  }
  
  return new Map();
}

/**
 * Search for symbols
 */
export async function searchSymbols(query, limit = 10) {
  if (apiAvailable === null) {
    await checkAPIAvailability();
  }
  
  if (apiAvailable) {
    return fmpProvider.searchSymbols(query, limit);
  }
  
  // For mock mode, filter curated ETFs by query
  // This will be implemented when we integrate with etfUniverse
  return [];
}

/**
 * Get provider status
 */
export async function getProviderStatus() {
  if (apiAvailable === null) {
    await checkAPIAvailability();
  }
  
  return {
    usingMock: !apiAvailable,
    apiAvailable,
    mockTickers: mockProvider.getMockTickers(),
  };
}

/**
 * Force re-check of API availability
 */
export async function recheckAPIAvailability() {
  apiAvailable = null;
  apiCheckPromise = null;
  return checkAPIAvailability();
}
