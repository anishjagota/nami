/**
 * Save Portfolio Modal
 *
 * Simple modal for naming and saving a portfolio.
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Check } from 'lucide-react';

export default function SavePortfolioModal({ isOpen, onClose, onSave, defaultName = '' }) {
  const [name, setName] = useState(defaultName);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setSaved(false);
      setIsSaving(false);
      // Focus after a tick (modal animation)
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      await onSave(trimmed);
      setSaved(true);
      setTimeout(() => onClose(), 800);
    } catch (err) {
      console.error('Save failed:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-nami-100">
          <h3 className="font-semibold text-nami-800">Save Portfolio</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-nami-100 text-nami-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <label className="block text-sm text-nami-600 mb-2">
            Portfolio Name
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="e.g. My Retirement Mix"
            maxLength={40}
            className="input w-full"
            disabled={saved}
          />
          <p className="text-xs text-nami-400 mt-1.5">
            You can rename it later from the dashboard.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 pt-0">
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving || saved}
            className={`
              w-full py-2.5 rounded-xl font-medium text-sm
              flex items-center justify-center gap-2
              transition-all duration-200
              ${saved
                ? 'bg-teal-500 text-white'
                : 'btn-coral'
              }
              ${(!name.trim() || isSaving) && !saved
                ? 'opacity-50 cursor-not-allowed'
                : ''
              }
            `}
          >
            {saved ? (
              <>
                <Check size={16} />
                Saved
              </>
            ) : (
              <>
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Portfolio'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
