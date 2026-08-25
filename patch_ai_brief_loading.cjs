const fs = require('fs');
let code = fs.readFileSync('src/components/AIMorningBriefing.tsx', 'utf8');

const target = `        {isLoading ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-6 h-6 bg-indigo-500/10 border border-indigo-400 rounded-full border-t-transparent animate-spin mx-auto" />
            <p className="text-[10.5px] font-mono text-slate-500">Synthesizing inventory models and casting forecasts...</p>
          </div>
        ) : errorMsg ? (`;

const replacement = `        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-4 animate-fade-in">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center animate-pulse relative z-10">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl animate-ping opacity-75"></div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-slate-200">Synthesizing AI Intelligence</p>
              <p className="text-[10px] font-mono text-slate-400">Analyzing inventory metrics, forecasting demands, and generating your morning brief...</p>
            </div>
            <div className="w-64 h-1.5 bg-slate-900 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full w-full origin-left animate-[shimmer_2s_infinite] scale-x-50"></div>
            </div>
          </div>
        ) : errorMsg ? (`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/AIMorningBriefing.tsx', code);
