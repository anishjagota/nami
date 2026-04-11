/**
 * Nami Portfolio Analysis Hook
 * 
 * Computes optimizations and metrics using historical data.
 * 
 * IMPORTANT: Optimizations (MinVar, RiskParity, MaxSharpe) run ONLY on 
 * the user's selected assets. This answers: "Given the assets I chose, 
 * what are smarter ways to mix them?"
 * 
 * The Benchmark (50/50 SPY/AGG) remains independent of selection.
 * 
 * Supports async data loading for the expanded ETF universe.
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { getAllAssetIds, getCoreAssetIds } from '../data/assetUniverse';
import { getReturnsMatrix, getReturnsMatrixAsync, hasStaticData } from '../data/historicalReturns';
import {
  covarianceMatrix,
  geometricMeanReturns,
} from '../calc/statistics';
import {
  minimumVariance,
  riskParity,
  maximumSharpe,
  createBenchmark,
  calculateRiskContributions,
} from '../calc/optimizer';
import {
  calculatePortfolioMetrics,
  calculateAllPortfolioMetrics,
  getPortfolioDescription,
} from '../calc/metrics';
import { weightsToArray, arrayToWeights } from '../utils/portfolio';

/**
 * Filter returns matrix to only include specified assets
 * @param {number[][]} returnsMatrix - Full returns matrix [time][asset]
 * @param {string[]} fullAssetIds - All asset IDs in order
 * @param {string[]} selectedAssetIds - Asset IDs to keep
 * @returns {number[][]} Filtered returns matrix
 */
function filterReturnsMatrix(returnsMatrix, fullAssetIds, selectedAssetIds) {
  const indices = selectedAssetIds.map(id => fullAssetIds.indexOf(id)).filter(i => i >= 0);
  return returnsMatrix.map(row => indices.map(i => row[i]));
}

/**
 * Map weights from subset back to full universe
 * @param {number[]} subsetWeights - Weights for selected assets (decimal)
 * @param {string[]} selectedAssetIds - Selected asset IDs
 * @param {string[]} fullAssetIds - All asset IDs
 * @returns {number[]} Full-length weights array (zeros for non-selected)
 */
function mapWeightsToFullUniverse(subsetWeights, selectedAssetIds, fullAssetIds) {
  const fullWeights = fullAssetIds.map(() => 0);
  selectedAssetIds.forEach((id, i) => {
    const fullIndex = fullAssetIds.indexOf(id);
    if (fullIndex >= 0) {
      fullWeights[fullIndex] = subsetWeights[i];
    }
  });
  return fullWeights;
}

/**
 * Check if all selected assets have static (offline) data available
 */
function allAssetsHaveStaticData(assetIds) {
  return assetIds.every(id => hasStaticData(id));
}

/**
 * Compute analysis from returns data
 */
function computeAnalysis(returnsMatrix, dates, assetIds, selectedAssets, userWeightsObj) {
  // Calculate covariance and expected returns
  const covMatrix = covarianceMatrix(returnsMatrix);
  const expReturns = geometricMeanReturns(returnsMatrix);
  
  // Filter to selected assets for optimization
  const selectedIndices = selectedAssets.map(id => assetIds.indexOf(id)).filter(i => i >= 0);
  const filteredReturns = returnsMatrix.map(row => selectedIndices.map(i => row[i]));
  const filteredCovMatrix = covarianceMatrix(filteredReturns);
  const filteredExpReturns = geometricMeanReturns(filteredReturns);
  
  // Convert user weights to array
  const userWeights = weightsToArray(userWeightsObj, assetIds);
  
  // Benchmark: always 50/50 SPY/AGG (independent of selection)
  const benchmarkWeights = createBenchmark(assetIds);
  
  // Run optimizations on filtered (selected assets only) data
  const minVarFiltered = minimumVariance(filteredCovMatrix);
  const riskParityFiltered = riskParity(filteredCovMatrix);
  const maxSharpeFiltered = maximumSharpe(filteredCovMatrix, filteredExpReturns);
  
  // Map optimized weights back to full universe
  const minVarWeights = mapWeightsToFullUniverse(minVarFiltered, selectedAssets, assetIds);
  const riskParityWeights = mapWeightsToFullUniverse(riskParityFiltered, selectedAssets, assetIds);
  const maxSharpeWeights = mapWeightsToFullUniverse(maxSharpeFiltered, selectedAssets, assetIds);
  
  // All portfolios as arrays
  const portfolioWeightsArray = {
    user: userWeights,
    benchmark: benchmarkWeights,
    minVariance: minVarWeights,
    riskParity: riskParityWeights,
    maxSharpe: maxSharpeWeights,
  };
  
  // Convert to weight objects
  const portfolioWeightsObj = {
    user: userWeightsObj,
    benchmark: arrayToWeights(benchmarkWeights, assetIds),
    minVariance: arrayToWeights(minVarWeights, assetIds),
    riskParity: arrayToWeights(riskParityWeights, assetIds),
    maxSharpe: arrayToWeights(maxSharpeWeights, assetIds),
  };
  
  // Calculate metrics
  const metrics = calculateAllPortfolioMetrics(portfolioWeightsArray, expReturns, covMatrix);
  
  // Calculate risk contributions
  const riskContributions = {};
  for (const [name, w] of Object.entries(portfolioWeightsArray)) {
    riskContributions[name] = calculateRiskContributions(w, covMatrix);
  }
  
  // Get descriptions
  const descriptions = {};
  for (const name of Object.keys(portfolioWeightsArray)) {
    descriptions[name] = getPortfolioDescription(name);
  }
  
  // Rank by Sharpe
  const sortedBySharpe = Object.entries(metrics)
    .sort((a, b) => b[1].sharpeRatio - a[1].sharpeRatio)
    .map(([name]) => name);
  
  return {
    assetIds,
    selectedAssets,
    covMatrix,
    expReturns,
    portfolioWeightsArray,
    portfolioWeightsObj,
    metrics,
    riskContributions,
    descriptions,
    sortedBySharpe,
    dates,
    returnsMatrix,
  };
}

/**
 * Hook that computes all portfolio analysis data
 * Supports both sync (static data) and async (API data) modes
 * @returns {Object} Analysis data including optimized portfolios and metrics
 */
export function usePortfolioAnalysis() {
  const { weights: userWeightsObj, selectedAssets, isValid } = usePortfolio();
  
  // State for async loading
  const [asyncAnalysis, setAsyncAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get asset IDs based on what's selected
  // For static data, use the core set; for async, use whatever's needed
  const allAssetIds = useMemo(() => getAllAssetIds(), []);
  const coreAssetIds = useMemo(() => getCoreAssetIds(), []);
  
  // Determine which assets are needed for analysis
  const neededAssets = useMemo(() => {
    if (!isValid || selectedAssets.length === 0) return [];
    
    // Always need SPY and AGG for benchmark
    const needed = new Set(['SPY', 'AGG', ...selectedAssets]);
    return Array.from(needed);
  }, [selectedAssets, isValid]);
  
  // Check if we can use sync (static) data
  const canUseStaticData = useMemo(() => {
    return allAssetsHaveStaticData(neededAssets);
  }, [neededAssets]);
  
  // Sync analysis for static data (fast path)
  const syncAnalysis = useMemo(() => {
    if (!isValid || selectedAssets.length === 0 || !canUseStaticData) {
      return null;
    }
    
    try {
      // Get returns for needed assets only
      const { returns: returnsMatrix, dates } = getReturnsMatrix(neededAssets);
      return computeAnalysis(returnsMatrix, dates, neededAssets, selectedAssets, userWeightsObj);
    } catch (err) {
      console.error('Sync analysis failed:', err);
      return null;
    }
  }, [userWeightsObj, selectedAssets, isValid, neededAssets, canUseStaticData]);
  
  // Async data loading for non-static assets
  useEffect(() => {
    if (!isValid || selectedAssets.length === 0) {
      setAsyncAnalysis(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    
    if (canUseStaticData) {
      // Already handled by syncAnalysis
      setIsLoading(false);
      return;
    }
    
    // Need to fetch data asynchronously
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    
    (async () => {
      try {
        const result = await getReturnsMatrixAsync(neededAssets);
        
        if (cancelled) return;
        
        if (result.excluded.length > 0) {
          console.warn('Some assets excluded due to missing data:', result.excluded);
        }
        
        // Filter selected assets to only those with data
        const validSelected = selectedAssets.filter(id => result.tickers.includes(id));
        
        if (validSelected.length === 0) {
          setError('No data available for selected assets');
          setAsyncAnalysis(null);
          setIsLoading(false);
          return;
        }
        
        const analysis = computeAnalysis(
          result.returns,
          result.dates,
          result.tickers,
          validSelected,
          userWeightsObj
        );
        
        if (!cancelled) {
          setAsyncAnalysis(analysis);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Async analysis failed:', err);
          setError(err.message);
          setIsLoading(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [userWeightsObj, selectedAssets, isValid, neededAssets, canUseStaticData]);
  
  // Use sync analysis if available, otherwise async
  const analysis = syncAnalysis || asyncAnalysis;
  
  return {
    analysis,
    isReady: analysis !== null,
    isLoading,
    error,
    assetIds: analysis?.assetIds || neededAssets,
  };
}

/**
 * Format portfolio data for display in comparison cards
 * @param {Object} analysis - Analysis object from usePortfolioAnalysis
 * @param {string} portfolioKey - Key of the portfolio to format
 * @returns {Object} Formatted portfolio data
 */
export function formatPortfolioForDisplay(analysis, portfolioKey) {
  if (!analysis) return null;
  
  const {
    portfolioWeightsObj,
    metrics,
    riskContributions,
    descriptions,
    assetIds,
  } = analysis;
  
  const weights = portfolioWeightsObj[portfolioKey];
  const portfolioMetrics = metrics[portfolioKey];
  const rc = riskContributions[portfolioKey];
  const desc = descriptions[portfolioKey];
  
  // Get top holdings (non-zero weights, sorted by weight)
  const holdings = assetIds
    .map((id, i) => ({
      id,
      weight: weights[id] || 0,
      riskContribution: rc[i],
    }))
    .filter(h => h.weight > 0.1) // > 0.1% weight
    .sort((a, b) => b.weight - a.weight);
  
  return {
    key: portfolioKey,
    ...desc,
    metrics: portfolioMetrics,
    weights,
    holdings,
    riskContributions: rc,
  };
}

export default usePortfolioAnalysis;
