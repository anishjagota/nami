/**
 * GET /api/prices
 *
 * Fetch current/latest EOD prices for tickers.
 * Flow: Upstash cache check → EODHD fetch on miss → cache result → respond
 *
 * Query params:
 *   tickers  - Comma-separated ticker symbols (e.g., "SPY,AGG,VEA")
 *   exchange - Exchange code (default: "US", future: "BK" for Thai)
 *
 * Response:
 *   { prices: { SPY: { price, date, change, changePercent, ... } },
 *     meta: { requested, resolved, fromCache, fromAPI, exchange, timestamp } }
 */

import { fetchLatestPrices } from './_lib/eodhd.js';
import { getCachedPrices, setCachedPrices } from './_lib/cache.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tickers: tickerParam, exchange = 'US' } = req.query;

  if (!tickerParam) {
    return res.status(400).json({ error: 'Missing "tickers" query parameter' });
  }

  const tickers = tickerParam
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean);

  if (tickers.length === 0) {
    return res.status(400).json({ error: 'No valid tickers provided' });
  }

  if (tickers.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 tickers per request' });
  }

  try {
    // Step 1: Check Redis cache
    const cached = await getCachedPrices(tickers, exchange);
    const cachedTickers = Object.keys(cached);
    const missingTickers = tickers.filter(t => !cachedTickers.includes(t));

    let freshPrices = {};

    // Step 2: Fetch cache misses from EODHD
    if (missingTickers.length > 0) {
      try {
        freshPrices = await fetchLatestPrices(missingTickers, exchange);

        // Step 3: Cache the fresh prices
        if (Object.keys(freshPrices).length > 0) {
          // Don't await — let caching happen in background
          setCachedPrices(freshPrices, exchange).catch(err =>
            console.error('Background cache write failed:', err.message)
          );
        }
      } catch (err) {
        console.error('EODHD fetch error:', err.message);
        // Continue with whatever we have from cache
      }
    }

    // Combine cached + fresh
    const allPrices = { ...cached, ...freshPrices };

    const resolved = Object.keys(allPrices);
    const unresolved = tickers.filter(t => !resolved.includes(t));

    return res.status(200).json({
      prices: allPrices,
      meta: {
        requested: tickers.length,
        resolved: resolved.length,
        fromCache: cachedTickers.length,
        fromAPI: Object.keys(freshPrices).length,
        unresolved: unresolved.length > 0 ? unresolved : undefined,
        exchange,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Prices API error:', err.message);

    if (err.message.includes('EODHD_API_KEY')) {
      return res.status(503).json({
        error: 'Market data provider not configured',
        message: 'Set the EODHD_API_KEY environment variable in Vercel.',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
}
