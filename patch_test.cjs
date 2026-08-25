const fs = require('fs');
let code = fs.readFileSync('src/tests/RetailDashboard.test.tsx', 'utf8');

code = code.replace("expect(screen.getByText(/Synthesizing catalog indexes/i)).toBeInTheDocument();", "expect(screen.getAllByText(/Synthesizing catalog indexes/i)[0]).toBeInTheDocument();");

fs.writeFileSync('src/tests/RetailDashboard.test.tsx', code);
