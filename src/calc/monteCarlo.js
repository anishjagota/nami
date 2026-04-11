/**
 * Nami Monte Carlo Simulation Module
 * 
 * Simulates future portfolio outcomes using:
 * - Historical mean returns and covariance
 * - Multivariate normal sampling
 * - Optional monthly contributions
 * 
 * Reference: Similar to MATLAB's portsim pattern
 */

import { MONTHS_PER_YEAR, MONTE_CARLO_SIMULATIONS } from '../config/constants';
import { 
  mean, 
  covarianceMatrix, 
  portfolioReturn,
  matrixVectorMultiply,
} from './statistics';

/**
 * Generate standard normal random number using Box-Muller transform
 * @returns {number} Standard normal random value
 */
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generate array of standard normal random numbers
 * @param {number} n - Number of values
 * @returns {number[]} Array of standard normal values
 */
function randnArray(n) {
  return Array.from({ length: n }, () => randn());
}

/**
 * Cholesky decomposition of a positive definite matrix
 * Returns lower triangular matrix L such that A = L * L'
 * @param {number[][]} matrix - Positive definite matrix
 * @returns {number[][]} Lower triangular Cholesky factor
 */
function cholesky(matrix) {
  const n = matrix.length;
  const L = Array.from({ length: n }, () => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      
      if (j === i) {
        for (let k = 0; k < j; k++) {
          sum += L[j][k] * L[j][k];
        }
        L[j][j] = Math.sqrt(Math.max(0, matrix[j][j] - sum));
      } else {
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        L[i][j] = L[j][j] !== 0 ? (matrix[i][j] - sum) / L[j][j] : 0;
      }
    }
  }
  
  return L;
}

/**
 * Generate correlated random returns using Cholesky decomposition
 * @param {number[]} means - Expected returns for each asset
 * @param {number[][]} covMatrix - Covariance matrix
 * @returns {number[]} Correlated random returns
 */
function generateCorrelatedReturns(means, cholL) {
  const n = means.length;
  const z = randnArray(n);
  
  // Transform: returns = means + L * z
  const returns = [...means];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      returns[i] += cholL[i][j] * z[j];
    }
  }
  
  return returns;
}

/**
 * Run a single Monte Carlo simulation path
 * @param {number[]} weights - Portfolio weights (decimal)
 * @param {number[]} assetMeans - Expected monthly returns per asset
 * @param {number[][]} cholL - Cholesky factor of covariance matrix
 * @param {number} horizonMonths - Number of months to simulate
 * @param {number} initialWealth - Starting wealth
 * @param {number} monthlyContribution - Monthly contribution amount
 * @returns {number[]} Wealth path (length = horizonMonths + 1)
 */
function simulatePath(
  weights, 
  assetMeans, 
  cholL, 
  horizonMonths, 
  initialWealth,
  monthlyContribution = 0
) {
  const path = [initialWealth];
  let wealth = initialWealth;
  
  for (let t = 0; t < horizonMonths; t++) {
    // Generate correlated asset returns
    const assetReturns = generateCorrelatedReturns(assetMeans, cholL);
    
    // Portfolio return = weighted sum of asset returns
    const portReturn = weights.reduce((sum, w, i) => sum + w * assetReturns[i], 0);
    
    // Update wealth
    wealth = wealth * (1 + portReturn) + monthlyContribution;
    path.push(wealth);
  }
  
  return path;
}

/**
 * Run Monte Carlo simulation for a portfolio
 * @param {Object} params - Simulation parameters
 * @param {number[]} params.weights - Portfolio weights (decimal, sum to 1)
 * @param {number[]} params.assetMeans - Expected monthly returns per asset
 * @param {number[][]} params.covMatrix - Covariance matrix (monthly)
 * @param {number} params.horizonYears - Simulation horizon in years
 * @param {number} params.initialWealth - Starting wealth
 * @param {number} params.monthlyContribution - Monthly contribution
 * @param {number} params.numSimulations - Number of simulation paths
 * @returns {Object} Simulation results
 */
export function runMonteCarloSimulation({
  weights,
  assetMeans,
  covMatrix,
  horizonYears = 10,
  initialWealth = 100000,
  monthlyContribution = 0,
  numSimulations = MONTE_CARLO_SIMULATIONS,
}) {
  const horizonMonths = horizonYears * MONTHS_PER_YEAR;
  
  // Compute Cholesky decomposition once
  const cholL = cholesky(covMatrix);
  
  // Run simulations
  const paths = [];
  const terminalWealth = [];
  
  for (let sim = 0; sim < numSimulations; sim++) {
    const path = simulatePath(
      weights,
      assetMeans,
      cholL,
      horizonMonths,
      initialWealth,
      monthlyContribution
    );
    paths.push(path);
    terminalWealth.push(path[path.length - 1]);
  }
  
  // Sort terminal wealth for percentile calculations
  const sortedTerminal = [...terminalWealth].sort((a, b) => a - b);
  
  // Calculate percentiles
  const percentiles = calculatePercentiles(sortedTerminal, [5, 10, 25, 50, 75, 90, 95]);
  
  // Calculate fan chart data (percentile bands at each time point)
  const fanChart = calculateFanChart(paths, horizonMonths);
  
  // Calculate histogram bins
  const histogram = calculateHistogram(sortedTerminal, 30);
  
  // Summary statistics
  const meanTerminal = terminalWealth.reduce((s, v) => s + v, 0) / numSimulations;
  const totalContributions = initialWealth + (monthlyContribution * horizonMonths);
  
  return {
    paths,
    terminalWealth,
    sortedTerminal,
    percentiles,
    fanChart,
    histogram,
    summary: {
      mean: meanTerminal,
      median: percentiles[50],
      p5: percentiles[5],
      p25: percentiles[25],
      p75: percentiles[75],
      p95: percentiles[95],
      min: sortedTerminal[0],
      max: sortedTerminal[sortedTerminal.length - 1],
      totalContributions,
      horizonYears,
      horizonMonths,
      numSimulations,
    },
  };
}

/**
 * Calculate percentiles from sorted array
 * @param {number[]} sorted - Sorted array of values
 * @param {number[]} percentileList - List of percentiles to calculate (0-100)
 * @returns {Object} Map of percentile to value
 */
function calculatePercentiles(sorted, percentileList) {
  const n = sorted.length;
  const result = {};
  
  for (const p of percentileList) {
    const idx = Math.floor((p / 100) * (n - 1));
    const frac = ((p / 100) * (n - 1)) - idx;
    
    if (idx >= n - 1) {
      result[p] = sorted[n - 1];
    } else {
      result[p] = sorted[idx] * (1 - frac) + sorted[idx + 1] * frac;
    }
  }
  
  return result;
}

/**
 * Calculate fan chart data (percentile bands over time)
 * @param {number[][]} paths - All simulation paths
 * @param {number} horizonMonths - Number of time points
 * @returns {Object[]} Array of { month, p5, p25, p50, p75, p95 }
 */
function calculateFanChart(paths, horizonMonths) {
  const fanData = [];
  
  for (let t = 0; t <= horizonMonths; t++) {
    const valuesAtT = paths.map(path => path[t]).sort((a, b) => a - b);
    const percentiles = calculatePercentiles(valuesAtT, [5, 10, 25, 50, 75, 90, 95]);
    
    fanData.push({
      month: t,
      year: t / MONTHS_PER_YEAR,
      p5: percentiles[5],
      p10: percentiles[10],
      p25: percentiles[25],
      p50: percentiles[50],
      p75: percentiles[75],
      p90: percentiles[90],
      p95: percentiles[95],
    });
  }
  
  return fanData;
}

/**
 * Calculate histogram bins for terminal wealth
 * @param {number[]} sorted - Sorted terminal wealth values
 * @param {number} numBins - Number of bins
 * @returns {Object[]} Array of { binStart, binEnd, count, frequency }
 */
function calculateHistogram(sorted, numBins) {
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;
  const binWidth = range / numBins;
  
  const bins = [];
  for (let i = 0; i < numBins; i++) {
    bins.push({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      binMid: min + (i + 0.5) * binWidth,
      count: 0,
    });
  }
  
  // Count values in each bin
  for (const value of sorted) {
    const binIdx = Math.min(
      Math.floor((value - min) / binWidth),
      numBins - 1
    );
    bins[binIdx].count++;
  }
  
  // Calculate frequencies
  const total = sorted.length;
  for (const bin of bins) {
    bin.frequency = bin.count / total;
    bin.percentage = bin.frequency * 100;
  }
  
  return bins;
}

/**
 * Format currency for display
 * @param {number} value - Value to format
 * @param {boolean} compact - Use compact notation for large numbers
 * @returns {string} Formatted string
 */
export function formatSimCurrency(value, compact = false) {
  if (compact && Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Calculate probability of reaching a target
 * @param {number[]} sortedTerminal - Sorted terminal wealth values
 * @param {number} target - Target wealth value
 * @returns {number} Probability (0-1)
 */
export function probabilityOfReachingTarget(sortedTerminal, target) {
  const countAbove = sortedTerminal.filter(v => v >= target).length;
  return countAbove / sortedTerminal.length;
}

/**
 * Calculate probability of losing money
 * @param {number[]} sortedTerminal - Sorted terminal wealth values
 * @param {number} initialWealth - Starting wealth
 * @returns {number} Probability (0-1)
 */
export function probabilityOfLoss(sortedTerminal, initialWealth) {
  const countBelow = sortedTerminal.filter(v => v < initialWealth).length;
  return countBelow / sortedTerminal.length;
}
