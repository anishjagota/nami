/**
 * Nami Asset Selector Component
 * 
 * Compact, visual asset selection with category grouping.
 * Supports the expanded ~50 ETF universe with collapsible categories.
 */

import React, { useState, useMemo } from 'react';
import { Check, Plus, Info, X, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { getCategorizedAssets, getAssetById, getCategoryColor } from '../data/assetUniverse';
import { usePortfolio } from '../context/PortfolioContext';

export default function AssetSelector({ compact = false, searchable = false }) {
  const { selectedAssets, toggleAsset } = usePortfolio();
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get categorized assets
  const categories = useMemo(() => getCategorizedAssets(), []);
  
  // Filter assets by search query (Phase 1B support)
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    
    const query = searchQuery.toLowerCase();
    return categories
      .map(cat => ({
        ...cat,
        assets: cat.assets.filter(asset => 
          asset.ticker.toLowerCase().includes(query) ||
          asset.name.toLowerCase().includes(query)
        ),
      }))
      .filter(cat => cat.assets.length > 0);
  }, [categories, searchQuery]);
  
  // Auto-expand categories with search results or selected assets
  const visibleExpandedCategories = useMemo(() => {
    if (searchQuery.trim()) {
      // When searching, show all matching categories expanded
      return new Set(filteredCategories.map(c => c.key));
    }
    // Default: show categories with selections, or first 3 if none selected
    const categoriesWithSelections = new Set(
      categories
        .filter(cat => cat.assets.some(a => selectedAssets.includes(a.id)))
        .map(c => c.key)
    );
    if (categoriesWithSelections.size > 0) {
      return new Set([...expandedCategories, ...categoriesWithSelections]);
    }
    // Default to first 3 categories expanded
    return new Set([...expandedCategories, ...categories.slice(0, 3).map(c => c.key)]);
  }, [expandedCategories, selectedAssets, categories, filteredCategories, searchQuery]);
  
  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };
  
  const selectedCount = selectedAssets.length;
  
  return (
    <div className="space-y-3">
      {/* Search input (Phase 1B) */}
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nami-400" />
          <input
            type="text"
            placeholder="Search ETFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-nami-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-nami-300 focus:border-transparent
                       placeholder:text-nami-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-nami-400 hover:text-nami-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      
      {/* Selection summary */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-nami-500">
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-nami-500 text-white flex items-center justify-center font-semibold">
              {selectedCount}
            </div>
            <span>selected</span>
          </div>
        </div>
      )}
      
      {/* Categories */}
      <div className="space-y-2">
        {filteredCategories.map(category => {
          const isExpanded = visibleExpandedCategories.has(category.key);
          const categorySelectedCount = category.assets.filter(a => 
            selectedAssets.includes(a.id)
          ).length;
          const categoryColor = getCategoryColor(category.key);
          
          return (
            <div key={category.key} className="border border-nami-100 rounded-xl overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.key)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-nami-50/50 
                           hover:bg-nami-50 transition-colors text-left"
              >
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: categoryColor }}
                />
                <span className="flex-1 text-sm font-medium text-nami-700">
                  {category.label}
                </span>
                {categorySelectedCount > 0 && (
                  <span 
                    className="px-1.5 py-0.5 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: categoryColor }}
                  >
                    {categorySelectedCount}
                  </span>
                )}
                <span className="text-xs text-nami-400">
                  {category.assets.length}
                </span>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-nami-400" />
                ) : (
                  <ChevronRight size={16} className="text-nami-400" />
                )}
              </button>
              
              {/* Category assets */}
              {isExpanded && (
                <div className="p-2 bg-white">
                  <div className="flex flex-wrap gap-1.5">
                    {category.assets.map(asset => (
                      <AssetChip
                        key={asset.id}
                        asset={asset}
                        isSelected={selectedAssets.includes(asset.id)}
                        onToggle={() => toggleAsset(asset.id)}
                        compact={compact}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* No results */}
      {searchQuery && filteredCategories.length === 0 && (
        <div className="text-center py-8 text-nami-400">
          <Search size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No ETFs matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}

function AssetChip({ asset, isSelected, onToggle, compact }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
          border transition-all duration-200 text-xs
          ${isSelected 
            ? 'border-transparent shadow-sm' 
            : 'border-nami-200 bg-white hover:border-nami-300 hover:shadow-sm'
          }
        `}
        style={isSelected ? { 
          backgroundColor: `${asset.color}15`,
          borderColor: asset.color,
        } : {}}
      >
        {/* Color dot */}
        <div 
          className={`w-2 h-2 rounded-full flex-shrink-0 transition-transform ${isSelected ? 'scale-110' : ''}`}
          style={{ backgroundColor: asset.color }}
        />
        
        {/* Ticker */}
        <span className={`font-semibold transition-colors ${
          isSelected ? 'text-nami-800' : 'text-nami-600 group-hover:text-nami-800'
        }`}>
          {asset.ticker}
        </span>
        
        {/* Selection indicator */}
        <div className={`
          w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0
          transition-all duration-200
          ${isSelected 
            ? 'bg-white' 
            : 'bg-nami-100 group-hover:bg-nami-200'
          }
        `}
          style={isSelected ? { color: asset.color } : {}}
        >
          {isSelected ? (
            <Check size={10} strokeWidth={3} />
          ) : (
            <Plus size={10} className="text-nami-400" />
          )}
        </div>
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52
                        bg-nami-800 text-white text-xs rounded-lg shadow-lg p-3
                        animate-fade-in pointer-events-none">
          <div className="font-semibold mb-1">{asset.name}</div>
          <div className="text-nami-300 text-[11px] leading-relaxed">{asset.description}</div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 
                          bg-nami-800 rotate-45" />
        </div>
      )}
    </div>
  );
}

// Selected assets summary bar
export function SelectedAssetsSummary() {
  const { selectedAssets, deselectAsset } = usePortfolio();
  
  if (selectedAssets.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {selectedAssets.map(id => {
        const asset = getAssetById(id);
        if (!asset) return null;
        
        return (
          <div
            key={id}
            className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${asset.color}15`,
              color: asset.color,
            }}
          >
            <span>{asset.ticker}</span>
            <button
              onClick={() => deselectAsset(id)}
              className="w-4 h-4 rounded-full flex items-center justify-center
                         hover:bg-white/50 transition-colors"
            >
              <X size={10} strokeWidth={3} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Compact horizontal version for mobile/condensed views
export function AssetSelectorCompact() {
  const { selectedAssets, toggleAsset } = usePortfolio();
  const categories = useMemo(() => getCategorizedAssets(), []);
  
  // Flatten to just show all assets
  const allAssets = useMemo(() => 
    categories.flatMap(cat => cat.assets),
    [categories]
  );
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {allAssets.map(asset => {
        const isSelected = selectedAssets.includes(asset.id);
        
        return (
          <button
            key={asset.id}
            onClick={() => toggleAsset(asset.id)}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-200
              ${isSelected 
                ? 'text-white shadow-sm' 
                : 'bg-nami-100 text-nami-600 hover:bg-nami-200'
              }
            `}
            style={isSelected ? { backgroundColor: asset.color } : {}}
          >
            {!isSelected && (
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: asset.color }}
              />
            )}
            <span>{asset.ticker}</span>
            {isSelected && <Check size={10} strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}

// Re-export for backward compatibility
export { AssetSelectorCompact as AssetSelectorInline };
