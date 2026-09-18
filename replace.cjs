const fs = require('fs');

const filePath = 'c:\\project files\\project-try-1-main\\src\\components\\RetailDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const startMarker = '{/* Sub-tab 1: SKUs, Scanners, & ONDC PO Builders */}';
const endMarker = '{/* Sub-tab 2: Digital Khata Book & Loyalty Program */}';

const replacement = `{/* Sub-tab 1: SKUs, Scanners, & ONDC PO Builders */}
            {dashboardSection === 'inventory' && (
              <InventoryDashboard userRole={currentRole} />
            )}

            `;

if (content.includes(startMarker) && content.includes(endMarker)) {
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);
    
    content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
    
    const auditStart = '{/* Sub-tab 4: Audit & Real-time Webhooks */}';
    const auditEnd = '{/* Sub-tab 5: Store Settings & POS Management */}';
    
    if (content.includes(auditStart) && content.includes(auditEnd)) {
        const aStartIdx = content.indexOf(auditStart);
        const aEndIdx = content.indexOf(auditEnd);
        
        const auditReplacement = `{/* Sub-tab 4: Audit & Real-time Webhooks */}
            {dashboardSection === 'audit' && (
              <div className="glass-card p-6 rounded-3xl border border-slate-200/30 text-center">
                 <p className="text-sm font-mono text-slate-500">Stock movement audit logs have been integrated directly into the Inventory Dashboard.</p>
              </div>
            )}
            
            `;
        content = content.substring(0, aStartIdx) + auditReplacement + content.substring(aEndIdx);
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Success");
} else {
    console.log("Markers not found!");
}
