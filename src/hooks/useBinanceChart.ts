import { useEffect, useRef, useState } from 'react';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  closeTime?: number;
}

export function useBinanceChart(symbol: string, interval: string = '1m') {
  const [data, setData] = useState<CandleData[]>([]);
  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const actualSymbol = symbol === 'XAUUSD' ? 'PAXGUSDT' : symbol;
    const fetchHistory = async () => {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${actualSymbol}&interval=${interval}&limit=500`);
        const json = await response.json();
        if (isMounted) {
          const formattedData = json.map((d: any) => ({
            time: (d[0] / 1000) + 24 * 60 * 60, // Adjust for TV expects unix timestamp in seconds
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
          }));
          // Lightweight charts needs business days or proper unix timestamps.
          // For simplicity and since crypto is 24/7, standard unix time works if we fix the format
          // TV requires UTC timestamp in seconds.
          const cleanData = json.map((d: any) => ({
             time: Math.floor(d[0] / 1000) as number,
             open: parseFloat(d[1]),
             high: parseFloat(d[2]),
             low: parseFloat(d[3]),
             close: parseFloat(d[4]),
             closeTime: d[6],
          }));
          
          setData(cleanData);
          setCurrentCandle(cleanData[cleanData.length - 1]);
          setIsLoading(false);
          connectWs(actualSymbol);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      }
    };

    const connectWs = (sym: string) => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      const wsUrl = `wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@kline_${interval}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const kline = message.k;
        const candle: CandleData = {
          time: Math.floor(kline.t / 1000),
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          closeTime: kline.T,
        };
        if (isMounted) {
          setCurrentCandle(candle);
        }
      };

      ws.onerror = () => {
        if (isMounted) setError('WebSocket Error');
      };
    };

    fetchHistory();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol, interval]);

  return { data, currentCandle, isLoading, error };
}
