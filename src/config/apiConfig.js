/**
 * API Configuration
 *
 * Stage 2 Architecture:
 *   Primary: Our own API (/api/*) → Upstash Redis → EODHD
 *   Fallback: FMP direct (legacy, if VITE_FMP_API_KEY is set)
 *   Offline: Static embedded data for 7 core ETFs
 *
 * EODHD and Upstash credentials are SERVER-SIDE only (no VITE_ prefix).
 * The browser only talks to our /api/* endpoints.
 */

// ─── FMP (Legacy Fallback) ─────────────────────────────────────────────────
export const FMP_API_KEY = import.meta.env.VITE_FMP_API_KEY || 'demo';
export const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

// ─── Our API (Primary) ────────────────────────────────────────────────────
export const NAMI_API = {
  basePath: '/api',
  timeout: 15000, // 15 seconds (serverless cold starts can be slow)
};

// Rate limiting settings
export const API_CONFIG = {
  // Maximum requests per minute (be conservative)
  maxRequestsPerMinute: 30,
  
  // Delay between requests in ms
  requestDelay: 100,
  
  // Retry settings
  maxRetries: 3,
  retryDelay: 1000,
  
  // Timeout in ms
  timeout: 10000,
};

// Cache settings
export const CACHE_CONFIG = {
  // Historical data cache TTL (24 hours)
  historicalTTL: 24 * 60 * 60 * 1000,
  
  // Quote cache TTL (60 seconds) - for Phase 2
  quoteTTL: 60 * 1000,
  
  // Metadata cache TTL (7 days)
  metadataTTL: 7 * 24 * 60 * 60 * 1000,
  
  // IndexedDB database name
  dbName: 'nami-cache',
  
  // IndexedDB version
  dbVersion: 1,
};

// Data requirements
export const DATA_REQUIREMENTS = {
  // Minimum months of history required for an asset
  minMonthsHistory: 60, // 5 years
  
  // Preferred months of history
  preferredMonthsHistory: 180, // 15 years
  
  // Start date for historical data requests
  historicalStartDate: '2007-01-01',
  
  // End date defaults to yesterday
  getHistoricalEndDate: () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  },
};
