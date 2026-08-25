const fs = require('fs');
let code = fs.readFileSync('src/components/RetailDashboard.tsx', 'utf8');

// Replace most text-slate-500 with text-slate-400 for better contrast on dark backgrounds
code = code.replace(/text-slate-500/g, 'text-slate-400');
// Optionally replace text-slate-600 with text-slate-500 if any exist
code = code.replace(/text-slate-600/g, 'text-slate-500');

fs.writeFileSync('src/components/RetailDashboard.tsx', code);
