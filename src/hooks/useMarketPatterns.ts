import { useEffect, useState } from 'react';
import { CandleData } from './useBinanceChart';

export interface FVGZone {
  top: number;
  bottom: number;
  type: 'Bullish' | 'Bearish';
}

export interface OrderBlockZone {
  top: number;
  bottom: number;
  type: 'Bullish' | 'Bearish';
  confidence?: string;
}

export interface InstitutionalLevels {
  pdh: number | null; // Prev Day High
  pdl: number | null; // Prev Day Low
  pdo: number | null; // Prev Day Open
}

export function useMarketPatterns(data: CandleData[], symbol: string) {
  const [fvgs, setFvgs] = useState<FVGZone[]>([]);
  const [obs, setObs] = useState<OrderBlockZone[]>([]);
  const [instLevels, setInstLevels] = useState<InstitutionalLevels>({ pdh: null, pdl: null, pdo: null });

  // 1. Detect FVG & OB from Chart Data
  useEffect(() => {
    if (!data || data.length < 5) return;

    const detectedFvgs: FVGZone[] = [];
    const detectedObs: OrderBlockZone[] = [];

    // recent 200 candles roughly to not overload
    const searchData = data.slice(-200);

    // FVG Detection (3-candle pattern)
    // Bullish FVG: Candle 1 High < Candle 3 Low
    // Bearish FVG: Candle 1 Low > Candle 3 High
    for (let i = 2; i < searchData.length; i++) {
        const c1 = searchData[i - 2];
        const c2 = searchData[i - 1]; // The displacement candle
        const c3 = searchData[i];

        const gapThreshold = c2.close * 0.0001; // tiny threshold

        if (c3.low - c1.high > gapThreshold && c2.close > c2.open) { // Bullish gap
            detectedFvgs.push({
                top: c3.low,
                bottom: c1.high,
                type: 'Bullish'
            });
        }
        
        if (c1.low - c3.high > gapThreshold && c2.close < c2.open) { // Bearish gap
            detectedFvgs.push({
                top: c1.low,
                bottom: c3.high,
                type: 'Bearish'
            });
        }
    }

    // Order Block Detection (Institutional Grade)
    const activeObs: OrderBlockZone[] = [];
    const volAvg = searchData.reduce((acc, curr) => acc + curr.volume, 0) / searchData.length;
    let atrSum = 0;
    for(let k=1; k<searchData.length; k++) {
       atrSum += Math.max(searchData[k].high - searchData[k].low, Math.abs(searchData[k].high - searchData[k-1].close), Math.abs(searchData[k].low - searchData[k-1].close));
    }
    const avgAtr = atrSum / Math.max(1, searchData.length - 1);

    for (let i = 5; i < searchData.length; i++) {
        const c1 = searchData[i - 2];
        const c2 = searchData[i - 1]; 
        const c3 = searchData[i];
        
        const displacement = Math.abs(c2.close - c2.open);
        const isHighVolume = c2.volume > volAvg * 1.8; // Need VERY high volume
        const isStrongDisplacement = displacement > avgAtr * 1.5; // Strong candle

        if (c3.low > c1.high && c2.close > c2.open && isHighVolume && isStrongDisplacement) {
            // Find the last opposite (bearish) candle before this move
            for(let j = i - 2; j >= Math.max(0, i - 12); j--) {
                if (searchData[j].close < searchData[j].open) {
                    activeObs.push({
                        top: searchData[j].high,
                        bottom: searchData[j].low,
                        type: 'Bullish',
                        confidence: '99%'
                    });
                    break;
                }
            }
        }
        
        if (c1.low > c3.high && c2.close < c2.open && isHighVolume && isStrongDisplacement) {
            // Find the last opposite (bullish) candle before this move
            for(let j = i - 2; j >= Math.max(0, i - 12); j--) {
                if (searchData[j].close > searchData[j].open) {
                    activeObs.push({
                        top: searchData[j].high,
                        bottom: searchData[j].low,
                        type: 'Bearish',
                        confidence: '99%'
                    });
                    break;
                }
            }
        }
    }

    // Filter mitigated OBs
    const unmitigatedObs: OrderBlockZone[] = [];
    for (let currentOb of activeObs) {
      let isMitigated = false;
      // Find where OB was created
      const obIdx = searchData.findIndex(d => d.high === currentOb.top && d.low === currentOb.bottom);
      if (obIdx !== -1) {
          for(let k = obIdx + 2; k < searchData.length; k++) {
              if (currentOb.type === 'Bullish' && searchData[k].low <= currentOb.top) {
                  isMitigated = true;
                  break;
              }
              if (currentOb.type === 'Bearish' && searchData[k].high >= currentOb.bottom) {
                  isMitigated = true;
                  break;
              }
          }
      }
      if (!isMitigated) {
          unmitigatedObs.push(currentOb);
      }
    }

    setFvgs(detectedFvgs.slice(-5));
    setObs(unmitigatedObs.slice(-3)); // Only show top 3 high quality ones

  }, [data]);

    const isForex = ['DXY', 'GBPUSD', 'GBPJPY', 'USDJPY'].includes(symbol);
    const actualSymbol = symbol === 'XAUUSD' ? 'PAXGUSDT' : symbol;

  // 2. Fetch Institutional Levels (1D)
  useEffect(() => {
     let isMounted = true;
     const fetch1D = async () => {
        try {
            let json;
            if (isForex) {
                const res = await fetch(`/api/yahoo/chart?symbol=${symbol}&interval=1d&limit=2`);
                json = await res.json();
            } else {
                const res = await fetch(`/api/binance/klines?symbol=${actualSymbol}&interval=1d&limit=2`);
                json = await res.json();
            }
            
            if(!isMounted) return;
            // The logic here remains the same since we mapped Yahoo data to Binance array format
            if(json && json.length >= 2) {
                const prevD = json[json.length - 2];
                setInstLevels({
                    pdo: parseFloat(prevD[1]),
                    pdh: parseFloat(prevD[2]),
                    pdl: parseFloat(prevD[3])
                });
            }
        } catch(e) {}
     };
     fetch1D();
     return () => { isMounted = false; };
  }, [symbol]);

  return { fvgs, obs, instLevels };
}
