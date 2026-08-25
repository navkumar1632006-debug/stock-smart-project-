const fs = require('fs');
let code = fs.readFileSync('src/components/AIMorningBriefing.tsx', 'utf8');

code = code.replace("animate-[shimmer_2s_infinite]", "animate-pulse");

fs.writeFileSync('src/components/AIMorningBriefing.tsx', code);
