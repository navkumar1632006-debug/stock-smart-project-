const fs = require('fs');
let code = fs.readFileSync('src/components/RetailDashboard.tsx', 'utf8');

const target = "{errorMessage && (";
const replacement = `{isOffline && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-amber-500/5 animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <WifiOff className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-400">You are operating in Offline Mode</h3>
                <p className="text-xs text-amber-400/80 font-mono mt-0.5">{syncQueueCount} transaction(s) pending sync to cloud ledger.</p>
              </div>
            </div>
            {syncQueueCount > 0 && (
              <button 
                onClick={() => {
                  setIsOffline(false);
                  setIsLoading(true);
                  setTimeout(() => {
                    setIsLoading(false);
                    setSyncQueueCount(0);
                    alert("All offline buffered logs have been pushed to PostgreSQL master ledger.");
                  }, 1500);
                }}
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sync Now</span>
              </button>
            )}
          </div>
        )}
        {errorMessage && (`

code = code.replace(target, replacement);

fs.writeFileSync('src/components/RetailDashboard.tsx', code);
