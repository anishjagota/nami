/**
 * Nami Asset Universe
 * 
 * Provides access to the curated ETF universe.
 * Maps ETF data to the asset format used throughout the app.
 */

import { 
  CURATED_ETFS, 
  ETF_CATEGORIES, 
  getCategorizedETFs,
  getCoreETFs,
  isCuratedETF,
} from './universe/etfUniverse';

// Color palette for categories
const CATEGORY_COLORS = {
  'us-equity-broad': '#3b82f6',    // blue
  'us-equity-size': '#6366f1',     // indigo
  'us-equity-style': '#8b5cf6',    // violet
  'us-equity-sector': '#a855f7',   // purple
  'intl-equity': '#d946ef',        // fuchsia
  'bond-government': '#10b981',    // emerald
  'bond-corporate': '#14b8a6',     // teal
  'bond-broad': '#06b6d4',         // cyan
  'real-estate': '#ec4899',        // pink
  'commodity': '#f59e0b',          // amber
};

// Asset color palette (for individual assets when needed)
const ASSET_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#eab308',
  '#ec4899', '#f97316', '#6366f1', '#14b8a6', '#ef4444',
  '#84cc16', '#22c55e', '#06b6d4', '#a855f7', '#d946ef',
];

/**
 * Convert ETF data to asset format
 */
function etfToAsset(ticker, colorIndex = 0) {
  const etf = CURATED_ETFS[ticker];
  if (!etf) return null;
  
  const category = ETF_CATEGORIES[etf.category];
  
  return {
    id: ticker,
    ticker: ticker,
    name: etf.name,
    shortName: etf.name.split(' ').slice(0, 2).join(' '), // First 2 words
    category: etf.category,
    categoryLabel: category?.label || etf.category,
    description: etf.description,
    color: CATEGORY_COLORS[etf.category] || ASSET_COLORS[colorIndex % ASSET_COLORS.length],
    inceptionDate: etf.inceptionDate,
  };
}

/**
 * Build the full asset universe array
 * Maintains backward compatibility with existing code
 */
function buildAssetUniverse() {
  const assets = [];
  let colorIndex = 0;
  
  for (const ticker of Object.keys(CURATED_ETFS)) {
    const asset = etfToAsset(ticker, colorIndex);
    if (asset) {
      assets.push(asset);
      colorIndex++;
    }
  }
  
  return assets;
}

// Build the asset universe once
export const assetUniverse = buildAssetUniverse();

/**
 * Get asset by ID/ticker
 */
export function getAssetById(id) {
  return assetUniverse.find(a => a.id === id);
}

/**
 * Get all asset IDs
 */
export function getAllAssetIds() {
  return assetUniverse.map(a => a.id);
}

/**
 * Get the core 7 ETFs (original set, used for prefetching)
 */
export function getCoreAssetIds() {
  return getCoreETFs();
}

/**
 * Get assets grouped by category
 */
export function getAssetsByCategory() {
  const grouped = {};
  
  for (const asset of assetUniverse) {
    if (!grouped[asset.category]) {
      const categoryMeta = ETF_CATEGORIES[asset.category];
      grouped[asset.category] = {
        label: categoryMeta?.label || asset.categoryLabel,
        labelTh: categoryMeta?.labelTh,
        description: categoryMeta?.description,
        order: categoryMeta?.order || 99,
        assets: [],
      };
    }
    grouped[asset.category].assets.push(asset);
  }
  
  return grouped;
}

/**
 * Get categorized assets in display order
 * Returns array of { key, label, labelTh, assets[] }
 */
export function getCategorizedAssets() {
  const categorized = getCategorizedETFs();
  
  return categorized.map(cat => ({
    key: cat.key,
    label: cat.label,
    labelTh: cat.labelTh,
    description: cat.description,
    assets: cat.etfs.map((etf, idx) => ({
      id: etf.ticker,
      ticker: etf.ticker,
      name: etf.name,
      shortName: etf.name.split(' ').slice(0, 2).join(' '),
      category: etf.category,
      categoryLabel: cat.label,
      description: etf.description,
      color: CATEGORY_COLORS[etf.category] || ASSET_COLORS[idx % ASSET_COLORS.length],
    })),
  }));
}

/**
 * Category order for display (derived from ETF_CATEGORIES)
 */
export const categoryOrder = Object.entries(ETF_CATEGORIES)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key]) => key);

/**
 * Check if a ticker is in the curated universe
 */
export function isInUniverse(ticker) {
  return isCuratedETF(ticker);
}

/**
 * Get category color
 */
export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || '#6b7280';
}

export default assetUniverse;
