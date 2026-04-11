/**
 * Nami Backtest Module
 * 
 * Historical performance calculations including:
 * - Cumulative returns (growth of $1)
 * - Drawdown analysis
 * - Rolling metrics
 * - Period-specific performance
 */

import { MONTHS_PER_YEAR } from '../config/constants';
import { mean, stdDev, geometricMean } from './statistics';

/**
 * Calculate portfolio returns for each period
 * @param {number[]} weights - Portfolio weights (decimal, sum to 1)
 * @param {number[][]} returnsMatrix - Historical returns [time][asset]
 * @returns {number[]} Portfolio returns for each period
 */
export function calculatePortfolioReturns(weights, returnsMatrix) {
  return returnsMatrix.map(periodReturns => 
    weights.reduce((sum, w, i) => sum + w * periodReturns[i], 0)
  );
}

/**
 * Calculate cumulative wealth (growth of $1)
 * @param {number[]} returns - Array of periodic returns (decimal)
 * @param {number} initialValue - Starting value (default 1)
 * @returns {number[]} Cumulative wealth series (length = returns.length + 1)
 */
export function cumulativeWealth(returns, initialValue = 1) {
  const wealth = [initialValue];
  for (const r of returns) {
    wealth.push(wealth[wealth.length - 1] * (1 + r));
  }
  return wealth;
}

/**
 * Calculate drawdown series
 * @param {number[]} wealthSeries - Cumulative wealth series
 * @returns {number[]} Drawdown at each point (as positive decimal, 0.2 = 20% down from peak)
 */
export function drawdownSeries(wealthSeries) {
  const drawdowns = [];
  let peak = wealthSeries[0];
  
  for (const wealth of wealthSeries) {
    if (wealth > peak) {
      peak = wealth;
    }
    const dd = peak > 0 ? (peak - wealth) / peak : 0;
    drawdowns.push(dd);
  }
  
  return drawdowns;
}

/**
 * Calculate maximum drawdown
 * @param {number[]} wealthSeries - Cumulative wealth series
 * @returns {number} Maximum drawdown (as positive decimal)
 */
export function maxDrawdown(wealthSeries) {
  const dds = drawdownSeries(wealthSeries);
  return Math.max(...dds);
}

/**
 * Calculate drawdown details (max DD, start, end, recovery)
 * @param {number[]} wealthSeries - Cumulative wealth series
 * @param {string[]} dates - Date labels
 * @returns {Object} Drawdown details
 */
export function drawdownDetails(wealthSeries, dates) {
  const dds = drawdownSeries(wealthSeries);
  let maxDD = 0;
  let maxDDIndex = 0;
  let peakIndex = 0;
  let currentPeak = wealthSeries[0];
  let currentPeakIndex = 0;
  
  for (let i = 0; i < wealthSeries.length; i++) {
    if (wealthSeries[i] > currentPeak) {
      currentPeak = wealthSeries[i];
      currentPeakIndex = i;
    }
    if (dds[i] > maxDD) {
      maxDD = dds[i];
      maxDDIndex = i;
      peakIndex = currentPeakIndex;
    }
  }
  
  // Find recovery point
  let recoveryIndex = null;
  const peakValue = wealthSeries[peakIndex];
  for (let i = maxDDIndex; i < wealthSeries.length; i++) {
    if (wealthSeries[i] >= peakValue) {
      recoveryIndex = i;
      break;
    }
  }
  
  return {
    maxDrawdown: maxDD,
    peakDate: dates[peakIndex] || null,
    troughDate: dates[maxDDIndex] || null,
    recoveryDate: recoveryIndex !== null ? dates[recoveryIndex] : null,
    peakValue: wealthSeries[peakIndex],
    troughValue: wealthSeries[maxDDIndex],
    recovered: recoveryIndex !== null,
  };
}

/**
 * Calculate total return over a period
 * @param {number[]} returns - Array of periodic returns
 * @returns {number} Total return (decimal)
 */
export function totalReturn(returns) {
  if (returns.length === 0) return 0;
  return returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
}

/**
 * Calculate annualized return from periodic returns
 * @param {number[]} returns - Array of monthly returns
 * @returns {number} Annualized return (decimal)
 */
export function annualizedReturn(returns) {
  if (returns.length === 0) return 0;
  const total = totalReturn(returns);
  const years = returns.length / MONTHS_PER_YEAR;
  if (years <= 0) return total;
  return Math.pow(1 + total, 1 / years) - 1;
}

/**
 * Calculate annualized volatility from monthly returns
 * @param {number[]} returns - Array of monthly returns
 * @returns {number} Annualized volatility (decimal)
 */
export function annualizedVolatility(returns) {
  if (returns.length < 2) return 0;
  return stdDev(returns) * Math.sqrt(MONTHS_PER_YEAR);
}

/**
 * Calculate Sharpe ratio for a return series
 * @param {number[]} returns - Array of monthly returns
 * @param {number} riskFreeRate - Annual risk-free rate
 * @returns {number} Sharpe ratio
 */
export function sharpeRatio(returns, riskFreeRate = 0.03) {
  const annRet = annualizedReturn(returns);
  const annVol = annualizedVolatility(returns);
  if (annVol === 0) return 0;
  return (annRet - riskFreeRate) / annVol;
}

/**
 * Calculate all backtest metrics for a portfolio
 * @param {number[]} weights - Portfolio weights
 * @param {number[][]} returnsMatrix - Historical returns matrix
 * @param {string[]} dates - Date labels
 * @param {number} riskFreeRate - Annual risk-free rate
 * @returns {Object} Backtest results
 */
export function runBacktest(weights, returnsMatrix, dates, riskFreeRate = 0.03) {
  // Calculate portfolio returns
  const portReturns = calculatePortfolioReturns(weights, returnsMatrix);
  
  // Calculate cumulative wealth
  const wealth = cumulativeWealth(portReturns, 1);
  
  // Calculate drawdowns
  const drawdowns = drawdownSeries(wealth);
  const ddDetails = drawdownDetails(wealth, ['Start', ...dates]);
  
  // Calculate metrics
  const metrics = {
    totalReturn: totalReturn(portReturns),
    annualizedReturn: annualizedReturn(portReturns),
    annualizedVolatility: annualizedVolatility(portReturns),
    sharpeRatio: sharpeRatio(portReturns, riskFreeRate),
    maxDrawdown: ddDetails.maxDrawdown,
  };
  
  return {
    returns: portReturns,
    wealth,
    drawdowns,
    drawdownDetails: ddDetails,
    metrics,
    dates: ['Start', ...dates],
  };
}

/**
 * Run backtest for multiple portfolios
 * @param {Object} portfolios - Object mapping name to weights array
 * @param {number[][]} returnsMatrix - Historical returns matrix
 * @param {string[]} dates - Date labels
 * @param {number} riskFreeRate - Annual risk-free rate
 * @returns {Object} Backtest results for all portfolios
 */
export function runAllBacktests(portfolios, returnsMatrix, dates, riskFreeRate = 0.03) {
  const results = {};
  
  for (const [name, weights] of Object.entries(portfolios)) {
    results[name] = runBacktest(weights, returnsMatrix, dates, riskFreeRate);
  }
  
  return results;
}

/**
 * Get returns for a specific date range
 * @param {number[][]} returnsMatrix - Full returns matrix
 * @param {string[]} dates - All dates
 * @param {string} startDate - Start date (inclusive)
 * @param {string} endDate - End date (inclusive)
 * @returns {Object} { returns, dates, startIdx, endIdx }
 */
export function getReturnsInRange(returnsMatrix, dates, startDate, endDate) {
  const startIdx = dates.findIndex(d => d >= startDate);
  const endIdx = dates.findIndex(d => d > endDate);
  
  const actualEndIdx = endIdx === -1 ? dates.length : endIdx;
  const actualStartIdx = startIdx === -1 ? 0 : startIdx;
  
  return {
    returns: returnsMatrix.slice(actualStartIdx, actualEndIdx),
    dates: dates.slice(actualStartIdx, actualEndIdx),
    startIdx: actualStartIdx,
    endIdx: actualEndIdx,
  };
}

/**
 * Calculate year-by-year returns
 * @param {number[]} returns - Monthly returns
 * @param {string[]} dates - Date labels (YYYY-MM format)
 * @returns {Object[]} Array of { year, return }
 */
export function yearlyReturns(returns, dates) {
  const yearlyData = {};
  
  dates.forEach((date, i) => {
    const year = date.substring(0, 4);
    if (!yearlyData[year]) {
      yearlyData[year] = [];
    }
    yearlyData[year].push(returns[i]);
  });
  
  return Object.entries(yearlyData).map(([year, rets]) => ({
    year,
    return: totalReturn(rets),
    months: rets.length,
  }));
}

/**
 * Predefined date ranges for quick selection
 */
export const dateRangePresets = {
  '1Y': { months: 12, label: '1 Year' },
  '3Y': { months: 36, label: '3 Years' },
  '5Y': { months: 60, label: '5 Years' },
  '10Y': { months: 120, label: '10 Years' },
  'MAX': { months: Infinity, label: 'Max' },
};

/**
 * Get start date for a preset range
 * @param {string} preset - Preset key ('1Y', '3Y', etc.)
 * @param {string[]} dates - Available dates
 * @returns {string} Start date
 */
export function getPresetStartDate(preset, dates) {
  if (dates.length === 0) return dates[0];
  
  const config = dateRangePresets[preset];
  if (!config || config.months === Infinity) {
    return dates[0];
  }
  
  const endIdx = dates.length - 1;
  const startIdx = Math.max(0, endIdx - config.months + 1);
  return dates[startIdx];
}

/**
 * Format currency value
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted string
 */
export function formatCurrency(value, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage
 * @param {number} value - Decimal value
 * @param {number} decimals - Decimal places
 * @param {boolean} showSign - Show + for positive values
 * @returns {string} Formatted string
 */
export function formatPercent(value, decimals = 1, showSign = true) {
  const pct = value * 100;
  const sign = showSign && pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)}%`;
}
