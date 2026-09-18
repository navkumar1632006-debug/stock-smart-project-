import re

file_path = "c:\\project files\\project-try-1-main\\src\\components\\RetailDashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. We will replace the inventory block
start_marker = "{/* Sub-tab 1: SKUs, Scanners, & ONDC PO Builders */}"
end_marker = "{/* Sub-tab 2: Digital Khata Book & Loyalty Program */}"

replacement = """{/* Sub-tab 1: SKUs, Scanners, & ONDC PO Builders */}
            {dashboardSection === 'inventory' && (
              <InventoryDashboard userRole={currentRole} />
            )}

            """

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    new_content = content[:start_idx] + replacement + content[end_idx:]
    
    # 2. We also need to remove the audit logs section since it's now in InventoryDashboard
    audit_start = "{/* Sub-tab 4: Audit & Real-time Webhooks */}"
    audit_end = "{/* Sub-tab 5: Store Settings & POS Management */}"
    
    if audit_start in new_content and audit_end in new_content:
        a_start_idx = new_content.find(audit_start)
        a_end_idx = new_content.find(audit_end)
        
        # We replace the audit tab to just show a placeholder since we moved it
        audit_replacement = """{/* Sub-tab 4: Audit & Real-time Webhooks */}
            {dashboardSection === 'audit' && (
              <div className="glass-card p-6 rounded-3xl border border-slate-200/30 text-center">
                 <p className="text-sm font-mono text-slate-500">Stock movement audit logs have been integrated directly into the Inventory Dashboard.</p>
              </div>
            )}
            
            """
        new_content = new_content[:a_start_idx] + audit_replacement + new_content[a_end_idx:]
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Success")
else:
    print("Markers not found!")
