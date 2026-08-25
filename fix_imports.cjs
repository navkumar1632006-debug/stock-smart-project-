const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Find all imports in the file
const importRegex = /^import\s+.*?;/gm;
let imports = [];
let match;
while ((match = importRegex.exec(code)) !== null) {
  imports.push(match[0]);
}

// But wait, multiline imports!
// A better regex for imports:
