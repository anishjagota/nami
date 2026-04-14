/**
 * Nami API Client (Frontend)
 *
 * Calls our own Vercel serverless endpoints instead of third-party APIs directly.
 * This keeps API keys server-side and leverages server-side caching.
 *
 * Data flow:
 *   Browser → /api/prices     → Upstash Redis → EODHD
 *   Browser → /api/historical  → Upstash Redis → EODHD
 *
 * This module exposes the same function signatures as fmpProvider,
 * so it can be swapped in as a drop-in replacement.
 */

const API_BASE = '/api';
const REQUEST_TIMEOUT = 15000; // 15 seconds

/**
 * Make a request to our serverless API with timeout handling
 */
async function apiRequest(endpoint, params = {}) {
  const url = new URL(`${window.location.origin}${API_BASE}${endpoint}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        body.error || body.message || `API error: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }

    throw error;
  }
}

// ─── Historical Data ───────────────────────────────────────────────────────

/**
 * Fetch historical EOD prices for a ticker
 * Compatible with fmpProvider.fetchHistoricalPrices
 *
 * @param {string} ticker - Ticker symbol
 * @param {string} startDate - Start date "YYYY-MM-DD"
 * @param {string} endDate - End date "YYYY-MM-DD"
 * @returns {Promise<Array<{date: string, adjClose: number}>>}
 */
export async function fetchHistoricalPrices(ticker, startDate, endDate) {
  const result = await apiRequest('/historical', {
    ticker,
    from: startDate,
    to: endDate,
  });

  if (!result.data || result.data.length === 0) {
    return [];
  }

  // Normalize to the format the rest of the app expects
  return result.data.map(d => ({
    date: d.date,
    adjClose: d.adjClose ?? d.adjustedClose ?? d.close,
  }));
}

/**
 * Fetch historical prices with default date range (2007-01-01 to yesterday)
 * Compatible with fmpProvider.fetchHistoricalPricesDefault
 *
 * @param {string} ticker
 * @returns {Promise<Array<{date: string, adjClose: number}>>}
 */
export async function fetchHistoricalPricesDefault(ticker) {
  return fetchHistoricalPrices(ticker, '2007-01-01');
}

/**
 * Fetch historical prices for multiple tickers
 * Compatible with fmpProvider.fetchHistoricalPricesMultiple
 *
 * @param {string[]} tickers
 * @returns {Promise<Map<string, Array<{date: string, adjClose: number}>>>}
 */
export async function fetchHistoricalPricesMultiple(tickers) {
  const results = new Map();

  // Fetch sequentially to avoid overwhelming our API
  for (const ticker of tickers) {
    try {
      const prices = await fetchHistoricalPricesDefault(ticker);
      if (prices && prices.length > 0) {
        results.set(ticker, prices);
      }
    } catch (err) {
      console.warn(`Nami API: historical fetch failed for ${ticker}:`, err.message);
      // Continue with other tickers
    }
  }

  return results;
}

// ─── Current Prices ────────────────────────────────────────────────────────

/**
 * Fetch current/latest prices for multiple tickers (batch)
 *
 * @param {string[]} tickers
 * @returns {Promise<Object>} - { ticker: { price, change, changePercent, date, ... } }
 */
export async function fetchCurrentPrices(tickers) {
  const result = await apiRequest('/prices', {
    tickers: tickers.join(','),
  });

  return result.prices || {};
}

/**
 * Fetch current price for a single ticker
 *
 * @param {string} ticker
 * @returns {Promise<Object|null>} - { price, change, changePercent, date, ... }
 */
export async function fetchCurrentPrice(ticker) {
  const prices = await fetchCurrentPrices([ticker]);
  return prices[ticker] || null;
}

/**
 * Fetch quote (alias for fetchCurrentPrice, compatible with fmpProvider.fetchQuote)
 */
export async function fetchQuote(ticker) {
  return fetchCurrentPrice(ticker);
}

// ─── Health & Status ───────────────────────────────────────────────────────

/**
 * Check if our API backend is available
 *
 * @returns {Promise<{available: boolean, message: string}>}
 */
export async function checkAPIStatus() {
  try {
    const result = await apiRequest('/health');
    const available =
      result.status === 'healthy' || result.status === 'degraded';
    return { available, message: result.status };
  } catch {
    return { available: false, message: 'API not reachable' };
  }
}
