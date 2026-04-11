/**
 * Financial Modeling Prep (FMP) API Provider
 * 
 * Handles all API communication with FMP for:
 * - Historical price data
 * - Real-time quotes (Phase 2)
 * - Symbol search (Phase 1B/3)
 * 
 * Rate limiting and error handling are built in.
 */

import { 
  FMP_API_KEY, 
  FMP_BASE_URL, 
  API_CONFIG,
  DATA_REQUIREMENTS 
} from '../../config/apiConfig';

// Simple rate limiter
let lastRequestTime = 0;

/**
 * Wait to respect rate limits
 */
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minDelay = API_CONFIG.requestDelay;
  
  if (timeSinceLastRequest < minDelay) {
    await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Make an API request with retry logic
 * 
 * @param {string} endpoint - API endpoint path
 * @param {Object} params - Query parameters
 * @returns {Promise<any>} API response data
 */
async function apiRequest(endpoint, params = {}) {
  await waitForRateLimit();
  
  // Build URL with query params
  const url = new URL(`${FMP_BASE_URL}${endpoint}`);
  url.searchParams.set('apikey', FMP_API_KEY);
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }
  
  let lastError;
  
  for (let attempt = 0; attempt < API_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
      
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Check for specific error codes
        if (response.status === 401) {
          throw new Error('Invalid API key');
        }
        if (response.status === 402) {
          throw new Error('Premium endpoint - not available on free plan');
        }
        if (response.status === 429) {
          // Rate limited - wait and retry
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // FMP returns error messages in body sometimes
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }
      
      return data;
      
    } catch (error) {
      lastError = error;
      
      if (error.name === 'AbortError') {
        lastError = new Error('Request timeout');
      }
      
      // Don't retry on auth/plan errors
      if (error.message === 'Invalid API key' || error.message.includes('Premium endpoint')) {
        throw error;
      }
      
      // Wait before retry
      if (attempt < API_CONFIG.maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, API_CONFIG.retryDelay * (attempt + 1))
        );
      }
    }
  }
  
  throw lastError;
}

/**
 * Fetch historical daily prices for a ticker
 * 
 * @param {string} ticker - Stock/ETF ticker symbol
 * @param {string} startDate - Start date "YYYY-MM-DD"
 * @param {string} endDate - End date "YYYY-MM-DD"
 * @returns {Promise<Array<{date: string, adjClose: number}>>}
 */
export async function fetchHistoricalPrices(ticker, startDate, endDate) {
  try {
    const data = await apiRequest(`/historical-price-eod/full`, {
      symbol: ticker,
      from: startDate,
      to: endDate,
    });

    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Stable API returns a flat array, newest first — sort oldest first
    const sorted = data
      .map(day => ({
        date: day.date,
        adjClose: day.close,
      }))
      .filter(d => d.adjClose !== null && d.adjClose !== undefined)
      .sort((a, b) => a.date.localeCompare(b.date));

    return sorted;

  } catch (error) {
    console.error(`Failed to fetch prices for ${ticker}:`, error);
    throw error;
  }
}

/**
 * Fetch historical prices with default date range
 * 
 * @param {string} ticker - Stock/ETF ticker symbol
 * @returns {Promise<Array<{date: string, adjClose: number}>>}
 */
export async function fetchHistoricalPricesDefault(ticker) {
  return fetchHistoricalPrices(
    ticker,
    DATA_REQUIREMENTS.historicalStartDate,
    DATA_REQUIREMENTS.getHistoricalEndDate()
  );
}

/**
 * Fetch historical prices for multiple tickers
 * 
 * @param {string[]} tickers - Array of ticker symbols
 * @returns {Promise<Map<string, Array<{date: string, adjClose: number}>>>}
 */
export async function fetchHistoricalPricesMultiple(tickers) {
  const results = new Map();
  
  // Fetch sequentially to respect rate limits
  for (const ticker of tickers) {
    try {
      const prices = await fetchHistoricalPricesDefault(ticker);
      results.set(ticker, prices);
    } catch (error) {
      console.error(`Failed to fetch ${ticker}:`, error);
      // Continue with other tickers
    }
  }
  
  return results;
}

/**
 * Fetch real-time quote for a ticker (Phase 2)
 * 
 * @param {string} ticker - Stock/ETF ticker symbol
 * @returns {Promise<{price: number, change: number, changePercent: number}>}
 */
export async function fetchQuote(ticker) {
  try {
    const data = await apiRequest(`/profile`, { symbol: ticker });

    if (!data || data.length === 0) {
      return null;
    }

    const quote = data[0];
    return {
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercentage,
      previousClose: quote.price - quote.change,
      volume: quote.volume,
      marketCap: quote.marketCap,
    };

  } catch (error) {
    console.error(`Failed to fetch quote for ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch quotes for multiple tickers (Phase 2)
 * 
 * @param {string[]} tickers - Array of ticker symbols
 * @returns {Promise<Map<string, Object>>}
 */
export async function fetchQuotesMultiple(tickers) {
  const results = new Map();

  // Fetch individually since stable API uses symbol= query param
  for (const ticker of tickers) {
    try {
      const quote = await fetchQuote(ticker);
      if (quote) {
        results.set(ticker, quote);
      }
    } catch (error) {
      console.error(`Failed to fetch quote for ${ticker}:`, error);
    }
  }

  return results;
}

/**
 * Search for symbols (Phase 1B/3)
 * 
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array<{symbol: string, name: string, type: string}>>}
 */
export async function searchSymbols(query, limit = 10) {
  try {
    const data = await apiRequest('/search', {
      query,
      limit,
    });

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map(item => ({
      symbol: item.symbol,
      name: item.name || item.companyName,
      type: item.stockExchange || item.exchangeFullName,
      exchange: item.exchangeShortName || item.exchange,
    }));

  } catch (error) {
    console.error('Symbol search failed:', error);
    return [];
  }
}

/**
 * Get ETF profile information
 * 
 * @param {string} ticker - ETF ticker symbol
 * @returns {Promise<Object>}
 */
export async function fetchETFProfile(ticker) {
  try {
    const data = await apiRequest(`/profile`, { symbol: ticker });

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];

  } catch (error) {
    console.error(`Failed to fetch ETF profile for ${ticker}:`, error);
    return null;
  }
}

/**
 * Check if the API is accessible
 * 
 * @returns {Promise<{available: boolean, message: string}>}
 */
export async function checkAPIStatus() {
  try {
    const data = await apiRequest('/profile', { symbol: 'AAPL' });

    if (data && data.length > 0) {
      return { available: true, message: 'API connected' };
    }

    return { available: false, message: 'Empty response from API' };

  } catch (error) {
    return { available: false, message: error.message };
  }
}
