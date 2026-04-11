/**
 * Price to Returns Transform
 * 
 * Converts daily adjusted close prices into monthly returns.
 * 
 * Process:
 * 1. Group daily prices by month
 * 2. Take last price of each month
 * 3. Calculate return as (P_t / P_{t-1}) - 1
 * 
 * This matches the reference methodology for computing historical returns.
 */

/**
 * Convert daily prices to monthly returns
 * 
 * @param {Array<{date: string, adjClose: number}>} dailyPrices 
 *   Array of daily prices sorted by date ascending
 *   date format: "YYYY-MM-DD"
 * 
 * @returns {{returns: number[], dates: string[]}}
 *   returns: Array of monthly returns (decimal, e.g., 0.05 = 5%)
 *   dates: Array of month strings in "YYYY-MM" format
 */
export function dailyPricesToMonthlyReturns(dailyPrices) {
  if (!dailyPrices || dailyPrices.length < 2) {
    return { returns: [], dates: [] };
  }
  
  // Group prices by month and get last price of each month
  const monthlyPrices = new Map();
  
  for (const { date, adjClose } of dailyPrices) {
    const monthKey = date.substring(0, 7); // "YYYY-MM"
    
    // Keep updating - the last one in sorted order will be the month-end price
    monthlyPrices.set(monthKey, {
      date: monthKey,
      price: adjClose,
    });
  }
  
  // Convert map to sorted array
  const sortedMonths = Array.from(monthlyPrices.values())
    .sort((a, b) => a.date.localeCompare(b.date));
  
  if (sortedMonths.length < 2) {
    return { returns: [], dates: [] };
  }
  
  // Calculate returns: r_t = (P_t / P_{t-1}) - 1
  const returns = [];
  const dates = [];
  
  for (let i = 1; i < sortedMonths.length; i++) {
    const prevPrice = sortedMonths[i - 1].price;
    const currPrice = sortedMonths[i].price;
    
    if (prevPrice > 0) {
      const monthlyReturn = (currPrice / prevPrice) - 1;
      returns.push(monthlyReturn);
      dates.push(sortedMonths[i].date);
    }
  }
  
  return { returns, dates };
}

/**
 * Align multiple return series to a common date range
 * 
 * @param {Map<string, {returns: number[], dates: string[]}>} returnsByTicker
 *   Map of ticker to its returns data
 * 
 * @returns {{
 *   alignedReturns: Map<string, number[]>,
 *   commonDates: string[],
 *   tickersExcluded: string[]
 * }}
 */
export function alignReturnSeries(returnsByTicker) {
  if (returnsByTicker.size === 0) {
    return { alignedReturns: new Map(), commonDates: [], tickersExcluded: [] };
  }
  
  // Find the intersection of all date ranges
  const allDateSets = Array.from(returnsByTicker.values())
    .map(data => new Set(data.dates));
  
  // Start with all dates from the first series
  let commonDatesSet = allDateSets[0];
  
  // Intersect with each subsequent series
  for (let i = 1; i < allDateSets.length; i++) {
    commonDatesSet = new Set(
      [...commonDatesSet].filter(date => allDateSets[i].has(date))
    );
  }
  
  // Sort common dates
  const commonDates = Array.from(commonDatesSet).sort();
  
  if (commonDates.length === 0) {
    return {
      alignedReturns: new Map(),
      commonDates: [],
      tickersExcluded: Array.from(returnsByTicker.keys()),
    };
  }
  
  // Extract aligned returns for each ticker
  const alignedReturns = new Map();
  const tickersExcluded = [];
  
  for (const [ticker, data] of returnsByTicker) {
    // Create a date-to-return lookup
    const dateToReturn = new Map();
    data.dates.forEach((date, i) => {
      dateToReturn.set(date, data.returns[i]);
    });
    
    // Extract returns for common dates
    const aligned = commonDates.map(date => dateToReturn.get(date));
    
    // Check for any missing values (shouldn't happen after intersection)
    if (aligned.some(r => r === undefined)) {
      tickersExcluded.push(ticker);
    } else {
      alignedReturns.set(ticker, aligned);
    }
  }
  
  return { alignedReturns, commonDates, tickersExcluded };
}

/**
 * Build a returns matrix from aligned returns
 * 
 * @param {Map<string, number[]>} alignedReturns - Map of ticker to aligned returns
 * @param {string[]} tickerOrder - Desired order of tickers (columns)
 * 
 * @returns {number[][]} Returns matrix [time][asset]
 */
export function buildReturnsMatrix(alignedReturns, tickerOrder) {
  if (alignedReturns.size === 0 || tickerOrder.length === 0) {
    return [];
  }
  
  // Get number of time periods from first ticker's data
  const firstTicker = tickerOrder.find(t => alignedReturns.has(t));
  if (!firstTicker) return [];
  
  const numPeriods = alignedReturns.get(firstTicker).length;
  
  // Build matrix [time][asset]
  const matrix = [];
  
  for (let t = 0; t < numPeriods; t++) {
    const row = [];
    for (const ticker of tickerOrder) {
      const returns = alignedReturns.get(ticker);
      if (returns) {
        row.push(returns[t]);
      } else {
        // Ticker not in aligned set - use 0 (shouldn't happen if properly filtered)
        row.push(0);
      }
    }
    matrix.push(row);
  }
  
  return matrix;
}

/**
 * Validate that returns data meets minimum requirements
 * 
 * @param {number[]} returns - Array of monthly returns
 * @param {number} minMonths - Minimum months required (default 60 = 5 years)
 * 
 * @returns {{valid: boolean, reason?: string}}
 */
export function validateReturnsData(returns, minMonths = 60) {
  if (!returns || returns.length === 0) {
    return { valid: false, reason: 'No returns data' };
  }
  
  if (returns.length < minMonths) {
    return { 
      valid: false, 
      reason: `Only ${returns.length} months of data (minimum ${minMonths} required)` 
    };
  }
  
  // Check for any NaN or Infinity values
  const hasInvalidValues = returns.some(r => !Number.isFinite(r));
  if (hasInvalidValues) {
    return { valid: false, reason: 'Contains invalid return values' };
  }
  
  // Check for suspicious values (e.g., > 200% monthly return)
  const maxReturn = Math.max(...returns.map(Math.abs));
  if (maxReturn > 2) {
    return { valid: false, reason: 'Contains suspicious extreme values' };
  }
  
  return { valid: true };
}

/**
 * Get date range info from returns data
 * 
 * @param {string[]} dates - Array of date strings ("YYYY-MM")
 * @returns {{startDate: string, endDate: string, numMonths: number}}
 */
export function getDateRangeInfo(dates) {
  if (!dates || dates.length === 0) {
    return { startDate: null, endDate: null, numMonths: 0 };
  }
  
  const sorted = [...dates].sort();
  return {
    startDate: sorted[0],
    endDate: sorted[sorted.length - 1],
    numMonths: dates.length,
  };
}
