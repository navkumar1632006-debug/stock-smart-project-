const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace old border radiuses with larger ones (modern look)
  content = content.replace(/rounded-xl/g, 'rounded-2xl');
  content = content.replace(/rounded-lg/g, 'rounded-xl');
  content = content.replace(/rounded-md/g, 'rounded-xl');
  
  // Replace standard background cards with glass-panel
  content = content.replace(/bg-slate-900\/50/g, 'glass-panel');
  content = content.replace(/bg-slate-900\/60/g, 'glass-panel');
  content = content.replace(/bg-slate-900\/40/g, 'glass-panel');
  content = content.replace(/bg-slate-950\/40/g, 'glass-panel');
  content = content.replace(/bg-slate-950\/50/g, 'glass-panel');
  
  // Enhance borders to be more subtle
  content = content.replace(/border-slate-800/g, 'border-slate-800/50');
  content = content.replace(/border-slate-900/g, 'border-slate-800/30');
  
  // Increase spacing (8px system)
  content = content.replace(/p-4 /g, 'p-6 ');
  content = content.replace(/p-5 /g, 'p-6 ');
  content = content.replace(/space-y-4 /g, 'space-y-6 ');
  
  // Improve typography weights and colors
  content = content.replace(/font-bold/g, 'font-medium');
  content = content.replace(/font-black/g, 'font-semibold');
  content = content.replace(/text-slate-400/g, 'text-slate-400/90');
  
  fs.writeFileSync(filePath, content);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(componentsDir);
console.log("Redesign applied!");
