import React from 'react';
import { RetailDashboard } from './components/RetailDashboard';
import { OnboardingWalkthrough } from './components/OnboardingWalkthrough';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <OnboardingWalkthrough />
      <RetailDashboard />
    </div>
  );
}
