const fs = require('fs');
let content = fs.readFileSync('src/components/AIRetailAssistant.tsx', 'utf-8');

// The closing div of the header is right before {/* Messages */}
content = content.replace(
  '        </div>\n      </div>\n\n      {/* Messages */}',
  '        </div>\n      </CardHeader>\n\n      {/* Messages */}'
);

content = content.replace(
  /<\/div>\s*<\/div>\s*\{\/\* Messages \*\/\}/,
  '</div></CardHeader>{/* Messages */}'
);

fs.writeFileSync('src/components/AIRetailAssistant.tsx', content, 'utf-8');
