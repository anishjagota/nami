/**
 * Server-side Data Transforms
 *
 * Replicates the monthly returns computation from
 * src/data/transforms/priceToReturns.js so we can pre-compute
 * returns on the server and send a tiny payload (~4KB) instead
 * of raw daily prices (~450KB) to the browser.
 */

/**
 * Convert daily prices to monthly returns
 *
 * @param {Array<{date: string, adjClose: number}>} dailyPrices - sorted oldest first
 * @returns {{ returns: number[], dates: string[] }}
 */
export function dailyPricesToMonthlyReturns(dailyPrices) {
  if (!dailyPrices || dailyPrices.length === 0) {
    return { returns: [], dates: [] };
  }

  // Group by year-month, keeping the last trading day's closing price
  const monthlyPrices = new Map();

  for (const { date, adjClose } of dailyPrices) {
    if (adjClose == null || adjClose <= 0) continue;
    const yearMonth = date.substring(0, 7); // "YYYY-MM"
    monthlyPrices.set(yearMonth, adjClose); // last day wins (data sorted oldest-first)
  }

  const sortedMonths = [...monthlyPrices.keys()].sort();

  if (sortedMonths.length < 2) {
    return { returns: [], dates: [] };
  }

  // Compute monthly returns: r_t = (P_t / P_{t-1}) - 1
  const returns = [];
  const dates = [];

  for (let i = 1; i < sortedMonths.length; i++) {
    const prevPrice = monthlyPrices.get(sortedMonths[i - 1]);
    const currPrice = monthlyPrices.get(sortedMonths[i]);

    if (prevPrice > 0 && currPrice > 0) {
      returns.push((currPrice / prevPrice) - 1);
      dates.push(sortedMonths[i]);
    }
  }

  return { returns, dates };
}
