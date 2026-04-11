/**
 * Nami Monte Carlo Hook
 * 
 * Manages Monte Carlo simulation state and execution.
 * 
 * Uses only the user's selected assets for simulation, which is more
 * efficient and semantically correct.
 * 
 * Supports async data loading for the expanded ETF universe.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { getAllAssetIds } from '../data/assetUniverse';
import { getReturnsMatrix, getReturnsMatrixAsync, hasStaticData } from '../data/historicalReturns';
import { covarianceMatrix, meanReturns } from '../calc/statistics';
import { 
  runMonteCarloSimulation,
  probabilityOfReachingTarget,
  probabilityOfLoss,
} from '../calc/monteCarlo';
import { 
  MONTE_CARLO_SIMULATIONS,
  DEFAULT_HORIZON_YEARS,
  DEFAULT_INITIAL_CAPITAL,
  DEFAULT_MONTHLY_CONTRIBUTION,
} from '../config/constants';

/**
 * Filter returns matrix to only include specified assets
 */
function filterReturnsMatrix(returnsMatrix, fullAssetIds, selectedAssetIds) {
  const indices = selectedAssetIds.map(id => fullAssetIds.indexOf(id)).filter(i => i >= 0);
  return returnsMatrix.map(row => indices.map(i => row[i]));
}

/**
 * Convert user weights to array for selected assets only
 */
function getSelectedWeights(userWeightsObj, selectedAssetIds) {
  return selectedAssetIds.map(id => (userWeightsObj[id] || 0) / 100);
}

/**
 * Check if all assets have static data
 */
function allAssetsHaveStaticData(assetIds) {
  return assetIds.every(id => hasStaticData(id));
}

/**
 * Hook for managing Monte Carlo simulation
 */
export function useMonteCarlo() {
  const { weights: userWeightsObj, selectedAssets, isValid } = usePortfolio();
  const assetIds = getAllAssetIds();
  
  // Simulation parameters
  const [horizonYears, setHorizonYears] = useState(DEFAULT_HORIZON_YEARS);
  const [initialWealth, setInitialWealth] = useState(DEFAULT_INITIAL_CAPITAL);
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULT_MONTHLY_CONTRIBUTION);
  const [numSimulations, setNumSimulations] = useState(MONTE_CARLO_SIMULATIONS);
  
  // Simulation state
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  
  // Data loading state
  const [asyncData, setAsyncData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Check if we can use static data
  const canUseStaticData = useMemo(() => {
    if (!selectedAssets || selectedAssets.length === 0) return false;
    return allAssetsHaveStaticData(selectedAssets);
  }, [selectedAssets]);
  
  // Sync historical data for static assets
  const syncHistoricalData = useMemo(() => {
    if (!selectedAssets || selectedAssets.length === 0 || !canUseStaticData) {
      return null;
    }
    
    const { returns: fullReturns } = getReturnsMatrix(selectedAssets);
    const covMatrix = covarianceMatrix(fullReturns);
    const means = meanReturns(fullReturns);
    
    return { covMatrix, means, assetIds: selectedAssets };
  }, [selectedAssets, canUseStaticData]);
  
  // Async data loading for non-static assets
  useEffect(() => {
    if (!selectedAssets || selectedAssets.length === 0) {
      setAsyncData(null);
      setIsLoadingData(false);
      return;
    }
    
    if (canUseStaticData) {
      setIsLoadingData(false);
      return;
    }
    
    let cancelled = false;
    setIsLoadingData(true);
    
    (async () => {
      try {
        const result = await getReturnsMatrixAsync(selectedAssets);
        
        if (cancelled) return;
        
        const covMatrix = covarianceMatrix(result.returns);
        const means = meanReturns(result.returns);
        
        setAsyncData({ covMatrix, means, assetIds: result.tickers });
        setIsLoadingData(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setIsLoadingData(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [selectedAssets, canUseStaticData]);
  
  // Use sync or async data
  const historicalData = syncHistoricalData || asyncData;
  
  // User weights as array (for selected assets only)
  const userWeights = useMemo(() => {
    if (!isValid || !historicalData || historicalData.assetIds.length === 0) return null;
    return getSelectedWeights(userWeightsObj, historicalData.assetIds);
  }, [userWeightsObj, historicalData, isValid]);
  
  // Run simulation
  const runSimulation = useCallback(() => {
    if (!userWeights || !historicalData) {
      setError('No valid portfolio');
      return;
    }
    
    setIsRunning(true);
    setError(null);
    
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        const simResults = runMonteCarloSimulation({
          weights: userWeights,
          assetMeans: historicalData.means,
          covMatrix: historicalData.covMatrix,
          horizonYears,
          initialWealth,
          monthlyContribution,
          numSimulations,
        });
        
        // Add probability calculations
        simResults.probabilities = {
          loss: probabilityOfLoss(simResults.sortedTerminal, simResults.summary.totalContributions),
          doubling: probabilityOfReachingTarget(simResults.sortedTerminal, initialWealth * 2),
          tripling: probabilityOfReachingTarget(simResults.sortedTerminal, initialWealth * 3),
        };
        
        setResults(simResults);
        setIsRunning(false);
      } catch (err) {
        setError(err.message);
        setIsRunning(false);
      }
    }, 50);
  }, [userWeights, historicalData, horizonYears, initialWealth, monthlyContribution, numSimulations]);
  
  // Reset simulation
  const resetSimulation = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);
  
  // Update parameter and clear results
  const updateHorizon = useCallback((years) => {
    setHorizonYears(years);
    setResults(null);
  }, []);
  
  const updateInitialWealth = useCallback((wealth) => {
    setInitialWealth(wealth);
    setResults(null);
  }, []);
  
  const updateMonthlyContribution = useCallback((contribution) => {
    setMonthlyContribution(contribution);
    setResults(null);
  }, []);
  
  return {
    // State
    results,
    isRunning,
    error,
    isReady: userWeights !== null && historicalData !== null,
    isLoadingData,
    
    // Parameters
    horizonYears,
    initialWealth,
    monthlyContribution,
    numSimulations,
    
    // Actions
    runSimulation,
    resetSimulation,
    updateHorizon,
    updateInitialWealth,
    updateMonthlyContribution,
    setNumSimulations,
  };
}

export default useMonteCarlo;
