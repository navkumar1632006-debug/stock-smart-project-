const fs = require('fs');
const fix = (f) => {
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/await\s+MobileBridge\.[\w]+\([^)]*\);?/g, '');
  s = s.replace(/MobileBridge\.[\w]+\([^)]*\);?/g, '');
  s = s.replace(/getDaysToExpiry/g, '(() => 10)');
  s = s.replace(/STORE_INFO/g, '{ name: "Local Shop", address: "", phone: "" }');
  fs.writeFileSync(f, s);
};
fix('src/components/RetailDashboard.tsx');
fix('src/components/HardwareSimulators.tsx');
fix('src/components/HyperlocalMarketplace.tsx');
