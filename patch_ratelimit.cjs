const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = "legacyHeaders: false,";
const replacement = "legacyHeaders: false,\n  validate: { xForwardedForHeader: false, default: true },";

code = code.replace(target, replacement);

fs.writeFileSync('server.ts', code);
