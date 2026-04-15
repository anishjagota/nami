/**
 * Nami Build Portfolio Page
 *
 * Portfolio composition interface designed to feel like
 * designing/creating rather than filling out a form.
 *
 * Supports two modes:
 *   - New: fresh build from scratch or template
 *   - Edit: pre-populated from a saved portfolio (via ?edit=<id>)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  Sparkles,
  RotateCcw,
  Palette,
  Layers,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { PageWrapper } from '../components/Layout';
import AssetSelector from '../components/AssetSelector';
import WeightEditor from '../components/WeightEditor';
import LivePreview, { LivePreviewBar } from '../components/LivePreview';
import SavePortfolioModal from '../components/SavePortfolioModal';
import { usePortfolio, presetPortfolios } from '../context/PortfolioContext';
import { useWorkspace } from '../context/WorkspaceContext';

export default function BuildPortfolio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const {
    selectedAssets,
    weights,
    isValid,
    hasStarted,
    clearPortfolio,
    loadPreset,
    totalWeight,
  } = usePortfolio();
  const {
    saveNewPortfolio,
    updateSavedPortfolio,
    getPortfolio,
    editingPortfolioId,
    setEditingPortfolioId,
  } = useWorkspace();
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Determine if we're editing an existing portfolio
  const isEditing = !!editId;
  const editingPortfolio = isEditing ? getPortfolio(editId) : null;

  // Load the portfolio data when entering edit mode (once)
  const didLoadEdit = useRef(false);
  useEffect(() => {
    if (isEditing && editingPortfolio && !didLoadEdit.current) {
      didLoadEdit.current = true;
      loadPreset(editingPortfolio.holdings);
      setEditingPortfolioId(editId);
    }
    // Reset on unmount
    return () => {
      if (isEditing) {
        setEditingPortfolioId(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const canProceed = isValid && selectedAssets.length > 0;

  const handleSaveNew = (name) => {
    saveNewPortfolio({ name, holdings: weights });
  };

  const handleSaveEdit = (name) => {
    updateSavedPortfolio(editId, { name, holdings: weights });
    navigate(`/portfolio/${editId}`);
  };

  const handleCancel = () => {
    clearPortfolio();
    if (isEditing) {
      navigate(`/portfolio/${editId}`);
    } else {
      navigate('/');
    }
  };

  return (
    <PageWrapper noPadding>
      <div className="min-h-screen flex flex-col">
        {/* Compact header */}
        <div className="px-4 pt-4 pb-3 border-b border-nami-100 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isEditing && (
                <button
                  onClick={handleCancel}
                  className="text-nami-500 hover:text-nami-700 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <div>
                <h1 className="text-lg font-bold text-nami-800">
                  {isEditing ? 'Edit Portfolio' : 'Build Portfolio'}
                </h1>
                <p className="text-xs text-nami-500">
                  {isEditing
                    ? `Editing "${editingPortfolio?.name || 'Portfolio'}"`
                    : 'Build your investment mix'}
                </p>
              </div>
            </div>
            {hasStarted && (
              <div className="flex items-center gap-2">
                {canProceed && (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="text-xs text-nami-500 hover:text-teal-600 flex items-center gap-1
                               px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    <Save size={12} />
                    {isEditing ? 'Save Changes' : 'Save'}
                  </button>
                )}
                <button
                  onClick={isEditing ? handleCancel : clearPortfolio}
                  className="text-xs text-nami-500 hover:text-coral-600 flex items-center gap-1
                             px-2 py-1 rounded-lg hover:bg-coral-50 transition-colors"
                >
                  <RotateCcw size={12} />
                  {isEditing ? 'Cancel' : 'Reset'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 px-4 py-4">
          <div className="max-w-6xl mx-auto">
            {/* Quick start - only when empty and not editing */}
            {!hasStarted && !isEditing && (
              <div className="mb-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-coral-500" />
                  <span className="text-sm font-medium text-nami-700">Quick Start Templates</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(presetPortfolios).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => loadPreset(preset.weights)}
                      className="p-3 rounded-xl border border-nami-200 bg-white
                                 hover:border-coral-300 hover:shadow-sm
                                 transition-all duration-200 text-left group"
                    >
                      <div className="font-semibold text-sm text-nami-800 group-hover:text-coral-600 transition-colors">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-nami-500 mt-0.5 leading-tight">
                        {preset.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Two-column layout */}
            <div className="grid lg:grid-cols-[1fr,320px] gap-6">
              {/* Left: Build area */}
              <div className="space-y-5">
                {/* Asset selection */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-nami-100 flex items-center justify-center">
                      <Palette size={14} className="text-nami-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-nami-700">Select Assets</h2>
                    {selectedAssets.length > 0 && (
                      <span className="ml-auto text-xs text-nami-400">
                        {selectedAssets.length} selected
                      </span>
                    )}
                  </div>
                  <div className="card p-4">
                    <AssetSelector searchable />
                  </div>
                </section>

                {/* Weight allocation */}
                {selectedAssets.length > 0 && (
                  <section className="animate-slide-up">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-nami-100 flex items-center justify-center">
                        <Layers size={14} className="text-nami-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-nami-700">Allocate Weights</h2>
                      <span className={`ml-auto text-xs font-medium ${
                        isValid ? 'text-teal-600' : 'text-nami-500'
                      }`}>
                        {totalWeight.toFixed(0)}% / 100%
                      </span>
                    </div>
                    <div className="card p-4">
                      <WeightEditor />
                    </div>
                  </section>
                )}
              </div>

              {/* Right: Live preview (sticky on desktop) */}
              <div className="hidden lg:block">
                <div className="sticky top-20">
                  <div className="card p-5 bg-gradient-to-br from-white to-nami-50/50">
                    <div className="text-xs font-semibold text-nami-500 uppercase tracking-wider mb-4">
                      Live Preview
                    </div>
                    <LivePreview />

                    {/* CTA */}
                    {hasStarted && (
                      <div className="mt-5 pt-4 border-t border-nami-100 space-y-2">
                        {isEditing ? (
                          <button
                            onClick={() => setShowSaveModal(true)}
                            disabled={!canProceed}
                            className={`
                              w-full py-3 rounded-xl font-semibold text-sm
                              flex items-center justify-center gap-2
                              transition-all duration-200
                              ${canProceed
                                ? 'btn-coral shadow-lg shadow-coral-200/50'
                                : 'bg-nami-100 text-nami-400 cursor-not-allowed'
                              }
                            `}
                          >
                            <Save size={16} />
                            Save Changes
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate('/compare')}
                            disabled={!canProceed}
                            className={`
                              w-full py-3 rounded-xl font-semibold text-sm
                              flex items-center justify-center gap-2
                              transition-all duration-200
                              ${canProceed
                                ? 'btn-coral shadow-lg shadow-coral-200/50'
                                : 'bg-nami-100 text-nami-400 cursor-not-allowed'
                              }
                            `}
                          >
                            Compare Options
                            <ChevronRight size={16} />
                          </button>
                        )}
                        {!canProceed && totalWeight > 0 && (
                          <p className="text-[11px] text-nami-400 text-center mt-2">
                            Allocate exactly 100% to continue
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile bottom bar */}
        {hasStarted && (
          <div className="lg:hidden fixed bottom-16 left-0 right-0 px-4 pb-3 z-30">
            <div className="card p-3 shadow-lg border-nami-200 animate-slide-up">
              <div className="flex items-center gap-3">
                {/* Compact preview */}
                <div className="flex-1 min-w-0">
                  <LivePreviewBar />
                </div>

                {/* Continue/Save button */}
                {isEditing ? (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    disabled={!canProceed}
                    className={`
                      px-4 py-2.5 rounded-xl font-semibold text-sm
                      flex items-center gap-1.5 flex-shrink-0
                      transition-all duration-200
                      ${canProceed
                        ? 'btn-coral'
                        : 'bg-nami-200 text-nami-400 cursor-not-allowed'
                      }
                    `}
                  >
                    Save
                    <Save size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/compare')}
                    disabled={!canProceed}
                    className={`
                      px-4 py-2.5 rounded-xl font-semibold text-sm
                      flex items-center gap-1.5 flex-shrink-0
                      transition-all duration-200
                      ${canProceed
                        ? 'btn-coral'
                        : 'bg-nami-200 text-nami-400 cursor-not-allowed'
                      }
                    `}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spacer for mobile bottom bar */}
        {hasStarted && <div className="lg:hidden h-28" />}
      </div>

      {/* Save Modal */}
      <SavePortfolioModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={isEditing ? handleSaveEdit : handleSaveNew}
        defaultName={isEditing ? editingPortfolio?.name || '' : ''}
        saveLabel={isEditing ? 'Save Changes' : 'Save Portfolio'}
      />
    </PageWrapper>
  );
}
