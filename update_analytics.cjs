const fs = require('fs');

let content = fs.readFileSync('src/components/SupplyChainAnalytics.tsx', 'utf-8');

// Fix dark theme grid and tooltips in Recharts
content = content.replace(/stroke="#1e293b"/g, 'stroke="#e2e8f0"');
content = content.replace(/backgroundColor: '#0f172a'/g, "backgroundColor: '#ffffff'");
content = content.replace(/borderColor: '#1e293b'/g, "borderColor: '#e2e8f0'");
content = content.replace(/color: '#fff'/g, "color: '#1e293b'");
content = content.replace(/color: '#e2e8f0'/g, "color: '#1e293b'");

// Remove fake AI / Gemini labels
content = content.replace('AI Supply Risk Assessment Panel', 'Supply Risk Assessment Panel');
content = content.replace('AI Supply Risk Assessment', 'Supply Risk Assessment');
content = content.replace(/<span className="bg-indigo-500\/10 text-indigo-600 border border-indigo-200 text-\[9px\] font-mono px-2 py-0\.5 rounded-full uppercase tracking-wider font-medium ml-2">[\s\S]*?Gemini Powered[\s\S]*?<\/span>/g,
  '<span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-medium ml-2">Algorithmic</span>');

// Replace Sparkles with TrendingUp or something else since it's not AI
content = content.replace(/<Sparkles className="w-5 h-5 text-indigo-600" \/>/g, '<TrendingUp className="w-5 h-5 text-emerald-600" />');

// "Analyzing inventory trends & stock-out probabilities..." is fine because it IS analyzing them (just deterministically).

fs.writeFileSync('src/components/SupplyChainAnalytics.tsx', content, 'utf-8');
