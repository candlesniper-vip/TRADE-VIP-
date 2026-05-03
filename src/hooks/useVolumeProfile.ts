import { useEffect, useState } from 'react';

export interface VolumeProfileData {
  poc: number; // Point of Control
  vah: number; // Value Area High
  val: number; // Value Area Low
  profile: { price: number; volume: number }[];
}

export function useVolumeProfile(symbol: string) {
  const [vpData, setVpData] = useState<VolumeProfileData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const actualSymbol = symbol === 'XAUUSD' ? 'PAXGUSDT' : symbol;
    const isForex = ['DXY', 'GBPUSD', 'GBPJPY', 'USDJPY'].includes(symbol);

    const fetchHistory = async () => {
      try {
        let json;
        if (isForex) {
            const response = await fetch(`/api/yahoo/chart?symbol=${symbol}&interval=5m&limit=1000`);
            json = await response.json();
        } else {
            const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${actualSymbol}&interval=5m&limit=1000`);
            json = await response.json();
        }
        
        if (!isMounted) return;

        // Extract yesterday's candles
        const now = new Date();
        // Set to UTC midnight for consistent daily boundaries
        const yesterdayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();
        const yesterdayStart = yesterdayEnd - 24 * 60 * 60 * 1000;

        const yesterdayCandles = json.map((d: any) => ({
          time: d[0] as number,
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
        })).filter((c: any) => c.time >= yesterdayStart && c.time < yesterdayEnd);

        // Fallback: If no candles exactly in "yesterday", just take the first half of the dataset 
        // (This can happen on low-volume pairs or weekends depending on API)
        const targetCandles = yesterdayCandles.length > 50 ? yesterdayCandles : json.slice(0, 500).map((d: any) => ({
          time: d[0] as number,
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
        }));

        if (targetCandles.length === 0) return;

        // Calculate Volume Profile
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        for (const c of targetCandles) {
          if (c.low < minPrice) minPrice = c.low;
          if (c.high > maxPrice) maxPrice = c.high;
        }

        // Create price bins
        const numBins = 50;
        const binSize = (maxPrice - minPrice) / numBins;
        const profileMap = new Map<number, number>();

        for (let i = 0; i < numBins; i++) {
           profileMap.set(i, 0);
        }

        for (const c of targetCandles) {
          const avgPrice = (c.high + c.low + c.close) / 3;
          let binIndex = Math.floor((avgPrice - minPrice) / (binSize || 1));
          if(binIndex >= numBins) binIndex = numBins - 1;
          if(binIndex < 0) binIndex = 0;
          profileMap.set(binIndex, profileMap.get(binIndex)! + c.volume);
        }

        let pocBin = 0;
        let maxVolume = -1;
        let totalVolume = 0;

        profileMap.forEach((vol, bin) => {
          totalVolume += vol;
          if (vol > maxVolume) {
            maxVolume = vol;
            pocBin = bin;
          }
        });

        const pocPrice = minPrice + (pocBin * binSize) + (binSize / 2);

        // Value Area (70% of total volume)
        const vaVolumeTarget = totalVolume * 0.70;
        let currentVaVolume = maxVolume;
        let lowerVaBin = pocBin;
        let upperVaBin = pocBin;

        while (currentVaVolume < vaVolumeTarget) {
          const lowerVol = lowerVaBin > 0 ? profileMap.get(lowerVaBin - 1)! : 0;
          const upperVol = upperVaBin < numBins - 1 ? profileMap.get(upperVaBin + 1)! : 0;

          if (lowerVol === 0 && upperVol === 0) break;

          if (lowerVol >= upperVol) {
            lowerVaBin--;
            currentVaVolume += lowerVol;
          } else {
            upperVaBin++;
            currentVaVolume += upperVol;
          }
        }

        const vah = minPrice + (upperVaBin * binSize) + (binSize / 2);
        const val = minPrice + (lowerVaBin * binSize) + (binSize / 2);

        const profile = Array.from(profileMap.entries()).map(([bin, vol]) => ({
          price: minPrice + (bin * binSize) + (binSize / 2),
          volume: vol
        }));

        setVpData({ poc: pocPrice, vah, val, profile });
      } catch (err) {
        console.error('Error fetching volume profile data:', err);
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  return { vpData };
}
