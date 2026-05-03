import { useState } from 'react';
import { Chart } from './components/Chart';
import { Toaster } from 'sonner';
import { CandlestickChart, Activity, RefreshCw } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [symbol, setSymbol] = useState<'BTCUSDT' | 'XAUUSD'>('BTCUSDT');
  const [interval, setInterval] = useState<string>('1m');

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans overflow-hidden border-8 border-[#1A1A1A]">
      <Toaster position="top-right" theme="dark" />
      
      {/* Header Section */}
      <header className="h-16 border-b border-[#222] flex items-center justify-between px-8 bg-[#0D0D0D]">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-black tracking-tighter text-white">BX-STAR <span className="text-[#FFD700]">TRADING</span></h1>
          <nav className="flex space-x-1 bg-[#1A1A1A] p-1 rounded">
            <button
              onClick={() => setSymbol('XAUUSD')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold transition-colors",
                symbol === 'XAUUSD' 
                  ? "bg-[#2A2A2A] text-white rounded shadow-lg" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              XAUUSD
            </button>
            <button
              onClick={() => setSymbol('BTCUSDT')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold transition-colors",
                symbol === 'BTCUSDT' 
                  ? "bg-[#2A2A2A] text-white rounded shadow-lg" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              BTCUSD
            </button>
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
        </div>
        <div className="hidden md:flex items-center space-x-8 text-[10px] font-mono tracking-widest">
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

      <div className="flex flex-1">
        {/* Sidebar: Alerts & Legend */}
        <aside className="w-72 border-r border-[#222] flex flex-col bg-[#0D0D0D] hidden md:flex">
          <div className="p-6 space-y-8">
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 italic">Active Alerts</h3>
              <div className="space-y-3">
                <div className="bg-[#1A1A1A] p-3 border-l-4 border-[#FF4444] rounded-r">
                  <p className="text-xs font-bold">Manipulation Detected</p>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase">High Priority</p>
                </div>
                <div className="bg-[#1A1A1A] p-3 border-l-4 border-[#FFD700] rounded-r opacity-60">
                  <p className="text-xs font-bold">Accumulation Phase</p>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase">Standard</p>
                </div>
              </div>
            </section>

            <section>
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
              <Chart symbol={symbol} interval={interval} />
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
  );
}
