/**
 * Price Service
 *
 * Fetches and caches current asset prices for dashboard monitoring.
 *
 * Architecture (Stage 2):
 *   1. Session cache (in-memory Map) — instant re-reads within 5 min
 *   2. Our API (/api/prices) — server-side cache + EODHD
 *   3. FMP fallback — legacy direct API (if key is configured)
 *   4. localStorage snapshot — offline fallback
 *
 * This service is for CURRENT prices (dashboard, monitoring).
 * Historical data for calculations goes through historicalDataService.
 */

import { FMP_API_KEY, FMP_BASE_URL, API_CONFIG } from '../../config/apiConfig';

// In-memory session cache
const sessionCache = new Map();
const SESSION_TTL = 5 * 60 * 1000; // 5 minutes

// localStorage key for offline fallback
const PRICE_SNAPSHOT_KEY = 'nami-price-snapshot';

/**
 * Get current price for a single ticker
 * @param {string} ticker
 * @returns {Promise<{price: number, change: number, changePercent: number} | null>}
 */
export async function getPrice(ticker) {
  // Check session cache
  const cached = sessionCache.get(ticker);
  if (cached && Date.now() - cached.fetchedAt < SESSION_TTL) {
    return cached.data;
  }

  // Try our API first (batch of 1)
  try {
    const apiResult = await _fetchFromNamiAPI([ticker]);
    if (apiResult && apiResult[ticker]) {
      const priceData = _normalizePriceData(apiResult[ticker], ticker);
      sessionCache.set(ticker, { data: priceData, fetchedAt: Date.now() });
      _updateSnapshot(ticker, priceData);
      return priceData;
    }
  } catch {
    // Fall through to FMP
  }

  // FMP fallback
  try {
    const data = await _fetchFromFMP(ticker);
    if (data) {
      const priceData = {
        price: data.price,
        change: data.change || 0,
        changePercent: data.changePercentage || 0,
        name: data.companyName || ticker,
      };
      sessionCache.set(ticker, { data: priceData, fetchedAt: Date.now() });
      _updateSnapshot(ticker, priceData);
      return priceData;
    }
  } catch {
    // Fall through to offline fallback
  }

  return _getFallbackPrice(ticker);
}

/**
 * Get current prices for multiple tickers
 * @param {string[]} tickers
 * @returns {Promise<Map<string, {price, change, changePercent}>>}
 */
export async function getPrices(tickers) {
  const results = new Map();
  const toFetch = [];

  // Check session cache first
  for (const ticker of tickers) {
    const cached = sessionCache.get(ticker);
    if (cached && Date.now() - cached.fetchedAt < SESSION_TTL) {
      results.set(ticker, cached.data);
    } else {
      toFetch.push(ticker);
    }
  }

  if (toFetch.length === 0) return results;

  // Try our API first (batch request)
  try {
    const apiResult = await _fetchFromNamiAPI(toFetch);
    if (apiResult) {
      for (const [ticker, rawData] of Object.entries(apiResult)) {
        const priceData = _normalizePriceData(rawData, ticker);
        sessionCache.set(ticker, { data: priceData, fetchedAt: Date.now() });
        _updateSnapshot(ticker, priceData);
        results.set(ticker, priceData);
      }

      // Remove fetched tickers from toFetch
      const fetched = Object.keys(apiResult);
      const stillMissing = toFetch.filter(t => !fetched.includes(t));

      // If some are still missing, try FMP for those
      if (stillMissing.length > 0) {
        await _fetchRemainingFromFMP(stillMissing, results);
      }

      return results;
    }
  } catch {
    // Our API failed — try FMP for all remaining
  }

  // FMP fallback for all unfetched
  await _fetchRemainingFromFMP(toFetch, results);

  // localStorage fallback for anything still missing
  for (const ticker of toFetch) {
    if (!results.has(ticker)) {
      const fallback = _getFallbackPrice(ticker);
      if (fallback) results.set(ticker, fallback);
    }
  }

  return results;
}

/**
 * Get prices from cache only (no network calls)
 * @param {string[]} tickers
 * @returns {Map<string, {price, change, changePercent}>}
 */
export function getCachedPrices(tickers) {
  const results = new Map();

  for (const ticker of tickers) {
    const cached = sessionCache.get(ticker);
    if (cached) {
      results.set(ticker, cached.data);
    } else {
      const fallback = _getFallbackPrice(ticker);
      if (fallback) results.set(ticker, fallback);
    }
  }

  return results;
}

/**
 * Clear the session cache
 */
export function clearPriceCache() {
  sessionCache.clear();
}

// ─── Internal Helpers ──────────────────────────────────────────────────────

/**
 * Normalize price data from our API to the format the app expects
 */
function _normalizePriceData(raw, ticker) {
  return {
    price: raw.price,
    change: raw.change || 0,
    changePercent: raw.changePercent || raw.change_p || 0,
    name: raw.name || ticker,
    date: raw.date,
  };
}

/**
 * Fetch from our Nami API (batch endpoint)
 */
async function _fetchFromNamiAPI(tickers) {
  try {
    const url = `/api/prices?tickers=${tickers.join(',')}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    return data.prices || null;
  } catch {
    return null;
  }
}

/**
 * Fetch from FMP (legacy fallback, one ticker at a time)
 */
async function _fetchFromFMP(ticker) {
  if (!FMP_API_KEY || FMP_API_KEY === 'demo') return null;

  const url = new URL(`${FMP_BASE_URL}/profile`);
  url.searchParams.set('symbol', ticker);
  url.searchParams.set('apikey', FMP_API_KEY);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    return data[0];
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Fetch remaining tickers from FMP individually
 */
async function _fetchRemainingFromFMP(tickers, results) {
  for (const ticker of tickers) {
    if (results.has(ticker)) continue;

    try {
      const data = await _fetchFromFMP(ticker);
      if (data) {
        const priceData = {
          price: data.price,
          change: data.change || 0,
          changePercent: data.changePercentage || 0,
          name: data.companyName || ticker,
        };
        sessionCache.set(ticker, { data: priceData, fetchedAt: Date.now() });
        _updateSnapshot(ticker, priceData);
        results.set(ticker, priceData);
      }
    } catch {
      // Continue with other tickers
    }
  }
}

function _getFallbackPrice(ticker) {
  try {
    const raw = localStorage.getItem(PRICE_SNAPSHOT_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    const entry = snapshot[ticker];
    if (!entry) return null;
    return { ...entry, isStale: true };
  } catch {
    return null;
  }
}

function _updateSnapshot(ticker, priceData) {
  try {
    const raw = localStorage.getItem(PRICE_SNAPSHOT_KEY);
    const snapshot = raw ? JSON.parse(raw) : {};
    snapshot[ticker] = {
      price: priceData.price,
      change: priceData.change,
      changePercent: priceData.changePercent,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(PRICE_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Non-critical
  }
}
