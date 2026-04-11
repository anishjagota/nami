/**
 * Nami App
 * 
 * Main application component with routing.
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import BuildPortfolio from './pages/BuildPortfolio';
import CompareOptions from './pages/CompareOptions';
import HistoricalExplorer from './pages/HistoricalExplorer';
import FutureSimulation from './pages/FutureSimulation';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<BuildPortfolio />} />
        <Route path="compare" element={<CompareOptions />} />
        <Route path="history" element={<HistoricalExplorer />} />
        <Route path="future" element={<FutureSimulation />} />
      </Route>
    </Routes>
  );
}
