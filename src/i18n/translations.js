/**
 * Nami Internationalization
 * 
 * Structure ready for Thai localization.
 * V1 uses English only.
 */

const translations = {
  en: {
    // Navigation
    nav: {
      build: 'Build',
      compare: 'Compare',
      history: 'History',
      future: 'Future',
    },
    
    // Build Portfolio page
    build: {
      title: 'Build Your Portfolio',
      subtitle: 'Select assets and assign weights to create your hypothetical portfolio',
      selectAssets: 'Select Assets',
      adjustWeights: 'Adjust Weights',
      portfolioSummary: 'Portfolio Summary',
      totalWeight: 'Total Weight',
      addAsset: 'Add to Portfolio',
      removeAsset: 'Remove',
      clearAll: 'Clear All',
      weightMustEqual100: 'Weights must equal 100%',
      readyToContinue: 'Ready to compare',
      continueToCompare: 'Continue to Compare',
    },
    
    // Asset categories
    assetCategories: {
      usEquity: 'US Equity',
      usBonds: 'US Bonds',
      intlEquity: 'International Equity',
      emergingMarkets: 'Emerging Markets',
      commodities: 'Commodities',
      realEstate: 'Real Estate',
    },
    
    // Compare page
    compare: {
      title: 'Compare Portfolio Options',
      subtitle: 'See how your portfolio stacks up against alternatives',
      yourPortfolio: 'Your Portfolio',
      benchmark: 'Benchmark',
      saferVersion: 'Safer Version',
      balancedVersion: 'Balanced Version',
      efficiencyFocused: 'Efficiency-Focused',
      expectedReturn: 'Expected Return',
      expectedVolatility: 'Expected Volatility',
      sharpeRatio: 'Sharpe Ratio',
      methodology: 'Methodology',
    },
    
    // History page
    history: {
      title: 'Historical Performance',
      subtitle: 'Explore how portfolios would have behaved in the past',
      growthOf: 'Growth of',
      selectPeriod: 'Select Period',
      totalReturn: 'Total Return',
      annualizedReturn: 'Annualized Return',
      maxDrawdown: 'Max Drawdown',
      disclaimer: 'Past performance does not guarantee future results.',
    },
    
    // Future simulation page
    future: {
      title: 'Future Simulation',
      subtitle: 'Explore possible future outcomes through Monte Carlo simulation',
      horizon: 'Time Horizon',
      years: 'years',
      initialCapital: 'Initial Capital',
      monthlyContribution: 'Monthly Contribution',
      runSimulation: 'Run Simulation',
      medianOutcome: 'Median Outcome',
      upside: 'Optimistic (75th)',
      downside: 'Conservative (25th)',
      worstCase: 'Worst Case (5th)',
      disclaimer: 'Simulations are illustrative and not predictive.',
    },
    
    // Common
    common: {
      loading: 'Loading...',
      comingSoon: 'Coming Soon',
      learnMore: 'Learn More',
      annual: 'annual',
      monthly: 'monthly',
    },
  },
  
  // Thai translations (placeholder for V2)
  th: {
    nav: {
      build: 'สร้าง',
      compare: 'เปรียบเทียบ',
      history: 'ประวัติ',
      future: 'อนาคต',
    },
    // ... rest of Thai translations to be added
  },
};

// Current locale
let currentLocale = 'en';

/**
 * Get translation for a key path
 * @param {string} path - Dot-separated path like 'nav.build'
 * @returns {string} - Translated string
 */
export function t(path) {
  const keys = path.split('.');
  let value = translations[currentLocale];
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      // Fallback to English
      value = translations.en;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return path; // Return path if not found
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : path;
}

/**
 * Set the current locale
 * @param {string} locale - 'en' or 'th'
 */
export function setLocale(locale) {
  if (translations[locale]) {
    currentLocale = locale;
  }
}

/**
 * Get current locale
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

export default translations;
