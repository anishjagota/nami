/**
 * Historical Data Cache
 * 
 * IndexedDB-based cache for storing monthly returns data.
 * Persists across page refreshes and browser sessions.
 * 
 * Cache structure:
 * - Key: ticker symbol (e.g., "SPY")
 * - Value: { ticker, returns, dates, fetchedAt, expiresAt }
 */

import { CACHE_CONFIG } from '../../config/apiConfig';

const DB_NAME = CACHE_CONFIG.dbName;
const DB_VERSION = CACHE_CONFIG.dbVersion;
const STORE_NAME = 'historical-returns';

let dbPromise = null;

/**
 * Initialize and get the IndexedDB database
 */
function getDB() {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store for historical returns
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'ticker' });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
    };
  });
  
  return dbPromise;
}

/**
 * Get cached data for a ticker
 * @param {string} ticker - Ticker symbol
 * @returns {Promise<Object|null>} Cached data or null if not found/expired
 */
export async function getCachedReturns(ticker) {
  try {
    const db = await getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(ticker);
      
      request.onsuccess = () => {
        const data = request.result;
        
        if (!data) {
          resolve(null);
          return;
        }
        
        // Check if expired
        if (data.expiresAt && data.expiresAt < Date.now()) {
          // Data is stale - still return it but mark as stale
          resolve({ ...data, isStale: true });
          return;
        }
        
        resolve({ ...data, isStale: false });
      };
      
      request.onerror = () => {
        console.error('Failed to get cached returns:', request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Get cached data for multiple tickers
 * @param {string[]} tickers - Array of ticker symbols
 * @returns {Promise<Map<string, Object>>} Map of ticker to cached data
 */
export async function getCachedReturnsMultiple(tickers) {
  const results = new Map();
  
  try {
    const db = await getDB();
    
    await Promise.all(
      tickers.map(
        (ticker) =>
          new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(ticker);
            
            request.onsuccess = () => {
              const data = request.result;
              if (data) {
                const isStale = data.expiresAt && data.expiresAt < Date.now();
                results.set(ticker, { ...data, isStale });
              }
              resolve();
            };
            
            request.onerror = () => resolve();
          })
      )
    );
  } catch (error) {
    console.error('Cache read error:', error);
  }
  
  return results;
}

/**
 * Store returns data in cache
 * @param {string} ticker - Ticker symbol
 * @param {number[]} returns - Array of monthly returns
 * @param {string[]} dates - Array of date strings (YYYY-MM format)
 */
export async function setCachedReturns(ticker, returns, dates) {
  try {
    const db = await getDB();
    const now = Date.now();
    
    const data = {
      ticker,
      returns,
      dates,
      fetchedAt: now,
      expiresAt: now + CACHE_CONFIG.historicalTTL,
    };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Failed to cache returns:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Cache write error:', error);
    return false;
  }
}

/**
 * Store returns data for multiple tickers
 * @param {Array<{ticker: string, returns: number[], dates: string[]}>} dataArray
 */
export async function setCachedReturnsMultiple(dataArray) {
  try {
    const db = await getDB();
    const now = Date.now();
    const expiresAt = now + CACHE_CONFIG.historicalTTL;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      for (const { ticker, returns, dates } of dataArray) {
        store.put({
          ticker,
          returns,
          dates,
          fetchedAt: now,
          expiresAt,
        });
      }
      
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => {
        console.error('Failed to cache returns:', transaction.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Cache write error:', error);
    return false;
  }
}

/**
 * Remove a ticker from cache
 * @param {string} ticker - Ticker symbol
 */
export async function removeCachedReturns(ticker) {
  try {
    const db = await getDB();
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(ticker);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
}

/**
 * Clear all cached data
 */
export async function clearCache() {
  try {
    const db = await getDB();
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    return false;
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache() {
  try {
    const db = await getDB();
    const now = Date.now();
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('expiresAt');
      
      // Get all entries that have expired
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return false;
  }
}

/**
 * Get cache statistics
 * @returns {Promise<{count: number, oldestFetch: number|null, newestFetch: number|null}>}
 */
export async function getCacheStats() {
  try {
    const db = await getDB();
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const entries = request.result;
        
        if (entries.length === 0) {
          resolve({ count: 0, oldestFetch: null, newestFetch: null });
          return;
        }
        
        const fetchTimes = entries.map((e) => e.fetchedAt);
        resolve({
          count: entries.length,
          oldestFetch: Math.min(...fetchTimes),
          newestFetch: Math.max(...fetchTimes),
          tickers: entries.map((e) => e.ticker),
        });
      };
      
      request.onerror = () => {
        resolve({ count: 0, oldestFetch: null, newestFetch: null });
      };
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    return { count: 0, oldestFetch: null, newestFetch: null };
  }
}
