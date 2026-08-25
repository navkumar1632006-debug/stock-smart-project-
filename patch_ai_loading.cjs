const fs = require('fs');
let code = fs.readFileSync('src/components/AIRetailAssistant.tsx', 'utf8');

const target = `        {isSending && (
          <div className="flex items-start space-x-2.5 max-w-[85%]">
            <div className="p-1.5 rounded-xl border bg-emerald-600/10 border-emerald-500/30 text-emerald-400 flex-shrink-0">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="rounded-2xl p-3.5 text-xs bg-slate-950 border border-slate-900 text-slate-400 rounded-tl-none font-mono flex items-center space-x-2">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="text-[10px]">Processing model tokens...</span>
            </div>
          </div>
        )}`;
const replacement = `        {isSending && (
          <div className="flex items-start space-x-2.5 max-w-[85%] animate-fade-in">
            <div className="p-1.5 rounded-xl border bg-indigo-600/10 border-indigo-500/30 text-indigo-400 flex-shrink-0 relative overflow-hidden">
              <Bot className="w-3.5 h-3.5 relative z-10" />
              <div className="absolute inset-0 bg-indigo-400/20 animate-ping rounded-xl"></div>
            </div>
            <div className="rounded-2xl p-4 text-xs bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 text-slate-400 rounded-tl-none font-mono flex flex-col space-y-2 shadow-lg shadow-indigo-500/5">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[10px] font-bold text-indigo-300">Synthesizing response...</span>
              </div>
              <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500/50 rounded-full animate-pulse w-full origin-left scale-x-50 transition-all duration-1000"></div>
              </div>
            </div>
          </div>
        )}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/AIRetailAssistant.tsx', code);
