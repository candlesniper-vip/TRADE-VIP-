import { createChart, IChartApi, ISeriesApi, LineStyle, CandlestickSeries } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useBinanceChart } from '../hooks/useBinanceChart';
import { useVolumeProfile } from '../hooks/useVolumeProfile';
import { detectAMD, detectSR, Zone, SRLevel } from '../lib/amd-logic';

interface ChartProps {
  symbol: string;
  interval: string;
}

export function Chart({ symbol, interval }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { data, currentCandle, isLoading, error } = useBinanceChart(symbol, interval);
  const { vpData } = useVolumeProfile(symbol);
  
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);

  const [zones, setZones] = useState<Zone[]>([]);
  const [srLevels, setSrLevels] = useState<SRLevel[]>([]);
  const lastAlertZone = useRef<string>('');

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
    if (srLevels.length > 0) {
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
    if (zones.length > 0) {
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
    if (vpData) {
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
  }, [zones, vpData, srLevels]);

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
         {zones.map((z, i) => (
             <div key={i} className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-[#1A1A1A] border border-[#222] flex items-center gap-2 opacity-80 backdrop-blur-md text-zinc-300 tracking-widest">
                <span className="w-2 h-2 rounded-full inline-block" style={{backgroundColor: z.color}}></span>
                {z.type.toUpperCase()}: {z.minPrice.toFixed(2)} - {z.maxPrice.toFixed(2)}
             </div>
         ))}
         {vpData && (
             <>
               <div className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-[#1A1A1A] border border-[#222] flex items-center gap-2 opacity-80 backdrop-blur-md text-[#ec4899] tracking-widest">
                  PREV POC: {vpData.poc.toFixed(2)}
               </div>
               <div className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-[#1A1A1A] border border-[#222] flex items-center gap-2 opacity-80 backdrop-blur-md text-[#8b5cf6] tracking-widest">
                  PREV VA: {vpData.val.toFixed(2)} - {vpData.vah.toFixed(2)}
               </div>
             </>
         )}
      </div>
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
