/**
 * API Configuration
 * 
 * Financial Modeling Prep (FMP) API settings.
 * 
 * For development: Uses demo key with limited requests
 * For production: Set FMP_API_KEY environment variable
 */

// API key - in production, this should come from environment variables
// For development, FMP provides a demo key
export const FMP_API_KEY = import.meta.env.VITE_FMP_API_KEY || 'demo';

// Base URLs
export const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

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
