const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix tailwind classes that might not exist in the new variables
  content = content.replace(/bg-slate-950/g, 'bg-[var(--color-slate-950)]');
  content = content.replace(/bg-slate-900/g, 'bg-[var(--color-slate-900)]');
  content = content.replace(/bg-slate-800/g, 'bg-[var(--color-slate-800)]');
  content = content.replace(/bg-slate-700/g, 'bg-[var(--color-slate-700)]');
  content = content.replace(/bg-indigo-600/g, 'bg-[var(--color-indigo-600)]');
  content = content.replace(/bg-indigo-500/g, 'bg-[var(--color-indigo-500)]');
  content = content.replace(/bg-indigo-400/g, 'bg-[var(--color-indigo-400)]');
  content = content.replace(/bg-emerald-600/g, 'bg-[var(--color-emerald-600)]');
  content = content.replace(/bg-emerald-500/g, 'bg-[var(--color-emerald-500)]');
  
  content = content.replace(/text-slate-100/g, 'text-[var(--color-slate-100)]');
  content = content.replace(/text-slate-200/g, 'text-[var(--color-slate-200)]');
  content = content.replace(/text-slate-300/g, 'text-[var(--color-slate-300)]');
  content = content.replace(/text-slate-400/g, 'text-[var(--color-slate-400)]');
  content = content.replace(/text-slate-500/g, 'text-[var(--color-slate-500)]');
  
  content = content.replace(/border-slate-800/g, 'border-[var(--color-slate-800)]');
  content = content.replace(/border-slate-700/g, 'border-[var(--color-slate-700)]');
  content = content.replace(/border-slate-600/g, 'border-[var(--color-slate-600)]');

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
console.log("Tailwind vars applied!");
