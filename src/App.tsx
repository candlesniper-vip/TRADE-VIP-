import { useState, useMemo } from 'react';
import { Chart, MarketAnalysis } from './components/Chart';
import { Toaster } from 'sonner';
import { CandlestickChart, Activity, RefreshCw } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [symbol, setSymbol] = useState<'BTCUSDT' | 'XAUUSD' | 'DXY' | 'GBPUSD' | 'GBPJPY' | 'USDJPY'>('BTCUSDT');
  const [interval, setInterval] = useState<string>('1m');
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);

  const [showAMD, setShowAMD] = useState(true);
  const [showSR, setShowSR] = useState(true);
  const [showVP, setShowVP] = useState(true);
  const [showInst, setShowInst] = useState(true);
  const [showOB, setShowOB] = useState(true);
  const [showFVG, setShowFVG] = useState(true);
  const [showAlpha, setShowAlpha] = useState(true);

  const [showGodTier, setShowGodTier] = useState(true);
  const [showSniper, setShowSniper] = useState(true);
  const [showMacro, setShowMacro] = useState(true);

  // GainzAlgo Alpha Alert Settings
  const [rsiLowerThreshold, setRsiLowerThreshold] = useState(45);
  const [rsiUpperThreshold, setRsiUpperThreshold] = useState(55);
  const [emaFastPeriod, setEmaFastPeriod] = useState(8);
  const [emaSlowPeriod, setEmaSlowPeriod] = useState(21);
  const [atrMultiplier, setAtrMultiplier] = useState(2.5);
  const [volumeSurgeMultiplier, setVolumeSurgeMultiplier] = useState(1.2);

  const algoConfig = useMemo(() => ({
    rsiLowerThreshold,
    rsiUpperThreshold,
    emaFastPeriod,
    emaSlowPeriod,
    atrMultiplier,
    volumeSurgeMultiplier
  }), [rsiLowerThreshold, rsiUpperThreshold, emaFastPeriod, emaSlowPeriod, atrMultiplier, volumeSurgeMultiplier]);

  const signalFilters = useMemo(() => ({ showGodTier, showSniper, showMacro }), [showGodTier, showSniper, showMacro]);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const startMs = startDate ? new Date(startDate).getTime() : undefined;
  const endMs = endDate ? new Date(endDate).getTime() + 86399999 : undefined;

  return (
    <div className="w-full h-screen overflow-auto bg-[#0A0A0A]">
      <div className="flex flex-col h-full min-w-[1280px] bg-[#0A0A0A] text-[#E0E0E0] font-sans overflow-hidden border-8 border-[#1A1A1A]">
        <Toaster position="top-right" theme="dark" />
        
        {/* Header Section */}
        <header className="h-16 border-b border-[#222] flex items-center justify-between px-8 bg-[#0D0D0D]">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-black tracking-tighter text-white">BX-STAR <span className="text-[#FFD700]">TRADING</span></h1>
            <nav className="flex space-x-1 bg-[#1A1A1A] p-1 text-xs rounded overflow-x-auto">
              {['XAUUSD', 'BTCUSDT', 'DXY', 'GBPUSD', 'GBPJPY', 'USDJPY'].map(sym => (
                 <button
                   key={sym}
                   onClick={() => setSymbol(sym as any)}
                   className={cn(
                     "px-4 py-1.5 font-bold transition-colors",
                     symbol === sym 
                       ? "bg-[#2A2A2A] text-white rounded shadow-lg" 
                       : "text-zinc-500 hover:text-zinc-300"
                   )}
                 >
                   {sym.replace('USDT', 'USD')}
                 </button>
              ))}
            </nav>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="bg-[#1A1A1A] text-white text-xs font-bold px-3 py-1.5 rounded outline-none border border-[#222] hover:border-[#333] transition-colors appearance-none cursor-pointer"
            >
              <option value="1m">1m</option>
              <option value="3m">3m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="30m">30m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1D</option>
              <option value="1w">1W</option>
            </select>
            <div className="flex items-center space-x-2 border-l border-[#222] pl-4">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Date Range</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#1A1A1A] text-zinc-300 text-[10px] uppercase font-bold px-2 py-1.5 rounded outline-none border border-[#222] focus:border-[#444] transition-colors"
                title="Start Date"
              />
              <span className="text-zinc-500 text-[10px]">-</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#1A1A1A] text-zinc-300 text-[10px] uppercase font-bold px-2 py-1.5 rounded outline-none border border-[#222] focus:border-[#444] transition-colors"
                title="End Date"
              />
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-[10px] text-zinc-500 hover:text-white px-2 py-1.5 rounded bg-[#1A1A1A] border border-[#222] hover:border-[#444] transition-colors font-bold uppercase tracking-wider"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-8 text-[10px] font-mono tracking-widest">
            <div className="flex flex-col items-end">
              <span className="text-zinc-500 uppercase">Network Latency</span>
              <span className="text-[#00C851]">0.42 ms / ULTRAFAST</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-zinc-500 uppercase">Market Status</span>
              <span className="text-[#00C851]">LIVE • OPEN</span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: Alerts & Legend */}
          <aside className="w-72 border-r border-[#222] flex flex-col bg-[#0D0D0D] shrink-0">
          <div className="p-6 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFD700] italic">Gainz Algo Analysis</h3>
              </div>
              <div className="space-y-4">
                 <div className="bg-[#1A1A1A] p-3 border-l-4 border-[#2962FF] rounded-r shadow-lg flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold font-mono tracking-widest text-[#2962FF] uppercase mb-1">Active Signal</p>
                    <p className="text-xs font-bold text-white break-words">{analysis?.activeSignal || 'Scanning...'}</p>
                  </div>
                  {analysis && (
                    <div className="text-right">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Entry Strength</p>
                      <p className="text-sm font-bold text-[#00E676]">{analysis?.entryStrengthPct}%</p>
                    </div>
                  )}
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2">
                     <div className="bg-[#1A1A1A] p-2 rounded border border-[#222]">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">15m Horizon</p>
                        <p className="text-[10px] text-zinc-300 font-medium leading-relaxed">{analysis?.prediction15m || '...'}</p>
                     </div>
                     <div className="bg-[#1A1A1A] p-2 rounded border border-[#222]">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">30m Horizon</p>
                        <p className="text-[10px] text-zinc-300 font-medium leading-relaxed">{analysis?.prediction30m || '...'}</p>
                     </div>
                     <div className="bg-[#1A1A1A] p-2 rounded border border-[#222]">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">1h Horizon</p>
                        <p className="text-[10px] text-zinc-300 font-medium leading-relaxed">{analysis?.prediction1h || '...'}</p>
                     </div>
                     <div className="bg-[#1A1A1A] p-2 rounded border border-[#222]">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">2h Horizon</p>
                        <p className="text-[10px] text-zinc-300 font-medium leading-relaxed">{analysis?.prediction2h || '...'}</p>
                     </div>
                     <div className="bg-[#1A1A1A] p-2 rounded border border-[#222] col-span-2">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">4h Horizon</p>
                        <p className="text-[10px] text-zinc-300 font-medium leading-relaxed">{analysis?.prediction4h || '...'}</p>
                     </div>
                 </div>

                 <div className="flex flex-col space-y-1">
                   <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Today's Macro Outlook</p>
                   <p className="text-xs text-zinc-300 font-medium leading-relaxed">{analysis?.predictionToday || 'Analyzing timeframe...'}</p>
                 </div>

                 <div className="flex flex-col space-y-1 bg-[#1A1A1A] border border-[#FFD700]/30 p-2 rounded mt-2">
                   <p className="text-[10px] text-[#FF1744] font-bold uppercase tracking-widest">God-Tier Sniper Entry Range</p>
                   <p className="text-xs text-[#00E676] font-bold font-mono px-1 py-1">{analysis?.sniperReturnLevel || '...'}</p>
                 </div>
              </div>
            </section>

            <section className="pt-4 border-t border-[#1A1A1A]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFD700] mb-4 italic">Signal Filters</h3>
              <div className="flex flex-col space-y-2">
                 <label className="flex items-center space-x-2 text-[10px] uppercase font-bold text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={showGodTier} onChange={e => setShowGodTier(e.target.checked)} className="accent-[#FFD700] w-3 h-3" />
                    <span>God Tier</span>
                 </label>
                 <label className="flex items-center space-x-2 text-[10px] uppercase font-bold text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={showSniper} onChange={e => setShowSniper(e.target.checked)} className="accent-[#00E676] w-3 h-3" />
                    <span>Flawless Sniper</span>
                 </label>
                 <label className="flex items-center space-x-2 text-[10px] uppercase font-bold text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={showMacro} onChange={e => setShowMacro(e.target.checked)} className="accent-[#2962FF] w-3 h-3" />
                    <span>God Level Macro</span>
                 </label>
              </div>
            </section>

            <section className="pt-4 border-t border-[#1A1A1A]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 italic">Zone Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00C851]"></div> Distribution</span>
                  <span className="text-zinc-600 font-bold">SELL</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#FF4444]"></div> Manipulation</span>
                  <span className="text-zinc-600 font-bold">TRAP</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#FFD700]"></div> Accumulation</span>
                  <span className="text-zinc-600 font-bold">BUY</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1A1A1A]">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-0 border-t-2 border-solid border-[#ec4899]"></div> 
                    <span className="text-[#ec4899]">Prev POC</span>
                  </span>
                  <span className="text-zinc-600 font-bold">VOL</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-0 border-t-2 border-dashed border-[#8b5cf6]"></div> 
                    <span className="text-[#8b5cf6]">Prev VA (High/Low)</span>
                  </span>
                  <span className="text-zinc-600 font-bold">VOL</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1A1A1A]">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-0 border-t-2 border-dashed border-[#2962FF]"></div> 
                    <span className="text-[#2962FF]">PREV DAY (High/Low)</span>
                  </span>
                  <span className="text-[#2962FF] font-bold">KEY LVL</span>
                </div>
              </div>
            </section>
            
            <section className="pt-4 border-t border-[#1A1A1A]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFD700] mb-4 italic">GainzAlgo Settings</h3>
              <div className="space-y-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex justify-between">
                    <span>RSI Lower Range</span>
                    <span className="text-[#00E676]">{rsiLowerThreshold}</span>
                  </label>
                  <input type="range" min="10" max="50" step="1" value={rsiLowerThreshold} onChange={(e) => setRsiLowerThreshold(Number(e.target.value))} className="accent-[#00E676] h-1 bg-[#222] rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex justify-between">
                    <span>RSI Upper Range</span>
                    <span className="text-[#FF1744]">{rsiUpperThreshold}</span>
                  </label>
                  <input type="range" min="50" max="90" step="1" value={rsiUpperThreshold} onChange={(e) => setRsiUpperThreshold(Number(e.target.value))} className="accent-[#FF1744] h-1 bg-[#222] rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex justify-between">
                    <span>ATR Multiplier</span>
                    <span className="text-[#FFD700]">{atrMultiplier.toFixed(1)}</span>
                  </label>
                  <input type="range" min="1" max="5" step="0.1" value={atrMultiplier} onChange={(e) => setAtrMultiplier(Number(e.target.value))} className="accent-[#FFD700] h-1 bg-[#222] rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex justify-between">
                    <span>Vol Surge</span>
                    <span className="text-zinc-300">{(volumeSurgeMultiplier * 100).toFixed(0)}%</span>
                  </label>
                  <input type="range" min="1" max="3" step="0.1" value={volumeSurgeMultiplier} onChange={(e) => setVolumeSurgeMultiplier(Number(e.target.value))} className="accent-zinc-500 h-1 bg-[#222] rounded-lg appearance-none cursor-pointer" />
                </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">EMA Fast</label>
                      <input type="number" min="1" max="200" value={emaFastPeriod} onChange={(e) => setEmaFastPeriod(Number(e.target.value))} className="bg-[#1A1A1A] border border-[#222] text-white text-xs px-2 py-1 rounded w-full outline-none focus:border-[#444]" />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">EMA Slow</label>
                      <input type="number" min="1" max="200" value={emaSlowPeriod} onChange={(e) => setEmaSlowPeriod(Number(e.target.value))} className="bg-[#1A1A1A] border border-[#222] text-white text-xs px-2 py-1 rounded w-full outline-none focus:border-[#444]" />
                    </div>
                 </div>
              </div>
            </section>
          </div>
          
          <div className="mt-auto p-6 bg-[#111] border-t border-[#222]">
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase">Live Socket</span>
                <span className="text-xs font-black text-[#00C851] flex items-center gap-2 mt-1">
                   <RefreshCw className="w-3 h-3 text-[#FFD700] animate-spin" /> Connected
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chart Area */}
        <main className="flex-1 flex flex-col bg-[#050505] relative w-full">
           <div className="flex-1 relative flex items-center justify-center p-4">
              <Chart 
                symbol={symbol} 
                interval={interval} 
                showAMD={showAMD} 
                showSR={showSR} 
                showVP={showVP} 
                showInst={showInst} 
                showOB={showOB} 
                showFVG={showFVG} 
                showAlpha={showAlpha} 
                startTime={startMs} 
                endTime={endMs} 
                algoConfig={algoConfig} 
                signalFilters={signalFilters}
                onAnalysisUpdate={setAnalysis} 
              />
           </div>

           {/* Controls Bar */}
           <div className="h-12 border-t border-[#222] bg-[#0A0A0A] flex flex-wrap items-center justify-center space-x-6 px-6 py-2 overflow-x-auto whitespace-nowrap">
              <label className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 cursor-pointer hover:text-white transition-colors">
                 <input type="checkbox" checked={showAMD} onChange={e => setShowAMD(e.target.checked)} className="accent-[#00C851] w-3 h-3" />
                 <span>AMD Zones</span>
              </label>
              <label className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 cursor-pointer hover:text-white transition-colors">
                 <input type="checkbox" checked={showSR} onChange={e => setShowSR(e.target.checked)} className="accent-[#FFD700] w-3 h-3" />
                 <span>Support/Resistance</span>
              </label>
              <label className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 cursor-pointer hover:text-white transition-colors">
                 <input type="checkbox" checked={showVP} onChange={e => setShowVP(e.target.checked)} className="accent-[#ec4899] w-3 h-3" />
                 <span>Volume Profile</span>
              </label>
              <label className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 cursor-pointer hover:text-white transition-colors">
                 <input type="checkbox" checked={showInst} onChange={e => setShowInst(e.target.checked)} className="accent-white w-3 h-3" />
                 <span>Prev Day Zones</span>
              </label>
              <label className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 cursor-pointer hover:text-white transition-colors">
                 <input type="checkbox" checked={showOB} onChange={e => setShowOB(e.target.checked)} className="accent-white w-3 h-3" />
                 <span>Order Blocks</span>
              </label>
              <label className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 cursor-pointer hover:text-white transition-colors">
                 <input type="checkbox" checked={showFVG} onChange={e => setShowFVG(e.target.checked)} className="accent-[#00C851] w-3 h-3" />
                 <span>FVG</span>
              </label>
              <label className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 cursor-pointer hover:text-white transition-colors">
                 <input type="checkbox" checked={showAlpha} onChange={e => setShowAlpha(e.target.checked)} className="accent-[#FFD700] w-3 h-3" />
                 <span>GainzAlgo Alpha</span>
              </label>
           </div>

           {/* Footer Tape */}
           <div className="h-12 border-t border-[#222] bg-[#0D0D0D] flex items-center">
              <div className="px-6 border-r border-[#222] h-full flex items-center text-[10px] font-bold text-[#FFD700] whitespace-nowrap">ORDER FLOW ACTIVE</div>
              <div className="flex-1 flex items-center space-x-12 px-6 overflow-hidden italic text-xs font-medium">
                <span className="text-zinc-500">EURUSD <span className="text-white">1.0842</span> <span className="text-[#00C851]">+0.02%</span></span>
                <span className="text-zinc-500">GBPUSD <span className="text-white">1.2655</span> <span className="text-[#FF4444]">-0.11%</span></span>
                <span className="text-zinc-500">USDJPY <span className="text-white">148.22</span> <span className="text-[#00C851]">+0.45%</span></span>
                <span className="text-zinc-500">ETHUSD <span className="text-white">2312.44</span> <span className="text-[#FF4444]">-2.10%</span></span>
              </div>
           </div>
        </main>
      </div>
    </div>
    </div>
  );
}
