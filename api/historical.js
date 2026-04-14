/**
 * GET /api/historical
 *
 * Fetch historical EOD prices for a single ticker.
 * Flow: Upstash cache check → EODHD fetch on miss → cache result → respond
 *
 * Query params:
 *   ticker   - Single ticker symbol (e.g., "SPY")
 *   from     - Start date YYYY-MM-DD (default: "2007-01-01")
 *   to       - End date YYYY-MM-DD (default: yesterday)
 *   exchange - Exchange code (default: "US")
 *
 * Response:
 *   { ticker, data: [{date, adjClose}, ...], count, source, dateRange, meta }
 */

import { fetchHistoricalPrices } from './_lib/eodhd.js';
import { getCachedHistorical, setCachedHistorical } from './_lib/cache.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    ticker: rawTicker,
    from = '2007-01-01',
    to,
    exchange = 'US',
  } = req.query;

  if (!rawTicker) {
    return res.status(400).json({ error: 'Missing "ticker" query parameter' });
  }

  const ticker = rawTicker.trim().toUpperCase();

  // Default "to" = yesterday
  const toDate =
    to ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    })();

  try {
    // Step 1: Check Redis cache
    const cached = await getCachedHistorical(ticker, exchange);

    if (cached && cached.data && cached.data.length > 0) {
      const cachedFrom = cached.data[0].date;
      const cachedTo = cached.data[cached.data.length - 1].date;

      // If cached range covers the requested range, return from cache
      if (cachedFrom <= from && cachedTo >= toDate) {
        const filtered = cached.data.filter(
          d => d.date >= from && d.date <= toDate
        );

        return res.status(200).json({
          ticker,
          data: filtered,
          count: filtered.length,
          source: 'cache',
          dateRange: {
            from: filtered[0]?.date,
            to: filtered[filtered.length - 1]?.date,
          },
          meta: { exchange, cachedAt: cached.cachedAt },
        });
      }
    }

    // Step 2: Fetch from EODHD
    const data = await fetchHistoricalPrices(ticker, {
      from,
      to: toDate,
      exchange,
    });

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: `No historical data found for ${ticker}`,
        ticker,
        exchange,
      });
    }

    // Step 3: Cache the result (background, don't block response)
    setCachedHistorical(
      ticker,
      { data, cachedAt: new Date().toISOString() },
      exchange
    ).catch(err =>
      console.error('Background historical cache write failed:', err.message)
    );

    return res.status(200).json({
      ticker,
      data,
      count: data.length,
      source: 'eodhd',
      dateRange: {
        from: data[0].date,
        to: data[data.length - 1].date,
      },
      meta: { exchange, fetchedAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error(`Historical API error for ${ticker}:`, err.message);

    if (err.message.includes('EODHD_API_KEY')) {
      return res.status(503).json({
        error: 'Market data provider not configured',
        message:
          'EODHD API key is not set. Configure EODHD_API_KEY in Vercel environment variables.',
      });
    }

    return res.status(500).json({
      error: 'Failed to fetch historical data',
      message: err.message,
      ticker,
    });
  }
}
