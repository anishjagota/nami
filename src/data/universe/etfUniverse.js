/**
 * Curated ETF Universe
 * 
 * A carefully selected set of ~50 ETFs covering major asset classes.
 * This is static metadata - no API call needed to display these.
 * 
 * Categories are designed to help users understand asset class diversification.
 */

/**
 * ETF category definitions with display labels and order
 */
export const ETF_CATEGORIES = {
  'us-equity-broad': {
    label: 'US Stocks — Broad Market',
    labelTh: 'หุ้นสหรัฐ — ตลาดรวม',
    description: 'Total US stock market exposure',
    order: 1,
  },
  'us-equity-size': {
    label: 'US Stocks — By Size',
    labelTh: 'หุ้นสหรัฐ — ตามขนาด',
    description: 'Large, mid, and small cap stocks',
    order: 2,
  },
  'us-equity-style': {
    label: 'US Stocks — Style',
    labelTh: 'หุ้นสหรัฐ — สไตล์',
    description: 'Growth, value, and factor strategies',
    order: 3,
  },
  'us-equity-sector': {
    label: 'US Stocks — Sectors',
    labelTh: 'หุ้นสหรัฐ — กลุ่มอุตสาหกรรม',
    description: 'Technology, healthcare, financials, etc.',
    order: 4,
  },
  'intl-equity': {
    label: 'International Stocks',
    labelTh: 'หุ้นต่างประเทศ',
    description: 'Developed and emerging markets outside US',
    order: 5,
  },
  'bond-government': {
    label: 'Government Bonds',
    labelTh: 'พันธบัตรรัฐบาล',
    description: 'US Treasury bonds of various maturities',
    order: 6,
  },
  'bond-corporate': {
    label: 'Corporate Bonds',
    labelTh: 'หุ้นกู้เอกชน',
    description: 'Investment grade and high yield corporate bonds',
    order: 7,
  },
  'bond-broad': {
    label: 'Broad Bond Market',
    labelTh: 'ตลาดพันธบัตรรวม',
    description: 'Diversified bond market exposure',
    order: 8,
  },
  'real-estate': {
    label: 'Real Estate',
    labelTh: 'อสังหาริมทรัพย์',
    description: 'Real estate investment trusts (REITs)',
    order: 9,
  },
  'commodity': {
    label: 'Commodities',
    labelTh: 'สินค้าโภคภัณฑ์',
    description: 'Gold, silver, oil, and broad commodities',
    order: 10,
  },
};

/**
 * Curated ETF list
 * 
 * Each ETF includes:
 * - name: Display name
 * - category: Category key from ETF_CATEGORIES
 * - description: Brief description for tooltips
 * - inceptionDate: Approximate inception (for data availability checking)
 */
export const CURATED_ETFS = {
  // ============================================
  // US Stocks — Broad Market
  // ============================================
  'SPY': {
    name: 'SPDR S&P 500',
    category: 'us-equity-broad',
    description: 'Tracks the S&P 500 index of large US companies',
    inceptionDate: '1993-01-22',
  },
  'VOO': {
    name: 'Vanguard S&P 500',
    category: 'us-equity-broad',
    description: 'Low-cost S&P 500 index fund',
    inceptionDate: '2010-09-07',
  },
  'VTI': {
    name: 'Vanguard Total Market',
    category: 'us-equity-broad',
    description: 'Entire US stock market — large, mid, small cap',
    inceptionDate: '2001-05-24',
  },
  'IVV': {
    name: 'iShares S&P 500',
    category: 'us-equity-broad',
    description: 'iShares version of S&P 500 index',
    inceptionDate: '2000-05-15',
  },

  // ============================================
  // US Stocks — By Size
  // ============================================
  'QQQ': {
    name: 'Invesco Nasdaq 100',
    category: 'us-equity-size',
    description: 'Top 100 non-financial Nasdaq stocks, tech-heavy',
    inceptionDate: '1999-03-10',
  },
  'IWM': {
    name: 'iShares Russell 2000',
    category: 'us-equity-size',
    description: 'Small-cap US stocks',
    inceptionDate: '2000-05-22',
  },
  'IJH': {
    name: 'iShares S&P MidCap 400',
    category: 'us-equity-size',
    description: 'Mid-cap US stocks',
    inceptionDate: '2000-05-22',
  },
  'IJR': {
    name: 'iShares S&P SmallCap 600',
    category: 'us-equity-size',
    description: 'Small-cap US stocks with quality screen',
    inceptionDate: '2000-05-22',
  },

  // ============================================
  // US Stocks — Style
  // ============================================
  'VTV': {
    name: 'Vanguard Value',
    category: 'us-equity-style',
    description: 'Large-cap value stocks',
    inceptionDate: '2004-01-26',
  },
  'VUG': {
    name: 'Vanguard Growth',
    category: 'us-equity-style',
    description: 'Large-cap growth stocks',
    inceptionDate: '2004-01-26',
  },
  'MTUM': {
    name: 'iShares Momentum',
    category: 'us-equity-style',
    description: 'Stocks with strong recent performance',
    inceptionDate: '2013-04-16',
  },
  'USMV': {
    name: 'iShares Min Volatility',
    category: 'us-equity-style',
    description: 'Lower volatility US stocks',
    inceptionDate: '2011-10-18',
  },

  // ============================================
  // US Stocks — Sectors
  // ============================================
  'XLK': {
    name: 'Technology Select',
    category: 'us-equity-sector',
    description: 'Technology sector — software, hardware, semiconductors',
    inceptionDate: '1998-12-16',
  },
  'XLF': {
    name: 'Financial Select',
    category: 'us-equity-sector',
    description: 'Financial sector — banks, insurance, asset managers',
    inceptionDate: '1998-12-16',
  },
  'XLV': {
    name: 'Healthcare Select',
    category: 'us-equity-sector',
    description: 'Healthcare sector — pharma, biotech, medical devices',
    inceptionDate: '1998-12-16',
  },
  'XLE': {
    name: 'Energy Select',
    category: 'us-equity-sector',
    description: 'Energy sector — oil, gas, energy equipment',
    inceptionDate: '1998-12-16',
  },
  'XLU': {
    name: 'Utilities Select',
    category: 'us-equity-sector',
    description: 'Utilities sector — electric, gas, water utilities',
    inceptionDate: '1998-12-16',
  },
  'XLI': {
    name: 'Industrial Select',
    category: 'us-equity-sector',
    description: 'Industrial sector — aerospace, machinery, transport',
    inceptionDate: '1998-12-16',
  },

  // ============================================
  // International Stocks
  // ============================================
  'VEA': {
    name: 'Vanguard Developed Markets',
    category: 'intl-equity',
    description: 'Developed markets outside US — Europe, Japan, Australia',
    inceptionDate: '2007-07-20',
  },
  'VWO': {
    name: 'Vanguard Emerging Markets',
    category: 'intl-equity',
    description: 'Emerging markets — China, India, Brazil, etc.',
    inceptionDate: '2005-03-04',
  },
  'IEFA': {
    name: 'iShares Core EAFE',
    category: 'intl-equity',
    description: 'Europe, Australasia, Far East developed markets',
    inceptionDate: '2012-10-18',
  },
  'EEM': {
    name: 'iShares Emerging Markets',
    category: 'intl-equity',
    description: 'Large and mid-cap emerging market stocks',
    inceptionDate: '2003-04-07',
  },
  'VXUS': {
    name: 'Vanguard Total International',
    category: 'intl-equity',
    description: 'All non-US stocks — developed and emerging',
    inceptionDate: '2011-01-26',
  },
  'EFA': {
    name: 'iShares EAFE',
    category: 'intl-equity',
    description: 'Classic EAFE index — developed non-US markets',
    inceptionDate: '2001-08-14',
  },

  // ============================================
  // Government Bonds
  // ============================================
  'SHY': {
    name: 'iShares 1-3 Year Treasury',
    category: 'bond-government',
    description: 'Short-term US Treasury bonds, low interest rate risk',
    inceptionDate: '2002-07-22',
  },
  'IEF': {
    name: 'iShares 7-10 Year Treasury',
    category: 'bond-government',
    description: 'Intermediate-term US Treasury bonds',
    inceptionDate: '2002-07-22',
  },
  'TLT': {
    name: 'iShares 20+ Year Treasury',
    category: 'bond-government',
    description: 'Long-term US Treasury bonds, high duration',
    inceptionDate: '2002-07-22',
  },
  'TIP': {
    name: 'iShares TIPS',
    category: 'bond-government',
    description: 'Treasury Inflation-Protected Securities',
    inceptionDate: '2003-12-04',
  },
  'GOVT': {
    name: 'iShares US Treasury',
    category: 'bond-government',
    description: 'Broad US Treasury bond exposure',
    inceptionDate: '2012-02-14',
  },
  'VGSH': {
    name: 'Vanguard Short-Term Treasury',
    category: 'bond-government',
    description: 'Vanguard short-term government bonds',
    inceptionDate: '2009-11-19',
  },

  // ============================================
  // Corporate Bonds
  // ============================================
  'LQD': {
    name: 'iShares Investment Grade Corp',
    category: 'bond-corporate',
    description: 'Investment grade corporate bonds',
    inceptionDate: '2002-07-22',
  },
  'HYG': {
    name: 'iShares High Yield Corp',
    category: 'bond-corporate',
    description: 'High yield (junk) corporate bonds',
    inceptionDate: '2007-04-04',
  },
  'VCIT': {
    name: 'Vanguard Intermediate Corp',
    category: 'bond-corporate',
    description: 'Intermediate-term corporate bonds',
    inceptionDate: '2009-11-19',
  },
  'VCSH': {
    name: 'Vanguard Short-Term Corp',
    category: 'bond-corporate',
    description: 'Short-term corporate bonds',
    inceptionDate: '2009-11-19',
  },

  // ============================================
  // Broad Bond Market
  // ============================================
  'AGG': {
    name: 'iShares US Aggregate Bond',
    category: 'bond-broad',
    description: 'Total US investment-grade bond market',
    inceptionDate: '2003-09-22',
  },
  'BND': {
    name: 'Vanguard Total Bond',
    category: 'bond-broad',
    description: 'Vanguard total US bond market',
    inceptionDate: '2007-04-03',
  },
  'BNDX': {
    name: 'Vanguard Total International Bond',
    category: 'bond-broad',
    description: 'International investment-grade bonds, hedged',
    inceptionDate: '2013-06-04',
  },

  // ============================================
  // Real Estate
  // ============================================
  'VNQ': {
    name: 'Vanguard Real Estate',
    category: 'real-estate',
    description: 'US real estate investment trusts (REITs)',
    inceptionDate: '2004-09-23',
  },
  'VNQI': {
    name: 'Vanguard Global ex-US Real Estate',
    category: 'real-estate',
    description: 'International real estate outside US',
    inceptionDate: '2010-11-01',
  },
  'IYR': {
    name: 'iShares US Real Estate',
    category: 'real-estate',
    description: 'iShares US REIT index',
    inceptionDate: '2000-06-12',
  },

  // ============================================
  // Commodities
  // ============================================
  'GLD': {
    name: 'SPDR Gold',
    category: 'commodity',
    description: 'Physical gold bullion',
    inceptionDate: '2004-11-18',
  },
  'IAU': {
    name: 'iShares Gold',
    category: 'commodity',
    description: 'Physical gold, lower expense ratio than GLD',
    inceptionDate: '2005-01-21',
  },
  'SLV': {
    name: 'iShares Silver',
    category: 'commodity',
    description: 'Physical silver bullion',
    inceptionDate: '2006-04-21',
  },
  'DBC': {
    name: 'Invesco DB Commodity',
    category: 'commodity',
    description: 'Broad commodity futures — energy, metals, agriculture',
    inceptionDate: '2006-02-03',
  },
  'GSG': {
    name: 'iShares S&P GSCI Commodity',
    category: 'commodity',
    description: 'S&P GSCI commodity index',
    inceptionDate: '2006-07-10',
  },
};

/**
 * Get all ETF tickers
 */
export function getAllETFTickers() {
  return Object.keys(CURATED_ETFS);
}

/**
 * Get ETF metadata by ticker
 */
export function getETFMetadata(ticker) {
  return CURATED_ETFS[ticker] || null;
}

/**
 * Get ETFs by category
 */
export function getETFsByCategory(categoryKey) {
  return Object.entries(CURATED_ETFS)
    .filter(([_, meta]) => meta.category === categoryKey)
    .map(([ticker, meta]) => ({ ticker, ...meta }));
}

/**
 * Get all categories with their ETFs
 */
export function getCategorizedETFs() {
  const result = [];
  
  // Sort categories by order
  const sortedCategories = Object.entries(ETF_CATEGORIES)
    .sort((a, b) => a[1].order - b[1].order);
  
  for (const [categoryKey, categoryMeta] of sortedCategories) {
    const etfs = getETFsByCategory(categoryKey);
    if (etfs.length > 0) {
      result.push({
        key: categoryKey,
        ...categoryMeta,
        etfs,
      });
    }
  }
  
  return result;
}

/**
 * Check if a ticker is in the curated universe
 */
export function isCuratedETF(ticker) {
  return ticker in CURATED_ETFS;
}

/**
 * Get the original 7 "core" ETFs that should be pre-fetched
 * These match the original static data set
 */
export function getCoreETFs() {
  return ['SPY', 'AGG', 'VEA', 'VWO', 'GLD', 'VNQ', 'DBC'];
}
