const fs = require('fs');
let code = fs.readFileSync('src/components/RetailDashboard.tsx', 'utf8');

// import SupplierManagement
code = code.replace("import { HardwareSimulators } from './HardwareSimulators';", "import { HardwareSimulators } from './HardwareSimulators';\nimport { SupplierManagement } from './SupplierManagement';");

// add button to tabs
const newTabBtn = `              <button
                onClick={() => setDashboardSection('suppliers')}
                className={\`px-4 py-2.5 text-xs font-black uppercase rounded-2xl border transition-all tracking-wider \${dashboardSection === 'suppliers' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/15' : 'bg-slate-950/80 text-slate-400 border-slate-900 hover:text-white'}\`}
              >
                {t("🚚 Suppliers & Vendors", "🚚 सप्लायर्स")}
              </button>
            </div>`;
code = code.replace("            </div>\n\n            {/* Sub-tab 1", newTabBtn + "\n\n            {/* Sub-tab 1");

// add the tab content
const newTabContent = `
            {/* Sub-tab: Suppliers */}
            {dashboardSection === 'suppliers' && (
              <SupplierManagement />
            )}

            {/* Sub-tab 1: SKUs, Scanners, & ONDC PO Builders */}`;
code = code.replace("            {/* Sub-tab 1: SKUs, Scanners, & ONDC PO Builders */}", newTabContent);

// Add to type
code = code.replace("const [dashboardSection, setDashboardSection] = useState<'inventory' | 'khata' | 'rbac' | 'reports' | 'settings'>('inventory');", "const [dashboardSection, setDashboardSection] = useState<'inventory' | 'khata' | 'rbac' | 'reports' | 'settings' | 'suppliers'>('inventory');");

fs.writeFileSync('src/components/RetailDashboard.tsx', code);
