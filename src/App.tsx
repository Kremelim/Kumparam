/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Bills } from './pages/Bills';
import { BudgetPage } from './pages/BudgetPage';
import { Investments } from './pages/Investments';
import { AiScanner } from './pages/AiScanner';
import { Onboarding } from './pages/Onboarding';
import { Projection } from './pages/Projection';
import { RegularIncomes } from './pages/RegularIncomes';
import { Receipts } from './pages/Receipts';

const AppContent = () => {
  const { onboardingDone } = useFinance();

  if (!onboardingDone) {
    return <Onboarding />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="regular-incomes" element={<RegularIncomes />} />
          <Route path="bills" element={<Bills />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="investments" element={<Investments />} />
          <Route path="projection" element={<Projection />} />
          <Route path="scanner" element={<AiScanner />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <Toaster position="top-right" />
        <AppContent />
      </FinanceProvider>
    </AuthProvider>
  );
}
