/**
 * Nami Backtest Hook
 * 
 * Computes historical backtests for all portfolios.
 * 
 * IMPORTANT: Optimizations (MinVar, RiskParity, MaxSharpe) run ONLY on 
 * the user's selected assets. Benchmark remains independent (50/50 SPY/AGG).
 * 
 * Supports async data loading for the expanded ETF universe.
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { getAllAssetIds, getCoreAssetIds } from '../data/assetUniverse';
import { getReturnsMatrix, getReturnsMatrixAsync, hasStaticData } from '../data/historicalReturns';
import { weightsToArray } from '../utils/portfolio';
import { 
  runBacktest, 
  getReturnsInRange,
  getPresetStartDate,
  dateRangePresets,
} from '../calc/backtest';
import {
  minimumVariance,
  riskParity,
  maximumSharpe,
  createBenchmark,
} from '../calc/optimizer';
import { covarianceMatrix, geometricMeanReturns } from '../calc/statistics';
import { RISK_FREE_RATE } from '../config/constants';

/**
 * Filter returns matrix to only include specified assets
 */
function filterReturnsMatrix(returnsMatrix, fullAssetIds, selectedAssetIds) {
  const indices = selectedAssetIds.map(id => fullAssetIds.indexOf(id)).filter(i => i >= 0);
  return returnsMatrix.map(row => indices.map(i => row[i]));
}

/**
 * Map weights from subset back to full universe
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
 * Check if all assets have static data
 */
function allAssetsHaveStaticData(assetIds) {
  return assetIds.every(id => hasStaticData(id));
}

/**
 * Compute backtest results from data
 */
function computeBacktestResults(returns, dates, assetIds, selectedAssets, userWeightsObj) {
  // Filter returns to selected assets
  const filteredReturns = filterReturnsMatrix(returns, assetIds, selectedAssets);
  const filteredCovMatrix = covarianceMatrix(filteredReturns);
  const filteredExpReturns = geometricMeanReturns(filteredReturns);
  
  // Run optimizations
  const minVarFiltered = minimumVariance(filteredCovMatrix);
  const riskParityFiltered = riskParity(filteredCovMatrix);
  const maxSharpeFiltered = maximumSharpe(filteredCovMatrix, filteredExpReturns);
  
  const optimizedWeights = {
    benchmark: createBenchmark(assetIds),
    minVariance: mapWeightsToFullUniverse(minVarFiltered, selectedAssets, assetIds),
    riskParity: mapWeightsToFullUniverse(riskParityFiltered, selectedAssets, assetIds),
    maxSharpe: mapWeightsToFullUniverse(maxSharpeFiltered, selectedAssets, assetIds),
  };
  
  const userWeights = weightsToArray(userWeightsObj, assetIds);
  
  const allWeights = {
    user: userWeights,
    ...optimizedWeights,
  };
  
  const results = {
    dates: ['Start', ...dates],
  };
  
  for (const [name, weights] of Object.entries(allWeights)) {
    results[name] = runBacktest(weights, returns, dates, RISK_FREE_RATE);
  }
  
  return results;
}

/**
 * Hook for running backtests on all portfolios
 * @param {string} dateRange - Date range preset ('1Y', '3Y', '5Y', '10Y', 'MAX')
 * @returns {Object} Backtest results and controls
 */
export function useBacktest(initialRange = 'MAX') {
  const { weights: userWeightsObj, selectedAssets, isValid } = usePortfolio();
  
  const [dateRange, setDateRange] = useState(initialRange);
  const [selectedPortfolios, setSelectedPortfolios] = useState(['user', 'benchmark']);
  
  // Async loading state
  const [asyncData, setAsyncData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Determine needed assets
  const neededAssets = useMemo(() => {
    if (!isValid || selectedAssets.length === 0) return [];
    const needed = new Set(['SPY', 'AGG', ...selectedAssets]);
    return Array.from(needed);
  }, [selectedAssets, isValid]);
  
  // Check if we can use static data
  const canUseStaticData = useMemo(() => {
    return allAssetsHaveStaticData(neededAssets);
  }, [neededAssets]);
  
  // Sync data for static assets
  const syncData = useMemo(() => {
    if (!canUseStaticData || neededAssets.length === 0) return null;
    const { returns, dates } = getReturnsMatrix(neededAssets);
    return { returns, dates, assetIds: neededAssets };
  }, [neededAssets, canUseStaticData]);
  
  // Async data loading
  useEffect(() => {
    if (!isValid || selectedAssets.length === 0) {
      setAsyncData(null);
      setIsLoading(false);
      return;
    }
    
    if (canUseStaticData) {
      setIsLoading(false);
      return;
    }
    
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    
    (async () => {
      try {
        const result = await getReturnsMatrixAsync(neededAssets);
        
        if (cancelled) return;
        
        setAsyncData({
          returns: result.returns,
          dates: result.dates,
          assetIds: result.tickers,
        });
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [neededAssets, canUseStaticData, isValid, selectedAssets]);
  
  // Use sync or async data
  const fullData = syncData || asyncData;
  
  // Filter by date range
  const filteredData = useMemo(() => {
    if (!fullData) return null;
    
    const startDate = getPresetStartDate(dateRange, fullData.dates);
    const { returns, dates } = getReturnsInRange(
      fullData.returns, 
      fullData.dates, 
      startDate, 
      fullData.dates[fullData.dates.length - 1]
    );
    return { returns, dates };
  }, [fullData, dateRange]);
  
  // Run backtests
  const backtestResults = useMemo(() => {
    if (!isValid || selectedAssets.length === 0 || !filteredData || !fullData) {
      return null;
    }
    
    // Filter selected assets to those available in data
    const validSelected = selectedAssets.filter(id => fullData.assetIds.includes(id));
    if (validSelected.length === 0) return null;
    
    try {
      return computeBacktestResults(
        filteredData.returns,
        filteredData.dates,
        fullData.assetIds,
        validSelected,
        userWeightsObj
      );
    } catch (err) {
      console.error('Backtest computation failed:', err);
      return null;
    }
  }, [userWeightsObj, selectedAssets, isValid, filteredData, fullData]);
  
  // Available date ranges
  const availableRanges = useMemo(() => {
    if (!fullData) return [];
    const totalMonths = fullData.dates.length;
    return Object.entries(dateRangePresets)
      .filter(([key, config]) => config.months <= totalMonths || config.months === Infinity)
      .map(([key, config]) => ({ key, ...config }));
  }, [fullData?.dates.length]);
  
  // Toggle portfolio selection
  const togglePortfolio = useCallback((portfolioKey) => {
    setSelectedPortfolios(prev => {
      if (prev.includes(portfolioKey)) {
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== portfolioKey);
      }
      return [...prev, portfolioKey];
    });
  }, []);
  
  return {
    results: backtestResults,
    isReady: backtestResults !== null,
    isLoading,
    error,
    dateRange,
    setDateRange,
    availableRanges,
    selectedPortfolios,
    setSelectedPortfolios,
    togglePortfolio,
    startDate: filteredData?.dates[0] || null,
    endDate: filteredData?.dates[filteredData?.dates.length - 1] || null,
    totalMonths: filteredData?.dates.length || 0,
  };
}

/**
 * Get summary comparison between portfolios
 */
export function getBacktestComparison(results, portfolioKeys) {
  if (!results) return null;
  
  const comparison = portfolioKeys.map(key => {
    const data = results[key];
    if (!data) return null;
    
    return {
      key,
      finalValue: data.wealth[data.wealth.length - 1],
      totalReturn: data.metrics.totalReturn,
      annualizedReturn: data.metrics.annualizedReturn,
      volatility: data.metrics.annualizedVolatility,
      sharpe: data.metrics.sharpeRatio,
      maxDrawdown: data.metrics.maxDrawdown,
    };
  }).filter(Boolean);
  
  // Sort by final value
  comparison.sort((a, b) => b.finalValue - a.finalValue);
  
  return comparison;
}

export default useBacktest;
