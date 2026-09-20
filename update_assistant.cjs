const fs = require('fs');
let content = fs.readFileSync('src/components/AIRetailAssistant.tsx', 'utf-8');

// Replace top imports
content = content.replace(
  "import { Send, Sparkles, User, Bot, AlertCircle, ShoppingBag, Store } from 'lucide-react';",
  "import { Send, Sparkles, User, Bot, AlertCircle, ShoppingBag, Store } from 'lucide-react';\nimport { Card, CardHeader, CardContent } from './ui/Card';\nimport { Button } from './ui/Button';\nimport { Input } from './ui/Input';\nimport { Badge } from './ui/Badge';"
);

// Wrapper replacements
content = content.replace(
  '<div className="glass-card rounded-3xl border border-slate-200/30 overflow-hidden h-full flex flex-col min-h-[480px]">',
  '<Card className="overflow-hidden h-full flex flex-col min-h-[480px] border-slate-200 shadow-sm">'
);

// End wrapper replacement
const lastDivIndex = content.lastIndexOf('</div>');
content = content.substring(0, lastDivIndex) + '</Card>' + content.substring(lastDivIndex + 6);

// Header replacements
content = content.replace(
  '<div className="bg-slate-50 border-b border-slate-200/30 p-6 flex items-center justify-between">',
  '<CardHeader className="bg-slate-50/50 border-b border-slate-200/50 flex flex-row items-center justify-between py-4">'
);
content = content.replace(
  '        </div>\n\n      {/* Messages */}',
  '        </div>\n      </CardHeader>\n\n      {/* Messages */}'
);

// Fix styling colors
content = content.replace(/bg-indigo-600 text-slate-900/g, 'bg-blue-600 text-white');
content = content.replace(/text-indigo-600/g, 'text-blue-600');
content = content.replace(/border-indigo-200/g, 'border-blue-200');
content = content.replace(/bg-indigo-600\/10/g, 'bg-blue-50');

fs.writeFileSync('src/components/AIRetailAssistant.tsx', content, 'utf-8');
