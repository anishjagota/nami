import React, { useState } from 'react';
import { X, FlaskConical } from 'lucide-react';

const DISMISSED_KEY = 'nami-banner-dismissed';

export default function PrototypeBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1'
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="bg-nami-700 text-white text-sm">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-start gap-3">
        <FlaskConical className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-80" />
        <p className="flex-1">
          <span className="font-semibold">Early Prototype</span>
          {' — '}
          Thanks for testing Nami! For the best experience, build portfolios using the
          core supported assets (SPY, AGG, VEA, VWO, GLD, VNQ, DBC).
          Broader live data and asset coverage is still being rolled out.
        </p>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-0.5 rounded hover:bg-white/20 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
