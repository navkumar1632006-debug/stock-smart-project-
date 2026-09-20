import re

with open('src/components/RetailDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove state variables
content = re.sub(r"  const \[newProd.*?\n", "", content)
content = re.sub(r"  const \[formSuccess, setFormSuccess\].*?\n", "", content)
content = re.sub(r"  const \[searchQuery, setSearchQuery\].*?\n", "", content)

# Remove handlers
content = re.sub(r"  const downloadCSV = \(\) => \{[\s\S]*?  \};\n", "", content)
content = re.sub(r"  const handleAddProduct = async \(e: React\.FormEvent\) => \{[\s\S]*?  \};\n", "", content)
content = re.sub(r"  const handleDeleteProduct = async \(id: string, name: string\) => \{[\s\S]*?  \};\n", "", content)

# Modify handleEditClick
def edit_click_replacement(match):
    return """  const handleEditClick = (p: Product) => {
    setEditProductId(p.id);
  };
"""
content = re.sub(r"  const handleEditClick = \(p: Product\) => \{[\s\S]*?  \};\n", edit_click_replacement, content)

# Replace Product Table
table_pattern = r"                    \{/\* Inventory Table Card \*/\}[\s\S]*?(?=                    \{/\* Grid of Forms: Add Product \+ Simulate Sale \*/\})"
table_replacement = """                    {/* Inventory Table Card */}
                    <ProductTable onEditClick={handleEditClick} userRole={currentRole} />
"""
content = re.sub(table_pattern, table_replacement, content)

# Replace Product Form
form_pattern = r"                      \{/\* Form 1: Add Product \*/\}[\s\S]*?(?=                      \{/\* Form 2: POS Cart \*/\})"
form_replacement = """                      {/* Form 1: Add Product */}
                      <ProductForm editProduct={editProductObj} onCancelEdit={() => setEditProductId(null)} userRole={currentRole} />
"""
content = re.sub(form_pattern, form_replacement, content)

# Add editProductObj
edit_obj = """  const [editProductId, setEditProductId] = useState<string | null>(null);
  const editProductObj = products.find(p => p.id === editProductId) || null;"""
content = content.replace("  const [editProductId, setEditProductId] = useState<string | null>(null);", edit_obj)

# Add imports
imports = """import { ProductForm } from './inventory/ProductForm';
import { ProductTable } from './inventory/ProductTable';

export const RetailDashboard: React.FC"""
content = content.replace("export const RetailDashboard: React.FC", imports)

with open('src/components/RetailDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
