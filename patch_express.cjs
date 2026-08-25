const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = "const app = express();";
const replacement = "const app = express();\napp.set('trust proxy', 1);\n";

code = code.replace(target, replacement);

fs.writeFileSync('server.ts', code);
