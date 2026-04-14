/**
 * Nami Dashboard Page
 *
 * Home / workspace view showing saved portfolios.
 * Entry point for returning users.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Briefcase, ArrowRight } from 'lucide-react';
import { PageWrapper, PageHeader } from '../components/Layout';
import { useWorkspace } from '../context/WorkspaceContext';
import PortfolioCard from '../components/PortfolioCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    portfolios,
    removePortfolio,
    renamePortfolio,
  } = useWorkspace();

  const hasPortfolios = portfolios.length > 0;

  return (
    <PageWrapper>
      <PageHeader
        title="Dashboard"
        subtitle="Your saved portfolios"
        action={
          <button
            onClick={() => navigate('/build')}
            className="btn-coral text-sm"
          >
            <Plus size={16} />
            New Portfolio
          </button>
        }
      />

      {hasPortfolios ? (
        <div className="space-y-6">
          {/* Portfolio grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {portfolios.map(portfolio => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                onDelete={removePortfolio}
                onRename={renamePortfolio}
              />
            ))}
          </div>

          {/* Build another CTA */}
          <div className="text-center pt-2">
            <button
              onClick={() => navigate('/build')}
              className="text-sm text-nami-500 hover:text-coral-600 transition-colors
                         inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              Build another portfolio
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="card p-10 text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-nami-100
                          flex items-center justify-center">
            <Briefcase size={28} className="text-nami-400" />
          </div>
          <h3 className="text-lg font-semibold text-nami-800 mb-2">
            No saved portfolios yet
          </h3>
          <p className="text-sm text-nami-500 mb-6 max-w-xs mx-auto">
            Build your first portfolio, compare strategies, and save the ones you like.
          </p>
          <button
            onClick={() => navigate('/build')}
            className="btn-coral inline-flex items-center gap-2"
          >
            Build Your First Portfolio
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </PageWrapper>
  );
}
