const fs = require('fs');
let content = fs.readFileSync('src/components/SalesForecastChart.tsx', 'utf-8');

// Replace wrapper with Card
content = content.replace(
  '<div className="glass-card p-6 rounded-3xl border border-slate-200/30 flex flex-col space-y-6">',
  '<div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm flex flex-col space-y-6">'
);

// Fix colors
content = content.replace(/bg-indigo-600 text-slate-900/g, 'bg-blue-600 text-white');
content = content.replace(/stroke="#1e293b"/g, 'stroke="#e2e8f0"');

// Fix AI wording
content = content.replace(
  '15-Day Historical Actuals vs. 7-Day Weighted Ensemble AI Forecast',
  '15-Day Historical Sales Actuals'
);
content = content.replace(
  'Demand Prediction & Sales Flow',
  'Sales Flow'
);
content = content.replace(
  '<Sparkles className="w-5 h-5 text-indigo-600" />',
  '<TrendingUp className="w-5 h-5 text-emerald-600" />'
);

fs.writeFileSync('src/components/SalesForecastChart.tsx', content, 'utf-8');
