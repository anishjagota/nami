/**
 * Nami Navigation Component
 * 
 * Tab-based navigation for the four main pages.
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Layers, 
  BarChart3, 
  History, 
  TrendingUp 
} from 'lucide-react';
import { t } from '../i18n/translations';

const navItems = [
  { 
    path: '/', 
    label: 'Build', 
    icon: Layers,
    description: 'Construct your portfolio'
  },
  { 
    path: '/compare', 
    label: 'Compare', 
    icon: BarChart3,
    description: 'Compare alternatives'
  },
  { 
    path: '/history', 
    label: 'History', 
    icon: History,
    description: 'Historical performance'
  },
  { 
    path: '/future', 
    label: 'Future', 
    icon: TrendingUp,
    description: 'Simulate outcomes'
  },
];

export default function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-nami-200 
                    md:relative md:bottom-auto md:border-t-0 md:border-b md:border-nami-100
                    z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-around md:justify-start md:gap-1">
          {navItems.map(({ path, label, icon: Icon, description }) => {
            const isActive = location.pathname === path;
            
            return (
              <NavLink
                key={path}
                to={path}
                className={`
                  flex flex-col md:flex-row items-center gap-1 md:gap-2
                  px-3 md:px-4 py-3 md:py-3
                  text-xs md:text-sm font-medium
                  transition-all duration-200
                  relative
                  ${isActive 
                    ? 'text-coral-600' 
                    : 'text-nami-500 hover:text-nami-700'
                  }
                `}
              >
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`
                    transition-transform duration-200
                    ${isActive ? 'scale-110' : ''}
                  `}
                />
                <span>{label}</span>
                
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute bottom-0 md:bottom-auto md:top-0 left-1/2 -translate-x-1/2
                                   w-8 h-0.5 bg-coral-500 rounded-full
                                   md:w-full md:h-0.5" />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// Compact navigation for step indicator
export function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {navItems.map((item, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;
        const Icon = item.icon;
        
        return (
          <React.Fragment key={item.path}>
            <div
              className={`
                flex items-center justify-center
                w-10 h-10 rounded-full
                transition-all duration-300
                ${isCurrent 
                  ? 'bg-coral-500 text-white shadow-lg shadow-coral-200' 
                  : isComplete
                    ? 'bg-teal-500 text-white'
                    : 'bg-nami-100 text-nami-400'
                }
              `}
            >
              <Icon size={18} />
            </div>
            
            {index < navItems.length - 1 && (
              <div 
                className={`
                  w-8 h-0.5 rounded-full
                  transition-all duration-300
                  ${index < currentStep ? 'bg-teal-500' : 'bg-nami-200'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
