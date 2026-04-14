/**
 * Portfolio Data Model
 *
 * Defines the shape of a saved portfolio and provides
 * factory/validation functions. Designed to support
 * future monitoring with real-time price data.
 */

/**
 * Generate a unique portfolio ID
 */
function generateId() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Create a new portfolio object
 *
 * @param {Object} params
 * @param {string} params.name - User-given name
 * @param {Object} params.holdings - { ticker: weight (0-100) }
 * @param {number} [params.initialInvestment] - Starting amount
 * @param {Object} [params.metrics] - Snapshot metrics at save time
 * @param {Object} [params.prices] - Snapshot prices at save time
 * @param {string} [params.notes] - Optional user notes
 * @returns {Object} Portfolio object
 */
export function createPortfolio({
  name,
  holdings,
  initialInvestment = 10000,
  metrics = null,
  prices = null,
  notes = '',
}) {
  const now = new Date().toISOString();

  return {
    id: generateId(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,

    // Core definition — which assets and how much
    holdings: { ...holdings },

    // Investment amount for value calculations
    initialInvestment,

    // Snapshot captured at save time (updated on app load when prices available)
    snapshot: {
      capturedAt: now,
      metrics: metrics ? { ...metrics } : null,
      prices: prices ? { ...prices } : null,
      totalValue: initialInvestment,
    },

    // User notes
    notes,
  };
}

/**
 * Update a portfolio's metadata
 */
export function updatePortfolio(portfolio, updates) {
  return {
    ...portfolio,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update a portfolio's price snapshot
 */
export function updateSnapshot(portfolio, { prices, metrics }) {
  const totalValue = prices
    ? calculatePortfolioValue(portfolio.holdings, prices, portfolio.initialInvestment)
    : portfolio.snapshot.totalValue;

  return {
    ...portfolio,
    updatedAt: new Date().toISOString(),
    snapshot: {
      capturedAt: new Date().toISOString(),
      metrics: metrics || portfolio.snapshot.metrics,
      prices: prices ? { ...prices } : portfolio.snapshot.prices,
      totalValue,
    },
  };
}

/**
 * Calculate portfolio value from holdings, prices, and initial investment
 *
 * Holdings are percentages (e.g., SPY: 60 means 60%).
 * Value = initial investment (prices are used for change tracking later).
 * For now, returns initialInvestment as baseline.
 */
export function calculatePortfolioValue(holdings, prices, initialInvestment) {
  if (!prices || Object.keys(prices).length === 0) {
    return initialInvestment;
  }
  // For now, value = initialInvestment (we don't track shares yet)
  // Later: value = sum(shares[ticker] * prices[ticker])
  return initialInvestment;
}

/**
 * Get the tickers in a portfolio
 */
export function getPortfolioTickers(portfolio) {
  return Object.keys(portfolio.holdings).filter(t => portfolio.holdings[t] > 0);
}

/**
 * Validate a portfolio object
 */
export function isValidSavedPortfolio(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') return false;
  if (!portfolio.id || typeof portfolio.id !== 'string') return false;
  if (!portfolio.name || typeof portfolio.name !== 'string') return false;
  if (!portfolio.holdings || typeof portfolio.holdings !== 'object') return false;

  const tickers = getPortfolioTickers(portfolio);
  if (tickers.length === 0) return false;

  const totalWeight = Object.values(portfolio.holdings).reduce((s, w) => s + (w || 0), 0);
  if (Math.abs(totalWeight - 100) > 1) return false;

  return true;
}

/**
 * Serialize portfolio for storage
 */
export function serializePortfolio(portfolio) {
  return JSON.parse(JSON.stringify(portfolio));
}
