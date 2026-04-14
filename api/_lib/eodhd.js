/**
 * EODHD API Client (Server-side only)
 *
 * Used by Vercel serverless functions to fetch market data from EODHD.
 * Supports US stocks/ETFs now, Thai stocks (BK exchange) later.
 *
 * API docs: https://eodhd.com/financial-apis/api-for-historical-data-and-volumes
 */

const EODHD_BASE = 'https://eodhd.com/api';

/**
 * Get the EODHD API token from environment
 */
function getAPIToken() {
  const token = process.env.EODHD_API_KEY;
  if (!token) {
    throw new Error('EODHD_API_KEY environment variable is not set');
  }
  return token;
}

/**
 * Convert a plain ticker to EODHD format
 * SPY → SPY.US, ADVANC → ADVANC.BK (for Thai stocks)
 */
export function toEODHDSymbol(ticker, exchange = 'US') {
  if (ticker.includes('.')) return ticker; // Already has exchange suffix
  return `${ticker}.${exchange}`;
}

/**
 * Extract plain ticker from EODHD format
 * SPY.US → SPY
 */
export function fromEODHDSymbol(eodhSymbol) {
  const dotIndex = eodhSymbol.lastIndexOf('.');
  if (dotIndex === -1) return eodhSymbol;
  return eodhSymbol.substring(0, dotIndex);
}

/**
 * Fetch historical EOD prices for a single ticker
 *
 * @param {string} ticker - Plain ticker symbol (e.g., "SPY")
 * @param {Object} options
 * @param {string} options.from - Start date "YYYY-MM-DD"
 * @param {string} options.to - End date "YYYY-MM-DD"
 * @param {string} options.exchange - Exchange code (default: "US")
 * @returns {Promise<Array<{date, adjClose, open, high, low, close, volume}>>}
 */
export async function fetchHistoricalPrices(ticker, { from, to, exchange = 'US' } = {}) {
  const token = getAPIToken();
  const symbol = toEODHDSymbol(ticker, exchange);

  const url = new URL(`${EODHD_BASE}/eod/${symbol}`);
  url.searchParams.set('api_token', token);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('period', 'd');
  if (from) url.searchParams.set('from', from);
  if (to) url.searchParams.set('to', to);

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`EODHD API error ${res.status}: ${text || res.statusText}`);
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error('EODHD returned unexpected response format');
  }

  // Normalize to our standard format, sorted oldest-first
  return data
    .map(d => ({
      date: d.date,
      adjClose: d.adjusted_close ?? d.close,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Fetch the latest EOD prices for multiple tickers
 * Uses individual EOD calls with a short date window (last 7 days)
 * to get the most recent closing price.
 *
 * @param {string[]} tickers - Array of plain ticker symbols
 * @param {string} exchange - Exchange code (default: "US")
 * @returns {Promise<Object>} - { ticker: { price, date, change, changePercent, ... } }
 */
export async function fetchLatestPrices(tickers, exchange = 'US') {
  const token = getAPIToken();
  const results = {};

  // Date range: last 7 calendar days (covers weekends + holidays)
  const toDate = new Date().toISOString().split('T')[0];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  const fromStr = fromDate.toISOString().split('T')[0];

  for (const ticker of tickers) {
    try {
      const symbol = toEODHDSymbol(ticker, exchange);
      const url = new URL(`${EODHD_BASE}/eod/${symbol}`);
      url.searchParams.set('api_token', token);
      url.searchParams.set('fmt', 'json');
      url.searchParams.set('period', 'd');
      url.searchParams.set('from', fromStr);
      url.searchParams.set('to', toDate);
      url.searchParams.set('order', 'd'); // newest first

      const res = await fetch(url.toString());
      if (!res.ok) continue;

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      const latest = data[0]; // most recent trading day
      const previous = data.length > 1 ? data[1] : null;

      const price = latest.adjusted_close ?? latest.close;
      const prevPrice = previous
        ? (previous.adjusted_close ?? previous.close)
        : price;
      const change = price - prevPrice;
      const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0;

      results[ticker] = {
        price: Math.round(price * 100) / 100,
        date: latest.date,
        open: latest.open,
        high: latest.high,
        low: latest.low,
        close: latest.close,
        adjustedClose: latest.adjusted_close,
        volume: latest.volume,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
      };
    } catch (err) {
      console.error(`EODHD latest price fetch failed for ${ticker}:`, err.message);
      // Continue with other tickers
    }
  }

  return results;
}

/**
 * Check if EODHD API is configured and reachable
 */
export async function checkHealth() {
  try {
    const token = getAPIToken();

    // Minimal request to verify connectivity
    const url = new URL(`${EODHD_BASE}/eod/AAPL.US`);
    url.searchParams.set('api_token', token);
    url.searchParams.set('fmt', 'json');
    url.searchParams.set('from', '2025-01-02');
    url.searchParams.set('to', '2025-01-03');

    const res = await fetch(url.toString());
    return { configured: true, reachable: res.ok };
  } catch (err) {
    return {
      configured: !!process.env.EODHD_API_KEY,
      reachable: false,
      error: err.message,
    };
  }
}
