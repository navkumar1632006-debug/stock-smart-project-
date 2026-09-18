import React, { useState } from 'react';
import { RetailDashboard } from './components/RetailDashboard';
import { OnboardingWalkthrough } from './components/OnboardingWalkthrough';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ResetPassword } from './pages/ResetPassword';
import { useAuth } from './hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { isAuthenticated, isLoading, error } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // Handle global auth callback errors (like expired verification links)
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full text-center border border-rose-100">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Error</h2>
          <p className="text-slate-600 mb-6">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white rounded-xl py-2 font-medium hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />;
  }

  if (!isAuthenticated) {
    if (isLoginMode) {
      return <Login onNavigateSignup={() => setIsLoginMode(false)} />;
    } else {
      return <Signup onNavigateLogin={() => setIsLoginMode(true)} />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <OnboardingWalkthrough />
      <RetailDashboard />
    </div>
  );
}
