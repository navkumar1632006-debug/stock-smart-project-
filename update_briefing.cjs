const fs = require('fs');

let content = fs.readFileSync('src/components/AIMorningBriefing.tsx', 'utf-8');

// Replace dark card wrapper with light card wrapper
content = content.replace(
  'className="bg-gradient-to-br from-indigo-950/40 via-slate-900/40 to-slate-950 border-indigo-200 shadow-2xl relative overflow-hidden"',
  'className="bg-white border border-slate-200/50 shadow-sm relative overflow-hidden"'
);

// Replace dark loading gradient
content = content.replace(
  'className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full w-full origin-left animate-pulse scale-x-50"',
  'className="h-full bg-blue-600 rounded-full w-full origin-left animate-pulse scale-x-50"'
);

content = content.replace(
  'className="w-64 h-1.5 bg-white rounded-full overflow-hidden mt-2"',
  'className="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2"'
);

// Remove 'shadow-inner shadow-indigo-500/20' and similar dark glow elements
content = content.replace(/shadow-inner shadow-indigo-500\/20/g, "");

// Ensure text is readable
content = content.replace(/text-slate-900/g, "text-slate-800");

fs.writeFileSync('src/components/AIMorningBriefing.tsx', content, 'utf-8');
