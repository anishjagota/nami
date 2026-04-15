/**
 * Portfolio Data Model
 *
 * Defines the shape of a saved portfolio and provides
 * factory/validation/migration functions.
 *
 * Data shape:
 *   id, name, createdAt, updatedAt
 *   holdings          — { ticker: weight (0-100) }
 *   initialInvestment — dollar amount for value calculations
 *   snapshot          — mutable, refreshed every time prices update
 *   originSnapshot    — immutable, frozen at save time for "performance since saved"
 *   notes             — optional user text
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
  const totalValue = prices
    ? calculatePortfolioValue(holdings, prices, initialInvestment)
    : initialInvestment;

  return {
    id: generateId(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,

    // Core definition — which assets and how much
    holdings: { ...holdings },

    // Investment amount for value calculations
    initialInvestment,

    // Mutable snapshot — refreshed when prices update
    snapshot: {
      capturedAt: now,
      metrics: metrics ? { ...metrics } : null,
      prices: prices ? { ...prices } : null,
      totalValue,
    },

    // Immutable snapshot — frozen at creation for "performance since saved"
    originSnapshot: {
      capturedAt: now,
      prices: prices ? { ...prices } : null,
      totalValue,
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
 * Update a portfolio's price snapshot (mutable — called on every price refresh)
 *
 * Also seeds originSnapshot if it was null (first refresh after save).
 */
export function updateSnapshot(portfolio, { prices, metrics }) {
  const totalValue = prices
    ? calculatePortfolioValue(portfolio.holdings, prices, portfolio.initialInvestment)
    : portfolio.snapshot.totalValue;

  const now = new Date().toISOString();

  // Seed originSnapshot once if it wasn't populated at creation
  let originSnapshot = portfolio.originSnapshot;
  if (!originSnapshot || originSnapshot.totalValue == null || originSnapshot.prices == null) {
    if (prices && Object.keys(prices).length > 0) {
      originSnapshot = {
        capturedAt: portfolio.createdAt || now,
        prices: { ...prices },
        totalValue,
      };
    }
  }

  return {
    ...portfolio,
    updatedAt: now,
    snapshot: {
      capturedAt: now,
      metrics: metrics || portfolio.snapshot.metrics,
      prices: prices ? { ...prices } : portfolio.snapshot.prices,
      totalValue,
    },
    originSnapshot,
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
 * Compute daily P&L for a portfolio from per-ticker price data
 *
 * @param {Object} holdings  - { ticker: weight (0-100) }
 * @param {Object} priceData - { ticker: { price, change, changePercent } }
 * @param {number} totalValue - current portfolio value
 * @returns {{ dailyDollar: number, dailyPercent: number }}
 */
export function computeDailyPnL(holdings, priceData, totalValue) {
  if (!priceData || !holdings) return { dailyDollar: 0, dailyPercent: 0 };

  // Weighted-average daily change percent
  let weightedChangePct = 0;
  let coveredWeight = 0;

  for (const [ticker, weight] of Object.entries(holdings)) {
    if (weight <= 0) continue;
    const pd = priceData[ticker];
    if (pd && pd.changePercent != null) {
      weightedChangePct += (weight / 100) * pd.changePercent;
      coveredWeight += weight;
    }
  }

  if (coveredWeight === 0) return { dailyDollar: 0, dailyPercent: 0 };

  const dailyPercent = weightedChangePct;
  const dailyDollar = (totalValue * dailyPercent) / 100;

  return { dailyDollar, dailyPercent };
}

/**
 * Compute performance since saved
 *
 * @param {Object} portfolio
 * @param {Object} currentPriceData - { ticker: { price, change, changePercent } }
 * @returns {{ dollarChange: number, percentChange: number, savedValue: number, currentValue: number } | null}
 */
export function computePerformanceSinceSaved(portfolio, currentPriceData) {
  const origin = portfolio.originSnapshot;
  if (!origin || !origin.prices || !origin.totalValue) return null;

  const savedValue = origin.totalValue;
  const currentValue = portfolio.snapshot?.totalValue || savedValue;

  // If we have current price data, compute a better estimate using
  // weighted price changes from origin prices
  let growthFactor = 0;
  let coveredWeight = 0;

  for (const [ticker, weight] of Object.entries(portfolio.holdings)) {
    if (weight <= 0) continue;
    const originPrice = origin.prices[ticker];
    const currentPrice = currentPriceData?.[ticker]?.price;
    if (originPrice && currentPrice && originPrice > 0) {
      growthFactor += (weight / 100) * (currentPrice / originPrice);
      coveredWeight += weight;
    }
  }

  if (coveredWeight > 0) {
    // Scale to fill uncovered weight at 1x
    const uncoveredFraction = 1 - coveredWeight / 100;
    growthFactor += uncoveredFraction;

    const estimatedValue = savedValue * growthFactor;
    const dollarChange = estimatedValue - savedValue;
    const percentChange = savedValue > 0 ? ((estimatedValue / savedValue) - 1) * 100 : 0;

    return { dollarChange, percentChange, savedValue, currentValue: estimatedValue };
  }

  return null;
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
 * Migrate a portfolio to the latest schema version
 *
 * Adds missing fields without breaking existing data.
 * Called automatically when portfolios are read from storage.
 */
export function migratePortfolio(portfolio) {
  let migrated = { ...portfolio };

  // Add originSnapshot if missing (pre-v2 portfolios)
  if (!migrated.originSnapshot) {
    if (migrated.snapshot?.prices && migrated.snapshot?.totalValue != null) {
      migrated.originSnapshot = {
        capturedAt: migrated.createdAt || migrated.snapshot.capturedAt,
        prices: { ...migrated.snapshot.prices },
        totalValue: migrated.snapshot.totalValue,
      };
    } else {
      migrated.originSnapshot = null;
    }
  }

  return migrated;
}

/**
 * Serialize portfolio for storage
 */
export function serializePortfolio(portfolio) {
  return JSON.parse(JSON.stringify(portfolio));
}
