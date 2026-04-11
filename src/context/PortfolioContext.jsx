/**
 * Nami Portfolio Context
 * 
 * Provides shared portfolio state across all pages.
 * Manages user's constructed portfolio and selected assets.
 */

import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { assetUniverse, getAllAssetIds } from '../data/assetUniverse';
import { 
  calculateTotalWeight, 
  isValidPortfolio, 
  normalizeWeights,
  createEmptyWeights,
  getActiveAssets,
} from '../utils/portfolio';

// Initial state
const initialState = {
  // Selected assets (array of asset IDs)
  selectedAssets: [],
  // Weights object: { assetId: weight (0-100) }
  weights: {},
  // Whether user has started building
  hasStarted: false,
};

// Action types
const ACTIONS = {
  SELECT_ASSET: 'SELECT_ASSET',
  DESELECT_ASSET: 'DESELECT_ASSET',
  SET_WEIGHT: 'SET_WEIGHT',
  SET_ALL_WEIGHTS: 'SET_ALL_WEIGHTS',
  NORMALIZE_WEIGHTS: 'NORMALIZE_WEIGHTS',
  CLEAR_PORTFOLIO: 'CLEAR_PORTFOLIO',
  LOAD_PRESET: 'LOAD_PRESET',
};

// Reducer
function portfolioReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SELECT_ASSET: {
      const { assetId } = action.payload;
      if (state.selectedAssets.includes(assetId)) {
        return state;
      }
      return {
        ...state,
        selectedAssets: [...state.selectedAssets, assetId],
        weights: { ...state.weights, [assetId]: 0 },
        hasStarted: true,
      };
    }
    
    case ACTIONS.DESELECT_ASSET: {
      const { assetId } = action.payload;
      const newSelected = state.selectedAssets.filter(id => id !== assetId);
      const newWeights = { ...state.weights };
      delete newWeights[assetId];
      return {
        ...state,
        selectedAssets: newSelected,
        weights: newWeights,
      };
    }
    
    case ACTIONS.SET_WEIGHT: {
      const { assetId, weight } = action.payload;
      return {
        ...state,
        weights: { ...state.weights, [assetId]: weight },
        hasStarted: true,
      };
    }
    
    case ACTIONS.SET_ALL_WEIGHTS: {
      const { weights } = action.payload;
      return {
        ...state,
        weights: { ...weights },
        selectedAssets: Object.keys(weights).filter(id => weights[id] > 0),
        hasStarted: true,
      };
    }
    
    case ACTIONS.NORMALIZE_WEIGHTS: {
      const normalized = normalizeWeights(state.weights);
      return {
        ...state,
        weights: normalized,
      };
    }
    
    case ACTIONS.CLEAR_PORTFOLIO: {
      return {
        ...initialState,
      };
    }
    
    case ACTIONS.LOAD_PRESET: {
      const { weights } = action.payload;
      return {
        selectedAssets: Object.keys(weights).filter(id => weights[id] > 0),
        weights: { ...weights },
        hasStarted: true,
      };
    }
    
    default:
      return state;
  }
}

// Context
const PortfolioContext = createContext(null);

// Provider component
export function PortfolioProvider({ children }) {
  const [state, dispatch] = useReducer(portfolioReducer, initialState);
  
  // Computed values
  const computed = useMemo(() => {
    const totalWeight = calculateTotalWeight(state.weights);
    const isValid = isValidPortfolio(state.weights);
    const activeAssets = getActiveAssets(state.weights);
    const remainingWeight = 100 - totalWeight;
    
    return {
      totalWeight,
      isValid,
      activeAssets,
      remainingWeight,
      assetCount: state.selectedAssets.length,
      positionCount: activeAssets.length,
    };
  }, [state.weights, state.selectedAssets]);
  
  // Action creators
  const actions = useMemo(() => ({
    selectAsset: (assetId) => {
      dispatch({ type: ACTIONS.SELECT_ASSET, payload: { assetId } });
    },
    
    deselectAsset: (assetId) => {
      dispatch({ type: ACTIONS.DESELECT_ASSET, payload: { assetId } });
    },
    
    setWeight: (assetId, weight) => {
      dispatch({ type: ACTIONS.SET_WEIGHT, payload: { assetId, weight } });
    },
    
    setAllWeights: (weights) => {
      dispatch({ type: ACTIONS.SET_ALL_WEIGHTS, payload: { weights } });
    },
    
    normalizeWeights: () => {
      dispatch({ type: ACTIONS.NORMALIZE_WEIGHTS });
    },
    
    clearPortfolio: () => {
      dispatch({ type: ACTIONS.CLEAR_PORTFOLIO });
    },
    
    loadPreset: (weights) => {
      dispatch({ type: ACTIONS.LOAD_PRESET, payload: { weights } });
    },
    
    // Toggle asset selection
    toggleAsset: (assetId) => {
      if (state.selectedAssets.includes(assetId)) {
        dispatch({ type: ACTIONS.DESELECT_ASSET, payload: { assetId } });
      } else {
        dispatch({ type: ACTIONS.SELECT_ASSET, payload: { assetId } });
      }
    },
  }), [state.selectedAssets]);
  
  const value = {
    ...state,
    ...computed,
    ...actions,
  };
  
  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

// Hook to use portfolio context
export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}

// Preset portfolios for quick start
export const presetPortfolios = {
  balanced: {
    name: 'Balanced',
    description: '60% stocks, 40% bonds',
    weights: {
      SPY: 40,
      VEA: 10,
      VWO: 10,
      AGG: 40,
    },
  },
  aggressive: {
    name: 'Growth',
    description: 'Heavy equity allocation',
    weights: {
      SPY: 50,
      VEA: 20,
      VWO: 20,
      GLD: 5,
      VNQ: 5,
    },
  },
  conservative: {
    name: 'Conservative',
    description: 'Bond-focused with some equity',
    weights: {
      SPY: 20,
      AGG: 60,
      GLD: 10,
      VNQ: 10,
    },
  },
  allWeather: {
    name: 'All Weather',
    description: 'Diversified across asset classes',
    weights: {
      SPY: 30,
      AGG: 25,
      VEA: 10,
      GLD: 15,
      VNQ: 10,
      DBC: 10,
    },
  },
};

export default PortfolioContext;
