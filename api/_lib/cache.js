/**
 * Upstash Redis Cache Helper (Server-side only)
 *
 * Wraps Upstash Redis REST client for caching market data.
 * Gracefully degrades if Redis is not configured (skips caching).
 *
 * Key naming convention:
 *   price:{exchange}:{ticker}       → Latest EOD price
 *   historical:{exchange}:{ticker}  → Historical daily prices
 */

import { Redis } from '@upstash/redis';

let redis = null;

/**
 * Get or create the Redis client (lazy initialization)
 * Returns null if Redis is not configured — callers should handle this gracefully.
 */
function getRedis() {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null; // Redis not configured — skip caching
  }

  redis = new Redis({ url, token });
  return redis;
}

// Cache TTLs (seconds)
const PRICE_TTL = 24 * 60 * 60;          // 24 hours — refreshed daily
const HISTORICAL_TTL = 7 * 24 * 60 * 60; // 7 days — historical data rarely changes

/**
 * Get cached prices for multiple tickers
 *
 * @param {string[]} tickers
 * @param {string} exchange - Exchange code (default: "US")
 * @returns {Promise<Object>} - { ticker: priceData } for cache hits
 */
export async function getCachedPrices(tickers, exchange = 'US') {
  const client = getRedis();
  if (!client) return {};

  try {
    const pipeline = client.pipeline();
    for (const ticker of tickers) {
      pipeline.get(`price:${exchange}:${ticker}`);
    }
    const results = await pipeline.exec();

    const prices = {};
    tickers.forEach((ticker, i) => {
      if (results[i] !== null && results[i] !== undefined) {
        prices[ticker] = results[i];
      }
    });
    return prices;
  } catch (err) {
    console.error('Redis getCachedPrices error:', err.message);
    return {};
  }
}

/**
 * Cache prices for multiple tickers
 *
 * @param {Object} prices - { ticker: priceData }
 * @param {string} exchange - Exchange code (default: "US")
 */
export async function setCachedPrices(prices, exchange = 'US') {
  const client = getRedis();
  if (!client) return;

  try {
    const pipeline = client.pipeline();
    for (const [ticker, data] of Object.entries(prices)) {
      const key = `price:${exchange}:${ticker}`;
      pipeline.set(key, data, { ex: PRICE_TTL });
    }
    await pipeline.exec();
  } catch (err) {
    console.error('Redis setCachedPrices error:', err.message);
  }
}

/**
 * Get cached historical data for a ticker
 *
 * @param {string} ticker
 * @param {string} exchange
 * @returns {Promise<{data: Array, cachedAt: string} | null>}
 */
export async function getCachedHistorical(ticker, exchange = 'US') {
  const client = getRedis();
  if (!client) return null;

  try {
    const key = `historical:${exchange}:${ticker}`;
    const result = await client.get(key);
    return result || null;
  } catch (err) {
    console.error('Redis getCachedHistorical error:', err.message);
    return null;
  }
}

/**
 * Cache historical data for a ticker
 *
 * @param {string} ticker
 * @param {Object} data - { data: Array, cachedAt: string }
 * @param {string} exchange
 */
export async function setCachedHistorical(ticker, data, exchange = 'US') {
  const client = getRedis();
  if (!client) return;

  try {
    const key = `historical:${exchange}:${ticker}`;
    await client.set(key, data, { ex: HISTORICAL_TTL });
  } catch (err) {
    console.error('Redis setCachedHistorical error:', err.message);
  }
}

/**
 * Check Redis connectivity
 */
export async function checkHealth() {
  const client = getRedis();
  if (!client) {
    return { configured: false, reachable: false };
  }

  try {
    await client.ping();
    return { configured: true, reachable: true };
  } catch (err) {
    return { configured: true, reachable: false, error: err.message };
  }
}
