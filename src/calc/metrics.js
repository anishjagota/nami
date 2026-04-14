/**
 * Nami Portfolio Metrics
 * 
 * Calculate and format portfolio performance metrics.
 */

import {
  portfolioReturn,
  portfolioVolatility,
  annualizeReturn,
  annualizeVolatility,
  geometricMean,
} from './statistics';
import { RISK_FREE_RATE, MONTHS_PER_YEAR } from '../config/constants';

/**
 * Calculate all portfolio metrics
 * @param {number[]} weights - Portfolio weights (decimal, sum to 1)
 * @param {number[]} expectedReturns - Expected monthly returns per asset
 * @param {number[][]} covMatrix - Covariance matrix (monthly)
 * @param {number} [riskFreeRate] - Annual risk-free rate
 * @returns {Object} Portfolio metrics
 */
export function calculatePortfolioMetrics(
  weights, 
  expectedReturns, 
  covMatrix, 
  riskFreeRate = RISK_FREE_RATE
) {
  // Monthly metrics
  const monthlyReturn = portfolioReturn(weights, expectedReturns);
  const monthlyVol = portfolioVolatility(weights, covMatrix);
  
  // Annualized metrics
  const annualReturn = annualizeReturn(monthlyReturn);
  const annualVol = annualizeVolatility(monthlyVol);
  
  // Sharpe ratio (using annualized figures)
  const excessReturn = annualReturn - riskFreeRate;
  const sharpeRatio = annualVol > 0 ? excessReturn / annualVol : 0;
  
  return {
    monthlyReturn,
    monthlyVol,
    annualReturn,
    annualVol,
    sharpeRatio,
    excessReturn,
  };
}

/**
 * Calculate metrics for multiple portfolios
 * @param {Object} portfolios - Object mapping portfolio name to weights array
 * @param {number[]} expectedReturns - Expected monthly returns per asset
 * @param {number[][]} covMatrix - Covariance matrix (monthly)
 * @returns {Object} Object mapping portfolio name to metrics
 */
export function calculateAllPortfolioMetrics(portfolios, expectedReturns, covMatrix) {
  const results = {};
  
  for (const [name, weights] of Object.entries(portfolios)) {
    results[name] = calculatePortfolioMetrics(weights, expectedReturns, covMatrix);
  }
  
  return results;
}

/**
 * Format return as percentage string
 * @param {number} value - Return value (decimal)
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted string
 */
export function formatReturn(value, decimals = 1) {
  const pct = value * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)}%`;
}

/**
 * Format volatility as percentage string
 * @param {number} value - Volatility value (decimal)
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted string
 */
export function formatVolatility(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format Sharpe ratio
 * @param {number} value - Sharpe ratio
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted string
 */
export function formatSharpe(value, decimals = 2) {
  return value.toFixed(decimals);
}

/**
 * Get a color class based on metric value
 * @param {number} value - Metric value
 * @param {string} type - Type of metric ('return', 'sharpe')
 * @returns {string} Tailwind color class
 */
export function getMetricColor(value, type = 'return') {
  if (type === 'return' || type === 'sharpe') {
    if (value > 0.05 || (type === 'sharpe' && value > 0.5)) return 'text-teal-600';
    if (value > 0) return 'text-teal-500';
    if (value > -0.02) return 'text-nami-600';
    return 'text-coral-600';
  }
  return 'text-nami-800';
}

/**
 * Compare metrics between portfolios
 * @param {Object} metrics1 - First portfolio metrics
 * @param {Object} metrics2 - Second portfolio metrics
 * @returns {Object} Comparison results
 */
export function compareMetrics(metrics1, metrics2) {
  return {
    returnDiff: metrics1.annualReturn - metrics2.annualReturn,
    volDiff: metrics1.annualVol - metrics2.annualVol,
    sharpeDiff: metrics1.sharpeRatio - metrics2.sharpeRatio,
    betterReturn: metrics1.annualReturn > metrics2.annualReturn,
    lowerVol: metrics1.annualVol < metrics2.annualVol,
    betterSharpe: metrics1.sharpeRatio > metrics2.sharpeRatio,
  };
}

/**
 * Rank portfolios by a metric
 * @param {Object} allMetrics - Object mapping portfolio name to metrics
 * @param {string} metric - Metric to rank by ('annualReturn', 'annualVol', 'sharpeRatio')
 * @param {boolean} ascending - Sort ascending (true) or descending (false)
 * @returns {string[]} Sorted portfolio names
 */
export function rankPortfolios(allMetrics, metric = 'sharpeRatio', ascending = false) {
  const entries = Object.entries(allMetrics);
  entries.sort((a, b) => {
    const diff = a[1][metric] - b[1][metric];
    return ascending ? diff : -diff;
  });
  return entries.map(([name]) => name);
}

/**
 * Calculate historical returns for a portfolio given asset returns
 * @param {number[]} weights - Portfolio weights (decimal)
 * @param {number[][]} returnsMatrix - Historical returns matrix [time][asset]
 * @returns {number[]} Portfolio returns for each period
 */
export function calculatePortfolioReturns(weights, returnsMatrix) {
  return returnsMatrix.map(periodReturns => 
    weights.reduce((sum, w, i) => sum + w * periodReturns[i], 0)
  );
}

/**
 * Calculate cumulative returns (growth of $1)
 * @param {number[]} returns - Array of periodic returns
 * @returns {number[]} Cumulative wealth (starts at 1)
 */
export function cumulativeReturns(returns) {
  const cumulative = [1];
  for (const r of returns) {
    cumulative.push(cumulative[cumulative.length - 1] * (1 + r));
  }
  return cumulative;
}

/**
 * Calculate maximum drawdown
 * @param {number[]} cumulativeWealth - Cumulative wealth series
 * @returns {number} Maximum drawdown (as positive decimal, e.g., 0.2 = 20% drawdown)
 */
export function maxDrawdown(cumulativeWealth) {
  let maxWealth = cumulativeWealth[0];
  let maxDD = 0;
  
  for (const wealth of cumulativeWealth) {
    if (wealth > maxWealth) {
      maxWealth = wealth;
    }
    const drawdown = (maxWealth - wealth) / maxWealth;
    if (drawdown > maxDD) {
      maxDD = drawdown;
    }
  }
  
  return maxDD;
}

/**
 * Get descriptive text for portfolio type
 * @param {string} type - Portfolio type key
 * @returns {Object} { name, description, methodology }
 */
export function getPortfolioDescription(type) {
  const descriptions = {
    user: {
      name: 'Your Portfolio',
      shortName: 'Yours',
      description: 'Your custom allocation based on your selections',
      methodology: 'Manually constructed portfolio with your chosen weights.',
      color: 'coral',
    },
    benchmark: {
      name: 'Benchmark',
      shortName: 'Benchmark',
      description: '50% stocks, 50% bonds — a classic balanced portfolio',
      methodology: 'Simple 50/50 allocation between SPY (S&P 500) and AGG (US Bonds). This is a common baseline for comparison.',
      color: 'nami',
    },
    minVariance: {
      name: 'Safer Version',
      shortName: 'Safer',
      description: 'Aims for the smoothest ride with the least ups and downs',
      methodology: 'Finds the mix of assets that minimizes overall portfolio risk, without targeting higher returns.',
      color: 'teal',
    },
    riskParity: {
      name: 'Balanced Version',
      shortName: 'Balanced',
      description: 'Spreads risk evenly across all assets',
      methodology: 'Allocates weights so each asset contributes the same amount of risk. This often means more bonds, since they tend to be less volatile.',
      color: 'blue',
    },
    maxSharpe: {
      name: 'Efficiency-Focused',
      shortName: 'Efficient',
      description: 'Aims for the best return per unit of risk',
      methodology: 'Finds the mix that gets you the most return for the risk taken, balancing growth against stability.',
      color: 'purple',
    },
  };
  
  return descriptions[type] || descriptions.user;
}
