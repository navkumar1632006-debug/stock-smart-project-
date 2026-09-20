const fs = require('fs');

let content = fs.readFileSync('src/components/SmartReorderPO.tsx', 'utf-8');

// Fix duplicate classes
content = content.replace(
  'className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 space-y-4"',
  'className="bg-white shadow-sm border border-slate-200/50 rounded-3xl p-6 space-y-4"'
);

// Remove fake ONDC integration text
content = content.replace(
  '<span className="text-[9px] font-mono text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full font-medium">\n          ONDC Integrated\n        </span>',
  '<span className="text-[9px] font-mono text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">\n          Auto PO Draft\n        </span>'
);
content = content.replace(/bg-indigo-/g, 'bg-blue-');
content = content.replace(/text-indigo-/g, 'text-blue-');
content = content.replace(/border-indigo-/g, 'border-blue-');

fs.writeFileSync('src/components/SmartReorderPO.tsx', content, 'utf-8');
