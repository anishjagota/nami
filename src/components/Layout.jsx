/**
 * Nami Layout Component
 * 
 * Main app shell with header, navigation, and content area.
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import PrototypeBanner from './PrototypeBanner';

export default function Layout() {
  return (
    <div className="min-h-screen bg-nami-50 flex flex-col">
      {/* Prototype Banner */}
      <PrototypeBanner />

      {/* Header */}
      <header className="bg-white border-b border-nami-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-nami-700 to-coral-500 
                              flex items-center justify-center shadow-soft">
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 17c3-3 5-7 9-7s6 4 9 7" />
                  <path d="M3 12c3-3 5-5 9-5s6 2 9 5" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-nami-800 tracking-tight">Nami</h1>
                <p className="text-xs text-nami-500 -mt-0.5 hidden sm:block">Portfolio Lab</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <Navigation />
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-8">
        <Outlet />
      </main>
      
      {/* Mobile Navigation (fixed bottom) */}
      <div className="md:hidden">
        <Navigation />
      </div>
      
      {/* Footer - minimal for now */}
      <footer className="hidden md:block border-t border-nami-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <p className="text-xs text-nami-400 text-center">
            Nami is for educational purposes only. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Page wrapper with consistent spacing
export function PageWrapper({ children, className = '', noPadding = false }) {
  if (noPadding) {
    return (
      <div className={`animate-fade-in ${className}`}>
        {children}
      </div>
    );
  }
  
  return (
    <div className={`animate-fade-in max-w-5xl mx-auto px-4 py-6 ${className}`}>
      {children}
    </div>
  );
}

// Page header component
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-sm text-nami-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-nami-500 text-sm md:text-base max-w-xl">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

// Section component
export function Section({ title, description, children, className = '' }) {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-lg font-semibold text-nami-800">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-nami-500 mt-0.5">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
