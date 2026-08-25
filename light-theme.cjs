const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');
const appFile = path.join(__dirname, 'src', 'App.tsx');
const indexHtml = path.join(__dirname, 'index.html');

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Backgrounds
  content = content.replace(/bg-slate-950\/40/g, 'bg-slate-50');
  content = content.replace(/bg-slate-950\/50/g, 'bg-slate-50');
  content = content.replace(/bg-slate-950/g, 'bg-slate-50');
  
  content = content.replace(/bg-slate-900\/50/g, 'bg-white');
  content = content.replace(/bg-slate-900\/60/g, 'bg-white');
  content = content.replace(/bg-slate-900\/40/g, 'bg-white');
  content = content.replace(/bg-slate-900/g, 'bg-white');
  
  content = content.replace(/bg-slate-800/g, 'bg-slate-100');
  content = content.replace(/bg-slate-700/g, 'bg-slate-200');

  // Text
  content = content.replace(/text-white/g, 'text-slate-900');
  content = content.replace(/text-slate-100/g, 'text-slate-900');
  content = content.replace(/text-slate-200/g, 'text-slate-800');
  content = content.replace(/text-slate-300/g, 'text-slate-700');
  content = content.replace(/text-slate-400\/90/g, 'text-slate-500');
  content = content.replace(/text-slate-400/g, 'text-slate-500');
  content = content.replace(/text-slate-500/g, 'text-slate-400');

  // Borders
  content = content.replace(/border-slate-800\/50/g, 'border-slate-200');
  content = content.replace(/border-slate-800\/30/g, 'border-slate-200');
  content = content.replace(/border-slate-800/g, 'border-slate-200');
  content = content.replace(/border-slate-900/g, 'border-slate-200');
  content = content.replace(/border-slate-700/g, 'border-slate-300');

  // Accents & Tints
  content = content.replace(/bg-indigo-950\/[0-9]+/g, 'bg-indigo-50');
  content = content.replace(/bg-indigo-950/g, 'bg-indigo-50');
  content = content.replace(/bg-emerald-950\/[0-9]+/g, 'bg-emerald-50');
  content = content.replace(/bg-emerald-950/g, 'bg-emerald-50');
  content = content.replace(/bg-rose-950\/[0-9]+/g, 'bg-rose-50');
  content = content.replace(/bg-rose-950/g, 'bg-rose-50');
  content = content.replace(/bg-amber-950\/[0-9]+/g, 'bg-amber-50');
  content = content.replace(/bg-amber-950/g, 'bg-amber-50');

  content = content.replace(/bg-indigo-500\/10/g, 'bg-indigo-50');
  content = content.replace(/bg-indigo-500\/20/g, 'bg-indigo-100');
  content = content.replace(/bg-emerald-500\/10/g, 'bg-emerald-50');
  content = content.replace(/bg-emerald-500\/20/g, 'bg-emerald-100');
  content = content.replace(/bg-rose-500\/10/g, 'bg-rose-50');
  content = content.replace(/bg-rose-500\/20/g, 'bg-rose-100');
  content = content.replace(/bg-amber-500\/10/g, 'bg-amber-50');
  content = content.replace(/bg-amber-500\/20/g, 'bg-amber-100');

  content = content.replace(/border-indigo-500\/[0-9]+/g, 'border-indigo-200');
  content = content.replace(/border-emerald-500\/[0-9]+/g, 'border-emerald-200');
  content = content.replace(/border-rose-500\/[0-9]+/g, 'border-rose-200');
  content = content.replace(/border-amber-500\/[0-9]+/g, 'border-amber-200');

  content = content.replace(/text-indigo-400/g, 'text-indigo-600');
  content = content.replace(/text-indigo-300/g, 'text-indigo-600');
  content = content.replace(/text-emerald-400/g, 'text-emerald-600');
  content = content.replace(/text-emerald-300/g, 'text-emerald-600');
  content = content.replace(/text-rose-400/g, 'text-rose-600');
  content = content.replace(/text-rose-300/g, 'text-rose-600');
  content = content.replace(/text-amber-400/g, 'text-amber-600');
  content = content.replace(/text-amber-300/g, 'text-amber-600');

  // Glass panel
  content = content.replace(/glass-panel/g, 'bg-white shadow-sm border border-slate-200 rounded-2xl');

  // Remove var() from previous run
  content = content.replace(/bg-\[var\(--color-slate-950\)]/g, 'bg-slate-50');
  content = content.replace(/bg-\[var\(--color-slate-900\)]/g, 'bg-white');
  content = content.replace(/bg-\[var\(--color-slate-800\)]/g, 'bg-slate-100');
  content = content.replace(/bg-\[var\(--color-slate-700\)]/g, 'bg-slate-200');
  content = content.replace(/bg-\[var\(--color-indigo-600\)]/g, 'bg-indigo-600');
  content = content.replace(/bg-\[var\(--color-indigo-500\)]/g, 'bg-indigo-500');
  content = content.replace(/bg-\[var\(--color-indigo-400\)]/g, 'bg-indigo-400');
  content = content.replace(/bg-\[var\(--color-emerald-600\)]/g, 'bg-emerald-600');
  content = content.replace(/bg-\[var\(--color-emerald-500\)]/g, 'bg-emerald-500');

  content = content.replace(/text-\[var\(--color-slate-100\)]/g, 'text-slate-900');
  content = content.replace(/text-\[var\(--color-slate-200\)]/g, 'text-slate-800');
  content = content.replace(/text-\[var\(--color-slate-300\)]/g, 'text-slate-700');
  content = content.replace(/text-\[var\(--color-slate-400\)]/g, 'text-slate-500');
  content = content.replace(/text-\[var\(--color-slate-500\)]/g, 'text-slate-400');

  content = content.replace(/border-\[var\(--color-slate-800\)]/g, 'border-slate-200');
  content = content.replace(/border-\[var\(--color-slate-700\)]/g, 'border-slate-300');
  content = content.replace(/border-\[var\(--color-slate-600\)]/g, 'border-slate-400');
  
  // Specific fix for font-black
  content = content.replace(/font-black/g, 'font-semibold');

  fs.writeFileSync(filePath, content);
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
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
processFile(appFile);

// Update index.html body
let html = fs.readFileSync(indexHtml, 'utf8');
html = html.replace(/bg-slate-950/g, 'bg-slate-50');
fs.writeFileSync(indexHtml, html);

console.log("Light theme applied!");
