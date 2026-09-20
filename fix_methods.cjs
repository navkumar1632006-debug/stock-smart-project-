const fs = require('fs');
let content = fs.readFileSync('src/components/RetailDashboard.tsx', 'utf-8');

const startDownload = content.indexOf('  const downloadCSV = () => {');
const endDownload = content.indexOf('  const handleAddProduct', startDownload);
if (startDownload !== -1 && endDownload !== -1) {
    content = content.substring(0, startDownload) + content.substring(endDownload);
}

const startAdd = content.indexOf('  const handleAddProduct = async (e: React.FormEvent) => {');
const endAdd = content.indexOf('  const handleEditClick', startAdd);
if (startAdd !== -1 && endAdd !== -1) {
    content = content.substring(0, startAdd) + content.substring(endAdd);
}

const startDelete = content.indexOf('  const handleDeleteProduct = async (id: string, name: string) => {');
const endDelete = content.indexOf('  const handleCheckout', startDelete);
if (startDelete !== -1 && endDelete !== -1) {
    content = content.substring(0, startDelete) + content.substring(endDelete);
}

fs.writeFileSync('src/components/RetailDashboard.tsx', content, 'utf-8');
