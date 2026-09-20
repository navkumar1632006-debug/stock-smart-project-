const fs = require('fs');

let content = fs.readFileSync('src/components/RetailDashboard.tsx', 'utf-8');

// Remove state variables
content = content.replace(/  const \[newProd.*?\n/g, "");
content = content.replace(/  const \[formSuccess, setFormSuccess\].*?\n/g, "");
content = content.replace(/  const \[searchQuery, setSearchQuery\].*?\n/g, "");

// Remove handlers
content = content.replace(/  const downloadCSV = \(\) => \{[\s\S]*?  \};\n/g, "");
content = content.replace(/  const handleAddProduct = async \(e: React\.FormEvent\) => \{[\s\S]*?  \};\n/g, "");
content = content.replace(/  const handleDeleteProduct = async \(id: string, name: string\) => \{[\s\S]*?  \};\n/g, "");

// Modify handleEditClick
content = content.replace(/  const handleEditClick = \(p: Product\) => \{[\s\S]*?  \};\n/g, `  const handleEditClick = (p: Product) => {
    setEditProductId(p.id);
  };\n`);

// Replace Product Table
content = content.replace(/                    \{\/\* Inventory Table Card \*\/\}[\s\S]*?(?=                    \{\/\* Grid of Forms: Add Product \+ Simulate Sale \*\/\})/g, `                    {/* Inventory Table Card */}
                    <ProductTable onEditClick={handleEditClick} userRole={currentRole} />\n`);

// Replace Product Form
content = content.replace(/                      \{\/\* Form 1: Add Product \*\/\}[\s\S]*?(?=                      \{\/\* Form 2: POS Cart \*\/\})/g, `                      {/* Form 1: Add Product */}
                      <ProductForm editProduct={editProductObj} onCancelEdit={() => setEditProductId(null)} userRole={currentRole} />\n`);

// Add editProductObj
content = content.replace("  const [editProductId, setEditProductId] = useState<string | null>(null);", `  const [editProductId, setEditProductId] = useState<string | null>(null);
  const editProductObj = products.find(p => p.id === editProductId) || null;`);

// Add imports
content = content.replace("export const RetailDashboard: React.FC", `import { ProductForm } from './inventory/ProductForm';
import { ProductTable } from './inventory/ProductTable';

export const RetailDashboard: React.FC`);

fs.writeFileSync('src/components/RetailDashboard.tsx', content, 'utf-8');
