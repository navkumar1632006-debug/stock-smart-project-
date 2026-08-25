import * as Lucide from 'lucide-react';
const icons = [
  'Calendar', 'TrendingUp', 'Sparkles', 'AlertCircle', 'Info',
  'Layers', 'HelpCircle', 'CheckCircle2', 'ShieldAlert', 'ArrowUpRight',
  'TrendingDown'
];
for (const icon of icons) {
  if (!Lucide[icon]) console.log('MISSING:', icon);
}
console.log('Done checking icons 3');
