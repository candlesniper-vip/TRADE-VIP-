const https = require('https');
https.get('https://api.binance.com/api/v3/exchangeInfo', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const symbols = JSON.parse(data).symbols.map(s => s.symbol);
    const matches = symbols.filter(s => s.includes('GBP') || s.includes('JPY') || s.includes('DXY'));
    console.log(matches);
  });
});
