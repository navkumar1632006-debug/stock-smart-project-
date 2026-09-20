const fs = require('fs');

let content = fs.readFileSync('src/components/DemandForecastDashboard.tsx', 'utf-8');

// Replace dark mode section
content = content.replace(
  '<div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg">',
  '<div className="bg-indigo-50 border border-indigo-200 text-indigo-900 p-5 rounded-2xl shadow-sm">'
);
content = content.replace(
  '<p className="text-sm font-semibold leading-relaxed text-indigo-50 mb-4">',
  '<p className="text-sm font-semibold leading-relaxed text-indigo-800 mb-4">'
);
content = content.replace(
  '<span className="text-xl font-black text-indigo-400">',
  '<span className="text-xl font-black text-indigo-600">'
);
content = content.replace(
  '<h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2 flex items-center gap-1"><Zap className="w-4 h-4 text-amber-400" /> Action Required</h4>',
  '<h4 className="text-xs uppercase tracking-widest text-indigo-600 font-bold mb-2 flex items-center gap-1"><Zap className="w-4 h-4 text-amber-500" /> Action Required</h4>'
);

// Fix renderBadge to use proper primitives or just better colors
content = content.replace(
  "const renderBadge = (label: string, level: string) => {",
  `const renderBadge = (label: string, level: string) => {
    let bg = 'bg-slate-100 text-slate-700';
    if (level === 'CRITICAL') bg = 'bg-rose-100 text-rose-700 border-rose-200';
    if (level === 'HIGH') bg = 'bg-orange-100 text-orange-700 border-orange-200';
    if (level === 'MEDIUM') bg = 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (level === 'LOW') bg = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (level === 'NEUTRAL') bg = 'bg-slate-100 text-slate-600 border-slate-200';
    return <span className={\`text-[9px] font-bold px-2 py-0.5 rounded-full border \${bg}\`}>{label}</span>;
  }`
);
// Remove the old implementation of renderBadge
const renderBadgeStart = content.indexOf('const renderBadge = (label: string, level: string) => {');
const renderBadgeEnd = content.indexOf('  };', renderBadgeStart) + 4;

if (renderBadgeStart !== -1 && renderBadgeEnd !== -1) {
  content = content.substring(0, renderBadgeStart) + 
  `const renderBadge = (label: string, level: string) => {
    let bg = 'bg-slate-100 text-slate-700';
    if (level === 'CRITICAL') bg = 'bg-rose-100 text-rose-700 border-rose-200';
    if (level === 'HIGH') bg = 'bg-orange-100 text-orange-700 border-orange-200';
    if (level === 'MEDIUM') bg = 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (level === 'LOW') bg = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (level === 'NEUTRAL') bg = 'bg-slate-100 text-slate-600 border-slate-200';
    return <span className={\`text-[9px] font-bold px-2 py-0.5 rounded-full border \${bg}\`}>{label}</span>;
  };` + 
  content.substring(renderBadgeEnd);
}

// Convert "glass-card" to standard Tailwind light card classes
content = content.replace(/glass-card/g, 'bg-white shadow-sm');

fs.writeFileSync('src/components/DemandForecastDashboard.tsx', content, 'utf-8');
