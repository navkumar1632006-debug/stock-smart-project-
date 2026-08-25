const fs = require('fs');
let code = fs.readFileSync('src/components/RetailDashboard.tsx', 'utf8');

code = code.replace(/isBilingual \? "[^"]+" : "[^"]+"/g, "(language === 'hi' ? 'हिंदी' : 'English')");
code = code.replace(/isBilingual/g, "language !== 'en'");
code = code.replace(/setIsBilingual\(!isBilingual\)/g, "setLanguage(language === 'en' ? 'hi' : 'en')");

fs.writeFileSync('src/components/RetailDashboard.tsx', code);
