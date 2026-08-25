const fs = require('fs');
let code = fs.readFileSync('src/components/RetailDashboard.tsx', 'utf8');

const targetTable = `<table className="w-full text-left border-collapse font-mono text-[10.5px]">`;
const replacementTable = `
                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3 mt-4">
                          {isLoading ? (
                            <div className="text-center py-6 text-slate-500 text-[10.5px] font-mono">Synthesizing catalog indexes...</div>
                          ) : products.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 text-[10.5px] font-mono">No products found matching active filter. Try resetting search above.</div>
                          ) : (
                            products.map((p) => {
                              const isLow = p.stockLevel <= p.reorderPoint;
                              return (
                                <div key={p.id} className={\`p-3 rounded-xl border \${isLow ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-900/50 border-slate-800'}\`}>
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <div className="font-bold text-slate-200 text-xs">{p.name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku} &bull; {p.category}</div>
                                    </div>
                                    {isLow && <span className="text-[9px] uppercase font-mono bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-black">LOW</span>}
                                  </div>
                                  <div className="flex justify-between items-end mt-3 text-[11px] font-mono">
                                    <div>
                                      <div className="text-slate-500">Cost: ₹{p.cost}</div>
                                      <div className="text-white font-bold">MRP: ₹{p.price}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-slate-500">Min: {p.reorderPoint}</div>
                                      <div className={\`font-black text-lg \${isLow ? 'text-rose-400' : 'text-emerald-400'}\`}>{p.stockLevel}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <table className="hidden md:table w-full text-left border-collapse font-mono text-[10.5px]">`;

code = code.replace(targetTable, replacementTable);
fs.writeFileSync('src/components/RetailDashboard.tsx', code);
