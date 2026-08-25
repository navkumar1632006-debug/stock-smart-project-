import React, { useState, useEffect } from 'react';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';

export const OnboardingWalkthrough = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenWalkthrough');
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, []);

  const complete = () => {
    localStorage.setItem('hasSeenWalkthrough', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const steps = [
    {
      title: "Welcome to StockSmart AI",
      description: "Your complete retail management platform. Let's take a quick tour to help you get started.",
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-3" />
    },
    {
      title: "Smart Inventory",
      description: "Track stock, automatically identify low-stock items, and import existing catalogs via CSV effortlessly.",
      icon: <CheckCircle2 className="w-8 h-8 text-indigo-600 mb-3" />
    },
    {
      title: "Digital Khata",
      description: "Manage customer credit, track outstanding balances, and record payments digitally.",
      icon: <CheckCircle2 className="w-8 h-8 text-amber-600 mb-3" />
    },
    {
      title: "AI Forecast & Intelligence",
      description: "Use advanced AI to forecast demand, prevent stock-outs, and receive smart reordering recommendations.",
      icon: <CheckCircle2 className="w-8 h-8 text-blue-400 mb-3" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200/50 rounded-3xl p-6 md:p-8 max-w-sm w-full relative shadow-2xl">
        <button onClick={complete} className="absolute top-6 right-4 text-slate-500/90 hover:text-slate-900 transition">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center text-center">
          {steps[step].icon}
          <h2 className="text-xl font-medium text-slate-900 mb-2">{steps[step].title}</h2>
          <p className="text-slate-500/90 text-sm font-mono mb-8">{steps[step].description}</p>
          
          <div className="flex items-center justify-between w-full mt-4">
            <div className="flex space-x-1.5">
              {steps.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === step ? 'bg-indigo-500' : 'bg-slate-200'}`} />
              ))}
            </div>
            
            <button 
              onClick={() => {
                if (step < steps.length - 1) setStep(step + 1);
                else complete();
              }}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 px-4 py-2 rounded-2xl text-xs font-medium transition shadow-lg shadow-indigo-500/20"
            >
              <span>{step === steps.length - 1 ? 'Get Started' : 'Next'}</span>
              {step < steps.length - 1 && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
