/**
 * Portfolio Store
 *
 * CRUD operations for saved portfolios.
 * Uses localStorage now — designed to be swapped for
 * IndexedDB or a backend API later without changing callers.
 */

import { isValidSavedPortfolio, serializePortfolio } from '../models/Portfolio';

const STORAGE_KEY = 'nami-saved-portfolios';
const MAX_PORTFOLIOS = 20;

/**
 * Get all saved portfolios, sorted by most recently updated
 * @returns {Object[]} Array of portfolio objects
 */
export function getAllPortfolios() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const portfolios = JSON.parse(raw);
    if (!Array.isArray(portfolios)) return [];

    // Filter out invalid entries and sort newest first
    return portfolios
      .filter(isValidSavedPortfolio)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch (err) {
    console.warn('Failed to read saved portfolios:', err);
    return [];
  }
}

/**
 * Get a single portfolio by ID
 * @param {string} id
 * @returns {Object|null}
 */
export function getPortfolioById(id) {
  const all = getAllPortfolios();
  return all.find(p => p.id === id) || null;
}

/**
 * Save a new portfolio
 * @param {Object} portfolio - Portfolio object from createPortfolio()
 * @returns {Object} The saved portfolio
 * @throws {Error} If at capacity
 */
export function savePortfolio(portfolio) {
  if (!isValidSavedPortfolio(portfolio)) {
    throw new Error('Invalid portfolio data');
  }

  const all = getAllPortfolios();

  if (all.length >= MAX_PORTFOLIOS) {
    throw new Error(`Maximum of ${MAX_PORTFOLIOS} saved portfolios reached`);
  }

  // Prevent duplicate IDs
  const filtered = all.filter(p => p.id !== portfolio.id);
  filtered.unshift(serializePortfolio(portfolio));

  _persist(filtered);
  return portfolio;
}

/**
 * Update an existing portfolio
 * @param {string} id - Portfolio ID
 * @param {Object} updates - Fields to merge
 * @returns {Object|null} Updated portfolio or null if not found
 */
export function updatePortfolioInStore(id, updates) {
  const all = getAllPortfolios();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return null;

  const updated = {
    ...all[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  all[idx] = serializePortfolio(updated);
  _persist(all);
  return updated;
}

/**
 * Delete a portfolio
 * @param {string} id
 * @returns {boolean} True if deleted
 */
export function deletePortfolio(id) {
  const all = getAllPortfolios();
  const filtered = all.filter(p => p.id !== id);

  if (filtered.length === all.length) return false;

  _persist(filtered);
  return true;
}

/**
 * Delete all saved portfolios
 */
export function clearAllPortfolios() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get count of saved portfolios
 */
export function getPortfolioCount() {
  return getAllPortfolios().length;
}

/**
 * Bulk update snapshots (used when refreshing prices)
 * @param {Object[]} updatedPortfolios - Array of full portfolio objects
 */
export function bulkUpdatePortfolios(updatedPortfolios) {
  const all = getAllPortfolios();
  const map = new Map(updatedPortfolios.map(p => [p.id, p]));

  const merged = all.map(p => {
    const updated = map.get(p.id);
    return updated ? serializePortfolio(updated) : p;
  });

  _persist(merged);
}

/**
 * Internal: write to storage
 */
function _persist(portfolios) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolios));
  } catch (err) {
    console.error('Failed to save portfolios:', err);
    throw new Error('Could not save — storage may be full');
  }
}
