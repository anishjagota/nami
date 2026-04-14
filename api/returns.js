/**
 * GET /api/returns
 *
 * Serve pre-computed monthly returns for the quant engine.
 * This is the primary data endpoint for backtests, Monte Carlo, and optimization.
 *
 * Key optimization: returns monthly returns (~4KB per ticker) instead of
 * raw daily prices (~450KB), with aggressive server-side caching (30-day TTL).
 *
 * Flow:
 *   1. Check Redis for pre-computed returns (key: returns:US:{ticker})
 *   2. Cache miss → fetch daily prices from EODHD
 *   3. Compute monthly returns server-side
 *   4. Cache in Redis (30-day TTL)
 *   5. Return compact payload
 *
 * Query params:
 *   tickers  - Comma-separated symbols (e.g., "SPY,AGG,VEA") — max 20
 *   from     - Start date YYYY-MM-DD (default: "2007-01-01")
 *   exchange - Exchange code (default: "US")
 */

import { fetchHistoricalPrices } from './_lib/eodhd.js';
import { getCachedReturnsData, setCachedReturnsData } from './_lib/cache.js';
import { dailyPricesToMonthlyReturns } from './_lib/transforms.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    tickers: tickerParam,
    from = '2007-01-01',
    exchange = 'US',
  } = req.query;

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

  if (tickers.length > 20) {
    return res.status(400).json({ error: 'Maximum 20 tickers per request' });
  }

  try {
    // Step 1: Check Redis for pre-computed returns
    const cached = await getCachedReturnsData(tickers, exchange);
    const cachedTickers = Object.keys(cached);
    const missingTickers = tickers.filter(t => !cachedTickers.includes(t));

    const computed = {};
    let computedCount = 0;

    // Step 2: Compute returns for cache misses (fetch daily prices → transform)
    if (missingTickers.length > 0) {
      // Fetch in parallel — EODHD All World plan handles concurrency fine
      const fetchPromises = missingTickers.map(async ticker => {
        try {
          const dailyPrices = await fetchHistoricalPrices(ticker, {
            from,
            exchange,
          });

          if (!dailyPrices || dailyPrices.length === 0) {
            return { ticker, success: false };
          }

          // Pre-compute monthly returns server-side
          const { returns, dates } = dailyPricesToMonthlyReturns(dailyPrices);

          if (returns.length === 0) {
            return { ticker, success: false };
          }

          const result = { returns, dates, months: returns.length };
          computed[ticker] = result;
          computedCount++;

          // Cache in Redis with 30-day TTL (background, don't block response)
          setCachedReturnsData(ticker, result, exchange).catch(err =>
            console.error(`Failed to cache returns for ${ticker}:`, err.message)
          );

          return { ticker, success: true };
        } catch (err) {
          console.error(`Failed to compute returns for ${ticker}:`, err.message);
          return { ticker, success: false, error: err.message };
        }
      });

      await Promise.all(fetchPromises);
    }

    // Combine cached + freshly computed
    const allReturns = { ...cached, ...computed };
    const resolved = Object.keys(allReturns);
    const unresolved = tickers.filter(t => !resolved.includes(t));

    return res.status(200).json({
      returns: allReturns,
      meta: {
        requested: tickers.length,
        resolved: resolved.length,
        fromCache: cachedTickers.length,
        computed: computedCount,
        unresolved: unresolved.length > 0 ? unresolved : undefined,
        exchange,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Returns API error:', err.message);

    if (err.message.includes('EODHD_API_KEY')) {
      return res.status(503).json({
        error: 'Market data provider not configured',
        message: 'EODHD API key is not set.',
      });
    }

    return res.status(500).json({
      error: 'Failed to compute returns',
      message: err.message,
    });
  }
}
