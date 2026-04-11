/**
 * Nami Portfolio Utilities
 * 
 * Core functions for portfolio weight management and validation.
 */

import { WEIGHT_SUM_TARGET, MIN_WEIGHT, MAX_WEIGHT } from '../config/constants';

/**
 * Calculate total weight of a portfolio
 * @param {Object} weights - Object mapping assetId to weight (0-100)
 * @returns {number} Total weight sum
 */
export function calculateTotalWeight(weights) {
  return Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
}

/**
 * Check if portfolio weights are valid (sum to 100)
 * @param {Object} weights - Object mapping assetId to weight
 * @returns {boolean} True if valid
 */
export function isValidPortfolio(weights) {
  const total = calculateTotalWeight(weights);
  return Math.abs(total - WEIGHT_SUM_TARGET) < 0.01; // Allow tiny floating point errors
}

/**
 * Normalize weights to sum to target (default 100)
 * @param {Object} weights - Object mapping assetId to weight
 * @param {number} target - Target sum (default 100)
 * @returns {Object} Normalized weights
 */
export function normalizeWeights(weights, target = WEIGHT_SUM_TARGET) {
  const total = calculateTotalWeight(weights);
  if (total === 0) return weights;
  
  const normalized = {};
  const scale = target / total;
  
  for (const [assetId, weight] of Object.entries(weights)) {
    normalized[assetId] = Math.round(weight * scale * 100) / 100;
  }
  
  return normalized;
}

/**
 * Convert percentage weights to decimal weights
 * @param {Object} weights - Object mapping assetId to weight (0-100)
 * @returns {Object} Decimal weights (0-1)
 */
export function toDecimalWeights(weights) {
  const decimal = {};
  for (const [assetId, weight] of Object.entries(weights)) {
    decimal[assetId] = weight / 100;
  }
  return decimal;
}

/**
 * Convert decimal weights to percentage weights
 * @param {Object} weights - Object mapping assetId to weight (0-1)
 * @returns {Object} Percentage weights (0-100)
 */
export function toPercentageWeights(weights) {
  const percentage = {};
  for (const [assetId, weight] of Object.entries(weights)) {
    percentage[assetId] = weight * 100;
  }
  return percentage;
}

/**
 * Get weight as array for calculations
 * @param {Object} weights - Object mapping assetId to weight
 * @param {string[]} assetOrder - Array of asset IDs in desired order
 * @returns {number[]} Array of weights
 */
export function weightsToArray(weights, assetOrder) {
  return assetOrder.map(id => (weights[id] || 0) / 100);
}

/**
 * Convert weight array back to object
 * @param {number[]} weightArray - Array of decimal weights
 * @param {string[]} assetOrder - Array of asset IDs
 * @returns {Object} Weights object (percentage)
 */
export function arrayToWeights(weightArray, assetOrder) {
  const weights = {};
  assetOrder.forEach((id, i) => {
    weights[id] = Math.round(weightArray[i] * 10000) / 100; // Convert to percentage with 2 decimals
  });
  return weights;
}

/**
 * Clamp a weight value within bounds
 * @param {number} weight - Weight to clamp
 * @returns {number} Clamped weight
 */
export function clampWeight(weight) {
  return Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, weight));
}

/**
 * Format weight for display
 * @param {number} weight - Weight as percentage
 * @param {number} decimals - Decimal places (default 1)
 * @returns {string} Formatted string
 */
export function formatWeight(weight, decimals = 1) {
  return `${weight.toFixed(decimals)}%`;
}

/**
 * Get the number of non-zero positions in a portfolio
 * @param {Object} weights - Object mapping assetId to weight
 * @returns {number} Number of positions
 */
export function countPositions(weights) {
  return Object.values(weights).filter(w => w > 0).length;
}

/**
 * Get asset IDs with non-zero weights
 * @param {Object} weights - Object mapping assetId to weight
 * @returns {string[]} Array of asset IDs
 */
export function getActiveAssets(weights) {
  return Object.entries(weights)
    .filter(([_, weight]) => weight > 0)
    .map(([id, _]) => id);
}

/**
 * Create empty weights object for asset universe
 * @param {string[]} assetIds - Array of asset IDs
 * @returns {Object} Weights object with all zeros
 */
export function createEmptyWeights(assetIds) {
  const weights = {};
  for (const id of assetIds) {
    weights[id] = 0;
  }
  return weights;
}

/**
 * Create equal-weight portfolio
 * @param {string[]} assetIds - Array of asset IDs to include
 * @returns {Object} Equal weights summing to 100
 */
export function createEqualWeights(assetIds) {
  const weight = WEIGHT_SUM_TARGET / assetIds.length;
  const weights = {};
  for (const id of assetIds) {
    weights[id] = Math.round(weight * 100) / 100;
  }
  return normalizeWeights(weights); // Ensure exact sum
}

/**
 * Calculate difference between two portfolios
 * @param {Object} weights1 - First portfolio
 * @param {Object} weights2 - Second portfolio
 * @returns {Object} Difference (weights1 - weights2)
 */
export function weightsDifference(weights1, weights2) {
  const allIds = new Set([...Object.keys(weights1), ...Object.keys(weights2)]);
  const diff = {};
  for (const id of allIds) {
    diff[id] = (weights1[id] || 0) - (weights2[id] || 0);
  }
  return diff;
}
