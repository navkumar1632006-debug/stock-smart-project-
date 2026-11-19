import fs from 'fs';
const content = fs.readFileSync('mobile/ui_tabs.xml', 'utf8');
const regex = /<node[^>]*text="([^"]+)"[^>]*bounds="([^"]+)"/g;
let m;
while ((m = regex.exec(content)) !== null) {
  console.log(`${m[1]}: ${m[2]}`);
}

