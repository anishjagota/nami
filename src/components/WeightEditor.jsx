/**
 * Nami Weight Editor Component
 * 
 * Visual weight allocation with inline controls.
 * Designed to feel like mixing colors/adjusting a composition.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Scale, GripVertical, Minus, Plus } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { getAssetById } from '../data/assetUniverse';
import { formatWeight } from '../utils/portfolio';

export default function WeightEditor() {
  const { 
    selectedAssets, 
    weights, 
    setWeight, 
    deselectAsset,
    totalWeight,
    isValid,
    normalizeWeights,
  } = usePortfolio();
  
  if (selectedAssets.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-nami-100 
                        flex items-center justify-center">
          <Scale size={24} className="text-nami-400" />
        </div>
        <p className="text-sm text-nami-500">Select assets above to allocate</p>
      </div>
    );
  }
  
  // Get selected assets with their data
  const assetsWithData = selectedAssets
    .map(id => ({ ...getAssetById(id), weight: weights[id] || 0 }))
    .filter(Boolean);
  
  return (
    <div className="space-y-2">
      {assetsWithData.map((asset, index) => (
        <WeightRow
          key={asset.id}
          asset={asset}
          weight={asset.weight}
          onWeightChange={(w) => setWeight(asset.id, w)}
          onRemove={() => deselectAsset(asset.id)}
          isLast={index === assetsWithData.length - 1}
        />
      ))}
      
      {/* Quick actions */}
      {selectedAssets.length > 0 && (
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-nami-100">
          <QuickWeightButtons />
          {totalWeight > 0 && !isValid && (
            <button
              onClick={normalizeWeights}
              className="text-xs font-medium text-coral-600 hover:text-coral-700 
                         px-2 py-1 rounded hover:bg-coral-50 transition-colors"
            >
              Normalize to 100%
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WeightRow({ asset, weight, onWeightChange, onRemove }) {
  const [inputValue, setInputValue] = useState(weight.toString());
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  
  // Sync input with external weight changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(weight.toFixed(0));
    }
  }, [weight, isFocused]);
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onWeightChange(numValue);
    }
  };
  
  const handleInputBlur = () => {
    setIsFocused(false);
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || numValue < 0) {
      setInputValue('0');
      onWeightChange(0);
    } else if (numValue > 100) {
      setInputValue('100');
      onWeightChange(100);
    } else {
      setInputValue(numValue.toFixed(0));
      onWeightChange(Math.round(numValue));
    }
  };
  
  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value);
    setInputValue(value.toFixed(0));
    onWeightChange(value);
  };
  
  const incrementWeight = (delta) => {
    const newWeight = Math.max(0, Math.min(100, weight + delta));
    onWeightChange(newWeight);
  };
  
  return (
    <div 
      className={`
        group relative flex items-center gap-3 p-3 rounded-xl
        bg-white border border-nami-100
        hover:border-nami-200 hover:shadow-sm
        transition-all duration-200
      `}
    >
      {/* Color bar indicator */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all"
        style={{ 
          backgroundColor: asset.color,
          opacity: weight > 0 ? 1 : 0.3,
        }}
      />
      
      {/* Asset info */}
      <div className="flex items-center gap-2 min-w-[80px]">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{ 
            backgroundColor: `${asset.color}15`,
            color: asset.color,
          }}
        >
          {asset.ticker}
        </div>
      </div>
      
      {/* Slider track with visual fill */}
      <div className="flex-1 relative h-8 flex items-center">
        {/* Background track */}
        <div className="absolute inset-x-0 h-2 bg-nami-100 rounded-full overflow-hidden">
          {/* Filled portion */}
          <div 
            className="h-full rounded-full transition-all duration-150"
            style={{ 
              width: `${weight}%`,
              backgroundColor: asset.color,
              opacity: 0.7,
            }}
          />
        </div>
        
        {/* Actual slider (invisible but functional) */}
        <input
          ref={sliderRef}
          type="range"
          min="0"
          max="100"
          step="1"
          value={weight}
          onChange={handleSliderChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer z-10"
        />
        
        {/* Custom thumb */}
        <div 
          className={`
            absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full
            bg-white border-2 shadow-md pointer-events-none
            transition-transform duration-150
            ${isDragging ? 'scale-125' : 'group-hover:scale-110'}
          `}
          style={{ 
            left: `calc(${weight}% - 10px)`,
            borderColor: asset.color,
          }}
        />
      </div>
      
      {/* Weight controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => incrementWeight(-5)}
          className="w-6 h-6 rounded-md flex items-center justify-center
                     text-nami-400 hover:text-nami-600 hover:bg-nami-100
                     transition-colors"
        >
          <Minus size={14} />
        </button>
        
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleInputBlur}
          className="w-12 px-1 py-1 text-center text-sm font-semibold
                     border border-nami-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-coral-300 focus:border-coral-400"
        />
        <span className="text-xs text-nami-400">%</span>
        
        <button
          onClick={() => incrementWeight(5)}
          className="w-6 h-6 rounded-md flex items-center justify-center
                     text-nami-400 hover:text-nami-600 hover:bg-nami-100
                     transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
      
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="w-7 h-7 rounded-lg flex items-center justify-center
                   text-nami-300 hover:text-coral-500 hover:bg-coral-50
                   transition-colors opacity-0 group-hover:opacity-100"
        title="Remove"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function QuickWeightButtons() {
  const { selectedAssets, setAllWeights } = usePortfolio();
  
  const applyEqualWeight = () => {
    const w = {};
    const each = Math.floor(100 / selectedAssets.length);
    const remainder = 100 - (each * selectedAssets.length);
    selectedAssets.forEach((id, i) => {
      w[id] = each + (i === 0 ? remainder : 0);
    });
    setAllWeights(w);
  };
  
  const clearWeights = () => {
    const w = {};
    selectedAssets.forEach(id => { w[id] = 0; });
    setAllWeights(w);
  };
  
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={applyEqualWeight}
        className="text-xs font-medium text-nami-500 hover:text-nami-700 
                   px-2 py-1 rounded hover:bg-nami-100 transition-colors"
      >
        Equal
      </button>
      <span className="text-nami-200">|</span>
      <button
        onClick={clearWeights}
        className="text-xs font-medium text-nami-500 hover:text-nami-700 
                   px-2 py-1 rounded hover:bg-nami-100 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}

// Compact weight summary for header
export function WeightSummaryCompact() {
  const { totalWeight, isValid, positionCount } = usePortfolio();
  
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-nami-500">{positionCount} assets</span>
      <span className={`font-semibold ${isValid ? 'text-teal-600' : 'text-nami-700'}`}>
        {totalWeight.toFixed(0)}%
      </span>
    </div>
  );
}
