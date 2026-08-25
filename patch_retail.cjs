const fs = require('fs');
let code = fs.readFileSync('src/components/RetailDashboard.tsx', 'utf8');

const target1 = `  const downloadCSV = () => {`;
const replacement1 = `  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (currentRole !== 'Owner' && currentRole !== 'Manager') {
      alert(\`🚫 Access Denied: Your active role is "\${currentRole}". Only Store Owners or Managers are authorized to import inventory.\`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split('\\n').filter(line => line.trim());
      if (lines.length < 2) {
        alert("Invalid CSV format or empty file.");
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const items = [];
      
      for (let i = 1; i < lines.length; i++) {
        // Simple CSV parse handling quotes roughly
        const rawLine = lines[i];
        let row = [];
        let inQuotes = false;
        let currentWord = '';
        for (let char of rawLine) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            row.push(currentWord);
            currentWord = '';
          } else {
            currentWord += char;
          }
        }
        row.push(currentWord);
        row = row.map(cell => cell.trim().replace(/^"|"$/g, ''));
        
        if (row.length < 5) continue;
        
        // Expected basic headers: sku, product name, category, m.r.p, cost, in stock, threshold
        items.push({
          sku: row[0],
          name: row[1],
          category: row[2],
          price: parseFloat(row[3]) || 0,
          cost: parseFloat(row[4]) || 0,
          initialQty: parseInt(row[5]) || 0,
          reorderPoint: parseInt(row[6]) || 5
        });
      }
      
      if (items.length === 0) {
        alert("No valid items found to import.");
        return;
      }
      
      try {
        const response = await fetch('/api/inventory/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        });
        if (!response.ok) throw new Error("Bulk import failed");
        
        MobileBridge.showToast(\`\${items.length} items imported successfully\`, 'short');
        fetch('/api/inventory').then(res => res.json()).then(data => {
          setProducts(data);
          setAllOriginalProducts(data);
        });
      } catch (err) {
        console.error(err);
        alert("Error importing CSV.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const downloadCSV = () => {`;

const target2 = `<button 
                             onClick={downloadCSV} 
                             className="flex items-center space-x-1.5 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                          </button>`;
const replacement2 = `<button 
                             onClick={downloadCSV} 
                             className="flex items-center space-x-1.5 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Export</span>
                          </button>
                          <label className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Import</span>
                            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                          </label>`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);
fs.writeFileSync('src/components/RetailDashboard.tsx', code);
