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

    // Order Block Detection
    for (let i = 5; i < searchData.length; i++) {
        const c1 = searchData[i - 2];
        const c2 = searchData[i - 1]; 
        const c3 = searchData[i];
        
        if (c3.low > c1.high && c2.close > c2.open) {
            for(let j = i - 2; j >= Math.max(0, i - 10); j--) {
                if (searchData[j].close < searchData[j].open) {
                    detectedObs.push({
                        top: searchData[j].high,
                        bottom: searchData[j].low,
                        type: 'Bullish'
                    });
                    break;
                }
            }
        }
        
        if (c1.low > c3.high && c2.close < c2.open) {
            for(let j = i - 2; j >= Math.max(0, i - 10); j--) {
                if (searchData[j].close > searchData[j].open) {
                    detectedObs.push({
                        top: searchData[j].high,
                        bottom: searchData[j].low,
                        type: 'Bearish'
                    });
                    break;
                }
            }
        }
    }

    setFvgs(detectedFvgs.slice(-5));
    setObs(detectedObs.slice(-5));

  }, [data]);

  // 2. Fetch Institutional Levels (1D)
  useEffect(() => {
     let isMounted = true;
     const fetch1D = async () => {
        try {
            const actualSymbol = symbol === 'XAUUSD' ? 'PAXGUSDT' : symbol;
            const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${actualSymbol}&interval=1d&limit=2`);
            const json = await res.json();
            if(!isMounted) return;
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
