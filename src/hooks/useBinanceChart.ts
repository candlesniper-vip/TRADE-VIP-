import { useEffect, useRef, useState } from 'react';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  closeTime?: number;
}

export function useBinanceChart(symbol: string, interval: string = '1m', startTime?: number, endTime?: number) {
  const [data, setData] = useState<CandleData[]>([]);
  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const isForex = ['DXY', 'GBPUSD', 'GBPJPY', 'USDJPY'].includes(symbol);
    const actualSymbol = symbol === 'XAUUSD' ? 'PAXGUSDT' : symbol;
    
    let intervalId: any;

    const fetchHistory = async () => {
      try {
        let cleanData: CandleData[] = [];
        
        let timeQuery = '';
        if (startTime && endTime) {
            timeQuery = `&startTime=${startTime}&endTime=${endTime}`;
        }

        if (isForex) {
            const response = await fetch(`/api/yahoo/chart?symbol=${symbol}&interval=${interval}&limit=500${timeQuery}`);
            const json = await response.json();
            if (isMounted) {
               cleanData = json.map((d: any) => ({
                 time: Math.floor(d[0] / 1000) as number,
                 open: parseFloat(d[1]),
                 high: parseFloat(d[2]),
                 low: parseFloat(d[3]),
                 close: parseFloat(d[4]),
                 volume: parseFloat(d[5] || '0'),
                 closeTime: d[6] || 0,
               }));
            }
        } else {
            const response = await fetch(`/api/binance/klines?symbol=${actualSymbol}&interval=${interval}&limit=500${timeQuery}`);
            const json = await response.json();
            if (isMounted) {
               cleanData = json.map((d: any) => ({
                 time: Math.floor(d[0] / 1000) as number,
                 open: parseFloat(d[1]),
                 high: parseFloat(d[2]),
                 low: parseFloat(d[3]),
                 close: parseFloat(d[4]),
                 volume: parseFloat(d[5] || '0'),
                 closeTime: d[6],
               }));
            }
        }
        
        if (isMounted && cleanData.length > 0) {
            setData(cleanData);
            setCurrentCandle(cleanData[cleanData.length - 1]);
            setIsLoading(false);
            
            if (isForex) {
                // Poll instead of websocket
                intervalId = setInterval(async () => {
                    if (!isMounted) return;
                    try {
                        const res = await fetch(`/api/yahoo/chart?symbol=${symbol}&interval=${interval}&limit=1`);
                        const json = await res.json();
                        if (json.length > 0) {
                            const last = json[json.length - 1];
                            setCurrentCandle({
                                 time: Math.floor(last[0] / 1000) as number,
                                 open: parseFloat(last[1]),
                                 high: parseFloat(last[2]),
                                 low: parseFloat(last[3]),
                                 close: parseFloat(last[4]),
                                 volume: parseFloat(last[5] || '0'),
                                 closeTime: last[6],
                            });
                        }
                    } catch(e) {}
                }, 5000); // poll every 5s
            } else {
                connectWs(actualSymbol);
            }
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
          volume: parseFloat(kline.v || '0'),
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
      if (intervalId) clearInterval(intervalId);
    };
  }, [symbol, interval, startTime, endTime]);

  return { data, currentCandle, isLoading, error };
}
