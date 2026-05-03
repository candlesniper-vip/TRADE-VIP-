import express from "express";
import { createServer as createViteServer } from "vite";
import https from "https";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Yahoo map for our custom symbols
  const SYMBOL_MAP: Record<string, string> = {
    'DXY': 'DX-Y.NYB',
    'GBPUSD': 'GBPUSD=X',
    'GBPJPY': 'GBPJPY=X',
    'USDJPY': 'JPY=X'
  };

  // API proxy for Yahoo Finance Chart
  app.get("/api/yahoo/chart", (req, res) => {
    const { symbol, interval, limit, startTime, endTime } = req.query;
    const yahooSymbol = SYMBOL_MAP[symbol as string];
    
    if (!yahooSymbol) {
      return res.status(400).json({ error: "Unsupported symbol for Yahoo proxy" });
    }

    // Map binance intervals to yahoo intervals
    let yInterval = interval as string || '1m';
    let rangeQuery = '&range=1d';
    
    if (yInterval === '1m') rangeQuery = '&range=5d';
    else if (yInterval === '3m' || yInterval === '5m' || yInterval === '15m') rangeQuery = '&range=5d';
    else if (yInterval === '30m' || yInterval === '1h') rangeQuery = '&range=1mo';
    else if (yInterval === '4h') { yInterval = '1h'; rangeQuery = '&range=1mo'; } // approximate since yahoo lacks 4h
    else if (yInterval === '1d') rangeQuery = '&range=3mo';
    else if (yInterval === '1w') { yInterval = '1wk'; rangeQuery = '&range=2y'; }

    let timeQuery = rangeQuery;
    if (startTime && endTime) {
        const p1 = Math.floor(Number(startTime) / 1000);
        const p2 = Math.floor(Number(endTime) / 1000);
        timeQuery = `&period1=${p1}&period2=${p2}`;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${yInterval}${timeQuery}`;

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      }
    }, (yahooRes) => {
      let data = '';
      yahooRes.on('data', chunk => data += chunk);
      yahooRes.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.chart && parsed.chart.result && parsed.chart.result.length > 0) {
                const result = parsed.chart.result[0];
                const timestamps = result.timestamp || [];
                const quote = result.indicators.quote[0];
                // map to binance format [timestamp, open, high, low, close, volume, closeTime]
                const binanceFormat = timestamps.map((ts: number, i: number) => {
                    return [
                        ts * 1000, // Open time
                        quote.open[i] ? quote.open[i].toString() : "0",
                        quote.high[i] ? quote.high[i].toString() : "0",
                        quote.low[i] ? quote.low[i].toString() : "0",
                        quote.close[i] ? quote.close[i].toString() : "0",
                        quote.volume[i] ? quote.volume[i].toString() : "0",
                        ts * 1000 + 59999 // Close time estimate
                    ];
                }).filter((c: any) => c[1] !== "null" && c[4] !== "0"); // filter invalid
                res.json(binanceFormat);
            } else {
                res.json([]);
            }
        } catch(e) {
            res.status(500).json({ error: "Failed to parse yahoo data" });
        }
      });
    }).on('error', (e) => {
      res.status(500).json({ error: e.message });
    });
  });

  // API proxy for Binance Chart
  app.get("/api/binance/klines", (req, res) => {
    const { symbol, interval, limit, startTime, endTime } = req.query;
    let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 1000}`;
    if (startTime) url += `&startTime=${startTime}`;
    if (endTime) url += `&endTime=${endTime}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (binanceRes) => {
      let data = '';
      binanceRes.on('data', chunk => data += chunk);
      binanceRes.on('end', () => {
        try {
            res.json(JSON.parse(data));
        } catch(e) {
            res.status(500).json({ error: "Failed to parse binance data" });
        }
      });
    }).on('error', (e) => {
      res.status(500).json({ error: e.message });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
