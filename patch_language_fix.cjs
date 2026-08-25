const fs = require('fs');
let code = fs.readFileSync('src/components/RetailDashboard.tsx', 'utf8');

// Fix broken replace
code = code.replace(/setIsBilingual\(!language !== 'en'\)/g, "setLanguage(language === 'en' ? 'hi' : 'en')");

// Fix the language dropdown display we attempted earlier
const oldLangBtn = `<button 
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className={\`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border transition text-xs font-black \${language !== 'en' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-indigo-400'}\`}
            >
              <span>🌐 {(language === 'hi' ? 'हिंदी' : 'English')}</span>
            </button>`;
const newLangBtn = `<div className="flex items-center space-x-1.5 px-2 py-1 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 font-mono">🌐</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent text-xs font-black text-indigo-400 focus:outline-none appearance-none pr-1"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>`;
code = code.replace(oldLangBtn, newLangBtn);

const oldLangBtn2 = `<button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="text-indigo-400 font-extrabold hover:underline text-[10px]"
            >
              {(language === 'hi' ? 'हिंदी' : 'English')}
            </button>`;
const newLangBtn2 = `<select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent text-[10px] font-extrabold text-indigo-400 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>`;
code = code.replace(oldLangBtn2, newLangBtn2);

// Fix the authentication labels that I broke
const authHeaderBroken = `{(language === 'hi' ? 'हिंदी' : 'English')}
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              {(language === 'hi' ? 'हिंदी' : 'English')}
            </p>`;
const authHeaderFixed = `{(language === 'hi' ? "सुरक्षित टर्मिनल लॉक" : "StockSmart Terminal Lock")}
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              {(language === 'hi' ? "प्रवेश करने के लिए 4-अंकीय पिन दर्ज करें (डिफ़ॉल्ट पिन: 1234)" : "Owner Authentication PIN required to view gross metrics. (Default: 1234)")}
            </p>`;
code = code.replace(authHeaderBroken, authHeaderFixed);

fs.writeFileSync('src/components/RetailDashboard.tsx', code);
