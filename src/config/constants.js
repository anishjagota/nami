/**
 * Nami Configuration Constants
 * 
 * These values are configurable but not exposed in the V1 UI.
 * They can be made user-adjustable in future versions.
 */

// Risk-free rate for Sharpe ratio calculations (annual)
export const RISK_FREE_RATE = 0.03; // 3% annually

// Default simulation parameters
export const DEFAULT_HORIZON_YEARS = 10;
export const DEFAULT_INITIAL_CAPITAL = 100000;
export const DEFAULT_MONTHLY_CONTRIBUTION = 0;

// Monte Carlo parameters
export const MONTE_CARLO_SIMULATIONS = 10000;
export const MONTHS_PER_YEAR = 12;

// Backtest settings
export const REBALANCING_FREQUENCY = 'monthly'; // 'monthly' | 'quarterly' | 'annual' | 'none'

// Portfolio constraints
export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 100;
export const WEIGHT_SUM_TARGET = 100;

// Historical data settings
export const HISTORY_START_DATE = '2007-01';
export const HISTORY_END_DATE = '2024-12';

// UI labels for portfolio types
export const PORTFOLIO_LABELS = {
  user: 'Your Portfolio',
  benchmark: 'Benchmark',
  minVariance: 'Safer Version',
  riskParity: 'Balanced Version', 
  maxSharpe: 'Efficiency-Focused',
};

// Technical names (for methodology disclosures)
export const PORTFOLIO_TECHNICAL_NAMES = {
  user: 'Custom Portfolio',
  benchmark: '50/50 Stock-Bond Benchmark',
  minVariance: 'Minimum Variance Portfolio',
  riskParity: 'Risk Parity Portfolio',
  maxSharpe: 'Maximum Sharpe Ratio Portfolio',
};
