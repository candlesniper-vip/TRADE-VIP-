const https = require('https');
https.get('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1m&range=1d', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 200)));
});
