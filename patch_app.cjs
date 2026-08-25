const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// import onboarding
if (!code.includes('OnboardingWalkthrough')) {
  code = code.replace("import { RetailDashboard } from './components/RetailDashboard';", "import { RetailDashboard } from './components/RetailDashboard';\nimport { OnboardingWalkthrough } from './components/OnboardingWalkthrough';");
  
  // place before RetailDashboard
  code = code.replace("<RetailDashboard />", "<OnboardingWalkthrough />\n      <RetailDashboard />");
}

fs.writeFileSync('src/App.tsx', code);
