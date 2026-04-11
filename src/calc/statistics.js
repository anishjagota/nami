/**
 * Nami Statistics Module
 * 
 * Core statistical functions for portfolio analysis.
 * Includes mean, variance, covariance, and correlation calculations.
 */

import { MONTHS_PER_YEAR } from '../config/constants';

/**
 * Calculate arithmetic mean of an array
 * @param {number[]} arr - Array of numbers
 * @returns {number} Mean value
 */
export function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate geometric mean of returns
 * Returns are assumed to be in decimal form (0.05 = 5%)
 * @param {number[]} returns - Array of periodic returns
 * @returns {number} Geometric mean return per period
 */
export function geometricMean(returns) {
  if (returns.length === 0) return 0;
  const product = returns.reduce((prod, r) => prod * (1 + r), 1);
  return Math.pow(product, 1 / returns.length) - 1;
}

/**
 * Calculate sample variance
 * @param {number[]} arr - Array of numbers
 * @returns {number} Sample variance
 */
export function variance(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const squaredDiffs = arr.map(x => Math.pow(x - m, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / (arr.length - 1);
}

/**
 * Calculate sample standard deviation
 * @param {number[]} arr - Array of numbers
 * @returns {number} Sample standard deviation
 */
export function stdDev(arr) {
  return Math.sqrt(variance(arr));
}

/**
 * Calculate sample covariance between two arrays
 * @param {number[]} arr1 - First array
 * @param {number[]} arr2 - Second array
 * @returns {number} Sample covariance
 */
export function covariance(arr1, arr2) {
  if (arr1.length !== arr2.length || arr1.length < 2) return 0;
  
  const mean1 = mean(arr1);
  const mean2 = mean(arr2);
  
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    sum += (arr1[i] - mean1) * (arr2[i] - mean2);
  }
  
  return sum / (arr1.length - 1);
}

/**
 * Calculate correlation between two arrays
 * @param {number[]} arr1 - First array
 * @param {number[]} arr2 - Second array
 * @returns {number} Correlation coefficient (-1 to 1)
 */
export function correlation(arr1, arr2) {
  const cov = covariance(arr1, arr2);
  const std1 = stdDev(arr1);
  const std2 = stdDev(arr2);
  
  if (std1 === 0 || std2 === 0) return 0;
  return cov / (std1 * std2);
}

/**
 * Calculate covariance matrix from returns matrix
 * @param {number[][]} returnsMatrix - Matrix where each column is an asset's returns
 * @returns {number[][]} Covariance matrix
 */
export function covarianceMatrix(returnsMatrix) {
  if (returnsMatrix.length === 0) return [];
  
  const n = returnsMatrix[0].length; // Number of assets
  const T = returnsMatrix.length;    // Number of time periods
  
  // Extract column vectors
  const columns = [];
  for (let j = 0; j < n; j++) {
    columns.push(returnsMatrix.map(row => row[j]));
  }
  
  // Build covariance matrix
  const covMatrix = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      row.push(covariance(columns[i], columns[j]));
    }
    covMatrix.push(row);
  }
  
  return covMatrix;
}

/**
 * Calculate correlation matrix from returns matrix
 * @param {number[][]} returnsMatrix - Matrix where each column is an asset's returns
 * @returns {number[][]} Correlation matrix
 */
export function correlationMatrix(returnsMatrix) {
  if (returnsMatrix.length === 0) return [];
  
  const n = returnsMatrix[0].length;
  
  // Extract column vectors
  const columns = [];
  for (let j = 0; j < n; j++) {
    columns.push(returnsMatrix.map(row => row[j]));
  }
  
  // Build correlation matrix
  const corrMatrix = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      row.push(correlation(columns[i], columns[j]));
    }
    corrMatrix.push(row);
  }
  
  return corrMatrix;
}

/**
 * Calculate mean returns for each asset
 * @param {number[][]} returnsMatrix - Matrix where each column is an asset's returns
 * @returns {number[]} Array of mean returns per asset
 */
export function meanReturns(returnsMatrix) {
  if (returnsMatrix.length === 0) return [];
  
  const n = returnsMatrix[0].length;
  const means = [];
  
  for (let j = 0; j < n; j++) {
    const column = returnsMatrix.map(row => row[j]);
    means.push(mean(column));
  }
  
  return means;
}

/**
 * Calculate geometric mean returns for each asset
 * @param {number[][]} returnsMatrix - Matrix where each column is an asset's returns
 * @returns {number[]} Array of geometric mean returns per asset
 */
export function geometricMeanReturns(returnsMatrix) {
  if (returnsMatrix.length === 0) return [];
  
  const n = returnsMatrix[0].length;
  const means = [];
  
  for (let j = 0; j < n; j++) {
    const column = returnsMatrix.map(row => row[j]);
    means.push(geometricMean(column));
  }
  
  return means;
}

/**
 * Annualize monthly returns
 * @param {number} monthlyReturn - Monthly return (decimal)
 * @returns {number} Annualized return
 */
export function annualizeReturn(monthlyReturn) {
  return Math.pow(1 + monthlyReturn, MONTHS_PER_YEAR) - 1;
}

/**
 * Annualize monthly volatility
 * @param {number} monthlyVol - Monthly volatility (decimal)
 * @returns {number} Annualized volatility
 */
export function annualizeVolatility(monthlyVol) {
  return monthlyVol * Math.sqrt(MONTHS_PER_YEAR);
}

/**
 * Matrix-vector multiplication
 * @param {number[][]} matrix - n x n matrix
 * @param {number[]} vector - n-element vector
 * @returns {number[]} Result vector
 */
export function matrixVectorMultiply(matrix, vector) {
  return matrix.map(row => 
    row.reduce((sum, val, j) => sum + val * vector[j], 0)
  );
}

/**
 * Vector dot product
 * @param {number[]} v1 - First vector
 * @param {number[]} v2 - Second vector
 * @returns {number} Dot product
 */
export function dotProduct(v1, v2) {
  return v1.reduce((sum, val, i) => sum + val * v2[i], 0);
}

/**
 * Calculate portfolio variance: w'Σw
 * @param {number[]} weights - Portfolio weights (decimal)
 * @param {number[][]} covMatrix - Covariance matrix
 * @returns {number} Portfolio variance
 */
export function portfolioVariance(weights, covMatrix) {
  const Sigma_w = matrixVectorMultiply(covMatrix, weights);
  return dotProduct(weights, Sigma_w);
}

/**
 * Calculate portfolio volatility (standard deviation)
 * @param {number[]} weights - Portfolio weights (decimal)
 * @param {number[][]} covMatrix - Covariance matrix
 * @returns {number} Portfolio volatility
 */
export function portfolioVolatility(weights, covMatrix) {
  return Math.sqrt(portfolioVariance(weights, covMatrix));
}

/**
 * Calculate portfolio expected return
 * @param {number[]} weights - Portfolio weights (decimal)
 * @param {number[]} expectedReturns - Expected returns per asset
 * @returns {number} Portfolio expected return
 */
export function portfolioReturn(weights, expectedReturns) {
  return dotProduct(weights, expectedReturns);
}
