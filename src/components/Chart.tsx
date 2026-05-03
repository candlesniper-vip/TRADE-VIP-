import { createChart, IChartApi, ISeriesApi, LineStyle, CandlestickSeries } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useBinanceChart } from '../hooks/useBinanceChart';
import { useVolumeProfile } from '../hooks/useVolumeProfile';
import { useMarketPatterns } from '../hooks/useMarketPatterns';
import { detectAMD, detectSR, Zone, SRLevel } from '../lib/amd-logic';

interface ChartProps {
  symbol: string;
  interval: string;
  showAMD: boolean;
  showSR: boolean;
  showVP: boolean;
  showInst: boolean;
  showOB: boolean;
  showFVG: boolean;
}

export function Chart({ symbol, interval, showAMD, showSR, showVP, showInst, showOB, showFVG }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { data, currentCandle, isLoading, error } = useBinanceChart(symbol, interval);
  const { vpData } = useVolumeProfile(symbol);
  const { fvgs, obs, instLevels } = useMarketPatterns(data, symbol);
  
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);
  const countdownLineRef = useRef<any>(null);

  const [zones, setZones] = useState<Zone[]>([]);
  const [srLevels, setSrLevels] = useState<SRLevel[]>([]);
  const lastAlertZone = useRef<string>('');

  const [countdown, setCountdown] = useState<string>('--:--');

  useEffect(() => {
    const timer = setInterval(() => {
      if (!currentCandle || !currentCandle.closeTime) return;
      const remains = currentCandle.closeTime - Date.now();
      if (remains <= 0) {
        setCountdown('00:00');
        return;
      }
      
      const s = Math.floor((remains / 1000) % 60);
      const m = Math.floor((remains / 1000 / 60) % 60);
      const h = Math.floor((remains / 1000 / 3600));

      if (h > 0) {
        setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      } else {
        setCountdown(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentCandle]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#050505' },
        textColor: '#E0E0E0',
      },
      grid: {
        vertLines: { color: '#151515' },
        horzLines: { color: '#151515' },
      },
      crosshair: {
        mode: 0,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });
    
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#00C851',
      downColor: '#FF4444',
      borderVisible: false,
      wickUpColor: '#00C851',
      wickDownColor: '#FF4444',
    });
    
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  const latestDataRef = useRef<any[]>([]);

  // Update data
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      // Create a unique array for the charting library requirements
      const uniqueData = Array.from(new Map(data.map(item => [item.time, item])).values()) as any[];
      seriesRef.current.setData(uniqueData);
      latestDataRef.current = uniqueData;
      
      // Initial zone detection based on history
      const detectedZones = detectAMD(uniqueData as any);
      setZones(detectedZones);
      
      const detectedSR = detectSR(uniqueData as any);
      setSrLevels(detectedSR);
    }
  }, [data]);

  // Handle current candle update and real-time AMD updates
  useEffect(() => {
    if (!seriesRef.current || !currentCandle) return;

    seriesRef.current.update(currentCandle as any);

    if (latestDataRef.current.length > 0) {
        const updatedData = [...latestDataRef.current];
        const lastIdx = updatedData.length - 1;
        if (updatedData[lastIdx].time === currentCandle.time) {
           updatedData[lastIdx] = currentCandle;
        } else if (currentCandle.time > updatedData[lastIdx].time) {
           updatedData.push(currentCandle);
        }
        
        if (updatedData.length > 1000) updatedData.shift();
        
        latestDataRef.current = updatedData;
        
        // Live zone re-calculation
        const detectedZones = detectAMD(updatedData as any);
        setZones(prev => JSON.stringify(prev) === JSON.stringify(detectedZones) ? prev : detectedZones);

        const detectedSR = detectSR(updatedData as any);
        setSrLevels(prev => JSON.stringify(prev) === JSON.stringify(detectedSR) ? prev : detectedSR);
    }
  }, [currentCandle]);

  // Render Price Lines for Zones AND Volume Profile AND Support/Resistance
  useEffect(() => {
    if (!seriesRef.current) return;

    // Clear old price lines
    priceLinesRef.current.forEach((line) => {
       try {
          seriesRef.current?.removePriceLine(line);
       } catch (e) {}
    });
    priceLinesRef.current = [];

    // Draw Support and Resistance Levels
    if (showSR && srLevels.length > 0) {
      srLevels.forEach(level => {
        const srLine = seriesRef.current!.createPriceLine({
          price: level.price,
          color: level.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: level.type,
        });
        priceLinesRef.current.push(srLine);
      });
    }

    // Draw AMD Zones
    if (showAMD && zones.length > 0) {
      zones.forEach(zone => {
        const bottomLine = seriesRef.current!.createPriceLine({
          price: zone.minPrice,
          color: zone.color,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `[${zone.type}] Min`,
        });
        
        const topLine = seriesRef.current!.createPriceLine({
          price: zone.maxPrice,
          color: zone.color,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `[${zone.type}] Max`,
        });

        priceLinesRef.current.push(bottomLine, topLine);
      });
    }

    // Draw Previous Day Volume Profile Patterns
    if (showVP && vpData) {
      const vahLine = seriesRef.current!.createPriceLine({
        price: vpData.vah,
        color: '#8b5cf6', // purple-500
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Prev VAH',
      });
      
      const pocLine = seriesRef.current!.createPriceLine({
        price: vpData.poc,
        color: '#ec4899', // pink-500
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'Prev POC',
      });

      const valLine = seriesRef.current!.createPriceLine({
        price: vpData.val,
        color: '#8b5cf6', // purple-500
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Prev VAL',
      });

      priceLinesRef.current.push(vahLine, pocLine, valLine);
    }

    // Draw Previous Day Institutional Zones
    if (showInst && instLevels) {
      if (instLevels.pdh) {
        priceLinesRef.current.push(seriesRef.current!.createPriceLine({
          price: instLevels.pdh,
          color: '#a1a1aa', // zinc-400
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'PDH',
        }));
      }
      if (instLevels.pdl) {
        priceLinesRef.current.push(seriesRef.current!.createPriceLine({
          price: instLevels.pdl,
          color: '#a1a1aa', // zinc-400
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'PDL',
        }));
      }
      if (instLevels.pdo) {
        priceLinesRef.current.push(seriesRef.current!.createPriceLine({
          price: instLevels.pdo,
          color: '#a1a1aa', // zinc-400
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'PDO',
        }));
      }
    }

    // Draw Order Blocks
    if (showOB && obs.length > 0) {
      obs.forEach(ob => {
        priceLinesRef.current.push(seriesRef.current!.createPriceLine({
          price: ob.top,
          color: '#ffffff', // white
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `OB Top`,
        }));
        priceLinesRef.current.push(seriesRef.current!.createPriceLine({
          price: ob.bottom,
          color: '#ffffff', // white
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `OB Bot`,
        }));
      });
    }
  }, [zones, vpData, srLevels, fvgs, obs, instLevels, showAMD, showSR, showVP, showInst, showOB, showFVG]);

  // FVG Overlay rendering using DOM
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    let animationFrameId: number;

    const updateOverlays = () => {
      if (seriesRef.current && chartRef.current && overlayContainerRef.current) {
        const timeScale = chartRef.current.timeScale();
        const paneWidth = timeScale.width();
        
        overlayContainerRef.current.style.width = `${paneWidth}px`;

        let html = '';
        if (showFVG && fvgs.length > 0) {
          fvgs.forEach(fvg => {
            const y1 = seriesRef.current.priceToCoordinate(fvg.top);
            const y2 = seriesRef.current.priceToCoordinate(fvg.bottom);
            if (y1 !== null && y2 !== null) {
              const top = Math.min(y1, y2);
              const height = Math.abs(y2 - y1);
              // solid green horizontal rectangle
              html += `<div style="position:absolute; top:${top}px; height:${height}px; left:0; width:100%; background-color:rgba(34, 197, 94, 0.2); border-top: 1px solid rgba(34, 197, 94, 0.8); border-bottom: 1px solid rgba(34, 197, 94, 0.8);"></div>`;
            }
          });
        }
        overlayContainerRef.current.innerHTML = html;
      }
      animationFrameId = requestAnimationFrame(updateOverlays);
    };

    animationFrameId = requestAnimationFrame(updateOverlays);
    return () => cancelAnimationFrame(animationFrameId);
  }, [fvgs, showFVG]);

  // Countdown Price Line
  useEffect(() => {
    if (!seriesRef.current || !currentCandle) return;

    if (!countdownLineRef.current) {
       try {
         countdownLineRef.current = seriesRef.current.createPriceLine({
           price: currentCandle.close,
           color: 'rgba(255, 215, 0, 0.5)',
           lineWidth: 1,
           lineStyle: LineStyle.Dotted,
           axisLabelVisible: true,
           title: countdown,
           axisLabelColor: '#FFD700',
           axisLabelTextColor: '#000000',
         } as any);
       } catch(e) {}
    } else {
       try {
         countdownLineRef.current.applyOptions({
           price: currentCandle.close,
           title: countdown,
         });
       } catch(e) {}
    }
  }, [countdown, currentCandle, interval]);

  // Alert logic
  useEffect(() => {
    if (!currentCandle || zones.length === 0) return;

    let matchedZone = 'None';
    const cPrice = currentCandle.close;
    
    for (const zone of zones) {
      if (cPrice >= zone.minPrice && cPrice <= zone.maxPrice) {
        matchedZone = zone.type;
        break;
      }
    }

    if (matchedZone !== 'None' && matchedZone !== lastAlertZone.current) {
       lastAlertZone.current = matchedZone;
       
       const colorMap: Record<string, string> = {
          'Accumulation': 'text-[#FFD700]',
          'Manipulation': 'text-[#FF4444]',
          'Distribution': 'text-[#00C851]',
       };

       toast(`Alert: Entered ${matchedZone} Zone`, {
          description: `${symbol} is trading at ${cPrice}`,
          className: colorMap[matchedZone] || 'text-white'
       });
    }
  }, [currentCandle, zones, symbol]);

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>;
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#050505]/80 text-zinc-400">
          Loading {symbol} data...
        </div>
      )}
      <div className="absolute top-4 left-4 z-20 flex gap-2 flex-wrap max-w-[80%]">
         {showAMD && zones.map((z, i) => (
             <div key={i} className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-[#1A1A1A] border border-[#222] flex items-center gap-2 opacity-80 backdrop-blur-md text-zinc-300 tracking-widest">
                <span className="w-2 h-2 rounded-full inline-block" style={{backgroundColor: z.color}}></span>
                {z.type.toUpperCase()}: {z.minPrice.toFixed(2)} - {z.maxPrice.toFixed(2)}
             </div>
         ))}
         {showVP && vpData && (
             <>
               <div className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-[#1A1A1A] border border-[#222] flex items-center gap-2 opacity-80 backdrop-blur-md text-[#ec4899] tracking-widest">
                  PREV POC: {vpData.poc.toFixed(2)}
               </div>
               <div className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-[#1A1A1A] border border-[#222] flex items-center gap-2 opacity-80 backdrop-blur-md text-[#8b5cf6] tracking-widest">
                  PREV VA: {vpData.val.toFixed(2)} - {vpData.vah.toFixed(2)}
               </div>
             </>
         )}
         {showInst && instLevels?.pdh && (
             <div className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-[#1A1A1A] border border-[#222] flex items-center gap-2 opacity-80 backdrop-blur-md text-zinc-400 tracking-widest">
                PREV DAY: {instLevels.pdl?.toFixed(2)} - {instLevels.pdh?.toFixed(2)}
             </div>
         )}
         {showOB && obs.length > 0 && (
             <div className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-[#1A1A1A] border border-[#222] flex items-center gap-2 opacity-80 backdrop-blur-md text-white tracking-widest">
                OB ACTIVE ({obs.length})
             </div>
         )}
         {showFVG && fvgs.length > 0 && (
             <div className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-[#1A1A1A] border border-[#222] flex items-center gap-2 opacity-80 backdrop-blur-md text-[#00C851] tracking-widest">
                FVG ACTIVE ({fvgs.length})
             </div>
         )}
      </div>
      <div ref={chartContainerRef} className="w-full h-full" />
      <div 
        ref={overlayContainerRef} 
        className="absolute top-0 left-0 pointer-events-none overflow-hidden" 
        style={{ bottom: '26px' }}
      />
    </div>
  );
}
