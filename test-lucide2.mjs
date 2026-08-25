import * as Lucide from 'lucide-react';
const icons = [
  'Download', 'Package', 'AlertTriangle', 'ShoppingBag', 'TrendingUp',
  'RotateCcw', 'Plus', 'Zap', 'BarChart2', 'Trash2', 'FileSpreadsheet',
  'AlertOctagon', 'CheckCircle2', 'Tag', 'DollarSign', 'Activity',
  'User', 'Sparkles', 'Shield', 'Wifi', 'WifiOff', 'Type', 'ChevronDown',
  'Sparkle', 'Box', 'ScanBarcode'
];
for (const icon of icons) {
  if (!Lucide[icon]) console.log('MISSING:', icon);
}
console.log('Done checking icons');
